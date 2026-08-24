"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { type PendingSummary, aggregateLaptop } from "@/lib/api/admin/reviews";
import { cn } from "@/lib/utils";

/**
 * The laptops whose roll-up is missing or out of date, each runnable in place.
 *
 * `GET /reviews/summaries/pending` has always returned exactly this list, but
 * the frontend only used it for a counter on the dashboard. The action lived
 * here behind a catalog search, so the admin had to already know which laptop
 * needed aggregating and type its name. The queue and the action were on
 * different screens.
 *
 * `new` means nothing has ever been aggregated for that laptop; `stale` means
 * a chunk arrived after the last aggregation. Both are work. Laptops already
 * current are omitted by the API, which is why an empty list here is the good
 * state and not an error.
 */

export function AggregateWorklist({
  token,
  items,
  onDone,
}: {
  token: string;
  items: PendingSummary[];
  onDone: () => void;
}) {
  // Per-row rather than one page-level flag: these run one at a time and the
  // admin needs to see which row is working, not that "something" is.
  const [runningId, setRunningId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, number>>({});

  async function run(item: PendingSummary) {
    setRunningId(item.laptop_id);
    setErrors((e) => ({ ...e, [item.laptop_id]: "" }));
    try {
      const res = await aggregateLaptop(token, item.laptop_id);
      setDone((d) => ({ ...d, [item.laptop_id]: res.review_count }));
      onDone();
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [item.laptop_id]:
          err instanceof ApiError ? err.message : "Aggregation failed.",
      }));
    } finally {
      setRunningId(null);
    }
  }

  async function runAll() {
    for (const item of items) {
      if (done[item.laptop_id] !== undefined) continue;
      // Sequential on purpose. Each call recomputes a summary and commits;
      // firing them in parallel would put N writes on the pooler at once for
      // no wall-clock gain worth the contention.
      await run(item);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Every laptop with chunks has a current summary. Nothing to aggregate.
      </p>
    );
  }

  const busy = runningId !== null;
  const remaining = items.filter((i) => done[i.laptop_id] === undefined).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={runAll} disabled={busy || remaining === 0}>
          {busy ? <Spinner data-icon="inline-start" /> : <PlayCircle data-icon="inline-start" />}
          Aggregate all {remaining}
        </Button>
        <span className="text-muted-foreground text-xs">
          Runs one at a time. Safe to re-run.
        </span>
      </div>

      <ul className="border-line divide-line divide-y rounded-md border">
        {items.map((item) => {
          const finished = done[item.laptop_id];
          const error = errors[item.laptop_id];
          return (
            <li
              key={item.laptop_id}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2",
                finished !== undefined && "opacity-60",
              )}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {item.product_name}
                </span>
                <span className="text-muted-foreground text-xs">
                  {item.chunk_count} chunks
                  {item.last_aggregated_at
                    ? ` · last built ${new Date(item.last_aggregated_at).toLocaleDateString()}`
                    : " · never built"}
                </span>
                {error && (
                  <span role="alert" className="text-negative mt-0.5 text-xs">
                    {error}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-normal">
                  {item.state}
                </Badge>
                {finished !== undefined ? (
                  <span className="text-positive text-xs">
                    {finished} reviews
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void run(item)}
                  >
                    {runningId === item.laptop_id ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    Run
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
