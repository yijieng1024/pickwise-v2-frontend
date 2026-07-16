"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Battery,
  Briefcase,
  Code,
  Cpu,
  Film,
  Gamepad2,
  Loader2,
  Monitor,
  Tag,
  Weight,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { type UserPreferences, updatePreferences } from "@/lib/api/auth";
import type {
  Brand,
  QuestionnaireQuestion,
  QuestionOption,
} from "@/lib/api/questionnaire";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/** Sentinel option value for "No preference" on the brand question. */
const NO_PREFERENCE = "__none__";

// Icons keyed by option value first, then by target_field as fallback —
// the backend catalog carries no iconography.
const OPTION_ICONS: Record<string, LucideIcon> = {
  "Office/Study": Briefcase,
  "Programming/Development": Code,
  Gaming: Gamepad2,
  "Creative Work": Film,
  "General Use": Monitor,
  price: Banknote,
  cpu: Cpu,
  gpu: Gamepad2,
  portability: Weight,
  battery: Battery,
  brand: Tag,
};

const FIELD_ICONS: Record<string, LucideIcon> = {
  budget: Banknote,
  purpose: Briefcase,
  priorities: Zap,
  screen_size: Monitor,
  portability: Weight,
  brand_preferences: Tag,
};

function optionIcon(question: QuestionnaireQuestion, option: QuestionOption) {
  if (typeof option.value === "string" && OPTION_ICONS[option.value]) {
    return OPTION_ICONS[option.value];
  }
  return FIELD_ICONS[question.target_field] ?? Tag;
}

/** single_choice holds one option index; ranking/multiple hold an ordered list. */
type Selection = number | number[];

interface WizardClientProps {
  questions: QuestionnaireQuestion[];
  brands: Brand[];
}

