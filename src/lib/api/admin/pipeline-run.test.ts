import { describe, expect, it } from "vitest";

import { pipelineRunSummary } from "./jobs";

// 19:04 UTC on Saturday is 03:04 on Sunday in Malaysia.
const base = {
  status: "completed" as const,
  started_by: "schedule" as const,
  created_at: "2026-11-14T19:03:00Z",
  started_at: "2026-11-14T19:04:00Z",
  result: { steps: {}, stopped_at: null },
};

describe("pipelineRunSummary", () => {
  it("gives the start in Malaysia time, the schedule, and the status", () => {
    const s = pipelineRunSummary(base);
    expect(s.when).toMatch(/Sun/);
    expect(s.when).toMatch(/15 Nov 2026/);
    expect(s.when).toMatch(/03:04/);
    expect(s.startedBy).toBe("By the schedule");
    expect(s.status).toBe("completed");
  });

  it("says a run started from the Actions tab was by hand", () => {
    expect(pipelineRunSummary({ ...base, started_by: "admin" }).startedBy).toBe("By hand");
  });

  it("says why a run was skipped", () => {
    const s = pipelineRunSummary({ ...base, result: { skipped: "another scrape or processing job is active (job j1)" } });
    expect(s.status).toBe("skipped: another scrape or processing job is active (job j1)");
  });

  it("names the step a stopped run stopped at", () => {
    const s = pipelineRunSummary({ ...base, status: "failed", result: { steps: {}, stopped_at: "scrape" } });
    expect(s.status).toBe("stopped at scrape");
  });

  it("falls back to the created time before the run starts", () => {
    const s = pipelineRunSummary({ ...base, status: "queued", started_at: null, result: null });
    expect(s.when).toMatch(/03:03/);
    expect(s.status).toBe("queued");
  });
});
