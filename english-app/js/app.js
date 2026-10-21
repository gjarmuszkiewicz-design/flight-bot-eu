// Główny plik: nawigacja i ekrany (Nauka, Powtórki, Rozmowa AI, Wideo, Profil).

import { COURSE, LEVELS, allLessons, findLesson, levelInfo, courseFor, levelOfLesson, chapterOf } from "./course.js";
import { runPlacement } from "./placement.js";
import * as store from "./store.js";
import { buildLessonQueue, buildReviewQueue, runSession } from "./lesson.js";
import { speak, listen, canListen, stopSpeaking, englishVoices, escapeHtml } from "./speech.js";
import { SCENARIOS, chatTurn, videoQuestions, describeError } from "./ai.js";
import { SOURCES, TOPIC_SEARCHES, youtubeSearchUrl, parseYouTubeId, embedUrl, GENERIC_TASKS } from "./videos.js";
import { LIBRARY, SERIES, SRC_LABEL, TYPE_LABEL, CHAPTER_TASKS, thumbUrl, watchUrl } from "./library.js";

const app = document.getElementById("app");
const LANG = COURSE.lang;

const currentLevel = () => store.getState().profile.level || "A";
const currentCourse = () => courseFor(currentLevel());

// ---------- Powiadomienia ----------

function toast(msg) {
  let box = document.querySelector(".toasts");
  if (!box) {
    box = document.createElement("div");
    box.className = "toasts";
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3200);
}
window.addEventListener("toast", (e) => toast(e.detail));

function flushToasts() {
  store.checkBadges();
  store.takeToasts().forEach((t, i) => setTimeout(() => toast(t), i * 900));
}

// ---------- Nawigacja ----------

const TABS = [
  { id: "learn", icon: "🏠", label: "Nauka" },
  { id: "review", icon: "🔁", label: "Powtórki" },
  { id: "talk", icon: "🤖", label: "Rozmowa" },
  { id: "video", icon: "🎬", label: "Wideo" },
  { id: "me", icon: "👤", label: "Profil" },
];

function route() {
  stopSpeaking();
  const [tab, arg, extra, mode] = (location.hash.slice(2) || "learn").split("/");
  if (tab === "lesson") return openLesson(arg);
  if (tab === "placement") return openPlacement();
  if (tab === "talk" && arg) return openChat(arg);
  // #/watch/<film>/<lekcja>/pick – film oglądany jako zaliczenie lekcji
  if (tab === "watch" && arg) return openWatch(arg, extra && extra !== "lesson" ? extra : null, mode === "pick" || extra === "lesson");
  if (tab === "pick" && arg) return openPick(arg);
  if (tab === "video" && arg) {
    // stare linki do własnych filmów
    const own = store.getState().videos.find((v) => v.id === arg);
    return (location.hash = own ? `#/watch/${own.ytId}` : "#/video");
  }
  const screens = { learn: screenLearn, review: screenReview, talk: screenTalk, video: screenVideo, me: screenMe };
  (screens[tab] || screenLearn)(tab);
}
window.addEventListener("hashchange", route);

function shell(tab, html) {
  const st = store.getState();
  app.innerHTML = `
    <header class="topbar">
      <span class="pill" title="Seria dni">🔥 ${store.currentStreak()}</span>
      <span class="pill" title="Punkty doświadczenia">⭐ ${st.xp}</span>
      <span class="pill" title="Cel dzienny">🎯 ${Math.min(store.xpToday(), st.profile.dailyGoal)}/${st.profile.dailyGoal}</span>
    </header>
    <main class="screen">${html}</main>
    <nav class="tabbar">${TABS.map(
      (t) => `<a href="#/${t.id}" class="${t.id === tab ? "active" : ""}"><span>${t.icon}</span>${t.label}</a>`
    ).join("")}</nav>`;
  return app.querySelector(".screen");
}

// ---------- Ekran: Nauka (ścieżka rozdziałów) ----------

function isUnlocked(lessonId) {
  const list = allLessons(courseFor(levelOfLesson(lessonId)));
  const i = list.findIndex((l) => l.id === lessonId);
  return i === 0 || store.lessonProgress(list[i - 1].id).level >= 1;
}

