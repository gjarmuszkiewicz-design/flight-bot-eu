"""Jakościowa ocena treści pod kątem cytowalności przez AI, wykonywana przez Claude."""
from __future__ import annotations

import anthropic

from ..config import settings
from .crawler import CrawlResult
from .rules import html_pages, indexable

SYSTEM = (
    "Jesteś ekspertem AEO (Answer Engine Optimization) i SEO. Oceniasz, jak dobrze treści strony "
    "nadają się do cytowania przez wyszukiwarki AI (ChatGPT, Perplexity, Google AI Overviews, Claude). "
    "Piszesz po polsku, konkretnie, dla specjalisty SEO, który przekaże zalecenia klientowi."
)

INSTRUCTIONS = """Poniżej fragmenty kluczowych podstron serwisu {domain}.

Przygotuj ocenę w Markdown z sekcjami:
## Podsumowanie
2–3 zdania: jak serwis wypada jako źródło odpowiedzi dla AI.
## Mocne strony
3–5 punktów.
## Najważniejsze poprawki
5–7 punktów, od najważniejszego. Każdy: co zmienić, na której stronie i dlaczego pomoże to w cytowaniu przez AI.
## Przykład przeredagowania
Weź jeden istniejący akapit lub sekcję i pokaż wersję „odpowiedź najpierw” (pytanie w nagłówku + zwięzła odpowiedź w 1–2 zdaniach + szczegóły).
## Pytania, na które serwis powinien odpowiadać
5–8 pytań, które zadają klienci tej branży, a na które strona nie odpowiada wprost.

Nie dodawaj wstępu ani zakończenia poza tymi sekcjami.

{pages}"""


def _pick_pages(crawl: CrawlResult, limit: int = 4):
    pages = [p for p in html_pages(crawl) if indexable(p) and p.info.get("word_count", 0) > 80]
    pages.sort(key=lambda p: (p.depth != 0, -p.inlinks, -p.info.get("word_count", 0)))
    return pages[:limit]


def ai_content_review(crawl: CrawlResult) -> str:
    if not settings.anthropic_api_key:
        return ""
    chunks = []
    for p in _pick_pages(crawl):
        heads = "\n".join(f"{'  ' * (h['level'] - 1)}H{h['level']}: {h['text']}" for h in p.info.get("headings", [])[:25])
        chunks.append(
            f"<strona url=\"{p.url}\">\nTytuł: {p.info.get('title')}\nOpis: {p.info.get('meta_description')}\n"
            f"Schema: {', '.join(p.info.get('schema_types', [])) or 'brak'}\nNagłówki:\n{heads}\n"
            f"Treść (fragment):\n{p.info.get('text_sample', '')[:3000]}\n</strona>"
        )
    if not chunks:
        return ""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        resp = client.beta.messages.create(
            model=settings.anthropic_model,
            max_tokens=16000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={"effort": "medium"},
            system=SYSTEM,
            messages=[{"role": "user", "content": INSTRUCTIONS.format(domain=crawl.host, pages="\n\n".join(chunks))}],
        )
    except anthropic.APIError as e:
        return f"_Nie udało się pobrać oceny AI: {getattr(e, 'message', str(e))}_"
    if resp.stop_reason == "refusal":
        return "_Model odmówił oceny tej treści._"
    return "\n".join(b.text for b in resp.content if b.type == "text").strip()
