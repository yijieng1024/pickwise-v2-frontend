"use client";

import Link from "next/link";
import { Columns2, X } from "lucide-react";

import { GlassSurface } from "@/components/glass-surface";
import { Button } from "@/components/ui/button";
import { MAX_COMPARE, compareHref } from "@/lib/compare";

export interface CompareSelection {
  id: string;
  name: string;
}

/**
 * Floating tray for the laptops ticked while browsing.
 *
 * Selection lives in the browse page's state rather than the URL: it is a
 * scratchpad the user builds up across filters and pages, and writing each tick
 * to the address bar would fight the filter params already there. It becomes a
 * URL at exactly one moment — pressing Compare, which is also what makes the
 * result shareable.
 */
export function CompareBar({
  selected,
  onRemove,
  onClear,
}: {
  selected: CompareSelection[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (selected.length === 0) return null;

  const ready = selected.length >= 2;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6">
      <GlassSurface
        cornerRadius={24}
        fullWidth
        className="pointer-events-auto mx-auto flex max-w-5xl flex-wrap items-center gap-3 p-3 sm:p-4"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-muted-foreground shrink-0 pl-1 text-[12.5px] font-semibold tabular-nums">
            {selected.length} of {MAX_COMPARE}
          </span>
          {selected.map((item) => (
            <span
              key={item.id}
              // Wide enough to keep the tail of a name visible: catalog
              // variants differ only in their suffix ("…16GB RAM, 1TB SSD"),
              // which is exactly what a tighter chip would truncate away.
              className="border-line bg-surface flex max-w-72 items-center gap-1.5 rounded-full border py-1 pr-1 pl-3 text-[12.5px] font-medium"
            >
              <span className="truncate">{item.name}</span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.name} from comparison`}
                className="text-muted-foreground hover:text-foreground cursor-pointer rounded-full p-0.5"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button variant="ghost" size="sm" shape="pill" onClick={onClear}>
            Clear
          </Button>
          {ready ? (
            <Button
              shape="pill"
              render={<Link href={compareHref(selected.map((s) => s.id))} />}
              nativeButton={false}
            >
              <Columns2 data-icon="inline-start" />
              Compare now
            </Button>
          ) : (
            // Disabled rather than hidden: the button appearing only on the
            // second tick would leave the first tick with no visible outcome.
            <Button shape="pill" disabled>
              <Columns2 data-icon="inline-start" />
              Pick one more
            </Button>
          )}
        </div>
      </GlassSurface>
    </div>
  );
}
