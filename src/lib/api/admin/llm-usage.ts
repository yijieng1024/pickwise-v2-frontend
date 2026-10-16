import { apiFetch } from "@/lib/api/client";

/** Mirrors the backend's `UsageRow` — `key` is the feature, model or UTC day. */
export interface LLMUsageRow {
  key: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

/** `key` is the username, or "system" for batch jobs (`user_id: null`). */
export interface LLMUserUsageRow extends LLMUsageRow {
  user_id: string | null;
}

/** Mirrors the backend's `LLMUsageReport` schema. */
export interface LLMUsageReport {
  days: number;
  /** UTC date (YYYY-MM-DD) the window starts on. */
  since: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  by_feature: LLMUsageRow[];
  by_model: LLMUsageRow[];
  /** Newest first, and only days that had calls. */
  by_day: LLMUsageRow[];
  by_user: LLMUserUsageRow[];
}

export function getLLMUsage(token: string, days: number): Promise<LLMUsageReport> {
  return apiFetch<LLMUsageReport>(`/admin/llm-usage?days=${days}`, {
    token,
    next: { revalidate: 0 },
  });
}
