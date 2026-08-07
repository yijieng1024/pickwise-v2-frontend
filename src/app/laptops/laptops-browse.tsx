"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Search, X } from "lucide-react";

import { LaptopCard } from "@/components/laptop-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Laptop } from "@/lib/laptops";

import { PAGE_SIZE, type SortOrder, type ViewMode } from "./browse-params";
import { cn } from "@/lib/utils";

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "reco", label: "Sort: Recommended" },
  { value: "asc", label: "Price: Low to High" },
  { value: "desc", label: "Price: High to Low" },
];

/**
 * Presentation only — every control writes to the URL and the server returns
 * the matching page. There is deliberately no client-side filtering, sorting
 * or slicing left here: with pagination those would only ever act on the 24
 * rows already on screen, so the count and the pager would disagree with what
 * the user sees.
 */
export function LaptopsBrowse({
  laptops,
  brands,
  total,
  page,
  query,
  brand,
  sort,
  view,
  priceMin,
  priceMax,
}: {
  laptops: Laptop[];
  brands: string[];
  total: number;
  page: number;
  query: string;
  brand: string;
  sort: SortOrder;
  view: ViewMode;
  priceMin?: number;
  priceMax?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Keeps the previous page on screen (dimmed) while the server renders the
  // next one, instead of blanking the grid on every keystroke or chip click.
  const [pending, startTransition] = useTransition();

  /** Writes one or more params, always resetting to page 1 unless paging. */
  function apply(next: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || value === "All") sp.delete(key);
      else sp.set(key, String(value));
    }
    if (!("page" in next)) sp.delete("page");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
  }

  // Local mirror so typing feels instant; the URL is updated on a debounce.
  const [searchDraft, setSearchDraft] = useState(query);
  // Re-sync when the URL changes underneath us (back button, Clear filters) —
  // "adjust state during render", since the set-state-in-effect lint forbids
  // the effect version. See laptops-browse's siblings in /admin.
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSearchDraft(query);
  }

  useEffect(() => {
    if (searchDraft === query) return;
    const t = setTimeout(() => apply({ q: searchDraft || undefined }), 350);
    return () => clearTimeout(t);
    // `apply` closes over the current params, which is what we want per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft, query]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const chips = ["All", ...brands];
  const hasFilters =
    Boolean(query) || brand !== "All" || priceMin !== undefined || priceMax !== undefined;

  return (
    <>
      <div className="mb-7">
        <h1 className="text-4xl font-bold tracking-tight">All Laptops</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="tabular-nums">{total}</span>{" "}
          {total === 1 ? "laptop" : "laptops"}
          {hasFilters ? " match your filters" : ""} · ask Pico anytime for a personalised
          shortlist
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by model, brand or spec…"
            aria-label="Search laptops"
            className="border-line bg-surface dark:bg-surface h-11.5 rounded-full py-0 pr-5 pl-10 text-[13.5px] md:text-[13.5px] transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)] focus-visible:border-line focus-visible:ring-0"
          />
        </div>

        <Select
          items={sortOptions}
          value={sort}
          onValueChange={(value) => apply({ sort: value === "reco" ? undefined : String(value) })}
        >
          <SelectTrigger
            aria-label="Sort laptops"
            className="border-line bg-surface cursor-pointer rounded-full px-4 text-[12.5px] font-semibold data-[size=default]:h-11.5"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="rounded-2xl p-1">
            {sortOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="cursor-pointer rounded-lg px-3 py-2 text-[12.5px] font-medium"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div
          role="group"
          aria-label="View mode"
          className="border-line bg-surface flex h-11.5 items-center gap-1 rounded-full border p-1.5"
        >
          {(
            [
              { mode: "grid", icon: LayoutGrid, label: "Grid view" },
              { mode: "list", icon: List, label: "List view" },
            ] as const
          ).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => apply({ view: mode === "grid" ? undefined : mode, page })}
              aria-label={label}
              aria-pressed={view === mode}
              className={cn(
                "flex h-full cursor-pointer items-center justify-center rounded-full px-3 transition-colors",
                view === mode
                  ? "bg-brand text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {chips.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => apply({ brand: b })}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                brand === b
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface text-muted-foreground hover:border-brand",
              )}
            >
              {b}
            </button>
          ))}
        </div>

        <PriceRange min={priceMin} max={priceMax} onApply={(min, max) => apply({ min, max })} />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            shape="pill"
            onClick={() => apply({ q: undefined, brand: undefined, min: undefined, max: undefined })}
          >
            <X data-icon="inline-start" />
            Clear filters
          </Button>
        )}
      </div>

      {laptops.length === 0 ? (
        <div className="border-line bg-surface flex flex-col items-center gap-2 rounded-3xl border py-16 text-center">
          <p className="font-medium">No laptops match your filters</p>
          <p className="text-sm text-muted-foreground">
            Try a different brand, price range or search term.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "transition-opacity",
            pending && "opacity-60",
            view === "grid"
              ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-4",
          )}
        >
          {laptops.map((laptop, i) => (
            <div
              // Key includes the query so a new page replays the reveal.
              key={`${view}-${brand}-${sort}-${query}-${page}-${laptop.id}`}
              className="motion-safe:animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <LaptopCard laptop={laptop} showScore={false} layout={view} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-10 flex flex-wrap items-center justify-between gap-3"
        >
          <span className="text-muted-foreground text-[12.5px] tabular-nums">
            {from}–{to} of {total}
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              shape="pill"
              disabled={page <= 1 || pending}
              onClick={() => apply({ page: page - 1 <= 1 ? undefined : page - 1 })}
            >
              <ChevronLeft data-icon="inline-start" />
              Previous
            </Button>
            <span className="text-muted-foreground text-[12.5px] tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              shape="pill"
              disabled={page >= totalPages || pending}
              onClick={() => apply({ page: page + 1 })}
            >
              Next
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </nav>
      )}
    </>
  );
}