function screenLearn() {
  const quests = store.dailyQuests();
  const st = store.getState();
  const nextLesson = allLessons(currentCourse()).find((l) => store.lessonProgress(l.id).level === 0 && isUnlocked(l.id));
  const due = store.dueItems(50).length;
  const recVideo = recommendVideos(1)[0];

  const el = shell("learn", `
    ${!st.profile.name ? `<div class="card welcome">
        <h2>Cześć! 👋</h2>
        <p>Uczymy się mówić, nie wkuwać gramatykę. Każda lekcja to prawdziwa sytuacja: lotnisko, hotel, sklep. Słówka i zdania wracają w kolejnych lekcjach, aż wejdą do głowy.</p>
        <label>Jak masz na imię?<input id="name" placeholder="np. Tomek"></label>
        <p class="muted">Na start szybki test (20 pytań, ~5 min) – dopasujemy poziom, żeby nie nudzić Cię podstawami.</p>
        <div class="btn-row">
          <button class="btn btn-primary" id="saveName" data-next="test">🧭 Test poziomu</button>
          <button class="btn btn-ghost" id="saveNameZero" data-next="zero">Zaczynam od zera</button>
        </div>
      </div>` : !st.profile.level ? `<div class="card welcome">
        <h3>🧭 Dopasuj poziom</h3>
        <p class="muted">Kurs ma teraz 3 poziomy: początkujący, średni i zaawansowany – każdy ze wszystkimi tematami. Zrób szybki test, a ułożymy plan od właściwego miejsca.</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="#/placement">Zrób test (5 min)</a>
          <button class="btn btn-ghost" id="stayA">Zostaję przy początkującym</button>
        </div>
      </div>` : ""}
    <div class="level-tabs" role="tablist">
      ${LEVELS.map((l) => `<button class="level-tab ${l.id === currentLevel() ? "active" : ""}" data-level="${l.id}"><span>${l.emoji}</span>${l.name}<small>${l.code}</small></button>`).join("")}
    </div>
    <section class="card quests">
      <h3>Wyzwania dnia</h3>
      ${quests.map((q) => `
        <div class="quest ${q.done ? "done" : ""}">
          <span>${q.done ? "✅" : "🎯"} ${escapeHtml(q.label)}</span>
          <div class="qbar"><div style="width:${Math.round((q.progress / q.goal) * 100)}%"></div></div>
          <small>${q.progress}/${q.goal} · +${q.reward} XP</small>
        </div>`).join("")}
    </section>
    <div class="quick">
      ${nextLesson ? `<a class="btn btn-primary big" href="#/lesson/${nextLesson.id}">▶ Kontynuuj: ${escapeHtml(nextLesson.title)}</a>` : ""}
      ${due ? `<a class="btn btn-ghost" href="#/review">🔁 Do powtórki: ${due}</a>` : ""}
    </div>
    ${recVideo ? `<section class="card">
      <h3>🎬 Scenka dla Ciebie</h3>
      <p class="muted">Pasuje do tego, czego się teraz uczysz.</p>
      ${videoCard(recVideo, { big: true })}
    </section>` : ""}
    ${currentCourse().chapters.map((ch) => {
      const doneCount = ch.lessons.filter((l) => {
        const p = store.lessonProgress(l.id);
        return p.level >= 1 && (p.video || !videosForLesson(l.id).length);
      }).length;
      return `
      <section class="chapter">
        <div class="chapter-head">
          <span class="chapter-emoji">${ch.emoji}</span>
          <div><h3>${escapeHtml(ch.title)}</h3><p class="muted">${escapeHtml(ch.description)}</p></div>
          <span class="chapter-count">${doneCount}/${ch.lessons.length}</span>
        </div>
        <div class="path">
          ${ch.lessons.map((l, i) => {
            const p = store.lessonProgress(l.id);
            const open = isUnlocked(l.id);
            const crowns = "👑".repeat(p.level) || "";
            const hasVideos = videosForLesson(l.id).length > 0;
            return `<div class="node-wrap ${i % 2 ? "shift" : ""}">
              <a class="node ${open ? "" : "locked"} ${p.level ? "done" : ""}" ${open ? `href="#/lesson/${l.id}"` : ""}>
                <span class="node-circle">${open ? (p.level >= 3 ? "🏆" : p.level ? "⭐" : "▶") : "🔒"}</span>
                <span class="node-title">${escapeHtml(l.title)}</span>
                <span class="node-crowns">${crowns}</span>
              </a>
              ${p.level && hasVideos ? `<a class="node-video ${p.video ? "done" : ""}" href="#/pick/${l.id}">${p.video ? "🎓 Zaliczona" : "🎬 Brakuje scenki"}</a>` : ""}
            </div>`;
          }).join("")}
        </div>
      </section>`;
    }).join("")}
  `);

  el.querySelectorAll("#saveName, #saveNameZero").forEach((b) => {
    b.onclick = () => {
      st.profile.name = el.querySelector("#name").value.trim() || "Ja";
      if (b.dataset.next === "zero") st.profile.level = "A";
      store.save();
      if (b.dataset.next === "test") location.hash = "#/placement";
      else route();
    };
  });
  const stayA = el.querySelector("#stayA");
  if (stayA) stayA.onclick = () => { st.profile.level = "A"; store.save(); route(); };
  el.querySelectorAll(".level-tab").forEach((b) => {
    b.onclick = () => {
      st.profile.level = b.dataset.level;
      store.save();
      route();
    };
  });
}

function openLesson(id) {
  const found = findLesson(id);
  if (!found || !isUnlocked(id)) return (location.hash = "#/learn");
  const level = Math.min(2, store.lessonProgress(id).level);
  runSession(app, {
    title: found.lesson.title,
    lessonId: id,
    queue: buildLessonQueue(found.lesson, level),
    // po ćwiczeniach ostatni krok lekcji: wybór i obejrzenie scenki
    onExit: (result) => {
      flushToasts();
      location.hash = result && videosForLesson(id).length ? `#/pick/${id}` : "#/learn";
    },
  });
}

function openPlacement() {
  const st = store.getState();
  runPlacement(app, {
    lang: LANG,
    onDone: (r) => {
      st.profile.level = r.level;
      st.profile.placement = r;
      store.save();
      toast(`${levelInfo(r.level).emoji} Poziom ustawiony: ${levelInfo(r.level).name}`);
      location.hash = "#/learn";
    },
    onCancel: () => (location.hash = "#/learn"),
  });
}

