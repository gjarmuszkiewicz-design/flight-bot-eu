// Service worker: aplikacja działa offline (poza rozmową z AI i wideo).
const CACHE = "speakup-v5";
const FILES = [
  "./", "index.html", "manifest.webmanifest", "css/style.css",
  "js/app.js", "js/course.js", "js/store.js", "js/lesson.js", "js/speech.js", "js/ai.js", "js/videos.js", "js/library.js", "js/course-levels.js", "js/placement.js", "js/placement-questions.js", "js/audio-key.js", "audio/index.json",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Najpierw sieć (żeby zawsze była najnowsza wersja), a bez internetu – kopia z pamięci
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
