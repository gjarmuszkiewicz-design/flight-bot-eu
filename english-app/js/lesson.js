// Silnik lekcji: układa kolejkę ćwiczeń (nowe treści + powtórki z wcześniejszych lekcji),
// renderuje je i zbiera wynik. Błędne ćwiczenia wracają na koniec kolejki – jak w Duolingo.

import { COURSE, allLessons } from "./course.js";
import { speak, listen, canListen, scoreSpeech, highlightAnswer, escapeHtml } from "./speech.js";
import * as store from "./store.js";

const LANG = COURSE.lang;
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const sample = (a, n) => shuffle(a).slice(0, n);

let speakingPausedUntil = 0; // "Nie mogę teraz mówić" – wyłącza mówienie na 15 minut
const speakingOn = () => Date.now() > speakingPausedUntil;

// ---------- Budowanie kolejki ----------

function pools() {
  const lessons = allLessons();
  return {
    words: lessons.flatMap((l) => l.words),
    phrases: lessons.flatMap((l) => l.phrases),
  };
}

export function buildLessonQueue(lesson, level) {
  const q = [];
  const words = lesson.words;
  const phrases = lesson.phrases;

  // 1) powtórki z poprzednich lekcji – treść wraca w nowym kontekście
  const ownKeys = new Set([...words, ...phrases].map((i) => store.itemKey(i.en)));
  const due = store.dueItems(10).filter((r) => !ownKeys.has(store.itemKey(r.en))).slice(0, 3);
  for (const r of due) q.push(reviewExercise(r));

  if (level === 0) {
    for (const w of words) q.push({ type: "intro", item: w, kind: "word" });
    for (const w of words) q.push({ type: "choose_pl", item: w, kind: "word" });
    for (const w of sample(words, 3)) q.push({ type: "listen_choose", item: w, kind: "word" });
    for (const p of phrases) {
      q.push({ type: "intro", item: p, kind: "phrase" });
      q.push({ type: "build", item: p, kind: "phrase" });
    }
    for (const p of sample(phrases, 3)) q.push({ type: "speak", item: p, kind: "phrase" });
  } else if (level === 1) {
    for (const w of sample(words, 4)) q.push({ type: "choose_en", item: w, kind: "word" });
    for (const p of phrases) q.push({ type: "speak", item: p, kind: "phrase" });
    for (const p of sample(phrases, 3)) q.push({ type: "listen_type", item: p, kind: "phrase" });
    for (const p of sample(phrases, 2)) q.push({ type: "translate_speak", item: p, kind: "phrase" });
  } else {
    for (const w of sample(words, 3)) q.push({ type: "choose_en", item: w, kind: "word" });
    for (const p of phrases) q.push({ type: "translate_speak", item: p, kind: "phrase" });
    for (const p of sample(phrases, 3)) q.push({ type: "listen_type", item: p, kind: "phrase" });
  }

  if (lesson.dialog?.length) q.push({ type: "dialog", dialog: lesson.dialog, kind: "dialog" });
  return q;
}

export function buildReviewQueue(limit = 12) {
  const items = store.dueItems(limit);
  const fallback = items.length ? items : store.weakItems(limit);
  return fallback.map(reviewExercise);
}

function reviewExercise(rec) {
  const item = { en: rec.en, pl: rec.pl };
  if (rec.kind === "word") return { type: Math.random() < 0.5 ? "choose_en" : "listen_choose", item, kind: "word", review: true };
  const type = rec.box >= 3 ? "translate_speak" : Math.random() < 0.5 ? "build" : "speak";
  return { type, item, kind: "phrase", review: true };
}

// ---------- Sesja ----------

