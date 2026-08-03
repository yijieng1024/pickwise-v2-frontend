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
  /** One price per label (parallel to `months`). */
  prices: number[];
}

const formatRM = (value: number) => `RM ${value.toLocaleString()}`;

const formatFullDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function PriceHistory({
  months,
  series,
  dates,
  height = 250,
}: {
  months: string[];
  series: PriceSeries[];
  /** Optional ISO timestamps parallel to `months`; used as the unique x-axis
   * key and for the exact-date tooltip. */
  dates?: string[];
  height?: number;
}) {
  // The x-axis key MUST be unique per record. The month label can repeat (e.g.
  // two edits in the same month -> "Jun 26" twice), and a recharts category
  // axis with duplicate values silently drops the connecting line AND stops
  // the tooltip from activating (it can't map a hover to a unique category).
  // So key on the unique ISO timestamp (fallback: row index) and surface the
  // month label through tickFormatter instead.
  const data = months.map((month, i) => {
    const row: Record<string, string | number | undefined> = {
      x: dates?.[i] ?? String(i),
      month,
      date: dates?.[i],
    };
    for (const s of series) row[s.name] = s.prices[i];
    return row;
  });
  const monthByX = new Map(data.map((r) => [r.x as string, r.month as string]));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="x"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          // Inset so the first/last points aren't flush against the edges.
          padding={{ left: 12, right: 24 }}
          tickFormatter={(x: string) => monthByX.get(x) ?? ""}
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
          // Vertical guide so hovering anywhere in a point's column snaps to
          // it and shows details — no need to land on the small dot exactly.
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          formatter={(value) => formatRM(Number(value))}
          labelFormatter={(label, payload) => {
            const row = payload?.[0]?.payload as { date?: string; month?: string } | undefined;
            return row?.date ? formatFullDate(row.date) : (row?.month ?? label);
          }}
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
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.dashed ? "5 5" : undefined}
            // Marker spec: filled with the series color + a 2px surface-color
            // ring so it stays legible where it crosses the line.
            dot={{ r: 4, fill: s.color, stroke: "var(--background)", strokeWidth: 2 }}
            // Grows and re-rings on hover so the inspected point is obvious
            // while its details show in the tooltip.
            activeDot={{ r: 6, fill: s.color, stroke: "var(--background)", strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
