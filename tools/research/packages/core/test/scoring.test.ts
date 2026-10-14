import { describe, expect, it } from "vitest";
import { competitionScore, median, opportunityScore, viewsPerDay } from "../src/scoring/keyword.ts";

const now = new Date("2026-10-14T00:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

describe("median", () => {
  it("handles odd, even and empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("viewsPerDay", () => {
  it("divides by age, minimum 1 day", () => {
    expect(viewsPerDay(1000, daysAgo(10), now)).toBeCloseTo(100);
    expect(viewsPerDay(500, daysAgo(0), now)).toBe(500);
  });
});

describe("competitionScore", () => {
  it("is high for big channels with big views", () => {
    const rows = Array.from({ length: 10 }, () => ({ views: 2_000_000, publishedAt: daysAgo(30), channelSubs: 1_000_000 }));
    expect(competitionScore(rows).score).toBeGreaterThanOrEqual(90);
  });
  it("is low for tiny channels with few views", () => {
    const rows = Array.from({ length: 10 }, () => ({ views: 500, publishedAt: daysAgo(30), channelSubs: 300 }));
    expect(competitionScore(rows).score).toBeLessThan(34);
  });
  it("returns 0 for no results", () => {
    expect(competitionScore([]).score).toBe(0);
  });
});

describe("opportunityScore", () => {
  it("rewards small channels that out-perform their size", () => {
    const winners = Array.from({ length: 10 }, () => ({ views: 100_000, publishedAt: daysAgo(10), channelSubs: 2_000 }));
    const losers = Array.from({ length: 10 }, () => ({ views: 1_000, publishedAt: daysAgo(400), channelSubs: 2_000_000 }));
    expect(opportunityScore(winners, now).score).toBeGreaterThan(opportunityScore(losers, now).score + 40);
  });
  it("includes the formula text", () => {
    expect(opportunityScore([], now).formula).toContain("opportunity =");
  });
});
