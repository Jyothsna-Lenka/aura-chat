import type { Request, Response } from 'express';
import { streamExchange } from '../services/chat.service.js';

export async function sendMessage(req: Request, res: Response) {
  await streamExchange(req, res, { conversationId: String(req.params.id), prompt: req.body.prompt, tone: req.body.tone });
}

/** Regenerate (body: { tone }) or Edit & Resend (body: { tone, prompt }). */
export async function regenerate(req: Request, res: Response) {
  await streamExchange(req, res, {
    conversationId: String(req.params.id),
    replaceExchangeId: String(req.params.exchangeId),
    tone: req.body.tone,
    prompt: req.body.prompt,
  });
}
