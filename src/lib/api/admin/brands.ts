import { apiFetch } from "@/lib/api/client";
import type { BackendBrand } from "@/lib/api/types";

export type Brand = BackendBrand;

export interface BrandCreateInput {
  name: string;
  base_scrape_url: string;
  icons_url?: string | null;
  is_active?: boolean;
}

export interface BrandUpdateInput {
  name?: string;
  base_scrape_url?: string;
  icons_url?: string | null;
  is_active?: boolean;
}

export function listBrands(params: { isActive?: boolean } = {}): Promise<Brand[]> {
  const query = new URLSearchParams();
  if (params.isActive !== undefined) query.set("is_active", String(params.isActive));
  const qs = query.toString();
  return apiFetch<Brand[]>(`/brands${qs ? `?${qs}` : ""}`, {
    next: { revalidate: 0 },
  });
}

export function createBrand(token: string, input: BrandCreateInput): Promise<Brand> {
  return apiFetch<Brand>("/brands", {
    method: "POST",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function updateBrand(
  token: string,
  id: string,
  input: BrandUpdateInput,
): Promise<Brand> {
  return apiFetch<Brand>(`/brands/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function deleteBrand(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/brands/${id}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}
