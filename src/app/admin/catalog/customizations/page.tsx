"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
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
import {
  type Customization,
  type CustomizationUpdateInput,
  deleteCustomization,
  listCustomizationsByLaptop,
  updateCustomization,
} from "@/lib/api/admin/customizations";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

import { AdminPageHeader } from "../../admin-page-header";

// Look up by laptop, edit/delete only. Bulk create and bulk-by-pattern are
// deferred; still available via Swagger for now.

export default function AdminCatalogCustomizationsPage() {
  const { token } = useAuth();
  const [laptops, setLaptops] = useState<BackendLaptop[]>([]);
  const [laptopSearch, setLaptopSearch] = useState("");
  const [selectedLaptop, setSelectedLaptop] = useState<BackendLaptop | null>(null);
  const [customizations, setCustomizations] = useState<Customization[] | null>(null);
  const [editTarget, setEditTarget] = useState<Customization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customization | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    apiFetch<BackendLaptop[]>("/laptops/").then(setLaptops);
  }, []);

  const laptopMatches = useMemo(() => {
    const q = laptopSearch.trim().toLowerCase();
    if (!q) return [];
    return laptops
      .filter((l) => l.product_name.toLowerCase().includes(q) || l.model_code.toLowerCase().includes(q))
      .slice(0, 8);
  }, [laptops, laptopSearch]);

  // Reset to loading state when the selected laptop changes — the "adjust
  // state during render" pattern, not an effect (see laptops-browse.tsx).
  const laptopSig = selectedLaptop?.id ?? null;
  const [prevLaptopSig, setPrevLaptopSig] = useState(laptopSig);
  if (laptopSig !== prevLaptopSig) {
    setPrevLaptopSig(laptopSig);
    setCustomizations(null);
  }

  useEffect(() => {
    if (!selectedLaptop || !token) return;
    let cancelled = false;
    listCustomizationsByLaptop(token, selectedLaptop.id).then((res) => {
      if (!cancelled) setCustomizations(res);
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
        description="Look up a laptop to view and edit its upgrade options."
      />

      <div className="border-line bg-surface rounded-lg border p-4">
        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Find a laptop to view its customizations…"
            value={selectedLaptop ? selectedLaptop.product_name : laptopSearch}
            onChange={(e) => {
              setSelectedLaptop(null);
              setLaptopSearch(e.target.value);
            }}
            className="pl-8"
          />
          {laptopMatches.length > 0 && !selectedLaptop && (
            <div className="border-line bg-popover absolute z-10 mt-1 w-full rounded-lg border p-1 shadow-md">
              {laptopMatches.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setSelectedLaptop(l);
                    setLaptopSearch("");
                  }}
                  className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-2"
                >
                  {l.product_name}{" "}
                  <span className="text-muted-foreground">({l.model_code})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedLaptop && (
        <div className="border-line bg-surface rounded-lg border">
          {customizations === null ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="size-5 text-muted-foreground motion-safe:animate-spin" />
            </div>
          ) : customizations.length === 0 ? (
            <p className="p-6 text-[13px] text-muted-foreground">
              No customizations for {selectedLaptop.product_name} yet.
            </p>
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
                          <MoreHorizontal className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditTarget(c)}>
                            <Pencil className="size-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(c)}>
                            <Trash2 className="size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
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
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Option name
            <Input value={optionName} onChange={(e) => setOptionName(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Price add-on (RM)
            <Input
              type="number"
              step="0.01"
              value={priceAddRm}
              onChange={(e) => setPriceAddRm(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Note (optional)
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {error && <p className="text-[12.5px] font-medium text-negative">{error}</p>}
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
