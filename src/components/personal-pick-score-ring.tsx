"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";

import { PickScoreRing } from "@/components/pick-score-ring";
import { calculatePersonalScore } from "@/lib/api/pickscore";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface PersonalPickScoreRingProps {
  laptopId: string;
  /** General-mode score shown until (and unless) a personal one resolves. */
  fallbackScore: number;
  size?: number;
  caption?: "below" | "inside" | "none";
  className?: string;
}

/**
 * PickScoreRing that upgrades itself to the user's personalized score
 * (wizard-preference weighting) when signed in — same overlay-and-badge
 * treatment as the chat shortlist cards. Server pages can render it with
 * the general score; the personal fetch happens client-side.
 */
export function PersonalPickScoreRing({
  laptopId,
  fallbackScore,
  size = 64,
  caption = "below",
  className,
}: PersonalPickScoreRingProps) {
  const { user, token, hasPreferences } = useAuth();
  const [personal, setPersonal] = useState<number | null>(null);

  // Reset on sign-out (state-adjust-during-render — the set-state-in-effect
  // lint forbids the effect version).
  const [prevUser, setPrevUser] = useState(user);
  if (prevUser !== user) {
    setPrevUser(user);
    if (!user) setPersonal(null);
  }

  useEffect(() => {
    if (!user || !token || hasPreferences !== true) return;
    let cancelled = false;
    calculatePersonalScore(laptopId, user.id, token)
      .then((res) => {
        if (!cancelled && res.mode === "personalized") setPersonal(res.score);
      })
      .catch(() => {
        // Best-effort — the general score stays.
      });
    return () => {
      cancelled = true;
    };
  }, [user, token, hasPreferences, laptopId]);

  return (
    <span
      className={cn("relative inline-flex", className)}
      title={
        personal != null
          ? "Personalized PickScore — weighted from your Needs Wizard answers"
          : undefined
      }
    >
      <PickScoreRing
        score={personal ?? fallbackScore}
        size={size}
        caption={caption}
      />
      {personal != null && (
        <span className="bg-brand absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-white">
          <UserRound className="h-2.5 w-2.5" />
        </span>
      )}
    </span>
  );
}
