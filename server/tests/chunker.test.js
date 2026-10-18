import { describe, it, expect } from 'vitest';
import { splitText, chunkPages, normalizeText } from '../src/services/pdf/chunker.js';

const sentence = 'Photosynthesis converts light energy into chemical energy. ';

describe('chunker', () => {
  it('normalizes whitespace', () => {
    expect(normalizeText('a   b\r\n\r\n\r\n\r\nc')).toBe('a b\n\nc');
  });

  it('returns no chunks for empty text', () => {
    expect(splitText('   \n  ')).toEqual([]);
  });

  it('keeps short text as a single chunk', () => {
    expect(splitText('Short but valid chunk of text.', { chunkSize: 200, overlap: 20 })).toHaveLength(1);
  });

  it('respects chunk size and produces overlap', () => {
    const text = sentence.repeat(60);
    const chunks = splitText(text, { chunkSize: 300, overlap: 60 });
    expect(chunks.length).toBeGreaterThan(5);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(300);
    // Overlap: the start of chunk N+1 appears inside the tail of chunk N.
    const head = chunks[1].slice(0, 25);
    expect(chunks[0].includes(head)).toBe(true);
  });

  it('prefers sentence boundaries', () => {
    const chunks = splitText(sentence.repeat(30), { chunkSize: 300, overlap: 0 });
    for (const c of chunks.slice(0, -1)) expect(c.endsWith('.')).toBe(true);
  });

  it('always terminates, even with no break characters', () => {
    const chunks = splitText('x'.repeat(5000), { chunkSize: 500, overlap: 100 });
    expect(chunks.length).toBeGreaterThanOrEqual(10);
    expect(chunks.join('').length).toBeGreaterThanOrEqual(5000);
  });

  it('rejects invalid configuration', () => {
    expect(() => splitText('abc', { chunkSize: 50, overlap: 10 })).toThrow();
    expect(() => splitText('abc', { chunkSize: 200, overlap: 200 })).toThrow();
  });

  it('never lets a chunk span pages and keeps global chunk indexes', () => {
    const pages = [
      { page: 1, text: sentence.repeat(20) },
      { page: 2, text: '   ' },
      { page: 3, text: 'Mitochondria produce ATP for the cell.' },
    ];
    const chunks = chunkPages(pages, { chunkSize: 300, overlap: 50 });
    expect(new Set(chunks.map((c) => c.page))).toEqual(new Set([1, 3]));
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
    expect(chunks.at(-1)).toMatchObject({ page: 3, text: 'Mitochondria produce ATP for the cell.' });
  });
});
