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
  /** The full chain in the order it is tried: the chosen model, then each backup. */
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

// ---------------------------------------------------------------------------
// Chat models per use: a primary plus an ORDERED list of backups, tried in
// order when the model before them is rate-limited (429), times out or 5xxs.
// ---------------------------------------------------------------------------

export type LLMUseName = "agent" | "review_processor" | "processor";

/** "app_settings" = an admin saved this; "env" = the deploy's default is in effect. */
export type LLMSettingSource = "app_settings" | "env";

export interface LLMPrimarySlot {
  /** The spec in effect, e.g. "google_genai:gemma-4-31b-it". */
  value: string;
  /** Its bare model id, e.g. "gemma-4-31b-it". */
  model: string;
  source: LLMSettingSource;
  env_default: string;
  /** The raw saved value, if any. With `error` set it was REJECTED. */
  stored: string | null;
  /** Why the saved value was rejected; the env default is in effect instead. */
  error: string | null;
  /** false = not in Gemini's model list (retired or a typo); null = list unavailable. */
  in_model_list: boolean | null;
}

export interface LLMBackupSlot {
  /** 1-based: position 1 is tried first after the primary. */
  position: number;
  value: string;
  model: string;
  in_model_list: boolean | null;
}

/** Mirrors the backend's `LLMUseRead`. */
export interface LLMUse {
  use: LLMUseName;
  primary: LLMPrimarySlot;
  backups: LLMBackupSlot[];
  backups_source: LLMSettingSource;
  backups_env_default: string[];
  /** The raw saved JSON list, if any. With `backups_error` set it was rejected as a whole. */
  backups_stored: string | null;
  backups_error: string | null;
  /** null = no cap (background uses). */
  max_backups: number | null;
  fallback_enabled: boolean;
}

export interface LLMSettings {
  uses: LLMUse[];
  /** Human-readable problems: rejected saved values, models missing from the list. */
  warnings: string[];
  model_list_error: string | null;
}

export function getLLMSettings(token: string): Promise<LLMSettings> {
  return apiFetch<LLMSettings>("/admin/settings/llm", { token, next: { revalidate: 0 } });
}

/**
 * Omit a field to leave it unchanged; `null` resets it to the env default;
 * `backups: []` turns fallback off for that use. A 400's message names the
 * broken rule (duplicate, primary in backups, over the cap, ...) — show it as-is.
 */
export interface LLMUseUpdate {
  primary?: string | null;
  backups?: string[] | null;
}

export function updateLLMUse(token: string, use: LLMUseName, body: LLMUseUpdate): Promise<LLMUse> {
  return apiFetch<LLMUse>(`/admin/settings/llm/${use}`, {
    method: "PUT",
    token,
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });
}

/** One entry of Gemini's models.list that supports generateContent. */
export interface AvailableModel {
  name: string;
  /** What to send to PUT /llm/{use}. */
  spec: string;
  display_name: string;
  input_token_limit: number | null;
  output_token_limit: number | null;
  thinking: boolean | null;
  /** Where it is configured, e.g. "agent.primary", "agent.backup[1]". */
  configured_for: string[];
}

export interface AvailableModels {
  models: AvailableModel[];
  fetched_at: string;
  /** Configured models NOT in the list, e.g. "x (agent.backup[2])". */
  configured_missing: string[];
  /** Says the list carries no rate limits, quota or pricing. */
  note: string;
}

/** Cached an hour on the backend; `refresh` refetches from Gemini. 502 if Gemini fails. */
export function getLLMModels(token: string, refresh = false): Promise<AvailableModels> {
  return apiFetch<AvailableModels>(`/admin/settings/llm/models?refresh=${refresh}`, {
    token,
    next: { revalidate: 0 },
  });
}

// --- Review pause reason -------------------------------------------------

export interface ReviewPauseReason {
  reason: string | null;
  updated_at: string | null;
}

/** Why review processing is paused. The pause itself is the backend's
 * REVIEW_PROCESSING_PAUSED env var; this only explains it. Null or blank
 * clears it; the backend caps it at 500 characters. */
export function setReviewPauseReason(token: string, reason: string | null): Promise<ReviewPauseReason> {
  return apiFetch<ReviewPauseReason>("/admin/settings/review-pause-reason", {
    method: "PUT",
    token,
    body: JSON.stringify({ reason }),
    next: { revalidate: 0 },
  });
}
