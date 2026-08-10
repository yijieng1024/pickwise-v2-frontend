"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  Clock,
  Copy,
  MessageSquare,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBarChart } from "@/components/charts/status-bar-chart";
import { TREND_COLORS, TrendLine } from "@/components/charts/trend-line";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
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
import { bucketByDay, daySpanToToday, parseUtc, percentile } from "@/lib/daily-series";
import { cn } from "@/lib/utils";

import { useAdminQuery, useSearchDraft } from "../admin-query-state";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminPageHeader } from "../admin-page-header";
import { AdminPagination } from "../admin-pagination";
import {
  AdminTrendRange,
  DEFAULT_TREND_RANGE,
  type TrendRange,
} from "../admin-trend-range";
import { SortableTableHead } from "../admin-sortable-head";

const PAGE_SIZE = 25;

/**
 * The trend charts read a separate, unfiltered page of runs — deliberately not
 * the table's rows. Bucketing whatever the table currently shows would make
 * filtering to "error" draw an error line labelled as total volume.
 *
 * 1000 is the backend's `MAX_LIMIT`, and the same window its own /stats
 * endpoint aggregates over. The timeframe control re-buckets that one window
 * rather than refetching; when traffic outruns it the axis shortens to the days
 * the window actually covers rather than drawing zeros (see `daySpanToToday`),
 * and the caption says so.
 */
const TREND_WINDOW = 1000;

const SORT_KEYS = ["created_at", "latency_ms"] as const;

