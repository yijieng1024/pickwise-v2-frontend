"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shares the current laptop. Uses the Web Share API where it exists (every
 * mobile browser, Safari on macOS) and falls back to copying the URL to the
 * clipboard everywhere else — Chrome and Firefox on desktop have no share
 * sheet. Either way the button confirms in place rather than silently
 * succeeding, since a share sheet that never opened is indistinguishable
 * from a dead button.
 */
export function ShareButton({ name }: { name: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const flash = (next: "copied" | "failed") => {
    setState(next);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState("idle"), 2000);
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch (err) {
        // The user dismissing the sheet is not a failure — say nothing.
        if ((err as Error).name === "AbortError") return;
        // Anything else (no permission, unsupported payload): fall through
        // to the clipboard so the action still completes.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("copied");
    } catch {
      flash("failed");
    }
  };

  const message =
    state === "copied"
      ? "Link copied"
      : state === "failed"
        ? "Couldn't copy — copy the address bar instead"
        : "";

  return (
    <span className="flex items-center gap-2">
      {/* Announced when the fallback path runs; empty the rest of the time. */}
      <span aria-live="polite" className="text-[11.5px] font-medium">
        {message}
      </span>
      <button
        type="button"
        onClick={share}
        aria-label={`Share ${name}`}
        className={cn(
          "flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors",
          "hover:bg-surface-2 hover:text-foreground",
          "focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
          state === "copied" && "text-positive",
        )}
      >
        {state === "copied" ? (
          <Check className="size-4" />
        ) : (
          <Share className="size-4" />
        )}
      </button>
    </span>
  );
}
