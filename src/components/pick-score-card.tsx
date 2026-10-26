"use client";

import { useEffect, useState } from "react";
import { Info, Sparkles, UserRound } from "lucide-react";

import { FACTOR_META, PickScoreBreakdown } from "@/components/pick-score-breakdown";
import { PickScoreRing } from "@/components/pick-score-ring";
import { Progress } from "@/components/ui/progress";
import {
  type UseCasePickScore,
  USE_CASES,
  bestFit,
  calculatePersonalScore,
  isMacOS,
  labelForUseCase,
} from "@/lib/api/pickscore";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/** Sentinel slug for the personalized tab — never collides with backend use cases. */
const PERSONAL = "personal";

/**
 * Details-page bento tile: the laptop's precomputed general-mode PickScore
 * per use case, with the full deterministic 8-factor breakdown. Data comes
 * from GET /laptops/{id}/pick-scores — no LLM, no user context.
 *
 * Signed-in users who completed the Needs Wizard additionally get a
 * "For you" tab: a live POST /laptops/calculate-score with their own
 * factor weights, budget ceiling, and brand/screen preferences. It's
 * auto-selected once loaded so the wizard visibly changes the product.
 * Otherwise it opens on the best-fit tab, the same one the hero ring shows.
 */
export function PickScoreCard({
  laptopId,
  scores,
  os,
}: {
  laptopId: string;
  scores: UseCasePickScore[];
  /** The laptop's OS: a macOS laptop is never a Gaming best fit. */
  os: string | null;
}) {
  const { user, token, hasPreferences } = useAuth();
  // Keep the backend's known display order; unknown slugs go last.
  const order = USE_CASES.map((u) => u.slug as string);
  const ordered = [...scores].sort((a, b) => {
    const ia = order.indexOf(a.use_case);
    const ib = order.indexOf(b.use_case);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const generalBest = bestFit(ordered, os);
  const initialTab = generalBest?.use_case ?? ordered[0]?.use_case ?? "";
  const [selected, setSelected] = useState(initialTab);
  const [personal, setPersonal] = useState<UseCasePickScore | null>(null);
  const [personalFailed, setPersonalFailed] = useState(false);

  // Drop the personal tab on sign-out (state-adjust-during-render — the
  // set-state-in-effect lint forbids the effect version).
  const [prevUser, setPrevUser] = useState(user);
  if (prevUser !== user) {
    setPrevUser(user);
    if (!user) {
      setPersonal(null);
      if (selected === PERSONAL) setSelected(initialTab);
    }
  }

  useEffect(() => {
    if (!user || !token || hasPreferences !== true) return;
    let cancelled = false;
    calculatePersonalScore(laptopId, user.id, token)
      .then((res) => {
        // "general" would mean no preference row after all — no tab then.
        if (cancelled || res.mode !== "personalized") return;
        setPersonal({
          use_case: PERSONAL,
          score: res.score,
          breakdown: res.breakdown,
          flags: res.flags,
          updated_at: "",
        });
        setSelected(PERSONAL);
      })
      .catch(() => {
        // Best-effort — the general tabs are always there.
        if (!cancelled) setPersonalFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, token, hasPreferences, laptopId]);

  // Derived, not effect-set: the personal fetch is in flight while the
  // conditions to run it hold and it has neither resolved nor failed.
  const calculating = Boolean(
    user && token && hasPreferences === true && !personal && !personalFailed,
  );

  const tabs = personal ? [...ordered, personal] : ordered;
  const current = tabs.find((s) => s.use_case === selected) ?? ordered[0];

  if (!current) return null;

  const tabLabel = (slug: string) =>
    slug === PERSONAL ? "For you" : labelForUseCase(slug);
  const isPersonal = current.use_case === PERSONAL;

  const topFactors = [...current.breakdown]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((f) => FACTOR_META[f.factor]?.label ?? f.factor);
  // "Best fit: For you" when the user's own weighting beats every generic
  // use-case profile; otherwise the macOS-aware general best fit.
  const best =
    personal?.score != null && personal.score > (generalBest?.score ?? -1)
      ? { use_case: PERSONAL, score: personal.score }
      : generalBest;
  const macGaming = current.use_case === "gaming" && isMacOS(os);

  return (
    <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">
          Pick Score by Use Case
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Deterministic: real benchmarks, no AI opinion
        </span>
      </div>
      <p className="mb-5 text-[12.5px] text-muted-foreground">
        How this laptop scores when the weighting matches what you&apos;ll use
        it for.
      </p>

      {/* Screen-reader summary of the selected breakdown */}
      <p className="sr-only" aria-live="polite">
        {current.score === null
          ? `No Pick Score for ${tabLabel(current.use_case)}.`
          : `Pick Score ${current.score} out of 100 for ${tabLabel(current.use_case)}.`}
        Top contributing factors: {topFactors.join(", ")}.
      </p>

      {/* Use-case segmented control (+ "For you" when preferences exist) */}
      <div className="bg-surface-2 mb-7 inline-flex flex-wrap gap-1 rounded-2xl p-1">
        {tabs.map((s) => {
          const active = s.use_case === current.use_case;
          return (
            <button
              key={s.use_case}
              type="button"
              onClick={() => setSelected(s.use_case)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                active
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              {s.use_case === PERSONAL && (
                <UserRound className="size-3 flex-none" />
              )}
              {tabLabel(s.use_case)}
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10.5px] tabular-nums",
                  active
                    ? "bg-white/20"
                    : "bg-surface text-muted-foreground",
                )}
              >
                {s.score ?? "–"}
              </span>
            </button>
          );
        })}
        {/* Placeholder while the personalized score is being computed */}
        {calculating && (
          <span className="text-muted-foreground flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold">
            <UserRound className="size-3 flex-none" />
            For you
            <Progress
              value={null}
              aria-label="Calculating your personal Pick Score"
              className="w-10 gap-0 [&_[data-slot=progress-indicator]]:w-1/2 motion-safe:[&_[data-slot=progress-indicator]]:animate-progress-slide"
            />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        {/* Hero: ring + best-fit insight */}
        <div className="flex flex-none flex-col items-center gap-3 sm:w-40 sm:pt-1">
          {current.score === null ? (
            <span className="border-line flex size-[124px] items-center justify-center rounded-full border-2 border-dashed text-center text-[11.5px] font-semibold text-muted-foreground">
              No score
            </span>
          ) : (
            <PickScoreRing score={current.score} size={124} caption="inside" />
          )}
          <span className="text-[11.5px] font-medium text-muted-foreground">
            {tabLabel(current.use_case)}
          </span>
          {best && (
            <span className="bg-brand-tint text-brand-text flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold">
              <Sparkles className="size-3" />
              Best fit: {tabLabel(best.use_case)} · {best.score}
            </span>
          )}
        </div>

        {/* 8-factor breakdown — bars restagger on each tab switch */}
        <div key={current.use_case} className="flex min-w-0 flex-1 flex-col gap-3">
          {macGaming && (
            <p className="bg-surface-2 flex items-start gap-2 rounded-xl px-3 py-2 text-[12px] leading-snug">
              <Info className="mt-0.5 size-3.5 flex-none text-muted-foreground" />
              This score reflects the hardware only. Many games don&apos;t run
              on macOS, so check that yours do before buying for gaming.
            </p>
          )}
          <PickScoreBreakdown
            breakdown={current.breakdown}
            flags={current.flags}
            mode={isPersonal ? "personalized" : "general"}
          />
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
            {isPersonal
              ? "Each factor is scored 0-100 against the PickWise catalogue; the weights come from your Needs Wizard answers, and price scores against your own budget. Sorted by contribution."
              : "Each factor is scored 0-100 against the PickWise catalogue; the weight is how much it counts toward this use case. Sorted by contribution."}
          </p>
        </div>
      </div>
    </section>
  );
}
