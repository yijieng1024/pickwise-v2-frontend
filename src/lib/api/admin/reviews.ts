import { apiFetch } from "@/lib/api/client";

export type TrustTier = "tier_1" | "tier_2";
export type RawReviewStatus = "pending" | "matched" | "rejected";

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

export interface ProcessBulkResult {
  candidates: number;
  processed: number;
  failed: number;
  chunks_saved: number;
  results: { review_id: string; video_title: string; chunks_saved?: number; error?: string }[];
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

export function listRawReviews(token: string, status?: RawReviewStatus): Promise<RawReview[]> {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<RawReview[]>(`/reviews/raw${qs}`, { token, next: { revalidate: 0 } });
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
