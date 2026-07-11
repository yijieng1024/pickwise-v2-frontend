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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <LaptopsBrowse laptops={laptops} />
    </main>
  );
}
