"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronRight, History, RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type Job,
  type JobStatus,
  cancelJob,
  isJobCancellable,
  jobTypeLabel,
  listJobs,
} from "@/lib/api/admin/jobs";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminJobTrendCard } from "../admin-job-trend";
import { useAdminQuery } from "../admin-query-state";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminStatusPill } from "../admin-status-pill";
import { AdminPageHeader } from "../admin-page-header";
import { AdminPagination } from "../admin-pagination";

const PAGE_SIZE = 25;

/**
 * Filtering is server-side: `GET /jobs` takes `job_type` and `status`, and the
 * response `total` already reflects them, so pagination stays correct. Doing it
 * client-side would only filter the 25 rows on the current page.
 */
const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All job types" },
  { value: "processor.process_pending", label: jobTypeLabel("processor.process_pending") },
  { value: "processor.categorize_untagged", label: jobTypeLabel("processor.categorize_untagged") },
  { value: "scraper.bulk_scrape", label: jobTypeLabel("scraper.bulk_scrape") },
  { value: "scraper.scrape_targets", label: jobTypeLabel("scraper.scrape_targets") },
  { value: "embeddings.generate_all", label: jobTypeLabel("embeddings.generate_all") },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Running" },
  { value: "cancelling", label: "Stopping" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Crashed" },
  { value: "cancelled", label: "Stopped" },
];

function formatStarted(job: Job): string {
  const iso = job.started_at ?? job.created_at;
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminJobsPage() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  // One row open at a time: the errors list is long, and two expanded rows
  // push the second one off screen anyway. `errors` already rides along on
  // GET /jobs, so opening a row costs no request.
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function handleCancel(job: Job) {
    if (!token) return;
    setCancelling(job.id);
    try {
      await cancelJob(token, job.id);
      // Not "Stopped": the worker finishes its current item first, so the row
      // goes to `cancelling` and only then to `cancelled`. Saying it stopped
      // here would be a lie for as long as that item takes — which for a
      // scrape is a whole page load.
      toast.success("Stopping — it will finish the item it is on first.");
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not cancel this job.",
      );
    } finally {
      setCancelling(null);
    }
  }

  const query = useAdminQuery({ filters: { type: "all", status: "all" } });
  const { type: jobType, status } = query.values;
  const { page } = query;

  // Drop stale rows the moment the fetch key changes — "adjust state during
  // render", since the set-state-in-effect lint forbids the effect version.
  const fetchSig = `${query.signature}|${reloadTick}`;
  const [prevFetchSig, setPrevFetchSig] = useState(fetchSig);
  if (fetchSig !== prevFetchSig) {
    setPrevFetchSig(fetchSig);
    setJobs(null);
    setError(null);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    listJobs(token, {
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      jobType: jobType === "all" ? undefined : jobType,
      status: status === "all" ? undefined : (status as JobStatus),
    })
      .then((res) => {
        if (cancelled) return;
        setJobs(res.items);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load jobs.");
      });

    return () => {
      cancelled = true;
    };
  }, [token, page, jobType, status, reloadTick]);

  const filtered = jobType !== "all" || status !== "all";

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Jobs"
        description="A run that finished with some items failing is still a completed run. Judge it by the failed count, not the status."
        action={
          <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      {/* Throughput sits above the filter bar because it describes the whole
          job history, not the filtered table under it. */}
      <AdminJobTrendCard
        title="Items processed per day"
        description="Every job type. A rising failed line is the signal to open the runs below and read their errors."
        emptyTitle="No runs to chart yet"
        emptyDescription="Throughput appears once a scrape, processor or embedding run has finished."
        reloadTick={reloadTick}
      />

      {/* gap-3: filter bar, same as every other control row in the portal. */}
      <div className="flex flex-wrap items-center gap-3">
        <Select items={TYPE_OPTIONS} value={jobType} onValueChange={(v) => query.set({ type: v as string })}>
          <SelectTrigger className="w-60" aria-label="Filter by job type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select items={STATUS_OPTIONS} value={status} onValueChange={(v) => query.set({ status: v as string })}>
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {jobs && (
          <span className="text-muted-foreground text-[12.5px] tabular-nums">
            {total} run{total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <Card className="py-0">
        {error ? (
          <AdminErrorState message={error} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : jobs === null ? (
          <AdminLoadingState />
        ) : jobs.length === 0 ? (
          <AdminEmptyState
            icon={History}
            title={filtered ? "No jobs match" : "No jobs yet"}
            description={
              filtered
                ? "No run matches these filters. Widen them to see more history."
                : "Scraping and processing runs will appear here once you start one."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <Fragment key={job.id}>
                <TableRow>
                  <TableCell>
                    {job.errors.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpanded((id) => (id === job.id ? null : job.id))}
                        aria-expanded={expanded === job.id}
                        className="flex items-start gap-1.5 text-left"
                      >
                        <ChevronRight
                          className={`text-muted-foreground mt-0.5 size-3.5 shrink-0 transition-transform ${
                            expanded === job.id ? "rotate-90" : ""
                          }`}
                        />
                        <span>
                          <span className="block font-medium hover:underline">
                            {jobTypeLabel(job.job_type)}
                          </span>
                          <span className="text-muted-foreground block font-mono text-[11.5px]">
                            {job.id.slice(0, 8)}
                          </span>
                        </span>
                      </button>
                    ) : (
                      <>
                        <div className="font-medium">{jobTypeLabel(job.job_type)}</div>
                        <div className="text-muted-foreground font-mono text-[11.5px]">
                          {job.id.slice(0, 8)}
                        </div>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <AdminStatusPill kind="job" value={job.status} />
                  </TableCell>
                  <TableCell className="text-[12.5px]">
                    {job.status === "failed" && job.error_message ? (
                      <span className="text-negative">{job.error_message}</span>
                    ) : (
                      <span className="tabular-nums">
                        <span className="text-positive">{job.succeeded_count} succeeded</span>
                        {", "}
                        <span className={job.failed_count > 0 ? "text-warning" : undefined}>
                          {job.failed_count} failed
                        </span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[12.5px] tabular-nums">
                    {formatStarted(job)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isJobCancellable(job) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancelling === job.id}
                        onClick={() => void handleCancel(job)}
                      >
                        <Square data-icon="inline-start" />
                        Stop
                      </Button>
                    ) : job.status === "cancelling" ? (
                      // Already asked. No second button: the worker stops when
                      // it finishes the item it is on, and clicking again
                      // cannot make that happen sooner.
                      <span className="text-muted-foreground text-[12px]">
                        Stopping…
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>

                {expanded === job.id && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-surface-2/50 p-0">
                      <ul className="divide-line divide-y">
                        {job.errors.map((e, i) => (
                          <li key={`${e.item}-${i}`} className="px-4 py-2">
                            <div className="text-[12.5px] font-medium">{e.item}</div>
                            <div className="text-muted-foreground mt-0.5 text-[12px]">
                              {e.error}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {job.failed_count > job.errors.length && (
                        <p className="text-muted-foreground border-line border-t px-4 py-2 text-[12px]">
                          {job.failed_count - job.errors.length} further failure
                          {job.failed_count - job.errors.length === 1 ? "" : "s"} were not
                          recorded — the per-job detail list stops at {job.errors.length}.
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AdminPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={query.setPage}
      />
    </div>
  );
}
