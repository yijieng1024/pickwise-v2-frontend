"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, MoreHorizontal, Search, Trash2 } from "lucide-react";
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
import { deleteLaptop } from "@/lib/api/admin/laptops";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { BackendBrand, BackendLaptop } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

import { AdminPageHeader } from "../../admin-page-header";

// Laptops — list + delete only. Creating/editing the full 9-part spec form is
// out of scope for this phase (200+ fields — deserves its own plan).

export default function AdminCatalogLaptopsPage() {
  const { token } = useAuth();
  const [laptops, setLaptops] = useState<BackendLaptop[] | null>(null);
  const [brands, setBrands] = useState<Map<string, BackendBrand>>(new Map());
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<BackendLaptop | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<BackendLaptop[]>("/laptops/"),
      apiFetch<BackendBrand[]>("/brands"),
    ]).then(([rawLaptops, rawBrands]) => {
      if (cancelled) return;
      setLaptops(rawLaptops);
      setBrands(new Map(rawBrands.map((b) => [b.id, b])));
    });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const filtered = useMemo(() => {
    if (!laptops) return [];
    const q = search.trim().toLowerCase();
    if (!q) return laptops;
    return laptops.filter(
      (l) =>
        l.product_name.toLowerCase().includes(q) ||
        l.model_code.toLowerCase().includes(q) ||
        (brands.get(l.brand_id)?.name.toLowerCase().includes(q) ?? false),
    );
  }, [laptops, brands, search]);

  async function confirmDelete() {
    if (!target || !token) return;
    setDeleting(true);
    try {
      await deleteLaptop(token, target.id);
      toast.success(`Deleted ${target.product_name}.`);
      setTarget(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete laptop.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Catalog", "Laptops"]}
        title="Laptops"
        description="Catalog listing — view and delete only."
      />

      <div className="border-line bg-surface rounded-lg border p-4">
        <div className="relative max-w-xs">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search laptops or brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="border-line bg-surface rounded-lg border">
        {laptops === null ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="size-5 text-muted-foreground motion-safe:animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-[13px] text-muted-foreground">No laptops match.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{l.product_name}</div>
                    <div className="text-[12px] text-muted-foreground">{l.model_code}</div>
                  </TableCell>
                  <TableCell>{brands.get(l.brand_id)?.name ?? "Unknown"}</TableCell>
                  <TableCell className="tabular-nums">
                    {l.price_rm > 0 ? `RM ${l.price_rm.toLocaleString()}` : "—"}
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
                        <DropdownMenuItem render={<Link href={`/laptops/${l.id}`} target="_blank" />}>
                          <ExternalLink className="size-3.5" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setTarget(l)}>
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

      <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete laptop?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {target?.product_name} from the catalog. This can&apos;t be undone.
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
