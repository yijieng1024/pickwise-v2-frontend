"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { type SortState, toggleSort } from "./admin-sortable-head";

/** Reserved by the hook — a screen's own filters must not use these names. */
const PAGE_KEY = "page";
const SORT_KEY = "sort";
const DIR_KEY = "dir";

export interface AdminQuery<F extends string, S extends string> {
  /** Current value of every declared filter, defaults applied. */
  values: Record<F, string>;
  /**
   * Writes filters and returns to page 1. Pass `{ resetPage: false }` for a
   * control that only refines the rows already on screen, where jumping back
   * to page 1 would move the ground under the user.
   */
  set: (
    patch: Partial<Record<F, string>>,
    options?: { resetPage?: boolean },
  ) => void;
  page: number;
  setPage: (page: number) => void;
  sort: SortState<S> | null;
  /** Same toggle semantics as the table heads: re-clicking a key flips it. */
  sortBy: (key: S) => void;
  /** Filters + sort, no page — for resetting selections when the query narrows. */
  filterSignature: string;
  /** Everything that identifies the current result set, page included. */
  signature: string;
}

/**
 * URL-backed filter, sort and pagination state for the admin tables.
 *
 * Every listing screen used to hold this in `useState`, which meant a filtered
 * view existed only in the tab that made it: reloading dropped it, it couldn't
 * be linked to a colleague, and leaving the screen and coming back landed on an
 * unfiltered page 1. Ten screens also each re-derived the same page-reset and
 * stale-row guards by hand.
 *
 * Values equal to their default are left out of the URL, so an untouched screen
 * keeps a clean address and `signature` stays stable however the user got there.
 *
 * Writes use `replace`, not `push`. These are refinements of one screen rather
 * than separate destinations, and pushing would bury the way out of the page
 * under one history entry per pager click and per debounced keystroke — Back
 * should leave the table, not walk backwards through how it was narrowed.
 */
export function useAdminQuery<F extends string, S extends string = never>({
  filters,
  sortKeys,
  defaultSort = null,
}: {
  /** Filter name → the value that counts as "unset". */
  filters: Record<F, string>;
  /** Sortable columns. Required for `sort` to read anything from the URL. */
  sortKeys?: readonly S[];
  defaultSort?: SortState<S> | null;
}): AdminQuery<F, S> {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filterKeys = Object.keys(filters) as F[];
  const values = {} as Record<F, string>;
  for (const key of filterKeys) {
    values[key] = searchParams.get(key) ?? filters[key];
  }

  // A hand-typed ?page=0 or ?page=abc falls back rather than asking the API for
  // a negative offset.
  const rawPage = Number(searchParams.get(PAGE_KEY));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  // Sort keys are validated against the screen's own list because most of these
  // screens forward the key to the API as an ORDER BY column, and the URL is
  // user-editable. An unrecognised key falls back to the default.
  const urlSortKey = searchParams.get(SORT_KEY);
  const sorted = urlSortKey !== null && (sortKeys?.includes(urlSortKey as S) ?? false);
  const sortKey = sorted ? (urlSortKey as S) : (defaultSort?.key ?? null);
  const sortDir = sorted
    ? searchParams.get(DIR_KEY) === "desc"
      ? "desc"
      : "asc"
    : (defaultSort?.direction ?? "asc");

  // Memoised on the two primitives so `sort` keeps a stable identity across
  // renders and stays usable as an effect dependency, the way the useState it
  // replaced was.
  const sort = useMemo<SortState<S> | null>(
    () => (sortKey ? { key: sortKey, direction: sortDir } : null),
    [sortKey, sortDir],
  );

  function write(next: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) sp.delete(key);
      else sp.set(key, value);
    }
    const query = sp.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function set(
    patch: Partial<Record<F, string>>,
    { resetPage = true }: { resetPage?: boolean } = {},
  ) {
    const next: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(patch) as Array<[F, string]>) {
      next[key] = value === filters[key] ? null : value;
    }
    // A server-side filter change invalidates the page number: page 3 of a
    // narrower result set lands past the end and shows an empty table.
    if (resetPage) next[PAGE_KEY] = null;
    write(next);
  }

  function setPage(nextPage: number) {
    write({ [PAGE_KEY]: nextPage <= 1 ? null : String(nextPage) });
  }

  function sortBy(key: S) {
    const next = toggleSort(sort, key);
    const isDefault =
      next.key === defaultSort?.key &&
      next.direction === defaultSort?.direction;
    write({
      [SORT_KEY]: isDefault ? null : next.key,
      [DIR_KEY]: isDefault ? null : next.direction,
      [PAGE_KEY]: null,
    });
  }

  const filterSignature = [
    ...filterKeys.map((key) => `${key}=${values[key]}`),
    `sort=${sortKey ?? ""}:${sortDir}`,
  ].join("&");

  return {
    values,
    set,
    page,
    setPage,
    sort,
    sortBy,
    filterSignature,
    signature: `${filterSignature}&page=${page}`,
  };
}

/**
 * A text input's local value, committed to the URL on a debounce.
 *
 * The input can't be driven by the URL directly — a router write per keystroke
 * would make typing lag and fill the address bar with half-finished words — so
 * the draft leads and the URL follows.
 */
export function useSearchDraft(
  committed: string,
  commit: (value: string) => void,
  delay = 300,
): readonly [string, (value: string) => void] {
  const [draft, setDraft] = useState(committed);

  // Adopt changes that came from outside this input — the Back button, or a
  // "clear filters" control. When the incoming value is the one this input just
  // committed, leave the draft alone: overwriting it would eat a trailing space
  // the user is still typing past. "Adjust state during render", since the
  // set-state-in-effect lint forbids the effect version.
  const [prevCommitted, setPrevCommitted] = useState(committed);
  if (committed !== prevCommitted) {
    setPrevCommitted(committed);
    if (committed !== draft.trim()) setDraft(committed);
  }

  // `commit` closes over the current URL, so it changes identity on every
  // navigation. Held in a ref rather than a dependency, or every URL change
  // would restart the timer and a fast typist's search would never land.
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === committed) return;
    const timer = setTimeout(() => commitRef.current(trimmed), delay);
    return () => clearTimeout(timer);
  }, [draft, committed, delay]);

  return [draft, setDraft] as const;
}
