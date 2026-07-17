import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

import { LaptopCard } from "@/components/laptop-card";
import { Omnibar } from "@/components/omnibar";
import { mapRankedLaptop } from "@/lib/api/adapters";
import { getPickScoreRanking } from "@/lib/api/pickscore";
import { featuredLaptops } from "@/lib/laptops";

export default async function Home() {
  // Trending = top stored general-use PickScores from the live catalog;
  // mocks only as a fallback if the API is unreachable or scores are empty.
  let trending = featuredLaptops;
  try {
    const ranking = await getPickScoreRanking("general_use", 3);
    if (ranking.results.length > 0) {
      trending = ranking.results.map(mapRankedLaptop);
    }
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

        {/* Trending models */}
        <div className="mx-auto mt-32 w-full pb-24 text-left">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Trending models
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Popular in Malaysia this week. Personalised PickScores appear
                once we know your needs.
              </p>
            </div>
            <Link
              href="/laptops"
              className="text-brand flex items-center gap-1 text-sm font-medium hover:underline"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {trending.map((laptop, i) => (
              <div
                key={laptop.id}
                className="motion-safe:animate-fade-in-up"
                style={{ animationDelay: `${400 + i * 120}ms` }}
              >
                <LaptopCard laptop={laptop} showScore={false} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
