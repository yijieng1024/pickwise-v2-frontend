"use client";

import { useEffect, useId, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
  type Brand,
  type BrandCreateInput,
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
} from "@/lib/api/admin/brands";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../admin-states";
import { AdminPageHeader } from "../../admin-page-header";
import { AdminStatusPill } from "../../admin-status-pill";

export default function AdminCatalogBrandsPage() {
  const { token } = useAuth();
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Brand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listBrands()
      .then((res) => {
        if (cancelled) return;
        setBrands(res);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load brands.");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  async function confirmDelete() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await deleteBrand(token, deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.name}.`);
      setDeleteTarget(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete brand.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Brands"
        description="Full CRUD — scrape source, icon, active state."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            New brand
          </Button>
        }
      />

      <Card className="py-0">
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : brands === null ? (
          <AdminLoadingState />
        ) : brands.length === 0 ? (
          <AdminEmptyState title="No brands yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Scrape URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {b.base_scrape_url}
                  </TableCell>
                  <TableCell>
                    <AdminStatusPill kind="enabled" value={b.is_active} />
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
                          <DropdownMenuItem onClick={() => setEditTarget(b)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(b)}>
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

      <BrandFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => setReloadTick((t) => t + 1)}
      />
      <BrandFormDialog
        mode="edit"
        brand={editTarget ?? undefined}
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={() => setReloadTick((t) => t + 1)}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brand?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting {deleteTarget?.name} fails if any laptops still reference it.
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

function BrandFormDialog({
  mode,
  brand,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: "create" | "edit";
  brand?: Brand;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  // Create and edit dialogs are both mounted at once, so field ids have to be
  // per-instance rather than hardcoded.
  const uid = useId();
  const [name, setName] = useState(brand?.name ?? "");
  const [baseScrapeUrl, setBaseScrapeUrl] = useState(brand?.base_scrape_url ?? "");
  const [iconsUrl, setIconsUrl] = useState(brand?.icons_url ?? "");
  const [isActive, setIsActive] = useState(brand?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form fields whenever a different brand is targeted (or the
  // create dialog opens fresh) — the "adjust state during render" pattern,
  // not an effect (see laptops-browse.tsx).
  const targetSig = `${mode}:${brand?.id ?? ""}`;
  const [prevTargetSig, setPrevTargetSig] = useState(targetSig);
  if (targetSig !== prevTargetSig) {
    setPrevTargetSig(targetSig);
    setName(brand?.name ?? "");
    setBaseScrapeUrl(brand?.base_scrape_url ?? "");
    setIconsUrl(brand?.icons_url ?? "");
    setIsActive(brand?.is_active ?? true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    const input: BrandCreateInput = {
      name: name.trim(),
      base_scrape_url: baseScrapeUrl.trim(),
      icons_url: iconsUrl.trim() || null,
      is_active: isActive,
    };
    try {
      if (mode === "create") {
        await createBrand(token, input);
        toast.success(`Created ${input.name}.`);
      } else if (brand) {
        await updateBrand(token, brand.id, input);
        toast.success(`Updated ${input.name}.`);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save brand.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New brand" : `Edit ${brand?.name}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${uid}-name`}>Name</FieldLabel>
              <Input
                id={`${uid}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-scrape-url`}>Base scrape URL</FieldLabel>
              <Input
                id={`${uid}-scrape-url`}
                type="url"
                value={baseScrapeUrl}
                onChange={(e) => setBaseScrapeUrl(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-icon-url`}>Icon URL (optional)</FieldLabel>
              <Input
                id={`${uid}-icon-url`}
                type="url"
                value={iconsUrl ?? ""}
                onChange={(e) => setIconsUrl(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <Checkbox checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
            Active
          </label>
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
