"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Battery,
  Briefcase,
  Code,
  Film,
  Gamepad2,
  Monitor,
  Tag,
  Weight,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface Tile {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface Step {
  q: string;
  why: string;
  tiles: Tile[];
}

const steps: Step[] = [
  {
    q: "What's your budget?",
    why: "Budget narrows the field the most — we'll only show laptops you'd actually buy.",
    tiles: [
      { icon: Banknote, title: "Under RM 2,500", desc: "Everyday essentials — browsing, docs, streaming" },
      { icon: Banknote, title: "RM 2,500 – 4,000", desc: "The sweet spot for most students and office work" },
      { icon: Banknote, title: "RM 4,000 – 6,000", desc: "Premium ultrabooks and creator laptops" },
      { icon: Banknote, title: "Above RM 6,000", desc: "Workstations and high-end gaming" },
    ],
  },
  {
    q: "What's your primary use?",
    why: "This helps us gauge the CPU and GPU power you need.",
    tiles: [
      { icon: Briefcase, title: "Office & Study", desc: "Word, Excel, web browsing, Netflix" },
      { icon: Code, title: "Programming", desc: "IDEs, compilers, containers, many browser tabs" },
      { icon: Film, title: "Creative Work", desc: "Photo and video editing, design tools" },
      { icon: Gamepad2, title: "Gaming", desc: "Modern titles at smooth frame rates" },
    ],
  },
  {
    q: "What matters most to you?",
    why: "We weight the PickScore toward what matters most to you.",
    tiles: [
      { icon: Zap, title: "Performance", desc: "Raw speed for demanding work" },
      { icon: Battery, title: "Battery Life", desc: "A full day away from the plug" },
      { icon: Monitor, title: "Display Quality", desc: "Colour-accurate, sharp, bright" },
      { icon: Weight, title: "Portability", desc: "Thin, light, easy to carry" },
    ],
  },
  {
    q: "What screen size suits you?",
    why: "Screen size sets the balance between workspace and weight.",
    tiles: [
      { icon: Monitor, title: '13″ and under', desc: "Maximum portability, compact desk" },
      { icon: Monitor, title: '14″', desc: "The modern sweet spot — space without bulk" },
      { icon: Monitor, title: '15 – 16″', desc: "More workspace for editing and multitasking" },
      { icon: Monitor, title: '17″ and above', desc: "Desktop replacement, rarely moved" },
    ],
  },
  {
    q: "How often will you carry it?",
    why: "How often you carry it changes how much weight matters.",
    tiles: [
      { icon: Weight, title: "Always with me", desc: "In my bag every day, all day" },
      { icon: Weight, title: "Daily commute", desc: "Home to campus or office and back" },
      { icon: Weight, title: "Mostly desk-bound", desc: "Moves within the house occasionally" },
      { icon: Weight, title: "Never leaves home", desc: "A permanent desk setup" },
    ],
  },
  {
    q: "Any brand preference?",
    why: "Some brands trade price for build quality or local service support.",
    tiles: [
      { icon: Tag, title: "No preference", desc: "Show me the best value, any brand" },
      { icon: Tag, title: "Apple only", desc: "macOS ecosystem, premium build" },
      { icon: Tag, title: "Windows brands", desc: "Lenovo, ASUS, HP, Dell, Acer and more" },
      { icon: Tag, title: "Ask Pico", desc: "Let the consultant weigh in" },
    ],
  },
];

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Record<number, number>>({});

  const current = steps[step];
  const picked = selections[step];

  function pick(i: number) {
    setSelections((prev) => ({ ...prev, [step]: i }));
  }

  function next() {
    if (picked == null) return;
    if (step === steps.length - 1) {
      router.push("/chat");
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <main className="flex min-h-[calc(100vh-140px)] flex-1 items-start justify-center px-4 py-16 sm:px-6">
      <div className="border-line bg-surface w-full max-w-[680px] rounded-3xl border p-8 shadow-[0_16px_48px_var(--shadow)] motion-safe:animate-fade-in-up sm:p-11">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Needs Wizard
          </span>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            Step {step + 1} of {steps.length}
          </span>
        </div>
        <div className="bg-surface-2 mb-9 h-[3px] overflow-hidden rounded-full">
          <div
            className="bg-brand h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <h2 className="mb-2 text-[28px] leading-tight font-bold tracking-tight">
          {current.q}
        </h2>
        <p className="mb-7 text-sm leading-relaxed text-muted-foreground">
          {current.why}
        </p>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {current.tiles.map(({ icon: Icon, title, desc }, i) => {
            const active = picked === i;
            return (
              <button
                key={title}
                type="button"
                onClick={() => pick(i)}
                className={cn(
                  "rounded-2xl border-[1.5px] p-5.5 text-left transition-all hover:border-brand hover:shadow-[0_8px_24px_var(--shadow)]",
                  active
                    ? "border-brand bg-brand-tint shadow-[0_8px_24px_var(--shadow)]"
                    : "border-line bg-surface",
                )}
              >
                <Icon
                  className={cn(
                    "mb-3 block h-5.5 w-5.5",
                    active ? "text-brand" : "text-muted-foreground",
                  )}
                  strokeWidth={1.8}
                />
                <span className="mb-1 block text-[15px] font-semibold">
                  {title}
                </span>
                <span className="block text-[12.5px] leading-relaxed text-muted-foreground">
                  {desc}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            className={cn(
              "rounded-full px-4.5 py-2.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              step === 0 && "invisible",
            )}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={picked == null}
            className={cn(
              "rounded-full px-6 py-2.5 text-[13.5px] font-semibold transition-opacity",
              picked != null
                ? "bg-brand text-white hover:opacity-90"
                : "bg-surface-2 cursor-default text-muted-foreground opacity-60",
            )}
          >
            {step === steps.length - 1 ? "See my matches" : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}
