import { describe, it, expect, vi, beforeEach } from 'vitest';

const retrieve = vi.fn();
const generateJson = vi.fn();
vi.mock('../src/services/rag/retriever.js', () => ({ retrieve }));
vi.mock('../src/services/ai/gemini.js', () => ({ generateJson }));

const { answerQuestion, buildCitations, buildPrompt, toExcerpt, INSUFFICIENT_MESSAGE } = await import(
  '../src/services/rag/answer.js'
);

const hits = [
  { documentId: 'd1', filename: 'bio.pdf', page: 3, text: 'Mitochondria generate ATP through oxidative phosphorylation.', score: 0.83 },
  { documentId: 'd1', filename: 'bio.pdf', page: 7, text: 'Ribosomes synthesise proteins from mRNA templates.', score: 0.61 },
  { documentId: 'd2', filename: 'chem.pdf', page: 1, text: 'Covalent bonds share electron pairs.', score: 0.52 },
];

beforeEach(() => {
  retrieve.mockReset();
  generateJson.mockReset();
});

describe('RAG answer + citations', () => {
  it('returns insufficient evidence WITHOUT calling Gemini when nothing relevant is retrieved', async () => {
    retrieve.mockResolvedValue([]);
    const res = await answerQuestion({ userId: 'u', question: 'q', documentIds: ['d1'] });
    expect(res).toEqual({ answer: INSUFFICIENT_MESSAGE, sufficient: false, citations: [] });
    expect(generateJson).not.toHaveBeenCalled();
  });

  it('builds citations from retrieved chunks only (filename/page/excerpt come from the database)', async () => {
    retrieve.mockResolvedValue(hits);
    generateJson.mockResolvedValue({
      sufficient: true,
      answer: 'Mitochondria make ATP.',
      usedSources: [1],
    });
    const res = await answerQuestion({ userId: 'u', question: 'What makes ATP?', documentIds: ['d1'] });
    expect(res.sufficient).toBe(true);
    expect(res.citations).toEqual([
      {
        documentId: 'd1',
        filename: 'bio.pdf',
        page: 3,
        excerpt: 'Mitochondria generate ATP through oxidative phosphorylation.',
        score: 0.83,
      },
    ]);
  });

  it('drops invented, duplicate and out-of-range source numbers', () => {
    const c = buildCitations(hits, [2, 2, 99, 0, -1, 1.5, 'x', 3]);
    expect(c.map((x) => x.page)).toEqual([7, 1]);
  });

  it('treats a "sufficient" answer with no valid citation as insufficient (no fabricated grounding)', async () => {
    retrieve.mockResolvedValue(hits);
    generateJson.mockResolvedValue({ sufficient: true, answer: 'Confident but uncited.', usedSources: [42] });
    const res = await answerQuestion({ userId: 'u', question: 'q', documentIds: ['d1'] });
    expect(res).toEqual({ answer: INSUFFICIENT_MESSAGE, sufficient: false, citations: [] });
  });

  it('honours the model saying the material is insufficient', async () => {
    retrieve.mockResolvedValue(hits);
    generateJson.mockResolvedValue({ sufficient: false, answer: 'Not covered.', usedSources: [1] });
    const res = await answerQuestion({ userId: 'u', question: 'q', documentIds: ['d1'] });
    expect(res.sufficient).toBe(false);
    expect(res.citations).toEqual([]);
  });

  it('handles an empty answer string as insufficient', async () => {
    retrieve.mockResolvedValue(hits);
    generateJson.mockResolvedValue({ sufficient: true, answer: '   ', usedSources: [1] });
    expect((await answerQuestion({ userId: 'u', question: 'q', documentIds: [] })).sufficient).toBe(false);
  });

  it('propagates AI errors (rate limit, timeout) to the caller', async () => {
    retrieve.mockResolvedValue(hits);
    generateJson.mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }));
    await expect(answerQuestion({ userId: 'u', question: 'q', documentIds: [] })).rejects.toMatchObject({ status: 429 });
  });

  it('numbers sources in the prompt and includes file + page', () => {
    const prompt = buildPrompt('Why?', hits.slice(0, 2));
    expect(prompt).toContain('[1] (bio.pdf, page 3)');
    expect(prompt).toContain('[2] (bio.pdf, page 7)');
    expect(prompt).toContain('STUDENT QUESTION:\nWhy?');
  });

  it('truncates long excerpts', () => {
    const long = 'word '.repeat(300);
    const ex = toExcerpt(long);
    expect(ex.length).toBeLessThanOrEqual(401);
    expect(ex.endsWith('…')).toBe(true);
  });
});
