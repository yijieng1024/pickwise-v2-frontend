"use client";

import { ExternalLink, FileText, MessageSquareQuote, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ConfigEvidence } from "@/lib/api/admin/review-links";

/**
 * What the source material actually says about which configuration was tested.
 *
 * This is the reason the configuration step is answerable at all. The video
 * title carries no spec — "The First Panther Lake Laptop I Strongly Recommend"
 * names no CPU, GPU or RAM — so before this the only honest way to answer was
 * to watch the video: minutes per review, on a queue budgeted for ten seconds
 * each. The backend scans the description and transcript for spec strings
 * belonging to THIS family's members and returns them with context, which turns
 * the task from investigation into confirmation.
 *
 * Shown ABOVE the table on purpose. The human should read what the video says
 * and then find that row, not scan the rows and try to recall the video.
 *
 * "Nothing found" is rendered as loudly as a hit, because it is equally a
 * result: it means stop looking and leave the configuration unset. The one
 * thing it must never be confused with is having no material to search, which
 * is a separate message — see `sources_available`.
 */

function timestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ConfigEvidencePanel({
  evidence,
  videoUrl,
}: {
  evidence: ConfigEvidence;
  videoUrl: string;
}) {
  const { hits, sources_available: sources } = evidence;

  if (!sources.description && !sources.transcript) {
    return (
      <div className="border-line text-muted-foreground flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-xs">
        <SearchX className="mt-0.5 size-3.5 shrink-0" />
        <span>
          No description or transcript is stored for this video, so there was
          nothing to search. That is not the same as the video not saying —
          leave the configuration unset.
        </span>
      </div>
    );
  }

  if (hits.length === 0) {
    return (
      <div className="border-line text-muted-foreground flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-xs">
        <SearchX className="mt-0.5 size-3.5 shrink-0" />
        <span>
          No configuration mentioned in the {sources.description && "description"}
          {sources.description && sources.transcript && " or "}
          {sources.transcript && "transcript"}. Leave it unset and move on.
        </span>
      </div>
    );
  }

  return (
    <div className="border-line bg-surface-2 flex flex-col gap-2 rounded-md border px-3 py-2.5">
      <p className="text-muted-foreground text-xs font-medium">
        What this video says ({hits.length})
      </p>
      <ul className="flex flex-col gap-2">
        {hits.map((hit, i) => (
          <li key={`${hit.column}-${hit.value}-${hit.source}-${i}`} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-normal">
                {hit.label}: {hit.value}
              </Badge>
              {hit.source === "description" ? (
                <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                  <FileText className="size-3" />
                  description
                </span>
              ) : hit.timestamp_seconds !== null ? (
                // A deep link, not a decoration: the point is to confirm in
                // seconds rather than scrub for the moment.
                <a
                  href={`${videoUrl}&t=${hit.timestamp_seconds}s`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-brand inline-flex items-center gap-1 text-[11px] hover:underline"
                >
                  <MessageSquareQuote className="size-3" />
                  {timestamp(hit.timestamp_seconds)}
                  <ExternalLink className="size-2.5" />
                </a>
              ) : (
                <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                  <MessageSquareQuote className="size-3" />
                  transcript
                </span>
              )}
              {/* One id means this hit alone narrows the family to a single
                  row; more means it does not, and the human has to keep going.
                  Saying which is the difference between evidence and a hint. */}
              <span className="text-muted-foreground text-[11px]">
                {hit.laptop_ids.length === 1
                  ? "narrows to 1 config"
                  : `matches ${hit.laptop_ids.length} configs`}
              </span>
            </div>
            <p className="text-muted-foreground border-line border-l-2 pl-2 text-xs leading-relaxed">
              …{hit.context}…
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
