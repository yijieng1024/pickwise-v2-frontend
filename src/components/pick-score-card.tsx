"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Battery,
  Cpu,
  Feather,
  HardDrive,
  Monitor,
  Sparkles,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";

import { PickScoreRing } from "@/components/pick-score-ring";
import { Progress } from "@/components/ui/progress";
import {
  type UseCasePickScore,
  USE_CASES,
  calculatePersonalScore,
  labelForUseCase,
} from "@/lib/api/pickscore";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const factorMeta: Record<string, { label: string; icon: typeof Cpu }> = {
  price: { label: "Price", icon: Wallet },
  cpu: { label: "CPU", icon: Cpu },
  gpu: { label: "GPU", icon: Zap },
  ram_storage: { label: "RAM & Storage", icon: HardDrive },
  portability: { label: "Portability", icon: Feather },
  battery: { label: "Battery", icon: Battery },
  screen_size: { label: "Screen size", icon: Monitor },
  brand: { label: "Brand", icon: BadgeCheck },
};

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
 */
export function PickScoreCard({
  laptopId,
  scores,
}: {
  laptopId: string;
  scores: UseCasePickScore[];
}) {
  const { user, token, hasPreferences } = useAuth();
  // Keep the backend's known display order; unknown slugs go last.
  const order = USE_CASES.map((u) => u.slug as string);
  const ordered = [...scores].sort((a, b) => {
    const ia = order.indexOf(a.use_case);
    const ib = order.indexOf(b.use_case);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const [selected, setSelected] = useState(ordered[0]?.use_case ?? "");
  const [personal, setPersonal] = useState<UseCasePickScore | null>(null);
  const [personalFailed, setPersonalFailed] = useState(false);

  // Drop the personal tab on sign-out (state-adjust-during-render — the
  // set-state-in-effect lint forbids the effect version).
  const [prevUser, setPrevUser] = useState(user);
  if (prevUser !== user) {
    setPrevUser(user);
    if (!user) {
      setPersonal(null);
      if (selected === PERSONAL) setSelected(ordered[0]?.use_case ?? "");
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

  const factors = [...current.breakdown].sort(
    (a, b) => b.contribution - a.contribution,
  );
  const gpuProxied = Boolean(current.flags?.gpu_score_is_proxy);
  // Includes the personal score when present — "Best fit: For you" means the
  // user's own weighting beats every generic use-case profile.
  const best = [...tabs].sort((a, b) => b.score - a.score)[0];
  const topFactors = factors.slice(0, 3).map(
    (f) => factorMeta[f.factor]?.label ?? f.factor,
  );

  return (
    <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">
          PickScore by use case
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Deterministic — real benchmarks, no AI opinion
        </span>
      </div>
      <p className="mb-5 text-[12.5px] text-muted-foreground">
        How this laptop scores when the weighting matches what you&apos;ll use
        it for.
      </p>

      {/* Screen-reader summary of the selected breakdown */}
      <p className="sr-only" aria-live="polite">
        PickScore {current.score} out of 100 for {tabLabel(current.use_case)}.
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
                <UserRound className="h-3 w-3 flex-none" />
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
                {s.score}
              </span>
            </button>
          );
        })}
        {/* Placeholder while the personalized score is being computed */}
        {calculating && (
          <span className="text-muted-foreground flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold">
            <UserRound className="h-3 w-3 flex-none" />
            For you
            <Progress
              value={null}
              aria-label="Calculating your personal PickScore"
              className="w-10 gap-0 [&_[data-slot=progress-indicator]]:w-1/2 motion-safe:[&_[data-slot=progress-indicator]]:animate-progress-slide"
            />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        {/* Hero: ring + best-fit insight */}
        <div className="flex flex-none flex-col items-center gap-3 sm:w-40 sm:pt-1">
          <PickScoreRing score={current.score} size={124} caption="inside" />
          <span className="text-[11.5px] font-medium text-muted-foreground">
            {tabLabel(current.use_case)}
          </span>
          {best && (
            <span className="bg-brand-tint text-brand flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold">
              <Sparkles className="h-3 w-3" />
              Best fit: {tabLabel(best.use_case)} · {best.score}
            </span>
          )}
        </div>

        {/* 8-factor breakdown — bars restagger on each tab switch */}
        <div key={current.use_case} className="flex min-w-0 flex-1 flex-col gap-3">
          {factors.map((f, i) => {
            const meta = factorMeta[f.factor];
            const Icon = meta?.icon ?? Cpu;
            return (
              <div
                key={f.factor}
                className="flex items-center gap-3 motion-safe:animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="flex w-36 flex-none items-center gap-2 text-[12px] font-medium">
                  <Icon className="text-brand h-3.5 w-3.5 flex-none" />
                  <span className="truncate">
                    {meta?.label ?? f.factor}
                    {f.factor === "gpu" && gpuProxied && (
                      <span className="text-muted-foreground"> *</span>
                    )}
                  </span>
                  {i === 0 && (
                    <span className="bg-brand-tint text-brand hidden rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide uppercase lg:inline">
                      Top driver
                    </span>
                  )}
                </span>
                <div className="bg-surface-2 h-2.5 min-w-0 flex-1 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      i === 0 ? "bg-brand" : "bg-brand/70",
                    )}
                    style={{ width: `${Math.max(2, Math.min(100, f.raw_score))}%` }}
                  />
                </div>
                <span className="flex w-24 flex-none flex-col items-end leading-tight">
                  <span className="text-[12.5px] font-semibold tabular-nums">
                    {Math.round(f.raw_score)}
                    <span className="text-muted-foreground font-normal">/100</span>
                  </span>
                  <span className="text-[10.5px] text-muted-foreground tabular-nums">
                    {Math.round(f.weight * 100)}% weight
                  </span>
                </span>
              </div>
            );
          })}
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
            {isPersonal
              ? "Bars show each factor's 0–100 score; the weights come from your Needs Wizard answers, and price scores against your own budget. Sorted by contribution."
              : "Bars show each factor's 0–100 score; the weight is how much it counts toward this use case. Sorted by contribution."}
            {gpuProxied &&
              " * Apple silicon has no separate GPU benchmark — GPU is scored via the CPU as a proxy."}
          </p>
        </div>
      </div>
    </section>
  );
}
