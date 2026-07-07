import Link from "next/link";
import { ArrowRight, Bot, GitCompare, SlidersHorizontal } from "lucide-react";

import { LaptopCard } from "@/components/laptop-card";
import { topPicks } from "@/lib/laptops";

const tuningWeights = [
  { label: "Performance Weight", value: 80 },
  { label: "Portability Weight", value: 40 },
  { label: "Battery Life Weight", value: 60 },
];

export default function ResultsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end motion-safe:animate-fade-in-up">
        <div>
          <h2 className="text-4xl font-semibold tracking-tight">
            Your Top Picks
          </h2>
          <p className="mt-2 text-muted-foreground">
            Based on your preference for <b>Creative Work</b> and a budget of{" "}
            <b>RM 7000</b>.
          </p>
        </div>
        <Link
          href="/compare"
          className="flex items-center gap-2 self-start rounded-full bg-muted px-4 py-2 text-sm font-medium transition hover:bg-accent sm:self-auto"
        >
          <GitCompare className="h-4 w-4" /> Compare Selected (2)
        </Link>
      </div>

      {/* Pro tuning sliders */}
      <div className="mb-10 rounded-3xl border bg-muted/30 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <SlidersHorizontal className="h-5 w-5 text-primary" /> Pro Tuning
            (Advanced Mode)
          </h3>
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold tracking-wider text-primary uppercase">
            Live
          </span>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {tuningWeights.map(({ label, value }) => (
            <div key={label}>
              <div className="mb-2 flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">{label}</span>
                <span>{value}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={value}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                aria-label={label}
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end border-t pt-4">
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Apply Filters <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {topPicks.map((laptop, i) => (
          <div
            key={laptop.id}
            className="motion-safe:animate-fade-in-up"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <LaptopCard laptop={laptop} />
          </div>
        ))}
      </div>

      {/* Conversational follow-up */}
      <div className="mx-auto mt-12 flex max-w-3xl items-start gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="shrink-0 rounded-full bg-background p-2 shadow-sm">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h4 className="mb-1 font-semibold">PickWise AI Note</h4>
          <p className="text-sm text-muted-foreground">
            I noticed you selected Creative Work. If your workflow involves
            heavy 3D rendering (like Blender or Maya), I strongly recommend
            bumping your budget slightly to get the Zephyrus G14 for its
            dedicated RTX GPU. Would you like to adjust your filters?
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-primary"
            >
              Yes, show more powerful GPUs
            </button>
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              No, this is fine
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
