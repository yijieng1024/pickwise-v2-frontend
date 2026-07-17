import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bell,
  Bot,
  ChevronLeft,
  Cpu,
  Feather,
  HardDrive,
  Heart,
  Layers,
  Monitor,
  PlusCircle,
  RectangleEllipsis,
  Share,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react";

import { PriceHistory } from "@/components/charts/price-history";
import { DataIcon } from "@/components/icon-map";
import { FullSpecs } from "@/components/full-specs";
import { LaptopGallery } from "@/components/laptop-gallery";
import { PickScoreCard } from "@/components/pick-score-card";
import { PickScoreRing } from "@/components/pick-score-ring";
import { apiFetch, ApiError } from "@/lib/api/client";
import { mapBackendLaptop } from "@/lib/api/adapters";
import { getLaptopPickScores, labelForUseCase } from "@/lib/api/pickscore";
import type {
  BackendBrand,
  BackendLaptop,
  BackendPriceHistoryEntry,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Validated single-series dataviz color (radar/price-history pair primary). */
const CHART_COLOR = "#3b6db4";

export default async function LaptopDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let raw: BackendLaptop;
  try {
    raw = await apiFetch<BackendLaptop>(`/laptops/${id}`);
  } catch (err) {
    // 404 = well-formed id, no such laptop. 422 = backend's UUID path-param
    // validation rejecting a malformed id (e.g. a stale non-UUID link).
    // Both mean "no laptop here" from the user's point of view.
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) {
      notFound();
    }
    throw err;
  }

  const [brand, rawHistory, pickScores] = await Promise.all([
    apiFetch<BackendBrand>(`/brands/${raw.brand_id}`),
    apiFetch<BackendPriceHistoryEntry[]>(`/laptops/${id}/price-history`),
    // Best-effort: scores may not be generated yet — the tile just hides.
    getLaptopPickScores(id).catch(() => null),
  ]);

  const laptop = mapBackendLaptop(raw, brand);

  const priceHistorySorted = [...rawHistory].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );
  const priceHistoryLabels = priceHistorySorted.map((h) =>
    new Date(h.recorded_at).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    }),
  );
  const priceHistoryPrices = priceHistorySorted.map((h) => h.price_rm);
  // priceValue of 0 means "price not available", not a genuine drop to zero.
  const priceDrop =
    priceHistorySorted.length > 0 && laptop.priceValue > 0
      ? priceHistorySorted[0].price_rm - laptop.priceValue
      : 0;

  const images = raw.image_urls.length > 0 ? raw.image_urls : [laptop.image];

  // Hero summary data: general-use PickScore + best-fit use case (when
  // scores exist) and the quick-facts grid built from the raw spec sheet.
  const generalScore =
    pickScores?.scores.find((s) => s.use_case === "general_use") ??
    pickScores?.scores[0];
  const bestFit = pickScores?.scores.length
    ? [...pickScores.scores].sort((a, b) => b.score - a.score)[0]
    : undefined;

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
          <ChevronLeft className="h-4 w-4" /> Back to Browse
        </Link>
        <div className="flex items-center gap-3 text-muted-foreground">
          <button type="button" aria-label="Share">
            <Share className="h-4 w-4 transition-colors hover:text-foreground" />
          </button>
          <button type="button" aria-label="Save to favorites">
            <Heart className="h-4 w-4 transition-colors hover:text-red-500" />
          </button>
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
                {bestFit && (
                  <span className="bg-brand-tint text-brand flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold">
                    <Sparkles className="h-3 w-3" />
                    Best fit: {labelForUseCase(bestFit.use_case)}
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl leading-tight font-bold tracking-tight">
                {laptop.name}
              </h1>
            </div>
            {generalScore && (
              <PickScoreRing
                score={generalScore.score}
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
                <span className="bg-surface-2 flex h-8 w-8 flex-none items-center justify-center rounded-[10px] text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
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
                  <TrendingDown className="h-3 w-3" /> RM{" "}
                  {priceDrop.toLocaleString()} below launch
                </span>
              )}
            </div>

            <div className="flex gap-2.5">
              <Link
                href="/chat"
                className="bg-brand flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-[13.5px] font-semibold text-white transition hover:opacity-90"
              >
                <Bot className="h-4 w-4" /> Ask Pico about this laptop
              </Link>
              <a
                href="#"
                className="border-line flex flex-1 items-center justify-center rounded-full border py-3.5 text-[13.5px] font-semibold transition hover:border-brand hover:text-brand"
              >
                View retailer options
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
        {/* PickScore per use case (hidden until scores are generated) */}
        {pickScores && pickScores.scores.length > 0 && (
          <PickScoreCard scores={pickScores.scores} />
        )}

        {/* Full specs */}
        <FullSpecs raw={raw} />

        {/* Price history */}
        <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Price history
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
                <TrendingDown className="h-3 w-3" /> Great deal
              </span>
            )}
          </div>
          {priceHistoryPrices.length > 0 ? (
            <PriceHistory
              months={priceHistoryLabels}
              series={[
                { name: `${laptop.brand} (RM)`, color: CHART_COLOR, prices: priceHistoryPrices },
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No price history recorded yet.
            </p>
          )}
          <button
            type="button"
            className="bg-surface-2 mt-4 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition hover:opacity-80"
          >
            <Bell className="h-3 w-3" /> Set price drop alert
          </button>
        </section>

        {/* Accessories fallback */}
        {/* {!laptop.accessories && (
          <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold tracking-tight">
              <Layers className="text-brand h-4 w-4" /> Recommended accessories
            </h2>
            <p className="text-sm text-muted-foreground">
              No specific accessories recommended at this time.
            </p>
          </section>
        )}
        {laptop.accessories && (
          <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight">
              <Layers className="text-brand h-4 w-4" /> Pairs well with
            </h2>
            <div className="flex flex-col gap-2.5">
              {laptop.accessories.map((acc) => (
                <div key={acc.name} className="flex items-center gap-3">
                  <div className="bg-surface-2 flex h-9.5 w-9.5 flex-none items-center justify-center rounded-[10px] text-muted-foreground">
                    <DataIcon name={acc.icon} className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-[13px]">
                    <div className="font-medium">{acc.name}</div>
                    <div className="text-[11.5px] text-muted-foreground tabular-nums">
                      {acc.price}
                    </div>
                  </div>
                  <PlusCircle className="ml-auto h-4 w-4 text-muted-foreground/40" />
                </div>
              ))}
            </div>
          </section>
        )} */}
      </div>
    </main>
  );
}
