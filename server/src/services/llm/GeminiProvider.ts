import { GoogleGenAI, type Content } from '@google/genai';
import { LLMError, type LLMErrorCode, type LLMProvider, type StreamRequest, type StreamResult } from './LLMProvider.js';
import { logger } from '../../utils/logger.js';

interface GeminiOptions {
  apiKey: string;
  model: string;
  fallbackModel: string;
  maxOutputTokens: number;
}

export const BLOCKED_MESSAGE =
  "I'm sorry, I couldn't generate a response to that. It may have been blocked by safety filters. Please try rephrasing your message.";

/** Maps an SDK/HTTP error to one of our error codes. */
export function classifyGeminiError(err: unknown): LLMErrorCode {
  const e = err as { status?: number; name?: string; message?: string };
  const msg = String(e?.message ?? '');
  if (e?.name === 'AbortError' || /abort/i.test(msg)) return 'ABORTED';
  if (e?.status === 429 || /RESOURCE_EXHAUSTED|quota|429/i.test(msg)) return 'RATE_LIMITED';
  if (e?.status === 503 || /UNAVAILABLE|high demand|overloaded|503/i.test(msg)) return 'UNAVAILABLE';
  if (e?.status === 401 || e?.status === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/i.test(msg))
    return 'INVALID_API_KEY';
  if (e?.status === 404 || /not found|NOT_FOUND/i.test(msg)) return 'MODEL_NOT_FOUND';
  if (/fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|network/i.test(msg)) return 'NETWORK_ERROR';
  return 'UNKNOWN';
}

/** Gemini uses roles "user" and "model". */
export function toGeminiContents(history: StreamRequest['history'], prompt: string): Content[] {
  return [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: 'user', parts: [{ text: prompt }] },
  ];
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private ai: GoogleGenAI | null;

  constructor(private opts: GeminiOptions) {
    this.ai = opts.apiKey ? new GoogleGenAI({ apiKey: opts.apiKey }) : null;
  }

  isConfigured(): boolean {
    return Boolean(this.ai && this.opts.model);
  }

  get model(): string {
    return this.opts.model;
  }

  private client(): GoogleGenAI {
    if (!this.ai) throw new LLMError('INVALID_API_KEY', 'GEMINI_API_KEY is not configured on the server.');
    return this.ai;
  }

  async stream(req: StreamRequest, onToken: (text: string) => void): Promise<StreamResult> {
    try {
      return await this.streamWithModel(this.opts.model, req, onToken, false);
    } catch (err) {
      // Free-tier safeguard: on 429 (quota) or 503 (model overloaded), retry once with the
      // lighter fallback model (only if nothing was streamed yet, so answers are never mixed).
      const retryable = err instanceof LLMError && (err.code === 'RATE_LIMITED' || err.code === 'UNAVAILABLE');
      if (retryable && this.opts.fallbackModel && !req.signal?.aborted) {
        logger.warn({ model: this.opts.model, fallback: this.opts.fallbackModel }, 'Rate limited, retrying with fallback model');
        return this.streamWithModel(this.opts.fallbackModel, req, onToken, true);
      }
      throw err;
    }
  }

  private async streamWithModel(
    model: string,
    req: StreamRequest,
    onToken: (text: string) => void,
    isFallback: boolean,
  ): Promise<StreamResult> {
    let sentAny = false;
    const usage = { inputTokens: 0, outputTokens: 0 };
    let finishReason: string | undefined;
    try {
      const stream = await this.client().models.generateContentStream({
        model,
        contents: toGeminiContents(req.history, req.prompt),
        config: {
          systemInstruction: req.systemInstruction,
          maxOutputTokens: req.maxOutputTokens ?? this.opts.maxOutputTokens,
          temperature: 0.7,
          abortSignal: req.signal,
        },
      });
      for await (const chunk of stream) {
        if (req.signal?.aborted) break;
        const text = chunk.text;
        if (text) {
          sentAny = true;
          onToken(text);
        }
        if (chunk.usageMetadata) {
          usage.inputTokens = chunk.usageMetadata.promptTokenCount ?? usage.inputTokens;
          usage.outputTokens = chunk.usageMetadata.candidatesTokenCount ?? usage.outputTokens;
        }
        const reason = chunk.candidates?.[0]?.finishReason;
        if (reason) finishReason = String(reason);
      }
    } catch (err) {
      if (req.signal?.aborted) throw new LLMError('ABORTED', 'Generation stopped', err);
      const code = classifyGeminiError(err);
      // If tokens were already shown, a retry would duplicate text, so don't mark as retryable.
      if ((code === 'RATE_LIMITED' || code === 'UNAVAILABLE') && sentAny) throw new LLMError('UNKNOWN', 'The response was interrupted.', err);
      throw new LLMError(code, (err as Error)?.message ?? 'Gemini request failed', err);
    }

    // Blocked or empty answers (safety filters etc.): show a friendly message instead of an empty bubble.
    if (!sentAny && !req.signal?.aborted) {
      onToken(BLOCKED_MESSAGE);
    }
    if (isFallback) logger.info({ model }, 'Answered with fallback model');
    return { model, usage, finishReason };
  }

  async complete(prompt: string, opts: { maxOutputTokens?: number } = {}): Promise<string> {
    const model = this.opts.fallbackModel || this.opts.model;
    const res = await this.client().models.generateContent({
      model,
      contents: prompt,
      config: { maxOutputTokens: opts.maxOutputTokens ?? 30, temperature: 0.3 },
    });
    return res.text ?? '';
  }

  /** Lists model names available to this key (used to diagnose MODEL_NOT_FOUND). */
  async listModels(): Promise<string[]> {
    const names: string[] = [];
    const pager = await this.client().models.list();
    for await (const m of pager) if (m.name) names.push(m.name.replace(/^models\//, ''));
    return names;
  }
}
