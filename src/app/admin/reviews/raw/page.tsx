"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2, Loader2, MoreHorizontal, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
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
  type RawReview,
  type RawReviewStatus,
  listRawReviews,
  manualMatch,
  rematchPending,
} from "@/lib/api/admin/reviews";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminErrorState } from "../../admin-error-state";
import { AdminPageHeader } from "../../admin-page-header";
import { AdminPagination } from "../../admin-pagination";
import { LaptopPicker } from "../../laptop-picker";

const PAGE_SIZE = 25;

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "matched", label: "Matched" },
  { value: "rejected", label: "Rejected" },
];

const statusBadgeClass: Record<RawReviewStatus, string> = {
  pending: "bg-warning/10 text-warning",
  matched: "bg-positive/10 text-positive",
  rejected: "bg-negative/10 text-negative",
};

export default function AdminRawReviewsPage() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<RawReview[] | null>(null);
  const [laptopNames, setLaptopNames] = useState<Map<string, string>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rematching, setRematching] = useState(false);
  const [matchTarget, setMatchTarget] = useState<RawReview | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    apiFetch<BackendLaptop[]>("/laptops/")
      .then((laptops) => setLaptopNames(new Map(laptops.map((l) => [l.id, l.product_name]))))
      .catch(() => {});
  }, []);

  // Reset page + loading state when the effective query changes — the "adjust
  // state during render" pattern, not an effect (see laptops-browse.tsx).
  const querySig = `${status}|${search}`;
  const [prevQuerySig, setPrevQuerySig] = useState(querySig);
  if (querySig !== prevQuerySig) {
    setPrevQuerySig(querySig);
    setPage(1);
  }

  const statusSig = status;
  const [prevStatusSig, setPrevStatusSig] = useState(statusSig);
  if (statusSig !== prevStatusSig) {
    setPrevStatusSig(statusSig);
    setReviews(null);
    setLoadError(null);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listRawReviews(token, status === "all" ? undefined : (status as RawReviewStatus))
      .then((res) => {
        if (cancelled) return;
        setReviews(res);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load reviews.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, status, reloadTick]);

  const filtered = useMemo(() => {
    if (!reviews) return [];
    const q = search.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) => r.video_title.toLowerCase().includes(q));
  }, [reviews, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function runRematch() {
    if (!token) return;
    setRematching(true);
    try {
      const res = await rematchPending(token);
      toast.success(`Rematch: ${res.newly_matched} of ${res.pending_total} pending matched.`);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Rematch failed.");
    } finally {
      setRematching(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Reviews", "Raw reviews"]}
        title="Raw reviews"
        description="Ingested YouTube reviews and how they matched to catalog laptops."
        action={
          <Button variant="outline" size="sm" onClick={runRematch} disabled={rematching}>
            <RefreshCw className={`size-3.5 ${rematching ? "motion-safe:animate-spin" : ""}`} />
            {rematching ? "Rematching…" : "Rematch pending"}
          </Button>
        }
      />

      <div className="border-line bg-surface flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search video title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select items={statusOptions} value={status} onValueChange={(v) => setStatus(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-line bg-surface rounded-lg border">
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : reviews === null ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="size-5 text-muted-foreground motion-safe:animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-[13px] text-muted-foreground">No reviews match.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Video</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Match</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="max-w-md truncate font-medium">{r.video_title}</div>
                    <div className="text-[12px] text-muted-foreground">{r.channel_id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("capitalize", statusBadgeClass[r.status])}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.matched_laptop_id ? (
                      <div className="max-w-xs">
                        <div className="truncate">{laptopNames.get(r.matched_laptop_id) ?? "Matched"}</div>
                        {r.match_confidence !== null && (
                          <div className="text-[12px] tabular-nums">
                            {Math.round(r.match_confidence)}% confidence
                          </div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
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
                        <DropdownMenuItem onClick={() => setMatchTarget(r)}>
                          <Link2 className="size-3.5" />
                          Match to laptop…
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

      <AdminPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      <ManualMatchDialog
        review={matchTarget}
        open={matchTarget !== null}
        onOpenChange={(open) => !open && setMatchTarget(null)}
        onMatched={() => setReloadTick((t) => t + 1)}
      />
    </div>
  );
}

function ManualMatchDialog({
  review,
  open,
  onOpenChange,
  onMatched,
}: {
  review: RawReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMatched: () => void;
}) {
  const { token } = useAuth();
  const [selected, setSelected] = useState<BackendLaptop | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetSig = review?.id ?? null;
  const [prevTargetSig, setPrevTargetSig] = useState(targetSig);
  if (targetSig !== prevTargetSig) {
    setPrevTargetSig(targetSig);
    setSelected(null);
    setError(null);
  }

  async function handleConfirm() {
    if (!token || !review || !selected) return;
    setSaving(true);
    setError(null);
    try {
      await manualMatch(token, review.id, selected.id);
      toast.success(`Matched to ${selected.product_name}.`);
      onOpenChange(false);
      onMatched();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to match.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Match review to laptop</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-muted-foreground">{review?.video_title}</p>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Laptop
            <LaptopPicker selected={selected} onSelect={setSelected} />
          </label>
          {error && <p className="text-[13px] font-medium text-negative">{error}</p>}
          <DialogFooter>
            <Button onClick={handleConfirm} disabled={saving || !selected}>
              {saving ? "Matching…" : "Match"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
