"""Monitoring widoczności marki w odpowiedziach modeli AI (ChatGPT, Claude, Perplexity, Gemini)."""
from __future__ import annotations

import logging
import re
import unicodedata
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from urllib.parse import urlparse

import anthropic
import httpx

from ..config import settings
from ..db import session_scope
from ..models import AIResult, Project

log = logging.getLogger(__name__)

PROVIDER_LABELS = {"chatgpt": "ChatGPT", "claude": "Claude", "perplexity": "Perplexity", "gemini": "Gemini"}
COUNTRY_CODES = {"pl": "PL", "de": "DE", "gb": "GB", "uk": "GB", "us": "US", "cz": "CZ", "sk": "SK", "ua": "UA"}


class ProviderAnswer(dict):
    """{'text': str, 'citations': [{'url', 'title', 'domain'}], 'model': str}"""


def _domain(url: str) -> str:
    return (urlparse(url).hostname or "").lower().removeprefix("www.")


def _cite(url: str, title: str = "") -> dict:
    return {"url": url, "title": title or "", "domain": _domain(url)}


# ---------- Dostawcy ----------

def ask_claude(prompt: str, country: str) -> ProviderAnswer:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    tool = {"type": "web_search_20260209", "name": "web_search", "max_uses": 5,
            "user_location": {"type": "approximate", "country": COUNTRY_CODES.get(country, "PL")}}
    messages = [{"role": "user", "content": prompt}]
    resp = None
    for _ in range(4):  # pause_turn: kontynuujemy, aż model skończy
        resp = client.beta.messages.create(
            model=settings.anthropic_model,
            max_tokens=8000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={"effort": "low"},
            tools=[tool],
            messages=messages,
        )
        if resp.stop_reason != "pause_turn":
            break
        messages = [{"role": "user", "content": prompt}, {"role": "assistant", "content": resp.content}]
    if resp.stop_reason == "refusal":
        raise RuntimeError("Model odmówił odpowiedzi")
    text_parts, cites = [], []
    for block in resp.content:
        if block.type == "text":
            text_parts.append(block.text)
            for c in getattr(block, "citations", None) or []:
                url = getattr(c, "url", None)
                if url:
                    cites.append(_cite(url, getattr(c, "title", "") or ""))
    return ProviderAnswer(text="".join(text_parts).strip(), citations=_dedupe(cites), model=resp.model)


def ask_chatgpt(prompt: str, country: str) -> ProviderAnswer:
    body = {
        "model": settings.openai_model,
        "input": prompt,
        "tools": [{"type": "web_search", "user_location": {"type": "approximate", "country": COUNTRY_CODES.get(country, "PL")}}],
    }
    r = httpx.post("https://api.openai.com/v1/responses", json=body, timeout=180,
                   headers={"Authorization": f"Bearer {settings.openai_api_key}"})
    r.raise_for_status()
    d = r.json()
    text_parts, cites = [], []
    for item in d.get("output", []):
        if item.get("type") != "message":
            continue
        for c in item.get("content", []):
            if c.get("type") == "output_text":
                text_parts.append(c.get("text", ""))
                for a in c.get("annotations", []):
                    if a.get("type") == "url_citation" and a.get("url"):
                        cites.append(_cite(a["url"], a.get("title", "")))
    return ProviderAnswer(text="\n".join(text_parts).strip(), citations=_dedupe(cites), model=d.get("model", settings.openai_model))


def ask_perplexity(prompt: str, country: str) -> ProviderAnswer:
    body = {"model": settings.perplexity_model, "messages": [{"role": "user", "content": prompt}]}
    r = httpx.post("https://api.perplexity.ai/chat/completions", json=body, timeout=180,
                   headers={"Authorization": f"Bearer {settings.perplexity_api_key}"})
    r.raise_for_status()
    d = r.json()
    text = d["choices"][0]["message"]["content"]
    cites = [_cite(s["url"], s.get("title", "")) for s in d.get("search_results", []) if s.get("url")]
    if not cites:
        cites = [_cite(u) for u in d.get("citations", []) if isinstance(u, str)]
    return ProviderAnswer(text=text.strip(), citations=_dedupe(cites), model=d.get("model", settings.perplexity_model))


