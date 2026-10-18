const DIMS = 768;

// Self-contained on purpose: this file is imported from inside vi.mock factories.
function normalize(vec) {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic bag-of-words hashing embedding: texts sharing words get similar vectors. */
export function fakeEmbedding(text) {
  const vec = new Array(DIMS).fill(0);
  const words = String(text).toLowerCase().match(/[a-z0-9]{3,}/g) ?? ['empty'];
  for (const w of words) vec[hash(w) % DIMS] += 1;
  return normalize(vec);
}

export const fakeEmbedTexts = async (texts) => texts.map(fakeEmbedding);
export const fakeEmbedQuery = async (text) => fakeEmbedding(text);
