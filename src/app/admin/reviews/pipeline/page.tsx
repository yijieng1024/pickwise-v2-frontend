"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { timeAgo } from "@/lib/admin/freshness";
import { useJob } from "@/lib/admin/use-job";
import type { JobAccepted } from "@/lib/api/admin/jobs";
import {
  type PipelineStatus,
  getPipelineStatus,
  ingestBulk,
  processBulk,
  rematchPending,
  retryTranscripts,
} from "@/lib/api/admin/reviews";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminJobPanel } from "../../admin-job-panel";
import { AdminPageHeader } from "../../admin-page-header";
import { SectionBoundary } from "../../admin-section-boundary";
import { AdminErrorState, AdminLoadingState } from "../../admin-states";
import { RefreshAction } from "../../admin-summary-ui";
import { ClaimsCard, CoverageCard, Funnel, PauseBanner, QuotaCard, RecentRunsCard } from "./pipeline-sections";
import { type CostRow, RunConfirmDialog } from "./run-confirm-dialog";

type Run = "ingest" | "rematch" | "retry" | "process";

/** discovery returns the top 5 videos per channel per family search. */
const VIDEOS_PER_CHANNEL = 5;
/** The backend's default pause between transcript fetches, plus the fetch. */
const SECONDS_PER_TRANSCRIPT = 3;
/** 4 s inter-request delay plus one Gemma call and one embedding per window. */
const SECONDS_PER_WINDOW = 7;

function duration(seconds: number): string {
  if (seconds < 90) return `about ${Math.max(1, Math.round(seconds))} s`;
  const mins = Math.round(seconds / 60);
  return mins < 90 ? `about ${mins} min` : `about ${(mins / 60).toFixed(1)} h`;
}

/**
 * Where are the reviews, where are they stuck and why, what do I do next?
 * One request (GET /reviews/pipeline-status). Every run is a background job:
 * it is confirmed with its estimated cost, then followed in the job panel.
 */
