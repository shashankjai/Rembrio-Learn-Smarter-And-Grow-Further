import { describe, it, expect, vi, beforeEach } from 'vitest';

const embedContent = vi.fn();
vi.mock('../src/services/ai/client.js', () => ({
  getAiClient: () => ({ models: { embedContent } }),
  callAi: (fn) => fn(),
}));

const { embedTexts, embedQuery, normalize, cosine } = await import('../src/services/embeddings/embeddings.js');

const vec = (n, fill = 1) => Array.from({ length: n }, (_, i) => fill + (i % 3));

// Braces matter: returning the mock from beforeEach would make Vitest call it as a cleanup hook.
beforeEach(() => {
  embedContent.mockReset();
});

describe('embeddings', () => {
  it('normalizes to unit length and cosine of identical vectors is 1', () => {
    const v = normalize([3, 4]);
    expect(Math.hypot(...v)).toBeCloseTo(1);
    expect(cosine(v, v)).toBeCloseTo(1);
  });

  it('rejects a zero vector', () => {
    expect(() => normalize([0, 0, 0])).toThrow();
  });

  it('batches requests, passes task type and dimensionality, returns unit vectors', async () => {
    embedContent.mockImplementation(async ({ contents }) => ({
      embeddings: contents.map(() => ({ values: vec(768) })),
    }));
    const texts = Array.from({ length: 120 }, (_, i) => `chunk ${i}`);
    const out = await embedTexts(texts, 'RETRIEVAL_DOCUMENT');

    expect(out).toHaveLength(120);
    expect(embedContent).toHaveBeenCalledTimes(3); // 50 + 50 + 20
    expect(embedContent.mock.calls[0][0].config).toMatchObject({
      taskType: 'RETRIEVAL_DOCUMENT',
      outputDimensionality: 768,
    });
    expect(Math.hypot(...out[0])).toBeCloseTo(1);
  });

  it('uses the query task type for questions', async () => {
    embedContent.mockResolvedValue({ embeddings: [{ values: vec(768) }] });
    await embedQuery('what is ATP?');
    expect(embedContent.mock.calls[0][0].config.taskType).toBe('RETRIEVAL_QUERY');
  });

  it('fails loudly on a dimension mismatch', async () => {
    embedContent.mockResolvedValue({ embeddings: [{ values: vec(3072) }] });
    await expect(embedTexts(['x'])).rejects.toThrow(/dimension mismatch/i);
  });

  it('fails when the vector count does not match the input count', async () => {
    embedContent.mockResolvedValue({ embeddings: [] });
    await expect(embedTexts(['x'])).rejects.toThrow(/unexpected number/i);
  });
});