// ---------- Ekran: Powtórki ----------

function screenReview() {
  const due = store.dueItems(100);
  const weak = store.weakItems(10);
  const total = Object.keys(store.getState().srs).length;
  const el = shell("review", `
    <section class="card">
      <h2>🔁 Powtórki</h2>
      <p class="muted">Aplikacja pilnuje, kiedy dane słowo lub zwrot ma wrócić: dziś, jutro, za 2, 4, 8, 16 dni. Im lepiej Ci idzie, tym rzadziej wraca.</p>
      <div class="stats-row">
        <div><b>${due.length}</b><span>do powtórki</span></div>
        <div><b>${store.knownCount()}</b><span>opanowane</span></div>
        <div><b>${total}</b><span>poznane</span></div>
      </div>
      <button class="btn btn-primary big" id="go" ${total ? "" : "disabled"}>${due.length ? "Zacznij powtórkę" : "Poćwicz najtrudniejsze"}</button>
    </section>
    ${weak.length ? `<section class="card"><h3>Najczęściej mylone</h3>${weak.map((w) => `
      <div class="row"><button class="speak-btn" data-say="${escapeHtml(w.en)}">🔊</button><div><b>${escapeHtml(w.en)}</b><br><span class="muted">${escapeHtml(w.pl)}</span></div><small>✗${w.wrong}</small></div>`).join("")}</section>` : ""}
  `);
  el.querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => speak(b.dataset.say, { lang: LANG })));
  el.querySelector("#go").onclick = () => {
    const queue = buildReviewQueue(12);
    if (!queue.length) return toast("Najpierw zrób kilka lekcji 🙂");
    runSession(app, { title: "Powtórka", queue, onExit: () => { location.hash = "#/review"; route(); flushToasts(); } });
  };
}

// ---------- Ekran: Rozmowa z AI ----------

function screenTalk() {
  const hasKey = !!store.getState().settings.apiKey;
  shell("talk", `
    <section class="card">
      <h2>🤖 Porozmawiaj na żywo</h2>
      <p class="muted">Wybierz sytuację. Rozmówca mówi do Ciebie, Ty odpowiadasz głosem. Po każdej odpowiedzi dostaniesz krótką podpowiedź po polsku, jeśli coś można powiedzieć lepiej.</p>
      ${hasKey ? "" : `<p class="warn">Aby rozmawiać z AI, dodaj klucz API Anthropic w <a href="#/me">Profilu → Ustawienia</a>. Instrukcja jest w README.</p>`}
    </section>
    <div class="grid">
      ${SCENARIOS.map((s) => `<a class="tile-card" href="#/talk/${s.id}"><span>${s.emoji}</span>${escapeHtml(s.title)}</a>`).join("")}
    </div>
  `);
}

function openChat(id) {
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (!scenario) return (location.hash = "#/talk");
  const history = [{ role: "assistant", content: scenario.opener }];
  let busy = false;
  let live = store.getState().settings.autoListen;

  app.innerHTML = `
    <div class="session chat-screen">
      <header class="session-top">
        <a class="icon-btn" href="#/talk" aria-label="Wróć">←</a>
        <div class="chat-title">${scenario.emoji} ${escapeHtml(scenario.title)}</div>
        <button class="icon-btn small" id="live" title="Tryb na żywo: mikrofon włącza się sam">${live ? "🔁" : "⏸"}</button>
      </header>
      <main class="ex-body"><div class="chat"></div></main>
      <footer class="ex-foot chat-foot">
        <div class="heard muted"></div>
        <div class="chat-input">
          <input id="msg" placeholder="Napisz albo naciśnij mikrofon…" autocomplete="off">
          <button class="mic-btn small" id="mic" aria-label="Mów">🎤</button>
          <button class="btn btn-primary" id="send">➤</button>
        </div>
      </footer>
    </div>`;
  const chat = app.querySelector(".chat");
  const input = app.querySelector("#msg");
  const mic = app.querySelector("#mic");
  const heard = app.querySelector(".heard");
  const liveBtn = app.querySelector("#live");

  liveBtn.onclick = () => {
    live = !live;
    liveBtn.textContent = live ? "🔁" : "⏸";
    toast(live ? "Tryb na żywo: po odpowiedzi bota mikrofon włączy się sam" : "Tryb na żywo wyłączony");
  };

  function addBubble(who, html) {
    chat.insertAdjacentHTML("beforeend", `<div class="bubble ${who}">${html}</div>`);
    chat.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" });
    chat.querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => speak(b.dataset.say, { lang: LANG })));
    return chat.lastElementChild;
  }

  async function botSays(r) {
    addBubble("them", `${escapeHtml(r.reply)} <button class="speak-btn" data-say="${escapeHtml(r.reply)}">🔊</button>
      ${r.translation_pl ? `<details class="pl"><summary>Tłumaczenie</summary>${escapeHtml(r.translation_pl)}</details>` : ""}`);
    await speak(r.reply, { lang: LANG });
    if (live && canListen && location.hash.startsWith("#/talk/")) record();
  }

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    input.value = "";
    heard.textContent = "";
    const mine = addBubble("you", escapeHtml(text));
    history.push({ role: "user", content: text });
    const typing = addBubble("them typing", "…");
    try {
      const r = await chatTurn(scenario, history);
      typing.remove();
      history.push({ role: "assistant", content: r.reply });
      if (r.correction_pl) mine.insertAdjacentHTML("beforeend", `<div class="correction">💡 ${escapeHtml(r.correction_pl)}</div>`);
      store.addStat("chats");
      store.addXp(2);
      busy = false;
      flushToasts();
      await botSays(r);
    } catch (e) {
      typing.remove();
      history.pop();
      busy = false;
      addBubble("system", escapeHtml(describeError(e)));
    }
  }

  async function record() {
    if (!canListen) return toast("Ta przeglądarka nie rozpoznaje mowy – użyj Chrome (Android) lub Safari (iPhone).");
    mic.classList.add("live");
    heard.textContent = "Słucham…";
    try {
      const res = await listen({ lang: LANG, onInterim: (t) => (heard.textContent = t) });
      mic.classList.remove("live");
      if (res[0]) {
        store.addStat("spoken");
        send(res[0]);
      } else heard.textContent = "Nic nie usłyszałem. Naciśnij 🎤 i spróbuj jeszcze raz.";
    } catch (e) {
      mic.classList.remove("live");
      heard.textContent = e.message === "not-allowed" ? "Zezwól na mikrofon w ustawieniach przeglądarki." : "Błąd mikrofonu.";
    }
  }

  mic.onclick = record;
  app.querySelector("#send").onclick = () => send(input.value);
  input.onkeydown = (e) => { if (e.key === "Enter") send(input.value); };

  botSays({ reply: scenario.opener, translation_pl: "", correction_pl: "" });
}

