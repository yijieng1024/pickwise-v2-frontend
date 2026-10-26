import {
  Activity,
  Bot,
  Coins,
  Cpu,
  Database,
  FileStack,
  FolderTree,
  Gauge,
  History,
  LayoutDashboard,
  Laptop,
  Layers,
  Link2,
  ListChecks,
  ListOrdered,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Tv,
  Upload,
  Users,
  Video,
  Wand2,
  Workflow,
  Zap,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType;
}

export interface NavGroup {
  /** Stable key — stored in the `admin_nav_group` cookie. */
  id: string;
  label: string;
  /** Shown on the group switcher, and alone on the collapsed icon rail. */
  icon: React.ComponentType;
  links: NavLink[];
}

/**
 * Always visible, above the group switcher: the screen you land on, and the
 * record of every background run — both are needed from any group.
 */
export const pinnedLinks: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/jobs", label: "Jobs", icon: History },
];

/**
 * The sidebar shows ONE group at a time, picked from a switcher; opening a page
 * from anywhere switches to its group (see admin-nav-group.tsx). Groups are
 * areas of work, ordered roughly as data moves: scraped and cleaned, curated
 * into the catalog, scored and made searchable, reviews folded in beside it,
 * then the people and the chatbot that use it.
 *
 * Page labels are Title Case (Capitalize Each Word), and a label is also the page's own `<h1>`
 * (see "A screen's page title is its nav label") — renaming one here means
 * renaming the `AdminPageHeader title` with it. Breadcrumbs are built from
 * this file too (`adminCrumbsFor`). It lives in its own module rather than in
 * `admin-shell.tsx` because that file is `"use client"`, and a plain value
 * imported from a client module into a Server Component arrives as a
 * client-reference stub — the laptop create/edit pages are server components.
 */
export const navGroups: NavGroup[] = [
  {
    id: "collect",
    label: "Data Collect",
    icon: Database,
    links: [
      { href: "/admin/catalog/brands", label: "Brands & Sources", icon: Tag },
      { href: "/admin/queue", label: "Scrape Queue", icon: ListOrdered },
      { href: "/admin/upload", label: "Acer Upload", icon: Upload },
      { href: "/admin/pipeline", label: "Raw Records", icon: FileStack },
      { href: "/admin/processing", label: "AI Clean-Up", icon: Wand2 },
      { href: "/admin/embeddings", label: "Embeddings", icon: Sparkles },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    icon: Laptop,
    links: [
      { href: "/admin/catalog/laptops", label: "Laptops", icon: Laptop },
      { href: "/admin/catalog/families", label: "Families", icon: Layers },
      { href: "/admin/catalog/customizations", label: "Upgrade Options", icon: SlidersHorizontal },
      { href: "/admin/taxonomy", label: "Types & Categories", icon: FolderTree },
    ],
  },
  {
    id: "scoring",
    label: "Scoring",
    icon: Gauge,
    links: [
      { href: "/admin/pickscore", label: "Pick Score", icon: Gauge },
      { href: "/admin/benchmarks/cpu", label: "CPU Benchmarks", icon: Cpu },
      { href: "/admin/benchmarks/gpu", label: "GPU Benchmarks", icon: Zap },
    ],
  },
  {
    id: "reviews",
    label: "Reviews",
    icon: Video,
    links: [
      { href: "/admin/reviews/pipeline", label: "Review Pipeline", icon: Workflow },
      { href: "/admin/reviews/channels", label: "Sources", icon: Tv },
      { href: "/admin/reviews/link", label: "Link Reviews", icon: Link2 },
    ],
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    links: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/questionnaire", label: "Questionnaire", icon: ListChecks },
    ],
  },
  {
    id: "system",
    label: "Pico & System",
    icon: Bot,
    links: [
      { href: "/admin/agent-monitoring", label: "Chatbot Monitoring", icon: Activity },
      { href: "/admin/llm-settings", label: "LLM Settings", icon: Settings2 },
      { href: "/admin/llm-usage", label: "Token Usage", icon: Coins },
    ],
  },
];

/** Cookie holding the last group chosen; read server-side in layout.tsx. */
export const NAV_GROUP_COOKIE = "admin_nav_group";

/** A cookie value is trusted only if it names a real group. */
export function navGroupById(id: string | undefined): NavGroup | null {
  return navGroups.find((g) => g.id === id) ?? null;
}

/** A crumb with no `href` is plain text — the current page, or a group that has no page. */
export interface AdminCrumb {
  label: string;
  href?: string;
}

const DASHBOARD_HREF = "/admin";

/**
 * The trail after the "Dashboard" root, derived from the sidebar so the words
 * in the breadcrumb are the words the admin clicked to get here.
 *
 * `trail` is for levels below a nav entry — the laptop create/edit forms — that
 * the nav itself doesn't know about.
 */
export function adminCrumbsFor(pathname: string, trail: string[] = []): AdminCrumb[] {
  const match = findNavLink(pathname);
  const crumbs: AdminCrumb[] = [];

  if (match && match.link.href !== DASHBOARD_HREF) {
    // Pinned links have no group, and a group named like its page ("Users ›
    // Users") would repeat itself. Group labels stay plain text: they are not
    // pages, and /admin/catalog, /admin/benchmarks and /admin/reviews are
    // redirects, so linking one would land somewhere other than it names.
    if (match.group && match.group.label !== match.link.label) {
      crumbs.push({ label: match.group.label });
    }
    crumbs.push({
      label: match.link.label,
      href: pathname === match.link.href ? undefined : match.link.href,
    });
  }

  for (const label of trail) {
    crumbs.push({ label });
  }

  return crumbs;
}

/** The group holding the page at `pathname`, or null for pinned/unknown pages. */
export function groupFor(pathname: string): NavGroup | null {
  return findNavLink(pathname)?.group ?? null;
}

/**
 * Longest matching href wins, so /admin/catalog/laptops/<id>/edit resolves to
 * Laptops (and so to Catalog) rather than to whichever entry is listed first.
 */
function findNavLink(pathname: string) {
  let best: { group: NavGroup | null; link: NavLink } | null = null;
  const consider = (group: NavGroup | null, link: NavLink) => {
    const matches =
      link.href === DASHBOARD_HREF
        ? pathname === DASHBOARD_HREF
        : pathname === link.href || pathname.startsWith(`${link.href}/`);
    if (matches && (!best || link.href.length > best.link.href.length)) {
      best = { group, link };
    }
  };

  for (const link of pinnedLinks) consider(null, link);
  for (const group of navGroups) for (const link of group.links) consider(group, link);

  return best as { group: NavGroup | null; link: NavLink } | null;
}
