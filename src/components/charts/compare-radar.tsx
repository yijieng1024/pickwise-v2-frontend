"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { RADAR_AXES } from "@/lib/laptops";

export interface RadarSeries {
  name: string;
  color: string;
  /** Values in RADAR_AXES order, 0–100 */
  values: readonly number[];
}

export function CompareRadar({
  series,
  height = 360,
}: {
  series: RadarSeries[];
  height?: number;
}) {
  const data = RADAR_AXES.map((axis, i) => {
    const row: Record<string, string | number> = { axis };
    for (const s of series) row[s.name] = s.values[i];
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
        />
        {series.map((s) => (
          <Radar
            key={s.name}
            name={s.name}
            dataKey={s.name}
            stroke={s.color}
            fill={s.color}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{ r: 3, fill: s.color }}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}
