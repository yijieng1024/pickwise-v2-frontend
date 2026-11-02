"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type BaseCodeLaptop,
  type GuideLaptop,
  type GuideRow,
  type MatchedLaptop,
  type PriceGuide,
  type PriceGuideKind,
  type PriceGuidePreview,
  type AmbiguousRow,
  type ConflictLaptop,
  type ExtractionRun,
  type SuffixRuleLaptop,
  applyPriceGuide,
  deletePriceGuide,
  getExtractionRun,
  getPriceGuidePreview,
  listPriceGuides,
  startPriceGuideExtraction,
  writeGuidePrices,
} from "@/lib/api/admin/price-guides";
import { ApiError } from "@/lib/api/client";
import { useJob } from "@/lib/admin/use-job";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminJobPanel } from "../admin-job-panel";
import { OutcomeAlert } from "../admin-outcome-alert";
import { AdminPageHeader } from "../admin-page-header";
import { useAdminQuery } from "../admin-query-state";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminStatusPill } from "../admin-status-pill";

const KINDS: Array<{ value: PriceGuideKind; label: string }> = [
  { value: "consumer", label: "Consumer" },
  { value: "rog", label: "ROG" },
  { value: "business", label: "Business" },
];

const WORKFLOW_URL =
  "https://github.com/yijieng1024/pickwise-v2-backend/actions/workflows/price-guide.yml";
const EXTRACT_POLL_MS = 15_000;
/** How long a started extraction may take to show up at GitHub as a run. */
const RUN_START_WAIT_MS = 3 * 60_000;

type Outcome =
  | "matched"
  | "matched_by_suffix_rule"
  | "matched_by_base_code"
  | "ambiguous"
  | "conflict"
  | "unmatched_guide"
  | "unpriced"
  | "differs_from_guide"
  | "uncovered";

const OUTCOMES: Array<{ value: Outcome; label: string; hint: string }> = [
  {
    value: "matched",
    label: "Matched",
    hint: "An apply writes these. Laptops already at the guide's price only move Last Checked.",
  },
  {
    value: "matched_by_suffix_rule",
    label: "Suffix rule (confirm)",
    hint: "These match only if -W and -WP are the same SKU, so an apply skips them. Check the two SKUs, then select the ones that are right.",
  },
  {
    value: "matched_by_base_code",
    label: "Base code (confirm)",
    hint: "The catalog name lacks this SKU's full model code, so these match on the base code and specs only, and an apply skips them. Check each one is this machine, then select the ones that are right. Adding the full code to the laptop's name makes it a direct match.",
  },
  {
    value: "ambiguous",
    label: "Ambiguous",
    hint: "This guide row could be any of several laptops, so nothing is written.",
  },
  {
    value: "conflict",
    label: "Conflict",
    hint: "Guide rows claim this laptop at different prices, or the guide and the catalog state different panels, so nothing is written. Prices already on the site stay as they are.",
  },
  {
    value: "unmatched_guide",
    label: "Not in catalog",
    hint: "No laptop in the catalog matches these guide rows.",
  },
  {
    value: "unpriced",
    label: "Unpriced",
    hint: "The guide lists these SKUs without a price.",
  },
  {
    value: "differs_from_guide",
    label: "Differs from guide",
    hint: "The stored price came from a page or an admin, so an apply leaves it. Select the ones the guide should replace.",
  },
  {
    value: "uncovered",
    label: "Not in this guide",
    hint: "ASUS laptops this guide has no row for. Most already have a price, and another guide may cover them.",
  },
];

function kindLabel(kind: PriceGuideKind): string {
  return KINDS.find((k) => k.value === kind)?.label ?? kind;
}

function rm(price: number | null): string {
  return price ? `RM ${price.toLocaleString()}` : "No price";
}

function rowsText(rows: GuideRow[], value: (row: GuideRow) => string | number): string {
  return rows.map(value).join(", ");
}

