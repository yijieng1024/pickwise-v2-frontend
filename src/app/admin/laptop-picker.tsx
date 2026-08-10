"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { listLaptops } from "@/lib/api/admin/laptops";
import type { BackendLaptop } from "@/lib/api/types";

/** Max suggestions shown at once. Asked of the server, not sliced locally. */
const MAX_MATCHES = 8;

/** Search-and-select a single laptop. Queries the server per keystroke
 * (debounced) rather than downloading the catalog to filter it locally — at
 * ~277 rows that was a ~700 KB request to show at most eight names. */
export function LaptopPicker({
  selected,
  onSelect,
  placeholder = "Search a laptop…",
}: {
  selected: BackendLaptop | null;
  onSelect: (laptop: BackendLaptop | null) => void;
  placeholder?: string;
}) {
  const [matches, setMatches] = useState<BackendLaptop[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!debouncedSearch) return;
    // Guards against a slow earlier keystroke landing after a newer one and
    // overwriting its results.
    let cancelled = false;
    listLaptops({ search: debouncedSearch, limit: MAX_MATCHES })
      .then((res) => {
        if (!cancelled) setMatches(res.items);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to search laptops.");
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  // Derived rather than cleared from the effect: emptying the box has to hide
  // the previous term's results immediately, and writing state from an effect
  // to do that costs a second render pass (and trips the lint rule).
  const visibleMatches = debouncedSearch && !selected ? matches : [];

  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        // The placeholder is the only visible description of this control, so
        // it doubles as the accessible name once focus clears it.
        aria-label={placeholder.replace(/…$/, "")}
        autoComplete="off"
        value={selected ? selected.product_name : search}
        onChange={(e) => {
          onSelect(null);
          setSearch(e.target.value);
        }}
        className="pl-8"
      />
      {visibleMatches.length > 0 && (
        <div className="border-line bg-popover absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border p-1 shadow-md">
          {visibleMatches.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onSelect(l);
                setSearch("");
              }}
              className="hover:bg-surface-2 block w-full rounded-md px-2.5 py-1.5 text-left text-[13px]"
            >
              {l.product_name}{" "}
              <span className="text-muted-foreground">({l.model_code})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
