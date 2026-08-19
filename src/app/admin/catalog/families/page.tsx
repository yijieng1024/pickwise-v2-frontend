"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Shuffle,
  Trash2,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  type RegroupResult,
  createFamily,
  deleteFamily,
  listFamilies,
  listUnassigned,
  regroupFamilies,
  updateFamily,
} from "@/lib/api/admin/families";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { BackendBrand } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

import { useAdminQuery } from "../../admin-query-state";
import { OutcomeAlert } from "../../admin-outcome-alert";
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../admin-states";
import { AdminPageHeader } from "../../admin-page-header";
import { AdminStatusPill, toneClass } from "../../admin-status-pill";

const VERIFIED_OPTIONS = [
  { value: "all", label: "All families" },
  { value: "false", label: "Unverified only" },
  { value: "true", label: "Verified only" },
];

export default function AdminCatalogFamiliesPage() {
  const { token } = useAuth();
  const [families, setFamilies] = useState<Family[] | null>(null);
  const [brands, setBrands] = useState<BackendBrand[]>([]);
  const [unassigned, setUnassigned] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Family | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Family | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [regrouping, setRegrouping] = useState(false);
  const [regroupResult, setRegroupResult] = useState<RegroupResult | null>(null);
  const [verifyPending, setVerifyPending] = useState<string | null>(null);

  const query = useAdminQuery({ filters: { brand: "all", verified: "all" } });
  const { brand: brandId, verified } = query.values;

  const brandOptions = useMemo(
    () => [
      { value: "all", label: "All brands" },
      ...[...brands]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => ({ value: b.id, label: b.name })),
    ],
    [brands],
  );

  useEffect(() => {
    apiFetch<BackendBrand[]>("/brands")
      .then(setBrands)
      .catch(() => toast.error("Failed to load brands."));
  }, []);

  // Drop stale rows the moment the filters change, so the table shows a
  // spinner rather than the previous filter's results — "adjust state during
  // render", since the set-state-in-effect lint forbids the effect version.
  const paramsSig = `${query.signature}:${reloadTick}`;
  const [prevParamsSig, setPrevParamsSig] = useState(paramsSig);
  if (paramsSig !== prevParamsSig) {
    setPrevParamsSig(paramsSig);
    setFamilies(null);
    setLoadError(null);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listFamilies({
        brandId: brandId === "all" ? undefined : brandId,
        isVerified: verified === "all" ? undefined : verified === "true",
      }),
      // The backlog is deliberately NOT filtered alongside the table: it is a
      // catalog-wide number, and shrinking it to match a brand filter would
      // make "how much is left" depend on what you happened to be looking at.
      listUnassigned(1),
    ])
      .then(([rows, backlog]) => {
        if (cancelled) return;
        setFamilies(rows);
        setUnassigned(backlog.count);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : "Failed to load families.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [brandId, verified, reloadTick]);

  async function runRegroup() {
    if (!token) return;
    setRegrouping(true);
    setRegroupResult(null);
    try {
      const result = await regroupFamilies(token);
      setRegroupResult(result);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Regroup failed.");
    } finally {
      setRegrouping(false);
    }
  }

  async function toggleVerified(family: Family) {
    if (!token) return;
    setVerifyPending(family.id);
    try {
      await updateFamily(token, family.id, { is_verified: !family.is_verified });
      setFamilies((rows) =>
        rows?.map((r) => (r.id === family.id ? { ...r, is_verified: !r.is_verified } : r)) ?? rows,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update family.");
    } finally {
      setVerifyPending(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await deleteFamily(token, deleteTarget.id);
      toast.success(
        deleteTarget.member_count > 0
          ? `Deleted ${deleteTarget.name}; ${deleteTarget.member_count} laptop${
              deleteTarget.member_count > 1 ? "s" : ""
            } released to unassigned.`
          : `Deleted ${deleteTarget.name}.`,
      );
      setDeleteTarget(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete family.");
    } finally {
      setDeleting(false);
    }
  }

  const unverifiedCount = families?.filter((f) => !f.is_verified).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Families"
        description="Product lines the search shortlist deduplicates on — one result per family."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runRegroup} disabled={regrouping || !token}>
              <Shuffle data-icon="inline-start" />
              {regrouping ? "Regrouping…" : "Regroup unassigned"}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              New family
            </Button>
          </div>
        }
      />

      {/* The backlog number, always on screen. A laptop with no family is not
          deduplicated against its siblings, so it can fill a shortlist with
          five configurations of one machine — that cost should never need a
          query to see. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Families" value={families?.length ?? null} />
        <StatTile label="Unverified" value={families === null ? null : unverifiedCount} />
        <StatTile
          label="Laptops with no family"
          value={unassigned}
          hint={
            unassigned === 0
              ? "Nothing waiting."
              : "Not deduplicated in search until grouped."
          }
          emphasize={unassigned !== null && unassigned > 0}
        />
      </div>

      {regroupResult && (
        <OutcomeAlert
          status={regroupResult.left_null > 0 ? "warning" : "success"}
          title={
            regroupResult.families_created === 0 && regroupResult.laptops_assigned === 0
              ? "Nothing to regroup"
              : `Created ${regroupResult.families_created} · assigned ${regroupResult.laptops_assigned}`
          }
        >
          {regroupResult.left_null > 0
            ? `${regroupResult.left_null} laptop(s) left unassigned: their name matches laptops that
               sit in two different families, so the grouping refused to pick a side. Place those by
               hand from a family's detail page.`
            : "Auto-grouping only touches laptops with no family, so re-running it never undoes a merge."}
        </OutcomeAlert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* `items` is not optional: SelectValue renders the *label* for the
            current value by looking it up here, so without it the trigger
            shows the raw value — "all", or a bare brand UUID once one is
            picked. Same on every Select in this file. */}
        <Select
          items={brandOptions}
          value={brandId}
          onValueChange={(v) => query.set({ brand: v as string })}
        >
          <SelectTrigger size="sm" className="w-44" aria-label="Filter by brand">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {brandOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          items={VERIFIED_OPTIONS}
          value={verified}
          onValueChange={(v) => query.set({ verified: v as string })}
        >
          <SelectTrigger size="sm" className="w-44" aria-label="Filter by verified state">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {VERIFIED_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0">
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : families === null ? (
          <AdminLoadingState />
        ) : families.length === 0 ? (
          <AdminEmptyState
            title="No families here"
            description="Run “Regroup unassigned” to seed families from product names, then merge them up to product lines."
            icon={Layers}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {families.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Link
                      href={`/admin/catalog/families/${f.id}`}
                      className="font-medium hover:underline"
                    >
                      {f.name}
                    </Link>
                    {f.family_key && (
                      <p className="text-muted-foreground text-xs">seed: {f.family_key}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{f.brand_name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {/* A one-member family is usually an over-split the seed
                        key produced, not a one-configuration machine. */}
                    {f.member_count === 1 ? (
                      <Badge className={toneClass("warn")}>1</Badge>
                    ) : (
                      f.member_count
                    )}
                  </TableCell>
                  <TableCell>
                    <AdminStatusPill kind="verified" value={f.is_verified} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                        aria-label="Row actions"
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => setEditTarget(f)}>
                            <Pencil />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={verifyPending === f.id}
                            onClick={() => toggleVerified(f)}
                          >
                            <CheckCircle2 />
                            {f.is_verified ? "Mark unverified" : "Mark verified"}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(f)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <FamilyFormDialog
        mode="create"
        brands={brands}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => setReloadTick((t) => t + 1)}
      />
      <FamilyFormDialog
        mode="edit"
        brands={brands}
        family={editTarget ?? undefined}
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={() => setReloadTick((t) => t + 1)}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete family?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.member_count
                ? `${deleteTarget.member_count} laptop${
                    deleteTarget.member_count > 1 ? "s" : ""
                  } will be released to unassigned. No laptop is deleted — they just stop being
                   deduplicated together until they are grouped again.`
                : "This family has no members."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: number | null;
  hint?: string;
  emphasize?: boolean;
}) {
  return (
    <Card className="gap-0 p-4">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p
        className={`text-2xl font-semibold tabular-nums ${emphasize ? "text-warning" : ""}`}
        aria-live="polite"
      >
        {value === null ? "—" : value}
      </p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </Card>
  );
}

function FamilyFormDialog({
  mode,
  family,
  brands,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: "create" | "edit";
  family?: Family;
  brands: BackendBrand[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState(family?.name ?? "");
  const [brandId, setBrandId] = useState(family?.brand_id ?? "");
  const [isVerified, setIsVerified] = useState(family?.is_verified ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One list drives both the options and SelectValue's label lookup, so the
  // two can't drift apart.
  const brandItems = useMemo(
    () =>
      [...brands]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => ({ value: b.id, label: b.name })),
    [brands],
  );

  // Reset when a different family is targeted, or the create dialog reopens —
  // both dialogs stay mounted, so this can't live in the initial state.
  const targetSig = `${mode}:${family?.id ?? ""}:${open}`;
  const [prevTargetSig, setPrevTargetSig] = useState(targetSig);
  if (targetSig !== prevTargetSig) {
    setPrevTargetSig(targetSig);
    setName(family?.name ?? "");
    setBrandId(family?.brand_id ?? "");
    setIsVerified(family?.is_verified ?? false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        await createFamily(token, {
          brand_id: brandId,
          name: name.trim(),
          is_verified: isVerified,
        });
        toast.success(`Created ${name.trim()}.`);
      } else if (family) {
        await updateFamily(token, family.id, {
          brand_id: brandId,
          name: name.trim(),
          is_verified: isVerified,
        });
        toast.success(`Updated ${name.trim()}.`);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      // 409 (this brand already has a family with that name) lands here rather
      // than as a toast: it is a correction to make in the field above it.
      setError(err instanceof ApiError ? err.message : "Failed to save family.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New family" : `Edit ${family?.name}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="family-name">Name</FieldLabel>
              <Input
                id="family-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MacBook Pro"
                required
              />
              <p className="text-muted-foreground text-xs">
                The product line as the manufacturer sells it — “MacBook Pro”, not “14-inch MacBook
                Pro”, and one “ROG Strix” rather than one per Strix model.
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="family-brand">Brand</FieldLabel>
              <Select
                items={brandItems}
                value={brandId}
                onValueChange={(v) => setBrandId(v as string)}
              >
                <SelectTrigger id="family-brand">
                  <SelectValue placeholder="Choose a brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {brandItems.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <Checkbox checked={isVerified} onCheckedChange={(c) => setIsVerified(c === true)} />
            Verified — a human has confirmed this grouping
          </label>
          {error && <p className="text-[13px] font-medium text-negative">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving || !brandId || !name.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
