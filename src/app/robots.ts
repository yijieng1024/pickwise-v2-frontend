import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/indexing";

/**
 * Crawlers may read the public pages. Disallowed: the admin, the account page, the saved
 * list, and the two pages only reachable from an emailed link. Inactive laptop pages are
 * kept out by `noindex` on the page itself, not here: a page blocked in robots.txt can
 * still be listed by its URL, and its `noindex` would never be read.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/profile", "/saved", "/reset-password", "/verify-email"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
