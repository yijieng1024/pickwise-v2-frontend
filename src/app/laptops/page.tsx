import { apiFetch } from "@/lib/api/client";
import { listLaptops } from "@/lib/api/admin/laptops";
import { mapBackendLaptop } from "@/lib/api/adapters";
import type { BackendBrand } from "@/lib/api/types";

import { PAGE_SIZE, SORT_ORDERS, type SortOrder } from "./browse-params";
import { LaptopsBrowse } from "./laptops-browse";

/**
 * Browse state lives in the URL, not in component state.
 *
 * The list used to fetch all ~250 laptops (~700 KB) and filter/sort/slice them
 * client-side, because `GET /laptops/` took no query params. It now takes
 * search, brand, price range, sort and pagination, so each view is one small
 * server-rendered request instead of the whole catalog.
 *
 * Keeping the state in `searchParams` rather than `useState` is what makes a
 * filtered view shareable and bookmarkable, keeps the back button meaningful,
 * and lets this stay a Server Component — the results are rendered on the
 * server for every query, not just the first paint.
 */
export default async function LaptopsPage({
  searchParams,
}: {
  // Next 16: a promise, must be awaited (see 01-app file-conventions/page).
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const one = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const query = one("q")?.trim() || "";
  const brandName = one("brand") || "All";
  const sort = (SORT_ORDERS.includes(one("sort") as SortOrder)
    ? one("sort")
    : "reco") as SortOrder;
  const view = one("view") === "list" ? "list" : "grid";
  const priceMin = numberOrUndefined(one("min"));
  const priceMax = numberOrUndefined(one("max"));
  const page = Math.max(1, Number(one("page")) || 1);

  const rawBrands = await apiFetch<BackendBrand[]>("/brands");
  const brandsById = new Map(rawBrands.map((b) => [b.id, b]));

  // Chips come from the active brands, not from the rows on this page — an
  // active brand whose laptops aren't processed yet still gets a chip.
  const activeBrands = rawBrands.filter((b) => b.is_active);
  // The URL carries a readable brand name; the API wants the id.
  const selectedBrand = activeBrands.find(
    (b) => b.name.toLowerCase() === brandName.toLowerCase(),
  );

  const { items, total } = await listLaptops({
    search: query || undefined,
    brandId: selectedBrand?.id,
    // GET /laptops/ is unfiltered by default — the admin catalog is the caller
    // that needs to see retired rows. The storefront has to ask for active
    // explicitly, or a laptop pulled from agent search still shows up here.
    status: "active",
    priceMin,
    priceMax,
    sortBy: sort === "reco" ? undefined : "price_rm",
    sortDir: sort === "asc" ? "asc" : sort === "desc" ? "desc" : undefined,
    skip: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  });

  const laptops = items.map((raw) => mapBackendLaptop(raw, brandsById.get(raw.brand_id)));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <LaptopsBrowse
        laptops={laptops}
        brands={activeBrands.map((b) => b.name)}
        total={total}
        page={page}
        query={query}
        brand={selectedBrand?.name ?? "All"}
        sort={sort}
        view={view}
        priceMin={priceMin}
        priceMax={priceMax}
      />
    </main>
  );
}

function numberOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
