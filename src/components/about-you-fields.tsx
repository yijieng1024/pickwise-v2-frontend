"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  type UserBackground,
  type UserType,
  getBackground,
  getPreferences,
  updateBackground,
  updatePreferences,
} from "@/lib/api/auth";
import { cn } from "@/lib/utils";

const inputClass =
  "border-line bg-canvas dark:bg-canvas h-11.5 rounded-xl border px-4 text-[13.5px] md:text-[13.5px] transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)] focus-visible:border-line focus-visible:ring-0";

const USER_TYPES: { value: UserType; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "working", label: "Working" },
  { value: "buying_for_business", label: "Buying for a business" },
  { value: "other", label: "Something else" },
];

// Values are the backend's tech_savviness strings; Pico reads them as written.
const KNOWLEDGE = [
  { value: "Not very tech-savvy", label: "Not much — keep it simple" },
  { value: "Somewhat tech-savvy", label: "A bit" },
  { value: "Very tech-savvy", label: "A lot — I know my specs" },
];

const EMPTY: UserBackground = {
  user_type: null,
  field_of_study: null,
  current_laptop: null,
  change_reason: null,
};

type Field = keyof UserBackground | "tech_savviness";

/**
 * The "About you" questions. Every answer is optional and saves on its own
 * (a choice when tapped, text when the field loses focus), so leaving halfway
 * keeps what was answered. Knowledge level is saved to the preferences, so it
 * is only offered once preferences exist (`withKnowledge`): saving it alone
 * would create a preferences row and read as a finished wizard.
 */
export function AboutYouFields({
  token,
  withKnowledge,
}: {
  token: string;
  withKnowledge: boolean;
}) {
  const [saved, setSaved] = useState<UserBackground | null>(null);
  const [draft, setDraft] = useState<UserBackground>(EMPTY);
  const [knowledge, setKnowledge] = useState<string | null>(null);
  const [status, setStatus] = useState<{ field: Field; state: "saving" | "saved" | "error" } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getBackground(token),
      withKnowledge ? getPreferences(token).then((p) => p.tech_savviness) : Promise.resolve(null),
    ])
      .then(([bg, ts]) => {
        if (cancelled) return;
        setSaved(bg);
        setDraft(bg);
        setKnowledge(ts);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, withKnowledge]);

  async function save(field: Field, run: () => Promise<void>) {
    setStatus({ field, state: "saving" });
    try {
      await run();
      setStatus({ field, state: "saved" });
    } catch {
      setStatus({ field, state: "error" });
    }
  }

  function saveBackground(update: Partial<UserBackground>, field: keyof UserBackground) {
    return save(field, async () => {
      const next = await updateBackground(token, update);
      setSaved(next);
      setDraft((d) => ({ ...d, ...update, field_of_study: next.field_of_study }));
    });
  }

  function saveText(field: "field_of_study" | "current_laptop" | "change_reason") {
    const value = draft[field]?.trim() || null;
    if (value === (saved?.[field] ?? null)) return;
    void saveBackground({ [field]: value }, field);
  }

  if (loadError) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Couldn&apos;t load this right now — try again later.
      </p>
    );
  }
  if (!saved) return <Spinner className="size-5 text-muted-foreground" />;

  const note = (field: Field) =>
    status?.field === field ? (
      <span
        aria-live="polite"
        className={cn(
          "text-[12px] font-medium",
          status.state === "error" ? "text-negative" : "text-muted-foreground",
        )}
      >
        {status.state === "saving" ? "Saving…" : status.state === "saved" ? "Saved" : "Couldn't save"}
      </span>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold">
          Which describes you best? {note("user_type")}
        </legend>
        <Pills
          options={USER_TYPES}
          value={draft.user_type}
          onPick={(v) => void saveBackground({ user_type: v as UserType }, "user_type")}
        />
      </fieldset>

      {draft.user_type === "student" && (
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          <span className="flex items-center gap-2">What do you study? {note("field_of_study")}</span>
          <Input
            value={draft.field_of_study ?? ""}
            maxLength={100}
            placeholder="e.g. Computer science, Architecture"
            onChange={(e) => setDraft({ ...draft, field_of_study: e.target.value })}
            onBlur={() => saveText("field_of_study")}
            className={inputClass}
          />
        </label>
      )}

      {withKnowledge && (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold">
            How much do you know about laptops? {note("tech_savviness")}
          </legend>
          <Pills
            options={KNOWLEDGE}
            value={knowledge}
            onPick={(v) =>
              void save("tech_savviness", async () => {
                await updatePreferences(token, { tech_savviness: v });
                setKnowledge(v);
              })
            }
          />
          <p className="text-[12px] text-muted-foreground">Pico explains things at this level.</p>
        </fieldset>
      )}

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        <span className="flex items-center gap-2">What laptop do you use now? {note("current_laptop")}</span>
        <Input
          value={draft.current_laptop ?? ""}
          maxLength={120}
          placeholder="e.g. 2019 MacBook Air, or none"
          onChange={(e) => setDraft({ ...draft, current_laptop: e.target.value })}
          onBlur={() => saveText("current_laptop")}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        <span className="flex items-center gap-2">Why do you want a new one? {note("change_reason")}</span>
        <Textarea
          value={draft.change_reason ?? ""}
          maxLength={500}
          rows={3}
          placeholder="e.g. It's slow, the battery is dead, starting university"
          onChange={(e) => setDraft({ ...draft, change_reason: e.target.value })}
          onBlur={() => saveText("change_reason")}
          className="border-line bg-canvas dark:bg-canvas rounded-xl border px-4 py-3 text-[13.5px] md:text-[13.5px] transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)] focus-visible:border-line focus-visible:ring-0"
        />
      </label>
    </div>
  );
}

function Pills({
  options,
  value,
  onPick,
}: {
  options: { value: string; label: string }[];
  value: string | null;
  onPick: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => !active && onPick(o.value)}
            className={cn(
              "rounded-full border-[1.5px] px-4 py-2 text-[13px] font-medium transition-colors",
              active
                ? "border-brand bg-brand-tint text-brand-text"
                : "border-line bg-surface hover:border-brand",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
