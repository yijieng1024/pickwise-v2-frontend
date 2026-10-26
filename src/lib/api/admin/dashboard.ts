import { apiFetch } from "@/lib/api/client";
import type { Job, JobStatus } from "@/lib/api/admin/jobs";

/** GET /admin/dashboard/summary: the whole Dashboard in one request. Dates
 * are raw ISO strings; colour thresholds live in lib/admin/freshness.ts. */
export interface DashboardSummary {
  generated_at: string;
  attention: {
    failed_jobs_7d: number;
    jobs_with_item_failures_7d: number;
    /** The newest few of those two counts, so the row can name them. */
    failed_job_list: { id: string; job_type: string; status: JobStatus; failed_count: number }[];
    review_processing: { paused: boolean; reason: string | null };
    pickscore: { missing: number; withheld: number; unverified: number };
    /** Inactive with price 0. */
    awaiting_price: number;
    reviews_to_link: number;
    pico_24h: { runs: number; errors: number; fallbacks: number };
  };
  freshness: {
    scrape_by_brand: {
      brand_id: string;
      brand_name: string;
      source: "scrape" | "upload";
      /** False: no scraper exists, so a null date means "manual only". */
      has_scraper: boolean;
      last_at: string | null;
    }[];
    /** Null until step 10 records PassMark refreshes. */
    passmark_refreshed_at: string | null;
    pickscore_recalculated_at: string | null;
    /** PickScore is stale when it is older than this. */
    catalog_changed_at: string | null;
    embeddings_updated_at: string | null;
    price_checked_oldest_at: string | null;
    /** Active laptops with no trustworthy "Last Checked" date. */
    price_checked_missing: number;
  };
  jobs: { running: Job[]; recent: Job[] };
  catalog: {
    active: number;
    inactive: number;
    suspended: number;
    active_with_pickscore: number;
    active_with_embedding: number;
    active_with_reviews: number;
  };
  /** Rolling windows, not calendar days. */
  pico: {
    conversations_24h: number;
    conversations_7d: number;
    runs_24h: number;
    runs_7d: number;
    errors_24h: number;
    errors_7d: number;
    fallbacks_24h: number;
    fallbacks_7d: number;
  };
  trends: DashboardTrends;
}

/** 14 Malaysia days, oldest first, today last; every series is one value per day. */
export interface DashboardTrends {
  days: string[];
  pico_conversations: number[];
  /** `embedding` is null on days before embedding calls were logged (a gap, not zero). */
  api_calls: {
    pico: number[];
    embedding: (number | null)[];
    review_processing: number[];
    ai_cleanup: number[];
  };
  embedding_logged_since: string | null;
  jobs: { clean: number[]; with_failures: number[] };
  laptops_by_brand: { brand_id: string; brand_name: string; active: number }[];
}

export function getDashboardSummary(token: string): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>("/admin/dashboard/summary", {
    token,
    next: { revalidate: 0 },
  });
}
