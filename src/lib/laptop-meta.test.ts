import { describe, expect, it } from "vitest";

import { DESCRIPTION_MAX, laptopMeta, type LaptopMetaInput } from "./laptop-meta";

const AIR: LaptopMetaInput = {
  name: "13-inch MacBook Air (M5, 10-core CPU, 10-core GPU, 16GB RAM, 1TB SSD)",
  processor: "Apple M5 (10-core)",
  gpu: "10-core GPU",
  ramGb: 16,
  ssdGb: 1024,
  displayInch: 13.6,
  weightKg: 1.23,
  priceRm: 6849,
};

describe("laptopMeta", () => {
  it("titles a standard laptop with its name and states its official price", () => {
    expect(laptopMeta(AIR)).toEqual({
      title: "13-inch MacBook Air (M5, 10-core CPU, 10-core GPU, 16GB RAM, 1TB SSD) | PickWise",
      description:
        "Apple M5 (10-core), 10-core GPU, 16GB RAM, 1TB SSD, 13.6-inch display, 1.23 kg. Official price RM 6,849. Pick Score, reviews and price history on PickWise.",
    });
  });

  it("titles a configured link with the configured name and calls its price build-to-order", () => {
    const meta = laptopMeta({
      ...AIR,
      name: "13-inch MacBook Air (M5, 10-core CPU, 10-core GPU, 16-core Neural Engine, 24GB RAM, 1TB SSD)",
      ramGb: 24,
      priceRm: 7749,
      configured: true,
    });
    expect(meta.title).toBe(
      "13-inch MacBook Air (M5, 10-core CPU, 10-core GPU, 16-core Neural Engine, 24GB RAM, 1TB SSD) | PickWise",
    );
    expect(meta.description).toContain("24GB RAM");
    expect(meta.description).toContain("Build-to-order price RM 7,749.");
    expect(meta.description).not.toContain("Official price");
  });

  it("writes no price when there is none, and never RM 0", () => {
    for (const priceRm of [0, null, undefined]) {
      const { description } = laptopMeta({ ...AIR, priceRm });
      expect(description).toBe(
        "Apple M5 (10-core), 10-core GPU, 16GB RAM, 1TB SSD, 13.6-inch display, 1.23 kg. Pick Score, reviews and price history on PickWise.",
      );
      expect(description).not.toContain("RM");
    }
  });

  it("never cuts a very long name out of the title", () => {
    const name = `ASUS ${"ProArt Studiobook Pro 16 OLED ".repeat(8)}(H7604JV)`;
    const meta = laptopMeta({ ...AIR, name });
    expect(meta.title).toBe(`${name} | PickWise`);
    expect(meta.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("keeps a long description within the limit by leaving out whole parts, the price last", () => {
    const meta = laptopMeta({
      name: "ASUS ROG Strix SCAR 18",
      processor: "Intel Core Ultra 9 275HX Processor 2.7 GHz (36MB Cache, up to 5.4 GHz, 24 cores, 24 Threads)",
      gpu: "NVIDIA GeForce RTX 5090 Laptop GPU 24GB GDDR7",
      ramGb: 64,
      ssdGb: 4096,
      displayInch: 18,
      weightKg: 3.3,
      priceRm: 22999,
    });
    expect(meta.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(meta.description).toBe(
      "Intel Core Ultra 9 275HX Processor 2.7 GHz (36MB Cache, up to 5.4 GHz, 24 cores, 24 Threads). Official price RM 22,999.",
    );
    // With the GPU it would be 167 characters: the whole part is left out, not cut.
    expect(meta.description).not.toContain("NVIDIA");
  });

  it("skips specs the laptop does not state", () => {
    expect(laptopMeta({ name: "Some Laptop", processor: "  ", gpu: null, ramGb: 8, ssdGb: 512, priceRm: 1999 }).description).toBe(
      "8GB RAM, 512GB SSD. Official price RM 1,999. Pick Score, reviews and price history on PickWise.",
    );
    expect(laptopMeta({ name: "Some Laptop" }).description).toBe("Pick Score, reviews and price history on PickWise.");
  });
});
