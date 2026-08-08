"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ListOrdered, PlayCircle, RefreshCw, Search, Spline } from "lucide-react";
import { toast } from "sonner";

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
import { type Brand, listBrands } from "@/lib/api/admin/brands";
import {
  type ScrapeStatus,
  type ScrapeStatusCounts,
  type ScrapeTarget,
  bulkScrape,
  feedCrawler,
  getScrapeStatusCounts,
  listScrapeTargets,
  scrapeTargets,
} from "@/lib/api/admin/scraper";
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

const TABS: Array<{ value: ScrapeStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Retrying" },
  { value: "html_uploaded", label: "HTML received" },
  { value: "completed", label: "Scraped" },
  { value: "parsed", label: "Uploaded" },
  { value: "skipped", label: "Skipped" },
];

export default function AdminQueuePage() {
  const { token } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState("all");
  const [tab, setTab] = useState<ScrapeStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [targets, setTargets] = useState<ScrapeTarget[] | null>(null);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<ScrapeStatusCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  // Refresh once a run stops, so statuses and counts catch up.
  const job = useJob(token, () => setReloadTick((t) => t + 1));

  useEffect(() => {
    listBrands({ isActive: true })
      .then(setBrands)
      .catch(() => toast.error("Couldn't load brands."));
  }, []);

  // Reset paging and selection whenever the effective filter changes —
  // "adjust state during render", not an effect (see laptops-browse.tsx).
  const filterSig = `${tab}|${brandId}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (filterSig !== prevFilterSig) {
    setPrevFilterSig(filterSig);
    setPage(1);
    setSelected(new Set());
  }

  // Drop stale rows the moment the fetch key changes, so the table shows a
  // spinner rather than the previous filter's results.
  const fetchSig = `${filterSig}|${page}|${reloadTick}`;
  const [prevFetchSig, setPrevFetchSig] = useState(fetchSig);
  if (fetchSig !== prevFetchSig) {
    setPrevFetchSig(fetchSig);
    setTargets(null);
    setError(null);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const brandFilter = brandId === "all" ? undefined : brandId;
    Promise.all([
      listScrapeTargets(token, {
        brandId: brandFilter,
        scrapeStatus: tab === "all" ? undefined : tab,
        offset: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
      getScrapeStatusCounts(token, brandFilter),
    ])
      .then(([list, statusCounts]) => {
        if (cancelled) return;
        setTargets(list.targets);
        setTotal(list.total);
        setCounts(statusCounts);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load the queue.");
      });

    return () => {
      cancelled = true;
    };
  }, [token, brandId, tab, page, reloadTick]);

  // Search filters the page in hand; the endpoint has no search param.
  const visible = useMemo(() => {
    if (!targets) return [];
    const q = search.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter(
      (t) => t.url.toLowerCase().includes(q) || t.brand_name.toLowerCase().includes(q),
    );
  }, [targets, search]);

  const allVisibleSelected = visible.length > 0 && visible.every((t) => selected.has(t.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((t) => next.delete(t.id));
      else visible.forEach((t) => next.add(t.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runCrawler() {
    if (!token || brandId === "all") return;
    setStarting(true);
    try {
      const res = await feedCrawler(token, brandId);
      const added = res.added_to_queue ?? res.added_count ?? 0;
      const found = res.total_found;
      // "Found 49, added 0" means every link was already queued. That is a
      // success, so it must not read as a failure.
      toast.success(
        found !== undefined
          ? `Found ${found}, added ${added} new.`
          : `${added} new page${added === 1 ? "" : "s"} queued.`,
      );
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't run the crawler.");
    } finally {
      setStarting(false);
    }
  }

  async function runBulk() {
    if (!token || brandId === "all") return;
    setStarting(true);
    try {
      const accepted = await bulkScrape(token, brandId);
      job.start(accepted);
      toast.success(accepted.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start the scrape.");
    } finally {
      setStarting(false);
    }
  }

  async function runSelected() {
    if (!token || selected.size === 0) return;
    setStarting(true);
    try {
      const accepted = await scrapeTargets(token, [...selected]);
      job.start(accepted);
      setSelected(new Set());
      toast.success(accepted.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start the scrape.");
    } finally {
      setStarting(false);
    }
  }

  const brandChosen = brandId !== "all";
  const busy = starting || job.isRunning;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Scrape Queue"
        description="Product pages the feed crawler found. Failed rows are retried automatically on the next bulk run, so nothing here needs rescuing by hand."
        action={
          <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>
            <RefreshCw data-icon="inline-start" />
            Refresh
          </Button>
        }
      />

      <Card className="gap-0 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium">Brand</span>
            <Select
              items={[
                { value: "all", label: "All brands" },
                ...brands.map((b) => ({ value: b.id, label: b.name })),
              ]}
              value={brandId}
              onValueChange={(v) => setBrandId(v as string)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All brands</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium">Search this page</span>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
              <Input
                placeholder="URL or brand…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 pl-8"
              />
            </div>
          </div>

          <div className="ml-auto flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={runCrawler} disabled={!brandChosen || busy}>
              <Spline data-icon="inline-start" />
              Find new pages
            </Button>
            <Button size="sm" onClick={runBulk} disabled={!brandChosen || busy}>
              {busy ? <Spinner data-icon="inline-start" /> : <PlayCircle data-icon="inline-start" />}
              Scrape this brand
            </Button>
          </div>
        </div>
        {!brandChosen && (
          <p className="text-muted-foreground mt-2.5 text-[12px]">
            Crawling and bulk scraping both work on one brand at a time. Pick a brand to
            enable them. The crawler always starts from that brand&apos;s stored address.
          </p>
        )}
      </Card>

      {job.accepted && (
        <AdminJobPanel accepted={job.accepted} job={job.job} pollError={job.pollError} />
      )}

      {/* Status tabs, all six counts from one call. */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count =
            t.value === "all" ? (counts?.total ?? 0) : (counts?.[t.value] ?? 0);
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={active}
              className={cn(
                "focus-visible:ring-ring/50 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors outline-none focus-visible:ring-3",
                active
                  ? "border-transparent bg-brand text-white"
                  : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              {t.label}
              <span className={cn("tabular-nums", !active && "text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <Card className="bg-brand-tint gap-0 border-transparent p-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-brand text-[13px] font-semibold">
              {selected.size} selected
            </span>
            <span className="text-brand/80 text-[12.5px]">
              Selected rows are always re-scraped, even ones that already succeeded.
            </span>
            <div className="ml-auto flex gap-3">
              <Button size="sm" onClick={runSelected} disabled={busy}>
                Scrape selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="py-0">
        {error ? (
          <AdminErrorState message={error} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : targets === null ? (
          <AdminLoadingState />
        ) : visible.length === 0 ? (
          <AdminEmptyState
            icon={ListOrdered}
            title={search ? "No rows match your search" : "Nothing in this state"}
            description={
              search ? undefined : "Run the crawler to find product pages for this brand."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows on this page"
                  />
                </TableHead>
                <TableHead>Product page</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last attempt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((t) => {
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={() => toggleOne(t.id)}
                        aria-label={`Select ${t.url}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-md">
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand flex items-center gap-1.5 truncate font-mono text-[12px] hover:underline"
                      >
                        <span className="truncate">{t.url}</span>
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell className="text-[13px]">{t.brand_name}</TableCell>
                    <TableCell>
                      <AdminStatusPill kind="scrape" value={t.scrape_status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[12.5px] tabular-nums">
                      {t.last_scraped_at
                        ? new Date(t.last_scraped_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "Never"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
