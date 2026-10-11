"""Kolejka zadań w tle i harmonogram cyklicznego monitoringu."""
from __future__ import annotations

import logging
import threading
from concurrent.futures import ThreadPoolExecutor

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .config import settings
from .db import session_scope
from .models import Audit, Project

log = logging.getLogger(__name__)
executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="zadanie")
_running: set[str] = set()
_lock = threading.Lock()
scheduler: BackgroundScheduler | None = None


def is_running(key: str) -> bool:
    with _lock:
        return key in _running


def submit(key: str, fn, *args) -> bool:
    """Uruchamia zadanie w tle; zwraca False, jeśli takie samo już trwa."""
    with _lock:
        if key in _running:
            return False
        _running.add(key)

    def wrapper():
        try:
            fn(*args)
        except Exception:  # noqa: BLE001
            log.exception("Zadanie %s zakończone błędem", key)
        finally:
            with _lock:
                _running.discard(key)

    executor.submit(wrapper)
    return True


def start_audit(project_id: int) -> int:
    from .audit.runner import run_audit

    with session_scope() as db:
        audit = Audit(project_id=project_id)
        db.add(audit)
        db.flush()
        audit_id = audit.id
    submit(f"audit:{audit_id}", run_audit, audit_id)
    return audit_id


def start_ai(project_id: int) -> bool:
    from .monitoring.ai_visibility import run_ai_monitoring

    return submit(f"ai:{project_id}", run_ai_monitoring, project_id)


def start_ranks(project_id: int) -> bool:
    from .monitoring.rankings import run_rank_tracking

    return submit(f"ranks:{project_id}", run_rank_tracking, project_id)


def start_changes(project_id: int) -> bool:
    from .monitoring.changes import run_change_detection

    return submit(f"changes:{project_id}", run_change_detection, project_id)


def _monitored_projects() -> list[int]:
    with session_scope() as db:
        return [p.id for p in db.query(Project).filter(Project.monitoring_enabled.is_(True)).all()]


def _daily_changes():
    for pid in _monitored_projects():
        start_changes(pid)


def _weekly_ai():
    for pid in _monitored_projects():
        start_ai(pid)


def _weekly_ranks():
    for pid in _monitored_projects():
        start_ranks(pid)


def recover_stuck_audits() -> None:
    """Po restarcie serwera audyty „w toku” nie mają już wątku – oznaczamy je jako przerwane."""
    with session_scope() as db:
        for a in db.query(Audit).filter(Audit.status.in_(["queued", "running"])).all():
            a.status, a.progress, a.error = "error", "Przerwany", "Audyt przerwany przez restart serwera. Uruchom go ponownie."


def start_scheduler() -> None:
    global scheduler
    if not settings.scheduler_enabled or scheduler is not None:
        return
    scheduler = BackgroundScheduler(timezone="Europe/Warsaw")
    scheduler.add_job(_daily_changes, CronTrigger(hour=6, minute=10), id="changes", replace_existing=True)
    scheduler.add_job(_weekly_ranks, CronTrigger(day_of_week="mon", hour=5, minute=20), id="ranks", replace_existing=True)
    scheduler.add_job(_weekly_ai, CronTrigger(day_of_week="mon", hour=7, minute=5), id="ai", replace_existing=True)
    scheduler.start()


def stop_scheduler() -> None:
    global scheduler
    if scheduler is not None:
        scheduler.shutdown(wait=False)
        scheduler = None
