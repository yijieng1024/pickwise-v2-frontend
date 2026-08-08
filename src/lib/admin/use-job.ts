"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  type Job,
  type JobAccepted,
  getJob,
  isJobFinished,
  listJobs,
} from "@/lib/api/admin/jobs";
import { ApiError } from "@/lib/api/client";

/** Poll cadence. Jobs move at ~5s per record, so anything tighter is noise. */
const POLL_MS = 3000;

export interface UseJobResult {
  /** The 202 body, kept so the panel can show the estimate before the first poll lands. */
  accepted: JobAccepted | null;
  /** Latest poll. Null until the first one returns. */
  job: Job | null;
  /** True while the job is queued or processing. */
  isRunning: boolean;
  /** Polling failed — which is not the same as the job failing. */
  pollError: string | null;
  /** Begin tracking the job returned by a 202. */
  start: (accepted: JobAccepted) => void;
  /** Forget the current job, e.g. when dismissing the result panel. */
  reset: () => void;
}

/**
 * Tracks one background job from its 202 through to completion.
 *
 * Two rules from the backend's `admin.md` §9 that are easy to get wrong, and
 * are therefore stated once here rather than re-derived at each call site:
 *
 * 1. `status: "failed"` means the *run* crashed, not that items failed. A run
 *    where 45 of 49 items succeeded is `completed` with `failed_count: 4`.
 *    Judge outcomes by `failed_count`, never by `status`.
 * 2. There is no cancel. Once started, a job runs to completion — so this
 *    hook exposes no abort, and no UI should offer one.
 *
 * *onFinished* fires once per job, from the poll that first sees it stop. It
 * exists so callers can refresh their data without watching `isRunning` flip
 * during render: the usual "adjust state during render" trick is only legal
 * for a component's *own* state, and every caller here wants to refresh a
 * list that often lives in a parent — which React rejects with "Cannot update
 * a component while rendering a different component". A poll callback is an
 * event, so it can update anything.
 */
export function useJob(
  token: string | null,
  onFinished?: (job: Job) => void,
): UseJobResult {
  const [accepted, setAccepted] = useState<JobAccepted | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  // Held in a ref so an inline arrow at the call site doesn't restart polling,
  // and so the callback is never a dependency of the effect below.
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  });

  // Job id the callback has already fired for — the interval can tick once
  // more before the effect tears itself down, and this run is not repeatable.
  const reportedRef = useRef<string | null>(null);

  const start = useCallback((next: JobAccepted) => {
    setAccepted(next);
    setJob(null);
    setPollError(null);
  }, []);

  const reset = useCallback(() => {
    setAccepted(null);
    setJob(null);
    setPollError(null);
  }, []);

  const jobId = accepted?.job_id ?? null;
  // Stop polling once the run stops moving. Derived from the latest poll, so
  // the effect tears itself down on the tick after completion.
  const finished = job !== null && isJobFinished(job);

  useEffect(() => {
    if (!token || !jobId || finished) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const next = await getJob(token, jobId);
        if (cancelled) return;
        setJob(next);
        setPollError(null);
        if (isJobFinished(next) && reportedRef.current !== jobId) {
          reportedRef.current = jobId;
          onFinishedRef.current?.(next);
        }
      } catch (err) {
        if (cancelled) return;
        // A transient poll failure is not a job failure — surface it, keep
        // the last known progress on screen, and let the interval retry.
        setPollError(err instanceof ApiError ? err.message : "Lost contact with the job.");
      }
    };

    void poll();
    const timer = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, jobId, finished]);

  return {
    accepted,
    job,
    isRunning: accepted !== null && !finished,
    pollError,
    start,
    reset,
  };
}

/**
 * Polls for *any* running job, for the topbar indicator. Deliberately
 * independent of `useJob` so the indicator survives navigating away from the
 * screen that started the run — the job keeps going server-side.
 */
export function useActiveJobs(token: string | null, intervalMs = 8000) {
  const [count, setCount] = useState(0);
  const [firstJob, setFirstJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await listJobs(token, { activeOnly: true, limit: 1 });
        if (cancelled) return;
        setCount(res.total);
        setFirstJob(res.items[0] ?? null);
      } catch {
        // A failed poll shouldn't blank the indicator — keep the last value.
      }
    };

    void poll();
    const timer = setInterval(poll, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, intervalMs]);

  return { count, firstJob };
}
