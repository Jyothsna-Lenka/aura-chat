// Provider-agnostic contract for an AI model. Routes/controllers only depend on this,
// so OpenAI or Claude can be added as new classes without touching them.

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface StreamRequest {
  systemInstruction: string;
  history: ChatTurn[]; // previous turns, oldest first
  prompt: string; // the new user message
  signal?: AbortSignal;
  maxOutputTokens?: number;
}

export interface StreamResult {
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  finishReason?: string;
}

export type LLMErrorCode = 'RATE_LIMITED' | 'UNAVAILABLE' | 'INVALID_API_KEY' | 'MODEL_NOT_FOUND' | 'NETWORK_ERROR' | 'ABORTED' | 'UNKNOWN';

export class LLMError extends Error {
  constructor(
    public code: LLMErrorCode,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
  }
}

export interface LLMProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** Streams text chunks via onToken and resolves with final metadata. */
  stream(req: StreamRequest, onToken: (text: string) => void): Promise<StreamResult>;
  /** Small, cheap one-shot completion (used for titles). */
  complete(prompt: string, opts?: { maxOutputTokens?: number }): Promise<string>;
}
