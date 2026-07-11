"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { LaptopCard } from "@/components/laptop-card";
import type { Laptop } from "@/lib/laptops";
import { cn } from "@/lib/utils";

type SortOrder = "reco" | "asc" | "desc";

export function LaptopsBrowse({ laptops }: { laptops: Laptop[] }) {
  const brands = useMemo(() => ["All", ...new Set(laptops.map((l) => l.brand))], [laptops]);
  const [brand, setBrand] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("reco");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = laptops.filter((l) => {
      const matchesBrand = brand === "All" || l.brand === brand;
      const haystack = `${l.name} ${l.brand} ${Object.values(l.specs).join(" ")}`.toLowerCase();
      return matchesBrand && haystack.includes(q);
    });
    if (sort !== "reco") {
      filtered.sort((a, b) =>
        sort === "asc"
          ? a.priceValue - b.priceValue
          : b.priceValue - a.priceValue,
      );
    }
    return filtered;
  }, [laptops, brand, query, sort]);

  return (
    <>
      <div className="mb-7">
        <h1 className="text-4xl font-bold tracking-tight">All laptops</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {visible.length} laptops · ask Pico anytime for a personalised
          shortlist
        </p>
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by model, brand or spec…"
            aria-label="Search laptops"
            className="border-line bg-surface h-11.5 w-full rounded-full border py-0 pr-5 pl-10 text-[13.5px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBrand(b)}
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

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOrder)}
          aria-label="Sort laptops"
          className="border-line bg-surface h-11.5 rounded-full border px-4 text-[12.5px] font-semibold outline-none"
        >
          <option value="reco">Sort: Recommended</option>
          <option value="asc">Price: Low to High</option>
          <option value="desc">Price: High to Low</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="border-line bg-surface flex flex-col items-center gap-2 rounded-3xl border py-16 text-center">
          <p className="font-medium">No laptops match your filters</p>
          <p className="text-sm text-muted-foreground">
            Try a different brand or search term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((laptop, i) => (
            <div
              // Key includes the filter state so re-filtering replays the reveal
              key={`${brand}-${sort}-${query}-${laptop.id}`}
              className="motion-safe:animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <LaptopCard laptop={laptop} showScore={false} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
