import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { setLLMProvider } from '../src/services/llm/index.js';
import { LLMError, type LLMProvider } from '../src/services/llm/LLMProvider.js';
import { ConversationModel } from '../src/models/Conversation.js';

// Mocked LLM provider: tests never call the real Gemini API.
let lastSystem = '';
let failWith: LLMError | null = null;
const mockProvider: LLMProvider = {
  name: 'mock',
  isConfigured: () => true,
  async stream(req, onToken) {
    lastSystem = req.systemInstruction;
    if (failWith) throw failWith;
    onToken('Hello ');
    onToken('world');
    return { model: 'mock-model', usage: { inputTokens: 5, outputTokens: 2 } };
  },
  complete: async () => 'Mock Generated Title',
};

let mem: MongoMemoryServer | null = null;
const app = createApp();

beforeAll(async () => {
  setLLMProvider(mockProvider);
  // Use TEST_MONGODB_URI if provided, otherwise an in-memory MongoDB.
  let uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    mem = await MongoMemoryServer.create();
    uri = mem.getUri('aura-test');
  }
  await mongoose.connect(uri);
  await ConversationModel.syncIndexes();
});

beforeEach(async () => {
  failWith = null;
  await ConversationModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  await mem?.stop();
});

function parseSSE(text: string) {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const event = /event: (.*)/.exec(block)?.[1];
      const data = JSON.parse(/data: (.*)/.exec(block)?.[1] ?? 'null');
      return { event, data };
    });
}

describe('conversations CRUD', () => {
  it('creates, lists, renames and deletes a conversation', async () => {
    const created = await request(app).post('/api/conversations').send({}).expect(201);
    expect(created.body.title).toBe('New Chat');
    const id = created.body.id;

    const list = await request(app).get('/api/conversations').expect(200);
    expect(list.body).toHaveLength(1);

    const renamed = await request(app).patch(`/api/conversations/${id}`).send({ title: 'Renamed' }).expect(200);
    expect(renamed.body.title).toBe('Renamed');

    await request(app).delete(`/api/conversations/${id}`).expect(204);
    await request(app).get(`/api/conversations/${id}`).expect(404);
  });

  it('validates ids and titles', async () => {
    const bad = await request(app).get('/api/conversations/not-an-id').expect(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    const { body } = await request(app).post('/api/conversations').send({});
    await request(app).patch(`/api/conversations/${body.id}`).send({ title: '   ' }).expect(400);
  });
});

describe('streaming messages', () => {
  it('streams tokens, saves the exchange with tone, and auto-titles', async () => {
    const { body } = await request(app).post('/api/conversations').send({});
    const res = await request(app)
      .post(`/api/conversations/${body.id}/messages`)
      .send({ prompt: 'Hi there', tone: 'concise' })
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    const events = parseSSE(res.text);
    expect(events.map((e) => e.event)).toEqual(['start', 'token', 'token', 'done', 'title']);
    expect(lastSystem).toContain('briefly');

    const convo = await request(app).get(`/api/conversations/${body.id}`).expect(200);
    expect(convo.body.title).toBe('Mock Generated Title');
    expect(convo.body.exchanges[0]).toMatchObject({
      userPrompt: 'Hi there',
      aiResponse: 'Hello world',
      tone: 'concise',
      status: 'complete',
      model: 'mock-model',
    });
    expect(convo.body.exchanges[0].timestamp).toBeTruthy();
  });

  it('rejects empty prompts and invalid tones', async () => {
    const { body } = await request(app).post('/api/conversations').send({});
    await request(app).post(`/api/conversations/${body.id}/messages`).send({ prompt: '  ', tone: 'casual' }).expect(400);
    await request(app).post(`/api/conversations/${body.id}/messages`).send({ prompt: 'hi', tone: 'rude' }).expect(400);
    await request(app)
      .post(`/api/conversations/${body.id}/messages`)
      .send({ prompt: 'x'.repeat(8001), tone: 'casual' })
      .expect(400);
  });

  it('sends a friendly error event and saves status=error when the AI fails', async () => {
    failWith = new LLMError('RATE_LIMITED', 'quota');
    const { body } = await request(app).post('/api/conversations').send({});
    const res = await request(app).post(`/api/conversations/${body.id}/messages`).send({ prompt: 'Hi', tone: 'casual' });
    const err = parseSSE(res.text).find((e) => e.event === 'error');
    expect(err?.data.code).toBe('RATE_LIMITED');
    const convo = await request(app).get(`/api/conversations/${body.id}`);
    expect(convo.body.exchanges[0].status).toBe('error');
  });

  it('regenerates and edits the latest exchange in place', async () => {
    const { body } = await request(app).post('/api/conversations').send({});
    await request(app).post(`/api/conversations/${body.id}/messages`).send({ prompt: 'First', tone: 'casual' });
    const convo = await request(app).get(`/api/conversations/${body.id}`);
    const exId = convo.body.exchanges[0].id;

    await request(app)
      .post(`/api/conversations/${body.id}/exchanges/${exId}/regenerate`)
      .send({ tone: 'professional', prompt: 'Edited' })
      .expect(200);
    const after = await request(app).get(`/api/conversations/${body.id}`);
    expect(after.body.exchanges).toHaveLength(1);
    expect(after.body.exchanges[0]).toMatchObject({ id: exId, userPrompt: 'Edited', tone: 'professional' });
  });

  it('finds conversations with full-text search', async () => {
    const { body } = await request(app).post('/api/conversations').send({});
    await request(app).post(`/api/conversations/${body.id}/messages`).send({ prompt: 'Tell me about elephants', tone: 'casual' });
    const res = await request(app).get('/api/conversations?q=elephants').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].snippet).toContain('elephants');
  });
});
