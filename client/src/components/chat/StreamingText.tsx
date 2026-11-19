import { useEffect } from 'react';
import { useTypewriter } from '../../hooks/useTypewriter';
import { Markdown } from './Markdown';
import { TypingIndicator } from './TypingIndicator';

interface Props {
  text: string;
  done: boolean;
  onFinished: () => void;
}

/** Shows the streamed reply with a typewriter effect, a blinking cursor, and live Markdown. */
export function StreamingText({ text, done, onFinished }: Props) {
  const { text: visible, drained } = useTypewriter(text);

  useEffect(() => {
    if (done && drained) onFinished();
  }, [done, drained, onFinished]);

  if (!visible && !done) return <TypingIndicator />;
  return (
    <div aria-live="polite" aria-busy={!done}>
      <div className="prose prose-zinc max-w-none dark:prose-invert prose-p:my-2">
        <Markdown text={visible} />
      </div>
      {!(done && drained) && <span className="stream-cursor" aria-hidden />}
    </div>
  );
}
