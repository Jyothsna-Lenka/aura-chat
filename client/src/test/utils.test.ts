import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { charsPerFrame, useTypewriter } from '../hooks/useTypewriter';
import { groupByDate } from '../lib/utils';
import { dispatch } from '../lib/sse';

describe('useTypewriter', () => {
  it('speeds up when the backlog grows', () => {
    expect(charsPerFrame(0)).toBe(0);
    expect(charsPerFrame(5)).toBe(1);
    expect(charsPerFrame(1200)).toBe(100);
  });

  it('reveals text gradually and eventually drains', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    const { result } = renderHook(() => useTypewriter('Hello world'));
    expect(result.current.text).toBe('');
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(result.current.text.length).toBeGreaterThan(0);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.text).toBe('Hello world');
    expect(result.current.drained).toBe(true);
    vi.useRealTimers();
  });
});

describe('groupByDate', () => {
  it('groups conversations into Today / Yesterday / Previous 7 Days / Older', () => {
    const now = new Date('2026-11-19T12:00:00');
    const items = [
      { updatedAt: '2026-11-19T09:00:00' },
      { updatedAt: '2026-11-18T09:00:00' },
      { updatedAt: '2026-11-15T09:00:00' },
      { updatedAt: '2026-10-01T09:00:00' },
    ];
    expect(groupByDate(items, now).map(([g]) => g)).toEqual(['Today', 'Yesterday', 'Previous 7 Days', 'Older']);
  });
});

describe('SSE parsing', () => {
  it('dispatches token and error events to handlers', () => {
    const onToken = vi.fn();
    const onError = vi.fn();
    dispatch('event: token\ndata: {"text":"Hi"}', { onToken, onError });
    dispatch('event: error\ndata: {"code":"RATE_LIMITED","message":"wait"}', { onToken, onError });
    expect(onToken).toHaveBeenCalledWith('Hi');
    expect(onError).toHaveBeenCalledWith({ code: 'RATE_LIMITED', message: 'wait' });
  });
});
