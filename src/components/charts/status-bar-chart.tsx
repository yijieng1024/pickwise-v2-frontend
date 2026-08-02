"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface StatusBarDatum {
  label: string;
  value: number;
  color: string;
}

export function StatusBarChart({
  data,
  height = 200,
}: {
  data: StatusBarDatum[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 8 }} barCategoryGap="30%">
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis hide domain={[0, (max: number) => Math.max(max, 1) * 1.15]} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          formatter={(value) => [Number(value).toLocaleString(), "Count"]}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" maxBarSize={24} radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(value?: React.ReactNode) => Number(value).toLocaleString()}
            style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
