import { env } from '../../config/env.js';
import { Document } from '../../models/Document.js';
import { DocumentChunk } from '../../models/DocumentChunk.js';
import { ApiError } from '../../utils/ApiError.js';
import { embedQuery } from '../embeddings/embeddings.js';
import { searchChunks } from './vectorStore.js';

/**
 * Resolve which documents this user may query. Only the owner's READY documents qualify;
 * requested ids that are not theirs are silently dropped (never revealed as existing).
 */
export async function resolveAuthorizedDocuments(userId, requestedIds) {
  const filter = { userId, status: 'ready' };
  if (requestedIds?.length) filter._id = { $in: requestedIds };
  const docs = await Document.find(filter).select('_id originalName');
  if (!docs.length) {
    throw ApiError.badRequest(
      requestedIds?.length
        ? 'The selected documents are unavailable or still processing.'
        : 'You have no processed documents yet. Upload a PDF first.'
    );
  }
  return docs;
}

/** Semantic retrieval: embed the question, vector-search the authorised chunks, drop weak matches. */
export async function retrieve({ userId, question, documentIds, topK = env.topK, minScore = env.minScore }) {
  const queryVector = await embedQuery(question);
  const hits = await searchChunks({ userId, documentIds, queryVector, topK });
  return hits.filter((h) => h.score >= minScore);
}

/**
 * Evenly spaced chunks across the chosen documents (document order preserved).
 * Used when there is no topic to search for, e.g. a whole-document quiz or plan.
 */
export async function sampleChunks({ userId, documentIds, count }) {
  const ids = await DocumentChunk.find({ userId, documentId: { $in: documentIds } })
    .select('_id')
    .sort({ documentId: 1, chunkIndex: 1 })
    .lean();
  if (!ids.length) return [];
  const picked = [];
  const n = Math.min(count, ids.length);
  for (let i = 0; i < n; i++) picked.push(ids[Math.floor((i * ids.length) / n)]._id);
  const rows = await DocumentChunk.find({ _id: { $in: picked } })
    .select('documentId filename page chunkIndex text')
    .sort({ documentId: 1, chunkIndex: 1 })
    .lean();
  return rows;
}
