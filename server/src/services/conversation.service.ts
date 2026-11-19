import { Types } from 'mongoose';
import { ConversationModel, type ConversationDoc } from '../models/Conversation.js';
import { AppError } from '../utils/AppError.js';
import type { Tone } from './tone.service.js';
import type { ChatTurn } from './llm/LLMProvider.js';

export const DEFAULT_TITLE = 'New Chat';
export const HISTORY_EXCHANGES = 6;

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: Date;
  createdAt: Date;
  preview: string;
  snippet?: string;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Picks ~120 characters of text around the first search term found. */
export function makeSnippet(texts: string[], q: string): string | undefined {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const term of terms) {
      const i = lower.indexOf(term);
      if (i >= 0) {
        const start = Math.max(0, i - 40);
        const end = Math.min(text.length, i + term.length + 80);
        return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ')}${end < text.length ? '…' : ''}`;
      }
    }
  }
  return undefined;
}

export async function listConversations(q?: string): Promise<ConversationSummary[]> {
  if (!q) {
    // Only fetch the last exchange for the preview, not the whole thread.
    const docs = await ConversationModel.find({}, { title: 1, createdAt: 1, updatedAt: 1, exchanges: { $slice: -1 } })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean<{ _id: unknown; title: string; createdAt: Date; updatedAt: Date; exchanges: { userPrompt: string }[] }[]>();
    return docs.map((d) => ({
      id: String(d._id),
      title: d.title,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      preview: d.exchanges[0]?.userPrompt.slice(0, 80) ?? '',
    }));
  }

  // Full-text search using the text index; fall back to a prefix/regex match for partial words.
  let docs = await ConversationModel.find({ $text: { $search: q } }, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(30)
    .lean();
  if (docs.length === 0) {
    const rx = new RegExp(escapeRegex(q), 'i');
    docs = await ConversationModel.find({
      $or: [{ title: rx }, { 'exchanges.userPrompt': rx }, { 'exchanges.aiResponse': rx }],
    })
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean();
  }
  return docs.map((d) => ({
    id: String(d._id),
    title: d.title,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    preview: d.exchanges[d.exchanges.length - 1]?.userPrompt.slice(0, 80) ?? '',
    snippet: makeSnippet([d.title, ...d.exchanges.flatMap((e) => [e.userPrompt, e.aiResponse])], q),
  }));
}

export async function createConversation(title?: string) {
  const doc = await ConversationModel.create({ title: title || DEFAULT_TITLE });
  return serialize(doc);
}

export async function getConversationDoc(id: string): Promise<ConversationDoc> {
  const doc = await ConversationModel.findById(id);
  if (!doc) throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  return doc;
}

export async function getConversation(id: string) {
  return serialize(await getConversationDoc(id));
}

export async function renameConversation(id: string, title: string) {
  const doc = await ConversationModel.findByIdAndUpdate(id, { title }, { returnDocument: 'after' });
  if (!doc) throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  return serialize(doc);
}

export async function deleteConversation(id: string) {
  const doc = await ConversationModel.findByIdAndDelete(id);
  if (!doc) throw new AppError('Conversation not found', 404, 'NOT_FOUND');
}

/**
 * Converts the last N successful exchanges (before `uptoIndex`) into chat turns for the AI.
 * Exchanges with status "error" are skipped.
 */
export function buildHistory(
  exchanges: { userPrompt: string; aiResponse: string; status: string }[],
  uptoIndex = exchanges.length,
  limit = HISTORY_EXCHANGES,
): ChatTurn[] {
  return exchanges
    .slice(0, uptoIndex)
    .filter((e) => e.status !== 'error' && e.aiResponse)
    .slice(-limit)
    .flatMap((e) => [
      { role: 'user' as const, text: e.userPrompt },
      { role: 'model' as const, text: e.aiResponse },
    ]);
}

export interface ExchangeData {
  _id: Types.ObjectId;
  userPrompt: string;
  aiResponse: string;
  tone: Tone;
  timestamp: Date;
  model: string;
  status: 'complete' | 'stopped' | 'error';
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

/** Saves a new exchange, or replaces an existing one (regenerate / edit), atomically. */
export async function saveExchange(conversationId: Types.ObjectId, exchange: ExchangeData, replace: boolean) {
  if (replace) {
    await ConversationModel.updateOne(
      { _id: conversationId, 'exchanges._id': exchange._id },
      { $set: { 'exchanges.$': exchange } },
    );
  } else {
    await ConversationModel.updateOne({ _id: conversationId }, { $push: { exchanges: exchange } });
  }
}

/** Sets the title only if it still has the default (so a user rename is never overwritten). */
export async function setAutoTitle(conversationId: Types.ObjectId, title: string): Promise<boolean> {
  const res = await ConversationModel.updateOne({ _id: conversationId, title: DEFAULT_TITLE }, { $set: { title } });
  return res.modifiedCount > 0;
}

export function serialize(doc: ConversationDoc) {
  return {
    id: String(doc._id),
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    exchanges: doc.exchanges.map((e) => ({
      id: String(e._id),
      userPrompt: e.userPrompt,
      aiResponse: e.aiResponse,
      tone: e.tone,
      timestamp: e.timestamp,
      model: e.model,
      status: e.status,
      usage: { inputTokens: e.usage?.inputTokens ?? 0, outputTokens: e.usage?.outputTokens ?? 0 },
      latencyMs: e.latencyMs,
    })),
  };
}
