/**
 * Turning a page of admin rows into a dense day-by-day series for the trend
 * charts (`components/charts/trend-line.tsx`).
 *
 * Two things this exists to get right:
 *
 * 1. **Dense days.** A time axis has to include days with no rows, or a gap in
 *    activity renders as a straight line between the days on either side —
 *    which reads as steady traffic across a period where there was none.
 * 2. **Local days.** Buckets are keyed in the viewer's time zone, because an
 *    admin reading "today" means their today. Note this can disagree by one
 *    day with the backend's `runs_today`, which counts against the UTC date
 *    (`agent/monitoring_router.py`) — expected, not a bug.
 */

/** One day of the axis. `items` is empty for days nothing happened. */
export interface DayBucket<T> {
  /** `YYYY-MM-DD` in local time — the chart's unique x-axis key. */
  date: string;
  /** Short tick label, e.g. "10 Aug". */
  label: string;
  items: T[];
}

/**
 * Backend datetimes are UTC. SQLModel hands them back tz-aware, so they
 * normally serialize with an offset — but a column stored as TIMESTAMP WITHOUT
 * TIME ZONE comes back naive, and `new Date("2026-08-10T12:00:00")` parses a
 * naive string as *local* time, silently shifting every row by the UTC offset
 * (8 hours here). Append the designator when the string carries none.
 */
export function parseUtc(iso: string): Date {
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`);
}

function localDayKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Groups `rows` into the last `days` local days, oldest first. Rows older than
 * the window are dropped; rows dated in the future land in no bucket.
 */
export function bucketByDay<T>(
  rows: readonly T[],
  getTimestamp: (row: T) => string,
  days: number,
): DayBucket<T>[] {
  const byKey = new Map<string, T[]>();
  for (const row of rows) {
    const key = localDayKey(parseUtc(getTimestamp(row)));
    const existing = byKey.get(key);
    if (existing) existing.push(row);
    else byKey.set(key, [row]);
  }

  const today = new Date();
  const buckets: DayBucket<T>[] = [];
  for (let back = days - 1; back >= 0; back--) {
    // Built through the Date constructor rather than by subtracting
    // milliseconds: the constructor normalizes an underflowing day-of-month,
    // and stepping by 86_400_000 lands on the wrong calendar day across a DST
    // boundary (not an issue in Malaysia, but this component is generic).
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
    const key = localDayKey(d);
    buckets.push({
      date: key,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      items: byKey.get(key) ?? [],
    });
  }
  return buckets;
}

/**
 * Formats a `YYYY-MM-DD` key as a short tick label.
 *
 * Parsed part-by-part on purpose: `new Date("2026-08-10")` is specified as UTC
 * midnight, so rendering it in a negative-offset zone prints the day before.
 * Server-bucketed series arrive as bare date strings and must keep the calendar
 * day the server meant.
 */
export function formatDayKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/**
 * Whole local days from `date` up to today, counting both ends — so a
 * timestamp from earlier today is 1.
 *
 * The trend charts use this to size their axis to the data they actually have.
 * A fixed 14-day axis over a capped page of rows would draw zeros for the days
 * the page doesn't reach back to, which reads as "no traffic" when the truth is
 * "not fetched".
 */
export function daySpanToToday(date: Date): number {
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - from.getTime()) / 86_400_000) + 1;
  return Math.max(1, days);
}

/**
 * Linear-interpolated percentile, `p` in 0–100. Returns null for an empty
 * input so a day with no rows plots a gap rather than a misleading zero.
 */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];

  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}
