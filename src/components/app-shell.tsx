"use client";

import { usePathname } from "next/navigation";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

/** Routes with their own full app shell — no marketing header/footer at all. */
const NO_CHROME_ROUTES = ["/admin"];

/**
 * Routes where only the footer is omitted — full-height app-like workspaces
 * where a footer would just add scroll below the fold (the chat bento grid
 * sizes itself to the viewport).
 */
const NO_FOOTER_ROUTES = ["/chat"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (NO_CHROME_ROUTES.some((p) => pathname.startsWith(p))) {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  const hideFooter = NO_FOOTER_ROUTES.some((p) => pathname.startsWith(p));

  return (
    <>
      <Header />
      {/* Breathing room between the floating nav island and page content */}
      <div className="flex flex-1 flex-col pt-6">{children}</div>
      {!hideFooter && <Footer />}
    </>
  );
}
