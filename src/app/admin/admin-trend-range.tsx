"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Timeframe control shared by every admin trend chart.
 *
 * Changing it never refetches: each screen pulls one capped window of rows and
 * the range only re-buckets what is already in memory, so switching is instant.
 * The consequence is that a longer range can reach past the fetched window —
 * handled by shortening the axis to the oldest row actually held rather than
 * drawing zeros, with the chart caption saying so (see `daySpanToToday`).
 */

export const TREND_RANGES = [7, 14, 30, 90] as const;

export type TrendRange = (typeof TREND_RANGES)[number];

export const DEFAULT_TREND_RANGE: TrendRange = 14;

const RANGE_OPTIONS = TREND_RANGES.map((days) => ({
  value: String(days),
  label: `Last ${days} days`,
}));

export function AdminTrendRange({
  value,
  onChange,
  label = "Chart timeframe",
}: {
  value: TrendRange;
  onChange: (value: TrendRange) => void;
  /** Accessible name — override when a screen carries more than one control. */
  label?: string;
}) {
  return (
    <Select
      items={RANGE_OPTIONS}
      value={String(value)}
      onValueChange={(v) => onChange(Number(v) as TrendRange)}
    >
      <SelectTrigger size="sm" className="w-36" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {RANGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
