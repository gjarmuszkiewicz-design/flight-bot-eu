"""Panel SEO/AEO – aplikacja webowa (FastAPI)."""
from __future__ import annotations

import hmac
import logging
import re
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import Depends, FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from . import helpers, jobs
from .audit.scoring import CATEGORY_LABELS
from .config import settings
from .db import get_db, init_db
from .models import AIPrompt, AIResult, Audit, ChangeEvent, Client, Issue, Keyword, Page, Project
from .monitoring.ai_visibility import PROVIDER_LABELS, compute_metrics
from .monitoring.changes import FIELD_LABELS
from .reports import render_pdf, report_context

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
BASE = Path(__file__).parent


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    jobs.recover_stuck_audits()
    jobs.start_scheduler()
    yield
    jobs.stop_scheduler()


app = FastAPI(title="Panel SEO/AEO", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")
templates = Jinja2Templates(directory=BASE / "templates")
helpers.register(templates.env)
templates.env.globals.update(settings=settings, PROVIDER_LABELS=PROVIDER_LABELS, FIELD_LABELS=FIELD_LABELS)

PUBLIC_PATHS = ("/login", "/static", "/health")


@app.middleware("http")
async def require_login(request: Request, call_next):
    path = request.url.path
    if not path.startswith(PUBLIC_PATHS) and not request.session.get("user"):
        if request.headers.get("HX-Request"):
            return Response(status_code=401, headers={"HX-Redirect": "/login"})
        return RedirectResponse(f"/login?next={path}", status_code=303)
    return await call_next(request)


# SessionMiddleware dodany po require_login, więc działa wcześniej (owija go)
app.add_middleware(
    SessionMiddleware, secret_key=settings.secret_key, session_cookie="seo_panel",
    max_age=60 * 60 * 24 * 14, same_site="lax", https_only=settings.cookie_secure,
)


def flash(request: Request, msg: str, kind: str = "ok") -> None:
    request.session.setdefault("flash", []).append({"msg": msg, "kind": kind})


def render(request: Request, name: str, **ctx) -> HTMLResponse:
    ctx["flashes"] = request.session.pop("flash", [])
    ctx["path"] = request.url.path
    ctx["unseen_alerts"] = ctx.get("unseen_alerts", 0)
    return templates.TemplateResponse(request, name, ctx)


def back(url: str) -> RedirectResponse:
    return RedirectResponse(url, status_code=303)


def get_project(db: Session, project_id: int) -> Project:
    p = db.get(Project, project_id)
    if p is None:
        raise HTTPException(404, "Nie znaleziono projektu")
    return p


def clean_url(url: str) -> str:
    url = url.strip()
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    return url.rstrip("/") + "/" if url.count("/") == 2 else url


def unseen_count(db: Session) -> int:
    return db.query(func.count(ChangeEvent.id)).filter(ChangeEvent.seen.is_(False), ChangeEvent.severity != "notice").scalar() or 0


# ---------------- Logowanie ----------------

_failed: dict[str, list[float]] = {}


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request, next: str = "/"):
    return render(request, "login.html", next=next, configured=bool(settings.admin_password))


@app.post("/login")
def login(request: Request, username: str = Form(""), password: str = Form(""), next: str = Form("/")):
    ip = request.client.host if request.client else "?"
    recent = [t for t in _failed.get(ip, []) if t > time.time() - 900]
    if len(recent) >= 8:
        flash(request, "Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut.", "error")
        return back("/login")
    ok = (
        bool(settings.admin_password)
        and hmac.compare_digest(username.encode(), settings.admin_user.encode())
        and hmac.compare_digest(password.encode(), settings.admin_password.encode())
    )
    if not ok:
        _failed[ip] = recent + [time.time()]
        time.sleep(0.8)
        flash(request, "Nieprawidłowy login lub hasło.", "error")
        return back("/login")
    _failed.pop(ip, None)
    request.session.clear()
    request.session["user"] = username
    return back(next if next.startswith("/") and not next.startswith("//") else "/")


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return back("/login")


