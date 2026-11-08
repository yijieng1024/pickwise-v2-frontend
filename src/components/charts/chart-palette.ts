"use client";

import { useTheme } from "next-themes";

/**
 * Every chart colour in the app, admin and public (DESIGN.md, Data
 * Visualization). Charts name a slot, never a hex value.
 *
 * The steps were picked against these rules:
 * - Contrast ≥ 4.5:1: light steps on #ffffff and the #f8fafc canvas, dark
 *   steps on the #151a21 surface.
 * - No functional colour impersonated: not the AI mint (#10b981), the Top Pick
 *   amber (#f59e0b / #d97706), the interactive azure (#2563eb), or the status
 *   warning, negative and positive tones. Coral and sage are kept at low
 *   chroma for that reason, so neither reads as an alert or a "good" state.
 * - Muted chroma throughout: data-vis tones, not UI accents.
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

const ADMIN: readonly ChartColorToken[] = [
  { name: "steel blue", light: "#3b64a8", dark: "#7da2e0" },
  { name: "slate cyan", light: "#1f6f86", dark: "#5fb3c9" },
  { name: "amethyst", light: "#7a55a8", dark: "#b293dd" },
  { name: "coral", light: "#a85a5e", dark: "#e09398" },
  { name: "sage", light: "#62735a", dark: "#a3b496" },
  { name: "plum", light: "#9c4477", dark: "#dc84b8" },
  { name: "slate", light: "#5c6675", dark: "#9aa4b2" },
];

export const CHART_PALETTE: ChartPaletteConfig = {
  admin: ADMIN,
  // The same tokens, reordered: blue then coral first, the colour-blind-safe
  // pair, since a two-laptop comparison is the common case. Four entries
  // because /compare takes up to four laptops.
  public: [0, 3, 2, 1].map((i) => ADMIN[i]),
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
