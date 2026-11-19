import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { cn, relativeTime } from '../../lib/utils';
import type { ConversationSummary } from '../../types';

/** Wraps search terms in <mark> (presentation only). */
function highlight(text: string, q: string): ReactNode {
  const terms = q.trim().split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) return text;
  const parts = text.split(new RegExp(`(${terms.join('|')})`, 'gi'));
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-yellow-200 px-0.5 text-zinc-900 dark:bg-yellow-500/40 dark:text-zinc-50">
        {p}
      </mark>
    ) : (
      p
    ),
  );
}

interface Props {
  item: ConversationSummary;
  active: boolean;
  query: string;
  onRename: (title: string) => void;
  onDelete: () => void;
  onNavigate: () => void;
}

export function ThreadItem({ item, active, query, onRename, onDelete, onNavigate }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);

  const save = () => {
    const t = title.trim();
    if (t && t !== item.title) onRename(t);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-xl bg-zinc-100 px-2 py-1.5 dark:bg-zinc-800">
        <input
          autoFocus
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') (setTitle(item.title), setEditing(false));
          }}
          aria-label="Conversation title"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button aria-label="Save title" onClick={save} className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Cancel rename"
          onClick={() => (setTitle(item.title), setEditing(false))}
          className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex items-center rounded-xl transition-colors',
        active ? 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-100' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800',
      )}
    >
      <Link
        to={`/c/${item.id}`}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className="min-w-0 flex-1 rounded-xl px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
      >
        <div className="truncate text-sm font-medium">{query ? highlight(item.title, query) : item.title}</div>
        {query && item.snippet ? (
          <div className="line-clamp-2 text-xs text-zinc-500">{highlight(item.snippet, query)}</div>
        ) : (
          <div className="text-xs text-zinc-500">{relativeTime(item.updatedAt)}</div>
        )}
      </Link>
      <div className="absolute right-1 hidden items-center gap-0.5 rounded-lg bg-inherit group-focus-within:flex group-hover:flex">
        <button
          aria-label={`Rename ${item.title}`}
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label={`Delete ${item.title}`}
          onClick={onDelete}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