# ---------------- Kokpit ----------------

@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db)):
    projects = db.query(Project).join(Client).order_by(Client.name, Project.name).all()
    cards = []
    for p in projects:
        a = p.last_audit
        ai_rows = (db.query(AIResult).filter(AIResult.project_id == p.id, AIResult.error == "")
                   .order_by(AIResult.run_id.desc()).limit(400).all())
        last_run = ai_rows[0].run_id if ai_rows else None
        latest = [r for r in ai_rows if r.run_id == last_run]
        history = [x.score_total for x in reversed(p.audits) if x.status == "done"][-8:]
        cards.append({
            "p": p, "audit": a,
            "critical": sum(1 for i in a.issues if i.severity == "critical") if a else 0,
            "ai_mention": round(100 * sum(r.mentioned for r in latest) / len(latest)) if latest else None,
            "history": history,
            "running": any(x.status in ("queued", "running") for x in p.audits),
        })
    scored = [c["audit"].score_total for c in cards if c["audit"]]
    since = datetime.utcnow() - timedelta(days=14)
    changes = (db.query(ChangeEvent).filter(ChangeEvent.created_at >= since)
               .order_by(ChangeEvent.id.desc()).limit(8).all())
    recent_audits = db.query(Audit).order_by(Audit.id.desc()).limit(6).all()
    kpi = {
        "clients": db.query(func.count(Client.id)).scalar(),
        "projects": len(projects),
        "avg_score": round(sum(scored) / len(scored)) if scored else None,
        "critical": sum(c["critical"] for c in cards),
        "alerts": unseen_count(db),
    }
    clients = db.query(Client).order_by(Client.name).all()
    return render(request, "dashboard.html", cards=cards, kpi=kpi, changes=changes, recent_audits=recent_audits,
                  clients=clients, unseen_alerts=kpi["alerts"])


# ---------------- Klienci ----------------

@app.get("/klienci", response_class=HTMLResponse)
def clients_page(request: Request, db: Session = Depends(get_db)):
    clients = db.query(Client).order_by(Client.name).all()
    return render(request, "clients.html", clients=clients, unseen_alerts=unseen_count(db))


@app.post("/klienci")
def client_create(request: Request, name: str = Form(...), contact_name: str = Form(""), contact_email: str = Form(""),
                  notes: str = Form(""), db: Session = Depends(get_db)):
    c = Client(name=name.strip(), contact_name=contact_name.strip(), contact_email=contact_email.strip(), notes=notes)
    db.add(c)
    db.commit()
    flash(request, f"Dodano klienta {c.name}. Teraz dodaj jego stronę.")
    return back(f"/klienci/{c.id}")


@app.get("/klienci/{client_id}", response_class=HTMLResponse)
def client_page(request: Request, client_id: int, db: Session = Depends(get_db)):
    c = db.get(Client, client_id)
    if c is None:
        raise HTTPException(404)
    return render(request, "client.html", client=c, unseen_alerts=unseen_count(db))


@app.post("/klienci/{client_id}/edytuj")
def client_edit(request: Request, client_id: int, name: str = Form(...), contact_name: str = Form(""),
                contact_email: str = Form(""), notes: str = Form(""), db: Session = Depends(get_db)):
    c = db.get(Client, client_id)
    if c is None:
        raise HTTPException(404)
    c.name, c.contact_name, c.contact_email, c.notes = name.strip(), contact_name.strip(), contact_email.strip(), notes
    db.commit()
    flash(request, "Zapisano dane klienta.")
    return back(f"/klienci/{client_id}")


@app.post("/klienci/{client_id}/usun")
def client_delete(request: Request, client_id: int, db: Session = Depends(get_db)):
    c = db.get(Client, client_id)
    if c:
        _delete_project_data(db, [p.id for p in c.projects])
        db.delete(c)
        db.commit()
        flash(request, "Usunięto klienta i wszystkie jego dane.")
    return back("/klienci")


