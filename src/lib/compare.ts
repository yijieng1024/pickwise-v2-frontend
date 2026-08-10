/**
 * Comparison model for `/compare`.
 *
 * Plain TypeScript on purpose: the `/compare` Server Component builds the
 * matrix with it, and the browse page's selection bar imports the same limit
 * and link builder from the client side. Nothing here may import a component
 * or a client module (see the note on client-module imports in CLAUDE.md).
 */

import type { PickScoreFactor, UseCasePickScore } from "@/lib/api/pickscore";
import type { BackendLaptop } from "@/lib/api/types";

/**
 * Four columns is where the matrix stops being readable: at 1280px each column
 * is ~260px, which is the narrowest a spec value like "3× Thunderbolt 4,
 * HDMI 2.1" survives without wrapping to three lines.
 */
export const MAX_COMPARE = 4;

/** The `ids` query parameter, deduped, trimmed and capped at MAX_COMPARE. */
export function parseCompareIds(raw: string | string[] | undefined): string[] {
  const joined = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const seen = new Set<string>();
  for (const id of joined.split(",")) {
    const trimmed = id.trim();
    if (trimmed) seen.add(trimmed);
    if (seen.size >= MAX_COMPARE) break;
  }
  return [...seen];
}

export function compareHref(ids: string[]): string {
  return `/compare?ids=${ids.slice(0, MAX_COMPARE).join(",")}`;
}

/**
 * One laptop's PickScore, flattened so the same builders work on the
 * server-rendered baseline and on the personalized overlay that replaces it.
 */
export interface ScoreSnapshot {
  score: number;
  breakdown: PickScoreFactor[];
  /** Use case the score came from; `null` once personalized. */
  label: string | null;
}

/** The minimum the score-driven builders need, so they can also run client-side. */
export interface ScoredLaptop {
  id: string;
  name: string;
  score: ScoreSnapshot | null;
}

/** One laptop's column: spec sheet plus its PickScore. */
export interface CompareLaptop extends ScoredLaptop {
  brand: string;
  price: string;
  image: string | null;
  raw: BackendLaptop;
}

/**
 * The score `/compare` shows before personalization, matching the details
 * page's hero ring: the highest-scoring of the five use cases, not
 * `general_use`. A laptop that scores 78 for gaming and 53 generally is a
 * gaming laptop, and showing 53 in both places would make the two pages
 * disagree about the same machine.
 */
export function bestFitSnapshot(scores: UseCasePickScore[] | undefined): ScoreSnapshot | null {
  if (!scores?.length) return null;
  const best = [...scores].sort((a, b) => b.score - a.score)[0];
  return { score: best.score, breakdown: best.breakdown, label: best.use_case };
}

export interface CompareCell {
  text: string;
  sub?: string;
  /** Basis for picking a winner. `null` means the row isn't rankable. */
  value: number | null;
}

export interface CompareRow {
  label: string;
  sub: string;
  cells: CompareCell[];
  /**
   * Column indices tied for best. Empty when the row isn't rankable, when a
   * value is missing, or when every column ties — highlighting all of them
   * would mark the row as meaningful when it isn't.
   */
  winners: number[];
}

export interface CompareSection {
  /** Maps to an icon in the view; keeps this module free of components. */
  key: "performance" | "display" | "power" | "io";
  title: string;
  /** Hidden behind the "technical rows" disclosure. */
  tech?: boolean;
  rows: CompareRow[];
}

/**
 * The eight factors the backend's PickScore engine scores every laptop on
 * (`app/pickscore/engine.py`), in the order they read best as radar axes:
 * capability first, then the practical trade-offs, then the soft factors.
 */
export const PICKSCORE_FACTORS = [
  { key: "cpu", label: "Processor" },
  { key: "gpu", label: "Graphics" },
  { key: "ram_storage", label: "Memory" },
  { key: "screen_size", label: "Screen" },
  { key: "battery", label: "Battery" },
  { key: "portability", label: "Portability" },
  { key: "price", label: "Value" },
  { key: "brand", label: "Brand" },
] as const;

export const FACTOR_AXES = PICKSCORE_FACTORS.map((f) => f.label);

/**
 * Placeholder for a spec the catalog doesn't carry. Words rather than a dash:
 * a screen reader announces "not listed" instead of a punctuation mark, and it
 * distinguishes "we don't know" from a real zero.
 */
const EMPTY = "Not listed";

function text(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY;
}

/**
 * Prefixes a component's maker, unless the scraped model string already names
 * it — `processor_brand: "Apple"` with `processor_model: "Apple M5 (10-core)"`
 * is common in the catalog and rendered as "Apple Apple M5" without this.
 */
