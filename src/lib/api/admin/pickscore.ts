import { apiFetch } from "@/lib/api/client";
import type { UseCaseSlug } from "@/lib/api/pickscore";

/** One PassMark row near a catalog string (diagnosis only, never matching). */
export interface BenchmarkCandidate {
  name: string;
  mark: number;
  confidence: number;
}

export interface BenchmarkDiagnosis {
  /** placeholder · qualcomm_part · qualcomm_part_missing · fuzzy · no_igpu_entry */
  kind: string;
  message: string | null;
  candidates: BenchmarkCandidate[];
  threshold: number;
}

export interface ProblemSide {
  catalog: string | null;
  unresolved: boolean;
  diagnosis: BenchmarkDiagnosis | null;
}

export interface ProblemLaptop {
  laptop_id: string;
  product_name: string;
  brand_name: string;
  status: string;
  withheld: boolean;
  cpu: ProblemSide;
  gpu: ProblemSide;
}

export interface TopLaptop {
  rank: number;
  laptop_id: string;
  product_name: string;
  brand_name: string;
  processor_model: string | null;
  gpu_model: string | null;
  score: number;
  gpu_score_is_proxy: boolean;
}

/** GET /admin/pickscore/summary: the whole admin Pick Score page in one request. */
export interface PickScoreSummary {
  generated_at: string;
  status: {
    recalculated_at: string | null;
    /** Stale when recalculated_at is older than this. */
    catalog_changed_at: string | null;
    /** Laptops edited after the last run; null before any run. */
    edited_since: number | null;
    active: number;
    scored: number;
    missing: number;
    withheld: number;
    unverified: number;
  };
  /** Active laptops whose GPU score is a stand-in, recomputed against today's table. */
  proxy: { integrated: number; apple_equivalent: number; unresolved: number };
  problems: { total: number; limit: number; items: ProblemLaptop[] };
  distribution: {
    buckets: string[];
    by_use_case: Record<UseCaseSlug, { counts: number[]; withheld: number }>;
  };
  top: Record<UseCaseSlug, TopLaptop[]>;
  /** Base weight 1–10 and its share of the score in general mode. */
  weights: Record<UseCaseSlug, Record<string, { weight: number; share: number }>>;
}

export function getPickScoreSummary(token: string): Promise<PickScoreSummary> {
  return apiFetch<PickScoreSummary>("/admin/pickscore/summary", {
    token,
    next: { revalidate: 0 },
  });
}
