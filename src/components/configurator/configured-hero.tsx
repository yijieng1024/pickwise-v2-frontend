"use client";

import type { ReactNode } from "react";
import { ChevronRight, GraduationCap, SlidersHorizontal } from "lucide-react";

import { PersonalPickScoreRing } from "@/components/personal-pick-score-ring";
import { PickScoreCard } from "@/components/pick-score-card";
import type { EduPrice } from "@/lib/api/options";
import { bestFit, type BenchmarksRefreshedAt, type UseCasePickScore } from "@/lib/api/pickscore";
import { cn, formatDate } from "@/lib/utils";

import { useConfigurator, useConfiguredView, useEduView } from "./configurator-context";

/** The hero card's button shape (the marketplace buttons' h-10 pill and type), in a
 *  brand outline: plainly a button, still second to the solid Ask Pico. */
const CARD_BUTTON =
  "border-brand/40 bg-brand-tint text-brand-text hover:border-brand flex h-10 items-center justify-center gap-2 rounded-full border px-5 text-[13px] font-semibold whitespace-nowrap transition";

/** Who may buy at an education price, per store. Shown wherever one is. */
const EDU_STORES: Record<string, { eligibility: string; href: string; link: string }> = {
  apple_my_edu: {
    eligibility: "Education pricing for university students, educators and parents. Eligibility is checked by Apple.",
    href: "https://www.apple.com/my-edu/store",
    link: "Apple Education Store",
  },
};

