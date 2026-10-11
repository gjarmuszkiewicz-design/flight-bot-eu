"""Sprawdzanie pozycji fraz w Google przez zewnętrzne API SERP (DataForSEO lub Serper)."""
from __future__ import annotations

import logging
from urllib.parse import urlparse

import httpx

from ..config import settings
from ..db import session_scope
from ..models import Keyword, Project, RankCheck

log = logging.getLogger(__name__)

# Kody lokalizacji DataForSEO
LOCATION_CODES = {"pl": 2616, "de": 2276, "gb": 2826, "uk": 2826, "us": 2840, "cz": 2203, "sk": 2703, "ua": 2804, "fr": 2250, "es": 2724, "it": 2380}


def _matches(url: str, domain: str) -> bool:
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    return host == domain or host.endswith("." + domain)


def check_dataforseo(phrase: str, domain: str, country: str, language: str) -> dict:
    task = [{"keyword": phrase, "location_code": LOCATION_CODES.get(country, 2616), "language_code": language,
             "device": "desktop", "depth": 100}]
    r = httpx.post("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", json=task, timeout=120,
                   auth=(settings.dataforseo_login, settings.dataforseo_password))
    r.raise_for_status()
    t = r.json()["tasks"][0]
    if t.get("status_code") != 20000:
        raise RuntimeError(t.get("status_message", "Błąd DataForSEO"))
    items = (t.get("result") or [{}])[0].get("items") or []
    out = {"position": None, "url": "", "ai_overview": False, "ai_overview_cited": False}
    for it in items:
        if it.get("type") == "ai_overview":
            out["ai_overview"] = True
            refs = it.get("references") or []
            out["ai_overview_cited"] = any(_matches(ref.get("url", ""), domain) for ref in refs)
        if it.get("type") == "organic" and out["position"] is None and _matches(it.get("url", ""), domain):
            out["position"], out["url"] = it.get("rank_group"), it.get("url", "")
    return out


def check_serper(phrase: str, domain: str, country: str, language: str) -> dict:
    r = httpx.post("https://google.serper.dev/search", timeout=60, headers={"X-API-KEY": settings.serper_api_key},
                   json={"q": phrase, "gl": country, "hl": language, "num": 100})
    r.raise_for_status()
    out = {"position": None, "url": "", "ai_overview": False, "ai_overview_cited": False}
    for it in r.json().get("organic", []):
        if _matches(it.get("link", ""), domain):
            out["position"], out["url"] = it.get("position"), it.get("link", "")
            break
    return out


def run_rank_tracking(project_id: int) -> int:
    provider = settings.serp_provider
    if provider is None:
        return 0
    check = check_dataforseo if provider == "dataforseo" else check_serper
    with session_scope() as db:
        project = db.get(Project, project_id)
        if project is None:
            return 0
        kws = [(k.id, k.phrase) for k in project.keywords if k.active]
        domain, country, language = project.domain, project.country, project.language
    done = 0
    for kid, phrase in kws:
        try:
            res, err = check(phrase, domain, country, language), ""
        except Exception as e:  # noqa: BLE001
            log.warning("Błąd sprawdzania pozycji '%s': %s", phrase, e)
            res, err = {"position": None, "url": "", "ai_overview": False, "ai_overview_cited": False}, str(e)[:300]
        with session_scope() as db:
            if db.get(Keyword, kid) is not None:
                db.add(RankCheck(keyword_id=kid, error=err, **res))
                done += 1
    return done
