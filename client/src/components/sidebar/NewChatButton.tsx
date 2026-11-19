import { SquarePen } from 'lucide-react';
import { Button } from '../ui/button';

export function NewChatButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} className="w-full justify-start" title="New chat (Ctrl+Shift+O)">
      <SquarePen className="h-4 w-4" /> New Chat
    </Button>
  );
}
