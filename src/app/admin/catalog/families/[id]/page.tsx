"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, CheckCircle2, Layers, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  type Family,
  type FamilyDetail,
  type UnassignedLaptop,
  addLaptopsToFamily,
  getFamily,
  listFamilies,
  listUnassigned,
  removeLaptopFromFamily,
  updateFamily,
} from "@/lib/api/admin/families";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../../admin-states";
import { AdminPageHeader } from "../../../admin-page-header";
import { AdminStatusPill } from "../../../admin-status-pill";

const currency = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

export default function AdminFamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuth();

  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFamily(id)
      .then((res) => {
        if (cancelled) return;
        setFamily(res);
        setLoadError(null);
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

  async function release(laptopId: string) {
    if (!token) return;
    setPending(laptopId);
    try {
      await removeLaptopFromFamily(token, id, laptopId);
      toast.success("Released to unassigned.");
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove laptop.");
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
                {family.member_count} member{family.member_count === 1 ? "" : "s"}
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

          <Card className="py-0">
            {family.laptops.length === 0 ? (
              <AdminEmptyState
                title="No members"
                description="An empty family can be deleted from the list, or filled by adding laptops."
                icon={Layers}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Model code</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {family.laptops.map((m) => (
                    <TableRow key={m.laptop_id}>
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
                            onClick={() => setMoveTarget(m.laptop_id)}
                          >
                            <ArrowLeftRight data-icon="inline-start" />
                            Move
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending === m.laptop_id}
                            onClick={() => release(m.laptop_id)}
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
        laptopId={moveTarget}
        fromFamily={family}
        onOpenChange={(open) => !open && setMoveTarget(null)}
        onMoved={() => setReloadTick((t) => t + 1)}
      />
      <AddLaptopsDialog
        familyId={id}
        brandId={family?.brand_id}
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => setReloadTick((t) => t + 1)}
      />
    </div>
  );
}

/**
 * A merge, one laptop at a time. The bulk path is the other direction — open
 * the family that should keep the members and use "Add laptops" — but moving
 * a single stray configuration out is common enough to want here.
 */
function MoveDialog({
  laptopId,
  fromFamily,
  onOpenChange,
  onMoved,
}: {
  laptopId: string | null;
  fromFamily: FamilyDetail | null;
  onOpenChange: (open: boolean) => void;
  onMoved: () => void;
}) {
  const { token } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [targetId, setTargetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = laptopId !== null;
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

  const targetSig = `${laptopId ?? ""}`;
  const [prevSig, setPrevSig] = useState(targetSig);
  if (targetSig !== prevSig) {
    setPrevSig(targetSig);
    setTargetId("");
    setError(null);
  }

  // One list drives both the options and SelectValue's label lookup — without
  // `items` the trigger would show the destination family's UUID instead of
  // its name once one is chosen.
  const options = families
    .filter((f) => f.id !== fromFamily?.id)
    .map((f) => ({ value: f.id, label: `${f.name} (${f.member_count})` }));
  const member = fromFamily?.laptops.find((l) => l.laptop_id === laptopId);

  async function handleMove() {
    if (!token || !laptopId || !targetId) return;
    setSaving(true);
    setError(null);
    try {
      await addLaptopsToFamily(token, targetId, [laptopId]);
      toast.success("Moved.");
      onOpenChange(false);
      onMoved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to move laptop.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to another family</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-[13px]">{member?.product_name}</p>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="move-target">Destination family</FieldLabel>
              <Select
                items={options}
                value={targetId}
                onValueChange={(v) => setTargetId(v as string)}
              >
                <SelectTrigger id="move-target">
                  <SelectValue placeholder="Choose a family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {options.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          {options.length === 0 && (
            <p className="text-muted-foreground text-xs">
              This brand has no other family. Create one from the families list first.
            </p>
          )}
          {error && <p className="text-[13px] font-medium text-negative">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleMove} disabled={saving || !targetId}>
            {saving ? "Moving…" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Fills a family from the unassigned backlog — the laptops that are currently
 * deduplicated against nothing. Members of *other* families are moved with the
 * per-row Move action instead, so this list can stay a plain multi-select.
 */
function AddLaptopsDialog({
  familyId,
  brandId,
  open,
  onOpenChange,
  onAdded,
}: {
  familyId: string;
  brandId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState<UnassignedLaptop[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open via "adjust state during render", not in the effect — the
  // set-state-in-effect lint forbids the effect version, and it leaves the
  // effect below doing only the fetch, which is what an effect is for.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCandidates(null);
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
        if (!cancelled) setCandidates(res.laptops);
      })
      .catch(() => toast.error("Failed to load unassigned laptops."));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const visible = useMemo(() => {
    const rows = (candidates ?? []).filter((l) => !brandId || l.brand_id === brandId);
    const needle = search.trim().toLowerCase();
    return needle
      ? rows.filter(
          (l) =>
            l.product_name.toLowerCase().includes(needle) ||
            l.model_code.toLowerCase().includes(needle),
        )
      : rows;
  }, [candidates, brandId, search]);

  function toggle(laptopId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(laptopId)) next.delete(laptopId);
      else next.add(laptopId);
      return next;
    });
  }

  async function handleAdd() {
    if (!token || selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      await addLaptopsToFamily(token, familyId, [...selected]);
      toast.success(`Added ${selected.size} laptop${selected.size > 1 ? "s" : ""}.`);
      onOpenChange(false);
      onAdded();
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
          <DialogTitle>Add unassigned laptops</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name or model code"
          />
          <div className="border-line max-h-80 overflow-y-auto rounded-md border">
            {candidates === null ? (
              <AdminLoadingState />
            ) : visible.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-[13px]">
                Nothing unassigned for this brand. Run “Regroup unassigned” on the families list, or
                move a laptop out of another family first.
              </p>
            ) : (
              <ul className="divide-line divide-y">
                {visible.map((l) => (
                  <li key={l.laptop_id}>
                    <label className="flex cursor-pointer items-start gap-3 p-3 text-[13px]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected.has(l.laptop_id)}
                        onChange={() => toggle(l.laptop_id)}
                      />
                      <span className="flex-1">
                        <span className="font-medium">{l.product_name}</span>
                        <span className="text-muted-foreground block text-xs">
                          {l.model_code} · {currency.format(l.price_rm)} · seed: {l.seed_key}
                          {l.seed_key_siblings > 0 &&
                            ` · ${l.seed_key_siblings} other unassigned share this seed`}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="text-[13px] font-medium text-negative">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleAdd} disabled={saving || selected.size === 0}>
            {saving ? "Adding…" : `Add ${selected.size || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
