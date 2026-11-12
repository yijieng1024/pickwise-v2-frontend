/** The site's own public address (canonical, Open Graph, sitemap and robots URLs). Set
 *  NEXT_PUBLIC_SITE_URL on Vercel (Production and Preview); unset means local. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/**
 * Whether a laptop page of this status may be in search engines: in the sitemap, and
 * without `noindex`.
 *
 * - active: yes.
 * - discontinued: yes. A real machine people still search for; its page says it is no
 *   longer sold.
 * - inactive: no. Waiting for a price or delisted; the page still opens, with `noindex`.
 * - suspended: no. Hidden everywhere; the page is a 404.
 *
 * Anything else, a status this code does not know included, is no.
 */
export function mayIndex(status: string | null | undefined): boolean {
  return status === "active" || status === "discontinued";
}
