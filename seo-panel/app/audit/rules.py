"""Reguły audytu technicznego i on-page. Każda reguła zwraca listę problemów."""
from __future__ import annotations

from collections import defaultdict
from urllib.parse import urlparse

from .crawler import CrawlResult, PageData

CRITICAL, WARNING, NOTICE = "critical", "warning", "notice"


def issue(category, code, severity, title, description, recommendation, urls=None, count=None):
    urls = list(dict.fromkeys(urls or []))
    return {
        "category": category,
        "code": code,
        "severity": severity,
        "title": title,
        "description": description,
        "recommendation": recommendation,
        "urls": urls[:200],
        "count": count if count is not None else len(urls),
    }


def html_pages(crawl: CrawlResult) -> list[PageData]:
    return [p for p in crawl.pages.values() if p.is_html]


def indexable(p: PageData) -> bool:
    if "noindex" in p.info.get("meta_robots", "") or "noindex" in p.headers.get("x-robots-tag", "").lower():
        return False
    canonical = p.info.get("canonical")
    return not canonical or canonical == (p.final_url or p.url)


def technical_issues(crawl: CrawlResult) -> list[dict]:
    out: list[dict] = []
    pages = list(crawl.pages.values())
    html = html_pages(crawl)

    # HTTPS
    if not crawl.start_url.startswith("https://"):
        out.append(issue("technical", "no_https", CRITICAL, "Strona nie używa HTTPS",
                         "Adres startowy działa po HTTP. Google i przeglądarki oznaczają takie strony jako niezabezpieczone.",
                         "Zainstaluj certyfikat SSL (np. Let's Encrypt) i przekieruj cały ruch na HTTPS (301).",
                         [crawl.start_url]))
    elif crawl.http_redirects_to_https is False:
        out.append(issue("technical", "http_no_redirect", WARNING, "Wersja HTTP nie przekierowuje na HTTPS",
                         "Strona jest dostępna jednocześnie pod HTTP i HTTPS, co tworzy duplikaty.",
                         "Ustaw na serwerze przekierowanie 301 z http:// na https://.",
                         [crawl.start_url.replace("https://", "http://", 1)]))

    # robots.txt i mapa witryny
    if crawl.robots_txt is None:
        out.append(issue("technical", "no_robots", WARNING, "Brak pliku robots.txt",
                         f"Plik /robots.txt nie istnieje lub zwraca błąd (status {crawl.robots_status}).",
                         "Dodaj plik robots.txt z regułami dla robotów i adresem mapy witryny (Sitemap: ...).",
                         [f"https://{crawl.host}/robots.txt"]))
    elif "sitemap:" not in crawl.robots_txt.lower():
        out.append(issue("technical", "robots_no_sitemap", NOTICE, "robots.txt nie wskazuje mapy witryny",
                         "Brak dyrektywy Sitemap w robots.txt utrudnia robotom znalezienie mapy.",
                         "Dopisz w robots.txt linię: Sitemap: https://twojadomena.pl/sitemap.xml",
                         [f"https://{crawl.host}/robots.txt"]))
    if not crawl.sitemap_sources:
        out.append(issue("technical", "no_sitemap", WARNING, "Nie znaleziono mapy witryny XML",
                         "Mapa witryny pomaga wyszukiwarkom i botom AI odkryć wszystkie ważne podstrony.",
                         "Wygeneruj sitemap.xml (np. wtyczką Yoast/Rank Math) i zgłoś ją w Google Search Console.",
                         []))

    # Statusy odpowiedzi
    e4 = [p.url for p in pages if 400 <= p.status < 500]
    e5 = [p.url for p in pages if p.status >= 500]
    errs = [p.url for p in pages if p.status == 0 and p.error]
    if e4:
        out.append(issue("technical", "status_4xx", CRITICAL, "Strony z błędem 4xx (np. 404)",
                         "Linki prowadzą do nieistniejących stron. To marnuje budżet indeksowania i psuje doświadczenie użytkownika.",
                         "Przywróć strony albo ustaw przekierowania 301 na najbliższe tematycznie odpowiedniki i popraw linki.", e4))
    if e5:
        out.append(issue("technical", "status_5xx", CRITICAL, "Błędy serwera 5xx",
                         "Serwer zwraca błędy. Roboty mogą przestać odwiedzać stronę.",
                         "Sprawdź logi serwera, wydajność hostingu i wtyczki powodujące błędy.", e5))
    if errs:
        out.append(issue("technical", "fetch_error", WARNING, "Strony, których nie udało się pobrać",
                         "Przekroczony czas odpowiedzi lub błąd połączenia.",
                         "Sprawdź dostępność serwera i czas odpowiedzi tych adresów.", errs))

    # Przekierowania
    chains = [p.url for p in pages if len(p.redirect_chain) > 1]
    if chains:
        out.append(issue("technical", "redirect_chain", WARNING, "Łańcuchy przekierowań",
                         "Adres przekierowuje kilka razy z rzędu, zanim trafi na docelową stronę.",
                         "Skróć łańcuch: ustaw przekierowanie 301 bezpośrednio na adres docelowy.", chains))
    redirected = {p.url for p in pages if p.redirect_chain}
    linking_to_redirects = [p.url for p in html if any(l["href"] in redirected for l in p.info.get("links", []))]
    if linking_to_redirects:
        out.append(issue("technical", "links_to_redirect", NOTICE, "Linki wewnętrzne do przekierowań",
                         "Linki wewnętrzne prowadzą do adresów, które przekierowują dalej.",
                         "Podmień linki na docelowe adresy, aby oszczędzić czas robotów i użytkowników.", linking_to_redirects))
    temp = [p.url for p in pages if p.redirect_chain and p.redirect_chain[0][1] in (302, 307)]
    if temp:
        out.append(issue("technical", "temp_redirect", NOTICE, "Przekierowania tymczasowe (302/307)",
                         "Przekierowania tymczasowe nie przekazują jednoznacznie sygnałów do nowego adresu.",
                         "Jeśli zmiana jest trwała, zamień je na przekierowania 301.", temp))

    # Linki wewnętrzne do błędów
    broken_targets = {p.url for p in pages if p.status >= 400}
    with_broken = [p.url for p in html if any(l["href"] in broken_targets for l in p.info.get("links", []))]
    if with_broken:
        out.append(issue("technical", "broken_internal_links", CRITICAL, "Strony z uszkodzonymi linkami wewnętrznymi",
                         "Na tych stronach są linki do adresów zwracających błąd.",
                         "Popraw lub usuń uszkodzone linki.", with_broken))

    broken_ext = [u for u, s in crawl.external_links.items() if s >= 400 or s == 0]
    if broken_ext:
        out.append(issue("technical", "broken_external_links", NOTICE, "Uszkodzone linki zewnętrzne",
                         "Linki do innych serwisów zwracają błąd lub są niedostępne (sprawdzono próbkę).",
                         "Zaktualizuj adresy albo usuń nieaktualne odnośniki.", broken_ext))

    # Indeksowalność
    noindex = [p.url for p in html if "noindex" in p.info.get("meta_robots", "") or "noindex" in p.headers.get("x-robots-tag", "").lower()]
    if noindex:
        in_sitemap = [u for u in noindex if u in crawl.sitemap_urls]
        out.append(issue("technical", "noindex", WARNING if in_sitemap else NOTICE, "Strony wykluczone z indeksu (noindex)",
                         "Te strony mają dyrektywę noindex" + (" – część z nich jest w mapie witryny, co jest sprzeczne." if in_sitemap else "."),
                         "Upewnij się, że noindex jest celowy. Strony z noindex usuń z mapy witryny.", noindex))

    canon_other = [p.url for p in html if p.info.get("canonical") and p.info["canonical"] != (p.final_url or p.url)]
    if canon_other:
        out.append(issue("technical", "canonical_other", NOTICE, "Canonical wskazuje na inny adres",
                         "Strony wskazują inną wersję jako kanoniczną – nie będą indeksowane samodzielnie.",
                         "Zweryfikuj, czy to zamierzone (np. parametry, paginacja).", canon_other))
    no_canon = [p.url for p in html if not p.info.get("canonical")]
    if no_canon:
        out.append(issue("technical", "no_canonical", NOTICE, "Brak tagu canonical",
                         "Bez canonical wyszukiwarka sama wybiera wersję kanoniczną (np. przy parametrach URL).",
                         'Dodaj <link rel="canonical"> wskazujący na właściwy adres strony.', no_canon))

    # Mapa witryny vs rzeczywistość
    if crawl.sitemap_urls:
        bad_sm = [u for u in crawl.sitemap_urls if u in crawl.pages and (crawl.pages[u].status != 200 or crawl.pages[u].redirect_chain)]
        if bad_sm:
            out.append(issue("technical", "sitemap_bad_urls", WARNING, "Mapa witryny zawiera błędne adresy",
                             "W sitemap.xml są adresy z błędem lub przekierowaniem.",
                             "Mapa witryny powinna zawierać wyłącznie adresy kanoniczne ze statusem 200.", bad_sm))
        orphans = [p.url for p in html if p.from_sitemap_only and p.inlinks == 0]
        if orphans:
            out.append(issue("technical", "orphan_pages", WARNING, "Strony osierocone",
                             "Strony są w mapie witryny, ale żaden link wewnętrzny do nich nie prowadzi.",
                             "Dodaj linki z powiązanych tematycznie stron, menu lub kategorii.", orphans))
        not_in_sm = [p.url for p in html if p.status == 200 and indexable(p) and p.url not in crawl.sitemap_urls and not p.redirect_chain]
        if not_in_sm and len(not_in_sm) > 2:
            out.append(issue("technical", "not_in_sitemap", NOTICE, "Indeksowalne strony spoza mapy witryny",
                             "Strony są dostępne i indeksowalne, ale nie ma ich w sitemap.xml.",
                             "Uzupełnij mapę witryny o ważne podstrony.", not_in_sm))

    deep = [p.url for p in html if p.depth > 3]
    if deep:
        out.append(issue("technical", "deep_pages", NOTICE, "Strony głęboko w strukturze (ponad 3 kliknięcia)",
                         "Im dalej od strony głównej, tym rzadziej roboty i użytkownicy docierają do strony.",
                         "Spłaszcz strukturę: dodaj linki z kategorii, stopki, powiązanych artykułów.", deep))

    # Mobilność, język, bezpieczeństwo
    no_vp = [p.url for p in html if not p.info.get("viewport")]
    if no_vp:
        out.append(issue("technical", "no_viewport", WARNING, "Brak meta viewport",
                         "Strona może źle wyświetlać się na telefonach. Google indeksuje wersję mobilną.",
                         'Dodaj <meta name="viewport" content="width=device-width, initial-scale=1">.', no_vp))
    no_lang = [p.url for p in html if not p.info.get("lang")]
    if no_lang:
        out.append(issue("technical", "no_lang", NOTICE, "Brak atrybutu lang",
                         "Znacznik <html> nie określa języka strony.",
                         'Dodaj np. <html lang="pl">.', no_lang))
    mixed = [p.url for p in html if p.info.get("mixed_content")]
    if mixed:
        out.append(issue("technical", "mixed_content", WARNING, "Mieszana zawartość (HTTP na stronie HTTPS)",
                         "Zasoby ładowane po HTTP mogą być blokowane przez przeglądarki.",
                         "Zmień adresy zasobów na https://.", mixed))
    if crawl.start_url.startswith("https://"):
        home = crawl.pages.get(crawl.start_url)
        if home and "strict-transport-security" not in home.headers:
            out.append(issue("technical", "no_hsts", NOTICE, "Brak nagłówka HSTS",
                             "Nagłówek Strict-Transport-Security wymusza HTTPS w przeglądarce.",
                             "Włącz HSTS na serwerze lub w CDN.", [crawl.start_url]))

    # hreflang
    bad_hreflang = []
    for p in html:
        for h in p.info.get("hreflang", []):
            t = crawl.pages.get(h["href"])
            if t is not None and t.status >= 400:
                bad_hreflang.append(p.url)
    if bad_hreflang:
        out.append(issue("technical", "hreflang_broken", WARNING, "hreflang wskazuje na błędne strony",
                         "Wersje językowe wskazane w hreflang zwracają błąd.",
                         "Popraw adresy w znacznikach hreflang.", bad_hreflang))
    return out


