import Link from "next/link";
import { Columns2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { apiFetch } from "@/lib/api/client";
import { hiResImageUrl } from "@/lib/api/image-urls";
import { getLaptopPickScores } from "@/lib/api/pickscore";
import type { BackendBrand, BackendLaptop } from "@/lib/api/types";
import {
  type CompareLaptop,
  bestFitSnapshot,
  buildCompareSections,
  parseCompareIds,
} from "@/lib/compare";

import { CompareView } from "./compare-view";

/**
 * Four categorical series. The first two are the documented radar pair and the
 * third the trend pair's second colour; the fourth is new and was checked with
 * the dataviz validator — all four pass the lightness, chroma, CVD and
 * normal-vision gates in both themes. Green sits at 2.8:1 on the light
 * surface, which is legal only because the chart carries a direct-labelled
 * legend rather than relying on colour alone.
 */
const SERIES_COLORS = ["#3b6db4", "#9333ea", "#c2571b", "#1baf7a"];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const { ids: rawIds } = await searchParams;
  const ids = parseCompareIds(rawIds);

  // Every laptop's spec sheet and its PickScore breakdown go out together —
  // one round trip's worth of latency for the whole comparison rather than one
  // per column. A row that fails (deleted laptop, malformed id, scores not
  // generated yet) resolves to null and is dropped instead of failing the page.
  const fetched = await Promise.all(
    ids.map((id) =>
      Promise.all([
        apiFetch<BackendLaptop>(`/laptops/${id}`, { next: { revalidate: 0 } }).catch(
          () => null,
        ),
        getLaptopPickScores(id).catch(() => null),
      ]),
    ),
  );

  const brandIds = [...new Set(fetched.map(([raw]) => raw?.brand_id).filter(Boolean))];
  const brands = new Map(
    (
      await Promise.all(
        brandIds.map((id) =>
          apiFetch<BackendBrand>(`/brands/${id}`).catch(() => null),
        ),
      )
    )
      .filter((brand): brand is BackendBrand => brand !== null)
      .map((brand) => [brand.id, brand]),
  );

  const laptops: CompareLaptop[] = fetched.flatMap(([raw, scores]) => {
    if (!raw) return [];
    return [
      {
        id: raw.id,
        name: raw.product_name,
        brand: brands.get(raw.brand_id)?.name ?? "Unknown",
        price: raw.price_rm > 0 ? `RM ${raw.price_rm.toLocaleString()}` : "Price not available",
        image: raw.image_urls[0] ? hiResImageUrl(raw.image_urls[0]) : null,
        raw,
        // Best-fit use case, the same baseline the details page's hero ring
        // uses. Signed-in users with wizard preferences get this replaced by
        // their personalized score client-side, exactly as that ring does.
        score: bestFitSnapshot(scores?.scores),
      },
    ];
  });

  if (laptops.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-24 sm:px-6">
        <Empty className="border-line bg-surface rounded-3xl border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Columns2 />
            </EmptyMedia>
            <EmptyTitle>Nothing to compare yet</EmptyTitle>
            <EmptyDescription>
              {ids.length > 0
                ? "Those laptops aren't in the catalog any more. Pick some current ones and try again."
                : "Tick the Compare box on up to four laptops while you browse, then bring them here side by side."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button shape="pill" render={<Link href="/laptops" />} nativeButton={false}>
              Browse laptops
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  return (
    <CompareView
      columns={laptops.map((laptop, i) => ({
        id: laptop.id,
        name: laptop.name,
        brand: laptop.brand,
        price: laptop.price,
        image: laptop.image,
        color: SERIES_COLORS[i],
        // Link that drops this column, so a comparison can be narrowed in place.
        removeIds: laptops.filter((other) => other.id !== laptop.id).map((other) => other.id),
      }))}
      sections={buildCompareSections(laptops)}
      // Everything score-driven — rings, radar, factor rows, the summary — is
      // derived in the view instead of here, because the personalized overlay
      // can replace these snapshots after the page has already rendered.
      scored={laptops.map(({ id, name, score }) => ({ id, name, score }))}
    />
  );
}
