"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * What is left of the topbar: on mobile the sidebar is a Sheet, so something
 * outside it has to open it. Desktop has no topbar at all — expand/collapse,
 * theme and account live in the sidebar island's footer, and running jobs on
 * its Jobs link.
 */
export function AdminTopbar() {
  return (
    <header className="pointer-events-none sticky top-0 z-20 flex shrink-0 px-4 pt-3 md:hidden">
      <div className="admin-glass pointer-events-auto flex h-11 items-center px-1.5">
        <SidebarTrigger className="rounded-full" />
      </div>
    </header>
  );
}
