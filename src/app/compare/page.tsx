"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Cpu, Monitor, Plug } from "lucide-react";

import { CompareRadar } from "@/components/charts/compare-radar";
import { GlassSurface } from "@/components/glass-surface";
import { PickScoreRing } from "@/components/pick-score-ring";
import { laptops } from "@/lib/laptops";
import { cn } from "@/lib/utils";

// Validated categorical pair for the radar (brand-navy tint + purple)
const RADAR_COLORS = ["#3b6db4", "#9333ea"];

const left = laptops[0]; // MacBook Pro 14"
const right = laptops[1]; // ROG Zephyrus G14

interface MatrixRow {
  label: string;
  sub: string;
  a: [string, string];
  b: [string, string];
  win?: "a" | "b";
}

const sections: {
  title: string;
  icon: typeof Cpu;
  tech?: boolean;
  rows: MatrixRow[];
}[] = [
  {
    title: "Core Architecture & Performance",
    icon: Cpu,
    rows: [
      {
        label: "Processor",
        sub: "Architecture & cores",
        a: [left.specs.cpu, "3nm · 11-Core (5P + 6E)"],
        b: [right.specs.cpu, "4nm · 8-Core / 16-Thread (Zen 4)"],
      },
      {
        label: "Graphics",
        sub: "VRAM & max wattage",
        a: ["14-Core Apple GPU", "Shared VRAM, ~30 W peak"],
        b: [right.specs.gpu ?? "Integrated", "8 GB GDDR6, 90 W TGP"],
        win: "b",
      },
      {
        label: "Raw benchmark",
        sub: "Cinebench R23 multi-core",
        a: ["~14,200 pts", ""],
        b: ["~17,100 pts", ""],
        win: "b",
      },
      {
        label: "Memory & storage",
        sub: "Bandwidth & speeds",
        a: [left.specs.ram, "150 GB/s · 512 GB PCIe 4.0"],
        b: [right.specs.ram, "6400 MHz · 1 TB PCIe 4.0 NVMe"],
      },
    ],
  },
  {
    title: "Display & Creator Metrics",
    icon: Monitor,
    rows: [
      {
        label: "Panel",
        sub: "Type, Hz and resolution",
        a: [left.specs.display ?? "—", "3024×1964 @ 120Hz ProMotion"],
        b: ["14.0″ OLED (ROG Nebula)", "2880×1800 @ 120Hz"],
        win: "a",
      },
      {
        label: "Color & brightness",
        sub: "Gamut coverage & nits",
        a: ["100% DCI-P3", "600 nits SDR, 1600 nits HDR peak"],
        b: ["100% DCI-P3", "400 nits SDR, 500 nits HDR peak"],
        win: "a",
      },
    ],
  },
  {
    title: "I/O, Networking & Power",
    icon: Plug,
    tech: true,
    rows: [
      {
        label: "Ports",
        sub: "Expansion & display out",
        a: ["3× Thunderbolt 4, HDMI 2.1", "SDXC, MagSafe 3, 3.5mm"],
        b: ["1× USB4, 1× USB-C, 2× USB-A", "HDMI 2.1, microSD, 3.5mm"],
      },
      {
        label: "Battery & charging",
        sub: "Capacity & adapter",
        a: ["72.4 Wh", "70 W USB-C — very efficient"],
        b: ["73.0 Wh", "180 W AC + 100 W PD"],
        win: "a",
      },
    ],
  },
];

