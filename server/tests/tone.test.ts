import { describe, expect, it } from 'vitest';
import { buildSystemInstruction, BASE_PERSONA, TONE_MODIFIERS, TONES } from '../src/services/tone.service.js';

describe('tone.service', () => {
  it('combines the base persona with the tone modifier', () => {
    for (const tone of TONES) {
      const s = buildSystemInstruction(tone);
      expect(s).toContain(BASE_PERSONA);
      expect(s).toContain(TONE_MODIFIERS[tone]);
    }
  });
  it('produces a different instruction for each tone', () => {
    expect(new Set(TONES.map(buildSystemInstruction)).size).toBe(3);
  });
});
