import { apiFetch, ApiError } from "./client";
import type { PickScoreFactor } from "./pickscore";
import type { BackendLaptop } from "./types";

/**
 * Apple build-to-order options (backend step 10c): GET /laptops/{id}/options and
 * GET /laptops/{id}/configure. Only active Apple standard configs have them; anything
 * else is a 404, which getLaptopOptions turns into null.
 *
 * Education prices (backend step 10d) are for the details page's Edu toggle only:
 * GET /laptops/{id}/edu-price, and `edu=true` on the two calls above, which prices the
 * configurator from the education store (409 when it has no numbers for this laptop).
 * Cards, rankings, compare, saved and Pico always show the official price.
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
  /** Priced from the education store. */
  edu?: boolean;
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
  /** Priced from the education store. */
  edu?: boolean;
  add_ons: { group: string; value: string; label: string | null; add_on_rm: number }[];
  total_rm: number;
  scores: ConfiguredScore[] | null;
  score_unavailable_reason: string | null;
  /** Only with a bearer token and a preference profile. */
  personalized_score: { score: number | null; mode: string; breakdown: PickScoreFactor[]; flags: Record<string, unknown> } | null;
}

/** Every group's pick, chip included. */
export type Picks = { chip: string } & Partial<Record<OptionGroup, string>>;

export async function getLaptopOptions(laptopId: string, edu = false): Promise<LaptopOptions | null> {
  try {
    return await apiFetch<LaptopOptions>(`/laptops/${laptopId}/options${edu ? "?edu=true" : ""}`, {
      next: { revalidate: 0 },
    });
  } catch (err) {
    // 409: configurable, but the education store's numbers for it are not stored.
    if (err instanceof ApiError && (err.status === 404 || err.status === 409)) return null;
    throw err;
  }
}

/** A laptop at its education-store price, with the Pick Scores calculated live from it. */
export interface EduPrice {
  price_rm: number;
  official_price_rm: number;
  saving_rm: number;
  checked_at: string;
  /** Whose education store, e.g. "apple_my_edu". */
  source: string;
  source_url: string | null;
  scores: ConfiguredScore[] | null;
  score_unavailable_reason: string | null;
  /** Only with a bearer token and a preference profile. */
  personalized_score: Configured["personalized_score"];
}

/** null: the laptop has no education price to show, so there is no toggle. */
export async function getEduPrice(laptopId: string, token?: string | null): Promise<EduPrice | null> {
  const body = await apiFetch<{ edu: EduPrice | null }>(`/laptops/${laptopId}/edu-price`, {
    token: token ?? undefined,
    cache: "no-store",
  });
  return body.edu;
}

export function configureLaptop(laptopId: string, picks: Picks, token?: string | null, edu = false) {
  const query = new URLSearchParams(
    Object.entries(picks).filter((e): e is [string, string] => Boolean(e[1])),
  );
  if (edu) query.set("edu", "true");
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

/** "48gb" → 48, "2tb" → 2048, "70w" → 70; a value with no number is 0. */
export function sizeOf(value: string): number {
  const m = /(\d+(?:\.\d+)?)\s*(tb)?/i.exec(value);
  if (!m) return 0;
  return Number(m[1]) * (m[2] ? 1024 : 1);
}

/**
 * The catalog row as the applied configuration would be: CPU, GPU, memory, storage,
 * display finish and adapter swapped in, and the name's bracket rebuilt from them in
 * the catalog's own shape, "(M5 Pro, 18-core CPU, 20-core GPU, 48GB RAM, 2TB SSD)".
 */
export function configuredLaptop(raw: BackendLaptop, options: LaptopOptions, c: Configured, picks: Picks): BackendLaptop {
  const kit = options.kits.find((k) => k.chip === c.chip);
  const label = (g: OptionGroup) => kit?.options[g]?.find((o) => o.value === picks[g])?.label ?? null;
  const changed = (g: OptionGroup) => Boolean(picks[g] && picks[g] !== options.standard[g] && label(g));
  const out: BackendLaptop = {
    ...raw,
    processor_model: c.cpu_model ?? raw.processor_model,
    gpu_model: c.gpu_model ?? raw.gpu_model,
    ram_gb: picks.memory ? sizeOf(picks.memory) : raw.ram_gb,
    ssd_gb: picks.storage ? sizeOf(picks.storage) : raw.ssd_gb,
  };
  if (changed("display")) out.display_type = `${raw.display_type ?? ""} (${label("display")!.toLowerCase()})`.trim();
  if (changed("adapter"))
    out.power_supply_details = raw.power_supply_details?.replace(/\d+\s*W\b/, label("adapter")!) ?? label("adapter");
  const family = (c.cpu_model ?? "").replace(/^Apple\s+/, "").replace(/\s*\(.*\)$/, "");
  const ssd = out.ssd_gb >= 1024 ? `${out.ssd_gb / 1024}TB` : `${out.ssd_gb}GB`;
  const bracket = [family, c.chip_label, `${out.ram_gb}GB RAM`, `${ssd} SSD`].filter(Boolean).join(", ");
  out.product_name = `${raw.product_name.split("(")[0].trim()} (${bracket})`;
  return out;
}

/** "+RM 1,800", "−RM 900", or "No extra cost". */
export function formatDelta(rm: number): string {
  const n = Math.round(rm);
  if (n === 0) return "No extra cost";
  return `${n > 0 ? "+" : "−"}RM ${Math.abs(n).toLocaleString()}`;
}
