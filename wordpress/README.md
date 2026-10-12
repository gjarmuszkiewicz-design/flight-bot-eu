# Zdalny Edytor Strony – WordPress + Claude

Dwie części:

| Katalog | Co to jest | Gdzie działa |
|---|---|---|
| `zdalny-edytor/` | wtyczka WordPress z REST API | na Twojej stronie |
| `mcp-klient/` | serwer MCP, przez który Claude obsługuje strony | na Twoim komputerze (Claude Code / Claude Desktop) |

Zaprojektowane pod Gutenberga i motyw Astra, działa też z WooCommerce.

## Co potrafi

- **Treści**: lista, odczyt, tworzenie, edycja, duplikowanie, kosz – strony, wpisy, produkty, wzorce
- **Bloki Gutenberga**: precyzyjne zmiany pojedynczych bloków (wstaw, zastąp, usuń, przenieś, zmień tekst lub atrybuty), także zagnieżdżonych w grupach i kolumnach, z podglądem `dry_run`
- **Wyszukaj i zamień** w wielu stronach naraz (także wyrażenia regularne), domyślnie tylko podgląd
- **Astra**: globalne ustawienia (kolory, typografia, nagłówek, stopka, układ) oraz ustawienia per strona (pasek boczny, układ treści, tytuł, nagłówek, stopka) przez meta
- **Customizer**: theme mods, dodatkowy CSS (dopisanie lub nadpisanie), opcje WordPressa (strona główna, nazwa, itp.)
- **Menu**: odczyt, dodawanie, edycja i usuwanie pozycji
- **Media**: wgrywanie obrazów z adresu URL, obrazek wyróżniający, tekst alternatywny
- **WooCommerce**: produkty (lista, edycja, zbiorcza zmiana cen i stanów), zamówienia (lista, zmiana statusu); do reszty (kupony, kategorie, notatki) służy `rest_request`
- **Migawki (cofanie zmian)**: przed każdą zmianą zapisywany jest poprzedni stan; przywrócić można przez API albo w panelu (Narzędzia → Zdalny Edytor). Przywrócenie też zapisuje migawkę, więc da się je odwrócić.
- **Cache**: czyszczenie pamięci podręcznej WordPressa i popularnych wtyczek

## 1. Instalacja wtyczki

1. Spakuj katalog `zdalny-edytor/` do pliku `zdalny-edytor.zip` (katalog ma być w środku archiwum).
2. W panelu: Wtyczki → Dodaj nową → Wyślij wtyczkę na serwer → wybierz plik → Włącz.
3. Utwórz hasło aplikacji: Użytkownicy → Profil → **Hasła aplikacji** → nazwa np. „Claude” → Dodaj. Skopiuj hasło (pokazuje się tylko raz).

Wymagania: WordPress 6.2+, PHP 7.4+, **HTTPS** (bez niego WordPress wyłącza hasła aplikacji), konto administratora.

Jeśli hasła aplikacji są niedostępne, zwykle blokuje je wtyczka bezpieczeństwa (np. Wordfence: Logowanie → „Disable WordPress application passwords”) albo hosting.

Na stronie Narzędzia → Zdalny Edytor widać status, adres API, historię zmian z przyciskiem „Przywróć” i wyłącznik API.

## 2. Konfiguracja klienta MCP

```bash
cd mcp-klient
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
mkdir -p ~/.config/zdalny-edytor
cp sites.example.json ~/.config/zdalny-edytor/sites.json   # uzupełnij adresy i hasła
chmod 600 ~/.config/zdalny-edytor/sites.json
```

W `sites.json` może być wiele stron. Przy kilku stronach Claude pyta, której dotyczy zmiana (parametr `site_name`), albo ustaw `ZE_DEFAULT_SITE`.
Zamiast pliku można użyć zmiennych `ZE_URL`, `ZE_USER`, `ZE_APP_PASSWORD`.

### Claude Code

```bash
claude mcp add zdalny-edytor -- /pełna/ścieżka/mcp-klient/.venv/bin/python /pełna/ścieżka/mcp-klient/zdalny_edytor_mcp.py
```

### Claude Desktop

W `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zdalny-edytor": {
      "command": "/pełna/ścieżka/mcp-klient/.venv/bin/python",
      "args": ["/pełna/ścieżka/mcp-klient/zdalny_edytor_mcp.py"]
    }
  }
}
```

Potem wystarczy pisać np.: „Na stronie sklep zmień nagłówek na stronie głównej na…”, „Dodaj sekcję FAQ pod cennikiem”, „Podnieś ceny w kategorii X o 10%”, „Ustaw na stronie Kontakt układ pełnej szerokości bez paska bocznego”.

## 3. REST API (gdybyś chciał używać bez Claude)