// ---------- Ekran: Wideo ----------

// Podsuwanie scenek: najpierw temat, który właśnie przerabiasz, potem niedawno ukończone lekcje
// (żeby treść wróciła w nowym kontekście), na końcu tematy, które dopiero przed Tobą.
function recommendVideos(n = 3) {
  const st = store.getState();
  const lessons = allLessons(currentCourse());
  let last = -1;
  lessons.forEach((l, i) => { if (store.lessonProgress(l.id).level >= 1) last = i; });
  const score = (i) => (i === last + 1 ? -1 : i <= last ? last - i : 100 + i);
  // kandydaci: filmy przypisane do lekcji bieżącego poziomu, z kontekstem lekcji
  const pool = [];
  lessons.forEach((l, i) => {
    for (const v of videosForLesson(l.id)) if (!st.watched[v.id]) pool.push({ ...v, forLesson: l.id, rank: score(i) });
  });
  pool.sort((a, b) => a.rank - b.rank);
  // najwyżej jeden film z danej lekcji w polecanych, żeby była różnorodność
  const picked = [];
  const seen = new Set();
  for (const v of pool) if (picked.length < n && !seen.has(v.forLesson) && !picked.some((p) => p.id === v.id)) { picked.push(v); seen.add(v.forLesson); }
  for (const v of pool) if (picked.length < n && !picked.some((p) => p.id === v.id)) picked.push(v);
  return picked;
}

// Scenki do lekcji: lekcja może wskazać kilka grup filmów (pole "videos"), np. poziom
// zaawansowany korzysta też z filmów z poziomu średniego. Nieobejrzane na początku, maks. 4.
function videosForLesson(lessonId, limit = 4) {
  const st = store.getState();
  const found = findLesson(lessonId);
  const keys = found?.lesson.videos || [lessonId];
  const list = keys.flatMap((k) => LIBRARY.filter((v) => v.lesson === k && !st.hiddenVideos[v.id]));
  const unique = [...new Map(list.map((v) => [v.id, v])).values()];
  return [...unique.filter((v) => !st.watched[v.id]), ...unique.filter((v) => st.watched[v.id])].slice(0, limit);
}

function videoCard(v, { big = false } = {}) {
  const st = store.getState();
  const ctx = v.forLesson || v.lesson;
  const found = ctx ? findLesson(ctx) : null;
  return `<a class="vcard ${big ? "big" : ""}" href="#/watch/${v.id}${v.forLesson ? `/${v.forLesson}` : ""}">
    <span class="vthumb"><img src="${thumbUrl(v.id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">${v.short ? '<i class="vbadge">Short</i>' : ""}${st.watched[v.id] ? '<i class="vdone">✅</i>' : ""}</span>
    <span class="vtitle">${escapeHtml(v.desc || v.title)}</span>
    ${found ? `<small class="muted">${found.chapter.emoji} ${escapeHtml(found.lesson.title)}</small>` : ""}
  </a>`;
}

