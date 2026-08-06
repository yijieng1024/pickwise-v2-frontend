"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  type Customization,
  type CustomizationUpdateInput,
  type LaptopCustomizationSummary,
  deleteCustomization,
  listCustomizationsByLaptop,
  listLaptopsWithCustomizations,
  updateCustomization,
} from "@/lib/api/admin/customizations";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../admin-states";
import { AdminPageHeader } from "../../admin-page-header";

// Look up by laptop, edit/delete only. Bulk create and bulk-by-pattern are
// deferred; still available via Swagger for now.

export default function AdminCatalogCustomizationsPage() {
  const { token } = useAuth();
  const [laptopsWithCustomizations, setLaptopsWithCustomizations] = useState<
    LaptopCustomizationSummary[] | null
  >(null);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [listReloadTick, setListReloadTick] = useState(0);

  const [selectedLaptop, setSelectedLaptop] = useState<LaptopCustomizationSummary | null>(
    null,
  );
  const [customizations, setCustomizations] = useState<Customization[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Customization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customization | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    // The summary carries product_name and model_code, so this no longer
    // pulls the whole catalog just to label a handful of rows.
    listLaptopsWithCustomizations(token)
      .then((summary) => {
        if (cancelled) return;
        setLaptopsWithCustomizations(
          [...summary].sort((a, b) => a.product_name.localeCompare(b.product_name)),
        );
        setListError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setListError(err instanceof ApiError ? err.message : "Failed to load laptops.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, listReloadTick]);

  const filtered = useMemo(() => {
    if (!laptopsWithCustomizations) return [];
    const q = search.trim().toLowerCase();
    if (!q) return laptopsWithCustomizations;
    return laptopsWithCustomizations.filter(
      (l) =>
        l.product_name.toLowerCase().includes(q) || l.model_code.toLowerCase().includes(q),
    );
  }, [laptopsWithCustomizations, search]);

  // Reset to loading state when the selected laptop changes — the "adjust
  // state during render" pattern, not an effect (see laptops-browse.tsx).
  const laptopSig = selectedLaptop?.laptop_id ?? null;
  const [prevLaptopSig, setPrevLaptopSig] = useState(laptopSig);
  if (laptopSig !== prevLaptopSig) {
    setPrevLaptopSig(laptopSig);
    setCustomizations(null);
    setLoadError(null);
  }

  useEffect(() => {
    if (!selectedLaptop || !token) return;
    let cancelled = false;
    listCustomizationsByLaptop(token, selectedLaptop.laptop_id)
      .then((res) => {
        if (cancelled) return;
        setCustomizations(res);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Failed to load customizations.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLaptop, token, reloadTick]);

  async function confirmDelete() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await deleteCustomization(token, deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.option_name}".`);
      setDeleteTarget(null);
      setReloadTick((t) => t + 1);
      // A deleted customization may have been a laptop's last one — refresh
      // the summary list so it drops off when its count hits zero.
      setListReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete customization.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Catalog", "Customizations"]}
        title="Customizations"
        description="Laptops that have upgrade options configured — pick one to view and edit them."
      />

      <Card className="gap-0 p-4">
        <div className="relative max-w-xs">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by model or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </Card>

      <Card className="py-0">
        {listError ? (
          <AdminErrorState message={listError} onRetry={() => setListReloadTick((t) => t + 1)} />
        ) : laptopsWithCustomizations === null ? (
          <AdminLoadingState />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            title={
              laptopsWithCustomizations.length === 0
                ? "No laptops have customizations configured yet"
                : "No laptops match"
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Customizations</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow
                  key={l.laptop_id}
                  className={
                    selectedLaptop?.laptop_id === l.laptop_id ? "bg-brand-tint/40" : undefined
                  }
                >
                  <TableCell>
                    <div className="font-medium">{l.product_name}</div>
                    <div className="text-[12.5px] text-muted-foreground">{l.model_code}</div>
                  </TableCell>
                  <TableCell className="tabular-nums">{l.customization_count}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={
                        selectedLaptop?.laptop_id === l.laptop_id ? "secondary" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedLaptop(l)}
                    >
                      <SlidersHorizontal data-icon="inline-start" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {selectedLaptop && (
        <Card className="py-0">
          <div className="flex items-center justify-between border-b border-line p-4">
            <h2 className="text-sm font-bold tracking-tight">
              Customizations for {selectedLaptop.product_name}
            </h2>
            <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setSelectedLaptop(null)}>
              <X />
            </Button>
          </div>
          {loadError ? (
            <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
          ) : customizations === null ? (
            <AdminLoadingState />
          ) : customizations.length === 0 ? (
            <AdminEmptyState
              title="No customizations yet"
              description={`${selectedLaptop.product_name} has no configurable options.`}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Option</TableHead>
                  <TableHead>Price add-on</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customizations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.option_name}</TableCell>
                    <TableCell className="tabular-nums">
                      RM {c.price_add_rm.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.dependency_note ?? "—"}
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
                            <DropdownMenuItem onClick={() => setEditTarget(c)}>
                              <Pencil />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(c)}>
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
      )}

      <CustomizationEditDialog
        customization={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={() => setReloadTick((t) => t + 1)}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customization?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &quot;{deleteTarget?.option_name}&quot; from the laptop&apos;s available upgrades.
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

function CustomizationEditDialog({
  customization,
  open,
  onOpenChange,
  onSaved,
}: {
  customization: Customization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [optionName, setOptionName] = useState(customization?.option_name ?? "");
  const [priceAddRm, setPriceAddRm] = useState(String(customization?.price_add_rm ?? 0));
  const [note, setNote] = useState(customization?.dependency_note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever a different customization is targeted — the
  // "adjust state during render" pattern, not an effect (see laptops-browse.tsx).
  const targetSig = customization?.id ?? null;
  const [prevTargetSig, setPrevTargetSig] = useState(targetSig);
  if (targetSig !== prevTargetSig) {
    setPrevTargetSig(targetSig);
    setOptionName(customization?.option_name ?? "");
    setPriceAddRm(String(customization?.price_add_rm ?? 0));
    setNote(customization?.dependency_note ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !customization) return;
    setSaving(true);
    setError(null);
    const input: CustomizationUpdateInput = {
      option_name: optionName.trim(),
      price_add_rm: Number(priceAddRm) || 0,
      dependency_note: note.trim() || null,
    };
    try {
      await updateCustomization(token, customization.id, input);
      toast.success("Customization updated.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit customization</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FieldGroup>
            <Field>
              <FieldLabel>Option name</FieldLabel>
              <Input value={optionName} onChange={(e) => setOptionName(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel>Price add-on (RM)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                value={priceAddRm}
                onChange={(e) => setPriceAddRm(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel>Note (optional)</FieldLabel>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </FieldGroup>
          {error && <p className="text-[13px] font-medium text-negative">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
