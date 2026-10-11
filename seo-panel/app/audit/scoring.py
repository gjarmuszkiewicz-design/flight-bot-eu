"""Zamiana listy problemów na wyniki 0–100."""

WEIGHTS = {"critical": 18, "warning": 8, "notice": 2.5}
CATEGORY_WEIGHTS = {"technical": 0.30, "onpage": 0.25, "performance": 0.15, "aeo": 0.30}
CATEGORY_LABELS = {
    "technical": "Technika",
    "onpage": "On-page",
    "performance": "Wydajność",
    "aeo": "Gotowość AI",
}
SEVERITY_LABELS = {"critical": "Krytyczny", "warning": "Ważny", "notice": "Drobny"}


def category_score(issues: list[dict], total_pages: int) -> float:
    score = 100.0
    for i in issues:
        w = WEIGHTS[i["severity"]]
        if i["urls"] and total_pages:
            ratio = min(1.0, len(i["urls"]) / total_pages)
            w *= 0.4 + 0.6 * ratio  # problem na wszystkich stronach waży więcej niż na jednej
        score -= w
    return round(max(0.0, score), 1)


def compute_scores(issues: list[dict], total_pages: int) -> dict[str, float]:
    by_cat = {c: [i for i in issues if i["category"] == c] for c in CATEGORY_WEIGHTS}
    scores = {c: category_score(v, total_pages) for c, v in by_cat.items()}
    scores["total"] = round(sum(scores[c] * w for c, w in CATEGORY_WEIGHTS.items()), 1)
    return scores


def grade(score: float | None) -> str:
    if score is None:
        return "none"
    if score >= 80:
        return "good"
    if score >= 50:
        return "warning"
    return "critical"
