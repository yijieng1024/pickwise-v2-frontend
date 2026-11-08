"use client";

import { useTheme } from "next-themes";

/**
 * Every chart colour in the app, admin and public (DESIGN.md, Data
 * Visualization). Charts name a slot, never a hex value.
 *
 * The steps were picked against these rules:
 * - Contrast ≥ 3:1 (WCAG 1.4.11, non-text graphics): light steps on #ffffff
 *   and the #fbfbfd canvas, dark steps on the #151a21 surface. Text never
 *   uses these; it stays on the text tokens at 4.5:1.
 * - Distinct pairs (CIEDE2000): closest pair ≥ 16 for normal vision, ≥ 8
 *   under simulated protan, deutan and tritan vision.
 * - ΔE ≥ 8 from the status, brand and --spark colours, with orange, amber and
 *   olive hues left out entirely so no series reads as a warning or Top Pick.
 */
export type ThemeMode = "light" | "dark";

export interface ChartColorToken {
  name: string;
  light: string;
  dark: string;
}

export interface ChartPaletteConfig {
  /** Fixed categorical slots, 0–6; a brand always gets the same slot. */
  admin: readonly ChartColorToken[];
  /** Series order for public charts (compare columns, price history). */
  public: readonly ChartColorToken[];
}

export type PaletteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A series' colour: a palette slot, or "negative" for failures (--negative). */
export type ChartSlot = PaletteIndex | "negative";

const ADMIN: readonly ChartColorToken[] = [
  { name: "indigo", light: "#4a61b9", dark: "#6b86e1" },
  { name: "rose", light: "#cf7188", dark: "#f896ad" },
  { name: "cyan", light: "#2a9cae", dark: "#51bcce" },
  { name: "leaf", light: "#609043", dark: "#71a255" },
  { name: "mauve", light: "#925786", dark: "#b87aab" },
  { name: "lavender", light: "#a07cdb", dark: "#bf9bfc" },
  { name: "jade", light: "#09816b", dark: "#42a68f" },
];

export const CHART_PALETTE: ChartPaletteConfig = {
  admin: ADMIN,
  // Leaf, lavender, mauve, rose: the four slots that stay furthest apart under
  // every simulated colour-vision type. Four because /compare takes up to four.
  public: [3, 5, 4, 1].map((i) => ADMIN[i]),
};

/**
 * A brand's fixed slot, by name, never by its rank in a list, so the colour
 * does not jump when the order changes. A brand outside the seven hashes its
 * key onto the palette: stable, but it may share a colour, which the value
 * labels and the hidden data table keep readable.
 */
const BRAND_SLOTS: Record<string, PaletteIndex> = {
  asus: 0,
  lenovo: 1,
  hp: 2,
  acer: 3,
  msi: 4,
  apple: 5,
  dell: 6,
};

function hashSlot(key: string): PaletteIndex {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (hash % ADMIN.length) as PaletteIndex;
}

/** Slot for a brand: its fixed slot by name, else a stable hash of its id. */
export function brandSlot(brandName: string, brandId: string): PaletteIndex {
  return BRAND_SLOTS[brandName.trim().toLowerCase()] ?? hashSlot(brandId);
}

/** An admin colour by slot number, or by brand name. */
export function getAdminSlotColor(brandKey: string | number, mode: ThemeMode): string {
  const slot =
    typeof brandKey === "number"
      ? brandKey % ADMIN.length
      : (BRAND_SLOTS[brandKey.trim().toLowerCase()] ?? hashSlot(brandKey));
  return ADMIN[slot][mode];
}

export function getPublicChartColor(index: number, mode: ThemeMode): string {
  const series = CHART_PALETTE.public;
  return series[index % series.length][mode];
}

/** A series' colour from the theme's admin palette. */
export function slotColor(palette: readonly string[], slot: ChartSlot): string {
  return slot === "negative" ? "var(--negative)" : palette[slot];
}

function useThemeMode(): ThemeMode {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? "dark" : "light";
}

/** The admin palette for the current theme, indexed by slot. */
export function useChartPalette(): readonly string[] {
  const mode = useThemeMode();
  return ADMIN.map((_, i) => getAdminSlotColor(i, mode));
}

/** The public series palette for the current theme. */
export function usePublicChartPalette(): readonly string[] {
  const mode = useThemeMode();
  return CHART_PALETTE.public.map((_, i) => getPublicChartColor(i, mode));
}
