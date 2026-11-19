import { env } from '../../config/env.js';
import { GeminiProvider } from './GeminiProvider.js';
import type { LLMProvider } from './LLMProvider.js';

// The one place that decides which AI provider the app uses.
// Tests replace it with a mock via setLLMProvider().
let provider: LLMProvider = new GeminiProvider({
  apiKey: env.GEMINI_API_KEY,
  model: env.GEMINI_MODEL,
  fallbackModel: env.GEMINI_FALLBACK_MODEL,
  maxOutputTokens: env.LLM_MAX_TOKENS,
});

export const getLLMProvider = (): LLMProvider => provider;
export const setLLMProvider = (p: LLMProvider): void => {
  provider = p;
};
