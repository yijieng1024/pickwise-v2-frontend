import { apiFetch } from "@/lib/api/client";

/**
 * The four long-running admin actions no longer hold the connection open:
 * they return 202 with a job to poll. See the backend's `admin.md` §9.
 */
export type JobType =
  | "processor.process_pending"
  | "processor.categorize_untagged"
  | "scraper.bulk_scrape"
  | "scraper.scrape_targets"
  | "embeddings.generate_all";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

/** One item that failed mid-run. Fills in live, not only at the end. */
export interface JobError {
  item: string;
  error: string;
}

/** Mirrors the backend's `JobAccepted` schema — the 202 body every 🔄 action returns. */
export interface JobAccepted {
  job_id: string;
  job_type: string;
  status: JobStatus;
  /**
   * The *actual* queue size, which is usually smaller than the requested
   * limit. Show this back rather than echoing what the admin typed.
   */
  total_count: number;
  estimated_seconds: number | null;
  estimated_completion_at: string | null;
  poll_url: string;
  message: string;
}

/** Mirrors the backend's `JobRead` schema (GET /jobs, GET /jobs/{job_id}). */
export interface Job {
  id: string;
  job_type: string;
  status: JobStatus;
  created_by: string | null;
  params: Record<string, unknown>;
  total_count: number;
  processed_count: number;
  succeeded_count: number;
  failed_count: number;
  /** Server-computed; always 100 once the job is finished, so the bar never sticks. */
  progress_percentage: number;
  errors: JobError[];
  /** Set when the *run itself* crashed (e.g. the server restarted mid-run). */
  error_message: string | null;
  /** The full report, populated on completion. Shape varies by `job_type`. */
  result: Record<string, unknown> | null;
  estimated_seconds: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface JobListResponse {
  items: Job[];
  total: number;
  skip: number;
  limit: number;
}

export interface ListJobsParams {
  jobType?: string;
  status?: JobStatus;
  /** Only jobs still queued or processing — what the topbar indicator polls. */
  activeOnly?: boolean;
  skip?: number;
  limit?: number;
}

export function listJobs(
  token: string,
  params: ListJobsParams = {},
): Promise<JobListResponse> {
  const query = new URLSearchParams();
  if (params.jobType) query.set("job_type", params.jobType);
  if (params.status) query.set("status", params.status);
  if (params.activeOnly) query.set("active_only", "true");
  query.set("skip", String(params.skip ?? 0));
  query.set("limit", String(params.limit ?? 50));

  return apiFetch<JobListResponse>(`/jobs?${query.toString()}`, {
    token,
    next: { revalidate: 0 },
  });
}

export function getJob(token: string, jobId: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${jobId}`, {
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Whether a job has stopped moving. Note this is about the *run*, not its
 * items: a job that finished with every item failing is still `completed`.
 */
export function isJobFinished(job: Pick<Job, "status">): boolean {
  return job.status === "completed" || job.status === "failed";
}

/** Human-readable job names — `job_type` is a dotted machine string. */
const JOB_TYPE_LABELS: Record<string, string> = {
  "processor.process_pending": "Process collected records",
  "processor.categorize_untagged": "Add missing tags",
  "scraper.bulk_scrape": "Bulk scrape brand",
  "scraper.scrape_targets": "Scrape selected targets",
  "embeddings.generate_all": "Generate embeddings",
};

export function jobTypeLabel(jobType: string): string {
  return JOB_TYPE_LABELS[jobType] ?? jobType;
}
