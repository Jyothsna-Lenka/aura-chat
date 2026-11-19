import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, PanelLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useConversation } from '../../hooks/useConversations';
import { useChatStream } from '../../hooks/useChatStream';
import { isStreaming, useChatStore } from '../../store/chatStore';
import { MessageList } from './MessageList';
import { AiBubble, UserBubble } from './MessageBubble';
import { Composer, type ComposerHandle } from './Composer';
import { EmptyState } from './EmptyState';
import { ToneToggle } from '../controls/ToneToggle';
import { ThemeToggle } from '../controls/ThemeToggle';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

export function ChatWindow() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useConversation(conversationId);
  const streaming = useChatStore((s) => s.streaming);
  const streamingNow = useChatStore(isStreaming);
  const clearStream = useChatStore((s) => s.clearStream);
  const setMobileOpen = useChatStore((s) => s.setMobileSidebarOpen);
  const toggleCollapsed = useChatStore((s) => s.toggleSidebarCollapsed);
  const collapsed = useChatStore((s) => s.sidebarCollapsed);
  const { send, regenerate, editAndResend, stop } = useChatStream();
  const composerRef = useRef<ComposerHandle>(null);

  useEffect(() => {
    if (error && (error as { status?: number }).status === 404) {
      toast.error('Conversation not found');
      navigate('/', { replace: true });
    }
  }, [error, navigate]);

  // Esc stops generation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useChatStore.getState().streaming && !useChatStore.getState().streaming?.done) stop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stop]);

  const activeStream = streaming && streaming.conversationId === conversationId ? streaming : null;
  const onStreamFinished = useCallback(() => clearStream(), [clearStream]);

  const exchanges = data?.exchanges ?? [];
  // While regenerating/editing, the streaming bubble replaces the saved exchange.
  const visible = activeStream?.replaceExchangeId
    ? exchanges.filter((e) => e.id !== activeStream.replaceExchangeId)
    : activeStream?.exchangeId
      ? exchanges.filter((e) => e.id !== activeStream.exchangeId)
      : exchanges;
  const lastId = exchanges[exchanges.length - 1]?.id;
  const busy = streamingNow || Boolean(activeStream);
  const showEmpty = !conversationId || (!isLoading && exchanges.length === 0 && !activeStream);

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open sidebar" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          {collapsed && (
            <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label="Expand sidebar" onClick={toggleCollapsed}>
              <PanelLeft className="h-5 w-5" />
            </Button>
          )}
          <h2 className="truncate text-sm font-medium text-zinc-600 dark:text-zinc-300">{data?.title ?? 'New Chat'}</h2>
        </div>
        <div className="flex items-center gap-1">
          <ToneToggle />
          <ThemeToggle />
        </div>
      </header>

      {conversationId && isLoading ? (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
          <Skeleton className="ml-auto h-10 w-2/3" />
          <Skeleton className="h-24 w-4/5" />
          <Skeleton className="ml-auto h-10 w-1/2" />
        </div>
      ) : showEmpty ? (
        <EmptyState onPick={(p) => send(conversationId, p)} />
      ) : (
        <MessageList contentKey={`${visible.length}-${activeStream?.text.length ?? 0}`}>
          {visible.map((e) => {
            const isLast = e.id === lastId;
            return (
              <div key={e.id} className="flex flex-col gap-5">
                <UserBubble
                  text={e.userPrompt}
                  timestamp={e.timestamp}
                  canEdit={isLast && !busy}
                  onEdit={(t) => editAndResend(conversationId!, e.id, t)}
                />
                <AiBubble
                  text={e.aiResponse}
                  tone={e.tone}
                  timestamp={e.timestamp}
                  status={e.status}
                  canRegenerate={isLast && !busy}
                  onRegenerate={() => regenerate(conversationId!, e.id, e.userPrompt)}
                />
              </div>
            );
          })}
          {activeStream && (
            <div className="flex flex-col gap-5">
              <UserBubble text={activeStream.prompt} />
              <AiBubble
                text={activeStream.text}
                tone={activeStream.tone}
                streaming={{ done: activeStream.done, onFinished: onStreamFinished }}
              />
            </div>
          )}
        </MessageList>
      )}

      <Composer ref={composerRef} streaming={busy} onStop={stop} onSend={(text) => send(conversationId, text)} />
    </main>
  );
}
