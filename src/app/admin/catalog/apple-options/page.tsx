"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type AppleOptionsConfig,
  type AppleOptionsView,
  fetchAppleOptions,
  getAppleOptions,
} from "@/lib/api/admin/apple-options";
import { ApiError } from "@/lib/api/client";
import { GROUP_LABELS, OPTION_GROUPS, formatDelta } from "@/lib/api/options";
import { useJob } from "@/lib/admin/use-job";
import { useAuth } from "@/lib/auth-context";
import { cn, formatDate } from "@/lib/utils";

import { AdminJobPanel } from "../../admin-job-panel";
import { AdminPageHeader } from "../../admin-page-header";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../admin-states";

/**
 * Read-only: Apple's configurator API is the only source of these prices (plan 10c,
 * decision 11). "Fetch now" re-reads it from the stored buy pages as a background job.
 */
export default function AdminAppleOptionsPage() {
  const { token } = useAuth();
  const [view, setView] = useState<AppleOptionsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [starting, setStarting] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const job = useJob(token, reload);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getAppleOptions(token)
      .then((v) => {
        if (cancelled) return;
        setView(v);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load options.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, tick]);

  async function fetchNow() {
    if (!token) return;
    setStarting(true);
    try {
      const accepted = await fetchAppleOptions(token);
      job.start(accepted);
      toast.success(accepted.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start the fetch.");
    } finally {
      setStarting(false);
    }
  }

  const busy = starting || job.isRunning || Boolean(view?.running_job_id && !job.accepted);
  const run = view?.latest_run;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Apple Options"
        description="Build-to-order chips, memory, storage, adapters and displays per MacBook standard config, as Apple's configurator prices them. Read-only."
        action={
          <Button onClick={fetchNow} disabled={busy || !token}>
            <RefreshCw data-icon="inline-start" className={cn(busy && "animate-spin")} />
            Fetch now
          </Button>
        }
      />
      <p className="text-muted-foreground text-[12.5px]">
        Fetch now reads Apple&apos;s configurator for every size on the stored buy pages, then the same on
        Apple&apos;s education store with each standard config&apos;s education price (about 8 minutes, about 95
        calls). It does not re-scrape the buy pages. A deploy stops a running fetch; the stored options are kept.
        {view?.running_job_id && !job.accepted && " An Apple fetch or scrape is running now."}
      </p>

      {job.accepted && <AdminJobPanel accepted={job.accepted} job={job.job} pollError={job.pollError} />}

      {run && (
        <Card className="gap-2 p-4 text-[13px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold">Latest options run</span>
            <span className="text-muted-foreground">
              {run.finished_at ? formatDate(run.finished_at) : "—"} · {run.chip_kits ?? 0} chip kits ·{" "}
              {run.apple_calls ?? 0} Apple calls
            </span>
          </div>
          {run.error && <p className="text-destructive">{run.error}</p>}
          {run.stopped && <p className="text-destructive">Stopped by Apple: {String(run.stopped.reason ?? "")}</p>}
          <Problems
            title="Options failed (stored options kept)"
            rows={(run.options_failed ?? []).map(
              (f) => `${f.product} ${f.size_inch}" ${f.line} ${f.chip ?? "all chips"}: ${f.reason}`,
            )}
          />
          <Problems
            title="Chips Apple lists that this size does not sell"
            rows={(run.chip_not_offered ?? []).map((c) => `${c.product} ${c.size_inch}" ${c.line}: ${c.chips.join(", ")}`)}
          />
          {/* The education-store pass of the same run (10d). */}
          {run.edu && (
            <>
              <p className="text-muted-foreground">
                Education store:{" "}
                {run.edu.error ?? run.edu.skipped ??
                  `${run.edu.prices ?? 0} prices · ${run.edu.chip_kits ?? 0} chip kits · ${run.edu.apple_calls ?? 0} Apple calls`}
              </p>
              {run.edu.stopped && (
                <p className="text-destructive">Education store stopped by Apple: {String(run.edu.stopped.reason ?? "")}</p>
              )}
              <Problems
                title="Education prices failed (stored prices kept)"
                rows={[
                  ...(run.edu.prices_failed ?? []).map((f) => `${f.url}: ${f.reason}`),
                  ...(run.edu.options_failed ?? []).map(
                    (f) => `${f.product} ${f.size_inch}" ${f.line} ${f.chip ?? "all chips"}: ${f.reason}`,
                  ),
                ]}
              />
              <Problems title="Education price with no laptop row yet" rows={run.edu.no_laptop ?? []} />
              <Problems
                title="Education price not below the official price (not shown)"
                rows={(run.edu.not_below_official ?? []).map((p) => `${p.laptop_id}: RM ${p.edu} against RM ${p.official}`)}
              />
            </>
          )}
        </Card>
      )}

      {error ? (
        <AdminErrorState message={error} onRetry={reload} />
      ) : !view ? (
        <AdminLoadingState />
      ) : view.configs.length === 0 ? (
        <AdminEmptyState title="No Apple standard configs" description="Scrape the Apple buy pages first." />
      ) : (
        <Card className="gap-0 p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Standard config</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Chip kits</TableHead>
                <TableHead>Fetched</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.configs.map((c) => (
                <ConfigRows
                  key={c.laptop_id}
                  config={c}
                  open={open === c.laptop_id}
                  onToggle={() => setOpen(open === c.laptop_id ? null : c.laptop_id)}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function Problems({ title, rows }: { title: string; rows: string[] }) {
  if (!rows.length) return <p className="text-muted-foreground">{title}: none.</p>;
  return (
    <div>
      <p className="font-medium">
        {title} ({rows.length})
      </p>
      <ul className="text-muted-foreground ml-4 list-disc text-[12.5px]">
        {rows.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function ConfigRows({ config, open, onToggle }: { config: AppleOptionsConfig; open: boolean; onToggle: () => void }) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle} aria-expanded={open}>
        <TableCell className="max-w-[28rem] whitespace-normal">{config.product_name}</TableCell>
        <TableCell className="text-right tabular-nums">RM {config.price_rm.toLocaleString()}</TableCell>
        <TableCell className="text-right tabular-nums">{config.kits.length || "—"}</TableCell>
        <TableCell className="text-muted-foreground">
          {config.fetched_at ? formatDate(config.fetched_at) : "No options"}
        </TableCell>
      </TableRow>
      {open && config.kits.length > 0 && (
        <TableRow>
          <TableCell colSpan={4} className="bg-surface-2/50 whitespace-normal">
            <div className="grid gap-3 py-2 md:grid-cols-2">
              {config.kits.map((kit) => (
                <div key={kit.chip} className="border-line bg-surface rounded-xl border p-3 text-[12.5px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      {kit.label ?? kit.chip}
                      {kit.chip === config.standard_chip && <span className="text-muted-foreground"> · standard</span>}
                    </span>
                    <span className="tabular-nums">RM {kit.kit_price_rm.toLocaleString()}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {kit.cpu_model} · {kit.gpu_model}
                  </div>
                  {OPTION_GROUPS.map((g) =>
                    kit.options[g]?.length ? (
                      <div key={g} className="mt-1">
                        <span className="font-medium">{GROUP_LABELS[g]}: </span>
                        {kit.options[g]!
                          .map((o) => `${o.label ?? o.value} ${o.is_included ? "(kit)" : formatDelta(o.add_on_rm ?? 0)}`)
                          .join(", ")}
                      </div>
                    ) : null,
                  )}
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
