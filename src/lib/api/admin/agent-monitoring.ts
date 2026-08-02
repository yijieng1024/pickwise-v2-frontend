import { apiFetch } from "@/lib/api/client";

export type AgentRunStatus = "success" | "error";

/** Mirrors the backend's `AgentRunLogSummary` schema. */
export interface AgentRunSummary {
  id: string;
  conversation_id: string;
  user_id: string;
  username: string;
  user_message: string;
  status: AgentRunStatus;
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  tool_names: string[];
  tool_call_count: number;
  created_at: string;
}

export interface AgentToolCall {
  name: string;
  args_preview: string;
  output_preview: string | null;
  duration_ms: number | null;
  error: string | null;
}

/** Mirrors the backend's `AgentRunLogDetail` schema. */
export interface AgentRunDetail {
  id: string;
  conversation_id: string;
  user_id: string;
  username: string;
  user_message: string;
  reply_text: string;
  status: AgentRunStatus;
  error_message: string | null;
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  tool_calls: AgentToolCall[];
  created_at: string;
}

/** Mirrors the backend's generic `Page[AgentRunLogSummary]` envelope. */
export interface AgentRunPage {
  items: AgentRunSummary[];
  total: number;
  skip: number;
  limit: number;
}

export interface ToolUsage {
  name: string;
  count: number;
}

/** Mirrors the backend's `AgentMonitoringStats` schema. */
export interface AgentMonitoringStats {
  total_runs: number;
  runs_today: number;
  error_count: number;
  error_rate_pct: number;
  avg_latency_ms: number;
  tool_usage: ToolUsage[];
}

export interface ListAgentRunsParams {
  search?: string;
  status?: AgentRunStatus;
  sortBy?: "created_at" | "latency_ms";
  sortDir?: "asc" | "desc";
  skip?: number;
  limit?: number;
}

export function listAgentRuns(token: string, params: ListAgentRunsParams = {}): Promise<AgentRunPage> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.sortBy) query.set("sort_by", params.sortBy);
  if (params.sortDir) query.set("sort_dir", params.sortDir);
  query.set("skip", String(params.skip ?? 0));
  query.set("limit", String(params.limit ?? 25));

  return apiFetch<AgentRunPage>(`/agent/monitoring/runs?${query.toString()}`, {
    token,
    next: { revalidate: 0 },
  });
}

export function getAgentRun(token: string, id: string): Promise<AgentRunDetail> {
  return apiFetch<AgentRunDetail>(`/agent/monitoring/runs/${id}`, {
    token,
    next: { revalidate: 0 },
  });
}

export function getAgentRunStats(token: string): Promise<AgentMonitoringStats> {
  return apiFetch<AgentMonitoringStats>("/agent/monitoring/stats", {
    token,
    next: { revalidate: 0 },
  });
}
