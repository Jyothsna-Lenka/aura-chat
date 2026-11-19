import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Counters are kept in memory per server instance. To run several instances,
// plug in a shared store (e.g. rate-limit-redis) so limits apply across all of them.
const handler = (code: string, message: string) => ({ error: { code, message } });

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: handler('TOO_MANY_REQUESTS', 'Too many requests. Please slow down.'),
});

// 10 chat messages per minute per IP (protects the free Gemini quota).
export const chatLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.CHAT_RATE_LIMIT_PER_MIN,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: handler('RATE_LIMITED', 'You are sending messages too fast. Please wait a minute.'),
});
