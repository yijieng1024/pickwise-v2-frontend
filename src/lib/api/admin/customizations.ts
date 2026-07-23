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
