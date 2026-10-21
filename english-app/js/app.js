// Główny plik: nawigacja i ekrany (Nauka, Powtórki, Rozmowa AI, Wideo, Profil).

import { COURSE, allLessons, findLesson } from "./course.js";
import * as store from "./store.js";
import { buildLessonQueue, buildReviewQueue, runSession } from "./lesson.js";
import { speak, listen, canListen, stopSpeaking, englishVoices, escapeHtml } from "./speech.js";
import { SCENARIOS, chatTurn, videoQuestions, describeError } from "./ai.js";
import { SOURCES, TOPIC_SEARCHES, youtubeSearchUrl, parseYouTubeId, embedUrl, GENERIC_TASKS } from "./videos.js";

const app = document.getElementById("app");
const LANG = COURSE.lang;

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
  const [tab, arg] = (location.hash.slice(2) || "learn").split("/");
  if (tab === "lesson") return openLesson(arg);
  if (tab === "talk" && arg) return openChat(arg);
  if (tab === "video" && arg) return openVideo(arg);
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
  const list = allLessons();
  const i = list.findIndex((l) => l.id === lessonId);
  return i === 0 || store.lessonProgress(list[i - 1].id).level >= 1;
}

function screenLearn() {
  const quests = store.dailyQuests();
  const st = store.getState();
  const nextLesson = allLessons().find((l) => store.lessonProgress(l.id).level === 0 && isUnlocked(l.id));
  const due = store.dueItems(50).length;

  const el = shell("learn", `
    ${!st.profile.name ? `<div class="card welcome">
        <h2>Cześć! 👋</h2>
        <p>Uczymy się mówić, nie wkuwać gramatykę. Każda lekcja to prawdziwa sytuacja: lotnisko, hotel, sklep. Słówka i zdania wracają w kolejnych lekcjach, aż wejdą do głowy.</p>
        <label>Jak masz na imię?<input id="name" placeholder="np. Tomek"></label>
        <button class="btn btn-primary" id="saveName">Zaczynamy</button>
      </div>` : ""}
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
    ${COURSE.chapters.map((ch) => {
      const doneCount = ch.lessons.filter((l) => store.lessonProgress(l.id).level >= 1).length;
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
            return `<a class="node ${open ? "" : "locked"} ${p.level ? "done" : ""} ${i % 2 ? "shift" : ""}" ${open ? `href="#/lesson/${l.id}"` : ""}>
              <span class="node-circle">${open ? (p.level >= 3 ? "🏆" : p.level ? "⭐" : "▶") : "🔒"}</span>
              <span class="node-title">${escapeHtml(l.title)}</span>
              <span class="node-crowns">${crowns}</span>
            </a>`;
          }).join("")}
        </div>
      </section>`;
    }).join("")}
  `);

  const saveName = el.querySelector("#saveName");
  if (saveName) {
    saveName.onclick = () => {
      st.profile.name = el.querySelector("#name").value.trim() || "Ja";
      store.save();
      route();
    };
  }
}

function openLesson(id) {
  const found = findLesson(id);
  if (!found || !isUnlocked(id)) return (location.hash = "#/learn");
  const level = Math.min(2, store.lessonProgress(id).level);
  runSession(app, {
    title: found.lesson.title,
    lessonId: id,
    queue: buildLessonQueue(found.lesson, level),
    onExit: () => { location.hash = "#/learn"; flushToasts(); },
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

function screenVideo() {
  const st = store.getState();
  const el = shell("video", `
    <section class="card">
      <h2>🎬 Scenki wideo</h2>
      <p class="muted">Znajdź krótki film (najlepiej 1–5 min), wklej link i odpowiadaj na pytania na głos. Filmy odtwarzamy oficjalnym odtwarzaczem YouTube – legalnie i za darmo.</p>
      <label>Link do filmu YouTube<input id="yt" placeholder="https://youtu.be/… lub /shorts/…"></label>
      <label>Tytuł (opcjonalnie)<input id="ytTitle" placeholder="np. Ordering coffee"></label>
      <details><summary>Wklej transkrypcję/opis – AI ułoży pytania i wypisze zwroty</summary>
        <textarea id="ytText" rows="4" placeholder="YouTube: „…więcej” → „Pokaż transkrypcję” → skopiuj tekst"></textarea>
      </details>
      <button class="btn btn-primary" id="addVid">Dodaj film</button>
    </section>
    ${st.videos.length ? `<section class="card"><h3>Twoje filmy</h3>${st.videos.map((v) => `
      <a class="row link" href="#/video/${v.id}">
        <img class="thumb" src="https://i.ytimg.com/vi/${v.ytId}/mqdefault.jpg" alt="">
        <div><b>${escapeHtml(v.title)}</b><br><small class="muted">${v.watched ? "✅ obejrzany" : "nowy"}</small></div>
      </a>`).join("")}</section>` : ""}
    <section class="card">
      <h3>Szukaj scenek do rozdziałów</h3>
      <div class="chips">${TOPIC_SEARCHES.map((t) => `<a class="chip" target="_blank" rel="noopener" href="${youtubeSearchUrl(t.q)}">${t.label}</a>`).join("")}</div>
    </section>
    <section class="card">
      <h3>Darmowe, sprawdzone źródła</h3>
      ${SOURCES.map((s) => `<div class="source"><a target="_blank" rel="noopener" href="${s.url}"><b>${escapeHtml(s.name)}</b> ↗</a><p class="muted">${escapeHtml(s.note)}</p></div>`).join("")}
    </section>
  `);

  el.querySelector("#addVid").onclick = async () => {
    const ytId = parseYouTubeId(el.querySelector("#yt").value);
    if (!ytId) return toast("To nie wygląda na link do YouTube");
    const title = el.querySelector("#ytTitle").value.trim() || "Film " + (st.videos.length + 1);
    const text = el.querySelector("#ytText").value.trim();
    const video = { id: Date.now().toString(36), ytId, title, questions: GENERIC_TASKS, phrases: [], watched: false };
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
    st.videos.unshift(video);
    store.save();
    location.hash = `#/video/${video.id}`;
  };
}

