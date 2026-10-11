"""Asynchroniczny crawler strony: pobiera podstrony, robots.txt i mapy witryny."""
from __future__ import annotations

import asyncio
import gzip
import hashlib
import json
import re
import time
from dataclasses import dataclass, field
from typing import Callable
from urllib.parse import urldefrag, urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx
from bs4 import BeautifulSoup

from ..config import settings

SKIP_EXTENSIONS = re.compile(
    r"\.(jpg|jpeg|png|gif|webp|avif|svg|ico|pdf|zip|rar|gz|mp4|mp3|avi|mov|doc|docx|xls|xlsx|ppt|pptx|css|js|woff2?|ttf|eot|xml|json)$",
    re.I,
)
QUESTION_START = re.compile(
    r"^(jak|co|czy|dlaczego|ile|kiedy|gdzie|kt[oó]r|kto|po co|na czym|w jaki|what|how|why|when|where|which|who|is|are|can|does|do)\b",
    re.I,
)


@dataclass
class PageData:
    url: str
    depth: int
    status: int = 0
    final_url: str = ""
    redirect_chain: list[tuple[str, int]] = field(default_factory=list)
    headers: dict[str, str] = field(default_factory=dict)
    content_type: str = ""
    response_ms: int = 0
    size_bytes: int = 0
    error: str = ""
    is_html: bool = False
    from_sitemap_only: bool = False
    info: dict = field(default_factory=dict)  # wynik parse_html
    inlinks: int = 0


@dataclass
class CrawlResult:
    start_url: str
    host: str
    pages: dict[str, PageData]
    robots_txt: str | None
    robots_status: int
    sitemap_urls: set[str]
    sitemap_sources: list[str]
    external_links: dict[str, int]  # adres -> status (0 = błąd połączenia)
    http_redirects_to_https: bool | None


def normalize_url(url: str) -> str:
    url, _ = urldefrag(url.strip())
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        return ""
    path = p.path or "/"
    netloc = (p.hostname or "").lower()
    if p.port and p.port not in (80, 443):
        netloc += f":{p.port}"
    out = f"{p.scheme}://{netloc}{path}"
    if p.query:
        out += f"?{p.query}"
    return out


def same_site(url: str, host: str) -> bool:
    h = (urlparse(url).hostname or "").lower()
    return h.removeprefix("www.") == host.removeprefix("www.")


def _text(el) -> str:
    return " ".join(el.get_text(" ", strip=True).split()) if el else ""


def _jsonld_types(obj, out: list[str]) -> None:
    if isinstance(obj, list):
        for o in obj:
            _jsonld_types(o, out)
    elif isinstance(obj, dict):
        t = obj.get("@type")
        if isinstance(t, str):
            out.append(t)
        elif isinstance(t, list):
            out.extend(str(x) for x in t)
        for key in ("@graph", "mainEntity", "author", "publisher", "itemListElement"):
            if key in obj:
                _jsonld_types(obj[key], out)


