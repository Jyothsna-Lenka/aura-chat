import { describe, expect, it } from 'vitest';
import { buildHistory } from '../src/services/conversation.service.js';
import { toGeminiContents, classifyGeminiError } from '../src/services/llm/GeminiProvider.js';
import { localTitle } from '../src/services/title.service.js';

const ex = (i: number, status = 'complete') => ({ userPrompt: `q${i}`, aiResponse: `a${i}`, status });

describe('history -> Gemini contents', () => {
  it('keeps only the last 6 exchanges and skips errors', () => {
    const exchanges = [ex(1), ex(2), ex(3, 'error'), ex(4), ex(5), ex(6), ex(7), ex(8)];
    const history = buildHistory(exchanges);
    expect(history).toHaveLength(12);
    expect(history[0]).toEqual({ role: 'user', text: 'q2' });
    expect(history.some((t) => t.text === 'q3')).toBe(false);
  });

  it('maps roles to user/model and appends the new prompt', () => {
    const contents = toGeminiContents(buildHistory([ex(1)]), 'new');
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'q1' }] },
      { role: 'model', parts: [{ text: 'a1' }] },
      { role: 'user', parts: [{ text: 'new' }] },
    ]);
  });

  it('builds history only up to a given index (used by regenerate)', () => {
    expect(buildHistory([ex(1), ex(2)], 1)).toHaveLength(2);
  });
});

describe('error classification', () => {
  it('maps common Gemini errors to codes', () => {
    expect(classifyGeminiError({ status: 429 })).toBe('RATE_LIMITED');
    expect(classifyGeminiError({ message: 'RESOURCE_EXHAUSTED' })).toBe('RATE_LIMITED');
    expect(classifyGeminiError({ status: 503 })).toBe('UNAVAILABLE');
    expect(classifyGeminiError({ status: 401 })).toBe('INVALID_API_KEY');
    expect(classifyGeminiError({ status: 404 })).toBe('MODEL_NOT_FOUND');
    expect(classifyGeminiError({ message: 'fetch failed' })).toBe('NETWORK_ERROR');
  });
});

describe('localTitle', () => {
  it('uses the first six words', () => {
    expect(localTitle('one two three four five six seven')).toBe('one two three four five six');
  });
});
