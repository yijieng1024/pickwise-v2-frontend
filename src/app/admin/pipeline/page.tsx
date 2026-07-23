"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
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
  type BulkScrapeReport,
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
import { useAuth } from "@/lib/auth-context";

import { AdminPageHeader } from "../admin-page-header";

export default function AdminPipelinePage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        crumbs={["Pipeline"]}
        title="Pipeline"
        description="Trigger the scraper and AI processor, and watch queue depth."
      />

      <ScraperSection />
      <ProcessorSection />
    </div>
  );
}

function ScraperSection() {
  const { token } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState<string>("");
  const [queue, setQueue] = useState<RawScrapLaptop[] | null>(null);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<BulkScrapeReport | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    listBrands({ isActive: true }).then((res) => {
      setBrands(res);
      if (res.length > 0) setBrandId((current) => current || res[0].id);
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    listRawScrapLaptops(token, { limit: 1000 }).then(setQueue);
  }, [token, reloadTick]);

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

  async function runBulkScrape() {
    if (!token || !brandId) return;
    setRunning(true);
    setReport(null);
    try {
      const res = await bulkScrape(token, brandId);
      setReport(res);
      toast.success(
        `Bulk scrape done: ${res.succeeded} succeeded, ${res.failed} failed, ${res.skipped} skipped.`,
      );
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bulk scrape failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-bold tracking-tight">Scraper</h2>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          items={brands.map((b) => ({ value: b.id, label: b.name }))}
          value={brandId}
          onValueChange={(v) => setBrandId(v as string)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select a brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={runBulkScrape} disabled={running || !brandId}>
          {running ? (
            <Loader2 className="size-3.5 motion-safe:animate-spin" />
          ) : (
            <PlayCircle className="size-3.5" />
          )}
          {running ? "Scraping…" : "Run bulk scrape"}
        </Button>
      </div>

      {report && (
        <div className="border-line bg-surface rounded-lg border p-3 text-[13px]">
          <p className="font-semibold">{report.brand}</p>
          <p className="text-muted-foreground">
            {report.processed} processed of {report.total_pending} pending — {report.succeeded}{" "}
            succeeded, {report.failed} failed, {report.skipped} skipped.
          </p>
        </div>
      )}

      <div className="border-line bg-surface rounded-lg border">
        {queue === null ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="size-5 text-muted-foreground motion-safe:animate-spin" />
          </div>
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
              {brands.map((b) => {
                const counts = queueByBrand.get(b.id) ?? { pending: 0, completed: 0, failed: 0 };
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="tabular-nums">{counts.pending}</TableCell>
                    <TableCell className="tabular-nums">{counts.completed}</TableCell>
                    <TableCell className="tabular-nums">{counts.failed}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

function ProcessorSection() {
  const { token } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [processResult, setProcessResult] = useState<ProcessPendingResult | null>(null);
  const [categorizeResult, setCategorizeResult] = useState<CategorizeUntaggedResult | null>(null);

  async function runProcessPending() {
    if (!token) return;
    setProcessing(true);
    setProcessResult(null);
    try {
      const res = await processPending(token);
      setProcessResult(res);
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Processing failed.");
    } finally {
      setProcessing(false);
    }
  }

  async function runCategorizeUntagged() {
    if (!token) return;
    setCategorizing(true);
    setCategorizeResult(null);
    try {
      const res = await categorizeUntagged(token);
      setCategorizeResult(res);
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Categorization failed.");
    } finally {
      setCategorizing(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-bold tracking-tight">Processor</h2>

      <div className="flex flex-wrap gap-3">
        <Button onClick={runProcessPending} disabled={processing}>
          {processing ? (
            <Loader2 className="size-3.5 motion-safe:animate-spin" />
          ) : (
            <PlayCircle className="size-3.5" />
          )}
          {processing ? "Processing…" : "Process pending"}
        </Button>
        <Button variant="outline" onClick={runCategorizeUntagged} disabled={categorizing}>
          {categorizing ? (
            <Loader2 className="size-3.5 motion-safe:animate-spin" />
          ) : (
            <PlayCircle className="size-3.5" />
          )}
          {categorizing ? "Categorizing…" : "Categorize untagged"}
        </Button>
      </div>

      {processResult && (
        <div className="border-line bg-surface rounded-lg border p-3 text-[13px]">
          <p className="font-semibold">{processResult.message}</p>
          {processResult.pending_remaining !== undefined && (
            <p className="text-muted-foreground">
              {processResult.total_new_variants_saved ?? 0} new, {" "}
              {processResult.total_variants_updated ?? 0} updated — {processResult.pending_remaining}{" "}
              still pending.
            </p>
          )}
        </div>
      )}

      {categorizeResult && (
        <div className="border-line bg-surface rounded-lg border p-3 text-[13px]">
          <p className="font-semibold">{categorizeResult.message}</p>
          <p className="text-muted-foreground">
            {categorizeResult.tagged} tagged, {categorizeResult.links_added} links added —{" "}
            {categorizeResult.untagged_remaining} still untagged.
          </p>
        </div>
      )}
    </section>
  );
}
