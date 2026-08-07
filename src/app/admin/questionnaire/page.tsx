"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  type AdminQuestion,
  deleteQuestion,
  listQuestions,
  swapSteps,
} from "@/lib/api/admin/questionnaire";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminPageHeader } from "../admin-page-header";
import { OutcomeAlert } from "../admin-outcome-alert";
import { QuestionEditor } from "./question-editor";

export default function AdminQuestionnairePage() {
  const { token } = useAuth();
  const [questions, setQuestions] = useState<AdminQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [reordering, setReordering] = useState(false);

  const [editing, setEditing] = useState<AdminQuestion | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);

  // Drop stale rows the moment a refresh is requested — "adjust state during
  // render", since the set-state-in-effect lint forbids the effect version.
  const [prevReloadTick, setPrevReloadTick] = useState(reloadTick);
  if (reloadTick !== prevReloadTick) {
    setPrevReloadTick(reloadTick);
    setQuestions(null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    listQuestions()
      .then((res) => {
        if (cancelled) return;
        setQuestions([...res].sort((a, b) => a.step_order - b.step_order));
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Couldn't load the questionnaire.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  // Only active questions are visible to customers, so only they define the
  // real step sequence and the preview.
  const active = useMemo(
    () => (questions ?? []).filter((q) => q.is_active),
    [questions],
  );

  // Keep the preview in range as questions are added or removed.
  const safeStep = Math.min(previewStep, Math.max(active.length - 1, 0));
  const previewed = active[safeStep];

  async function move(index: number, direction: -1 | 1) {
    if (!token || !questions) return;
    const target = active[index + direction];
    const current = active[index];
    if (!target || !current) return;

    setReordering(true);
    try {
      await swapSteps(token, current, target, questions);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't reorder.");
    } finally {
      setReordering(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await deleteQuestion(token, deleteTarget.id);
      toast.success("Question deleted.");
      setDeleteTarget(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the question.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Configuration", "Questionnaire"]}
        title="Customer Questionnaire"
        description="The questions new customers answer when they set up their preferences. Answers feed their personalized PickScores."
        action={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus data-icon="inline-start" />
            Add question
          </Button>
        }
      />

      {/* This is the one screen that edits something customers see immediately. */}
      <OutcomeAlert status="warning" title="This is live to customers">
        Changes apply to the next person who starts the questionnaire. Anyone part-way
        through keeps the version they started with.
      </OutcomeAlert>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold tracking-tight">
              {active.length} step{active.length === 1 ? "" : "s"}, in order
            </h2>
            {reordering && <Spinner className="text-muted-foreground size-3.5" />}
          </div>

          <Card className="py-0">
            {error ? (
              <AdminErrorState message={error} onRetry={() => setReloadTick((t) => t + 1)} />
            ) : questions === null ? (
              <AdminLoadingState />
            ) : questions.length === 0 ? (
              <AdminEmptyState
                icon={ClipboardList}
                title="No questions yet"
                description="Add the first question to start the questionnaire."
              />
            ) : (
              <ul className="divide-line divide-y">
                {active.map((q, i) => (
                  <li key={q.id} className="flex items-center gap-3 p-3.5">
                    <span className="bg-brand-tint text-brand flex size-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold tabular-nums">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold">
                        {q.question_text}
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px]">
                        <span className="font-mono">{q.target_field}</span>
                        <span aria-hidden>·</span>
                        <span>{q.question_type.replace("_", " ")}</span>
                        <span aria-hidden>·</span>
                        <span>
                          {q.options === null
                            ? "options loaded live"
                            : `${q.options.length} options`}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move "${q.question_text}" earlier`}
                        disabled={i === 0 || reordering}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move "${q.question_text}" later`}
                        disabled={i === active.length - 1 || reordering}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit "${q.question_text}"`}
                        onClick={() => setEditing(q)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete "${q.question_text}"`}
                        onClick={() => setDeleteTarget(q)}
                      >
                        <Trash2 className="text-negative" />
                      </Button>
                    </div>
                  </li>
                ))}

                {questions
                  .filter((q) => !q.is_active)
                  .map((q) => (
                    <li key={q.id} className="flex items-center gap-3 p-3.5 opacity-60">
                      <Badge className="bg-surface-2 text-muted-foreground shrink-0">
                        Hidden
                      </Badge>
                      <div className="min-w-0 flex-1 truncate text-[13.5px]">
                        {q.question_text}
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(q)}>
                        <Pencil />
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <p className="text-muted-foreground text-[12px] leading-relaxed">
            Two active questions can never share a position, so reordering moves one out of
            the way and back. Hiding a question frees its position without losing the
            wording.
          </p>
        </div>

        {/* Customer preview */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-tight">What the Customer Sees</h2>
          <Card className="gap-0 p-5">
            {!previewed ? (
              <p className="text-muted-foreground text-[13px]">
                Nothing to preview yet.
              </p>
            ) : (
              <>
                <div className="flex gap-1.5">
                  {active.map((q, i) => (
                    <span
                      key={q.id}
                      className={cn(
                        "h-1 flex-1 rounded-full",
                        i <= safeStep ? "bg-brand" : "bg-surface-2",
                      )}
                    />
                  ))}
                </div>
                <div className="text-muted-foreground mt-3 text-[11.5px] font-semibold tracking-[0.05em] uppercase">
                  Step {safeStep + 1} of {active.length}
                </div>
                <div className="mt-1.5 text-[17px] font-semibold tracking-tight text-balance">
                  {previewed.question_text}
                </div>
                {previewed.help_text && (
                  <p className="text-muted-foreground mt-1.5 text-[12.5px]">
                    {previewed.help_text}
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  {previewed.options === null ? (
                    <p className="border-line text-muted-foreground rounded-xl border border-dashed p-3 text-[12.5px]">
                      Options come from the live brand list, so they change as brands are
                      added or deactivated.
                    </p>
                  ) : previewed.options.length === 0 ? (
                    <p className="text-warning text-[12.5px]">
                      This question has no options, so customers cannot answer it.
                    </p>
                  ) : (
                    previewed.options.map((o, i) => (
                      <div
                        key={i}
                        className="border-line rounded-xl border p-3 text-[13px]"
                      >
                        {o.label}
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeStep === 0}
                    onClick={() => setPreviewStep(safeStep - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeStep >= active.length - 1}
                    onClick={() => setPreviewStep(safeStep + 1)}
                  >
                    Next step
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {editing && (
        <QuestionEditor
          question={editing === "new" ? null : editing}
          existing={questions ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setReloadTick((t) => t + 1);
          }}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.question_text}” will disappear from the questionnaire
              immediately. Answers already given by customers are kept, but no one will be
              asked this again. There is no undo — to take it out temporarily, hide it
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Spinner data-icon="inline-start" />}
              Delete question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
