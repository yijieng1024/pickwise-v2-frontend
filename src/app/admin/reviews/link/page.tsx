"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import {
  type FamilySearchResult,
  type PendingReview,
  createReviewLink,
  deleteReviewLink,
  listPendingReviews,
} from "@/lib/api/admin/review-links";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../admin-states";
import { AdminPageHeader } from "../../admin-page-header";
import { ConfigPicker } from "./config-picker";
import { FamilySearch } from "./family-search";
import { ReviewQueue, isDone } from "./review-queue";

/**
 * This screen optimises for SECONDS PER DECISION, not accuracy per decision.
 *
 * 55 reviews are pending and the matcher cannot help — 89.4% of its matches are
 * unbroken ties, so a human does all of the work. At 30 seconds each that is
 * half an hour; at 10 seconds it is nine minutes. Every choice here follows
 * from cutting actions per review, so where fewer clicks and more information
 * conflict, fewer clicks wins:
 *
 *  - picking a family creates the link immediately (no confirm step);
 *  - the review is DONE at that point — step 2 is optional and skippable;
 *  - "configuration unknown" is what doing nothing already means.
 *
 * The whole queue is fetched in one page (limit 200) rather than paged: the
 * left rail is a work list the human scans top to bottom, and a pager would
 * add a navigation action to a screen whose entire purpose is removing them.
 */

const QUEUE_LIMIT = 200;

