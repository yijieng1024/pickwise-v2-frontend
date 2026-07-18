"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, LayoutGrid, List, Loader2, Search } from "lucide-react";

import { LaptopCard } from "@/components/laptop-card";
import { Input } from "@/components/ui/input";
import { mapBackendLaptop } from "@/lib/api/adapters";
import { apiFetch } from "@/lib/api/client";
import { listSavedLaptops, unsaveLaptop } from "@/lib/api/saved";
import type { BackendBrand } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";
import type { Laptop } from "@/lib/laptops";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="bg-brand-tint text-brand mb-6 flex h-16 w-16 items-center justify-center rounded-full">
        <Heart className="h-8 w-8" />
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mb-8 max-w-md text-muted-foreground">{body}</p>
      <Link
        href={cta.href}
        className="bg-brand rounded-full px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
      >
        {cta.label}
      </Link>
    </div>
  );
}

export default function SavedPage() {
  const { user, token, isLoading } = useAuth();
  // null = not loaded yet (fetching or signed out)
  const [laptops, setLaptops] = useState<Laptop[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");

  // Reset on sign-out (state-adjust-during-render — the set-state-in-effect
  // lint forbids the effect version).
  const [prevToken, setPrevToken] = useState(token);
  if (prevToken !== token) {
    setPrevToken(token);
    if (!token) {
      setLaptops(null);
      setFailed(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([listSavedLaptops(token), apiFetch<BackendBrand[]>("/brands")])
      .then(([rows, brands]) => {
        if (cancelled) return;
        const brandsById = new Map(brands.map((b) => [b.id, b]));
        setLaptops(rows.map((r) => mapBackendLaptop(r, brandsById.get(r.brand_id))));
      })
      .catch(() => {
        if (!cancelled) {
          setLaptops([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const remove = (id: string) => {
    if (!token) return;
    setLaptops((ls) => ls?.filter((l) => l.id !== id) ?? null);
    unsaveLaptop(id, token).catch(() => {
      // Removal failed — re-fetch so the list reflects the server again.
      listSavedLaptops(token)
        .then((rows) => setLaptops(rows.map((r) => mapBackendLaptop(r, undefined))))
        .catch(() => {});
    });
  };

  const visible = useMemo(() => {
    if (!laptops) return [];
    const q = query.trim().toLowerCase();
    if (!q) return laptops;
    return laptops.filter((l) =>
      [l.name, l.brand, ...Object.values(l.specs)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [laptops, query]);

  const withRemoveHeart = (laptop: Laptop, i: number) => (
    <div
      key={laptop.id}
      className="relative motion-safe:animate-fade-in-up"
      style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
    >
      <LaptopCard
        laptop={laptop}
        showScore={false}
        layout={view === "list" ? "list" : "grid"}
      />
      {/* Above the card's stretched link (z-10) so it doesn't navigate */}
      <button
        type="button"
        aria-label={`Remove ${laptop.name} from saved`}
        onClick={() => remove(laptop.id)}
        className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-red-500 shadow-sm backdrop-blur-sm transition-transform hover:scale-110"
      >
        <Heart className="h-4 w-4 fill-current" />
      </button>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8">
      {isLoading || (user && laptops === null && !failed) ? (
        <div className="flex justify-center py-24">
          <Loader2 className="text-brand h-6 w-6 animate-spin" />
        </div>
      ) : !user ? (
        <EmptyState
          title="Sign in to save laptops"
          body="Tap the heart on any laptop to keep it here for later. Your saved picks sync across devices."
          cta={{ href: "/login", label: "Sign in" }}
        />
      ) : laptops && laptops.length === 0 ? (
        <EmptyState
          title={failed ? "Couldn't load your saved laptops" : "No saved laptops yet"}
          body={
            failed
              ? "Something went wrong on our side. Refresh to try again."
              : "Tap the heart on any laptop to keep it here for later. Your saved picks sync across devices."
          }
          cta={{ href: "/laptops", label: "Browse laptops" }}
        />
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-4xl font-bold tracking-tight">Saved laptops</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {laptops?.length} saved · newest first — tap the heart on a card
              to remove it
            </p>
          </div>

          <div className="mb-7 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your saved laptops…"
                aria-label="Search saved laptops"
                className="border-line bg-surface dark:bg-surface h-11.5 rounded-full py-0 pr-5 pl-10 text-[13.5px] md:text-[13.5px] transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)] focus-visible:border-line focus-visible:ring-0"
              />
            </div>

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
                  onClick={() => setView(mode)}
                  aria-label={label}
                  aria-pressed={view === mode}
                  className={cn(
                    "flex h-full cursor-pointer items-center justify-center rounded-full px-3 transition-colors",
                    view === mode
                      ? "bg-brand text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No saved laptop matches “{query.trim()}”.
            </p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map(withRemoveHeart)}
            </div>
          ) : (
            <div className="flex flex-col gap-5">{visible.map(withRemoveHeart)}</div>
          )}
        </>
      )}
    </main>
  );
}
