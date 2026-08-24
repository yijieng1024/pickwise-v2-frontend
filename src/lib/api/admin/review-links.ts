import { apiFetch } from "@/lib/api/client";

/**
 * The review→laptop link table and the endpoints behind the linking screen
 * (backend ADR-0012).
 *
 * `raw_youtube_reviews.matched_laptop_id` could only ever say "this review is
 * about this one configuration", and both halves of that are usually wrong: a
 * comparison video covers several machines, and a reviewer covers a product
 * *line* without stating which RAM/SSD tier is on the bench. So a link carries
 * a required `family_id` and a nullable `laptop_id`, and a null laptop is the
 * honest, common answer — not a gap to be filled in later.
 *
 * `match_source` separates a human decision from a fuzzy-match hypothesis. The
 * old manual-match route wrote `match_confidence = 100.0` for a human, making
 * the two indistinguishable; human links now carry `match_confidence: null`
 * because a human did not score anything.
 */

export type MatchSource = "auto" | "human";

/** Mirrors the backend's `ReviewLinkRead`. */
export interface ReviewLink {
  id: string;
  raw_review_id: string;
  family_id: string;
  family_name: string | null;
  /** Null = the review covers this product line, tested config unknown. */
  laptop_id: string | null;
  /** Null both for a family-only link and for a since-deleted laptop. */
  laptop_name: string | null;
  match_source: MatchSource;
  /** Always null for `human` links. */
  match_confidence: number | null;
  tie_width: number | null;
  created_at: string;
}

/** One row of the pending queue. */
export interface PendingReview {
  id: string;
  video_id: string;
  video_url: string;
  video_title: string;
  channel_id: string;
  channel_name: string | null;
  published_at: string | null;
  status: string;
  match_confidence: number | null;
  /**
   * Transcript segments stored for this video, computed in SQL. Zero means
   * linking it produces no chunks however well it is matched — the row is
   * skippable, and the queue says so.
   */
  segment_count: number;
  has_transcript: boolean;
  links: ReviewLink[];
}

export interface PendingReviewPage {
  items: PendingReview[];
  total: number;
  skip: number;
  limit: number;
}

export interface FamilySearchResult {
  family_id: string;
  name: string;
  brand: string;
  is_verified: boolean;
  /** 1 means there is no configuration to choose between. */
  member_count: number;
}

export interface FamilyConfigColumn {
  key: string;
  label: string;
}

export interface FamilyConfig {
  laptop_id: string;
  product_name: string;
  model_code: string;
  status: string;
  /** Keyed by the `columns` above — only the fields that differ in this family. */
  specs: Record<string, string | number | boolean | null>;
}

export interface FamilyConfigs {
  family_id: string;
  name: string;
  is_verified: boolean;
  member_count: number;
  /**
   * Only the spec columns that actually differ between this family's members —
   * CPU/GPU/RAM for a gaming family, chip and storage for an Apple one. Do not
   * add columns back for completeness: comparing three fields instead of
   * fifteen is the entire point.
   */
  columns: FamilyConfigColumn[];
  /** True when members exist but differ in none of the tracked columns. */
  identical: boolean;
  configs: FamilyConfig[];
}

export function listPendingReviews(
  token: string,
  params: { search?: string; skip?: number; limit?: number } = {},
): Promise<PendingReviewPage> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  query.set("skip", String(params.skip ?? 0));
  query.set("limit", String(params.limit ?? 100));
  return apiFetch<PendingReviewPage>(`/reviews/pending?${query.toString()}`, {
    token,
    next: { revalidate: 0 },
  });
}

export function searchReviewFamilies(
  token: string,
  q: string,
  limit = 20,
): Promise<FamilySearchResult[]> {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("limit", String(limit));
  return apiFetch<FamilySearchResult[]>(`/reviews/families?${query.toString()}`, {
    token,
    next: { revalidate: 0 },
  });
}

export function getFamilyConfigs(token: string, familyId: string): Promise<FamilyConfigs> {
  return apiFetch<FamilyConfigs>(`/reviews/families/${familyId}/configs`, {
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Creates a human link. Omit `laptop_id` for the "tested config unknown" case.
 *
 * Returns the review's FULL link set, not just the new row, so the caller can
 * replace its local state without re-fetching the queue.
 *
 * Throws `ApiError` 409 when the review is already linked to that
 * family/config, and 400 when the laptop belongs to a different family than
 * the one passed. Both must be surfaced next to the control that caused them.
 */
export function createReviewLink(
  token: string,
  reviewId: string,
  input: { family_id: string; laptop_id?: string | null },
): Promise<ReviewLink[]> {
  return apiFetch<ReviewLink[]>(`/reviews/${reviewId}/links`, {
    method: "POST",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function deleteReviewLink(token: string, linkId: string): Promise<void> {
  return apiFetch<void>(`/reviews/links/${linkId}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}
