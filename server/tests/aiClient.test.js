import { afterEach, describe, expect, it, vi } from 'vitest';
import { callAi, mapAiError } from '../src/services/ai/client.js';

describe('AI provider error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries once when the provider reports temporary high demand', async () => {
    const unavailable = Object.assign(
      new Error('The model is experiencing high demand.'),
      { code: 503, status: 'UNAVAILABLE' },
    );
    const request = vi.fn().mockRejectedValueOnce(unavailable).mockResolvedValueOnce('answer');

    await expect(callAi(request)).resolves.toBe('answer');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('returns a clear service-busy error when the retry also fails', async () => {
    const unavailable = Object.assign(new Error('Model overloaded'), { code: 503, status: 'UNAVAILABLE' });
    const request = vi.fn().mockRejectedValue(unavailable);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(callAi(request)).rejects.toMatchObject({
      status: 503,
      message: 'The AI service is busy right now. Please try again shortly.',
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('maps provider overloads to HTTP 503 even without retry handling', () => {
    const unavailable = Object.assign(new Error('Model overloaded'), { code: 503, status: 'UNAVAILABLE' });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(mapAiError(unavailable)).toMatchObject({
      status: 503,
      message: 'The AI service is busy right now. Please try again shortly.',
    });
  });
});
