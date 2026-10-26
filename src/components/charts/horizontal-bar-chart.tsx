"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { type PaletteIndex, useChartPalette } from "./chart-palette";
import { ChartDataTable } from "./chart-data-table";

export interface HorizontalBarDatum {
  /** Stable identity (e.g. brand id), so React keys never follow the rank. */
  id: string;
  label: string;
  value: number;
  /** Fixed per category (brandSlot), never by rank, so colours don't jump. */
  slot: PaletteIndex;
}

/**
 * One bar per category, largest first. Every bar carries its value as a
 * label: three light-mode palette steps are below 3:1 against white, so the
 * number must not depend on reading the colour.
 */
export function HorizontalBarChart({
  data,
  caption = "Counts",
  valueLabel = "Count",
}: {
  data: HorizontalBarDatum[];
  caption?: string;
  valueLabel?: string;
}) {
  const palette = useChartPalette();
  // 32px per row keeps labels readable on a phone without a scroll.
  const height = Math.max(80, data.length * 32 + 8);

  return (
    <ChartDataTable caption={caption} columns={["", valueLabel]} rows={data.map((d) => [d.label, d.value])}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap="25%">
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={72}
            tick={{ fill: "var(--foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
            formatter={(value) => [Number(value).toLocaleString(), valueLabel]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={18}>
            {data.map((d) => (
              <Cell key={d.id} fill={palette[d.slot]} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value?: React.ReactNode) => Number(value).toLocaleString()}
              style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartDataTable>
  );
}
