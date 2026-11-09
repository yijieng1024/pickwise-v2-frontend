"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wand2, X } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { dismissBanner, isBannerDismissed } from "@/lib/onboarding";

/**
 * Pages where the nudge would be in the way: the wizard itself, the auth
 * screens, and chat, which sizes itself to the viewport.
 */
const HIDDEN_ON = ["/wizard", "/login", "/signup", "/verify-email", "/forgot-password", "/reset-password", "/chat"];

/**
 * Nudges a signed-in user with no saved preferences towards the wizard, after
 * the one-time redirect has passed. Dismissal is remembered per user in this
 * browser.
 */
export function WizardBanner() {
  const pathname = usePathname();
  const { user, hasPreferences } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // user only exists on the client, so reading storage here never runs during SSR.
  if (!user || hasPreferences !== false || dismissed || isBannerDismissed(user.id)) return null;
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6">
      <div
        role="status"
        className="border-line bg-surface flex items-center gap-3 rounded-2xl border px-4 py-3 motion-safe:animate-fade-in-up"
      >
        <Wand2 className="text-brand-text size-4.5 flex-none" strokeWidth={1.8} aria-hidden />
        <p className="flex-1 text-[13px]">
          Answer six quick questions and every Pick Score is tuned to you.
        </p>
        <Link
          href="/wizard"
          className="bg-brand rounded-full px-4 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90"
        >
          Start
        </Link>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            dismissBanner(user.id);
            setDismissed(true);
          }}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
