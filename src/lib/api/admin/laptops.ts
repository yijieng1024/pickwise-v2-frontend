import { apiFetch, apiFetchWithTotal } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";

export interface ListLaptopsParams {
  search?: string;
  /** Filters applied server-side, so `total` reflects them. */
  brandId?: string;
  ramGb?: number;
  storageType?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: "product_name" | "price_rm" | "created_at";
  sortDir?: "asc" | "desc";
  skip?: number;
  limit?: number;
}

/** Real server-side search/sort/pagination — total comes via X-Total-Count
 * (the endpoint deliberately kept a bare-array body; see apiFetchWithTotal). */
export function listLaptops(
  params: ListLaptopsParams = {},
): Promise<{ items: BackendLaptop[]; total: number }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.brandId) query.set("brand_id", params.brandId);
  if (params.ramGb !== undefined) query.set("ram_gb", String(params.ramGb));
  if (params.storageType) query.set("storage_type", params.storageType);
  if (params.priceMin !== undefined) query.set("price_min", String(params.priceMin));
  if (params.priceMax !== undefined) query.set("price_max", String(params.priceMax));
  if (params.sortBy) query.set("sort_by", params.sortBy);
  if (params.sortDir) query.set("sort_dir", params.sortDir);
  if (params.skip !== undefined) query.set("skip", String(params.skip));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  return apiFetchWithTotal<BackendLaptop[]>(`/laptops/?${query.toString()}`, {
    next: { revalidate: 0 },
  });
}

/** Mirrors the backend's `LaptopCreate`/`LaptopUpdate` schemas — the write side of `BackendLaptop`. */
export interface LaptopInput {
  // Part 1: Core Identifiers & Categorization
  brand_id: string;
  model_code: string;
  product_name: string;
  release_year?: number | null;
  price_rm: number;

  // Part 2: Processor & AI Engine
  processor_brand?: string | null;
  processor_model: string;
  processor_ghz?: string | null;
  cpu_cores?: number | null;
  cpu_threads?: number | null;
  npu_model?: string | null;
  npu_tops?: number | null;
  ai_ready?: boolean;
  ai_features?: string[];

  // Part 3: Graphics & Hardware Acceleration
  gpu_brand?: string | null;
  gpu_model: string;
  gpu_cores?: number | null;
  media_engine_details?: string | null;

  // Part 4: Memory & Storage
  ram_gb: number;
  ram_type?: string | null;
  ram_upgradable?: boolean;
  max_ram_gb?: number | null;
  ssd_gb: number;
  storage_type?: string | null;
  storage_upgradable?: boolean;
  expansion_slots_summary?: string | null;

  // Part 5: Display & External Video
  display_size_inch: number;
  display_resolution?: string | null;
  display_type?: string | null;
  display_refresh_rate_hz?: number | null;
  display_brightness_nits?: number | null;
  touchscreen?: boolean;
  external_display_support?: string | null;

  // Part 6: Build, Battery & Connectivity
  weight_kg: number;
  dimensions_cm?: string | null;
  battery_wh: number;
  power_supply_details?: string | null;
  os?: string | null;
  colors?: string[];
  ports_summary?: string[];
  wifi_standard?: string | null;
  bluetooth_version?: string | null;

  // Part 7: Peripherals, Input & Audio
  keyboard_touchpad_details?: string | null;
  audio_details?: string | null;
  camera_details?: string | null;
  facial_recognition?: boolean;
  fingerprint_reader?: boolean;

  // Part 8: Security, Certifications & Extras
  security_features?: string | null;
  materials_and_certifications?: string | null;
  microsoft_office_included?: boolean;
  bundled_accessories?: string | null;
  warranty_details?: string | null;

  // Part 9: RAG & LLM Embedding Block
  raw_specs?: Record<string, unknown>;
  image_urls?: string[];
}

export function createLaptop(token: string, input: LaptopInput): Promise<BackendLaptop> {
  return apiFetch<BackendLaptop>("/laptops/", {
    method: "POST",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function updateLaptop(
  token: string,
  id: string,
  input: Partial<LaptopInput>,
): Promise<BackendLaptop> {
  return apiFetch<BackendLaptop>(`/laptops/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function deleteLaptop(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/laptops/${id}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}
