"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { listSavedIds, saveLaptop, unsaveLaptop } from "@/lib/api/saved";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/**
 * Heart toggle for the details page. Signed-out clicks route to /login;
 * signed-in clicks toggle optimistically and revert on API failure.
 */
export function SaveButton({ laptopId }: { laptopId: string }) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reset on sign-out (state-adjust-during-render — the set-state-in-effect
  // lint forbids the effect version).
  const [prevToken, setPrevToken] = useState(token);
  if (prevToken !== token) {
    setPrevToken(token);
    if (!token) setSaved(false);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listSavedIds(token)
      .then((ids) => {
        if (!cancelled) setSaved(ids.includes(laptopId));
      })
      .catch(() => {
        // Heart state is best-effort; the toggle still works.
      });
    return () => {
      cancelled = true;
    };
  }, [token, laptopId]);

  const toggle = async () => {
    if (!user || !token) {
      router.push("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      if (next) await saveLaptop(laptopId, token);
      else await unsaveLaptop(laptopId, token);
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    // size-8 rather than a bare icon: the tap target was the 16px glyph
    // itself, well under the 24px minimum. Matches ShareButton beside it.
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save to favorites"}
      aria-pressed={saved}
      onClick={toggle}
      className={cn(
        "flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors",
        "focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
        saved ? "text-negative" : "hover:bg-surface-2 hover:text-negative",
      )}
    >
      <Heart className={cn("size-4", saved && "fill-negative")} />
    </button>
  );
}