function MatrixCell({ value, highlighted }: { value: [string, string]; highlighted?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-xl px-4 py-3",
        highlighted && "bg-positive/[0.08] shadow-[inset_0_0_0_1px_rgba(26,127,79,0.28)]",
      )}
    >
      <span className="text-[13.5px] font-medium tabular-nums">{value[0]}</span>
      {value[1] && (
        <span className="text-[11.5px] text-muted-foreground">{value[1]}</span>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [techOpen, setTechOpen] = useState(false);
  const visibleSections = sections.filter((s) => !s.tech || techOpen);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-24 sm:px-6">
      <Link
        href="/laptops"
        className="text-brand mb-8 flex items-center gap-2 font-medium hover:underline"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Browse
      </Link>

      <h1 className="mb-1.5 text-4xl font-bold tracking-tight">Compare</h1>
      <p className="mb-10 text-sm text-muted-foreground">
        2 laptops selected · winning cells are highlighted per row
      </p>

      {/* Dual pane: radar + AI summary */}
      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-[380px_1fr]">
        <div className="border-line bg-surface flex flex-col items-center gap-2 rounded-3xl border p-6">
          <CompareRadar
            series={[
              { name: left.name, color: RADAR_COLORS[0], values: left.radar },
              { name: right.name, color: RADAR_COLORS[1], values: right.radar },
            ]}
            height={260}
          />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: RADAR_COLORS[0] }}
              />
              {left.name}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: RADAR_COLORS[1] }}
              />
              {right.name}
            </span>
          </div>
        </div>

        <div className="bg-surface-2 flex flex-col gap-3.5 rounded-3xl px-8 py-7">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            The trade-off, in short
          </span>
          <p className="text-[15px] leading-relaxed">
            These two are closer than the spec sheet suggests. The{" "}
            <strong>{left.name}</strong> gives you a sharper Mini-LED display,
            stronger sustained battery life, and a quieter, cooler chassis —
            the safer pick for long study sessions. The{" "}
            <strong>{right.name}</strong> pulls ahead on raw GPU power and
            frame rates, at the cost of battery and heat under load.
          </p>
          <p className="text-[15px] leading-relaxed">
            If your priority is <strong>portability and longevity</strong>,
            the {left.brand} model is the stronger match. If you need{" "}
            <strong>dedicated graphics headroom</strong>, the {right.brand}
            {" "}closes the gap.
          </p>
          <span className="text-[11.5px] text-muted-foreground">
            Synthesised by Pico from specs, review sentiment and stated needs
          </span>
        </div>
      </div>

      {/* Sticky glass header */}
      <div className="sticky top-20 z-40 mb-2">
        <GlassSurface
          cornerRadius={16}
          fullWidth
          className="grid grid-cols-[minmax(0,260px)_1fr_1fr] gap-2 p-3"
        >
          <div className="flex items-center pl-2 text-xs font-semibold text-muted-foreground">
            Specification
          </div>
          {[left, right].map((laptop) => (
            <div key={laptop.id} className="flex items-center gap-3 px-2 py-1">
              <Image
                src={laptop.image}
                alt={laptop.name}
                width={52}
                height={38}
                className="bg-surface-2 h-9.5 w-13 flex-none rounded-lg object-contain mix-blend-multiply dark:mix-blend-normal"
              />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">
                  {laptop.name}
                </div>
                <div className="text-[12px] font-semibold text-muted-foreground tabular-nums">
                  {laptop.price}
                </div>
              </div>
            </div>
          ))}
        </GlassSurface>
      </div>

      {/* PickScore row */}
      <div className="bg-brand-tint mb-7 grid grid-cols-[minmax(0,260px)_1fr_1fr] items-center gap-2 rounded-2xl p-3">
        <div className="pl-2">
          <div className="text-brand text-[13px] font-semibold">PickScore</div>
          <div className="text-[11px] text-muted-foreground">
            Personalised to your needs
          </div>
        </div>
        {[left, right].map((laptop) => (
          <div key={laptop.id} className="flex items-center gap-2.5 px-2">
            <PickScoreRing score={laptop.score} size={40} caption="none" />
            <span className="text-[13px] font-semibold">{laptop.match}</span>
          </div>
        ))}
      </div>

      {/* Spec groups */}
      <div className="flex flex-col gap-9">
        {visibleSections.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.title}>
              <div className="mb-3.5 flex items-center gap-2 pl-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11.5px] font-bold tracking-wide text-muted-foreground uppercase">
                  {section.title}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    className="border-line grid grid-cols-[minmax(0,260px)_1fr_1fr] items-center gap-2 border-b py-1"
                  >
                    <div className="py-3 pr-4 pl-2">
                      <div className="text-[13.5px] font-medium">{row.label}</div>
                      <div className="text-[11.5px] text-muted-foreground">
                        {row.sub}
                      </div>
                    </div>
                    <MatrixCell value={row.a} highlighted={row.win === "a"} />
                    <MatrixCell value={row.b} highlighted={row.win === "b"} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setTechOpen((o) => !o)}
        className="border-line mt-7 flex items-center gap-2 rounded-full border px-4.5 py-2 text-xs font-semibold text-muted-foreground transition hover:border-brand hover:text-brand"
      >
        <ChevronRight
          className={cn("h-3 w-3 transition-transform", techOpen && "rotate-90")}
        />
        {techOpen ? "Hide technical rows" : "Show technical rows (for the tech-savvy)"}
      </button>
    </main>
  );
}