def parse_html(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    head_meta = {}
    for m in soup.find_all("meta"):
        key = (m.get("name") or m.get("property") or m.get("http-equiv") or "").lower()
        if key and key not in head_meta:
            head_meta[key] = (m.get("content") or "").strip()

    canonical = ""
    hreflang = []
    for link in soup.find_all("link", href=True):
        rel = [r.lower() for r in (link.get("rel") or [])]
        if "canonical" in rel and not canonical:
            canonical = urljoin(url, link["href"])
        if "alternate" in rel and link.get("hreflang"):
            hreflang.append({"lang": link["hreflang"], "href": urljoin(url, link["href"])})

    # Dane strukturalne
    jsonld, jsonld_errors, schema_types = [], 0, []
    for s in soup.find_all("script", type=lambda t: t and "ld+json" in t.lower()):
        raw = s.string or s.get_text() or ""
        try:
            data = json.loads(raw)
            jsonld.append(data)
            _jsonld_types(data, schema_types)
        except (ValueError, TypeError):
            jsonld_errors += 1
    for el in soup.find_all(attrs={"itemtype": True}):
        schema_types.append(el["itemtype"].rstrip("/").rsplit("/", 1)[-1])

    headings = []
    for h in soup.find_all(re.compile(r"^h[1-6]$")):
        txt = _text(h)
        if txt:
            headings.append({"level": int(h.name[1]), "text": txt[:200]})
    h1 = [h["text"] for h in headings if h["level"] == 1]
    question_headings = sum(
        1 for h in headings if h["level"] >= 2 and (h["text"].endswith("?") or QUESTION_START.match(h["text"]))
    )

    images = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or ""
        images.append(
            {
                "src": urljoin(url, src) if src else "",
                "alt": img.get("alt"),
                "lazy": (img.get("loading") or "").lower() == "lazy",
            }
        )

    mixed = []
    if url.startswith("https://"):
        for tag, attr in (("img", "src"), ("script", "src"), ("iframe", "src"), ("link", "href"), ("source", "src")):
            for el in soup.find_all(tag):
                v = el.get(attr) or ""
                if v.startswith("http://") and not (tag == "link" and "stylesheet" not in (el.get("rel") or [])):
                    mixed.append(v)

    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        absolute = normalize_url(urljoin(url, href))
        if absolute:
            rel = [r.lower() for r in (a.get("rel") or [])]
            links.append({"href": absolute, "text": _text(a)[:120], "nofollow": "nofollow" in rel})

    script_count = len(soup.find_all("script"))
    has_app_root = bool(soup.find(id=re.compile(r"^(root|app|__next|__nuxt|svelte)$")))
    time_tags = [t.get("datetime") for t in soup.find_all("time") if t.get("datetime")]

    # Treść widoczna
    for el in soup(["script", "style", "noscript", "template", "svg"]):
        el.decompose()
    body = soup.body or soup
    text = " ".join(body.get_text(" ", strip=True).split())
    words = len(text.split())

    html_tag = soup.find("html")
    return {
        "title": _text(soup.title) if soup.title else "",
        "meta_description": head_meta.get("description", ""),
        "meta_robots": head_meta.get("robots", "").lower(),
        "viewport": "viewport" in head_meta,
        "lang": (html_tag.get("lang") if html_tag else "") or "",
        "canonical": normalize_url(canonical) if canonical else "",
        "hreflang": hreflang,
        "og_title": head_meta.get("og:title", ""),
        "og_image": head_meta.get("og:image", ""),
        "author_meta": head_meta.get("author", ""),
        "published": head_meta.get("article:published_time", ""),
        "modified": head_meta.get("article:modified_time", "") or head_meta.get("og:updated_time", ""),
        "time_tags": time_tags[:5],
        "h1": h1,
        "headings": headings[:60],
        "question_headings": question_headings,
        "lists": len(body.find_all(["ul", "ol"])) if hasattr(body, "find_all") else 0,
        "tables": len(body.find_all("table")) if hasattr(body, "find_all") else 0,
        "jsonld": jsonld,
        "jsonld_errors": jsonld_errors,
        "schema_types": sorted(set(schema_types)),
        "images": images,
        "mixed_content": mixed[:20],
        "links": links,
        "word_count": words,
        "text_hash": hashlib.md5(text.lower().encode()).hexdigest() if words > 50 else "",
        "text_sample": text[:4000],
        "script_count": script_count,
        "has_app_root": has_app_root,
    }


async def _fetch(client: httpx.AsyncClient, url: str) -> tuple[httpx.Response | None, int, str]:
    t0 = time.perf_counter()
    try:
        resp = await client.get(url)
        return resp, int((time.perf_counter() - t0) * 1000), ""
    except httpx.HTTPError as e:
        return None, int((time.perf_counter() - t0) * 1000), f"{type(e).__name__}: {e}"[:300]


def _parse_sitemap_xml(content: bytes) -> tuple[list[str], list[str]]:
    """Zwraca (adresy stron, adresy zagnieżdżonych map)."""
    soup = BeautifulSoup(content, "xml")
    if soup.find("sitemapindex"):
        return [], [loc.get_text(strip=True) for loc in soup.select("sitemap > loc")]
    return [loc.get_text(strip=True) for loc in soup.select("url > loc")], []


async def load_sitemaps(client: httpx.AsyncClient, candidates: list[str], limit: int = 20000) -> tuple[set[str], list[str]]:
    urls: set[str] = set()
    found: list[str] = []
    queue = list(dict.fromkeys(candidates))
    seen: set[str] = set()
    while queue and len(seen) < 25 and len(urls) < limit:
        sm = queue.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        resp, _, err = await _fetch(client, sm)
        if err or resp is None or resp.status_code != 200:
            continue
        content = resp.content
        if sm.endswith(".gz"):
            try:
                content = gzip.decompress(content)
            except OSError:
                pass
        if b"<urlset" not in content[:2000] and b"<sitemapindex" not in content[:2000]:
            continue
        found.append(sm)
        page_urls, nested = _parse_sitemap_xml(content)
        urls.update(u for u in (normalize_url(x) for x in page_urls) if u)
        queue.extend(nested)
    return urls, found


async def check_external(client: httpx.AsyncClient, links: list[str]) -> dict[str, int]:
    sem = asyncio.Semaphore(8)
    out: dict[str, int] = {}

    async def one(u: str):
        async with sem:
            try:
                r = await client.head(u)
                if r.status_code in (405, 403, 501):
                    r = await client.get(u)
                out[u] = r.status_code
            except httpx.HTTPError:
                out[u] = 0

    await asyncio.gather(*(one(u) for u in links))
    return out


async def crawl(
    start_url: str,
    max_pages: int = 200,
    progress: Callable[[str], None] | None = None,
    max_external: int = 60,
) -> CrawlResult:
    start_url = normalize_url(start_url if "://" in start_url else f"https://{start_url}")
    host = urlparse(start_url).hostname or ""
    base = f"{urlparse(start_url).scheme}://{urlparse(start_url).netloc}"
    headers = {"User-Agent": settings.crawler_user_agent, "Accept-Language": "pl,en;q=0.8"}
    timeout = httpx.Timeout(20.0, connect=10.0)
    say = progress or (lambda _m: None)

    async with httpx.AsyncClient(headers=headers, timeout=timeout, follow_redirects=True, http2=False) as client:
        # robots.txt
        say("Pobieram robots.txt")
        robots_txt, robots_status = None, 0
        resp, _, _ = await _fetch(client, f"{base}/robots.txt")
        if resp is not None:
            robots_status = resp.status_code
            if resp.status_code == 200 and "html" not in resp.headers.get("content-type", ""):
                robots_txt = resp.text
        rp = RobotFileParser()
        rp.parse((robots_txt or "").splitlines())

        # Mapy witryny
        say("Wczytuję mapę witryny")
        candidates = re.findall(r"(?im)^\s*sitemap:\s*(\S+)", robots_txt or "")
        candidates += [f"{base}/sitemap.xml", f"{base}/sitemap_index.xml", f"{base}/wp-sitemap.xml"]
        sitemap_urls, sitemap_sources = await load_sitemaps(client, candidates)

        # Przekierowanie http -> https
        http_redirect = None
        if start_url.startswith("https://"):
            r, _, _ = await _fetch(client, start_url.replace("https://", "http://", 1))
            if r is not None:
                http_redirect = str(r.url).startswith("https://")

        # Crawl
        pages: dict[str, PageData] = {}
        queue: asyncio.Queue[tuple[str, int, bool]] = asyncio.Queue()
        queued: set[str] = {start_url}
        await queue.put((start_url, 0, False))
        lock = asyncio.Lock()

        async def worker():
            while True:
                url, depth, sitemap_only = await queue.get()
                try:
                    if len(pages) >= max_pages:
                        continue
                    pd = PageData(url=url, depth=depth, from_sitemap_only=sitemap_only)
                    pages[url] = pd
                    resp, ms, err = await _fetch(client, url)
                    pd.response_ms, pd.error = ms, err
                    if resp is None:
                        continue
                    pd.status = resp.history[0].status_code if resp.history else resp.status_code
                    pd.redirect_chain = [(str(h.url), h.status_code) for h in resp.history]
                    pd.final_url = normalize_url(str(resp.url))
                    pd.headers = {k.lower(): v for k, v in resp.headers.items()}
                    pd.content_type = pd.headers.get("content-type", "")
                    pd.size_bytes = len(resp.content)
                    if len(pages) % 10 == 0:
                        say(f"Przeskanowano {len(pages)} stron")

                    target = pd.final_url
                    if resp.history and target and same_site(target, host) and target not in queued:
                        async with lock:
                            queued.add(target)
                        await queue.put((target, depth, sitemap_only))
                    if resp.history or resp.status_code != 200 or "html" not in pd.content_type:
                        continue
                    pd.is_html = True
                    pd.info = await asyncio.to_thread(parse_html, resp.text, target or url)
                    if "nofollow" in pd.info["meta_robots"]:
                        continue
                    for link in pd.info["links"]:
                        href = link["href"]
                        if not same_site(href, host) or SKIP_EXTENSIONS.search(urlparse(href).path):
                            continue
                        if not rp.can_fetch(settings.crawler_user_agent, href):
                            continue
                        async with lock:
                            if href in queued or len(queued) >= max_pages * 3:
                                continue
                            queued.add(href)
                        await queue.put((href, depth + 1, False))
                finally:
                    queue.task_done()

        workers = [asyncio.create_task(worker()) for _ in range(max(1, settings.crawler_concurrency))]
        await queue.join()

        # Strony z mapy witryny, do których nie prowadzi żaden link
        leftover = [u for u in sorted(sitemap_urls) if u not in queued and same_site(u, host)]
        for u in leftover[: max(0, max_pages - len(pages))]:
            queued.add(u)
            await queue.put((u, -1, True))
        await queue.join()
        for w in workers:
            w.cancel()

        # Linki przychodzące
        for pd in pages.values():
            for link in pd.info.get("links", []):
                tgt = pages.get(link["href"])
                if tgt is not None and link["href"] != pd.url:
                    tgt.inlinks += 1

        # Linki zewnętrzne
        say("Sprawdzam linki zewnętrzne")
        external = []
        for pd in pages.values():
            for link in pd.info.get("links", []):
                if not same_site(link["href"], host) and link["href"] not in external:
                    external.append(link["href"])
        external_status = await check_external(client, external[:max_external])

    return CrawlResult(
        start_url=start_url,
        host=host,
        pages=pages,
        robots_txt=robots_txt,
        robots_status=robots_status,
        sitemap_urls=sitemap_urls,
        sitemap_sources=sitemap_sources,
        external_links=external_status,
        http_redirects_to_https=http_redirect,
    )
