"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { listProductTypes } from "@/lib/api/admin/taxonomy";
import {
  type AdminQuestion,
  type QuestionOption,
  type QuestionType,
  TARGET_FIELDS,
  createQuestion,
  updateQuestion,
} from "@/lib/api/admin/questionnaire";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { OutcomeAlert } from "../admin-outcome-alert";

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: "single_choice", label: "Single choice" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "ranking", label: "Ranking" },
];

/**
 * Options are stored as untyped JSON. Most questions use a plain string value
 * per option, but the budget question stores `{min, max}` objects — so a
 * label/value pair editor would quietly destroy it on the first save.
 *
 * Anything whose values are all strings gets the simple editor; anything else
 * falls back to raw JSON, which is honest about what is being edited rather
 * than pretending the structure is simpler than it is.
 */
function allValuesAreStrings(options: QuestionOption[] | null): boolean {
  return options !== null && options.every((o) => typeof o.value === "string");
}

export function QuestionEditor({
  question,
  existing,
  onClose,
  onSaved,
}: {
  question: AdminQuestion | null;
  existing: AdminQuestion[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const isNew = question === null;

  const [text, setText] = useState(question?.question_text ?? "");
  const [helpText, setHelpText] = useState(question?.help_text ?? "");
  const [type, setType] = useState<QuestionType>(question?.question_type ?? "single_choice");
  const [targetField, setTargetField] = useState(question?.target_field ?? "purpose");
  const [isActive, setIsActive] = useState(question?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  // `null` means "populated live from another source" and must survive a save
  // untouched — coercing it to [] would empty the brand question.
  const [optionsAreLive, setOptionsAreLive] = useState(question?.options === null);
  const simpleMode = question === null || allValuesAreStrings(question.options);

  const [options, setOptions] = useState<QuestionOption[]>(
    question?.options && allValuesAreStrings(question.options) ? question.options : [],
  );
  const [rawJson, setRawJson] = useState(
    question?.options && !allValuesAreStrings(question.options)
      ? JSON.stringify(question.options, null, 2)
      : "",
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const targetNote = useMemo(
    () => TARGET_FIELDS.find((f) => f.value === targetField)?.note,
    [targetField],
  );

  function buildOptions(): QuestionOption[] | null | undefined {
    if (optionsAreLive) return null;
    if (simpleMode) return options.filter((o) => o.label.trim() !== "");
    try {
      const parsed = JSON.parse(rawJson);
      if (!Array.isArray(parsed)) throw new Error("Expected a list of options.");
      setJsonError(null);
      return parsed as QuestionOption[];
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "That isn't valid JSON.");
      return undefined; // signals "don't save"
    }
  }

  async function save() {
    if (!token) return;
    if (text.trim() === "") {
      toast.error("The question needs some wording.");
      return;
    }

    const built = buildOptions();
    if (built === undefined) return;

    setSaving(true);
    try {
      if (isNew) {
        // New questions go to the end, which is always free — the backend
        // rejects two active questions sharing a position.
        const productTypes = await listProductTypes();
        const laptop = productTypes.find((p) => p.name.toLowerCase() === "laptop");
        if (!laptop) throw new Error("No 'laptop' product type exists to attach this to.");

        await createQuestion(token, {
          product_type_id: laptop.id,
          step_order: Math.max(...existing.map((q) => q.step_order), 0) + 1,
          question_text: text.trim(),
          question_type: type,
          target_field: targetField,
          options: built,
          help_text: helpText.trim() || null,
          is_active: isActive,
        });
        toast.success("Question added at the end. Move it into place from the list.");
      } else {
        await updateQuestion(token, question.id, {
          question_text: text.trim(),
          question_type: type,
          target_field: targetField,
          options: built,
          help_text: helpText.trim() || null,
          is_active: isActive,
        });
        toast.success("Question updated. Customers see it on their next start.");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the question.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add a question" : "Edit question"}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="q-text">Question</FieldLabel>
              <Textarea
                id="q-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What will you mainly use the laptop for?"
                rows={2}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="q-help">Helper text</FieldLabel>
              <Input
                id="q-help"
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                placeholder="Optional. Shown under the question."
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Answer type</FieldLabel>
                <Select
                  items={QUESTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  value={type}
                  onValueChange={(v) => setType(v as QuestionType)}
                >
                  <SelectTrigger aria-label="Answer type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {QUESTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Stores the answer in</FieldLabel>
                <Select
                  items={TARGET_FIELDS.map((f) => ({ value: f.value, label: f.label }))}
                  value={targetField}
                  onValueChange={(v) => setTargetField(v as string)}
                >
                  <SelectTrigger aria-label="Stores the answer in">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TARGET_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {targetNote && (
                  <p className="text-muted-foreground text-[12px]">{targetNote}</p>
                )}
              </Field>
            </div>

            <Field>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="accent-brand size-3.5"
                />
                Show this question to customers
              </label>
              <p className="text-muted-foreground text-[12px]">
                Hiding it frees its position without losing the wording.
              </p>
            </Field>

            <Field>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={optionsAreLive}
                  onChange={(e) => setOptionsAreLive(e.target.checked)}
                  className="accent-brand size-3.5"
                />
                Load the choices from live data instead
              </label>
              <p className="text-muted-foreground text-[12px]">
                Used by the brand question, whose choices come from the brand list rather
                than being typed here.
              </p>
            </Field>

            {!optionsAreLive && simpleMode && (
              <Field>
                {/* Labels a repeating list rather than one control, so it names
                    a group; each row's two inputs carry their own labels since
                    otherwise only the placeholder tells them apart. */}
                <FieldLabel id="q-choices-label">Choices</FieldLabel>
                <div
                  role="group"
                  aria-labelledby="q-choices-label"
                  className="flex flex-col gap-2"
                >
                  {options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={o.label}
                        placeholder="What the customer reads"
                        aria-label={`Choice ${i + 1} label`}
                        onChange={(e) =>
                          setOptions((prev) =>
                            prev.map((p, j) =>
                              j === i ? { ...p, label: e.target.value } : p,
                            ),
                          )
                        }
                      />
                      <Input
                        value={typeof o.value === "string" ? o.value : ""}
                        placeholder="Stored value"
                        aria-label={`Choice ${i + 1} stored value`}
                        spellCheck={false}
                        className="max-w-[11rem] font-mono text-[12.5px]"
                        onChange={(e) =>
                          setOptions((prev) =>
                            prev.map((p, j) =>
                              j === i ? { ...p, value: e.target.value } : p,
                            ),
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove choice ${i + 1}`}
                        onClick={() =>
                          setOptions((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="text-negative" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => setOptions((prev) => [...prev, { value: "", label: "" }])}
                  >
                    <Plus data-icon="inline-start" />
                    Add a choice
                  </Button>
                </div>
              </Field>
            )}

            {!optionsAreLive && !simpleMode && (
              <Field>
                <FieldLabel htmlFor="q-json">Choices (raw)</FieldLabel>
                <OutcomeAlert status="info" title="Edited as JSON">
                  This question&apos;s stored values aren&apos;t plain text — the budget
                  ranges are objects, for example. The simple editor would flatten them, so
                  it is shown as JSON instead.
                </OutcomeAlert>
                <Textarea
                  id="q-json"
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  rows={10}
                  className="font-mono text-[12.5px]"
                />
                {jsonError && <p className="text-negative text-[12.5px]">{jsonError}</p>}
              </Field>
            )}
          </FieldGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}
            {isNew ? "Add question" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
