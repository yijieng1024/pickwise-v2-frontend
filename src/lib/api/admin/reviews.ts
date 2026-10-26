import { apiFetch } from "@/lib/api/client";
import type { JobAccepted, JobStatus } from "@/lib/api/admin/jobs";

export type TrustTier = "tier_1" | "tier_2";
/**
 * `irrelevant` is a human dismissal — "this video is not about a laptop" —
 * and is deliberately NOT a flavour of `rejected`, which means "a laptop video
 * whose transcript could not be fetched". A rejected row is a transcript-retry
 * candidate; an irrelevant one never is, however many transcripts appear.
 *
 * The row is marked rather than deleted, and that is what makes the dismissal
 * stick: `video_id` is UNIQUE and the backend's ingest skips any existing row
 * that is not `rejected`, so a deleted row would be rediscovered and reinserted
 * on the next run and land straight back in the queue.
 */
export type RawReviewStatus = "pending" | "matched" | "rejected" | "irrelevant";

/** Mirrors the backend's `YoutubeChannel` table. */
export interface YoutubeChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_img_url: string | null;
  trust_tier: TrustTier;
  active: boolean;
  created_at: string;
}

export interface ChannelCreateInput {
  channel_url: string;
  trust_tier?: TrustTier;
  active?: boolean;
}

export interface ChannelUpdateInput {
  trust_tier?: TrustTier;
  active?: boolean;
}

/** Mirrors the backend's `RawYoutubeReviewRead` schema. */
export interface RawReview {
  id: string;
  video_id: string;
  channel_id: string;
  video_title: string;
  published_at: string | null;
  matched_laptop_id: string | null;
  /** Resolved server-side from `matched_laptop_id`. Null when unmatched. */
  matched_laptop_name: string | null;
  match_confidence: number | null;
  status: RawReviewStatus;
  created_at: string;
}

/** Queue depth per pipeline stage. Read-only, costs no YouTube quota, so it is
 * safe to load with the page. Each count is computed by the same code path as
 * the run that consumes it. */
export interface PipelineStatus {
  ingest: {
    families_total: number;
    families_covered: number;
    families_remaining: number;
    active_channels: number;
    /** active_channels x 100. Multiply by the batch size for the real spend. */
    quota_units_per_family: number;
    daily_quota_units: number;
  };
  link: {
    pending_total: number;
    pending_linked: number;
    pending_unlinked: number;
    /** Reviews dismissed as not about a laptop. */
    irrelevant_total: number;
    reviews_total: number;
    /**
     * irrelevant_total / reviews_total. The RATIO is the number to watch, not
     * the count: it measures what dropping the "review" keyword from discovery
     * cost. ~10-15% means the recall gain was worth it; ~40% means discovery is
     * too loose and wants `laptop`/`notebook` added as a term — not `review`
     * put back, since the original problem was that Chinese channels do not
     * title in English.
     */
    irrelevant_ratio: number;
  };
  /** `paused` = REVIEW_PROCESSING_PAUSED: both processing calls 409 while it is set. */
  process: {
    candidates: number;
    /** Windows left per candidate, in process-bulk's order: the first N summed
     * is what a batch of N sends to Gemma and to the embedder (one call each). */
    candidate_windows: number[];
    paused: boolean;
    /** Why it is paused (admin-set). Returned whether or not `paused` is true. */
    pause_reason: string | null;
    pause_reason_updated_at: string | null;
  };
  /** found -> transcript -> linked -> processed -> shown. count(previous) =
   * count(step) + sum(stuck): `stuck` holds the reasons a review stopped just
   * short of this step, each one a `stuck=` filter on /reviews/raw. */
  funnel: FunnelStep[];
  claims: {
    shown: number;
    hidden_price: number;
    unattached: Record<UnattachedReason, number>;
  };
  coverage: {
    families_with_active: number;
    families_with_reviews: number;
    active_laptops: number;
    active_laptops_with_reviews: number;
  };
  quota: {
    /** Google's quota day, midnight Pacific, as UTC instants. */
    day_start: string;
    resets_at: string;
    models: QuotaRow[];
    embedding: QuotaRow & { shared_with: string };
  };
  recent_runs: ReviewRun[];
}

