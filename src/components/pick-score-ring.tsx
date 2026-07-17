import { cn } from "@/lib/utils";

interface PickScoreRingProps {
  score: number;
  /** Rendered diameter in px. */
  size?: number;
  strokeWidth?: number;
  /** "below" = caption on its own line under the ring; "inside" = caption stacked under the number inside the ring; "none" = number only. */
  caption?: "below" | "inside" | "none";
  className?: string;
}

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PickScoreRing({
  score,
  size = 48,
  strokeWidth = 3.5,
  caption = "below",
  className,
}: PickScoreRingProps) {
  const dash = (Math.max(0, Math.min(100, score)) / 100) * CIRCUMFERENCE;

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <span className="relative block" style={{ width: size, height: size }}>
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
          className="absolute inset-0 flex flex-col items-center justify-center font-bold tabular-nums text-brand"
          style={{ fontSize: size * 0.29, lineHeight: 1 }}
        >
          {score}
          {caption === "inside" && (
            <span
              className="mt-0.5 font-semibold tracking-wide text-muted-foreground uppercase"
              style={{ fontSize: size * 0.08 }}
            >
              Pick Score
            </span>
          )}
        </span>
      </span>
      {caption === "below" && (
        <span className="text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
          Pick Score
        </span>
      )}
    </div>
  );
}
