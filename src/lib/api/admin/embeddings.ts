import { apiFetch } from "@/lib/api/client";

export interface EmbeddingStatus {
  total_laptops: number;
  embedded: number;
  missing: number;
  coverage_pct: number;
}

export interface GenerateAllResult {
  message: string;
  total_laptops: number;
  tip: string;
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

/** Kicks off a background job on the server — returns immediately, doesn't wait for completion. */
export function generateAllEmbeddings(token: string): Promise<GenerateAllResult> {
  return apiFetch<GenerateAllResult>("/embeddings/laptops/generate-all", {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}
