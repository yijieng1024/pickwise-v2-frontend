/** Mirrors the backend's `LaptopRead` schema (GET /laptops/, GET /laptops/{id}). */
export interface BackendLaptop {
  id: string;
  brand_id: string;
  model_code: string;
  product_name: string;
  release_year: number | null;
  price_rm: number;
  processor_brand: string | null;
  processor_model: string;
  processor_ghz: string | null;
  cpu_cores: number | null;
  cpu_threads: number | null;
  npu_model: string | null;
  npu_tops: number | null;
  ai_ready: boolean;
  ai_features: string[];
  gpu_brand: string | null;
  gpu_model: string;
  gpu_cores: number | null;
  media_engine_details: string | null;
  ram_gb: number;
  ram_type: string | null;
  ram_upgradable: boolean;
  max_ram_gb: number | null;
  ssd_gb: number;
  storage_type: string | null;
  storage_upgradable: boolean;
  expansion_slots_summary: string | null;
  display_size_inch: number;
  display_resolution: string | null;
  display_type: string | null;
  display_refresh_rate_hz: number | null;
  display_brightness_nits: number | null;
  touchscreen: boolean;
  external_display_support: string | null;
  weight_kg: number;
  dimensions_cm: string | null;
  battery_wh: number;
  power_supply_details: string | null;
  os: string | null;
  colors: string[];
  ports_summary: string[];
  wifi_standard: string | null;
  bluetooth_version: string | null;
  keyboard_touchpad_details: string | null;
  audio_details: string | null;
  camera_details: string | null;
  facial_recognition: boolean;
  fingerprint_reader: boolean;
  security_features: string | null;
  materials_and_certifications: string | null;
  microsoft_office_included: boolean;
  bundled_accessories: string | null;
  warranty_details: string | null;
  image_urls: string[];
  created_at: string;
}

/** Mirrors the backend's `BrandRead` schema (GET /brands). */
export interface BackendBrand {
  id: string;
  name: string;
  base_scrape_url: string;
  icons_url: string | null;
  is_active: boolean;
  created_at: string;
}

/** Mirrors the backend's price-history entry (GET /laptops/{id}/price-history). */
export interface BackendPriceHistoryEntry {
  price_rm: number;
  recorded_at: string;
}