export type FunnelStepName = "found" | "transcript" | "linked" | "processed" | "shown";

export type StuckReason =
  | "transcript_terminal"
  | "transcript_retryable"
  | "transcript_deferred"
  | "transcript_unknown"
  | "unlinked"
  | "never_processed"
  | "partial"
  | "reprocess_requested"
  | "no_shown_claims";

export interface FunnelStep {
  step: FunnelStepName;
  count: number;
  stuck: Partial<Record<StuckReason, number>>;
}

export type UnattachedReason = "other_laptop" | "several" | "none" | "config_unknown";

export interface QuotaRow {
  model: string;
  /** 0 = primary, n = backup n, null = not in the chain (or the embedder). */
  position: number | null;
  calls_today: number;
  /** null: the model has no known free-tier limit. */
  limit_rpd: number | null;
  remaining: number | null;
}

export interface ReviewRun {
  job_id: string;
  job_type: string;
  status: JobStatus;
  created_at: string;
  finished_at: string | null;
  succeeded: number;
  failed: number;
  error_message: string | null;
  first_error: { item: string; error: string } | null;
}

/** The line shown beside a processing button that is disabled by the pause. */
export const PROCESSING_PAUSED_MESSAGE = "Processing is paused (Review C accuracy check).";

export function getPipelineStatus(token: string): Promise<PipelineStatus> {
  return apiFetch<PipelineStatus>("/reviews/pipeline-status", {
    token,
    next: { revalidate: 0 },
  });
}

export interface AggregateResult {
  laptop_id: string;
  review_count: number;
  strengths: string[];
  weaknesses: string[];
}

// --- Channels ---

export function listChannels(token: string): Promise<YoutubeChannel[]> {
  return apiFetch<YoutubeChannel[]>("/reviews/channels", { token, next: { revalidate: 0 } });
}

