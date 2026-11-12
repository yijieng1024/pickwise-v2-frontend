import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bot,
  ChevronLeft,
  Columns2,
  ExternalLink,
  Sparkles,
  TrendingDown,
} from "lucide-react";

import { PriceHistory } from "@/components/charts/price-history";
import {
  ConfiguredFullSpecs,
  ConfiguredQuickFacts,
  ConfiguredShareButton,
  ConfiguredTitle,
} from "@/components/configurator/configured-specs";
import { LaptopGallery } from "@/components/laptop-gallery";
import { ConfiguratorProvider } from "@/components/configurator/configurator-context";
import { ConfiguratorDialog } from "@/components/configurator/configurator-dialog";
import {
  ConfigNotice,
  ConfiguratorControls,
  ConfiguredPickScoreCard,
  ConfiguredPrice,
  ConfiguredRing,
  OriginalOnly,
} from "@/components/configurator/configured-hero";
import { ReviewSentiment } from "@/components/review-sentiment";
import { SaveButton } from "@/components/save-button";
import { compareHref } from "@/lib/compare";
import { apiFetch } from "@/lib/api/client";
import { mapBackendLaptop, priceLabel } from "@/lib/api/adapters";
import { DiscontinuedLabel } from "@/components/discontinued-label";
import { bestFit, getLaptopPickScores, labelForUseCase } from "@/lib/api/pickscore";
import { configuredLaptop } from "@/lib/api/options";
import { getLaptopReviews } from "@/lib/api/reviews";
import type { BackendBrand, BackendPriceHistoryEntry } from "@/lib/api/types";
import { mayIndex } from "@/lib/indexing";
import { laptopMeta } from "@/lib/laptop-meta";
import { cn, formatDate } from "@/lib/utils";

import { getConfigLink, getLaptop, getOptions, queryOf } from "./data";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * The page's own title, description and canonical. The canonical is always the plain
 * /laptops/{id}: a configuration is not indexed, whatever params the link carries. On a
 * link with a valid configuration the title and description are the configured
 * machine's (the name the heading and the share title use, the official build-to-order
 * total); with invalid params they are the standard laptop's. Never the Education price.
 * Shares the page's own fetches (./data), and never throws: a laptop that is not there
 * gets the site's default title and the not-found page.
 */
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const raw = await getLaptop(id);
    if (!raw) return {};
    const [options, link] = await Promise.all([
      getOptions(id, raw.model_code),
      getConfigLink(id, raw.model_code, queryOf(await searchParams)),
    ]);
    const applied = options && link.applied;
    const shown = applied ? configuredLaptop(raw, options, applied.result, applied.picks) : raw;
    const { title, description } = laptopMeta({
      name: shown.product_name,
      processor: shown.processor_model,
      gpu: shown.gpu_model,
      ramGb: shown.ram_gb,
      ssdGb: shown.ssd_gb,
      displayInch: shown.display_size_inch,
      weightKg: shown.weight_kg,
      // A laptop no longer sold has no current price to state.
      priceRm: applied ? applied.result.total_rm : raw.status === "discontinued" ? null : raw.price_rm,
      configured: Boolean(applied),
    });
    const canonical = `/laptops/${id}`;
    const image = raw.image_urls[0];
    return {
      title,
      description,
      alternates: { canonical },
      // An inactive laptop's page still opens, but stays out of search engines; its links
      // may be followed. Active and discontinued pages are indexed (lib/indexing.ts).
      ...(mayIndex(raw.status) ? {} : { robots: { index: false, follow: true } }),
      openGraph: { title, description, url: canonical, ...(image ? { images: [image] } : {}) },
    };
  } catch {
    return {}; // the page itself reports the error; metadata must not be what breaks
  }
}

