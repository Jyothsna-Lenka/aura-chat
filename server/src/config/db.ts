import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { maskMongoUri } from '../utils/mask.js';

let memoryServer: { getUri: (db?: string) => string; stop: () => Promise<unknown> } | null = null;

/**
 * Connects to MongoDB (Atlas is the primary database).
 * In development, if Atlas/local Mongo is unreachable (or MONGODB_URI is empty), we fall back to an
 * in-memory MongoDB so the app still runs for demos. Data in that mode is lost on restart.
 */
export async function connectDB(uri = env.MONGODB_URI): Promise<'primary' | 'in-memory'> {
  if (uri) {
    try {
      logger.info({ uri: maskMongoUri(uri) }, 'Connecting to MongoDB');
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      logger.info('MongoDB connected');
      return 'primary';
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
      logger.warn(
        { err: (err as Error).message },
        'Could not connect to MONGODB_URI (check Atlas Network Access). Falling back to an IN-MEMORY MongoDB: data will NOT be saved after restart.',
      );
      await mongoose.disconnect().catch(() => {});
    }
  }
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri('aura-chat'));
  logger.warn('Connected to in-memory MongoDB (development fallback)');
  return 'in-memory';
}

export function dbStatus(): 'connected' | 'connecting' | 'disconnected' {
  const state = mongoose.connection.readyState;
  if (state === 1) return 'connected';
  if (state === 2) return 'connecting';
  return 'disconnected';
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  await memoryServer?.stop();
}
