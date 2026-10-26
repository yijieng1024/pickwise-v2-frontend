"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/brand-mark";
import { Spinner } from "@/components/ui/spinner";
import { Toaster } from "@/components/ui/sonner";
import { jobTypeLabel } from "@/lib/api/admin/jobs";
import { useActiveJobs } from "@/lib/admin/use-job";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AccountItem, LogoutItem, ThemeToggleItem } from "./admin-account";
import { AdminFooter } from "./admin-footer";
import { pinnedLinks, type NavLink } from "./admin-nav";
import { NavGroupSwitcher, useNavGroup } from "./admin-nav-group";
import { UnsavedChangesProvider, useAdminNavigation } from "./unsaved-changes";
import { AdminTopbar } from "./admin-topbar";

export function AdminShell({
  children,
  defaultOpen,
  initialGroup,
}: {
  children: React.ReactNode;
  defaultOpen: boolean;
  /** The `admin_nav_group` cookie, read server-side. */
  initialGroup?: string;
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
        style={{ "--sidebar-width": "14rem" } as React.CSSProperties}
      >
        {/* A floating glass island, like the storefront nav but on the side.
            The look, the 12px gap and the collapsed width are all in
            `.admin-island` (globals.css). */}
        {/* The page background the glass island sits over (globals.css). */}
        <div className="admin-backdrop" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <Sidebar collapsible="icon" variant="floating" className="admin-island">
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

          <AdminNav initialGroup={initialGroup} pathname={pathname} />

          <SidebarFooter>
            <SidebarMenu>
              <ThemeToggleItem />
              <SidebarToggleItem />
              <BackToSiteLink />
              <LogoutItem />
              <AccountItem />
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="bg-transparent">
          <AdminTopbar />
          {/* flex-1 on the content keeps the footer at the bottom of the inset on
            short screens instead of floating under a half-empty page. */}
          <div className="flex w-full flex-1 flex-col gap-3 p-4 md:pt-4 md:pr-8 md:pb-12 md:pl-6">
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
      <BrandMark className="text-brand-text size-6 shrink-0" />
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

/**
 * Dashboard and Jobs pinned on top; below them the group switcher and only the
 * chosen group's pages. Its own component because the group hook needs the
 * SidebarProvider above it (the switcher reads collapsed/mobile state).
 */
const PAGE_LIST_FADE_OUT_MS = 150;

function AdminNav({ initialGroup, pathname }: { initialGroup?: string; pathname: string }) {
  const [group, setGroup] = useNavGroup(initialGroup);
  // Background jobs outlive the screen that started them, so "something is
  // running" lives on the always-visible Jobs link (it used to be a topbar pill).
  const { token } = useAuth();
  const { count, firstJob } = useActiveJobs(token);
  const jobsRunning =
    count === 0
      ? undefined
      : count === 1 && firstJob
        ? `${jobTypeLabel(firstJob.job_type)} · ${firstJob.progress_percentage}%`
        : `${count} jobs running`;

  // The page list fades out, then the next group's fades in. `shown` lags
  // `group` by the fade-out, so the old links stay mounted while they leave.
  const [shown, setShown] = useState(group);
  const leaving = shown.id !== group.id;
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setShown(group), PAGE_LIST_FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [leaving, group]);

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {pinnedLinks.map((link) => (
              <NavItem
                key={link.href}
                link={link}
                pathname={pathname}
                // Only the dashboard needs an exact match; every other route
                // would otherwise light up under "/admin".
                exact={link.href === "/admin"}
                running={link.href === "/admin/jobs" ? jobsRunning : undefined}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <NavGroupSwitcher group={group} onChange={setGroup} />
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenu
            key={shown.id}
            className={cn(
              "animate-in fade-in duration-200 motion-reduce:animate-none",
              leaving && "animate-out fade-out fill-mode-forwards duration-150",
            )}
          >
            {shown.links.map((link) => (
              <NavItem key={link.href} link={link} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

/**
 * Expand/collapse, at the foot of the island just above "Back to site". Desktop
 * only: on mobile the sidebar is a Sheet, opened from the topbar's trigger
 * (which is mobile-only for the same reason) and closed by tapping outside.
 */
function SidebarToggleItem() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  if (isMobile) return null;
  const collapsed = state === "collapsed";
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={toggleSidebar} tooltip={label} aria-label={label}>
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
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
  running,
}: {
  link: NavLink;
  pathname: string;
  exact?: boolean;
  /** Set while background jobs run: a pulsing badge, and the tooltip says what. */
  running?: string;
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
        tooltip={running ? `${link.label} · ${running}` : link.label}
        className="data-active:bg-brand-tint data-active:font-semibold data-active:text-brand-text"
      >
        <Icon />
        <span>{link.label}</span>
      </SidebarMenuButton>
      {running && (
        <SidebarMenuBadge
          title={running}
          className="text-brand-text bg-brand-tint pointer-events-none rounded-full px-1.5"
        >
          <span className="bg-brand size-1.5 rounded-full motion-safe:animate-pulse" aria-hidden />
          <span className="sr-only">{running}</span>
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}
