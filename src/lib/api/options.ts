import { apiFetch, ApiError } from "./client";
import type { PickScoreFactor } from "./pickscore";

/**
 * Apple build-to-order options (backend step 10c): GET /laptops/{id}/options and
 * GET /laptops/{id}/configure. Only active Apple standard configs have them; anything
 * else is a 404, which getLaptopOptions turns into null.
 */
export const OPTION_GROUPS = ["memory", "storage", "adapter", "display"] as const;
export type OptionGroup = (typeof OPTION_GROUPS)[number];

export const GROUP_LABELS: Record<"chip" | OptionGroup, string> = {
  chip: "Chip",
  memory: "Memory",
  storage: "Storage",
  adapter: "Power adapter",
  display: "Display",
};

export interface OptionValue {
  value: string;
  label: string | null;
  /** RM relative to this chip kit; null when Apple prices no option of the group. */
  add_on_rm: number | null;
  is_included: boolean;
}

export interface ChipKit {
  chip: string;
  label: string | null;
  cpu_model: string | null;
  gpu_model: string | null;
  kit_price_rm: number;
  chip_add_on_rm: number;
  options: Partial<Record<OptionGroup | "keyboard", OptionValue[]>>;
}

export interface LaptopOptions {
  laptop_id: string;
  standard_chip: string;
  standard: Partial<Record<OptionGroup | "keyboard", string>>;
  standard_price_rm: number;
  kits: ChipKit[];
}

export interface ConfiguredScore {
  use_case: string;
  score: number | null;
  breakdown: PickScoreFactor[];
  flags: Record<string, unknown>;
}

export interface Configured {
  laptop_id: string;
  chip: string;
  chip_label: string | null;
  cpu_model: string | null;
  gpu_model: string | null;
  standard_price_rm: number;
  chip_add_on_rm: number;
  add_ons: { group: string; value: string; label: string | null; add_on_rm: number }[];
  total_rm: number;
  scores: ConfiguredScore[] | null;
  score_unavailable_reason: string | null;
  /** Only with a bearer token and a preference profile. */
  personalized_score: { score: number | null; mode: string; breakdown: PickScoreFactor[]; flags: Record<string, unknown> } | null;
}

/** Every group's pick, chip included. */
export type Picks = { chip: string } & Partial<Record<OptionGroup, string>>;

export async function getLaptopOptions(laptopId: string): Promise<LaptopOptions | null> {
  try {
    return await apiFetch<LaptopOptions>(`/laptops/${laptopId}/options`, { next: { revalidate: 0 } });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function configureLaptop(laptopId: string, picks: Picks, token?: string | null) {
  const query = new URLSearchParams(
    Object.entries(picks).filter((e): e is [string, string] => Boolean(e[1])),
  );
  return apiFetch<Configured>(`/laptops/${laptopId}/configure?${query}`, {
    token: token ?? undefined,
    cache: "no-store",
  });
}

const allowed = (kit: ChipKit, group: OptionGroup, value: string | undefined) =>
  Boolean(value && kit.options[group]?.some((o) => o.value === value));

const addOn = (kit: ChipKit, group: OptionGroup, value: string | undefined) =>
  kit.options[group]?.find((o) => o.value === value)?.add_on_rm ?? 0;

/**
 * The picks on *chip*: each group keeps its pick where the chip allows it, else the
 * standard config's own value, else what the chip's kit comes with. The backend's
 * choices_for, for the "+RM" labels on the cards; the total itself comes from /configure.
 */
export function picksOn(options: LaptopOptions, chip: string, picks: Picks): Picks {
  const kit = options.kits.find((k) => k.chip === chip)!;
  const out: Picks = { chip };
  for (const group of OPTION_GROUPS) {
    const values = kit.options[group];
    if (!values?.length) continue;
    const standard = options.standard[group];
    out[group] = allowed(kit, group, picks[group])
      ? picks[group]
      : allowed(kit, group, standard)
        ? standard
        : values.find((o) => o.is_included)?.value ?? values[0].value;
  }
  return out;
}

/** The kit's price plus the picks' add-ons on it. */
export function totalOf(options: LaptopOptions, picks: Picks): number {
  const kit = options.kits.find((k) => k.chip === picks.chip)!;
  return OPTION_GROUPS.reduce((sum, g) => sum + addOn(kit, g, picks[g]), kit.kit_price_rm);
}

/** Chips that allow *value* for *group*, cheapest first. */
export function chipsOffering(options: LaptopOptions, group: OptionGroup, value: string): ChipKit[] {
  return options.kits.filter((k) => allowed(k, group, value)).sort((a, b) => a.kit_price_rm - b.kit_price_rm);
}

export const chipAllows = (options: LaptopOptions, chip: string, group: OptionGroup, value: string) =>
  allowed(options.kits.find((k) => k.chip === chip)!, group, value);

export function standardPicks(options: LaptopOptions): Picks {
  return picksOn(options, options.standard_chip, { chip: options.standard_chip, ...options.standard });
}

/** "+RM 1,800", "−RM 900", or "No extra cost". */
export function formatDelta(rm: number): string {
  const n = Math.round(rm);
  if (n === 0) return "No extra cost";
  return `${n > 0 ? "+" : "−"}RM ${Math.abs(n).toLocaleString()}`;
}
