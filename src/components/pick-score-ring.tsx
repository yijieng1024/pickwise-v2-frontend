import { cn } from "@/lib/utils";

/** The smallest ring whose inside caption (size * 0.08) reaches 11px. */
const INSIDE_MIN_SIZE = 138;
const MIN_CAPTION_PX = 11;

export type PickScoreCaptionPosition = "inside" | "right" | "below";

interface PickScoreRingProps {
  score: number;
  /** Rendered diameter in px. */
  size?: number;
  strokeWidth?: number;
  /** "none" = number only. Where a shown caption goes is `captionPosition`. */
  caption?: "show" | "none";
  /** "inside" = under the number inside the ring; "right" / "below" = outside it
   * at 11px. Default: inside when the ring is 138px or larger, otherwise below,
   * because a smaller ring's inside caption would be under 11px. */
  captionPosition?: PickScoreCaptionPosition;
  className?: string;
}

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PickScoreRing({
  score,
  size = 48,
  strokeWidth = 3.5,
  caption = "show",
  captionPosition = size >= INSIDE_MIN_SIZE ? "inside" : "below",
  className,
}: PickScoreRingProps) {
  const dash = (Math.max(0, Math.min(100, score)) / 100) * CIRCUMFERENCE;
  const position = caption === "none" ? null : captionPosition;

  return (
    <div
      className={cn(
        "flex items-center",
        position === "right" ? "flex-row gap-2" : "flex-col gap-1.5",
        className,
      )}
    >
      <span className="relative block flex-none" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 44 44"
          className="block -rotate-90"
        >
          <circle
            cx="22"
            cy="22"
            r={RADIUS}
            fill="none"
            stroke="var(--brand-tint)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="22"
            cy="22"
            r={RADIUS}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
          />
        </svg>
        <span
          className="absolute inset-0 flex flex-col items-center justify-center font-bold tabular-nums text-brand-text"
          style={{ fontSize: size * 0.29, lineHeight: 1 }}
        >
          {score}
          {position === "inside" && (
            <span
              className="mt-0.5 font-semibold tracking-wide text-muted-foreground uppercase"
              style={{ fontSize: Math.max(MIN_CAPTION_PX, size * 0.08) }}
            >
              Pick Score
            </span>
          )}
        </span>
      </span>
      {(position === "below" || position === "right") && (
        <span className="text-[11px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase">
          Pick Score
        </span>
      )}
    </div>
  );
}
