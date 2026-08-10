"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/brand-mark";
import { Spinner } from "@/components/ui/spinner";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";

import { AdminFooter } from "./admin-footer";
import { navGroups, type NavLink } from "./admin-nav";
import { UnsavedChangesProvider, useAdminNavigation } from "./unsaved-changes";
import { AdminTopbar } from "./admin-topbar";

export function AdminShell({
  children,
  defaultOpen,
}: {
  children: React.ReactNode;
  defaultOpen: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  // Auth-gated section: bounce anyone who isn't an admin. Mirrors the
  // useEffect-redirect pattern used by /profile and /wizard rather than a
  // server-side check, since this app's auth state lives client-side.
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    // Wraps the whole portal so a form's unsaved work is visible to the
    // sidebar and breadcrumbs it would be lost to. Every link below therefore
    // lives in a child component — this one renders the provider, so it can't
    // read from it.
    <UnsavedChangesProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
      >
        <Sidebar collapsible="icon">
          <SidebarHeader>
            {/* Toggle lives in the topbar (AdminTopbar) so it stays reachable
              when the rail is collapsed and on mobile. */}
            <div className="flex items-center gap-2 px-2 py-1.5">
              {/* Goes to the dashboard, not the storefront. A wordmark inside an
                app is expected to be "home within this app"; leaving the portal
                is the explicit "Back to site" action in the footer. */}
              <BrandLink />
            </div>
          </SidebarHeader>

          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.links.map((link, i) => (
                      <NavItem
                        key={link.href}
                        link={link}
                        pathname={pathname}
                        // Only the dashboard needs an exact match; every other
                        // route would otherwise light up under "/admin".
                        exact={group.exactFirst && i === 0}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <BackToSiteLink />
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <AdminTopbar />
          {/* flex-1 on the content keeps the footer at the bottom of the inset on
            short screens instead of floating under a half-empty page. */}
          <div className="flex flex-1 flex-col gap-3 p-4">
            {/* The listing screens read their filters from useSearchParams,
                which a production build refuses to prerender without a Suspense
                boundary above it. One boundary here covers every page, and the
                sidebar and topbar keep prerendering around it. */}
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center">
                  <Spinner className="size-5 text-muted-foreground" />
                </div>
              }
            >
              {children}
            </Suspense>
          </div>
          <AdminFooter />
          <Toaster position="top-right" />
        </SidebarInset>
      </SidebarProvider>
    </UnsavedChangesProvider>
  );
}

/** The wordmark. Goes to the dashboard, not the storefront. */
function BrandLink() {
  const { guardNavigate } = useAdminNavigation();
  return (
    <Link
      href="/admin"
      onNavigate={(e) => guardNavigate(e, "/admin")}
      className="flex min-w-0 items-center gap-2"
    >
      <BrandMark className="text-brand size-6 shrink-0" />
      {/* Stacked wordmark: the "Admin" line is what distinguishes this from
          the storefront, so it rides with the name rather than sitting
          elsewhere in the chrome. Both hide together on the icon rail,
          leaving just the P. */}
      <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
        <span className="truncate text-[13.5px] leading-tight font-bold tracking-tight">
          PickWise
        </span>
        <span className="text-muted-foreground truncate text-[10.5px] leading-tight font-semibold tracking-[0.08em] uppercase">
          Admin Portal
        </span>
      </span>
    </Link>
  );
}

function BackToSiteLink() {
  const { guardNavigate } = useAdminNavigation();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href="/" onNavigate={(e) => guardNavigate(e, "/")} />}
        tooltip="Back to site"
      >
        <ArrowLeft />
        <span>Back to site</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavItem({
  link,
  pathname,
  exact = false,
}: {
  link: NavLink;
  pathname: string;
  exact?: boolean;
}) {
  const Icon = link.icon;
  const { guardNavigate } = useAdminNavigation();
  const active = exact
    ? pathname === link.href
    : pathname.startsWith(link.href);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <Link
            href={link.href}
            onNavigate={(e) => guardNavigate(e, link.href)}
          />
        }
        isActive={active}
        tooltip={link.label}
        className="data-active:bg-brand-tint data-active:font-semibold data-active:text-brand"
      >
        <Icon />
        <span>{link.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
