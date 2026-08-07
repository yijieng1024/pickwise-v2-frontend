"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";

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
import { type Job, type JobStatus, jobTypeLabel, listJobs } from "@/lib/api/admin/jobs";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

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
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Crashed" },
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
  const [page, setPage] = useState(1);
  const [jobType, setJobType] = useState("all");
  const [status, setStatus] = useState("all");
  const [reloadTick, setReloadTick] = useState(0);

  // Changing a filter must reset to page 1, or a page-3 view of a narrower
  // result set lands past the end and shows nothing.
  const filterSig = `${jobType}|${status}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (filterSig !== prevFilterSig) {
    setPrevFilterSig(filterSig);
    setPage(1);
  }

  // Drop stale rows the moment the fetch key changes — "adjust state during
  // render", since the set-state-in-effect lint forbids the effect version.
  const fetchSig = `${filterSig}|${page}|${reloadTick}`;
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
        crumbs={["Jobs"]}
        title="Jobs"
        description="A run that finished with some items failing is still a completed run. Judge it by the failed count, not the status."
        action={
          <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      {/* gap-3: filter bar, same as every other control row in the portal. */}
      <div className="flex flex-wrap items-center gap-3">
        <Select items={TYPE_OPTIONS} value={jobType} onValueChange={(v) => setJobType(v as string)}>
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
        <Select items={STATUS_OPTIONS} value={status} onValueChange={(v) => setStatus(v as string)}>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="font-medium">{jobTypeLabel(job.job_type)}</div>
                    <div className="text-muted-foreground font-mono text-[11.5px]">
                      {job.id.slice(0, 8)}
                    </div>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AdminPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
