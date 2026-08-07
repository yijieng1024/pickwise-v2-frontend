/**
 * Constants shared by the `/laptops` Server Component and its client controls.
 *
 * Deliberately NOT in `laptops-browse.tsx`: that file is `"use client"`, and
 * importing a plain value from a client module into a Server Component gives
 * you a client-reference stub rather than the value — `SORT_ORDERS.includes`
 * threw "is not a function" at request time. Only components survive that
 * boundary intact, so anything both sides need lives in a neutral module.
 */

export const SORT_ORDERS = ["reco", "asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Rows per request. Was the client-side render batch size; now a real page. */
export const PAGE_SIZE = 24;

export type ViewMode = "grid" | "list";
