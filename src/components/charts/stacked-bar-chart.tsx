"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { type PaletteIndex, useChartPalette } from "./chart-palette";
import { ChartTableToggle } from "./chart-table-toggle";
import type { TrendPoint } from "./trend-line";

export interface StackSeries {
  name: string;
  slot: PaletteIndex;
  values: number[];
}

/**
 * Per-day bars stacked by series (e.g. jobs that ran clean vs jobs with
 * failures). One axis, a legend because there is more than one series, the
 * exact numbers in the tooltip, and a table view.
 */
export function StackedBarChart({
  points,
  series,
  height = 200,
  caption = "Per day",
}: {
  points: TrendPoint[];
  series: StackSeries[];
  height?: number;
  caption?: string;
}) {
  const palette = useChartPalette();
  const data = points.map((p, i) => {
    const row: Record<string, string | number> = { x: p.key, label: p.label };
    for (const s of series) row[s.name] = s.values[i] ?? 0;
    return row;
  });
  const labelByX = new Map(points.map((p) => [p.key, p.label]));

  return (
    <ChartTableToggle
      caption={caption}
      columns={["Day", ...series.map((s) => s.name)]}
      rows={points.map((p, i) => [p.label, ...series.map((s) => s.values[i] ?? 0)])}
    >
      <ul className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <li key={s.name} className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: palette[s.slot] }} />
            {s.name}
          </li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barCategoryGap="25%">
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="x"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(x: string) => labelByX.get(x) ?? ""}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={32}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
            labelFormatter={(x) => labelByX.get(String(x)) ?? String(x)}
            formatter={(value, name) => [Number(value).toLocaleString(), String(name)]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              stackId="day"
              fill={palette[s.slot]}
              maxBarSize={24}
              // Round only the top of the stack.
              radius={i === series.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartTableToggle>
  );
}
