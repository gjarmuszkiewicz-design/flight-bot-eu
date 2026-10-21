// Stan aplikacji w localStorage: postęp, XP, seria dni, odznaki, wyzwania dnia, powtórki (SRS).

const KEY = "ea_state_v1";
const DAY = 24 * 60 * 60 * 1000;

const DEFAULT_STATE = {
  profile: { name: "", dailyGoal: 30, level: null, placement: null }, // level: "A" | "B" | "C"
  xp: 0,
  xpByDay: {}, // "2026-10-21": 45
  streak: { count: 0, lastDay: null },
  lessons: {}, // lessonId: { level: 0..3, best: 0 }
  srs: {}, // itemKey: { en, pl, box, due, seen, wrong }
  stats: { spoken: 0, lessonsDone: 0, reviews: 0, chats: 0, videos: 0, perfect: 0 },
  badges: {}, // badgeId: timestamp
  quests: { day: null, list: [] },
  settings: { rate: 0.95, voiceURI: "", autoListen: true, apiKey: "", model: "claude-opus-5-5" },
  videos: [], // własne filmy użytkownika
  watched: {}, // ytId: kiedy obejrzany
  hiddenVideos: {}, // ytId: filmy, których nie da się osadzić
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    // płytkie scalenie, żeby nowe pola z kolejnych wersji miały wartości domyślne
    const merged = { ...structuredClone(DEFAULT_STATE), ...parsed };
    for (const k of ["profile", "stats", "settings", "streak", "quests"]) {
      merged[k] = { ...DEFAULT_STATE[k], ...(parsed[k] || {}) };
    }
    return merged;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* tryb prywatny / brak miejsca – aplikacja działa dalej w pamięci */
  }
}

export function getState() {
  return state;
}

export function resetAll() {
  state = structuredClone(DEFAULT_STATE);
  save();
}

export function exportState() {
  return JSON.stringify(state, null, 2);
}

export function importState(json) {
  state = { ...structuredClone(DEFAULT_STATE), ...JSON.parse(json) };
  save();
}

export function today(d = new Date()) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

// ---------- XP i seria dni ----------

export function addXp(amount) {
  const t = today();
  state.xp += amount;
  state.xpByDay[t] = (state.xpByDay[t] || 0) + amount;
  touchStreak();
  bumpQuest("xp", amount);
  save();
}

export function xpToday() {
  return state.xpByDay[today()] || 0;
}

function touchStreak() {
  const t = today();
  const s = state.streak;
  if (s.lastDay === t) return;
  const yesterday = today(new Date(Date.now() - DAY));
  s.count = s.lastDay === yesterday ? s.count + 1 : 1;
  s.lastDay = t;
}

export function currentStreak() {
  const s = state.streak;
  const yesterday = today(new Date(Date.now() - DAY));
  if (s.lastDay === today() || s.lastDay === yesterday) return s.count;
  return 0;
}

export function lastDaysXp(n = 7) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = today(new Date(Date.now() - i * DAY));
    out.push({ day: d, xp: state.xpByDay[d] || 0 });
  }
  return out;
}

export function addStat(name, n = 1) {
  state.stats[name] = (state.stats[name] || 0) + n;
  if (name === "spoken") bumpQuest("spoken", n);
  if (name === "reviews") bumpQuest("review", n);
  if (name === "chats") bumpQuest("chat", n);
  if (name === "videos") bumpQuest("video", n);
  if (name === "lessonsDone") bumpQuest("lesson", n);
  save();
}

// ---------- Lekcje ----------

export function lessonProgress(id) {
  return state.lessons[id] || { level: 0, best: 0 };
}

export function completeLesson(id, accuracy) {
  const p = lessonProgress(id);
  state.lessons[id] = { ...p, level: Math.min(3, p.level + 1), best: Math.max(p.best, accuracy) };
  save();
}

// Zaliczenie scenki wideo do lekcji. Zwraca true, gdy lekcja właśnie została zaliczona.
export function completeLessonVideo(id, ytId) {
  const p = lessonProgress(id);
  if (p.video) return false;
  state.lessons[id] = { ...p, video: ytId };
  save();
  return true;
}

// ---------- Powtórki: system Leitnera ----------
// Pudełko 0..5. Dobra odpowiedź = wyższe pudełko i dłuższa przerwa; błąd = powrót do pudełka 1.

const INTERVALS_DAYS = [0, 1, 2, 4, 8, 16];

