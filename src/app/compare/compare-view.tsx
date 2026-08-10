"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Monitor,
  Plug,
  Plus,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { CompareRadar } from "@/components/charts/compare-radar";
import { GlassSurface } from "@/components/glass-surface";
import { PickScoreRing } from "@/components/pick-score-ring";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { calculatePersonalScoreBatch, labelForUseCase } from "@/lib/api/pickscore";
import { useAuth } from "@/lib/auth-context";
import {
  type CompareLead,
  type CompareRow,
  type CompareSection,
  type ScoreSnapshot,
  type ScoredLaptop,
  FACTOR_AXES,
  MAX_COMPARE,
  bestOverall,
  buildFactorRows,
  buildLeads,
  compareHref,
  factorSeries,
} from "@/lib/compare";
import { cn } from "@/lib/utils";

const SECTION_ICONS = {
  performance: Cpu,
  display: Monitor,
  power: Plug,
  io: Plug,
} as const;

export interface CompareColumn {
  id: string;
  name: string;
  brand: string;
  price: string;
  image: string | null;
  color: string;
  removeIds: string[];
}

/**
 * Swaps the server's best-fit snapshots for the signed-in user's personalized
 * ones, matching the details page: a saved Needs Wizard profile means the
 * PickScore you see is yours, and without one it's the laptop's best-fit use
 * case. The batch endpoint returns full breakdowns, so the radar, the factor
 * rows and the summary all move with the ring rather than disagreeing with it.
 */
function usePersonalScores(ids: string[]): Record<string, ScoreSnapshot> | null {
  const { user, token, hasPreferences } = useAuth();
  const [personal, setPersonal] = useState<Record<string, ScoreSnapshot> | null>(null);
  const key = ids.join(",");

  // Drop a stale overlay the moment the inputs change — signing out, losing
  // preferences, or a different set of laptops. "Adjust state during render",
  // since the set-state-in-effect lint forbids the effect version.
  const guard = `${user?.id ?? ""}|${hasPreferences}|${key}`;
  const [prevGuard, setPrevGuard] = useState(guard);
  if (guard !== prevGuard) {
    setPrevGuard(guard);
    setPersonal(null);
  }

  useEffect(() => {
    if (!user || !token || hasPreferences !== true) return;
    let cancelled = false;
    calculatePersonalScoreBatch(key.split(","), user.id, token)
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, ScoreSnapshot> = {};
        for (const result of res.results) {
          // Only when the backend confirms it actually personalized — a
          // "general" result here means no preference row was found.
          if (result.mode === "personalized") {
            map[result.product_id] = {
              score: result.score,
              breakdown: result.breakdown,
              label: null,
            };
          }
        }
        setPersonal(Object.keys(map).length > 0 ? map : null);
      })
      .catch(() => {
        // Best-effort: the best-fit scores stay. Personalization is an overlay.
      });
    return () => {
      cancelled = true;
    };
  }, [user, token, hasPreferences, key]);

  return personal;
}

/** Width each laptop column needs before its spec values start wrapping badly. */
const COLUMN_MIN = 190;
const LABEL_MIN = 170;

