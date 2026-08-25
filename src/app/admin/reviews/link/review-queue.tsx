"use client";

import { Check, CircleSlash, Film, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { PendingReview } from "@/lib/api/admin/review-links";
import { cn } from "@/lib/utils";

/**
 * The pending queue, grouped by channel.
 *
 * Grouping by channel is a PROXY, not the goal. Grouping by laptop family
 * would be better — recognise the machine once, clear six videos in a row —
 * but a pending review has no family attribution to group on: `matched_laptop_id`
 * is NULL by construction for pending rows, which is the whole reason this
 * screen exists. Channel is the available stand-in and it still helps, because
 * one channel's videos share a title format and the eye adapts to it once
 * instead of re-reading a new layout every row. Revisit this once two-stage
 * matching lands and pending rows carry a family guess.
 */

/**
 * Done-ness comes from links, never from `status`.
 *
 * A family-only link does NOT flip the review to `matched` — that word means
 * "ready for chunk processing" and the chunk path still needs a laptop_id — so
 * the row stays `pending` after the human has finished with it. Reading
 * `status` here would show every completed row as untouched.
 *
 * `matched_laptop_id` is not a substitute either: a pending review can carry
 * one (there is a row auto-matched at 76.9 that was never promoted), so it
 * does not mean "a human dealt with this".
 */
function isDone(review: PendingReview): boolean {
  return review.links.length > 0;
}

function groupByChannel(reviews: PendingReview[]) {
  const groups = new Map<string, { name: string; reviews: PendingReview[] }>();
  for (const review of reviews) {
    const key = review.channel_id;
    if (!groups.has(key)) {
      groups.set(key, { name: review.channel_name ?? review.channel_id, reviews: [] });
    }
    groups.get(key)!.reviews.push(review);
  }
  // Biggest channel first: the longest run of same-shaped titles is where the
  // eye-adaptation saving is largest, so it should be the first thing offered.
  return [...groups.values()].sort((a, b) => b.reviews.length - a.reviews.length);
}

export function ReviewQueue({
  reviews,
  selectedId,
  onSelect,
  onDismiss,
  search,
  onSearchChange,
  busy,
}: {
  reviews: PendingReview[];
  selectedId: string | null;
  onSelect: (review: PendingReview) => void;
  /** Mark as not about a laptop. Removes the row from this queue. */
  onDismiss: (review: PendingReview) => void;
  search: string;
  onSearchChange: (value: string) => void;
  busy?: boolean;
}) {
  const groups = groupByChannel(reviews);
  const done = reviews.filter(isDone).length;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by title"
          aria-label="Filter the queue by video title"
        />
        <p className="text-muted-foreground text-xs">
          {done} of {reviews.length} linked
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.name} className="mb-4">
            <div className="bg-surface-2 text-muted-foreground sticky top-0 z-10 flex items-center justify-between rounded-md px-2 py-1 text-xs font-medium">
              <span className="truncate">{group.name}</span>
              <span className="tabular-nums">{group.reviews.length}</span>
            </div>
            <ul className="mt-1 flex flex-col gap-0.5">
              {group.reviews.map((review) => {
                const linked = isDone(review);
                const noTranscript = review.segment_count === 0;
                return (
                  // The dismiss control is a SIBLING of the row button, not a
                  // child: a button inside a button is invalid HTML and the
                  // inner one stops receiving clicks in some browsers.
                  <li key={review.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelect(review)}
                      aria-current={review.id === selectedId}
                      className={cn(
                        "hover:bg-surface-2 flex w-full flex-col gap-1 rounded-md py-2 pr-8 pl-2 text-left transition-colors",
                        review.id === selectedId && "bg-surface-2 ring-brand/40 ring-1",
                        // Dimmed, never removed: a linked review genuinely is
                        // not processed yet, and the human must be able to find
                        // it again to add a second machine or fix a mistake.
                        linked && "opacity-55",
                      )}
                    >
                      <span className="flex items-start gap-2">
                        {linked ? (
                          <Check className="text-positive mt-0.5 size-3.5 shrink-0" />
                        ) : (
                          <span className="mt-0.5 size-3.5 shrink-0" />
                        )}
                        <span className="line-clamp-2 text-sm leading-snug">
                          {review.video_title}
                        </span>
                      </span>
                      <span className="text-muted-foreground flex items-center gap-2 pl-5.5 text-xs">
                        {noTranscript ? (
                          <span className="text-warning inline-flex items-center gap-1">
                            <CircleSlash className="size-3" />
                            no transcript
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Film className="size-3" />
                            {review.segment_count} segments
                          </span>
                        )}
                        {linked && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1 py-0 text-[10px] font-normal"
                          >
                            {review.links.length} linked
                          </Badge>
                        )}
                      </span>
                    </button>
                    {/* Dropping the "review" keyword from discovery bought
                        recall on Chinese-titled videos and let non-laptop
                        videos into the queue. This is how they leave it — one
                        click, in place, without opening the row.

                        Revealed on hover, but ALWAYS present for keyboard and
                        touch: `focus-visible:opacity-100` plus the sr-only
                        label, never `hidden`. An action that only exists on
                        hover does not exist for half the ways it is reached. */}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDismiss(review)}
                      title="Not a laptop video"
                      className={cn(
                        "text-muted-foreground hover:bg-surface-3 hover:text-negative absolute top-1.5 right-1",
                        "rounded p-1 opacity-0 transition-opacity",
                        "group-hover:opacity-100 focus-visible:opacity-100",
                        "disabled:pointer-events-none",
                      )}
                    >
                      <X className="size-3.5" />
                      <span className="sr-only">
                        Dismiss “{review.video_title}” — not a laptop video
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export { isDone };
