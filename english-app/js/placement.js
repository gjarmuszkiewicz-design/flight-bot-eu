// Test poziomujący: 20 pytań w trzech blokach trudności (A1–A2, B1–B2, C1).
// Wynik decyduje, od którego poziomu zaczyna się kurs. Można go powtórzyć w Profilu.

import { speak, escapeHtml } from "./speech.js";
import { LEVELS, levelInfo } from "./course.js";

// type: "choose" – uzupełnij zdanie, "meaning" – co to znaczy, "reply" – najlepsza odpowiedź,
//       "listen" – posłuchaj i wybierz, co usłyszałeś. Pierwsza opcja w "options" jest poprawna.
export const QUESTIONS = [
  // A1–A2
  { band: "A", type: "choose", prompt: "___ name is Anna.", options: ["My", "I", "Me", "Mine"] },
  { band: "A", type: "meaning", prompt: "Where is the station?", options: ["Gdzie jest dworzec?", "Kiedy jest pociąg?", "Czy to jest stacja?", "Jak daleko jest stacja?"] },
  { band: "A", type: "reply", prompt: "How are you?", options: ["I'm fine, thanks.", "I'm thirty.", "I'm from Poland.", "Yes, I am."] },
  { band: "A", type: "listen", prompt: "Can I have the bill, please?", options: ["Can I have the bill, please?", "Can I have the pill, please?", "Can I have a bill, Steve?", "I can't have the bill, please."] },
  { band: "A", type: "choose", prompt: "I ___ coffee every morning.", options: ["drink", "drinks", "drinking", "am drink"] },
  { band: "A", type: "choose", prompt: "There ___ two beds in the room.", options: ["are", "is", "be", "am"] },
  { band: "A", type: "reply", prompt: "Can I pay by card?", options: ["Sure, no problem.", "It's on the left.", "Nice to meet you.", "I don't like it."] },
  // B1–B2
  { band: "B", type: "choose", prompt: "I ___ to London three times.", options: ["have been", "was", "have gone", "am"] },
  { band: "B", type: "choose", prompt: "If it rains tomorrow, we ___ at home.", options: ["will stay", "stay", "would stay", "stayed"] },
  { band: "B", type: "meaning", prompt: "My flight was cancelled, so I had to rebook.", options: ["Mój lot odwołano, więc musiałem zmienić rezerwację.", "Mój lot był opóźniony, więc czekałem na lotnisku.", "Zgubiłem bilet, więc kupiłem nowy.", "Lot był pełny, więc poleciałem później."] },
  { band: "B", type: "reply", prompt: "Would you mind opening the window?", options: ["Not at all.", "Yes, I mind it.", "I'm opening.", "No, thanks."] },
  { band: "B", type: "listen", prompt: "I'd rather sit by the window, if that's possible.", options: ["I'd rather sit by the window, if that's possible.", "I'd rather sit by the door, if that's possible.", "I'd like to sit by the window, it's possible.", "I'd rather sit with a widow, if that's possible."] },
  { band: "B", type: "choose", prompt: "She asked me where ___.", options: ["I lived", "did I live", "do I live", "I am live"] },
  { band: "B", type: "choose", prompt: "The museum is definitely worth ___.", options: ["visiting", "to visit", "visit", "visited"] },
  // C1
  { band: "C", type: "choose", prompt: "Had I known about the delay, I ___ a later train.", options: ["would have taken", "would take", "had taken", "will take"] },
  { band: "C", type: "meaning", prompt: "Let's not beat around the bush.", options: ["Nie owijajmy w bawełnę.", "Nie chodźmy na skróty.", "Nie traćmy nadziei.", "Nie kłóćmy się o drobiazgi."] },
  { band: "C", type: "reply", prompt: "I'm afraid we're fully booked tonight.", options: ["That's a shame. Could you recommend somewhere nearby?", "Don't be afraid, it's fine.", "Great, I'll book it then.", "Yes, I'm fully booked too."] },
  { band: "C", type: "choose", prompt: "Not only ___ late, but he also forgot the tickets.", options: ["was he", "he was", "he is", "did he"] },
  { band: "C", type: "listen", prompt: "I'm not entirely convinced this is the best way to go about it.", options: ["I'm not entirely convinced this is the best way to go about it.", "I'm entirely convinced this is the best way to go about it.", "I'm not entirely convinced this is the best way to go out.", "I was not convinced this was the best way around it."] },
  { band: "C", type: "meaning", prompt: "It's on the tip of my tongue.", options: ["Mam to na końcu języka.", "Ugryzłem się w język.", "To mi leży na sercu.", "Mówię to prosto z mostu."] },
];

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
