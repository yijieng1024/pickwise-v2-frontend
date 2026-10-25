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

/** From the laptop's `os` field ("macOS" on every Apple row). */
export const isMacOS = (os: string | null | undefined) =>
  Boolean(os?.toLowerCase().startsWith("macos"));

/**
 * The use case a laptop scores highest on. Withheld (null) scores never win,
 * ties go to display order, and a macOS laptop is never a "Gaming" best fit:
 * its gaming score measures the hardware, but many games don't run on macOS.
 */
export function bestFit<T extends { use_case: string; score: number | null }>(
  scores: T[] | undefined,
  os: string | null | undefined,
): (T & { score: number }) | undefined {
  const order = USE_CASES.map((u) => u.slug as string);
  const rank = (s: T) => {
    const i = order.indexOf(s.use_case);
    return i === -1 ? order.length : i;
  };
  return (scores ?? [])
    .filter((s): s is T & { score: number } =>
      s.score !== null && !(isMacOS(os) && s.use_case === "gaming"),
    )
    .sort((a, b) => b.score - a.score || rank(a) - rank(b))[0];
}

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
  /** null = withheld: neither the CPU nor the GPU could be identified. */
  score: number | null;
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

export interface PersonalPickScore {
  product_id: string;
  /** null = withheld (flags.score_withheld). */
  score: number | null;
  /** "personalized" when a wizard preference row was found, else "general". */
  mode: string;
  breakdown: PickScoreFactor[];
  flags: Record<string, unknown>;
}

/** Precomputed general-mode PickScores of one laptop (all five use cases). */
export function getLaptopPickScores(laptopId: string, useCase?: UseCaseSlug) {
  const query = useCase ? `?use_case=${useCase}` : "";
  return apiFetch<LaptopPickScoresResponse>(`/laptops/${laptopId}/pick-scores${query}`);
}

/**
 * Live personalized PickScore — weights from the user's wizard answers
 * (priorities, budget ceiling, purpose, portability, screen size, brands).
 * Falls back to mode "general" server-side if no preference row exists.
 */
export function calculatePersonalScore(
  laptopId: string,
  userId: string,
  token: string,
) {
  return apiFetch<PersonalPickScore>("/laptops/calculate-score", {
    method: "POST",
    body: JSON.stringify({ laptop_id: laptopId, user_id: userId }),
    token,
    cache: "no-store",
  });
}

/** Batch variant — one call scores a whole shortlist with shared range data. */
export function calculatePersonalScoreBatch(
  laptopIds: string[],
  userId: string,
  token: string,
) {
  return apiFetch<{ results: PersonalPickScore[] }>(
    "/laptops/calculate-score/batch",
    {
      method: "POST",
      body: JSON.stringify({ laptop_ids: laptopIds, user_id: userId }),
      token,
      cache: "no-store",
    },
  );
}

/** Top laptops for a use case by stored PickScore (price breaks ties). */
export function getPickScoreRanking(useCase: UseCaseSlug, limit = 10) {
  return apiFetch<UseCaseRankingResponse>(
    `/laptops/pick-scores/ranking?use_case=${useCase}&limit=${limit}`,
  );
}
