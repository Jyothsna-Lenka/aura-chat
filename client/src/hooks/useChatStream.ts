import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, regenerate as regenerateApi, sendMessage as sendApi } from '../lib/api';
import { useChatStore } from '../store/chatStore';
import { keys } from './useConversations';
import type { StreamHandlers, Tone } from '../types';

/** Sends messages / regenerates and wires the SSE stream into the store. */
export function useChatStream() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const store = useChatStore;

  const refresh = useCallback(
    (conversationId: string) => {
      qc.invalidateQueries({ queryKey: keys.detail(conversationId) });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    [qc],
  );

  const run = useCallback(
    async (
      conversationId: string,
      opts: { prompt: string; tone: Tone; replaceExchangeId?: string; editedPrompt?: string },
    ) => {
      const controller = new AbortController();
      store.getState().beginStream(
        { conversationId, prompt: opts.prompt, tone: opts.tone, replaceExchangeId: opts.replaceExchangeId ?? null },
        controller,
      );

      const handlers: StreamHandlers = {
        onStart: ({ exchangeId }) => store.getState().setStreamExchangeId(exchangeId),
        onToken: (text) => store.getState().appendToken(text),
        onDone: () => {
          store.getState().finishStream();
          refresh(conversationId);
        },
        onTitle: () => refresh(conversationId),
        onError: ({ code, message }) => {
          store.getState().finishStream();
          refresh(conversationId);
          showStreamError(code, message, () => retryLatest(conversationId));
        },
      };

      try {
        if (opts.replaceExchangeId) {
          await regenerateApi(conversationId, opts.replaceExchangeId, opts.tone, handlers, controller.signal, opts.editedPrompt);
        } else {
          await sendApi(conversationId, opts.prompt, opts.tone, handlers, controller.signal);
        }
      } catch (err) {
        store.getState().clearStream();
        toast.error((err as Error).message);
        return;
      }
      if (controller.signal.aborted) {
        // Stopped by the user: the server saved the partial reply.
        setTimeout(() => refresh(conversationId), 300);
      }
      // Make sure the stream is marked finished even if the connection ended early.
      store.getState().finishStream();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc, refresh],
  );

  async function retryLatest(conversationId: string) {
    const convo = await api.getConversation(conversationId).catch(() => null);
    const last = convo?.exchanges[convo.exchanges.length - 1];
    if (!last) return;
    run(conversationId, { prompt: last.userPrompt, tone: store.getState().tone, replaceExchangeId: last.id });
  }

  /** Sends a new message. Creates the conversation first when on the "new chat" screen. */
  const send = useCallback(
    async (conversationId: string | undefined, prompt: string) => {
      const tone = store.getState().tone;
      let id = conversationId;
      if (!id) {
        try {
          const created = await api.createConversation();
          id = created.id;
          qc.setQueryData(keys.detail(id), created);
          navigate(`/c/${id}`);
        } catch (err) {
          toast.error((err as Error).message);
          return;
        }
      }
      await run(id, { prompt, tone });
    },
    [navigate, qc, run, store],
  );

  const regenerate = useCallback(
    (conversationId: string, exchangeId: string, prompt: string) =>
      run(conversationId, { prompt, tone: store.getState().tone, replaceExchangeId: exchangeId }),
    [run, store],
  );

  const editAndResend = useCallback(
    (conversationId: string, exchangeId: string, newPrompt: string) =>
      run(conversationId, { prompt: newPrompt, tone: store.getState().tone, replaceExchangeId: exchangeId, editedPrompt: newPrompt }),
    [run, store],
  );

  return { send, regenerate, editAndResend, stop: () => store.getState().stop() };
}

function showStreamError(code: string, message: string, retry: () => void) {
  if (code === 'RATE_LIMITED') {
    let seconds = 60;
    const id = toast.error(message, {
      description: `You can retry in ${seconds}s`,
      duration: 60_000,
      action: { label: 'Retry', onClick: retry },
    });
    const timer = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        clearInterval(timer);
        toast.error(message, { id, description: 'You can retry now', action: { label: 'Retry', onClick: retry } });
        return;
      }
      toast.error(message, { id, description: `You can retry in ${seconds}s`, action: { label: 'Retry', onClick: retry } });
    }, 1000);
    return;
  }
  toast.error(message, { action: code === 'INVALID_API_KEY' ? undefined : { label: 'Retry', onClick: retry } });
}
