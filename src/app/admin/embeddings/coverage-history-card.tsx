"use client";

import { useEffect, useMemo, useState } from "react";

import { TREND_COLORS, TrendLine } from "@/components/charts/trend-line";
import { Card } from "@/components/ui/card";
import { type CoverageHistoryDay, getCoverageHistory } from "@/lib/api/admin/embeddings";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { formatDayKey } from "@/lib/daily-series";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import {
  AdminTrendRange,
  DEFAULT_TREND_RANGE,
  TREND_RANGES,
  type TrendRange,
} from "../admin-trend-range";

/**
 * Search coverage against catalog size, day by day — the shape behind the
 * single percentage in the coverage meter above it.
 *
 * The distance between the two lines is the missing count, so *where* it opens
 * is the reading: a gap only at the right-hand edge is the ordinary lag after a
 * scrape, while one that opens further back is a backlog no run ever cleared.
 * When coverage is healthy the lines sit on top of each other — that overlap is
 * the good state, not a rendering fault.
 *
 * Unlike the job-history charts this arrives pre-bucketed (the server has to do
 * it — cumulative totals need every laptop row, not a page of them), so the days
 * are used as given rather than re-bucketed locally.
 */

// Fetched once at the longest range the control offers; a shorter range slices
// the tail off what is already held. Cumulative values are absolute, so a slice
// is still correct — no refetch when the range changes.
const HISTORY_WINDOW = Math.max(...TREND_RANGES);

export function CoverageHistoryCard({ reloadTick = 0 }: { reloadTick?: number }) {
  const { token } = useAuth();
  const [history, setHistory] = useState<CoverageHistoryDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TrendRange>(DEFAULT_TREND_RANGE);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    getCoverageHistory(token, HISTORY_WINDOW)
      .then((res) => {
        if (cancelled) return;
        setHistory(res.days);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load coverage history.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, reloadTick, retryTick]);

  const trend = useMemo(() => {
    if (!history || history.length === 0) return null;

    const days = history.slice(-range);
    return {
      points: days.map((d) => {
        const missing = d.catalog_total - d.embedded_total;
        return {
          key: d.date,
          label: formatDayKey(d.date),
          note:
            missing === 0
              ? "Every laptop searchable"
              : `${missing.toLocaleString()} not searchable`,
        };
      }),
      catalog: days.map((d) => d.catalog_total),
      embedded: days.map((d) => d.embedded_total),
    };
  }, [history, range]);

  return (
    <Card className="gap-0 p-4">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold">Coverage against catalog size</h2>
          <p className="text-muted-foreground mt-0.5 text-[12px] leading-snug">
            Laptops counted from the day they entered the catalog. The distance between the lines
            is the missing count — a gap only at the right is the usual lag after a scrape, one
            that opens further back is a backlog no run cleared.
          </p>
        </div>
        <AdminTrendRange
          value={range}
          onChange={setRange}
          label="Coverage history: timeframe"
        />
      </div>

      {error ? (
        <AdminErrorState message={error} onRetry={() => setRetryTick((t) => t + 1)} />
      ) : history === null ? (
        <AdminLoadingState />
      ) : trend === null ? (
        <AdminEmptyState
          title="No catalog history yet"
          description="This fills in once the catalog has laptops in it."
        />
      ) : (
        <TrendLine
          points={trend.points}
          series={[
            { name: "In catalog", color: TREND_COLORS[0], values: trend.catalog },
            { name: "Embedded", color: TREND_COLORS[1], dashed: true, values: trend.embedded },
          ]}
          yWidth={52}
        />
      )}
    </Card>
  );
}
