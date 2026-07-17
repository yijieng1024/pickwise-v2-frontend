"use client";

import { usePathname } from "next/navigation";

import { Footer } from "@/components/footer";

/**
 * Routes where the footer is omitted — full-height app-like workspaces where
 * a footer would just add scroll below the fold (the chat bento grid sizes
 * itself to the viewport).
 */
const HIDDEN_ON = ["/chat"];

export function ConditionalFooter() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  return <Footer />;
}
