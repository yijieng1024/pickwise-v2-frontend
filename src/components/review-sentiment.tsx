"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { GlassSurface } from "@/components/glass-surface";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReviewPoint } from "@/lib/laptops";

export function ReviewSentiment({ reviews }: { reviews: ReviewPoint[] }) {
  const [open, setOpen] = useState<ReviewPoint | null>(null);
  const strengths = reviews.filter((r) => r.strength);
  const weaknesses = reviews.filter((r) => !r.strength);

  return (
    <>
      <h2 className="mb-1 text-base font-semibold tracking-tight">
        What reviewers love
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        From {reviews.length} video reviews · click to see the source
      </p>
      <div className="flex flex-col gap-2.5">
        {strengths.map((r) => (
          <button
            key={r.point}
            type="button"
            onClick={() => setOpen(r)}
            className="flex items-center gap-2.5 rounded-2xl border border-positive/20 bg-positive/[0.07] px-4 py-3 text-left text-[13.5px] leading-snug transition-transform motion-safe:hover:scale-[1.015]"
          >
            <Check className="h-4 w-4 shrink-0 text-positive" strokeWidth={2.4} />
            {r.point}
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
              {r.channel}
            </span>
          </button>
        ))}
      </div>

      {weaknesses.length > 0 && (
        <>
          <h2 className="mt-6 mb-4 text-base font-semibold tracking-tight">
            Watch out for
          </h2>
          <div className="flex flex-col gap-2.5">
            {weaknesses.map((r) => (
              <button
                key={r.point}
                type="button"
                onClick={() => setOpen(r)}
                className="flex items-center gap-2.5 rounded-2xl border border-negative/20 bg-negative/[0.06] px-4 py-3 text-left text-[13.5px] leading-snug transition-transform motion-safe:hover:scale-[1.015]"
              >
                <X className="h-4 w-4 shrink-0 text-negative" strokeWidth={2.4} />
                {r.point}
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                  {r.channel}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <Dialog
        open={open !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOpen(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-none"
          className="w-full bg-transparent p-0 shadow-none ring-0 sm:max-w-md"
        >
          {open && (
            <GlassSurface cornerRadius={24} className="flex flex-col gap-3.5 p-7">
              <div className="flex items-start justify-between gap-4">
                <DialogTitle className="font-sans text-[17px] font-semibold tracking-tight">
                  {open.point}
                </DialogTitle>
                <DialogClose
                  aria-label="Close"
                  className="bg-surface-2 flex h-7 w-7 flex-none items-center justify-center rounded-full text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </DialogClose>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-muted-foreground">
                  {open.channel}
                </span>
                <span className="text-brand font-semibold">
                  Watch at {open.timestampLabel} →
                </span>
              </div>
            </GlassSurface>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
