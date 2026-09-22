import { apiFetch } from "@/lib/api/client";

/**
 * Admin-changeable runtime settings (`app_settings` on the backend). Separate
 * from build-time config: these are operational choices made while watching a
 * job, and they take effect on the next record with no redeploy.
 */

/**
 * A selectable model *with its free-tier budget*. The two travel together on
 * purpose — the backend paces requests against TPM/RPM, so a model name with
 * no budget attached cannot be rate-limited correctly.
 */
export interface ModelOption {
  model: string;
  tpm: number;
  rpm: number;
  /**
   * Requests per day. The figure that decides whether a model can finish a
   * run at all — nothing enforces it, so show it rather than assume it.
   */
  rpd: number;
}

export interface ProcessorModel {
  /** What the next run will use. */
  model: string;
  /** True when nothing is stored and the code default applies. */
  is_default: boolean;
  default_model: string;
  /** The chosen model first, then who covers for it when it is overloaded. */
  fallback_chain: string[];
  options: ModelOption[];
}

export function getProcessorModel(token: string): Promise<ProcessorModel> {
  return apiFetch<ProcessorModel>("/admin/settings/processor-model", {
    token,
    next: { revalidate: 0 },
  });
}

/** `null` resets to the backend's default. Rejects anything off the allow-list. */
export function setProcessorModel(
  token: string,
  model: string | null,
): Promise<ProcessorModel> {
  return apiFetch<ProcessorModel>("/admin/settings/processor-model", {
    method: "PUT",
    token,
    body: JSON.stringify({ model }),
    next: { revalidate: 0 },
  });
}
