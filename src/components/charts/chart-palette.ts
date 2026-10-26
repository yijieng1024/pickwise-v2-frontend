"use client";

import { useTheme } from "next-themes";

/**
 * The one chart palette for the admin (DESIGN.md, Data Visualization). Each
 * mode has its own steps, validated against its chart surface: light against
 * #ffffff, dark against #151a21. Order is the series order.
 *
 * Every step passes 3:1 against its surface, so no chart needs a visible
 * table. The brand bars keep their value labels, and every chart carries a
 * hidden data table for screen readers (ChartDataTable).
 */
export const CHART_PALETTE = {
  light: ["#2a78d6", "#d9622b", "#0e8aa8", "#b07800", "#cf5a8a", "#2f8a2f", "#6250d6"],
  dark: ["#3987e5", "#d95926", "#1a9fbf", "#c98500", "#d55181", "#008300", "#9085e9"],
} as const;

export type PaletteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The palette for the current theme. */
export function useChartPalette(): readonly string[] {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? CHART_PALETTE.dark : CHART_PALETTE.light;
}

/**
 * A brand's fixed palette slot, by name, never by its rank in a list: the
 * colour must not jump when the order changes. The seven brands in the catalog
 * have a slot each; a new one hashes its id onto the palette (stable, but may
 * share a colour, which the value labels and the table keep readable).
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

export function brandSlot(brandName: string, brandId: string): PaletteIndex {
  const fixed = BRAND_SLOTS[brandName.trim().toLowerCase()];
  if (fixed !== undefined) return fixed;
  let hash = 0;
  for (const ch of brandId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (hash % 7) as PaletteIndex;
}