function openVideo(id) {
  const st = store.getState();
  const v = st.videos.find((x) => x.id === id);
  if (!v) return (location.hash = "#/video");
  app.innerHTML = `
    <div class="session">
      <header class="session-top">
        <a class="icon-btn" href="#/video">←</a>
        <div class="chat-title">${escapeHtml(v.title)}</div>
        <button class="icon-btn small" id="del" title="Usuń film">🗑</button>
      </header>
      <main class="ex-body">
        <div class="video-wrap"><iframe src="${embedUrl(v.ytId)}" title="${escapeHtml(v.title)}" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
        <p class="muted">Wskazówka: obejrzyj raz z napisami, drugi raz bez. Zatrzymuj i powtarzaj zdania na głos (shadowing).</p>
        ${v.phrases.length ? `<h3>Zwroty z filmu</h3>${v.phrases.map((p) => `
          <div class="row"><button class="speak-btn" data-say="${escapeHtml(p.en)}">🔊</button><div><b>${escapeHtml(p.en)}</b><br><span class="muted">${escapeHtml(p.pl)}</span></div></div>`).join("")}
          <button class="btn btn-ghost" id="toSrs">➕ Dodaj zwroty do powtórek</button>` : ""}
        <h3>Odpowiedz na głos</h3>
        ${v.questions.map((q, i) => `
          <div class="card vq" data-i="${i}">
            <div><b>${escapeHtml(q.q)}</b> <button class="speak-btn" data-say="${escapeHtml(q.q)}">🔊</button></div>
            <small class="muted">${escapeHtml(q.hint_pl)}</small>
            <div class="vq-row"><button class="mic-btn small">🎤</button><div class="heard"></div></div>
          </div>`).join("")}
      </main>
      <footer class="ex-foot"><button class="btn btn-primary" id="doneVid">Obejrzane ✔</button></footer>
    </div>`;
  app.querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => speak(b.dataset.say, { lang: LANG })));
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
  if (toSrs) toSrs.onclick = () => { v.phrases.forEach((p) => store.srsSeen(p, "phrase")); store.save(); toast("Dodano do powtórek"); };
  app.querySelector("#del").onclick = () => {
    if (!confirm("Usunąć ten film z listy?")) return;
    st.videos = st.videos.filter((x) => x.id !== id);
    store.save();
    location.hash = "#/video";
  };
  app.querySelector("#doneVid").onclick = () => {
    if (!v.watched) { v.watched = true; store.addStat("videos"); store.addXp(10); }
    store.save();
    flushToasts();
    location.hash = "#/video";
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
