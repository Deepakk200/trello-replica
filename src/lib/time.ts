/** Relative "time ago" label, e.g. "just now", "5m ago", "3h ago", "2d ago", "4mo ago". */
export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

/** Locale-formatted date. Defaults to "Mon 5" style (month + day). */
export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(
    'en-US',
    opts ?? { month: 'short', day: 'numeric' },
  ).format(new Date(iso));
}
