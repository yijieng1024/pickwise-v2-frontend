import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How PickScore Works — PickWise",
  description:
    "A plain-English explanation of PickScore: the eight things we measure, how each laptop is ranked against the catalog, and why the same laptop scores differently for gaming and for study.",
};

const factors = [
  {
    name: "Price",
    plain: "Are you getting a lot of laptop for the money?",
    detail:
      "Cheaper scores higher. If you told us a budget, anything above it is pulled down the further over it goes — 50% over budget scores zero here.",
  },
  {
    name: "Processor (CPU)",
    plain: "How fast is the brain that runs everything?",
    detail:
      "Taken from PassMark, a public benchmark that has actually tested the chip — not from the model name or marketing.",
  },
  {
    name: "Graphics (GPU)",
    plain: "Can it handle games, video editing, or 3D?",
    detail:
      "Also a public benchmark figure. Laptops without a separate graphics card are scored on the graphics built into their processor.",
  },
  {
    name: "Memory & storage",
    plain: "How many things can it juggle, and how much fits on it?",
    detail:
      "RAM counts a little more than storage (60/40), and an older mechanical hard drive loses points against an SSD.",
  },
  {
    name: "Portability",
    plain: "How much does it weigh in your bag?",
    detail: "Lighter scores higher. Nothing else — thickness and size are separate concerns.",
  },
  {
    name: "Battery",
    plain: "How long can you stay away from a power socket?",
    detail:
      "Based on the battery's capacity in watt-hours, the one number every manufacturer publishes honestly.",
  },
  {
    name: "Screen size",
    plain: "Is the screen the size you asked for?",
    detail:
      "Only meaningful once you tell us a preference. A perfect match scores 100, one size off scores 60, two sizes off scores 20.",
  },
  {
    name: "Brand",
    plain: "Is it a brand you said you liked?",
    detail:
      "The smallest factor by far, and it only moves if you named brands you prefer.",
  },
] as const;

const useCases = [
  {
    label: "Office & Study",
    lead: "Price, battery, portability",
    weights: { Price: 22, Battery: 20, Portability: 18, CPU: 15, "Memory & storage": 12, GPU: 5, Screen: 5, Brand: 2 },
  },
  {
    label: "Programming",
    lead: "Processor and memory",
    weights: { CPU: 21, "Memory & storage": 21, Price: 14, Battery: 14, Portability: 10, Screen: 10, GPU: 7, Brand: 2 },
  },
  {
    label: "Gaming",
    lead: "Graphics above everything",
    weights: { GPU: 28, CPU: 22, "Memory & storage": 19, Price: 11, Screen: 11, Portability: 3, Battery: 3, Brand: 3 },
  },
  {
    label: "Creative Work",
    lead: "Graphics, processor, memory, big screen",
    weights: { GPU: 22, CPU: 20, "Memory & storage": 20, Screen: 12, Price: 8, Portability: 8, Battery: 8, Brand: 2 },
  },
  {
    label: "General Use",
    lead: "A balanced all-rounder, price first",
    weights: { Price: 21, CPU: 16, "Memory & storage": 16, Portability: 14, Battery: 14, Screen: 9, GPU: 5, Brand: 5 },
  },
] as const;

const honesty = [
  {
    title: "We don't guess at a spec we can't verify",
    body: "If we can't match a laptop's processor or graphics chip to a real benchmark result, that factor is parked at a neutral 50 and marked as unverified rather than estimated.",
  },
  {
    title: "Sometimes we show no score at all",
    body: "If both the processor and the graphics are unidentified, half the score would be made up — so we withhold the number and show you the breakdown instead. A blank is more honest than a confident wrong answer.",
  },
  {
    title: "A score is a ranking, not a verdict",
    body: "78 doesn't mean \"78% good\". It means that against everything else we list, weighted for the job you picked, this machine lands high. A cheap laptop can out-score an expensive one because value is part of the measurement.",
  },
  {
    title: "Nobody can pay to score higher",
    body: "There are no sponsored placements, affiliate links, or retailer deals anywhere in PickWise. The formula is the same for every laptop in the catalog.",
  },
] as const;

