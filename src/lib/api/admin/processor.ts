import type { JobAccepted } from "@/lib/api/admin/jobs";
import { apiFetch } from "@/lib/api/client";

/**
 * Both endpoints below return **202 Accepted** with a job to poll, not a
 * finished report — the backend stopped holding the connection open (see
 * `admin.md` §9). The shapes here describe the job's terminal `result`
 * payload, which arrives via `GET /jobs/{id}` once the run completes.
 */

export interface ProcessPendingDetail {
  raw_id: string;
  product_name: string;
  status: string;
  variants_extracted: number;
  variants_saved: number;
  variants_updated: number;
  error: string | null;
}

/** The `result` payload of a finished `processor.process_pending` job. */
export interface ProcessPendingResult {
  message: string;
  requests_made?: number;
  total_new_variants_saved?: number;
  total_variants_updated?: number;
  pending_remaining?: number;
  details?: ProcessPendingDetail[];
}

export interface CategorizeUntaggedError {
  laptop_id: string;
  product_name: string;
  error: string;
}

/** The `result` payload of a finished `processor.categorize_untagged` job. */
export interface CategorizeUntaggedResult {
  status: string;
  /** Only present on the nothing-to-do path. */
  message?: string;
  attempted: number;
  tagged: number;
  links_added: number;
  untagged_remaining: number;
  errors: CategorizeUntaggedError[];
}

/**
 * Starts a background run over the collected-but-unprocessed records.
 *
 * `limit` is a ceiling, not a promise: the returned `total_count` is the real
 * number pending, which is usually smaller. Show that back to the admin
 * rather than echoing what they asked for.
 */
export function processPending(token: string, limit = 100): Promise<JobAccepted> {
  return apiFetch<JobAccepted>(`/processor/process-pending?limit=${limit}`, {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Starts a background run that fills in missing use-case tags. Additive: it
 * never removes a tag an admin set by hand, which is what makes it safe to
 * re-run.
 */
export function categorizeUntagged(token: string, limit = 100): Promise<JobAccepted> {
  return apiFetch<JobAccepted>(`/processor/categorize-untagged?limit=${limit}`, {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Processes a single raw record. Unlike the batch endpoints this one is
 * genuinely synchronous — it is one LLM call, so it answers inline with no
 * job to poll.
 */
export function processSingle(token: string, rawLaptopId: string): Promise<unknown> {
  return apiFetch<unknown>(`/processor/process/${rawLaptopId}`, {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}
