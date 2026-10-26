"use client";

import { useState } from "react";

/**
 * Every admin chart can be read as a table. Three of the palette's light-mode
 * steps (aqua, yellow, magenta) are below 3:1 against white, so colour alone
 * can never be the only way to read a value — the table is the fallback that
 * does not depend on it, and it is what a screen reader gets.
 */
export function ChartTableToggle({
  caption,
  columns,
  rows,
  children,
}: {
  /** What the table is, for screen readers ("Pico conversations per day"). */
  caption: string;
  columns: string[];
  rows: (string | number | null)[][];
  children: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);

  return (
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          aria-pressed={asTable}
          onClick={() => setAsTable((v) => !v)}
          className="text-brand -my-1 rounded-full px-2 py-1 text-xs font-semibold hover:underline focus-visible:shadow-[0_0_0_3px_var(--brand-tint)] focus-visible:outline-none"
        >
          {asTable ? "View as chart" : "View as table"}
        </button>
      </div>
      {asTable ? (
        <div className="mt-2 max-h-72 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={`border-line text-muted-foreground border-b px-2 py-1.5 text-xs font-semibold ${i === 0 ? "text-left" : "text-right"}`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={`border-line border-b px-2 py-1.5 ${i === 0 ? "text-left" : "text-right tabular-nums"}`}
                    >
                      {cell === null ? "—" : typeof cell === "number" ? cell.toLocaleString() : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
