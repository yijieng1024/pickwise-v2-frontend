import type { Metadata } from "next";
import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ — PickWise",
  description:
    "Answers to common questions about PickWise, Pico, PickScore, personalized scores, prices, and your account.",
};

type Faq = { q: string; a: React.ReactNode };

const groups: { title: string; faqs: Faq[] }[] = [
  {
    title: "Getting started",
    faqs: [
      {
        q: "What is PickWise?",
        a: (
          <p>
            PickWise is a laptop recommendation and price-comparison service
            for the Malaysian market. It pairs a laptop catalog with{" "}
            <strong>Pico</strong>, an AI agent that asks what you need before
            recommending, and <strong>PickScore</strong>, a transparent rating
            that shows exactly why each laptop scored the way it did.
          </p>
        ),
      },
      {
        q: "Is PickWise free?",
        a: (
          <p>
            Yes. PickWise is free to use — there are no paid tiers, retailer
            advertisements, or affiliate commissions.
          </p>
        ),
      },
      {
        q: "Do I need an account?",
        a: (
          <p>
            You can browse the catalog and laptop details pages without one.
            Chatting with Pico, saving laptops to your wishlist, and the Needs
            Wizard require a free account, since they all remember things
            between visits. You can register with email or sign in with
            Google.
          </p>
        ),
      },
      {
        q: "Does PickWise sell laptops?",
        a: (
          <p>
            No. PickWise is an information service — we don&apos;t sell
            laptops, process payments, or hold stock. When you&apos;re ready to
            buy, the purchase happens between you and the retailer of your
            choice.
          </p>
        ),
      },
    ],
  },
  {
    title: "PickScore",
    faqs: [
      {
        q: "What is PickScore?",
        a: (
          <p>
            PickScore is our own rating methodology. It condenses public
            benchmark data and product specifications into a single score
            built from eight weighted factors, and every score comes with a
            breakdown showing how each factor contributed. It&apos;s an
            opinion expressed as a number — a well-reasoned one, but not a
            guarantee of real-world performance.
          </p>
        ),
      },
      {
        q: "Why does the same laptop have different scores?",
        a: (
          <p>
            Because a score is always <em>for</em> something. PickScore is
            computed per use case — general use, and four more specialised
            profiles — with different factor weights for each. A machine that
            tops the gaming ranking can sit mid-table for portability-focused
            student use, and that difference is the point.
          </p>
        ),
      },
      {
        q: "What does the “For you” score mean?",
        a: (
          <p>
            If you&apos;re signed in and have completed the Needs Wizard,
            PickWise re-weights PickScore to your stated budget and
            priorities. Personalized scores are marked with a small person
            badge wherever they appear — on the details page and on
            Pico&apos;s shortlist cards. Without preferences saved, you see
            the general-mode score instead.
          </p>
        ),
      },
    ],
  },
  {
    title: "Pico",
    faqs: [
      {
        q: "Who — or what — is Pico?",
        a: (
          <p>
            Pico is PickWise&apos;s AI shopping agent. Describe what you need
            in plain language and it will ask clarifying questions, search
            the catalog, and come back with a scored shortlist plus an
            explanation of each pick. Recommendations and comparisons happen
            right in the chat.
          </p>
        ),
      },
      {
        q: "Can Pico be wrong?",
        a: (
          <p>
            Yes. Pico&apos;s replies are AI-generated and can be wrong,
            incomplete, or out of date. Treat them as a well-informed starting
            point, and always verify specifications, compatibility, and prices
            with the manufacturer or retailer before buying.
          </p>
        ),
      },
      {
        q: "Are my conversations saved?",
        a: (
          <p>
            Yes. Conversations with Pico are stored with your account so you
            can pick up where you left off — reopening one restores both the
            messages and the laptop shortlist it produced. You can rename or
            delete any conversation from the chat sidebar.
          </p>
        ),
      },
    ],
  },
  {
    title: "Prices and data",
    faqs: [
      {
        q: "Where do prices come from?",
        a: (
          <p>
            Prices are shown in <strong>Malaysian Ringgit (RM)</strong> and
            collected from manufacturers&apos; websites and public sources.
            They can lag behind or differ from what a retailer charges, so
            confirm the price before you commit to a purchase.
          </p>
        ),
      },
      {
        q: "Why is there no buy button?",
        a: (
          <p>
            Deliberately. PickWise stays vendor-neutral: no retailer branding,
            no sponsored placements, no affiliate links. That independence is
            what lets the recommendation be honest — once you&apos;ve chosen,
            buy from whichever retailer suits you.
          </p>
        ),
      },
    ],
  },
  {
    title: "Account and privacy",
    faqs: [
      {
        q: "How do I change my saved preferences?",
        a: (
          <p>
            Open the account menu and choose <strong>Preferences</strong>, or
            visit your profile&apos;s &ldquo;Laptop preferences&rdquo; card —
            both lead back to the Needs Wizard, where you can update your
            answers any time. Personalized PickScores update to match.
          </p>
        ),
      },
      {
        q: "What happens to my data?",
        a: (
          <p>
            We collect only what the service needs to work, there is no
            advertising, and we never sell your data. The full details —
            including how Pico conversations are stored — are in the{" "}
            <Link href="/privacy" className="text-brand">
              Privacy Policy
            </Link>
            .
          </p>
        ),
      },
      {
        q: "Can I delete my account?",
        a: (
          <p>
            Yes — you can request deletion of your account and its data at any
            time. See the{" "}
            <Link href="/privacy" className="text-brand">
              Privacy Policy
            </Link>{" "}
            for how.
          </p>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6">
      <div className="motion-safe:animate-fade-in-up">
        <p className="text-brand text-[11px] font-semibold tracking-wide uppercase">
          FAQ
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          Quick answers about PickWise, Pico, and PickScore. Can&apos;t find
          yours? Ask{" "}
          <Link
            href="/chat"
            className="text-brand underline underline-offset-2"
          >
            Pico
          </Link>{" "}
          — or read the longer story on the{" "}
          <Link
            href="/about"
            className="text-brand underline underline-offset-2"
          >
            About page
          </Link>
          .
        </p>
      </div>

      <div
        className="mt-10 flex flex-col gap-9 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        {groups.map(({ title, faqs }) => (
          <section key={title}>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            <Accordion className="mt-2">
              {faqs.map(({ q, a }) => (
                <AccordionItem key={q} className="border-line">
                  <AccordionTrigger className="py-3.5 text-[13.5px]">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-[13.5px] leading-relaxed text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </main>
  );
}
