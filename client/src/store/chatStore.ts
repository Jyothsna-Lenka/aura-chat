import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tone } from '../types';

type Theme = 'light' | 'dark' | 'system';

/** The response currently being streamed (shown on top of the saved thread). */
export interface StreamingState {
  conversationId: string;
  exchangeId: string | null; // known after the "start" event
  replaceExchangeId: string | null; // set for regenerate / edit
  prompt: string;
  tone: Tone;
  text: string; // all text received so far (the typewriter reveals it gradually)
  done: boolean;
}

interface ChatState {
  // Persisted settings
  tone: Tone;
  theme: Theme;
  sidebarCollapsed: boolean;
  setTone: (tone: Tone) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebarCollapsed: () => void;

  // UI state
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // Streaming state
  streaming: StreamingState | null;
  abortController: AbortController | null;
  beginStream: (s: Omit<StreamingState, 'text' | 'done' | 'exchangeId'>, controller: AbortController) => void;
  setStreamExchangeId: (id: string) => void;
  appendToken: (text: string) => void;
  finishStream: () => void;
  clearStream: () => void;
  stop: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      tone: 'professional',
      theme: 'system',
      sidebarCollapsed: false,
      setTone: (tone) => set({ tone }),
      setTheme: (theme) => set({ theme }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      mobileSidebarOpen: false,
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),

      streaming: null,
      abortController: null,
      beginStream: (s, controller) =>
        set({ streaming: { ...s, exchangeId: null, text: '', done: false }, abortController: controller }),
      setStreamExchangeId: (id) => set((st) => (st.streaming ? { streaming: { ...st.streaming, exchangeId: id } } : st)),
      appendToken: (text) =>
        set((st) => (st.streaming ? { streaming: { ...st.streaming, text: st.streaming.text + text } } : st)),
      finishStream: () =>
        set((st) => (st.streaming ? { streaming: { ...st.streaming, done: true }, abortController: null } : st)),
      clearStream: () => set({ streaming: null, abortController: null }),
      stop: () => {
        get().abortController?.abort();
        get().finishStream();
      },
    }),
    {
      name: 'aura-settings',
      // Only settings are saved to localStorage, never chat data.
      partialize: (s) => ({ tone: s.tone, theme: s.theme, sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);

export const isStreaming = (s: ChatState) => Boolean(s.streaming && !s.streaming.done);
