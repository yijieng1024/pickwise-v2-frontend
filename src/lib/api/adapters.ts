import type { Laptop } from "@/lib/laptops";
import type { BackendBrand, BackendLaptop } from "@/lib/api/types";

/** Used only when a laptop has no image_urls — doesn't happen in current live data, but the field isn't guaranteed. */
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600";

/**
 * Maps the backend's raw spec-sheet `LaptopRead` onto the frontend's `Laptop` shape.
 *
 * Several `Laptop` fields (score, radar, xaiFactors, match, sentiment, benchmarks, badge, tags,
 * plainEnglish) have no backend source yet — see the "Backend integration decisions" memory.
 * They're filled with empty/neutral placeholders here, which is only safe for call sites that
 * don't render them (e.g. the /laptops browse page uses showScore={false}). Do not reuse this
 * adapter for a view that renders those fields without revisiting the placeholders first.
 */
export function mapBackendLaptop(
  raw: BackendLaptop,
  brand: BackendBrand | undefined,
): Laptop {
  return {
    id: raw.id,
    slug: raw.model_code,
    name: raw.product_name,
    brand: brand?.name ?? "Unknown",
    price: raw.price_rm > 0 ? `RM ${raw.price_rm.toLocaleString()}` : "Price not available",
    priceValue: raw.price_rm,
    score: 0,
    image: raw.image_urls[0] ?? FALLBACK_IMAGE,
    badge: "",
    badgeClass: "",
    specs: {
      cpu: raw.processor_model,
      ram: `${raw.ram_gb}GB`,
      display: `${raw.display_size_inch}"`,
      gpu: raw.gpu_model,
    },
    tags: [],
    plainEnglish: [],
    radar: [0, 0, 0, 0, 0, 0],
    xaiFactors: [],
    match: "",
    sentiment: { summary: "", reviews: [] },
  };
}
