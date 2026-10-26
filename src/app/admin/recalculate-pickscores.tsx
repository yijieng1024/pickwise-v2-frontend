"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useJob } from "@/lib/admin/use-job";
import { generateAllPickScores } from "@/lib/api/admin/embeddings";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminJobPanel } from "./admin-job-panel";

/**
 * "Recalculate PickScores": confirmation, then the job panel. Moved off the
 * Dashboard (whose PickScore freshness row links here) onto the benchmark
 * pages, since PickScore is derived from those numbers. Until a PickScore page
 * exists this is its home.
 */
export function useRecalculatePickScores() {
  const { token } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [starting, setStarting] = useState(false);
  const job = useJob(token);

  async function run() {
    if (!token) return;
    setStarting(true);
    try {
      job.start(await generateAllPickScores(token));
    } catch (err) {
      // 409 `job_running`: one is already going, and it is on the Jobs screen.
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't recalculate scores.",
        err instanceof ApiError && err.code === "job_running"
          ? { action: { label: "Open Jobs", onClick: () => window.location.assign("/admin/jobs") } }
          : undefined,
      );
    } finally {
      setStarting(false);
    }
  }

  const button = (
    <Button variant="outline" size="sm" onClick={() => setConfirm(true)} disabled={starting || job.isRunning}>
      {(starting || job.isRunning) && <Spinner data-icon="inline-start" />}
      Recalculate PickScores
    </Button>
  );

  const panel = (
    <>
      {job.accepted && <AdminJobPanel accepted={job.accepted} job={job.job} pollError={job.pollError} />}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recalculate every PickScore?</AlertDialogTitle>
            <AlertDialogDescription>
              Rewrites every PickScore on the live site, for every active laptop and use case.
              Scores are percentiles of the whole catalog, so laptops you haven&apos;t changed can
              move by a point. The old scores stay until the run finishes; a failed or stopped run
              changes nothing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirm(false);
                void run();
              }}
            >
              Recalculate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return { button, panel };
}
