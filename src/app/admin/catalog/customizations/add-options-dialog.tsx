"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type CustomizationCreateInput,
  createCustomizations,
  createCustomizationsByPattern,
} from "@/lib/api/admin/customizations";
import { type Category, listCategories } from "@/lib/api/admin/taxonomy";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

import { OutcomeAlert } from "../../admin-outcome-alert";

type Mode = "laptops" | "pattern";

/**
 * The two create paths, behind one form: pick laptops explicitly
 * (`POST /customizations/`) or match a model-code fragment
 * (`POST /customizations/bulk-by-pattern`).
 *
 * The pattern path is blind and has no undo, so it never submits without
 * showing exactly which laptops it will hit. The preview filters the catalog
 * with `model_code.includes(pattern)` — a **case-sensitive** substring test,
 * because the backend matches with SQLAlchemy `.contains()`, which compiles to
 * `LIKE '%…%'`, not `ILIKE`. Lower-casing here would promise matches the server
 * won't make.
 *
 * Neither endpoint de-duplicates: adding the same option twice stores it twice.
 */
export function AddOptionsDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { token } = useAuth();
  const uid = useId();

  const [mode, setMode] = useState<Mode>("laptops");
  const [catalog, setCatalog] = useState<BackendLaptop[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [laptopSearch, setLaptopSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pattern, setPattern] = useState("");

  // null, not "" — base-ui shows the Select placeholder only when nothing is
  // selected, and an empty string counts as a selection with no matching item.
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [optionName, setOptionName] = useState("");
  const [priceAddRm, setPriceAddRm] = useState("0");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the whole form each time the dialog opens — the "adjust state during
  // render" pattern, not an effect (see laptops-browse.tsx).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMode("laptops");
      setLaptopSearch("");
      setSelectedIds([]);
      setPattern("");
      setCategoryId(null);
      setOptionName("");
      setPriceAddRm("0");
      setNote("");
      setError(null);
    }
  }

  // Both the picker and the pattern preview need every model code, and
  // `GET /laptops/` with no params returns the unpaginated catalog. Fetched
  // once per mount, not per open.
  useEffect(() => {
    if (!open || !token || catalog) return;
    let cancelled = false;
    Promise.all([apiFetch<BackendLaptop[]>("/laptops/"), listCategories()])
      .then(([laptops, cats]) => {
        if (cancelled) return;
        setCatalog(laptops);
        setCategories(cats);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Failed to load the catalog.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, token, catalog]);

  const categoryOptions = useMemo(
    () =>
      (categories ?? []).map((c) => ({
        value: c.id,
        label: c.is_active ? c.name : `${c.name} (inactive)`,
      })),
    [categories],
  );

  const laptopMatches = useMemo(() => {
    if (!catalog) return [];
    const q = laptopSearch.trim().toLowerCase();
    if (!q) return catalog.slice(0, 40);
    return catalog
      .filter(
        (l) =>
          l.product_name.toLowerCase().includes(q) || l.model_code.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [catalog, laptopSearch]);

  // Case-sensitive on purpose — see the component comment.
  const patternMatches = useMemo(() => {
    if (!catalog || !pattern) return [];
    return catalog.filter((l) => l.model_code.includes(pattern));
  }, [catalog, pattern]);

  const targetCount = mode === "laptops" ? selectedIds.length : patternMatches.length;
  const canSubmit =
    !submitting &&
    targetCount > 0 &&
    categoryId !== null &&
    optionName.trim() !== "" &&
    (mode === "laptops" || pattern.trim() !== "");

  function toggleLaptop(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !canSubmit || categoryId === null) return;
    setSubmitting(true);
    setError(null);

    const input: CustomizationCreateInput = {
      category_id: categoryId,
      option_name: optionName.trim(),
      price_add_rm: Number(priceAddRm) || 0,
      dependency_note: note.trim() || null,
    };

    try {
      const created =
        mode === "laptops"
          ? await createCustomizations(token, selectedIds, input)
          : await createCustomizationsByPattern(token, pattern, input);
      toast.success(
        `Added "${input.option_name}" to ${created.length} laptop${created.length === 1 ? "" : "s"}.`,
      );
      onOpenChange(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add the option.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* flex, not the base grid: the body has to be the only part that
          scrolls, so the panel is a column of header / scrolling body / pinned
          footer, capped below the viewport height. `min-w-0` all the way down
          the column — flex and grid children default to `min-width: auto`, so
          without it a long product name widens the panel past its max-width
          instead of truncating inside it. */}
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add an upgrade option</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList>
                <TabsTrigger value="laptops">Choose laptops</TabsTrigger>
                <TabsTrigger value="pattern">Match model code</TabsTrigger>
              </TabsList>
            </Tabs>

            {loadError ? (
              <p className="text-[13px] font-medium text-negative">{loadError}</p>
            ) : catalog === null ? (
              <div className="flex items-center gap-2 py-6 text-[13px] text-muted-foreground">
                <Spinner />
                Loading the catalog…
              </div>
            ) : mode === "laptops" ? (
              <div className="flex min-w-0 flex-col gap-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search laptops by name or model code…"
                    aria-label="Search laptops by name or model code"
                    autoComplete="off"
                    value={laptopSearch}
                    onChange={(e) => setLaptopSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="border-line max-h-56 min-w-0 overflow-y-auto rounded-lg border p-1">
                  {laptopMatches.length === 0 ? (
                    <p className="p-3 text-[13px] text-muted-foreground">No laptops match.</p>
                  ) : (
                    laptopMatches.map((l) => (
                      <label
                        key={l.id}
                        className="hover:bg-surface-2 flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px]"
                      >
                        <Checkbox
                          checked={selectedIds.includes(l.id)}
                          onCheckedChange={() => toggleLaptop(l.id)}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {l.product_name}{" "}
                          <span className="text-muted-foreground">({l.model_code})</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-[12.5px] text-muted-foreground">
                  {selectedIds.length} selected
                  {laptopSearch.trim() === "" && catalog.length > laptopMatches.length
                    ? ` · showing the first ${laptopMatches.length} of ${catalog.length} — search to narrow`
                    : ""}
                </p>
              </div>
            ) : (
              <div className="flex min-w-0 flex-col gap-2">
                <Field>
                  <FieldLabel htmlFor={`${uid}-pattern`}>Model code contains</FieldLabel>
                  <Input
                    id={`${uid}-pattern`}
                    placeholder="e.g. m5-max"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    // Matching is case-sensitive against model codes, so
                    // autocorrect must not touch what is typed here.
                    spellCheck={false}
                    autoComplete="off"
                  />
                </Field>
                {pattern.trim() === "" ? (
                  <p className="text-[12.5px] text-muted-foreground">
                    Matching is case-sensitive, and every matching laptop gets the option.
                  </p>
                ) : patternMatches.length === 0 ? (
                  <OutcomeAlert status="warning" title="No laptops match this pattern">
                    Matching is case-sensitive — check the capitalization against a real model
                    code. Submitting would be rejected with a 404.
                  </OutcomeAlert>
                ) : (
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-[12.5px] font-semibold">
                      {patternMatches.length} laptop{patternMatches.length === 1 ? "" : "s"} will
                      get this option:
                    </p>
                    <div className="border-line max-h-40 min-w-0 overflow-y-auto rounded-lg border p-1">
                      {patternMatches.map((l) => (
                        <div key={l.id} className="truncate px-2.5 py-1 text-[13px]">
                          {l.product_name}{" "}
                          <span className="text-muted-foreground">({l.model_code})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel>Tag</FieldLabel>
                <Select
                  items={categoryOptions}
                  value={categoryId}
                  onValueChange={(v) => setCategoryId(v as string | null)}
                >
                  <SelectTrigger aria-label="Tag" className="w-full">
                    <SelectValue placeholder="Pick a tag…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categoryOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${uid}-option-name`}>Option name</FieldLabel>
                <Input
                  id={`${uid}-option-name`}
                  placeholder="e.g. +16GB RAM"
                  value={optionName}
                  onChange={(e) => setOptionName(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${uid}-price`}>Price add-on (RM)</FieldLabel>
                <Input
                  id={`${uid}-price`}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={priceAddRm}
                  onChange={(e) => setPriceAddRm(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${uid}-note`}>Note (optional)</FieldLabel>
                <Input
                  id={`${uid}-note`}
                  placeholder="e.g. requires the 512GB SSD"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </FieldGroup>

            {targetCount > 0 && (
              <p className="text-[12.5px] text-muted-foreground">
                Adds one option to {targetCount} laptop{targetCount === 1 ? "" : "s"}. There is
                no undo, and adding the same option twice stores it twice.
              </p>
            )}
            {error && <p className="text-[13px] font-medium text-negative">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit}>
              {submitting && <Spinner data-icon="inline-start" />}
              {submitting ? "Adding…" : `Add to ${targetCount} laptop${targetCount === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
