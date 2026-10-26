"use client";

/**
 * Every admin chart carries its numbers as a visually hidden table. The chart
 * itself is a picture to a screen reader; this is what one reads out. Every
 * palette step passes 3:1 on its surface, so sighted readers don't need it.
 */
export function ChartDataTable({
  caption,
  columns,
  rows,
  children,
}: {
  /** What the table is ("Pico conversations per day"). */
  caption: string;
  columns: string[];
  rows: (string | number | null)[][];
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={`${c}-${i}`} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i}>{cell === null ? "—" : typeof cell === "number" ? cell.toLocaleString() : cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
