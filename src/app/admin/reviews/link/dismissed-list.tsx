"use client";

import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RawReview } from "@/lib/api/admin/reviews";

/**
 * Reviews dismissed as not about a laptop, and the place to undo that.
 *
 * The undo is not buried on purpose: it is the safety net that makes the
 * dismiss button safe to click quickly, and the whole queue is built around
 * clicking quickly. Someone will mis-click, and if the only way back were a
 * database query the dismiss control would deserve a confirm dialog — which
 * would cost more time on every correct dismissal than the occasional mistake
 * costs to fix.
 *
 * These rows are not deleted, and could not sensibly be: `video_id` is UNIQUE
 * and the backend's ingest skips any existing row that is not `rejected`, so a
 * deleted row would be rediscovered and reinserted on the next run and land
 * straight back in the queue. The row IS the dismissal.
 */

export function DismissedList({
  reviews,
  onRestore,
  busy,
}: {
  reviews: RawReview[] | null;
  onRestore: (review: RawReview) => void;
  busy?: boolean;
}) {
  if (reviews === null) {
    return <p className="text-muted-foreground px-2 py-4 text-sm">Loading…</p>;
  }
  if (reviews.length === 0) {
    return (
      <p className="text-muted-foreground px-2 py-4 text-sm">
        Nothing dismissed yet. Use the × on a queue row when a video is not
        about a laptop.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="hover:bg-surface-2 flex items-start gap-2 rounded-md px-2 py-2"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <a
              href={`https://www.youtube.com/watch?v=${review.video_id}`}
              target="_blank"
              rel="noreferrer noopener"
              className="line-clamp-2 text-sm leading-snug hover:underline"
            >
              {review.video_title}
            </a>
            <span className="text-muted-foreground text-xs">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onRestore(review)}
            className="shrink-0"
          >
            <Undo2 className="size-3.5" />
            Restore
          </Button>
        </li>
      ))}
    </ul>
  );
}
