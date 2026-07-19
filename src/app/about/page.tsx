import type { Metadata } from "next";
import Link from "next/link";
import {
  CircleGauge,
  MessageCircleQuestion,
  ScanSearch,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About — PickWise",
  description:
    "Why PickWise exists: an agent that asks before it recommends, a transparent PickScore, and laptop advice built for the Malaysian market.",
};

const pillars = [
  {
    icon: MessageCircleQuestion,
    title: "Pico asks first",
    body: "Pico is the agent at the heart of PickWise. Instead of handing you a filter grid, it asks about your budget, what you'll actually do with the laptop, and what you refuse to compromise on — then recommends. A good salesperson asks questions; so does Pico.",
  },
  {
    icon: CircleGauge,
    title: "One honest score",
    body: "PickScore condenses public benchmark data and specifications into a single rating built from eight weighted factors. The weights change with the use case — a great gaming laptop and a great student laptop are not the same machine — so every score is scored for something.",
  },
  {
    icon: ScanSearch,
    title: "Explained, not asserted",
    body: "Every recommendation can show its working: which factors drove the score, where a laptop is strong, and where it falls short. If a score ever looks wrong to you, the breakdown is right there to argue with.",
  },
] as const;

const steps = [
  {
    step: "1",
    title: "Tell us what you need",
    body: "Chat with Pico in plain language, or answer the six-step Needs Wizard — budget, purpose, priorities, screen size, portability, brands.",
  },
  {
    step: "2",
    title: "Get a shortlist with scores",
    body: "Pico narrows the catalog to a few strong candidates, each with a PickScore and a plain-English explanation of why it made the cut.",
  },
  {
    step: "3",
    title: "Compare and decide",
    body: "Dig into details, price history, and factor breakdowns. Signed in with preferences saved, scores re-weight to you personally.",
  },
] as const;

const commitments = [
  {
    title: "No retailer ads or affiliate buttons",
    body: "There is no \"buy now\" button on PickWise and no retailer paying to be recommended. The advice has nothing to sell you.",
  },
  {
    title: "Prices are honest about their limits",
    body: "Prices are in Malaysian Ringgit, collected from manufacturers' sites and public sources. They can lag — always confirm with the retailer before buying.",
  },
  {
    title: "AI that admits it can be wrong",
    body: "Pico's replies are AI-generated and PickScore is an opinion expressed as a number, not a guarantee. Verify specifications before you commit.",
  },
  {
    title: "Your data stays yours",
    body: "No advertising, no selling your data. What we collect exists to make recommendations better — nothing else.",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:px-6">
      {/* Hero */}
      <div className="max-w-2xl motion-safe:animate-fade-in-up">
        <p className="text-brand text-[11px] font-semibold tracking-wide uppercase">
          About PickWise
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tighter text-balance sm:text-5xl">
          Buying a laptop shouldn&apos;t require a spec-sheet degree.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          Laptop shopping in Malaysia means juggling dozens of near-identical
          models, benchmark charts, and prices that shift week to week.
          PickWise replaces that with a conversation: an AI agent named{" "}
          <strong className="font-semibold text-foreground">Pico</strong> that
          asks what you need before telling you what to buy, backed by a
          transparent rating we call{" "}
          <strong className="font-semibold text-foreground">PickScore</strong>.
        </p>
      </div>

      {/* Pillars */}
      <div
        className="mt-14 grid grid-cols-1 gap-5 motion-safe:animate-fade-in-up sm:grid-cols-3"
        style={{ animationDelay: "80ms" }}
      >
        {pillars.map(({ icon: Icon, title, body }) => (
          <section
            key={title}
            className="border-line bg-surface rounded-2xl border p-6"
          >
            <div className="bg-brand-tint text-brand flex h-9 w-9 items-center justify-center rounded-xl">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <h2 className="mt-4 text-[15px] font-bold tracking-tight">
              {title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {body}
            </p>
          </section>
        ))}
      </div>

      {/* How it works */}
      <div
        className="mt-16 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "160ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          How PickWise works
        </h2>
        <ol className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {steps.map(({ step, title, body }) => (
            <li key={step} className="flex flex-col gap-2">
              <span className="bg-brand flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white">
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

      {/* Commitments */}
      <div
        className="border-line bg-surface mt-16 rounded-2xl border p-6 motion-safe:animate-fade-in-up sm:p-8"
        style={{ animationDelay: "240ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          What we won&apos;t do
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Recommendation services earn trust by what they refuse, not just what
          they build.
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {commitments.map(({ title, body }) => (
            <div key={title} className="flex flex-col gap-1.5">
              <dt className="text-[14px] font-bold tracking-tight">{title}</dt>
              <dd className="text-[13px] leading-relaxed text-muted-foreground">
                {body}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[12.5px] text-muted-foreground">
          The fine print lives in our{" "}
          <Link
            href="/terms"
            className="text-brand underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-brand underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {/* CTA */}
      <div
        className="mt-16 flex flex-col items-center gap-4 text-center motion-safe:animate-fade-in-up"
        style={{ animationDelay: "320ms" }}
      >
        <h2 className="max-w-md text-2xl font-semibold tracking-tight text-balance">
          Ready to find the right laptop?
        </h2>
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
        <p className="text-[12.5px] text-muted-foreground">
          Questions first? Try the{" "}
          <Link href="/faq" className="text-brand underline underline-offset-2">
            FAQ
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
