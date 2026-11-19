export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="Assistant is typing" role="status">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
