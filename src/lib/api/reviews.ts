import { apiFetch } from "./client";

/** One reviewer point — mirrors the backend's `ReviewPointRead`. */
export interface ReviewPoint {
  /** Paraphrased reviewer point — never a verbatim quote. */
  text: string;
  sentiment: "strength" | "weakness";
  applies_to: "this_configuration" | "configuration_not_stated" | "other_configuration";
  /** Set only for `other_configuration`: the configuration the reviewer tested. */
  tested_on_laptop_id: string | null;
  tested_on_name: string | null;
  channel_name: string;
  /** YouTube channel avatar; null = show the name's initial. */
  channel_img_url: string | null;
  video_id: string;
  video_title: string | null;
  timestamp_start_seconds: number;
  /** YouTube link at the timestamp. */
  url: string;
}

/** GET /laptops/{id}/reviews — mirrors the backend's `LaptopReviewsRead`. */
export interface LaptopReviews {
  laptop_id: string;
  /** Which tier the points come from; `none` = no reviews for this laptop or its family yet. */
  source: "this_laptop" | "other_configurations" | "none";
  /** Distinct videos behind the points. */
  review_count: number;
  strengths: ReviewPoint[];
  weaknesses: ReviewPoint[];
}

/** Public. Computed from review chunks on every request (backend Review B3). */
export function getLaptopReviews(laptopId: string) {
  return apiFetch<LaptopReviews>(`/laptops/${laptopId}/reviews`);
}
