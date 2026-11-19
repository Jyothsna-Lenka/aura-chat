import type { NextFunction, Request, Response } from 'express';
import { z, type ZodTypeAny } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { TONES } from '../services/tone.service.js';

export const MAX_PROMPT_LENGTH = 8000;

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');
const tone = z.enum(TONES, { message: 'Tone must be professional, casual or concise' });

// ---- Request schemas (all validation lives on the server) ----
export const schemas = {
  idParams: z.object({ id: objectId }),
  exchangeParams: z.object({ id: objectId, exchangeId: objectId }),
  listQuery: z.object({ q: z.string().trim().max(200).optional() }),
  createBody: z.object({ title: z.string().trim().min(1).max(120).optional() }).default({}),
  renameBody: z.object({ title: z.string().trim().min(1, 'Title cannot be empty').max(120, 'Title is too long') }),
  messageBody: z.object({
    prompt: z
      .string({ message: 'Prompt is required' })
      .trim()
      .min(1, 'Message cannot be empty')
      .max(MAX_PROMPT_LENGTH, `Message is too long (max ${MAX_PROMPT_LENGTH} characters)`),
    tone,
  }),
  regenerateBody: z.object({
    tone,
    // Present only for "Edit & Resend": replaces the user's prompt before regenerating.
    prompt: z.string().trim().min(1, 'Message cannot be empty').max(MAX_PROMPT_LENGTH).optional(),
  }),
};

type Part = 'body' | 'params' | 'query';

/** Validates req[part] with a Zod schema and replaces it with the parsed (clean) value. */
export const validate =
  (schema: ZodTypeAny, part: Part = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part] ?? {});
    if (!result.success) {
      const first = result.error.issues[0];
      return next(new AppError(first?.message ?? 'Invalid request', 400, 'VALIDATION_ERROR', result.error.flatten()));
    }
    if (part === 'query') {
      // req.query is a getter in Express 5; store parsed query separately.
      (req as Request & { validatedQuery?: unknown }).validatedQuery = result.data;
    } else {
      (req as unknown as Record<Part, unknown>)[part] = result.data;
    }
    next();
  };
