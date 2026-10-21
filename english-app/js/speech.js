// Mowa: lektor (naturalne nagrania MP3 lub głos systemowy) i rozpoznawanie mowy (Web Speech API).
// Działa w Chrome na Androidzie i w Safari na iPhonie – bez serwera i bez opłat.

import { getState } from "./store.js";
import { clipHash } from "./audio-key.js";

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const canListen = !!Recognition;
export const canSpeak = "speechSynthesis" in window;

// ---------- Naturalny lektor: nagrania wygenerowane wcześniej (tools/generate-audio.mjs) ----------

let clipIndex = {}; // skrót tekstu → głos
fetch("audio/index.json")
  .then((r) => (r.ok ? r.json() : {}))
  .then((j) => (clipIndex = j))
  .catch(() => {});

// Jeden odtwarzacz na całą aplikację – iOS pozwala mu grać kolejne nagrania
// (np. w scence) bez ponownego dotknięcia ekranu.
const player = new Audio();
player.preload = "auto";
let pending = null; // resolve aktualnie odtwarzanego nagrania

export function hasClip(text) {
  return !!clipIndex[clipHash(text)];
}

function playClip(text, slow) {
  return new Promise((resolve, reject) => {
    finishPending();
    pending = resolve;
    const rate = getState().settings.rate || 0.95;
    player.onended = () => finishPending();
    player.onerror = () => { pending = null; reject(new Error("clip")); };
    player.src = `audio/${clipHash(text)}.mp3`;
    // nagrania mają już tempo 0.95 – ustawienie tempa w Profilu skaluje je względnie
    player.playbackRate = (rate / 0.95) * (slow ? 0.7 : 1);
    player.preservesPitch = true;
    player.webkitPreservesPitch = true;
    player.play().catch((e) => { pending = null; reject(e); });
  });
}

function finishPending() {
  const r = pending;
  pending = null;
  if (r) r();
}

// ---------- Głos systemowy (zapas: odpowiedzi AI, własne filmy) ----------

let voicesCache = [];
function refreshVoices() {
  voicesCache = canSpeak ? speechSynthesis.getVoices() : [];
}
if (canSpeak) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}

// Im lepiej brzmi głos, tym wyżej: neuronowe/„premium” > Google > zwykłe > „compact”
function voiceScore(v) {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural|neural|premium|online/.test(n)) s += 50;
  if (/enhanced|wavenet|studio|siri/.test(n)) s += 40;
  if (/google/.test(n)) s += 20;
  if (/samantha|daniel|karen|moira|serena|ava|zoe|evan|nathan|aria|jenny|guy/.test(n)) s += 10;
  if (/compact|espeak|robot|novelty|bad news|bells|bubbles|whisper|zarvox|trinoids|albert|jester|organ|cellos|superstar/.test(n)) s -= 60;
  if (v.localService === false) s += 5;
  return s;
}

export function englishVoices(lang = "en") {
  return voicesCache.filter((v) => v.lang.toLowerCase().startsWith(lang)).sort((a, b) => voiceScore(b) - voiceScore(a));
}

function pickVoice(lang) {
  const { voiceURI } = getState().settings;
  const list = englishVoices(lang.slice(0, 2));
  return list.find((v) => v.voiceURI === voiceURI) || list.find((v) => v.lang === lang) || list[0] || null;
}

