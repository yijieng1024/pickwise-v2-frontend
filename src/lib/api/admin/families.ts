import { apiFetch } from "@/lib/api/client";

/**
 * A family is a COARSE product line — the granularity the manufacturer
 * segments its own catalog by, not a configuration or a chassis code. Apple
 * has three (MacBook Air covers 13 and 15; MacBook Pro covers 14 and 16;
 * MacBook Neo), and every ROG Strix is one family.
 *
 * The backend seeds families automatically from product names, and that seed
 * splits FINER than a product line — so the admin's job here is mostly
 * merging: move members into the family that should hold them, then delete the
 * emptied one. `is_verified` is the record that a human has looked.
 */

/** Mirrors the backend's `FamilyRead` schema. */
export interface Family {
  id: string;
  brand_id: string;
  brand_name: string;
  name: string;
  /**
   * The auto-grouping seed this family was created from. Provenance only — it
   * is not unique and goes stale as soon as a merge folds a second seed into
   * the family, so never key anything off it.
   */
  family_key: string | null;
  is_verified: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

/** Mirrors `FamilyMember` — the trimmed laptop shape family screens render. */
export interface FamilyMember {
  laptop_id: string;
  product_name: string;
  model_code: string;
  price_rm: number;
  status: string;
  seed_key: string;
}

export interface FamilyDetail extends Family {
  laptops: FamilyMember[];
}

export interface UnassignedLaptop {
  laptop_id: string;
  brand_id: string;
  brand_name: string;
  product_name: string;
  model_code: string;
  price_rm: number;
  seed_key: string;
  /** How many other unassigned laptops share this seed key. */
  seed_key_siblings: number;
}

export interface UnassignedSummary {
  /** The true backlog size — `laptops` is capped by the request's limit. */
  count: number;
  laptops: UnassignedLaptop[];
}

export interface RegroupResult {
  families_created: number;
  laptops_assigned: number;
  /** Seed keys that already straddle two families — the backend refuses to
   * pick a side, so these stay in the backlog for a human to place. */
  left_null: number;
}

export interface FamilyCreateInput {
  brand_id: string;
  name: string;
  is_verified?: boolean;
}

export interface FamilyUpdateInput {
  brand_id?: string;
  name?: string;
  is_verified?: boolean;
}

export function listFamilies(
  params: { brandId?: string; isVerified?: boolean } = {},
): Promise<Family[]> {
  const query = new URLSearchParams();
  if (params.brandId) query.set("brand_id", params.brandId);
  if (params.isVerified !== undefined) query.set("is_verified", String(params.isVerified));
  const qs = query.toString();
  return apiFetch<Family[]>(`/families${qs ? `?${qs}` : ""}`, {
    next: { revalidate: 0 },
  });
}

export function getFamily(id: string): Promise<FamilyDetail> {
  return apiFetch<FamilyDetail>(`/families/${id}`, { next: { revalidate: 0 } });
}

/** The null-family backlog. `count` is authoritative; the list is capped. */
export function listUnassigned(limit = 200): Promise<UnassignedSummary> {
  return apiFetch<UnassignedSummary>(`/families/unassigned?limit=${limit}`, {
    next: { revalidate: 0 },
  });
}

export function createFamily(token: string, input: FamilyCreateInput): Promise<Family> {
  return apiFetch<Family>("/families", {
    method: "POST",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

/** PATCH, not PUT — omitted fields are left alone. */
export function updateFamily(
  token: string,
  id: string,
  input: FamilyUpdateInput,
): Promise<Family> {
  return apiFetch<Family>(`/families/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

/** Deletes the family and releases its members to unassigned. Never deletes
 * a laptop — this is the second half of a merge. */
export function deleteFamily(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/families/${id}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}

/** Move laptops into this family, from wherever they were. Unknown ids 404
 * before anything is written, so a bad id can't half-apply a merge. */
export function addLaptopsToFamily(
  token: string,
  id: string,
  laptopIds: string[],
): Promise<FamilyDetail> {
  return apiFetch<FamilyDetail>(`/families/${id}/laptops`, {
    method: "POST",
    token,
    body: JSON.stringify({ laptop_ids: laptopIds }),
    next: { revalidate: 0 },
  });
}

/** Release one laptop back to unassigned. The laptop stays in the catalog. */
export function removeLaptopFromFamily(
  token: string,
  id: string,
  laptopId: string,
): Promise<void> {
  return apiFetch<void>(`/families/${id}/laptops/${laptopId}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}

/** Auto-group the unassigned laptops. Runs over null `family_id` rows only, so
 * it is safe to re-run and cannot undo a merge. */
export function regroupFamilies(token: string): Promise<RegroupResult> {
  return apiFetch<RegroupResult>("/families/regroup", {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}
