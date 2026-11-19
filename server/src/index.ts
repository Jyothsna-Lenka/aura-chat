import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { maskSecret } from './utils/mask.js';

async function main() {
  if (!env.GEMINI_API_KEY) logger.warn('GEMINI_API_KEY is missing: chat will return INVALID_API_KEY, other routes still work.');
  else logger.info({ key: maskSecret(env.GEMINI_API_KEY), model: env.GEMINI_MODEL, fallback: env.GEMINI_FALLBACK_MODEL }, 'Gemini configured');

  try {
    await connectDB();
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'MongoDB connection failed. Check MONGODB_URI and Atlas Network Access (IP allowlist).');
    process.exit(1);
  }

  const server = createApp().listen(env.PORT, () => logger.info(`Server listening on http://localhost:${env.PORT}`));

  // Graceful shutdown: stop accepting connections, then close MongoDB.
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
