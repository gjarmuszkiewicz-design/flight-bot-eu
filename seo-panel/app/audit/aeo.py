"""Audyt AEO: dostęp botów AI, llms.txt, dane strukturalne, struktura odpowiedzi, E-E-A-T."""
from __future__ import annotations

import re
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx

from ..config import settings
from .crawler import CrawlResult
from .rules import CRITICAL, NOTICE, WARNING, html_pages, indexable, issue

# purpose: search = wyszukiwanie/cytowanie w odpowiedziach, user = pobieranie na prośbę użytkownika,
# training = trenowanie modeli (blokada to decyzja biznesowa, nie błąd)
AI_BOTS = [
    {"token": "OAI-SearchBot", "owner": "OpenAI", "purpose": "search",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot"},
    {"token": "ChatGPT-User", "owner": "OpenAI", "purpose": "user",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot"},
    {"token": "GPTBot", "owner": "OpenAI", "purpose": "training",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot"},
    {"token": "Claude-SearchBot", "owner": "Anthropic", "purpose": "search",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-SearchBot/1.0; +https://www.anthropic.com"},
    {"token": "Claude-User", "owner": "Anthropic", "purpose": "user",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-User/1.0; +https://www.anthropic.com"},
    {"token": "ClaudeBot", "owner": "Anthropic", "purpose": "training",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +claudebot@anthropic.com"},
    {"token": "PerplexityBot", "owner": "Perplexity", "purpose": "search",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot"},
    {"token": "Perplexity-User", "owner": "Perplexity", "purpose": "user",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user"},
    {"token": "Googlebot", "owner": "Google", "purpose": "search",
     "ua": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"},
    {"token": "Google-Extended", "owner": "Google", "purpose": "training", "ua": None},
    {"token": "Bingbot", "owner": "Microsoft (Copilot)", "purpose": "search",
     "ua": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/130.0 Safari/537.36"},
    {"token": "Applebot-Extended", "owner": "Apple", "purpose": "training", "ua": None},
    {"token": "meta-externalagent", "owner": "Meta", "purpose": "training",
     "ua": "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)"},
    {"token": "CCBot", "owner": "Common Crawl", "purpose": "training", "ua": "CCBot/2.0 (https://commoncrawl.org/faq/)"},
]

PURPOSE_LABEL = {"search": "Wyszukiwanie i cytowanie", "user": "Pobieranie na prośbę użytkownika", "training": "Trenowanie modeli"}

ABOUT_RE = re.compile(r"/(o-nas|o-mnie|about|o-firmie|kim-jestesmy|zespol|team)", re.I)
CONTACT_RE = re.compile(r"/(kontakt|contact)", re.I)
PRIVACY_RE = re.compile(r"(polityka-prywatnosci|privacy)", re.I)
ORG_TYPES = {"Organization", "LocalBusiness", "Corporation", "ProfessionalService", "Store", "OnlineStore",
             "MedicalBusiness", "LegalService", "Restaurant", "Dentist", "Physician", "HomeAndConstructionBusiness"}
ARTICLE_TYPES = {"Article", "BlogPosting", "NewsArticle", "TechArticle"}


async def check_ai_bots(client: httpx.AsyncClient, crawl: CrawlResult) -> list[dict]:
    home = crawl.start_url
    rp = RobotFileParser()
    rp.parse((crawl.robots_txt or "").splitlines())

    base_resp = None
    try:
        base_resp = await client.get(home)
    except httpx.HTTPError:
        pass
    base_len = len(base_resp.content) if base_resp is not None else 0

    results = []
    for bot in AI_BOTS:
        allowed = rp.can_fetch(bot["token"], home)
        live_status, live_ok, note = None, None, ""
        if bot["ua"]:
            try:
                r = await client.get(home, headers={"User-Agent": bot["ua"]})
                live_status = r.status_code
                live_ok = r.status_code < 400 and (base_len == 0 or len(r.content) > base_len * 0.3)
                if r.status_code >= 400:
                    note = f"Serwer zwraca {r.status_code} (np. firewall, Cloudflare, wtyczka bezpieczeństwa)"
                elif not live_ok:
                    note = "Odpowiedź znacznie krótsza niż dla przeglądarki (możliwa strona blokady lub wyzwanie JS)"
            except httpx.HTTPError as e:
                live_ok, note = False, f"Błąd połączenia: {type(e).__name__}"
        results.append({**bot, "purpose_label": PURPOSE_LABEL[bot["purpose"]], "robots_allowed": allowed,
                        "live_status": live_status, "live_ok": live_ok, "note": note})
    return results


async def check_llms_txt(client: httpx.AsyncClient, crawl: CrawlResult) -> dict:
    base = f"{urlparse(crawl.start_url).scheme}://{urlparse(crawl.start_url).netloc}"
    out = {"url": f"{base}/llms.txt", "exists": False, "valid": False, "links": 0, "full_exists": False}
    try:
        r = await client.get(out["url"])
        ctype = r.headers.get("content-type", "")
        if r.status_code == 200 and "html" not in ctype:
            text = r.text
            out["exists"] = True
            out["valid"] = text.lstrip().startswith("# ")
            out["links"] = len(re.findall(r"\[[^\]]+\]\([^)]+\)", text))
            out["preview"] = text[:1500]
        r2 = await client.get(f"{base}/llms-full.txt")
        out["full_exists"] = r2.status_code == 200 and "html" not in r2.headers.get("content-type", "")
    except httpx.HTTPError:
        pass
    return out


def _walk(obj):
    if isinstance(obj, list):
        for o in obj:
            yield from _walk(o)
    elif isinstance(obj, dict):
        yield obj
        for v in obj.values():
            if isinstance(v, (dict, list)):
                yield from _walk(v)


def _types(node: dict) -> set[str]:
    t = node.get("@type")
    return {t} if isinstance(t, str) else set(t or [])


def aeo_analysis(crawl: CrawlResult, bots: list[dict], llms: dict) -> tuple[list[dict], dict]:
    out: list[dict] = []
    html = [p for p in html_pages(crawl) if indexable(p)]
    home = crawl.pages.get(crawl.start_url)
    if home and not home.is_html:
        home = next((p for p in html if p.depth == 0), None)

    # 1. Boty AI
    blocked_search = [b for b in bots if b["purpose"] in ("search", "user") and not b["robots_allowed"]]
    if blocked_search:
        out.append(issue("aeo", "ai_search_bots_blocked", CRITICAL,
                         "robots.txt blokuje boty wyszukiwarek AI: " + ", ".join(b["token"] for b in blocked_search),
                         "Te boty pobierają treści do odpowiedzi w ChatGPT, Claude, Perplexity i Google. Zablokowana strona nie może być cytowana.",
                         "Usuń blokady (Disallow) dla tych botów w robots.txt.", [f"https://{crawl.host}/robots.txt"]))
    firewall = [b for b in bots if b["live_ok"] is False and b["robots_allowed"]]
    if firewall:
        out.append(issue("aeo", "ai_bots_firewall", CRITICAL,
                         "Serwer blokuje boty AI: " + ", ".join(b["token"] for b in firewall),
                         "robots.txt pozwala na dostęp, ale serwer, CDN lub firewall odrzuca te boty.",
                         "Sprawdź reguły Cloudflare (Bot Fight Mode, AI Scrapers), WAF i wtyczki bezpieczeństwa. Dodaj wyjątki dla botów wyszukiwania AI.",
                         [crawl.start_url]))
    blocked_training = [b for b in bots if b["purpose"] == "training" and not b["robots_allowed"]]
    if blocked_training:
        out.append(issue("aeo", "ai_training_blocked", NOTICE,
                         "Zablokowane boty treningowe: " + ", ".join(b["token"] for b in blocked_training),
                         "Blokada botów treningowych to decyzja biznesowa. Może ograniczać wiedzę modeli o marce w przyszłych wersjach.",
                         "Omów z klientem: jeśli zależy mu na rozpoznawalności w AI, rozważ dopuszczenie tych botów.",
                         [f"https://{crawl.host}/robots.txt"]))

    # 2. llms.txt
    if not llms["exists"]:
        out.append(issue("aeo", "no_llms_txt", NOTICE, "Brak pliku llms.txt",
                         "llms.txt to nowy, nieobowiązkowy standard: mapa najważniejszych treści w formacie przyjaznym dla modeli językowych.",
                         "Dodaj /llms.txt z nazwą firmy, krótkim opisem i listą kluczowych stron w Markdown.", [llms["url"]]))
    elif not llms["valid"]:
        out.append(issue("aeo", "bad_llms_txt", NOTICE, "llms.txt ma niepoprawną strukturę",
                         "Plik powinien zaczynać się od nagłówka '# Nazwa' i zawierać listę linków w Markdown.",
                         "Popraw strukturę pliku zgodnie ze specyfikacją llmstxt.org.", [llms["url"]]))

    # 3. Dane strukturalne
    all_nodes = []
    for p in html:
        for block in p.info.get("jsonld", []):
            all_nodes.extend(_walk(block))
    all_types = set()
    for n in all_nodes:
        all_types |= _types(n)
    for p in html:
        all_types |= set(p.info.get("schema_types", []))

    with_schema = [p for p in html if p.info.get("schema_types")]
    if not with_schema:
        out.append(issue("aeo", "no_schema", WARNING, "Brak danych strukturalnych (schema.org)",
                         "Dane strukturalne pomagają wyszukiwarkom i modelom AI jednoznacznie zrozumieć, kim jest firma i co oferuje.",
                         "Dodaj JSON-LD: Organization/LocalBusiness na stronie głównej, Article na wpisach, Product/Service na ofercie, FAQPage przy FAQ.", []))
    home_types = set(home.info.get("schema_types", [])) if home else set()
    if home and not (home_types & ORG_TYPES):
        out.append(issue("aeo", "no_org_schema", WARNING, "Strona główna bez schema Organization/LocalBusiness",
                         "To podstawowa „wizytówka” firmy dla wyszukiwarek i AI (nazwa, logo, adres, kontakt, profile).",
                         "Dodaj JSON-LD Organization lub LocalBusiness z polami name, url, logo, address, telephone, sameAs.", [home.url]))
    org_nodes = [n for n in all_nodes if _types(n) & ORG_TYPES]
    if org_nodes and not any(n.get("sameAs") for n in org_nodes):
        out.append(issue("aeo", "no_sameas", NOTICE, "Schema organizacji bez sameAs",
                         "sameAs łączy markę z profilami (LinkedIn, Facebook, Wikipedia, Google Maps) – to ważny sygnał tożsamości encji.",
                         "Dodaj w Organization pole sameAs z adresami oficjalnych profili.", [home.url] if home else []))
    bad_json = [p.url for p in html if p.info.get("jsonld_errors")]
    if bad_json:
        out.append(issue("aeo", "jsonld_errors", WARNING, "Błędy składni JSON-LD",
                         "Część bloków danych strukturalnych nie da się odczytać – są ignorowane.",
                         "Popraw składnię i sprawdź w validator.schema.org.", bad_json))
    article_no_author = []
    for p in html:
        for block in p.info.get("jsonld", []):
            for n in _walk(block):
                if _types(n) & ARTICLE_TYPES and not n.get("author"):
                    article_no_author.append(p.url)
    if article_no_author:
        out.append(issue("aeo", "article_no_author", WARNING, "Artykuły bez autora w danych strukturalnych",
                         "Autor z bio to kluczowy sygnał E-E-A-T dla Google i modeli AI.",
                         "Dodaj w schema Article pole author (Person z name, url, sameAs).", article_no_author))
    faq_candidates = [p.url for p in html if p.info.get("question_headings", 0) >= 3 and "FAQPage" not in p.info.get("schema_types", [])]
    if faq_candidates:
        out.append(issue("aeo", "faq_no_schema", NOTICE, "Sekcje pytań bez schema FAQPage",
                         "Strony zawierają kilka nagłówków w formie pytań, ale bez oznaczenia FAQPage.",
                         "Oznacz sekcje FAQ danymi strukturalnymi FAQPage (pytanie + zwięzła odpowiedź).", faq_candidates))

    # 4. Treść zależna od JavaScript
    js_pages = [p.url for p in html if p.info.get("word_count", 0) < 80 and (p.info.get("has_app_root") or p.info.get("script_count", 0) > 15)]
    if js_pages:
        out.append(issue("aeo", "js_rendered", CRITICAL, "Treść widoczna dopiero po wykonaniu JavaScriptu",
                         "W surowym HTML prawie nie ma tekstu. Większość botów AI (GPTBot, ClaudeBot, PerplexityBot) nie wykonuje JavaScriptu i widzi pustą stronę.",
                         "Włącz renderowanie po stronie serwera (SSR) lub generowanie statyczne (SSG), albo prerendering dla botów.", js_pages))

    # 5. Struktura „pod odpowiedź”
    content_pages = [p for p in html if p.info.get("word_count", 0) >= 300]
    no_q = [p.url for p in content_pages if p.info.get("question_headings", 0) == 0]
    if content_pages and len(no_q) > len(content_pages) * 0.6:
        out.append(issue("aeo", "no_question_headings", NOTICE, "Mało nagłówków w formie pytań",
                         "Modele AI chętnie cytują fragmenty, które bezpośrednio odpowiadają na pytanie zadane w nagłówku.",
                         "Przeredaguj część nagłówków H2/H3 na pytania klientów i zaczynaj sekcję od 1–2 zdań konkretnej odpowiedzi.", no_q))
    no_struct = [p.url for p in content_pages if p.info.get("lists", 0) == 0 and p.info.get("tables", 0) == 0]
    if no_struct:
        out.append(issue("aeo", "no_structure", NOTICE, "Długie teksty bez list i tabel",
                         "Listy, tabele i kroki ułatwiają modelom wyciągnięcie konkretnej odpowiedzi.",
                         "Dodaj listy punktowane, tabele porównawcze, instrukcje krok po kroku.", no_struct))
    few_headings = [p.url for p in content_pages if p.info.get("word_count", 0) > 800 and len(p.info.get("headings", [])) < 4]
    if few_headings:
        out.append(issue("aeo", "few_headings", NOTICE, "Długie teksty z małą liczbą nagłówków",
                         "Ściana tekstu utrudnia wyodrębnienie fragmentów do cytowania.",
                         "Dziel treść na sekcje z nagłówkami co 200–300 słów.", few_headings))

    # 6. E-E-A-T
    all_links = {l["href"] for p in html for l in p.info.get("links", [])} | set(crawl.pages)
    has_about = any(ABOUT_RE.search(urlparse(u).path) for u in all_links)
    has_contact = any(CONTACT_RE.search(urlparse(u).path) for u in all_links)
    has_privacy = any(PRIVACY_RE.search(u) for u in all_links)
    if not has_about:
        out.append(issue("aeo", "no_about", WARNING, "Brak strony „O nas”",
                         "Strona o firmie i ludziach buduje wiarygodność (E-E-A-T) i daje AI fakty o marce.",
                         "Dodaj stronę „O nas” z historią, zespołem, doświadczeniem, certyfikatami i danymi firmy.", []))
    if not has_contact:
        out.append(issue("aeo", "no_contact", WARNING, "Brak strony kontaktowej",
                         "Dane kontaktowe i adres to podstawowy sygnał zaufania.",
                         "Dodaj stronę kontakt z adresem, telefonem, e-mailem i mapą (spójne z wizytówką Google).", []))
    if not has_privacy:
        out.append(issue("aeo", "no_privacy", NOTICE, "Nie znaleziono polityki prywatności",
                         "Polityka prywatności to wymóg prawny (RODO) i sygnał wiarygodności.",
                         "Dodaj politykę prywatności i podlinkuj ją w stopce.", []))
    articles = [p for p in html if (set(p.info.get("schema_types", [])) & ARTICLE_TYPES) or p.info.get("published")]
    no_dates = [p.url for p in articles if not (p.info.get("modified") or p.info.get("published") or p.info.get("time_tags"))]
    if no_dates:
        out.append(issue("aeo", "no_dates", NOTICE, "Artykuły bez widocznej daty",
                         "Data publikacji i aktualizacji pomaga AI ocenić świeżość informacji.",
                         "Pokaż datę publikacji i ostatniej aktualizacji, dodaj datePublished/dateModified w schema.", no_dates))

    signals = {
        "about": has_about, "contact": has_contact, "privacy": has_privacy,
        "org_schema": bool(home_types & ORG_TYPES), "sameas": any(n.get("sameAs") for n in org_nodes),
        "llms_txt": llms["exists"], "schema_types": sorted(all_types)[:40],
        "pages_with_schema": len(with_schema), "pages_total": len(html),
        "question_headings": sum(p.info.get("question_headings", 0) for p in html),
    }
    return out, {"bots": bots, "llms": llms, "signals": signals}


async def pagespeed(url: str) -> dict:
    params = {"url": url, "strategy": "mobile", "category": "performance"}
    if settings.pagespeed_api_key:
        params["key"] = settings.pagespeed_api_key
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.get("https://www.googleapis.com/pagespeedonline/v5/runPagespeed", params=params)
        if r.status_code != 200:
            return {"error": f"PageSpeed API zwróciło {r.status_code}"}
        d = r.json()
    except (httpx.HTTPError, ValueError) as e:
        return {"error": f"PageSpeed niedostępne: {type(e).__name__}"}
    lh = d.get("lighthouseResult", {})
    audits = lh.get("audits", {})
    field = d.get("loadingExperience", {}).get("metrics", {})
    perf = lh.get("categories", {}).get("performance", {}).get("score")

    def fval(key):
        return field.get(key, {}).get("percentile")

    cls_field = fval("CUMULATIVE_LAYOUT_SHIFT_SCORE")
    return {
        "score": round(perf * 100) if perf is not None else None,
        "lcp_ms": fval("LARGEST_CONTENTFUL_PAINT_MS") or round(audits.get("largest-contentful-paint", {}).get("numericValue", 0)) or None,
        "cls": (cls_field / 100) if cls_field is not None else audits.get("cumulative-layout-shift", {}).get("numericValue"),
        "inp_ms": fval("INTERACTION_TO_NEXT_PAINT"),
        "fcp_ms": round(audits.get("first-contentful-paint", {}).get("numericValue", 0)) or None,
        "tbt_ms": round(audits.get("total-blocking-time", {}).get("numericValue", 0)),
        "field_data": bool(field),
    }
