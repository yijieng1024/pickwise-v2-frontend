"use client";

import { brandSlot } from "@/components/charts/chart-palette";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";
import { TrendLine, type TrendPoint } from "@/components/charts/trend-line";
import { Card } from "@/components/ui/card";
import { THRESHOLDS, ageDays, ageTone, picoNeedsAttention, pickscoreTone, timeAgo } from "@/lib/admin/freshness";
import type { DashboardSummary } from "@/lib/api/admin/dashboard";
import { type Job, jobTypeLabel } from "@/lib/api/admin/jobs";
import { cn } from "@/lib/utils";

import type { Tone } from "./admin-status-pill";
import { CardLink, ShareBar, StatTile, SummaryCard, ToneChip, dayLabel } from "./admin-summary-ui";

// --- Needs attention ---------------------------------------------------------

interface AttentionRow {
  key: string;
  tone: Tone;
  title: string;
  detail: string;
  href: string;
  linkLabel: string;
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

function attentionRows(s: DashboardSummary): AttentionRow[] {
  const a = s.attention;
  const rows: AttentionRow[] = [];

  const failedJobs = a.failed_jobs_7d + a.jobs_with_item_failures_7d;
  if (failedJobs > 0) {
    rows.push({
      key: "jobs",
      tone: "bad",
      title: `${plural(failedJobs, "job")} failed or had failed items in the last 7 days`,
      detail: a.failed_job_list
        .map((j) =>
          j.status === "failed"
            ? `${jobTypeLabel(j.job_type)}: stopped early`
            : `${jobTypeLabel(j.job_type)}: ${j.failed_count} failed`,
        )
        .join(" · "),
      href: "/admin/jobs",
      linkLabel: "Open Jobs",
    });
  }
  if (a.review_processing.paused) {
    rows.push({
      key: "paused",
      tone: "warn",
      title: "Review processing is paused",
      detail: a.review_processing.reason
        ? `Reason: ${a.review_processing.reason}`
        : "No reason recorded yet. Add one on the Review Pipeline page.",
      href: "/admin/reviews/pipeline",
      linkLabel: "Review Pipeline",
    });
  }
  if (a.reviews_to_link > 0) {
    rows.push({
      key: "link",
      tone: "warn",
      title: `${plural(a.reviews_to_link, "review")} waiting to be linked`,
      detail: "Videos with no laptop or family linked yet",
      href: "/admin/reviews/link",
      linkLabel: "Link Reviews",
    });
  }
  if (a.awaiting_price > 0) {
    rows.push({
      key: "price",
      tone: "warn",
      title: `${plural(a.awaiting_price, "laptop")} waiting for a price`,
      detail: "Inactive with price 0, so they're hidden from the site",
      href: "/admin/catalog/laptops?status=inactive",
      linkLabel: "Laptops",
    });
  }
  const ps = a.pickscore;
  if (ps.missing + ps.withheld + ps.unverified > 0) {
    const parts = [
      ps.missing > 0 && `${ps.missing} with no Pick Score`,
      ps.withheld > 0 && `${ps.withheld} withheld`,
      ps.unverified > 0 && `${ps.unverified} with an Unverified benchmark`,
    ].filter(Boolean);
    rows.push({
      key: "pickscore",
      tone: "warn",
      title: "Some active laptops have no full Pick Score",
      detail: parts.join(" · "),
      href: "/admin/benchmarks/cpu",
      linkLabel: "Benchmarks",
    });
  }
  const p = s.pico;
  if (picoNeedsAttention(p.runs_7d, p.errors_7d, p.fallbacks_7d)) {
    rows.push({
      key: "pico",
      tone: "warn",
      title: `Pico had ${plural(p.errors_7d, "error")} and used a backup model ${plural(p.fallbacks_7d, "time")} in the last ${THRESHOLDS.pico.windowDays} days`,
      detail: `${plural(p.runs_7d, "run")} in that time`,
      href: "/admin/agent-monitoring",
      linkLabel: "Chatbot Monitoring",
    });
  }
  return rows;
}

const DOT: Record<Tone, string> = {
  bad: "bg-negative",
  warn: "bg-warning",
  neutral: "bg-muted-foreground",
  good: "bg-positive",
  active: "bg-brand",
};

export function NeedsAttention({ summary }: { summary: DashboardSummary }) {
  const rows = attentionRows(summary);
  return (
    <SummaryCard
      id="attention"
      title="Needs attention"
      badge={
        rows.length > 0 ? (
          <ToneChip tone="warn">{plural(rows.length, "item")}</ToneChip>
        ) : (
          <ToneChip tone="good">All good</ToneChip>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">Nothing needs you right now.</p>
      ) : (
        <ul className="mt-2">
          {rows.map((r) => (
            <li key={r.key} className="border-line flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t py-3">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[r.tone])} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{r.title}</div>
                {r.detail && <div className="text-muted-foreground mt-0.5 text-sm">{r.detail}</div>}
              </div>
              <CardLink href={r.href}>{r.linkLabel}</CardLink>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

// --- Trends ------------------------------------------------------------------

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card className="gap-0 px-5 py-4">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {sub && <p className="text-muted-foreground mt-0.5 text-sm">{sub}</p>}
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export function Trends({ summary }: { summary: DashboardSummary }) {
  const t = summary.trends;
  const points: TrendPoint[] = t.days.map((d) => ({ key: d, label: dayLabel(d) }));
  const failedDays = t.jobs.with_failures.filter((n) => n > 0).length;
  const activeTotal = t.laptops_by_brand.reduce((sum, b) => sum + b.active, 0);

  return (
    <section aria-labelledby="trends">
      <div className="mb-3 flex flex-wrap items-baseline gap-2.5">
        <h2 id="trends" className="text-base font-semibold tracking-tight">
          Trends
        </h2>
        <span className="text-muted-foreground text-sm">Last {t.days.length} days, Malaysia time</span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Pico conversations per day" sub={`${summary.pico.conversations_7d} in the last 7 days`}>
          <TrendLine
            caption="Pico conversations per day"
            points={points}
            series={[{ name: "Conversations", slot: 0, values: t.pico_conversations }]}
          />
        </ChartCard>
        <ChartCard
          title="Google API calls per day"
          sub={
            t.embedding_logged_since
              ? `Which feature uses the daily quota. Embedding calls are counted from ${dayLabel(t.embedding_logged_since)}.`
              : "Which feature uses the daily quota."
          }
        >
          <TrendLine
            caption="Google API calls per day by feature"
            points={points}
            series={[
              { name: "Pico", slot: 0, values: t.api_calls.pico },
              { name: "Embeddings", slot: 2, values: t.api_calls.embedding },
              { name: "Review processing", slot: 1, values: t.api_calls.review_processing },
              { name: "AI Clean-Up", slot: 3, values: t.api_calls.ai_cleanup },
            ]}
          />
        </ChartCard>
        <ChartCard
          title="Jobs per day"
          sub={failedDays === 0 ? "No job had failed items" : `${plural(failedDays, "day")} had a job with failed items`}
        >
          <StackedBarChart
            caption="Jobs per day"
            points={points}
            series={[
              { name: "Succeeded", slot: 0, values: t.jobs.clean },
              { name: "Had failed items", slot: 1, values: t.jobs.with_failures },
            ]}
          />
        </ChartCard>
        <ChartCard title="Active laptops by brand" sub={`${activeTotal.toLocaleString()} active laptops`}>
          <HorizontalBarChart
            caption="Active laptops by brand"
            valueLabel="Active laptops"
            data={t.laptops_by_brand.map((b) => ({
              id: b.brand_id,
              label: b.brand_name,
              value: b.active,
              slot: brandSlot(b.brand_name, b.brand_id),
            }))}
          />
        </ChartCard>
      </div>
    </section>
  );
}

// --- Data freshness ----------------------------------------------------------

function FreshRow({
  label,
  detail,
  chip,
  tone,
  link,
}: {
  label: string;
  detail: string;
  chip: string;
  tone: Tone;
  link?: { href: string; label: string };
}) {
  return (
    <li className="border-line flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-muted-foreground mt-0.5 text-sm">{detail}</div>
      </div>
      <ToneChip tone={tone}>{chip}</ToneChip>
      {link ? <CardLink href={link.href}>{link.label}</CardLink> : <span className="w-0" />}
    </li>
  );
}

function daysChip(days: number | null): string {
  if (days === null) return "Unknown";
  return days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`;
}

export function Freshness({ summary }: { summary: DashboardSummary }) {
  const f = summary.freshness;
  const psTone = pickscoreTone(f.pickscore_recalculated_at, f.catalog_changed_at);
  const priceDays = ageDays(f.price_checked_oldest_at);
  const benchDays = ageDays(f.passmark_refreshed_at);

  return (
    <SummaryCard id="freshness" title="Data freshness" description="How long since each piece of data was last updated.">
      <ul className="mt-2">
        <FreshRow
          label="Pick Score recalculated"
          detail={
            psTone === "bad"
              ? "Never calculated"
              : psTone === "warn"
                ? "The catalog changed after the last run"
                : "Up to date with the catalog"
          }
          chip={f.pickscore_recalculated_at ? timeAgo(f.pickscore_recalculated_at) : "Never"}
          tone={psTone}
          link={{ href: "/admin/benchmarks/cpu", label: "Recalculate" }}
        />
        <FreshRow
          label='Oldest price "Last Checked"'
          detail={
            f.price_checked_missing > 0
              ? `${plural(f.price_checked_missing, "active laptop")} ${f.price_checked_missing === 1 ? "has" : "have"} never been checked`
              : "The active laptop checked longest ago"
          }
          chip={daysChip(priceDays)}
          tone={ageTone(priceDays, THRESHOLDS.price)}
          link={{ href: "/admin/catalog/laptops", label: "Laptops" }}
        />
        <FreshRow
          label="CPU / GPU benchmarks"
          detail={f.passmark_refreshed_at ? "Last PassMark refresh" : "Refreshes are recorded from step 10 on"}
          chip={daysChip(benchDays)}
          tone={ageTone(benchDays, THRESHOLDS.benchmarks)}
          link={{ href: "/admin/benchmarks/cpu", label: "Benchmarks" }}
        />
        <FreshRow
          label="Embeddings"
          detail="Last generated"
          chip={f.embeddings_updated_at ? timeAgo(f.embeddings_updated_at) : "Never"}
          // No threshold is set for embeddings, so the chip states the age without judging it.
          tone="neutral"
          link={{ href: "/admin/embeddings", label: "Embeddings" }}
        />
      </ul>

      <div className="text-muted-foreground mt-4 text-xs font-semibold tracking-wide uppercase">Last data per brand</div>
      <div className="mt-1.5 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {["Brand", "Source", "Last data"].map((h) => (
                <th key={h} scope="col" className="border-line text-muted-foreground border-b px-2 py-2 text-left text-xs font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {f.scrape_by_brand.map((b) => (
              <tr key={b.brand_id}>
                <td className="border-line border-b px-2 py-2.5">{b.brand_name}</td>
                <td className="border-line text-muted-foreground border-b px-2 py-2.5">
                  {!b.has_scraper ? "No scraper" : b.source === "upload" ? "Upload" : "Scrape"}
                </td>
                <td className="border-line border-b px-2 py-2.5 tabular-nums">
                  {b.last_at ? timeAgo(b.last_at) : b.has_scraper ? "No data yet" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SummaryCard>
  );
}

// --- Jobs --------------------------------------------------------------------

function resultChip(job: Job): { tone: Tone; text: string } {
  if (job.status === "failed") return { tone: "bad", text: "Stopped early" };
  if (job.status === "cancelled") return { tone: "neutral", text: `Stopped at ${job.processed_count}` };
  if (job.failed_count > 0) return { tone: "bad", text: `${job.succeeded_count} done · ${job.failed_count} failed` };
  const r = job.result;
  if (job.job_type === "pickscore.generate_all" && r && r.written !== false) {
    return { tone: "good", text: `${r.laptops_scored} scored · ${r.laptops_withheld} withheld` };
  }
  return { tone: "good", text: `${job.succeeded_count.toLocaleString()} done` };
}

export function JobsCard({ summary, currentUserId }: { summary: DashboardSummary; currentUserId: string | null }) {
  const { running, recent } = summary.jobs;
  return (
    <SummaryCard id="jobs" title="Jobs" link={{ href: "/admin/jobs", label: "All jobs" }}>
      <div className="text-muted-foreground mt-2 text-xs font-semibold tracking-wide uppercase">Running now</div>
      {running.length === 0 ? (
        <p className="text-muted-foreground mt-1.5 text-sm">Nothing running.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {running.map((j) => (
            <li key={j.id} className="bg-surface-2 rounded-xl p-3.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-sm font-semibold">{jobTypeLabel(j.job_type)}</span>
                <span className="text-muted-foreground text-xs">
                  started {timeAgo(j.started_at ?? j.created_at)}
                  {currentUserId && j.created_by === currentUserId ? " by you" : ""}
                </span>
                <span className="ml-auto text-sm font-semibold tabular-nums">
                  {j.processed_count} / {j.total_count}
                </span>
              </div>
              <div
                className="bg-background mt-2.5 h-2 overflow-hidden rounded-full"
                role="progressbar"
                aria-label={`${jobTypeLabel(j.job_type)} progress`}
                aria-valuenow={Math.round(j.progress_percentage)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="bg-brand h-full rounded-full transition-[width] duration-500" style={{ width: `${j.progress_percentage}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="text-muted-foreground mt-4 text-xs font-semibold tracking-wide uppercase">Recent</div>
      {recent.length === 0 ? (
        <p className="text-muted-foreground mt-1.5 text-sm">No finished jobs yet.</p>
      ) : (
        <div className="mt-1.5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Job", "Finished", "Result"].map((h) => (
                  <th key={h} scope="col" className="border-line text-muted-foreground border-b px-2 py-2 text-left text-xs font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((j) => {
                const chip = resultChip(j);
                return (
                  <tr key={j.id}>
                    <td className="border-line border-b px-2 py-2.5">{jobTypeLabel(j.job_type)}</td>
                    <td className="border-line text-muted-foreground border-b px-2 py-2.5 whitespace-nowrap">
                      {timeAgo(j.finished_at ?? j.created_at)}
                    </td>
                    <td className="border-line border-b px-2 py-2.5">
                      <ToneChip tone={chip.tone}>{chip.text}</ToneChip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SummaryCard>
  );
}

// --- Catalog + Pico ------------------------------------------------------------

export function CatalogCard({ summary }: { summary: DashboardSummary }) {
  const c = summary.catalog;
  return (
    <SummaryCard id="catalog" title="Catalog" link={{ href: "/admin/catalog/laptops", label: "Laptops" }}>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <StatTile label="Active" value={c.active.toLocaleString()} />
        <StatTile label="Inactive" value={c.inactive.toLocaleString()} />
        <StatTile label="Suspended" value={c.suspended.toLocaleString()} />
      </div>
      <div className="text-muted-foreground mt-4 text-xs font-semibold tracking-wide uppercase">Active laptops with…</div>
      <div className="mt-2.5 flex flex-col gap-3">
        <ShareBar label="Pick Score" value={c.active_with_pickscore} total={c.active} />
        <ShareBar label="Embedding" value={c.active_with_embedding} total={c.active} />
        <ShareBar label="Reviews shown on the site" value={c.active_with_reviews} total={c.active} />
      </div>
    </SummaryCard>
  );
}

export function PicoCard({ summary }: { summary: DashboardSummary }) {
  const p = summary.pico;
  const rate = p.runs_7d > 0 ? `${((p.errors_7d / p.runs_7d) * 100).toFixed(1)}%` : "—";
  return (
    <SummaryCard id="pico" title="Pico" link={{ href: "/admin/agent-monitoring", label: "Chatbot Monitoring" }}>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <StatTile label="Conversations · 24 h" value={p.conversations_24h.toLocaleString()} />
        <StatTile label="Conversations · 7 days" value={p.conversations_7d.toLocaleString()} />
        <StatTile label="Error rate · 7 days" value={rate} note={`${p.errors_7d} of ${plural(p.runs_7d, "run")}`} />
        <StatTile label="Backup model used · 7 days" value={p.fallbacks_7d.toLocaleString()} note={p.fallbacks_7d === 1 ? "time" : "times"} />
      </div>
    </SummaryCard>
  );
}
