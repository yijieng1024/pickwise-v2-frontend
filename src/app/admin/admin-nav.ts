import {
  Activity,
  Cpu,
  FileStack,
  FileText,
  FolderTree,
  History,
  LayoutDashboard,
  Laptop,
  Layers,
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
 * Read top to bottom, the sidebar is the pipeline: source pages are queued and
 * scraped, raw records are cleaned into the catalog, the catalog is made
 * searchable and scorable, reviews are folded in beside it, the chatbot serves
 * that to customers, and monitoring is where you watch what happened. A laptop
 * that stops at Collect is invisible to customers; one that stops at Catalog is
 * invisible to the chatbot. That dependency is the mental model the portal has
 * to teach, so it is what the nav order says.
 *
 * ONE RULE DECIDES POSITION WITHIN A GROUP: reference data leads the stage that
 * consumes it. Brands leads Collect because the feed crawler reads each brand's
 * `base_scrape_url` and `is_active` decides whether it is crawled at all. Tags &
 * Taxonomy leads Catalog because the AI processor picks each laptop's tags from
 * the active `categories` rows, injected into its extraction prompt — a tag that
 * does not exist when the processor runs is a tag no laptop gets. Benchmarks
 * lead Rank & Search because PickScore reads the PassMark tables, and
 * `pick-scores/generate-all` is triggered from those two screens. Applying the
 * rule everywhere is what lets the order be read rather than memorised; before
 * it, taxonomy sat two groups below the processor that consumes it.
 *
 * Groups the pipeline ends at, rather than passes through, come last: Customers
 * (the questionnaire defines the survey whose answers personalize PickScore and
 * the agent, and Users is who answered it) and Monitoring (Jobs is the record of
 * every background run, Chatbot Monitoring of every agent turn). Neither
 * transforms catalog data, so neither sits among the stages that do.
 *
 * This is also what page breadcrumbs are built from (`adminCrumbsFor`), so a
 * group or label renamed here renames every trail with it — and a link label is
 * also the page's own `<h1>` (see "A screen's page title is its nav label"), so
 * renaming one here means renaming the `AdminPageHeader title` with it. It lives
 * in its own module rather than in `admin-shell.tsx` because that file is
 * `"use client"`, and a plain value imported from a client module into a Server
 * Component arrives as a client-reference stub — the laptop create/edit pages
 * are server components.
 */
export const navGroups: Array<{ label: string; links: NavLink[]; exactFirst?: boolean }> = [
  {
    label: "Overview",
    exactFirst: true,
    links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    // Stage 1 (find pages) and stage 2 (collect specs) read as one job to an
    // admin, so they share a group.
    label: "Collect",
    links: [
      { href: "/admin/catalog/brands", label: "Brands", icon: Tag },
      { href: "/admin/queue", label: "Scrape Queue", icon: ListOrdered },
      { href: "/admin/upload", label: "Acer Upload", icon: Upload },
      // The handoff artifact: what scraping produced and what the processor
      // reads next, so it closes this group rather than opening the next.
      { href: "/admin/pipeline", label: "Raw Records", icon: FileStack },
    ],
  },
  {
    // Stage 3 — raw records become real products. The run that produces the
    // rows sits directly above the rows themselves, and the two screens that
    // refine a row (its family, its upgrade options) sit directly below.
    label: "Catalog",
    links: [
      { href: "/admin/taxonomy", label: "Tags & Taxonomy", icon: FolderTree },
      { href: "/admin/processing", label: "AI Clean-up", icon: Wand2 },
      { href: "/admin/catalog/laptops", label: "Laptops", icon: Laptop },
      // Directly under Laptops: a family is a grouping OF catalog rows and is
      // only correctable once the rows exist. It feeds search deduplication,
      // but it is catalog data an admin curates rather than a run they trigger.
      { href: "/admin/catalog/families", label: "Families", icon: Layers },
      { href: "/admin/catalog/customizations", label: "Upgrade Options", icon: SlidersHorizontal },
    ],
  },
  {
    // Stage 4 — a catalog row's score is meaningless until the benchmarks it
    // reads exist, and the row itself is invisible to chat until it is embedded.
    label: "Rank & Search",
    links: [
      { href: "/admin/benchmarks/cpu", label: "CPU Benchmarks", icon: Cpu },
      { href: "/admin/benchmarks/gpu", label: "GPU Benchmarks", icon: Zap },
      { href: "/admin/embeddings", label: "Embeddings", icon: Sparkles },
    ],
  },
  {
    // Its own three-step flow, joining the pipeline late: the matcher matches
    // videos against the catalog, so this depends on Catalog above and feeds
    // the chatbot below.
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
    // Where the pipeline is consumed. The questionnaire defines the survey
    // whose answers become `laptop_user_preference` — which is what turns a
    // general PickScore into a personalized one and what the agent reads as
    // its defaults — so it belongs beside the people who answer it, not in a
    // settings drawer.
    label: "Customers",
    links: [
      { href: "/admin/questionnaire", label: "Questionnaire", icon: ListChecks },
      { href: "/admin/users", label: "Users", icon: Users },
    ],
  },
  {
    // Records of what ran, across every stage above. Jobs used to sit beside
    // the Dashboard, which put a log of finished work ahead of the work; both
    // of these answer "what happened", so they answer it together, at the end.
    label: "Monitoring",
    links: [
      { href: "/admin/jobs", label: "Jobs", icon: History },
      { href: "/admin/agent-monitoring", label: "Chatbot Monitoring", icon: Activity },
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
