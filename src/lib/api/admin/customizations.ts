import { apiFetch } from "@/lib/api/client";

/** Mirrors the backend's `CustomizationRead` schema. */
export interface Customization {
  id: string;
  laptop_id: string;
  category_id: string;
  option_name: string;
  price_add_rm: number;
  dependency_note: string | null;
}

export interface CustomizationUpdateInput {
  category_id?: string;
  option_name?: string;
  price_add_rm?: number;
  dependency_note?: string | null;
}

export function listCustomizationsByLaptop(
  token: string,
  laptopId: string,
): Promise<Customization[]> {
  return apiFetch<Customization[]>(`/customizations/laptop/${laptopId}`, {
    token,
    next: { revalidate: 0 },
  });
}

/** One row per laptop that has at least one customization, most options first. */
export interface LaptopCustomizationSummary {
  laptop_id: string;
  /** Joined server-side, so the picker labels rows without a call per row. */
  product_name: string;
  model_code: string;
  customization_count: number;
}

export interface CustomizationCreateInput {
  category_id: string;
  option_name: string;
  price_add_rm: number;
  dependency_note?: string | null;
}

/** Adds the same option to every laptop in `laptopIds`. */
export function createCustomizations(
  token: string,
  laptopIds: string[],
  input: CustomizationCreateInput,
): Promise<Customization[]> {
  return apiFetch<Customization[]>("/customizations/", {
    method: "POST",
    token,
    body: JSON.stringify({ laptop_ids: laptopIds, ...input }),
    next: { revalidate: 0 },
  });
}

/**
 * Adds the same option to every laptop whose `model_code` contains
 * `targetPattern`. Blind and irreversible — preview the matches before
 * calling this, because there is no undo.
 */
export function createCustomizationsByPattern(
  token: string,
  targetPattern: string,
  input: CustomizationCreateInput,
): Promise<Customization[]> {
  return apiFetch<Customization[]>("/customizations/bulk-by-pattern", {
    method: "POST",
    token,
    body: JSON.stringify({ target_pattern: targetPattern, ...input }),
    next: { revalidate: 0 },
  });
}

export function listLaptopsWithCustomizations(
  token: string,
): Promise<LaptopCustomizationSummary[]> {
  return apiFetch<LaptopCustomizationSummary[]>("/customizations/laptops-summary", {
    token,
    next: { revalidate: 0 },
  });
}

export function updateCustomization(
  token: string,
  id: string,
  input: CustomizationUpdateInput,
): Promise<Customization> {
  return apiFetch<Customization>(`/customizations/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function deleteCustomization(
  token: string,
  id: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/customizations/${id}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}
