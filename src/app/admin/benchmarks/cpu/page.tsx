"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Pencil, PlayCircle, Plus, Search, Trash2 } from "lucide-react";
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
  type CpuBenchmark,
  type CpuBenchmarkInput,
  createCpuBenchmark,
  deleteCpuBenchmark,
  listCpuBenchmarks,
  triggerCpuScraper,
  updateCpuBenchmark,
} from "@/lib/api/admin/benchmarks";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../admin-states";
import { AdminPageHeader } from "../../admin-page-header";
import { AdminPagination } from "../../admin-pagination";
import { type SortState, SortableTableHead, toggleSort } from "../../admin-sortable-head";

const PAGE_SIZE = 25;
type CpuSortKey = "cpu_name" | "cpu_mark";

export default function AdminCpuBenchmarksPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<CpuBenchmark[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CpuBenchmark | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CpuBenchmark | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortState<CpuSortKey> | null>(null);
  const [page, setPage] = useState(1);

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
    setItems(null);
    setLoadError(null);
  }

  useEffect(() => {
    let cancelled = false;
    listCpuBenchmarks({
      search: debouncedSearch || undefined,
      sortBy: sort?.key,
      sortDir: sort?.direction,
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load CPU benchmarks.");
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, sort, page, reloadTick]);

  async function confirmDelete() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await deleteCpuBenchmark(token, deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.cpu_name}.`);
      setDeleteTarget(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  async function runScraper() {
    if (!token) return;
    setScraping(true);
    try {
      const res = await triggerCpuScraper(token);
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start scraper.");
    } finally {
      setScraping(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Benchmarks", "CPU"]}
        title="CPU benchmarks"
        description="PassMark CPU scores that feed PickScore's performance factors."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runScraper} disabled={scraping}>
              <PlayCircle data-icon="inline-start" />
              {scraping ? "Starting…" : "Run PassMark scraper"}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              New entry
            </Button>
          </div>
        }
      />

      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search CPU name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Card className="py-0">
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : items === null ? (
          <AdminLoadingState />
        ) : items.length === 0 ? (
          <AdminEmptyState title="No CPU benchmarks match" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="CPU"
                  sortKey="cpu_name"
                  sort={sort}
                  onSort={(key) => setSort((prev) => toggleSort(prev, key))}
                />
                <SortableTableHead
                  label="Mark"
                  sortKey="cpu_mark"
                  sort={sort}
                  onSort={(key) => setSort((prev) => toggleSort(prev, key))}
                />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((cpu) => (
                <TableRow key={cpu.id}>
                  <TableCell className="font-medium">{cpu.cpu_name}</TableCell>
                  <TableCell className="tabular-nums">{cpu.cpu_mark.toLocaleString()}</TableCell>
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
                          <DropdownMenuItem onClick={() => setEditTarget(cpu)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(cpu)}>
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

      <CpuFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => setReloadTick((t) => t + 1)}
      />
      <CpuFormDialog
        mode="edit"
        item={editTarget ?? undefined}
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={() => setReloadTick((t) => t + 1)}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CPU benchmark?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes {deleteTarget?.cpu_name} from the PickScore lookup table.
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

function CpuFormDialog({
  mode,
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: "create" | "edit";
  item?: CpuBenchmark;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [cpuName, setCpuName] = useState(item?.cpu_name ?? "");
  const [cpuMark, setCpuMark] = useState(String(item?.cpu_mark ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetSig = `${mode}:${item?.id ?? ""}`;
  const [prevTargetSig, setPrevTargetSig] = useState(targetSig);
  if (targetSig !== prevTargetSig) {
    setPrevTargetSig(targetSig);
    setCpuName(item?.cpu_name ?? "");
    setCpuMark(String(item?.cpu_mark ?? 0));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    const input: CpuBenchmarkInput = { cpu_name: cpuName.trim(), cpu_mark: Number(cpuMark) || 0 };
    try {
      if (mode === "create") {
        await createCpuBenchmark(token, input);
        toast.success(`Created ${input.cpu_name}.`);
      } else if (item) {
        await updateCpuBenchmark(token, item.id, input);
        toast.success(`Updated ${input.cpu_name}.`);
      }
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
          <DialogTitle>{mode === "create" ? "New CPU benchmark" : `Edit ${item?.cpu_name}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FieldGroup>
            <Field>
              <FieldLabel>CPU name</FieldLabel>
              <Input value={cpuName} onChange={(e) => setCpuName(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel>PassMark score</FieldLabel>
              <Input type="number" value={cpuMark} onChange={(e) => setCpuMark(e.target.value)} required />
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
