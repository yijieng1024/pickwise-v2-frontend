import type { Metadata } from "next";
import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "PickWise vs a General AI Chatbot — PickWise",
  description:
    "What changes when laptop advice comes from an agent grounded in a Malaysian catalog, live prices, benchmarks and real reviews, instead of a general-purpose chatbot answering from memory.",
};

const question =
  "I'm a uni student in KL, budget around RM 4,000, mostly coding and some light gaming. What laptop should I get?";

const generic = [
  "Answers from training data that can be a year or more old, so new models are missing and discontinued ones still appear.",
  "Quotes prices from memory, often in US dollars or from another country.",
  "Ranks with \"generally considered good\" judgements rather than measured numbers.",
  "Can't tell you whether that exact configuration is sold in Malaysia.",
];

const pickwise = [
  "Searches a catalog of laptops sold in Malaysia and only recommends ones currently listed with a known price.",
  "Prices are in Ringgit: the manufacturer's price, its recent price history, and live Malaysian listings when asked.",
  "Each result carries a Pick Score built from public benchmarks, weighted for coding and gaming.",
  "Can back a claim with what YouTube reviewers said, with a link to the moment they said it.",
];

const rows = [
  {
    topic: "Where the answer comes from",
    generic: "Whatever the model remembers from training",
    pickwise: "PickWise's own laptop catalog, searched for every request",
  },
  {
    topic: "Prices",
    generic: "Recalled from memory; often outdated or in the wrong currency",
    pickwise: "Ringgit, from manufacturers' sites plus price history and live Malaysian listings",
  },
  {
    topic: "Availability",
    generic: "Can't tell what is actually sold in Malaysia",
    pickwise: "Only laptops currently listed with a known price are recommended",
  },
  {
    topic: "Performance claims",
    generic: "Reputation and general impressions",
    pickwise: "Pick Score from PassMark CPU and GPU benchmarks, weighted by use case",
  },
  {
    topic: "Real-world opinions",
    generic: "Paraphrased, unsourced",
    pickwise: "Review evidence from YouTube reviewers, with timestamped links",
  },
  {
    topic: "When it doesn't know",
    generic: "Often fills the gap with a confident guess",
    pickwise: "Says a value is unavailable, or asks you a clarifying question",
  },
  {
    topic: "Your preferences",
    generic: "Re-explain them every chat",
    pickwise: "Saved Needs Wizard answers personalise every score",
  },
  {
    topic: "Staying on topic",
    generic: "Will happily wander off into anything",
    pickwise: "Focused on laptops, so its tools and checks always apply",
  },
] as const;

export default function WhyPickWisePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:px-6">
      {/* Hero */}
      <div className="max-w-2xl motion-safe:animate-fade-in-up">
        <p className="text-brand-text text-[11px] font-semibold tracking-wide uppercase">
          PickWise vs a general AI chatbot
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tighter text-balance sm:text-5xl">
          Same question. Very different footing.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          A general-purpose chatbot is good at sounding right about laptops. Pico,
          the agent behind PickWise, uses the same kind of language model, but it
          has to look things up before it answers: a Malaysian laptop catalog, prices
          in Ringgit, public benchmarks, and what reviewers actually said.
        </p>
      </div>

      {/* Same question, two answers */}
      <div
        className="mt-14 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        <div className="border-line bg-surface rounded-2xl border p-5">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            The question
          </p>
          <p className="mt-2 text-[15px] font-medium">&ldquo;{question}&rdquo;</p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <AnswerCard title="A general AI chatbot" points={generic} tone="muted" />
          <AnswerCard title="PickWise (Pico)" points={pickwise} tone="brand" />
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Simplified for illustration. General chatbots vary, and some can browse the
          web, but none of them are built around a Malaysian laptop catalog.
        </p>
      </div>

      {/* Comparison table */}
      <div
        className="mt-16 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "160ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">Side by side</h2>
        <div className="border-line mt-6 overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="bg-surface">
              <tr>
                <th className="w-1/4 p-4 font-semibold"></th>
                <th className="p-4 font-semibold text-muted-foreground">General AI chatbot</th>
                <th className="text-brand-text p-4 font-semibold">PickWise</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.topic} className="border-line border-t">
                  <th scope="row" className="p-4 align-top font-semibold">
                    {r.topic}
                  </th>
                  <td className="p-4 align-top leading-relaxed text-muted-foreground">
                    {r.generic}
                  </td>
                  <td className="p-4 align-top leading-relaxed">{r.pickwise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Honest limits */}
      <div
        className="border-line bg-surface mt-16 rounded-2xl border p-6 motion-safe:animate-fade-in-up sm:p-8"
        style={{ animationDelay: "240ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">Where a general chatbot still wins</h2>
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
          PickWise only knows the laptops in its catalog, and catalog prices can lag
          behind retailers, so confirm before you buy. For anything that isn&apos;t
          choosing a laptop, such as setting one up, fixing it, or writing your
          assignment on it, a general chatbot is the better tool. Read more about how
          scores are built in{" "}
          <Link href="/pickscore" className="text-brand-text underline underline-offset-2">
            How Pick Score works
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
          Ask Pico the same question.
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            render={<Link href="/chat" />}
            nativeButton={false}
            className="rounded-full px-6"
          >
            <Sparkles className="size-4" /> Ask Pico
          </Button>
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/wizard" />}
            nativeButton={false}
            className="rounded-full px-6"
          >
            Take the Needs Wizard
          </Button>
        </div>
      </div>
    </main>
  );
}

function AnswerCard({
  title,
  points,
  tone,
}: {
  title: string;
  points: string[];
  tone: "muted" | "brand";
}) {
  const Icon = tone === "brand" ? Check : X;
  return (
    <section
      className={
        tone === "brand"
          ? "border-brand/40 bg-brand-tint/40 rounded-2xl border p-6"
          : "border-line bg-surface rounded-2xl border p-6"
      }
    >
      <h3 className={tone === "brand" ? "text-brand-text text-[15px] font-bold" : "text-[15px] font-bold"}>
        {title}
      </h3>
      <ul className="mt-4 flex flex-col gap-3">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-[13px] leading-relaxed">
            <Icon
              className={
                tone === "brand"
                  ? "text-brand-text mt-0.5 size-4 shrink-0"
                  : "text-negative mt-0.5 size-4 shrink-0"
              }
            />
            <span className={tone === "brand" ? "" : "text-muted-foreground"}>{p}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
