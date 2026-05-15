import { format, formatDistanceToNowStrict, isPast, parseISO, differenceInCalendarDays } from 'date-fns';

export function formatDate(iso: string | null | undefined, fallback = '—'): string {
  if (!iso) return fallback;
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return fallback;
  }
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    if (isPast(d)) {
      return `${formatDistanceToNowStrict(d)} overdue`;
    }
    return `in ${formatDistanceToNowStrict(d)}`;
  } catch {
    return '—';
  }
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    return differenceInCalendarDays(parseISO(iso), new Date());
  } catch {
    return null;
  }
}

export function formatPercent(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function colorFromName(name: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % palette.length;
  return palette[idx];
}

export function formatLastSynced(iso: string | null): string {
  if (!iso) return 'Never synced';
  try {
    return `Last synced ${formatDistanceToNowStrict(parseISO(iso))} ago`;
  } catch {
    return 'Last synced —';
  }
}