export function addChannel(token: string, input: ChannelCreateInput): Promise<YoutubeChannel> {
  return apiFetch<YoutubeChannel>("/reviews/channels", {
    method: "POST",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function updateChannel(
  token: string,
  id: string,
  input: ChannelUpdateInput,
): Promise<YoutubeChannel> {
  return apiFetch<YoutubeChannel>(`/reviews/channels/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

// --- Raw reviews ---

/** Mirrors the backend's generic `Page[RawYoutubeReviewRead]` envelope. */
export interface RawReviewPage {
  items: RawReview[];
  total: number;
  skip: number;
  limit: number;
}

export interface ListRawReviewsParams {
  status?: RawReviewStatus;
  /** Reviews that reached a funnel step (that step's count). */
  step?: FunnelStepName;
  /** Reviews stuck for one reason (a funnel stuck count). */
  stuck?: StuckReason;
  /** Case-insensitive match on the video title. */
  search?: string;
  skip?: number;
  limit?: number;
}

/** Real server-side search/filter/pagination. Pass `limit: 1` to read a count
 * without pulling rows. */
export function listRawReviews(
  token: string,
  params: ListRawReviewsParams = {},
): Promise<RawReviewPage> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.step) query.set("step", params.step);
  if (params.stuck) query.set("stuck", params.stuck);
  if (params.search) query.set("search", params.search);
  query.set("skip", String(params.skip ?? 0));
  query.set("limit", String(params.limit ?? 25));
  return apiFetch<RawReviewPage>(`/reviews/raw?${query.toString()}`, {
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Dismiss a review as not about a laptop, or undo that dismissal.
 *
 * One endpoint with a flag rather than a mark route and a separate undo route:
 * the undo has to be as reachable as the dismissal, and a second endpoint is
 * the kind of thing that gets built and never wired into the screen.
 *
 * The transition is restricted to `pending` <-> `irrelevant` (409 otherwise)
 * because undo has exactly one destination. Letting a `matched` or `rejected`
 * row in would mean restoring it as `pending` and silently discarding a match
 * or a transcript-failure verdict.
 *
 * Idempotent — the dismiss button will be double-clicked.
 */
export function setReviewIrrelevant(
  token: string,
  reviewId: string,
  irrelevant: boolean,
): Promise<RawReview> {
  return apiFetch<RawReview>(`/reviews/raw/${reviewId}/irrelevant`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ irrelevant }),
    next: { revalidate: 0 },
  });
}

export function manualMatch(token: string, reviewId: string, laptopId: string): Promise<RawReview> {
  return apiFetch<RawReview>(`/reviews/raw/${reviewId}/match`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ laptop_id: laptopId }),
    next: { revalidate: 0 },
  });
}

/** Every run below is a background job: 202 with a job id, then poll it
 * (useJob). The old response body is the finished job's `result`. */
function startReviewJob(token: string, path: string): Promise<JobAccepted> {
  return apiFetch<JobAccepted>(path, { method: "POST", token, next: { revalidate: 0 } });
}

export function rematchPending(token: string): Promise<JobAccepted> {
  return startReviewJob(token, "/reviews/rematch");
}

// --- Pipeline ---

export function ingestBulk(
  token: string,
  params: { limit?: number; skipCovered?: boolean } = {},
): Promise<JobAccepted> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.skipCovered !== undefined) query.set("skip_covered", String(params.skipCovered));
  return startReviewJob(token, `/reviews/ingest-bulk?${query.toString()}`);
}

/** Zero YouTube quota, but rate-limited by YouTube: the backend paces fetches
 * (default 2 s) and stops after 3 blocks in a row. */
export function retryTranscripts(token: string, limit?: number): Promise<JobAccepted> {
  const qs = limit !== undefined ? `?limit=${limit}` : "";
  return startReviewJob(token, `/reviews/retry-transcripts${qs}`);
}

/** "Summarize transcript": one review, as a job. 409 before any job exists
 * while paused, while processing runs, or when the review has nothing left
 * to process; 404 for an unknown review. */
export function processReview(token: string, reviewId: string): Promise<JobAccepted> {
  return startReviewJob(token, `/reviews/process/${reviewId}`);
}

export function processBulk(token: string, limit?: number): Promise<JobAccepted> {
  const qs = limit !== undefined ? `?limit=${limit}` : "";
  return startReviewJob(token, `/reviews/process-bulk${qs}`);
}

export function aggregateLaptop(token: string, laptopId: string): Promise<AggregateResult> {
  return apiFetch<AggregateResult>(`/reviews/aggregate/${laptopId}`, {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}

// --- Summaries ---

/**
 * `new` means nothing has ever been aggregated for this laptop; `stale` means
 * a review chunk arrived after the last aggregation. Laptops already covered
 * are omitted, so this list is the work queue.
 */
export interface PendingSummary {
  laptop_id: string;
  product_name: string;
  model_code: string;
  chunk_count: number;
  summary_review_count: number;
  last_aggregated_at: string | null;
  state: "new" | "stale";
}

export function listPendingSummaries(
  token: string,
): Promise<{ total: number; items: PendingSummary[] }> {
  return apiFetch<{ total: number; items: PendingSummary[] }>("/reviews/summaries/pending", {
    token,
    next: { revalidate: 0 },
  });
}

export interface LaptopReviewSummary {
  laptop_id: string;
  review_count: number;
  strengths: string[];
  weaknesses: string[];
  last_updated_at: string;
}

/**
 * Reads the stored roll-up. Unlike `aggregateLaptop`, this does not recompute
 * anything, so previewing what the chatbot quotes costs nothing. 404s when
 * the laptop has never been aggregated.
 */
export function getLaptopReviewSummary(
  token: string,
  laptopId: string,
): Promise<LaptopReviewSummary> {
  return apiFetch<LaptopReviewSummary>(`/reviews/summaries/${laptopId}`, {
    token,
    next: { revalidate: 0 },
  });
}
