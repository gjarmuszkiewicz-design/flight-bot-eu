"""Funkcje pomocnicze dla szablonów (formatowanie, mini-wykresy SVG)."""
from __future__ import annotations

import re
from datetime import datetime, timedelta

import markdown as md
from markupsafe import Markup, escape

from .audit.scoring import CATEGORY_LABELS, SEVERITY_LABELS, grade

MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"]


def fmt_date(dt: datetime | None, with_time: bool = False) -> str:
    if not dt:
        return "—"
    local = dt + timedelta(hours=2 if 3 < dt.month < 11 else 1)  # przybliżenie czasu polskiego
    out = f"{local.day} {MONTHS[local.month - 1]} {local.year}"
    return out + local.strftime(", %H:%M") if with_time else out


def time_ago(dt: datetime | None) -> str:
    if not dt:
        return "nigdy"
    s = (datetime.utcnow() - dt).total_seconds()
    if s < 60:
        return "przed chwilą"
    if s < 3600:
        return f"{int(s // 60)} min temu"
    if s < 86400:
        return f"{int(s // 3600)} godz. temu"
    days = int(s // 86400)
    return "wczoraj" if days == 1 else f"{days} dni temu"


def score_fmt(v: float | None) -> str:
    return "—" if v is None else str(round(v))


def render_md(text: str) -> Markup:
    return Markup(md.markdown(text or "", extensions=["extra", "sane_lists"]))


def highlight(text: str, terms: list[str]) -> Markup:
    safe = str(escape(text or ""))
    for t in sorted({t for t in terms if t and len(t) > 1}, key=len, reverse=True):
        safe = re.sub(r"(?i)(" + re.escape(str(escape(t))) + r")", r"<mark>\1</mark>", safe)
    return Markup(safe.replace("\n", "<br>"))


def sparkline(values: list[float | None], width: int = 120, height: int = 32, invert: bool = False) -> Markup:
    """Mini-wykres liniowy SVG. invert=True dla pozycji (1 = góra)."""
    pts = [(i, v) for i, v in enumerate(values) if v is not None]
    if len(pts) < 2:
        return Markup("")
    vals = [v for _, v in pts]
    lo, hi = min(vals), max(vals)
    span = (hi - lo) or 1
    n = max(len(values) - 1, 1)
    pad = 3

    def y(v):
        r = (v - lo) / span
        r = r if invert else 1 - r
        return pad + r * (height - 2 * pad)

    coords = " ".join(f"{pad + i / n * (width - 2 * pad):.1f},{y(v):.1f}" for i, v in pts)
    lx, ly = coords.split(" ")[-1].split(",")
    return Markup(
        f'<svg class="spark" viewBox="0 0 {width} {height}" width="{width}" height="{height}" aria-hidden="true">'
        f'<polyline points="{coords}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
        f'<circle cx="{lx}" cy="{ly}" r="3" fill="currentColor"/></svg>'
    )


def register(env) -> None:
    env.globals.update(
        CATEGORY_LABELS=CATEGORY_LABELS, SEVERITY_LABELS=SEVERITY_LABELS, grade=grade,
        sparkline=sparkline, highlight=highlight,
    )
    env.filters.update(date=fmt_date, ago=time_ago, score=score_fmt, md=render_md)