function EduNote({ edu }: { edu: EduPrice }) {
  const store = EDU_STORES[edu.source];
  return (
    <p className="text-xs text-muted-foreground">
      <span className="block">Last checked: {formatDate(edu.checked_at)}</span>
      {store?.eligibility ?? "Education pricing. Eligibility is checked by the seller."}{" "}
      {(store?.href ?? edu.source_url) && (
        <a
          href={store?.href ?? edu.source_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-text font-medium underline underline-offset-2"
        >
          {store?.link ?? "Education store"}
        </a>
      )}
    </p>
  );
}

/** The Education price switch (10d). Only on a laptop that has one. */
function EduToggle() {
  const { edu, eduOn, setEduOn } = useConfigurator();
  if (!edu) return null;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={eduOn}
      onClick={() => setEduOn(!eduOn)}
      className="flex h-10 items-center gap-2.5 self-start rounded-full pr-1 text-[12.5px] font-semibold"
    >
      <GraduationCap className="size-4 text-muted-foreground" />
      Education price
      <span
        className={cn(
          "relative h-5 w-9 flex-none rounded-full transition-colors",
          eduOn ? "bg-brand" : "bg-muted-foreground/50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none",
            eduOn && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}

/** Original / Configured, Configure or Edit configuration, and the Education price
 *  switch. The first two need options; the switch needs an education price. */
export function ConfiguratorControls() {
  const { options, applied, view, setView, setEditorOpen } = useConfigurator();
  if (!options) return <EduToggle />;
  if (!applied) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setEditorOpen(true)} className={cn(CARD_BUTTON, "group w-full")}>
          <SlidersHorizontal className="size-4" />
          Customise memory, storage and chip
          <ChevronRight className="size-3.5 opacity-70 transition group-hover:translate-x-0.5" />
        </button>
        <EduToggle />
      </div>
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
      <button type="button" onClick={() => setEditorOpen(true)} className={cn(CARD_BUTTON, "flex-1 px-4")}>
        <SlidersHorizontal className="size-4" />
        Edit configuration
      </button>
      <EduToggle />
    </div>
  );
}

const PRICE_BADGE =
  "bg-brand-tint text-brand-text self-start rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-wide uppercase";

/** The hero price block: the server-rendered original, its education price, or the
 *  configured total (at whichever of the two prices is on). */
export function ConfiguredPrice({ original }: { original: ReactNode }) {
  const configured = useConfiguredView();
  const eduView = useEduView();
  const { edu, eduMissing } = useConfigurator();
  if (configured) {
    const parts = [configured.chip_label, ...configured.add_ons.map((a) => a.label ?? a.value)].filter(Boolean);
    return (
      <div className="flex flex-col gap-1.5">
        <span className={PRICE_BADGE}>Your configuration{configured.edu && " · Education price"}</span>
        <span className="text-[26px] font-bold tracking-tight tabular-nums">
          RM {configured.total_rm.toLocaleString()}
        </span>
        <p className="text-xs text-muted-foreground">
          {parts.join(" · ")}. Apple&apos;s build-to-order price; a configuration, not a catalog laptop.
        </p>
        {configured.edu && edu && <EduNote edu={edu} />}
        {eduMissing && !configured.edu && (
          <p className="text-xs text-muted-foreground">
            No education price is available for this configuration, so this is the official price.
          </p>
        )}
      </div>
    );
  }
  if (!eduView) return <>{original}</>;
  return (
    <div className="flex flex-col gap-1.5">
      <span className={PRICE_BADGE}>Education price</span>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[26px] font-bold tracking-tight tabular-nums">
          RM {eduView.price_rm.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          <span className="sr-only">Official price </span>
          <s>RM {eduView.official_price_rm.toLocaleString()}</s>
        </span>
        <span className="text-positive bg-positive/10 rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
          Save RM {eduView.saving_rm.toLocaleString()}
        </span>
      </div>
      <EduNote edu={eduView} />
    </div>
  );
}

/** The hero ring: personalized when it can be, for whichever view is on. */
export function ConfiguredRing({ laptopId, fallbackScore, os }: { laptopId: string; fallbackScore: number | null; os: string | null }) {
  const configured = useConfiguredView();
  const eduView = useEduView();
  // Scored live: a configuration, or the catalog laptop at its education price.
  const live = configured ?? eduView;
  if (!live) {
    if (fallbackScore == null) return null; // no stored scores yet: no ring, as before
    return <PersonalPickScoreRing laptopId={laptopId} fallbackScore={fallbackScore} size={64} caption="below" className="flex-none" />;
  }
  const best = bestFit(live.scores ?? undefined, os);
  const personal = live.personalized_score?.score;
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
  const eduView = useEduView();
  const live = configured ?? eduView;
  if (!live) {
    if (scores.length === 0) return null; // hidden until scores are generated
    return <PickScoreCard laptopId={laptopId} scores={scores} benchmarksRefreshedAt={benchmarksRefreshedAt} os={os} />;
  }
  if (!live.scores) {
    return (
      <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
        <h2 className="text-base font-semibold tracking-tight">Pick Score by Use Case</h2>
        <p className="mt-2 text-sm text-muted-foreground">{live.score_unavailable_reason}</p>
      </section>
    );
  }
  const p = live.personalized_score;
  return (
    <PickScoreCard
      // A new key resets the tile's tab state when the configuration or the price changes.
      key={configured ? `${configured.chip}-${configured.total_rm}` : `edu-${live.personalized_score?.score ?? ""}`}
      laptopId={laptopId}
      scores={live.scores.map((s) => ({ ...s, updated_at: "" }))}
      benchmarksRefreshedAt={benchmarksRefreshedAt}
      os={os}
      personal={p ? { use_case: "personal", score: p.score, breakdown: p.breakdown, flags: p.flags, updated_at: "" } : null}
      note={
        configured
          ? `Live scores of your configuration${configured.edu ? " at its education price" : ""} against the catalog; a configuration has no catalog ranking.`
          : "Live scores at the education price. Rankings and Pico use the official price."
      }
    />
  );
}

/** Children only while the original laptop is shown at its official price (e.g. the
 *  "Official price" note). */
export function OriginalOnly({ children }: { children: ReactNode }) {
  const configured = useConfiguredView();
  const eduView = useEduView();
  return configured || eduView ? null : <>{children}</>;
}
