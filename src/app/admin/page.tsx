"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Layers,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getAgentRunStats } from "@/lib/api/admin/agent-monitoring";
import {
  generateAllEmbeddings,
  generateAllPickScores,
  getEmbeddingStatus,
  getPickScoreStatus,
} from "@/lib/api/admin/embeddings";
import { type Job, jobTypeLabel, listJobs } from "@/lib/api/admin/jobs";
import { listLaptops } from "@/lib/api/admin/laptops";
import { listPendingSummaries, listRawReviews } from "@/lib/api/admin/reviews";
import { getScrapeStatusCounts, listRawScrapLaptops } from "@/lib/api/admin/scraper";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminPageHeader } from "./admin-page-header";
import { DashboardSkeleton } from "./dashboard-skeleton";

/**
 * Everything here answers one question: what is stuck, and where?
 *
 * Deliberately not a catalog-size dashboard. Counts are queue depths, and
 * each one is the link that clears it — the pipeline order is the thing the
 * screen has to teach, because every stage depends on the one before it.
 */

interface Health {
  targetsPending: number;
  targetsFailed: number;
  targetsTotal: number;
  rawTotal: number;
  rawPending: number;
  laptopCount: number;
  embedded: number;
  embeddedTotal: number;
  embedCoverage: number;
  scored: number;
  scoreCoverage: number;
  reviewsPending: number;
  summariesPending: number;
  agentRuns: number;
  agentErrorRate: number;
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [health, setHealth] = useState<Health | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [running, setRunning] = useState<"embed" | "score" | null>(null);

  // Clear a prior error as soon as a retry is requested — "adjust state
  // during render", not an effect (see laptops-browse.tsx).
  const [prevReloadTick, setPrevReloadTick] = useState(reloadTick);
  if (reloadTick !== prevReloadTick) {
    setPrevReloadTick(reloadTick);
    setError(null);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    // Every count is a `limit: 1` probe reading the total, so the dashboard
    // never pulls a full table just to size it.
    Promise.all([
      getScrapeStatusCounts(token),
      listRawScrapLaptops(token, { limit: 1 }),
      listRawScrapLaptops(token, { limit: 1, processingStatus: "pending" }),
      listLaptops({ limit: 1 }),
      getEmbeddingStatus(),
      getPickScoreStatus(),
      listRawReviews(token, "pending"),
      listPendingSummaries(token),
      getAgentRunStats(token),
      listJobs(token, { limit: 4 }),
    ])
      .then(
        ([
          targets,
          raw,
          rawPending,
          laptops,
          embeddings,
          pickScores,
          pendingReviews,
          pendingSummaries,
          agent,
          jobList,
        ]) => {
          if (cancelled) return;
          setHealth({
            targetsPending: targets.pending,
            targetsFailed: targets.failed,
            targetsTotal: targets.total,
            rawTotal: raw.total,
            rawPending: rawPending.total,
            laptopCount: laptops.total,
            embedded: embeddings.embedded,
            embeddedTotal: embeddings.total_laptops,
            embedCoverage: embeddings.coverage_pct,
            scored: pickScores.scored,
            scoreCoverage: pickScores.coverage_pct,
            reviewsPending: pendingReviews.length,
            summariesPending: pendingSummaries.total,
            agentRuns: agent.runs_today,
            agentErrorRate: agent.error_rate_pct,
          });
          setJobs(jobList.items);
          setError(null);
        },
      )
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Couldn't load pipeline health.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  async function runEmbeddings() {
    if (!token) return;
    setRunning("embed");
    try {
      await generateAllEmbeddings(token);
      // Fires and forgets: no job id, no progress feed. The only honest
      // signal is the coverage number climbing on the next refresh.
      toast.success("Embedding generation started. Refresh to watch coverage climb.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start embedding.");
    } finally {
      setRunning(null);
    }
  }

  async function runPickScores() {
    if (!token) return;
    setRunning("score");
    try {
      await generateAllPickScores(token);
      toast.success("PickScores recalculated.");
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't recalculate scores.");
    } finally {
      setRunning(null);
    }
  }

