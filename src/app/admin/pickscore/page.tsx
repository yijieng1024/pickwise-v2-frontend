"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/admin/freshness";
import { type PickScoreSummary, getPickScoreSummary } from "@/lib/api/admin/pickscore";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminPageHeader } from "../admin-page-header";
import { SectionBoundary } from "../admin-section-boundary";
import { AdminErrorState, AdminLoadingState } from "../admin-states";
import { RefreshAction } from "../admin-summary-ui";
import { useRecalculatePickScores } from "../recalculate-pickscores";
import { DistributionCard, ProblemsCard, StatusCard, TopCard, WeightsCard } from "./pickscore-sections";

/**
 * Are the scores right and fresh, and which laptops have a problem? One
 * request (GET /admin/pickscore/summary). Recalculate lives here; the
 * Dashboard's Pick Score rows link to this page.
 */
export default function AdminPickScorePage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<PickScoreSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [loadedTick, setLoadedTick] = useState(-1);
  const loading = loadedTick !== reloadTick;
  const recalculate = useRecalculatePickScores();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getPickScoreSummary(token)
      .then((s) => {
        if (cancelled) return;
        setSummary(s);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load the Pick Score summary.");
      })
      .finally(() => {
        if (!cancelled) setLoadedTick(reloadTick);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Pick Score"
        description="Are the scores right and fresh, and which laptops have a problem?"
        action={
          <RefreshAction
            updatedLabel={summary ? timeAgo(summary.generated_at) : null}
            onRefresh={() => setReloadTick((t) => t + 1)}
            busy={loading}
          />
        }
      />

      {recalculate.panel}

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
          <SectionBoundary name="Status" resetKey={summary.generated_at}>
            <StatusCard summary={summary} action={recalculate.button} />
          </SectionBoundary>
          <SectionBoundary name="Laptops with a problem" resetKey={summary.generated_at}>
            <ProblemsCard summary={summary} />
          </SectionBoundary>
          <SectionBoundary name="Score distribution" resetKey={summary.generated_at}>
            <DistributionCard summary={summary} />
          </SectionBoundary>
          <SectionBoundary name="Top 10" resetKey={summary.generated_at}>
            <TopCard summary={summary} />
          </SectionBoundary>
          <SectionBoundary name="Weights" resetKey={summary.generated_at}>
            <WeightsCard summary={summary} />
          </SectionBoundary>
        </>
      )}
    </div>
  );
}