export default function ReviewLinkPage() {
  const { token } = useAuth();
  // `null` is the loading state, the shape the other admin screens use. A
  // separate boolean would have to be flipped synchronously inside the effect,
  // which cascades a render before the fetch starts.
  const [reviews, setReviews] = useState<PendingReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  // Errors are held per-control, not thrown at a toast: a 409 or a 400 is a
  // statement about the selection the human just made, and they need to see it
  // next to that selection to know which one was rejected.
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  // Which link's configuration step is open. Null = step 2 hidden.
  const [openLinkId, setOpenLinkId] = useState<string | null>(null);
  const [addingAnother, setAddingAnother] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listPendingReviews(token, { limit: QUEUE_LIMIT })
      .then((page) => {
        if (cancelled) return;
        setReviews(page.items);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof ApiError ? e.message : "Could not load the pending queue.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  const filtered = useMemo(() => {
    const rows = reviews ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.video_title.toLowerCase().includes(q));
  }, [reviews, search]);

  const selected = reviews?.find((r) => r.id === selectedId) ?? null;

  /** Replaces one review's links in place — no queue refetch, which would cost
   * a round trip on the hottest path on the screen. */
  const applyLinks = useCallback(
    (reviewId: string, links: PendingReview["links"]) => {
      setReviews((prev) =>
        (prev ?? []).map((r) => (r.id === reviewId ? { ...r, links } : r)),
      );
    },
    [],
  );

  const selectReview = useCallback((review: PendingReview) => {
    setSelectedId(review.id);
    setFamilyError(null);
    setConfigError(null);
    setAddingAnother(false);
    // Reopen the config step for a review that already has exactly one link,
    // so returning to it lands where the human left off.
    setOpenLinkId(review.links.length === 1 ? review.links[0].id : null);
  }, []);

  async function pickFamily(family: FamilySearchResult) {
    if (!token || !selected) return;
    setBusy(true);
    setFamilyError(null);
    try {
      // laptop_id omitted on purpose — see the module comment. The review is
      // done the moment this returns.
      const links = await createReviewLink(token, selected.id, {
        family_id: family.family_id,
      });
      applyLinks(selected.id, links);
      setAddingAnother(false);
      const created = links.find(
        (l) => l.family_id === family.family_id && l.laptop_id === null,
      );
      setOpenLinkId(created?.id ?? null);
    } catch (e) {
      setFamilyError(
        e instanceof ApiError ? e.message : "Could not link that family.",
      );
    } finally {
      setBusy(false);
    }
  }

  /**
   * Setting a configuration replaces the link rather than patching it: the API
   * has no PATCH for a link, and delete-then-create keeps the human's answer
   * as a single row instead of leaving a family-only link beside a specific
   * one, which would read downstream as two separate claims about the video.
   */
  async function pickConfig(linkId: string, laptopId: string | null) {
    if (!token || !selected) return;
    const link = selected.links.find((l) => l.id === linkId);
    if (!link || link.laptop_id === laptopId) return;
    setBusy(true);
    setConfigError(null);
    try {
      await deleteReviewLink(token, linkId);
      const links = await createReviewLink(token, selected.id, {
        family_id: link.family_id,
        laptop_id: laptopId ?? undefined,
      });
      applyLinks(selected.id, links);
      const next = links.find(
        (l) => l.family_id === link.family_id && l.laptop_id === laptopId,
      );
      setOpenLinkId(next?.id ?? null);
    } catch (e) {
      setConfigError(
        e instanceof ApiError ? e.message : "Could not set that configuration.",
      );
      // The delete may have landed before the create failed, so pull the truth
      // back rather than leaving the screen asserting a link that is gone.
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function removeLink(linkId: string) {
    if (!token || !selected) return;
    setBusy(true);
    setConfigError(null);
    try {
      await deleteReviewLink(token, linkId);
      const links = selected.links.filter((l) => l.id !== linkId);
      applyLinks(selected.id, links);
      if (openLinkId === linkId) setOpenLinkId(null);
    } catch (e) {
      setConfigError(e instanceof ApiError ? e.message : "Could not remove that link.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <AdminErrorState message={error} onRetry={reload} />;
  if (!reviews) return <AdminLoadingState />;

  const doneCount = reviews.filter(isDone).length;
  const openLink = selected?.links.find((l) => l.id === openLinkId) ?? null;
  const showSearch = !selected?.links.length || addingAnother;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Link Reviews"
        description="Attach each pending review to the product line it covers. The configuration is optional — leave it unset when the video doesn't say."
        action={
          <Button variant="soft" onClick={reload} disabled={busy}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <Card className="h-[calc(100vh-15rem)] gap-0 p-3">
          <ReviewQueue
            reviews={filtered}
            selectedId={selectedId}
            onSelect={selectReview}
            search={search}
            onSearchChange={setSearch}
          />
        </Card>

        <Card className="gap-0 p-4">
          {!selected ? (
            <AdminEmptyState
              title="Pick a review to start"
              description={`${doneCount} of ${reviews.length} pending reviews are linked.`}
            />
          ) : (
            <div className="flex flex-col gap-5">
              {/* Step 1 header — everything needed to identify the machine. */}
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg leading-snug font-semibold">
                    {selected.video_title}
                  </h2>
                  <Button
                    variant="soft"
                    size="sm"
                    // nativeButton={false} goes with every `render` that swaps
                    // in an anchor — Base UI keeps native button semantics
                    // otherwise, which breaks the element's accessibility role.
                    render={
                      <a
                        href={selected.video_url}
                        target="_blank"
                        rel="noreferrer noopener"
                      />
                    }
                    nativeButton={false}
                  >
                    <ExternalLink className="size-4" />
                    Watch
                  </Button>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span>{selected.channel_name ?? selected.channel_id}</span>
                  {selected.published_at && (
                    <span>{new Date(selected.published_at).toLocaleDateString()}</span>
                  )}
                  {selected.segment_count === 0 ? (
                    <span className="text-warning">
                      no transcript — linking this produces no chunks
                    </span>
                  ) : (
                    <span>{selected.segment_count} transcript segments</span>
                  )}
                </div>
              </div>

              {/* Existing links. A review with links is finished; this is the
                  record of that, and the place to undo it. */}
              {selected.links.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {selected.links.map((link) => (
                    <li
                      key={link.id}
                      className="border-line bg-surface-2 flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">
                          {link.family_name ?? link.family_id}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {link.laptop_name ?? "configuration not stated"}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {link.match_source === "auto" && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-normal">
                            auto{" "}
                            {link.match_confidence !== null &&
                              `${link.match_confidence.toFixed(0)}%`}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => setOpenLinkId(openLinkId === link.id ? null : link.id)}
                        >
                          {openLinkId === link.id ? "Hide config" : "Set config"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy}
                          aria-label="Remove this link"
                          onClick={() => void removeLink(link.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Step 2 — optional, and only after a family exists. */}
              {openLink && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">
                    Which configuration was tested?{" "}
                    <span className="text-muted-foreground font-normal">optional</span>
                  </h3>
                  <ConfigPicker
                    token={token!}
                    familyId={openLink.family_id}
                    selectedLaptopId={openLink.laptop_id}
                    onPick={(laptopId) => void pickConfig(openLink.id, laptopId)}
                    error={configError}
                    busy={busy}
                  />
                </div>
              )}

              {/* Step 1 search, or step 3's secondary entry back into it. */}
              {showSearch ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">
                    {selected.links.length ? "Add another laptop" : "Which machine is this?"}
                  </h3>
                  <FamilySearch
                    token={token!}
                    onPick={(family) => void pickFamily(family)}
                    autoFocus
                    error={familyError}
                    busy={busy}
                  />
                </div>
              ) : (
                // Step 3 is rare — only comparison videos need it — so it stays
                // a quiet ghost button rather than competing with the flow.
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setAddingAnother(true)}
                  >
                    <Plus className="size-4" />
                    Add another laptop
                  </Button>
                </div>
              )}

              {busy && (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Spinner className="size-3.5" />
                  Saving…
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
