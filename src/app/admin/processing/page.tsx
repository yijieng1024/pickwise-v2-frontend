"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayCircle, RotateCcw, Sparkles, Tags } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { categorizeUntagged, processPending, retryFailed } from "@/lib/api/admin/processor";
import {
  type ProcessorModel,
  getProcessorModel,
  setProcessorModel,
} from "@/lib/api/admin/settings";
import { listRawScrapLaptops } from "@/lib/api/admin/scraper";
import { type Job, listJobs } from "@/lib/api/admin/jobs";
import { timeAgo } from "@/lib/admin/freshness";
import { ApiError } from "@/lib/api/client";
import { useJob } from "@/lib/admin/use-job";
import { useAuth } from "@/lib/auth-context";

import { AdminJobPanel } from "../admin-job-panel";
import { AdminPageHeader } from "../admin-page-header";

/** The backend's ceiling per run. Larger batches are rejected outright. */
const MAX_BATCH = 1500;
/**
 * Backend pacing, mirrored here only for the pre-flight estimate. The real
 * number comes back as `estimated_seconds` on the 202 — prefer that once a run
 * starts. Extraction is paced against Gemma's 16K tokens-per-minute budget
 * (not a fixed delay), which works out at ~13s per record.
 */
const SECONDS_PER_RECORD = 13;
/** One-click batch sizes; anything else goes in the custom box. */
const PRESETS = [10, 25, 50, 100];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0
    ? `${hours} hour${hours === 1 ? "" : "s"}`
    : `${hours}h ${rest}m`;
}

