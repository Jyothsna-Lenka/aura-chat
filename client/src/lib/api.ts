import type { Conversation, ConversationSummary, StreamHandlers, Tone } from '../types';
import { readSSE } from './sse';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code = 'UNKNOWN',
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is it running?', 0, 'NETWORK_ERROR');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body?.error?.message || `Request failed (${res.status})`, res.status, body?.error?.code);
  return body as T;
}

export const api = {
  listConversations: (q?: string) =>
    request<ConversationSummary[]>(`/conversations${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getConversation: (id: string) => request<Conversation>(`/conversations/${id}`),
  createConversation: () => request<Conversation>('/conversations', { method: 'POST', body: '{}' }),
  renameConversation: (id: string, title: string) =>
    request<Conversation>(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  deleteConversation: (id: string) => request<void>(`/conversations/${id}`, { method: 'DELETE' }),
};

/** POSTs and reads the SSE response. Throws ApiError for non-stream (e.g. validation) errors. */
export async function streamRequest(
  path: string,
  body: { prompt?: string; tone: Tone },
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    throw new ApiError('Cannot reach the server. Is it running?', 0, 'NETWORK_ERROR');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data?.error?.message || `Request failed (${res.status})`, res.status, data?.error?.code);
  }
  try {
    await readSSE(res, handlers);
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    throw err;
  }
}

export const sendMessage = (conversationId: string, prompt: string, tone: Tone, h: StreamHandlers, signal: AbortSignal) =>
  streamRequest(`/conversations/${conversationId}/messages`, { prompt, tone }, h, signal);

export const regenerate = (
  conversationId: string,
  exchangeId: string,
  tone: Tone,
  h: StreamHandlers,
  signal: AbortSignal,
  prompt?: string,
) => streamRequest(`/conversations/${conversationId}/exchanges/${exchangeId}/regenerate`, { tone, prompt }, h, signal);
