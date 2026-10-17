# Insta Wizytówki – kontekst projektu

Pisz zawsze po polsku. Właściciel: studio Bootelka / @insta_wizytowki_com.

## Co to jest
Wtyczka WordPress/WooCommerce: klient wpisuje link do Instagrama, konfigurator pobiera profil
i pokazuje wizualizację instawizytówki (przód: zdjęcie, nazwa, kontakt, kody QR; tył: profil
Instagram 1:1 z siatką 9 zdjęć). Przy dodaniu do koszyka w tle powstaje PDF do druku.

## Zasady ustalone z właścicielem
- Klient widzi **tylko wizualizację**. Spady, widok druku i pobieranie PDF – wyłącznie obsługa sklepu.
- Druk: **drukujsam.pl**, wizytówki **85×55 mm z zaokrąglonymi rogami**, 4+4, kreda mat 350 g,
  folia **błysk** lub **mat** (wariant produktu, ceny poda właściciel).
- Makieta drukujsam (`wizytowka_85x55_zaokraglona_v.pdf`, InDesign): netto 55×85 mm pionowo,
  **spad 5 mm** (BleedBox → brutto 65×95 mm), **margines wewnętrzny 4 mm**, promień rogów linii cięcia ≈ 3 mm.
  Wymagania ogólne drukujsam: CMYK, fonty na krzywe. Ustawienia wtyczki już na te wartości.
- Tła okładek: biblioteka w panelu („Tła okładek”), źródło Magnific – patrz `TLA-MAGNIFIC.md`.
  Konfigurator podpowiada tła wg kolorów zdjęć profilu i słów w bio.

## Wzorcowe projekty właściciela
`D:\FREELANCER\___INSTA WIZYTÓWKA\PROJEKTY` (CorelDRAW 2024, eksport PDF CMYK, krzywe).
Strona PDF: 186,25×271,29 pt = **65,7×95,7 mm** (pionowo) – 55×85 + spad ok. 5 mm, zgodnie z makietą.
Styl: przód – tło na całą kartę, duże zdjęcie w ramce IG, nazwa szeryfowa (Cinzel), branża bold
wersalikami (Montserrat), kontakt z ikonami, 1–2 kody QR (Instagram + Facebook) z podpisem.
Tył – „@nazwa”, czerwony dymek ♥ 356 / 💬 90, liczniki „posty / obserwatorzy / obserwowani”,
duże wyróżnione relacje, wersja jasna lub ciemna.

## Otwarte sprawy
1. PDF jest w RGB – drukujsam chce CMYK. Dodać konwersję (Ghostscript na serwerze lub lokalnie).
2. HikerAPI: potwierdzić ścieżki API (`includes/class-iw-profile-fetcher.php`) po podpięciu klucza.
3. Ceny folii błysk/mat.
4. Test w prawdziwym WordPressie + WooCommerce (dotąd testowane tylko `dev/demo.html`).

## Struktura
- `assets/renderer.js` – rysowanie przodu i tyłu w mm (podgląd = druk).
- `assets/configurator.js` – formularz, podpowiedzi teł, PDF (jsPDF), zapis projektu.
- `includes/` – ustawienia, REST, pobieranie profilu, tła, WooCommerce, przechowywanie plików.
- `dev/demo.html` – test bez WordPressa (`?klient` = widok klienta).
