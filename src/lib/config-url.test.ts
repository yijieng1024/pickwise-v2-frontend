import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { LaptopOptions, Picks } from "./api/options";
import shared from "./config-url.cases.json";
import { buildConfigPath, cleanConfigSearch, isStandardConfig, parseConfigParams, readConfigLink } from "./config-url";

/**
 * The shared cases are the backend's: the Pro 14 Liquid Retina M6 standard config
 * (m6-12-12, 16GB, 1TB; its kit comes with the 70W adapter and the standard display).
 */
const options = shared.options as unknown as LaptopOptions;
const ID = "{id}";
const STANDARD: Picks = { chip: "m6-12-12", memory: "16gb", storage: "1tb", adapter: "70w", display: "standard" };

const parse = (query: string) => parseConfigParams(new URLSearchParams(query), options);

describe("buildConfigPath", () => {
  it.each(shared.cases)("$name", ({ picks, path }) => {
    expect(buildConfigPath(ID, options, picks)).toBe(path);
  });

  it("writes the params in one fixed order whatever order the picks hold them in", () => {
    const picks: Picks = { display: "nano_texture", adapter: "96w", storage: "1tb", memory: "32gb", chip: "m6-12-12" };
    expect(buildConfigPath(ID, options, picks)).toBe(
      "/laptops/{id}?chip=m6-12-12&memory=32gb&storage=1tb&adapter=96w&display=nano_texture",
    );
  });
});

describe("the shared cases file", () => {
  const backend = resolve(__dirname, "../../../pickwise-v2-backend/tests/unit/fixtures/config_url_cases.json");

  // Local only: the two repos sit side by side. Without the backend there is nothing to compare.
  it.skipIf(!existsSync(backend))("is the backend's, so the two builders answer the same cases", () => {
    expect(shared).toEqual(JSON.parse(readFileSync(backend, "utf-8")));
  });
});

describe("parseConfigParams", () => {
  it.each(shared.cases)("reads back: $name", ({ picks, path }) => {
    const query = path.split("?")[1] ?? "";
    // The standard config's own picks are no configuration.
    expect(parse(query)).toEqual({ picks: query ? picks : null, dropped: [] });
  });

  it("gives no configuration for no params", () => {
    expect(parse("")).toEqual({ picks: null, dropped: [] });
  });

  it("gives no configuration for params that are the standard config's own", () => {
    expect(parse("chip=m6-12-12&memory=16gb&storage=1tb")).toEqual({ picks: null, dropped: [] });
  });

  it("ignores a param it does not know", () => {
    expect(parse("memory=32gb&utm_source=x&edu=true&keyboard=none")).toEqual({
      picks: { ...STANDARD, memory: "32gb" },
      dropped: [],
    });
  });

  it("takes a repeated param once, by its first value", () => {
    expect(parse("memory=32gb&memory=24gb").picks).toEqual({ ...STANDARD, memory: "32gb" });
    expect(parseConfigParams({ memory: ["32gb", "24gb"], storage: "2tb" }, options).picks).toEqual({
      ...STANDARD,
      memory: "32gb",
      storage: "2tb",
    });
  });

  it("treats an empty value as not given", () => {
    expect(parse("memory=&storage=2tb")).toEqual({ picks: { ...STANDARD, storage: "2tb" }, dropped: [] });
    expect(parse("chip=&memory=")).toEqual({ picks: null, dropped: [] });
    expect(parseConfigParams({ memory: undefined, storage: "  " }, options)).toEqual({ picks: null, dropped: [] });
  });

  it("gives the same result for the same params in another order", () => {
    const ordered = parse("chip=m5pro-15-16&memory=48gb&storage=2tb&adapter=96w");
    expect(parse("adapter=96w&storage=2tb&memory=48gb&chip=m5pro-15-16")).toEqual(ordered);
    expect(ordered.picks).toEqual({
      chip: "m5pro-15-16",
      memory: "48gb",
      storage: "2tb",
      adapter: "96w",
      display: "standard",
    });
  });

  it("reads values whatever their case", () => {
    expect(parse("memory=32GB&storage=4TB").picks).toEqual({ ...STANDARD, memory: "32gb", storage: "4tb" });
  });

  it("uses the standard chip when none is given", () => {
    expect(parse("storage=4tb").picks?.chip).toBe("m6-12-12");
  });

  it("drops only the param the chip does not allow, and keeps the rest", () => {
    expect(parse("chip=m6-12-12&memory=999gb&storage=4tb")).toEqual({
      picks: { ...STANDARD, storage: "4tb" },
      dropped: ["memory"],
    });
    // 16GB exists, but not on the M5 Pro: memory falls to what that kit comes with.
    expect(parse("chip=m5pro-15-16&memory=16gb&storage=2tb")).toEqual({
      picks: { chip: "m5pro-15-16", memory: "24gb", storage: "2tb", adapter: "70w", display: "standard" },
      dropped: ["memory"],
    });
  });

  it("falls back to the whole standard config when the chip is not offered", () => {
    expect(parse("chip=m9-1-1&memory=32gb&storage=4tb")).toEqual({
      picks: null,
      dropped: ["chip", "memory", "storage"],
    });
  });

  it("drops every param on a laptop with no options", () => {
    expect(parseConfigParams(new URLSearchParams("chip=m6-12-12&memory=32gb"), null)).toEqual({
      picks: null,
      dropped: ["chip", "memory"],
    });
  });

  it("reads back what the builder writes", () => {
    const picks: Picks = { chip: "m5pro-18-20", memory: "64gb", storage: "4tb", adapter: "96w", display: "nano_texture" };
    const path = buildConfigPath(ID, options, picks);
    expect(path).toBe("/laptops/{id}?chip=m5pro-18-20&memory=64gb&storage=4tb&display=nano_texture");
    expect(parse(path.split("?")[1])).toEqual({ picks, dropped: [] });
  });
});