export function itemKey(en) {
  return en.toLowerCase().replace(/[^a-z0-9' ]/g, "").trim();
}

export function srsSeen(item, kind) {
  const k = itemKey(item.en);
  if (!state.srs[k]) {
    state.srs[k] = { en: item.en, pl: item.pl, kind, box: 1, due: Date.now() + DAY, seen: 0, wrong: 0 };
  }
  return state.srs[k];
}

export function srsAnswer(item, correct, kind = "phrase") {
  const rec = srsSeen(item, kind);
  rec.seen++;
  if (correct) {
    rec.box = Math.min(5, rec.box + 1);
  } else {
    rec.box = 1;
    rec.wrong++;
  }
  rec.due = Date.now() + INTERVALS_DAYS[rec.box] * DAY;
  save();
}

export function dueItems(limit = 20) {
  const now = Date.now();
  return Object.values(state.srs)
    .filter((r) => r.due <= now)
    .sort((a, b) => a.box - b.box || a.due - b.due)
    .slice(0, limit);
}

export function weakItems(limit = 20) {
  return Object.values(state.srs)
    .filter((r) => r.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, limit);
}

export function knownCount() {
  return Object.values(state.srs).filter((r) => r.box >= 3).length;
}

// ---------- Wyzwania dnia ----------

const QUEST_POOL = [
  { type: "xp", goal: 30, label: "Zdobądź 30 XP", reward: 10 },
  { type: "xp", goal: 60, label: "Zdobądź 60 XP", reward: 20 },
  { type: "spoken", goal: 15, label: "Wypowiedz 15 zdań na głos", reward: 15 },
  { type: "spoken", goal: 30, label: "Wypowiedz 30 zdań na głos", reward: 25 },
  { type: "lesson", goal: 2, label: "Ukończ 2 lekcje", reward: 15 },
  { type: "review", goal: 10, label: "Powtórz 10 starych zwrotów", reward: 15 },
  { type: "chat", goal: 5, label: "Wymień 5 wiadomości z rozmówcą AI", reward: 20 },
  { type: "video", goal: 1, label: "Obejrzyj scenkę wideo i odpowiedz", reward: 15 },
];

export function dailyQuests() {
  const t = today();
  if (state.quests.day !== t) {
    // deterministyczny wybór na dany dzień: zawsze XP + mówienie + jedno losowe
    const seed = [...t].reduce((a, c) => a + c.charCodeAt(0), 0);
    const pick = (types) => {
      const options = QUEST_POOL.filter((q) => types.includes(q.type));
      return options[seed % options.length];
    };
    const list = [pick(["xp"]), pick(["spoken"]), pick(["lesson", "review", "chat", "video"])];
    state.quests = { day: t, list: list.map((q) => ({ ...q, progress: 0, done: false })) };
    save();
  }
  return state.quests.list;
}

function bumpQuest(type, n) {
  if (state.quests.day !== today()) return;
  for (const q of state.quests.list) {
    if (q.type !== type || q.done) continue;
    q.progress = Math.min(q.goal, q.progress + n);
    if (q.progress >= q.goal) {
      q.done = true;
      // nagroda bez ponownego naliczania wyzwań XP
      state.xp += q.reward;
      state.xpByDay[today()] = (state.xpByDay[today()] || 0) + q.reward;
      pendingToasts.push(`🎯 Wyzwanie ukończone: ${q.label} (+${q.reward} XP)`);
    }
  }
}

// ---------- Odznaki ----------

export const BADGES = [
  { id: "first-lesson", icon: "🌱", name: "Pierwszy krok", desc: "Ukończ pierwszą lekcję", test: (s) => s.stats.lessonsDone >= 1 },
  { id: "talker-50", icon: "🗣️", name: "Gaduła", desc: "Wypowiedz 50 zdań", test: (s) => s.stats.spoken >= 50 },
  { id: "talker-300", icon: "🎤", name: "Mówca", desc: "Wypowiedz 300 zdań", test: (s) => s.stats.spoken >= 300 },
  { id: "streak-3", icon: "🔥", name: "Rozgrzewka", desc: "3 dni z rzędu", test: () => currentStreak() >= 3 },
  { id: "streak-7", icon: "🚀", name: "Tydzień w ogniu", desc: "7 dni z rzędu", test: () => currentStreak() >= 7 },
  { id: "streak-30", icon: "🏆", name: "Nawyk", desc: "30 dni z rzędu", test: () => currentStreak() >= 30 },
  { id: "perfect", icon: "💯", name: "Bez pomyłki", desc: "Lekcja bez błędu", test: (s) => s.stats.perfect >= 1 },
  { id: "traveler", icon: "🧳", name: "Gotowy do podróży", desc: "Ukończ rozdział Lotnisko", test: (s) => ["airport-1", "airport-2", "airport-3"].every((id) => s.lessons[id]?.level >= 1) },
  { id: "reviewer", icon: "🔁", name: "Pamięć słonia", desc: "Zrób 50 powtórek", test: (s) => s.stats.reviews >= 50 },
  { id: "words-100", icon: "📚", name: "Setka", desc: "Opanuj 100 słów i zwrotów", test: () => knownCount() >= 100 },
  { id: "chat-1", icon: "🤖", name: "Pierwsza rozmowa", desc: "Porozmawiaj z AI", test: (s) => s.stats.chats >= 1 },
  { id: "video-5", icon: "🎬", name: "Kinoman", desc: "Obejrzyj 5 scenek wideo", test: (s) => s.stats.videos >= 5 },
  { id: "graduate-3", icon: "🎓", name: "Absolwent", desc: "Zalicz 3 lekcje razem ze scenką", test: (s) => Object.values(s.lessons).filter((l) => l.video).length >= 3 },
  { id: "xp-1000", icon: "⭐", name: "Tysiąc", desc: "Zdobądź 1000 XP", test: (s) => s.xp >= 1000 },
];

const pendingToasts = [];

export function checkBadges() {
  for (const b of BADGES) {
    if (!state.badges[b.id] && b.test(state)) {
      state.badges[b.id] = Date.now();
      pendingToasts.push(`${b.icon} Nowa odznaka: ${b.name}!`);
    }
  }
  save();
}

export function takeToasts() {
  return pendingToasts.splice(0);
}
