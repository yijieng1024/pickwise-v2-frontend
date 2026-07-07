import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  Bot,
  BrainCircuit,
  ChartLine,
  CheckCircle2,
  ChevronLeft,
  Cpu,
  HardDrive,
  Heart,
  Layers,
  MemoryStick,
  Monitor,
  Newspaper,
  PlusCircle,
  Quote,
  Recycle,
  RefreshCw,
  Share,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  TrendingDown,
  Users,
  XCircle,
} from "lucide-react";

import { CompareRadar } from "@/components/charts/compare-radar";
import { PriceHistory } from "@/components/charts/price-history";
import { DataIcon } from "@/components/icon-map";
import { getLaptop, laptops, type Vendor } from "@/lib/laptops";
import { vendorBgClass } from "@/lib/vendors";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return laptops.map((l) => ({ id: String(l.id) }));
}

// Chart series color per brand (all validated against light surface)
const brandChartColor: Record<string, string> = {
  Apple: "#3b6db4",
  Asus: "#9333ea",
  Dell: "#9333ea",
  Acer: "#10b981",
  Lenovo: "#10b981",
};

const vendorRowIcon: Record<Vendor, typeof Store> = {
  official: Store,
  retail: ShoppingCart,
  used: Recycle,
};

export default async function LaptopDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const laptop = getLaptop(Number(id));
  if (!laptop) notFound();

  const batteryNegative = laptop.xai.battery.includes("-");
  const chartColor = brandChartColor[laptop.brand] ?? "#3b6db4";
  const priceHistory = [
    laptop.priceValue + 400,
    laptop.priceValue + 400,
    laptop.priceValue + 200,
    laptop.priceValue + 200,
    laptop.priceValue,
    laptop.priceValue,
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/results"
          className="flex items-center gap-2 font-medium text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Results
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

      {/* Hero */}
      <div className="mb-16 grid grid-cols-1 gap-12 lg:grid-cols-12 motion-safe:animate-fade-in-up">
        {/* Gallery */}
        <div className="space-y-6 lg:col-span-5">
          <div className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-muted p-12">
            <Image
              src={laptop.image}
              alt={laptop.name}
              width={600}
              height={600}
              priority
              className="h-full w-full object-contain mix-blend-multiply drop-shadow-2xl transition-transform duration-700 group-hover:scale-105 dark:mix-blend-normal motion-safe:animate-float"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="aspect-square cursor-pointer rounded-2xl border-2 border-primary bg-background p-2 shadow-sm">
              <Image
                src={laptop.image}
                alt=""
                width={150}
                height={150}
                className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
              />
            </div>
            {[0, 1].map((i) => (
              <div
                key={i}
                className="aspect-square cursor-pointer rounded-2xl border border-transparent bg-muted p-2 opacity-60 transition-all hover:border-input hover:bg-background hover:opacity-100"
              >
                <Image
                  src={laptop.image}
                  alt=""
                  width={150}
                  height={150}
                  className="h-full w-full object-contain mix-blend-multiply grayscale dark:mix-blend-normal"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col lg:col-span-7">
          <div className="mb-4 flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm",
                laptop.badgeClass,
              )}
            >
              {laptop.badge}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              By {laptop.brand}
            </span>
          </div>

          <h1 className="mb-3 text-4xl font-semibold tracking-tight md:text-5xl">
            {laptop.name}
          </h1>

          <div className="mb-5 flex flex-wrap gap-2">
            {laptop.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>

          <div className="mb-8">
            <div className="mb-2 flex items-baseline gap-3 text-4xl font-bold tracking-tight">
              {laptop.price}
              <span className="text-sm font-medium text-muted-foreground/70 line-through">
                RM {(laptop.priceValue + 400).toLocaleString()}
              </span>
              <span className="ml-2 hidden rounded bg-green-100 px-2 py-1 text-xs font-bold tracking-wider text-green-700 uppercase sm:inline-block dark:bg-green-950 dark:text-green-400">
                Best Price
              </span>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
            >
              <RefreshCw className="h-5 w-5 text-primary" />
              <span>
                <span className="block text-sm font-semibold text-primary">
                  Estimate Trade-In Value
                </span>
                <span className="block text-xs text-muted-foreground">
                  Get up to RM 2,500 off when you trade in your old laptop.
                </span>
              </span>
            </button>
          </div>

          {/* Pick Score insights */}
          <div className="relative mb-8 overflow-hidden rounded-3xl border border-green-200 bg-green-50/50 p-6 shadow-sm dark:border-green-900 dark:bg-green-950/30">
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-green-200 bg-background px-6 py-4 text-3xl font-bold text-green-600 shadow-sm dark:border-green-900">
                <span>{laptop.score}</span>
                <span className="mt-1 text-[10px] font-bold tracking-wider text-green-700 uppercase dark:text-green-400">
                  Pick Score
                </span>
              </div>
              <div className="flex-1">
                <h4 className="mb-2 text-lg font-semibold">
                  Why we picked this for you:
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span>
                      <strong>{laptop.xai.perf}</strong> for Performance
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    {batteryNegative ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    )}
                    <span>
                      <strong>{laptop.xai.battery}</strong> for Battery Life
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <strong>AI Analysis:</strong> {laptop.xai.match}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Core specs */}
          <div className="mb-8 rounded-3xl border bg-muted/30 p-6">
            <h3 className="mb-4 text-sm font-bold tracking-wider text-muted-foreground/70 uppercase">
              Core Specifications
            </h3>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              {[
                { icon: Cpu, label: "Processor", value: laptop.specs.cpu },
                { icon: MemoryStick, label: "Memory", value: laptop.specs.ram },
                {
                  icon: Monitor,
                  label: "Display",
                  value: laptop.specs.display ?? "Standard Display Panel",
                },
                {
                  icon: HardDrive,
                  label: "Graphics",
                  value: laptop.specs.gpu ?? "Integrated Graphics",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <dt className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Icon className="h-4 w-4" /> {label}
                  </dt>
                  <dd className="text-base font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Community benchmarks */}
          <div className="mb-8 flex items-center justify-between rounded-3xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-50 p-2 text-orange-500 dark:bg-orange-950">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Community Verified</h4>
                <p className="text-xs text-muted-foreground">
                  Based on {laptop.community?.users ?? "100+"} user tests
                </p>
              </div>
            </div>
            <div className="flex gap-4 text-sm font-medium">
              <div className="text-center">
                <div className="text-xs text-muted-foreground/70">
                  Real Battery
                </div>
                <div>{laptop.community?.battery ?? "N/A"}</div>
              </div>
              <div className="border-l pl-4 text-center">
                <div className="text-xs text-muted-foreground/70">
                  Cinebench
                </div>
                <div>{laptop.community?.cinebench ?? "N/A"}</div>
              </div>
            </div>
          </div>

          {/* Multi-vendor price table */}
          <div className="mb-8 rounded-3xl border bg-card p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 border-b pb-3 text-lg font-semibold">
              <ShoppingBag className="h-5 w-5 text-primary" /> Compare Vendor
              Prices
            </h3>
            <div className="flex flex-col gap-3">
              {laptop.vendorList ? (
                laptop.vendorList.map((v) => {
                  const RowIcon = vendorRowIcon[v.type];
                  return (
                    <div
                      key={v.name}
                      className="group flex items-center justify-between rounded-2xl border border-transparent p-3 transition-colors hover:border-input hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
                            vendorBgClass[v.type],
                          )}
                        >
                          <RowIcon className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            {v.name}
                          </span>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium">
                            <span
                              className={cn(
                                "flex items-center gap-0.5",
                                v.shipping.includes("Free")
                                  ? "text-green-600"
                                  : "text-muted-foreground",
                              )}
                            >
                              {v.shipping}
                            </span>
                            {v.voucher && (
                              <span className="rounded bg-primary/10 px-1.5 text-primary">
                                {v.voucher}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="font-bold">{v.price}</span>
                        <button
                          type="button"
                          className="rounded-full bg-muted px-4 py-1.5 text-xs font-semibold transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                        >
                          View Offer
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Vendor data not available.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto flex flex-col gap-3">
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/chat"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-primary bg-background py-4 text-lg font-semibold text-primary shadow-sm transition hover:bg-primary/5"
              >
                <Bot className="h-5 w-5" /> Ask Pico to Compare
              </Link>
              <a
                href="#"
                className={cn(
                  "flex flex-[1.5] items-center justify-center gap-2 rounded-full py-4 text-lg font-semibold text-white shadow-lg transition",
                  vendorBgClass[laptop.vendor.type],
                )}
              >
                Buy Lowest Price <ArrowRight className="h-5 w-5" />
              </a>
            </div>
            <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs font-medium text-muted-foreground/70">
              <ShieldCheck className="h-3.5 w-3.5" /> 100% Authenticity
              guaranteed via official store
            </p>
          </div>
        </div>
      </div>

      {/* Deep dive */}
      <div className="border-t pt-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Deep Dive Analytics
          </h2>
          <p className="mt-2 text-muted-foreground">
            Comprehensive breakdown of performance and market data.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Performance radar */}
          <div className="flex flex-col rounded-3xl border bg-card p-8 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-xl font-semibold">
              <Activity className="h-5 w-5 text-primary" /> Performance Profile
            </h3>
            <p className="mb-8 text-sm text-muted-foreground">
              Visualizing the balance between power, portability, and quality.
            </p>
            <div className="flex min-h-[300px] w-full flex-1 items-center justify-center">
              <CompareRadar
                series={[
                  {
                    name: laptop.name,
                    color: chartColor,
                    values: laptop.radar,
                  },
                ]}
                height={300}
              />
            </div>
          </div>

          {/* Price history */}
          <div className="flex flex-col rounded-3xl border bg-card p-8 shadow-sm">
            <div className="mb-2 flex items-start justify-between">
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <ChartLine className="h-5 w-5 text-green-500" /> Price History
              </h3>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
              >
                <Bell className="h-3 w-3" /> Set Alert
              </button>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Pricing trends from {laptop.vendor.name} over the last 6 months.
            </p>

            <div className="mb-6 flex items-end gap-3">
              <span className="text-3xl font-bold tracking-tight">
                {laptop.price}
              </span>
              <span className="mb-1 flex items-center gap-1 rounded-md bg-green-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-green-800 uppercase dark:bg-green-950 dark:text-green-400">
                <TrendingDown className="h-3 w-3" /> Great Deal
              </span>
            </div>

            <div className="min-h-[250px] w-full flex-1">
              <PriceHistory
                months={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
                series={[
                  {
                    name: `${laptop.vendor.name} (RM)`,
                    color: chartColor,
                    prices: priceHistory,
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Review sentiment */}
        <div className="rounded-3xl border bg-muted/30 p-8 shadow-inner lg:p-10">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold tracking-wider text-primary uppercase">
              AI Powered
            </span>
          </div>
          <h3 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-6 w-6 text-primary" /> Tech Review Sentiment
          </h3>
          <p className="mb-8 max-w-4xl border-l-4 border-primary/30 pl-4 text-lg leading-relaxed font-medium">
            &ldquo;{laptop.sentiment.summary}&rdquo;
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {laptop.sentiment.reviews.map((review) => (
              <div
                key={review.source}
                className="rounded-2xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/30"
              >
                <Quote className="mb-2 h-8 w-8 text-muted-foreground/20" />
                <p className="mb-6 text-[15px] text-muted-foreground italic">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between border-t pt-4 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                      <Newspaper className="h-3 w-3 text-muted-foreground" />
                    </span>
                    {review.source}
                  </span>
                  <span className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1 text-primary">
                    {review.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accessories */}
        <div className="mt-16 mb-8">
          <h3 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
            <Layers className="h-6 w-6 text-primary" /> Recommended Accessories
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {laptop.accessories ? (
              laptop.accessories.map((acc) => (
                <div
                  key={acc.name}
                  className="group flex cursor-pointer items-center gap-4 rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground/60 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <DataIcon name={acc.icon} className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="line-clamp-1 text-sm font-semibold">
                      {acc.name}
                    </h4>
                    <p className="text-xs font-medium text-muted-foreground">
                      {acc.price}
                    </p>
                  </div>
                  <PlusCircle className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No specific accessories recommended at this time.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
