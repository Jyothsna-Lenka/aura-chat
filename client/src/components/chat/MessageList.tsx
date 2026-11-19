import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown } from 'lucide-react';

/**
 * Scrollable message area. Auto-scrolls while new content arrives,
 * unless the user scrolled up; then a "Jump to latest" button appears.
 */
export function MessageList({ children, contentKey }: { children: ReactNode; contentKey: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const atBottomRef = useRef(true);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    setAtBottom(near);
  };

  // Keep pinned to the bottom as content grows (typewriter updates resize the content).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) scrollToBottom();
    });
    Array.from(el.children).forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [scrollToBottom, contentKey]);

  useEffect(() => {
    if (atBottomRef.current) scrollToBottom();
  }, [contentKey, scrollToBottom]);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={onScroll} className="h-full overflow-y-auto" role="log" aria-label="Conversation">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">{children}</div>
      </div>
      {!atBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium shadow-md hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <ArrowDown className="h-3.5 w-3.5" /> Jump to latest
        </button>
      )}
    </div>
  );
}
