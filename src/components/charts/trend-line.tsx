"use client";

import { type PaletteIndex, useChartPalette } from "./chart-palette";
import { ChartDataTable } from "./chart-data-table";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * A day-over-day trend line for the admin portal — "is this getting better or
 * worse?", which no single number on a stat tile can answer.
 *
 * Colours come from the one admin palette (chart-palette.ts), per theme; a
 * series names its palette slot, never a hex value. `dashed` is the non-colour
 * channel that separates two series, and every chart carries its numbers as a
 * hidden table for screen readers (ChartDataTable).
 *
 * Deliberately single-axis: two measures on different scales get two charts,
 * never a second y-axis.
 */

export interface TrendSeries {
  name: string;
  /** Slot in the admin chart palette (0 = blue, 1 = orange, 2 = cyan, …). */
  slot: PaletteIndex;
  /** Renders the line dashed — the non-color channel that separates series. */
  dashed?: boolean;
  /** One value per point; `null` plots a gap rather than a dishonest zero. */
  values: Array<number | null>;
}

export interface TrendPoint {
  /**
   * Unique x-axis key. A recharts category axis with duplicate values silently
   * drops the connecting line and stops the tooltip activating, so this must
   * never be the (repeatable) tick label.
   */
  key: string;
  /** Axis tick label, e.g. "10 Aug". */
  label: string;
  /** Optional extra tooltip line — the counts behind a rate, for instance. */
  note?: string;
}

interface TooltipRow {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
}

export function TrendLine({
  points,
  series,
  height = 200,
  formatValue = (v) => v.toLocaleString(),
  yWidth = 44,
  allowDecimals = false,
  caption = "Trend",
}: {
  points: TrendPoint[];
  series: TrendSeries[];
  height?: number;
  formatValue?: (value: number) => string;
  /** Widen when the y ticks are long ("1,200 ms"). */
  yWidth?: number;
  allowDecimals?: boolean;
  /** Names the table view for screen readers. */
  caption?: string;
}) {
  const palette = useChartPalette();
  const colorOf = (s: TrendSeries) => palette[s.slot];
  const data = points.map((point, i) => {
    const row: Record<string, string | number | null | undefined> = {
      x: point.key,
      label: point.label,
      note: point.note,
    };
    for (const s of series) row[s.name] = s.values[i];
    return row;
  });

  // Markers are specced at r >= 4, which stops being legible once the points
  // outnumber the pixels between them — at 90 days they merge into a rope
  // along the line. Past a month, drop them and let the hover marker carry
  // point-level reading; shrinking them instead would break the spec floor.
  const showDots = points.length <= 31;

  const labelByX = new Map(data.map((r) => [r.x as string, r.label as string]));
  const noteByX = new Map(data.map((r) => [r.x as string, r.note as string | undefined]));
  const dashedByName = new Map(series.map((s) => [s.name, s.dashed ?? false]));

  return (
    <ChartDataTable
      caption={caption}
      columns={["Day", ...series.map((s) => s.name)]}
      rows={points.map((p, i) => [
        p.label,
        ...series.map((s) => {
          const v = s.values[i];
          return v === null || v === undefined ? null : formatValue(v);
        }),
      ])}
    >
    <div>
      {/* A legend is always present for two or more series, so identity never
          rests on color alone. One series needs none — the heading names it. */}
      {series.length > 1 && (
        <ul className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map((s) => (
            <li key={s.name} className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <SeriesKey color={colorOf(s)} dashed={s.dashed} />
              {s.name}
            </li>
          ))}
        </ul>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="x"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            padding={{ left: 12, right: 12 }}
            // Drops ticks rather than letting them collide on a narrow card.
            minTickGap={24}
            tickFormatter={(x: string) => labelByX.get(x) ?? ""}
          />
          <YAxis
            // Counts and durations both start at zero: a truncated baseline
            // turns a rounding difference into a cliff.
            domain={[0, "auto"]}
            allowDecimals={allowDecimals}
            tickFormatter={formatValue}
            tickLine={false}
            axisLine={false}
            width={yWidth}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            // Vertical guide so hovering anywhere in a day's column snaps to
            // it — no need to land on the small dot exactly.
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const x = String(label);
              const note = noteByX.get(x);
              return (
                <div className="border-line bg-popover text-popover-foreground rounded-xl border p-2.5 text-xs shadow-md">
                  <p className="font-semibold">{labelByX.get(x) ?? x}</p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {(payload as readonly TooltipRow[]).map((row) => (
                      <li key={String(row.dataKey)} className="flex items-center gap-1.5">
                        <SeriesKey
                          color={row.color ?? "var(--border)"}
                          dashed={dashedByName.get(String(row.dataKey))}
                        />
                        <span className="text-muted-foreground">{row.name}</span>
                        <span className="ml-auto pl-3 font-semibold tabular-nums">
                          {row.value === null || row.value === undefined
                            ? "—"
                            : formatValue(Number(row.value))}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {note && <p className="text-muted-foreground mt-1.5">{note}</p>}
                </div>
              );
            }}
          />
          {series.map((s) => (
            <Line
              key={s.name}
              type="linear"
              name={s.name}
              dataKey={s.name}
              stroke={colorOf(s)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.dashed ? "5 5" : undefined}
              // Nulls plot as a break in the line, not a drop to zero.
              connectNulls={false}
              // Marker spec: filled with the series color + a 2px surface ring
              // so it stays legible where it crosses the line. The ring is
              // `--card` because every caller sits on a Card, and in dark mode
              // `--card` and `--surface` are different colors — a ring in the
              // wrong one reads as an outline rather than as a gap.
              dot={showDots ? { r: 4, fill: colorOf(s), stroke: "var(--card)", strokeWidth: 2 } : false}
              activeDot={{ r: 6, fill: colorOf(s), stroke: "var(--card)", strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
    </ChartDataTable>
  );
}

/** The line-key that carries series identity beside text — text itself never
 *  wears the data color. */
function SeriesKey({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" aria-hidden className="shrink-0">
      <line
        x1="1"
        y1="4"
        x2="13"
        y2="4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={dashed ? "4 3" : undefined}
      />
    </svg>
  );
}