def ask_gemini(prompt: str, country: str) -> ProviderAnswer:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent"
    body = {"contents": [{"parts": [{"text": prompt}]}], "tools": [{"google_search": {}}]}
    r = httpx.post(url, json=body, timeout=180, headers={"x-goog-api-key": settings.gemini_api_key})
    r.raise_for_status()
    d = r.json()
    cand = (d.get("candidates") or [{}])[0]
    text = "".join(p.get("text", "") for p in cand.get("content", {}).get("parts", []))
    cites = []
    for ch in cand.get("groundingMetadata", {}).get("groundingChunks", []):
        web = ch.get("web") or {}
        # Gemini zwraca adres przekierowujący; tytuł zawiera zwykle domenę źródła
        title = web.get("title", "")
        c = _cite(web.get("uri", ""), title)
        if title and "." in title and " " not in title:
            c["domain"] = title.lower().removeprefix("www.")
        cites.append(c)
    return ProviderAnswer(text=text.strip(), citations=_dedupe(cites), model=settings.gemini_model)


PROVIDERS = {"chatgpt": ask_chatgpt, "claude": ask_claude, "perplexity": ask_perplexity, "gemini": ask_gemini}


def _dedupe(cites: list[dict]) -> list[dict]:
    seen, out = set(), []
    for c in cites:
        key = c["url"] or c["domain"]
        if key and key not in seen:
            seen.add(key)
            out.append(c)
    return out


# ---------- Analiza odpowiedzi ----------

def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return s.replace("ł", "l")


def first_mention(text: str, terms: list[str]) -> int | None:
    """Pozycja (indeks znaku) pierwszej wzmianki któregokolwiek z terminów albo None."""
    t = _norm(text)
    best = None
    for term in terms:
        term = _norm(term.strip())
        if len(term) < 2:
            continue
        m = re.search(r"(?<![\w])" + re.escape(term) + r"(?![\w])", t)
        if m and (best is None or m.start() < best):
            best = m.start()
    return best


def analyze_answer(answer: ProviderAnswer, project: Project) -> dict:
    text = answer["text"]
    domain = project.domain
    brand_terms = project.brand_terms + [domain]
    brand_idx = first_mention(text, brand_terms)
    cited = any(c["domain"] == domain or c["domain"].endswith("." + domain) for c in answer["citations"])

    competitor_hits = []
    entity_positions = []
    if brand_idx is not None:
        entity_positions.append((brand_idx, "__brand__"))
    for comp in project.competitor_list:
        terms = [comp["name"]] + ([comp["domain"]] if comp["domain"] else [])
        idx = first_mention(text, terms)
        comp_cited = bool(comp["domain"]) and any(c["domain"].endswith(comp["domain"]) for c in answer["citations"])
        if idx is not None or comp_cited:
            competitor_hits.append({"name": comp["name"], "mentioned": idx is not None, "cited": comp_cited})
        if idx is not None:
            entity_positions.append((idx, comp["name"]))

    position = None
    if brand_idx is not None:
        ordered = [name for _, name in sorted(entity_positions)]
        position = ordered.index("__brand__") + 1
    return {"mentioned": brand_idx is not None, "position": position, "cited": cited, "competitors_mentioned": competitor_hits}


# ---------- Uruchomienie ----------

