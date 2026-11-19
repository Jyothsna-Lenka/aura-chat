export type Tone = 'professional' | 'casual' | 'concise';
export type ExchangeStatus = 'complete' | 'stopped' | 'error';

export interface Exchange {
  id: string;
  userPrompt: string;
  aiResponse: string;
  tone: Tone;
  timestamp: string;
  model: string;
  status: ExchangeStatus;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  exchanges: Exchange[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  preview: string;
  snippet?: string;
}

export type StreamErrorCode =
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'INVALID_API_KEY'
  | 'MODEL_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'
  | string;

export interface StreamHandlers {
  onStart?: (data: { exchangeId: string; conversationId: string; prompt: string }) => void;
  onToken?: (text: string) => void;
  onDone?: (data: { exchangeId: string; status: ExchangeStatus; model: string; latencyMs: number }) => void;
  onTitle?: (title: string) => void;
  onError?: (error: { code: StreamErrorCode; message: string }) => void;
}

export const TONE_OPTIONS: { id: Tone; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'concise', label: 'Concise' },
];
