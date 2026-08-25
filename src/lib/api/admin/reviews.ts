import { apiFetch } from "@/lib/api/client";

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

export interface IngestBulkResult {
  message?: string;
  families_total?: number;
  families_already_covered?: number;
  families_attempted?: number;
  families_remaining?: number;
  discovered?: number;
  matched?: number;
  pending?: number;
  rejected?: number;
  results?: unknown[];
}

export interface RematchResult {
  pending_total: number;
  newly_matched: number;
}

/** One review's outcome inside a bulk run. A review can return without an
 * `error` and still have lost chunks — see `chunks_failed`. */
export interface ProcessBulkItem {
  review_id: string;
  video_title: string;
  chunks_total?: number;
  chunks_saved?: number;
  chunks_failed?: number;
  /** Per-chunk failures: timestamp window plus the exception class. */
  failures?: {
    chunk_index: number;
    start_seconds: number;
    end_seconds: number;
    error_type: string;
    error: string;
  }[];
  /** Set only when the whole review threw. */
  error?: string;
}

export interface ProcessBulkResult {
  candidates: number;
  processed: number;
  /** Reviews that threw outright. */
  failed: number;
  /** Reviews that returned but lost chunks. Distinct from `failed`: before the
   * backend reported per-chunk outcomes, a review that saved 3 of 40 chunks was
   * indistinguishable from a clean run. */
  partially_processed?: number;
  chunks_saved: number;
  chunks_failed?: number;
  results: ProcessBulkItem[];
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
  process: { candidates: number };
  aggregate: { pending_total: number; new: number; stale: number };
}

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

export function rematchPending(token: string): Promise<RematchResult> {
  return apiFetch<RematchResult>("/reviews/rematch", {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}

// --- Pipeline ---

export function ingestBulk(
  token: string,
  params: { limit?: number; skipCovered?: boolean } = {},
): Promise<IngestBulkResult> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.skipCovered !== undefined) query.set("skip_covered", String(params.skipCovered));
  return apiFetch<IngestBulkResult>(`/reviews/ingest-bulk?${query.toString()}`, {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Chunks, sentiment-tags and embeds one matched review. Blocking and slow —
 * one Gemini call plus one embedding call per chunk, so a single video can
 * take a minute or more.
 *
 * Two things `process-bulk` handles that this one does not, so the caller must:
 * the backend 400s on a review that isn't `matched`, and nothing here skips
 * reviews that already have chunks (bulk filters those out of its candidate
 * list instead), so re-running on a processed video stores a second copy.
 */
export function processReview(
  token: string,
  reviewId: string,
): Promise<{ chunks_saved: number }> {
  return apiFetch<{ chunks_saved: number }>(`/reviews/process/${reviewId}`, {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}

export function processBulk(token: string, limit?: number): Promise<ProcessBulkResult> {
  const qs = limit !== undefined ? `?limit=${limit}` : "";
  return apiFetch<ProcessBulkResult>(`/reviews/process-bulk${qs}`, {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
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
