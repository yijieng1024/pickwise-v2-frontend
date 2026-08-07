"use client";

import { useState } from "react";
import { CircleAlert, PlayCircle, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { generateAllEmbeddings } from "@/lib/api/admin/embeddings";
import { ApiError } from "@/lib/api/client";
import { useEmbeddingProgress } from "@/lib/admin/use-embedding-progress";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminPageHeader } from "../admin-page-header";

export default function AdminEmbeddingsPage() {
  const { token } = useAuth();
  const [starting, setStarting] = useState(false);
  const progress = useEmbeddingProgress();
  const { status, loadError, isRunning, isDone, isStalled } = progress;

  async function runGenerateAll() {
    if (!token) return;
    setStarting(true);
    try {
      const res = await generateAllEmbeddings(token);
      // Baseline the bar only once the trigger is accepted, so a rejected
      // request doesn't leave a run being followed that never started.
      progress.begin();
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start embedding generation.");
    } finally {
      setStarting(false);
    }
  }

  const busy = starting || isRunning;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Rank & search", "Embeddings"]}
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

      {/* Coverage, always visible — the number that says whether search works. */}
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
        {status && status.missing > 0 && !isRunning && (
          <p className="text-muted-foreground mt-2.5 text-[12.5px] leading-relaxed">
            <strong className="text-foreground font-semibold tabular-nums">
              {status.missing.toLocaleString()}
            </strong>{" "}
            laptop{status.missing === 1 ? "" : "s"} cannot be found by the chatbot yet.
          </p>
        )}
      </Card>

      {/* gap-3 throughout: at gap-2 the 8px between buttons was barely wider
          than the 6px icon-to-label gap inside them, so the pair read as one
          blob. Measured on screen, not assumed. */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Held until the first status lands: the run panel measures from the
            embedded count at trigger time, and without one it would show
            overall coverage as this run's progress. */}
        <Button onClick={runGenerateAll} disabled={busy || !status}>
          {busy ? <Spinner data-icon="inline-start" /> : <PlayCircle data-icon="inline-start" />}
          {starting ? "Starting…" : isRunning ? "Generating…" : "Generate all"}
        </Button>
        <Button variant="outline" onClick={progress.refresh} disabled={isRunning}>
          <RefreshCw data-icon="inline-start" />
          Refresh status
        </Button>
      </div>

      {(isRunning || isDone || isStalled) && <RunPanel progress={progress} />}

      <p className="text-muted-foreground text-[12px] leading-relaxed">
        The run continues on the server, but unlike the scraper and processor it keeps no job
        record — so leaving this page loses the progress view, not the work. Coverage above stays
        accurate either way. Re-run this after importing laptops, and in full whenever the
        embedding model changes, or search returns nonsense with no error.
      </p>
    </div>
  );
}

/**
 * The progress feed itself.
 *
 * Everything here is derived from a count that climbs — there is no server-side
 * progress to read — so it deliberately shows the raw numbers alongside the
 * bar. An estimate that turns out wrong is much easier to forgive when the
 * count it came from is visible next to it.
 */
function RunPanel({ progress }: { progress: ReturnType<typeof useEmbeddingProgress> }) {
  const { isRunning, isDone, isStalled, completed, remaining, fraction, etaSeconds } = progress;

  return (
    <Card
      className={cn(
        "gap-0 p-4",
        isDone && "border-positive/30",
        isStalled && "border-warning/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isRunning && <Spinner className="text-brand size-4" />}
          {isDone && <Search className="text-positive size-4" />}
          {isStalled && <CircleAlert className="text-warning size-4" />}
          <span className="text-[13px] font-semibold">
            {isDone
              ? "Every laptop is searchable"
              : isStalled
                ? "Progress stopped"
                : "Generating embeddings"}
          </span>
        </div>
        {!isRunning && (
          <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={progress.dismiss}>
            <X />
          </Button>
        )}
      </div>

      {!isDone && (
        <Progress
          value={Math.round(fraction * 100)}
          className="mt-3"
          aria-label="Embedding generation progress"
        />
      )}

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[12.5px]">
        <Metric label="Embedded this run" value={completed.toLocaleString()} />
        <Metric label="Remaining" value={remaining.toLocaleString()} />
        {etaSeconds !== null && (
          <Metric label="Roughly" value={`${formatDuration(etaSeconds)} left`} />
        )}
      </div>

      {isStalled && (
        <p className="text-muted-foreground mt-3 text-[12.5px] leading-relaxed">
          The embedded count hasn&apos;t moved in a while and {remaining.toLocaleString()} are
          still missing. The run may have finished early or failed — nothing here can tell the
          difference, because the backend keeps no job record for embeddings. Starting it again
          is safe: laptops that already have an embedding are skipped.
        </p>
      )}

      {isDone && (
        <p className="text-muted-foreground mt-3 text-[12.5px] leading-relaxed">
          Pico can now find every laptop in the catalog. Scores are separate — a laptop with no
          PickScore still shows a blank badge.
        </p>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
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
