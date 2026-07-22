import Link from "next/link";
import {
  ChevronRight,
  CircleGauge,
  Heart,
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { LaptopCard } from "@/components/laptop-card";
import { Omnibar } from "@/components/omnibar";
import { Button } from "@/components/ui/button";
import { mapRankedLaptop } from "@/lib/api/adapters";
import { getPickScoreRanking, USE_CASES } from "@/lib/api/pickscore";
import { laptops as mockLaptops, type Laptop } from "@/lib/laptops";
import { cn } from "@/lib/utils";

const TOP_N = 5;

/** Cycles the six mock laptops out to `TOP_N` slots for a use-case fallback. */
function mockTopPicks(label: string): Laptop[] {
  return Array.from({ length: TOP_N }, (_, i) => ({
    ...mockLaptops[i % mockLaptops.length],
    tags: [label],
  }));
}

const features = [
  {
    icon: MessageCircle,
    title: "Just describe what you need",
    body: "No filters to configure. Tell Pico your budget and what you'll actually use it for, in plain English or Bahasa — it asks follow-up questions when it needs more to go on.",
  },
  {
    icon: CircleGauge,
    title: "Pick Score, not just specs",
    body: "Every laptop gets a score built from benchmarks, reviews, and specs, broken into the factors that matter most for your use case — never a raw spec dump.",
  },
  {
    icon: Heart,
    title: "Save what you like",
    body: "Shortlist laptops as you chat or browse, then pick up right where you left off — your saved list and conversations are there when you sign back in.",
  },
] as const;

export default async function Home() {
  // Top 5 per use case = rank 1-5 stored PickScores for each of the five
  // weight profiles (general use, office & study, programming, gaming,
  // creative work), one section per use case; mocks only as a fallback.
  let topPicksByUseCase: { slug: string; label: string; laptops: Laptop[] }[] =
    USE_CASES.map((uc) => ({
      slug: uc.slug,
      label: uc.label,
      laptops: mockTopPicks(uc.label),
    }));
  try {
    const rankings = await Promise.all(
      USE_CASES.map((uc) => getPickScoreRanking(uc.slug, TOP_N)),
    );
    topPicksByUseCase = USE_CASES.map((uc, i) => ({
      slug: uc.slug,
      label: uc.label,
      laptops:
        rankings[i].results.length > 0
          ? rankings[i].results.map((row) => ({
              ...mapRankedLaptop(row),
              tags: [uc.label],
            }))
          : mockTopPicks(uc.label),
    }));
  } catch {
    // Keep the mock fallback.
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8">
      <section className="flex flex-col items-center pt-24 pb-0 text-center md:pt-32">
        <div className="bg-brand-tint text-brand mb-9 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium motion-safe:animate-fade-in-up">
          <Sparkles className="h-4 w-4" /> Welcome to PickWise! Pico is waiting for you!
        </div>

        <h1 className="mb-10 max-w-[760px] text-5xl leading-[1.03] font-bold tracking-tighter text-balance motion-safe:animate-fade-in-up motion-safe:[animation-delay:100ms] md:text-[72px]">
          Which laptop is right for you?
        </h1>

        <div className="w-full motion-safe:animate-fade-in-up motion-safe:[animation-delay:200ms]">
          <Omnibar />
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Or use our step-by-step guide →{" "}
          <Link href="/wizard" className="text-brand font-medium hover:underline">
            Start the Needs Wizard
          </Link>
        </p>

        {/* Top 5 by use case — one section per use case */}
        {topPicksByUseCase.map(({ slug, label, laptops }, sectionIndex) => (
          <div
            key={slug}
            className={cn(
              "mx-auto w-full text-left",
              sectionIndex === 0 ? "mt-32" : "mt-16",
            )}
          >
            <div className="mb-7 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Top 5 for {label}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  PickScore re-weighted for {label.toLowerCase()} — the
                  highest scorers right now.
                </p>
              </div>
              <Link
                href="/laptops"
                className="text-brand flex items-center gap-1 text-sm font-medium hover:underline"
              >
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {laptops.map((laptop, i) => (
                <div
                  key={`${slug}-${laptop.id}-${i}`}
                  className="motion-safe:animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <LaptopCard laptop={laptop} showScore={false} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Why PickWise */}
        <div className="mt-28 w-full text-left motion-safe:animate-fade-in-up">
          <h2 className="text-2xl font-semibold tracking-tight">
            Why PickWise
          </h2>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            An AI shopping agent for laptops, built to explain itself.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="border-line bg-surface rounded-2xl border p-6 motion-safe:animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="bg-brand-tint text-brand flex h-9 w-9 items-center justify-center rounded-xl">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="mt-4 text-[15px] font-bold tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="mt-28 mb-24 flex w-full flex-col items-center gap-4 text-center motion-safe:animate-fade-in-up">
          <h2 className="max-w-md text-2xl font-semibold tracking-tight text-balance">
            Ready to find your laptop?
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ask Pico a question or browse the full catalog — no sign-up
            required to start.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              render={<Link href="/chat" />}
              nativeButton={false}
              className="rounded-full px-6"
            >
              <Sparkles className="h-4 w-4" /> Ask Pico
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/laptops" />}
              nativeButton={false}
              className="rounded-full px-6"
            >
              Browse laptops
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
