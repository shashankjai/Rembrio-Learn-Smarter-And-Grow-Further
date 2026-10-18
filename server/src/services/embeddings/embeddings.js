import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { getAiClient, callAi } from '../ai/client.js';

const BATCH_SIZE = 50; // embedContent accepts up to 100 inputs per request

/** L2-normalise. Gemini only returns unit vectors at the full 3072 dims, so we normalise
 *  explicitly; this makes dot product == cosine similarity for every backend. */
export function normalize(vec) {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  if (!norm) throw new ApiError(502, 'The embedding model returned a zero vector.');
  return vec.map((v) => v / norm);
}

export function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // inputs are unit vectors
}

/**
 * @param {string[]} texts
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'} taskType
 * @returns {Promise<number[][]>} unit-length vectors, one per input, each env.embeddingDimensions long
 */
export async function embedTexts(texts, taskType = 'RETRIEVAL_DOCUMENT') {
  if (!texts.length) return [];
  const ai = getAiClient();
  const vectors = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const res = await callAi(() =>
      ai.models.embedContent({
        model: env.embeddingModel,
        contents: batch,
        config: { taskType, outputDimensionality: env.embeddingDimensions },
      })
    );
    const got = res?.embeddings ?? [];
    if (got.length !== batch.length) {
      throw new ApiError(502, 'The embedding service returned an unexpected number of vectors.');
    }
    for (const e of got) {
      const values = e?.values;
      if (!Array.isArray(values) || values.length !== env.embeddingDimensions) {
        throw new ApiError(
          502,
          `Embedding dimension mismatch: expected ${env.embeddingDimensions}, got ${values?.length ?? 0}. ` +
            'Check EMBEDDING_DIMENSIONS and the vector index definition.'
        );
      }
      vectors.push(normalize(values));
    }
  }
  return vectors;
}

export async function embedQuery(text) {
  const [vec] = await embedTexts([text], 'RETRIEVAL_QUERY');
  return vec;
}