export function runSession(root, { title, queue, lessonId, onExit }) {
  const total = queue.filter((e) => e.type !== "intro").length || 1;
  let done = 0;
  let firstTry = 0;
  let scored = 0;
  let mistakes = 0;
  let xp = 0;
  const retried = new WeakSet();

  root.innerHTML = `
    <div class="session">
      <header class="session-top">
        <button class="icon-btn" data-act="close" aria-label="Zamknij">✕</button>
        <div class="progress"><div class="progress-fill"></div></div>
        <button class="icon-btn small" data-act="mute" title="Nie mogę teraz mówić">🎙️</button>
      </header>
      <main class="ex-body"></main>
      <footer class="ex-foot"></footer>
    </div>`;
  const body = root.querySelector(".ex-body");
  const foot = root.querySelector(".ex-foot");
  const fill = root.querySelector(".progress-fill");
  const muteBtn = root.querySelector('[data-act="mute"]');
  const syncMute = () => (muteBtn.textContent = speakingOn() ? "🎙️" : "🔇");
  syncMute();

  root.querySelector('[data-act="close"]').onclick = () => {
    if (confirm("Przerwać lekcję? Postęp z tej sesji przepadnie.")) onExit(null);
  };
  muteBtn.onclick = () => {
    speakingPausedUntil = speakingOn() ? Date.now() + 15 * 60 * 1000 : 0;
    syncMute();
    toastLocal(speakingOn() ? "Mówienie włączone" : "Mówienie wyłączone na 15 minut");
  };

  function toastLocal(msg) {
    window.dispatchEvent(new CustomEvent("toast", { detail: msg }));
  }

  function next() {
    fill.style.width = `${Math.round((done / total) * 100)}%`;
    const ex = queue.shift();
    if (!ex) return finish();
    foot.className = "ex-foot";
    foot.innerHTML = "";
    body.innerHTML = "";
    let type = ex.type;
    if (!speakingOn() && (type === "speak" || type === "translate_speak")) type = "build";
    if (!speakingOn() && type === "dialog") type = "dialog_read";
    RENDER[type](ex, { body, foot, result: (ok, info) => result(ex, ok, info) });
  }

  function result(ex, ok, { feedback = "", skipScore = false } = {}) {
    if (ex.type === "intro") {
      done += 0;
      return next();
    }
    if (!skipScore) {
      if (!retried.has(ex)) {
        scored++;
        if (ok) firstTry++;
      }
      if (ex.item) store.srsAnswer(ex.item, ok, ex.kind);
      if (ex.review) store.addStat("reviews");
    }
    if (ok) {
      done++;
      xp += ex.type === "dialog" || ex.type === "translate_speak" ? 3 : 2;
    } else {
      mistakes++;
      if (!retried.has(ex)) {
        retried.add(ex);
        queue.push(ex); // wraca na koniec
      } else {
        done++;
      }
    }
    foot.className = `ex-foot ${ok ? "good" : "bad"}`;
    foot.innerHTML = `
      <div class="fb-text">${ok ? "✅ Świetnie!" : "❌ Prawie…"} ${feedback}</div>
      <button class="btn ${ok ? "btn-good" : "btn-bad"}" data-act="next">Dalej</button>`;
    foot.querySelector('[data-act="next"]').onclick = next;
    foot.querySelector('[data-act="next"]').focus();
  }

  function finish() {
    const accuracy = scored ? Math.round((firstTry / scored) * 100) : 100;
    const bonus = accuracy === 100 ? 5 : 0;
    const totalXp = 10 + xp + bonus;
    store.addXp(totalXp);
    if (lessonId) {
      store.completeLesson(lessonId, accuracy);
      store.addStat("lessonsDone");
    }
    if (accuracy === 100 && scored > 3) store.addStat("perfect");
    store.checkBadges();
    fill.style.width = "100%";
    body.innerHTML = `
      <div class="finish">
        <div class="finish-emoji">${accuracy >= 90 ? "🎉" : accuracy >= 70 ? "💪" : "🙂"}</div>
        <h2>${escapeHtml(title)} – gotowe!</h2>
        <div class="finish-stats">
          <div><b>+${totalXp}</b><span>XP</span></div>
          <div><b>${accuracy}%</b><span>trafność</span></div>
          <div><b>🔥 ${store.currentStreak()}</b><span>dni z rzędu</span></div>
        </div>
        <p class="muted">${mistakes ? "Zwroty, z którymi był kłopot, wrócą w powtórkach." : "Bez błędów – tak trzymaj!"}</p>
      </div>`;
    foot.className = "ex-foot";
    foot.innerHTML = `<button class="btn btn-primary" data-act="done">Kontynuuj</button>`;
    foot.querySelector('[data-act="done"]').onclick = () => onExit({ xp: totalXp, accuracy });
  }

  next();
}

// ---------- Rodzaje ćwiczeń ----------

const speakBtn = (text, label = "🔊") =>
  `<button class="speak-btn" data-say="${escapeHtml(text)}" aria-label="Posłuchaj">${label}</button>`;

function wireSpeakButtons(el) {
  el.querySelectorAll("[data-say]").forEach((b) => {
    b.onclick = () => speak(b.dataset.say, { lang: LANG, slow: b.dataset.slow === "1" });
  });
}

function optionsFor(item, kind, field) {
  const p = pools();
  const pool = (kind === "word" ? p.words : p.phrases).filter((x) => x[field] !== item[field]);
  const unique = [...new Map(pool.map((x) => [x[field], x])).values()];
  return shuffle([item, ...sample(unique, 3)]);
}

