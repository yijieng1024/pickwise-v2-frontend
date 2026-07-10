"use client";

import Image from "next/image";
import Link from "next/link";
import { Cpu, Monitor, RectangleEllipsis, Zap } from "lucide-react";

import { DataIcon } from "@/components/icon-map";
import { XaiPopover } from "@/components/xai-popover";
import type { Laptop } from "@/lib/laptops";

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
  compareChecked?: boolean;
  onCompareChange?: (checked: boolean) => void;
}

export function LaptopCard({
  laptop,
  showScore = true,
  compareChecked,
  onCompareChange,
}: LaptopCardProps) {
  const specEntries = Object.entries(laptop.specs);

  return (
    <div className="group border-line bg-surface relative flex flex-col rounded-3xl border transition-all duration-300 hover:shadow-xl motion-safe:hover:-translate-y-1.5">
      {/* Stretched link: makes the whole card open the details page while
          the buttons below sit on a higher layer and keep their own actions */}
      <Link
        href={`/laptops/${laptop.id}`}
        aria-label={`View details for ${laptop.name}`}
        className="absolute inset-0 z-10 rounded-3xl"
      />

      <div className="bg-surface-2 relative flex h-44 items-center justify-center overflow-hidden rounded-t-3xl p-8">
        <Image
          src={laptop.image}
          alt={laptop.name}
          width={600}
          height={400}
          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 dark:mix-blend-normal"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="bg-brand-tint text-brand w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
            {laptop.tags[0]}
          </span>
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
                  className="text-brand mt-0.5 h-3.5 w-3.5 shrink-0"
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
              <span
                key={key}
                className="bg-surface-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                <Icon className="h-2.5 w-2.5" />
                {value}
              </span>
            );
          })}
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-xl font-bold tracking-tight tabular-nums">
            {laptop.price}
          </span>
          {showScore && onCompareChange ? (
            <label className="relative z-20 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={compareChecked}
                onChange={(e) => onCompareChange(e.target.checked)}
                className="accent-brand h-3.5 w-3.5 cursor-pointer"
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
