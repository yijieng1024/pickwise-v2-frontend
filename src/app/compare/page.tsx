import Image from "next/image";
import Link from "next/link";
import {
  BellRing,
  BrainCircuit,
  ChevronLeft,
  Cpu,
  ExternalLink,
  Monitor,
  Plug,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { CompareRadar } from "@/components/charts/compare-radar";
import { PriceHistory } from "@/components/charts/price-history";
import { laptops } from "@/lib/laptops";
import { vendorBgClass } from "@/lib/vendors";
import { cn } from "@/lib/utils";

// Validated categorical pair for the radar (brand-navy tint + purple)
const RADAR_COLORS = ["#3b6db4", "#9333ea"];
// Validated pair for the two price-history series
const PRICE_COLORS = { official: "#3b6db4", retail: "#c2571b" };

const left = laptops[0]; // MacBook Pro 14"
const right = laptops[1]; // ROG Zephyrus G14

interface MatrixRow {
  label: string;
  sub: string;
  left: [string, string];
  right: [string, string];
  winner?: "left" | "right";
}

const sections: { title: string; icon: "cpu" | "monitor" | "plug"; rows: MatrixRow[] }[] = [
  {
    title: "Core Architecture & Performance",
    icon: "cpu",
    rows: [
      {
        label: "Processor Config",
        sub: "Architecture & Nodes",
        left: ["Apple M3 Pro (3nm)", "11-Core (5P + 6E)"],
        right: ["AMD Ryzen 9 8945HS (4nm)", "8-Core / 16-Thread (Zen 4)"],
      },
      {
        label: "Graphics & TGP",
        sub: "VRAM & Max Wattage",
        left: ["14-Core Apple GPU", "Shared VRAM, ~30W Peak"],
        right: ["NVIDIA RTX 4060", "8GB GDDR6, 90W TGP (Dynamic Boost)"],
        winner: "right",
      },
      {
        label: "Raw Benchmarks",
        sub: "Cinebench R23 Multi-core",
        left: ["~ 14,500 pts", ""],
        right: ["~ 17,200 pts", ""],
        winner: "right",
      },
      {
        label: "Memory & Storage Subsystem",
        sub: "Bandwidth & Speeds",
        left: [
          "18GB Unified Memory",
          "150GB/s Bandwidth · 512GB PCIe 4.0 (~6000MB/s)",
        ],
        right: [
          "16GB LPDDR5X",
          "6400MHz Dual-Channel · 1TB PCIe 4.0 NVMe",
        ],
      },
    ],
  },
  {
    title: "Display & Creator Metrics",
    icon: "monitor",
    rows: [
      {
        label: "Panel Technology",
        sub: "Type, Hz, and Resolution",
        left: [
          '14.2" Mini-LED (Liquid Retina XDR)',
          "3024 x 1964 @ 120Hz ProMotion",
        ],
        right: ['14.0" OLED (ROG Nebula)', "2880 x 1800 @ 120Hz (0.2ms)"],
        winner: "left",
      },
      {
        label: "Color & Brightness",
        sub: "Gamut coverage & Nits",
        left: ["100% DCI-P3", "600nits SDR, 1600nits HDR Peak"],
        right: [
          "100% DCI-P3 (Pantone Validated)",
          "400nits SDR, 500nits HDR Peak",
        ],
      },
    ],
  },
  {
    title: "I/O, Networking & Power",
    icon: "plug",
    rows: [
      {
        label: "Physical Ports",
        sub: "Left and Right I/O",
        left: [
          "3x Thunderbolt 4, HDMI 2.1",
          "SDXC Reader, MagSafe 3, 3.5mm",
        ],
        right: [
          "1x USB4, 1x USB-C 3.2 Gen2, 2x USB-A",
          "HDMI 2.1, microSD, 3.5mm",
        ],
      },
      {
        label: "Battery & Charging",
        sub: "Capacity & Adapter",
        left: [
          "72.4 Wh Lithium-Polymer",
          "70W USB-C Adapter (Extremely Efficient)",
        ],
        right: ["73.0 Wh Li-ion", "180W AC Adapter + 100W PD Support"],
        winner: "left",
      },
    ],
  },
];

const sectionIcons = { cpu: Cpu, monitor: Monitor, plug: Plug };

function MatrixCell({
  value,
  highlighted,
}: {
  value: [string, string];
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "text-center text-sm",
        highlighted &&
          "rounded-lg border border-green-200 bg-green-50 p-2 font-medium dark:border-green-900 dark:bg-green-950",
      )}
    >
      {value[0]}
      {value[1] && (
        <>
          <br />
          <span
            className={cn(
              "text-xs",
              highlighted
                ? "text-green-700 dark:text-green-400"
                : "text-muted-foreground",
            )}
          >
            {value[1]}
          </span>
        </>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-24 sm:px-6 lg:px-8">
      <Link
        href="/results"
        className="mb-8 flex items-center gap-2 font-medium text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Recommendations
      </Link>

      <h2 className="mb-12 text-center text-4xl font-semibold tracking-tight">
        Smart Comparison
      </h2>

      {/* Radar trade-offs */}
      <div className="mx-auto mb-16 flex max-w-5xl flex-col items-center gap-12 rounded-3xl bg-muted p-8 md:flex-row motion-safe:animate-fade-in-up">
        <div className="w-full md:w-1/2">
          <CompareRadar
            series={[
              { name: left.name, color: RADAR_COLORS[0], values: left.radar },
              { name: right.name, color: RADAR_COLORS[1], values: right.radar },
            ]}
          />
        </div>
        <div className="w-full md:w-1/2">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wider text-primary uppercase">
            <BrainCircuit className="h-4 w-4" /> AI Insights
          </div>
          <h3 className="mb-4 text-2xl font-semibold">The Trade-offs</h3>
          <p className="mb-6 text-muted-foreground">
            Our sentiment analysis from 500+ reviews shows the MacBook Pro
            excels in <b>Build Quality</b> and <b>Battery</b>, but the Zephyrus
            offers superior raw <b>Performance</b> and better <b>Thermals</b>{" "}
            under heavy load.
          </p>
          <ul className="space-y-4">
            <li className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: RADAR_COLORS[0] }}
              />
              <span className="font-medium">{left.name}</span>
            </li>
            <li className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: RADAR_COLORS[1] }}
              />
              <span className="font-medium">{right.name}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Matrix */}
      <div className="relative mx-auto max-w-6xl">
        <div className="sticky top-16 z-40 grid grid-cols-3 gap-4 border-b bg-background/90 py-4 backdrop-blur-md sm:gap-8">
          <div />
          {[left, right].map((laptop) => {
            const lowStock = laptop.vendor.stock.includes("Low");
            return (
              <div key={laptop.id} className="text-center">
                <Image
                  src={laptop.image}
                  alt={laptop.name}
                  width={400}
                  height={260}
                  className="mx-auto mb-4 h-32 object-contain"
                />
                <h4 className="text-lg font-semibold">{laptop.name}</h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  {laptop.price}
                </p>
                <div className="flex flex-col gap-2">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      lowStock ? "text-red-500" : "text-green-600",
                    )}
                  >
                    {laptop.vendor.stock}
                  </span>
                  <a
                    href="#"
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-full px-6 py-2 font-medium text-white transition-colors",
                      vendorBgClass[laptop.vendor.type],
                    )}
                  >
                    Buy on {laptop.vendor.name}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pick Score row */}
        <div className="mt-4 grid grid-cols-3 items-center gap-4 rounded-xl bg-muted/50 px-4 py-6 sm:gap-8">
          <div className="font-semibold">Pick Score</div>
          <div className="flex flex-col items-center justify-center gap-1 text-center text-3xl font-bold text-green-600">
            <div className="flex items-center gap-2">
              {left.score} <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            <span className="text-xs font-normal text-muted-foreground">
              Perfect Match
            </span>
          </div>
          <div className="text-center text-3xl font-bold">
            {right.score}
            <div className="mt-1 text-xs font-normal text-muted-foreground">
              Good Match
            </div>
          </div>
        </div>

        {/* Spec sections */}
        {sections.map((section) => {
          const SectionIcon = sectionIcons[section.icon];
          return (
            <div key={section.title}>
              <div className="mt-8 rounded-lg bg-muted px-4 py-2">
                <h5 className="flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  <SectionIcon className="h-4 w-4" /> {section.title}
                </h5>
              </div>
              <div className="divide-y">
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-3 items-center gap-4 px-4 py-4 sm:gap-8"
                  >
                    <div>
                      <div className="font-semibold">{row.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.sub}
                      </div>
                    </div>
                    <MatrixCell
                      value={row.left}
                      highlighted={row.winner === "left"}
                    />
                    {row.label === "Raw Benchmarks" ? (
                      <div className="flex items-center justify-center gap-1 text-center text-sm font-medium text-green-600">
                        {row.right[0]} <TrendingUp className="h-3 w-3" />
                      </div>
                    ) : (
                      <MatrixCell
                        value={row.right}
                        highlighted={row.winner === "right"}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Price history */}
      <div className="mx-auto mt-16 max-w-4xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-2xl font-semibold">Price History Tracker</h3>
            <p className="mt-1 text-muted-foreground">
              Monitor real-time pricing from our vendor network.
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 self-start rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:border-foreground sm:self-auto"
          >
            <BellRing className="h-4 w-4" /> Set Price Drop Alert
          </button>
        </div>

        <div className="relative rounded-3xl border bg-card p-8 shadow-sm">
          <div className="absolute top-8 right-8 flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PRICE_COLORS.official }}
              />
              Official Store
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PRICE_COLORS.retail }}
              />
              Harvey Norman
            </span>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold">{left.name}</h4>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight">
                {left.price}
              </span>
              <span className="rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-green-800 uppercase dark:bg-green-950 dark:text-green-400">
                Good Time to Buy
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Lowest price in 30 days. Save RM 300 vs average.
            </p>
          </div>
          <PriceHistory
            months={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
            series={[
              {
                name: "Official Store (RM)",
                color: PRICE_COLORS.official,
                prices: [7499, 7499, 7299, 7299, 6999, 6999],
              },
              {
                name: "Harvey Norman (RM)",
                color: PRICE_COLORS.retail,
                dashed: true,
                prices: [7599, 7599, 7399, 7199, 7199, 7099],
              },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
