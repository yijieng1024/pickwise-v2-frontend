import Link from "next/link";
import { ArrowRight, ChevronRight, Cpu, Sparkles } from "lucide-react";

import { LaptopCard } from "@/components/laptop-card";
import { featuredLaptops } from "@/lib/laptops";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
      <section className="flex flex-col items-center py-12 text-center md:py-24">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary motion-safe:animate-fade-in-up">
          <Sparkles className="h-4 w-4" /> PickWise AI V2 is live
        </div>

        <h1 className="mb-6 text-5xl font-semibold tracking-tighter md:text-7xl motion-safe:animate-fade-in-up motion-safe:[animation-delay:100ms]">
          Which laptop is right for you?
        </h1>
        <p className="mb-12 max-w-2xl text-xl text-muted-foreground md:text-2xl motion-safe:animate-fade-in-up motion-safe:[animation-delay:200ms]">
          Answer a few quick questions, and our AI will calculate the perfect
          Pick Score just for you.
        </p>

        {/* Conversational search bar */}
        <div className="relative mb-8 w-full max-w-3xl motion-safe:animate-fade-in-up motion-safe:[animation-delay:300ms]">
          <Cpu className="absolute top-5 left-6 h-6 w-6 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="e.g. 'I need a light laptop for college under RM 3000'"
            className="w-full rounded-full border border-transparent bg-muted py-5 pr-16 pl-16 text-lg transition-all focus:border-input focus:bg-background focus:shadow-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
          />
          <Link
            href="/wizard"
            aria-label="Start finding your laptop"
            className="absolute top-3 right-3 rounded-full bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Or use our step-by-step guide</span>
          <Link href="/wizard" className="text-primary hover:underline">
            Start the Needs Wizard
          </Link>
        </div>

        {/* Trending models */}
        <div className="mx-auto mt-24 w-full max-w-6xl pb-12 text-left">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Trending Models
              </h2>
              <p className="mt-2 text-muted-foreground">
                Popular choices among our users this week.
              </p>
            </div>
            <Link
              href="/laptops"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {featuredLaptops.map((laptop, i) => (
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
