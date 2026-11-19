import { Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'Explain how React hooks work with a simple example',
  'Write a Python function to check if a string is a palindrome',
  'Give me 5 tips to prepare for a technical interview',
  'Compare SQL and NoSQL databases in a table',
];

export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-fuchsia-500 text-white shadow-lg">
        <Sparkles className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-semibold">How can I help you today?</h1>
      <p className="mt-2 text-sm text-zinc-500">Pick a tone above, then ask anything.</p>
      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-2xl border border-zinc-200 bg-white p-4 text-left text-sm shadow-sm transition hover:border-accent-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:border-zinc-800 dark:bg-zinc-900"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
