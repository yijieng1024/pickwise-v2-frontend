import { apiFetch } from "@/lib/api/client";

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

/** Mirrors the backend's bulk-scrape response payload (POST /scraper/bulk-scrape). */
export interface BulkScrapeReport {
  brand: string;
  total_pending: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  log_file: string | null;
  results: BulkScrapeUrlResult[];
}

export function feedCrawler(
  token: string,
  startUrl: string,
  brandId: string,
): Promise<FeedCrawlerResult> {
  return apiFetch<FeedCrawlerResult>("/scraper/feed-crawler", {
    method: "POST",
    token,
    body: JSON.stringify({ start_url: startUrl, brand_id: brandId }),
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

export function bulkScrape(token: string, brandId: string): Promise<BulkScrapeReport> {
  return apiFetch<BulkScrapeReport>("/scraper/bulk-scrape", {
    method: "POST",
    token,
    body: JSON.stringify({ brand_id: brandId }),
    next: { revalidate: 0 },
  });
}

/** Mirrors the backend's `RawScrapLaptop` table (GET /scraper/raw-laptop/{id}, GET /laptops/raw-scrap-laptops). */
export interface RawScrapLaptop {
  id: string;
  source_url: string;
  brand_id: string;
  raw_product_name: string;
  raw_prices: string[];
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
  params: { offset?: number; limit?: number } = {},
): Promise<RawScrapLaptop[]> {
  const query = new URLSearchParams();
  query.set("offset", String(params.offset ?? 0));
  query.set("limit", String(params.limit ?? 50));
  return apiFetch<RawScrapLaptop[]>(`/laptops/raw-scrap-laptops?${query.toString()}`, {
    token,
    next: { revalidate: 0 },
  });
}
