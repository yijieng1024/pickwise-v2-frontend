"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Cpu,
  FileStack,
  FileText,
  FolderTree,
  History,
  LayoutDashboard,
  Laptop,
  ListChecks,
  ListOrdered,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Tv,
  Upload,
  Users,
  Wand2,
  Workflow,
  Zap,
} from "lucide-react";

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
import { Spinner } from "@/components/ui/spinner";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";

import { AdminTopbar } from "./admin-topbar";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType;
}

/**
 * Grouped in pipeline order rather than by domain, and deliberately flat.
 *
 * Every stage depends on the one before it, so the nav order is the mental
 * model the portal has to teach. The previous domain grouping hid three of
 * these groups one accordion deep, which buried the destinations an admin
 * reaches for most.
 */
const navGroups: Array<{ label: string; links: NavLink[]; exactFirst?: boolean }> = [
  {
    label: "Overview",
    exactFirst: true,
    links: [
      { href: "/admin", label: "Pipeline health", icon: LayoutDashboard },
      // Background runs outlive the page that started them, so their history
      // is a destination rather than a panel on one screen.
      { href: "/admin/jobs", label: "Jobs", icon: History },
    ],
  },
  {
    label: "Collect",
    links: [
      { href: "/admin/queue", label: "Scrape queue", icon: ListOrdered },
      { href: "/admin/upload", label: "Manual upload", icon: Upload },
      { href: "/admin/pipeline", label: "Raw records", icon: FileStack },
    ],
  },
  {
    label: "Catalog",
    links: [
      { href: "/admin/processing", label: "AI clean-up", icon: Wand2 },
      { href: "/admin/catalog/laptops", label: "Laptops", icon: Laptop },
      { href: "/admin/catalog/brands", label: "Brands", icon: Tag },
      { href: "/admin/catalog/customizations", label: "Upgrade options", icon: SlidersHorizontal },
      { href: "/admin/taxonomy", label: "Tags & taxonomy", icon: FolderTree },
    ],
  },
  {
    label: "Reviews",
    links: [
      { href: "/admin/reviews/channels", label: "Sources", icon: Tv },
      { href: "/admin/reviews/raw", label: "Match queue", icon: FileText },
      { href: "/admin/reviews/pipeline", label: "Aggregate", icon: Workflow },
    ],
  },
  {
    label: "Configuration",
    links: [
      { href: "/admin/questionnaire", label: "Questionnaire", icon: ListChecks },
      { href: "/admin/embeddings", label: "Embeddings", icon: Sparkles },
      { href: "/admin/benchmarks/cpu", label: "CPU benchmarks", icon: Cpu },
      { href: "/admin/benchmarks/gpu", label: "GPU benchmarks", icon: Zap },
    ],
  },
  {
    label: "Administration",
    links: [
      { href: "/admin/agent-monitoring", label: "Chatbot monitoring", icon: Activity },
      { href: "/admin/users", label: "Users", icon: Users },
    ],
  },
];

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
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
    >
      <Sidebar collapsible="icon">
        <SidebarHeader>
          {/* Toggle lives in the topbar (AdminTopbar) so it stays reachable
              when the rail is collapsed and on mobile. */}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand text-[12px] font-bold text-white">
                P
              </span>
              {/* Stacked wordmark: the "Admin" line is what distinguishes this
                  from the storefront, so it rides with the name rather than
                  sitting elsewhere in the chrome. Both hide together on the
                  icon rail, leaving just the P. */}
              <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                <span className="truncate text-[13.5px] leading-tight font-bold tracking-tight">
                  PickWise
                </span>
                <span className="text-muted-foreground truncate text-[10.5px] leading-tight font-semibold tracking-[0.08em] uppercase">
                  Admin Portal
                </span>
              </span>
            </Link>
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
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/" />} tooltip="Back to site">
                <ArrowLeft />
                <span>Back to site</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <AdminTopbar />
        <div className="flex flex-1 flex-col gap-3 p-4">{children}</div>
        <Toaster position="top-right" />
      </SidebarInset>
    </SidebarProvider>
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
  const active = exact ? pathname === link.href : pathname.startsWith(link.href);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={link.href} />}
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
