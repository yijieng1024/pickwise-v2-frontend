import {
  GROUP_LABELS,
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
 * Pure: no fetch, no router. The details page reads a link with `readConfigLink` on the
 * server and the browser tidies the address with `cleanConfigSearch`.
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

export interface ConfigLink {
  /** The configuration the link asks for, after dropping what is not available; null: the standard config. */
  picks: Picks | null;
  /** The address this link should have: the picks' own path. */
  path: string;
  /** One line when an option in the link was not available on this laptop; else null. */
  notice: string | null;
}

/**
 * What a details-page link means for this laptop: which of its params are valid for the
 * laptop's options, the address that says exactly that, and the notice to show.
 *
 * - Every param valid: those picks, no notice.
 * - A value the chip does not allow: that param is dropped, the rest kept, with a notice.
 * - A chip that is not offered: the standard config, with a notice.
 * - Picks that are the standard config's own: the standard config, the plain path, no notice.
 * - A laptop with no options: the plain path and no notice, whatever the params.
 */
export function readConfigLink(laptopId: string, params: RawParams, options: LaptopOptions | null): ConfigLink {
  const { picks, dropped } = parseConfigParams(params, options);
  const path = options && picks ? buildConfigPath(laptopId, options, picks) : `/laptops/${laptopId}`;
  return { picks, path, notice: options ? noticeFor(dropped) : null };
}

function noticeFor(dropped: ConfigParam[]): string | null {
  if (dropped.length === 0) return null;
  if (dropped.includes("chip")) {
    return "The chip in this link is not available for this laptop, so the standard configuration is shown.";
  }
  const names = dropped.map((p) => GROUP_LABELS[p].toLowerCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return `The ${list} in this link ${names.length > 1 ? "are" : "is"} not available with this chip, so ${
    names.length > 1 ? "they were" : "it was"
  } left out.`;
}

/**
 * The query string the address should have for *path* (a `ConfigLink.path`), given the
 * one it has now: the configuration's params first, in their fixed order, then every
 * param that is not ours (a campaign tag stays). "" for none, else with its "?".
 */
export function cleanConfigSearch(search: string, path: string): string {
  const next = new URLSearchParams(path.split("?")[1] ?? "");
  const ours = new Set<string>(CONFIG_PARAMS);
  for (const [name, value] of new URLSearchParams(search)) {
    if (!ours.has(name)) next.append(name, value);
  }
  const query = next.toString();
  return query ? `?${query}` : "";
}
