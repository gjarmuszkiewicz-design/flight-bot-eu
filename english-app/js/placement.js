// Test poziomujący: 20 pytań w trzech blokach trudności (A1–A2, B1–B2, C1).
// Wynik decyduje, od którego poziomu zaczyna się kurs. Można go powtórzyć w Profilu.

import { speak, escapeHtml } from "./speech.js";
import { LEVELS, levelInfo } from "./course.js";
import { QUESTIONS } from "./placement-questions.js";

export { QUESTIONS };

const LABEL = {
  choose: "Uzupełnij zdanie",
  meaning: "Co to znaczy?",
  reply: "Wybierz najlepszą odpowiedź",
  listen: "Posłuchaj i wybierz, co usłyszałeś",
};

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

export function scoreToLevel({ A, B, C }) {
  if (A < 5) return "A";
  if (B < 4) return "A";
  if (C < 4) return "B";
  return "C";
}

export function runPlacement(root, { lang, onDone, onCancel }) {
  const score = { A: 0, B: 0, C: 0 };
  let i = 0;

  root.innerHTML = `
    <div class="session">
      <header class="session-top">
        <button class="icon-btn" data-act="close" aria-label="Zamknij">✕</button>
        <div class="progress"><div class="progress-fill"></div></div>
        <span class="muted small-count"></span>
      </header>
      <main class="ex-body"></main>
      <footer class="ex-foot"></footer>
    </div>`;
  const body = root.querySelector(".ex-body");
  const foot = root.querySelector(".ex-foot");
  const fill = root.querySelector(".progress-fill");
  const count = root.querySelector(".small-count");
  root.querySelector('[data-act="close"]').onclick = () => {
    if (confirm("Przerwać test? Możesz go zrobić później w Profilu.")) onCancel();
  };

  function intro() {
    body.innerHTML = `
      <div class="finish">
        <div class="finish-emoji">🧭</div>
        <h2>Szybki test poziomu</h2>
        <p>20 pytań, około 5 minut. Pytania są coraz trudniejsze – to normalne, że ostatnich nie znasz.</p>
        <p class="muted">Nie zgaduj: jeśli nie wiesz, kliknij „Nie wiem”. Dzięki temu plan nauki lepiej do Ciebie pasuje.</p>
      </div>`;
    foot.innerHTML = `<button class="btn btn-primary">Zaczynamy</button>`;
    foot.querySelector("button").onclick = next;
  }

  function next() {
    if (i >= QUESTIONS.length) return result();
    const q = QUESTIONS[i];
    fill.style.width = `${Math.round((i / QUESTIONS.length) * 100)}%`;
    count.textContent = `${i + 1}/${QUESTIONS.length}`;
    const correct = q.options[0];
    const opts = shuffle(q.options);
    const prompt =
      q.type === "listen"
        ? `<button class="speak-btn" data-say="1">🔊 Posłuchaj</button> <button class="speak-btn" data-say="slow">🐢</button>`
        : `<span class="${q.type === "meaning" || q.type === "reply" ? "big-en" : "big-en"}">${escapeHtml(q.prompt).replace("___", "<u>&nbsp;&nbsp;&nbsp;&nbsp;</u>")}</span>`;
    body.innerHTML = `
      <p class="ex-label">${LABEL[q.type]}</p>
      <div class="ex-prompt">${prompt}</div>
      <div class="choices">
        ${opts.map((o, k) => `<button class="choice" data-k="${k}">${escapeHtml(o)}</button>`).join("")}
        <button class="choice dunno" data-k="-1">🤷 Nie wiem</button>
      </div>`;
    foot.innerHTML = "";
    body.querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => speak(q.prompt, { lang, slow: b.dataset.say === "slow" })));
    if (q.type === "listen") speak(q.prompt, { lang });
    body.querySelectorAll(".choice").forEach((b) => {
      b.onclick = () => {
        const k = +b.dataset.k;
        if (k >= 0 && opts[k] === correct) score[q.band]++;
        // w teście nie pokazujemy, czy odpowiedź była dobra – żeby nie stresować
        i++;
        next();
      };
    });
  }

  function result() {
    fill.style.width = "100%";
    count.textContent = "";
    const level = scoreToLevel(score);
    const info = levelInfo(level);
    const bar = (label, val, max) => `
      <div class="pbar"><span>${label}</span><div class="qbar"><div style="width:${Math.round((val / max) * 100)}%"></div></div><b>${val}/${max}</b></div>`;
    body.innerHTML = `
      <div class="finish">
        <div class="finish-emoji">${info.emoji}</div>
        <h2>Twój poziom: ${info.name}</h2>
        <p class="muted">${info.code} · plan nauki zacznie się od tego poziomu, ze wszystkimi tematami: podróże, hotel, restauracja, zakupy, miasto, zdrowie i rozmowy.</p>
      </div>
      <div class="card">
        ${bar("Podstawy", score.A, 7)}
        ${bar("Średni", score.B, 7)}
        ${bar("Zaawansowany", score.C, 6)}
      </div>
      <p class="muted">Chcesz inaczej? Wybierz poziom sam:</p>
      <div class="level-pick">
        ${LEVELS.map((l) => `<button class="btn ${l.id === level ? "btn-primary" : "btn-ghost"}" data-level="${l.id}">${l.emoji} ${l.name}</button>`).join("")}
      </div>`;
    foot.innerHTML = "";
    body.querySelectorAll("[data-level]").forEach((b) => {
      b.onclick = () => onDone({ level: b.dataset.level, suggested: level, score: { ...score }, date: Date.now() });
    });
  }

  intro();
}
