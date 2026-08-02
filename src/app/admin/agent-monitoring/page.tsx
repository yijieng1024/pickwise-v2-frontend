"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Check, Clock, Copy, Loader2, Search, XCircle } from "lucide-react";
import { toast } from "sonner";

import { StatusBarChart } from "@/components/charts/status-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AgentMonitoringStats,
  type AgentRunDetail,
  type AgentRunStatus,
  type AgentRunSummary,
  getAgentRun,
  getAgentRunStats,
  listAgentRuns,
} from "@/lib/api/admin/agent-monitoring";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminErrorState } from "../admin-error-state";
import { AdminPageHeader } from "../admin-page-header";
import { AdminPagination } from "../admin-pagination";
import { type SortState, SortableTableHead, toggleSort } from "../admin-sortable-head";

const PAGE_SIZE = 25;

type SortKey = "created_at" | "latency_ms";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
];

const statusBadgeClass: Record<AgentRunStatus, string> = {
  success: "bg-positive/10 text-positive",
  error: "bg-negative/10 text-negative",
};

export default function AdminAgentMonitoringPage() {
  const { token } = useAuth();

  const [stats, setStats] = useState<AgentMonitoringStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsReloadTick, setStatsReloadTick] = useState(0);

  const [runs, setRuns] = useState<AgentRunSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortState<SortKey> | null>({ key: "created_at", direction: "desc" });
  const [page, setPage] = useState(1);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<AgentRunDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadTick, setDetailReloadTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset pagination when filters/sort change, then reset loading state once
  // the effective query changes — the "adjust state during render" pattern,
  // not an effect (see laptops-browse.tsx).
  const filterSig = `${debouncedSearch}|${status}|${sort?.key ?? ""}|${sort?.direction ?? ""}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (filterSig !== prevFilterSig) {
    setPrevFilterSig(filterSig);
    setPage(1);
  }

  const paramsSig = `${filterSig}|${page}`;
  const [prevParamsSig, setPrevParamsSig] = useState(paramsSig);
  if (paramsSig !== prevParamsSig) {
    setPrevParamsSig(paramsSig);
    setRuns(null);
    setLoadError(null);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    listAgentRuns(token, {
      search: debouncedSearch || undefined,
      status: status === "all" ? undefined : (status as AgentRunStatus),
      sortBy: sort?.key,
      sortDir: sort?.direction,
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setRuns(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "Failed to load agent runs.");
      });

    return () => {
      cancelled = true;
    };
  }, [token, debouncedSearch, status, sort, page, reloadTick]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    getAgentRunStats(token)
      .then((res) => {
        if (cancelled) return;
        setStats(res);
        setStatsError(null);
      })
      .catch((err) => {
        if (!cancelled) setStatsError(err instanceof ApiError ? err.message : "Failed to load stats.");
      });

    return () => {
      cancelled = true;
    };
  }, [token, statsReloadTick]);

  // Reset detail state whenever the selected run changes — the "adjust
  // state during render" pattern, not an effect (see laptops-browse.tsx).
  const [prevSelectedRunId, setPrevSelectedRunId] = useState(selectedRunId);
  if (selectedRunId !== prevSelectedRunId) {
    setPrevSelectedRunId(selectedRunId);
    setSelectedRun(null);
    setDetailError(null);
  }

  useEffect(() => {
    if (!selectedRunId || !token) return;
    let cancelled = false;
    getAgentRun(token, selectedRunId)
      .then((res) => {
        if (!cancelled) setSelectedRun(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetailError(err instanceof ApiError ? err.message : "Failed to load run detail.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRunId, token, detailReloadTick]);

  const chartData = useMemo(
    () =>
      (stats?.tool_usage ?? []).map((t) => ({
        label: t.name,
        value: t.count,
        color: "var(--brand)",
      })),
    [stats],
  );

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Agent"]}
        title="Agent"
        description="Every Pico turn — tool calls, latency, token usage, and errors."
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold tracking-tight">Stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile icon={Activity} label="Runs today" value={stats?.runs_today} error={!!statsError} />
          <StatTile
            icon={XCircle}
            label="Error rate"
            value={stats?.error_rate_pct}
            suffix="%"
            error={!!statsError}
            tone={stats && stats.error_rate_pct > 0 ? "negative" : undefined}
          />
          <StatTile
            icon={Clock}
            label="Avg latency"
            value={stats?.avg_latency_ms}
            suffix=" ms"
            error={!!statsError}
          />
        </div>

        <div className="border-line bg-surface rounded-lg border p-4">
          {statsError ? (
            <AdminErrorState message={statsError} onRetry={() => setStatsReloadTick((t) => t + 1)} />
          ) : stats === null ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="size-5 text-muted-foreground motion-safe:animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <p className="p-6 text-[13px] text-muted-foreground">No tool calls recorded yet.</p>
          ) : (
            <>
              <h3 className="mb-2 text-[13px] font-semibold text-muted-foreground">
                Tool usage (last {stats.total_runs.toLocaleString()} runs)
              </h3>
              <StatusBarChart data={chartData} height={200} />
            </>
          )}
        </div>
      </div>

      <div className="border-line bg-surface flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select items={statusOptions} value={status} onValueChange={(v) => setStatus(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-line bg-surface rounded-lg border">
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : runs === null ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="size-5 text-muted-foreground motion-safe:animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <p className="p-6 text-[13px] text-muted-foreground">No agent runs match these filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tools</TableHead>
                <SortableTableHead
                  label="Latency"
                  sortKey="latency_ms"
                  sort={sort}
                  onSort={(key) => setSort((prev) => toggleSort(prev, key))}
                />
                <SortableTableHead
                  label="Created"
                  sortKey="created_at"
                  sort={sort}
                  onSort={(key) => setSort((prev) => toggleSort(prev, key))}
                />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-xs truncate">{r.user_message}</TableCell>
                  <TableCell className="text-muted-foreground">{r.username}</TableCell>
                  <TableCell>
                    <Badge className={cn("capitalize", statusBadgeClass[r.status])}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.tool_call_count > 0 ? r.tool_names.join(", ") : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">{r.latency_ms.toLocaleString()} ms</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("en-MY", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedRunId(r.id)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <Dialog open={selectedRunId !== null} onOpenChange={(open) => !open && setSelectedRunId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agent run detail</DialogTitle>
          </DialogHeader>
          {detailError ? (
            <AdminErrorState message={detailError} onRetry={() => setDetailReloadTick((t) => t + 1)} />
          ) : selectedRun === null ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="size-5 text-muted-foreground motion-safe:animate-spin" />
            </div>
          ) : (
            <RunDetail run={selectedRun} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RunDetail({ run }: { run: AgentRunDetail }) {
  return (
    <div className="flex flex-col gap-4 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn("capitalize", statusBadgeClass[run.status])}>{run.status}</Badge>
        <span className="text-muted-foreground">{run.username}</span>
        <span className="text-muted-foreground">·</span>
        <span className="tabular-nums text-muted-foreground">{run.latency_ms.toLocaleString()} ms</span>
        {(run.input_tokens !== null || run.output_tokens !== null) && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="tabular-nums text-muted-foreground">
              {run.input_tokens ?? "—"} in / {run.output_tokens ?? "—"} out tokens
            </span>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-semibold">Message</span>
        <p className="text-muted-foreground">{run.user_message}</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-semibold">Reply</span>
        <p className="text-muted-foreground">{run.reply_text || "—"}</p>
      </div>

      {run.error_message && (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-negative">Error</span>
          <p className="text-negative">{run.error_message}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="font-semibold">
          Tool calls {run.tool_calls.length > 0 && `(${run.tool_calls.length})`}
        </span>
        {run.tool_calls.length === 0 ? (
          <p className="text-muted-foreground">No tools were called this turn.</p>
        ) : (
          run.tool_calls.map((call, i) => (
            <div key={i} className="border-line rounded-lg border p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{call.name}</span>
                {call.duration_ms !== null && (
                  <span className="tabular-nums text-[12px] text-muted-foreground">
                    {call.duration_ms.toLocaleString()} ms
                  </span>
                )}
                {call.error && <Badge className="bg-negative/10 text-negative">Error</Badge>}
              </div>
              {call.error && <p className="mb-2 text-[12.5px] text-negative">{call.error}</p>}
              <PreviewBlock label="Args" content={call.args_preview} />
              {call.output_preview && <PreviewBlock label="Output" content={call.output_preview} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PreviewBlock({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(`${label} copied.`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase">{label}</span>
        <Button variant="ghost" size="icon-xs" aria-label={`Copy ${label.toLowerCase()}`} onClick={handleCopy}>
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </Button>
      </div>
      <pre className="font-mono text-[12.5px] bg-surface-2 rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-words">
        {content}
      </pre>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  suffix = "",
  error,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  suffix?: string;
  error: boolean;
  tone?: "negative";
}) {
  return (
    <div className="border-line bg-surface flex items-center gap-3 rounded-lg border p-3">
      <span
        className={
          tone === "negative"
            ? "bg-negative/10 text-negative flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            : "bg-brand-tint text-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        }
      >
        <Icon className="size-4" />
      </span>
      <div>
        <div className={`text-xl font-bold tabular-nums ${tone === "negative" ? "text-negative" : ""}`}>
          {error ? (
            "—"
          ) : value === undefined ? (
            <Loader2 className="size-4 text-muted-foreground motion-safe:animate-spin" />
          ) : (
            `${value.toLocaleString()}${suffix}`
          )}
        </div>
        <div className="text-[12.5px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
