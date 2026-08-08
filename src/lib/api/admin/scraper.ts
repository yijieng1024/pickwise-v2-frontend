import type { JobAccepted } from "@/lib/api/admin/jobs";
import { apiFetch, apiFetchWithTotal } from "@/lib/api/client";

/**
 * Two shapes, because the backend answers "nothing found" with a different
 * key than the normal path. A result of "found 49, added 0" is a *success*
 * (every link was already queued), not a failure — don't style it as one.
 */
export interface FeedCrawlerResult {
  message: string;
  total_found?: number;
  added_to_queue?: number;
  added_count?: number;
}

export interface ScrapeUrlResult {
  message: string;
  status?: string;
  variants_saved?: number;
  laptop_ids?: string[];
  last_scraped_at?: string;
}

export interface BulkScrapeUrlResult {
  url: string;
  status: string;
  error: string | null;
}

/**
 * The `result` payload of a finished `scraper.bulk_scrape` /
 * `scraper.scrape_targets` job. The selected-targets variant names its
 * second key `total_selected` instead of `total_pending`.
 */
export interface BulkScrapeReport {
  brand: string;
  total_pending?: number;
  total_selected?: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  log_file: string | null;
  results: BulkScrapeUrlResult[];
}

/**
 * Queues every laptop link found on the brand's own site.
 *
 * The URL crawled is the brand's stored `base_scrape_url` — the backend does
 * not accept one from the client, so a brand can never be crawled against
 * another brand's site. Change it on the brand record instead.
 */
export function feedCrawler(token: string, brandId: string): Promise<FeedCrawlerResult> {
  return apiFetch<FeedCrawlerResult>("/scraper/feed-crawler", {
    method: "POST",
    token,
    body: JSON.stringify({ brand_id: brandId }),
    next: { revalidate: 0 },
  });
}

export function scrapeUrl(
  token: string,
  url: string,
  brandId: string,
): Promise<ScrapeUrlResult> {
  return apiFetch<ScrapeUrlResult>("/scraper/scrape-url", {
    method: "POST",
    token,
    body: JSON.stringify({ url, brand_id: brandId }),
    next: { revalidate: 0 },
  });
}

/**
 * Starts a background run over everything pending or previously failed for
 * one brand. Returns 202 with a job to poll, not a finished report.
 */
export function bulkScrape(token: string, brandId: string): Promise<JobAccepted> {
  return apiFetch<JobAccepted>("/scraper/bulk-scrape", {
    method: "POST",
    token,
    body: JSON.stringify({ brand_id: brandId }),
    next: { revalidate: 0 },
  });
}

/**
 * Starts a background run over just the rows the admin ticked. Unlike
 * `bulkScrape`, selected rows are always re-scraped even if they already
 * succeeded.
 */
export function scrapeTargets(token: string, targetIds: string[]): Promise<JobAccepted> {
  return apiFetch<JobAccepted>("/scraper/scrape-targets", {
    method: "POST",
    token,
    body: JSON.stringify({ target_ids: targetIds }),
    next: { revalidate: 0 },
  });
}

// ---------------------------------------------------------------------------
// The scrape queue (`laptop_scrape_urls`)
// ---------------------------------------------------------------------------

/**
 * `parsed` and `completed` are both success — they differ only in how the
 * data arrived (an uploaded file vs a live scrape). `failed` is retried
 * automatically on the next bulk run, so it reads as a warning, not an alarm.
 */
export type ScrapeStatus =
  | "pending"
  | "html_uploaded"
  | "parsed"
  | "completed"
  | "failed"
  | "skipped";

export interface ScrapeTarget {
  id: string;
  url: string;
  brand_id: string;
  /** Resolved server-side so the queue doesn't need a second call for names. */
  brand_name: string;
  scrape_status: ScrapeStatus;
  is_active: boolean;
  last_scraped_at: string | null;
  created_at: string;
}

export interface ScrapeTargetListResponse {
  total: number;
  limit: number;
  offset: number;
  targets: ScrapeTarget[];
}

/** One count per status, plus the total. Answers all six queue tabs in one call. */
export type ScrapeStatusCounts = Record<ScrapeStatus, number> & { total: number };

export function getScrapeStatusCounts(
  token: string,
  brandId?: string,
): Promise<ScrapeStatusCounts> {
  const query = brandId ? `?brand_id=${brandId}` : "";
  return apiFetch<ScrapeStatusCounts>(`/scraper/targets/status-counts${query}`, {
    token,
    next: { revalidate: 0 },
  });
}

