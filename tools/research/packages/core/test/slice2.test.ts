import { beforeEach, describe, expect, it } from "vitest";
import { useMemoryDb } from "../src/db/client.ts";
import { channelStats, channelVideos, parseChannelRef } from "../src/features/channels.ts";
import { competitorsAdd, competitorsList, competitorsRefresh, competitorsRemove, parseSeedHandles } from "../src/features/competitors.ts";
import { findOutliers, outliers } from "../src/features/outliers.ts";
import { similarVideos } from "../src/features/similar.ts";
import { parseJson3, parseVideoId, videoComments, videoStats, videoTags } from "../src/features/videos.ts";
import { demoProvider } from "../src/providers/demo.ts";
import { quotaStatus } from "../src/quota/guard.ts";
import { isShort, medianBaseline, multiplier } from "../src/scoring/outlier.ts";

const deps = { yt: demoProvider };
beforeEach(() => {
  process.env.BRIMLO_DEMO = "1";
  useMemoryDb();
});

describe("parsing", () => {
  it("channel refs", () => {
    expect(parseChannelRef("@CGGrows")).toEqual({ handle: "@CGGrows" });
    expect(parseChannelRef("https://www.youtube.com/@cggrows")).toEqual({ handle: "@cggrows" });
    expect(parseChannelRef("UCNwyRD0Zs878saYiRu6vxNw")).toEqual({ id: "UCNwyRD0Zs878saYiRu6vxNw" });
    expect(parseChannelRef("https://www.youtube.com/channel/UCNwyRD0Zs878saYiRu6vxNw")).toEqual({ id: "UCNwyRD0Zs878saYiRu6vxNw" });
    expect(parseChannelRef("cggrows")).toEqual({ handle: "@cggrows" });
  });
  it("video ids", () => {
    expect(parseVideoId("https://www.youtube.com/watch?v=fJCOfIcmJyU&t=3")).toBe("fJCOfIcmJyU");
    expect(parseVideoId("https://youtu.be/fJCOfIcmJyU")).toBe("fJCOfIcmJyU");
    expect(parseVideoId("fJCOfIcmJyU")).toBe("fJCOfIcmJyU");
    expect(() => parseVideoId("nope")).toThrow();
  });
  it("seed handles from markdown", () => {
    const md = "[A](https://www.youtube.com/@cggrows) and [B](https://www.youtube.com/@Idle-Cub) and again https://www.youtube.com/@cggrows";
    expect(parseSeedHandles(md)).toEqual(["@cggrows", "@idle-cub"]);
  });
  it("json3 captions become timestamped lines", () => {
    const raw = JSON.stringify({ events: [{ tStartMs: 0, segs: [{ utf8: "hello " }, { utf8: "world" }] }, { tStartMs: 10000, segs: [{ utf8: "again" }] }, { tStartMs: 65000, segs: [{ utf8: "later" }] }, { tStartMs: 70000 }] });
    const r = parseJson3(raw);
    expect(r.text).toBe("[0:00] hello world again\n[1:05] later");
    expect(r.segments).toBe(3);
  });
});

describe("outlier math", () => {
  const v = (id: string, views: number, days: number, dur = 1800) => ({ id, views, publishedAt: new Date(Date.now() - days * 86400000).toISOString(), durationSec: dur });
  it("baseline is the median of long-form and ignores Shorts", () => {
    const vids = [v("a", 100, 1), v("b", 300, 2), v("c", 200, 3), v("s", 9_000_000, 4, 30)];
    expect(medianBaseline(vids)).toBe(200);
    expect(isShort(30)).toBe(true);
    expect(multiplier(1000, 200)).toBe(5);
    expect(multiplier(10, 0)).toBe(0);
  });
  it("findOutliers filters by multiplier, age, subs and sorts small channels first", () => {
    const mk = (id: string, ch: string, views: number, days: number) => ({ id, channelId: ch, title: id, description: "", tags: [], publishedAt: new Date(Date.now() - days * 86400000).toISOString(), durationSec: 1800, views, likes: 0, comments: 0, thumbnail: "" });
    const channels = new Map([
      ["big", { id: "big", title: "Big", subscribers: 900_000, videoCount: 10, viewCount: 0 }],
      ["small", { id: "small", title: "Small", subscribers: 2_000, videoCount: 10, viewCount: 0 }],
    ]);
    const baselines = new Map<string, any>([["big", { value: 1000, type: "median_last_20" }], ["small", { value: 100, type: "median_last_20" }]]);
    const videos = [mk("big10x", "big", 10_000, 5), mk("small6x", "small", 600, 5), mk("small2x", "small", 200, 5), mk("old", "small", 5000, 200)];
    const r = findOutliers(videos, channels as any, baselines, { days: 90, minMultiplier: 5, maxSubs: 0, includeShorts: false });
    expect(r.map((x) => x.id)).toEqual(["small6x", "big10x"]);
    const small = findOutliers(videos, channels as any, baselines, { days: 90, minMultiplier: 5, maxSubs: 50_000, includeShorts: false });
    expect(small.map((x) => x.id)).toEqual(["small6x"]);
  });
});

