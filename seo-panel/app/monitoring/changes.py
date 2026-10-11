"""Wykrywanie zmian na kluczowych stronach klienta i alerty."""
from __future__ import annotations

import asyncio
import hashlib
import logging

import httpx

from ..config import settings
from ..db import session_scope
from ..models import ChangeEvent, Page, PageSnapshot, Project
from ..audit.crawler import normalize_url, parse_html

log = logging.getLogger(__name__)

FIELD_LABELS = {
    "status": "Status HTTP", "title": "Tytuł", "meta_description": "Meta description", "canonical": "Canonical",
    "robots": "Meta robots", "h1": "Nagłówek H1", "robots_txt": "Plik robots.txt", "word_count": "Liczba słów",
}


def _severity(field: str, old, new) -> str:
    if field == "status":
        return "critical" if str(new).startswith(("4", "5", "0")) else "warning"
    if field == "robots" and "noindex" in str(new) and "noindex" not in str(old):
        return "critical"
    if field in ("robots_txt", "canonical", "robots"):
        return "warning"
    return "notice"


async def _snapshot(client: httpx.AsyncClient, url: str) -> dict:
    try:
        r = await client.get(url)
    except httpx.HTTPError as e:
        return {"status": "0", "error": type(e).__name__}
    if url.endswith("/robots.txt"):
        return {"status": str(r.status_code), "robots_txt": hashlib.md5(r.content).hexdigest(), "robots_txt_text": r.text[:3000]}
    snap = {"status": str(r.status_code)}
    if r.status_code == 200 and "html" in r.headers.get("content-type", ""):
        info = parse_html(r.text, str(r.url))
        snap.update(title=info["title"], meta_description=info["meta_description"], canonical=info["canonical"],
                    robots=info["meta_robots"], h1=(info["h1"] or [""])[0],
                    word_count=str(round(info["word_count"], -1)))  # zaokrąglone, by nie alarmować o drobiazgach
    return snap


def _urls_to_watch(db, project: Project) -> list[str]:
    urls = [normalize_url(project.url if "://" in project.url else f"https://{project.url}")]
    audit = project.last_audit
    if audit:
        top = (db.query(Page).filter(Page.audit_id == audit.id, Page.status_code == 200, Page.indexable.is_(True))
               .order_by(Page.inlinks.desc()).limit(19).all())
        urls += [p.url for p in top]
    base = urls[0].split("/", 3)
    urls.append(f"{base[0]}//{base[2]}/robots.txt")
    return list(dict.fromkeys(urls))


def run_change_detection(project_id: int) -> list[dict]:
    with session_scope() as db:
        project = db.get(Project, project_id)
        if project is None:
            return []
        urls = _urls_to_watch(db, project)
        project_name = f"{project.client.name} – {project.name}"

    async def gather():
        async with httpx.AsyncClient(headers={"User-Agent": settings.crawler_user_agent}, timeout=20, follow_redirects=True) as c:
            return await asyncio.gather(*(_snapshot(c, u) for u in urls))

    snaps = asyncio.run(gather())
    events = []
    with session_scope() as db:
        for url, snap in zip(urls, snaps):
            prev = (db.query(PageSnapshot).filter(PageSnapshot.project_id == project_id, PageSnapshot.url == url)
                    .order_by(PageSnapshot.id.desc()).first())
            if prev:
                for field in FIELD_LABELS:
                    old, new = prev.fields.get(field), snap.get(field)
                    if old is None and new is None or old == new:
                        continue
                    if field == "robots_txt":
                        old, new = prev.fields.get("robots_txt_text", ""), snap.get("robots_txt_text", "")
                    ev = ChangeEvent(project_id=project_id, url=url, field=field, old_value=str(old or "")[:3000],
                                     new_value=str(new or "")[:3000], severity=_severity(field, old, new))
                    db.add(ev)
                    events.append({"url": url, "field": FIELD_LABELS[field], "old": str(old or ""), "new": str(new or ""), "severity": ev.severity})
            db.add(PageSnapshot(project_id=project_id, url=url, fields=snap))
    important = [e for e in events if e["severity"] in ("critical", "warning")]
    if important:
        send_alert(project_name, important)
    return events


def send_alert(project_name: str, events: list[dict]) -> None:
    if not (settings.telegram_bot_token and settings.telegram_chat_id):
        return
    lines = [f"⚠️ Zmiany na stronie: {project_name}"]
    for e in events[:15]:
        icon = "🔴" if e["severity"] == "critical" else "🟠"
        lines.append(f"{icon} {e['field']}: {e['url']}\n   było: {e['old'][:80] or '—'}\n   jest: {e['new'][:80] or '—'}")
    try:
        httpx.post(f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage", timeout=20,
                   json={"chat_id": settings.telegram_chat_id, "text": "\n".join(lines), "disable_web_page_preview": True})
    except httpx.HTTPError as e:
        log.warning("Nie udało się wysłać alertu Telegram: %s", e)
