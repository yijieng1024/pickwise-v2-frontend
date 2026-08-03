import type { LaptopInput } from "@/lib/api/admin/laptops";

export type FieldType = "text" | "number" | "boolean" | "stringlist" | "textarea";

export interface FieldDef {
  key: Exclude<keyof LaptopInput, "brand_id">;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
}

export interface FieldGroup {
  title: string;
  fields: FieldDef[];
}

/** Mirrors the 9-part spec in the backend's `LaptopBase` (app/laptops/laptop_models.py). */
export const LAPTOP_FORM_GROUPS: FieldGroup[] = [
  {
    title: "Core identifiers & categorization",
    fields: [
      { key: "model_code", label: "Model code", type: "text", required: true },
      { key: "product_name", label: "Product name", type: "text", required: true },
      { key: "release_year", label: "Release year", type: "number" },
      { key: "price_rm", label: "Price (RM)", type: "number", required: true },
    ],
  },
  {
    title: "Processor & AI engine",
    fields: [
      { key: "processor_brand", label: "Processor brand", type: "text" },
      { key: "processor_model", label: "Processor model", type: "text", required: true },
      { key: "processor_ghz", label: "Processor clock", type: "text", placeholder: "e.g. 3.2 GHz" },
      { key: "cpu_cores", label: "CPU cores", type: "number" },
      { key: "cpu_threads", label: "CPU threads", type: "number" },
      { key: "npu_model", label: "NPU model", type: "text" },
      { key: "npu_tops", label: "NPU TOPS", type: "number" },
      { key: "ai_ready", label: "AI-ready", type: "boolean" },
      { key: "ai_features", label: "AI features (one per line)", type: "stringlist" },
    ],
  },
  {
    title: "Graphics & hardware acceleration",
    fields: [
      { key: "gpu_brand", label: "GPU brand", type: "text" },
      { key: "gpu_model", label: "GPU model", type: "text", required: true },
      { key: "gpu_cores", label: "GPU cores", type: "number" },
      { key: "media_engine_details", label: "Media engine details", type: "text" },
    ],
  },
  {
    title: "Memory & storage",
    fields: [
      { key: "ram_gb", label: "RAM (GB)", type: "number", required: true },
      { key: "ram_type", label: "RAM type", type: "text", placeholder: "e.g. LPDDR5X" },
      { key: "ram_upgradable", label: "RAM upgradable", type: "boolean" },
      { key: "max_ram_gb", label: "Max RAM (GB)", type: "number" },
      { key: "ssd_gb", label: "SSD (GB)", type: "number", required: true },
      { key: "storage_type", label: "Storage type", type: "text", placeholder: "e.g. NVMe SSD" },
      { key: "storage_upgradable", label: "Storage upgradable", type: "boolean" },
      { key: "expansion_slots_summary", label: "Expansion slots", type: "text" },
    ],
  },
  {
    title: "Display & external video",
    fields: [
      { key: "display_size_inch", label: "Display size (in)", type: "number", required: true },
      { key: "display_resolution", label: "Resolution", type: "text", placeholder: "e.g. 2560x1600" },
      { key: "display_type", label: "Panel type", type: "text", placeholder: "e.g. OLED, IPS" },
      { key: "display_refresh_rate_hz", label: "Refresh rate (Hz)", type: "number" },
      { key: "display_brightness_nits", label: "Brightness (nits)", type: "number" },
      { key: "touchscreen", label: "Touchscreen", type: "boolean" },
      { key: "external_display_support", label: "External display support", type: "text" },
    ],
  },
  {
    title: "Build, battery & connectivity",
    fields: [
      { key: "weight_kg", label: "Weight (kg)", type: "number", required: true },
      { key: "dimensions_cm", label: "Dimensions (cm)", type: "text" },
      { key: "battery_wh", label: "Battery (Wh)", type: "number", required: true },
      { key: "power_supply_details", label: "Power supply details", type: "text" },
      { key: "os", label: "Operating system", type: "text" },
      { key: "colors", label: "Colors (one per line)", type: "stringlist" },
      { key: "ports_summary", label: "Ports (one per line)", type: "stringlist" },
      { key: "wifi_standard", label: "Wi-Fi standard", type: "text" },
      { key: "bluetooth_version", label: "Bluetooth version", type: "text" },
    ],
  },
  {
    title: "Peripherals, input & audio",
    fields: [
      { key: "keyboard_touchpad_details", label: "Keyboard/touchpad details", type: "text" },
      { key: "audio_details", label: "Audio details", type: "text" },
      { key: "camera_details", label: "Camera details", type: "text" },
      { key: "facial_recognition", label: "Facial recognition", type: "boolean" },
      { key: "fingerprint_reader", label: "Fingerprint reader", type: "boolean" },
    ],
  },
  {
    title: "Security, certifications & extras",
    fields: [
      { key: "security_features", label: "Security features", type: "text" },
      { key: "materials_and_certifications", label: "Materials & certifications", type: "text" },
      { key: "microsoft_office_included", label: "Microsoft Office included", type: "boolean" },
      { key: "bundled_accessories", label: "Bundled accessories", type: "text" },
      { key: "warranty_details", label: "Warranty details", type: "text" },
    ],
  },
  {
    title: "Raw specs & images",
    fields: [
      { key: "image_urls", label: "Image URLs (one per line)", type: "stringlist" },
      { key: "raw_specs", label: "Raw specs (JSON)", type: "textarea" },
    ],
  },
];
