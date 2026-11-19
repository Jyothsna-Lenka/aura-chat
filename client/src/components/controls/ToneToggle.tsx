import { useChatStore } from '../../store/chatStore';
import { TONE_OPTIONS } from '../../types';
import { cn } from '../../lib/utils';

/** Segmented control: Professional | Casual | Concise. Sent with every message. */
export function ToneToggle() {
  const tone = useChatStore((s) => s.tone);
  const setTone = useChatStore((s) => s.setTone);
  return (
    <div role="radiogroup" aria-label="Response tone" className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
      {TONE_OPTIONS.map((t) => (
        <button
          key={t.id}
          role="radio"
          aria-checked={tone === t.id}
          onClick={() => setTone(t.id)}
          className={cn(
            'rounded-lg px-2.5 py-1 text-xs font-medium transition-all sm:px-3 sm:text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
            tone === t.id
              ? 'bg-white text-accent-700 shadow-sm dark:bg-zinc-950 dark:text-accent-100'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
