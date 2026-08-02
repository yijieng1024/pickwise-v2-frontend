import { apiFetch } from "@/lib/api/client";

/** Mirrors the backend's `ProductTypeRead` schema. */
export interface ProductType {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface ProductTypeInput {
  name: string;
  is_active?: boolean;
}

/** Mirrors the backend's `CategoryRead` schema. */
export interface Category {
  id: string;
  name: string;
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CategoryInput {
  name: string;
  icon_url?: string | null;
  is_active?: boolean;
}

export function listProductTypes(): Promise<ProductType[]> {
  return apiFetch<ProductType[]>("/product-types", { next: { revalidate: 0 } });
}

export function createProductType(token: string, input: ProductTypeInput): Promise<ProductType> {
  return apiFetch<ProductType>("/product-types", {
    method: "POST",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function updateProductType(
  token: string,
  id: string,
  input: ProductTypeInput,
): Promise<ProductType> {
  return apiFetch<ProductType>(`/product-types/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function deleteProductType(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/product-types/${id}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}

export function listCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/categories", { next: { revalidate: 0 } });
}

export function createCategory(token: string, input: CategoryInput): Promise<Category> {
  return apiFetch<Category>("/categories", {
    method: "POST",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function updateCategory(
  token: string,
  id: string,
  input: CategoryInput,
): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function deleteCategory(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/categories/${id}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}
