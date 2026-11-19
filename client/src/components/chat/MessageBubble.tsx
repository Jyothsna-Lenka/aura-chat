import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Pencil, RefreshCw, Sparkles } from 'lucide-react';
import { Markdown, CopyButton } from './Markdown';
import { StreamingText } from './StreamingText';
import { Button } from '../ui/button';
import { cn, formatTime } from '../../lib/utils';
import type { ExchangeStatus, Tone } from '../../types';

const toneStyles: Record<Tone, string> = {
  professional: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  casual: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  concise: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
};

export function ToneBadge({ tone }: { tone: Tone }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', toneStyles[tone])}>{tone}</span>
  );
}

interface UserBubbleProps {
  text: string;
  timestamp?: string;
  canEdit?: boolean;
  onEdit?: (newText: string) => void;
}

export function UserBubble({ text, timestamp, canEdit, onEdit }: UserBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group flex justify-end">
      <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[75%]">
        {editing ? (
          <div className="w-full min-w-[260px] rounded-2xl border border-accent-500 bg-white p-2 dark:bg-zinc-900">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Edit message"
              rows={3}
              autoFocus
              className="w-full resize-none bg-transparent p-1 text-sm outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => (setEditing(false), setDraft(text))}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!draft.trim() || draft.trim() === text}
                onClick={() => {
                  setEditing(false);
                  onEdit?.(draft.trim());
                }}
              >
                Save & Resend
              </Button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-accent-600 px-4 py-2.5 text-[15px] text-white shadow-sm">
            {text}
          </div>
        )}
        <div className="flex h-6 items-center gap-1 text-xs text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {timestamp && <time dateTime={timestamp}>{formatTime(timestamp)}</time>}
          {canEdit && !editing && (
            <button
              aria-label="Edit message"
              onClick={() => setEditing(true)}
              className="rounded p-1 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:hover:bg-zinc-800"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface AiBubbleProps {
  text: string;
  tone: Tone;
  timestamp?: string;
  status?: ExchangeStatus;
  streaming?: { done: boolean; onFinished: () => void };
  canRegenerate?: boolean;
  onRegenerate?: () => void;
}

export function AiBubble({ text, tone, timestamp, status, streaming, canRegenerate, onRegenerate }: AiBubbleProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-fuchsia-500 text-white shadow-sm">
        <Sparkles className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 max-w-[85%] flex-1 sm:max-w-[80%]">
        <div className="rounded-2xl rounded-tl-md border border-zinc-200 bg-zinc-50 px-4 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {streaming ? (
            <StreamingText text={text} done={streaming.done} onFinished={streaming.onFinished} />
          ) : status === 'error' ? (
            <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" /> The response failed to generate.
            </p>
          ) : (
            <div className="prose prose-zinc max-w-none dark:prose-invert prose-p:my-2">
              {text ? <Markdown text={text} /> : <em className="text-zinc-500">No response</em>}
            </div>
          )}
          {status === 'stopped' && !streaming && (
            <p className="mt-1 text-xs italic text-zinc-500">Generation stopped</p>
          )}
        </div>
        <div className="mt-1 flex min-h-7 flex-wrap items-center gap-1.5 text-xs text-zinc-500">
          <ToneBadge tone={tone} />
          {!streaming && (
            <>
              {timestamp && (
                <time dateTime={timestamp} className="opacity-0 transition-opacity group-hover:opacity-100">
                  {formatTime(timestamp)}
                </time>
              )}
              {text && status !== 'error' && <CopyButton text={text} />}
              {canRegenerate && (
                <button
                  onClick={onRegenerate}
                  aria-label="Regenerate response with the selected tone"
                  title="Regenerate with the selected tone"
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-zinc-200 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> {status === 'error' ? 'Retry' : 'Regenerate'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
