"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Job, jobTypeLabel, listJobs } from "@/lib/api/admin/jobs";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminStatusPill } from "../admin-status-pill";
import { AdminPageHeader } from "../admin-page-header";
import { AdminPagination } from "../admin-pagination";

const PAGE_SIZE = 25;

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
  const [reloadTick, setReloadTick] = useState(0);

  // Drop stale rows the moment a refresh is requested — "adjust state during
  // render", since the set-state-in-effect lint forbids the effect version.
  const [prevReloadTick, setPrevReloadTick] = useState(reloadTick);
  if (reloadTick !== prevReloadTick) {
    setPrevReloadTick(reloadTick);
    setJobs(null);
    setError(null);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    listJobs(token, { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE })
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
  }, [token, page, reloadTick]);

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

      <Card className="py-0">
        {error ? (
          <AdminErrorState message={error} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : jobs === null ? (
          <AdminLoadingState />
        ) : jobs.length === 0 ? (
          <AdminEmptyState
            icon={History}
            title="No jobs yet"
            description="Scraping and processing runs will appear here once you start one."
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