/**
 * Price bounds, committed on blur/Enter rather than per keystroke — a partially
 * typed "3" in the max field would otherwise fire a query for "under RM3".
 */
function PriceRange({
  min,
  max,
  onApply,
}: {
  min?: number;
  max?: number;
  onApply: (min: number | undefined, max: number | undefined) => void;
}) {
  const [lo, setLo] = useState(min?.toString() ?? "");
  const [hi, setHi] = useState(max?.toString() ?? "");

  // Same render-phase re-sync as the search box: keeps the inputs honest when
  // the URL changes from outside (Clear filters, back button).
  const bounds = `${min ?? ""}|${max ?? ""}`;
  const [prevBounds, setPrevBounds] = useState(bounds);
  if (bounds !== prevBounds) {
    setPrevBounds(bounds);
    setLo(min?.toString() ?? "");
    setHi(max?.toString() ?? "");
  }

  const commit = () => {
    const l = lo.trim() === "" ? undefined : Number(lo);
    const h = hi.trim() === "" ? undefined : Number(hi);
    onApply(
      Number.isFinite(l) && (l as number) >= 0 ? l : undefined,
      Number.isFinite(h) && (h as number) >= 0 ? h : undefined,
    );
  };

  const field =
    "border-line bg-surface dark:bg-surface h-11.5 w-24 rounded-full py-0 px-4 text-[12.5px] md:text-[12.5px] focus-visible:border-line focus-visible:ring-0";

  return (
    <div className="flex items-center gap-2">
      <Input
        inputMode="numeric"
        placeholder="Min RM"
        aria-label="Minimum price in RM"
        value={lo}
        onChange={(e) => setLo(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className={field}
      />
      <span className="text-muted-foreground text-xs">to</span>
      <Input
        inputMode="numeric"
        placeholder="Max RM"
        aria-label="Maximum price in RM"
        value={hi}
        onChange={(e) => setHi(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className={field}
      />
    </div>
  );
}
