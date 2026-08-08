"use client";

import { Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { type Job, type JobAccepted, jobTypeLabel } from "@/lib/api/admin/jobs";
import { cn } from "@/lib/utils";

import { OutcomeAlert, outcomeOf } from "./admin-outcome-alert";

/** "3m 15s", "45s" — estimates and elapsed times are both short by design. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest === 0 ? `${mins}m` : `${mins}m ${rest}s`;
}

/**
 * Live view of one background job, shared by every action that returns a 202.
 *
 * Deliberately has no cancel control: once started, a job runs to completion
 * server-side. Navigating away is safe and does not stop it.
 */
export function AdminJobPanel({
  accepted,
  job,
  pollError,
  requestedLimit,
  className,
}: {
  accepted: JobAccepted;
  job: Job | null;
  pollError?: string | null;
  /** What the admin asked for, when it differs from what was actually pending. */
  requestedLimit?: number;
  className?: string;
}) {
  const label = jobTypeLabel(accepted.job_type);
  const status = job?.status ?? accepted.status;
  const finished = status === "completed" || status === "failed";
  const pct = job?.progress_percentage ?? 0;

  // `total_count` is the real queue size, which is usually smaller than the
  // limit the admin typed. Saying so prevents "I asked for 100, got 38?".
  const total = job?.total_count ?? accepted.total_count;
  const trimmed =
    requestedLimit !== undefined && total < requestedLimit ? requestedLimit : null;

  return (
    <Card className={cn("gap-0 p-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold">
          {!finished && (
            <Loader2 className="motion-safe:animate-spin size-3.5 text-muted-foreground" />
          )}
          {label}
        </span>
        <span className="text-[12.5px] text-muted-foreground tabular-nums">
          {finished ? "Finished" : `${pct}%`}
        </span>
      </div>

      <p className="mt-1 text-[12.5px] text-muted-foreground">
        {total === 0
          ? "Nothing was pending, so there is nothing to do."
          : trimmed
            ? `${total} of the ${trimmed} you asked for were actually pending.`
            : `${total} ${total === 1 ? "record" : "records"} in this run.`}
        {!finished && accepted.estimated_seconds
          ? ` Around ${formatDuration(accepted.estimated_seconds)} in total.`
          : ""}
      </p>

      <div
        className="bg-surface-2 mt-3 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} progress`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            status === "failed" ? "bg-negative" : "bg-brand",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {job && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] tabular-nums">
          <span className="text-positive">{job.succeeded_count} succeeded</span>
          <span className={job.failed_count > 0 ? "text-warning" : "text-muted-foreground"}>
            {job.failed_count} failed
          </span>
          <span className="text-muted-foreground">
            {job.processed_count} of {job.total_count} processed
          </span>
        </div>
      )}

      {/* A poll that fails is not a job that failed — the run continues. */}
      {pollError && !finished && (
        <p className="text-muted-foreground mt-2 text-[12px]">
          {pollError} Still running on the server; retrying.
        </p>
      )}

      {/* `status: "failed"` means the run itself crashed, not that items did. */}
      {job?.status === "failed" && job.error_message && (
        <div className="mt-3">
          <OutcomeAlert status="error" title="The run stopped early">
            {job.error_message} Completed items are not repeated, so re-running is safe.
          </OutcomeAlert>
        </div>
      )}

      {job?.status === "completed" && (
        <div className="mt-3">
          <OutcomeAlert
            status={outcomeOf(job.succeeded_count, job.failed_count)}
            title={
              job.failed_count === 0
                ? `Finished, ${job.succeeded_count} succeeded`
                : `Finished with ${job.failed_count} failed`
            }
          >
            {job.failed_count > 0
              ? "Failed items are retried automatically on the next run."
              : null}
          </OutcomeAlert>
        </div>
      )}

      {job && job.errors.length > 0 && (
        <details className="border-line mt-3 rounded-lg border">
          <summary className="cursor-pointer px-3 py-2 text-[12.5px] font-medium">
            {job.errors.length} {job.errors.length === 1 ? "failure" : "failures"} so far
          </summary>
          <ul className="divide-line divide-y border-t border-line">
            {job.errors.map((e, i) => (
              <li key={`${e.item}-${i}`} className="px-3 py-2">
                <div className="text-[12.5px] font-medium">{e.item}</div>
                <div className="text-muted-foreground mt-0.5 text-[12px]">{e.error}</div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
