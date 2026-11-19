import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

// Consistent JSON error shape: { error: { code, message, details? } }
export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError('Route not found', 404, 'NOT_FOUND'));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if ((err as { type?: string })?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  logger.error({ err, path: req.path }, 'Unhandled error');
  if (res.headersSent) return res.end();
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server' } });
}
