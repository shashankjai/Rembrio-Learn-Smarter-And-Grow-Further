import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

let client = null;
const TRANSIENT_RETRY_DELAY_MS = 500;

function upstreamStatus(err) {
  const status = Number(err?.status);
  if (Number.isInteger(status)) return status;
  const code = Number(err?.code);
  return Number.isInteger(code) ? code : 0;
}

function isTemporaryUnavailable(err) {
  return upstreamStatus(err) === 503 || err?.status === 'UNAVAILABLE';
}

export function getAiClient() {
  if (!env.geminiApiKey) {
    throw ApiError.unavailable(
      'The AI service is not configured. Set GEMINI_API_KEY on the server to enable this feature.'
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

/** Translate SDK / network failures into user-safe API errors. */
export function mapAiError(err) {
  if (err instanceof ApiError) return err;
  console.error('[ai error]', err.message || err);
  const status = upstreamStatus(err);
  const msg = String(err?.message || '');
  if (err?.name === 'AiTimeoutError') return new ApiError(504, 'The AI service took too long to respond. Please try again.');
  if (status === 429) return new ApiError(429, 'The AI service is rate-limited right now. Please try again in a moment.');
  if (isTemporaryUnavailable(err)) return new ApiError(503, 'The AI service is busy right now. Please try again shortly.');
  if (status === 401 || status === 403 || /api key/i.test(msg)) {
    return new ApiError(502, 'The AI service rejected the server credentials. Check GEMINI_API_KEY.');
  }
  if (status === 400) return new ApiError(502, 'The AI service could not process this request.');
  if (status === 404) return new ApiError(502, 'The configured AI model was not found. Check GEMINI_MODEL / EMBEDDING_MODEL.');
  return new ApiError(502, 'The AI service is temporarily unavailable. Please try again.');
}

/** Run an AI call with a hard timeout and normalised errors. */
export async function callAi(fn, timeoutMs = env.aiTimeoutMs) {
  for (let attempt = 0; ; attempt += 1) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const e = new Error('AI request timed out');
        e.name = 'AiTimeoutError';
        reject(e);
      }, timeoutMs);
    });

    try {
      return await Promise.race([fn(), timeout]);
    } catch (err) {
      if (attempt === 0 && isTemporaryUnavailable(err)) {
        await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
        continue;
      }
      throw mapAiError(err);
    } finally {
      clearTimeout(timer);
    }
  }
}
