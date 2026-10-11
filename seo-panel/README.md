# Panel SEO/AEO

Prywatny kokpit do audytów SEO, gotowości stron pod wyszukiwarki AI i monitoringu widoczności klientów. Dostęp ma tylko właściciel, a klienci dostają raporty PDF.

## Co potrafi

| Moduł | Co robi |
|---|---|
| **Audyt techniczny** | Crawler (respektuje robots.txt): statusy 4xx/5xx, przekierowania i łańcuchy, uszkodzone linki, noindex, canonical, mapa witryny, strony osierocone, głębokość, HTTPS, HSTS, mixed content, viewport, hreflang |
| **On-page** | Tytuły i opisy (braki, duplikaty, długość), H1, cienka i zduplikowana treść, alt obrazów, Open Graph |
| **Wydajność** | PageSpeed Insights (LCP, CLS, INP, TBT), czas odpowiedzi, waga HTML, lazy loading, formaty obrazów |
| **Gotowość AI (AEO)** | Dostęp 14 botów AI (robots.txt i test na żywo, który wykrywa blokady firewalla/Cloudflare), llms.txt, schema.org (Organization, sameAs, Article/autor, FAQPage, błędy JSON-LD), treść zależna od JavaScriptu, nagłówki-pytania, listy i tabele, sygnały E-E-A-T. Opcjonalnie Claude ocenia cytowalność treści i proponuje przeredagowania |
| **Widoczność w AI** | Zapytania do ChatGPT, Claude, Perplexity i Gemini (z wyszukiwaniem w sieci), kilka prób na model. Mierzy wzmianki, cytowania, pozycję wśród marek, udział w głosie wobec konkurentów i najczęściej cytowane źródła. Pokazuje trend |
| **Pozycje** | Pozycje fraz w Google przez DataForSEO (z wykrywaniem AI Overviews) lub Serper |
| **Zmiany** | Codzienny monitoring strony głównej, 19 kluczowych podstron i robots.txt (tytuł, opis, canonical, noindex, status, H1). Alerty na Telegram |
| **Raport PDF** | Okładka z wynikami, priorytety, zalecenia, sekcja AI, pozycje, metodologia. Raport ma Twój branding |

Harmonogram: zmiany codziennie o 6:10, pozycje w poniedziałki o 5:20, widoczność AI w poniedziałki o 7:05 (czas polski).

## Uruchomienie lokalne

```bash
cd seo-panel
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ADMIN_PASSWORD=twoje-haslo
uvicorn app.main:app --reload
```

Otwórz http://localhost:8000 (login: `admin`). Do generowania PDF potrzebne są biblioteki Pango (macOS: `brew install pango`, Debian/Ubuntu: `apt install libpango-1.0-0 libpangoft2-1.0-0`).

## Wdrożenie na Railway

1. Utwórz nowy projekt w Railway z tego repozytorium i ustaw **Root Directory** na `seo-panel`. Railway sam wykryje `Dockerfile`.
2. Dodaj usługę **PostgreSQL**. Zmienna `DATABASE_URL` pojawi się automatycznie.
3. W zakładce **Variables** ustaw co najmniej `ADMIN_PASSWORD`, `SECRET_KEY` (np. wynik `openssl rand -hex 32`) i `COOKIE_SECURE=1`. Pozostałe zmienne znajdziesz w `.env.example`.
4. Wygeneruj domenę w **Settings → Networking**.

Uruchamiaj aplikację w **jednej instancji**: kolejka zadań i harmonogram działają w pamięci procesu.

## Klucze API

Każdy moduł działa niezależnie. Bez klucza moduł jest pomijany, a panel pokazuje to w **Ustawieniach**.

- `ANTHROPIC_API_KEY`: Claude (monitoring i ocena treści w audycie). Domyślny model `claude-opus-5-5` zmienisz w `ANTHROPIC_MODEL`.
- `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY`: pozostałe modele. Nazwy modeli można zmienić zmiennymi `*_MODEL`.
- `DATAFORSEO_LOGIN` i `DATAFORSEO_PASSWORD` (zalecane) albo `SERPER_API_KEY`: pozycje w Google.
- `PAGESPEED_API_KEY`: opcjonalny, podnosi limit zapytań PageSpeed.
- `TELEGRAM_BOT_TOKEN` i `TELEGRAM_CHAT_ID`: alerty.

**Koszt monitoringu AI** = liczba zapytań × liczba modeli × liczba prób. Liczbę prób ustawisz w ustawieniach projektu. Przykład: 10 zapytań × 4 modele × 3 próby daje 120 odpowiedzi tygodniowo na projekt.

## Testy

```bash
pip install pytest
python -m pytest
```

Testy uruchamiają lokalną stronę z celowo wprowadzonymi błędami (`tests/site`) i sprawdzają cały przepływ: crawl, wykrywanie problemów, blokady botów AI, widoki panelu i generowanie PDF.

## Struktura

```
app/
  main.py              trasy, logowanie
  jobs.py              zadania w tle i harmonogram
  audit/               crawler, reguły, AEO, punktacja, ocena Claude
  monitoring/          widoczność w AI, pozycje, zmiany i alerty
  reports.py           raport PDF (WeasyPrint)
  templates/, static/  interfejs (Jinja + HTMX + Chart.js)
```
