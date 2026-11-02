import type { JobAccepted } from "@/lib/api/admin/jobs";
import { apiFetch } from "@/lib/api/client";

export type PriceGuideKind = "consumer" | "rog" | "business";

/** Mirrors the backend's `PriceGuide` table. Listed newest first. */
export interface PriceGuide {
  id: string;
  kind: PriceGuideKind;
  filename: string;
  pdf_sha256: string;
  edition_text: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  row_count: number;
  /** What the last workflow run did to this guide. */
  last_run_id: number | null;
  last_run_note: string | null;
}

/** One workflow run as GitHub reports it. Mirrors the backend's `ExtractionRun`. */
export interface ExtractionRun {
  run_id: number;
  /** `completed` is the only final value; the rest are queued, running or waiting. */
  status: string;
  conclusion: string | null;
  url: string;
  created_at: string;
  /** The step running now, or the one that failed. */
  step: string | null;
  guide_id: string | null;
  filename: string | null;
  note: string | null;
  is_new_guide: boolean;
}

export interface GuideRow {
  sku: string;
  price_rm: number | null;
  page: number;
  /** The printed cell. Null on a row stored before panels were kept. */
  panel: string | null;
}

export interface GuideLaptop {
  id: string;
  product_name: string;
  model_code: string;
  status: string;
  /** 0 is the catalog's "price unknown". */
  price_rm: number;
}

export interface MatchedLaptop extends GuideLaptop {
  guide_price_rm: number;
  /** `fill` writes the guide's price; `confirm` is the same price, Last Checked only. */
  action: "fill" | "confirm" | "differs";
  price_source: string | null;
  rows: GuideRow[];
}

export interface SuffixRuleLaptop extends GuideLaptop {
  catalog_sku: string | null;
  guide_sku: string;
  guide_price_rm: number;
  rows: GuideRow[];
}

/** Found through the base model code only, so an apply leaves it for an admin. */
export interface BaseCodeLaptop extends GuideLaptop {
  guide_sku: string;
  guide_price_rm: number;
  rows: GuideRow[];
}

export interface AmbiguousRow extends GuideRow {
  candidates: GuideLaptop[];
}

export interface ConflictLaptop extends GuideLaptop {
  reason: "price" | "panel";
  /** The laptop's `display_type`. */
  catalog_panel: string | null;
  rows: GuideRow[];
}

/** Mirrors `price_guide_service.preview`. An apply runs the same match and fill rule. */
export interface PriceGuidePreview {
  guide_id: string;
  matched: MatchedLaptop[];
  differs_from_guide: MatchedLaptop[];
  matched_by_suffix_rule: SuffixRuleLaptop[];
  matched_by_base_code: BaseCodeLaptop[];
  ambiguous: AmbiguousRow[];
  conflict: ConflictLaptop[];
  unmatched_guide: GuideRow[];
  unpriced: GuideRow[];
  uncovered: GuideLaptop[];
}

export function listPriceGuides(token: string): Promise<PriceGuide[]> {
  return apiFetch<PriceGuide[]>("/admin/price-guides", { token, next: { revalidate: 0 } });
}

/**
 * Starts the GitHub Actions workflow. Follow it with `getExtractionRun`. `run_id` is
 * null when GitHub doesn't name the run.
 */
export function startPriceGuideExtraction(
  token: string,
  driveLink: string,
  kind: PriceGuideKind,
): Promise<{ drive_file_id: string; kind: PriceGuideKind; message: string; run_id: number | null }> {
  return apiFetch("/admin/price-guides/extract", {
    method: "POST",
    token,
    body: JSON.stringify({ drive_link: driveLink, kind }),
    next: { revalidate: 0 },
  });
}

/** One run, or the latest with no id. Null when the workflow has never run. */
export function getExtractionRun(token: string, runId?: number): Promise<ExtractionRun | null> {
  const query = runId === undefined ? "" : `?run_id=${runId}`;
  return apiFetch<ExtractionRun | null>(`/admin/price-guides/extraction${query}`, {
    token,
    next: { revalidate: 0 },
  });
}

export function getPriceGuidePreview(token: string, guideId: string): Promise<PriceGuidePreview> {
  return apiFetch<PriceGuidePreview>(`/admin/price-guides/${guideId}/preview`, {
    token,
    next: { revalidate: 0 },
  });
}

export function applyPriceGuide(token: string, guideId: string): Promise<JobAccepted> {
  return apiFetch<JobAccepted>(`/admin/price-guides/${guideId}/apply`, {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}

/** Permanent. 409 if a laptop price came from this guide, or while an apply runs. */
export function deletePriceGuide(token: string, guideId: string): Promise<void> {
  return apiFetch<void>(`/admin/price-guides/${guideId}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}

/**
 * "Use guide price" for a selection. All or nothing: 409 if any laptop has left
 * the lists since the preview, or while an apply runs.
 */
export function writeGuidePrices(
  token: string,
  guideId: string,
  laptopIds: string[],
): Promise<{ guide_id: string; updated: number }> {
  return apiFetch(`/admin/price-guides/${guideId}/use-guide-price`, {
    method: "POST",
    token,
    body: JSON.stringify({ laptop_ids: laptopIds }),
    next: { revalidate: 0 },
  });
}
