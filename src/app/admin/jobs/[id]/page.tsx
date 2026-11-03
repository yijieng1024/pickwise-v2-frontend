"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  type Job,
  cancelJob,
  getJob,
  isJobCancellable,
  isJobFinished,
  jobResultSummary,
  jobTypeLabel,
} from "@/lib/api/admin/jobs";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminErrorState, AdminLoadingState } from "../../admin-states";
import { AdminPageHeader } from "../../admin-page-header";
import { AdminStatusPill } from "../../admin-status-pill";

/** One entry of a processor job's `result.identity_conflicts` (Apple rows not updated). */
interface IdentityConflict {
  laptop_id: string | null;
  model_code: string | null;
  existing: Record<string, unknown> | null;
  incoming: Record<string, unknown> | null;
  raw_id: string;
  source_url: string;
  reason?: string;
}

/** How often a running job is re-read. Finished jobs are read once. */
const POLL_MS = 5000;

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatElapsed(job: Job): string {
  if (!job.started_at) return "—";
  const end = job.finished_at ? new Date(job.finished_at).getTime() : Date.now();
  const s = Math.max(0, Math.round((end - new Date(job.started_at).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-[11.5px] font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="text-[13px] tabular-nums">{value}</span>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="bg-surface-2/50 border-line max-h-[32rem] overflow-auto rounded-xl border p-3.5 font-mono text-[12px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AdminJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = () =>
      getJob(token, id)
        .then((j) => {
          if (cancelled) return;
          setJob(j);
          setError(null);
          if (!isJobFinished(j)) timer = setTimeout(load, POLL_MS);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load this job.");
        });

    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, id, reloadTick]);

  async function handleCancel() {
    if (!token || !job) return;
    setCancelling(true);
    try {
      setJob(await cancelJob(token, job.id));
      toast.success("Stopping — it will finish the item it is on first.");
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not cancel this job.");
    } finally {
      setCancelling(false);
    }
  }

  if (error) {
    return <AdminErrorState message={error} onRetry={() => setReloadTick((t) => t + 1)} />;
  }
  if (!job) return <AdminLoadingState />;

  const summary = jobResultSummary(job);
  const conflicts = (Array.isArray(job.result?.identity_conflicts) ? job.result.identity_conflicts : []) as IdentityConflict[];
  const unrecorded = job.failed_count - job.errors.length;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        trail={[jobTypeLabel(job.job_type)]}
        title={jobTypeLabel(job.job_type)}
        description={`${job.job_type} · ${job.id}`}
        action={
          <div className="flex gap-2">
            {isJobCancellable(job) && (
              <Button variant="outline" size="sm" disabled={cancelling} onClick={() => void handleCancel()}>
                <Square data-icon="inline-start" />
                Stop
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>
              <RefreshCw data-icon="inline-start" />
              Refresh
            </Button>
          </div>
        }
      />

      <Card className="gap-4 p-5">
        <div className="flex items-center gap-3">
          <AdminStatusPill kind="job" value={job.status} />
          <span className="text-muted-foreground text-[12.5px] tabular-nums">
            {job.processed_count} of {job.total_count} processed · {job.progress_percentage}%
          </span>
        </div>
        <Progress value={job.progress_percentage} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact label="Succeeded" value={<span className="text-positive">{job.succeeded_count}</span>} />
          <Fact
            label="Failed"
            value={<span className={job.failed_count > 0 ? "text-warning" : undefined}>{job.failed_count}</span>}
          />
          <Fact label="Created" value={formatTime(job.created_at)} />
          <Fact label="Started" value={formatTime(job.started_at)} />
          <Fact label="Finished" value={formatTime(job.finished_at)} />
          <Fact label={job.finished_at ? "Took" : "Running for"} value={formatElapsed(job)} />
          <Fact
            label="Estimate"
            value={job.estimated_seconds != null ? `${Math.round(job.estimated_seconds / 60)} min` : "—"}
          />
        </div>
        {job.error_message && (
          <p className="border-negative/30 bg-negative/10 text-negative rounded-md border px-3 py-2 text-[13px] font-medium">
            {job.error_message}
          </p>
        )}
        {summary && <p className="text-[13px]">{summary}</p>}
      </Card>

      <Card className="gap-3 p-5">
        <h2 className="text-sm font-bold tracking-tight">
          Errors <span className="text-muted-foreground font-normal tabular-nums">({job.errors.length})</span>
        </h2>
        {job.errors.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">No item failed.</p>
        ) : (
          <ul className="divide-line border-line divide-y rounded-xl border">
            {job.errors.map((e, i) => (
              <li key={`${e.item}-${i}`} className="px-4 py-2">
                <div className="text-[12.5px] font-medium break-all">{e.item}</div>
                <div className="text-muted-foreground mt-0.5 text-[12px]">{e.error}</div>
              </li>
            ))}
          </ul>
        )}
        {unrecorded > 0 && (
          <p className="text-muted-foreground text-[12px]">
            {unrecorded} further failure{unrecorded === 1 ? "" : "s"} were not recorded — the
            per-job list stops at {job.errors.length}.
          </p>
        )}
      </Card>

      {conflicts.length > 0 && (
        <Card className="gap-3 p-5">
          <h2 className="text-sm font-bold tracking-tight">
            Identity conflicts{" "}
            <span className="text-muted-foreground font-normal tabular-nums">({conflicts.length})</span>
          </h2>
          <p className="text-muted-foreground text-[12.5px]">
            Not updated: the code matched a different machine, or the page&apos;s line is unknown.
          </p>
          <ul className="divide-line border-line divide-y rounded-xl border">
            {conflicts.map((c, i) => (
              <li key={`${c.raw_id}-${i}`} className="flex flex-col gap-0.5 px-4 py-2 text-[12.5px]">
                <span className="font-medium break-all">
                  {c.laptop_id ? (
                    <Link href={`/admin/catalog/laptops/${c.laptop_id}/edit`} className="hover:underline">
                      {c.model_code}
                    </Link>
                  ) : (
                    (c.reason ?? "Unknown line")
                  )}
                </span>
                {c.existing && c.incoming && (
                  <span className="text-muted-foreground font-mono text-[11.5px]">
                    stored {JSON.stringify(c.existing)} · incoming {JSON.stringify(c.incoming)}
                  </span>
                )}
                <span className="text-muted-foreground break-all text-[11.5px]">
                  {c.source_url} · raw {c.raw_id.slice(0, 8)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="gap-3 p-5">
        <h2 className="text-sm font-bold tracking-tight">Result</h2>
        {job.result ? (
          <JsonBlock value={job.result} />
        ) : (
          <p className="text-muted-foreground text-[13px]">
            {isJobFinished(job) ? "This run left no result." : "Filled in when the run finishes."}
          </p>
        )}
      </Card>

      <Card className="gap-3 p-5">
        <h2 className="text-sm font-bold tracking-tight">Parameters</h2>
        {Object.keys(job.params).length > 0 ? (
          <JsonBlock value={job.params} />
        ) : (
          <p className="text-muted-foreground text-[13px]">Started with defaults.</p>
        )}
      </Card>
    </div>
  );
}
