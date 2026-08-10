"use client";

import { useEffect, useState } from "react";
import { Link2, MoreHorizontal, RefreshCw, Search, Wand2 } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import {
  type RawReview,
  type RawReviewStatus,
  listRawReviews,
  manualMatch,
  processReview,
  rematchPending,
} from "@/lib/api/admin/reviews";
import { ApiError } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../admin-states";
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
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rematching, setRematching] = useState(false);
  const [matchTarget, setMatchTarget] = useState<RawReview | null>(null);
  const [summarizeTarget, setSummarizeTarget] = useState<RawReview | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset pagination when the filters change, then drop stale rows once the
  // effective query changes — the "adjust state during render" pattern, not an
  // effect (see laptops-browse.tsx). Two signatures, because a page change
  // must blank the table but must not reset the page to 1.
  const filterSig = `${status}|${debouncedSearch}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (filterSig !== prevFilterSig) {
    setPrevFilterSig(filterSig);
    setPage(1);
  }

  const paramsSig = `${filterSig}|${page}`;
  const [prevParamsSig, setPrevParamsSig] = useState(paramsSig);
  if (paramsSig !== prevParamsSig) {
    setPrevParamsSig(paramsSig);
    setReviews(null);
    setLoadError(null);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listRawReviews(token, {
      status: status === "all" ? undefined : (status as RawReviewStatus),
      search: debouncedSearch || undefined,
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setReviews(res.items);
        setTotal(res.total);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load reviews.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, status, debouncedSearch, page, reloadTick]);

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

  async function runSummarize() {
    if (!token || !summarizeTarget) return;
    setSummarizing(true);
    try {
      const res = await processReview(token, summarizeTarget.id);
      // 0 chunks is a real outcome, not a failure: the transcript was too
      // short to chunk. A success toast for it would be misleading.
      if (res.chunks_saved > 0) {
        toast.success(`Saved ${res.chunks_saved} chunks from "${summarizeTarget.video_title}".`);
      } else {
        toast.info("No chunks saved — the transcript had nothing to summarize.");
      }
      setSummarizeTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Summarizing failed.");
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Match Queue"
        description="Ingested YouTube reviews and how they matched to catalog laptops."
        action={
          <Button variant="outline" size="sm" onClick={runRematch} disabled={rematching}>
            {rematching ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            {rematching ? "Rematching…" : "Rematch pending"}
          </Button>
        }
      />

      <div className="border-line bg-surface flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search video title…"
            aria-label="Search reviews by video title"
            autoComplete="off"
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
            <SelectGroup>
              {statusOptions.map((o) => (
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
        ) : reviews === null ? (
          <AdminLoadingState />
        ) : reviews.length === 0 ? (
          <AdminEmptyState title="No reviews match" />
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
              {reviews.map((r) => (
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
                        <div className="truncate">{r.matched_laptop_name ?? "Matched"}</div>
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
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => setMatchTarget(r)}>
                            <Link2 />
                            Match to laptop…
                          </DropdownMenuItem>
                          {/* Only matched reviews can be summarized — the
                              backend 400s on the rest, so the control is
                              disabled ahead of the error rather than after. */}
                          <DropdownMenuItem
                            disabled={r.status !== "matched"}
                            onClick={() => setSummarizeTarget(r)}
                          >
                            <Wand2 />
                            Summarize transcript…
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

      <ManualMatchDialog
        review={matchTarget}
        open={matchTarget !== null}
        onOpenChange={(open) => !open && setMatchTarget(null)}
        onMatched={() => setReloadTick((t) => t + 1)}
      />

      <AlertDialog
        open={summarizeTarget !== null}
        onOpenChange={(open) => {
          // Closing mid-run would leave the request going with nothing showing
          // its progress, so the dialog stays put until it returns.
          if (!open && !summarizing) setSummarizeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Summarize this transcript?</AlertDialogTitle>
            <AlertDialogDescription>
              Chunks, sentiment-tags and embeds &quot;{summarizeTarget?.video_title}&quot; so the
              chatbot can quote it. This runs in the foreground and can take a minute or more.
              Nothing skips a video that was already summarized — running it again stores a
              second copy of its chunks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={summarizing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runSummarize} disabled={summarizing}>
              {summarizing && <Spinner data-icon="inline-start" />}
              {summarizing ? "Summarizing…" : "Summarize"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
