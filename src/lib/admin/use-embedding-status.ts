"use client";

import { useCallback, useEffect, useState } from "react";

import { type EmbeddingStatus, getEmbeddingStatus } from "@/lib/api/admin/embeddings";

/** Idle cadence: enough to notice a run someone else started. */
const POLL_MS = 15000;

export interface UseEmbeddingStatus {
  status: EmbeddingStatus | null;
  /** The status endpoint itself failed. Distinct from a failed run. */
  loadError: boolean;
  refresh: () => void;
}

/**
 * Overall vector coverage, polled slowly.
 *
 * This used to be `useEmbeddingProgress`, which also *followed a run* by
 * baselining the embedded count at trigger time and inferring a stall from a
 * count that stopped moving. All of that existed because
 * `POST /embeddings/laptops/generate-all` kept no job record, so a climbing
 * count was the only signal there was.
 *
 * It now returns 202 with a job, so following a run is `useJob` +
 * `AdminJobPanel` like the scraper and processor — with real per-item counts,
 * real errors, a real terminal status, and progress that survives a reload.
 * What is left here is the one thing the job cannot answer: how much of the
 * catalog is searchable overall, including work done before this run.
 */
export function useEmbeddingStatus(): UseEmbeddingStatus {
  const [status, setStatus] = useState<EmbeddingStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const next = await getEmbeddingStatus();
        if (cancelled) return;
        setStatus(next);
        setLoadError(false);
      } catch {
        if (cancelled) return;
        // A failed poll is not a failed run: keep the last known counts on
        // screen and let the interval retry.
        setLoadError(true);
      }
    };

    void poll();
    const timer = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tick]);

  return { status, loadError, refresh };
}
