import { Router } from 'express';
import * as ctrl from '../controllers/chat.controller.js';
import { validate, schemas } from '../middleware/validate.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Streaming (SSE) endpoints. Mounted under /api/conversations.
export const chatRouter = Router();

chatRouter.post(
  '/:id/messages',
  chatLimiter,
  validate(schemas.idParams, 'params'),
  validate(schemas.messageBody),
  asyncHandler(ctrl.sendMessage),
);

chatRouter.post(
  '/:id/exchanges/:exchangeId/regenerate',
  chatLimiter,
  validate(schemas.exchangeParams, 'params'),
  validate(schemas.regenerateBody),
  asyncHandler(ctrl.regenerate),
);
