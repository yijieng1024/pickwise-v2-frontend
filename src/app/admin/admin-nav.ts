import {
  Activity,
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

export interface NavLink {
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
 *
 * This is also what page breadcrumbs are built from (`adminCrumbsFor`), so a
 * group or label renamed here renames every trail with it. It lives in its own
 * module rather than in `admin-shell.tsx` because that file is `"use client"`,
 * and a plain value imported from a client module into a Server Component
 * arrives as a client-reference stub — the laptop create/edit pages are server
 * components.
 */
export const navGroups: Array<{ label: string; links: NavLink[]; exactFirst?: boolean }> = [
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
      // Not "Aggregate": aggregation is only the last of the three sections on
      // that page (Ingest → Process → Aggregate), so naming the nav entry after
      // it would clash with the section heading and hide the other two runs.
      { href: "/admin/reviews/pipeline", label: "Review Pipeline", icon: Workflow },
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
    // The root group is the one holding the dashboard, and the dashboard is
    // already the first crumb — repeating "Overview" under it says nothing.
    if (!match.groupHoldsRoot) {
      // Group labels stay plain text: /admin/catalog, /admin/benchmarks and
      // /admin/reviews are redirects into their first child, so linking one
      // would silently land somewhere other than what the crumb names.
      crumbs.push({ label: match.group });
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

/**
 * Longest matching href wins, so /admin/catalog/laptops/<id>/edit resolves to
 * Laptops rather than to whichever entry happens to be listed first.
 */
function findNavLink(pathname: string) {
  let best: { group: string; groupHoldsRoot: boolean; link: NavLink } | null = null;

  for (const group of navGroups) {
    const groupHoldsRoot = group.links.some((l) => l.href === DASHBOARD_HREF);
    for (const link of group.links) {
      const matches =
        link.href === DASHBOARD_HREF
          ? pathname === DASHBOARD_HREF
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
      if (matches && (!best || link.href.length > best.link.href.length)) {
        best = { group: group.label, groupHoldsRoot, link };
      }
    }
  }

  return best;
}
