import { z } from "zod";
import { cached, DAY_SEC } from "../cache.ts";
import { allChannelRows, allVideoRows, getVideosByChannel, upsertChannel, upsertVideo } from "../db/repo.ts";
import { getYouTube } from "../providers/index.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { jaccard, topCounts, tokens } from "../scoring/text.ts";
import { loadChannel, loadUploads, type Deps } from "./channels.ts";
import { loadVideo } from "./videos.ts";

// ---------- similar_videos ----------
export const similarVideosInput = z.object({
  video: z.string().min(1).describe("Video id or URL"),
  limit: z.number().int().min(1).max(30).default(10),
  online: z.boolean().default(false).describe("Also search YouTube for the video's top keywords (100 units). Default: only search videos already stored locally (free)"),
});
export async function similarVideos(input: z.infer<typeof similarVideosInput>, deps: Deps = {}): Promise<Envelope> {
  const i = similarVideosInput.parse(input);
  const before = unitsCounter();
  const { video: v, yt } = await loadVideo(i.video, deps);
  const myTokens = new Set([...tokens(v.title), ...v.tags.flatMap((t) => tokens(t))]);

  if (i.online) {
    const q = topCounts(tokens(v.title), 3).map((x) => x.text).join(" ");
    const res = await cached(`sim:v1:${yt.name}:${q}`, DAY_SEC, async () => {
      const ids = (await yt.searchVideoIds(q, { maxResults: 25 })).filter((x) => x !== v.id);
      return { value: await yt.getVideos(ids), source: yt.name };
    });
    if (!res.cached) for (const x of res.value) upsertVideo(x, yt.name);
  }

  const ranked = allVideoRows(yt.name !== "demo")
    .filter((r) => r.id !== v.id)
    .map((r) => ({ r, score: 0.7 * jaccard(myTokens, tokens(r.title)) + 0.3 * jaccard(v.tags.map((t) => t.toLowerCase()), r.tags.map((t) => t.toLowerCase())) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, i.limit);
  const status = quotaStatus();
  return {
    data: { video: { id: v.id, title: v.title }, method: i.online ? "local DB + online search on top keywords" : "local DB only (free)", similar: ranked.map(({ r, score }) => ({ id: r.id, title: r.title, views: r.views, similarity: Math.round(score * 100) / 100, url: `https://www.youtube.com/watch?v=${r.id}` })) },
    summary: `${ranked.length} similar videos found for "${v.title}" (${i.online ? "with online search" : "local only"}).`,
    source: yt.name,
    fetched_at: new Date().toISOString(),
    cached: unitsCounter() === before,
    quota_used: unitsCounter() - before,
    warnings: [...(ranked.length ? [] : ["Nothing similar stored yet. Run keyword_research/outliers on the niche first, or use online: true."]), ...(status.level !== "ok" ? [`Quota at ${status.percent}%.`] : [])],
  };
}

// ---------- similar_channels ----------
export const similarChannelsInput = z.object({
  channel: z.string().min(1).describe("@handle, id or URL"),
  limit: z.number().int().min(1).max(30).default(10),
  online: z.boolean().default(false).describe("Also search YouTube for channels on the same topics (100 units)"),
});
export async function similarChannels(input: z.infer<typeof similarChannelsInput>, deps: Deps = {}): Promise<Envelope> {
  const i = similarChannelsInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const ch = await loadChannel(i.channel, deps);
  const up = await loadUploads(ch, 50, deps);
  const words = topCounts(up.value.flatMap((v) => tokens(v.title)), 12, 2).map((x) => x.text);
  const mine = new Set(words);

  if (i.online) {
    const q = words.slice(0, 3).join(" ");
    const res = await cached(`simch:v1:${yt.name}:${q}`, DAY_SEC, async () => {
      const ids = (await yt.searchChannelIds(q, 15)).filter((x) => x !== ch.id);
      return { value: await yt.getChannels(ids), source: yt.name };
    });
    if (!res.cached) for (const c of res.value) upsertChannel(c, yt.name);
  }

  const ranked = allChannelRows()
    .filter((c) => c.id !== ch.id && (yt.name === "demo" || c.source !== "demo"))
    .map((c) => {
      const theirWords = topCounts(getVideosByChannel(c.id).flatMap((v) => tokens(v.title)), 12, 1).map((x) => x.text);
      return { c, score: theirWords.length ? jaccard(mine, theirWords) : jaccard(mine, tokens(c.title)) * 0.5 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, i.limit);
  return {
    data: { channel: { id: ch.id, title: ch.title }, topic_words: words, method: i.online ? "local DB + online channel search" : "local DB only (free)", similar: ranked.map(({ c, score }) => ({ id: c.id, title: c.title, handle: c.handle, subscribers: c.subscribers, similarity: Math.round(score * 100) / 100 })) },
    summary: `${ranked.length} channels similar to ${ch.title} (topic words: ${words.slice(0, 5).join(", ")}).`,
    source: yt.name,
    fetched_at: new Date().toISOString(),
    cached: unitsCounter() === before,
    quota_used: unitsCounter() - before,
    warnings: ranked.length ? [] : ["Nothing similar stored yet. Use online: true or research the niche first."],
  };
}
