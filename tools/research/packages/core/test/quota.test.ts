import { beforeEach, describe, expect, it } from "vitest";
import { useMemoryDb } from "../src/db/client.ts";
import { assertQuota, evaluate, QuotaError, quotaDay, quotaStatus, recordQuota } from "../src/quota/guard.ts";

describe("evaluate", () => {
  it("ok below 70%", () => expect(evaluate(0, 100, 10000).level).toBe("ok"));
  it("warns from 70%", () => expect(evaluate(6950, 100, 10000).level).toBe("warn"));
  it("stops above 90%", () => {
    const r = evaluate(8950, 100, 10000);
    expect(r.level).toBe("stop");
    expect(r.allowed).toBe(false);
  });
  it("allows exactly 90%", () => expect(evaluate(8900, 100, 10000).allowed).toBe(true));
});

describe("quota log", () => {
  beforeEach(() => {
    useMemoryDb();
    process.env.YOUTUBE_DAILY_QUOTA = "1000";
  });
  it("sums today's units and counts searches left", () => {
    recordQuota("search", 100);
    recordQuota("videos", 1);
    const s = quotaStatus();
    expect(s.used).toBe(101);
    expect(s.searches_left).toBe(7); // (900 - 101) / 100
  });
  it("throws QuotaError past the stop line", () => {
    recordQuota("search", 850);
    expect(() => assertQuota(100, "search")).toThrow(QuotaError);
    expect(() => assertQuota(40, "videos")).not.toThrow();
  });
  it("uses the Pacific day", () => {
    expect(quotaDay(new Date("2026-10-14T05:00:00Z"))).toBe("2026-10-13");
  });
});