def onpage_issues(crawl: CrawlResult) -> list[dict]:
    out: list[dict] = []
    html = [p for p in html_pages(crawl) if indexable(p)]

    def dupes(key: str) -> list[str]:
        groups = defaultdict(list)
        for p in html:
            v = (p.info.get(key) or "").strip().lower()
            if v:
                groups[v].append(p.url)
        return [u for g in groups.values() if len(g) > 1 for u in g]

    no_title = [p.url for p in html if not p.info.get("title")]
    if no_title:
        out.append(issue("onpage", "no_title", CRITICAL, "Brak tytułu strony (title)",
                         "Tytuł to najważniejszy element on-page – pojawia się w wynikach wyszukiwania.",
                         "Dodaj unikalny tytuł 30–60 znaków z główną frazą na początku.", no_title))
    dup_title = dupes("title")
    if dup_title:
        out.append(issue("onpage", "dup_title", WARNING, "Zduplikowane tytuły",
                         "Kilka stron ma identyczny tytuł – wyszukiwarka nie wie, którą pokazać.",
                         "Nadaj każdej stronie unikalny tytuł opisujący jej treść.", dup_title))
    long_title = [p.url for p in html if len(p.info.get("title", "")) > 65]
    if long_title:
        out.append(issue("onpage", "long_title", NOTICE, "Za długie tytuły (ponad 65 znaków)",
                         "Google ucina zbyt długie tytuły w wynikach.",
                         "Skróć tytuł do ok. 60 znaków.", long_title))
    short_title = [p.url for p in html if 0 < len(p.info.get("title", "")) < 25]
    if short_title:
        out.append(issue("onpage", "short_title", NOTICE, "Za krótkie tytuły (poniżej 25 znaków)",
                         "Krótki tytuł marnuje miejsce na słowa kluczowe i zachętę do kliknięcia.",
                         "Rozwiń tytuł o frazę i wyróżnik oferty.", short_title))

    no_desc = [p.url for p in html if not p.info.get("meta_description")]
    if no_desc:
        out.append(issue("onpage", "no_meta_desc", WARNING, "Brak meta description",
                         "Bez opisu Google sam wybiera fragment tekstu, często nietrafiony.",
                         "Dodaj zachęcający opis 120–155 znaków z frazą i wezwaniem do działania.", no_desc))
    dup_desc = dupes("meta_description")
    if dup_desc:
        out.append(issue("onpage", "dup_meta_desc", NOTICE, "Zduplikowane meta description",
                         "Te same opisy na wielu stronach obniżają klikalność.",
                         "Napisz unikalne opisy dla każdej strony.", dup_desc))
    long_desc = [p.url for p in html if len(p.info.get("meta_description", "")) > 160]
    if long_desc:
        out.append(issue("onpage", "long_meta_desc", NOTICE, "Za długie meta description",
                         "Opis zostanie ucięty w wynikach wyszukiwania.",
                         "Skróć opis do ok. 155 znaków.", long_desc))

    no_h1 = [p.url for p in html if not p.info.get("h1")]
    if no_h1:
        out.append(issue("onpage", "no_h1", WARNING, "Brak nagłówka H1",
                         "H1 informuje wyszukiwarki i modele AI, o czym jest strona.",
                         "Dodaj jeden nagłówek H1 z główną frazą strony.", no_h1))
    multi_h1 = [p.url for p in html if len(p.info.get("h1", [])) > 1]
    if multi_h1:
        out.append(issue("onpage", "multi_h1", NOTICE, "Wiele nagłówków H1",
                         "Kilka H1 rozmywa główny temat strony.",
                         "Zostaw jeden H1, pozostałe zamień na H2/H3.", multi_h1))
    dup_h1 = dupes_h1(html)
    if dup_h1:
        out.append(issue("onpage", "dup_h1", NOTICE, "Zduplikowane nagłówki H1",
                         "Różne strony mają identyczny H1.",
                         "Zróżnicuj nagłówki, aby każda strona odpowiadała na inną intencję.", dup_h1))

    thin = [p.url for p in html if p.info.get("word_count", 0) < 250 and urlparse(p.url).path not in ("", "/")]
    if thin:
        out.append(issue("onpage", "thin_content", NOTICE, "Mało treści (poniżej 250 słów)",
                         "Krótkie strony rzadko są wybierane przez wyszukiwarki i modele AI jako źródło odpowiedzi.",
                         "Rozbuduj treść o konkretne informacje, odpowiedzi na pytania klientów, przykłady.", thin))

    groups = defaultdict(list)
    for p in html:
        if p.info.get("text_hash"):
            groups[p.info["text_hash"]].append(p.url)
    dup_content = [u for g in groups.values() if len(g) > 1 for u in g]
    if dup_content:
        out.append(issue("onpage", "dup_content", WARNING, "Zduplikowana treść",
                         "Kilka stron ma identyczną treść.",
                         "Połącz strony, ustaw canonical lub przepisz treść.", dup_content))

    no_alt_pages, no_alt_count = [], 0
    for p in html:
        missing = [i for i in p.info.get("images", []) if i["src"] and (i["alt"] is None)]
        if missing:
            no_alt_pages.append(p.url)
            no_alt_count += len(missing)
    if no_alt_pages:
        out.append(issue("onpage", "img_no_alt", WARNING, f"Obrazy bez atrybutu alt ({no_alt_count})",
                         "Brak opisu alternatywnego szkodzi dostępności i widoczności w wyszukiwarce grafik.",
                         "Dodaj krótkie, opisowe teksty alt do obrazów (puste alt=\"\" tylko dla ozdobników).",
                         no_alt_pages, count=no_alt_count))

    no_og = [p.url for p in html if not p.info.get("og_title") or not p.info.get("og_image")]
    if no_og:
        out.append(issue("onpage", "no_og", NOTICE, "Brak znaczników Open Graph",
                         "Bez og:title i og:image linki źle wyglądają w mediach społecznościowych i komunikatorach.",
                         "Dodaj og:title, og:description i og:image (np. przez wtyczkę SEO).", no_og))
    return out


