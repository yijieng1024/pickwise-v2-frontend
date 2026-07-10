"use client";

import { useState } from "react";

import { GlassSurface } from "@/components/glass-surface";
import { PickScoreRing } from "@/components/pick-score-ring";
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
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-none">
      <button
        type="button"
        aria-label="PickScore breakdown"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex cursor-pointer flex-col items-center gap-1 border-none bg-transparent p-0"
      >
        <PickScoreRing score={score} size={ringSize} caption="below" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="motion-safe:animate-fade-in-up absolute top-full right-0 z-40 mt-2 w-[280px]">
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
          </div>
        </>
      )}
    </div>
  );
}