function screenVideo() {
  const st = store.getState();
  const recs = recommendVideos(3);
  const el = shell("video", `
    <section class="card">
      <h2>🎬 Scenki wideo</h2>
      <p class="muted">Krótkie filmy dobrane do Twoich lekcji. Oglądasz w aplikacji, wyłapujesz zwroty z lekcji i odpowiadasz na głos.</p>
      ${recs.length ? `<h3>Polecane dla Ciebie</h3><div class="vgrid">${recs.map((v) => videoCard(v, { big: true })).join("")}</div>` : `<p>Obejrzałeś wszystkie scenki z biblioteki 🎉 Dodaj własne poniżej.</p>`}
    </section>
    ${COURSE.chapters.map((ch) => {
      const vids = LIBRARY.filter((v) => chapterOf(v.lesson) === ch.id && !st.hiddenVideos[v.id]);
      if (!vids.length) return "";
      const seenCount = vids.filter((v) => st.watched[v.id]).length;
      return `<details class="card vchapter">
        <summary><span>${ch.emoji} ${escapeHtml(ch.title)}</span><small class="muted">${seenCount}/${vids.length}</small></summary>
        <div class="vgrid">${vids.map((v) => videoCard(v)).join("")}</div>
      </details>`;
    }).join("")}
    <section class="card">
      <h3>📺 Seriale – gdy masz ochotę na więcej</h3>
      ${SERIES.map((s) => `
        <div class="series"><b>${escapeHtml(s.name)}</b><p class="muted">${escapeHtml(s.note)}</p>
        <div class="vgrid">${s.episodes.filter((e) => !st.hiddenVideos[e.id]).map((e) => videoCard(e)).join("")}</div></div>`).join("")}
    </section>
    <details class="card">
      <summary>➕ Dodaj własny film z YouTube</summary>
      <label>Link do filmu<input id="yt" placeholder="https://youtu.be/… lub /shorts/…"></label>
      <label>Tytuł (opcjonalnie)<input id="ytTitle" placeholder="np. Ordering coffee"></label>
      <label>Transkrypcja/opis – AI ułoży pytania i wypisze zwroty (opcjonalnie)
        <textarea id="ytText" rows="4" placeholder="YouTube: „…więcej” → „Pokaż transkrypcję” → skopiuj tekst"></textarea>
      </label>
      <button class="btn btn-primary" id="addVid">Dodaj film</button>
      ${st.videos.length ? `<h3>Twoje filmy</h3><div class="vgrid">${st.videos.map((v) => videoCard({ id: v.ytId, title: v.title })).join("")}</div>` : ""}
    </details>
    <details class="card">
      <summary>🔎 Więcej darmowych źródeł</summary>
      <div class="chips">${TOPIC_SEARCHES.map((t) => `<a class="chip" target="_blank" rel="noopener" href="${youtubeSearchUrl(t.q)}">${t.label}</a>`).join("")}</div>
      ${SOURCES.map((s) => `<div class="source"><a target="_blank" rel="noopener" href="${s.url}"><b>${escapeHtml(s.name)}</b> ↗</a><p class="muted">${escapeHtml(s.note)}</p></div>`).join("")}
    </details>
  `);

  el.querySelector("#addVid").onclick = async () => {
    const ytId = parseYouTubeId(el.querySelector("#yt").value);
    if (!ytId) return toast("To nie wygląda na link do YouTube");
    const title = el.querySelector("#ytTitle").value.trim() || "Film " + (st.videos.length + 1);
    const text = el.querySelector("#ytText").value.trim();
    const video = { id: Date.now().toString(36), ytId, title, questions: GENERIC_TASKS, phrases: [] };
    if (st.settings.apiKey) {
      toast("AI przygotowuje pytania…");
      try {
        const gen = await videoQuestions(title, text);
        video.questions = gen.questions;
        video.phrases = gen.phrases;
      } catch (e) {
        toast(describeError(e));
      }
    }
    st.videos = st.videos.filter((v) => v.ytId !== ytId);
    st.videos.unshift(video);
    store.save();
    location.hash = `#/watch/${ytId}`;
  };
}

// Odtwarzacz: oficjalne YouTube IFrame API – dzięki niemu wiemy, gdy autor zablokował osadzanie
let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => { ytApiPromise = null; reject(new Error("yt-api")); };
      document.head.appendChild(s);
      setTimeout(() => reject(new Error("yt-timeout")), 10000);
    });
  }
  return ytApiPromise;
}

