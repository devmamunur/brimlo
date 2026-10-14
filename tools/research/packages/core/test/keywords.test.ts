import { beforeEach, describe, expect, it } from "vitest";
import { useMemoryDb } from "../src/db/client.ts";
import { keywordResearch } from "../src/features/keywords.ts";
import { demoProvider } from "../src/providers/demo.ts";
import { quotaStatus, recordQuota } from "../src/quota/guard.ts";

const fakeExpand = async () => ({ suggestions: [{ text: "incremental games", from: "seed" as const, position: 0 }], failed: 0, total: 1 });
const deps = { yt: demoProvider, expand: fakeExpand };

beforeEach(() => {
  process.env.BRIMLO_DEMO = "1";
  useMemoryDb();
});

describe("keywordResearch (demo provider)", () => {
  it("returns scores, formulas, capped lists and a demo warning", async () => {
    const env = await keywordResearch({ query: "incremental game", limit: 5, expand: true, refresh: false, estimate_only: false }, deps);
    const d = env.data as any;
    expect(d.top_videos).toHaveLength(5);
    expect(d.competition.score).toBeGreaterThanOrEqual(0);
    expect(d.opportunity.formula).toContain("opportunity");
    expect(env.source).toBe("demo");
    expect(env.warnings.join(" ")).toContain("DEMO");
  });
  it("is deterministic and the second call is cached", async () => {
    const input = { query: "idle mining", limit: 10, expand: true, refresh: false, estimate_only: false };
    const a = await keywordResearch(input, deps);
    const b = await keywordResearch(input, deps);
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);
    expect((b.data as any).stats).toEqual((a.data as any).stats);
  });
  it("estimate_only does not fetch or log quota", async () => {
    const env = await keywordResearch({ query: "idle mining", limit: 10, expand: true, refresh: false, estimate_only: true }, deps);
    expect((env.data as any).full_cost_if_fetched).toBe(102);
    expect(quotaStatus().used).toBe(0);
  });
  it("real provider estimate shows 102 units and blocks past the stop line", async () => {
    const live = { ...demoProvider, name: "youtube-api" as const };
    const env = await keywordResearch({ query: "x game", limit: 5, expand: false, refresh: false, estimate_only: true }, { ...deps, yt: live });
    expect((env.data as any).estimated_units).toBe(102);
    recordQuota("search", 9000);
    expect(quotaStatus().level).toBe("warn");
  });
});
