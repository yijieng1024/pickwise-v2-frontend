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
 * Ordered as the data flows, not by domain, and deliberately flat.
 *
 * The four numbered groups are the pipeline stages from the backend's
 * `admin.md` §2, in the order each one feeds the next: pages are queued,
 * scraped into raw records, cleaned into the catalog, then made searchable
 * and rankable. A laptop that stops at stage 2 is invisible to customers; one
 * that stops at stage 3 is invisible to the chatbot. That dependency is the
 * mental model the portal has to teach, so it is what the nav order says.
 *
 * The unnumbered groups below the stages feed in from the side (reviews),
 * configure them (taxonomy, questionnaire), or sit outside the pipeline
 * entirely (users, monitoring).
 */
const navGroups: Array<{ label: string; links: NavLink[]; exactFirst?: boolean }> = [
  {
    label: "Overview",
    exactFirst: true,
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      // Background runs outlive the page that started them, so their history
      // is a destination rather than a panel on one screen.
      { href: "/admin/jobs", label: "Jobs", icon: History },
    ],
  },
  {
    // Stage 1 (find pages) and stage 2 (collect specs) read as one job to an
    // admin, so they share a group. Brands leads it: the feed crawler works
    // from each brand's base_scrape_url, and `is_active` decides whether the
    // brand is crawled at all — so it is the switch everything downstream
    // hangs off, not a catalog-editing screen.
    label: "Collect",
    links: [
      { href: "/admin/catalog/brands", label: "Brands", icon: Tag },
      { href: "/admin/queue", label: "Scrape Queue", icon: ListOrdered },
      { href: "/admin/upload", label: "Acer Upload", icon: Upload },
      { href: "/admin/pipeline", label: "Raw Records", icon: FileStack },
    ],
  },
  {
    // Stage 3 — the AI processor turns raw records into the real catalog, so
    // the run that produces the rows sits directly above the rows themselves.
    label: "Catalog",
    links: [
      { href: "/admin/processing", label: "AI Clean-up", icon: Wand2 },
      { href: "/admin/catalog/laptops", label: "Laptops", icon: Laptop },
      { href: "/admin/catalog/customizations", label: "Upgrade Options", icon: SlidersHorizontal },
    ],
  },
  {
    // Stage 4 — a catalog row is still invisible to chat until it is embedded,
    // and its score is meaningless until the benchmarks it reads exist. This
    // group was previously buried at the bottom under "Configuration", which
    // put the last pipeline stage after two things that aren't in the pipeline.
    label: "Rank & Search",
    links: [
      { href: "/admin/embeddings", label: "Embeddings", icon: Sparkles },
      { href: "/admin/benchmarks/cpu", label: "CPU Benchmarks", icon: Cpu },
      { href: "/admin/benchmarks/gpu", label: "GPU Benchmarks", icon: Zap },
    ],
  },
  {
    // Its own three-step flow, feeding the chatbot rather than the catalog.
    label: "Reviews",
    links: [
      { href: "/admin/reviews/channels", label: "Sources", icon: Tv },
      { href: "/admin/reviews/raw", label: "Match Queue", icon: FileText },
      { href: "/admin/reviews/pipeline", label: "Aggregate", icon: Workflow },
    ],
  },
  {
    // Reference data the stages above read — set once, revisited rarely.
    label: "Configuration",
    links: [
      { href: "/admin/taxonomy", label: "Tags & Taxonomy", icon: FolderTree },
      { href: "/admin/questionnaire", label: "Questionnaire", icon: ListChecks },
    ],
  },
  {
    label: "Administration",
    links: [
      { href: "/admin/agent-monitoring", label: "Chatbot Monitoring", icon: Activity },
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
            {/* Goes to the dashboard, not the storefront. A wordmark inside an
                app is expected to be "home within this app"; leaving the portal
                is the explicit "Back to site" action in the footer. */}
            <Link href="/admin" className="flex min-w-0 items-center gap-2">
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
