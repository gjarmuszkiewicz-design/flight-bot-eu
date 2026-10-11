"""Raport PDF dla klienta."""
from __future__ import annotations

from datetime import datetime

from .config import settings
from .models import AIResult, Project


def report_context(db, project: Project) -> dict:
    from .monitoring.ai_visibility import PROVIDER_LABELS, compute_metrics

    audit = project.last_audit
    issues = audit.issues if audit else []
    last_run = (db.query(AIResult.run_id).filter(AIResult.project_id == project.id)
                .order_by(AIResult.run_id.desc()).first())
    ai = None
    if last_run:
        all_results = db.query(AIResult).filter(AIResult.project_id == project.id).all()
        ai = compute_metrics(all_results, project)
        ai["latest"] = compute_metrics([r for r in all_results if r.run_id == last_run[0]], project)
    history = [a for a in reversed(project.audits) if a.status == "done"][-8:]
    return {
        "project": project,
        "client": project.client,
        "audit": audit,
        "issues": issues,
        "critical": [i for i in issues if i.severity == "critical"],
        "warnings": [i for i in issues if i.severity == "warning"],
        "notices": [i for i in issues if i.severity == "notice"],
        "ai": ai,
        "provider_labels": PROVIDER_LABELS,
        "keywords": [k for k in project.keywords if k.active and k.checks],
        "history": history,
        "brand": settings,
        "generated": datetime.utcnow(),
    }


def render_pdf(html: str, base_url: str) -> bytes:
    from weasyprint import HTML

    return HTML(string=html, base_url=base_url).write_pdf()
