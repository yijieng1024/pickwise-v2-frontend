import { apiFetch } from "@/lib/api/client";
import type { ChipKit, LaptopOptions } from "@/lib/api/options";

import type { JobAccepted } from "./jobs";

/** GET /admin/apple-options: every active Apple standard config's chip kits. */
export interface AppleOptionsConfig {
  laptop_id: string;
  product_name: string;
  price_rm: number;
  /** null: a standard config with no stored kits (e.g. the MacBook Neo). */
  standard_chip: string | null;
  standard?: LaptopOptions["standard"];
  fetched_at: string | null;
  kits: ChipKit[];
}

export interface AppleOptionsRun {
  job_id: string;
  job_type: string;
  finished_at: string | null;
  error: string | null;
  chip_kits: number | null;
  apple_calls: number | null;
  stopped: Record<string, unknown> | null;
  chip_not_offered: { product: string; size_inch: number; line: string; chips: string[] }[] | null;
  options_failed: { product: string; size_inch: number; line: string; chip: string | null; reason: string }[] | null;
  /** The education-store pass of the same run (step 10d); null on runs before it. */
  edu: {
    prices?: number;
    chip_kits?: number;
    apple_calls?: number;
    prices_failed?: { url: string; reason: string }[];
    options_failed?: { product: string; size_inch: number; line: string; chip: string | null; reason: string }[];
    no_laptop?: string[];
    not_below_official?: { laptop_id: string; edu: number; official: number }[];
    stopped?: { reason?: string } | null;
    skipped?: string;
    error?: string;
  } | null;
}

export interface AppleOptionsView {
  configs: AppleOptionsConfig[];
  /** The latest job that ran the options step; its problems are not stored on the rows. */
  latest_run: AppleOptionsRun | null;
  running_job_id: string | null;
}

export function getAppleOptions(token: string) {
  return apiFetch<AppleOptionsView>("/admin/apple-options", { token, next: { revalidate: 0 } });
}

/** 202 + job: options only, from the stored buy pages. 409 while an Apple scrape runs. */
export function fetchAppleOptions(token: string) {
  return apiFetch<JobAccepted>("/admin/apple-options/fetch", { method: "POST", token, next: { revalidate: 0 } });
}
