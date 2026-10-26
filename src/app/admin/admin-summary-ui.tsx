import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { type Tone, toneClass } from "./admin-status-pill";

/**
 * Building blocks for the two summary pages (Dashboard, Review Pipeline).
 * Type scale: text-xs captions and chips, text-sm body, text-base card
 * headers, text-2xl stat numbers. No arbitrary pixel sizes.
 */

/** A flat card with a header, an optional one-line description and a link. */
export function SummaryCard({
  title,
  description,
  link,
  badge,
  className,
  children,
  id,
}: {
  title: string;
  description?: React.ReactNode;
  link?: { href: string; label: string };
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <Card className={cn("gap-0 px-5 py-4", className)} aria-labelledby={id} role="region">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={id} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        {badge}
        {link && <CardLink href={link.href}>{link.label}</CardLink>}
      </div>
      {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      {children}
    </Card>
  );
}

/** "Open Jobs →": the link that fixes or explains a row. 44px tap target. */
export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-brand-text ml-auto inline-flex min-h-11 items-center px-1 text-sm font-semibold whitespace-nowrap hover:underline"
    >
      {children} <span aria-hidden className="ml-1">→</span>
    </Link>
  );
}

/** A status chip in one of the portal's tones. */
export function ToneChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums",
        toneClass(tone),
      )}
    >
      {children}
    </span>
  );
}

/** "label ........ 61 / 333" over a bar. */
export function ShareBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex text-sm">
        <span>{label}</span>
        <span className="ml-auto font-semibold tabular-nums">
          {value.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div
        className="bg-surface-2 mt-1.5 h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="bg-brand h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** A labelled number on a nested fill. */
export function StatTile({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="bg-surface-2 rounded-xl p-3.5">
      <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {note && <div className="text-muted-foreground mt-0.5 text-xs">{note}</div>}
    </div>
  );
}

/** "Updated 2 min ago" + Refresh, for a page header's action slot. */
export function RefreshAction({
  updatedLabel,
  onRefresh,
  busy,
}: {
  updatedLabel: string | null;
  onRefresh: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {updatedLabel && <span className="text-muted-foreground text-sm">Updated {updatedLabel}</span>}
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        className="bg-surface-2 hover:bg-brand-tint hover:text-brand-text min-h-10 rounded-full px-4 text-sm font-semibold disabled:opacity-60 focus-visible:shadow-[0_0_0_3px_var(--brand-tint)] focus-visible:outline-none"
      >
        {busy ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}

/** Day label for a trend axis: "26 Oct", in the day's own calendar (no time zone shift). */
export function dayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
