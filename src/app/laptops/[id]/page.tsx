import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bot,
  ChevronLeft,
  Columns2,
  Cpu,
  ExternalLink,
  Feather,
  HardDrive,
  Monitor,
  RectangleEllipsis,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react";

import { PriceHistory } from "@/components/charts/price-history";
import { FullSpecs } from "@/components/full-specs";
import { LaptopGallery } from "@/components/laptop-gallery";
import { PersonalPickScoreRing } from "@/components/personal-pick-score-ring";
import { PickScoreCard } from "@/components/pick-score-card";
import { ReviewSentiment } from "@/components/review-sentiment";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { compareHref } from "@/lib/compare";
import { apiFetch, ApiError } from "@/lib/api/client";
import { mapBackendLaptop } from "@/lib/api/adapters";
import { bestFit, getLaptopPickScores, labelForUseCase } from "@/lib/api/pickscore";
import { getLaptopReviews } from "@/lib/api/reviews";
import type {
  BackendBrand,
  BackendLaptopDetail,
  BackendPriceHistoryEntry,
} from "@/lib/api/types";
import { cn, formatDate } from "@/lib/utils";

/** Validated single-series dataviz color (radar/price-history pair primary). */
const CHART_COLOR = "#3b6db4";

export default async function LaptopDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let raw: BackendLaptopDetail;
  try {
    // No caching: the price shown here (and the history below) must reflect
    // admin edits / scraper runs immediately — a stale 60s data-cache made
    // updated prices appear to "not show". Opting these fetches out of the
    // cache also makes the route dynamic, so the whole page stays current.
    raw = await apiFetch<BackendLaptopDetail>(`/laptops/${id}`, { next: { revalidate: 0 } });
  } catch (err) {
    // 404 = well-formed id, no such laptop. 422 = backend's UUID path-param
    // validation rejecting a malformed id (e.g. a stale non-UUID link).
    // Both mean "no laptop here" from the user's point of view.
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) {
      notFound();
    }
    throw err;
  }

  const [brand, rawHistory, pickScores, reviews] = await Promise.all([
    apiFetch<BackendBrand>(`/brands/${raw.brand_id}`),
    apiFetch<BackendPriceHistoryEntry[]>(`/laptops/${id}/price-history`, {
      next: { revalidate: 0 },
    }),
    // Best-effort: scores may not be generated yet — the tile just hides.
    getLaptopPickScores(id).catch(() => null),
    // A failure must not take the page down; null renders an honest error
    // state in the reviews section (never placeholder points).
    getLaptopReviews(id).catch(() => null),
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

  const storageLabel =
    raw.ssd_gb >= 1024
      ? `${(raw.ssd_gb / 1024).toLocaleString()}TB`
      : `${raw.ssd_gb}GB`;
  const quickFacts = [
    { label: "Processor", value: raw.processor_model, icon: Cpu },
    { label: "Graphics", value: raw.gpu_model, icon: Zap },
    {
      label: "Memory",
      value: `${raw.ram_gb}GB${raw.ram_type ? ` ${raw.ram_type}` : ""}`,
      icon: RectangleEllipsis,
    },
    {
      label: "Storage",
      value: `${storageLabel} ${raw.storage_type ?? "SSD"}`,
      icon: HardDrive,
    },
    {
      label: "Display",
      value: [
        `${raw.display_size_inch}"`,
        raw.display_resolution,
        raw.display_refresh_rate_hz ? `${raw.display_refresh_rate_hz}Hz` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      icon: Monitor,
    },
    {
      label: "Weight · Battery",
      value: `${raw.weight_kg}kg · ${raw.battery_wh}Wh`,
      icon: Feather,
    },
  ].filter((f) => f.value && f.value.trim() !== "");

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-24 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/laptops"
          className="text-brand flex items-center gap-2 font-medium hover:underline"
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
            <ShareButton name={laptop.name} />
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
                  <span className="bg-brand-tint text-brand rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-wide uppercase">
                    {laptop.tags[0]}
                  </span>
                )}
                {best && (
                  <span className="bg-brand-tint text-brand flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold">
                    <Sparkles className="size-3" />
                    Best fit: {labelForUseCase(best.use_case)}
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl leading-tight font-bold tracking-tight">
                {laptop.name}
              </h1>
            </div>
            {best && (
              <PersonalPickScoreRing
                laptopId={laptop.id}
                fallbackScore={best.score}
                size={64}
                caption="below"
                className="flex-none"
              />
            )}
          </div>

          {/* Quick facts */}
          <div className="grid grid-cols-1 gap-x-2.5 gap-y-3.5 min-[420px]:grid-cols-2">
            {quickFacts.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-start gap-2.5">
                <span className="bg-surface-2 flex size-8 flex-none items-center justify-center rounded-[10px] text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {label}
                  </span>
                  <span className="block text-[12.5px] leading-snug font-medium">
                    {value}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* Price + CTAs as one bottom block */}
          <div className="flex flex-col gap-4">
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

            {(laptop.priceValue > 0 || marketplaceLinks.length > 0) && (
              <div className="-mt-2 flex flex-col gap-2.5">
                {laptop.priceValue > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {priceCheckedLabel && (
                      <span className="block">Last checked: {priceCheckedLabel}</span>
                    )}
                    Official price. Marketplaces may be cheaper.
                  </p>
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
        {/* PickScore per use case (hidden until scores are generated) */}
        {pickScores && pickScores.scores.length > 0 && (
          <PickScoreCard laptopId={laptop.id} scores={pickScores.scores} os={raw.os} />
        )}

        {/* Full specs */}
        <FullSpecs raw={raw} />

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
                { name: `${laptop.brand} (RM)`, color: CHART_COLOR, prices: priceHistoryPrices },
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
  );
}
