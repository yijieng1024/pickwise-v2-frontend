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
  /** A personalized score the caller already has (a configuration's); null for none.
   *  Undefined (the default) fetches the laptop's own. */
  personalScore?: number | null;
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
  personalScore,
}: PersonalPickScoreRingProps) {
  const { user, token, hasPreferences } = useAuth();
  const given = personalScore !== undefined;
  const [fetched, setPersonal] = useState<number | null>(null);
  const personal = given ? personalScore : fetched;

  // Reset on sign-out (state-adjust-during-render — the set-state-in-effect
  // lint forbids the effect version).
  const [prevUser, setPrevUser] = useState(user);
  if (prevUser !== user) {
    setPrevUser(user);
    if (!user) setPersonal(null);
  }

  useEffect(() => {
    if (given || !user || !token || hasPreferences !== true) return;
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
  }, [given, user, token, hasPreferences, laptopId]);

  return (
    <span
      className={cn("relative inline-flex", className)}
      title={
        personal != null
          ? "Personalized Pick Score — weighted from your Needs Wizard answers"
          : undefined
      }
    >
      <PickScoreRing
        score={personal ?? fallbackScore}
        size={size}
        caption={caption}
      />
      {personal != null && (
        <span className="bg-brand absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-white">
          <UserRound className="size-2.5" />
        </span>
      )}
    </span>
  );
}