export default async function LaptopDetailsPage({ params, searchParams }: PageProps) {
  const { id } = await params;

  // 404 and 422 both mean "no laptop here" (./data).
  const raw = await getLaptop(id);
  if (!raw) notFound();

  const [brand, rawHistory, pickScores, reviews, options, link] = await Promise.all([
    apiFetch<BackendBrand>(`/brands/${raw.brand_id}`),
    apiFetch<BackendPriceHistoryEntry[]>(`/laptops/${id}/price-history`, {
      next: { revalidate: 0 },
    }),
    // Best-effort: scores may not be generated yet — the tile just hides.
    getLaptopPickScores(id).catch(() => null),
    // A failure must not take the page down; null renders an honest error
    // state in the reviews section (never placeholder points).
    getLaptopReviews(id).catch(() => null),
    getOptions(id, raw.model_code),
    // A link with a configuration opens on that configuration, priced on the server.
    getConfigLink(id, raw.model_code, queryOf(await searchParams)),
  ]);

  const laptop = mapBackendLaptop(raw, brand);

  const priceHistorySorted = [...rawHistory].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );
  const priceHistoryLabels = priceHistorySorted.map((h) => formatDate(h.recorded_at));
  const priceHistoryPrices = priceHistorySorted.map((h) => h.price_rm);
  const priceHistoryDates = priceHistorySorted.map((h) => h.recorded_at);
  // priceValue of 0 means "price not available", not a genuine drop to zero.
  const priceDrop =
    priceHistorySorted.length > 0 && laptop.priceValue > 0
      ? priceHistorySorted[0].price_rm - laptop.priceValue
      : 0;

  const images = raw.image_urls.length > 0 ? raw.image_urls : [laptop.image];

  const priceCheckedLabel = raw.price_checked_at ? formatDate(raw.price_checked_at) : null;
  // ADR-0009 Amendment II: no longer sold, so no current price; RM 0 is never shown.
  const discontinued = raw.status === "discontinued";
  const lastOfficial = priceLabel(raw);
  // Colours sampled from each site's own logo files (2026-10-25): Shopee's
  // favicon #EE4D2D, Lazada's wordmark #0F146D. White on Lazada navy is
  // 15.66:1. White on Shopee orange is 3.66:1, below WCAG AA's 4.5:1 for
  // text this size -- a deliberate choice to match Shopee's own buttons.
  const marketplaceLinks = [
    { label: "Search on Shopee", href: raw.shopee_search_url, className: "bg-[#ee4d2d] text-white" },
    { label: "Search on Lazada", href: raw.lazada_search_url, className: "bg-[#0f146d] text-white" },
  ].filter((l): l is { label: string; href: string; className: string } => Boolean(l.href));

  // Hero summary data: best-fit use case (highest general-mode score, never
  // Gaming on macOS — also the hero ring's fallback until the personal score
  // resolves) and the quick-facts grid built from the raw spec sheet.
  const best = bestFit(pickScores?.scores, raw.os);


  return (
    <ConfiguratorProvider key={laptop.id} laptopId={laptop.id} options={options} link={link}>
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-24 sm:px-6 lg:px-8">
      <ConfiguratorDialog productName={laptop.name} />
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/laptops"
          className="text-brand-text flex items-center gap-2 font-medium hover:underline"
        >
          <ChevronLeft className="size-4" /> Back to Browse
        </Link>
        {/* gap-3 between the labelled action and the icon cluster, gap-1 inside
            the cluster — the portal-wide button spacing scale. */}
        <div className="flex items-center gap-3 text-muted-foreground">
          {/* Opens the comparison with this laptop already in it; the compare
              page's own "Add another laptop" carries on from there. Not a
              second CTA — purchase intent still resolves to Pico below. */}
          {/* <Button
            variant="soft"
            size="sm"
            shape="pill"
            render={<Link href={compareHref([laptop.id])} />}
            nativeButton={false}
          >
            <Columns2 data-icon="inline-start" />
            Compare
          </Button> */}
          <span className="flex items-center gap-1">
            <ConfiguredShareButton raw={raw} name={laptop.name} />
            <SaveButton laptopId={laptop.id} />
          </span>
        </div>
      </div>

      {/* Hero: gallery + summary */}
      <div className="mb-16 grid grid-cols-1 gap-6 motion-safe:animate-fade-in-up lg:grid-cols-[1.15fr_1fr]">
        <LaptopGallery images={images} name={laptop.name} />

        <div className="border-line bg-surface flex flex-col justify-between gap-5 rounded-3xl border p-8">
          {/* Title + PickScore at a glance */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {laptop.tags[0] && (
                  <span className="bg-brand-tint text-brand-text rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-wide uppercase">
                    {laptop.tags[0]}
                  </span>
                )}
                {best && (
                  <span className="bg-brand-tint text-brand-text flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold">
                    <Sparkles className="text-spark size-3" />
                    Best fit: {labelForUseCase(best.use_case)}
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl leading-tight font-bold tracking-tight">
                <ConfiguredTitle raw={raw} name={laptop.name} />
              </h1>
            </div>
            {/* Rendered without stored scores too: a configuration scores live. */}
            <ConfiguredRing laptopId={laptop.id} fallbackScore={best?.score ?? null} os={raw.os} />
          </div>

          {/* Quick facts */}
          <ConfiguredQuickFacts raw={raw} />

          {/* Price + CTAs as one bottom block */}
          <div className="flex flex-col gap-4">
            <ConfigNotice />
            <ConfiguratorControls />
            <ConfiguredPrice original={discontinued ? (
              <div className="flex flex-col gap-2">
                <DiscontinuedLabel />
                <span className="text-base font-medium">{lastOfficial}</span>
                <p className="text-xs text-muted-foreground">No longer sold by the maker.</p>
              </div>
            ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "tracking-tight tabular-nums",
                  laptop.priceValue > 0
                    ? "text-[26px] font-bold"
                    : "text-base font-medium text-muted-foreground italic",
                )}
              >
                {laptop.price}
              </span>
              {priceDrop > 0 && (
                <span className="text-positive bg-positive/10 flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
                  <TrendingDown className="size-3" /> RM{" "}
                  {priceDrop.toLocaleString()} below launch
                </span>
              )}
            </div>
            )} />

            {((!discontinued && laptop.priceValue > 0) || marketplaceLinks.length > 0) && (
              <div className="-mt-2 flex flex-col gap-2.5">
                {!discontinued && laptop.priceValue > 0 && (
                  <OriginalOnly>
                  <p className="text-xs text-muted-foreground">
                    {priceCheckedLabel && (
                      <span className="block">Last checked: {priceCheckedLabel}</span>
                    )}
                    Official price. Marketplaces may be cheaper.
                  </p>
                  </OriginalOnly>
                )}
                {marketplaceLinks.length > 0 && (
                  <>
                    {/* Two equal columns spanning the Ask Pico button's width;
                        identical boxes, only the brand colours differ. h-10
                        keeps them below Ask Pico's ~48px. Stacked below 460px, where
                        a half-width column is narrower than the label. */}
                    <div className="grid grid-cols-1 gap-2 min-[460px]:grid-cols-2">
                      {marketplaceLinks.map(({ label, href, className }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold whitespace-nowrap transition hover:opacity-90",
                            className,
                          )}
                        >
                          {label}
                          <ExternalLink className="size-3.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Search results may include other configurations. Check the
                      specs before buying.
                    </p>
                  </>
                )}
              </div>
            )}

            <Link
              href="/chat"
              className="bg-brand flex items-center justify-center gap-2 rounded-full py-3.5 text-[13.5px] font-semibold text-white transition hover:opacity-90"
            >
              <Bot className="size-4" /> Ask Pico about this laptop
            </Link>
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
        {/* PickScore per use case (the original hides until scores are generated;
            a configuration's live scores show either way) */}
        <ConfiguredPickScoreCard
          laptopId={laptop.id}
          scores={pickScores?.scores ?? []}
          benchmarksRefreshedAt={pickScores?.benchmarks_refreshed_at}
          os={raw.os}
        />

        {/* Full specs */}
        <ConfiguredFullSpecs raw={raw} />

        {/* YouTube reviewer strengths / weaknesses (always shown: "No reviews yet" when empty) */}
        <ReviewSentiment reviews={reviews} />

        {/* Price history */}
        <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Price History
            </h2>
            {priceDrop > 0 && (
              <span className="text-positive text-xs font-semibold">
                ↓ RM {priceDrop.toLocaleString()} below launch price
              </span>
            )}
          </div>
          <div className="mb-3 flex items-end gap-3">
            <span
              className={cn(
                "tracking-tight tabular-nums",
                laptop.priceValue > 0
                  ? "text-3xl font-bold"
                  : "text-lg font-medium text-muted-foreground italic",
              )}
            >
              {laptop.price}
            </span>
            {priceDrop > 0 && (
              <span className="text-positive mb-1 flex items-center gap-1 rounded-md bg-positive/10 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
                <TrendingDown className="size-3" /> Great deal
              </span>
            )}
          </div>
          {priceHistoryPrices.length >= 2 ? (
            <PriceHistory
              months={priceHistoryLabels}
              dates={priceHistoryDates}
              series={[
                { name: `${laptop.brand} (RM)`, prices: priceHistoryPrices },
              ]}
            />
          ) : priceHistoryPrices.length === 1 ? (
            // A single record is one data point — a lone dot with an
            // unreliable hover tooltip. State it plainly instead; the chart
            // (and its tooltips) appears once there's a second price to plot.
            <p className="text-sm text-muted-foreground">
              No price changes yet — first recorded on{" "}
              {formatDate(priceHistoryDates[0])}
              .
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No price history recorded yet.
            </p>
          )}
        </section>
      </div>
    </main>
    </ConfiguratorProvider>
  );
}
