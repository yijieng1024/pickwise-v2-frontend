"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Code,
  Gamepad2,
  Loader2,
  PenTool,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const useCases: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Briefcase,
    title: "Office & Study",
    description: "Word, Excel, web browsing, Netflix.",
  },
  {
    icon: PenTool,
    title: "Creative Work",
    description: "Video editing, graphic design, 3D.",
  },
  {
    icon: Gamepad2,
    title: "Gaming",
    description: "High frame rates, AAA titles.",
  },
  {
    icon: Code,
    title: "Programming",
    description: "Compiling code, virtual machines.",
  },
];

export default function WizardPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function choose(title: string) {
    if (selected) return;
    setSelected(title);
    // Simulate AI processing before showing personalized results
    setTimeout(() => router.push("/results"), 1200);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 pb-24 sm:px-6">
      <div className="rounded-3xl border bg-card p-8 text-center shadow-xl md:p-12 motion-safe:animate-fade-in-up">
        <div className="mb-6 flex justify-center">
          <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 rounded-full bg-primary" />
          </div>
        </div>
        <h2 className="mb-2 text-3xl font-semibold tracking-tight">
          What&apos;s your primary use?
        </h2>
        <p className="mb-8 text-muted-foreground">
          This helps us gauge the CPU and GPU power you need.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {useCases.map(({ icon: Icon, title, description }) => (
            <button
              key={title}
              type="button"
              onClick={() => choose(title)}
              disabled={selected !== null && selected !== title}
              className={cn(
                "group flex flex-col gap-2 rounded-2xl border p-6 text-left transition-all hover:border-primary hover:shadow-md disabled:opacity-50",
                selected === title && "border-primary shadow-md",
              )}
            >
              {selected === title ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-lg font-semibold">
                    AI Generating Score...
                  </span>
                </>
              ) : (
                <>
                  <Icon className="h-8 w-8 text-muted-foreground/60 group-hover:text-primary" />
                  <span className="text-lg font-semibold">{title}</span>
                  <span className="text-sm text-muted-foreground">
                    {description}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