export default function PickScorePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:px-6">
      {/* Hero */}
      <div className="max-w-2xl motion-safe:animate-fade-in-up">
        <p className="text-brand text-[11px] font-semibold tracking-wide uppercase">
          How PickScore works
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tighter text-balance sm:text-5xl">
          One number, and the full receipt behind it.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          Every laptop on PickWise gets a{" "}
          <strong className="font-semibold text-foreground">
            PickScore out of 100
          </strong>
          . It answers one question: compared with every other laptop we list,
          how good is this one{" "}
          <em className="text-foreground">for what you want to do with it</em>?
          No part of it is a guess or an opinion typed in by hand — here is
          exactly how it is worked out.
        </p>
      </div>

      {/* The three steps */}
      <div
        className="mt-14 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          The short version, in three steps
        </h2>
        <ol className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Score eight things",
              body: "We rate a laptop on eight separate things — price, processor, graphics, memory and storage, weight, battery, screen size, and brand. Each one gets its own mark out of 100.",
            },
            {
              step: "2",
              title: "Compare, don't judge",
              body: "Each mark is a ranking against the rest of the catalog. 70 for battery means it outlasts 70% of the laptops we list. That way \"good battery\" means something real, not a number we invented.",
            },
            {
              step: "3",
              title: "Weight for the job",
              body: "The eight marks are blended into one score — but the mix changes with the job. Graphics dominate a gaming score and barely register for study. Same laptop, different score.",
            },
          ].map(({ step, title, body }) => (
            <li key={step} className="flex flex-col gap-2">
              <span className="bg-brand flex size-7 items-center justify-center rounded-full text-[13px] font-bold text-white">
                {step}
              </span>
              <h3 className="mt-1 text-[14px] font-bold tracking-tight">
                {title}
              </h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Step 1: the eight factors */}
      <div
        className="mt-16 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "160ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          The eight things we look at
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Specifications are only useful once they answer a question you
          actually have. So each factor is really one plain question about the
          laptop.
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {factors.map(({ name, plain, detail }) => (
            <div
              key={name}
              className="border-line bg-surface flex flex-col gap-1.5 rounded-2xl border p-5"
            >
              <dt className="text-[14px] font-bold tracking-tight">{name}</dt>
              <dd className="text-[13.5px] leading-relaxed font-medium">
                {plain}
              </dd>
              <dd className="text-[13px] leading-relaxed text-muted-foreground">
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Step 2: percentile explainer */}
      <div
        className="border-line bg-surface mt-16 rounded-2xl border p-6 motion-safe:animate-fade-in-up sm:p-8"
        style={{ animationDelay: "240ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          Why we rank instead of measure
        </h2>
        <div className="mt-4 flex max-w-3xl flex-col gap-4 text-[13.5px] leading-relaxed text-muted-foreground">
          <p>
            Say a laptop has a 60Wh battery. Is that good? On its own the number
            means nothing to most people — so we don&apos;t ask you to judge it.
            We line up every laptop in the catalog by battery size and see where
            this one lands. Bigger than 7 out of every 10 laptops we list? That
            factor scores <strong className="font-semibold text-foreground">70</strong>.
          </p>
          <p>
            We do this for every factor, which is what makes them fair to add
            together. The alternative — stretching each factor between the very
            cheapest and very most expensive laptop we stock — lets a single
            RM37,000 workstation or one 4TB configuration distort the whole
            scale. Ranking is immune to that: one extreme machine is just one
            more place in the queue.
          </p>
          <p>
            It also means a PickScore is always relative to{" "}
            <strong className="font-semibold text-foreground">
              what PickWise actually lists
            </strong>
            . As the catalog grows, scores shift a little. That&apos;s the
            honest behaviour — the question &ldquo;is this a good buy?&rdquo;
            only makes sense against the alternatives.
          </p>
        </div>
      </div>

      {/* Step 3: use case weights */}
      <div
        className="mt-16 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "320ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          The same laptop, five different scores
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          A great gaming laptop and a great student laptop are not the same
          machine, so one score for both would be useless. Here is how much each
          factor counts towards each use case — the numbers below are the actual
          weights the scoring engine uses.
        </p>
        <div className="mt-6 flex flex-col gap-4">
          {useCases.map(({ label, lead, weights }) => (
            <section
              key={label}
              className="border-line bg-surface rounded-2xl border p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-[15px] font-bold tracking-tight">
                  {label}
                </h3>
                <p className="text-[13px] text-muted-foreground">{lead}</p>
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {Object.entries(weights).map(([factor, pct]) => (
                  <li key={factor} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-[12.5px] text-muted-foreground">
                      {factor}
                    </span>
                    <span
                      aria-hidden
                      className="bg-brand-tint h-2 flex-1 overflow-hidden rounded-full"
                    >
                      <span
                        className="bg-brand block h-full rounded-full"
                        style={{ width: `${(pct / 28) * 100}%` }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right text-[12.5px] font-semibold tabular-nums">
                      {pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* Personalized */}
      <div
        className="border-line bg-surface mt-16 rounded-2xl border p-6 motion-safe:animate-fade-in-up sm:p-8"
        style={{ animationDelay: "400ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          The &ldquo;For you&rdquo; score
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Finish the{" "}
          <Link
            href="/wizard"
            className="text-brand underline underline-offset-2"
          >
            Needs Wizard
          </Link>{" "}
          and the five profiles above are replaced by one built from your own
          answers. Four things change:
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {[
            {
              title: "Your priorities become the weights",
              body: "Whatever you ranked as mattering most simply counts for most. Nothing is decided on your behalf.",
            },
            {
              title: "Your purpose nudges them further",
              body: "Telling us you game or study gives the relevant factors an extra boost of up to 30% — enough to tip close calls, never enough to override what you said you cared about.",
            },
            {
              title: "Your budget starts to bite",
              body: "Laptops within budget are scored normally on value. Over budget, the price factor falls away the further past it they go, reaching zero at 50% over.",
            },
            {
              title: "Screen size and brand wake up",
              body: "Without preferences these two sit neutral for everyone. Once you've told us what you want, they finally reward the laptops that match.",
            },
          ].map(({ title, body }) => (
            <div key={title} className="flex flex-col gap-1.5">
              <dt className="text-[14px] font-bold tracking-tight">{title}</dt>
              <dd className="text-[13px] leading-relaxed text-muted-foreground">
                {body}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[12.5px] text-muted-foreground">
          Personalized scores are marked with a small person badge wherever they
          appear, so you always know which of the two numbers you&apos;re
          looking at.
        </p>
      </div>

      {/* Honesty */}
      <div
        className="mt-16 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "480ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          What a PickScore won&apos;t do
        </h2>
        <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {honesty.map(({ title, body }) => (
            <div
              key={title}
              className="border-line bg-surface flex flex-col gap-1.5 rounded-2xl border p-5"
            >
              <dt className="text-[14px] font-bold tracking-tight">{title}</dt>
              <dd className="text-[13px] leading-relaxed text-muted-foreground">
                {body}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          PickScore is an opinion expressed as a number — a well-reasoned one,
          built from public benchmarks and published specifications, but not a
          guarantee of how a laptop will feel to use. Every score on PickWise
          can show its full breakdown, factor by factor, so you can disagree
          with it on the evidence.
        </p>
      </div>

      {/* CTA */}
      <div
        className="mt-16 flex flex-col items-center gap-4 text-center motion-safe:animate-fade-in-up"
        style={{ animationDelay: "560ms" }}
      >
        <h2 className="max-w-md text-2xl font-semibold tracking-tight text-balance">
          See it on a real laptop.
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            render={<Link href="/laptops" />}
            nativeButton={false}
            className="rounded-full px-6"
          >
            Browse laptops
          </Button>
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/chat" />}
            nativeButton={false}
            className="rounded-full px-6"
          >
            <Sparkles className="size-4" /> Ask Pico
          </Button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">
          More questions? Try the{" "}
          <Link href="/faq" className="text-brand underline underline-offset-2">
            FAQ
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
