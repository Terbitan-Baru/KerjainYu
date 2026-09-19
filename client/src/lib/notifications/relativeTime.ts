// Formatter waktu relatif sederhana (mis. "2h ago") tanpa dependency baru.
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) return "Baru saja";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m lalu`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}j lalu`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}h lalu`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}mgu lalu`;

  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
