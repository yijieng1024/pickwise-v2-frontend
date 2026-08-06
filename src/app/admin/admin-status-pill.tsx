import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Four tones, not one per status value.
 *
 * The portal has eight separate status vocabularies (see `admin.md` §10) and
 * they were previously restyled by hand in eleven files, which let the same
 * word drift between screens. Mapping every vocabulary onto four tones here
 * keeps them consistent and, more importantly, keeps the *tone* judgements in
 * one reviewable place:
 *
 *   neutral  nothing has happened yet, or it was deliberately skipped
 *   active   in flight
 *   good     finished successfully
 *   warn     needs a look, but is not broken and often self-heals
 *   bad      genuinely failed and will not recover on its own
 */
export type Tone = "neutral" | "active" | "good" | "warn" | "bad";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted-foreground",
  active: "bg-brand-tint text-brand",
  good: "bg-positive/10 text-positive",
  warn: "bg-warning/10 text-warning",
  bad: "bg-negative/10 text-negative",
};

interface Entry {
  label: string;
  tone: Tone;
}

/**
 * `failed` here is deliberately `warn`, not `bad`: a failed scrape target is
 * retried automatically on the next bulk run, so red would overstate it.
 *
 * `parsed` and `completed` are both success and differ only in how the data
 * arrived, so they share a tone and carry the distinction in their label.
 */
const SCRAPE: Record<string, Entry> = {
  pending: { label: "Pending", tone: "neutral" },
  html_uploaded: { label: "HTML received", tone: "active" },
  parsed: { label: "Done · uploaded", tone: "good" },
  completed: { label: "Done · scraped", tone: "good" },
  failed: { label: "Retry next run", tone: "warn" },
  skipped: { label: "Skipped", tone: "neutral" },
};

/** Raw collected records. Here `failed` really is stuck until someone looks. */
const RAW: Record<string, Entry> = {
  pending: { label: "Pending", tone: "neutral" },
  processing: { label: "Processing", tone: "active" },
  completed: { label: "Processed", tone: "good" },
  failed: { label: "Failed", tone: "bad" },
};

/**
 * Background runs. `failed` means the run itself crashed — a run whose items
 * failed is still `completed`, and its failure count is reported separately.
 */
const JOB: Record<string, Entry> = {
  queued: { label: "Queued", tone: "neutral" },
  processing: { label: "Running", tone: "active" },
  completed: { label: "Completed", tone: "good" },
  failed: { label: "Crashed", tone: "bad" },
};

const REVIEW: Record<string, Entry> = {
  pending: { label: "Needs a decision", tone: "warn" },
  matched: { label: "Matched", tone: "good" },
  rejected: { label: "Rejected", tone: "neutral" },
};

const USER_STATUS: Record<string, Entry> = {
  active: { label: "Active", tone: "good" },
  inactive: { label: "Inactive", tone: "neutral" },
  suspended: { label: "Suspended", tone: "bad" },
};

const USER_ROLE: Record<string, Entry> = {
  admin: { label: "Admin", tone: "active" },
  user: { label: "User", tone: "neutral" },
};

/** Per-file outcome of a manual HTML upload. */
const UPLOAD: Record<string, Entry> = {
  matched: { label: "Stored", tone: "good" },
  unmatched: { label: "No queue row", tone: "warn" },
  invalid: { label: "Not a product page", tone: "bad" },
};

const AGENT: Record<string, Entry> = {
  success: { label: "Success", tone: "good" },
  error: { label: "Error", tone: "bad" },
};

const VOCABULARIES = {
  scrape: SCRAPE,
  raw: RAW,
  job: JOB,
  review: REVIEW,
  userStatus: USER_STATUS,
  userRole: USER_ROLE,
  upload: UPLOAD,
  agent: AGENT,
} satisfies Record<string, Record<string, Entry>>;

export type Vocabulary = keyof typeof VOCABULARIES;

export function AdminStatusPill({
  kind,
  value,
  className,
}: {
  kind: Vocabulary;
  value: string;
  className?: string;
}) {
  // An unrecognised value is shown rather than swallowed — a new backend
  // status should be visible, not silently rendered as blank.
  const entry = VOCABULARIES[kind][value] ?? { label: value, tone: "neutral" as Tone };
  return (
    <Badge className={cn(TONE_CLASS[entry.tone], className)}>{entry.label}</Badge>
  );
}

/** The tone alone, for callers that style something other than a badge. */
export function statusTone(kind: Vocabulary, value: string): Tone {
  return VOCABULARIES[kind][value]?.tone ?? "neutral";
}

export function toneClass(tone: Tone): string {
  return TONE_CLASS[tone];
}
