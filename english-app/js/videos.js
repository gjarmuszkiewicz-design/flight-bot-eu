// Biblioteka wideo. Filmów NIE pobieramy ani nie kopiujemy – osadzamy oficjalnym odtwarzaczem
// YouTube (to dozwolone przez regulamin YouTube) albo linkujemy do źródła.

export const SOURCES = [
  {
    name: "BBC Learning English",
    note: "Seria „English at Work”, „6 Minute English”, „The English We Speak”. Krótkie odcinki, napisy.",
    url: "https://www.youtube.com/@bbclearningenglish/videos",
    search: "BBC Learning English English at Work",
  },
  {
    name: "VOA Learning English",
    note: "Materiały rządu USA – domena publiczna, można ich legalnie używać (nawet pobierać) z podaniem źródła.",
    url: "https://learningenglish.voanews.com/",
    search: "VOA Learning English Let's Learn English",
  },
  {
    name: "Easy English (Easy Languages)",
    note: "Prawdziwe rozmowy na ulicach – naturalne tempo, podwójne napisy.",
    url: "https://www.youtube.com/results?search_query=Easy+English+street+interview",
    search: "Easy English street interview",
  },
  {
    name: "British Council – LearnEnglish",
    note: "Scenki z życia codziennego z ćwiczeniami na stronie.",
    url: "https://learnenglish.britishcouncil.org/",
    search: "British Council LearnEnglish video",
  },
  {
    name: "English with Lucy / Speak English with Vanessa",
    note: "Zwroty potoczne i sytuacje codzienne, nauczyciele native speakerzy.",
    url: "https://www.youtube.com/results?search_query=speak+english+with+vanessa+daily+conversation",
    search: "English daily conversation practice",
  },
];

// Gotowe tematy do wyszukania – pasują do rozdziałów kursu
export const TOPIC_SEARCHES = [
  { chapter: "airport", label: "✈️ Lotnisko", q: "English at the airport conversation check in" },
  { chapter: "hotel", label: "🏨 Hotel", q: "English hotel check in conversation" },
  { chapter: "food", label: "☕ Kawiarnia i restauracja", q: "ordering food in English restaurant conversation" },
  { chapter: "shop", label: "🛒 Zakupy", q: "shopping English conversation clothes store" },
  { chapter: "city", label: "🚕 Pytanie o drogę", q: "asking for directions in English conversation" },
  { chapter: "health", label: "💊 Lekarz i apteka", q: "English at the doctor conversation" },
  { chapter: "smalltalk", label: "💬 Small talk", q: "English small talk conversation" },
];

export function youtubeSearchUrl(q) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

// Wyciąga ID filmu z linku YouTube (zwykły, skrócony, shorts, embed)
export function parseYouTubeId(url) {
  const s = String(url).trim();
  const m =
    s.match(/youtu\.be\/([\w-]{11})/) ||
    s.match(/[?&]v=([\w-]{11})/) ||
    s.match(/\/(?:shorts|embed|live)\/([\w-]{11})/) ||
    s.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}

export function embedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?cc_load_policy=1&cc_lang_pref=en&rel=0&playsinline=1`;
}

// Uniwersalne zadania do każdego filmu – działają bez AI
export const GENERIC_TASKS = [
  { q: "What is the video about? Say it in one or two sentences.", hint_pl: "O czym jest film? Powiedz w 1–2 zdaniach." },
  { q: "Where are the people? What are they doing?", hint_pl: "Gdzie są ludzie? Co robią?" },
  { q: "Repeat one sentence you remember from the video.", hint_pl: "Powtórz jedno zdanie, które zapamiętałeś." },
  { q: "What would you say in this situation?", hint_pl: "Co Ty byś powiedział w tej sytuacji?" },
];
