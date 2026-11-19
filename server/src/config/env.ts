import 'dotenv/config';
import { z } from 'zod';

// All configuration comes from environment variables (server/.env). Nothing is hard-coded.
const schema = z.object({
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default(''),
  GEMINI_FALLBACK_MODEL: z.string().default(''),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(2048),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  CHAT_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(10),
  NODE_ENV: z.string().default('development'),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
