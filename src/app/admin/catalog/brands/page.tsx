"use client";

import { useEffect, useState } from "react";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
  type Brand,
  type BrandCreateInput,
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
} from "@/lib/api/admin/brands";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminPageHeader } from "../../admin-page-header";

export default function AdminCatalogBrandsPage() {
  const { token } = useAuth();
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Brand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listBrands().then((res) => {
      if (!cancelled) setBrands(res);
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
        crumbs={["Catalog", "Brands"]}
        title="Brands"
        description="Full CRUD — scrape source, icon, active state."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            New brand
          </Button>
        }
      />

      <div className="border-line bg-surface rounded-lg border">
        {brands === null ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="size-5 text-muted-foreground motion-safe:animate-spin" />
          </div>
        ) : brands.length === 0 ? (
          <p className="p-6 text-[13px] text-muted-foreground">No brands yet.</p>
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
                    <Badge variant={b.is_active ? "secondary" : "outline"}>
                      {b.is_active ? "Active" : "Inactive"}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => setEditTarget(b)}>
                          <Pencil className="size-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(b)}>
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
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Name
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Base scrape URL
            <Input
              value={baseScrapeUrl}
              onChange={(e) => setBaseScrapeUrl(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Icon URL (optional)
            <Input value={iconsUrl ?? ""} onChange={(e) => setIconsUrl(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <Checkbox checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
            Active
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