Bazowy adres: `https://twoja-strona.pl/wp-json/zdalny-edytor/v1/` (albo `?rest_route=/zdalny-edytor/v1/...`). Uwierzytelnianie Basic Auth: login + hasło aplikacji.

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/info` | informacje o stronie, motywie, wtyczkach |
| GET | `/content?type[]=page&search=` | lista treści |
| POST | `/posts` | nowa treść (`type`, `title`, `content`, `status`, `meta`, `template`…) |
| GET | `/posts/{id}?format=full\|outline\|raw` | treść, meta i drzewo bloków |
| POST | `/posts/{id}` | zmiana pól (tylko podane), `meta` z `null` usuwa klucz |
| DELETE | `/posts/{id}` | do kosza |
| POST | `/posts/{id}/duplicate` | kopia jako szkic |
| POST | `/posts/{id}/blocks` | `{"ops": [...], "dry_run": false}` – operacje na blokach |
| POST | `/search-replace` | `{"find", "replace", "types", "fields", "regex", "dry_run"}` |
| GET/POST | `/astra/settings` | odczyt (`search`, `keys`) / zmiana (`{"settings": {...}}`) |
| GET/POST | `/theme-mods` | theme mods (`{"mods": {...}}`) |
| GET/POST | `/css` | dodatkowy CSS (`{"css", "mode": "append\|replace"}`) |
| GET/POST | `/options` | opcje (`?names=a,b` / `{"options": {...}}`), krytyczne są zablokowane |
| POST | `/media/sideload` | `{"url", "title", "alt", "post_id", "set_featured"}` |
| GET/POST | `/snapshots` | lista / ręczna migawka (`{"type": "post\|option\|custom_css", "object"}`) |
| GET | `/snapshots/{id}` | zawartość migawki |
| POST | `/snapshots/{id}/restore` | przywrócenie |
| POST | `/cache/flush` | czyszczenie cache |

### Operacje na blokach

Ścieżka bloku to indeksy z drzewa zwracanego przez `GET /posts/{id}`: `"0"` to pierwszy blok, `"2.1"` to drugi blok wewnątrz trzeciego.
Operacje wykonują się po kolei, każda widzi wynik poprzednich.

```json
{"ops": [
  {"op": "set_html", "path": "1.0", "html": "<p>Nowy tekst</p>"},
  {"op": "insert", "path": "1", "position": "after", "markup": "<!-- wp:paragraph -->\n<p>Nowy akapit</p>\n<!-- /wp:paragraph -->"},
  {"op": "replace", "path": "0", "markup": "<!-- wp:heading {\"level\":1} -->\n<h1 class=\"wp-block-heading\">Tytuł</h1>\n<!-- /wp:heading -->"},
  {"op": "update_attrs", "path": "2", "attrs": {"align": "full"}},
  {"op": "replace_text", "find": "2025", "replace": "2026"},
  {"op": "move", "path": "3", "to": "0", "position": "before"},
  {"op": "remove", "path": "4"}
]}
```

`position`: `before` / `after` (obok bloku), `start` / `end` (do wnętrza bloku; bez `path` – początek lub koniec strony).

## Bezpieczeństwo

- Dostęp ma tylko administrator z hasłem aplikacji; hasło można w każdej chwili unieważnić w profilu.
- API można wyłączyć jednym przyciskiem (Narzędzia → Zdalny Edytor).
- Opcje krytyczne (`siteurl`, `home`, `active_plugins`, motyw, `admin_email`, role) są zablokowane.
- Plik `sites.json` zawiera hasła – trzymaj go tylko u siebie (`chmod 600`), nie wrzucaj do repozytorium.
- Przed dużą przebudową zrób kopię zapasową strony (UpdraftPlus, kopia u hostingu). Migawki chronią treść i ustawienia, ale nie zastępują pełnej kopii.

## Ograniczenia i uwagi

- Bloki statyczne (nagłówek, akapit, przycisk) mają atrybuty w komentarzu i HTML, które muszą do siebie pasować. Sama zmiana atrybutu (`update_attrs`) bez zmiany HTML może spowodować komunikat „blok zawiera nieoczekiwaną treść” w edytorze. Wtedy lepiej użyć `replace` z pełnym kodem bloku.
- Ustawienia Astry różnią się między wersjami (np. `site-content-layout` w starszych i `ast-site-content-layout` w nowszych). Przed zmianą warto odczytać obecne wartości.
- Migawki produktów WooCommerce obejmują treść i meta (ceny, stany). Warianty produktów są osobnymi wpisami i wymagają osobnych migawek.
- Wtyczkę przetestowano automatycznie na WordPressie 6.7 (34 sprawdzenia: bloki, migawki, wyszukaj i zamień, opcje, CSS, menu). Narzędzia WooCommerce korzystają ze standardowego API WooCommerce i nie były testowane na żywym sklepie; to samo dotyczy prawdziwego motywu Astra (ustawienia Astry testowano na poziomie zapisu opcji i meta).

## Test

`mcp-klient/testy/test_e2e.py` sprawdza całość na **testowej** stronie (tworzy i zmienia treści):

```bash
ZE_URL=https://test.moja-strona.pl ZE_USER=admin ZE_APP_PASSWORD='...' .venv/bin/python testy/test_e2e.py
```
