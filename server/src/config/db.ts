import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { maskMongoUri } from '../utils/mask.js';

export async function connectDB(uri = env.MONGODB_URI): Promise<void> {
  if (!uri) throw new Error('MONGODB_URI is not set in server/.env');
  logger.info({ uri: maskMongoUri(uri) }, 'Connecting to MongoDB');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  logger.info('MongoDB connected');
}

export function dbStatus(): 'connected' | 'connecting' | 'disconnected' {
  const state = mongoose.connection.readyState;
  if (state === 1) return 'connected';
  if (state === 2) return 'connecting';
  return 'disconnected';
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
