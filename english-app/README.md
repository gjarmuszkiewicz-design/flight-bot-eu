# Speak Up – angielski w praktyce 🇬🇧

Aplikacja na telefon do nauki **mówienia** po angielsku. Mechanika podobna do Duolingo (ścieżka lekcji, powtórki, XP, seria dni, odznaki), ale treść to **prawdziwe sytuacje**: lotnisko, hotel, kawiarnia, sklep, lekarz, small talk. Gramatyki nie uczymy wprost – wchodzi sama, przez gotowe schematy zdań powtarzane na głos.

## Co już działa

| Funkcja | Opis |
|---|---|
| 🧭 **Test poziomu** | na start 20 pytań (~5 min): uzupełnianie zdań, znaczenie, słuchanie, wybór najlepszej odpowiedzi – od A1 do C1, z opcją „Nie wiem”. Wynik ustawia poziom, ale zawsze możesz go zmienić (zakładki nad ścieżką lub *Profil → Poziom*) |
| 📚 **Kurs – 3 poziomy** | **Początkujący** (A1–A2), **Średni** (B1–B2), **Zaawansowany** (C1). Każdy poziom ma te same **8 tematów × 3 lekcje** – podróże są i dla początkujących (odprawa), i dla średnich (odwołany lot, kontrola paszportowa), i dla zaawansowanych (negocjacje z linią, trudne pytania na granicy). Razem 72 lekcje, ~380 słówek i 360 zwrotów |
| 🧩 **Ćwiczenia** | nowe słówko z wymową, wybór tłumaczenia, „co słyszysz?”, układanie zdania z kafelków, dyktando, **powiedz na głos**, **powiedz to po angielsku** (z polskiego), **scenka**, w której odgrywasz swoją rolę |
| 🎤 **Mówienie** | rozpoznawanie mowy w przeglądarce – aplikacja pokazuje, co usłyszała, ile % się zgadza i które słowa wyszły źle. Przycisk 🐢 czyta wolniej. Przycisk 🎙️/🔇 wyłącza mówienie na 15 min (np. w autobusie) |
| 👑 **Poziomy lekcji** | każdą lekcję przechodzisz 3 razy: najpierw rozpoznajesz, potem powtarzasz na głos, na końcu mówisz z pamięci z polskiego |
| 🔁 **Powtórki** | system Leitnera: zwrot wraca po 1, 2, 4, 8, 16 dniach; błąd = wraca od początku. Zaległe zwroty **wplatają się w nowe lekcje**, więc słówka z lotniska wrócą w lekcji o hotelu |
| 🎯 **Motywacja** | XP, cel dzienny, seria dni 🔥, 3 wyzwania dnia, 13 odznak, wykres tygodnia |
| 🤖 **Rozmowa z AI** | 8 scenek (barista, odprawa, hotel, lekarz, rozmowa o pracę…). Mówisz do mikrofonu → AI odpowiada głosem → mikrofon sam się włącza (tryb na żywo). Pod Twoją wypowiedzią pojawia się 💡 podpowiedź po polsku, jak powiedzieć lepiej |
| 🎬 **Wideo** | **każda lekcja kończy się scenką**: po ćwiczeniach wybierasz 1 z 4 filmów (miniatura + opis po polsku, np. „Nie działa klimatyzacja – dokładnie jak w Twojej lekcji”), oglądasz i lekcja jest **zaliczona 🎓**. Razem 151 scenek – każda z 72 lekcji ma 3–4 do wyboru + seriale VOA i BBC. Przy filmie: zwroty z lekcji do wyłapania 👂 i pytania do odpowiedzi na głos. Scenki są też polecane na ekranie głównym i w zakładce 🎬. Można dodać własny link (także Shorts) |
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

### Jak działa biblioteka scenek

- Lista filmów jest w `js/library.js`: każdy film ma ID z YouTube, tytuł i lekcję, do której pasuje. Filmy znalazłem przez wyszukiwarkę (lekcje dialogowe z kanałów edukacyjnych, VOA i BBC).
- Film jest tylko **podglądem w oficjalnym odtwarzaczu YouTube** (tryb bez ciasteczek `youtube-nocookie.com`). Nic nie jest pobierane ani zapisywane – to tak, jakbyś oglądał go na YouTube, tylko wewnątrz aplikacji.
- **Zaliczenie lekcji:** po ćwiczeniach pojawia się ekran „Ostatni krok: wybierz scenkę” z 4 filmami do tematu lekcji. Obejrzenie jednego zalicza lekcję (🎓 na ścieżce, +15 XP). Można pominąć i wrócić później – przy lekcji zostaje żółta plakietka „🎬 Brakuje scenki”. Kolejne lekcje odblokowują się po ćwiczeniach, więc niedziałający film nigdy nie zablokuje nauki.
- **Podpowiadanie:** najpierw scenki do lekcji, którą właśnie przerabiasz, potem do niedawno ukończonych (powtórka w nowym kontekście), na końcu tematy, które są przed Tobą. Obejrzane nie wracają do polecanych.
- **Samonaprawianie:** część autorów blokuje odtwarzanie poza YouTube albo usuwa filmy. Aplikacja to wykrywa (przez YouTube IFrame API), ukrywa taki film, proponuje link „Otwórz w YouTube” i następną scenkę.
- Dodanie filmu do biblioteki = jedna linijka w `js/library.js`, np. `{ id: "ID_Z_LINKU", lesson: "hotel-2", type: "dialog", title: "…", desc: "opis po polsku", src: "yt" }`.

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
    ├── course.js  # TREŚĆ KURSU: poziom początkujący + lista poziomów
    ├── course-levels.js # poziom średni i zaawansowany
    ├── placement.js     # test poziomujący (pytania i ocena)
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

Lekcje poziomu średniego i zaawansowanego mają id z przedrostkiem `b1-` / `c1-` i mogą wskazać, z których grup filmów brać scenki: `videos: ["b1-airport-1", "airport-2"]`.

`alt` to inne poprawne wersje zdania (akceptowane przy mówieniu i układaniu). Ćwiczenia generują się z tych danych automatycznie.
