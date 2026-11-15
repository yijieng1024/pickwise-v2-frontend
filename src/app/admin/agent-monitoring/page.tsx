"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  LifeBuoy,
  MessageSquare,
  Search,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBarChart } from "@/components/charts/status-bar-chart";
import { TrendLine } from "@/components/charts/trend-line";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Card } from "@/components/ui/card";
import {
  type AgentModelCall,
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
import { AdminStatusPill } from "../admin-status-pill";

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

const SORT_KEYS = ["created_at", "latency_ms", "input_tokens", "output_tokens"] as const;

/** Newest first — the run you most likely came here to read. */
const DEFAULT_SORT = { key: "created_at", direction: "desc" } as const;

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
];

/** Error-rate tile: neutral below the first, amber from it, red from the second. */
const ERROR_RATE_WARN_PCT = 2;
const ERROR_RATE_BAD_PCT = 5;

/** The open turn, in the URL so it can be linked and survives a refresh. */
const RUN_PARAM = "run";

/** "850 ms" below a second, "12.3 s" from one second up. */
function formatLatency(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export default function AdminAgentMonitoringPage() {
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  // Kept apart from useAdminQuery on purpose: its filters feed `signature`,
  // and opening a turn must not refetch the table behind it.
  const selectedRunId = searchParams.get(RUN_PARAM);
  function selectRun(id: string | null) {
    const sp = new URLSearchParams(searchParams.toString());
    if (id) sp.set(RUN_PARAM, id);
    else sp.delete(RUN_PARAM);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  const [selectedRun, setSelectedRun] = useState<AgentRunDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadTick, setDetailReloadTick] = useState(0);

  // A new query keeps the previous rows on screen, dimmed, until its own
  // arrive (as public browse does): `pending` is true while the rows shown
  // belong to another query. Only a stale error is cleared here — the "adjust
  // state during render" pattern, not an effect (see laptops-browse.tsx).
  const paramsSig = query.signature;
  const [prevParamsSig, setPrevParamsSig] = useState(paramsSig);
  if (paramsSig !== prevParamsSig) {
    setPrevParamsSig(paramsSig);
    setLoadError(null);
  }
  const fetchSig = `${paramsSig}#${reloadTick}`;
  const [loadedSig, setLoadedSig] = useState<string | null>(null);
  const pending = runs !== null && loadedSig !== fetchSig;

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
        setLoadedSig(fetchSig);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "Failed to load turns.");
      });

    return () => {
      cancelled = true;
    };
    // fetchSig carries every filter, the sort, the page and the retry tick.
  }, [token, debouncedSearch, status, sort, page, fetchSig]);

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
          setDetailError(err instanceof ApiError ? err.message : "Failed to load this turn.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRunId, token, detailReloadTick]);

  // Previous / next in the sheet step through the rows on the current page.
  const selectedIndex = runs && selectedRunId ? runs.findIndex((r) => r.id === selectedRunId) : -1;
  const prevRunId = runs && selectedIndex > 0 ? runs[selectedIndex - 1].id : null;
  const nextRunId =
    runs && selectedIndex >= 0 && selectedIndex < runs.length - 1 ? runs[selectedIndex + 1].id : null;

  // Median and 95th percentile for the latency tile, over the same latest
  // 1,000 turns the backend's /stats aggregates (the trend fetch asks for that
  // exact window: newest first, limit TREND_WINDOW).
  const windowLatency = useMemo(() => {
    if (!trendRuns || trendRuns.length === 0) return null;
    const latencies = trendRuns.map((r) => r.latency_ms);
    return { median: percentile(latencies, 50), p95: percentile(latencies, 95) };
  }, [trendRuns]);

  const chartData = useMemo(
    () =>
      (stats?.tool_usage ?? []).map((t) => ({
        label: t.name,
        value: t.count,
        slot: 0 as const,
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
        {/* Two periods, so two labelled groups: the first pair counts today,
            the other four cover the backend's stats window (its latest 1,000
            turns, fewer while history is shorter than that). */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-1.5">
            <TileGroupCaption>Today</TileGroupCaption>
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                icon={Activity}
                label="Turns today"
                value={stats?.runs_today.toLocaleString()}
                error={!!statsError}
              />
              <StatTile
                icon={Coins}
                label="Tokens today"
                value={stats?.tokens_today.toLocaleString()}
                error={!!statsError}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <TileGroupCaption>
              Last {(stats?.total_runs ?? TREND_WINDOW).toLocaleString()} turns
            </TileGroupCaption>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                icon={XCircle}
                label="Error rate"
                value={stats ? `${stats.error_rate_pct.toLocaleString()}%` : undefined}
                error={!!statsError}
                tone={
                  !stats || stats.error_rate_pct < ERROR_RATE_WARN_PCT
                    ? undefined
                    : stats.error_rate_pct < ERROR_RATE_BAD_PCT
                      ? "warning"
                      : "negative"
                }
              />
              {/* Median, not the mean: the chart below says why. From the trend
                  fetch, which is the same latest-1,000 window. */}
              <StatTile
                icon={Clock}
                label="Median latency"
                value={
                  trendRuns === null
                    ? undefined
                    : windowLatency?.median == null
                      ? "—"
                      : formatLatency(windowLatency.median)
                }
                sub={windowLatency?.p95 == null ? undefined : `p95 ${formatLatency(windowLatency.p95)}`}
                error={!!trendError}
              />
              <StatTile
                icon={Coins}
                label="Avg tokens / turn"
                value={stats ? Math.round(stats.avg_tokens_per_run).toLocaleString() : undefined}
                error={!!statsError}
              />
              {/* A backup answering is not an error, but a rising count says
                  the primary is being rate-limited or failing. */}
              <StatTile
                icon={LifeBuoy}
                label="Fallback turns"
                value={
                  stats
                    ? `${stats.fallback_count.toLocaleString()} / ${stats.total_runs.toLocaleString()}`
                    : undefined
                }
                error={!!statsError}
                tone={stats && stats.fallback_count > 0 ? "warning" : undefined}
              />
            </div>
          </div>
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
                    { name: "Turns", slot: 0, values: trend.turns },
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
                    { name: "Error rate", slot: 0, values: trend.errorRate },
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
                  { name: "Median", slot: 0, values: trend.median },
                  {
                    name: "95th percentile",
                    slot: 1,
                    dashed: true,
                    values: trend.p95,
                  },
                ]}
                formatValue={formatLatency}
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
              <ChartHeading
                title="Tool usage"
                caption={`Calls per tool across the last ${stats.total_runs.toLocaleString()} turns.`}
              />
              <StatusBarChart data={chartData} height={200} />
            </>
          )}
        </Card>
      </div>

      <Card className="flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search message…"
            aria-label="Search turns by message"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select items={statusOptions} value={status} onValueChange={(v) => query.set({ status: v as string })}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter turns by status">
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
      </Card>

      <Card className="py-0">
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : runs === null ? (
          <AdminLoadingState />
        ) : runs.length === 0 ? (
          <AdminEmptyState title="No turns match these filters" />
        ) : (
          <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead>Tools</TableHead>
                  <TableHead>Model</TableHead>
                  <SortableTableHead
                    label="Latency"
                    sortKey="latency_ms"
                    className="text-right"
                    sort={sort}
                    onSort={query.sortBy}
                  />
                  {/* One column for both counts, as in the turn's model-calls
                      table. It sorts on input tokens; output-token sort went
                      with its column. */}
                  <SortableTableHead
                    label="Tokens in / out"
                    sortKey="input_tokens"
                    className="text-right"
                    sort={sort}
                    onSort={query.sortBy}
                  />
                  <SortableTableHead
                    label="Created"
                    sortKey="created_at"
                    sort={sort}
                    onSort={query.sortBy}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id} data-state={r.id === selectedRunId ? "selected" : undefined}>
                    <TableCell className="max-w-xs">
                      {/* The way into the turn: a real button, so Tab and Enter work. */}
                      <button
                        type="button"
                        title={r.user_message}
                        onClick={() => selectRun(r.id)}
                        className="text-brand-text block w-full cursor-pointer truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {r.user_message}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.username}</TableCell>
                    <TableCell>
                      <AdminStatusPill kind="agent" value={r.status} />
                    </TableCell>
                    {/* One tool per line: the column stays as narrow as its
                        longest name however many tools a turn called. */}
                    <TableCell className="text-muted-foreground">
                      {r.tool_names.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="flex flex-col gap-0.5">
                          {r.tool_names.map((name, i) => (
                            <li key={i}>{name}</li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell>
                      <ModelCell model={r.model} position={r.model_position} fallback={r.fallback_triggered} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatLatency(r.latency_ms)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.input_tokens === null
                        ? "—"
                        : `${r.input_tokens.toLocaleString()} / ${(r.output_tokens ?? 0).toLocaleString()}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {parseUtc(r.created_at).toLocaleString("en-MY", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={query.setPage} />

      <Sheet open={selectedRunId !== null} onOpenChange={(open) => !open && selectRun(null)}>
        {/* The side-prefixed width classes are the ones that beat the sheet's
            own `data-[side=right]:sm:max-w-sm`. The header sits outside the
            scrolling body, so the title and close stay put. */}
        <SheetContent
          side="right"
          showCloseButton={false}
          className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-3xl"
        >
          <div className="border-line flex shrink-0 items-center gap-1 border-b py-2.5 pr-3 pl-4">
            <SheetTitle className="mr-auto">Turn detail</SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous turn on this page"
              disabled={!prevRunId}
              onClick={() => selectRun(prevRunId)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next turn on this page"
              disabled={!nextRunId}
              onClick={() => selectRun(nextRunId)}
            >
              <ChevronRight />
            </Button>
            <SheetClose render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}>
              <X />
            </SheetClose>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {detailError ? (
              <AdminErrorState message={detailError} onRetry={() => setDetailReloadTick((t) => t + 1)} />
            ) : selectedRun === null ? (
              <AdminLoadingState />
            ) : (
              <RunDetail run={selectedRun} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TileGroupCaption({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
      {children}
    </span>
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
  return parseUtc(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - parseUtc(iso).getTime()) / 60000);
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
  // Success is the check icon alone; only a failure needs words.
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="font-medium uppercase tracking-wide">{label}</span>
      <span className="truncate font-mono">{value}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={copied ? `${label} ID copied` : `Copy ${label.toLowerCase()} ID`}
        onClick={handleCopy}
        className="shrink-0"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </Button>
    </div>
  );
}

function RunDetail({ run }: { run: AgentRunDetail }) {
  return (
    <div className="flex flex-col gap-4 text-[13px]">
      {/* Header: status + who + when */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <AdminStatusPill kind="agent" value={run.status} />
        <span className="font-medium">{run.username}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          {formatDateTime(run.created_at)} · {relativeTime(run.created_at)}
        </span>
      </div>

      {/* Metadata grid */}
      <div className="border-line grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-3 sm:grid-cols-4">
        <Meta label="Latency" value={formatLatency(run.latency_ms)} />
        <Meta label="Input tokens" value={run.input_tokens?.toLocaleString() ?? "—"} />
        <Meta label="Output tokens" value={run.output_tokens?.toLocaleString() ?? "—"} />
        <Meta label="Tool calls" value={String(run.tool_calls.length)} />
        <Meta label="Answered by" value={run.model ?? "—"} />
        <Meta label="Chain position" value={positionLabel(run.model_position)} />
        <Meta label="Fallback" value={run.fallback_triggered ? "Yes — a backup answered a step" : "No"} />
      </div>

      {/* Conversation */}
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
          <MessageSquare className="size-3.5" /> User
        </span>
        <p className="bg-surface-2 rounded-lg p-3 whitespace-pre-wrap">{run.user_message}</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
          <Sparkles className="text-brand-text size-3.5" /> Pico
        </span>
        <p className="bg-brand-tint/40 rounded-lg p-3 whitespace-pre-wrap">{run.reply_text || "—"}</p>
      </div>

      {run.error_message && (
        <div className="flex flex-col gap-1">
          <span className="text-negative flex items-center gap-1.5 text-[12px] font-semibold">
            <AlertTriangle className="size-3.5" /> Error
          </span>
          <p className="bg-negative/10 text-negative rounded-lg p-3 whitespace-pre-wrap">
            {run.error_message}
          </p>
        </div>
      )}

      <ModelCalls calls={run.model_calls ?? []} />

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
                <span className="bg-brand-tint text-brand-text flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums">
                  {i + 1}
                </span>
                <span className="font-semibold">{call.name}</span>
                {call.duration_ms !== null && (
                  <span className="tabular-nums text-[12px] text-muted-foreground">
                    {formatLatency(call.duration_ms)}
                  </span>
                )}
                {call.error && <AdminStatusPill kind="agent" value="error" />}
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
        <CopyableId label="Turn" value={run.id} />
        <CopyableId label="Conversation" value={run.conversation_id} />
      </div>
    </div>
  );
}

/** Every model call of the turn, in order. A failed call and the fallback that
 * answered for it share a step number. */
function ModelCalls({ calls }: { calls: AgentModelCall[] }) {
  if (calls.length === 0) return null;
  const firstStart = parseUtc(calls[0].started_at).getTime();
  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold">Model calls ({calls.length})</span>
      <div className="border-line overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Step</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Tokens in / out</TableHead>
              <TableHead>Tools</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((call) => (
              <TableRow key={call.seq} className="align-top">
                <TableCell className="tabular-nums">{call.step}</TableCell>
                <TableCell className="tabular-nums">
                  +{((parseUtc(call.started_at).getTime() - firstStart) / 1000).toFixed(1)} s
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="font-mono text-[12.5px]">{call.model}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {positionLabel(call.chain_position)}
                  </div>
                  {call.error_message && (
                    <p className="text-negative mt-1 text-[12px] break-words">
                      {call.error_type}: {call.error_message}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <AdminStatusPill kind="agent" value={call.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {call.duration_ms === null ? "—" : formatLatency(call.duration_ms)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {call.input_tokens === null
                    ? "—"
                    : `${call.input_tokens.toLocaleString()} / ${(call.output_tokens ?? 0).toLocaleString()}`}
                </TableCell>
                <TableCell>{call.tool_calls.length ? call.tool_calls.join(", ") : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
  sub,
  error,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Already formatted. `undefined` while loading. */
  value: string | undefined;
  /** A second, smaller figure under the label. */
  sub?: string;
  error: boolean;
  tone?: "negative" | "warning";
}) {
  return (
    <Card className="flex-row items-center gap-3 p-3">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          tone === "negative"
            ? "bg-negative/10 text-negative"
            : tone === "warning"
              ? "bg-warning/10 text-warning"
              : "bg-brand-tint text-brand-text",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        {/* The skeleton bar sits in a box the height of the text line it
            replaces (text-xl: 28px), so the tile does not jump when data lands. */}
        <div
          className={cn(
            "flex h-7 items-center text-xl font-bold whitespace-nowrap tabular-nums",
            tone === "negative" && "text-negative",
            tone === "warning" && "text-warning",
          )}
        >
          {error ? "—" : value === undefined ? <Skeleton className="h-4 w-14" /> : value}
        </div>
        <div className="text-[12.5px] text-muted-foreground">{label}</div>
        {sub && !error && <div className="text-[11px] text-muted-foreground tabular-nums">{sub}</div>}
      </div>
    </Card>
  );
}

/** 0 = the use's primary model; n = backup n. */
function positionLabel(position: number | null): string {
  if (position === null) return "—";
  return position === 0 ? "Primary" : `Backup ${position}`;
}

/**
 * The model that wrote the reply. A fallback badge marks turns where a backup
 * answered any step, which can be true even when the final reply came from the
 * primary (an earlier step fell back, a later one did not).
 */
function ModelCell({
  model,
  position,
  fallback,
}: {
  model: string | null;
  position: number | null;
  fallback: boolean;
}) {
  if (!model) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-[12.5px]">{model}</span>
      {fallback && (
        <span className="flex items-center gap-1.5">
          <AdminStatusPill kind="agent" value="fallback" />
          <span className="text-[11px] text-muted-foreground">
            {position ? `backup ${position}` : "earlier step"}
          </span>
        </span>
      )}
    </div>
  );
}
