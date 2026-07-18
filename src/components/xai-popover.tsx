"use client";

import { GlassSurface } from "@/components/glass-surface";
import { PickScoreRing } from "@/components/pick-score-ring";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { XaiFactor } from "@/lib/laptops";

interface XaiPopoverProps {
  score: number;
  match: string;
  factors: XaiFactor[];
  ringSize?: number;
}

/** Bar-width scale — the largest single factor contribution in the mock data is ~32. */
const MAX_ABS_VALUE = 32;

export function XaiPopover({ score, match, factors, ringSize = 48 }: XaiPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="PickScore breakdown"
        // The trigger lives inside cards whose whole surface is a link —
        // keep the click from reaching it.
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="flex cursor-pointer flex-col items-center gap-1 border-none bg-transparent p-0"
      >
        <PickScoreRing score={score} size={ringSize} caption="below" />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[280px] bg-transparent p-0 shadow-none ring-0"
      >
        <GlassSurface cornerRadius={16} className="p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs font-semibold">
              Why {score} — {match}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {factors.map((f) => {
              const positive = f.value >= 0;
              const width = Math.min(
                100,
                (Math.abs(f.value) / MAX_ABS_VALUE) * 100,
              );
              const color = positive ? "var(--positive)" : "var(--negative)";
              return (
                <div
                  key={f.name}
                  className="grid grid-cols-[88px_1fr_34px] items-center gap-2"
                >
                  <span className="text-[11px] text-muted-foreground">
                    {f.name}
                  </span>
                  <span className="bg-surface-2 block h-[5px] overflow-hidden rounded-full">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${width}%`, background: color }}
                    />
                  </span>
                  <span
                    className="text-right text-[11px] font-semibold tabular-nums"
                    style={{ color }}
                  >
                    {positive ? "+" : "−"}
                    {Math.abs(f.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassSurface>
      </PopoverContent>
    </Popover>
  );
}