export default function ReviewPipelinePage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  // The reload that last finished; loading while it trails reloadTick.
  const [loadedTick, setLoadedTick] = useState(-1);
  const loading = loadedTick !== reloadTick;
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [, setClock] = useState(0);

  const [confirm, setConfirm] = useState<Run | null>(null);
  const [starting, setStarting] = useState(false);
  const [ingestBatch, setIngestBatch] = useState(5);
  const [skipCovered, setSkipCovered] = useState(true);
  const [retryBatch, setRetryBatch] = useState(20);
  const [processBatch, setProcessBatch] = useState(5);
  const job = useJob(token, () => setReloadTick((t) => t + 1));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getPipelineStatus(token)
      .then((s) => {
        if (cancelled) return;
        setStatus(s);
        setError(null);
        setLoadedAt(new Date().toISOString());
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load the pipeline.");
      })
      .finally(() => {
        if (!cancelled) setLoadedTick(reloadTick);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  useEffect(() => {
    const timer = setInterval(() => setClock((c) => c + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function start(run: Run) {
    if (!token) return;
    setStarting(true);
    try {
      let accepted: JobAccepted;
      if (run === "ingest") accepted = await ingestBulk(token, { limit: ingestBatch, skipCovered });
      else if (run === "rematch") accepted = await rematchPending(token);
      else if (run === "retry") accepted = await retryTranscripts(token, retryBatch);
      else accepted = await processBulk(token, processBatch);
      job.start(accepted);
      setConfirm(null);
    } catch (err) {
      // 409 job_running carries the running job's id; the Jobs page shows it.
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't start the run.",
        err instanceof ApiError && err.code === "job_running"
          ? { action: { label: "Open Jobs", onClick: () => window.location.assign("/admin/jobs") } }
          : undefined,
      );
    } finally {
      setStarting(false);
    }
  }

  const busy = job.isRunning || starting;
  // A fresh load gives a failed section another try.
  const resetKey = loadedAt ?? undefined;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Review Pipeline"
        description="Where the YouTube reviews are, where they're stuck and why, and what to run next."
        action={
          <RefreshAction
            updatedLabel={loadedAt ? timeAgo(loadedAt) : null}
            onRefresh={() => setReloadTick((t) => t + 1)}
            busy={loading}
          />
        }
      />

      {error && !status ? (
        <Card>
          <AdminErrorState message={error} onRetry={() => setReloadTick((t) => t + 1)} />
        </Card>
      ) : !status ? (
        <Card>
          <AdminLoadingState />
        </Card>
      ) : (
        <>
          {/* One boundary per section: a section whose data is missing or
              throws shows its own error card; the others still render. */}
          <SectionBoundary name="Processing status" resetKey={resetKey}>
            <PauseBanner status={status} token={token} onSaved={() => setReloadTick((t) => t + 1)} />
          </SectionBoundary>

          {job.accepted && <AdminJobPanel accepted={job.accepted} job={job.job} pollError={job.pollError} />}

          <SectionBoundary name="Pipeline" resetKey={resetKey}>
            <Funnel
              status={status}
              actions={{
                found: (
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => setConfirm("ingest")} disabled={busy}>
                      Run ingest
                    </Button>
                    <Button variant="outline" onClick={() => setConfirm("rematch")} disabled={busy}>
                      Rematch pending
                    </Button>
                  </div>
                ),
                transcript: (
                  <Button onClick={() => setConfirm("retry")} disabled={busy}>
                    Retry transcripts
                  </Button>
                ),
                linked: (
                  <Button variant="outline" render={<Link href="/admin/reviews/link" />} nativeButton={false}>
                    Open Link Reviews
                  </Button>
                ),
                processed: (
                  <div className="flex flex-col gap-1.5">
                    <Button onClick={() => setConfirm("process")} disabled={busy || status.process.paused}>
                      Run processing
                    </Button>
                    {status.process.paused && <p className="text-muted-foreground text-xs">Paused, see above</p>}
                  </div>
                ),
              }}
            />
          </SectionBoundary>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionBoundary name="Claims" resetKey={resetKey}>
              <ClaimsCard status={status} />
            </SectionBoundary>
            <SectionBoundary name="Coverage" resetKey={resetKey}>
              <CoverageCard status={status} />
            </SectionBoundary>
            <SectionBoundary name="Quota today" resetKey={resetKey}>
              <QuotaCard status={status} />
            </SectionBoundary>
            <SectionBoundary name="Recent runs" resetKey={resetKey}>
              <RecentRunsCard status={status} />
            </SectionBoundary>
          </div>

          {/* The cost estimates read quota and funnel fields; if those are
              missing, the dialogs fail on their own, not the page. */}
          <SectionBoundary name="Run confirmations" resetKey={resetKey}>
            <RunConfirmDialogs
              status={status}
              confirm={confirm}
              setConfirm={setConfirm}
              starting={starting}
              onStart={start}
              ingest={{ batch: ingestBatch, setBatch: setIngestBatch, skipCovered, setSkipCovered }}
              retry={{ batch: retryBatch, setBatch: setRetryBatch }}
              process={{ batch: processBatch, setBatch: setProcessBatch }}
            />
          </SectionBoundary>
        </>
      )}
    </div>
  );
}

function RunConfirmDialogs({
  status,
  confirm,
  setConfirm,
  starting,
  onStart,
  ingest,
  retry,
  process,
}: {
  status: PipelineStatus;
  confirm: Run | null;
  setConfirm: (run: Run | null) => void;
  starting: boolean;
  onStart: (run: Run) => void;
  ingest: { batch: number; setBatch: (n: number) => void; skipCovered: boolean; setSkipCovered: (v: boolean) => void };
  retry: { batch: number; setBatch: (n: number) => void };
  process: { batch: number; setBatch: (n: number) => void };
}) {
  const close = (open: boolean) => !open && setConfirm(null);
  const stuck = (step: string) => status.funnel.find((s) => s.step === step)?.stuck ?? {};

  // Ingest: one YouTube search per family per active channel, 100 units each.
  const i = status.ingest;
  const available = ingest.skipCovered ? i.families_remaining : i.families_total;
  const families = Math.min(ingest.batch, available);
  const units = families * i.quota_units_per_family;
  const ingestRows: CostRow[] = [
    {
      label: "YouTube searches",
      value: `${families} × ${i.active_channels} channels × 100 = ${units.toLocaleString()} units`,
      warn: units > i.daily_quota_units,
    },
    { label: "Daily YouTube quota", value: `${i.daily_quota_units.toLocaleString()} units` },
    { label: "Transcripts to fetch", value: `up to ${(families * i.active_channels * VIDEOS_PER_CHANNEL).toLocaleString()}` },
    { label: "Gemini / Gemma calls", value: "none" },
    ...(ingest.skipCovered ? [{ label: "Families skipped (already covered)", value: i.families_covered.toLocaleString() }] : []),
  ];

  // Retry: zero quota, rate-limited by YouTube.
  const t = stuck("transcript");
  const retryable = (t.transcript_retryable ?? 0) + (t.transcript_unknown ?? 0) + (t.transcript_deferred ?? 0);
  const fetches = Math.min(retry.batch, retryable);
  const retryRows: CostRow[] = [
    { label: "Transcripts to fetch", value: `up to ${fetches.toLocaleString()}` },
    { label: "YouTube quota", value: "none" },
    { label: "Time", value: duration(fetches * SECONDS_PER_TRANSCRIPT) },
    { label: "Stops early", value: "after 3 blocks in a row" },
  ];

  // Processing: one Gemma call and one embedding per window left.
  const p = status.process;
  const reviews = Math.min(process.batch, p.candidates);
  const windows = p.candidate_windows.slice(0, reviews).reduce((a, b) => a + b, 0);
  const primary = status.quota.models.find((m) => m.position === 0);
  const emb = status.quota.embedding;
  const processRows: CostRow[] = [
    { label: "Reviews", value: `${reviews} of ${p.candidates} waiting` },
    {
      label: `Gemma calls (${primary?.model ?? "primary"})`,
      value: `≈ ${windows.toLocaleString()}${primary?.remaining != null ? ` of ${primary.remaining.toLocaleString()} left` : ""}`,
      warn: primary?.remaining != null && windows > primary.remaining,
    },
    {
      label: "Embedding calls",
      value: `≈ ${windows.toLocaleString()}${emb.remaining != null ? ` of ${emb.remaining.toLocaleString()} left` : ""}`,
      warn: emb.remaining != null && windows > emb.remaining,
    },
    { label: "Time", value: duration(windows * SECONDS_PER_WINDOW) },
  ];

  return (
    <>
      <RunConfirmDialog
        open={confirm === "ingest"}
        onOpenChange={close}
        title={`Run ingest for ${families} famil${families === 1 ? "y" : "ies"}?`}
        description="Finds new review videos and fetches their transcripts. It runs as a job; you can leave this page."
        batch={{ label: "Families", value: ingest.batch, min: 1, max: 20, onChange: ingest.setBatch }}
        extra={
          <Label className="flex items-center gap-2.5 text-sm font-normal">
            <Checkbox checked={ingest.skipCovered} onCheckedChange={(c) => ingest.setSkipCovered(c === true)} />
            Skip families that already have a review
          </Label>
        }
        rows={ingestRows}
        confirmLabel="Run ingest"
        onConfirm={() => onStart("ingest")}
        starting={starting}
      />
      <RunConfirmDialog
        open={confirm === "rematch"}
        onOpenChange={close}
        title="Rematch pending reviews?"
        description="Re-runs automatic matching on every pending review with the current matcher. Reviews a person linked are never touched."
        rows={[
          { label: "Reviews waiting in the link queue", value: status.link.pending_total.toLocaleString() },
          { label: "YouTube / Gemini quota", value: "none" },
        ]}
        confirmLabel="Rematch"
        onConfirm={() => onStart("rematch")}
        starting={starting}
      />
      <RunConfirmDialog
        open={confirm === "retry"}
        onOpenChange={close}
        title="Retry transcripts?"
        description="Re-fetches transcripts that failed for a reason that can recover (a block, a network error), and ones never fetched. It runs as a job."
        batch={{ label: "Videos", value: retry.batch, min: 1, max: 100, onChange: retry.setBatch }}
        rows={retryRows}
        confirmLabel="Retry transcripts"
        onConfirm={() => onStart("retry")}
        starting={starting}
      />
      <RunConfirmDialog
        open={confirm === "process"}
        onOpenChange={close}
        title={`Process ${reviews} review${reviews === 1 ? "" : "s"}?`}
        description="Turns each transcript window into a claim on the live site. It runs as a job; you can leave this page."
        batch={{ label: "Reviews", value: process.batch, min: 1, max: 50, onChange: process.setBatch }}
        rows={processRows}
        confirmLabel="Run processing"
        onConfirm={() => onStart("process")}
        starting={starting}
      />
    </>
  );
}