/** Newest first — the run you most likely came here to read. */
const DEFAULT_SORT = { key: "created_at", direction: "desc" } as const;

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

  const [trendRuns, setTrendRuns] = useState<AgentRunSummary[] | null>(null);
  const [trendTotal, setTrendTotal] = useState(0);
  const [trendError, setTrendError] = useState<string | null>(null);
  // One control drives all three trend charts — they read the same days, so
  // separate pickers would let the page show volume and latency over
  // different periods and invite a false comparison between them.
  const [trendRange, setTrendRange] = useState<TrendRange>(DEFAULT_TREND_RANGE);

  const [runs, setRuns] = useState<AgentRunSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const query = useAdminQuery({
    filters: { q: "", status: "all" },
    sortKeys: SORT_KEYS,
    defaultSort: DEFAULT_SORT,
  });
  const { q: debouncedSearch, status } = query.values;
  const { page, sort } = query;
  const [search, setSearch] = useSearchDraft(debouncedSearch, (value) =>
    query.set({ q: value }),
  );

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<AgentRunDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadTick, setDetailReloadTick] = useState(0);

  // Reset the loading state once the effective query changes — the "adjust
  // state during render" pattern, not an effect (see laptops-browse.tsx).
  const paramsSig = query.signature;
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

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    listAgentRuns(token, { sortBy: "created_at", sortDir: "desc", limit: TREND_WINDOW })
      .then((res) => {
        if (cancelled) return;
        setTrendRuns(res.items);
        setTrendTotal(res.total);
        setTrendError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setTrendError(err instanceof ApiError ? err.message : "Failed to load trends.");
        }
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

  const trend = useMemo(() => {
    if (!trendRuns || trendRuns.length === 0) return null;

    // Size the axis to the fetched window, never past its oldest run.
    const oldestMs = Math.min(...trendRuns.map((r) => parseUtc(r.created_at).getTime()));
    const windowDays = daySpanToToday(new Date(oldestMs));
    // When the window filled up before reaching the end of history, its oldest
    // day holds only the turns that fit — a partial count that would plot as a
    // real dip. Drop that day rather than charting an undercount.
    const partialOldest = trendTotal > trendRuns.length;
    const days = Math.min(trendRange, partialOldest ? Math.max(1, windowDays - 1) : windowDays);
    const buckets = bucketByDay(trendRuns, (r) => r.created_at, days);

    const rows = buckets.map((b) => {
      const errors = b.items.filter((r) => r.status === "error").length;
      const latencies = b.items.map((r) => r.latency_ms);
      return {
        key: b.date,
        label: b.label,
        turns: b.items.length,
        errors,
        // A day with no turns has no rate and no latency — plotted as a gap,
        // because 0% error and 0ms would both read as a good day.
        errorRate: b.items.length === 0 ? null : (errors / b.items.length) * 100,
        median: percentile(latencies, 50),
        p95: percentile(latencies, 95),
      };
    });

    return {
      points: rows.map((r) => ({
        key: r.key,
        label: r.label,
        note:
          r.turns === 0
            ? "No turns this day"
            : `${r.errors} of ${r.turns} turn${r.turns === 1 ? "" : "s"} ended in an error`,
      })),
      turns: rows.map((r) => r.turns),
      errorRate: rows.map((r) => r.errorRate),
      median: rows.map((r) => (r.median === null ? null : Math.round(r.median))),
      p95: rows.map((r) => (r.p95 === null ? null : Math.round(r.p95))),
      days,
      // Short because the window ran out, not because the range is short —
      // only the former is a caveat worth printing.
      capped: days < trendRange,
    };
  }, [trendRuns, trendTotal, trendRange]);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Chatbot Monitoring"
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

        {/* Trends. A stat tile says where Pico is now; these say which way it
            is heading, which is the thing you cannot get from a single
            number — a 4% error rate is fine if it was 9% yesterday and alarming
            if it was 0.2%. Volume, reliability and speed are three different
            scales, so they are three charts and never a second y-axis. */}
        <div className="mt-1 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold tracking-tight">Trends</h2>
          <AdminTrendRange
            value={trendRange}
            onChange={setTrendRange}
            label="Timeframe for the trend charts"
          />
        </div>

        {trendError ? (
          <Card className="gap-0 p-4">
            <AdminErrorState message={trendError} onRetry={() => setStatsReloadTick((t) => t + 1)} />
          </Card>
        ) : trendRuns === null ? (
          <Card className="gap-0 p-4">
            <AdminLoadingState />
          </Card>
        ) : trend === null ? (
          <Card className="gap-0 p-4">
            <AdminEmptyState
              icon={Activity}
              title="No turns recorded yet"
              description="Trends appear once someone has chatted with Pico."
            />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Card className="gap-0 p-4">
                <ChartHeading
                  title="Turns per day"
                  caption={trendWindowCaption(trend.days, trend.capped)}
                />
                <TrendLine
                  points={trend.points}
                  series={[
                    { name: "Turns", color: TREND_COLORS[0], values: trend.turns },
                  ]}
                />
              </Card>

              <Card className="gap-0 p-4">
                <ChartHeading
                  title="Error rate per day"
                  caption="Days with no turns are left as a gap — hover for the counts behind each rate."
                />
                <TrendLine
                  points={trend.points}
                  series={[
                    { name: "Error rate", color: TREND_COLORS[0], values: trend.errorRate },
                  ]}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                  allowDecimals
                  yWidth={52}
                />
              </Card>
            </div>

            <Card className="gap-0 p-4">
              <ChartHeading
                title="Response time per day"
                caption="The median is the typical turn; the 95th percentile is the slow tail an average hides."
              />
              <TrendLine
                points={trend.points}
                series={[
                  { name: "Median", color: TREND_COLORS[0], values: trend.median },
                  {
                    name: "95th percentile",
                    color: TREND_COLORS[1],
                    dashed: true,
                    values: trend.p95,
                  },
                ]}
                formatValue={(v) => `${v.toLocaleString()} ms`}
                yWidth={72}
              />
            </Card>
          </>
        )}

        <Card className="gap-0 p-4">
          {statsError ? (
            <AdminErrorState message={statsError} onRetry={() => setStatsReloadTick((t) => t + 1)} />
          ) : stats === null ? (
            <AdminLoadingState />
          ) : chartData.length === 0 ? (
            <AdminEmptyState title="No tool calls recorded yet" />
          ) : (
            <>
              <h3 className="mb-2 text-[13px] font-semibold text-muted-foreground">
                Tool usage (last {stats.total_runs.toLocaleString()} runs)
              </h3>
              <StatusBarChart data={chartData} height={200} />
            </>
          )}
        </Card>
      </div>

      <div className="border-line bg-surface flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search message…"
            aria-label="Search agent runs by message"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select items={statusOptions} value={status} onValueChange={(v) => query.set({ status: v as string })}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0">
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : runs === null ? (
          <AdminLoadingState />
        ) : runs.length === 0 ? (
          <AdminEmptyState title="No agent runs match these filters" />
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
                  onSort={query.sortBy}
                />
                <SortableTableHead
                  label="Created"
                  sortKey="created_at"
                  sort={sort}
                  onSort={query.sortBy}
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
      </Card>

      <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={query.setPage} />

      <Dialog open={selectedRunId !== null} onOpenChange={(open) => !open && setSelectedRunId(null)}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] sm:max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agent run detail</DialogTitle>
          </DialogHeader>
          {detailError ? (
            <AdminErrorState message={detailError} onRetry={() => setDetailReloadTick((t) => t + 1)} />
          ) : selectedRun === null ? (
            <AdminLoadingState />
          ) : (
            <RunDetail run={selectedRun} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Says what the axis covers, and admits when history was cut off by the window. */
function trendWindowCaption(days: number, capped: boolean): string {
  const span = `Last ${days} day${days === 1 ? "" : "s"}`;
  return capped
    ? `${span}, from the most recent ${TREND_WINDOW.toLocaleString()} turns — older history isn't charted.`
    : `${span}, every turn on record.`;
}

function ChartHeading({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="mb-2.5">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-0.5 text-[12px] leading-snug">{caption}</p>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** Pretty-prints a JSON preview when it parses; truncated previews (the
 * backend appends "…[truncated…]") and non-JSON are shown verbatim. */
function formatPreview(content: string): string {
  if (content.includes("…[truncated")) return content;
  try {
    const parsed = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null
      ? JSON.stringify(parsed, null, 2)
      : content;
  } catch {
    return content;
  }
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function CopyableId({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} ID copied.`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="font-medium uppercase tracking-wide">{label}</span>
      <span className="truncate font-mono">{value}</span>
      <button
        type="button"
        aria-label={`Copy ${label.toLowerCase()} ID`}
        onClick={handleCopy}
        className="hover:text-foreground shrink-0"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </button>
    </div>
  );
}

function RunDetail({ run }: { run: AgentRunDetail }) {
  return (
    <div className="flex flex-col gap-4 text-[13px]">
      {/* Header: status + who + when */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge className={cn("capitalize", statusBadgeClass[run.status])}>{run.status}</Badge>
        <span className="font-medium">{run.username}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          {formatDateTime(run.created_at)} · {relativeTime(run.created_at)}
        </span>
      </div>

      {/* Metadata grid */}
      <div className="border-line grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-3 sm:grid-cols-4">
        <Meta label="Latency" value={`${run.latency_ms.toLocaleString()} ms`} />
        <Meta label="Input tokens" value={run.input_tokens?.toLocaleString() ?? "—"} />
        <Meta label="Output tokens" value={run.output_tokens?.toLocaleString() ?? "—"} />
        <Meta label="Tool calls" value={String(run.tool_calls.length)} />
      </div>

      {/* Conversation */}
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
          <MessageSquare /> User
        </span>
        <p className="bg-surface-2 rounded-lg p-3 whitespace-pre-wrap">{run.user_message}</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
          <Sparkles className="text-brand size-3.5" /> Pico
        </span>
        <p className="bg-brand-tint/40 rounded-lg p-3 whitespace-pre-wrap">{run.reply_text || "—"}</p>
      </div>

      {run.error_message && (
        <div className="flex flex-col gap-1">
          <span className="text-negative flex items-center gap-1.5 text-[12px] font-semibold">
            <AlertTriangle /> Error
          </span>
          <p className="bg-negative/10 text-negative rounded-lg p-3 whitespace-pre-wrap">
            {run.error_message}
          </p>
        </div>
      )}

      {/* Tool calls */}
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
                <span className="bg-brand-tint text-brand flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums">
                  {i + 1}
                </span>
                <span className="font-semibold">{call.name}</span>
                {call.duration_ms !== null && (
                  <span className="tabular-nums text-[12px] text-muted-foreground">
                    {call.duration_ms.toLocaleString()} ms
                  </span>
                )}
                {call.error && <Badge className="bg-negative/10 text-negative">Error</Badge>}
              </div>
              {call.error && <p className="text-negative mb-2 text-[12.5px]">{call.error}</p>}
              <PreviewBlock label="Args" content={call.args_preview} />
              {call.output_preview && <PreviewBlock label="Output" content={call.output_preview} />}
            </div>
          ))
        )}
      </div>

      {/* IDs */}
      <div className="border-line flex flex-col gap-1.5 border-t pt-3">
        <CopyableId label="Run" value={run.id} />
        <CopyableId label="Conversation" value={run.conversation_id} />
      </div>
    </div>
  );
}

function PreviewBlock({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const formatted = formatPreview(content);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatted);
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
        <span className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</span>
        <Button variant="ghost" size="icon-xs" aria-label={`Copy ${label.toLowerCase()}`} onClick={handleCopy}>
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </Button>
      </div>
      <pre className="bg-surface-2 max-h-64 overflow-auto rounded-md p-2 font-mono text-[12.5px] whitespace-pre-wrap break-words">
        {formatted}
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
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          tone === "negative" ? "bg-negative/10 text-negative" : "bg-brand-tint text-brand",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div>
        <div className={cn("text-xl font-bold tabular-nums", tone === "negative" && "text-negative")}>
          {error ? (
            "—"
          ) : value === undefined ? (
            <Spinner className="size-4 text-muted-foreground" />
          ) : (
            `${value.toLocaleString()}${suffix}`
          )}
        </div>
        <div className="text-[12.5px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
