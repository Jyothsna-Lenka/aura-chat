import { useEffect, useRef, useState } from 'react';

/**
 * Reveals `target` character by character using requestAnimationFrame.
 * Gemini sends large chunks; this smooths them into a typing effect.
 * The rate adapts to the backlog so the UI never falls far behind the stream.
 */
export function charsPerFrame(backlog: number): number {
  if (backlog <= 0) return 0;
  return Math.max(1, Math.ceil(backlog / 12));
}

export function useTypewriter(target: string, enabled = true) {
  const [shown, setShown] = useState(enabled ? 0 : target.length);
  const shownRef = useRef(shown);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!enabled) {
      shownRef.current = targetRef.current.length;
      setShown(shownRef.current);
      return;
    }
    let frame = 0;
    const tick = () => {
      const backlog = targetRef.current.length - shownRef.current;
      if (backlog > 0) {
        shownRef.current += charsPerFrame(backlog);
        setShown(shownRef.current);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  const visible = target.slice(0, Math.min(shown, target.length));
  return { text: visible, drained: shown >= target.length };
}
