import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { fakeEmbedding } from './helpers/fakeAi.js';

const aggregate = vi.fn();
const find = vi.fn();
vi.mock('../src/models/DocumentChunk.js', () => ({ DocumentChunk: { aggregate, find } }));

const { env } = await import('../src/config/env.js');
const { searchChunks } = await import('../src/services/rag/vectorStore.js');

const userId = new mongoose.Types.ObjectId().toString();
const docA = new mongoose.Types.ObjectId().toString();

const asyncCursor = (rows) => ({
  select: () => ({ lean: () => ({ cursor: () => (async function* () { yield* rows; })() }) }),
});

beforeEach(() => {
  aggregate.mockReset();
  find.mockReset();
});

describe('vector store — local exact search', () => {
  it('ranks by cosine similarity, keeps top-k, scopes the query to the user and documents', async () => {
    const rows = [
      { _id: 1, documentId: docA, filename: 'a.pdf', page: 1, text: 'photosynthesis chlorophyll light', embedding: fakeEmbedding('photosynthesis chlorophyll light') },
      { _id: 2, documentId: docA, filename: 'a.pdf', page: 2, text: 'medieval castle siege warfare', embedding: fakeEmbedding('medieval castle siege warfare') },
      { _id: 3, documentId: docA, filename: 'a.pdf', page: 3, text: 'chlorophyll absorbs light energy', embedding: fakeEmbedding('chlorophyll absorbs light energy') },
    ];
    find.mockReturnValue(asyncCursor(rows));

    // The fake embedding is word-based (no stemming), so use the exact word "absorbs".
    const queryVector = fakeEmbedding('how does chlorophyll absorbs light');
    const hits = await searchChunks({ userId, documentIds: [docA], queryVector, topK: 2 });

    expect(hits.map((h) => h._id)).toEqual([3, 1]);
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
    expect(hits[0]).not.toHaveProperty('embedding'); // vectors are never returned
    const filter = find.mock.calls[0][0];
    expect(String(filter.userId)).toBe(userId);
    expect(filter.documentId.$in.map(String)).toEqual([docA]);
  });

  it('returns nothing for an empty authorised-document list without querying', async () => {
    expect(await searchChunks({ userId, documentIds: [], queryVector: fakeEmbedding('x') })).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });
});

describe('vector store — Atlas $vectorSearch', () => {
  it('builds a $vectorSearch stage with in-query ownership filters and converts scores to cosine', async () => {
    env.vectorBackend = 'atlas';
    try {
      aggregate.mockResolvedValue([{ _id: 1, text: 't', page: 2, filename: 'a.pdf', atlasScore: 0.9 }]);
      const queryVector = fakeEmbedding('anything');
      const hits = await searchChunks({ userId, documentIds: [docA], queryVector, topK: 4 });

      const pipeline = aggregate.mock.calls[0][0];
      const stage = pipeline[0].$vectorSearch;
      expect(stage.index).toBe(env.vectorIndexName);
      expect(stage.path).toBe('embedding');
      expect(stage.limit).toBe(4);
      expect(stage.numCandidates).toBeGreaterThanOrEqual(100);
      expect(stage.queryVector).toHaveLength(768);
      expect(String(stage.filter.userId)).toBe(userId);
      expect(stage.filter.documentId.$in.map(String)).toEqual([docA]);
      // Atlas cosine score = (1 + cos) / 2  =>  cos = 2 * score - 1
      expect(hits[0].score).toBeCloseTo(0.8);
    } finally {
      env.vectorBackend = 'local';
    }
  });
});
