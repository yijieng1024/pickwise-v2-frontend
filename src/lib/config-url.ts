import {
  OPTION_GROUPS,
  chipAllows,
  picksOn,
  standardPicks,
  type LaptopOptions,
  type OptionGroup,
  type Picks,
} from "./api/options";

/**
 * The configuration in the details page's URL (backend plan step 10d+, "The URL rule"):
 * `/laptops/{id}?chip=m5pro-18-20&memory=48gb&storage=2tb`, the same names and values
 * GET /laptops/{id}/configure takes.
 *
 * - Picks that are the standard config's own are the plain `/laptops/{id}`.
 * - Otherwise chip, memory and storage are always written; adapter and display only when
 *   they differ from what the chip's kit comes with.
 * - The order is fixed, so one configuration has one URL. Never the keyboard, never Edu.
 *
 * The backend builds the same path for Pico (options_service.config_path). Both are held
 * to config-url.cases.json, which is the backend's tests/unit/fixtures/config_url_cases.json.
 *
 * Pure: no fetch, no router. Used by nothing yet.
 */
export const CONFIG_PARAMS = ["chip", ...OPTION_GROUPS] as const;
export type ConfigParam = (typeof CONFIG_PARAMS)[number];

/** Next's `searchParams` object, or a URLSearchParams. */
export type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

const isStandard = (options: LaptopOptions, picks: Picks): boolean => {
  const standard = standardPicks(options);
  return CONFIG_PARAMS.every((p) => picks[p] === standard[p]);
};

const kitComesWith = (options: LaptopOptions, chip: string, group: OptionGroup) =>
  options.kits.find((k) => k.chip === chip)?.options[group]?.find((o) => o.is_included)?.value;

/** The details page's path for *picks* (every group's pick, as `picksOn` gives them). */
export function buildConfigPath(laptopId: string, options: LaptopOptions, picks: Picks): string {
  const plain = `/laptops/${laptopId}`;
  if (isStandard(options, picks)) return plain;
  const query = new URLSearchParams();
  for (const param of CONFIG_PARAMS) {
    const value = picks[param];
    if (!value) continue;
    const optional = param === "adapter" || param === "display";
    if (optional && value === kitComesWith(options, picks.chip, param)) continue;
    query.set(param, value);
  }
  return `${plain}?${query}`;
}

export interface ParsedConfig {
  /** The configuration to show; null for the standard config (no, or no usable, params). */
  picks: Picks | null;
  /** The params that were given and not used, for the one-line notice. */
  dropped: ConfigParam[];
}

/** A param's first value, trimmed and lower-cased; undefined when absent or empty. */
function read(params: RawParams, name: string): string | undefined {
  const raw = params instanceof URLSearchParams ? params.get(name) : params[name];
  const first = Array.isArray(raw) ? raw[0] : raw;
  return first?.trim().toLowerCase() || undefined;
}

/**
 * The picks a URL's params ask for, checked against the laptop's options (null: it has
 * none). A value the chip does not allow drops only that param; a chip that is not
 * offered drops everything, because memory and storage depend on the chip. Params this
 * rule does not know are ignored, and a repeated param counts once, by its first value.
 */
export function parseConfigParams(params: RawParams, options: LaptopOptions | null): ParsedConfig {
  const given: Partial<Record<ConfigParam, string>> = {};
  for (const param of CONFIG_PARAMS) {
    const value = read(params, param);
    if (value) given[param] = value;
  }
  const all = CONFIG_PARAMS.filter((p) => given[p]);
  if (all.length === 0) return { picks: null, dropped: [] };

  const chip = given.chip ?? options?.standard_chip;
  if (!options || !options.kits.some((k) => k.chip === chip)) return { picks: null, dropped: all };

  const asked: Picks = { chip: chip! };
  const dropped: ConfigParam[] = [];
  for (const group of OPTION_GROUPS) {
    const value = given[group];
    if (!value) continue;
    if (chipAllows(options, chip!, group, value)) asked[group] = value;
    else dropped.push(group);
  }
  const picks = picksOn(options, chip!, asked);
  return { picks: isStandard(options, picks) ? null : picks, dropped };
}