function speakSystem(text, lang, slow) {
  return new Promise((resolve) => {
    if (!canSpeak) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.rate = (getState().settings.rate || 1) * (slow ? 0.65 : 1);
    u.onend = resolve;
    u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

// Czyta tekst: naturalne nagranie, jeśli istnieje, w przeciwnym razie głos systemowy
export async function speak(text, { lang = "en-US", slow = false } = {}) {
  const natural = getState().settings.voiceMode !== "system";
  if (natural && lang.startsWith("en") && hasClip(text)) {
    try {
      return await playClip(text, slow);
    } catch {
      /* brak pliku / blokada odtwarzania – czytamy głosem systemowym */
    }
  }
  return speakSystem(text, lang, slow);
}

export function stopSpeaking() {
  player.pause();
  finishPending();
  if (canSpeak) speechSynthesis.cancel();
}

// Jedno nagranie: zwraca listę wariantów tego, co usłyszał rozpoznawacz.
let active = null;
export function listen({ lang = "en-US", onInterim } = {}) {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new Error("no-support"));
    stopSpeaking();
    if (active) active.abort();
    const rec = new Recognition();
    active = rec;
    rec.lang = lang;
    rec.interimResults = !!onInterim;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    let finals = [];
    rec.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      if (res.isFinal) {
        finals = Array.from(res).map((a) => a.transcript);
      } else if (onInterim) {
        onInterim(res[0].transcript);
      }
    };
    rec.onerror = (e) => {
      active = null;
      if (e.error === "no-speech" || e.error === "aborted") resolve([]);
      else reject(new Error(e.error));
    };
    rec.onend = () => {
      active = null;
      resolve(finals);
    };
    rec.start();
  });
}

export function stopListening() {
  if (active) active.stop();
}

// ---------- Ocena wypowiedzi ----------

const CONTRACTIONS = {
  "i'm": "i am", "you're": "you are", "it's": "it is", "that's": "that is", "there's": "there is",
  "what's": "what is", "here's": "here is", "we're": "we are", "they're": "they are", "isn't": "is not",
  "don't": "do not", "doesn't": "does not", "didn't": "did not", "can't": "cannot", "won't": "will not",
  "i'll": "i will", "we'll": "we will", "i'd": "i would", "let's": "let us", "where's": "where is",
};

export function normalize(text) {
  let t = text.toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9' -]/g, " ");
  t = t.replace(/-/g, " ");
  return t
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => (CONTRACTIONS[w] || w).split(" "))
    .map((w) => w.replace(/'/g, ""))
    .map((w) => (w === "wifi" ? "wi fi" : w))
    .join(" ")
    .split(" ")
    .filter(Boolean);
}

// Odległość edycyjna na poziomie słów + lista słów, które się zgadzają
function alignWords(target, said) {
  const n = target.length, m = said.length;
  const d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = target[i - 1] === said[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  // odtworzenie ścieżki: które słowa z wzorca trafiłeś
  const hit = Array(n).fill(false);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (target[i - 1] === said[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      hit[i - 1] = true; i--; j--;
    } else if (d[i][j] === d[i - 1][j - 1] + 1) { i--; j--; }
    else if (d[i][j] === d[i - 1][j] + 1) i--;
    else j--;
  }
  return { distance: d[n][m], hit };
}

// Porównuje to, co usłyszano, ze wszystkimi poprawnymi wersjami. Zwraca najlepszy wynik 0..1.
export function scoreSpeech(transcripts, answers) {
  let best = { score: 0, heard: transcripts[0] || "", target: answers[0], hit: [] };
  for (const ans of answers) {
    const target = normalize(ans);
    for (const tr of transcripts) {
      const said = normalize(tr);
      const { distance, hit } = alignWords(target, said);
      const score = Math.max(0, 1 - distance / Math.max(target.length, 1));
      if (score > best.score) best = { score, heard: tr, target: ans, hit };
    }
  }
  return best;
}

// Zaznacza w zdaniu słowa, które trafiłeś / pominąłeś (do pokazania po wypowiedzi)
export function highlightAnswer(target, hit) {
  const words = target.split(/\s+/);
  const norm = normalize(target);
  // normalize może rozbić skróty na 2 słowa – mapowanie przybliżone po kolejności
  let k = 0;
  return words
    .map((w) => {
      const parts = normalize(w).length || 1;
      const ok = hit.slice(k, k + parts).every(Boolean) && norm.length > 0;
      k += parts;
      return `<span class="${ok ? "w-ok" : "w-miss"}">${escapeHtml(w)}</span>`;
    })
    .join(" ");
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
