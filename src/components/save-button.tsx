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
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save to favorites"}
      aria-pressed={saved}
      onClick={toggle}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          saved ? "fill-red-500 text-red-500" : "hover:text-red-500",
        )}
      />
    </button>
  );
}
