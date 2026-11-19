import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export const MAX_CHARS = 8000;

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
}

export interface ComposerHandle {
  setText: (text: string) => void;
  focus: () => void;
}

/** Auto-growing input. Enter sends, Shift+Enter adds a new line. Send becomes Stop while streaming. */
export const Composer = forwardRef<ComposerHandle, Props>(function Composer({ onSend, onStop, streaming }, ref) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({ setText, focus: () => taRef.current?.focus() }));

  // Auto-grow up to ~8 lines.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 8 * 24 + 16)}px`;
  }, [text]);

  const trimmed = text.trim();
  const tooLong = text.length > MAX_CHARS;
  const canSend = trimmed.length > 0 && !tooLong && !streaming;

  const submit = () => {
    if (!canSend) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-3">
      <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-500/20 dark:border-zinc-700 dark:bg-zinc-900">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Message Aura…"
          aria-label="Message"
          className="max-h-[208px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 outline-none placeholder:text-zinc-400"
        />
        {streaming ? (
          <Button size="icon" variant="outline" onClick={onStop} aria-label="Stop generating" title="Stop (Esc)">
            <Square className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button size="icon" onClick={submit} disabled={!canSend} aria-label="Send message" title="Send (Enter)">
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-zinc-500">
        <span>Powered by Google Gemini · AI can make mistakes.</span>
        {text.length > MAX_CHARS * 0.8 && (
          <span className={cn(tooLong && 'font-semibold text-red-600')} aria-live="polite">
            {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
});
