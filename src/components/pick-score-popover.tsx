"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

import { GlassSurface } from "@/components/glass-surface";
import { PickScoreBreakdown } from "@/components/pick-score-breakdown";
import { PickScoreRing } from "@/components/pick-score-ring";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  type PickScoreFactor,
  type UseCaseSlug,
  getLaptopPickScores,
  labelForUseCase,
} from "@/lib/api/pickscore";

interface Breakdown {
  breakdown: PickScoreFactor[];
  flags: Record<string, unknown>;
}

/**
 * A card's PickScore ring that opens its breakdown. General scores fetch the
 * stored row for `useCase` on first open; a personalized score passes its
 * breakdown in, since it only exists client-side.
 */
export function PickScorePopover({
  laptopId,
  score,
  useCase,
  personal,
  ringSize = 44,
}: {
  laptopId: string;
  score: number | null;
  useCase: UseCaseSlug;
  /** Set when `score` is the user's personalized one. */
  personal?: Breakdown;
  ringSize?: number;
}) {
  const [general, setGeneral] = useState<Breakdown | null>(null);
  const [failed, setFailed] = useState(false);
  const shown = personal ?? general;

  function load(open: boolean) {
    if (!open || personal || general) return;
    setFailed(false);
    getLaptopPickScores(laptopId, useCase)
      .then((res) => {
        const row = res.scores[0];
        if (row) setGeneral({ breakdown: row.breakdown, flags: row.flags });
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }

  return (
    <Popover onOpenChange={load}>
      <PopoverTrigger
        aria-label="PickScore breakdown"
        // The trigger sits on cards whose whole surface is a link.
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="relative flex cursor-pointer flex-col items-center border-none bg-transparent p-0"
      >
        {score === null ? (
          <span className="border-line flex items-center justify-center rounded-full border border-dashed px-2 text-[10px] font-semibold text-muted-foreground" style={{ height: ringSize }}>
            No score
          </span>
        ) : (
          <PickScoreRing score={score} size={ringSize} caption="none" />
        )}
        {personal && (
          <span className="bg-brand absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full text-white">
            <UserRound className="size-2.5" />
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] max-w-[calc(100vw-2rem)] bg-transparent p-0 shadow-none ring-0"
      >
        <GlassSurface cornerRadius={16} className="max-h-[70vh] overflow-y-auto p-4">
          <p className="mb-3 text-xs font-semibold">
            {score === null ? "No PickScore" : `PickScore ${score}`} ·{" "}
            {personal ? "For you" : labelForUseCase(useCase)}
          </p>
          {shown ? (
            <PickScoreBreakdown
              breakdown={shown.breakdown}
              flags={shown.flags}
              mode={personal ? "personalized" : "general"}
              compact
            />
          ) : (
            <p className="text-[12px] text-muted-foreground">
              {failed ? "Couldn't load the breakdown. Try again later." : "Loading…"}
            </p>
          )}
        </GlassSurface>
      </PopoverContent>
    </Popover>
  );
}