@app.post("/klienci/{client_id}/projekty")
def project_create(request: Request, client_id: int, name: str = Form(...), url: str = Form(...),
                   brand_name: str = Form(""), max_pages: int = Form(200), start_audit: str = Form(""),
                   db: Session = Depends(get_db)):
    c = db.get(Client, client_id)
    if c is None:
        raise HTTPException(404)
    p = Project(client_id=client_id, name=name.strip(), url=clean_url(url), brand_name=brand_name.strip() or c.name,
                max_pages=max(10, min(max_pages, 2000)))
    db.add(p)
    db.commit()
    if start_audit:
        jobs.start_audit(p.id)
        flash(request, "Projekt utworzony. Audyt ruszył – wyniki pojawią się za kilka minut.")
        return back(f"/projekty/{p.id}/audyt")
    flash(request, "Projekt utworzony.")
    return back(f"/projekty/{p.id}")


# ---------------- Projekt ----------------

def project_ctx(db: Session, p: Project, tab: str) -> dict:
    return {"project": p, "tab": tab, "unseen_alerts": unseen_count(db),
            "audit_running": any(a.status in ("queued", "running") for a in p.audits)}


@app.get("/projekty/{project_id}", response_class=HTMLResponse)
def project_overview(request: Request, project_id: int, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    audit = p.last_audit
    results = db.query(AIResult).filter(AIResult.project_id == p.id).all()
    ai = compute_metrics(results, p) if results else None
    if ai and ai["trend"]:
        last_run = max(r.run_id for r in results)
        ai["latest"] = compute_metrics([r for r in results if r.run_id == last_run], p)["overall"]
    history = [a for a in reversed(p.audits) if a.status == "done"][-12:]
    changes = p.changes[:6]
    return render(request, "project_overview.html", **project_ctx(db, p, "overview"), audit=audit, ai=ai,
                  history=history, changes=changes, top_issues=(audit.issues[:6] if audit else []))


@app.post("/projekty/{project_id}/audyt")
def audit_start(request: Request, project_id: int, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    if any(a.status in ("queued", "running") for a in p.audits):
        flash(request, "Audyt tego projektu już trwa.", "error")
    else:
        jobs.start_audit(p.id)
        flash(request, "Audyt uruchomiony. Możesz zamknąć tę stronę – wyniki zapiszą się automatycznie.")
    return back(f"/projekty/{project_id}/audyt")


@app.get("/projekty/{project_id}/audyt", response_class=HTMLResponse)
def audit_page(request: Request, project_id: int, id: int | None = None, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    current = db.get(Audit, id) if id else (p.audits[0] if p.audits else None)
    if current and current.project_id != p.id:
        raise HTTPException(404)
    previous = None
    if current and current.status == "done":
        previous = next((a for a in p.audits if a.status == "done" and a.id < current.id), None)
    pages = []
    if current and current.status == "done":
        pages = db.query(Page).filter(Page.audit_id == current.id).order_by(Page.depth, Page.url).limit(3000).all()
    counts = {}
    if current:
        for i in current.issues:
            counts[i.severity] = counts.get(i.severity, 0) + 1
    return render(request, "project_audit.html", **project_ctx(db, p, "audit"), audit=current, previous=previous,
                  pages=pages, counts=counts, categories=CATEGORY_LABELS)


@app.get("/audyty/{audit_id}/status", response_class=HTMLResponse)
def audit_status(request: Request, audit_id: int, db: Session = Depends(get_db)):
    a = db.get(Audit, audit_id)
    if a is None:
        raise HTTPException(404)
    if a.status in ("done", "error"):
        return Response(headers={"HX-Refresh": "true"})
    return templates.TemplateResponse(request, "partials/audit_progress.html", {"audit": a})


@app.post("/audyty/{audit_id}/usun")
def audit_delete(request: Request, audit_id: int, db: Session = Depends(get_db)):
    a = db.get(Audit, audit_id)
    if a is None:
        raise HTTPException(404)
    pid = a.project_id
    if a.status in ("queued", "running"):
        flash(request, "Nie można usunąć trwającego audytu.", "error")
    else:
        db.delete(a)
        db.commit()
        flash(request, "Audyt usunięty.")
    return back(f"/projekty/{pid}/audyt")


# ---- Widoczność w AI ----

@app.get("/projekty/{project_id}/ai", response_class=HTMLResponse)
def ai_page(request: Request, project_id: int, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    results = db.query(AIResult).filter(AIResult.project_id == p.id).all()
    metrics = compute_metrics(results, p) if results else None
    last_run = max((r.run_id for r in results), default=None)
    latest = [r for r in results if r.run_id == last_run]
    latest_metrics = compute_metrics(latest, p) if latest else None
    latest.sort(key=lambda r: (r.prompt_id, r.provider, r.sample))
    return render(request, "project_ai.html", **project_ctx(db, p, "ai"), metrics=metrics, latest=latest,
                  latest_metrics=latest_metrics, last_run=last_run, providers=settings.ai_providers,
                  running=jobs.is_running(f"ai:{p.id}"))


@app.post("/projekty/{project_id}/ai/prompty")
def ai_add_prompts(request: Request, project_id: int, prompts: str = Form(...), db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    existing = {x.text.strip().lower() for x in p.prompts}
    added = 0
    for line in prompts.splitlines():
        line = line.strip()
        if line and line.lower() not in existing:
            db.add(AIPrompt(project_id=p.id, text=line[:1000]))
            existing.add(line.lower())
            added += 1
    db.commit()
    flash(request, f"Dodano zapytania: {added}.")
    return back(f"/projekty/{project_id}/ai")


@app.post("/prompty/{prompt_id}/usun")
def ai_delete_prompt(request: Request, prompt_id: int, db: Session = Depends(get_db)):
    pr = db.get(AIPrompt, prompt_id)
    if pr is None:
        raise HTTPException(404)
    pid = pr.project_id
    db.query(AIResult).filter(AIResult.prompt_id == prompt_id).delete()
    db.delete(pr)
    db.commit()
    flash(request, "Usunięto zapytanie i jego historię.")
    return back(f"/projekty/{pid}/ai")


@app.post("/prompty/{prompt_id}/przelacz")
def ai_toggle_prompt(prompt_id: int, db: Session = Depends(get_db)):
    pr = db.get(AIPrompt, prompt_id)
    if pr is None:
        raise HTTPException(404)
    pr.active = not pr.active
    db.commit()
    return back(f"/projekty/{pr.project_id}/ai")


@app.post("/projekty/{project_id}/ai/uruchom")
def ai_run(request: Request, project_id: int, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    if not any(settings.ai_providers.values()):
        flash(request, "Dodaj przynajmniej jeden klucz API modelu AI (zobacz Ustawienia).", "error")
    elif not any(x.active for x in p.prompts):
        flash(request, "Najpierw dodaj zapytania do monitorowania.", "error")
    elif jobs.start_ai(p.id):
        n = sum(1 for x in p.prompts if x.active) * sum(settings.ai_providers.values()) * p.ai_samples
        flash(request, f"Monitoring AI uruchomiony ({n} zapytań). Odśwież stronę za kilka minut.")
    else:
        flash(request, "Monitoring AI dla tego projektu już trwa.", "error")
    return back(f"/projekty/{project_id}/ai")


# ---- Pozycje ----

@app.get("/projekty/{project_id}/pozycje", response_class=HTMLResponse)
def ranks_page(request: Request, project_id: int, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    rows = []
    for k in p.keywords:
        hist = list(reversed(k.checks[:12]))
        last, prev = k.last, k.previous
        delta = None
        if last and prev and last.position and prev.position:
            delta = prev.position - last.position
        rows.append({"k": k, "last": last, "delta": delta, "history": [c.position for c in hist],
                     "best": min((c.position for c in k.checks if c.position), default=None)})
    ranked = [r for r in rows if r["last"] and r["last"].position]
    summary = {
        "top3": sum(1 for r in ranked if r["last"].position <= 3),
        "top10": sum(1 for r in ranked if r["last"].position <= 10),
        "avg": round(sum(r["last"].position for r in ranked) / len(ranked), 1) if ranked else None,
        "aio": sum(1 for r in rows if r["last"] and r["last"].ai_overview),
        "aio_cited": sum(1 for r in rows if r["last"] and r["last"].ai_overview_cited),
    }
    return render(request, "project_ranks.html", **project_ctx(db, p, "ranks"), rows=rows, summary=summary,
                  provider=settings.serp_provider, running=jobs.is_running(f"ranks:{p.id}"))


@app.post("/projekty/{project_id}/frazy")
def ranks_add(request: Request, project_id: int, phrases: str = Form(...), db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    existing = {k.phrase.lower() for k in p.keywords}
    added = 0
    for line in re.split(r"[\n,;]", phrases):
        line = line.strip()
        if line and line.lower() not in existing:
            db.add(Keyword(project_id=p.id, phrase=line[:300]))
            existing.add(line.lower())
            added += 1
    db.commit()
    flash(request, f"Dodano frazy: {added}.")
    return back(f"/projekty/{project_id}/pozycje")


@app.post("/frazy/{keyword_id}/usun")
def ranks_delete(request: Request, keyword_id: int, db: Session = Depends(get_db)):
    k = db.get(Keyword, keyword_id)
    if k is None:
        raise HTTPException(404)
    pid = k.project_id
    db.delete(k)
    db.commit()
    flash(request, "Usunięto frazę.")
    return back(f"/projekty/{pid}/pozycje")


@app.post("/projekty/{project_id}/pozycje/uruchom")
def ranks_run(request: Request, project_id: int, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    if settings.serp_provider is None:
        flash(request, "Dodaj klucz DataForSEO lub Serper (zobacz Ustawienia).", "error")
    elif not p.keywords:
        flash(request, "Najpierw dodaj frazy.", "error")
    elif jobs.start_ranks(p.id):
        flash(request, "Sprawdzanie pozycji uruchomione. Odśwież stronę za chwilę.")
    else:
        flash(request, "Sprawdzanie pozycji już trwa.", "error")
    return back(f"/projekty/{project_id}/pozycje")


# ---- Zmiany ----

@app.get("/projekty/{project_id}/zmiany", response_class=HTMLResponse)
def changes_page(request: Request, project_id: int, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    return render(request, "project_changes.html", **project_ctx(db, p, "changes"), changes=p.changes[:300],
                  running=jobs.is_running(f"changes:{p.id}"))


@app.post("/projekty/{project_id}/zmiany/uruchom")
def changes_run(request: Request, project_id: int, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    if jobs.start_changes(p.id):
        flash(request, "Sprawdzanie zmian uruchomione. Pierwsze uruchomienie zapisuje stan wyjściowy.")
    return back(f"/projekty/{project_id}/zmiany")


@app.post("/projekty/{project_id}/zmiany/przeczytane")
def changes_seen(project_id: int, db: Session = Depends(get_db)):
    db.query(ChangeEvent).filter(ChangeEvent.project_id == project_id).update({"seen": True})
    db.commit()
    return back(f"/projekty/{project_id}/zmiany")


# ---- Ustawienia projektu ----

@app.get("/projekty/{project_id}/ustawienia", response_class=HTMLResponse)
def project_settings(request: Request, project_id: int, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    return render(request, "project_settings.html", **project_ctx(db, p, "settings"))


@app.post("/projekty/{project_id}/ustawienia")
def project_settings_save(
    request: Request, project_id: int, name: str = Form(...), url: str = Form(...), brand_name: str = Form(""),
    brand_aliases: str = Form(""), competitors: str = Form(""), max_pages: int = Form(200), country: str = Form("pl"),
    language: str = Form("pl"), ai_samples: int = Form(3), monitoring_enabled: str = Form(""), db: Session = Depends(get_db),
):
    p = get_project(db, project_id)
    p.name, p.url, p.brand_name, p.brand_aliases = name.strip(), clean_url(url), brand_name.strip(), brand_aliases.strip()
    p.competitors = competitors.strip()
    p.max_pages = max(10, min(max_pages, 2000))
    p.country, p.language = country.strip().lower()[:5], language.strip().lower()[:5]
    p.ai_samples = max(1, min(ai_samples, 10))
    p.monitoring_enabled = bool(monitoring_enabled)
    db.commit()
    flash(request, "Zapisano ustawienia projektu.")
    return back(f"/projekty/{project_id}/ustawienia")


def _delete_project_data(db: Session, project_ids: list[int]) -> None:
    if project_ids:
        db.query(AIResult).filter(AIResult.project_id.in_(project_ids)).delete(synchronize_session=False)
        from .models import PageSnapshot
        db.query(PageSnapshot).filter(PageSnapshot.project_id.in_(project_ids)).delete(synchronize_session=False)


@app.post("/projekty/{project_id}/usun")
def project_delete(request: Request, project_id: int, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    cid = p.client_id
    _delete_project_data(db, [p.id])
    db.delete(p)
    db.commit()
    flash(request, "Projekt usunięty.")
    return back(f"/klienci/{cid}")


# ---- Raport PDF ----

@app.get("/projekty/{project_id}/raport")
def report(request: Request, project_id: int, podglad: int = 0, db: Session = Depends(get_db)):
    p = get_project(db, project_id)
    if p.last_audit is None:
        flash(request, "Raport wymaga co najmniej jednego zakończonego audytu.", "error")
        return back(f"/projekty/{project_id}")
    html = templates.env.get_template("report.html").render(**report_context(db, p))
    if podglad:
        return HTMLResponse(html)
    pdf = render_pdf(html, base_url=str(BASE))
    slug = re.sub(r"[^a-z0-9]+", "-", p.domain.lower()).strip("-")
    filename = f"raport-seo-aeo-{slug}-{datetime.utcnow():%Y-%m-%d}.pdf"
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ---------------- Widoki zbiorcze ----------------

@app.get("/audyty", response_class=HTMLResponse)
def audits_page(request: Request, db: Session = Depends(get_db)):
    audits = db.query(Audit).order_by(Audit.id.desc()).limit(200).all()
    return render(request, "audits.html", audits=audits, unseen_alerts=unseen_count(db))


@app.get("/alerty", response_class=HTMLResponse)
def alerts_page(request: Request, db: Session = Depends(get_db)):
    changes = db.query(ChangeEvent).order_by(ChangeEvent.id.desc()).limit(300).all()
    return render(request, "alerts.html", changes=changes, unseen_alerts=unseen_count(db))


@app.post("/alerty/przeczytane")
def alerts_seen(db: Session = Depends(get_db)):
    db.query(ChangeEvent).update({"seen": True})
    db.commit()
    return back("/alerty")


@app.get("/ustawienia", response_class=HTMLResponse)
def settings_page(request: Request, db: Session = Depends(get_db)):
    stats = {
        "issues": db.query(func.count(Issue.id)).scalar(),
        "ai_results": db.query(func.count(AIResult.id)).scalar(),
        "pages": db.query(func.count(Page.id)).scalar(),
    }
    jobs_info = []
    if jobs.scheduler:
        for j in jobs.scheduler.get_jobs():
            jobs_info.append({"id": j.id, "next": j.next_run_time})
    return render(request, "settings.html", stats=stats, jobs_info=jobs_info, unseen_alerts=unseen_count(db))
