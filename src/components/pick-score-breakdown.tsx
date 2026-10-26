import {
  BadgeCheck,
  Battery,
  Cpu,
  Feather,
  HardDrive,
  Monitor,
  TriangleAlert,
  Wallet,
  Zap,
} from "lucide-react";

import type { PickScoreFactor } from "@/lib/api/pickscore";
import { cn } from "@/lib/utils";

export const FACTOR_META: Record<string, { label: string; icon: typeof Cpu }> = {
  price: { label: "Price", icon: Wallet },
  cpu: { label: "CPU", icon: Cpu },
  gpu: { label: "GPU", icon: Zap },
  ram_storage: { label: "RAM & Storage", icon: HardDrive },
  portability: { label: "Portability", icon: Feather },
  battery: { label: "Battery", icon: Battery },
  screen_size: { label: "Screen size", icon: Monitor },
  brand: { label: "Brand", icon: BadgeCheck },
};

/** The flag that marks a factor's 50 as fabricated rather than measured. */
const UNVERIFIED_FLAG: Record<string, string> = {
  cpu: "cpu_benchmark_unresolved",
  gpu: "gpu_benchmark_unresolved",
  price: "price_unavailable",
};

type Mode = "general" | "personalized";
type State = "measured" | "unverified" | "not_scored";

function stateOf(f: PickScoreFactor, flags: Record<string, unknown>, mode: Mode): State {
  if (flags[UNVERIFIED_FLAG[f.factor]]) return "unverified";
  if (mode === "general" && (f.factor === "brand" || f.factor === "screen_size")) {
    return "not_scored";
  }
  return "measured";
}

/**
 * One plain-language line per factor. The six measured factors are percentile
 * ranks against the catalogue (ADR-0011), so "faster than 62%" is literally
 * what the number means. Unverified and not-scored factors get no line: the
 * backend's note says why, and a line would restate a fabricated 50.
 */
function reason(f: PickScoreFactor, mode: Mode): string | null {
  const pct = Math.round(f.raw_score);
  // A note on these means no preference was stated; the note is the line.
  if ((f.factor === "brand" || f.factor === "screen_size") && f.note) return null;
  switch (f.factor) {
    case "price":
      return mode === "personalized"
        ? `Cheaper than ${pct}% of the catalogue, lowered if it's over your budget`
        : `Cheaper than ${pct}% of laptops in the catalogue`;
    case "cpu":
      return `Faster CPU than ${pct}% of laptops in the catalogue`;
    case "gpu":
      return `Faster graphics than ${pct}% of laptops in the catalogue`;
    case "ram_storage":
      // 60% RAM rank + 40% storage rank, so only approximately a percentile.
      return `More memory and storage than about ${pct}% of the catalogue`;
    case "portability":
      return `Lighter than ${pct}% of laptops in the catalogue`;
    case "battery":
      return `Bigger battery than ${pct}% of laptops in the catalogue`;
    case "screen_size":
      return f.raw_score >= 100 ? "Matches your preferred screen size" : "Off your preferred screen size";
    case "brand":
      return f.raw_score >= 100 ? "One of your preferred brands" : "Not one of your preferred brands";
    default:
      return null;
  }
}

/**
 * The 8-factor PickScore breakdown, shared by the details page card and the
 * card popovers. Every factor shows its 0-100 score, its weight, why it
 * scored that, and the backend's note; a fabricated 50 is marked unverified,
 * general mode's fixed brand / screen-size 50s are marked not scored, and a
 * withheld score says so instead of showing a number.
 */
export function PickScoreBreakdown({
  breakdown,
  flags,
  mode,
  compact = false,
}: {
  breakdown: PickScoreFactor[];
  flags: Record<string, unknown>;
  mode: Mode;
  compact?: boolean;
}) {
  const factors = [...breakdown].sort((a, b) => b.contribution - a.contribution);

  return (
    <div className={cn("flex min-w-0 flex-col", compact ? "gap-2.5" : "gap-3.5")}>
      {Boolean(flags.score_withheld) && (
        <p className="bg-surface-2 flex items-start gap-2 rounded-xl px-3 py-2 text-[12px] leading-snug">
          <TriangleAlert className="mt-0.5 size-3.5 flex-none text-muted-foreground" />
          No Pick Score: we couldn&apos;t identify this laptop&apos;s CPU or GPU,
          so too much of the score would be guesswork. The factors that could
          be measured are below.
        </p>
      )}
      {factors.map((f, i) => {
        const meta = FACTOR_META[f.factor];
        const Icon = meta?.icon ?? Cpu;
        const state = stateOf(f, flags, mode);
        const line = state === "measured" ? reason(f, mode) : null;
        return (
          <div
            key={f.factor}
            className="flex flex-col gap-1 motion-safe:animate-fade-in-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex flex-none items-center gap-2 font-medium",
                  compact ? "w-28 text-[11.5px]" : "w-36 text-[12px]",
                )}
              >
                <Icon className="text-brand size-3.5 flex-none" />
                <span className="truncate">{meta?.label ?? f.factor}</span>
              </span>
              <div className="bg-surface-2 h-2 min-w-0 flex-1 overflow-hidden rounded-full">
                {state === "measured" ? (
                  <div
                    className={cn("h-full rounded-full", i === 0 ? "bg-brand" : "bg-brand/70")}
                    style={{ width: `${Math.max(2, Math.min(100, f.raw_score))}%` }}
                  />
                ) : (
                  // Hatched, not a bar: the 50 is a placeholder, not a length.
                  <div className="h-full w-1/2 rounded-full bg-[repeating-linear-gradient(135deg,var(--muted-foreground)_0_2px,transparent_2px_6px)] opacity-40" />
                )}
              </div>
              <span className="flex w-20 flex-none flex-col items-end leading-tight">
                {state === "measured" ? (
                  <span className="text-[12px] font-semibold tabular-nums">
                    {Math.round(f.raw_score)}
                    <span className="font-normal text-muted-foreground">/100</span>
                  </span>
                ) : (
                  <span className="bg-surface-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                    {state === "unverified" ? "Unverified" : "Not scored"}
                  </span>
                )}
                <span className="text-[10.5px] text-muted-foreground tabular-nums">
                  {Math.round(f.weight * 100)}% weight
                </span>
              </span>
            </div>
            {(line || f.note) && (
              <p
                className={cn(
                  "text-[11px] leading-snug text-muted-foreground",
                  compact ? "pl-[1.375rem]" : "pl-[1.375rem] sm:pl-[9.75rem]",
                )}
              >
                {line}
                {line && f.note && ". "}
                {f.note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
