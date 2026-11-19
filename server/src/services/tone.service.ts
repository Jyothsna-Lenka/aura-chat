// The "Tone Toggle": each tone becomes a system-instruction modifier sent to the AI.
export const TONES = ['professional', 'casual', 'concise'] as const;
export type Tone = (typeof TONES)[number];

export const BASE_PERSONA =
  'You are Aura, a helpful, knowledgeable and honest AI assistant. ' +
  'Format answers with Markdown when it improves readability (headings, lists, tables, fenced code blocks with a language).';

export const TONE_MODIFIERS: Record<Tone, string> = {
  professional:
    'Respond in a formal, polished, and precise manner. Use clear structure, complete sentences, and industry-appropriate terminology. Avoid slang and emojis.',
  casual:
    'Respond in a friendly, relaxed, conversational tone, like a knowledgeable friend. Contractions and light humor are fine. Keep it warm and approachable.',
  concise:
    'Respond as briefly as possible while remaining accurate and complete. Prefer short sentences or bullet points. No filler, no preamble, no repetition.',
};

/** Final system instruction = base persona + tone modifier. */
export function buildSystemInstruction(tone: Tone): string {
  return `${BASE_PERSONA}\n\nTone: ${TONE_MODIFIERS[tone]}`;
}
