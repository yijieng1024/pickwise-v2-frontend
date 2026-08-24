"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import {
  type FamilySearchResult,
  searchReviewFamilies,
} from "@/lib/api/admin/review-links";
import { cn } from "@/lib/utils";

/**
 * Step 1: which machine is this?
 *
 * The video title almost always names the model, so the human is CONFIRMING,
 * not searching. Two consequences drive the design:
 *
 *  - results must appear while typing a partial name, not on submit;
 *  - picking one must be a single click that immediately creates the link.
 *    No "select then confirm" — the confirm step doubles the action count on
 *    the one interaction that happens 55 times.
 */

const DEBOUNCE_MS = 200;

export function FamilySearch({
  token,
  onPick,
  autoFocus,
  error,
  busy,
}: {
  token: string;
  onPick: (family: FamilySearchResult) => void;
  autoFocus?: boolean;
  /** Inline error from the create call, rendered against this control. */
  error?: string | null;
  busy?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FamilySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against an older, slower response overwriting a newer one — the
  // human types fast enough for responses to arrive out of order.
  const requestSeq = useRef(0);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    const trimmed = query.trim();
    // Flipped inside the timer, not in the effect body: a synchronous setState
    // here cascades a render on every keystroke before any request is made.
    const timer = setTimeout(async () => {
      if (seq === requestSeq.current) setLoading(true);
      try {
        // An empty query is still sent: the backend returns the first page of
        // families, which is a useful starting list rather than a blank panel.
        const found = await searchReviewFamilies(token, trimmed, 20);
        if (seq === requestSeq.current) {
          setResults(found);
          setFailure(null);
        }
      } catch (e) {
        if (seq === requestSeq.current) {
          setFailure(e instanceof ApiError ? e.message : "Family search failed.");
          setResults([]);
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, token]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product line, e.g. TUF Gaming A16"
          className="pl-9"
          aria-label="Search laptop families"
        />
        {loading && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 motion-safe:animate-spin" />
        )}
      </div>

      {error && (
        <p role="alert" className="text-negative text-xs">
          {error}
        </p>
      )}
      {failure && <p className="text-negative text-xs">{failure}</p>}

      <ul className="max-h-72 overflow-y-auto rounded-md border">
        {results.length === 0 && !loading && (
          <li className="text-muted-foreground px-3 py-6 text-center text-sm">
            No families match “{query}”.
          </li>
        )}
        {results.map((family) => (
          <li key={family.family_id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onPick(family)}
              className={cn(
                "hover:bg-surface-2 flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{family.name}</span>
                <span className="text-muted-foreground text-xs">{family.brand}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {family.is_verified && (
                  <Check className="text-positive size-3.5" aria-label="Verified grouping" />
                )}
                <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-normal">
                  {family.member_count} config{family.member_count === 1 ? "" : "s"}
                </Badge>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
