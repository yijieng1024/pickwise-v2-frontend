"use client";

import { useEffect, useState } from "react";
import { Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  type EmbeddingStatus,
  type GenerateAllResult,
  generateAllEmbeddings,
  getEmbeddingStatus,
} from "@/lib/api/admin/embeddings";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminPageHeader } from "../admin-page-header";

export default function AdminEmbeddingsPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<EmbeddingStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GenerateAllResult | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Clear a prior error as soon as a retry is requested — the "adjust state
  // during render" pattern, not an effect (see laptops-browse.tsx).
  const [prevReloadTick, setPrevReloadTick] = useState(reloadTick);
  if (reloadTick !== prevReloadTick) {
    setPrevReloadTick(reloadTick);
    setLoadError(false);
  }

  useEffect(() => {
    let cancelled = false;
    getEmbeddingStatus()
      .then((res) => {
        if (!cancelled) setStatus(res);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  async function runGenerateAll() {
    if (!token) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await generateAllEmbeddings(token);
      setResult(res);
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start embedding generation.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Embeddings"]}
        title="Embeddings"
        description="Vector coverage for hybrid search and recommendations."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total laptops" value={status?.total_laptops} error={loadError} />
        <StatTile label="Embedded" value={status?.embedded} error={loadError} />
        <StatTile label="Missing" value={status?.missing} error={loadError} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runGenerateAll} disabled={running}>
          {running ? (
            <Loader2 className="size-3.5 motion-safe:animate-spin" />
          ) : (
            <PlayCircle className="size-3.5" />
          )}
          {running ? "Starting…" : "Generate all"}
        </Button>
        <Button variant="outline" onClick={() => setReloadTick((t) => t + 1)}>
          <RefreshCw className="size-3.5" />
          Refresh status
        </Button>
        {status && (
          <span className="text-[13px] text-muted-foreground">
            {status.coverage_pct}% coverage
          </span>
        )}
      </div>

      {result && (
        <div className="border-line bg-surface rounded-lg border p-3 text-[13px]">
          <p className="font-semibold">{result.message}</p>
          <p className="text-muted-foreground">{result.tip}</p>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  error,
}: {
  label: string;
  value: number | undefined;
  error: boolean;
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-3">
      <div className="text-xl font-bold tabular-nums">
        {error ? (
          "—"
        ) : value === undefined ? (
          <Loader2 className="size-4 text-muted-foreground motion-safe:animate-spin" />
        ) : (
          value.toLocaleString()
        )}
      </div>
      <div className="text-[12.5px] text-muted-foreground">{label}</div>
    </div>
  );
}