export function WizardClient({ questions, brands }: WizardClientProps) {
  const router = useRouter();
  const { user, token, isLoading, markPreferencesSaved } = useAuth();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth-gated page: preferences save to the account, so anonymous visitors
  // are bounced to /login before answering anything.
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user || !token) {
    return (
      <main className="flex w-full flex-1 items-center justify-center py-24">
        <Loader2 className="h-6 w-6 text-muted-foreground motion-safe:animate-spin" />
      </main>
    );
  }

  const current = questions[step];
  const options = displayOptions(current, brands);
  const selection = selections[current.id];
  const isRanking = current.question_type === "ranking";
  const isMulti = current.question_type === "multiple_choice";

  const stepComplete = isRanking
    ? Array.isArray(selection) && selection.length === options.length
    : isMulti
      ? Array.isArray(selection) && selection.length > 0
      : typeof selection === "number";

  function pick(index: number) {
    setError(null);
    setSelections((prev) => {
      const prevSel = prev[current.id];
      if (isRanking) {
        const order = Array.isArray(prevSel) ? prevSel : [];
        const next = order.includes(index)
          ? order.filter((i) => i !== index) // tap again to un-rank
          : [...order, index];
        return { ...prev, [current.id]: next };
      }
      if (isMulti) {
        const picked = Array.isArray(prevSel) ? prevSel : [];
        const isNone = options[index].value === NO_PREFERENCE;
        if (isNone) return { ...prev, [current.id]: [index] };
        const withoutNone = picked.filter(
          (i) => options[i].value !== NO_PREFERENCE,
        );
        const next = withoutNone.includes(index)
          ? withoutNone.filter((i) => i !== index)
          : [...withoutNone, index];
        return { ...prev, [current.id]: next };
      }
      return { ...prev, [current.id]: index };
    });
  }

  async function next() {
    // token is guaranteed by the auth gate above; re-checked for narrowing.
    if (!stepComplete || submitting || !token) return;
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await updatePreferences(token, buildPreferences(questions, brands, selections));
      markPreferencesSaved();
      router.push("/chat");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save preferences.",
      );
      setSubmitting(false);
    }
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <main className="flex min-h-[calc(100vh-164px)] flex-1 items-start justify-center px-4 py-16 sm:px-6">
      <div className="border-line bg-surface w-full max-w-[680px] rounded-3xl border p-8 shadow-[0_16px_48px_var(--shadow)] motion-safe:animate-fade-in-up sm:p-11">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Needs Wizard
          </span>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            Step {step + 1} of {questions.length}
          </span>
        </div>
        <div className="bg-surface-2 mb-9 h-[3px] overflow-hidden rounded-full">
          <div
            className="bg-brand h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>

        <h2 className="mb-2 text-[28px] leading-tight font-bold tracking-tight">
          {current.question_text}
        </h2>
        <p className="mb-7 text-sm leading-relaxed text-muted-foreground">
          {isRanking
            ? "Tap the cards in order of importance — 1 is what matters most. Tap again to undo."
            : (current.help_text ?? "")}
        </p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {options.map((option, i) => {
            const Icon = optionIcon(current, option);
            const rank =
              isRanking && Array.isArray(selection)
                ? selection.indexOf(i)
                : -1;
            const active =
              isRanking || isMulti
                ? Array.isArray(selection) && selection.includes(i)
                : selection === i;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => pick(i)}
                className={cn(
                  "relative rounded-2xl border-[1.5px] p-5.5 text-left transition-all hover:border-brand hover:shadow-[0_8px_24px_var(--shadow)]",
                  active
                    ? "border-brand bg-brand-tint shadow-[0_8px_24px_var(--shadow)]"
                    : "border-line bg-surface",
                )}
              >
                {rank >= 0 && (
                  <span className="bg-brand absolute top-3.5 right-3.5 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white tabular-nums">
                    {rank + 1}
                  </span>
                )}
                <Icon
                  className={cn(
                    "mb-3 block h-5.5 w-5.5",
                    active ? "text-brand" : "text-muted-foreground",
                  )}
                  strokeWidth={1.8}
                />
                <span className="block text-[15px] font-semibold">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="bg-negative/10 mt-6 rounded-xl px-4 py-3 text-[12.5px] font-medium text-negative">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            className={cn(
              "rounded-full px-4.5 py-2.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              step === 0 && "invisible",
            )}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!stepComplete || submitting}
            className={cn(
              "rounded-full px-6 py-2.5 text-[13.5px] font-semibold transition-opacity",
              stepComplete && !submitting
                ? "bg-brand text-white hover:opacity-90"
                : "bg-surface-2 cursor-default text-muted-foreground opacity-60",
            )}
          >
            {submitting
              ? "Saving…"
              : step === questions.length - 1
                ? "Save & see my matches"
                : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}

/** The brand question ships `options: null` — build its list from /brands. */
function displayOptions(
  question: QuestionnaireQuestion,
  brands: Brand[],
): QuestionOption[] {
  if (question.options && question.options.length > 0) {
    return question.options;
  }
  if (question.target_field === "brand_preferences") {
    return [
      { value: NO_PREFERENCE, label: "No preference" },
      ...brands.map((b) => ({ value: b.name, label: b.name })),
    ];
  }
  return [];
}

/** Maps answers onto the backend's LaptopUserPreference fields. */
function buildPreferences(
  questions: QuestionnaireQuestion[],
  brands: Brand[],
  selections: Record<string, Selection>,
): Partial<UserPreferences> {
  const prefs: Partial<UserPreferences> = {};

  for (const q of questions) {
    const options = displayOptions(q, brands);
    const sel = selections[q.id];

    const single =
      typeof sel === "number" ? options[sel]?.value : undefined;
    const many = Array.isArray(sel)
      ? sel.map((i) => options[i]?.value).filter((v) => v !== undefined)
      : [];

    switch (q.target_field) {
      case "budget":
        prefs.budget = single as { min?: number | null; max?: number | null };
        break;
      case "purpose":
        prefs.purpose =
          typeof sel === "number" ? [single as string] : (many as string[]);
        break;
      case "priorities": {
        // Rank → weight via the same N−i rule as the engine's
        // DEFAULT_PRIORITY: first pick weighs options.length, last weighs 1
        // (matching the engine's default of 1 for unranked factors).
        const weights: Record<string, number> = {};
        (sel as number[]).forEach((optIndex, rank) => {
          weights[options[optIndex].value as string] = options.length - rank;
        });
        prefs.priorities = weights;
        break;
      }
      case "screen_size":
        prefs.screen_size =
          typeof sel === "number" ? [single as string] : (many as string[]);
        break;
      case "portability":
        prefs.portability = single as string;
        break;
      case "brand_preferences": {
        const values = typeof sel === "number" ? [single] : many;
        prefs.brand_preferences = values.filter(
          (v): v is string => typeof v === "string" && v !== NO_PREFERENCE,
        );
        break;
      }
    }
  }

  return prefs;
}
