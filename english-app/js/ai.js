// Rozmówca AI (Claude). Klucz API trzymany tylko na tym urządzeniu (localStorage).
// Na wersję rodzinną klucz trzeba przenieść na mały serwer pośredniczący – patrz README.

import { getState } from "./store.js";

const SDK_URL = "https://esm.sh/@anthropic-ai/sdk@0.131.0";
let clientPromise = null;
let clientKey = null;

async function getClient() {
  const { apiKey } = getState().settings;
  if (!apiKey) throw new Error("no-key");
  if (!clientPromise || clientKey !== apiKey) {
    clientKey = apiKey;
    clientPromise = import(SDK_URL).then(
      ({ default: Anthropic }) => new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    );
  }
  return clientPromise;
}

export const SCENARIOS = [
  { id: "free", emoji: "💬", title: "Luźna rozmowa", role: "a friendly English-speaking friend who chats about everyday life, hobbies, travel and plans", opener: "Hey! How's your day going?" },
  { id: "barista", emoji: "☕", title: "Barista w kawiarni", role: "a cheerful barista in a London coffee shop taking the user's order", opener: "Hi there! What can I get you today?" },
  { id: "checkin", emoji: "✈️", title: "Odprawa na lotnisku", role: "an airline check-in agent at the airport helping the user check in for a flight to New York", opener: "Good morning! Where are you flying today?" },
  { id: "hotel", emoji: "🏨", title: "Recepcja hotelu", role: "a hotel receptionist; the user is checking in and may have problems with the room", opener: "Good evening, welcome to the Grand Hotel! Do you have a reservation?" },
  { id: "shop", emoji: "👕", title: "Sklep z ubraniami", role: "a shop assistant in a clothes store helping the user find the right size", opener: "Hi! Are you looking for anything special today?" },
  { id: "doctor", emoji: "🩺", title: "U lekarza", role: "a calm, kind doctor asking the user about their symptoms", opener: "Hello, please sit down. So, what brings you here today?" },
  { id: "directions", emoji: "🗺️", title: "Pytanie o drogę", role: "a local person on the street in Dublin; the user is lost and asks for directions", opener: "You look a bit lost. Can I help you?" },
  { id: "interview", emoji: "💼", title: "Rozmowa o pracę", role: "a friendly recruiter doing a short, simple job interview", opener: "Thanks for coming in. Can you tell me a little about yourself?" },
];

function systemPrompt(scenario) {
  return `You are ${scenario.role}. You are helping a Polish adult practise SPOKEN English (level A2–B1).
Stay in character and keep the conversation going naturally.

Rules:
- Reply in simple, natural spoken English: 1–3 short sentences, everyday vocabulary.
- Almost always end with a question, so the learner has to speak again.
- The learner's text comes from speech recognition: ignore missing punctuation and capital letters, and small recognition glitches.
- If the learner made a real mistake (wrong word, word order, missing verb), put a short, kind correction in Polish in "correction_pl", quoting the better English version. If it was fine, use an empty string. Do not correct trivial things.
- If the learner writes in Polish or seems stuck, help them: give them a simple English sentence they could say, in "correction_pl".
- "translation_pl" is a natural Polish translation of your reply.
- A bit of light humour is welcome. Never lecture about grammar terms.`;
}

const SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    translation_pl: { type: "string" },
    correction_pl: { type: "string" },
  },
  required: ["reply", "translation_pl", "correction_pl"],
  additionalProperties: false,
};

// history: [{role:"user"|"assistant", content:string}] – assistant content to czysty tekst odpowiedzi
export async function chatTurn(scenario, history) {
  const client = await getClient();
  const { model } = getState().settings;
  const messages = [
    { role: "user", content: "(The conversation starts. Greet me in character.)" },
    { role: "assistant", content: scenario.opener },
    ...history.slice(1),
  ];
  const params = {
    model: model || "claude-opus-5-5",
    max_tokens: 4000,
    system: systemPrompt(scenario),
    messages,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
  };
  // Opus/Sonnet: włączony serwerowy fallback, gdy filtr bezpieczeństwa odrzuci odpowiedź
  const withFallback = /opus|sonnet|fable/.test(params.model);
  const response = withFallback
    ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
    : await client.messages.create(params);

  if (response.stop_reason === "refusal") {
    return { reply: "Sorry, let's talk about something else. What did you do today?", translation_pl: "Przepraszam, porozmawiajmy o czymś innym. Co dziś robiłeś?", correction_pl: "" };
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try {
    return JSON.parse(text);
  } catch {
    return { reply: text, translation_pl: "", correction_pl: "" };
  }
}

// Pytania do filmu na podstawie wklejonej transkrypcji / opisu
export async function videoQuestions(title, transcript) {
  const client = await getClient();
  const { model } = getState().settings;
  const response = await client.messages.create({
    model: model || "claude-opus-5-5",
    max_tokens: 4000,
    system: "You create short comprehension and speaking tasks for a Polish adult learning English (A2–B1). Questions in simple English, hints in Polish.",
    messages: [
      {
        role: "user",
        content: `Video title: ${title}\n\nTranscript or description:\n${transcript || "(none – use only the title)"}\n\nCreate 4 open questions the learner should answer OUT LOUD in English, and 5 useful phrases from the video with Polish translations.`,
      },
    ],
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            questions: { type: "array", items: { type: "object", properties: { q: { type: "string" }, hint_pl: { type: "string" } }, required: ["q", "hint_pl"], additionalProperties: false } },
            phrases: { type: "array", items: { type: "object", properties: { en: { type: "string" }, pl: { type: "string" } }, required: ["en", "pl"], additionalProperties: false } },
          },
          required: ["questions", "phrases"],
          additionalProperties: false,
        },
      },
    },
  });
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text);
}

export function describeError(e) {
  const msg = String(e?.message || e);
  if (msg === "no-key") return "Dodaj klucz API w Ustawieniach, żeby rozmawiać z AI.";
  if (/401|authentication|invalid x-api-key/i.test(msg)) return "Klucz API jest nieprawidłowy – sprawdź go w Ustawieniach.";
  if (/429|rate/i.test(msg)) return "Za dużo zapytań naraz – spróbuj za chwilę.";
  if (/credit|billing|402/i.test(msg)) return "Brak środków na koncie API (console.anthropic.com → Billing).";
  if (/Failed to fetch|NetworkError|import/i.test(msg)) return "Brak połączenia z internetem.";
  return "Coś poszło nie tak: " + msg.slice(0, 160);
}
