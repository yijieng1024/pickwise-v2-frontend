import { describe, expect, it } from "vitest";

import { isJobAccepted, jobResultSummary } from "./jobs";

describe("isJobAccepted", () => {
  it("is true for a 202 job envelope", () => {
    expect(isJobAccepted({ job_id: "j1", job_type: "scraper.feed_crawler", message: "Crawling" })).toBe(true);
  });

  it("is false for the old 200 feed crawl body", () => {
    expect(isJobAccepted({ message: "done", total_found: 49, added_to_queue: 0 })).toBe(false);
  });
});

describe("jobResultSummary for a feed crawl", () => {
  it("gives the totals and the counts per site", () => {
    const summary = jobResultSummary({
      job_type: "scraper.feed_crawler",
      result: {
        brand: "ASUS",
        total_found: 49,
        added_to_queue: 3,
        sites: {
          "www.asus.com": { pages_found: 30, targets_added: 1 },
          "rog.asus.com": { pages_found: 19, targets_added: 2 },
        },
      },
    });
    expect(summary).toBe(
      "Found 49, added 3 new. www.asus.com: found 30, added 1. rog.asus.com: found 19, added 2.",
    );
  });

  it("leaves the sites out when there is only one", () => {
    const summary = jobResultSummary({
      job_type: "scraper.feed_crawler",
      result: {
        total_found: 12,
        added_to_queue: 0,
        sites: { "www.hp.com": { pages_found: 12, targets_added: 0 } },
      },
    });
    expect(summary).toBe("Found 12, added 0 new.");
  });
});
