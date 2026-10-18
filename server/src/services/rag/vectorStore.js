import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { DocumentChunk } from '../../models/DocumentChunk.js';
import { cosine } from '../embeddings/embeddings.js';

const toId = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Atlas Vector Search. The `userId` / `documentId` filters run INSIDE the vector query
 * (they must be declared as `filter` fields in the index), so ownership is enforced
 * before ranking rather than after.
 * Atlas reports cosine similarity as (1 + cos) / 2; we convert back to raw cosine so both
 * backends expose the same score scale.
 */
async function atlasSearch({ userId, documentIds, queryVector, topK }) {
  const rows = await DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: env.vectorIndexName,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(topK * 25, 100),
        limit: topK,
        filter: { userId: toId(userId), documentId: { $in: documentIds.map(toId) } },
      },
    },
    {
      $project: {
        documentId: 1,
        filename: 1,
        page: 1,
        chunkIndex: 1,
        text: 1,
        atlasScore: { $meta: 'vectorSearchScore' },
      },
    },
  ]);
  return rows.map((r) => ({ ...r, score: 2 * r.atlasScore - 1 }));
}

/**
 * Local exact (brute-force) cosine search. Real similarity ranking over real embeddings,
 * but O(n) in the user's chunks — intended for local development on a plain MongoDB
 * instance, not for large corpora. Streams with a cursor and keeps only the top-k.
 */
async function localSearch({ userId, documentIds, queryVector, topK }) {
  const cursor = DocumentChunk.find({ userId: toId(userId), documentId: { $in: documentIds.map(toId) } })
    .select('+embedding documentId filename page chunkIndex text')
    .lean()
    .cursor();

  let best = [];
  for await (const chunk of cursor) {
    const score = cosine(queryVector, chunk.embedding);
    if (best.length < topK || score > best[best.length - 1].score) {
      const { embedding, ...rest } = chunk; // eslint-disable-line no-unused-vars
      best.push({ ...rest, score });
      best.sort((a, b) => b.score - a.score);
      if (best.length > topK) best.pop();
    }
  }
  return best;
}

export async function searchChunks({ userId, documentIds, queryVector, topK = env.topK }) {
  if (!documentIds.length) return [];
  const args = { userId, documentIds, queryVector, topK };
  return env.vectorBackend === 'atlas' ? atlasSearch(args) : localSearch(args);
}
