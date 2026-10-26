import type { Tone } from "@/app/admin/admin-status-pill";

/**
 * Every threshold the Dashboard colours by, in one place. Nothing else may
 * hardcode one: change a number here and the Dashboard follows.
 */
export const THRESHOLDS = {
  /** Oldest "Last Checked" date on an active laptop's price. */
  price: { amberDays: 14, redDays: 30 },
  /** PassMark refresh (null until step 10 records one: shown as Unknown). */
  benchmarks: { amberDays: 30, redDays: 60 },
  /** Pico shows in Needs attention when either rate is reached over the
   * window, and only with enough runs to mean anything. */
  pico: { windowDays: 7, minRuns: 5, errorRate: 0.1, fallbackRate: 0.1 },
} as const;

const DAY_MS = 86_400_000;

/** Whole days since an ISO date, or null when there is no date. */
export function ageDays(iso: string | null, now: number = Date.now()): number | null {
  if (!iso) return null;
  return Math.floor((now - new Date(iso).getTime()) / DAY_MS);
}

/** good / warn / bad for an age against an amber and red threshold; neutral when unknown. */
export function ageTone(
  days: number | null,
  limits: { amberDays: number; redDays: number },
): Tone {
  if (days === null) return "neutral";
  if (days > limits.redDays) return "bad";
  if (days > limits.amberDays) return "warn";
  return "good";
}

/** PickScore is stale when it is older than the latest catalog change. */
export function pickscoreTone(recalculatedAt: string | null, catalogChangedAt: string | null): Tone {
  if (!recalculatedAt) return "bad";
  if (catalogChangedAt && new Date(recalculatedAt) < new Date(catalogChangedAt)) return "warn";
  return "good";
}

/** Whether Pico's 7-day numbers belong in Needs attention. */
export function picoNeedsAttention(runs: number, errors: number, fallbacks: number): boolean {
  const p = THRESHOLDS.pico;
  if (runs < p.minRuns) return false;
  return errors / runs >= p.errorRate || fallbacks / runs >= p.fallbackRate;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", "4 months ago". */
export function timeAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "never";
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 60) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} months ago`;
}
