"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  FileUp,
  Inbox,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { type Brand, listBrands } from "@/lib/api/admin/brands";
import {
  type RawHtmlUploadResult,
  type RawHtmlUploadSummary,
  type ScrapeTarget,
  listScrapeTargets,
  uploadHtml,
} from "@/lib/api/admin/scraper";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminPageHeader } from "../admin-page-header";
import { AdminStatusPill } from "../admin-status-pill";
import { ConsoleSnippetCard } from "./console-snippet";

/**
 * Every file is judged on its own, so a 49-file drop can be 46 stored, 2
 * unqueued and 1 unusable. Only the last of those is the admin's problem,
 * which is why `unmatched` is amber rather than red.
 */
type GroupKey = RawHtmlUploadResult["status"] | "warned";

const RESULT_META: Record<
  GroupKey,
  { label: string; className: string; icon: typeof CheckCircle2; hint: string }
> = {
  matched: {
    label: "Stored",
    className: "bg-positive/10 text-positive",
    icon: CheckCircle2,
    hint: "Matched to a queue row.",
  },
  warned: {
    label: "Stored, but check the save",
    className: "bg-warning/10 text-warning",
    icon: CircleAlert,
    hint: "The specs were stored, but the photos mostly weren't. Each file explains what to do.",
  },
  unmatched: {
    label: "No queue row",
    className: "bg-warning/10 text-warning",
    icon: CircleAlert,
    hint: "A valid product page with nothing to attach it to yet. Run the crawler for this brand, or check the brand filter.",
  },
  invalid: {
    label: "Not a product page",
    className: "bg-negative/10 text-negative",
    icon: XCircle,
    hint: "Usually the browser saved a “checking your browser” screen. Open the page again, let it finish loading, then re-save.",
  },
};

/**
 * The statuses that still need a page from a human.
 *
 * `html_uploaded` is deliberately absent — those already have their HTML and
 * are only waiting to be parsed.
 *
 * `pending` matters as much as `failed`, which this screen used to filter on
 * alone. A target the feed crawler just added starts at `pending`
 * (`ScrapeStatus.PENDING`, backend `app/scraper/models.py`) and only turns
 * `failed` once a bulk run has tried it and found no stored HTML. Filtering on
 * `failed` therefore hid every newly crawled product until a pointless scrape
 * had been run against it. The backend has always treated the two the same:
 * `bulk_scraper.py` picks up never-scraped, failed and html_uploaded together.
 */
const TODO_STATUSES = ["pending", "failed"] as const;

/** Rows fetched per status. The true totals are reported even when this cuts in. */
const TODO_LIMIT = 100;