def dupes_h1(html: list[PageData]) -> list[str]:
    groups = defaultdict(list)
    for p in html:
        h1 = p.info.get("h1") or []
        if h1:
            groups[h1[0].strip().lower()].append(p.url)
    return [u for g in groups.values() if len(g) > 1 for u in g]


def performance_issues(crawl: CrawlResult, psi: dict | None) -> list[dict]:
    out: list[dict] = []
    html = html_pages(crawl)
    slow = [p.url for p in html if p.response_ms > 1500]
    if slow:
        out.append(issue("performance", "slow_response", WARNING, "Wolna odpowiedź serwera (ponad 1,5 s)",
                         "Długi czas odpowiedzi (TTFB + pobranie HTML) spowalnia całą stronę.",
                         "Włącz cache strony, rozważ szybszy hosting lub CDN.", slow))
    heavy = [p.url for p in html if p.size_bytes > 500_000]
    if heavy:
        out.append(issue("performance", "heavy_html", NOTICE, "Bardzo duży dokument HTML (ponad 500 KB)",
                         "Duży HTML wydłuża ładowanie i przetwarzanie strony.",
                         "Usuń zbędny kod wbudowany, ogranicz rozmiar osadzonych danych.", heavy))
    no_lazy = [p.url for p in html if sum(1 for i in p.info.get("images", []) if not i["lazy"]) > 8]
    if no_lazy:
        out.append(issue("performance", "no_lazy", NOTICE, "Wiele obrazów bez leniwego ładowania",
                         "Wszystkie obrazy ładują się od razu, nawet te poza ekranem.",
                         'Dodaj loading="lazy" do obrazów poniżej pierwszego ekranu.', no_lazy))
    old_formats = [p.url for p in html if any(i["src"].lower().split("?")[0].endswith((".jpg", ".jpeg", ".png")) for i in p.info.get("images", []))]
    if old_formats and len(old_formats) > len(html) * 0.3:
        out.append(issue("performance", "old_img_formats", NOTICE, "Obrazy w starszych formatach (JPG/PNG)",
                         "Formaty WebP i AVIF są zwykle o 25–50% lżejsze.",
                         "Konwertuj obrazy do WebP/AVIF (np. wtyczką lub w CDN).", old_formats))

    if psi and not psi.get("error"):
        score = psi.get("score")
        if score is not None and score < 50:
            out.append(issue("performance", "psi_low", CRITICAL, f"Niski wynik PageSpeed (mobile): {score}",
                             "Strona główna ładuje się wolno na telefonach.",
                             "Zoptymalizuj obrazy, ogranicz JavaScript, włącz cache i kompresję.", [crawl.start_url]))
        elif score is not None and score < 80:
            out.append(issue("performance", "psi_mid", WARNING, f"Przeciętny wynik PageSpeed (mobile): {score}",
                             "Jest przestrzeń do przyspieszenia strony głównej.",
                             "Sprawdź szczegóły w PageSpeed Insights i usuń największe hamulce.", [crawl.start_url]))
        lcp = psi.get("lcp_ms")
        if lcp and lcp > 2500:
            out.append(issue("performance", "lcp", WARNING if lcp <= 4000 else CRITICAL,
                             f"Wolne LCP: {lcp / 1000:.1f} s (cel: do 2,5 s)",
                             "Największy element strony pojawia się zbyt późno.",
                             "Zoptymalizuj główny obraz/baner, użyj preload, przyspiesz serwer.", [crawl.start_url]))
        cls = psi.get("cls")
        if cls is not None and cls > 0.1:
            out.append(issue("performance", "cls", WARNING, f"Przesunięcia układu CLS: {cls:.2f} (cel: do 0,1)",
                             "Elementy strony przeskakują podczas ładowania.",
                             "Nadaj obrazom i reklamom stałe wymiary, unikaj wstrzykiwania treści nad istniejącą.", [crawl.start_url]))
        inp = psi.get("inp_ms")
        if inp and inp > 200:
            out.append(issue("performance", "inp", WARNING, f"Wolna reakcja na interakcję INP: {inp} ms (cel: do 200 ms)",
                             "Strona reaguje z opóźnieniem na kliknięcia (dane realnych użytkowników).",
                             "Ogranicz ciężki JavaScript, podziel długie zadania.", [crawl.start_url]))
    return out
