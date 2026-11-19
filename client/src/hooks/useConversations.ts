import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';

export const keys = {
  list: (q = '') => ['conversations', q] as const,
  detail: (id: string) => ['conversation', id] as const,
};

export function useConversationList(q: string) {
  return useQuery({ queryKey: keys.list(q), queryFn: () => api.listConversations(q || undefined) });
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => api.getConversation(id!),
    enabled: Boolean(id),
    retry: (count, err) => (err as { status?: number }).status !== 404 && count < 2,
  });
}

export function useRenameConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.renameConversation(id, title),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: keys.detail(id) });
      toast.success('Conversation renamed');
    },
    onError: (err) => toast.error((err as Error).message),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteConversation(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.removeQueries({ queryKey: keys.detail(id) });
      toast.success('Conversation deleted');
    },
    onError: (err) => toast.error((err as Error).message),
  });
}
