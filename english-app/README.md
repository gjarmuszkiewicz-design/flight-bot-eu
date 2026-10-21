# Speak Up – angielski w praktyce 🇬🇧

Aplikacja na telefon do nauki **mówienia** po angielsku. Mechanika podobna do Duolingo (ścieżka lekcji, powtórki, XP, seria dni, odznaki), ale treść to **prawdziwe sytuacje**: lotnisko, hotel, kawiarnia, sklep, lekarz, small talk. Gramatyki nie uczymy wprost – wchodzi sama, przez gotowe schematy zdań powtarzane na głos.

## Co już działa

| Funkcja | Opis |
|---|---|
| 📚 **Kurs** | 8 rozdziałów × 3 lekcje = 24 lekcje, ~150 słówek i ~120 zwrotów z życia (z odrobiną humoru w scenkach) |
| 🧩 **Ćwiczenia** | nowe słówko z wymową, wybór tłumaczenia, „co słyszysz?”, układanie zdania z kafelków, dyktando, **powiedz na głos**, **powiedz to po angielsku** (z polskiego), **scenka**, w której odgrywasz swoją rolę |
| 🎤 **Mówienie** | rozpoznawanie mowy w przeglądarce – aplikacja pokazuje, co usłyszała, ile % się zgadza i które słowa wyszły źle. Przycisk 🐢 czyta wolniej. Przycisk 🎙️/🔇 wyłącza mówienie na 15 min (np. w autobusie) |
| 👑 **Poziomy lekcji** | każdą lekcję przechodzisz 3 razy: najpierw rozpoznajesz, potem powtarzasz na głos, na końcu mówisz z pamięci z polskiego |
| 🔁 **Powtórki** | system Leitnera: zwrot wraca po 1, 2, 4, 8, 16 dniach; błąd = wraca od początku. Zaległe zwroty **wplatają się w nowe lekcje**, więc słówka z lotniska wrócą w lekcji o hotelu |
| 🎯 **Motywacja** | XP, cel dzienny, seria dni 🔥, 3 wyzwania dnia, 13 odznak, wykres tygodnia |
| 🤖 **Rozmowa z AI** | 8 scenek (barista, odprawa, hotel, lekarz, rozmowa o pracę…). Mówisz do mikrofonu → AI odpowiada głosem → mikrofon sam się włącza (tryb na żywo). Pod Twoją wypowiedzią pojawia się 💡 podpowiedź po polsku, jak powiedzieć lepiej |
| 🎬 **Wideo** | wklejasz link do YouTube (także Shorts) → film odtwarza się w aplikacji → odpowiadasz na pytania na głos. Z kluczem AI pytania i lista zwrotów są dopasowane do filmu, a zwroty można dodać do powtórek |
| 📱 **Telefon** | PWA – instalujesz z przeglądarki jak zwykłą aplikację, działa offline (poza AI i wideo), tryb ciemny |
| 💾 **Kopia** | eksport/import postępu do pliku |

Bez serwera, bez kont, bez opłat (poza opcjonalnym AI). Postęp zapisuje się na telefonie.

## Jak uruchomić na telefonie

Aplikacja to zwykłe pliki HTML/JS – trzeba je tylko wystawić pod adresem **https** (mikrofon w przeglądarce działa wyłącznie przez https).

**Najprościej – GitHub Pages (za darmo):**
1. Repozytorium → *Settings → Pages* → *Source: Deploy from a branch* → wybierz gałąź i folder `/ (root)` → *Save*.
2. Po minucie aplikacja będzie pod `https://<twoj-login>.github.io/flight-bot-eu/english-app/`.
   (Uwaga: GitHub Pages dla prywatnego repo wymaga płatnego planu – wtedy lepiej Netlify/Vercel albo osobne publiczne repo tylko z folderem `english-app`.)

**Alternatywa – Netlify Drop:** wejdź na app.netlify.com/drop i przeciągnij folder `english-app`.

**Instalacja na ekranie głównym:**
- **Android (Chrome):** otwórz adres → menu ⋮ → *Dodaj do ekranu głównego / Zainstaluj aplikację*.
- **iPhone (Safari):** otwórz adres → przycisk *Udostępnij* → *Do ekranu początkowego*.

Przy pierwszym ćwiczeniu mówienia przeglądarka zapyta o dostęp do mikrofonu – zezwól.
Najlepiej działa **Chrome na Androidzie** i **Safari na iPhonie**. Firefox nie rozpoznaje mowy (wtedy oceniasz się sam przyciskiem „Powiedziałem”).

**Lokalnie na komputerze:** `cd english-app && python3 -m http.server 8000` → http://localhost:8000

## Rozmówca AI – jak włączyć

1. Załóż konto na **console.anthropic.com**, doładuj kilka dolarów (*Billing*) i utwórz klucz (*API Keys*).
2. W aplikacji: *Profil → Ustawienia → Rozmówca AI* → wklej klucz → *Zapisz*.
3. Zakładka 🤖 *Rozmowa* → wybierz scenkę i mów.

Modele do wyboru w ustawieniach: **Claude Opus 5.5** (domyślnie, najlepsze rozmowy), **Sonnet 5.5** (szybszy i o połowę tańszy), **Haiku 5.5** (najtańszy, ~40× tańszy od Opusa). Orientacyjnie pół godziny rozmowy to kilka–kilkanaście groszy na Haiku i kilka złotych na Opusie – na co dzień wystarczy Sonnet albo Haiku. Dla Opusa i Sonneta włączony jest automatyczny model zapasowy, gdyby filtr bezpieczeństwa odrzucił odpowiedź.

