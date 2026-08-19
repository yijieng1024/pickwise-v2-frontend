"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, CheckCircle2, Layers, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type EmptiedFamily,
  type Family,
  type FamilyDetail,
  type LaptopsMoveResult,
  type UnassignedLaptop,
  deleteFamily,
  getFamily,
  listFamilies,
  listUnassigned,
  moveLaptops,
  updateFamily,
} from "@/lib/api/admin/families";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../../admin-states";
import { OutcomeAlert } from "../../../admin-outcome-alert";
import { AdminPageHeader } from "../../../admin-page-header";
import { AdminStatusPill } from "../../../admin-status-pill";

const currency = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

/** A merge moves whole groups of configurations, so every action on this page
 * takes a list — the per-row buttons just pass a list of one. */
function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function AdminFamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuth();
  const router = useRouter();

  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Non-null means the move dialog is open, for exactly these laptops.
  const [moveIds, setMoveIds] = useState<string[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Families the last move left at zero members. The backend reports them and
  // deliberately does not delete them — deleting is the second half of a merge
  // and stays the admin's explicit call, so it surfaces here as an offer.
  const [emptied, setEmptied] = useState<EmptiedFamily[]>([]);

  useEffect(() => {
    let cancelled = false;
    getFamily(id)
      .then((res) => {
        if (cancelled) return;
        setFamily(res);
        setLoadError(null);
        // Rows that were just moved out no longer exist; carrying a stale
        // selection into the next action is how you move the wrong laptops.
        setSelected(new Set());
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Failed to load family.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadTick]);

  // Two seed keys under one family is the signature of a completed merge —
  // worth showing, because it is also the signature of a mis-merge.
  const seedKeys = useMemo(
    () => [...new Set(family?.laptops.map((l) => l.seed_key) ?? [])].sort(),
    [family],
  );

  const members = useMemo(() => family?.laptops ?? [], [family]);
  const allSelected = members.length > 0 && members.every((m) => selected.has(m.laptop_id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(members.map((m) => m.laptop_id)));
  }

  function toggleOne(laptopId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(laptopId)) next.delete(laptopId);
      else next.add(laptopId);
      return next;
    });
  }

  /** Both the per-row "Remove" and the bulk one: a release is a move to
   *  nowhere, so it goes through the same endpoint and reports the same way. */
  async function release(laptopIds: string[]) {
    if (!token || laptopIds.length === 0) return;
    setPending(laptopIds.length === 1 ? laptopIds[0] : "bulk");
    try {
      const result = await moveLaptops(token, laptopIds, null);
      toast.success(`Released ${plural(result.moved, "laptop", "laptops")} to unassigned.`);
      setEmptied(result.emptied_families);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove laptops.");
    } finally {
      setPending(null);
    }
  }

  async function toggleVerified() {
    if (!token || !family) return;
    setPending("verify");
    try {
      const updated = await updateFamily(token, id, { is_verified: !family.is_verified });
      setFamily({ ...family, is_verified: updated.is_verified });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update family.");
    } finally {
      setPending(null);
    }
  }

  /** Delete a family the last move emptied. No confirm dialog: it has no
   *  members, so nothing is released and nothing is lost — unlike the list
   *  page's delete, which can release a family's worth of laptops. */
  async function deleteEmptied(target: EmptiedFamily) {
    if (!token) return;
    setPending(target.family_id);
    try {
      await deleteFamily(token, target.family_id);
      toast.success(`Deleted ${target.name}.`);
      setEmptied((prev) => prev.filter((e) => e.family_id !== target.family_id));
      // Deleting the family you are standing in leaves no page to return to.
      if (target.family_id === id) router.push("/admin/catalog/families");
      else setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete family.");
    } finally {
      setPending(null);
    }
  }

  function afterMove(result: LaptopsMoveResult) {
    setEmptied(result.emptied_families);
    setReloadTick((t) => t + 1);
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        {/* Title matches the nav label, like every other screen — the error
            branch is still the Families page, it just has nothing to show. */}
        <AdminPageHeader
          title="Families"
          description="Members of this product line."
          trail={["Not found"]}
        />
        <Card className="py-0">
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Families"
        description="Members of this product line. Search returns at most one of them per query."
        trail={[family?.name ?? "…"]}
        action={
          family ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending === "verify"}
                onClick={toggleVerified}
              >
                <CheckCircle2 data-icon="inline-start" />
                {family.is_verified ? "Mark unverified" : "Mark verified"}
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus data-icon="inline-start" />
                Add laptops
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* The other half of a merge. The move endpoint reports which source
          families it emptied and never deletes them itself, so the offer
          belongs on screen rather than in a background cleanup. */}
      {emptied.length > 0 && (
        <OutcomeAlert
          status="info"
          title={
            emptied.length === 1
              ? `${emptied[0].name} is now empty`
              : `${emptied.length} families are now empty`
          }
        >
          <div className="flex flex-col gap-2">
            <p>
              The move left {emptied.length === 1 ? "it" : "them"} with no members. Deleting an
              emptied family finishes the merge — no laptop is touched.
            </p>
            <div className="flex flex-wrap gap-2">
              {emptied.map((e) => (
                <Button
                  key={e.family_id}
                  size="sm"
                  // Solid destructive with white text, the same treatment every
                  // other admin delete confirm uses.
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={pending === e.family_id}
                  onClick={() => deleteEmptied(e)}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete {e.name}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setEmptied([])}>
                Keep {emptied.length === 1 ? "it" : "them"}
              </Button>
            </div>
          </div>
        </OutcomeAlert>
      )}

      {family === null ? (
        <Card className="py-0">
          <AdminLoadingState />
        </Card>
      ) : (
        <>
          <Card className="gap-0 p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
              <span className="text-lg font-semibold">{family.name}</span>
              <span className="text-muted-foreground">{family.brand_name}</span>
              <span className="text-muted-foreground tabular-nums">
                {plural(family.member_count, "member", "members")}
              </span>
              <AdminStatusPill kind="verified" value={family.is_verified} />
            </div>
            {seedKeys.length > 0 && (
              <p className="text-muted-foreground mt-2 text-xs">
                Seed key{seedKeys.length > 1 ? "s" : ""}: {seedKeys.join(" · ")}
                {seedKeys.length > 1 &&
                  " — more than one means these were merged by hand. Auto-grouping will keep new configurations of either name here."}
              </p>
            )}
          </Card>

          {selected.size > 0 && (
            <Card className="bg-brand-tint gap-0 border-transparent p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-brand text-[13px] font-semibold">
                  {selected.size} selected
                </span>
                <span className="text-brand/80 text-[12.5px]">
                  {allSelected
                    ? "That is every member — moving them all empties this family, and you will be offered the delete that finishes the merge."
                    : "Moved in one request: either all of them land, or none do."}
                </span>
                <div className="ml-auto flex gap-3">
                  <Button
                    size="sm"
                    disabled={pending !== null}
                    onClick={() => setMoveIds([...selected])}
                  >
                    <ArrowLeftRight data-icon="inline-start" />
                    Move selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending !== null}
                    onClick={() => release([...selected])}
                  >
                    <X data-icon="inline-start" />
                    Remove selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="py-0">
            {members.length === 0 ? (
              <AdminEmptyState
                title="No members"
                description="An empty family can be deleted from the list, or filled by adding laptops."
                icon={Layers}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select every member"
                      />
                    </TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Model code</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.laptop_id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(m.laptop_id)}
                          onCheckedChange={() => toggleOne(m.laptop_id)}
                          aria-label={`Select ${m.product_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/catalog/laptops/${m.laptop_id}/edit`}
                          className="font-medium hover:underline"
                        >
                          {m.product_name}
                        </Link>
                        <p className="text-muted-foreground text-xs">seed: {m.seed_key}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {m.model_code}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {currency.format(m.price_rm)}
                      </TableCell>
                      <TableCell>
                        <AdminStatusPill kind="laptopStatus" value={m.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending !== null}
                            onClick={() => setMoveIds([m.laptop_id])}
                          >
                            <ArrowLeftRight data-icon="inline-start" />
                            Move
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending !== null}
                            onClick={() => release([m.laptop_id])}
                          >
                            <X data-icon="inline-start" />
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}

      <MoveDialog
        laptopIds={moveIds}
        fromFamily={family}
        onOpenChange={(open) => !open && setMoveIds(null)}
        onMoved={afterMove}
      />
      <AddLaptopsDialog
        familyId={id}
        familyName={family?.name}
        brandId={family?.brand_id}
        open={addOpen}
        onOpenChange={setAddOpen}
        onMoved={afterMove}
      />
    </div>
  );
}

/**
 * Moves a selection into another family — one row from the per-row action, or
 * the whole checkbox selection. One request either way, so a merge cannot land
 * half-applied, and the response says which source family it emptied.
 */
function MoveDialog({
  laptopIds,
  fromFamily,
  onOpenChange,
  onMoved,
}: {
  laptopIds: string[] | null;
  fromFamily: FamilyDetail | null;
  onOpenChange: (open: boolean) => void;
  onMoved: (result: LaptopsMoveResult) => void;
}) {
  const { token } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  // The chosen option object, not just its id: Combobox renders the selected
  // item's label in the input, so it needs the option itself back.
  const [target, setTarget] = useState<FamilyOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = laptopIds !== null;
  const count = laptopIds?.length ?? 0;
  const brandId = fromFamily?.brand_id;

  useEffect(() => {
    if (!open || !brandId) return;
    // Same brand only: a configuration cannot belong to another maker's
    // product line, and the full list would be 98 rows to scroll.
    let cancelled = false;
    listFamilies({ brandId })
      .then((rows) => {
        if (!cancelled) setFamilies(rows);
      })
      .catch(() => toast.error("Failed to load families."));
    return () => {
      cancelled = true;
    };
  }, [open, brandId]);

  const targetSig = (laptopIds ?? []).join(",");
  const [prevSig, setPrevSig] = useState(targetSig);
  if (targetSig !== prevSig) {
    setPrevSig(targetSig);
    setTarget(null);
    setError(null);
  }

  // `items` on the root is what Combobox filters as you type, and the
  // `{ value, label }` shape is what lets it show the family's name in the
  // input instead of its UUID — both without any extra props.
  const options: FamilyOption[] = families
    .filter((f) => f.id !== fromFamily?.id)
    .map((f) => ({ value: f.id, label: `${f.name} (${f.member_count})` }));

  // Named when it is one laptop, counted when it is many — a list of fourteen
  // configuration names in a dialog is not something anyone reads.
  const subject =
    count === 1
      ? fromFamily?.laptops.find((l) => l.laptop_id === laptopIds?.[0])?.product_name
      : `${count} configurations`;
  const emptiesSource = fromFamily !== null && count > 0 && count === fromFamily.laptops.length;

  async function handleMove() {
    if (!token || !laptopIds || !target) return;
    setSaving(true);
    setError(null);
    try {
      const result = await moveLaptops(token, laptopIds, target.value);
      toast.success(
        `Moved ${plural(result.moved, "laptop", "laptops")} to ${result.target_family_name}.`,
      );
      onOpenChange(false);
      onMoved(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to move laptops.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {count > 1 ? `Move ${count} laptops to another family` : "Move to another family"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-[13px]">{subject}</p>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="move-target">Destination family</FieldLabel>
              {/* Typeable rather than a plain Select: a busy brand has dozens
                  of families, and scrolling for one by eye is the slow half of
                  a merge. `isItemEqualToValue` because `options` is rebuilt on
                  every render, so the selected object is never referentially
                  the same one the list holds. */}
              <Combobox
                items={options}
                value={target}
                onValueChange={(v) => setTarget(v as FamilyOption | null)}
                isItemEqualToValue={(a, b) =>
                  (a as FamilyOption).value === (b as FamilyOption).value
                }
                autoHighlight
              >
                <ComboboxInput
                  id="move-target"
                  placeholder="Type to find a family"
                  triggerLabel="Show all families"
                />
                <ComboboxContent>
                  <ComboboxEmpty>No family of this brand matches that.</ComboboxEmpty>
                  <ComboboxList>
                    {(item: FamilyOption) => (
                      <ComboboxItem key={item.value} value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Field>
          </FieldGroup>
          {emptiesSource && (
            <p className="text-muted-foreground text-xs">
              This is every member of {fromFamily?.name}, so the move empties it. You will be
              offered the delete that finishes the merge.
            </p>
          )}
          {options.length === 0 && (
            <p className="text-muted-foreground text-xs">
              This brand has no other family. Create one from the families list first.
            </p>
          )}
          {error && <p className="text-negative text-[13px] font-medium">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleMove} disabled={saving || !target}>
            {saving ? "Moving…" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** An option in the destination picker — `{ value, label }` is the shape
 *  Combobox and Select both read labels from without extra props. */
interface FamilyOption {
  value: string;
  label: string;
}

/** What the picker shows, whichever source the rows came from. */
interface CandidateRow {
  laptop_id: string;
  product_name: string;
  model_code: string;
  price_rm: number;
  seed_key: string;
  note?: string;
}

/**
 * Fills a family from either source a member can come from: the unassigned
 * backlog, or another family of the same brand.
 *
 * That second source is the merge itself — the seed grouping over-splits, so
 * "ASUS Vivobook 14" and "Vivobook 14" arrive as two families that are one
 * product line. Ticking a sibling family's whole membership here moves it in
 * one request and empties the sibling, which the page then offers to delete.
 * Ticks survive switching source, so one call can drain several.
 */
function AddLaptopsDialog({
  familyId,
  familyName,
  brandId,
  open,
  onOpenChange,
  onMoved,
}: {
  familyId: string;
  familyName: string | undefined;
  brandId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved: (result: LaptopsMoveResult) => void;
}) {
  const { token } = useAuth();
  const [unassigned, setUnassigned] = useState<UnassignedLaptop[] | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  // Members are fetched per source family and kept, so switching back and
  // forth between two sources does not re-request either.
  const [membersBySource, setMembersBySource] = useState<Record<string, CandidateRow[]>>({});
  const [sourceId, setSourceId] = useState("unassigned");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open via "adjust state during render", not in the effect — the
  // set-state-in-effect lint forbids the effect version, and it leaves the
  // effects below doing only fetches, which is what an effect is for.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setUnassigned(null);
      setFamilies([]);
      setMembersBySource({});
      setSourceId("unassigned");
      setSelected(new Set());
      setSearch("");
      setError(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listUnassigned(500)
      .then((res) => {
        if (!cancelled) setUnassigned(res.laptops);
      })
      .catch(() => toast.error("Failed to load unassigned laptops."));
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !brandId) return;
    let cancelled = false;
    listFamilies({ brandId })
      .then((rows) => {
        if (!cancelled) setFamilies(rows.filter((f) => f.id !== familyId));
      })
      .catch(() => toast.error("Failed to load families."));
    return () => {
      cancelled = true;
    };
  }, [open, brandId, familyId]);

  useEffect(() => {
    if (!open || sourceId === "unassigned") return;
    let cancelled = false;
    getFamily(sourceId)
      .then((res) => {
        if (cancelled) return;
        setMembersBySource((prev) => ({
          ...prev,
          [sourceId]: res.laptops.map((m) => ({
            laptop_id: m.laptop_id,
            product_name: m.product_name,
            model_code: m.model_code,
            price_rm: m.price_rm,
            seed_key: m.seed_key,
          })),
        }));
      })
      .catch(() => toast.error("Failed to load that family's members."));
    return () => {
      cancelled = true;
    };
  }, [open, sourceId]);

  const sourceOptions = useMemo(
    () => [
      { value: "unassigned", label: `Unassigned backlog (${unassigned?.length ?? 0})` },
      ...families.map((f) => ({ value: f.id, label: `${f.name} (${f.member_count})` })),
    ],
    [unassigned, families],
  );

  const rows: CandidateRow[] | null = useMemo(() => {
    if (sourceId !== "unassigned") return membersBySource[sourceId] ?? null;
    if (unassigned === null) return null;
    return unassigned
      .filter((l) => !brandId || l.brand_id === brandId)
      .map((l) => ({
        laptop_id: l.laptop_id,
        product_name: l.product_name,
        model_code: l.model_code,
        price_rm: l.price_rm,
        seed_key: l.seed_key,
        note:
          l.seed_key_siblings > 0
            ? `${l.seed_key_siblings} other unassigned share this seed`
            : undefined,
      }));
  }, [sourceId, membersBySource, unassigned, brandId]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return (rows ?? []).filter(
      (l) =>
        l.product_name.toLowerCase().includes(needle) ||
        l.model_code.toLowerCase().includes(needle),
    );
  }, [rows, search]);

  const allVisibleSelected =
    (visible?.length ?? 0) > 0 && (visible ?? []).every((l) => selected.has(l.laptop_id));

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const l of visible ?? []) {
        if (allVisibleSelected) next.delete(l.laptop_id);
        else next.add(l.laptop_id);
      }
      return next;
    });
  }

  function toggle(laptopId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(laptopId)) next.delete(laptopId);
      else next.add(laptopId);
      return next;
    });
  }

  // Whether the current source would be drained — the case worth naming,
  // because it is what turns "add some laptops" into a completed merge.
  const sourceDrained =
    sourceId !== "unassigned" &&
    (rows?.length ?? 0) > 0 &&
    (rows ?? []).every((l) => selected.has(l.laptop_id));

  async function handleAdd() {
    if (!token || selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const result = await moveLaptops(token, [...selected], familyId);
      toast.success(
        `Moved ${plural(result.moved, "laptop", "laptops")} into ${
          result.target_family_name ?? familyName ?? "this family"
        }.`,
      );
      onOpenChange(false);
      onMoved(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add laptops.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add laptops to {familyName ?? "this family"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={sourceOptions}
              value={sourceId}
              onValueChange={(v) => setSourceId(v as string)}
            >
              <SelectTrigger size="sm" className="w-64" aria-label="Where to take laptops from">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sourceOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or model code"
              className="w-56 flex-1"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Take members from the unassigned backlog, or straight out of another family of this
            brand — that second one is the merge. Ticks are kept when you switch source, so one
            request can pull from several.
          </p>
          <div className="border-line max-h-80 overflow-y-auto rounded-md border">
            {visible === null ? (
              <AdminLoadingState />
            ) : visible.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-[13px]">
                {sourceId === "unassigned"
                  ? "Nothing unassigned for this brand. Run “Regroup unassigned” on the families list, or take members from another family instead."
                  : "That family has no members left."}
              </p>
            ) : (
              <>
                <label className="border-line bg-surface-2 flex cursor-pointer items-center gap-3 border-b p-2.5 text-[12.5px] font-medium">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAllVisible}
                    aria-label="Select everything shown"
                  />
                  Select all {visible.length} shown
                </label>
                <ul className="divide-line divide-y">
                  {visible.map((l) => (
                    <li key={l.laptop_id}>
                      <label className="flex cursor-pointer items-start gap-3 p-3 text-[13px]">
                        <Checkbox
                          className="mt-0.5"
                          checked={selected.has(l.laptop_id)}
                          onCheckedChange={() => toggle(l.laptop_id)}
                          aria-label={`Select ${l.product_name}`}
                        />
                        <span className="flex-1">
                          <span className="font-medium">{l.product_name}</span>
                          <span className="text-muted-foreground block text-xs">
                            {l.model_code} · {currency.format(l.price_rm)} · seed: {l.seed_key}
                            {l.note && ` · ${l.note}`}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {sourceDrained && (
            <p className="text-muted-foreground text-xs">
              Every member of this source is ticked, so the move empties it — you will be offered
              the delete that finishes the merge.
            </p>
          )}
          {error && <p className="text-negative text-[13px] font-medium">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleAdd} disabled={saving || selected.size === 0}>
            {saving ? "Moving…" : `Add ${selected.size || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
