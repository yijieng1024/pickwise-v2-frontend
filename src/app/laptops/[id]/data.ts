import { cache } from "react";

import type { ConfigLinkState } from "@/components/configurator/configurator-context";
import { apiFetch, ApiError } from "@/lib/api/client";
import { configureLaptop, getLaptopOptions, type LaptopOptions } from "@/lib/api/options";
import type { BackendLaptopDetail } from "@/lib/api/types";
import { readConfigLink } from "@/lib/config-url";

/**
 * What both the details page and its generateMetadata read. Each is wrapped in React's
 * `cache`, so within one request the page and the metadata share one backend call per
 * laptop, options list and configuration instead of fetching twice.
 */

/** The laptop, or null when there is none here. */
export const getLaptop = cache(async (id: string): Promise<BackendLaptopDetail | null> => {
  try {
    // No caching: the price shown here (and the history below) must reflect
    // admin edits / scraper runs immediately — a stale 60s data-cache made
    // updated prices appear to "not show". Opting these fetches out of the
    // cache also makes the route dynamic, so the whole page stays current.
    return await apiFetch<BackendLaptopDetail>(`/laptops/${id}`, { next: { revalidate: 0 } });
  } catch (err) {
    // 404 = well-formed id, no such laptop. 422 = backend's UUID path-param
    // validation rejecting a malformed id (e.g. a stale non-UUID link).
    // Both mean "no laptop here" from the user's point of view.
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) return null;
    throw err;
  }
});

/** Apple build-to-order options (10c): only MacBook standard configs have them, and a
 *  failure only hides the Configure button. */
export const getOptions = cache(
  (id: string, modelCode: string | null | undefined): Promise<LaptopOptions | null> =>
    modelCode?.startsWith("apple-macbook-") ? getLaptopOptions(id).catch(() => null) : Promise.resolve(null),
);

/** A page's search params as one string, so `getConfigLink` has a value to cache on. */
export function queryOf(searchParams: { [key: string]: string | string[] | undefined }): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(searchParams)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) query.set(name, first);
  }
  return query.toString();
}

/**
 * A link with a configuration (?chip=…&memory=…&storage=…) opens on that configuration,
 * priced here so the first paint is already right. Which params are valid is decided
 * from the options list, never by asking /configure and reading its 422. The official
 * price only: the Edu price swaps in the browser, as on any other visit.
 */
export const getConfigLink = cache(
  async (id: string, modelCode: string | null | undefined, query: string): Promise<ConfigLinkState> => {
    const options = await getOptions(id, modelCode);
    const read = readConfigLink(id, new URLSearchParams(query), options);
    const link: ConfigLinkState = { applied: null, path: read.path, notice: read.notice };
    if (!read.picks) return link;
    try {
      return { ...link, applied: { picks: read.picks, result: await configureLaptop(id, read.picks) } };
    } catch {
      // The options list said yes and /configure did not answer: show the standard
      // config and leave the address alone, so a refresh can try again.
      return {
        applied: null,
        path: null,
        notice: "The configuration in this link could not be loaded, so the standard configuration is shown.",
      };
    }
  },
);