⚠️ Klucz zapisuje się tylko w pamięci przeglądarki na Twoim telefonie i jest wysyłany wyłącznie do API Anthropic. To wystarcza dla jednej osoby. **Nie udostępniaj tak skonfigurowanej aplikacji innym** – dla rodziny klucz musi trafić na serwer (patrz plan niżej).

## Wideo – skąd brać materiały legalnie i za darmo

- **Nie pobieramy i nie kopiujemy** filmów z YouTube (regulamin YouTube tego zabrania, a filmy są chronione prawem autorskim). Zamiast tego aplikacja **osadza oficjalny odtwarzacz YouTube** – to jest dozwolone i właśnie do tego służy. Autor dostaje wyświetlenie, my mamy materiał.
- Najlepsze źródła (wbudowane w zakładkę 🎬 z linkami):
  - **VOA Learning English** – materiały rządu USA, **domena publiczna**: można je legalnie pobierać, przycinać i wbudowywać na stałe (z podaniem źródła). Seria *Let's Learn English* to gotowe scenki z życia.
  - **BBC Learning English** – *English at Work*, *6 Minute English*, *The English We Speak*.
  - **Easy English** – prawdziwe rozmowy na ulicy z napisami.
  - **British Council LearnEnglish** – scenki z ćwiczeniami.
- Shorty też działają – wklej link `youtube.com/shorts/…`.
- Transkrypcję filmu znajdziesz na YouTube: *…więcej → Pokaż transkrypcję*. Wklej ją przy dodawaniu filmu, a AI ułoży pytania i wypisze zwroty.
- Telewizja: materiały TVP/BBC iPlayer itp. są chronione i nie wolno ich kopiować do aplikacji. Wyjątek: treści na wolnych licencjach (Creative Commons, domena publiczna – np. archive.org, Wikimedia Commons).

**Następny krok (do zrobienia):** gotowa, wbudowana biblioteka ~50 krótkich scenek przypisanych do rozdziałów (VOA – jako pliki; BBC/YouTube – jako osadzenia) z pytaniami przygotowanymi wcześniej.

## Plan rozwoju

**Etap 1 – teraz (dla Ciebie)** ✅ ta wersja.

**Etap 2 – więcej treści i lepsze mówienie**
- Rozdziały: praca/biuro, telefon i e-maile, wynajem auta, mieszkanie, sport, randka/rozmowa z obcokrajowcem, reklamacje.
- Wbudowana biblioteka wideo z pytaniami (patrz wyżej).
- Ocena wymowy przez AI (nagranie audio → model mowy → ocena głosek), zamiast samego porównania tekstu.
- Bardziej naturalne głosy lektora (TTS w chmurze, np. ElevenLabs / OpenAI / Google) – teraz używane są głosy wbudowane w telefon.
- Rozmowa „głos w głos” w czasie rzeczywistym (model audio-to-audio) zamiast mikrofon → tekst → głos.
- Powiadomienia przypominające o serii.

**Etap 3 – wersja rodzinna**
- Mały serwer (np. Supabase lub Firebase + funkcja serverless): konta, synchronizacja postępu między telefonami, klucz AI ukryty na serwerze, limit wydatków na osobę.
- **Liga rodzinna**: ranking tygodniowy XP, wyzwania 1 na 1 („kto pierwszy powie 50 zdań”), wspólne cele („rodzina – 1000 XP w tygodniu”), reakcje i gratulacje.
- Profile dla dzieci (prostszy poziom, więcej obrazków).

**Etap 4 – hiszpański 🇪🇸**
- Kurs jest daną (`js/course.js`), a nie kodem. Wystarczy dodać `course-es.js` z tymi samymi rozdziałami i `lang: "es-ES"` – rozpoznawanie i czytanie mowy już obsługują hiszpański. Do dodania: przełącznik języka i osobny postęp per język.

**Opcjonalnie – natywna aplikacja w sklepie:** gdy będzie potrzebna (np. powiadomienia na iPhonie, sklep), ten sam kod można opakować w Capacitor albo przepisać na React Native / Flutter.

## Struktura

```
english-app/
├── index.html            # punkt wejścia
├── manifest.webmanifest  # instalacja na telefonie (PWA)
├── sw.js                 # tryb offline
├── css/style.css
├── icons/
└── js/
    ├── app.js     # nawigacja i ekrany
    ├── course.js  # TREŚĆ KURSU – tu dopisujesz rozdziały i lekcje
    ├── lesson.js  # silnik lekcji i rodzaje ćwiczeń
    ├── speech.js  # czytanie i rozpoznawanie mowy, ocena wypowiedzi
    ├── store.js   # postęp, XP, seria, odznaki, wyzwania, powtórki
    ├── ai.js      # rozmówca AI (Claude)
    └── videos.js  # źródła wideo i obsługa linków YouTube
```

### Jak dopisać lekcję

W `js/course.js` dodaj obiekt do `lessons` w wybranym rozdziale:

```js
{
  id: "food-4",
  title: "Śniadanie w hotelu",
  words: [{ en: "toast", pl: "tost" }, ...],
  phrases: [{ en: "Can I have some more coffee?", pl: "Mogę prosić więcej kawy?", alt: ["Could I have some more coffee?"] }, ...],
  dialog: [
    { who: "them", en: "Good morning! Tea or coffee?", pl: "Dzień dobry! Herbata czy kawa?" },
    { who: "you", en: "Coffee, please.", pl: "Kawę, proszę." },
  ],
}
```

`alt` to inne poprawne wersje zdania (akceptowane przy mówieniu i układaniu). Ćwiczenia generują się z tych danych automatycznie.