describe("tools on the demo provider", () => {
  it("channel_videos and channel_stats", async () => {
    const vids: any = (await channelVideos({ channel: "@demochan", limit: 5, sort: "views", include_shorts: false, refresh: false }, deps)).data;
    expect(vids.videos).toHaveLength(5);
    expect(vids.videos[0].views).toBeGreaterThanOrEqual(vids.videos[1].views);
    const stats: any = (await channelStats({ channel: "@demochan", refresh: false }, deps)).data;
    expect(stats.uploads_last_90_days).toBeGreaterThan(0);
  });
  it("competitors add / list / refresh / remove", async () => {
    await competitorsAdd({ channel: "@alpha" }, deps);
    await competitorsAdd({ channel: "@beta" }, deps);
    expect(((await competitorsList()).data as any).competitors).toHaveLength(2);
    const r: any = (await competitorsRefresh({ min_multiplier: 3, force: false, per_channel: 5 }, deps)).data;
    expect(r.checked).toBe(2);
    expect(r.report[0].new_uploads_since_last_check.length).toBeGreaterThan(0);
    const again: any = (await competitorsRefresh({ min_multiplier: 3, force: false, per_channel: 5 }, deps)).data;
    expect(again.report[0].new_uploads_since_last_check).toHaveLength(0); // already checked
    await competitorsRemove({ channel: "@alpha" });
    expect(((await competitorsList()).data as any).competitors).toHaveLength(1);
  });
  it("outliers in channels mode and query mode", async () => {
    const c: any = (await outliers({ channels: ["@alpha", "@beta", "@gamma"], days: 90, min_multiplier: 2, limit: 20, include_shorts: false, refresh: false }, deps)).data;
    expect(c.mode).toBe("channels");
    for (const o of c.outliers) expect(o.baseline_type).toBe("median_last_20");
    const q: any = (await outliers({ query: "idle mining", days: 365, min_multiplier: 1, limit: 10, include_shorts: false, refresh: false }, deps)).data;
    expect(q.mode).toBe("query");
    for (const o of q.outliers) expect(o.channel_subs).toBeLessThanOrEqual(50_000);
  });
  it("outliers needs a source", async () => {
    await expect(outliers({ days: 90, min_multiplier: 5, limit: 20, include_shorts: false, refresh: false }, deps)).rejects.toThrow(/competitors/);
  });
  it("video_stats, tags, comments", async () => {
    const s: any = (await videoStats({ video: "demoup_alpha_0_0", compare_channel: true, refresh: false }, deps)).data;
    expect(s.outlier_multiplier).not.toBeNull();
    const t: any = (await videoTags({ video: "demoup_alpha_0_0", refresh: false }, deps)).data;
    expect(t.tags.length).toBeGreaterThan(0);
    const c: any = (await videoComments({ video: "demoup_alpha_0_0", limit: 5, order: "relevance", refresh: false }, deps)).data;
    expect(c.comments.length).toBeGreaterThan(0);
  });
  it("similar_videos works from the local DB", async () => {
    await outliers({ query: "idle mining", days: 365, min_multiplier: 1, limit: 5, include_shorts: false, refresh: false }, deps);
    const r: any = (await similarVideos({ video: "demo_idle-mining_0", limit: 5, online: false }, deps)).data;
    expect(r.similar.length).toBeGreaterThan(0);
  });
  it("demo mode never spends quota", async () => {
    await outliers({ query: "idle mining", days: 90, min_multiplier: 1, limit: 5, include_shorts: false, refresh: false }, deps);
    expect(quotaStatus().used).toBe(0);
  });
});
