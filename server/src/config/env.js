import 'dotenv/config';
import path from 'node:path';

const num = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: num(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // AI
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  embeddingModel: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
  // Must match numDimensions in the Atlas vector index definition.
  embeddingDimensions: num(process.env.EMBEDDING_DIMENSIONS, 768),
  aiTimeoutMs: num(process.env.AI_TIMEOUT_MS, 45000),

  // Vector search: "atlas" (MongoDB Atlas $vectorSearch) or "local" (cosine similarity in Node, dev only)
  vectorBackend: (process.env.VECTOR_BACKEND || 'local').toLowerCase(),
  vectorIndexName: process.env.VECTOR_INDEX_NAME || 'rembrio_chunks_vector',

  // Uploads
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 20),

  // RAG tuning
  chunkSize: num(process.env.CHUNK_SIZE, 1000),
  chunkOverlap: num(process.env.CHUNK_OVERLAP, 150),
  topK: num(process.env.RAG_TOP_K, 4),
  minScore: num(process.env.RAG_MIN_SCORE, 0.45),
};

export function assertRequiredEnv() {
  const missing = [];
  if (!env.mongoUri) missing.push('MONGODB_URI');
  if (!env.jwtSecret || env.jwtSecret.length < 16) missing.push('JWT_SECRET (min 16 chars)');
  if (!['atlas', 'local'].includes(env.vectorBackend)) missing.push('VECTOR_BACKEND (atlas|local)');
  if (missing.length) {
    throw new Error(`Missing or invalid environment configuration: ${missing.join(', ')}`);
  }
}

export const aiConfigured = () => Boolean(env.geminiApiKey);
