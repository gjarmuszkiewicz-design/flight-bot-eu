// Mowa: czytanie na głos (speechSynthesis) i rozpoznawanie mowy (Web Speech API).
// Działa w Chrome na Androidzie i w Safari na iPhonie – bez serwera i bez opłat.

import { getState } from "./store.js";

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const canListen = !!Recognition;
export const canSpeak = "speechSynthesis" in window;

let voicesCache = [];
function refreshVoices() {
  voicesCache = canSpeak ? speechSynthesis.getVoices() : [];
}
if (canSpeak) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}

export function englishVoices(lang = "en") {
  return voicesCache.filter((v) => v.lang.toLowerCase().startsWith(lang));
}

function pickVoice(lang) {
  const { voiceURI } = getState().settings;
  const list = englishVoices(lang.slice(0, 2));
  return list.find((v) => v.voiceURI === voiceURI) || list.find((v) => v.lang === lang) || list[0] || null;
}

export function speak(text, { lang = "en-US", slow = false } = {}) {
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

export function stopSpeaking() {
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