function withBrand(brand: string | null, model: string): string {
  const name = model.trim();
  const maker = brand?.trim();
  if (!maker) return name;
  if (!name) return maker;
  return name.toLowerCase().includes(maker.toLowerCase()) ? name : `${maker} ${name}`;
}

/** Joins the parts that are actually present, so nothing renders as "null 14". */
function join(parts: Array<string | number | null | undefined>, separator = " "): string {
  return parts
    .map((part) => (typeof part === "number" ? String(part) : part?.trim()))
    .filter((part): part is string => Boolean(part))
    .join(separator);
}

/**
 * Marks the best cell(s). A tie across every column is treated as no winner:
 * four laptops that all ship 16 GB tells the reader nothing, and lighting the
 * whole row up buries the rows that do separate them.
 */
function markWinners(cells: CompareCell[], better: "higher" | "lower"): number[] {
  const ranked = cells
    .map((cell, index) => ({ index, value: cell.value }))
    .filter((entry): entry is { index: number; value: number } => entry.value !== null);

  if (ranked.length < 2) return [];

  const best = ranked.reduce(
    (acc, entry) =>
      better === "higher" ? Math.max(acc, entry.value) : Math.min(acc, entry.value),
    ranked[0].value,
  );
  const winners = ranked.filter((entry) => entry.value === best).map((entry) => entry.index);
  return winners.length === cells.length ? [] : winners;
}

function row(
  label: string,
  sub: string,
  cells: CompareCell[],
  better?: "higher" | "lower",
): CompareRow {
  return { label, sub, cells, winners: better ? markWinners(cells, better) : [] };
}

/** A cell whose value can't be ranked — names, port lists, panel types. */
function plain(text: string, sub?: string): CompareCell {
  return { text, sub, value: null };
}

/** A measured cell. `null`/0 reads as "not recorded" rather than "worst". */
function measured(
  amount: number | null | undefined,
  format: (n: number) => string,
  sub?: string,
): CompareCell {
  if (amount === null || amount === undefined || amount <= 0) {
    return { text: EMPTY, sub, value: null };
  }
  return { text: format(amount), sub, value: amount };
}

export function buildCompareSections(laptops: CompareLaptop[]): CompareSection[] {
  const each = <T,>(fn: (raw: BackendLaptop) => T): T[] => laptops.map((l) => fn(l.raw));

  return [
    {
      key: "performance",
      title: "Core Architecture & Performance",
      rows: [
        row(
          "Processor",
          "Model, cores and clock",
          each((r) =>
            plain(
              text(withBrand(r.processor_brand, r.processor_model)),
              join(
                [
                  r.cpu_cores ? `${r.cpu_cores} cores` : null,
                  r.cpu_threads ? `${r.cpu_threads} threads` : null,
                  r.processor_ghz,
                ],
                " · ",
              ) || undefined,
            ),
          ),
        ),
        row(
          "Graphics",
          "GPU and core count",
          each((r) =>
            plain(
              text(withBrand(r.gpu_brand, r.gpu_model)),
              r.gpu_cores ? `${r.gpu_cores} cores` : undefined,
            ),
          ),
        ),
        row(
          "Memory",
          "Installed RAM",
          each((r) =>
            measured(
              r.ram_gb,
              (n) => `${n} GB`,
              join(
                [
                  r.ram_type,
                  r.ram_upgradable
                    ? `upgradable${r.max_ram_gb ? ` to ${r.max_ram_gb} GB` : ""}`
                    : "soldered",
                ],
                " · ",
              ) || undefined,
            ),
          ),
          "higher",
        ),
        row(
          "Storage",
          "SSD capacity",
          each((r) =>
            measured(
              r.ssd_gb,
              (n) => (n >= 1024 ? `${n / 1024} TB` : `${n} GB`),
              join([r.storage_type, r.storage_upgradable ? "upgradable" : null], " · ") ||
                undefined,
            ),
          ),
          "higher",
        ),
        row(
          "AI acceleration",
          "On-device NPU",
          each((r) =>
            r.npu_model || r.npu_tops
              ? plain(text(r.npu_model), r.npu_tops ? `${r.npu_tops} TOPS` : undefined)
              : plain(r.ai_ready ? "AI-ready" : EMPTY),
          ),
        ),
      ],
    },
    {
      key: "display",
      title: "Display",
      rows: [
        row(
          "Panel",
          "Size, type and resolution",
          each((r) =>
            plain(
              text(join([r.display_size_inch ? `${r.display_size_inch}″` : null, r.display_type])),
              join([r.display_resolution, r.touchscreen ? "touchscreen" : null], " · ") ||
                undefined,
            ),
          ),
        ),
        row(
          "Refresh rate",
          "Higher is smoother",
          each((r) => measured(r.display_refresh_rate_hz, (n) => `${n} Hz`)),
          "higher",
        ),
        row(
          "Brightness",
          "Peak SDR brightness",
          each((r) => measured(r.display_brightness_nits, (n) => `${n} nits`)),
          "higher",
        ),
      ],
    },
    {
      key: "power",
      title: "Portability & Power",
      rows: [
        row(
          "Weight",
          "Lower is easier to carry",
          each((r) => measured(r.weight_kg, (n) => `${n} kg`, r.dimensions_cm ?? undefined)),
          "lower",
        ),
        row(
          "Battery",
          "Rated capacity",
          each((r) =>
            measured(r.battery_wh, (n) => `${n} Wh`, r.power_supply_details ?? undefined),
          ),
          "higher",
        ),
      ],
    },
    {
      key: "io",
      title: "I/O, Networking & Extras",
      tech: true,
      rows: [
        row(
          "Ports",
          "Expansion and display out",
          // Comma-separated, not middle-dots: a port list runs to five or six
          // entries, and that many dots in one cell reads as decoration. The
          // two-part specs above keep the app's "·" separator.
          each((r) => plain(r.ports_summary.length ? r.ports_summary.join(", ") : EMPTY)),
        ),
        row(
          "Wireless",
          "Wi-Fi and Bluetooth",
          each((r) => plain(text(r.wifi_standard), r.bluetooth_version ?? undefined)),
        ),
        row(
          "Operating system",
          "As shipped",
          each((r) =>
            plain(text(r.os), r.microsoft_office_included ? "Office included" : undefined),
          ),
        ),
        row("Warranty", "Manufacturer cover", each((r) => plain(text(r.warranty_details)))),
      ],
    },
  ];
}