export function listScrapeTargets(
  token: string,
  params: {
    brandId?: string;
    scrapeStatus?: ScrapeStatus;
    isActive?: boolean;
    offset?: number;
    limit?: number;
  } = {},
): Promise<ScrapeTargetListResponse> {
  const query = new URLSearchParams();
  if (params.brandId) query.set("brand_id", params.brandId);
  if (params.scrapeStatus) query.set("scrape_status", params.scrapeStatus);
  if (params.isActive !== undefined) query.set("is_active", String(params.isActive));
  query.set("offset", String(params.offset ?? 0));
  query.set("limit", String(params.limit ?? 100));

  return apiFetch<ScrapeTargetListResponse>(`/scraper/targets?${query.toString()}`, {
    token,
    next: { revalidate: 0 },
  });
}

// ---------------------------------------------------------------------------
// Acer manual HTML upload
// ---------------------------------------------------------------------------

/**
 * Per-file outcome. Every file is judged independently, so 49 files can come
 * back as 46 matched / 2 unmatched / 1 invalid and the 46 are still stored.
 *
 * - `matched`   stored; `created` distinguishes a new record from a refresh
 * - `unmatched` a valid product page with no queue row yet — recoverable,
 *               and not the admin's mistake
 * - `invalid`   not a product page, usually a "checking your browser" screen
 *               the browser saved instead. Re-save and retry.
 */
export interface RawHtmlUploadResult {
  source_name: string;
  status: "matched" | "unmatched" | "invalid";
  canonical_url: string | null;
  target_id: string | null;
  created: boolean | null;
  error: string | null;
  /**
   * Stored fine, but the page looks wrong — nearly always a "Webpage,
   * Complete" save, whose image links point at a sidecar folder that is never
   * uploaded. Distinct from `error`: the page was still accepted.
   */
  warning: string | null;
}

export interface RawHtmlUploadSummary {
  received: number;
  matched: number;
  unmatched: number;
  invalid: number;
  inserted: number;
  updated: number;
  /** Subset of `matched` that stored cleanly but carried a warning. */
  warnings: number;
  results: RawHtmlUploadResult[];
}

/**
 * Uploads saved product pages for brands that block automated access.
 *
 * Filenames are irrelevant: each saved page carries a hidden product tag the
 * backend reads to match it to the right queue row. Re-uploading a page that
 * was already sent is normal and refreshes a stale price.
 */
export function uploadHtml(
  token: string,
  files: File[],
  params: { brandId?: string; productType?: string } = {},
): Promise<RawHtmlUploadSummary> {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  form.append("product_type", params.productType ?? "laptop");
  if (params.brandId) form.append("brand_id", params.brandId);

  return apiFetch<RawHtmlUploadSummary>("/scraper/upload-html", {
    method: "POST",
    token,
    body: form,
    next: { revalidate: 0 },
  });
}

// ---------------------------------------------------------------------------
// Raw collected records (`raw_scrap_laptops`)
// ---------------------------------------------------------------------------

/**
 * A price entry as scraped. The backend column is untyped JSONB (its model
 * annotates `List[str]` but never enforces it) and the ASUS scraper writes
 * `[{ price: "RM 4,999" }]`, so entries can be either shape.
 */
export type RawPrice = string | { price?: string | number; [key: string]: unknown };

/** Mirrors the backend's `RawScrapLaptop` table (GET /scraper/raw-laptop/{id}, GET /laptops/raw-scrap-laptops). */
export interface RawScrapLaptop {
  id: string;
  source_url: string;
  brand_id: string;
  raw_product_name: string;
  raw_prices: RawPrice[];
  image_urls: string[];
  raw_specs_dump: Record<string, unknown>;
  processing_status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
}

export function getRawLaptop(token: string, id: string): Promise<RawScrapLaptop> {
  return apiFetch<RawScrapLaptop>(`/scraper/raw-laptop/${id}`, {
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Lives under `/laptops` on the backend (`app/laptops/laptop_router.py`), not
 * `/scraper` — grouped here anyway since it's the raw-scrap queue the
 * Pipeline tab monitors, not laptop-catalog data.
 */
export function listRawScrapLaptops(
  token: string,
  params: {
    processingStatus?: RawScrapLaptop["processing_status"];
    offset?: number;
    limit?: number;
  } = {},
): Promise<{ items: RawScrapLaptop[]; total: number }> {
  const query = new URLSearchParams();
  if (params.processingStatus) query.set("processing_status", params.processingStatus);
  query.set("offset", String(params.offset ?? 0));
  query.set("limit", String(params.limit ?? 50));
  // Bare-array body, filtered count in X-Total-Count — so `limit: 1` is a
  // cheap way to ask "how many are in this state?".
  return apiFetchWithTotal<RawScrapLaptop[]>(
    `/laptops/raw-scrap-laptops?${query.toString()}`,
    { token, next: { revalidate: 0 } },
  );
}
