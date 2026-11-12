import type { MetadataRoute } from "next";

import { apiFetch } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";
import { SITE_URL, mayIndex } from "@/lib/indexing";

/** About a day: crawlers read the cached file, not the backend. */
const DAY = 86400;
export const revalidate = 86400;

/** The pages anyone can read without an account. Not the app's tools (chat, wizard,
 *  compare) and not the sign-in pages: those are neither listed here nor disallowed. */
const PUBLIC_PAGES = ["/", "/laptops", "/pickscore", "/why-pickwise", "/about", "/faq", "/privacy", "/terms"];

/** The statuses asked for; `mayIndex` is still what admits each row. */
const LISTED_STATUSES = ["active", "discontinued"];

/**
 * The public pages plus one entry per laptop that may be indexed (active or
 * discontinued), each the plain /laptops/{id}: a configuration URL is never listed, and
 * its canonical is this plain one anyway. No lastModified on laptops: the public list
 * gives no last-updated date (only created_at and price_checked_at).
 *
 * Never throws: if the backend does not answer, the sitemap is the public pages alone.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
  try {
    const lists = await Promise.all(
      LISTED_STATUSES.map((status) =>
        apiFetch<BackendLaptop[]>(`/laptops/?status=${status}`, { next: { revalidate: DAY } }),
      ),
    );
    const laptops = lists.flat().filter((laptop) => mayIndex(laptop.status));
    return [...pages, ...laptops.map((laptop) => ({ url: `${SITE_URL}/laptops/${laptop.id}` }))];
  } catch {
    return pages;
  }
}
