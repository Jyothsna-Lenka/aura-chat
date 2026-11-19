import { getLLMProvider } from './llm/index.js';
import { logger } from '../utils/logger.js';

/** Local fallback: first ~6 words of the prompt. */
export function localTitle(prompt: string): string {
  const words = prompt.replace(/[#*`>_\n\r]+/g, ' ').trim().split(/\s+/).slice(0, 6).join(' ');
  const title = words.length > 60 ? `${words.slice(0, 57)}…` : words;
  return title || 'New Chat';
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/["'`*#]/g, '')
    .replace(/^title:\s*/i, '')
    .split('\n')[0]
    .trim()
    .slice(0, 60);
}

/** Generates a 3–6 word title with the light model. Never throws. */
export async function generateTitle(prompt: string, response: string): Promise<string> {
  try {
    const raw = await getLLMProvider().complete(
      `Write a short title (3 to 6 words, no quotes, no punctuation at the end) for a chat that starts with:\nUser: ${prompt.slice(0, 500)}\nAssistant: ${response.slice(0, 300)}\nTitle:`,
      { maxOutputTokens: 20 },
    );
    const title = cleanTitle(raw);
    const words = title.split(/\s+/).filter(Boolean).length;
    if (title && words >= 2 && words <= 10) return title;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Title generation failed, using local title');
  }
  return localTitle(prompt);
}
