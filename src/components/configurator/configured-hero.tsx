"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

import { PersonalPickScoreRing } from "@/components/personal-pick-score-ring";
import { PickScoreCard } from "@/components/pick-score-card";
import { Button } from "@/components/ui/button";
import { bestFit, type BenchmarksRefreshedAt, type UseCasePickScore } from "@/lib/api/pickscore";
import { cn } from "@/lib/utils";

import { useConfigurator, useConfiguredView } from "./configurator-context";

/** Original / Configured, plus Configure or Edit configuration. Nothing without options. */
export function ConfiguratorControls() {
  const { options, applied, view, setView, setEditorOpen } = useConfigurator();
  if (!options) return null;
  if (!applied) {
    return (
      <Button variant="soft" shape="pill" size="lg" className="self-start" onClick={() => setEditorOpen(true)}>
        <SlidersHorizontal data-icon="inline-start" />
        Configure
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Show" className="bg-surface-2 inline-flex rounded-full p-1">
        {(["original", "configured"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={view === v}
            onClick={() => setView(v)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition",
              view === v ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>
      <Button variant="ghost" shape="pill" size="sm" onClick={() => setEditorOpen(true)}>
        Edit configuration
      </Button>
      {/* 10d: the Education price toggle goes in this row, beside Original / Configured. */}
    </div>
  );
}

/** The hero price block: the server-rendered original, or the configured total. */
export function ConfiguredPrice({ original }: { original: ReactNode }) {
  const configured = useConfiguredView();
  if (!configured) return <>{original}</>;
  const parts = [configured.chip_label, ...configured.add_ons.map((a) => a.label ?? a.value)].filter(Boolean);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="bg-brand-tint text-brand-text self-start rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-wide uppercase">
        Your configuration
      </span>
      <span className="text-[26px] font-bold tracking-tight tabular-nums">
        RM {configured.total_rm.toLocaleString()}
      </span>
      <p className="text-xs text-muted-foreground">
        {parts.join(" · ")}. Apple&apos;s build-to-order price; a configuration, not a catalog laptop.
      </p>
    </div>
  );
}

/** The hero ring: personalized when it can be, for whichever view is on. */
export function ConfiguredRing({ laptopId, fallbackScore, os }: { laptopId: string; fallbackScore: number; os: string | null }) {
  const configured = useConfiguredView();
  if (!configured) {
    return <PersonalPickScoreRing laptopId={laptopId} fallbackScore={fallbackScore} size={64} caption="below" className="flex-none" />;
  }
  const best = bestFit(configured.scores ?? undefined, os);
  const personal = configured.personalized_score?.score;
  if (personal == null && !best) return null;
  return (
    <PersonalPickScoreRing
      laptopId={laptopId}
      fallbackScore={best?.score ?? 0}
      personalScore={personal ?? null}
      size={64}
      caption="below"
      className="flex-none"
    />
  );
}

/** The Pick Score tile: the stored scores, or the configured machine's live ones. */
export function ConfiguredPickScoreCard({
  laptopId,
  scores,
  benchmarksRefreshedAt,
  os,
}: {
  laptopId: string;
  scores: UseCasePickScore[];
  benchmarksRefreshedAt?: BenchmarksRefreshedAt;
  os: string | null;
}) {
  const configured = useConfiguredView();
  if (!configured) {
    return <PickScoreCard laptopId={laptopId} scores={scores} benchmarksRefreshedAt={benchmarksRefreshedAt} os={os} />;
  }
  if (!configured.scores) {
    return (
      <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
        <h2 className="text-base font-semibold tracking-tight">Pick Score by Use Case</h2>
        <p className="mt-2 text-sm text-muted-foreground">{configured.score_unavailable_reason}</p>
      </section>
    );
  }
  const p = configured.personalized_score;
  return (
    <PickScoreCard
      // A new key resets the tile's tab state when the configuration changes.
      key={`${configured.chip}-${configured.total_rm}`}
      laptopId={laptopId}
      scores={configured.scores.map((s) => ({ ...s, updated_at: "" }))}
      benchmarksRefreshedAt={benchmarksRefreshedAt}
      os={os}
      personal={p ? { use_case: "personal", score: p.score, breakdown: p.breakdown, flags: p.flags, updated_at: "" } : null}
      note="Live scores of your configuration against the catalog; a configuration has no catalog ranking."
    />
  );
}

/** Children only while the original laptop is shown (e.g. "Official price" notes). */
export function OriginalOnly({ children }: { children: ReactNode }) {
  return useConfiguredView() ? null : <>{children}</>;
}
