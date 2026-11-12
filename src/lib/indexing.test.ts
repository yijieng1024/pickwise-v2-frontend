import { describe, expect, it } from "vitest";

import { mayIndex } from "./indexing";

describe("mayIndex", () => {
  it("lets active and discontinued laptops into search engines", () => {
    expect(mayIndex("active")).toBe(true);
    expect(mayIndex("discontinued")).toBe(true);
  });

  it("keeps inactive and suspended laptops out", () => {
    expect(mayIndex("inactive")).toBe(false);
    expect(mayIndex("suspended")).toBe(false);
  });

  it("keeps out a status it does not know, and no status at all", () => {
    expect(mayIndex("draft")).toBe(false);
    expect(mayIndex("Active")).toBe(false);
    expect(mayIndex("")).toBe(false);
    expect(mayIndex(null)).toBe(false);
    expect(mayIndex(undefined)).toBe(false);
  });
});
