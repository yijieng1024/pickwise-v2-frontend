/**
 * A laptop page's title and description, built by code from the laptop's own data (the
 * details page's generateMetadata). No LLM, and never the Education price: the price
 * here is the official one, or the official build-to-order total of a configuration.
 *
 * Pure: no fetch.
 */
export interface LaptopMetaInput {
  /** The name the page heading shows: the configured name on a link with a configuration. */
  name: string;
  processor?: string | null;
  gpu?: string | null;
  ramGb?: number | null;
  ssdGb?: number | null;
  displayInch?: number | null;
  weightKg?: number | null;
  /** Official price in RM. 0, null or undefined: no price to state. */
  priceRm?: number | null;
  /** The price is a configuration's build-to-order total, not a catalog laptop's. */
  configured?: boolean;
}

export const SITE_NAME = "PickWise";
/** Search results show about this much of a description. */
export const DESCRIPTION_MAX = 160;

const TAIL = "Pick Score, reviews and price history on PickWise.";

function specParts(input: LaptopMetaInput): string[] {
  const storage =
    input.ssdGb && input.ssdGb >= 1024 && input.ssdGb % 1024 === 0 ? `${input.ssdGb / 1024}TB SSD` : `${input.ssdGb}GB SSD`;
  return [
    input.processor?.trim(),
    input.gpu?.trim(),
    input.ramGb ? `${input.ramGb}GB RAM` : null,
    input.ssdGb ? storage : null,
    input.displayInch ? `${input.displayInch}-inch display` : null,
    input.weightKg ? `${input.weightKg} kg` : null,
  ].filter((part): part is string => Boolean(part));
}

/**
 * - Title: "{name} | PickWise". The name is never cut: on a configured link it is what
 *   tells one configuration from another.
 * - Description: the key specs, then the price, then one line about the page. It stays
 *   within DESCRIPTION_MAX by leaving out whole parts, last spec first, never by cutting
 *   one in the middle; the price is the last thing to go.
 * - No price sentence when there is no price: "RM 0" is never written.
 */
export function laptopMeta(input: LaptopMetaInput): { title: string; description: string } {
  const title = `${input.name} | ${SITE_NAME}`;
  const price = input.priceRm
    ? `${input.configured ? "Build-to-order price" : "Official price"} RM ${Math.round(input.priceRm).toLocaleString("en-MY")}.`
    : null;

  const parts = specParts(input);
  const compose = (specs: string[], tail: boolean) =>
    [specs.length ? `${specs.join(", ")}.` : null, price, tail ? TAIL : null].filter(Boolean).join(" ");

  for (let kept = parts.length; kept >= 0; kept--) {
    for (const tail of [true, false]) {
      const text = compose(parts.slice(0, kept), tail);
      if (text && text.length <= DESCRIPTION_MAX) return { title, description: text };
    }
  }
  return { title, description: TAIL };
}
