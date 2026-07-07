import Image from "next/image";
import Link from "next/link";
import { BrainCircuit, CheckCircle2, ExternalLink } from "lucide-react";

import { DataIcon } from "@/components/icon-map";
import type { Laptop } from "@/lib/laptops";
import { vendorBgClass } from "@/lib/vendors";
import { cn } from "@/lib/utils";

export function LaptopCard({
  laptop,
  showScore = true,
}: {
  laptop: Laptop;
  showScore?: boolean;
}) {
  return (
    <div className="group relative flex flex-col rounded-3xl border bg-card transition-all duration-300 hover:shadow-xl motion-safe:hover:-translate-y-1.5">
      {/* Stretched link: makes the whole card open the details page while
          the buttons below sit on a higher layer and keep their own actions */}
      <Link
        href={`/laptops/${laptop.id}`}
        aria-label={`View details for ${laptop.name}`}
        className="absolute inset-0 z-10 rounded-3xl"
      />
      {showScore && (
        <div className="group/score absolute top-4 right-4 z-20">
          <div className="flex cursor-help items-center gap-1.5 rounded-full border bg-background/90 px-3 py-1.5 shadow-sm backdrop-blur transition-colors hover:border-primary/30">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-bold">{laptop.score} Score</span>
          </div>

          {/* Explainable AI breakdown */}
          <div className="invisible absolute top-12 right-0 z-50 w-64 translate-y-1 rounded-2xl border bg-popover p-4 text-left opacity-0 shadow-xl transition-all duration-200 group-hover/score:visible group-hover/score:translate-y-0 group-hover/score:opacity-100">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <BrainCircuit className="h-4 w-4" /> Pick Score Breakdown
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex justify-between">
                <span>Performance</span>
                <span className="font-medium text-green-600">
                  {laptop.xai.perf}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Battery</span>
                <span
                  className={cn(
                    "font-medium",
                    laptop.xai.battery.includes("-")
                      ? "text-red-500"
                      : "text-green-600",
                  )}
                >
                  {laptop.xai.battery}
                </span>
              </li>
              <li className="mt-1 flex justify-between gap-2 border-t pt-1">
                <span>Algorithmic Fit</span>
                <span className="truncate font-medium text-foreground">
                  {laptop.xai.match}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-t-3xl bg-muted p-8">
        <Image
          src={laptop.image}
          alt={laptop.name}
          width={600}
          height={400}
          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105 dark:mix-blend-normal"
        />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              laptop.badgeClass,
            )}
          >
            {laptop.badge}
          </span>
        </div>
        <h3 className="mb-1 text-xl font-semibold">{laptop.name}</h3>
        <p className="mb-3 text-2xl font-bold tracking-tight">{laptop.price}</p>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {laptop.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Plain-English highlights */}
        <div className="mb-6 flex-1 space-y-3 rounded-2xl border bg-muted/50 p-4">
          {laptop.plainEnglish.map((pe) => (
            <div key={pe.text} className="flex items-start gap-3">
              <DataIcon
                name={pe.icon}
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              />
              <p className="text-sm leading-tight text-muted-foreground">
                {pe.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground/70">
          {Object.values(laptop.specs).map((spec) => (
            <span key={spec}>• {spec}</span>
          ))}
        </div>

        <div className="relative z-20 mt-auto flex gap-3">
          <Link
            href={`/laptops/${laptop.id}`}
            className="flex-1 rounded-full bg-muted py-3 text-center font-medium transition hover:bg-accent"
          >
            Details
          </Link>
          <a
            href="#"
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-3 font-medium text-white shadow-md transition",
              vendorBgClass[laptop.vendor.type],
            )}
          >
            Buy <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
