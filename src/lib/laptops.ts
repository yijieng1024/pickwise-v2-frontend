export interface XaiFactor {
  name: string;
  /** Point contribution toward the PickScore; positive or negative. */
  value: number;
}

export interface ReviewPoint {
  /** Paraphrased reviewer point — never a verbatim quote. */
  point: string;
  channel: string;
  timestampLabel: string;
  /** true = strength ("what reviewers love"), false = weakness ("watch out for"). */
  strength: boolean;
}

export interface Benchmark {
  label: string;
  sub: string;
  /** 0–100, relative to the best laptop in the same budget band. */
  pct: number;
}

export interface Laptop {
  /** Backend laptop UUID. */
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: string;
  priceValue: number;
  score: number;
  image: string;
  /** All product photos (first one = `image`); fall back to `[image]` when absent. */
  images?: string[];
  badge: string;
  badgeClass: string;
  specs: { cpu: string; ram: string; display?: string; gpu?: string };
  /** Short feature/category chips shown on cards and the details page */
  tags: string[];
  plainEnglish: { icon: string; text: string }[];
  /** Performance, Portability, Battery, Display, Build Quality, Thermals (0–100) */
  radar: [number, number, number, number, number, number];
  /** 8-factor PickScore breakdown shown in the XAI popover */
  xaiFactors: XaiFactor[];
  match: string;
  sentiment: { summary: string; reviews: ReviewPoint[] };
  community?: { battery: string; cinebench: string; users: number };
  accessories?: { name: string; price: string; icon: string }[];
  benchmarks?: Benchmark[];
}

export const RADAR_AXES = [
  "Performance",
  "Portability",
  "Battery",
  "Display",
  "Build Quality",
  "Thermals",
] as const;
