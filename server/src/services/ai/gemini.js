import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { getAiClient, callAi } from './client.js';

function parseJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new ApiError(502, 'The AI service returned a malformed response. Please try again.');
  }
}

/**
 * Ask Gemini for JSON constrained by a response schema.
 * The caller MUST still validate the result — schema-constrained output is not trusted.
 */
export async function generateJson({ system, prompt, schema, temperature = 0.2 }) {
  const ai = getAiClient();
  const modelsToTry = [
    env.geminiModel,
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError = null;
  for (const model of modelsToTry) {
    try {
      const res = await callAi(() =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: system,
            temperature,
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        })
      );
      const text = res?.text;
      if (!text || !text.trim()) throw new ApiError(502, 'The AI service returned an empty response. Please try again.');
      return parseJson(text);
    } catch (err) {
      lastError = err;
      const status = Number(err?.status ?? err?.code);
      const msg = String(err?.message || '');
      // If the model is experiencing high demand (503), rate-limited (429), times out (504), or transient 502, try backup model
      if (status === 503 || status === 429 || status === 504 || status === 502 || /demand|unavailable|busy|rate|timeout/i.test(msg)) {
        console.warn(`[ai fallback] Model ${model} unavailable (${status}), trying backup model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
