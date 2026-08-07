import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading state for the pipeline-health dashboard.
 *
 * Mirrors the real layout block for block rather than showing a spinner in a
 * box: the dashboard waits on ten parallel requests, and the slowest decides
 * when anything appears. A centred spinner in that window says only "wait",
 * where this says what is coming and roughly how much of it.
 *
 * Every bar is aria-hidden; the wrapper carries the single status message so a
 * screen reader hears "Loading pipeline health" once instead of a wall of divs.
 * (The spinner this replaced had no accessible name at all.)
 */
export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading pipeline health"
      className="flex flex-col gap-4"
    >
      {/* Four stage cards, matching the xl:grid-cols-4 pipeline row. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-line bg-surface rounded-2xl border p-4" aria-hidden>
            <Line box="h-4" bar="h-3 w-20" />
            <Line box="mt-2.5 h-8" bar="h-6 w-16" />
            {/* min-h matches the real caption's reserved two lines. */}
            <div className="mt-1 min-h-[34px]">
              <Line box="h-[17px]" bar="h-3 w-full" />
              <Line box="h-[17px]" bar="h-3 w-4/5" />
            </div>
            <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
            <Line box="mt-2.5 h-[18px]" className="justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </Line>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* Waiting on you */}
        <div className="flex flex-col gap-3">
          <Line box="h-5" className="justify-between" aria-hidden>
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-40" />
          </Line>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <AttentionRow key={i} media="size-9 rounded-full" />
            ))}
          </div>
          {/* Pico turns row */}
          <AttentionRow media="size-4" gap="gap-3" />
        </div>

        <div className="flex flex-col gap-4">
          {/* Findable and rankable */}
          <div className="flex flex-col gap-3">
            <Line box="h-5" bar="h-3.5 w-40" aria-hidden />
            <Card className="gap-0 p-4" aria-hidden>
              {[0, 1].map((i) => (
                <div key={i} className={i === 1 ? "mt-3.5" : undefined}>
                  <Line box="mb-1.5 h-[17px]" className="justify-between">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-28" />
                  </Line>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
              {/* gap-3 matches the action-pair spacing everywhere else. */}
              <div className="mt-4 flex flex-wrap gap-3">
                <Skeleton className="h-7 w-52 rounded-lg" />
                <Skeleton className="h-7 w-44 rounded-lg" />
              </div>
              <div className="mt-2.5">
                <Line box="h-[17px]" bar="h-3 w-full" />
                <Line box="h-[17px]" bar="h-3 w-3/4" />
              </div>
            </Card>
          </div>

          {/* Recent runs */}
          <div className="flex flex-col gap-3">
            <Line box="h-5" className="justify-between" aria-hidden>
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-16" />
            </Line>
            <Card className="gap-0 py-0" aria-hidden>
              <ul className="divide-line divide-y">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex h-[38px] items-center gap-3 px-4">
                    <Skeleton className="size-2 shrink-0 rounded-full" />
                    <Skeleton className="h-3 min-w-0 flex-1" />
                    <Skeleton className="h-3 w-10 shrink-0" />
                  </li>
                ))}
              </ul>
            </Card>
            <div aria-hidden>
              <Line box="h-[17px]" bar="h-3 w-full" />
              <Line box="h-[17px]" bar="h-3 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A placeholder bar centred in a box the height of the text line it stands in
 * for. Sizing the bar alone leaves the skeleton shorter than the real content
 * — measured at ~44px across this page — so the layout jumps when data lands.
 * The box carries the line height; the bar only carries the ink.
 */
function Line({
  box,
  bar,
  className,
  children,
  ...props
}: {
  box: string;
  bar?: string;
  className?: string;
  children?: React.ReactNode;
} & React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center", box, className)} {...props}>
      {children ?? <Skeleton className={bar} />}
    </div>
  );
}

function AttentionRow({ media, gap = "gap-3.5" }: { media: string; gap?: string }) {
  return (
    <div
      className={cn(
        "border-line bg-surface flex items-center rounded-2xl border p-3.5",
        gap,
      )}
      aria-hidden
    >
      <Skeleton className={cn("shrink-0", media)} />
      <div className="min-w-0 flex-1">
        <Line box="h-5" bar="h-3.5 w-3/5" />
        <Line box="mt-0.5 h-[17px]" bar="h-3 w-4/5" />
      </div>
      <Skeleton className="size-4 shrink-0" />
    </div>
  );
}
