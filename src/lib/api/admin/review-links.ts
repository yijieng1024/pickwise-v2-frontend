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
  /**
   * A readable row label built from what actually differs —
   * "Ultra 7 358H / Arc B390 / 32GB / 1TB". This replaced `model_code`, which
   * was a database key (`asus-expertbook-ultra-b9406caa-ultra7-358h-arcb390-32gb-1tb`):
   * unreadable at a glance, and a slug of the CPU/GPU/RAM/Storage columns
   * rendered in human form immediately beside it.
   */
  label: string;
  status: string;
  /**
   * Identical to another row in every shown column — a duplicate catalog entry.
   * Flagged rather than merged or hidden: merging would drop a laptop_id other
   * tables reference, and hiding one would make the choice for the human
   * without saying so. Say the pick is arbitrary instead.
   */
  indistinguishable: boolean;
  /** Keyed by the `columns` above — only the fields that differ in this family. */
  specs: Record<string, string | number | boolean | null>;
}

/**
 * Why the screen must branch on this rather than on the reason text. The three
 * unseparable cases are not the same case:
 *
 * - `ram_storage_only` — the question has NO answer. No review states whether
 *   the unit had 32GB or 64GB, and no conclusion in the video would change if
 *   it did. Show the reason, render no chooser.
 * - `single_config` — nothing to choose *between*, but the one row may still be
 *   the right link if the video names it.
 * - `identical_specs` — members exist and differ in nothing tracked.
 * - `no_configs` — every member is suspended, so the filter emptied the family.
 *   Reachable and not a data error.
 */
export type SeparabilityCode =
  | "separable"
  | "ram_storage_only"
  | "single_config"
  | "identical_specs"
  | "no_configs";

/** One thing the source material actually says about the configuration. */
export interface EvidenceHit {
  column: string;
  label: string;
  /** The catalog value this is evidence for. */
  value: string;
  /** What was actually found in the text. */
  matched_text: string;
  source: "description" | "transcript";
  context: string;
  /** Transcript hits only — the second it was said at. */
  timestamp_seconds: number | null;
  /** Members carrying this value. One id = this hit alone narrows to one row. */
  laptop_ids: string[];
}

export interface ConfigEvidence {
  hits: EvidenceHit[];
  searched: { column: string; label: string; distinct_values: number; probes: number }[];
  sources_available: { description: boolean; transcript: boolean };
  /**
   * True means "we looked and the video does not say" — a real answer that
   * tells the human to stop looking. Deliberately distinct from having no
   * source material at all, which `sources_available` reports instead.
   */
  found_nothing: boolean;
}

export interface FamilyConfigs {
  family_id: string;
  name: string;
  is_verified: boolean;
  member_count: number;
  /**
   * Suspended rows withheld from `configs`. Surfaced rather than dropped
   * silently: a row that was in yesterday's list needs its absence explained on
   * the page. `inactive` rows are NOT withheld — a delisted laptop is the normal
   * subject of an old review.
   */
  excluded_suspended: number;
  /**
   * Only the spec columns that actually differ between this family's members,
   * recomputed AFTER suspended rows are dropped. Do not add columns back for
   * completeness: comparing three fields instead of fifteen is the entire point.
   */
  columns: FamilyConfigColumn[];
  /** True when members exist but differ in none of the tracked columns. */
  identical: boolean;
  /** False = render no chooser at all. See `SeparabilityCode`. */
  separable: boolean;
  separability_code: SeparabilityCode;
  separability_reason: string | null;
  /** Present only when `getFamilyConfigs` was passed a review id. */
  evidence: ConfigEvidence | null;
  /** How many rows are flagged `indistinguishable`. */
  indistinguishable_count: number;
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

/**
 * Pass `reviewId` to get the `evidence` block: the backend scans that video's
 * description and transcript for spec strings belonging to THIS family's
 * members. Without it the human has nothing to decide with — a title like "The
 * First Panther Lake Laptop I Strongly Recommend" names no CPU, GPU or RAM, so
 * answering honestly would mean watching the video.
 */
export function getFamilyConfigs(
  token: string,
  familyId: string,
  reviewId?: string,
): Promise<FamilyConfigs> {
  const query = reviewId ? `?review_id=${encodeURIComponent(reviewId)}` : "";
  return apiFetch<FamilyConfigs>(`/reviews/families/${familyId}/configs${query}`, {
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
