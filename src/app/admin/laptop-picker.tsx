"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";

/** Search-and-select a single laptop. Fetches the catalog once and filters
 * client-side (same approach as the customizations page). */
export function LaptopPicker({
  selected,
  onSelect,
  placeholder = "Search a laptop…",
}: {
  selected: BackendLaptop | null;
  onSelect: (laptop: BackendLaptop | null) => void;
  placeholder?: string;
}) {
  const [laptops, setLaptops] = useState<BackendLaptop[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch<BackendLaptop[]>("/laptops/")
      .then(setLaptops)
      .catch(() => toast.error("Failed to load laptops."));
  }, []);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return laptops
      .filter(
        (l) =>
          l.product_name.toLowerCase().includes(q) || l.model_code.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [laptops, search]);

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
      {matches.length > 0 && !selected && (
        <div className="border-line bg-popover absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border p-1 shadow-md">
          {matches.map((l) => (
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
