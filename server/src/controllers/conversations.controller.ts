import type { Request, Response } from 'express';
import * as service from '../services/conversation.service.js';

// Controllers translate HTTP <-> service calls. Business logic lives in services.
export async function list(req: Request, res: Response) {
  const { q } = ((req as Request & { validatedQuery?: { q?: string } }).validatedQuery ?? {}) as { q?: string };
  res.json(await service.listConversations(q || undefined));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await service.createConversation(req.body?.title));
}

export async function getOne(req: Request, res: Response) {
  res.json(await service.getConversation(String(req.params.id)));
}

export async function rename(req: Request, res: Response) {
  res.json(await service.renameConversation(String(req.params.id), req.body.title));
}

export async function remove(req: Request, res: Response) {
  await service.deleteConversation(String(req.params.id));
  res.status(204).end();
}