/** Looks up one factor's 0–100 score before weighting. */
function factorScore(score: ScoreSnapshot | null, key: string): number | null {
  const match: PickScoreFactor | undefined = score?.breakdown.find((f) => f.factor === key);
  return match ? match.raw_score : null;
}

/** One row per PickScore factor, ranked highest-wins. */
export function buildFactorRows(laptops: ScoredLaptop[]): CompareRow[] {
  return PICKSCORE_FACTORS.map((factor) =>
    row(
      factor.label,
      "Score out of 100",
      laptops.map((laptop) => {
        const value = factorScore(laptop.score, factor.key);
        return value === null ? { text: EMPTY, value: null } : { text: String(Math.round(value)), value };
      }),
      "higher",
    ),
  );
}

/** Radar values per laptop, in FACTOR_AXES order. Missing factors plot as 0. */
export function factorSeries(laptop: ScoredLaptop): number[] {
  return PICKSCORE_FACTORS.map((factor) => factorScore(laptop.score, factor.key) ?? 0);
}

export interface CompareLead {
  id: string;
  name: string;
  /** Factors this laptop scores strictly highest on, widest margin first. */
  leads: string[];
}

/**
 * What each laptop is actually best at, derived from the factor scores rather
 * than written by a model.
 *
 * A laptop "leads" a factor only when it beats every other column outright —
 * a tie means the factor doesn't separate them, so it is credited to nobody.
 * Factors are ordered by how far ahead the leader is, so the two reported are
 * the two real differences rather than the first two in the list.
 */
export function buildLeads(laptops: ScoredLaptop[], perLaptop = 2): CompareLead[] {
  const margins = new Map<string, Array<{ label: string; margin: number }>>();

  for (const factor of PICKSCORE_FACTORS) {
    const scored = laptops
      .map((laptop) => ({ id: laptop.id, value: factorScore(laptop.score, factor.key) }))
      .filter((entry): entry is { id: string; value: number } => entry.value !== null)
      .sort((a, b) => b.value - a.value);

    if (scored.length < 2 || scored[0].value === scored[1].value) continue;

    const winner = scored[0];
    const existing = margins.get(winner.id) ?? [];
    existing.push({ label: factor.label, margin: winner.value - scored[1].value });
    margins.set(winner.id, existing);
  }

  return laptops.map((laptop) => ({
    id: laptop.id,
    name: laptop.name,
    leads: (margins.get(laptop.id) ?? [])
      .sort((a, b) => b.margin - a.margin)
      .slice(0, perLaptop)
      .map((entry) => entry.label),
  }));
}

/** The single highest overall PickScore, or null when nothing outranks the rest. */
export function bestOverall(laptops: ScoredLaptop[]): ScoredLaptop | null {
  const scored = laptops
    .filter((laptop) => laptop.score !== null)
    .sort((a, b) => b.score!.score - a.score!.score);

  if (scored.length < 2 || scored[0].score!.score === scored[1].score!.score) return null;
  return scored[0];
}
