"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { PipelineStatus } from "@/lib/api/admin/reviews";
import { cn } from "@/lib/utils";

/**
 * The four stages with their queue depths.
 *
 * The page is named "Review Pipeline" but rendered three identical control
 * blocks in a stack, which reads as three independent widgets rather than a
 * dependency chain: you cannot process what has not been linked, and you
 * cannot aggregate what has not been processed. This strip makes the chain
 * visible and, more usefully, shows where the work actually is.
 *
 * Link is included even though it lives on another screen. It sits between
 * Ingest and Process in the real flow, and leaving it out was why the pipeline
 * looked like three steps instead of four.
 */

type Stage = {
  key: string;
  label: string;
  count: number;
  unit: string;
  detail?: string;
  href?: string;
};

function stages(status: PipelineStatus): Stage[] {
  return [
    {
      key: "ingest",
      label: "Ingest",
      count: status.ingest.families_remaining,
      unit: "families left",
      detail: `${status.ingest.families_covered} of ${status.ingest.families_total} covered`,
    },
    {
      key: "link",
      label: "Link",
      count: status.link.pending_unlinked,
      unit: "reviews to link",
      detail: [
        status.link.pending_linked > 0
          ? `${status.link.pending_linked} linked, not yet processed`
          : null,
        // The ratio, not the count. It measures what dropping the "review"
        // keyword from discovery cost: ~10-15% means the recall gain was worth
        // it, ~40% means discovery is too loose and wants `laptop`/`notebook`
        // added as a term — not `review` put back, since the original problem
        // was that Chinese channels do not title in English.
        status.link.irrelevant_total > 0
          ? `${status.link.irrelevant_total} dismissed as not a laptop (${Math.round(
              status.link.irrelevant_ratio * 100,
            )}% of all ingested)`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
      href: "/admin/reviews/link",
    },
    {
      key: "process",
      label: "Process",
      count: status.process.candidates,
      unit: "reviews to chunk",
    },
    {
      key: "aggregate",
      label: "Aggregate",
      count: status.aggregate.pending_total,
      unit: "summaries to build",
      detail:
        status.aggregate.pending_total > 0
          ? `${status.aggregate.new} new, ${status.aggregate.stale} stale`
          : undefined,
    },
  ];
}

export function PipelineSteps({ status }: { status: PipelineStatus }) {
  const items = stages(status);

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((stage) => {
        // A zero queue is the good state, not a failure, so it is muted rather
        // than coloured. Only a non-empty queue earns the foreground weight.
        const idle = stage.count === 0;
        const body = (
          <Card
            className={cn(
              "gap-0 p-3 transition-colors",
              stage.href && "hover:border-brand/40",
            )}
          >
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              {stage.label}
              {stage.href && <ArrowRight className="size-3" />}
            </div>
            <div
              className={cn(
                "mt-1 font-mono text-2xl leading-none tabular-nums",
                idle && "text-muted-foreground/50",
              )}
            >
              {stage.count}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">{stage.unit}</div>
            {stage.detail && (
              <div className="text-muted-foreground/70 mt-0.5 text-[11px]">
                {stage.detail}
              </div>
            )}
          </Card>
        );

        return stage.href ? (
          <Link key={stage.key} href={stage.href} className="block">
            {body}
          </Link>
        ) : (
          <div key={stage.key}>{body}</div>
        );
      })}
    </div>
  );
}

export function PipelineStepsSkeleton() {
  // Matches the real strip's shape rather than showing a spinner: the counts
  // land above three control blocks, and a spinner here would push the whole
  // page down and then snap it back.
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="gap-0 p-3">
          <div className="bg-surface-2 h-4 w-16 rounded" />
          <div className="bg-surface-2 mt-1 h-6 w-10 rounded" />
          <div className="bg-surface-2 mt-1 h-3 w-24 rounded" />
        </Card>
      ))}
    </div>
  );
}