describe("readConfigLink", () => {
  const read = (query: string, opts: LaptopOptions | null = options) =>
    readConfigLink(ID, new URLSearchParams(query), opts);

  it("keeps a link whose params are all valid, with no notice", () => {
    expect(read("chip=m5pro-15-16&memory=48gb&storage=2tb&adapter=96w")).toEqual({
      picks: { chip: "m5pro-15-16", memory: "48gb", storage: "2tb", adapter: "96w", display: "standard" },
      path: "/laptops/{id}?chip=m5pro-15-16&memory=48gb&storage=2tb&adapter=96w",
      notice: null,
    });
  });

  it("drops a memory the chip does not have, keeps the rest and says so", () => {
    // 16GB exists on the M6, not on the M5 Pro.
    const link = read("chip=m5pro-15-16&memory=16gb&storage=2tb");
    expect(link.picks).toEqual({ chip: "m5pro-15-16", memory: "24gb", storage: "2tb", adapter: "70w", display: "standard" });
    expect(link.path).toBe("/laptops/{id}?chip=m5pro-15-16&memory=24gb&storage=2tb");
    expect(link.notice).toBe("The memory in this link is not available with this chip, so it was left out.");
  });

  it("drops a value nothing offers, keeps the rest and says so", () => {
    const link = read("memory=999gb&storage=4tb&display=matte");
    expect(link.picks).toEqual({ ...STANDARD, storage: "4tb" });
    expect(link.path).toBe("/laptops/{id}?chip=m6-12-12&memory=16gb&storage=4tb");
    expect(link.notice).toBe("The memory and display in this link are not available with this chip, so they were left out.");
  });

  it("falls back to the standard config for a chip that is not offered, and says so", () => {
    expect(read("chip=m9-1-1&memory=32gb&storage=4tb")).toEqual({
      picks: null,
      path: "/laptops/{id}",
      notice: "The chip in this link is not available for this laptop, so the standard configuration is shown.",
    });
  });

  it("still says so when the only param was bad and the standard config is what is left", () => {
    expect(read("memory=999gb")).toEqual({
      picks: null,
      path: "/laptops/{id}",
      notice: "The memory in this link is not available with this chip, so it was left out.",
    });
  });

  it("is the plain page with no notice for the standard config's own picks", () => {
    expect(read("chip=m6-12-12&memory=16gb&storage=1tb")).toEqual({ picks: null, path: "/laptops/{id}", notice: null });
    expect(read("")).toEqual({ picks: null, path: "/laptops/{id}", notice: null });
  });

  it("is the plain page with no notice on a laptop with no options", () => {
    expect(read("chip=m6-12-12&memory=32gb", null)).toEqual({ picks: null, path: "/laptops/{id}", notice: null });
  });
});

describe("cleanConfigSearch", () => {
  it("leaves a link that is already its own address alone", () => {
    const query = "?chip=m6-12-12&memory=32gb&storage=4tb";
    expect(cleanConfigSearch(query, `/laptops/{id}${query}`)).toBe(query);
    expect(cleanConfigSearch("", "/laptops/{id}")).toBe("");
  });

  it("removes the configuration's params when the page is the plain one", () => {
    expect(cleanConfigSearch("?chip=m9-1-1&memory=32gb", "/laptops/{id}")).toBe("");
  });

  it("rewrites the configuration's params to the picks shown, in the fixed order", () => {
    expect(cleanConfigSearch("?storage=2tb&memory=16gb&chip=m5pro-15-16", "/laptops/{id}?chip=m5pro-15-16&memory=24gb&storage=2tb"))
      .toBe("?chip=m5pro-15-16&memory=24gb&storage=2tb");
  });

  it("keeps params that are not the configuration's", () => {
    expect(cleanConfigSearch("?utm_source=x&memory=999gb", "/laptops/{id}")).toBe("?utm_source=x");
    expect(cleanConfigSearch("?utm_source=x&memory=32gb", "/laptops/{id}?chip=m6-12-12&memory=32gb&storage=1tb"))
      .toBe("?chip=m6-12-12&memory=32gb&storage=1tb&utm_source=x");
  });
});

describe("isStandardConfig", () => {
  it("is true only for the standard config's own picks", () => {
    expect(isStandardConfig(options, STANDARD)).toBe(true);
    expect(isStandardConfig(options, { ...STANDARD, memory: "32gb" })).toBe(false);
    expect(isStandardConfig(options, { ...STANDARD, adapter: "96w" })).toBe(false);
    expect(isStandardConfig(options, { ...STANDARD, display: "nano_texture" })).toBe(false);
    expect(isStandardConfig(options, { ...STANDARD, chip: "m5pro-15-16", memory: "24gb" })).toBe(false);
  });

  it("agrees with the URL: the plain path exactly when the picks are the standard config's own", () => {
    for (const { picks, path } of shared.cases) {
      expect(isStandardConfig(options, picks)).toBe(!path.includes("?"));
    }
  });
});
