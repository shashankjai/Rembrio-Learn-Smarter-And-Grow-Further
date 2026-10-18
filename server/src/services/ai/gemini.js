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
  const res = await callAi(() =>
    ai.models.generateContent({
      model: env.geminiModel,
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
}
