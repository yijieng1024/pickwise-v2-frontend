"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu, Monitor, RectangleEllipsis, Zap } from "lucide-react";

import { DataIcon } from "@/components/icon-map";
import { XaiPopover } from "@/components/xai-popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Laptop } from "@/lib/laptops";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselDots, CarouselItem } from "./ui/carousel";

const specIcons: Record<string, typeof Cpu> = {
  cpu: Cpu,
  ram: RectangleEllipsis,
  display: Monitor,
  gpu: Zap,
};

interface LaptopCardProps {
  laptop: Laptop;
  /** Rich mode: PickScore ring + XAI popover + plain-English highlights. Off for generic/trending listings. */
  showScore?: boolean;
  /** "grid" (default): vertical card. "list": horizontal row — image left, content right. */
  layout?: "grid" | "list";
  compareChecked?: boolean;
  onCompareChange?: (checked: boolean) => void;
}

/**
 * Widths the image area actually occupies, so the optimizer serves that size
 * rather than the 640w/1280w it falls back to when `sizes` is absent. Matters
 * most for ASUS, whose sources are 2400×2400 (1.7–3.4 MB) — without this the
 * list view's 160px slot was being handed a 1280w render. Rounded up, never
 * down: an over-estimate costs bytes, an under-estimate costs sharpness.
 */
const IMAGE_SIZES = {
  // Browse: 1 col, 2 at md, 3 at lg (~400px each). Home trending goes to 5 at
  // lg and simply gets a slightly larger render than it needs.
  grid: "(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw",
  // Fixed image column: w-40 / sm:w-64.
  list: "(min-width: 640px) 256px, 160px",
} as const;

export function LaptopCard({
  laptop,
  showScore = true,
  layout = "grid",
  compareChecked,
  onCompareChange,
}: LaptopCardProps) {
  const router = useRouter();
  const specEntries = Object.entries(laptop.specs);
  const images = laptop.images?.length ? laptop.images : [laptop.image];

  return (
    <div
      className={cn(
        "group border-line bg-surface relative flex rounded-3xl border transition-all duration-300 hover:shadow-xl motion-safe:hover:-translate-y-1.5",
        layout === "list" ? "flex-row" : "flex-col",
      )}
    >
      {/* Stretched link: makes the whole card open the details page while
          the buttons below sit on a higher layer and keep their own actions */}
      <Link
        href={`/laptops/${laptop.id}`}
        aria-label={`View details for ${laptop.name}`}
        className="absolute inset-0 z-10 rounded-3xl"
      />

      {/* On mobile this sits above the stretched link (z-10) so embla receives
          touch and the image can be swiped; taps still open details via the
          onClick below (embla cancels the click after a drag). On desktop it
          drops back below the link (md:z-auto) — swipe isn't needed there and
          the whole-card link keeps its original behaviour. */}
      <div
        className={cn(
          "relative z-10 overflow-hidden bg-white md:z-auto",
          layout === "list"
            ? "w-40 shrink-0 rounded-l-3xl sm:w-64"
            : "h-75 w-full rounded-t-3xl",
        )}
      >
        <Carousel className="h-full w-full">
          <CarouselContent
            className="h-full cursor-pointer"
            onClick={() => router.push(`/laptops/${laptop.id}`)}
          >
            {images.map((img, index) => (
              <CarouselItem key={index} className="h-full">
                <Image
                  src={img}
                  alt={`${laptop.name} ${index + 1}`}
                  width={600}
                  height={400}
                  sizes={IMAGE_SIZES[layout]}
                  className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 dark:mix-blend-normal"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full border-[var(--glass-edge)] bg-[color-mix(in_srgb,var(--glass)_50%,transparent)] px-4 py-2 shadow-[inset_0_1px_0_var(--glass-edge)] backdrop-blur-[20px] backdrop-saturate-[1.8]" />
        </Carousel>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-start justify-between gap-3">
          {laptop.tags[0] && (
            <Badge className="bg-brand-tint text-brand h-auto rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
              {laptop.tags[0]}
            </Badge>
          )}
          {showScore && (
            <div className="relative z-20 -mt-1">
              <XaiPopover
                score={laptop.score}
                match={laptop.match}
                factors={laptop.xaiFactors}
                ringSize={44}
              />
            </div>
          )}
        </div>

        <h3 className="text-[17px] font-semibold tracking-tight">
          {laptop.name}
        </h3>

        {showScore && (
          <div className="bg-surface-2 flex flex-col gap-2 rounded-2xl p-3">
            {laptop.plainEnglish.slice(0, 3).map((pe) => (
              <div
                key={pe.text}
                className="flex items-start gap-2.5 text-[13px] leading-snug"
              >
                <DataIcon
                  name={pe.icon}
                  className="text-brand mt-0.5 size-3.5 shrink-0"
                />
                {pe.text}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {specEntries.map(([key, value]) => {
            const Icon = specIcons[key] ?? Cpu;
            return (
              <Badge
                key={key}
                className="bg-surface-2 text-muted-foreground h-auto gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-normal [&>svg]:size-2.5!"
              >
                <Icon />
                {value}
              </Badge>
            );
          })}
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <span
            className={cn(
              "tracking-tight tabular-nums",
              laptop.priceValue > 0
                ? "text-xl font-bold"
                : "text-[13px] font-medium text-muted-foreground italic",
            )}
          >
            {laptop.price}
          </span>
          {showScore && onCompareChange ? (
            <label className="relative z-20 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Checkbox
                checked={compareChecked ?? false}
                onCheckedChange={(checked) => onCompareChange(checked === true)}
                className="size-3.5 cursor-pointer"
              />
              Compare
            </label>
          ) : (
            <span className="text-brand text-xs font-semibold">Details →</span>
          )}
        </div>
      </div>
    </div>
  );
}
