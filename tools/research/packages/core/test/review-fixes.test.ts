import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb, useMemoryDb } from "../src/db/client.ts";
import { upsertChannel, upsertVideo } from "../src/db/repo.ts";
import { competitorsSeed } from "../src/features/competitors.ts";
import { outliersFromDb } from "../src/features/outliers.ts";
import { videoTranscriptInput } from "../src/features/videos.ts";
import { parseDuration, youtubeApi } from "../src/providers/youtube-api.ts";
import { quotaStatus } from "../src/quota/guard.ts";

beforeEach(() => {
  useMemoryDb();
  process.env.YOUTUBE_API_KEY = "test-key";
  delete process.env.BRIMLO_DEMO;
});
afterEach(() => vi.unstubAllGlobals());

const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const vid = (id: string, ch: string, views: number, days: number) => ({ id, channelId: ch, title: id, description: "", tags: [], publishedAt: ago(days), durationSec: 1800, views, likes: 0, comments: 0, thumbnail: "" });

describe("outliersFromDb", () => {
  it("keeps a small-view outlier even when thousands of bigger videos are stored", () => {
    upsertChannel({ id: "big", title: "Big", subscribers: 900_000, videoCount: 6000, viewCount: 6000 * 50_000 }, "youtube-api");
    upsertChannel({ id: "tiny", title: "Tiny", subscribers: 200, videoCount: 10, viewCount: 1000 }, "youtube-api");
    const db = getDb();
    db.exec("BEGIN");
    for (let i = 0; i < 5200; i++) upsertVideo(vid(`b${i}`, "big", 50_000 + i, 400), "youtube-api");
    for (let i = 0; i < 9; i++) upsertVideo(vid(`t${i}`, "tiny", 100, 20 + i), "youtube-api");
    upsertVideo(vid("tinyHit", "tiny", 3000, 5), "youtube-api");
    db.exec("COMMIT");
    const r = outliersFromDb({ days: 90, minMultiplier: 5, maxSubs: 0, includeShorts: false, liveOnly: true });
    expect(r.map((x) => x.id)).toContain("tinyHit");
    expect(r.find((x) => x.id === "tinyHit")!.baseline_type).toBe("median_last_20");
  });
});

describe("youtube-api provider (mocked HTTP)", () => {
  const stub = (status: number, body: unknown) => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: status < 400, status, statusText: "x", json: async () => body }) as any));
  it("maps videos and parses ISO durations", async () => {
    stub(200, { items: [{ id: "abc", snippet: { channelId: "UC1", title: "T", publishedAt: "2026-10-01T00:00:00Z", tags: ["a"], thumbnails: { medium: { url: "u" } } }, statistics: { viewCount: "12", likeCount: "3", commentCount: "1" }, contentDetails: { duration: "PT1H2M3S" } }] });
    const [v] = await youtubeApi.getVideos(["abc"]);
    expect(v).toMatchObject({ id: "abc", channelId: "UC1", views: 12, likes: 3, durationSec: 3723, tags: ["a"] });
    expect(parseDuration("P1DT1S")).toBe(86401);
  });
  it("records quota even when YouTube answers with an error", async () => {
    stub(400, { error: { message: "bad", errors: [{ reason: "badRequest" }] } });
    await expect(youtubeApi.searchVideoIds("x")).rejects.toThrow(/badRequest/);
    expect(quotaStatus().used).toBe(100);
  });
  it("treats a missing uploads playlist as no videos", async () => {
    stub(404, { error: { message: "nf", errors: [{ reason: "playlistNotFound" }] } });
    expect(await youtubeApi.getUploadIds("UUx", 20)).toEqual([]);
  });
});

describe("input safety", () => {
  it("rejects path-like transcript languages", () => {
    expect(() => videoTranscriptInput.parse({ video: "abcdefghijk", lang: "../../x" })).toThrow();
    expect(videoTranscriptInput.parse({ video: "abcdefghijk", lang: "en-US" }).lang).toBe("en-US");
  });
  it("seed only reads .md files inside the repo", async () => {
    await expect(competitorsSeed({ file: "../../../../etc/passwd" })).rejects.toThrow(/inside the repo/);
    await expect(competitorsSeed({ file: "tools/research/.env" })).rejects.toThrow(/inside the repo/);
  });
});
