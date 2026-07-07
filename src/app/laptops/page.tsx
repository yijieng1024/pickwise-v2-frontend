"use client";

import { useMemo, useState } from "react";
import { ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";

import { LaptopCard } from "@/components/laptop-card";
import { laptops } from "@/lib/laptops";
import { cn } from "@/lib/utils";

const brands = ["All", ...new Set(laptops.map((l) => l.brand))];

type SortOrder = "default" | "asc" | "desc";

export default function LaptopsPage() {
  const [brand, setBrand] = useState("All");
  const [sort, setSort] = useState<SortOrder>("default");

  const visible = useMemo(() => {
    const filtered =
      brand === "All" ? [...laptops] : laptops.filter((l) => l.brand === brand);
    if (sort !== "default") {
      filtered.sort((a, b) =>
        sort === "asc"
          ? a.priceValue - b.priceValue
          : b.priceValue - a.priceValue,
      );
    }
    return filtered;
  }, [brand, sort]);

  function cycleSort() {
    setSort((s) => (s === "default" ? "asc" : s === "asc" ? "desc" : "default"));
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight">All Laptops</h1>
        <p className="mt-2 text-muted-foreground">
          Browse every model in our catalog. Use the Needs Wizard for
          personalized Pick Scores.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBrand(b)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                brand === b
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:border-primary hover:text-primary",
              )}
            >
              {b}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={cycleSort}
          className={cn(
            "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            sort === "default"
              ? "bg-background text-muted-foreground hover:border-primary hover:text-primary"
              : "border-primary text-primary",
          )}
        >
          {sort === "desc" ? (
            <ArrowDownNarrowWide className="h-4 w-4" />
          ) : (
            <ArrowUpNarrowWide className="h-4 w-4" />
          )}
          {sort === "default"
            ? "Sort by Price"
            : sort === "asc"
              ? "Price: Low to High"
              : "Price: High to Low"}
        </button>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Showing {visible.length} of {laptops.length} models
      </p>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((laptop, i) => (
          <div
            // Key includes the filter state so re-filtering replays the reveal
            key={`${brand}-${sort}-${laptop.id}`}
            className="motion-safe:animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <LaptopCard laptop={laptop} showScore={false} />
          </div>
        ))}
      </div>
    </main>
  );
}
