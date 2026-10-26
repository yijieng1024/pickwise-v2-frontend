"use client";

import Link from "next/link";
import { useState } from "react";
import { CirclePause, CirclePlay } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/admin/freshness";
import { jobTypeLabel } from "@/lib/api/admin/jobs";
import type { FunnelStepName, PipelineStatus, StuckReason } from "@/lib/api/admin/reviews";
import { setReviewPauseReason } from "@/lib/api/admin/settings";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import type { Tone } from "../../admin-status-pill";
import { ShareBar, SummaryCard, ToneChip } from "../../admin-summary-ui";

// --- Pause banner --------------------------------------------------------------

const REASON_MAX = 500;

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PauseBanner({
  status,
  token,
  onSaved,
}: {
  status: PipelineStatus;
  token: string | null;
  onSaved: () => void;
}) {
  const { paused, pause_reason: reason, pause_reason_updated_at: setAt } = status.process;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(next: string | null) {
    if (!token) return;
    setSaving(true);
    try {
      await setReviewPauseReason(token, next);
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the reason.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-label="Processing status"
      className={cn(
        "flex flex-wrap items-center gap-3.5 rounded-xl border px-5 py-4",
        paused ? "border-warning/30 bg-warning/10" : "border-line bg-surface",
      )}
    >
      {paused ? (
        <CirclePause aria-hidden className="text-warning size-5 shrink-0" />
      ) : (
        <CirclePlay aria-hidden className="text-positive size-5 shrink-0" />
      )}
      <div className="min-w-60 flex-1">
        <div className={cn("text-base font-bold", paused && "text-warning")}>
          {paused ? "Processing is paused" : "Processing is running"}
        </div>
        <div className={cn("mt-0.5 text-sm", paused ? "text-warning" : "text-muted-foreground")}>
          {paused
            ? `${reason ? `Reason: ${reason}${setAt ? ` · set ${shortDate(setAt)}` : ""}.` : "No reason recorded."} Finding videos, transcripts and linking still work.`
            : "Run processing turns linked reviews into claims on the site."}
        </div>
      </div>
      {paused && (
        <Button
          variant="outline"
          onClick={() => {
            setDraft(reason ?? "");
            setOpen(true);
          }}
        >
          Edit reason
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Why is processing paused?</DialogTitle>
            <DialogDescription>
              Shown on this page and on the Dashboard. The pause itself is the REVIEW_PROCESSING_PAUSED setting on
              the server; this only explains it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Pause reason"
            value={draft}
            maxLength={REASON_MAX}
            rows={3}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="text-muted-foreground -mt-2 text-right text-xs tabular-nums">
            {draft.length} / {REASON_MAX}
          </div>
          <DialogFooter>
            {reason && (
              <Button variant="ghost" className="sm:mr-auto" onClick={() => void save(null)} disabled={saving}>
                Clear reason
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save(draft.trim() || null)} disabled={saving}>
              {saving && <Spinner data-icon="inline-start" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// --- Funnel --------------------------------------------------------------------

const STEP_LABEL: Record<FunnelStepName, string> = {
  found: "1 · Videos found",
  transcript: "2 · Transcript",
  linked: "3 · Linked to a laptop",
  processed: "4 · Processed into claims",
  shown: "5 · Shown on the site",
};

/** Plain wording for each stuck reason; shared with the All Reviews filter. */
export const STUCK: Record<StuckReason, { label: string; tone: Tone }> = {
  transcript_retryable: { label: "Blocked, can retry", tone: "warn" },
  transcript_terminal: { label: "No captions / video gone", tone: "bad" },
  transcript_deferred: { label: "Not fetched yet", tone: "neutral" },
  transcript_unknown: { label: "Unknown (old rows)", tone: "neutral" },
  unlinked: { label: "Waiting for you to link", tone: "warn" },
  never_processed: { label: "Never processed", tone: "warn" },
  partial: { label: "Partly processed", tone: "warn" },
  reprocess_requested: { label: "Re-run requested", tone: "warn" },
  no_shown_claims: { label: "No claim passes the filter", tone: "neutral" },
};

/** The list behind a stuck count: the All Reviews tab of Link Reviews. */
function stuckHref(reason: StuckReason) {
  return `/admin/reviews/link?view=all&stuck=${reason}`;
}

export function Funnel({
  status,
  actions,
}: {
  status: PipelineStatus;
  /** Buttons rendered at the foot of each step's card. */
  actions: Partial<Record<FunnelStepName, React.ReactNode>>;
}) {
  return (
    <section aria-labelledby="funnel">
      <div className="mb-3 flex flex-wrap items-baseline gap-2.5">
        <h2 id="funnel" className="text-base font-semibold tracking-tight">
          Pipeline
        </h2>
        <span className="text-muted-foreground text-sm">
          Each step&apos;s count plus its stuck counts equals the step before. Click a stuck count to see those videos.
        </span>
      </div>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {status.funnel.map((step) => {
          const stuck = (Object.entries(step.stuck) as [StuckReason, number][]).filter(([, n]) => n > 0);
          return (
            <li key={step.step} className="bg-surface border-line flex min-w-0 flex-col gap-2.5 rounded-xl border p-4">
              <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {STEP_LABEL[step.step]}
              </div>
              <div className="text-2xl font-bold tabular-nums">{step.count.toLocaleString()}</div>
              {step.step === "found" && (
                <div className="text-muted-foreground text-sm">
                  From {status.ingest.active_channels} active channel{status.ingest.active_channels === 1 ? "" : "s"}
                </div>
              )}
              {stuck.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {stuck.map(([reason, n]) => (
                    <li key={reason}>
                      <Link
                        href={stuckHref(reason)}
                        className="bg-surface-2 hover:bg-brand-tint flex min-h-9 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm"
                      >
                        <ToneChip tone={STUCK[reason].tone}>{n.toLocaleString()}</ToneChip>
                        {STUCK[reason].label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex-1" />
              {actions[step.step]}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// --- Claims, coverage, quota, recent runs --------------------------------------

const UNATTACHED_LABEL = {
  other_laptop: "Not attached: about another laptop",
  several: "Not attached: about several laptops",
  none: "Not attached: no laptop named",
  config_unknown: "Not attached: configuration unknown",
} as const;

export function ClaimsCard({ status }: { status: PipelineStatus }) {
  const c = status.claims;
  const rows: [string, number][] = [
    ["Shown on the site", c.shown],
    ["Hidden: price talk", c.hidden_price],
    ...(Object.keys(UNATTACHED_LABEL) as (keyof typeof UNATTACHED_LABEL)[]).map(
      (k) => [UNATTACHED_LABEL[k], c.unattached[k] ?? 0] as [string, number],
    ),
  ];
  return (
    <SummaryCard id="claims" title="Claims" description="What happened to the review points the processor extracted.">
      <table className="mt-2 w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, n]) => (
            <tr key={label}>
              <td className="border-line border-b py-2.5 pr-3">{label}</td>
              <td className="border-line border-b py-2.5 text-right font-semibold tabular-nums">{n.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SummaryCard>
  );
}

export function CoverageCard({ status }: { status: PipelineStatus }) {
  const c = status.coverage;
  return (
    <SummaryCard id="coverage" title="Coverage" description="How much of the catalog has reviews people can see.">
      <div className="mt-3 flex flex-col gap-4">
        <ShareBar label="Families with reviews" value={c.families_with_reviews} total={c.families_with_active} />
        <ShareBar label="Active laptops with reviews shown" value={c.active_laptops_with_reviews} total={c.active_laptops} />
      </div>
    </SummaryCard>
  );
}

function malaysiaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

function hoursUntil(iso: string): string {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
  return mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} h`;
}

function roleOf(position: number | null): string {
  if (position === null) return "No longer in the chain";
  return position === 0 ? "Primary" : `Backup ${position}`;
}

export function QuotaCard({ status }: { status: PipelineStatus }) {
  const q = status.quota;
  const rows = [
    ...q.models.map((m) => ({ ...m, role: roleOf(m.position) })),
    { ...q.embedding, role: "Embeddings, shared with Pico search" },
  ];
  return (
    <SummaryCard
      id="quota"
      title="Quota today"
      description={`Resets ${malaysiaTime(q.resets_at)} Malaysia time (midnight Pacific) · in ${hoursUntil(q.resets_at)}`}
    >
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {["Model", "Role", "Used", "Left"].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(
                    "border-line text-muted-foreground border-b px-2 py-2 text-xs font-semibold",
                    i >= 2 ? "text-right" : "text-left",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tone: Tone =
                r.remaining === null ? "neutral" : r.limit_rpd && r.remaining / r.limit_rpd < 0.1 ? "bad" : r.limit_rpd && r.remaining / r.limit_rpd < 0.3 ? "warn" : "good";
              return (
                <tr key={`${r.role}-${r.model}`}>
                  <td className="border-line border-b px-2 py-2.5 break-all">{r.model}</td>
                  <td className="border-line text-muted-foreground border-b px-2 py-2.5">{r.role}</td>
                  <td className="border-line border-b px-2 py-2.5 text-right tabular-nums whitespace-nowrap">
                    {r.calls_today.toLocaleString()}
                    {r.limit_rpd !== null && ` / ${r.limit_rpd.toLocaleString()}`}
                  </td>
                  <td className="border-line border-b px-2 py-2.5 text-right">
                    <ToneChip tone={tone}>{r.remaining === null ? "Limit unknown" : r.remaining.toLocaleString()}</ToneChip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-2.5 text-sm">
        Only successful calls are counted, so &quot;Left&quot; may be a little lower in reality.
      </p>
    </SummaryCard>
  );
}

export function RecentRunsCard({ status }: { status: PipelineStatus }) {
  const runs = status.recent_runs;
  return (
    <SummaryCard id="runs" title="Recent runs" link={{ href: "/admin/jobs", label: "All jobs" }}>
      {runs.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">No review runs yet. Runs started from this page appear here.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Run", "When", "Result"].map((h) => (
                  <th key={h} scope="col" className="border-line text-muted-foreground border-b px-2 py-2 text-left text-xs font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const running = r.status === "queued" || r.status === "processing" || r.status === "cancelling";
                const chip: { tone: Tone; text: string } = running
                  ? { tone: "active", text: "Running" }
                  : r.status === "failed"
                    ? { tone: "bad", text: "Stopped early" }
                    : r.failed > 0
                      ? { tone: "bad", text: `${r.succeeded} done · ${r.failed} failed` }
                      : { tone: "good", text: `${r.succeeded} done` };
                const why = r.status === "failed" ? r.error_message : r.first_error?.error;
                return (
                  <tr key={r.job_id}>
                    <td className="border-line border-b px-2 py-2.5">{jobTypeLabel(r.job_type)}</td>
                    <td className="border-line text-muted-foreground border-b px-2 py-2.5 whitespace-nowrap">
                      {timeAgo(r.finished_at ?? r.created_at)}
                    </td>
                    <td className="border-line border-b px-2 py-2.5">
                      <ToneChip tone={chip.tone}>{chip.text}</ToneChip>
                      {why && <div className="text-muted-foreground mt-1 text-xs break-words">{why}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SummaryCard>
  );
}
