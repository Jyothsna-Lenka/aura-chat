import pino from 'pino';
import { env } from '../config/env.js';

// Structured JSON logs in production, pretty logs in development.
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  transport: env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty', options: { colorize: true } },
});
