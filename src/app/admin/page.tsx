"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/admin/freshness";
import { type DashboardSummary, getDashboardSummary } from "@/lib/api/admin/dashboard";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminPageHeader } from "./admin-page-header";
import { AdminErrorState, AdminLoadingState } from "./admin-states";
import { SectionBoundary } from "./admin-section-boundary";
import { RefreshAction } from "./admin-summary-ui";
import { CatalogCard, Freshness, JobsCard, NeedsAttention, PicoCard, Trends } from "./dashboard-sections";

/** Re-read while a job runs, so its progress bar moves. One request. */
const RUNNING_POLL_MS = 10_000;

/**
 * Is anything broken, does anything need me, is the data fresh? One request
 * (GET /admin/dashboard/summary). The actions that used to live here
 * (Recalculate PickScores, Generate embeddings) moved to their own pages; the
 * freshness rows link there.
 */
export default function AdminDashboardPage() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  // The reload that last finished; loading while it trails reloadTick.
  const [loadedTick, setLoadedTick] = useState(-1);
  const loading = loadedTick !== reloadTick;
  // Re-renders "Updated N min ago" without refetching.
  const [, setClock] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getDashboardSummary(token)
      .then((s) => {
        if (cancelled) return;
        setSummary(s);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load the dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoadedTick(reloadTick);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  const anyRunning = (summary?.jobs.running.length ?? 0) > 0;
  useEffect(() => {
    if (!anyRunning) return;
    const timer = setInterval(() => setReloadTick((t) => t + 1), RUNNING_POLL_MS);
    return () => clearInterval(timer);
  }, [anyRunning]);

  useEffect(() => {
    const timer = setInterval(() => setClock((c) => c + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Dashboard"
        description="What needs you, how fresh the data is, and what's running."
        action={
          <RefreshAction
            updatedLabel={summary ? timeAgo(summary.generated_at) : null}
            onRefresh={() => setReloadTick((t) => t + 1)}
            busy={loading}
          />
        }
      />

      {error && !summary ? (
        <Card>
          <AdminErrorState message={error} onRetry={() => setReloadTick((t) => t + 1)} />
        </Card>
      ) : !summary ? (
        <Card>
          <AdminLoadingState />
        </Card>
      ) : (
        <>
          {/* One boundary per section: a section whose data is missing or
              throws shows its own error card; the others still render. */}
          <SectionBoundary name="Needs attention" resetKey={summary.generated_at}>
            <NeedsAttention summary={summary} />
          </SectionBoundary>
          <SectionBoundary name="Trends" resetKey={summary.generated_at}>
            <Trends summary={summary} />
          </SectionBoundary>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionBoundary name="Data freshness" resetKey={summary.generated_at}>
              <Freshness summary={summary} />
            </SectionBoundary>
            <SectionBoundary name="Jobs" resetKey={summary.generated_at}>
              <JobsCard summary={summary} currentUserId={user?.id ?? null} />
            </SectionBoundary>
            <SectionBoundary name="Catalog" resetKey={summary.generated_at}>
              <CatalogCard summary={summary} />
            </SectionBoundary>
            <SectionBoundary name="Pico" resetKey={summary.generated_at}>
              <PicoCard summary={summary} />
            </SectionBoundary>
          </div>
        </>
      )}
    </div>
  );
}
