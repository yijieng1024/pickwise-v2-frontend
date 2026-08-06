"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayCircle, Sparkles, Tags } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { categorizeUntagged, processPending } from "@/lib/api/admin/processor";
import { listRawScrapLaptops } from "@/lib/api/admin/scraper";
import { ApiError } from "@/lib/api/client";
import { useJob } from "@/lib/admin/use-job";
import { useAuth } from "@/lib/auth-context";

import { AdminJobPanel } from "../admin-job-panel";
import { AdminPageHeader } from "../admin-page-header";

/** The backend's ceiling per run. Larger batches are rejected outright. */
const MAX_BATCH = 1500;
/** Measured pacing: the AI provider is rate-limited, so records are spaced out. */
const SECONDS_PER_RECORD = 5;

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
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [startingProcess, setStartingProcess] = useState(false);
  const [startingTags, setStartingTags] = useState(false);

  // Two trackers, because the backend happily runs both at once.
  const processJob = useJob(token);
  const tagJob = useJob(token);

  const [reloadTick, setReloadTick] = useState(0);

  // Refresh the pending count once a run stops.
  const processFinished = processJob.accepted !== null && !processJob.isRunning;
  const [prevProcessFinished, setPrevProcessFinished] = useState(processFinished);
  if (processFinished !== prevProcessFinished) {
    setPrevProcessFinished(processFinished);
    if (processFinished) setReloadTick((t) => t + 1);
  }

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
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  // The run only ever covers what is actually pending, however large the
  // slider goes — so the estimate is based on the smaller of the two.
  const effective = pendingCount === null ? limit : Math.min(limit, pendingCount);
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

  const busy = startingProcess || startingTags || processJob.isRunning || tagJob.isRunning;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Catalog", "AI clean-up"]}
        title="AI clean-up"
        description="Turns messy vendor text into real catalog entries and adds use-case tags. Tagging is additive: it never removes a tag you set by hand."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="gap-0 p-5">
          <h2 className="text-sm font-bold tracking-tight">Process collected records</h2>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">{limit.toLocaleString()}</span>
            <span className="text-muted-foreground text-[13px]">records requested</span>
          </div>

          <label className="mt-3 block">
            <span className="sr-only">Batch size</span>
            <input
              type="range"
              min={1}
              max={MAX_BATCH}
              step={1}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={busy}
              className="accent-brand h-1.5 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <div className="text-muted-foreground flex justify-between text-[11.5px] tabular-nums">
            <span>1</span>
            <span>{MAX_BATCH.toLocaleString()} per run</span>
          </div>

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
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={runProcess} disabled={busy || pendingCount === 0}>
              {startingProcess || processJob.isRunning ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlayCircle data-icon="inline-start" />
              )}
              Start processing
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
              <h2 className="text-sm font-bold tracking-tight">Nothing running</h2>
              <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                When you start a batch this panel switches to a live progress view, with
                failures appearing as they happen rather than only at the end.
              </p>
              <p className="text-muted-foreground mt-2.5 text-[12.5px]">
                Past runs are on the{" "}
                <Link href="/admin/jobs" className="text-brand font-medium hover:underline">
                  jobs screen
                </Link>
                .
              </p>
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
              <Sparkles className="text-brand size-3.5" />
              After a batch finishes
            </span>
            <p className="text-muted-foreground mt-1.5 text-[12.5px] leading-relaxed">
              New catalog entries are invisible to chat until they are embedded, and show a
              blank score until they are ranked. Both are one click from{" "}
              <Link href="/admin" className="text-brand font-medium hover:underline">
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