function choiceExercise({ body, result }, { prompt, promptHtml, options, correct, field, sayOnPick }) {
  body.innerHTML = `
    <p class="ex-label">${prompt}</p>
    <div class="ex-prompt">${promptHtml}</div>
    <div class="choices">${options
      .map((o, i) => `<button class="choice" data-i="${i}">${escapeHtml(o[field])}</button>`)
      .join("")}</div>`;
  wireSpeakButtons(body);
  body.querySelectorAll(".choice").forEach((b) => {
    b.onclick = () => {
      const picked = options[+b.dataset.i];
      const ok = picked === correct;
      body.querySelectorAll(".choice").forEach((x) => (x.disabled = true));
      b.classList.add(ok ? "right" : "wrong");
      if (!ok) body.querySelectorAll(".choice")[options.indexOf(correct)].classList.add("right");
      if (sayOnPick) speak(correct.en, { lang: LANG });
      result(ok, { feedback: ok ? "" : `Poprawnie: <b>${escapeHtml(correct[field])}</b>` });
    };
  });
}

// Mikrofon: nagrywa, ocenia i pokazuje, które słowa wyszły
function speakingWidget(container, answers, onDoneRaw, { maxTries = 3 } = {}) {
  let tries = 0;
  let finished = false;
  container.insertAdjacentHTML(
    "beforeend",
    `<div class="mic-wrap">
       <button class="mic-btn" aria-label="Mów">🎤</button>
       <div class="mic-hint muted">${canListen ? "Naciśnij i powiedz na głos" : "Twoja przeglądarka nie rozpoznaje mowy – powiedz na głos i oceń się sam"}</div>
       <div class="heard"></div>
       <div class="self-check" ${canListen ? "hidden" : ""}>
         <button class="btn btn-ghost" data-self="1">✅ Powiedziałem</button>
         <button class="btn btn-ghost" data-self="0">Pomiń</button>
       </div>
     </div>`
  );
  const mic = container.querySelector(".mic-btn");
  const heard = container.querySelector(".heard");
  const hint = container.querySelector(".mic-hint");
  // wynik zapisujemy tylko raz – kolejne kliknięcia nic już nie zmieniają
  const onDone = (ok, info) => {
    if (finished) return;
    finished = true;
    mic.disabled = true;
    container.querySelector(".self-check").hidden = true;
    onDoneRaw(ok, info);
  };
  container.querySelectorAll("[data-self]").forEach((b) => {
    b.onclick = () => {
      if (b.dataset.self === "1") store.addStat("spoken");
      onDone(b.dataset.self === "1", { skipScore: b.dataset.self === "0" });
    };
  });

  mic.onclick = async () => {
    if (finished) return;
    if (!canListen) return speak(answers[0], { lang: LANG });
    mic.classList.add("live");
    hint.textContent = "Słucham…";
    heard.textContent = "";
    let transcripts = [];
    try {
      transcripts = await listen({ lang: LANG, onInterim: (t) => (heard.textContent = t) });
    } catch (e) {
      mic.classList.remove("live");
      hint.textContent =
        e.message === "not-allowed"
          ? "Brak dostępu do mikrofonu – zezwól w ustawieniach przeglądarki."
          : "Nie udało się nagrać. Spróbuj jeszcze raz.";
      container.querySelector(".self-check").hidden = false;
      return;
    }
    mic.classList.remove("live");
    if (!transcripts.length) {
      hint.textContent = "Nic nie usłyszałem – spróbuj głośniej 🙂";
      return;
    }
    tries++;
    store.addStat("spoken");
    const best = scoreSpeech(transcripts, answers);
    const pct = Math.round(best.score * 100);
    heard.innerHTML = `Usłyszałem: „${escapeHtml(best.heard)}” <span class="score">${pct}%</span>
      <div class="target">${highlightAnswer(best.target, best.hit)}</div>`;
    if (best.score >= 0.8) {
      onDone(true, { feedback: `Wymowa ${pct}%` });
    } else if (tries >= maxTries) {
      onDone(false, { feedback: `Wzorzec: <b>${escapeHtml(answers[0])}</b>` });
    } else {
      hint.textContent = `Jeszcze raz! (próba ${tries}/${maxTries}) – posłuchaj wzorca 🔊`;
    }
  };
}

