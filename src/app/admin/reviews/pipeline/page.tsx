"use client";

import { useCallback, useEffect, useState } from "react";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  type IngestBulkResult,
  type PendingSummary,
  type PipelineStatus,
  type ProcessBulkResult,
  getPipelineStatus,
  ingestBulk,
  listPendingSummaries,
  processBulk,
} from "@/lib/api/admin/reviews";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { OutcomeAlert, outcomeOf } from "../../admin-outcome-alert";
import { AdminPageHeader } from "../../admin-page-header";
import { AggregateWorklist } from "./aggregate-worklist";
import { PipelineSteps, PipelineStepsSkeleton } from "./pipeline-steps";

export default function AdminReviewPipelinePage() {
  const { token } = useAuth();
  // `null` is the loading state, the shape the other admin screens use.
  // `statusFailed` is a third state and not the same as `null`: an eternal
  // skeleton claims "still loading" forever, which is a worse lie than showing
  // no counts at all.
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const [summaries, setSummaries] = useState<PendingSummary[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    // Settled independently, NOT Promise.all. The two calls answer different
    // questions and one failing must not blank the other: coupling them meant
    // an unavailable status endpoint also emptied the aggregate worklist,
    // whose own endpoint was fine.
    getPipelineStatus(token)
      .then((s) => {
        if (cancelled) return;
        setStatus(s);
        setStatusFailed(false);
      })
      .catch(() => {
        // Counts degrade to "unavailable" rather than blocking the controls.
        // This screen still works without them, and refusing to render the run
        // buttons because a status query failed would be worse than the blind
        // version it replaces.
        if (!cancelled) setStatusFailed(true);
      });

    listPendingSummaries(token)
      .then((sum) => {
        if (!cancelled) setSummaries(sum.items);
      })
      .catch(() => {
        if (!cancelled) setSummaries([]);
      });

    return () => {
      cancelled = true;
    };
  }, [token, tick]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Review Pipeline"
        description="Discover, process, and aggregate YouTube reviews. These calls use YouTube quota and Gemini credits, so run them deliberately."
      />

      {status ? (
        <PipelineSteps status={status} />
      ) : statusFailed ? (
        <p className="text-muted-foreground text-xs">
          Queue counts are unavailable right now. The runs below still work.
        </p>
      ) : (
        <PipelineStepsSkeleton />
      )}

      <IngestSection status={status} onRan={refresh} />
      <ProcessSection status={status} onRan={refresh} />
      <AggregateSection
        token={token}
        summaries={summaries}
        onRan={refresh}
      />
    </div>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

const INGEST_MAX = 20;

function IngestSection({
  status,
  onRan,
}: {
  status: PipelineStatus | null;
  onRan: () => void;
}) {
  const { token } = useAuth();
  const [limit, setLimit] = useState("5");
  const [skipCovered, setSkipCovered] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<IngestBulkResult | null>(null);

  async function run() {
    if (!token) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await ingestBulk(token, { limit: batch, skipCovered });
      setResult(res);
      onRan();
      toast.success(res.message ?? `Ingest done: ${res.families_attempted ?? 0} families searched.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ingest failed.");
    } finally {
      setRunning(false);
    }
  }

  // Clamped here, not just on the input: `min`/`max` are advisory, and typing
  // 999 previously sent 999 and came back as a 422 in a toast.
  const batch = Math.min(Math.max(Number(limit) || 1, 1), INGEST_MAX);
  const perFamily = status?.ingest.quota_units_per_family;
  const dailyQuota = status?.ingest.daily_quota_units;
  const estimate = perFamily ? perFamily * batch : null;
  // A batch that would eat most of the daily cap is the failure mode this
  // estimate exists to prevent: at 19 channels the default 5 costs 9,500 of
  // 10,000, and the old screen only told you afterwards.
  const heavy = estimate !== null && dailyQuota !== undefined && estimate > dailyQuota * 0.5;

  return (
    <SectionCard
      title="Ingest"
      hint="Search YouTube for new reviews across the catalog, one search per laptop family."
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Max families
          <Input
            type="number"
            min={1}
            max={20}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-28"
          />
        </label>
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold">
          <Checkbox checked={skipCovered} onCheckedChange={(c) => setSkipCovered(c === true)} />
          Skip already-covered families
        </label>
        <Button onClick={run} disabled={running} className="mb-0.5">
          {running ? <Spinner data-icon="inline-start" /> : <PlayCircle data-icon="inline-start" />}
          {running ? "Ingesting…" : "Run ingest"}
        </Button>
      </div>

      {estimate !== null && (
        <p
          className={cn(
            "text-xs",
            heavy ? "text-warning" : "text-muted-foreground",
          )}
        >
          Costs about{" "}
          <span className="font-mono tabular-nums">{estimate.toLocaleString()}</span>{" "}
          quota units ({batch} {batch === 1 ? "family" : "families"} ×{" "}
          {perFamily?.toLocaleString()} for {status?.ingest.active_channels} channels)
          {dailyQuota !== undefined && (
            <>
              , of {dailyQuota.toLocaleString()} per day
              {heavy && ". That is most of today's quota."}
            </>
          )}
        </p>
      )}

      {result && (
        <OutcomeAlert
          status="success"
          title={result.message ?? `Ingest done — ${result.families_attempted ?? 0} families searched`}
        >
          {result.families_attempted ?? 0} searched of {result.families_total ?? 0} families ·{" "}
          {result.families_already_covered ?? 0} already covered · {result.families_remaining ?? 0} remaining.
          {result.matched !== undefined && ` Matched ${result.matched}, ${result.pending ?? 0} pending.`}
        </OutcomeAlert>
      )}
    </SectionCard>
  );
}

const PROCESS_MAX = 50;

function ProcessSection({
  status,
  onRan,
}: {
  status: PipelineStatus | null;
  onRan: () => void;
}) {
  const { token } = useAuth();
  const [limit, setLimit] = useState("5");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ProcessBulkResult | null>(null);

  async function run() {
    if (!token) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await processBulk(token, batch);
      setResult(res);
      onRan();
      // Not an unconditional success toast. The old one fired even when every
      // review failed, so the toast and the OutcomeAlert below it could give
      // two verdicts on the same run.
      const message = `${res.processed} of ${res.candidates} processed, ${res.chunks_saved} chunks saved.`;
      if (res.failed > 0) toast.error(`${res.failed} failed. ${message}`);
      else if (res.partially_processed) toast.warning(`${res.partially_processed} partial. ${message}`);
      else toast.success(message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Processing failed.");
    } finally {
      setRunning(false);
    }
  }

  const batch = Math.min(Math.max(Number(limit) || 1, 1), PROCESS_MAX);
  const candidates = status?.process.candidates;

  return (
    <SectionCard
      title="Process"
      hint="Chunk, sentiment-tag, and embed matched reviews that have no chunks yet. One Gemini call plus one embedding per chunk with a 4s gap, so a single review can take minutes."
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Max reviews
          <Input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-28"
          />
        </label>
        <Button
          onClick={run}
          disabled={running || candidates === 0}
          className="mb-0.5"
        >
          {running ? <Spinner data-icon="inline-start" /> : <PlayCircle data-icon="inline-start" />}
          {running ? "Processing…" : "Run processing"}
        </Button>
      </div>

      {candidates !== undefined && (
        <p className="text-muted-foreground text-xs">
          {candidates === 0
            ? "No matched reviews are waiting for chunks."
            : `${candidates} matched ${candidates === 1 ? "review is" : "reviews are"} waiting. This run takes the first ${Math.min(batch, candidates)}.`}
        </p>
      )}

      {result && (
        <OutcomeAlert
          status={outcomeOf(result.processed, result.failed)}
          title={`${result.processed} processed, ${result.failed} failed${
            result.partially_processed ? `, ${result.partially_processed} partial` : ""
          }`}
        >
          <p>
            {result.processed} of {result.candidates} candidates,{" "}
            {result.chunks_saved} chunks saved
            {result.chunks_failed ? `, ${result.chunks_failed} chunks failed` : ""}.
          </p>

          {/* The API has always returned a row per review; the page used to
              render only the sums and drop the array, so a half-failed run
              could not be diagnosed without opening the server log. Rows that
              lost something are listed; clean ones stay collapsed. */}
          {result.results.some((r) => r.error || r.chunks_failed) && (
            <ul className="mt-2 flex flex-col gap-1">
              {result.results
                .filter((r) => r.error || r.chunks_failed)
                .map((r) => (
                  <li key={r.review_id} className="text-xs">
                    <span className="font-medium">{r.video_title}</span>
                    {r.error ? (
                      <span className="text-negative"> — {r.error}</span>
                    ) : (
                      <span className="text-warning">
                        {" "}
                        {r.chunks_saved} of {r.chunks_total} chunks saved
                        {r.failures?.[0] && ` (${r.failures[0].error_type})`}
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </OutcomeAlert>
      )}
    </SectionCard>
  );
}

function AggregateSection({
  token,
  summaries,
  onRan,
}: {
  token: string | null;
  summaries: PendingSummary[];
  onRan: () => void;
}) {
  return (
    <SectionCard
      title="Aggregate"
      hint="Rebuild the strengths / weaknesses summary the chatbot quotes, for laptops whose roll-up is missing or out of date."
    >
      {/* Was a catalog-wide laptop search, which required the admin to already
          know which laptop needed aggregating. GET /reviews/summaries/pending
          returns exactly that list and the frontend was only using it for a
          dashboard counter, so the queue and the action sat on different
          screens. */}
      {token && (
        <AggregateWorklist token={token} items={summaries} onDone={onRan} />
      )}
    </SectionCard>
  );
}
