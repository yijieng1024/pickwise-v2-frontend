import { apiFetch } from "@/lib/api/client";
import type { JobAccepted } from "@/lib/api/admin/jobs";

export interface EmbeddingStatus {
  total_laptops: number;
  embedded: number;
  missing: number;
  coverage_pct: number;
}

/**
 * Result payload on a finished `embeddings.generate_all` job — the shape of
 * `Job.result`, not of the trigger's response. The trigger returns
 * `JobAccepted` like every other background run.
 */
export interface GenerateAllResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ laptop_id: string; error: string }>;
}

export function getEmbeddingStatus(): Promise<EmbeddingStatus> {
  return apiFetch<EmbeddingStatus>("/embeddings/laptops/status", { next: { revalidate: 0 } });
}

/**
 * PickScore coverage, shaped like `EmbeddingStatus` so the dashboard renders
 * both rails identically. Counts distinct laptops, not score rows — the table
 * holds one row per laptop × use case.
 */
export interface PickScoreStatus {
  total_laptops: number;
  scored: number;
  missing: number;
  coverage_pct: number;
}

export function getPickScoreStatus(): Promise<PickScoreStatus> {
  return apiFetch<PickScoreStatus>("/laptops/pick-scores/status", {
    next: { revalidate: 0 },
  });
}

/**
 * Recomputes every stored PickScore. Pure arithmetic (no AI, no external
 * service), so it is comparatively quick and safe to re-run — worth doing
 * after importing laptops or refreshing benchmarks.
 */
export function generateAllPickScores(token: string): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/laptops/pick-scores/generate-all", {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Returns 202 with a job to poll, like the scraper and processor. It used to
 * fire and forget with no job record, which is why `/admin/embeddings` had to
 * follow runs by watching the embedded count climb — track it with `useJob`.
 */
export function generateAllEmbeddings(token: string): Promise<JobAccepted> {
  return apiFetch<JobAccepted>("/embeddings/laptops/generate-all", {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}