def run_ai_monitoring(project_id: int, providers: list[str] | None = None) -> str:
    enabled = [p for p, ok in settings.ai_providers.items() if ok and (providers is None or p in providers)]
    run_id = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    with session_scope() as db:
        project = db.get(Project, project_id)
        if project is None:
            return run_id
        prompts = [(p.id, p.text) for p in project.prompts if p.active]
        samples = max(1, min(project.ai_samples, 10))
        country = project.country
        db.expunge_all()

    if not enabled or not prompts:
        return run_id

    tasks = [(pid, text, prov, s) for pid, text in prompts for prov in enabled for s in range(1, samples + 1)]

    def work(task):
        pid, text, prov, sample = task
        try:
            ans = PROVIDERS[prov](text, country)
            err = ""
        except Exception as e:  # noqa: BLE001 – błąd dostawcy zapisujemy przy wyniku
            log.warning("Błąd %s: %s", prov, e)
            ans, err = ProviderAnswer(text="", citations=[], model=""), f"{type(e).__name__}: {str(e)[:300]}"
        with session_scope() as db:
            project = db.get(Project, project_id)
            analysis = analyze_answer(ans, project) if not err else {"mentioned": False, "position": None, "cited": False, "competitors_mentioned": []}
            db.add(AIResult(project_id=project_id, prompt_id=pid, run_id=run_id, provider=prov, model=ans.get("model", ""),
                            sample=sample, answer=ans["text"][:20000], citations=ans["citations"][:40], error=err, **analysis))

    with ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(work, tasks))
    return run_id


def compute_metrics(results: list[AIResult], project: Project) -> dict:
    ok = [r for r in results if not r.error]
    n = len(ok)

    def rates(rows):
        k = len(rows)
        if not k:
            return {"n": 0, "mention": None, "citation": None, "position": None}
        pos = [r.position for r in rows if r.position]
        return {
            "n": k,
            "mention": round(100 * sum(r.mentioned for r in rows) / k),
            "citation": round(100 * sum(r.cited for r in rows) / k),
            "position": round(sum(pos) / len(pos), 1) if pos else None,
        }

    by_provider = {p: rates([r for r in ok if r.provider == p]) for p in PROVIDER_LABELS if any(r.provider == p for r in ok)}
    by_prompt = defaultdict(list)
    for r in ok:
        by_prompt[r.prompt_id].append(r)
    prompt_rows = []
    for pid, rows in by_prompt.items():
        row = rates(rows)
        row["prompt"] = rows[0].prompt.text if rows[0].prompt else ""
        row["prompt_id"] = pid
        row["providers"] = {p: rates([r for r in rows if r.provider == p]) for p in PROVIDER_LABELS if any(r.provider == p for r in rows)}
        prompt_rows.append(row)
    prompt_rows.sort(key=lambda x: (x["mention"] or 0))

    # Udział w głosie: wzmianki marki / wszystkie wzmianki marki i konkurentów
    sov_counts = Counter()
    for r in ok:
        if r.mentioned:
            sov_counts[project.brand_name or project.domain] += 1
        for c in r.competitors_mentioned or []:
            if c.get("mentioned"):
                sov_counts[c["name"]] += 1
    total_mentions = sum(sov_counts.values())
    sov = [{"name": k, "count": v, "share": round(100 * v / total_mentions)} for k, v in sov_counts.most_common(10)] if total_mentions else []

    domains = Counter()
    for r in ok:
        for d in {c["domain"] for c in r.citations or [] if c.get("domain")}:
            domains[d] += 1
    top_domains = [{"domain": d, "count": c, "share": round(100 * c / n) if n else 0, "own": d.endswith(project.domain)}
                   for d, c in domains.most_common(15)]

    runs = defaultdict(list)
    for r in ok:
        runs[r.run_id].append(r)
    trend = []
    for run_id in sorted(runs):
        rr = rates(runs[run_id])
        trend.append({"run_id": run_id, "date": datetime.strptime(run_id, "%Y%m%d%H%M%S").strftime("%d.%m"), **rr})

    return {"overall": rates(ok), "by_provider": by_provider, "prompts": prompt_rows, "sov": sov,
            "top_domains": top_domains, "trend": trend, "errors": len(results) - n}
