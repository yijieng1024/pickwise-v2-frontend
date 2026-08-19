import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Four tones, not one per status value.
 *
 * The portal has eleven separate status vocabularies (see `admin.md` §10) and
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

/**
 * The tone's own colour as the label, on a 15% wash of itself.
 *
 * THIS IS A DELIBERATE TRADE, MADE WITH EYES OPEN — it was the other way
 * around before (a 30% wash under a plain `--foreground` label), and the
 * reason it changed is that the tinted-text badge is the look the portal
 * wants. Two things follow, and neither should be "fixed" by accident:
 *
 * 1. THE WASH DROPPED FROM 30% TO 15%. Once the label carries the colour, the
 *    fill no longer has to; and a tone on a wash of ITSELF gets less legible
 *    the deeper the wash goes, so the fill is now as light as it can be while
 *    still reading as a pill.
 *
 * 2. CONTRAST IS BELOW AA FOR MOST TONES, AND THAT IS THE COST. Measured on
 *    `--card` at 15% (light / dark): neutral 3.93 / 5.41, active 10.03 / 3.18,
 *    good 4.09 / 7.56, warn 4.08 / 7.78, bad 5.11 / 5.18. AA for text this
 *    size is 4.5, so `neutral` and `active`-in-dark are the weak ones, with
 *    `good`/`warn` light sitting just under. The previous scheme measured
 *    8.3:1 or better everywhere, which is what was given up. Deepening the
 *    wash makes this strictly worse — at 30% every tone lands between 2.65 and
 *    7.27 — so if these ever need to pass AA, the fix is a darker text-only
 *    variant of each token, not a heavier fill.
 */
const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted-foreground/15 text-muted-foreground",
  active: "bg-brand/15 text-brand",
  good: "bg-positive/15 text-positive",
  warn: "bg-warning/15 text-warning",
  bad: "bg-negative/15 text-negative",
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

/**
 * Catalog listing state. Same three words and tones as USER_STATUS today, but
 * kept as its own vocabulary because it is a different domain: here the state
 * decides whether a laptop appears in public browse, agent search, and
 * conversation shortlists, and the two are free to diverge.
 */
const LAPTOP_STATUS: Record<string, Entry> = {
  active: { label: "Active", tone: "good" },
  inactive: { label: "Inactive", tone: "neutral" },
  suspended: { label: "Suspended", tone: "bad" },
};

/**
 * A boolean on/off switch — `is_active` on brands, product types and
 * categories, `active` on review sources. Off is **neutral, not bad**: nothing
 * failed, someone turned it off on purpose. Four screens rendered this red
 * before, which put a deliberately-disabled category in the same colour as a
 * crashed job, and made the word "Inactive" mean one thing on /admin/laptops
 * and something more alarming two screens away.
 *
 * Pass the boolean directly — `value` accepts one and stringifies it.
 */
const ENABLED: Record<string, Entry> = {
  true: { label: "Active", tone: "good" },
  false: { label: "Inactive", tone: "neutral" },
};

/**
 * Whether a human has confirmed an auto-generated laptop family. Unverified is
 * neutral because it is the starting state of every auto-created family — a
 * queue to work through, not a fault. It reads as the same "nobody has got to
 * this yet" grey as an inactive row, which is exactly right.
 */
const VERIFIED: Record<string, Entry> = {
  true: { label: "Verified", tone: "good" },
  false: { label: "Unverified", tone: "neutral" },
};

/**
 * How much a review source is trusted. Tier 2 is `neutral`, not `warn` — a
 * tier-2 channel is a perfectly good source that simply carries less weight,
 * and amber would read as a problem with the channel.
 */
const TRUST_TIER: Record<string, Entry> = {
  tier_1: { label: "Tier 1", tone: "active" },
  tier_2: { label: "Tier 2", tone: "neutral" },
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
  laptopStatus: LAPTOP_STATUS,
  enabled: ENABLED,
  verified: VERIFIED,
  trustTier: TRUST_TIER,
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
  /** A status string, or the boolean itself for the `enabled`/`verified`
   * vocabularies — stringified here so callers don't each write String(). */
  value: string | boolean;
  className?: string;
}) {
  const key = String(value);
  // An unrecognised value is shown rather than swallowed — a new backend
  // status should be visible, not silently rendered as blank.
  const entry = VOCABULARIES[kind][key] ?? { label: key, tone: "neutral" as Tone };
  return (
    <Badge className={cn(TONE_CLASS[entry.tone], className)}>{entry.label}</Badge>
  );
}

/** The tone alone, for callers that style something other than a badge. */
export function statusTone(kind: Vocabulary, value: string | boolean): Tone {
  return VOCABULARIES[kind][String(value)]?.tone ?? "neutral";
}

export function toneClass(tone: Tone): string {
  return TONE_CLASS[tone];
}
