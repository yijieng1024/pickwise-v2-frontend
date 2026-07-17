import { apiFetch } from "./client";

/** The backend's five use-case weight profiles, in display order. */
export const USE_CASES = [
  { slug: "general_use", label: "General Use" },
  { slug: "office_study", label: "Office & Study" },
  { slug: "programming", label: "Programming" },
  { slug: "gaming", label: "Gaming" },
  { slug: "creative_work", label: "Creative Work" },
] as const;

export type UseCaseSlug = (typeof USE_CASES)[number]["slug"];

export const labelForUseCase = (slug: string) =>
  USE_CASES.find((u) => u.slug === slug)?.label ?? slug;

/** One factor of the deterministic 8-factor breakdown. */
export interface PickScoreFactor {
  factor: string;
  /** 0–100 before weighting. */
  raw_score: number;
  /** Normalized weight (all eight sum to 1). */
  weight: number;
  /** raw_score × weight — points contributed to the final score. */
  contribution: number;
  note?: string | null;
}

export interface UseCasePickScore {
  use_case: string;
  score: number;
  breakdown: PickScoreFactor[];
  flags: Record<string, unknown>;
  updated_at: string;
}

export interface LaptopPickScoresResponse {
  laptop_id: string;
  scores: UseCasePickScore[];
}

export interface RankedLaptopPickScore {
  rank: number;
  laptop_id: string;
  product_name: string;
  brand_name: string;
  price_rm: number;
  image_urls: string[];
  score: number;
  flags: Record<string, unknown>;
}

export interface UseCaseRankingResponse {
  use_case: string;
  results: RankedLaptopPickScore[];
}

/** Precomputed general-mode PickScores of one laptop (all five use cases). */
export function getLaptopPickScores(laptopId: string) {
  return apiFetch<LaptopPickScoresResponse>(`/laptops/${laptopId}/pick-scores`);
}

/** Top laptops for a use case by stored PickScore (price breaks ties). */
export function getPickScoreRanking(useCase: UseCaseSlug, limit = 10) {
  return apiFetch<UseCaseRankingResponse>(
    `/laptops/pick-scores/ranking?use_case=${useCase}&limit=${limit}`,
  );
}
