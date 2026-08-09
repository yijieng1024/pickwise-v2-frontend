"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Laptop, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Card } from "@/components/ui/card";
import { deleteLaptop, listLaptops } from "@/lib/api/admin/laptops";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { BackendBrand, BackendLaptop } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../admin-states";
import { AdminPageHeader } from "../../admin-page-header";
import { AdminPagination } from "../../admin-pagination";
import { type SortState, SortableTableHead, toggleSort } from "../../admin-sortable-head";

const PAGE_SIZE = 25;

type SortKey = "product_name" | "price_rm";

/**
 * First scraped photo, beside the model name — the same row rhythm as the user
 * avatar on /admin/users, sized up because a laptop shot needs more than 28px.
 *
 * Product photos keep the app-wide conventions: a white panel in both themes so
 * transparent PNGs read cleanly, `object-contain` so nothing is cropped, and
 * `mix-blend-multiply dark:mix-blend-normal`. `image_urls` is empty for rows the
 * scraper couldn't get photos from, so the placeholder is a real state here, not
 * a defensive branch.
 */
function LaptopThumbnail({ src, alt }: { src: string | undefined; alt: string }) {
  if (!src) {
    return (
      <span className="border-line bg-surface-2 flex size-10 shrink-0 items-center justify-center rounded-md border">
        <Laptop className="size-4 text-muted-foreground" />
      </span>
    );
  }

  return (
    <span className="border-line flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
      <Image
        src={src}
        alt={alt}
        width={40}
        height={40}
        className="size-full object-contain mix-blend-multiply dark:mix-blend-normal"
      />
    </span>
  );
}

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
  const [brandId, setBrandId] = useState("all");

  const [target, setTarget] = useState<BackendLaptop | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Built from the brands already fetched for the table's Brand column, so the
  // filter costs no extra request.
  const brandOptions = useMemo(
    () => [
      { value: "all", label: "All brands" },
      ...[...brands.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => ({ value: b.id, label: b.name })),
    ],
    [brands],
  );

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
  const filterSig = `${debouncedSearch}|${brandId}|${sort?.key ?? ""}|${sort?.direction ?? ""}`;
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
      // Server-side, so `total` and the pager stay correct. Filtering the
      // 25 rows already on the page would silently mis-count.
      brandId: brandId === "all" ? undefined : brandId,
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
  }, [debouncedSearch, brandId, sort, page, reloadTick]);

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
        title="Laptops"
        description="Full catalog listing and spec editing."
        action={
          <Button size="sm" render={<Link href="/admin/catalog/laptops/new" />} nativeButton={false}>
            <Plus data-icon="inline-start" />
            New laptop
          </Button>
        }
      />

      <Card className="gap-0 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search laptops or brand…"
              aria-label="Search laptops by name or brand"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select items={brandOptions} value={brandId} onValueChange={(v) => setBrandId(v as string)}>
            <SelectTrigger className="w-48" aria-label="Filter by brand">
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
        </div>
      </Card>

      <Card className="py-0">
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : laptops === null ? (
          <AdminLoadingState />
        ) : laptops.length === 0 ? (
          <AdminEmptyState title="No laptops match" />
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
                    <div className="flex items-center gap-2.5">
                      <LaptopThumbnail
                        src={l.image_urls[0]}
                        alt={l.product_name}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{l.product_name}</div>
                        <div className="truncate text-[12.5px] text-muted-foreground">
                          {l.model_code}
                        </div>
                      </div>
                    </div>
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
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem render={<Link href={`/laptops/${l.id}`} target="_blank" />}>
                            <ExternalLink />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem render={<Link href={`/admin/catalog/laptops/${l.id}/edit`} />}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setTarget(l)}>
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