export default function AdminUploadPage() {
  const { token } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("all");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<RawHtmlUploadSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [todo, setTodo] = useState<ScrapeTarget[] | null>(null);
  /** Server-side count, which `todo.length` understates once TODO_LIMIT bites. */
  const [todoTotal, setTodoTotal] = useState(0);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    listBrands({ isActive: true })
      .then(setBrands)
      .catch(() => toast.error("Couldn't load brands."));
  }, []);

  // Drop stale rows the moment a refresh is requested — "adjust state during
  // render", since the set-state-in-effect lint forbids the effect version.
  const todoSig = `${brandId}|${reloadTick}`;
  const [prevTodoSig, setPrevTodoSig] = useState(todoSig);
  if (todoSig !== prevTodoSig) {
    setPrevTodoSig(todoSig);
    setTodo(null);
    setTodoTotal(0);
    setTodoError(null);
  }

  // The to-do list is the point of the screen: which queue rows still have no
  // usable HTML. See TODO_STATUSES for why that is two statuses, not one.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const brand = brandId === "all" ? undefined : brandId;

    // GET /scraper/targets takes a single scrape_status, so this is two calls
    // merged rather than one filtered query.
    Promise.all(
      TODO_STATUSES.map((scrapeStatus) =>
        listScrapeTargets(token, { brandId: brand, scrapeStatus, limit: TODO_LIMIT }),
      ),
    )
      .then((responses) => {
        if (cancelled) return;
        const targets = responses.flatMap((r) => r.targets);
        // Oldest first: the ones outstanding longest are the ones to clear.
        targets.sort((a, b) => a.created_at.localeCompare(b.created_at));
        setTodo(targets);
        setTodoTotal(responses.reduce((sum, r) => sum + r.total, 0));
        setTodoError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setTodoError(err instanceof ApiError ? err.message : "Couldn't load the to-do list.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, brandId, reloadTick]);

  async function send(files: File[]) {
    if (!token || files.length === 0) return;
    const htmlFiles = files.filter((f) => /\.html?$/i.test(f.name));
    if (htmlFiles.length === 0) {
      toast.error("Those aren't saved web pages. Save the product page as HTML first.");
      return;
    }

    setUploading(true);
    setSummary(null);
    try {
      const res = await uploadHtml(token, htmlFiles, {
        brandId: brandId === "all" ? undefined : brandId,
      });
      setSummary(res);
      // Never a bare "success" — the counts are the story. A run with warnings
      // is not reported as clean, or the bad save goes unnoticed.
      const detail = [
        res.invalid > 0 ? `${res.invalid} unusable` : null,
        res.warnings > 0 ? `${res.warnings} need a better save` : null,
      ].filter(Boolean);
      const message = `${res.matched} of ${res.received} stored${
        detail.length > 0 ? `, ${detail.join(", ")}` : ""
      }.`;
      if (res.invalid > 0 || res.warnings > 0) toast.warning(message);
      else toast.success(message);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  /**
   * Worst first, so the files needing action are read before the pile that
   * worked. "Stored, but check the save" is split out of `matched` because a
   * warned file is accepted yet still worth re-doing — burying it among the
   * successes is how a bad save goes unnoticed.
   */
  const grouped = useMemo(() => {
    if (!summary) return [];
    const groups: Array<{ key: GroupKey; rows: RawHtmlUploadResult[] }> = [
      { key: "invalid", rows: summary.results.filter((r) => r.status === "invalid") },
      { key: "unmatched", rows: summary.results.filter((r) => r.status === "unmatched") },
      {
        key: "warned",
        rows: summary.results.filter((r) => r.status === "matched" && r.warning),
      },
      {
        key: "matched",
        rows: summary.results.filter((r) => r.status === "matched" && !r.warning),
      },
    ];
    return groups.filter((g) => g.rows.length > 0);
  }, [summary]);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Acer Upload"
        description="Acer's store blocks automated access, so their pages come in by hand. Run the capture script below in your browser, then drop the downloaded files here."
        action={
          <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      <Card className="gap-0 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium">Brand</span>
          <Select
            items={[
              { value: "all", label: "Detect automatically" },
              ...brands.map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={brandId}
            onValueChange={(v) => setBrandId(v as string)}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Detect automatically</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground mt-1 text-[12px]">
            Naming a brand restricts matching to it, so a mis-filed page is caught instead of
            silently attaching to the wrong product.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void send([...e.dataTransfer.files]);
            }}
            className={cn(
              "flex flex-col items-center rounded-2xl border-[1.5px] border-dashed p-8 text-center transition-colors",
              dragging ? "border-brand bg-brand-tint/50" : "border-brand/25 bg-surface",
            )}
          >
            <FileUp className="text-brand size-6" />
            <p className="mt-2.5 text-[15px] font-semibold">Drop saved pages here</p>
            <p className="text-muted-foreground mt-1.5 max-w-sm text-[12.5px] leading-relaxed">
              Any number of files at once. <strong className="font-semibold">Filenames
              don&apos;t matter</strong> — each saved page carries a hidden product tag we read
              to match it to the right queue row.
            </p>
            <p className="text-muted-foreground mt-1.5 max-w-sm text-[12.5px]">
              Re-uploading a page you already sent is fine. It refreshes a stale price.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".html,.htm"
              multiple
              className="sr-only"
              onChange={(e) => {
                void send([...(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
            <Button
              className="mt-4"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Upload data-icon="inline-start" />
              )}
              {uploading ? "Uploading…" : "Choose files"}
            </Button>
          </div>

          {/* Per-file results — a single toast is useless for 49 files. */}
          {summary && (
            <Card className="gap-0 py-0">
              <div className="border-line border-b p-4">
                <p className="text-[14px] font-semibold">
                  {summary.received} file{summary.received === 1 ? "" : "s"} received
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge className="bg-positive/10 text-positive">
                    {summary.matched} stored
                  </Badge>
                  {summary.warnings > 0 && (
                    <Badge className="bg-warning/10 text-warning">
                      {summary.warnings} need a better save
                    </Badge>
                  )}
                  {summary.unmatched > 0 && (
                    <Badge className="bg-warning/10 text-warning">
                      {summary.unmatched} without a queue row
                    </Badge>
                  )}
                  {summary.invalid > 0 && (
                    <Badge className="bg-negative/10 text-negative">
                      {summary.invalid} unusable
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-2 text-[12.5px]">
                  {summary.inserted} new record{summary.inserted === 1 ? "" : "s"},{" "}
                  {summary.updated} refreshed.
                </p>
              </div>

              <div className="max-h-[22rem] overflow-y-auto">
                {grouped.map((group) => {
                  const meta = RESULT_META[group.key];
                  const Icon = meta.icon;
                  return (
                    <div key={group.key}>
                      <div className="bg-surface-2 text-muted-foreground px-4 py-1.5 text-[11.5px] font-semibold tracking-[0.05em] uppercase">
                        {meta.label} · {group.rows.length}
                      </div>
                      <p className="text-muted-foreground border-line border-b px-4 py-2 text-[12px] leading-snug">
                        {meta.hint}
                      </p>
                      <ul className="divide-line divide-y">
                        {group.rows.map((r, i) => (
                          <li
                            key={`${r.source_name}-${i}`}
                            className="flex items-start gap-2.5 px-4 py-2.5"
                          >
                            <Icon
                              className={cn(
                                "mt-0.5 size-3.5 shrink-0",
                                group.key === "matched"
                                  ? "text-positive"
                                  : group.key === "invalid"
                                    ? "text-negative"
                                    : "text-warning",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12.5px] font-medium">
                                {r.source_name}
                              </div>
                              {(r.error || r.warning) && (
                                <div className="text-muted-foreground mt-0.5 text-[12px] leading-snug">
                                  {r.error ?? r.warning}
                                </div>
                              )}
                            </div>
                            {r.created !== null && group.key === "matched" && (
                              <span className="text-muted-foreground shrink-0 text-[11.5px]">
                                {r.created ? "new" : "updated"}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        <ConsoleSnippetCard />
      </div>

      {/* Full width: these URLs are long enough that a half-width column
          truncated most of them, and this is the list being worked through. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold tracking-tight">Still Waiting for a Page</h2>
          {/* The server count, not the row count — the two diverge past TODO_LIMIT. */}
          <span className="text-muted-foreground text-[12.5px] tabular-nums">
            {todo && todo.length < todoTotal
              ? `showing ${todo.length} of ${todoTotal}`
              : `${todoTotal} left`}
          </span>
        </div>
        <Card className="py-0">
          {todoError ? (
            <AdminErrorState message={todoError} onRetry={() => setReloadTick((t) => t + 1)} />
          ) : todo === null ? (
            <AdminLoadingState />
          ) : todo.length === 0 ? (
            <AdminEmptyState
              icon={Inbox}
              title="Nothing outstanding"
              description="Every queued page for this brand has usable HTML."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product page</TableHead>
                  <TableHead className="w-40">Brand</TableHead>
                  {/* "Pending" = never attempted; "Retry next run" = tried, no
                      HTML found. Both need the same action, but the distinction
                      says whether a scrape has already looked for this one. */}
                  <TableHead className="w-36">State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todo.map((t) => (
                  <TableRow key={t.id}>
                    {/* w-full + max-w-0 lets the cell take the leftover width
                        while still giving `truncate` something to measure —
                        an unconstrained cell would push the table wider. */}
                    <TableCell className="w-full max-w-0">
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand block truncate font-mono text-[12px] hover:underline"
                      >
                        {t.url}
                      </a>
                    </TableCell>
                    <TableCell className="w-40 text-[13px]">{t.brand_name}</TableCell>
                    <TableCell className="w-36">
                      <AdminStatusPill kind="scrape" value={t.scrape_status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
        <p className="text-muted-foreground text-[12px] leading-snug">
          Open each link, run the script above on it, and drop the downloaded files in the drop
          zone. The list shrinks as pages arrive.
        </p>
      </div>
    </div>
  );
}
