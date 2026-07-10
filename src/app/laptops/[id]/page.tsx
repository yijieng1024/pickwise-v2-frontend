import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bell,
  Bot,
  Check,
  ChevronLeft,
  Cpu,
  HardDrive,
  Heart,
  Layers,
  MemoryStick,
  Monitor,
  PlusCircle,
  Share,
  TrendingDown,
  X,
} from "lucide-react";

import { CompareRadar } from "@/components/charts/compare-radar";
import { PriceHistory } from "@/components/charts/price-history";
import { DataIcon } from "@/components/icon-map";
import { PickScoreRing } from "@/components/pick-score-ring";
import { ReviewSentiment } from "@/components/review-sentiment";
import { getLaptop, laptops } from "@/lib/laptops";

export function generateStaticParams() {
  return laptops.map((l) => ({ id: String(l.id) }));
}

/** Validated single-series dataviz color (radar/price-history pair primary). */
const CHART_COLOR = "#3b6db4";

export default async function LaptopDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const laptop = getLaptop(Number(id));
  if (!laptop) notFound();

  const priceHistory = [
    laptop.priceValue + 400,
    laptop.priceValue + 400,
    laptop.priceValue + 200,
    laptop.priceValue + 200,
    laptop.priceValue,
    laptop.priceValue,
  ];
  const priceDrop = priceHistory[0] - laptop.priceValue;

  const worstFactor = laptop.xaiFactors.reduce((worst, f) =>
    f.value < worst.value ? f : worst,
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 sm:px-6">
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

      {/* Hero: gallery + why-we-picked */}
      <div className="mb-16 grid grid-cols-1 gap-6 motion-safe:animate-fade-in-up lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="group bg-surface-2 relative flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-3xl p-12">
            <Image
              src={laptop.image}
              alt={laptop.name}
              width={600}
              height={600}
              priority
              className="h-full w-full object-contain mix-blend-multiply drop-shadow-2xl transition-transform duration-700 group-hover:scale-105 dark:mix-blend-normal motion-safe:animate-float"
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="border-brand aspect-square rounded-2xl border-[1.5px] bg-surface p-2">
              <Image
                src={laptop.image}
                alt=""
                width={150}
                height={150}
                className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
              />
            </div>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-surface-2 border-line aspect-square cursor-pointer rounded-2xl border"
              />
            ))}
          </div>
        </div>

        <div className="border-line bg-surface flex flex-col gap-4.5 rounded-3xl border p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="bg-brand-tint text-brand rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-wide uppercase">
                {laptop.tags[0]}
              </span>
              <h1 className="mt-3 text-[28px] leading-tight font-bold tracking-tight">
                {laptop.name}
              </h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.values(laptop.specs).map((spec) => (
                  <span
                    key={spec}
                    className="bg-surface-2 rounded-full px-2.5 py-1 text-[11.5px] text-muted-foreground"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
            <PickScoreRing score={laptop.score} size={64} caption="inside" />
          </div>

          <p className="text-[26px] font-bold tracking-tight tabular-nums">
            {laptop.price}
          </p>

          <div className="bg-surface-2 flex flex-col gap-2.5 rounded-2xl p-4.5">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Why we picked this for you
            </span>
            {laptop.plainEnglish.map((pe) => (
              <div
                key={pe.text}
                className="flex items-start gap-2.5 text-[13px] leading-snug"
              >
                <Check className="text-positive mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                {pe.text}
              </div>
            ))}
            {worstFactor.value < 0 && (
              <div className="flex items-start gap-2.5 text-[13px] leading-snug text-muted-foreground">
                <X className="text-negative mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                {worstFactor.name} is a relative weak point for this pick
                ({worstFactor.value})
              </div>
            )}
          </div>

          <div className="mt-auto flex gap-2.5">
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

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
        {/* Price history */}
        <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-4">
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
            <span className="text-3xl font-bold tracking-tight tabular-nums">
              {laptop.price}
            </span>
            <span className="text-positive mb-1 flex items-center gap-1 rounded-md bg-positive/10 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
              <TrendingDown className="h-3 w-3" /> Great deal
            </span>
          </div>
          <PriceHistory
            months={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
            series={[
              { name: `${laptop.brand} (RM)`, color: CHART_COLOR, prices: priceHistory },
            ]}
          />
          <button
            type="button"
            className="bg-surface-2 mt-4 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition hover:opacity-80"
          >
            <Bell className="h-3 w-3" /> Set price drop alert
          </button>
        </section>

        {/* Fit radar */}
        <section className="border-line bg-surface flex flex-col items-center rounded-3xl border p-7 md:col-span-2">
          <h2 className="mb-1 self-start text-base font-semibold tracking-tight">
            Fit to your needs
          </h2>
          <p className="mb-2 self-start text-xs text-muted-foreground">
            Shape = this laptop vs your ideal
          </p>
          <CompareRadar
            series={[{ name: laptop.name, color: CHART_COLOR, values: laptop.radar }]}
            height={220}
          />
        </section>

        {/* Sentiment */}
        <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-3">
          <ReviewSentiment reviews={laptop.sentiment.reviews} />
        </section>

        {/* Benchmarks + accessories */}
        <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-3">
          <h2 className="mb-1 text-base font-semibold tracking-tight">
            How it performs
          </h2>
          <p className="mb-5 text-xs text-muted-foreground">
            Relative to the best laptop in your budget
          </p>
          <div className="flex flex-col gap-4">
            {(laptop.benchmarks ?? []).map((b) => (
              <div key={b.label} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[12.5px]">
                  <span className="font-medium">
                    {b.label}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {b.sub}
                    </span>
                  </span>
                  <span className="text-brand font-semibold tabular-nums">
                    {b.pct}%
                  </span>
                </div>
                <div className="bg-surface-2 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-brand h-full rounded-full"
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {laptop.accessories && (
            <div className="border-line mt-6 border-t pt-5">
              <h3 className="mb-3 text-sm font-semibold">Pairs well with</h3>
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
            </div>
          )}
        </section>

        {/* Full specs */}
        <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
          <h2 className="mb-5 text-base font-semibold tracking-tight">
            Full specifications
          </h2>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Cpu, label: "Processor", value: laptop.specs.cpu },
              { icon: MemoryStick, label: "Memory", value: laptop.specs.ram },
              {
                icon: Monitor,
                label: "Display",
                value: laptop.specs.display ?? "Standard display panel",
              },
              {
                icon: HardDrive,
                label: "Graphics",
                value: laptop.specs.gpu ?? "Integrated graphics",
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="border-line flex items-baseline justify-between gap-4 border-b py-3"
              >
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-3 w-3" /> {label}
                </span>
                <span className="text-[12.5px] font-medium tabular-nums">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Accessories fallback */}
        {!laptop.accessories && (
          <section className="border-line bg-surface rounded-3xl border p-7 md:col-span-6">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold tracking-tight">
              <Layers className="text-brand h-4 w-4" /> Recommended accessories
            </h2>
            <p className="text-sm text-muted-foreground">
              No specific accessories recommended at this time.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
