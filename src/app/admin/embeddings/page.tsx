"use client";

import { useState } from "react";
import { PlayCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { generateAllEmbeddings } from "@/lib/api/admin/embeddings";
import { ApiError } from "@/lib/api/client";
import { useEmbeddingStatus } from "@/lib/admin/use-embedding-status";
import { useJob } from "@/lib/admin/use-job";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminJobPanel } from "../admin-job-panel";
import { AdminJobTrendCard } from "../admin-job-trend";
import { AdminPageHeader } from "../admin-page-header";
import { CoverageHistoryCard } from "./coverage-history-card";

export default function AdminEmbeddingsPage() {
  const { token } = useAuth();
  const [starting, setStarting] = useState(false);
  const { status, loadError, refresh } = useEmbeddingStatus();
  // A finished run changes both the coverage bar and the run history, so it
  // has to refresh the chart too — the job row only lands once it stops.
  const [trendTick, setTrendTick] = useState(0);
  const job = useJob(token, () => {
    refresh();
    setTrendTick((t) => t + 1);
  });

  async function runGenerateAll() {
    if (!token) return;
    setStarting(true);
    try {
      const accepted = await generateAllEmbeddings(token);
      job.start(accepted);
      toast.success(accepted.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start embedding generation.");
    } finally {
      setStarting(false);
    }
  }

  const busy = starting || job.isRunning;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Embeddings"
        description="Vector coverage for hybrid search and recommendations. A laptop with no embedding is invisible to Pico, however good its specs are."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total laptops" value={status?.total_laptops} error={loadError} />
        <StatTile label="Embedded" value={status?.embedded} error={loadError} />
        <StatTile
          label="Missing"
          value={status?.missing}
          error={loadError}
          tone={status && status.missing > 0 ? "warn" : undefined}
        />
      </div>

      {/* Overall coverage, which the job cannot answer — it only knows about
          its own run, not work done before it. */}
      <Card className="gap-0 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold">Search coverage</span>
          <span className="text-muted-foreground text-[13px] tabular-nums">
            {status ? `${status.coverage_pct}%` : "—"}
          </span>
        </div>
        <Progress
          value={status?.coverage_pct ?? null}
          className="mt-2.5"
          aria-label="Share of laptops that are searchable"
        />
        {status && status.missing > 0 && !job.isRunning && (
          <p className="text-muted-foreground mt-2.5 text-[12.5px] leading-relaxed">
            <strong className="text-foreground font-semibold tabular-nums">
              {status.missing.toLocaleString()}
            </strong>{" "}
            laptop{status.missing === 1 ? "" : "s"} cannot be found by the chatbot yet.
          </p>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runGenerateAll} disabled={busy}>
          {busy ? <Spinner data-icon="inline-start" /> : <PlayCircle data-icon="inline-start" />}
          {starting ? "Starting…" : job.isRunning ? "Generating…" : "Generate all"}
        </Button>
        <Button variant="outline" onClick={refresh} disabled={job.isRunning}>
          <RefreshCw data-icon="inline-start" />
          Refresh status
        </Button>
      </div>

      {job.accepted && (
        <AdminJobPanel accepted={job.accepted} job={job.job} pollError={job.pollError} />
      )}

      <CoverageHistoryCard reloadTick={trendTick} />

      {/* Coverage says where the catalog stands; this says how it got there.
          A run that dies a third of the way in leaves coverage looking merely
          low rather than interrupted, and a failed count that climbs run after
          run is the Gemini rate limit biting — neither is visible in a
          percentage. Charted per day like every other admin trend, though
          embedding runs are sporadic enough that most days will read zero. */}
      <AdminJobTrendCard
        jobType="embeddings.generate_all"
        title="Laptops embedded per run day"
        description="Only embedding runs. Failures are usually the embedding API's rate limit, and those laptops stay unsearchable until a later run picks them up."
        emptyTitle="No embedding runs recorded yet"
        emptyDescription="Start one above and its history will build here."
        reloadTick={trendTick}
      />

      <p className="text-muted-foreground text-[12px] leading-relaxed">
        The run continues on the server and is recorded as a job, so leaving this page is safe —
        reopen it, or the{" "}
        <span className="text-foreground font-medium">Jobs</span> screen, to pick the run back up.
        Re-run this after importing laptops, and in full whenever the embedding model changes, or
        search returns nonsense with no error.
      </p>
    </div>
  );
}

function StatTile({
  label,
  value,
  error,
  tone,
}: {
  label: string;
  value: number | undefined;
  error: boolean;
  tone?: "warn";
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-3">
      <div className={cn("text-xl font-bold tabular-nums", tone === "warn" && "text-warning")}>
        {error ? (
          "—"
        ) : value === undefined ? (
          <Spinner className="size-4 text-muted-foreground" />
        ) : (
          value.toLocaleString()
        )}
      </div>
      <div className="text-[12.5px] text-muted-foreground">{label}</div>
    </div>
  );
}