const RENDER = {
  intro({ item, kind }, { body, foot, result }) {
    body.innerHTML = `
      <p class="ex-label">${kind === "word" ? "Nowe słówko" : "Nowy zwrot"}</p>
      <div class="card-intro">
        <div class="big-en">${escapeHtml(item.en)} ${speakBtn(item.en)} ${speakBtn(item.en, "🐢").replace("data-say", 'data-slow="1" data-say')}</div>
        <div class="pl">${escapeHtml(item.pl)}</div>
      </div>`;
    wireSpeakButtons(body);
    speak(item.en, { lang: LANG });
    store.srsSeen(item, kind);
    if (kind === "phrase" && speakingOn()) {
      body.insertAdjacentHTML("beforeend", `<p class="ex-label">Powtórz na głos:</p>`);
      speakingWidget(body, [item.en, ...(item.alt || [])], (ok) => {
        body.querySelector(".mic-hint").textContent = ok ? "Super! 👏" : "Ok, poćwiczymy jeszcze.";
        body.querySelector(".self-check").hidden = true;
      });
    }
    foot.innerHTML = `<button class="btn btn-primary" data-act="next">Dalej</button>`;
    foot.querySelector("button").onclick = () => result(true);
  },

  choose_pl({ item, kind }, ui) {
    choiceExercise(ui, {
      prompt: "Co to znaczy?",
      promptHtml: `<span class="big-en">${escapeHtml(item.en)}</span> ${speakBtn(item.en)}`,
      options: optionsFor(item, kind, "pl"),
      correct: item,
      field: "pl",
    });
  },

  choose_en({ item, kind }, ui) {
    const options = optionsFor(item, kind, "en");
    choiceExercise(ui, {
      prompt: "Wybierz po angielsku",
      promptHtml: `<span class="big-pl">${escapeHtml(item.pl)}</span>`,
      options,
      correct: options.find((o) => o.en === item.en),
      field: "en",
      sayOnPick: true,
    });
  },

  listen_choose({ item, kind }, ui) {
    const options = optionsFor(item, kind, "en");
    choiceExercise(ui, {
      prompt: "Co słyszysz?",
      promptHtml: `${speakBtn(item.en, "🔊 Posłuchaj")} ${speakBtn(item.en, "🐢").replace("data-say", 'data-slow="1" data-say')}`,
      options,
      correct: options.find((o) => o.en === item.en),
      field: "en",
    });
    speak(item.en, { lang: LANG });
  },

  build({ item }, { body, foot, result }) {
    const words = item.en.split(/\s+/);
    const extra = sample(
      pools().words.map((w) => w.en).filter((w) => !w.includes(" ") && !words.includes(w)),
      Math.min(3, Math.ceil(words.length / 2))
    );
    const tiles = shuffle([...words, ...extra]).map((w, i) => ({ w, i }));
    const picked = [];
    body.innerHTML = `
      <p class="ex-label">Ułóż po angielsku</p>
      <div class="ex-prompt big-pl">${escapeHtml(item.pl)}</div>
      <div class="answer-line"></div>
      <div class="tiles"></div>`;
    const line = body.querySelector(".answer-line");
    const bank = body.querySelector(".tiles");
    const draw = () => {
      line.innerHTML = picked.map((t) => `<button class="tile" data-i="${t.i}">${escapeHtml(t.w)}</button>`).join("");
      bank.innerHTML = tiles
        .map((t) => `<button class="tile" data-i="${t.i}" ${picked.includes(t) ? "disabled" : ""}>${escapeHtml(t.w)}</button>`)
        .join("");
      line.querySelectorAll(".tile").forEach((b) => (b.onclick = () => { picked.splice(picked.findIndex((t) => t.i === +b.dataset.i), 1); draw(); }));
      bank.querySelectorAll(".tile").forEach((b) => (b.onclick = () => { picked.push(tiles.find((t) => t.i === +b.dataset.i)); speak(tiles.find((t) => t.i === +b.dataset.i).w, { lang: LANG }); draw(); }));
      check.disabled = !picked.length;
    };
    foot.innerHTML = `<button class="btn btn-primary" data-act="check" disabled>Sprawdź</button>`;
    const check = foot.querySelector("button");
    draw();
    check.onclick = () => {
      const said = picked.map((t) => t.w).join(" ");
      const answers = [item.en, ...(item.alt || [])];
      const ok = scoreSpeech([said], answers).score === 1;
      speak(item.en, { lang: LANG });
      result(ok, { feedback: ok ? "" : `Poprawnie: <b>${escapeHtml(item.en)}</b>` });
    };
  },

  listen_type({ item }, { body, foot, result }) {
    body.innerHTML = `
      <p class="ex-label">Napisz, co słyszysz</p>
      <div class="ex-prompt">${speakBtn(item.en, "🔊 Posłuchaj")} ${speakBtn(item.en, "🐢").replace("data-say", 'data-slow="1" data-say')}</div>
      <textarea class="type-in" rows="2" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Wpisz po angielsku…"></textarea>`;
    wireSpeakButtons(body);
    speak(item.en, { lang: LANG });
    const input = body.querySelector("textarea");
    foot.innerHTML = `<button class="btn btn-primary">Sprawdź</button>`;
    foot.querySelector("button").onclick = () => {
      const best = scoreSpeech([input.value], [item.en, ...(item.alt || [])]);
      const ok = best.score >= 0.85;
      result(ok, { feedback: `${ok && best.score < 1 ? "Mała literówka. " : ""}<b>${escapeHtml(item.en)}</b> – ${escapeHtml(item.pl)}` });
    };
  },

  speak({ item }, { body, result }) {
    body.innerHTML = `
      <p class="ex-label">Powiedz na głos</p>
      <div class="ex-prompt">
        <div class="big-en">${escapeHtml(item.en)} ${speakBtn(item.en)} ${speakBtn(item.en, "🐢").replace("data-say", 'data-slow="1" data-say')}</div>
        <div class="pl muted">${escapeHtml(item.pl)}</div>
      </div>`;
    wireSpeakButtons(body);
    speakingWidget(body, [item.en, ...(item.alt || [])], (ok, info) => result(ok, info));
  },

  translate_speak({ item }, { body, result }) {
    body.innerHTML = `
      <p class="ex-label">Powiedz to po angielsku</p>
      <div class="ex-prompt big-pl">${escapeHtml(item.pl)}</div>
      <details class="hint"><summary>Podpowiedź</summary>${escapeHtml(item.en.split(" ").slice(0, 2).join(" "))}…</details>`;
    speakingWidget(body, [item.en, ...(item.alt || [])], (ok, info) => {
      speak(item.en, { lang: LANG });
      result(ok, { ...info, feedback: `${info.feedback || ""} <br><b>${escapeHtml(item.en)}</b>` });
    });
  },

  // Scenka: druga strona mówi, Ty odpowiadasz swoje kwestie na głos
  dialog({ dialog }, { body, foot, result }) {
    let idx = 0;
    let fails = 0;
    body.innerHTML = `<p class="ex-label">Scenka – odegraj swoją rolę</p><div class="chat"></div>`;
    const chat = body.querySelector(".chat");
    const step = async () => {
      if (idx >= dialog.length) {
        return result(fails === 0, { feedback: fails ? "Kilka kwestii do poprawki – wrócą w powtórkach." : "Rozmowa jak z native speakerem!" });
      }
      const line = dialog[idx];
      if (line.who === "them") {
        chat.insertAdjacentHTML(
          "beforeend",
          `<div class="bubble them">${escapeHtml(line.en)} ${speakBtn(line.en)}<div class="pl muted">${escapeHtml(line.pl)}</div></div>`
        );
        wireSpeakButtons(chat);
        chat.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" });
        await speak(line.en, { lang: LANG });
        idx++;
        step();
      } else {
        chat.insertAdjacentHTML(
          "beforeend",
          `<div class="bubble you pending"><div class="pl">${escapeHtml(line.pl)}</div><details class="hint"><summary>Pokaż po angielsku</summary>${escapeHtml(line.en)}</details></div>`
        );
        const bubble = chat.lastElementChild;
        bubble.scrollIntoView({ behavior: "smooth", block: "end" });
        foot.innerHTML = "";
        const holder = document.createElement("div");
        foot.appendChild(holder);
        speakingWidget(holder, [line.en], (ok) => {
          if (!ok) fails++;
          store.srsAnswer({ en: line.en, pl: line.pl }, ok, "phrase");
          bubble.classList.remove("pending");
          bubble.innerHTML = `${escapeHtml(line.en)} ${ok ? "✅" : "🔁"}`;
          foot.innerHTML = "";
          idx++;
          step();
        }, { maxTries: 2 });
      }
    };
    step();
  },

  // wersja scenki bez mówienia (gdy mikrofon wyłączony)
  dialog_read({ dialog }, { body, foot, result }) {
    body.innerHTML = `<p class="ex-label">Scenka – przeczytaj i posłuchaj</p><div class="chat">${dialog
      .map((l) => `<div class="bubble ${l.who}">${escapeHtml(l.en)} ${speakBtn(l.en)}<div class="pl muted">${escapeHtml(l.pl)}</div></div>`)
      .join("")}</div>`;
    wireSpeakButtons(body);
    foot.innerHTML = `<button class="btn btn-primary">Dalej</button>`;
    foot.querySelector("button").onclick = () => result(true, { skipScore: true });
  },
};
