import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MessagesSquare, PanelLeftClose, Sparkles } from 'lucide-react';
import { useConversationList, useDeleteConversation, useRenameConversation } from '../../hooks/useConversations';
import { useChatStore } from '../../store/chatStore';
import { groupByDate } from '../../lib/utils';
import { SearchBar } from './SearchBar';
import { NewChatButton } from './NewChatButton';
import { ThreadItem } from './ThreadItem';
import { Skeleton } from '../ui/skeleton';
import { ConfirmDialog } from '../ui/dialog';
import { Button } from '../ui/button';
import type { ConversationSummary } from '../../types';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Sidebar() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const { data, isLoading, isError, refetch } = useConversationList(q);
  const rename = useRenameConversation();
  const remove = useDeleteConversation();
  const [toDelete, setToDelete] = useState<ConversationSummary | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const collapsed = useChatStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useChatStore((s) => s.toggleSidebarCollapsed);
  const mobileOpen = useChatStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useChatStore((s) => s.setMobileSidebarOpen);

  const newChat = () => {
    navigate('/');
    setMobileOpen(false);
  };

  // Keyboard shortcuts: Ctrl/Cmd+K = search, Ctrl/Cmd+Shift+O = new chat.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (collapsed) toggleCollapsed();
        setMobileOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        newChat();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  const content = (
    <div className="flex h-full w-72 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-fuchsia-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          Aura Chat
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Collapse sidebar"
          className="hidden md:inline-flex"
          onClick={toggleCollapsed}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2 px-3 pb-3">
        <NewChatButton onClick={newChat} />
        <SearchBar ref={searchRef} value={search} onChange={setSearch} />
      </div>
      <nav aria-label="Conversation history" className="flex-1 overflow-y-auto px-2 pb-4">
        {isLoading ? (
          <div className="space-y-2 px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-3 py-6 text-center text-sm text-zinc-500">
            Couldn't load chats.{' '}
            <button className="font-medium text-accent-600 underline" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-2 px-3 py-10 text-center text-sm text-zinc-500">
            <MessagesSquare className="h-6 w-6" />
            {q ? `No chats match "${q}"` : 'No conversations yet. Start a new chat!'}
          </div>
        ) : (
          groupByDate(data).map(([group, items]) => (
            <section key={group} className="mb-3">
              <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{group}</h3>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <ThreadItem
                    key={item.id}
                    item={item}
                    query={q}
                    active={item.id === conversationId}
                    onNavigate={() => setMobileOpen(false)}
                    onRename={(title) => rename.mutate({ id: item.id, title })}
                    onDelete={() => setToDelete(item)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </nav>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete conversation?"
        description={
          <>
            "{toDelete?.title}" and all its messages will be permanently deleted.
          </>
        }
        onConfirm={() => {
          if (!toDelete) return;
          remove.mutate(toDelete.id);
          if (toDelete.id === conversationId) navigate('/');
        }}
      />
    </div>
  );

  return (
    <>
      {/* Desktop: collapsible column */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.aside
            key="desktop"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden shrink-0 overflow-hidden md:block"
          >
            {content}
          </motion.aside>
        )}
      </AnimatePresence>
      {/* Mobile: slide-over drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'tween', duration: 0.2 }}
            >
              {content}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
