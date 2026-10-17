# Insta Wizytówki – konfigurator (prototyp)

Wtyczka WordPress/WooCommerce: klient wpisuje link do Instagrama, dostaje podgląd wizytówki 1:1
(przód z danymi i kodem QR, tył jako profil Instagram z siatką 9 zdjęć), może wszystko poprawić,
a przy dodaniu do koszyka powstaje **PDF do druku ze spadami**, dołączony do zamówienia.

## Instalacja
1. Spakuj folder `insta-wizytowki` (bez `dev/`) do ZIP i wgraj: Wtyczki → Dodaj nową → Wyślij wtyczkę.
2. Ustawienia → **Insta Wizytówki**: źródło danych i specyfikacja druku.
3. W produkcie WooCommerce (zakładka Ogólne) zaznacz **„Instawizytówka – konfigurator”**.
4. Opcjonalnie shortcode `[insta_wizytowka]` – sam podgląd i pobranie PDF, bez koszyka.

## Źródła danych
| Źródło | Co obsługuje |
|---|---|
| Demo | dane przykładowe – do testów bez klucza |
| HikerAPI | każdy publiczny profil, wyróżnione relacje, zdjęcie HD (ścieżki API do potwierdzenia z dokumentacją przy podpięciu klucza) |
| Meta Business Discovery | darmowe, tylko konta firmowe i twórców |

Można ustawić źródło zapasowe. Wyniki są w pamięci podręcznej (domyślnie 48 h), a zdjęcia kopiowane
na serwer (`wp-content/uploads/insta-wizytowki/cache`), bo linki Instagrama wygasają.

## Druk (drukujsam.pl)
- Format zawsze **85×55 mm z zaokrąglonymi rogami**, druk dwustronny w kolorze (4+4), kreda mat 350 g.
- Uszlachetnienie: **folia błysk** albo **folia mat** – ustaw jako atrybut wariantu produktu WooCommerce.
- Wg makiety drukujsam (`wizytowka_85x55_zaokraglona_v`): netto **55×85 mm pionowo**, **spad 5 mm** (plik 65×95 mm),
  **margines wewnętrzny 4 mm**, rogi ok. 3 mm. Wszystko można zmienić w ustawieniach.
- **Klient widzi tylko wizualizację.** Widok spadów i przycisk PDF widzi wyłącznie obsługa sklepu
  (rola z uprawnieniem `manage_woocommerce`); PDF dla zamówienia powstaje automatycznie przy dodaniu do koszyka.
- Ten sam silnik (`assets/renderer.js`) rysuje podgląd i druk – wymiary w milimetrach, więc podgląd = druk.
- PDF: 2 strony (przód, tył), obraz RGB JPEG w pełnej rozdzielczości; tło i siatka zdjęć wychodzą na spad.
- W panelu zamówienia przy pozycji: miniatury i przycisk **„Pobierz PDF do druku”**.

## Pliki projektów
`wp-content/uploads/insta-wizytowki/projects/{id}/` – `print.pdf`, `front.png`, `back.png`, `project.json`.
Porzucone projekty (bez zamówienia) są usuwane po 30 dniach (WP-Cron).
Na Apache `.htaccess` blokuje bezpośredni dostęp do PDF/JSON; na nginx dodaj regułę:
`location ~* /uploads/insta-wizytowki/.*\.(pdf|json|txt)$ { deny all; }`

## Tła okładek
Menu **Tła okładek** w panelu: obraz + style (jasne, ciemne, damskie, męskie, złoto, roślinne…).
Konfigurator poleca tła na podstawie kolorów zdjęć z profilu i słów w bio. Kolor napisów (jasny/ciemny)
dobiera się sam według jasności tła. Lista haseł do Magnific: `TLA-MAGNIFIC.md`.

## Do zrobienia
- jeśli wymagany CMYK / PDF/X: konwersja po stronie serwera (Ghostscript) + TrimBox/BleedBox,
- ewentualnie tekst wektorowy zamiast rastra (jeśli drukarnia tego wymaga).

## Test lokalny
`dev/demo.html` – konfigurator z atrapą API i przykładowymi tłami, działa bez WordPressa (wystarczy otworzyć w przeglądarce). `dev/demo.html?klient` – widok klienta.
