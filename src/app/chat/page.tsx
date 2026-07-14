"use client";

import { useState } from "react";
import { Bot, Check, MessageSquare, MoreHorizontal, Plus, Send } from "lucide-react";

import { LaptopCard } from "@/components/laptop-card";
import { GlassSurface } from "@/components/glass-surface";
import { topPicks } from "@/lib/laptops";
import { cn } from "@/lib/utils";

const historyGroups = [
  { label: "Today", chats: [{ title: "Coding laptop under RM 4,500", active: true }] },
  {
    label: "Previous 7 Days",
    chats: [
      { title: "Best OLED screen under RM 4k", active: false },
      { title: "MacBook Air vs Zenbook 14", active: false },
    ],
  },
];

const activityChips = [
  { label: "Checked laptops that fit your budget", detail: "12 candidates" },
  { label: "Looked up what reviewers say", detail: "38 review points" },
];

const quickReplies = ["Yes, show gaming options", "No, this is fine"];

export default function ChatPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({
    [topPicks[0].id]: true,
    [topPicks[1].id]: true,
  });
  const [weights, setWeights] = useState({ perf: 40, port: 35, batt: 25 });
  const [reply, setReply] = useState<string | null>(null);

  const compareCount = Object.values(checked).filter(Boolean).length;
  const total = weights.perf + weights.port + weights.batt || 1;
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <main className="mx-auto grid h-[calc(100vh-120px)] w-full max-w-6xl flex-1 grid-cols-1 gap-0 px-0 md:grid-cols-[272px_1fr] md:px-6">
      {/* Sidebar */}
      <aside className="border-line bg-surface hidden flex-col gap-5 border-r p-4 md:flex">
        <button
          type="button"
          className="border-line bg-canvas flex items-center justify-center gap-2 rounded-full border py-2.5 text-[13px] font-semibold transition-colors hover:border-brand hover:text-brand"
        >
          <Plus className="h-3.5 w-3.5" /> New Conversation
        </button>
        {historyGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <span className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </span>
            {group.chats.map((chat) => (
              <button
                key={chat.title}
                type="button"
                className={cn(
                  "group flex items-center justify-between truncate rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium transition-colors",
                  chat.active
                    ? "bg-brand-tint text-brand"
                    : "hover:bg-surface-2 text-foreground",
                )}
              >
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </span>
                <MoreHorizontal className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* Thread */}
      <section className="flex max-h-[calc(100vh-120px)] flex-col">
        <div className="flex-1 overflow-y-auto px-4 pt-8 pb-4 sm:px-8">
          <div className="mx-auto flex max-w-[760px] flex-col gap-5">
            <div className="text-center text-[11.5px] font-medium text-muted-foreground">
              Today, 14:22
            </div>

            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-brand max-w-[70%] rounded-[20px] rounded-br-[4px] px-4.5 py-3 text-[14.5px] leading-relaxed text-white">
                I need a light laptop for college under RM 4,500, mostly for
                coding
              </div>
            </div>

            {/* Activity chips */}
            <div className="flex flex-col items-start gap-2 pl-11">
              {activityChips.map((chip) => (
                <GlassSurface
                  key={chip.label}
                  cornerRadius={999}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-muted-foreground"
                >
                  <Check className="text-positive h-3 w-3" strokeWidth={2.6} />
                  {chip.label} ·{" "}
                  <span className="font-medium text-foreground">{chip.detail}</span>
                </GlassSurface>
              ))}
              <div className="motion-safe:animate-shimmer flex items-center gap-2 rounded-full border border-line bg-[linear-gradient(100deg,var(--glass)_40%,var(--brand-tint)_50%,var(--glass)_60%)] bg-[length:200%_100%] px-3.5 py-1.5 text-xs text-muted-foreground shadow-[0_4px_16px_var(--shadow)]">
                <span className="border-brand-tint border-t-brand h-3 w-3 animate-spin rounded-full border-2" />
                Working out the prices…
              </div>
            </div>

            {/* Pico reply */}
            <div className="flex items-start gap-3">
              <div className="bg-brand mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex max-w-[82%] flex-col gap-1.5">
                <span className="text-[11.5px] font-semibold text-muted-foreground">
                  Pico
                </span>
                <div className="bg-surface-2 rounded-[20px] rounded-bl-[4px] px-4.5 py-3.5 text-[14.5px] leading-relaxed">
                  Good brief — light, under RM 4,500, and comfortable for
                  coding. I found three that fit well. All three stay under
                  1.4 kg and handle IDEs and containers without strain.
                  Here&apos;s how they score against your needs:
                </div>
              </div>
            </div>

            {/* Pro tuning */}
            <div className="bg-surface-2 ml-11 flex flex-col gap-3 rounded-2xl px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Pro tuning
                </span>
                <span className="text-[11.5px] text-muted-foreground">
                  Adjust what the PickScore rewards
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {(
                  [
                    { key: "perf", label: "Performance" },
                    { key: "port", label: "Portability" },
                    { key: "batt", label: "Battery" },
                  ] as const
                ).map(({ key, label }) => (
                  <label key={key} className="flex flex-col gap-1.5 text-xs font-medium">
                    <span className="flex justify-between">
                      <span>{label}</span>
                      <span className="text-brand font-semibold tabular-nums">
                        {pct(weights[key])}%
                      </span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weights[key]}
                      onChange={(e) =>
                        setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))
                      }
                      className="accent-brand w-full"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Compare pill */}
            <div className="ml-11 flex justify-end">
              <span
                className={cn(
                  "rounded-full px-4.5 py-2 text-xs font-semibold",
                  compareCount >= 2
                    ? "bg-brand text-white"
                    : "bg-surface-2 text-muted-foreground",
                )}
              >
                Compare Selected ({compareCount})
              </span>
            </div>

            {/* Result cards */}
            <div className="ml-11 flex flex-col gap-4">
              {topPicks.map((laptop) => (
                <LaptopCard
                  key={laptop.id}
                  laptop={laptop}
                  showScore
                  compareChecked={!!checked[laptop.id]}
                  onCompareChange={(v) =>
                    setChecked((c) => ({ ...c, [laptop.id]: v }))
                  }
                />
              ))}
            </div>

            {/* Clarifying question */}
            <div className="flex items-start gap-3">
              <div className="bg-brand mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex max-w-[82%] flex-col gap-2.5">
                <div className="bg-surface-2 rounded-[20px] rounded-bl-[4px] border border-dashed border-line px-4.5 py-3.5 text-[14.5px] leading-relaxed">
                  One thing to check — these all use integrated graphics. If
                  you also game after class, I can look at options with a
                  dedicated GPU, though they&apos;ll be heavier.
                </div>
                {reply ? (
                  <div className="bg-brand w-fit rounded-[20px] rounded-br-[4px] px-4.5 py-3 text-[13.5px] text-white">
                    {reply}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReply(r)}
                        className="border-brand text-brand hover:bg-brand-tint rounded-full border px-4 py-2 text-[13px] font-medium"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="px-4 pt-3 pb-3.5 sm:px-8">
          <div className="mx-auto max-w-[760px]">
            <GlassSurface cornerRadius={999} fullWidth>
              <div className="relative">
                <input
                  placeholder="Reply to Pico…"
                  aria-label="Message Pico"
                  className="h-[54px] w-full rounded-full py-0 pr-16 pl-6 text-[14.5px] outline-none"
                />
                <button
                  type="button"
                  aria-label="Send"
                  className="bg-brand absolute top-[7px] right-[7px] flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </GlassSurface>
            <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
              Pico can make mistakes. Consider verifying important specs.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
