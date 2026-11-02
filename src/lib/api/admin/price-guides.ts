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
}

export interface GuideRow {
  sku: string;
  price_rm: number | null;
  page: number;
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
 * Starts the GitHub Actions workflow. There is no job to poll: the guide simply
 * appears in `listPriceGuides` when the workflow finishes.
 */
export function startPriceGuideExtraction(
  token: string,
  driveLink: string,
  kind: PriceGuideKind,
): Promise<{ drive_file_id: string; kind: PriceGuideKind; message: string }> {
  return apiFetch("/admin/price-guides/extract", {
    method: "POST",
    token,
    body: JSON.stringify({ drive_link: driveLink, kind }),
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
