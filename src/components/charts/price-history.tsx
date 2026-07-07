"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PriceSeries {
  name: string;
  color: string;
  dashed?: boolean;
  /** One price per month label */
  prices: number[];
}

const formatRM = (value: number) => `RM ${value.toLocaleString()}`;

export function PriceHistory({
  months,
  series,
  height = 250,
}: {
  months: string[];
  series: PriceSeries[];
  height?: number;
}) {
  const data = months.map((month, i) => {
    const row: Record<string, string | number> = { month };
    for (const s of series) row[s.name] = s.prices[i];
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
        <CartesianGrid
          strokeDasharray="5 5"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          domain={["dataMin - 200", "dataMax + 200"]}
          tickFormatter={formatRM}
          tickLine={false}
          axisLine={false}
          width={72}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => formatRM(Number(value))}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
        />
        {series.map((s) => (
          <Line
            key={s.name}
            type="monotone"
            name={s.name}
            dataKey={s.name}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "5 5" : undefined}
            dot={{ r: 4, fill: "var(--background)", stroke: s.color }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
