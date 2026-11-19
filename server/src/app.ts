import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { dbStatus } from './config/db.js';
import { conversationsRouter } from './routes/conversations.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { getLLMProvider } from './services/llm/index.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // correct client IPs behind a proxy / load balancer
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    const provider = getLLMProvider();
    res.json({
      status: dbStatus() === 'connected' ? 'ok' : 'degraded',
      db: dbStatus(),
      llm: { provider: provider.name, configured: provider.isConfigured(), model: env.GEMINI_MODEL, fallbackModel: env.GEMINI_FALLBACK_MODEL },
    });
  });

  app.use('/api', apiLimiter);
  app.use('/api/conversations', chatRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
