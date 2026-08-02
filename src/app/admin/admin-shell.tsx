"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Cpu,
  FileText,
  FolderTree,
  Gauge,
  LayoutDashboard,
  Laptop,
  Laptop2,
  ListChecks,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Tv,
  Users,
  Video,
  Workflow,
  Zap,
} from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";

import { AdminTopbar } from "./admin-topbar";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType;
}

const overviewLink: NavLink = { href: "/admin", label: "Dashboard", icon: LayoutDashboard };

const operationsLinks: NavLink[] = [{ href: "/admin/users", label: "Users", icon: Users }];

const catalogLinks: NavLink[] = [
  { href: "/admin/catalog/laptops", label: "Laptops", icon: Laptop },
  { href: "/admin/catalog/brands", label: "Brands", icon: Tag },
  { href: "/admin/catalog/customizations", label: "Customizations", icon: SlidersHorizontal },
];

const pipelineLink: NavLink = { href: "/admin/pipeline", label: "Pipeline", icon: Workflow };

const reviewsLinks: NavLink[] = [
  { href: "/admin/reviews/channels", label: "Channels", icon: Tv },
  { href: "/admin/reviews/raw", label: "Raw reviews", icon: FileText },
  { href: "/admin/reviews/pipeline", label: "Pipeline", icon: Workflow },
];

const configLinks: NavLink[] = [
  { href: "/admin/taxonomy", label: "Taxonomy", icon: FolderTree },
  { href: "/admin/embeddings", label: "Embeddings", icon: Sparkles },
];

const benchmarksLinks: NavLink[] = [
  { href: "/admin/benchmarks/cpu", label: "CPU", icon: Cpu },
  { href: "/admin/benchmarks/gpu", label: "GPU", icon: Zap },
];

const monitoringLinks: NavLink[] = [
  { href: "/admin/agent-monitoring", label: "Agent", icon: Activity },
];

// Domains the backend already gates behind get_current_admin but this phase
// doesn't build a UI for yet — shown so the nav communicates the full future
// shape instead of just omitting them.
const comingSoonLinks = [{ label: "Questionnaire", icon: ListChecks }];

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

  // Auto-expand the Catalog group when navigating into it; otherwise leave
  // the open state to the user's own toggling — the "adjust state during
  // render" pattern, not an effect (see laptops-browse.tsx).
  const isCatalogPath = pathname.startsWith("/admin/catalog");
  const [catalogOpen, setCatalogOpen] = useState(isCatalogPath);
  const [prevIsCatalogPath, setPrevIsCatalogPath] = useState(isCatalogPath);
  if (isCatalogPath !== prevIsCatalogPath) {
    setPrevIsCatalogPath(isCatalogPath);
    if (isCatalogPath) setCatalogOpen(true);
  }

  const isBenchmarksPath = pathname.startsWith("/admin/benchmarks");
  const [benchmarksOpen, setBenchmarksOpen] = useState(isBenchmarksPath);
  const [prevIsBenchmarksPath, setPrevIsBenchmarksPath] = useState(isBenchmarksPath);
  if (isBenchmarksPath !== prevIsBenchmarksPath) {
    setPrevIsBenchmarksPath(isBenchmarksPath);
    if (isBenchmarksPath) setBenchmarksOpen(true);
  }

  const isReviewsPath = pathname.startsWith("/admin/reviews");
  const [reviewsOpen, setReviewsOpen] = useState(isReviewsPath);
  const [prevIsReviewsPath, setPrevIsReviewsPath] = useState(isReviewsPath);
  if (isReviewsPath !== prevIsReviewsPath) {
    setPrevIsReviewsPath(isReviewsPath);
    if (isReviewsPath) setReviewsOpen(true);
  }

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <Loader2 className="h-6 w-6 text-muted-foreground motion-safe:animate-spin" />
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
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand text-[12px] font-bold text-white">
                P
              </span>
              <span className="truncate text-[13.5px] font-bold tracking-tight group-data-[collapsible=icon]:hidden">
                PickWise
              </span>
            </Link>
            <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem link={overviewLink} pathname={pathname} exact />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {operationsLinks.map((link) => (
                  <NavItem key={link.href} link={link} pathname={pathname} />
                ))}

                <Collapsible open={catalogOpen} onOpenChange={setCatalogOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          className="group data-active:bg-brand-tint data-active:font-semibold data-active:text-brand"
                          isActive={isCatalogPath}
                        >
                          <Laptop2 />
                          <span>Catalog</span>
                          <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[panel-open]:rotate-90" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {catalogLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <SidebarMenuSubItem key={link.href}>
                              <SidebarMenuSubButton
                                render={<Link href={link.href} />}
                                isActive={pathname === link.href}
                                className="data-active:bg-brand-tint data-active:font-semibold data-active:text-brand"
                              >
                                <Icon />
                                <span>{link.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                <NavItem link={pipelineLink} pathname={pathname} />

                <Collapsible open={reviewsOpen} onOpenChange={setReviewsOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          className="group data-active:bg-brand-tint data-active:font-semibold data-active:text-brand"
                          isActive={isReviewsPath}
                        >
                          <Video />
                          <span>Reviews</span>
                          <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[panel-open]:rotate-90" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {reviewsLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <SidebarMenuSubItem key={link.href}>
                              <SidebarMenuSubButton
                                render={<Link href={link.href} />}
                                isActive={pathname === link.href}
                                className="data-active:bg-brand-tint data-active:font-semibold data-active:text-brand"
                              >
                                <Icon />
                                <span>{link.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Configuration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configLinks.map((link) => (
                  <NavItem key={link.href} link={link} pathname={pathname} />
                ))}

                <Collapsible open={benchmarksOpen} onOpenChange={setBenchmarksOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          className="group data-active:bg-brand-tint data-active:font-semibold data-active:text-brand"
                          isActive={isBenchmarksPath}
                        >
                          <Gauge />
                          <span>Benchmarks</span>
                          <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[panel-open]:rotate-90" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {benchmarksLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <SidebarMenuSubItem key={link.href}>
                              <SidebarMenuSubButton
                                render={<Link href={link.href} />}
                                isActive={pathname === link.href}
                                className="data-active:bg-brand-tint data-active:font-semibold data-active:text-brand"
                              >
                                <Icon />
                                <span>{link.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Monitoring</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {monitoringLinks.map((link) => (
                  <NavItem key={link.href} link={link} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Coming soon</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {comingSoonLinks.map(({ label, icon: Icon }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      render={<span />}
                      tooltip={`${label} — not built yet`}
                      className="cursor-default text-muted-foreground/60 hover:bg-transparent hover:text-muted-foreground/60"
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
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
