import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { TONES } from '../services/tone.service.js';

// One exchange = one user prompt + the AI response, with tone, timestamp and metadata.
const exchangeSchema = new Schema({
  userPrompt: { type: String, required: true },
  aiResponse: { type: String, default: '' },
  tone: { type: String, enum: TONES, required: true },
  timestamp: { type: Date, default: () => new Date() },
  model: { type: String, default: '' },
  status: { type: String, enum: ['complete', 'stopped', 'error'], default: 'complete' },
  usage: {
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
  },
  latencyMs: { type: Number, default: 0 },
});

const conversationSchema = new Schema(
  {
    title: { type: String, default: 'New Chat', trim: true, maxlength: 120 },
    exchanges: { type: [exchangeSchema], default: [] },
  },
  { timestamps: true },
);

// Sidebar is sorted by most recently updated.
conversationSchema.index({ updatedAt: -1 });
// Full-text search over titles and message content (Extra Feature 1).
conversationSchema.index(
  { title: 'text', 'exchanges.userPrompt': 'text', 'exchanges.aiResponse': 'text' },
  { weights: { title: 5, 'exchanges.userPrompt': 2, 'exchanges.aiResponse': 1 }, name: 'conversation_text' },
);

export type Conversation = InferSchemaType<typeof conversationSchema>;
export type ConversationDoc = HydratedDocument<Conversation>;
export type Exchange = InferSchemaType<typeof exchangeSchema>;
export const ConversationModel = model('Conversation', conversationSchema);