  const stages = health
    ? [
        {
          href: "/admin/queue",
          stage: "Find pages",
          count: health.targetsPending,
          unit: "waiting to collect",
          caption:
            "Links the feed crawler found. Failed rows retry on the next bulk run.",
          cta: "Open queue",
          progress:
            health.targetsTotal > 0
              ? (health.targetsTotal - health.targetsPending) / health.targetsTotal
              : 1,
          footnote: `${health.targetsTotal - health.targetsPending} of ${health.targetsTotal} collected`,
        },
        {
          href: "/admin/pipeline",
          stage: "Collect specs",
          count: health.rawTotal,
          unit: "raw records",
          caption: "Messy vendor text. Invisible to customers until processed.",
          cta: "View records",
          progress:
            health.rawTotal > 0 ? (health.rawTotal - health.rawPending) / health.rawTotal : 1,
          footnote: `${health.rawPending} not yet processed`,
        },
        {
          href: "/admin/processing",
          stage: "AI clean-up",
          count: health.rawPending,
          unit: "to process",
          caption: "Turns vendor text into catalog entries and adds use-case tags.",
          cta: "Process batch",
          progress:
            health.rawTotal > 0 ? (health.rawTotal - health.rawPending) / health.rawTotal : 1,
          footnote: "Roughly 5s per record",
        },
        {
          href: "/admin/catalog/laptops",
          stage: "Publish",
          count: health.laptopCount,
          unit: "in the catalog",
          caption: "Searchable by chat once embedded, and ranked once scored.",
          cta: "Open catalog",
          progress: health.embedCoverage / 100,
          footnote: `${health.embedCoverage}% searchable`,
        },
      ]
    : [];

