"use client";

import { useEffect, useMemo, useState } from "react";

import { TREND_COLORS, TrendLine } from "@/components/charts/trend-line";
import { Card } from "@/components/ui/card";
import { type Job, listJobs } from "@/lib/api/admin/jobs";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { bucketByDay, daySpanToToday, parseUtc } from "@/lib/daily-series";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "./admin-states";
import { AdminTrendRange, DEFAULT_TREND_RANGE, type TrendRange } from "./admin-trend-range";

/**
 * Throughput of background runs as a day-over-day line — shared by /admin/jobs
 * (every job type) and /admin/embeddings (just the embedding runs).
 *
 * It charts *items*, not runs: one run can carry 1500 of them, so a run count
 * says nothing about how much actually moved or how much of it failed.
 *
 * The window is fixed and the range control only re-buckets it, so the two
 * never disagree — but a range longer than the window would draw zeros for
 * days the fetch never reached, so the axis stops at the oldest run held and
 * the caption admits it.
 */

const TREND_WINDOW = 200;

export function AdminJobTrendCard({
  jobType,
  title,
  description,
  emptyTitle,
  emptyDescription,
  reloadTick = 0,
}: {
  /** Omit to chart every job type. */
  jobType?: string;
  title: string;
  /** Sentence appended after the auto-generated window caption. */
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  /** Bump to refetch — a Refresh button, or a run finishing. */
  reloadTick?: number;
}) {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TrendRange>(DEFAULT_TREND_RANGE);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    listJobs(token, { limit: TREND_WINDOW, jobType })
      .then((res) => {
        if (cancelled) return;
        setJobs(res.items);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load throughput.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, jobType, reloadTick, retryTick]);

  const trend = useMemo(() => {
    if (!jobs || jobs.length === 0) return null;

    // Never plot past the oldest run the window reached, or the days it did
    // not cover draw as zero throughput instead of as unknown. And when the
    // window filled up before reaching the end of history, its oldest day holds
    // only the runs that fit — a partial count that would plot as a real dip,
    // so drop that day too.
    const oldestMs = Math.min(...jobs.map((j) => parseUtc(j.created_at).getTime()));
    const windowDays = daySpanToToday(new Date(oldestMs));
    const partialOldest = total > jobs.length;
    const days = Math.min(range, partialOldest ? Math.max(1, windowDays - 1) : windowDays);
    const buckets = bucketByDay(jobs, (j) => j.created_at, days);

    const rows = buckets.map((b) => ({
      key: b.date,
      label: b.label,
      runs: b.items.length,
      succeeded: b.items.reduce((sum, j) => sum + j.succeeded_count, 0),
      failed: b.items.reduce((sum, j) => sum + j.failed_count, 0),
    }));

    return {
      points: rows.map((r) => ({
        key: r.key,
        label: r.label,
        note: r.runs === 0 ? "No runs this day" : `${r.runs} run${r.runs === 1 ? "" : "s"} started`,
      })),
      succeeded: rows.map((r) => r.succeeded),
      failed: rows.map((r) => r.failed),
      days,
      // Short because the window ran out, not because the range is short.
      capped: days < range,
    };
  }, [jobs, total, range]);

  const caption = trend
    ? `Last ${trend.days} day${trend.days === 1 ? "" : "s"}${
        trend.capped
          ? `, from the most recent ${TREND_WINDOW} runs — older history isn't charted.`
          : ", every run on record."
      }`
    : null;

  return (
    <Card className="gap-0 p-4">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold">{title}</h2>
          <p className="text-muted-foreground mt-0.5 text-[12px] leading-snug">
            {caption ? `${caption} ` : ""}
            {description}
          </p>
        </div>
        <AdminTrendRange value={range} onChange={setRange} label={`${title}: timeframe`} />
      </div>

      {error ? (
        <AdminErrorState message={error} onRetry={() => setRetryTick((t) => t + 1)} />
      ) : jobs === null ? (
        <AdminLoadingState />
      ) : trend === null ? (
        <AdminEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <TrendLine
          points={trend.points}
          series={[
            { name: "Succeeded", color: TREND_COLORS[0], values: trend.succeeded },
            { name: "Failed", color: TREND_COLORS[1], dashed: true, values: trend.failed },
          ]}
          yWidth={52}
        />
      )}
    </Card>
  );
}
