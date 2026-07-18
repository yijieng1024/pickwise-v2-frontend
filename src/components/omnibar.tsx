"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

import { Input } from "@/components/ui/input";

const PHRASES = [
  "e.g. I need a light laptop for college under RM 3000",
  "预算4000，要轻薄，写代码用",
  "Best battery life for a sales job, banyak travel",
  "Video editing laptop, budget RM 6k, screen must be cantik",
];

export function Omnibar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setPhraseIndex((i) => (i + 1) % PHRASES.length),
      3500,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") router.push("/chat");
        }}
        placeholder={PHRASES[phraseIndex]}
        aria-label="Describe the laptop you need"
        className="border-line bg-surface dark:bg-surface h-16 rounded-full pr-[72px] pl-7 text-[17px] md:text-[17px] shadow-[0_12px_40px_var(--shadow)] transition-shadow focus:shadow-[0_12px_40px_var(--shadow),0_0_0_3px_var(--brand-tint)] focus-visible:border-line focus-visible:ring-0"
      />
      <button
        type="button"
        aria-label="Ask Pico"
        onClick={() => router.push("/chat")}
        className="bg-brand absolute top-2 right-2 flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
      >
        <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </button>
    </div>
  );
}
