import { Check, Info, X } from "lucide-react";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import type { LaptopReviews, ReviewPoint } from "@/lib/api/reviews";
import { cn } from "@/lib/utils";

const timestampLabel = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * "What reviewers say" on the details page. `reviews` is null when the
 * request failed — that is said plainly, never filled with placeholder points.
 */
export function ReviewSentiment({
  reviews,
}: {
  reviews: LaptopReviews | null;
}) {
  return (
    <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
      <h2 className="mb-1 text-base font-semibold tracking-tight">
        What Reviewers Say
      </h2>

      {reviews === null ? (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load reviews right now. Please try again later.
        </p>
      ) : reviews.source === "none" ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            From {reviews.review_count} video review
            {reviews.review_count === 1 ? "" : "s"} · each point links to the
            moment in the video
          </p>

          {reviews.source === "other_configurations" && (
            <p className="bg-surface-2 mb-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-[13px] leading-snug">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              No reviews of this exact configuration yet. These come from other
              configurations of the same laptop, and each point names the
              configuration it was tested on.
            </p>
          )}

          {/* Side by side so the two read as a comparison; stacked on
              phones, strengths first. An empty side keeps its column. */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <PointList
              title="Strengths"
              points={reviews.strengths}
              empty="Reviewers didn't mention any strengths."
            />
            <PointList
              title="Watch Out For"
              points={reviews.weaknesses}
              empty="Reviewers didn't mention any weaknesses."
            />
          </div>
        </>
      )}
    </section>
  );
}

function PointList({
  title,
  points,
  empty,
}: {
  title: string;
  points: ReviewPoint[];
  empty: string;
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {points.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {points.map((p) => (
            <li key={`${p.video_id}-${p.timestamp_start_seconds}`}>
              <Point p={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Point({ p }: { p: ReviewPoint }) {
  const strength = p.sentiment === "strength";
  const Icon = strength ? Check : X;
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-left transition-transform motion-safe:hover:scale-[1.01]",
        strength
          ? "border-positive/20 bg-positive/[0.07]"
          : "border-negative/20 bg-negative/[0.06]",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          strength ? "text-positive" : "text-negative",
        )}
        strokeWidth={2.4}
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] leading-snug">{p.text}</span>
        {p.applies_to === "configuration_not_stated" && (
          <span className="bg-surface-2 mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] text-muted-foreground">
            Reviewer didn&apos;t say which configuration they tested
          </span>
        )}
        {p.applies_to === "other_configuration" && p.tested_on_name && (
          <span className="bg-surface-2 mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] text-muted-foreground">
            Tested on {p.tested_on_name}
          </span>
        )}
        <span className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          {/* The initial stays underneath; the image only mounts once it has
              loaded, so a missing or broken avatar leaves the initial. */}
          <Avatar className="bg-surface-2 size-4 items-center justify-center overflow-hidden text-[9px] font-bold after:hidden">
            {p.channel_name.charAt(0).toUpperCase()}
            {p.channel_img_url && (
              <AvatarImage
                src={p.channel_img_url}
                alt=""
                className="absolute inset-0"
              />
            )}
          </Avatar>
          <span className="min-w-0">
            {p.channel_name}
            {p.video_title && <> · {p.video_title}</>} · Watch at{" "}
            {timestampLabel(p.timestamp_start_seconds)} →
          </span>
        </span>
      </span>
    </a>
  );
}
