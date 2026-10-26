"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";

import { TrendLine } from "@/components/charts/trend-line";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type LLMUsageReport, type LLMUsageRow, getLLMUsage } from "@/lib/api/admin/llm-usage";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminPageHeader } from "../admin-page-header";
import { AdminTrendRange, DEFAULT_TREND_RANGE, type TrendRange } from "../admin-trend-range";

/** Readable names for `llm_usage_logs.feature`; unknown values show raw. */
const FEATURE_LABELS: Record<string, string> = {
  agent: "Chatbot (Pico)",
  processor_extract: "AI Clean-Up — extraction",
  processor_categorize: "AI Clean-Up — tagging",
  review_chunk: "Review processing",
};

export default function AdminLLMUsagePage() {
  const { token } = useAuth();
  // Unlike the other trend screens this one refetches on range change: the
  // backend aggregates in SQL, so there is no capped window of rows to re-bucket.
  const [days, setDays] = useState<TrendRange>(DEFAULT_TREND_RANGE);
  const [report, setReport] = useState<LLMUsageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [prevDays, setPrevDays] = useState(days);
  if (days !== prevDays) {
    setPrevDays(days);
    setReport(null);
    setError(null);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getLLMUsage(token, days)
      .then((res) => {
        if (!cancelled) setReport(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load token usage.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, days, reloadTick]);

  const trend = useMemo(() => {
    if (!report) return null;
    // by_day holds only days with calls; fill the rest with zero — a day with
    // no LLM calls really did spend zero tokens, so unlike a rate it is no gap.
    const byKey = new Map(report.by_day.map((r) => [r.key, r]));
    const start = new Date(`${report.since}T00:00:00Z`);
    const keys = Array.from({ length: report.days }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
    return {
      points: keys.map((key) => {
        const row = byKey.get(key);
        return {
          key,
          label: new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }),
          note: `${(row?.calls ?? 0).toLocaleString()} call${row?.calls === 1 ? "" : "s"}`,
        };
      }),
      input: keys.map((k) => byKey.get(k)?.input_tokens ?? 0),
      output: keys.map((k) => byKey.get(k)?.output_tokens ?? 0),
    };
  }, [report]);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Token Usage"
        description="Tokens spent by every LLM call — chatbot, AI clean-up and review processing."
        action={<AdminTrendRange value={days} onChange={setDays} label="Usage window" />}
      />

      {error ? (
        <Card className="gap-0 p-4">
          <AdminErrorState message={error} onRetry={() => setReloadTick((t) => t + 1)} />
        </Card>
      ) : report === null || trend === null ? (
        <Card className="gap-0 p-4">
          <AdminLoadingState />
        </Card>
      ) : report.calls === 0 ? (
        <Card className="gap-0 p-4">
          <AdminEmptyState
            icon={Coins}
            title="No LLM calls in this window"
            description="Usage appears once the chatbot, processor or review pipeline calls a model."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total tokens" value={report.total_tokens} />
            <Stat label="Input tokens" value={report.input_tokens} />
            <Stat label="Output tokens" value={report.output_tokens} />
            <Stat label="LLM calls" value={report.calls} />
          </div>

          <Card className="gap-0 p-4">
            <div className="mb-2.5">
              <h3 className="text-[13px] font-semibold">Tokens per day</h3>
              <p className="text-muted-foreground mt-0.5 text-[12px] leading-snug">
                Days are UTC. Input dominates — every agent step resends the conversation.
              </p>
            </div>
            <TrendLine
              points={trend.points}
              series={[
                { name: "Input", slot: 0, values: trend.input },
                { name: "Output", slot: 1, dashed: true, values: trend.output },
              ]}
              yWidth={64}
            />
          </Card>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <UsageTable
              title="By feature"
              keyLabel="Feature"
              rows={report.by_feature}
              total={report.total_tokens}
              format={(k) => FEATURE_LABELS[k] ?? k}
            />
            <UsageTable title="By model" keyLabel="Model" rows={report.by_model} total={report.total_tokens} />
          </div>

          <UsageTable
            title="By user"
            keyLabel="User"
            rows={report.by_user}
            total={report.total_tokens}
            format={(k) => (k === "system" ? "System (batch jobs)" : k)}
          />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-line bg-surface rounded-lg border p-3">
      <div className="text-xl font-bold tabular-nums">{value.toLocaleString()}</div>
      <div className="text-[12.5px] text-muted-foreground">{label}</div>
    </div>
  );
}

function UsageTable({
  title,
  keyLabel,
  rows,
  total,
  format = (k) => k,
}: {
  title: string;
  keyLabel: string;
  rows: LLMUsageRow[];
  total: number;
  format?: (key: string) => string;
}) {
  return (
    <Card className="gap-0 py-0">
      <h3 className="px-4 pt-4 pb-2 text-[13px] font-semibold">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{keyLabel}</TableHead>
            <TableHead className="text-right">Calls</TableHead>
            <TableHead className="text-right">Input</TableHead>
            <TableHead className="text-right">Output</TableHead>
            <TableHead className="text-right">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key}>
              <TableCell className="max-w-xs truncate">{format(r.key)}</TableCell>
              <TableCell className="text-right tabular-nums">{r.calls.toLocaleString()}</TableCell>
              <TableCell className="text-right tabular-nums">{r.input_tokens.toLocaleString()}</TableCell>
              <TableCell className="text-right tabular-nums">{r.output_tokens.toLocaleString()}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {total > 0 ? `${((r.total_tokens / total) * 100).toFixed(1)}%` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