export default function AdminProcessingPage() {
  const { token } = useAuth();
  const [limit, setLimit] = useState(100);
  // What the custom box shows while typing, so clearing it doesn't snap to 1.
  const [draft, setDraft] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [failedCount, setFailedCount] = useState<number | null>(null);
  const [startingProcess, setStartingProcess] = useState(false);
  const [startingRetry, setStartingRetry] = useState(false);
  const [model, setModel] = useState<ProcessorModel | null>(null);
  const [savingModel, setSavingModel] = useState(false);
  const [startingTags, setStartingTags] = useState(false);

  const [reloadTick, setReloadTick] = useState(0);
  const [recentRuns, setRecentRuns] = useState<Job[] | null>(null);

  // Two trackers, because the backend happily runs both at once. Refresh the
  // pending count once a processing run stops.
  const processJob = useJob(token, () => setReloadTick((t) => t + 1));

  // The idle panel shows the last few runs instead of an explanation; the
  // page works without them, so a failed fetch just leaves the list out.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listJobs(token, { jobType: "processor.process_pending", limit: 5 })
      .then((res) => !cancelled && setRecentRuns(res.items))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);
  const tagJob = useJob(token);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listRawScrapLaptops(token, { limit: 1, processingStatus: "pending" })
      .then((res) => {
        if (!cancelled) setPendingCount(res.total);
      })
      .catch(() => {
        if (!cancelled) setPendingCount(null);
      });
    listRawScrapLaptops(token, { limit: 1, processingStatus: "failed" })
      .then((res) => {
        if (!cancelled) setFailedCount(res.total);
      })
      .catch(() => {
        if (!cancelled) setFailedCount(null);
      });
    getProcessorModel(token)
      .then((res) => {
        if (!cancelled) setModel(res);
      })
      .catch(() => {
        // The picker just stays hidden: an unreachable settings endpoint must
        // not stop an admin from starting a run on whatever the default is.
        if (!cancelled) setModel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  // The run only ever covers what is actually pending, however large the
  // slider goes — so the estimate is based on the smaller of the two.
  const effective = pendingCount === null ? limit : Math.min(limit, pendingCount);
  const allPending = Math.min(pendingCount ?? 0, MAX_BATCH);
  const setBatch = (n: number) => {
    setLimit(n);
    setDraft(null);
  };
  const dailyCap =
    model?.options.find((o) => o.model === model.model)?.rpd ?? null;
  const estimate = effective * SECONDS_PER_RECORD;

  async function runProcess() {
    if (!token) return;
    setStartingProcess(true);
    try {
      const accepted = await processPending(token, limit);
      processJob.start(accepted);
      toast.success(accepted.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start processing.");
    } finally {
      setStartingProcess(false);
    }
  }

  async function runRetry() {
    if (!token) return;
    setStartingRetry(true);
    try {
      const accepted = await retryFailed(token, limit);
      processJob.start(accepted);
      toast.success(accepted.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start the retry.");
    } finally {
      setStartingRetry(false);
    }
  }

  async function changeModel(next: string | null) {
    // The Select clears to null on some interactions; nothing to save then.
    if (!token || !next) return;
    setSavingModel(true);
    try {
      const updated = await setProcessorModel(token, next);
      setModel(updated);
      toast.success(`Extraction now runs on ${updated.model}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't change the model.");
    } finally {
      setSavingModel(false);
    }
  }

  async function runTagging() {
    if (!token) return;
    setStartingTags(true);
    try {
      const accepted = await categorizeUntagged(token, limit);
      tagJob.start(accepted);
      toast.success(accepted.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start tagging.");
    } finally {
      setStartingTags(false);
    }
  }

  const busy =
    startingProcess ||
    startingRetry ||
    startingTags ||
    processJob.isRunning ||
    tagJob.isRunning;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="AI Clean-Up"
        description="Turns messy vendor text into real catalog entries and adds use-case tags. Tagging is additive: it never removes a tag you set by hand."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="gap-0 p-5">
          <h2 className="text-sm font-bold tracking-tight">Process Collected Records</h2>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">{limit.toLocaleString()}</span>
            <span className="text-muted-foreground text-[13px]">records requested</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Batch size presets">
            {PRESETS.map((n) => (
              <Button
                key={n}
                size="sm"
                variant={limit === n ? "default" : "outline"}
                aria-pressed={limit === n}
                onClick={() => setBatch(n)}
                disabled={busy}
                className="tabular-nums"
              >
                {n}
              </Button>
            ))}
            {pendingCount !== null && pendingCount > 0 && (
              <Button
                size="sm"
                variant={limit === allPending ? "default" : "outline"}
                aria-pressed={limit === allPending}
                onClick={() => setBatch(allPending)}
                disabled={busy}
                className="tabular-nums"
              >
                All pending {allPending.toLocaleString()}
              </Button>
            )}
          </div>
          <label className="text-muted-foreground mt-3 flex items-center gap-2 text-[12.5px]">
            Custom
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_BATCH}
              value={draft ?? String(limit)}
              onChange={(e) => {
                setDraft(e.target.value);
                const n = Number.parseInt(e.target.value, 10);
                if (n >= 1) setLimit(Math.min(n, MAX_BATCH));
              }}
              onBlur={() => setDraft(null)}
              disabled={busy}
              className="w-24 tabular-nums"
            />
            <span className="tabular-nums">of {MAX_BATCH.toLocaleString()} per run</span>
          </label>

          {model && (
            <label className="mt-4 block">
              <span className="text-[12.5px] font-medium">Extraction model</span>
              <Select
                value={model.model}
                onValueChange={(v) => void changeModel(v)}
                disabled={busy || savingModel}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {model.options.map((o) => (
                    <SelectItem key={o.model} value={o.model}>
                      {o.model}
                      {o.model === model.default_model ? " (default)" : ""}
                      <span className="text-muted-foreground ml-1.5 text-[11.5px] tabular-nums">
                        {o.rpd.toLocaleString()}/day
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground mt-1.5 block text-[12px] leading-relaxed">
                Applies to the next record, so a run in progress finishes on the model it
                started with. When it is rate-limited, times out or errors, the processor
                falls back to {model.fallback_chain.slice(1).join(" → ") || "no other model"}, in
                that order. Change the backups (and every other feature&apos;s models) in{" "}
                <Link href="/admin/llm-settings" className="text-brand-text font-medium hover:underline">
                  LLM Settings
                </Link>
                .
              </span>
              {dailyCap !== null && effective > dailyCap && (
                <span className="text-warning mt-1.5 block text-[12px] leading-relaxed">
                  This model allows {dailyCap.toLocaleString()} requests a day — a run of{" "}
                  {effective.toLocaleString()} would stop short. Pick a larger batch model or
                  split the run.
                </span>
              )}
            </label>
          )}

          <div className="border-line bg-surface-2/50 mt-4 flex flex-col gap-1 rounded-xl border p-3.5 text-[13px]">
            {pendingCount === null ? (
              <span className="text-muted-foreground">Checking how many are pending…</span>
            ) : pendingCount === 0 ? (
              <span className="text-muted-foreground">
                Nothing is waiting to be processed right now.
              </span>
            ) : (
              <>
                <span>
                  <strong className="font-semibold tabular-nums">{pendingCount}</strong> record
                  {pendingCount === 1 ? " is" : "s are"} pending.
                  {limit > pendingCount && " Asking for more than that is harmless."}
                </span>
                <span className="text-muted-foreground">
                  This run would cover {effective.toLocaleString()}, taking roughly{" "}
                  {formatDuration(estimate)}.
                </span>
              </>
            )}
            {failedCount !== null && failedCount > 0 && (
              <span className="text-muted-foreground">
                <strong className="text-foreground font-semibold tabular-nums">
                  {failedCount}
                </strong>{" "}
                earlier record{failedCount === 1 ? "" : "s"} failed and can be retried.
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={runProcess} disabled={busy || pendingCount === 0}>
              {startingProcess || processJob.isRunning ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlayCircle data-icon="inline-start" />
              )}
              Start processing
            </Button>
            <Button
              variant="outline"
              onClick={runRetry}
              disabled={busy || failedCount === 0 || failedCount === null}
            >
              {startingRetry ? <Spinner data-icon="inline-start" /> : <RotateCcw data-icon="inline-start" />}
              Retry failed
            </Button>
            <Button variant="outline" onClick={runTagging} disabled={busy}>
              {startingTags || tagJob.isRunning ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Tags data-icon="inline-start" />
              )}
              Add missing tags
            </Button>
          </div>

          <p className="text-muted-foreground mt-3 text-[12px] leading-relaxed">
            Leaving this page is safe: the run continues on the server and stays visible in the
            header. There is no cancel once a run starts.
          </p>
        </Card>

        <div className="flex flex-col gap-4">
          {processJob.accepted ? (
            <AdminJobPanel
              accepted={processJob.accepted}
              job={processJob.job}
              pollError={processJob.pollError}
              requestedLimit={limit}
            />
          ) : (
            <Card className="gap-0 p-5">
              <h2 className="text-sm font-bold tracking-tight">Recent runs</h2>
              <p className="text-muted-foreground mt-1 text-[12.5px]">
                Nothing is running. A batch you start shows its live progress here.
              </p>
              {recentRuns && recentRuns.length > 0 ? (
                <ul className="divide-line mt-3 divide-y text-[13px]">
                  {recentRuns.map((j) => (
                    <li key={j.id} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="tabular-nums">
                        {j.succeeded_count} processed
                        {j.failed_count > 0 && (
                          <span className="text-negative"> · {j.failed_count} failed</span>
                        )}
                        {j.status === "failed" && <span className="text-negative"> · stopped</span>}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[12px] tabular-nums">
                        {timeAgo(j.finished_at ?? j.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : recentRuns ? (
                <p className="text-muted-foreground mt-3 text-[13px]">No processing runs yet.</p>
              ) : null}
              <Link
                href="/admin/jobs"
                className="text-brand-text mt-2 text-[12.5px] font-medium hover:underline"
              >
                All jobs →
              </Link>
            </Card>
          )}

          {tagJob.accepted && (
            <AdminJobPanel
              accepted={tagJob.accepted}
              job={tagJob.job}
              pollError={tagJob.pollError}
              requestedLimit={limit}
            />
          )}

          <Card className="gap-0 p-4">
            <span className="flex items-center gap-2 text-[13px] font-semibold">
              <Sparkles className="text-brand-text size-3.5" />
              After a batch finishes
            </span>
            <p className="text-muted-foreground mt-1.5 text-[12.5px] leading-relaxed">
              New catalog entries are invisible to chat until they are embedded, and show a
              blank score until they are ranked. Both are one click from{" "}
              <Link href="/admin" className="text-brand-text font-medium hover:underline">
                pipeline health
              </Link>
              .
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
