// Wspólne dla aplikacji i generatora nagrań: tekst → nazwa pliku z nagraniem lektora.
// Normalizacja sprawia, że "you?" i "You" mają to samo nagranie.

export function clipKey(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// FNV-1a 32-bit – krótki, stabilny skrót do nazwy pliku
export function clipHash(text) {
  const key = clipKey(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
