import { cn } from "@/lib/utils";

/**
 * The PickWise mark: three options on a spine, one pulled out and filled in as
 * the pick.
 *
 * Source artwork lives in `public/PickWise Logo/` (master, micro, lockup, plus
 * the spec sheet). Those files are what a designer opens and what gets handed
 * to anyone outside this repo; this component is what the app renders. Keep the
 * geometry here identical to `pickwise-mark.svg` / `pickwise-mark-micro.svg`.
 *
 * Inlined rather than loaded via `next/image`: the artwork is drawn in
 * `currentColor`, so one file covers navy-on-light, white-on-navy and the dark
 * theme's lighter brand tint. An SVG referenced through `<img>`/`next/image` is
 * a separate document that inherits nothing from the page and would render
 * black everywhere.
 *
 * No `<title>`/`role="img"` here: every placement sits beside the "PickWise"
 * wordmark as real text, so the mark is decorative and announcing it again
 * would just double up for screen readers.
 */
export function BrandMark({
  variant = "master",
  className,
}: {
  /**
   * `micro` is the small-size cut — fatter strokes, tighter bounding box — so
   * the nodes don't merge into a blob. Brand rules: use it below 24px, and
   * never render either cut below 16px.
   */
  variant?: "master" | "micro";
  className?: string;
}) {
  const master = variant === "master";

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <g
        stroke="currentColor"
        fill="currentColor"
        strokeWidth={master ? 7 : 9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {master ? (
          <>
            <path d="M32.5 17 C45.5 17 45 50 58 50" />
            <path d="M32.5 83 C45.5 83 45 50 58 50" />
            <path d="M32.5 50 H67" />
            <circle cx="20" cy="17" r="9" fill="none" />
            <circle cx="20" cy="50" r="9" fill="none" />
            <circle cx="20" cy="83" r="9" fill="none" />
            <circle cx="80" cy="50" r="13" stroke="none" />
          </>
        ) : (
          <>
            <path d="M36.5 22 C49.5 22 41 50 54 50" />
            <path d="M36.5 78 C49.5 78 41 50 54 50" />
            <path d="M36.5 50 H61" />
            <circle cx="22" cy="22" r="10" fill="none" />
            <circle cx="22" cy="50" r="10" fill="none" />
            <circle cx="22" cy="78" r="10" fill="none" />
            <circle cx="76" cy="50" r="15" stroke="none" />
          </>
        )}
      </g>
    </svg>
  );
}
