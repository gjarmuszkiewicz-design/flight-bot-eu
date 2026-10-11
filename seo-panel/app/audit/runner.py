"""Uruchomienie pełnego audytu i zapis wyników w bazie."""
from __future__ import annotations

import asyncio
import logging
import traceback
from datetime import datetime

import httpx

from ..config import settings
from ..db import session_scope
from ..models import Audit, Issue, Page
from .aeo import aeo_analysis, check_ai_bots, check_llms_txt, pagespeed
from .ai_review import ai_content_review
from .crawler import crawl
from .rules import indexable, onpage_issues, performance_issues, technical_issues
from .scoring import compute_scores

log = logging.getLogger(__name__)
SEVERITY_ORDER = {"critical": 0, "warning": 1, "notice": 2}


def _set_progress(audit_id: int, msg: str) -> None:
    with session_scope() as db:
        a = db.get(Audit, audit_id)
        if a:
            a.progress = msg


async def _run(audit_id: int, url: str, max_pages: int):
    _set_progress(audit_id, "Rozpoczynam skanowanie")
    result = await crawl(url, max_pages=max_pages, progress=lambda m: _set_progress(audit_id, m))

    _set_progress(audit_id, "Sprawdzam dostęp botów AI i llms.txt")
    headers = {"User-Agent": settings.crawler_user_agent}
    async with httpx.AsyncClient(headers=headers, timeout=20, follow_redirects=True) as client:
        bots = await check_ai_bots(client, result)
        llms = await check_llms_txt(client, result)

    _set_progress(audit_id, "Mierzę wydajność (PageSpeed Insights)")
    psi = await pagespeed(result.start_url)
    return result, bots, llms, psi


def run_audit(audit_id: int) -> None:
    with session_scope() as db:
        audit = db.get(Audit, audit_id)
        if audit is None:
            return
        audit.status, audit.started_at = "running", datetime.utcnow()
        url, max_pages = audit.project.url, audit.project.max_pages

    try:
        result, bots, llms, psi = asyncio.run(_run(audit_id, url, max_pages))
        issues = technical_issues(result) + onpage_issues(result) + performance_issues(result, psi)
        aeo_list, aeo_data = aeo_analysis(result, bots, llms)
        issues += aeo_list
        html_count = sum(1 for p in result.pages.values() if p.is_html) or 1
        scores = compute_scores(issues, html_count)

        review = ""
        if settings.anthropic_api_key:
            _set_progress(audit_id, "Claude ocenia treści pod kątem cytowalności")
            review = ai_content_review(result)

        with session_scope() as db:
            audit = db.get(Audit, audit_id)
            for p in result.pages.values():
                db.add(Page(
                    audit_id=audit_id, url=p.url, status_code=p.status, depth=p.depth,
                    title=p.info.get("title", "")[:500], meta_description=p.info.get("meta_description", "")[:1000],
                    h1=(p.info.get("h1") or [""])[0][:500], word_count=p.info.get("word_count", 0),
                    response_ms=p.response_ms, size_kb=round(p.size_bytes / 1024), inlinks=p.inlinks,
                    indexable=p.is_html and indexable(p), schema_types=", ".join(p.info.get("schema_types", [])),
                ))
            for i in sorted(issues, key=lambda x: (SEVERITY_ORDER[x["severity"]], -x["count"])):
                db.add(Issue(audit_id=audit_id, **i))
            audit.pages_crawled = len(result.pages)
            audit.score_total = scores["total"]
            audit.score_technical = scores["technical"]
            audit.score_onpage = scores["onpage"]
            audit.score_performance = scores["performance"]
            audit.score_aeo = scores["aeo"]
            audit.data = {
                "start_url": result.start_url,
                "robots_txt": (result.robots_txt or "")[:5000],
                "robots_status": result.robots_status,
                "sitemaps": result.sitemap_sources,
                "sitemap_count": len(result.sitemap_urls),
                "https_redirect": result.http_redirects_to_https,
                "psi": psi,
                "aeo": aeo_data,
                "external_checked": len(result.external_links),
                "status_counts": _status_counts(result),
            }
            audit.ai_review = review
            audit.status, audit.progress, audit.finished_at = "done", "Zakończony", datetime.utcnow()
    except Exception as e:  # noqa: BLE001 – każdy błąd zapisujemy w audycie
        log.exception("Audyt %s nie powiódł się", audit_id)
        with session_scope() as db:
            audit = db.get(Audit, audit_id)
            audit.status, audit.progress = "error", "Błąd"
            audit.error = f"{type(e).__name__}: {e}\n\n{traceback.format_exc()[-2000:]}"
            audit.finished_at = datetime.utcnow()


def _status_counts(result) -> dict[str, int]:
    out = {"2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, "błąd": 0}
    for p in result.pages.values():
        if p.status == 0:
            out["błąd"] += 1
        elif p.redirect_chain:
            out["3xx"] += 1
        else:
            out[f"{str(p.status)[0]}xx"] = out.get(f"{str(p.status)[0]}xx", 0) + 1
    return out
