import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.round((now - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export type DateGroup = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';

/** Groups items by updatedAt into Today / Yesterday / Previous 7 Days / Older. */
export function groupByDate<T extends { updatedAt: string }>(items: T[], now = new Date()): [DateGroup, T[]][] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86400000;
  const groups: Record<DateGroup, T[]> = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };
  for (const item of items) {
    const t = new Date(item.updatedAt).getTime();
    if (t >= startOfToday) groups.Today.push(item);
    else if (t >= startOfToday - day) groups.Yesterday.push(item);
    else if (t >= startOfToday - 7 * day) groups['Previous 7 Days'].push(item);
    else groups.Older.push(item);
  }
  return (Object.entries(groups) as [DateGroup, T[]][]).filter(([, list]) => list.length > 0);
}

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