function mountPlayer(box, ytId, onBroken) {
  const fallback = () => {
    box.innerHTML = `<iframe src="${embedUrl(ytId)}" title="Wideo" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  };
  box.innerHTML = `<div id="ytp"></div>`;
  loadYouTubeApi()
    .then((YT) => {
      new YT.Player("ytp", {
        host: "https://www.youtube-nocookie.com",
        videoId: ytId,
        playerVars: { playsinline: 1, rel: 0, cc_load_policy: 1, cc_lang_pref: "en", hl: "pl" },
        events: {
          onError: (e) => {
            // 100: film usunięty/prywatny, 101/150/153: autor nie pozwala osadzać
            if ([100, 101, 150, 153].includes(e.data)) onBroken(e.data);
          },
        },
      });
    })
    .catch(fallback);
}

function findVideo(ytId) {
  const st = store.getState();
  const lib = LIBRARY.find((v) => v.id === ytId);
  if (lib) return { ...lib, kind: "library" };
  for (const s of SERIES) {
    const e = s.episodes.find((x) => x.id === ytId);
    if (e) return { ...e, src: s.name.includes("BBC") ? "bbc" : "voa", series: s.name, kind: "series" };
  }
  const own = st.videos.find((v) => v.ytId === ytId);
  if (own) return { id: own.ytId, title: own.title, questions: own.questions, phrases: own.phrases, kind: "own" };
  return null;
}

// Ostatni krok lekcji: 3–4 scenki do wyboru, obejrzenie jednej zalicza lekcję
function openPick(lessonId) {
  const found = findLesson(lessonId);
  if (!found) return (location.hash = "#/learn");
  const st = store.getState();
  const p = store.lessonProgress(lessonId);
  const vids = videosForLesson(lessonId);
  if (!vids.length) return (location.hash = "#/learn");
  app.innerHTML = `
    <div class="session">
      <header class="session-top">
        <a class="icon-btn" href="#/learn" aria-label="Zamknij">✕</a>
        <div class="progress"><div class="progress-fill" style="width:100%"></div></div>
        <span class="icon-btn small">🎬</span>
      </header>
      <main class="ex-body">
        <p class="ex-label">${p.video ? "🎓 Lekcja zaliczona – obejrzyj kolejną scenkę" : "Ostatni krok: wybierz scenkę"}</p>
        <p class="muted">${found.chapter.emoji} <b>${escapeHtml(found.lesson.title)}</b> – zobacz, jak te zwroty brzmią w prawdziwej rozmowie. Wybierz jeden film i obejrzyj go${p.video ? "" : ", żeby zaliczyć lekcję"}.</p>
        <div class="pick-list">
          ${vids.map((v) => `
            <a class="pick" href="#/watch/${v.id}/${lessonId}/pick">
              <span class="vthumb"><img src="${thumbUrl(v.id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
                ${v.short ? '<i class="vbadge">Short</i>' : ""}${st.watched[v.id] ? '<i class="vdone">✅</i>' : ""}</span>
              <span class="pick-text">
                <small class="pick-type">${v.src === "voa" ? "📺 Serial VOA" : TYPE_LABEL[v.type] || ""}${v.short ? " · ok. 1 min" : ""}</small>
                <b>${escapeHtml(v.desc || v.title)}</b>
                <small class="muted">${escapeHtml(v.title)}</small>
              </span>
            </a>`).join("")}
        </div>
      </main>
      <footer class="ex-foot"><a class="btn btn-ghost" href="#/learn">${p.video ? "Wróć do lekcji" : "Pomiń na razie – obejrzę później"}</a></footer>
    </div>`;
}

function openWatch(ytId, ctxLessonId = null, fromPick = false) {
  const st = store.getState();
  const v = findVideo(ytId);
  if (!v) return (location.hash = "#/video");
  // lekcja, w kontekście której oglądamy (z ekranu wyboru albo z polecanych)
  const lessonId = ctxLessonId || v.lesson || null;
  const found = lessonId ? findLesson(lessonId) : null;
  const fromLesson = fromPick;
  const phrases = found ? found.lesson.phrases : v.phrases || [];
  const tasks = found ? CHAPTER_TASKS[found.chapter.id] : v.questions || GENERIC_TASKS;
  const nextRec = () => recommendVideos(4).find((x) => x.id !== ytId);

  app.innerHTML = `
    <div class="session">
      <header class="session-top">
        <a class="icon-btn" href="${fromLesson && lessonId ? `#/pick/${lessonId}` : "#/video"}" aria-label="Wróć">←</a>
        <div class="chat-title">${escapeHtml(v.title)}</div>
        ${v.kind === "own" ? `<button class="icon-btn small" id="del" title="Usuń film">🗑</button>` : `<a class="icon-btn small" href="${watchUrl(ytId)}" target="_blank" rel="noopener" title="Otwórz w YouTube">↗</a>`}
      </header>
      <main class="ex-body">
        <div class="video-wrap ${v.short ? "short" : ""}"><div class="player"></div></div>
        <div class="broken" hidden></div>
        ${v.desc ? `<p class="vdesc">${escapeHtml(v.desc)}</p>` : ""}
        <p class="muted vmeta">${v.src ? escapeHtml(SRC_LABEL[v.src] || "") : ""}${found ? ` · ${found.chapter.emoji} ${found.level.name} · lekcja <a href="#/lesson/${found.lesson.id}">${escapeHtml(found.lesson.title)}</a>` : ""}${v.series ? ` · ${escapeHtml(v.series)}` : ""}</p>
        <div class="card steps">
          <b>Jak oglądać</b>
          <ol><li>Obejrzyj raz z napisami (CC).</li><li>Drugi raz bez napisów.</li><li>Zatrzymuj po zdaniu i powtarzaj na głos – to tzw. shadowing.</li></ol>
        </div>
        ${phrases.length ? `<h3>👂 Wyłap w filmie</h3><p class="muted">Zwroty z ${found ? "lekcji" : "filmu"}. Zaznacz te, które usłyszysz albo powiesz – każdy to +1 XP.</p>
          ${phrases.map((p, i) => `
          <div class="row"><button class="speak-btn" data-say="${escapeHtml(p.en)}">🔊</button>
            <div><b>${escapeHtml(p.en)}</b><br><span class="muted">${escapeHtml(p.pl)}</span></div>
            <button class="catch" data-i="${i}" title="Usłyszałem!">👂</button></div>`).join("")}
          ${v.kind === "own" ? `<button class="btn btn-ghost" id="toSrs">➕ Dodaj zwroty do powtórek</button>` : ""}` : ""}
        <h3>🎤 Odpowiedz na głos</h3>
        ${tasks.map((q, i) => `
          <div class="card vq" data-i="${i}">
            <div><b>${escapeHtml(q.q)}</b> <button class="speak-btn" data-say="${escapeHtml(q.q)}">🔊</button></div>
            <small class="muted">${escapeHtml(q.hint_pl)}</small>
            <div class="vq-row"><button class="mic-btn small">🎤</button><div class="heard"></div></div>
          </div>`).join("")}
      </main>
      <footer class="ex-foot"><button class="btn btn-primary" id="doneVid">${
        fromLesson && lessonId && !store.lessonProgress(lessonId).video ? "Obejrzane ✔ – zalicz lekcję (+15 XP)"
        : st.watched[ytId] ? "Obejrzane ✔ – następna scenka" : "Obejrzane ✔ (+10 XP)"}</button></footer>
    </div>`;

  mountPlayer(app.querySelector(".player"), ytId, () => {
    st.hiddenVideos[ytId] = Date.now();
    store.save();
    const next = nextRec();
    const box = app.querySelector(".broken");
    box.hidden = false;
    box.innerHTML = `<p>😕 Autor tego filmu nie pozwala go odtwarzać poza YouTube (albo film zniknął). Ukryłem go z listy.</p>
      <div class="btn-row"><a class="btn btn-ghost" href="${watchUrl(ytId)}" target="_blank" rel="noopener">Otwórz w YouTube ↗</a>
      ${fromLesson && lessonId ? `<a class="btn btn-primary" href="#/pick/${lessonId}">Wybierz inną scenkę ▶</a>`
        : next ? `<a class="btn btn-primary" href="#/watch/${next.id}${next.forLesson ? `/${next.forLesson}` : ""}">Następna scenka ▶</a>` : ""}</div>`;
  });

  app.querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => speak(b.dataset.say, { lang: LANG })));
  app.querySelectorAll(".catch").forEach((b) => {
    b.onclick = () => {
      if (b.classList.contains("on")) return;
      b.classList.add("on");
      b.textContent = "✅";
      const p = phrases[+b.dataset.i];
      store.srsAnswer(p, true, "phrase");
      store.addXp(1);
    };
  });
  app.querySelectorAll(".vq").forEach((card) => {
    const mic = card.querySelector(".mic-btn");
    const out = card.querySelector(".heard");
    mic.onclick = async () => {
      if (!canListen) return (out.textContent = "Powiedz odpowiedź na głos 🙂");
      mic.classList.add("live");
      try {
        const res = await listen({ lang: LANG, onInterim: (t) => (out.textContent = t) });
        out.textContent = res[0] ? `„${res[0]}”` : "Nic nie usłyszałem";
        if (res[0]) { store.addStat("spoken"); store.addXp(2); }
      } catch {
        out.textContent = "Błąd mikrofonu";
      }
      mic.classList.remove("live");
    };
  });
  const toSrs = app.querySelector("#toSrs");
  if (toSrs) toSrs.onclick = () => { phrases.forEach((p) => store.srsSeen(p, "phrase")); store.save(); toast("Dodano do powtórek"); };
  const del = app.querySelector("#del");
  if (del) del.onclick = () => {
    if (!confirm("Usunąć ten film z listy?")) return;
    st.videos = st.videos.filter((x) => x.ytId !== ytId);
    store.save();
    location.hash = "#/video";
  };
  app.querySelector("#doneVid").onclick = () => {
    if (!st.watched[ytId]) {
      st.watched[ytId] = Date.now();
      store.addStat("videos");
      store.addXp(10);
    }
    // obejrzenie dowolnej scenki z lekcji zalicza tę lekcję
    const passed = lessonId && store.lessonProgress(lessonId).level >= 1 && store.completeLessonVideo(lessonId, ytId);
    if (passed) {
      store.addXp(5);
      toast(`🎓 Lekcja „${found.lesson.title}” zaliczona!`);
    }
    store.save();
    flushToasts();
    if (fromLesson) return (location.hash = "#/learn");
    const next = nextRec();
    location.hash = next ? `#/watch/${next.id}${next.forLesson ? `/${next.forLesson}` : ""}` : "#/video";
  };
}