interface Column<T> {
  head: string;
  cell: (row: T) => React.ReactNode;
}

const skuColumn: Column<GuideRow> = {
  head: "SKU",
  cell: (r) => <span className="font-mono text-[12px]">{r.sku}</span>,
};
const guidePriceColumn: Column<GuideRow> = {
  head: "Guide price",
  cell: (r) => <span className="tabular-nums">{rm(r.price_rm)}</span>,
};
const pageColumn: Column<GuideRow> = {
  head: "Page",
  cell: (r) => <span className="tabular-nums">{r.page}</span>,
};

const laptopColumn: Column<GuideLaptop> = {
  head: "Laptop",
  cell: (l) => (
    <Link
      href={`/admin/catalog/laptops/${l.id}/edit`}
      className="text-brand-text text-[13px] font-medium hover:underline"
    >
      {l.product_name}
    </Link>
  ),
};
const currentPriceColumn: Column<GuideLaptop> = {
  head: "Current price",
  cell: (l) => <span className="tabular-nums">{rm(l.price_rm)}</span>,
};
const statusColumn: Column<GuideLaptop> = {
  head: "Status",
  cell: (l) => <AdminStatusPill kind="laptopStatus" value={l.status} />,
};

const matchedSkuColumn: Column<{ rows: GuideRow[] }> = {
  head: "SKU",
  cell: (l) => <span className="font-mono text-[12px]">{rowsText(l.rows, (r) => r.sku)}</span>,
};
const matchedPageColumn: Column<{ rows: GuideRow[] }> = {
  head: "Page",
  cell: (l) => (
    <span className="tabular-nums">{[...new Set(l.rows.map((r) => r.page))].join(", ")}</span>
  ),
};
const newPriceColumn: Column<MatchedLaptop | SuffixRuleLaptop | BaseCodeLaptop> = {
  head: "Guide price",
  cell: (l) => <span className="tabular-nums">{rm(l.guide_price_rm)}</span>,
};

const MATCHED_COLUMNS: Array<Column<MatchedLaptop>> = [
  laptopColumn,
  matchedSkuColumn,
  matchedPageColumn,
  currentPriceColumn,
  newPriceColumn,
  { head: "Apply will", cell: (l) => (l.action === "fill" ? "Write the price" : "Keep the price") },
  statusColumn,
];

const DIFFERS_COLUMNS: Array<Column<MatchedLaptop>> = [
  laptopColumn,
  matchedSkuColumn,
  matchedPageColumn,
  currentPriceColumn,
  newPriceColumn,
  { head: "Price came from", cell: (l) => l.price_source ?? "Not recorded" },
  statusColumn,
];

const SUFFIX_COLUMNS: Array<Column<SuffixRuleLaptop>> = [
  laptopColumn,
  {
    head: "Catalog SKU",
    cell: (l) => <span className="font-mono text-[12px]">{l.catalog_sku}</span>,
  },
  { head: "Guide SKU", cell: (l) => <span className="font-mono text-[12px]">{l.guide_sku}</span> },
  matchedPageColumn,
  currentPriceColumn,
  newPriceColumn,
  statusColumn,
];

const BASE_CODE_COLUMNS: Array<Column<BaseCodeLaptop>> = [
  laptopColumn,
  matchedSkuColumn,
  matchedPageColumn,
  currentPriceColumn,
  newPriceColumn,
  statusColumn,
];

const AMBIGUOUS_COLUMNS: Array<Column<AmbiguousRow>> = [
  skuColumn,
  guidePriceColumn,
  pageColumn,
  {
    head: "Could be",
    cell: (r) => (
      <ul className="flex flex-col gap-0.5">
        {r.candidates.map((c) => (
          <li key={c.id}>{laptopColumn.cell(c)}</li>
        ))}
      </ul>
    ),
  },
];

