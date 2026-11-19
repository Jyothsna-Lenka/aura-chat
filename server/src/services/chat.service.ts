import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { buildSystemInstruction, type Tone } from './tone.service.js';
import { getLLMProvider } from './llm/index.js';
import { LLMError, type LLMErrorCode } from './llm/LLMProvider.js';
import * as conversations from './conversation.service.js';
import { generateTitle } from './title.service.js';
import { AppError } from '../utils/AppError.js';
import { openSSE, sendSSE } from '../utils/sse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const ERROR_MESSAGES: Record<LLMErrorCode, string> = {
  RATE_LIMITED: 'Free quota reached — please try again in a minute.',
  UNAVAILABLE: 'Gemini is busy right now (high demand). Please try again in a moment.',
  INVALID_API_KEY: 'The Gemini API key is missing or invalid. Check GEMINI_API_KEY in server/.env.',
  MODEL_NOT_FOUND: 'The configured Gemini model was not found. Check GEMINI_MODEL in server/.env.',
  NETWORK_ERROR: 'Could not reach the Gemini API. Check your internet connection and try again.',
  ABORTED: 'Generation stopped.',
  UNKNOWN: 'Something went wrong while generating the response. Please try again.',
};

interface StreamOptions {
  conversationId: string;
  prompt?: string; // new prompt (send / edit). Omitted for plain regenerate.
  tone: Tone;
  replaceExchangeId?: string; // set for regenerate / edit & resend
}

/**
 * The core message flow:
 * 1. load conversation + build history  2. build system instruction from tone
 * 3. stream Gemini tokens as SSE         4. abort if the client disconnects (Stop)
 * 5. save the exchange (prompt, response, tone, timestamp, model, usage, latency)
 * 6. auto-title the thread after its first exchange
 */
export async function streamExchange(req: Request, res: Response, opts: StreamOptions): Promise<void> {
  const conversation = await conversations.getConversationDoc(opts.conversationId);

  let exchangeId: Types.ObjectId;
  let prompt: string;
  let historyUpto = conversation.exchanges.length;
  const replace = Boolean(opts.replaceExchangeId);

  if (opts.replaceExchangeId) {
    const index = conversation.exchanges.findIndex((e) => String(e._id) === opts.replaceExchangeId);
    if (index === -1) throw new AppError('Message not found', 404, 'NOT_FOUND');
    // Business rule: only the latest exchange can be regenerated or edited.
    if (index !== conversation.exchanges.length - 1) {
      throw new AppError('Only the latest message can be regenerated or edited', 400, 'NOT_LATEST');
    }
    exchangeId = conversation.exchanges[index]._id;
    prompt = opts.prompt ?? conversation.exchanges[index].userPrompt;
    historyUpto = index;
  } else {
    if (!opts.prompt) throw new AppError('Message cannot be empty', 400, 'VALIDATION_ERROR');
    exchangeId = new Types.ObjectId();
    prompt = opts.prompt;
  }

  const provider = getLLMProvider();
  const history = conversations.buildHistory(conversation.exchanges, historyUpto);
  const systemInstruction = buildSystemInstruction(opts.tone);

  openSSE(res);
  sendSSE(res, 'start', { exchangeId: String(exchangeId), conversationId: String(conversation._id), prompt });

  // "Stop": the browser aborts the fetch -> the socket closes -> we abort the Gemini stream.
  const abort = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abort.abort();
  });

  const started = Date.now();
  let aiResponse = '';
  let status: 'complete' | 'stopped' | 'error' = 'complete';
  let model = (provider as { model?: string }).model ?? provider.name;
  let usage = { inputTokens: 0, outputTokens: 0 };
  let errorCode: LLMErrorCode | null = null;

  try {
    if (!provider.isConfigured()) throw new LLMError('INVALID_API_KEY', 'Gemini is not configured');
    const result = await provider.stream(
      { systemInstruction, history, prompt, signal: abort.signal, maxOutputTokens: env.LLM_MAX_TOKENS },
      (text) => {
        aiResponse += text;
        sendSSE(res, 'token', { text });
      },
    );
    model = result.model;
    usage = result.usage;
    if (abort.signal.aborted) status = 'stopped';
  } catch (err) {
    if (abort.signal.aborted || (err instanceof LLMError && err.code === 'ABORTED')) {
      status = 'stopped';
    } else {
      status = 'error';
      errorCode = err instanceof LLMError ? err.code : 'UNKNOWN';
      logger.error({ err: (err as Error)?.message, code: errorCode }, 'LLM request failed');
    }
  }

  const latencyMs = Date.now() - started;
  const exchange: conversations.ExchangeData = {
    _id: exchangeId,
    userPrompt: prompt,
    aiResponse,
    tone: opts.tone,
    timestamp: new Date(),
    model,
    status,
    usage,
    latencyMs,
  };

  try {
    await conversations.saveExchange(conversation._id, exchange, replace);
  } catch (err) {
    logger.error({ err }, 'Failed to save exchange');
  }

  if (status === 'error' && errorCode) {
    sendSSE(res, 'error', { code: errorCode, message: ERROR_MESSAGES[errorCode], exchangeId: String(exchangeId) });
  } else {
    sendSSE(res, 'done', {
      exchangeId: String(exchangeId),
      status,
      model,
      usage,
      latencyMs,
      timestamp: exchange.timestamp,
    });
  }

  // Extra Feature 1: smart auto-title after the first successful exchange. Never breaks the chat.
  if (status === 'complete' && conversation.title === conversations.DEFAULT_TITLE && historyUpto === 0) {
    const title = await generateTitle(prompt, aiResponse);
    try {
      if (await conversations.setAutoTitle(conversation._id, title)) sendSSE(res, 'title', { title });
    } catch (err) {
      logger.warn({ err }, 'Failed to save title');
    }
  }

  if (!res.writableEnded) res.end();
}
