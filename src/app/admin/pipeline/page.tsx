"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Eye, Inbox, PlayCircle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { type Brand, listBrands } from "@/lib/api/admin/brands";
import {
  type RawPrice,
  type RawScrapLaptop,
  bulkScrape,
  listRawScrapLaptops,
} from "@/lib/api/admin/scraper";
import {
  type CategorizeUntaggedResult,
  type ProcessPendingResult,
  categorizeUntagged,
  processPending,
} from "@/lib/api/admin/processor";
import { ApiError } from "@/lib/api/client";
import { useJob } from "@/lib/admin/use-job";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminJobPanel } from "../admin-job-panel";
import { AdminStatusPill } from "../admin-status-pill";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminPageHeader } from "../admin-page-header";
import { AdminPagination } from "../admin-pagination";

const PAGE_SIZE = 25;

/**
 * Batch ceiling per run. The backend caps at 1500 and returns the *real*
 * pending count in the 202, which is usually smaller than this.
 */
const PROCESS_BATCH_LIMIT = 100;

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export default function AdminPipelinePage() {
  const { token } = useAuth();
  // The raw-scrap queue backs both sections (per-brand counts above, the full
  // row list below), so it's fetched once here rather than in each section.
  const [brands, setBrands] = useState<Brand[]>([]);
  const [queue, setQueue] = useState<RawScrapLaptop[] | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    listBrands()
      .then(setBrands)
      .catch(() => toast.error("Failed to load brands."));
  }, []);

  // Drop stale rows the moment a refresh is requested — "adjust state during
  // render", since the set-state-in-effect lint forbids the effect version.
  const [prevReloadTick, setPrevReloadTick] = useState(reloadTick);
  if (reloadTick !== prevReloadTick) {
    setPrevReloadTick(reloadTick);
    setQueue(null);
    setQueueError(null);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listRawScrapLaptops(token, { limit: 1000 })
      .then((res) => {
        if (cancelled) return;
        setQueue(res.items);
        setQueueError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setQueueError(
          err instanceof ApiError ? err.message : "Failed to load the raw-scrape queue.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  const brandNames = useMemo(
    () => new Map(brands.map((b) => [b.id, b.name])),
    [brands],
  );
  const reload = () => setReloadTick((t) => t + 1);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        crumbs={["Pipeline"]}
        title="Pipeline"
        description="Trigger the scraper and AI processor, and watch queue depth."
      />

      <ScraperSection
        brands={brands}
        queue={queue}
        queueError={queueError}
        onReload={reload}
      />
      <ProcessorSection
        queue={queue}
        queueError={queueError}
        brandNames={brandNames}
        onReload={reload}
      />
    </div>
  );
}

function ScraperSection({
  brands,
  queue,
  queueError,
  onReload,
}: {
  brands: Brand[];
  queue: RawScrapLaptop[] | null;
  queueError: string | null;
  onReload: () => void;
}) {
  const { token } = useAuth();
  const [brandId, setBrandId] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const scrapeJob = useJob(token);

  // Refresh the queue once the run stops, so the counts below catch up.
  const runFinished = scrapeJob.accepted !== null && !scrapeJob.isRunning;
  const [prevRunFinished, setPrevRunFinished] = useState(runFinished);
  if (runFinished !== prevRunFinished) {
    setPrevRunFinished(runFinished);
    if (runFinished) onReload();
  }

  // Only active brands can be scraped; the list itself covers all of them.
  const activeBrands = useMemo(() => brands.filter((b) => b.is_active), [brands]);
  // Default to the first brand once they load, without an effect.
  const selectedBrandId = brandId || activeBrands[0]?.id || "";

  const queueByBrand = useMemo(() => {
    const counts = new Map<string, { pending: number; completed: number; failed: number }>();
    for (const row of queue ?? []) {
      const entry = counts.get(row.brand_id) ?? { pending: 0, completed: 0, failed: 0 };
      if (row.processing_status === "pending") entry.pending += 1;
      else if (row.processing_status === "completed") entry.completed += 1;
      else if (row.processing_status === "failed") entry.failed += 1;
      counts.set(row.brand_id, entry);
    }
    return counts;
  }, [queue]);

  // Returns 202 with a job to poll — the run itself continues server-side,
  // so this only covers handing the work over, not doing it.
  async function runBulkScrape() {
    if (!token || !selectedBrandId) return;
    setStarting(true);
    try {
      const accepted = await bulkScrape(token, selectedBrandId);
      scrapeJob.start(accepted);
      toast.success(accepted.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start the scrape.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-bold tracking-tight">Scraper</h2>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          items={activeBrands.map((b) => ({ value: b.id, label: b.name }))}
          value={selectedBrandId}
          onValueChange={(v) => setBrandId(v as string)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select a brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {activeBrands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          onClick={runBulkScrape}
          disabled={starting || scrapeJob.isRunning || !selectedBrandId}
        >
          {starting || scrapeJob.isRunning ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PlayCircle data-icon="inline-start" />
          )}
          {scrapeJob.isRunning ? "Scraping…" : "Run bulk scrape"}
        </Button>
      </div>

      {scrapeJob.accepted && (
        <AdminJobPanel
          accepted={scrapeJob.accepted}
          job={scrapeJob.job}
          pollError={scrapeJob.pollError}
        />
      )}

      <Card className="py-0">
        {queueError ? (
          <AdminErrorState message={queueError} onRetry={onReload} />
        ) : queue === null ? (
          <AdminLoadingState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeBrands.map((b) => {
                const counts = queueByBrand.get(b.id) ?? { pending: 0, completed: 0, failed: 0 };
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>
                      <Badge className="bg-warning/10 text-warning tabular-nums">{counts.pending}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-positive/10 text-positive tabular-nums">{counts.completed}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-negative/10 text-negative tabular-nums">{counts.failed}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  );
}

function ProcessorSection({
  queue,
  queueError,
  brandNames,
  onReload,
}: {
  queue: RawScrapLaptop[] | null;
  queueError: string | null;
  brandNames: Map<string, string>;
  onReload: () => void;
}) {
  const { token } = useAuth();
  const [startingProcess, setStartingProcess] = useState(false);
  const [startingCategorize, setStartingCategorize] = useState(false);
  // Two trackers, because the backend happily runs both at once.
  const processJob = useJob(token);
  const categorizeJob = useJob(token);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailTarget, setDetailTarget] = useState<RawScrapLaptop | null>(null);

  // Reset pagination when the effective filter changes — "adjust state during
  // render", not an effect (see laptops-browse.tsx).
  const filterSig = `${status}|${search}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (filterSig !== prevFilterSig) {
    setPrevFilterSig(filterSig);
    setPage(1);
  }

  const filtered = useMemo(() => {
    if (!queue) return [];
    const q = search.trim().toLowerCase();
    return queue.filter((row) => {
      if (status !== "all" && row.processing_status !== status) return false;
      if (!q) return true;
      return (
        row.raw_product_name.toLowerCase().includes(q) ||
        row.source_url.toLowerCase().includes(q)
      );
    });
  }, [queue, status, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // A job's `result` is only populated once the run completes; its shape is
  // determined by the job type, so the cast is the contract.
  const processResult =
    processJob.job?.status === "completed"
      ? (processJob.job.result as ProcessPendingResult | null)
      : null;
  const categorizeResult =
    categorizeJob.job?.status === "completed"
      ? (categorizeJob.job.result as CategorizeUntaggedResult | null)
      : null;

  // Refresh the queue once processing stops, so the rows below catch up.
  const processFinished = processJob.accepted !== null && !processJob.isRunning;
  const [prevProcessFinished, setPrevProcessFinished] = useState(processFinished);
  if (processFinished !== prevProcessFinished) {
    setPrevProcessFinished(processFinished);
    if (processFinished) onReload();
  }

  // Both endpoints below hand the work to a background job and return 202.
  async function runProcessPending() {
    if (!token) return;
    setStartingProcess(true);
    try {
      const accepted = await processPending(token, PROCESS_BATCH_LIMIT);
      processJob.start(accepted);
      toast.success(accepted.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start processing.");
    } finally {
      setStartingProcess(false);
    }
  }

  async function runCategorizeUntagged() {
    if (!token) return;
    setStartingCategorize(true);
    try {
      const accepted = await categorizeUntagged(token, PROCESS_BATCH_LIMIT);
      categorizeJob.start(accepted);
      toast.success(accepted.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start categorization.");
    } finally {
      setStartingCategorize(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-bold tracking-tight">Processor</h2>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={runProcessPending}
          disabled={startingProcess || processJob.isRunning}
        >
          {startingProcess || processJob.isRunning ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PlayCircle data-icon="inline-start" />
          )}
          {processJob.isRunning ? "Processing…" : "Process pending"}
        </Button>
        <Button
          variant="outline"
          onClick={runCategorizeUntagged}
          disabled={startingCategorize || categorizeJob.isRunning}
        >
          {startingCategorize || categorizeJob.isRunning ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PlayCircle data-icon="inline-start" />
          )}
          {categorizeJob.isRunning ? "Categorizing…" : "Categorize untagged"}
        </Button>
      </div>

      <p className="text-muted-foreground text-[12.5px]">
        Both runs continue on the server, so leaving this page is safe. Tagging only fills
        gaps and never removes a tag set by hand. There is no cancel once a run starts.
      </p>

      {processJob.accepted && (
        <AdminJobPanel
          accepted={processJob.accepted}
          job={processJob.job}
          pollError={processJob.pollError}
          requestedLimit={PROCESS_BATCH_LIMIT}
        />
      )}
      {categorizeJob.accepted && (
        <AdminJobPanel
          accepted={categorizeJob.accepted}
          job={categorizeJob.job}
          pollError={categorizeJob.pollError}
          requestedLimit={PROCESS_BATCH_LIMIT}
        />
      )}

      {processResult && (
        <div className="flex flex-col gap-3 text-[13px]">
          {/* The panel above already reports succeeded/failed; these are the
              domain numbers it can't know about. */}
          {processResult.pending_remaining !== undefined && (
            <p className="text-muted-foreground text-[12.5px]">
              {processResult.total_new_variants_saved ?? 0} new,{" "}
              {processResult.total_variants_updated ?? 0} updated.{" "}
              {processResult.pending_remaining} still pending.
            </p>
          )}

          {processResult.details && processResult.details.length > 0 && (
            <Card className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Extracted</TableHead>
                    <TableHead className="text-right">Saved</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processResult.details.map((d) => (
                    <TableRow key={d.raw_id}>
                      <TableCell>
                        <div className="max-w-xs truncate font-medium">{d.product_name}</div>
                        {d.error && (
                          <div className="text-[12px] text-negative">{d.error}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "capitalize",
                            d.error ? "bg-negative/10 text-negative" : "bg-positive/10 text-positive",
                          )}
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.variants_extracted}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.variants_saved}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.variants_updated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {categorizeResult && (
        <p className="text-muted-foreground text-[12.5px]">
          {categorizeResult.tagged} tagged, {categorizeResult.links_added} links added.{" "}
          {categorizeResult.untagged_remaining} still untagged.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-muted-foreground">
          Raw scrape queue
          {queue && <span className="tabular-nums"> · {filtered.length} of {queue.length}</span>}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search product or URL…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select items={statusOptions} value={status} onValueChange={(v) => setStatus(v as string)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={onReload} aria-label="Refresh queue">
            <RefreshCw />
          </Button>
        </div>
      </div>

      <Card className="py-0">
        {queueError ? (
          <AdminErrorState message={queueError} onRetry={onReload} />
        ) : queue === null ? (
          <AdminLoadingState />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            icon={Inbox}
            title="No raw records match"
            description="Adjust the search or status filter, or run a scrape to fill the queue."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prices</TableHead>
                <TableHead className="text-right">Specs</TableHead>
                <TableHead className="text-right">Images</TableHead>
                <TableHead>Scraped</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="max-w-xs truncate font-medium">{row.raw_product_name}</div>
                    <div className="max-w-xs truncate text-[12px] text-muted-foreground">
                      {row.source_url}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {brandNames.get(row.brand_id) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <AdminStatusPill kind="raw" value={row.processing_status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {row.raw_prices.length === 0
                      ? "—"
                      : row.raw_prices.length === 1
                        ? formatPrice(row.raw_prices[0])
                        : `${formatPrice(row.raw_prices[0])} +${row.raw_prices.length - 1}`}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {Object.keys(row.raw_specs_dump ?? {}).length}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {row.image_urls.length}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDateTime(row.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="View raw record"
                      onClick={() => setDetailTarget(row)}
                    >
                      <Eye />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AdminPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      <RawRecordDialog
        record={detailTarget}
        brandName={detailTarget ? brandNames.get(detailTarget.brand_id) : undefined}
        open={detailTarget !== null}
        onOpenChange={(open) => !open && setDetailTarget(null)}
      />
    </section>
  );
}

function RawRecordDialog({
  record,
  brandName,
  open,
  onOpenChange,
}: {
  record: RawScrapLaptop | null;
  brandName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const specs = Object.entries(record?.raw_specs_dump ?? {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Unprefixed max-w-* is ignored — DialogContent's own sm:max-w-sm wins. */}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left">
            {record?.raw_product_name ?? "Raw record"}
          </DialogTitle>
        </DialogHeader>

        {record && (
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto text-[13px]">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <Field label="Status">
                <AdminStatusPill kind="raw" value={record.processing_status} />
              </Field>
              <Field label="Brand">{brandName ?? "—"}</Field>
              <Field label="Scraped">{formatDateTime(record.created_at)}</Field>
              <Field label="Raw ID">
                <span className="font-mono text-[12px] break-all">{record.id}</span>
              </Field>
              <Field label="Source" className="col-span-2">
                <a
                  href={record.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 break-all text-brand hover:underline"
                >
                  {record.source_url}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </Field>
            </dl>

            <Group label={`Prices (${record.raw_prices.length})`}>
              {record.raw_prices.length === 0 ? (
                <p className="text-muted-foreground">No prices captured.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {record.raw_prices.map((p, i) => (
                    <Badge key={i} className="bg-surface-2 tabular-nums">
                      {formatPrice(p)}
                    </Badge>
                  ))}
                </div>
              )}
            </Group>

            <Group label={`Images (${record.image_urls.length})`}>
              {record.image_urls.length === 0 ? (
                <p className="text-muted-foreground">No images captured.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {record.image_urls.map((url, i) => (
                    <li key={`${url}-${i}`}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-brand hover:underline"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Group>

            <Group label={`Raw specs dump (${specs.length} fields)`}>
              {specs.length === 0 ? (
                <p className="text-muted-foreground">Empty dump.</p>
              ) : (
                <div className="border-line overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/3">Field</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specs.map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="align-top font-medium break-all">{key}</TableCell>
                          <TableCell className="align-top">
                            <pre className="font-sans whitespace-pre-wrap break-words">
                              {formatSpecValue(value)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Group>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <dt className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </h4>
      {children}
    </section>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Price entries arrive as bare strings or as `{ price: … }` wrappers. */
function formatPrice(price: RawPrice): string {
  if (typeof price === "string") return price;
  if (price && typeof price === "object" && price.price !== undefined) {
    return String(price.price);
  }
  return JSON.stringify(price);
}

/** Scalars print verbatim; nested objects/arrays get pretty-printed JSON. */
function formatSpecValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
