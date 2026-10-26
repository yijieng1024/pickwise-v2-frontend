"use client";

import Link from "next/link";
import { useState } from "react";

import { StatusBarChart } from "@/components/charts/status-bar-chart";
import { FACTOR_META } from "@/components/pick-score-breakdown";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pickscoreTone, timeAgo } from "@/lib/admin/freshness";
import type { BenchmarkDiagnosis, PickScoreSummary, ProblemLaptop, ProblemSide } from "@/lib/api/admin/pickscore";
import { type UseCaseSlug, USE_CASES, labelForUseCase } from "@/lib/api/pickscore";
import { cn } from "@/lib/utils";

import { StatTile, SummaryCard, ToneChip } from "../admin-summary-ui";

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

const TH = "border-line text-muted-foreground border-b px-2 py-2 text-xs font-semibold";
const TD = "border-line border-b px-2 py-2.5";

/**
 * The five use cases as tabs; scrolls sideways inside the card at phone width.
 * overflow-x alone makes the browser treat y as auto too, which put scrollbar
 * arrows on desktop, so y is hidden and the bar has no visible scrollbar. The
 * padding keeps the focus ring inside the clip.
 */
function UseCaseTabs({ value, onChange }: { value: UseCaseSlug; onChange: (v: UseCaseSlug) => void }) {
  return (
    <div className="mt-2 overflow-x-auto overflow-y-hidden p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Tabs value={value} onValueChange={(v) => onChange(v as UseCaseSlug)}>
        <TabsList>
          {USE_CASES.map((u) => (
            <TabsTrigger key={u.slug} value={u.slug}>
              {u.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

// --- 1. Status ----------------------------------------------------------------

export function StatusCard({ summary, action }: { summary: PickScoreSummary; action: React.ReactNode }) {
  const s = summary.status;
  const tone = pickscoreTone(s.recalculated_at, s.catalog_changed_at);
  const edited = s.edited_since ?? 0;

  return (
    <SummaryCard id="status" title="Status">
      <div className="mt-2 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">
              {s.recalculated_at ? `Last recalculated ${timeAgo(s.recalculated_at)}` : "Never calculated"}
            </span>
            <ToneChip tone={tone}>
              {tone === "bad" ? "No scores yet" : tone === "warn" ? "Catalog changed since" : "Up to date"}
            </ToneChip>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {tone === "warn"
              ? `${plural(edited, "laptop")} ${edited === 1 ? "was" : "were"} edited after the last run. Recalculate so their scores and everyone's percentiles are current.`
              : tone === "bad"
                ? "No Pick Score has been calculated yet."
                : "No laptop has changed since the last run."}
            {s.missing > 0 && ` ${plural(s.missing, "active laptop")} ${s.missing === 1 ? "has" : "have"} no Pick Score yet.`}
          </p>
        </div>
        {action}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Scored" value={s.scored.toLocaleString()} note={`of ${s.active.toLocaleString()} active laptops`} />
        <StatTile label="Withheld" value={s.withheld.toLocaleString()} note="CPU and GPU both unknown" />
        <StatTile label="Unverified" value={s.unverified.toLocaleString()} note="CPU or GPU not matched" />
        <StatTile label="GPU via iGPU map" value={summary.proxy.integrated.toLocaleString()} note="integrated graphics" />
        <StatTile label="GPU via Apple equivalent" value={summary.proxy.apple_equivalent.toLocaleString()} note="MacBooks" />
      </div>
    </SummaryCard>
  );
}

// --- 2. Problem laptops ----------------------------------------------------------

function Diagnosis({ d }: { d: BenchmarkDiagnosis }) {
  const matchesNow = d.candidates.some((c) => c.confidence >= d.threshold);
  return (
    <div className="text-sm">
      {d.message && <div className="text-muted-foreground">{d.message}</div>}
      {d.candidates.length > 0 && (
        <ul className="mt-0.5">
          {d.candidates.map((c) => (
            <li key={c.name} className="tabular-nums">
              {c.name} · {c.mark.toLocaleString()} · {c.confidence.toFixed(2)}
            </li>
          ))}
        </ul>
      )}
      {d.kind !== "placeholder" && d.kind !== "no_igpu_entry" && (
        <div className="text-muted-foreground mt-0.5 text-xs">
          {matchesNow
            ? "Matches today's table: recalculate to pick it up."
            : `Needs ${d.threshold.toFixed(2)} to match`}
        </div>
      )}
    </div>
  );
}

function Side({ label, side }: { label: "CPU" | "GPU"; side: ProblemSide }) {
  return (
    <div className="grid gap-1.5 md:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1.4fr)] md:gap-3">
      <div>
        <ToneChip tone="warn">{label} unverified</ToneChip>
      </div>
      <div className="text-sm break-words">
        <span className="text-muted-foreground md:hidden">Catalog says: </span>
        {side.catalog || "—"}
      </div>
      {side.diagnosis ? <Diagnosis d={side.diagnosis} /> : <div />}
    </div>
  );
}

function ProblemRow({ p }: { p: ProblemLaptop }) {
  return (
    <li className="border-line grid gap-2 border-b py-3 last:border-b-0 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] md:gap-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold break-words">{p.product_name}</div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
          {p.brand_name} · {p.status}
          {p.withheld && <ToneChip tone="bad">Withheld</ToneChip>}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {p.cpu.unresolved && <Side label="CPU" side={p.cpu} />}
        {p.gpu.unresolved && <Side label="GPU" side={p.gpu} />}
      </div>
      <Link
        href={`/admin/catalog/laptops/${p.laptop_id}/edit`}
        className="text-brand inline-flex min-h-11 items-center self-start text-sm font-semibold whitespace-nowrap hover:underline"
      >
        Edit laptop <span aria-hidden className="ml-1">→</span>
      </Link>
    </li>
  );
}

export function ProblemsCard({ summary }: { summary: PickScoreSummary }) {
  const { total, limit, items } = summary.problems;
  return (
    <SummaryCard
      id="problems"
      title="Laptops with a problem"
      badge={<ToneChip tone={total > 0 ? "warn" : "good"}>{total.toLocaleString()}</ToneChip>}
      description="The closest PassMark rows are shown for diagnosis only. They don't change how a laptop is matched."
    >
      {items.length === 0 ? (
        <p className="mt-3 text-sm">Every active laptop&apos;s CPU and GPU matched a PassMark row.</p>
      ) : (
        <>
          <div
            aria-hidden
            className={cn(TH, "mt-2 hidden border-b md:grid md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] md:gap-4")}
          >
            <span>Laptop</span>
            <span className="grid grid-cols-[8rem_minmax(0,1fr)_minmax(0,1.4fr)] gap-3">
              <span>Problem</span>
              <span>Catalog says</span>
              <span>Closest PassMark rows</span>
            </span>
            <span>Actions</span>
          </div>
          <ul>
            {items.map((p) => (
              <ProblemRow key={p.laptop_id} p={p} />
            ))}
          </ul>
          {total > items.length && (
            <p className="text-muted-foreground mt-2 text-sm">
              Showing the first {limit} of {total.toLocaleString()}.
            </p>
          )}
        </>
      )}
    </SummaryCard>
  );
}

// --- 3. Distribution ---------------------------------------------------------------

export function DistributionCard({ summary }: { summary: PickScoreSummary }) {
  const [useCase, setUseCase] = useState<UseCaseSlug>("general_use");
  const d = summary.distribution;
  const current = d.by_use_case[useCase];
  const data = [
    ...d.buckets.map((label, i) => ({ label, value: current.counts[i], slot: 0 as const })),
    { label: "Withheld", value: current.withheld, slot: 1 as const },
  ];
  return (
    <SummaryCard
      id="distribution"
      title="Score distribution"
      description={`Every active configuration · ${labelForUseCase(useCase)}`}
    >
      <UseCaseTabs value={useCase} onChange={setUseCase} />
      <div className="mt-3">
        <StatusBarChart data={data} height={300} caption={`Pick Score distribution, ${labelForUseCase(useCase)}`} />
      </div>
    </SummaryCard>
  );
}

// --- 4. Top 10 -------------------------------------------------------------------

export function TopCard({ summary }: { summary: PickScoreSummary }) {
  const [useCase, setUseCase] = useState<UseCaseSlug>("general_use");
  const rows = summary.top[useCase];
  const showGpu = useCase === "gaming" || useCase === "creative_work";
  return (
    <SummaryCard
      id="top"
      title={`Top 10 · ${labelForUseCase(useCase)}`}
      description="Exactly what visitors see: one laptop per family."
      link={{ href: "/", label: "Home page" }}
    >
      <UseCaseTabs value={useCase} onChange={setUseCase} />
      {rows.length === 0 ? (
        <p className="mt-3 text-sm">No scores yet. Recalculate to fill the ranking.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className={cn(TH, "w-8 text-left")}>#</th>
                <th scope="col" className={cn(TH, "text-left")}>Laptop</th>
                <th scope="col" className={cn(TH, "text-left")}>{showGpu ? "GPU" : "CPU"}</th>
                <th scope="col" className={cn(TH, "text-right")}>Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.laptop_id}>
                  <td className={cn(TD, "tabular-nums")}>{r.rank}</td>
                  <td className={TD}>
                    <span className="text-muted-foreground">{r.brand_name} · </span>
                    {r.product_name}
                  </td>
                  <td className={cn(TD, "text-muted-foreground")}>
                    {(showGpu ? r.gpu_model : r.processor_model) ?? "—"}
                    {showGpu && r.gpu_score_is_proxy && (
                      <span className="ml-1.5">
                        <ToneChip tone="neutral">proxy</ToneChip>
                      </span>
                    )}
                  </td>
                  <td className={cn(TD, "text-right font-semibold tabular-nums")}>{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SummaryCard>
  );
}

// --- 5. Weights -------------------------------------------------------------------

export function WeightsCard({ summary }: { summary: PickScoreSummary }) {
  const factors = Object.keys(summary.weights.general_use);
  return (
    <SummaryCard
      id="weights"
      title="Weights per use case"
      description="Read-only. The number is the weight on a 1–10 scale; the percentage is its real share of the score in general mode."
    >
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={cn(TH, "text-left")}>Factor</th>
              {USE_CASES.map((u) => (
                <th key={u.slug} scope="col" className={cn(TH, "text-right whitespace-nowrap")}>
                  {u.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {factors.map((f) => (
              <tr key={f}>
                <th scope="row" className={cn(TD, "text-left font-normal whitespace-nowrap")}>
                  {FACTOR_META[f]?.label ?? f}
                </th>
                {USE_CASES.map((u) => {
                  const w = summary.weights[u.slug][f];
                  return (
                    <td key={u.slug} className={cn(TD, "text-right tabular-nums whitespace-nowrap")}>
                      {w ? `${w.weight} · ${Math.round(w.share * 100)}%` : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SummaryCard>
  );
}
