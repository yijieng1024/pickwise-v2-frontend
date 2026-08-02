"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { deleteLaptop, listLaptops } from "@/lib/api/admin/laptops";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { BackendBrand, BackendLaptop } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

import { AdminErrorState } from "../../admin-error-state";
import { AdminPageHeader } from "../../admin-page-header";
import { AdminPagination } from "../../admin-pagination";
import { type SortState, SortableTableHead, toggleSort } from "../../admin-sortable-head";

const PAGE_SIZE = 25;

type SortKey = "product_name" | "price_rm";

export default function AdminCatalogLaptopsPage() {
  const { token } = useAuth();
  const [laptops, setLaptops] = useState<BackendLaptop[] | null>(null);
  const [total, setTotal] = useState(0);
  const [brands, setBrands] = useState<Map<string, BackendBrand>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortState<SortKey> | null>(null);
  const [page, setPage] = useState(1);

  const [target, setTarget] = useState<BackendLaptop | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch<BackendBrand[]>("/brands")
      .then((rawBrands) => setBrands(new Map(rawBrands.map((b) => [b.id, b]))))
      .catch(() => toast.error("Failed to load brands."));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset pagination when search/sort change, then reset loading state once
  // the effective query changes — the "adjust state during render" pattern,
  // not an effect (see laptops-browse.tsx).
  const filterSig = `${debouncedSearch}|${sort?.key ?? ""}|${sort?.direction ?? ""}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (filterSig !== prevFilterSig) {
    setPrevFilterSig(filterSig);
    setPage(1);
  }

  const paramsSig = `${filterSig}|${page}`;
  const [prevParamsSig, setPrevParamsSig] = useState(paramsSig);
  if (paramsSig !== prevParamsSig) {
    setPrevParamsSig(paramsSig);
    setLaptops(null);
    setLoadError(null);
  }

  useEffect(() => {
    let cancelled = false;
    listLaptops({
      search: debouncedSearch || undefined,
      sortBy: sort?.key,
      sortDir: sort?.direction,
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setLaptops(res.items);
        setTotal(res.total);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load laptops.");
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, sort, page, reloadTick]);

  function handleSort(key: SortKey) {
    setSort((prev) => toggleSort(prev, key));
  }

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
        description="Full catalog listing and spec editing."
        action={
          <Button size="sm" render={<Link href="/admin/catalog/laptops/new" />} nativeButton={false}>
            <Plus className="size-3.5" />
            New laptop
          </Button>
        }
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
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : laptops === null ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="size-5 text-muted-foreground motion-safe:animate-spin" />
          </div>
        ) : laptops.length === 0 ? (
          <p className="p-6 text-[13px] text-muted-foreground">No laptops match.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label="Model" sortKey="product_name" sort={sort} onSort={handleSort} />
                <TableHead>Brand</TableHead>
                <SortableTableHead label="Price" sortKey="price_rm" sort={sort} onSort={handleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laptops.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{l.product_name}</div>
                    <div className="text-[12.5px] text-muted-foreground">{l.model_code}</div>
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
                        <DropdownMenuItem render={<Link href={`/admin/catalog/laptops/${l.id}/edit`} />}>
                          <Pencil className="size-3.5" />
                          Edit
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

      <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

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
