// Generator nagrań lektora: wszystkie słówka, zwroty, dialogi i pytania kursu
// czytane naturalnymi głosami Kokoro-82M (Apache-2.0), zapisywane jako MP3 w english-app/audio/.
//
// Uruchomienie (Node 22+, ffmpeg w PATH):
//   cd english-app/tools && npm install onnxruntime-node@1.22.0 phonemizer@1.2.1
//   KOKORO_MODEL=/ścieżka/model_q8.onnx KOKORO_VOICES=/ścieżka/voices node generate-audio.mjs
//   (szybciej: kilka procesów naraz, np. THREADS=1 SHARD=0/4 … SHARD=3/4)
// Model: model_quantized.onnx z onnx-community/Kokoro-82M-v1.0-ONNX (lub npm kokoro-q8-shards),
// głosy: katalog voices/ z pakietu npm kokoro-js. Istniejące pliki są pomijane – generuje tylko nowe.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import ort from "onnxruntime-node";
import { phonemize } from "./phonemize.ts";
import { clipHash, clipKey } from "../js/audio-key.js";
import { LEVELS } from "../js/course.js";
import { QUESTIONS } from "../js/placement-questions.js";
import { CHAPTER_TASKS } from "../js/library.js";
import { GENERIC_TASKS } from "../js/videos.js";
import { SCENARIOS } from "../js/ai.js";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, "..", "audio");
const SPEED = 0.95; // odrobinę wolniej niż naturalnie – łatwiej zrozumieć

// Głosy kobiece i męskie, amerykańskie (a*) i brytyjskie (b*)
export const VOICES = {
  female: ["af_heart", "af_bella", "bf_emma"],
  male: ["am_michael", "am_fenrir", "bm_george"],
};

// ---------- Przydział głosów ----------
// Każdy tekst dostaje jeden głos. W scenkach rozmówca i Ty macie różne płcie,
// słówka i zwroty w lekcji idą na zmianę: kobieta, mężczyzna, kobieta…

const assigned = new Map(); // klucz → { text, voice }
function assign(text, voice) {
  const key = clipKey(text);
  if (key && !assigned.has(key)) assigned.set(key, { text, voice });
}
const other = (g) => (g === "female" ? "male" : "female");

let n = 0;
for (const lvl of LEVELS) {
  for (const ch of lvl.course.chapters) {
    for (const lesson of ch.lessons) {
      const themG = n % 2 ? "male" : "female";
      const youG = other(themG);
      const themV = VOICES[themG][n % 3];
      const youV = VOICES[youG][(n + 1) % 3];
      for (const line of lesson.dialog || []) assign(line.en, line.who === "you" ? youV : themV);
      lesson.phrases.forEach((p, i) => assign(p.en, i % 2 ? VOICES[themG][(n + i) % 3] : youV));
      lesson.words.forEach((w, i) => assign(w.en, VOICES[i % 2 ? "male" : "female"][(n + i) % 3]));
      n++;
    }
  }
}
// pojedyncze słowa z kafelków w ćwiczeniu „ułóż zdanie”
let t = 0;
for (const lvl of LEVELS)
  for (const ch of lvl.course.chapters)
    for (const lesson of ch.lessons)
      for (const p of lesson.phrases)
        for (const w of p.en.split(/\s+/)) assign(w, VOICES[t++ % 2 ? "male" : "female"][t % 3]);
// test poziomu, pytania do filmów, rozmowy AI
QUESTIONS.filter((q) => q.type === "listen").forEach((q, i) => assign(q.prompt, VOICES[i % 2 ? "male" : "female"][0]));
[...Object.values(CHAPTER_TASKS).flat(), ...GENERIC_TASKS].forEach((q, i) => assign(q.q, VOICES[i % 2 ? "male" : "female"][i % 3]));
SCENARIOS.forEach((s, i) => assign(s.opener, VOICES[i % 2 ? "male" : "female"][i % 3]));
assign("Hi! Can I get a large latte to go, please?", "af_heart");

// kontrola kolizji skrótów
const byHash = new Map();
for (const [key] of assigned) {
  const h = clipHash(key);
  if (byHash.has(h) && byHash.get(h) !== key) throw new Error(`Kolizja skrótu: "${key}" / "${byHash.get(h)}"`);
  byHash.set(h, key);
}

// ---------- Synteza ----------

const vocab = JSON.parse(fs.readFileSync(path.join(HERE, "kokoro-vocab.json"), "utf8"));
const voiceCache = new Map();
function loadVoice(name) {
  if (!voiceCache.has(name)) {
    const buf = fs.readFileSync(path.join(process.env.KOKORO_VOICES, `${name}.bin`));
    voiceCache.set(name, new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4));
  }
  return voiceCache.get(name);
}

const session = await ort.InferenceSession.create(process.env.KOKORO_MODEL, {
  intraOpNumThreads: Number(process.env.THREADS || os.cpus().length),
});

async function synth(text, voice) {
  const ph = await phonemize(text, voice.startsWith("b") ? "b" : "a");
  const ids = [...ph].map((c) => vocab[c]).filter((x) => x !== undefined).slice(0, 510);
  const tokens = [0, ...ids, 0];
  const style = loadVoice(voice).slice(ids.length * 256, (ids.length + 1) * 256);
  const out = await session.run({
    input_ids: new ort.Tensor("int64", BigInt64Array.from(tokens.map(BigInt)), [1, tokens.length]),
    style: new ort.Tensor("float32", style, [1, 256]),
    speed: new ort.Tensor("float32", Float32Array.from([SPEED]), [1]),
  });
  return Object.values(out)[0].data;
}

function writeMp3(samples, file) {
  // normalizacja głośności i krótka cisza na końcu
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const pad = 24000 * 0.12;
  const pcm = Buffer.alloc((samples.length + pad) * 2);
  for (let i = 0; i < samples.length; i++) pcm.writeInt16LE(Math.round(samples[i] * gain * 32767), i * 2);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0", "-b:a", "48k", file], { input: pcm });
}

fs.mkdirSync(OUT, { recursive: true });
// SHARD=0/4 … 3/4 – podział pracy na kilka równoległych procesów (THREADS=1 każdy)
const [shard, shards] = (process.env.SHARD || "0/1").split("/").map(Number);
const todo = [...assigned.entries()]
  .filter((_, i) => i % shards === shard)
  .filter(([key]) => !fs.existsSync(path.join(OUT, `${clipHash(key)}.mp3`)));
console.log(`Teksty: ${assigned.size}, do wygenerowania: ${todo.length}`);
const t0 = Date.now();
let done = 0;
for (const [key, { text, voice }] of todo) {
  writeMp3(await synth(text, voice), path.join(OUT, `${clipHash(key)}.mp3`));
  if (++done % 50 === 0) console.log(`${done}/${todo.length} (${Math.round((Date.now() - t0) / 1000)} s)`);
}

// spis nagrań: skrót → głos (aplikacja wie, które nagrania istnieją, bez zbędnych zapytań)
const index = {};
for (const [key, { voice }] of assigned) index[clipHash(key)] = voice;
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index));
console.log(`Gotowe: ${done} nowych nagrań w ${Math.round((Date.now() - t0) / 1000)} s`);