const CONFLICT_COLUMNS: Array<Column<ConflictLaptop>> = [
  laptopColumn,
  currentPriceColumn,
  {
    head: "Why",
    cell: (l) =>
      l.reason === "panel"
        ? `Panel: catalog says ${l.catalog_panel}, guide says ${l.rows.find((r) => r.panel)?.panel}`
        : "Different prices",
  },
  {
    head: "Guide rows",
    cell: (l) => (
      <ul className="flex flex-col gap-0.5 text-[12.5px] tabular-nums">
        {l.rows.map((r) => (
          <li key={r.sku}>
            <span className="font-mono text-[12px]">{r.sku}</span>: {rm(r.price_rm)} (page {r.page})
          </li>
        ))}
      </ul>
    ),
  },
];

const GUIDE_ROW_COLUMNS: Array<Column<GuideRow>> = [skuColumn, guidePriceColumn, pageColumn];
const UNPRICED_COLUMNS: Array<Column<GuideRow>> = [skuColumn, pageColumn];
const UNCOVERED_COLUMNS: Array<Column<GuideLaptop>> = [
  laptopColumn,
  currentPriceColumn,
  statusColumn,
];

function OutcomeTable<T>({
  rows,
  columns,
  rowKey,
  selected,
  onSelectedChange,
}: {
  rows: T[];
  columns: Array<Column<T>>;
  rowKey: (row: T) => string;
  /** Leave out for a list "Use guide price" does not serve. */
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
}) {
  if (rows.length === 0) {
    return <AdminEmptyState icon={FileText} title="Nothing in this group" />;
  }

  const keys = rows.map(rowKey);
  const allSelected = !!selected && keys.every((k) => selected.has(k));

  function toggle(toggled: string[], on: boolean) {
    const next = new Set(selected);
    toggled.forEach((k) => (on ? next.add(k) : next.delete(k)));
    onSelectedChange?.(next);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {selected && (
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => toggle(keys, !allSelected)}
                aria-label="Select all rows in this group"
              />
            </TableHead>
          )}
          {columns.map((c) => (
            <TableHead key={c.head}>{c.head}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const key = rowKey(row);
          return (
            <TableRow key={key}>
              {selected && (
                <TableCell>
                  <Checkbox
                    checked={selected.has(key)}
                    onCheckedChange={() => toggle([key], !selected.has(key))}
                    aria-label={`Select row ${index + 1}`}
                  />
                </TableCell>
              )}
              {columns.map((c) => (
                <TableCell key={c.head} className="text-[13px] whitespace-normal">
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function OutcomeRows({
  outcome,
  preview,
  selected,
  onSelectedChange,
}: {
  outcome: Outcome;
  preview: PriceGuidePreview;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
}) {
  const laptopId = (l: GuideLaptop) => l.id;
  const sku = (r: GuideRow) => r.sku;
  const selection = { selected, onSelectedChange };

  switch (outcome) {
    case "matched":
      return <OutcomeTable rows={preview.matched} columns={MATCHED_COLUMNS} rowKey={laptopId} />;
    case "matched_by_suffix_rule":
      return (
        <OutcomeTable
          rows={preview.matched_by_suffix_rule}
          columns={SUFFIX_COLUMNS}
          rowKey={laptopId}
          {...selection}
        />
      );
    case "matched_by_base_code":
      return (
        <OutcomeTable
          rows={preview.matched_by_base_code}
          columns={BASE_CODE_COLUMNS}
          rowKey={laptopId}
          {...selection}
        />
      );
    case "ambiguous":
      return <OutcomeTable rows={preview.ambiguous} columns={AMBIGUOUS_COLUMNS} rowKey={sku} />;
    case "conflict":
      return <OutcomeTable rows={preview.conflict} columns={CONFLICT_COLUMNS} rowKey={laptopId} />;
    case "unmatched_guide":
      return (
        <OutcomeTable rows={preview.unmatched_guide} columns={GUIDE_ROW_COLUMNS} rowKey={sku} />
      );
    case "unpriced":
      return <OutcomeTable rows={preview.unpriced} columns={UNPRICED_COLUMNS} rowKey={sku} />;
    case "differs_from_guide":
      return (
        <OutcomeTable
          rows={preview.differs_from_guide}
          columns={DIFFERS_COLUMNS}
          rowKey={laptopId}
          {...selection}
        />
      );
    case "uncovered":
      return (
        <OutcomeTable
          // The ones with no price are the ones an admin has to act on. 0 is "unknown".
          rows={[...preview.uncovered].sort((a, b) => Number(a.price_rm > 0) - Number(b.price_rm > 0))}
          columns={UNCOVERED_COLUMNS}
          rowKey={laptopId}
        />
      );
  }
}

export default function AdminPriceGuidesPage() {
  const { token } = useAuth();
  const query = useAdminQuery({ filters: { guide: "", outcome: "matched" } });

  const [guides, setGuides] = useState<PriceGuide[] | null>(null);
  const [preview, setPreview] = useState<PriceGuidePreview | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [driveLink, setDriveLink] = useState("");
  const [kind, setKind] = useState<PriceGuideKind | null>(null);
  const [starting, setStarting] = useState(false);
  // `runId` is null until GitHub shows the run: a dispatch may not name it, so then
  // the first run that isn't `previousRunId` is ours.
  const [waiting, setWaiting] = useState<{
    runId: number | null;
    previousRunId: number | null;
    since: number;
  } | null>(null);
  const [run, setRun] = useState<ExtractionRun | null>(null);
  const [runUnreadable, setRunUnreadable] = useState(false);
  const [noRunStarted, setNoRunStarted] = useState(false);
  const [finished, setFinished] = useState<ExtractionRun | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmUse, setConfirmUse] = useState(false);
  const [applying, setApplying] = useState(false);
  const [writing, setWriting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PriceGuide | null>(null);
  const [deleting, setDeleting] = useState(false);
  const job = useJob(token, () => setReloadTick((t) => t + 1));

  // A hand-edited ?guide= falls back to the newest rather than a dead page.
  const guide = guides?.find((g) => g.id === query.values.guide) ?? guides?.[0] ?? null;
  const guideId = guide?.id ?? null;
  const outcome =
    OUTCOMES.find((o) => o.value === query.values.outcome) ?? OUTCOMES[0];

  // The rows a selection refers to are gone once the guide changes or the
  // preview reloads. "Adjust state during render", as on /admin/queue.
  const previewSig = `${guideId}|${reloadTick}`;
  const [prevPreviewSig, setPrevPreviewSig] = useState(previewSig);
  if (previewSig !== prevPreviewSig) {
    setPrevPreviewSig(previewSig);
    setPreview(null);
    setPreviewError(null);
    setSelected(new Set());
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listPriceGuides(token)
      .then((list) => {
        if (cancelled) return;
        setGuides(list);
        setListError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setListError(err instanceof ApiError ? err.message : "Couldn't load the guides.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  useEffect(() => {
    if (!token || !guideId) return;
    let cancelled = false;
    getPriceGuidePreview(token, guideId)
      .then((next) => {
        if (!cancelled) setPreview(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setPreviewError(err instanceof ApiError ? err.message : "Couldn't load the preview.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, guideId, reloadTick]);

  // A run that is still going, found on load: GitHub knows, so a reload loses nothing.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getExtractionRun(token)
      .then((latest) => {
        if (cancelled || !latest || latest.status === "completed") return;
        setRun(latest);
        setWaiting({ runId: latest.run_id, previousRunId: null, since: Date.now() });
      })
      .catch(() => {
        // This only finds a run already going. Starting one reports its own errors.
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !waiting) return;
    const timer = setInterval(async () => {
      try {
        const next = await getExtractionRun(token, waiting.runId ?? undefined);
        setRunUnreadable(false);
        if (!next || next.run_id === waiting.previousRunId) {
          if (Date.now() - waiting.since > RUN_START_WAIT_MS) {
            setWaiting(null);
            setNoRunStarted(true);
          }
          return;
        }
        setRun(next);
        if (next.status !== "completed") return;
        setWaiting(null);
        setFinished(next);
        setReloadTick((t) => t + 1);
      } catch {
        // A failed poll says nothing about the workflow. The next tick retries.
        setRunUnreadable(true);
      }
    }, EXTRACT_POLL_MS);
    return () => clearInterval(timer);
  }, [token, waiting]);

  async function startExtraction(event: FormEvent) {
    event.preventDefault();
    if (!token || !kind || !guides) return;
    setStarting(true);
    try {
      // Read first: when the dispatch names no run, this is how ours is told apart.
      const previous = await getExtractionRun(token);
      const started = await startPriceGuideExtraction(token, driveLink.trim(), kind);
      setRun(null);
      setRunUnreadable(false);
      setWaiting({
        runId: started.run_id,
        previousRunId: previous?.run_id ?? null,
        since: Date.now(),
      });
      setNoRunStarted(false);
      setFinished(null);
      setDriveLink("");
      toast.success("Extraction started.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start the extraction.");
    } finally {
      setStarting(false);
    }
  }

  async function apply() {
    if (!token || !guideId) return;
    setApplying(true);
    try {
      job.start(await applyPriceGuide(token, guideId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start the apply.");
    } finally {
      setApplying(false);
    }
  }

  async function writeSelectedPrices() {
    if (!token || !guideId) return;
    setWriting(true);
    try {
      const { updated } = await writeGuidePrices(token, guideId, [...selected]);
      toast.success(`${updated} ${updated === 1 ? "price" : "prices"} updated.`);
      setReloadTick((t) => t + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code !== "job_running") {
        // The backend's message is a list of raw ids.
        toast.error("Nothing was written: a selected laptop has left the list. Check the refreshed list.");
        setReloadTick((t) => t + 1);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Couldn't update the prices.");
      }
    } finally {
      setWriting(false);
    }
  }

  async function deleteGuide() {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await deletePriceGuide(token, deleteTarget.id);
      // A viewed guide leaves the list, so `guide` falls back to the newest and
      // the preview resets on its own.
      setGuides((list) => list?.filter((g) => g.id !== deleteTarget.id) ?? null);
      if (finished?.guide_id === deleteTarget.id) setFinished(null);
      toast.success(`${deleteTarget.filename} deleted.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the guide.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const busy = applying || writing || job.isRunning;
  const fillCount = preview?.matched.filter((m) => m.action === "fill").length ?? 0;
  const keepCount = (preview?.matched.length ?? 0) - fillCount;
  const noPriceCount = preview?.uncovered.filter((l) => !l.price_rm).length ?? 0;
  const hint =
    outcome.value === "uncovered"
      ? `${outcome.hint} ${noPriceCount} ${noPriceCount === 1 ? "has" : "have"} no price.`
      : outcome.hint;
  const selectedRows = [
    ...(preview?.differs_from_guide ?? []),
    ...(preview?.matched_by_suffix_rule ?? []),
    ...(preview?.matched_by_base_code ?? []),
  ].filter((row) => selected.has(row.id));

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Price Guides"
        description="ASUS and ROG prices from the product guide PDFs. Extracting a guide only stores its rows; no laptop changes until you apply it here."
        action={
          <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      <Card className="gap-0 p-4">
        <form onSubmit={startExtraction} className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-64 flex-1 flex-col gap-1.5">
            <label htmlFor="guide-drive-link" className="text-[12.5px] font-medium">
              Drive link
            </label>
            <Input
              id="guide-drive-link"
              placeholder="https://drive.google.com/file/d/…"
              autoComplete="off"
              spellCheck={false}
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium">Guide</span>
            <Select
              items={KINDS}
              value={kind}
              onValueChange={(v) => setKind(v as PriceGuideKind)}
            >
              <SelectTrigger aria-label="Guide" className="w-40">
                <SelectValue placeholder="Choose a guide" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!driveLink.trim() || !kind || !guides || starting || waiting !== null}
          >
            {starting && <Spinner data-icon="inline-start" />}
            Start extraction
          </Button>
        </form>
        <p className="text-muted-foreground mt-2.5 text-[12px]">
          The PDF must be in the Drive folder shared with the service account.
        </p>
      </Card>

      {waiting && (
        <Card className="gap-0 p-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-[13.5px] font-semibold">
              <Loader2 className="text-muted-foreground size-3.5 motion-safe:animate-spin" />
              {run?.status === "in_progress"
                ? (run.step ?? "Running")
                : "Waiting for GitHub to start the run"}
            </span>
            <span className="text-muted-foreground text-[12.5px] tabular-nums">
              Started{" "}
              {new Date(run?.created_at ?? waiting.since).toLocaleTimeString("en-MY", {
                timeStyle: "short",
              })}
            </span>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setWaiting(null)}>
              Stop waiting
            </Button>
          </div>
          <p className="text-muted-foreground mt-1 text-[12.5px]">
            Extraction runs in GitHub Actions and usually takes a few minutes.{" "}
            {runUnreadable && "GitHub isn't answering right now, so this is still trying. "}
            <a
              href={run?.url ?? WORKFLOW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-text inline-flex items-center gap-1 hover:underline"
            >
              Open the run <ExternalLink className="size-3" />
            </a>
          </p>
        </Card>
      )}

      {noRunStarted && (
        <OutcomeAlert status="warning" title="GitHub didn't start a run">
          Nothing showed up after 3 minutes. Check the{" "}
          <a href={WORKFLOW_URL} target="_blank" rel="noopener noreferrer" className="underline">
            workflow&apos;s page
          </a>
          , then start the extraction again.
        </OutcomeAlert>
      )}

      {finished &&
        (finished.conclusion !== "success" ? (
          <OutcomeAlert status="error" title="The extraction didn't finish">
            {finished.step ? `It stopped at "${finished.step}". ` : ""}Nothing was stored. The{" "}
            <a href={finished.url} target="_blank" rel="noopener noreferrer" className="underline">
              run&apos;s log
            </a>{" "}
            says why.
          </OutcomeAlert>
        ) : !finished.is_new_guide ? (
          <OutcomeAlert status="info" title={finished.filename ?? "The run finished"}>
            {finished.note ?? "It left no record of what it did."} No new guide was added.
          </OutcomeAlert>
        ) : (
          <OutcomeAlert status="success" title={`${finished.filename} is ready`}>
            {finished.note}.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                query.set({ guide: finished.guide_id ?? "", outcome: "matched" });
                setFinished(null);
              }}
            >
              Open its preview
            </button>
          </OutcomeAlert>
        ))}

      <Card className="py-0">
        {listError ? (
          <AdminErrorState message={listError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : guides === null ? (
          <AdminLoadingState />
        ) : guides.length === 0 ? (
          <AdminEmptyState
            icon={FileText}
            title="No guides yet"
            description="Paste a Drive link above to extract the first one."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Guide</TableHead>
                <TableHead>Edition</TableHead>
                <TableHead>Stored</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead className="w-44" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {guides.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="text-[13px] font-medium whitespace-normal">
                    {g.filename}
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {kindLabel(g.kind)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[12.5px] whitespace-normal">
                    {g.edition_text ?? "Not stated"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[12.5px] tabular-nums">
                    {new Date(g.uploaded_at).toLocaleDateString("en-MY", { dateStyle: "medium" })}
                  </TableCell>
                  <TableCell className="text-[13px] tabular-nums">
                    {g.row_count.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant={g.id === guideId ? "secondary" : "outline"}
                        aria-pressed={g.id === guideId}
                        onClick={() => query.set({ guide: g.id })}
                      >
                        {g.id === guideId ? "Viewing" : "View"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${g.filename}`}
                        // A run could write to the guide while it is being deleted.
                        disabled={busy || waiting !== null}
                        onClick={() => setDeleteTarget(g)}
                      >
                        <Trash2 data-icon="inline-start" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {guide && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[15px] font-semibold">Preview of {guide.filename}</h2>
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => setConfirmApply(true)}
              disabled={busy || !preview || preview.matched.length === 0}
            >
              {(applying || job.isRunning) && <Spinner data-icon="inline-start" />}
              Apply guide
            </Button>
          </div>

          {job.accepted && (job.isRunning || job.job?.params.guide_id === guideId) && (
            <AdminJobPanel accepted={job.accepted} job={job.job} pollError={job.pollError} />
          )}

          {previewError ? (
            <Card className="py-0">
              <AdminErrorState message={previewError} onRetry={() => setReloadTick((t) => t + 1)} />
            </Card>
          ) : preview === null ? (
            <Card className="py-0">
              <AdminLoadingState />
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {OUTCOMES.map((o) => {
                  const active = o.value === outcome.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => query.set({ outcome: o.value })}
                      aria-pressed={active}
                      className={cn(
                        "focus-visible:ring-ring/50 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors outline-none focus-visible:ring-3",
                        active
                          ? "bg-brand border-transparent text-white"
                          : "border-line bg-surface hover:bg-surface-2",
                      )}
                    >
                      {o.label}
                      <span className={cn("tabular-nums", !active && "text-muted-foreground")}>
                        {preview[o.value].length}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-muted-foreground text-[12.5px]">{hint}</p>

              {selected.size > 0 && (
                <Card className="bg-brand-tint gap-0 border-transparent p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-brand-text text-[13px] font-semibold">
                      {selected.size} selected
                    </span>
                    <span className="text-brand-text text-[12.5px]">
                      Across the selectable groups.
                    </span>
                    <div className="ml-auto flex gap-3">
                      <Button size="sm" onClick={() => setConfirmUse(true)} disabled={busy}>
                        Use guide price
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                        Clear
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="py-0">
                <OutcomeRows
                  outcome={outcome.value}
                  preview={preview}
                  selected={selected}
                  onSelectedChange={setSelected}
                />
              </Card>
            </>
          )}
        </>
      )}

      <AlertDialog open={confirmApply} onOpenChange={setConfirmApply}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this guide to live prices?</AlertDialogTitle>
            <AlertDialogDescription>
              {`${fillCount} ${fillCount === 1 ? "laptop gets" : "laptops get"} the guide's price on the public site, and ${keepCount} already at that price only ${keepCount === 1 ? "moves" : "move"} Last Checked. Everything in the other groups is left alone. A failed apply writes nothing.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmApply(false);
                void apply();
              }}
            >
              Apply guide
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUse} onOpenChange={setConfirmUse}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Use the guide price for {selectedRows.length}{" "}
              {selectedRows.length === 1 ? "laptop" : "laptops"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              These prices change on the public site, and a later guide can update them. If any
              laptop has left its list since this preview, nothing is written.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="divide-line border-line max-h-56 divide-y overflow-y-auto rounded-lg border">
            {selectedRows.map((row) => (
              <li key={row.id} className="px-3 py-2 text-[12.5px]">
                <div className="font-medium">{row.product_name}</div>
                <div className="text-muted-foreground tabular-nums">
                  {rm(row.price_rm)} to {rm(row.guide_price_rm)}
                </div>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmUse(false);
                void writeSelectedPrices();
              }}
            >
              Use guide price
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this guide permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                `${deleteTarget.filename} (${kindLabel(deleteTarget.kind)} guide, ${deleteTarget.row_count.toLocaleString()} ${deleteTarget.row_count === 1 ? "row" : "rows"}) is removed and this can't be undone. The PDF stays in Drive, so you can extract it again. A guide that set a laptop's price can't be deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteGuide()}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete guide"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
