"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type EmbeddingStatus, getEmbeddingStatus } from "@/lib/api/admin/embeddings";

/**
 * Poll cadence while a run is being followed. Embedding is one API call per
 * laptop with no deliberate pacing, so the count moves quickly — a slower
 * cadence would make the bar jump in large steps.
 */
const POLL_MS = 2000;

/** Cadence when idle: enough to notice a run someone else started. */
const IDLE_POLL_MS = 15000;

/**
 * Consecutive unchanged polls before a run is declared stalled. At POLL_MS
 * that is ~30s of no movement, which is far longer than any single embedding
 * call, so it means the backend stopped rather than that it is being slow.
 */
const STALL_POLLS = 15;

interface Run {
  /** `embedded` when the run was triggered — the origin the bar measures from. */
  baseline: number;
  startedAt: number;
}

export interface UseEmbeddingProgress {
  status: EmbeddingStatus | null;
  /** The status endpoint itself failed. Distinct from a failed run. */
  loadError: boolean;
  /** A run is being followed and the count is still moving. */
  isRunning: boolean;
  /** Followed run reached full coverage. */
  isDone: boolean;
  /** Followed run stopped moving with work still outstanding. */
  isStalled: boolean;
  /** Embeddings written since the run started. */
  completed: number;
  /** Still to do. */
  remaining: number;
  /** Fraction 0–1 of the *followed run*, not of overall coverage. */
  fraction: number;
  /** Seconds left at the observed rate, or null before a rate can be measured. */
  etaSeconds: number | null;
  /** Begin following a run. Call after the trigger returns. */
  begin: () => void;
  /** Stop following and clear the panel. Does not stop the server. */
  dismiss: () => void;
  /** One-off refresh, e.g. a manual button. */
  refresh: () => void;
}

/**
 * Follows `POST /embeddings/laptops/generate-all`, which returns immediately
 * and then works invisibly — there is no job id and no progress stream, so the
 * only signal is `GET /embeddings/laptops/status` and watching `embedded`
 * climb (backend `admin.md` §6). This turns that endpoint into a progress feed.
 *
 * Consequences of there being no job record, which the UI has to live with:
 *
 *   - Progress cannot be recovered after a reload. A refresh loses the
 *     baseline, so the run stops being *followed* even though it continues on
 *     the server. Coverage still reflects reality, which is why this keeps
 *     polling slowly even when idle.
 *   - "Stalled" is inferred from a count that stops moving, not reported. It
 *     may equally mean the run crashed or that it finished a partial batch.
 *   - A second run started elsewhere is indistinguishable from this one.
 */
export function useEmbeddingProgress(): UseEmbeddingProgress {
  const [status, setStatus] = useState<EmbeddingStatus | null>(null);
  /**
   * When the newest status landed. The rate is measured against this rather
   * than `Date.now()` at render: reading the clock during render is impure,
   * and it would also let the estimate drift on re-renders that carry no new
   * data. Advancing only on a poll ties the estimate to the counts it describes.
   */
  const [polledAt, setPolledAt] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [isStalled, setIsStalled] = useState(false);
  const [tick, setTick] = useState(0);

  // Stall detection lives in refs: it is bookkeeping between polls, not
  // something the render output depends on until it trips.
  const lastEmbeddedRef = useRef<number | null>(null);
  const unchangedRef = useRef(0);

  const isDone = run !== null && status !== null && status.missing === 0;
  const isRunning = run !== null && !isDone && !isStalled;

  const begin = useCallback(() => {
    // Baseline off the last known count. Callers must not start a run before
    // the first poll lands — with no baseline the bar would measure from zero
    // and render overall coverage as if it were this run's progress. The
    // trigger button is disabled until `status` exists for exactly that reason.
    setRun({ baseline: status?.embedded ?? 0, startedAt: Date.now() });
    setIsStalled(false);
    lastEmbeddedRef.current = null;
    unchangedRef.current = 0;
    setTick((t) => t + 1);
  }, [status]);

  const dismiss = useCallback(() => {
    setRun(null);
    setIsStalled(false);
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const next = await getEmbeddingStatus();
        if (cancelled) return;
        setStatus(next);
        setPolledAt(Date.now());
        setLoadError(false);

        // Only judge staleness while following a run — an idle count that
        // doesn't move is the normal state, not a stall.
        if (!isRunning) return;
        if (lastEmbeddedRef.current === next.embedded) {
          unchangedRef.current += 1;
          if (unchangedRef.current >= STALL_POLLS) setIsStalled(true);
        } else {
          unchangedRef.current = 0;
          lastEmbeddedRef.current = next.embedded;
        }
      } catch {
        if (cancelled) return;
        // A failed poll is not a failed run: keep the last known counts on
        // screen and let the interval retry.
        setLoadError(true);
      }
    };

    void poll();
    const timer = setInterval(poll, isRunning ? POLL_MS : IDLE_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isRunning, tick]);

  const completed = run && status ? Math.max(0, status.embedded - run.baseline) : 0;
  const remaining = status?.missing ?? 0;
  const target = completed + remaining;
  const fraction = target > 0 ? completed / target : isDone ? 1 : 0;

  // Rate is measured over the whole run rather than the last interval: the
  // per-poll delta is small enough that it swings wildly, which would make the
  // estimate flicker between values that are all equally wrong.
  const elapsedSeconds = run && polledAt ? (polledAt - run.startedAt) / 1000 : 0;
  const rate = elapsedSeconds > 0 ? completed / elapsedSeconds : 0;
  const etaSeconds = isRunning && rate > 0 && remaining > 0 ? remaining / rate : null;

  return {
    status,
    loadError,
    isRunning,
    isDone,
    isStalled,
    completed,
    remaining,
    fraction,
    etaSeconds,
    begin,
    dismiss,
    refresh,
  };
}
