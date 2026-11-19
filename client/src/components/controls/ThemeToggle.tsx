import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { Button } from '../ui/button';

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function ThemeToggle() {
  const theme = useChatStore((s) => s.theme);
  const setTheme = useChatStore((s) => s.setTheme);
  const isDark = theme === 'dark' || (theme === 'system' && systemDark());

  useEffect(() => {
    const apply = () =>
      document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && systemDark()));
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
