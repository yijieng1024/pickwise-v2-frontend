"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, Inbox, RefreshCw, Search } from "lucide-react";
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
  listRawScrapLaptops,
} from "@/lib/api/admin/scraper";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminStatusPill } from "../admin-status-pill";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminPageHeader } from "../admin-page-header";
import { AdminPagination } from "../admin-pagination";

const PAGE_SIZE = 25;

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

/**
 * Read-only view of `raw_scrap_laptops` — what the scraper collected, before
 * the AI processor turns it into catalog rows.
 *
 * Deliberately has no action buttons. It used to start bulk scrapes and
 * processor runs itself, duplicating /admin/queue and /admin/processing with
 * a hardcoded batch of 100 against their 1–1500 — so the same job could be
 * launched twice, at a limit the UI never showed. Each action now lives on
 * exactly one screen, at full capability, and this one links to them.
 */
export default function AdminRawRecordsPage() {
  const { token } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [queue, setQueue] = useState<RawScrapLaptop[] | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailTarget, setDetailTarget] = useState<RawScrapLaptop | null>(null);

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

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Collect", "Raw Records"]}
        title="Raw Records"
        description="The messy vendor text the scraper collected, before AI clean-up turns it into catalog entries. Nothing here is visible to customers."
        action={
          <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      <Card className="gap-0 p-4">
        <p className="text-muted-foreground text-[12.5px] leading-relaxed">
          To collect more, run a scrape from the{" "}
          <Link href="/admin/queue" className="text-brand font-medium hover:underline">
            scrape queue
          </Link>
          . To turn these into catalog entries, run{" "}
          <Link href="/admin/processing" className="text-brand font-medium hover:underline">
            AI clean-up
          </Link>{" "}
          — it reports how many are pending and lets you choose the batch size.
        </p>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold tracking-tight">
          Collected records
          {queue && (
            <span className="text-muted-foreground font-medium tabular-nums">
              {" "}
              · {filtered.length} of {queue.length}
            </span>
          )}
        </h2>
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
        </div>
      </div>

      <Card className="py-0">
        {queueError ? (
          <AdminErrorState message={queueError} onRetry={() => setReloadTick((t) => t + 1)} />
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
    </div>
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