export function CompareView({
  columns,
  sections,
  scored,
}: {
  columns: CompareColumn[];
  sections: CompareSection[];
  scored: ScoredLaptop[];
}) {
  const [techOpen, setTechOpen] = useState(false);
  const visibleSections = sections.filter((s) => !s.tech || techOpen);

  const personal = usePersonalScores(columns.map((c) => c.id));
  const personalized = personal !== null;

  // One derivation for both modes: the overlay replaces the snapshots and
  // everything downstream — rings, radar, factor rows, who leads what — is
  // recomputed from the same numbers.
  const { effective, factorRows, series, leads, bestName } = useMemo(() => {
    const list = personal
      ? scored.map((l) => ({ ...l, score: personal[l.id] ?? l.score }))
      : scored;
    return {
      effective: list,
      factorRows: buildFactorRows(list),
      series: list.map((laptop, i) => ({
        name: laptop.name,
        color: columns[i].color,
        values: factorSeries(laptop),
      })),
      leads: buildLeads(list),
      bestName: bestOverall(list)?.name ?? null,
    };
  }, [scored, personal, columns]);

  const hasScores = effective.some((laptop) => laptop.score !== null);

  // The matrix is one grid: a label column plus one per laptop. Below `lg` it
  // scrolls sideways inside its own container rather than stretching the page.
  // The overflow is deliberately gated at `max-lg` — an always-on scroll
  // container would also capture the sticky header, which positions against
  // its nearest scrolling ancestor and would stop following the page.
  const gridStyle = {
    gridTemplateColumns: `minmax(${LABEL_MIN}px, 220px) repeat(${columns.length}, minmax(0, 1fr))`,
  };
  const trackStyle = { minWidth: LABEL_MIN + columns.length * COLUMN_MIN };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-24 sm:px-6">
      <Link
        href="/laptops"
        className="text-brand mb-8 flex items-center gap-2 font-medium hover:underline"
      >
        <ChevronLeft className="size-4" /> Back to Browse
      </Link>

      <h1 className="mb-1.5 text-4xl font-bold tracking-tight">Compare</h1>
      <p className="mb-10 text-sm text-muted-foreground">
        <span className="tabular-nums">{columns.length}</span>{" "}
        {columns.length === 1 ? "laptop" : "laptops"} selected
        {columns.length > 1 ? " · the best value in each row is marked" : ""}
      </p>

      {hasScores && (
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-[380px_1fr]">
          <div className="border-line bg-surface flex flex-col items-center gap-3 rounded-3xl border p-6">
            <CompareRadar series={series} axes={FACTOR_AXES} height={280} />
            {/* Direct labels, not a colour key alone — the palette's green sits
                under 3:1 on the light surface and is only legal with them.
                Stacked rather than wrapped: product names run long enough that
                a centred wrap leaves swatches on ragged left edges. */}
            <ul className="flex w-full flex-col gap-1.5 text-xs text-muted-foreground">
              {series.map((s) => (
                <li key={s.name} className="flex items-start gap-2">
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-[3px]"
                    style={{ background: s.color }}
                  />
                  <span className="leading-snug">{s.name}</span>
                </li>
              ))}
            </ul>
          </div>

          <TradeoffPanel
            leads={leads}
            bestName={bestName}
            single={columns.length === 1}
            personalized={personalized}
          />
        </div>
      )}

      <div className="max-lg:overflow-x-auto max-lg:pb-3">
        <div style={trackStyle} className="lg:min-w-0">
          {/* Sticky from `lg` up, where the track is no longer inside a scroll
              container and the header can follow the page. */}
          <div className="mb-2 lg:sticky lg:top-20 lg:z-40">
            <GlassSurface cornerRadius={16} fullWidth className="grid gap-2 p-3" style={gridStyle}>
              <div className="flex items-center pl-2 text-xs font-semibold text-muted-foreground">
                Specification
              </div>
              {columns.map((column) => (
                <div key={column.id} className="flex items-start gap-2.5 px-2 py-1">
                  {column.image ? (
                    <Image
                      src={column.image}
                      alt={column.name}
                      width={52}
                      height={38}
                      className="h-9.5 w-13 flex-none rounded-lg bg-white object-contain mix-blend-multiply dark:mix-blend-normal"
                    />
                  ) : (
                    <span className="bg-surface-2 h-9.5 w-13 flex-none rounded-lg" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/laptops/${column.id}`}
                      className="line-clamp-2 text-[13px] font-semibold hover:underline"
                    >
                      {column.name}
                    </Link>
                    <div className="text-[12px] font-semibold text-muted-foreground tabular-nums">
                      {column.price}
                    </div>
                  </div>
                  {columns.length > 1 && (
                    <Link
                      href={compareHref(column.removeIds)}
                      aria-label={`Remove ${column.name} from the comparison`}
                      className="text-muted-foreground hover:text-foreground -mr-1 rounded-full p-1"
                    >
                      <X className="size-3.5" />
                    </Link>
                  )}
                </div>
              ))}
            </GlassSurface>
          </div>

          {hasScores && (
            <div
              style={gridStyle}
              className="bg-brand-tint mb-7 grid items-center gap-2 rounded-2xl p-3"
            >
                <div className="pl-2">
                  <div className="text-brand flex items-center gap-1.5 text-[13px] font-semibold">
                    PickScore
                    {personalized && (
                      <span className="bg-brand flex size-3.5 items-center justify-center rounded-full text-white">
                        <UserRound className="size-2" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {personalized
                      ? "Weighted to your wizard answers"
                      : "Each laptop's best-fit use case"}
                  </div>
                </div>
                {effective.map((laptop) => (
                  <div key={laptop.id} className="flex items-center gap-2.5 px-2">
                    {laptop.score === null ? (
                      <span className="text-[13px] text-muted-foreground">Not scored yet</span>
                    ) : (
                      <>
                        <PickScoreRing score={laptop.score.score} size={40} caption="none" />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          {/* Which use case earned the score — two laptops can
                              both show 78 for entirely different strengths. */}
                          {laptop.score.label && (
                            <span className="text-[11px] text-muted-foreground">
                              {labelForUseCase(laptop.score.label)}
                            </span>
                          )}
                          {laptop.name === bestName && <BestMarker />}
                        </div>
                      </>
                    )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-9">
            {visibleSections.map((section) => (
              <RowGroup
                key={section.key}
                title={section.title}
                icon={SECTION_ICONS[section.key]}
                rows={section.rows}
                gridStyle={gridStyle}
              />
            ))}

            {/* Last, and closed by default: the rings above and the radar
                already carry the verdict, so the per-factor working is here
                for the reader who wants to audit it rather than in the way of
                the spec rows most people came to read. */}
            {hasScores && (
              <RowGroup
                title="PickScore Factors"
                icon={Sparkles}
                rows={factorRows}
                gridStyle={gridStyle}
                collapsible
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        {/* Keeps its own colours: a quiet disclosure toggle, not a call to
            action, so it stays transparent and borrows the brand only on hover
            rather than taking `outline`'s filled hover state. */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          shape="pill"
          onClick={() => setTechOpen((o) => !o)}
          className="border-line bg-transparent text-muted-foreground hover:border-brand hover:bg-transparent hover:text-brand dark:bg-transparent dark:hover:bg-transparent"
        >
          <ChevronRight
            data-icon="inline-start"
            className={cn("transition-transform", techOpen && "rotate-90")}
          />
          {techOpen ? "Hide technical rows" : "Show technical rows (for the tech-savvy)"}
        </Button>

        {columns.length < MAX_COMPARE && (
          <Button
            variant="soft"
            size="lg"
            shape="pill"
            render={<Link href="/laptops" />}
            nativeButton={false}
          >
            <Plus data-icon="inline-start" />
            Add another laptop
          </Button>
        )}
      </div>
    </main>
  );
}

/**
 * The winner marker. Colour is never the only cue (WCAG 1.4.1): the tinted
 * cell also carries this label, so the best value is readable in greyscale, to
 * a red-green colour-blind reader, and to a screen reader.
 */
function BestMarker() {
  return (
    <span className="text-positive inline-flex items-center gap-1 text-[10.5px] font-bold tracking-wide uppercase">
      <Check className="size-3" aria-hidden />
      Best
    </span>
  );
}

function MatrixCell({ cell, isWinner }: { cell: CompareRow["cells"][number]; isWinner: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-xl px-4 py-3",
        isWinner && "bg-positive/[0.08] shadow-[inset_0_0_0_1px_var(--positive)]",
      )}
    >
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-medium tabular-nums">
        {cell.text}
        {isWinner && <BestMarker />}
      </span>
      {cell.sub && <span className="text-[11.5px] text-muted-foreground">{cell.sub}</span>}
    </div>
  );
}

function RowGroup({
  title,
  icon: Icon,
  rows,
  gridStyle,
  collapsible = false,
}: {
  title: string;
  icon: typeof Cpu;
  rows: CompareRow[];
  gridStyle: React.CSSProperties;
  /** Renders the heading as a disclosure, closed until the reader opens it. */
  collapsible?: boolean;
}) {
  const heading = (
    <>
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[11.5px] font-bold tracking-wide text-muted-foreground uppercase">
        {title}
      </span>
    </>
  );

  const body = (
    <div className="flex flex-col gap-0.5">
      {rows.map((row) => (
        <div
          key={row.label}
          style={gridStyle}
          className="border-line grid items-center gap-2 border-b py-1"
        >
          <div className="py-3 pr-4 pl-2">
            <div className="text-[13.5px] font-medium">{row.label}</div>
            <div className="text-[11.5px] text-muted-foreground">{row.sub}</div>
          </div>
          {row.cells.map((cell, i) => (
            <MatrixCell key={i} cell={cell} isWinner={row.winners.includes(i)} />
          ))}
        </div>
      ))}
    </div>
  );

  if (!collapsible) {
    return (
      <section>
        <div className="mb-3.5 flex items-center gap-2 pl-2">{heading}</div>
        {body}
      </section>
    );
  }

  return (
    <section>
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="group focus-visible:ring-ring/50 mb-3.5 flex w-full cursor-pointer items-center gap-2 rounded-lg pl-2 text-left focus-visible:ring-3 focus-visible:outline-none">
          {heading}
          <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden motion-safe:data-closed:animate-collapsible-up motion-safe:data-open:animate-collapsible-down">
          <div className="h-(--collapsible-panel-height) data-ending-style:h-0 data-starting-style:h-0">
            {body}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

/**
 * The trade-off summary, derived from the factor scores rather than written by
 * a model: each laptop is credited with the factors it beats every other
 * column on, widest gap first. Nothing is claimed that the numbers in the table
 * below don't already show.
 */
function TradeoffPanel({
  leads,
  bestName,
  single,
  personalized,
}: {
  leads: CompareLead[];
  bestName: string | null;
  single: boolean;
  personalized: boolean;
}) {
  return (
    <div className="bg-surface-2 flex flex-col gap-3.5 rounded-3xl px-8 py-7">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        The trade-off, in short
      </span>

      {single ? (
        <p className="text-[15px] leading-relaxed">
          Only one laptop is selected, so there is nothing to weigh it against yet. Add a second
          and this panel will show where each one pulls ahead.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {leads.map((lead) => (
              <li key={lead.id} className="text-[15px] leading-relaxed">
                <strong>{lead.name}</strong>{" "}
                {lead.leads.length > 0 ? (
                  <>
                    leads on{" "}
                    {lead.leads.map((factor, i) => (
                      <span key={factor}>
                        {i > 0 && " and "}
                        <span className="font-medium">{factor.toLowerCase()}</span>
                      </span>
                    ))}
                    .
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    doesn&apos;t come top on any single factor.
                  </span>
                )}
              </li>
            ))}
          </ul>
          <span className="text-[11.5px] text-muted-foreground">
            {bestName
              ? `Weighted across all eight factors, ${bestName} takes the highest PickScore.`
              : "The overall PickScores are level. The choice comes down to which factors above matter to you."}
            {personalized
              ? " Scores are weighted to your Needs Wizard answers."
              : " Sign in and finish the Needs Wizard to weight these to your own priorities."}
          </span>
        </>
      )}
    </div>
  );
}