// ---------- Ekran: Profil, odznaki, ustawienia ----------

function screenMe() {
  const st = store.getState();
  const week = store.lastDaysXp(7);
  const max = Math.max(...week.map((d) => d.xp), st.profile.dailyGoal);
  const days = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
  const voices = englishVoices("en");

  const el = shell("me", `
    <section class="card">
      <h2>👤 ${escapeHtml(st.profile.name || "Ja")}</h2>
      <div class="stats-row">
        <div><b>${st.xp}</b><span>XP</span></div>
        <div><b>🔥 ${store.currentStreak()}</b><span>dni z rzędu</span></div>
        <div><b>${st.stats.spoken}</b><span>zdań na głos</span></div>
        <div><b>${st.stats.lessonsDone}</b><span>lekcji</span></div>
      </div>
      <h3>Ostatnie 7 dni</h3>
      <div class="week">${week.map((d) => `
        <div class="day"><div class="bar ${d.xp >= st.profile.dailyGoal ? "goal" : ""}" style="height:${Math.round((d.xp / max) * 100)}%"></div>
        <small>${days[new Date(d.day).getDay()]}</small><small class="muted">${d.xp}</small></div>`).join("")}</div>
    </section>
    <section class="card">
      <h3>🧭 Poziom</h3>
      <p>Uczysz się na poziomie: <b>${levelInfo(currentLevel()).emoji} ${levelInfo(currentLevel()).name}</b> (${levelInfo(currentLevel()).code})${st.profile.placement ? `<br><small class="muted">Test z ${new Date(st.profile.placement.date).toLocaleDateString("pl-PL")}: podstawy ${st.profile.placement.score.A}/7, średni ${st.profile.placement.score.B}/7, zaawansowany ${st.profile.placement.score.C}/6</small>` : ""}</p>
      <a class="btn btn-ghost" href="#/placement">Zrób test ponownie</a>
    </section>
    <section class="card">
      <h3>Odznaki</h3>
      <div class="badges">${store.BADGES.map((b) => `
        <div class="badge ${st.badges[b.id] ? "got" : ""}" title="${escapeHtml(b.desc)}"><span>${b.icon}</span><b>${escapeHtml(b.name)}</b><small>${escapeHtml(b.desc)}</small></div>`).join("")}</div>
    </section>
    <section class="card settings">
      <h3>⚙️ Ustawienia</h3>
      <label>Cel dzienny (XP)
        <select id="goal">${[10, 20, 30, 50, 80].map((g) => `<option ${g === st.profile.dailyGoal ? "selected" : ""}>${g}</option>`).join("")}</select>
      </label>
      <label>Głos lektora
        <select id="voice"><option value="">Automatyczny</option>${voices.map((v) => `<option value="${escapeHtml(v.voiceURI)}" ${v.voiceURI === st.settings.voiceURI ? "selected" : ""}>${escapeHtml(v.name)} (${v.lang})</option>`).join("")}</select>
      </label>
      <label>Tempo mowy: <span id="rateVal">${st.settings.rate}</span>
        <input type="range" id="rate" min="0.6" max="1.2" step="0.05" value="${st.settings.rate}">
      </label>
      <button class="btn btn-ghost" id="testVoice">🔊 Test głosu</button>
      <label class="check"><input type="checkbox" id="autoListen" ${st.settings.autoListen ? "checked" : ""}> Rozmowa na żywo: mikrofon włącza się sam</label>
      <hr>
      <h3>🤖 Rozmówca AI</h3>
      <p class="muted">Klucz z console.anthropic.com (zaczyna się od <code>sk-ant-</code>). Zapisuje się tylko na tym telefonie.</p>
      <label>Klucz API<input id="apiKey" type="password" value="${escapeHtml(st.settings.apiKey)}" placeholder="sk-ant-…" autocomplete="off"></label>
      <label>Model
        <select id="model">
          <option value="claude-opus-5-5" ${st.settings.model === "claude-opus-5-5" ? "selected" : ""}>Claude Opus 5.5 – najlepsze rozmowy</option>
          <option value="claude-sonnet-5-5" ${st.settings.model === "claude-sonnet-5-5" ? "selected" : ""}>Claude Sonnet 5.5 – szybszy, tańszy</option>
          <option value="claude-haiku-5-5" ${st.settings.model === "claude-haiku-5-5" ? "selected" : ""}>Claude Haiku 5.5 – najtańszy</option>
        </select>
      </label>
      <button class="btn btn-primary" id="saveSettings">Zapisz</button>
      <hr>
      <h3>Kopia postępu</h3>
      <div class="btn-row">
        <button class="btn btn-ghost" id="export">⬇ Eksportuj</button>
        <label class="btn btn-ghost">⬆ Importuj<input type="file" id="import" accept="application/json" hidden></label>
        <button class="btn btn-bad" id="reset">Wyczyść wszystko</button>
      </div>
    </section>
  `);

  el.querySelector("#rate").oninput = (e) => (el.querySelector("#rateVal").textContent = e.target.value);
  el.querySelector("#testVoice").onclick = () => {
    st.settings.voiceURI = el.querySelector("#voice").value;
    st.settings.rate = +el.querySelector("#rate").value;
    speak("Hi! Can I get a large latte to go, please?", { lang: LANG });
  };
  el.querySelector("#saveSettings").onclick = () => {
    st.profile.dailyGoal = +el.querySelector("#goal").value;
    st.settings.voiceURI = el.querySelector("#voice").value;
    st.settings.rate = +el.querySelector("#rate").value;
    st.settings.autoListen = el.querySelector("#autoListen").checked;
    st.settings.apiKey = el.querySelector("#apiKey").value.trim();
    st.settings.model = el.querySelector("#model").value;
    store.save();
    toast("Zapisano ✔");
    route();
  };
  el.querySelector("#export").onclick = () => {
    const blob = new Blob([store.exportState()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `angielski-postep-${store.today()}.json`;
    a.click();
  };
  el.querySelector("#import").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { store.importState(await f.text()); toast("Wczytano postęp"); route(); }
    catch { toast("To nie jest poprawny plik z postępem"); }
  };
  el.querySelector("#reset").onclick = () => {
    if (confirm("Na pewno usunąć cały postęp?")) { store.resetAll(); route(); }
  };
}

// ---------- Start ----------

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
route();
