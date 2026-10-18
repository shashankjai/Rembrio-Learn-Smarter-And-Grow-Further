const MIN_CHUNK_CHARS = 20;

export function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Prefer to end a chunk at a paragraph, then sentence, then word boundary. */
function findBreak(text, start, hardEnd, size) {
  const floor = start + Math.floor(size * 0.5);
  const window = text.slice(floor, hardEnd);
  const candidates = [
    window.lastIndexOf('\n\n'),
    Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '), window.lastIndexOf('.\n')),
    window.lastIndexOf('\n'),
    window.lastIndexOf(' '),
  ];
  for (const idx of candidates) {
    if (idx > 0) return floor + idx + 1;
  }
  return hardEnd;
}

/**
 * Split text into overlapping windows.
 * @returns {string[]}
 */
export function splitText(text, { chunkSize = 1000, overlap = 150 } = {}) {
  if (!Number.isInteger(chunkSize) || chunkSize < 100) throw new Error('chunkSize must be an integer >= 100');
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new Error('overlap must be an integer >= 0 and smaller than chunkSize');
  }
  const clean = normalizeText(text);
  if (!clean) return [];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const hardEnd = Math.min(start + chunkSize, clean.length);
    const end = hardEnd < clean.length ? findBreak(clean, start, hardEnd, chunkSize) : hardEnd;
    const piece = clean.slice(start, end).trim();
    if (piece.length >= MIN_CHUNK_CHARS) chunks.push(piece);
    if (end >= clean.length) break;
    const next = end - overlap;
    start = next > start ? next : end; // always make progress
  }
  return chunks;
}

/**
 * Page-aware chunking: a chunk never spans two pages, so its page number is exact.
 * @param {{page:number,text:string}[]} pages
 * @returns {{page:number, chunkIndex:number, text:string}[]}
 */
export function chunkPages(pages, options = {}) {
  const out = [];
  let chunkIndex = 0;
  for (const { page, text } of pages) {
    for (const piece of splitText(text, options)) {
      out.push({ page, chunkIndex: chunkIndex++, text: piece });
    }
  }
  return out;
}
