import { apiFetch } from "@/lib/api/client";
import { mapBackendLaptop } from "@/lib/api/adapters";
import type { BackendBrand, BackendLaptop } from "@/lib/api/types";

import { LaptopsBrowse } from "./laptops-browse";

export default async function LaptopsPage() {
  const [rawLaptops, rawBrands] = await Promise.all([
    apiFetch<BackendLaptop[]>("/laptops/"),
    apiFetch<BackendBrand[]>("/brands"),
  ]);

  const brandsById = new Map(rawBrands.map((b) => [b.id, b]));
  const laptops = rawLaptops.map((raw) =>
    mapBackendLaptop(raw, brandsById.get(raw.brand_id)),
  );

  // Filter chips come from the brands the catalogue actually scrapes, not from
  // the rows on this page: a brand that is active but whose laptops haven't
  // been processed yet still deserves a chip. Inactive brands (Dell, HP) are
  // left out — they aren't being scraped, so their chip would never fill.
  const brandNames = rawBrands.filter((b) => b.is_active).map((b) => b.name);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <LaptopsBrowse laptops={laptops} brands={brandNames} />
    </main>
  );
}
