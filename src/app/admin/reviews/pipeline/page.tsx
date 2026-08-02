"use client";

import { useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  type AggregateResult,
  type IngestBulkResult,
  type ProcessBulkResult,
  aggregateLaptop,
  ingestBulk,
  processBulk,
} from "@/lib/api/admin/reviews";
import { ApiError } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

import { AdminPageHeader } from "../../admin-page-header";
import { LaptopPicker } from "../../laptop-picker";

export default function AdminReviewPipelinePage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        crumbs={["Reviews", "Pipeline"]}
        title="Review pipeline"
        description="Discover, process, and aggregate YouTube reviews. These calls use YouTube quota and Gemini credits — run deliberately."
      />

      <IngestSection />
      <ProcessSection />
      <AggregateSection />
    </div>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function ResultBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-line bg-surface rounded-lg border p-3 text-[13px]">{children}</div>
  );
}

function IngestSection() {
  const { token } = useAuth();
  const [limit, setLimit] = useState("5");
  const [skipCovered, setSkipCovered] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<IngestBulkResult | null>(null);

  async function run() {
    if (!token) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await ingestBulk(token, { limit: Number(limit) || 5, skipCovered });
      setResult(res);
      toast.success(res.message ?? `Ingest done: ${res.families_attempted ?? 0} families searched.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ingest failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <SectionCard
      title="Ingest"
      hint="Search YouTube for new reviews across the catalog (one search per laptop family). Costs ~active_channels × 100 quota units per family."
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Max families
          <Input
            type="number"
            min={1}
            max={20}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-28"
          />
        </label>
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold">
          <Checkbox checked={skipCovered} onCheckedChange={(c) => setSkipCovered(c === true)} />
          Skip already-covered families
        </label>
        <Button onClick={run} disabled={running} className="mb-0.5">
          {running ? <Loader2 className="size-3.5 motion-safe:animate-spin" /> : <PlayCircle className="size-3.5" />}
          {running ? "Ingesting…" : "Run ingest"}
        </Button>
      </div>

      {result && (
        <ResultBox>
          {result.message ? (
            <p className="text-muted-foreground">{result.message}</p>
          ) : (
            <p className="text-muted-foreground">
              {result.families_attempted ?? 0} searched of {result.families_total ?? 0} families ·{" "}
              {result.families_already_covered ?? 0} already covered · {result.families_remaining ?? 0} remaining.
              {result.matched !== undefined && ` Matched ${result.matched}, ${result.pending ?? 0} pending.`}
            </p>
          )}
        </ResultBox>
      )}
    </SectionCard>
  );
}

function ProcessSection() {
  const { token } = useAuth();
  const [limit, setLimit] = useState("5");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ProcessBulkResult | null>(null);

  async function run() {
    if (!token) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await processBulk(token, Number(limit) || 5);
      setResult(res);
      toast.success(`Processed ${res.processed} of ${res.candidates} — ${res.chunks_saved} chunks saved.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Processing failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <SectionCard
      title="Process"
      hint="Chunk, sentiment-tag, and embed matched reviews that have no chunks yet. Each chunk is one Gemini + one embedding call, so this is slow."
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Max reviews
          <Input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-28"
          />
        </label>
        <Button onClick={run} disabled={running} className="mb-0.5">
          {running ? <Loader2 className="size-3.5 motion-safe:animate-spin" /> : <PlayCircle className="size-3.5" />}
          {running ? "Processing…" : "Run processing"}
        </Button>
      </div>

      {result && (
        <ResultBox>
          <p className="text-muted-foreground">
            {result.processed} processed of {result.candidates} candidates
            {result.failed > 0 && `, ${result.failed} failed`} — {result.chunks_saved} chunks saved.
          </p>
        </ResultBox>
      )}
    </SectionCard>
  );
}

function AggregateSection() {
  const { token } = useAuth();
  const [laptop, setLaptop] = useState<BackendLaptop | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AggregateResult | null>(null);

  async function run() {
    if (!token || !laptop) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await aggregateLaptop(token, laptop.id);
      setResult(res);
      toast.success(`Aggregated ${res.review_count} reviews for ${laptop.product_name}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Aggregation failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <SectionCard
      title="Aggregate"
      hint="Recompute a laptop's review summary (strengths / weaknesses) from all its processed chunks."
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <LaptopPicker selected={laptop} onSelect={setLaptop} placeholder="Search a laptop to aggregate…" />
        </div>
        <Button onClick={run} disabled={running || !laptop}>
          {running ? <Loader2 className="size-3.5 motion-safe:animate-spin" /> : <PlayCircle className="size-3.5" />}
          {running ? "Aggregating…" : "Aggregate"}
        </Button>
      </div>

      {result && (
        <ResultBox>
          <p className="mb-2 font-semibold">{result.review_count} reviews aggregated.</p>
          {result.strengths.length > 0 && (
            <div className="mb-2">
              <span className="text-positive text-[12px] font-semibold uppercase">Strengths</span>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {result.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.weaknesses.length > 0 && (
            <div>
              <span className="text-negative text-[12px] font-semibold uppercase">Weaknesses</span>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {result.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </ResultBox>
      )}
    </SectionCard>
  );
}