  const attention = health
    ? [
        {
          href: "/admin/queue",
          count: health.targetsFailed,
          icon: Upload,
          title: "Pages that could not be collected",
          body: "Retried automatically on the next bulk run. Acer pages need a manual upload.",
        },
        {
          href: "/admin/reviews/raw",
          count: health.reviewsPending,
          icon: Video,
          title: "Review videos need a human decision",
          body: "Confirm the guessed laptop, point it at the right one, or reject it.",
        },
        {
          href: "/admin/reviews/pipeline",
          count: health.summariesPending,
          icon: Layers,
          title: "Laptops with new review summaries",
          body: "Aggregating is fast and only re-reads what is already stored.",
        },
      ].filter((a) => a.count > 0)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Pipeline health"]}
        title="Pipeline health"
        description="Every laptop moves through four stages, and each one depends on the stage before it. A number below is a queue — open it to clear it. Re-running any stage is safe: finished items are skipped."
        action={
          <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card className="gap-0 p-6 text-center">
          <p className="text-[13px] text-muted-foreground">{error}</p>
          <div className="mt-3 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>
              <RefreshCw data-icon="inline-start" />
              Retry
            </Button>
          </div>
        </Card>
      ) : !health ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* The pipeline, left to right. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stages.map((s, i) => (
              <div key={s.stage} className="relative">
                <Link
                  href={s.href}
                  className="border-line bg-surface hover:border-brand/30 flex h-full flex-col rounded-2xl border p-4 transition-colors"
                >
                  <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">
                    {s.stage}
                  </span>
                  <span className="mt-2.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tabular-nums">
                      {s.count.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground text-[12px]">{s.unit}</span>
                  </span>
                  <span className="text-muted-foreground mt-1 block min-h-[34px] text-[12.5px] leading-snug">
                    {s.caption}
                  </span>
                  <span className="bg-surface-2 mt-3 block h-1.5 overflow-hidden rounded-full">
                    <span
                      className="bg-brand block h-full rounded-full"
                      style={{ width: `${Math.round(s.progress * 100)}%` }}
                    />
                  </span>
                  <span className="mt-2.5 flex items-center justify-between">
                    <span className="text-brand text-[12.5px] font-semibold">{s.cta} →</span>
                    <span className="text-muted-foreground text-[11.5px] tabular-nums">
                      {s.footnote}
                    </span>
                  </span>
                </Link>
                {i < stages.length - 1 && (
                  <ChevronRight
                    className="text-muted-foreground/40 absolute top-1/2 -right-2.5 hidden size-4 -translate-y-1/2 xl:block"
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
            {/* Waiting on you */}
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold tracking-tight">Waiting on you</h2>
                <span className="text-muted-foreground text-[12px]">
                  routine states, not errors
                </span>
              </div>
              {attention.length === 0 ? (
                <Card className="gap-0 p-6 text-center">
                  <p className="text-muted-foreground text-[13px]">
                    Nothing is waiting. Every queue is clear.
                  </p>
                </Card>
              ) : (
                <div className="flex flex-col gap-2">
                  {attention.map((a) => (
                    <Link
                      key={a.title}
                      href={a.href}
                      className="border-line bg-surface hover:bg-surface-2 flex items-center gap-3.5 rounded-2xl border p-3.5 transition-colors"
                    >
                      <span className="bg-brand-tint text-brand flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums">
                        {a.count}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold">{a.title}</span>
                        <span className="text-muted-foreground mt-0.5 block text-[12.5px]">
                          {a.body}
                        </span>
                      </span>
                      <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href="/admin/agent-monitoring"
                className="border-line bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-2xl border p-3.5 transition-colors"
              >
                <MessagesSquare className="text-brand size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">
                    Pico answered {health.agentRuns.toLocaleString()} turns today
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-[12.5px] tabular-nums">
                    {health.agentErrorRate}% ended in an error
                  </span>
                </span>
                <ArrowRight className="text-muted-foreground size-4 shrink-0" />
              </Link>
            </div>

            {/* Findable & rankable, plus recent runs */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-bold tracking-tight">Findable and rankable</h2>
                <Card className="gap-0 p-4">
                  <Meter
                    label="Embedded for chat"
                    value={health.embedded}
                    total={health.embeddedTotal}
                    pct={health.embedCoverage}
                  />
                  <div className="mt-3.5">
                    <Meter
                      label="PickScores calculated"
                      value={health.scored}
                      total={health.embeddedTotal}
                      pct={health.scoreCoverage}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button size="sm" onClick={runEmbeddings} disabled={running !== null}>
                      {running === "embed" ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <Sparkles data-icon="inline-start" />
                      )}
                      Generate missing embeddings
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={runPickScores}
                      disabled={running !== null}
                    >
                      {running === "score" && <Spinner data-icon="inline-start" />}
                      Recalculate PickScores
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-2.5 text-[12px] leading-snug">
                    Embedding runs in the background with no progress feed, so refresh to
                    watch coverage climb. Scoring is arithmetic and finishes quickly.
                  </p>
                </Card>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-bold tracking-tight">Recent runs</h2>
                  <Link
                    href="/admin/jobs"
                    className="text-brand text-[12.5px] font-semibold hover:underline"
                  >
                    All jobs →
                  </Link>
                </div>
                <Card className="gap-0 py-0">
                  {jobs.length === 0 ? (
                    <p className="text-muted-foreground p-5 text-center text-[13px]">
                      No runs yet.
                    </p>
                  ) : (
                    <ul className="divide-line divide-y">
                      {jobs.map((job) => (
                        <li
                          key={job.id}
                          className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]"
                        >
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              job.status === "failed"
                                ? "bg-negative"
                                : job.status === "completed"
                                  ? "bg-positive"
                                  : "bg-brand",
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {jobTypeLabel(job.job_type)}
                          </span>
                          <span className="text-muted-foreground shrink-0 tabular-nums">
                            {job.succeeded_count}/{job.total_count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <p className="text-muted-foreground text-[12px] leading-snug">
                  A run with some items failing is still a completed run. Judge it by the
                  failed count, not the status.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Meter({
  label,
  value,
  total,
  pct,
}: {
  label: string;
  value: number;
  total: number;
  pct: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {value.toLocaleString()} of {total.toLocaleString()} · {pct}%
        </span>
      </div>
      <div className="bg-surface-2 h-1.5 overflow-hidden rounded-full">
        <div className="bg-brand h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
