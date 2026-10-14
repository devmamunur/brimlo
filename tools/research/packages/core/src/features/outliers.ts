import { z } from "zod";
import { cached } from "../cache.ts";
import { allChannelRows, baselineRows, videosPublishedSince } from "../db/repo.ts";
import { getYouTube, type ChannelInfo, type VideoInfo } from "../providers/index.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { ageDays, viewsPerDay } from "../scoring/keyword.ts";
import { channelAverage, isShort, isYoung, medianBaseline, multiplier, OUTLIER_FORMULA } from "../scoring/outlier.ts";
import { loadChannel, loadUploads, type Deps } from "./channels.ts";
import { nichePool } from "./niche.ts";
import { listCompetitorIds } from "./competitors.ts";

export const outliersInput = z.object({
  query: z.string().min(2).optional().describe("Niche search, e.g. 'incremental game'. Costs ~102 units, cached 24h."),
  channels: z.array(z.string()).optional().describe("Channels to scan (@handle, id or URL). ~3 units each. If neither query nor channels is given, tracked competitors are scanned."),
  days: z.number().int().min(1).max(365).default(90).describe("Only videos published in the last N days"),
  min_multiplier: z.number().min(1).default(5).describe("Video views must be at least N× the channel baseline"),
  max_subs: z.number().int().min(0).optional().describe("Max channel subscribers (0 = no limit). Default 50000 for query mode, no limit for channels mode"),
  limit: z.number().int().min(1).max(100).default(20),
  include_shorts: z.boolean().default(false),
  refresh: z.boolean().default(false),
});
export type OutliersInput = z.infer<typeof outliersInput>;

export interface OutlierItem {
  id: string;
  title: string;
  channel_id: string;
  channel: string;
  channel_subs: number;
  views: number;
  views_per_day: number;
  multiplier: number;
  baseline: number;
  baseline_type: "median_last_20" | "channel_average";
  age_days: number;
  duration_min: number;
  young: boolean;
  published_at: string;
  thumbnail: string;
  url: string;
}

export interface OutlierFilters {
  days: number;
  minMultiplier: number;
  maxSubs: number;
  includeShorts: boolean;
}

/** Pure: find outliers in a set of videos, given a baseline per channel. */
export function findOutliers(
  videos: VideoInfo[],
  channels: Map<string, ChannelInfo>,
  baselines: Map<string, { value: number; type: OutlierItem["baseline_type"] }>,
  f: OutlierFilters,
  now = new Date(),
): OutlierItem[] {
  const out: OutlierItem[] = [];
  for (const v of videos) {
    const ch = channels.get(v.channelId);
    const b = baselines.get(v.channelId);
    if (!ch || !b || b.value <= 0) continue;
    if (!f.includeShorts && isShort(v.durationSec)) continue;
    if (ageDays(v.publishedAt, now) > f.days) continue;
    if (f.maxSubs > 0 && ch.subscribers > f.maxSubs) continue;
    const m = multiplier(v.views, b.value);
    if (m < f.minMultiplier) continue;
    out.push({
      id: v.id,
      title: v.title,
      channel_id: ch.id,
      channel: ch.title,
      channel_subs: ch.subscribers,
      views: v.views,
      views_per_day: Math.round(viewsPerDay(v.views, v.publishedAt, now)),
      multiplier: m,
      baseline: Math.round(b.value),
      baseline_type: b.type,
      age_days: Math.round(ageDays(v.publishedAt, now) * 10) / 10,
      duration_min: Math.round(v.durationSec / 6) / 10,
      young: isYoung(v.publishedAt, now),
      published_at: v.publishedAt,
      thumbnail: v.thumbnail,
      url: `https://www.youtube.com/watch?v=${v.id}`,
    });
  }
  // small channels first (under 50K), then by multiplier
  return out.sort((a, b) => Number(b.channel_subs < 50_000) - Number(a.channel_subs < 50_000) || b.multiplier - a.multiplier);
}

/** Outliers from everything already stored in the local database. Free. Used by the dashboard. */
export function outliersFromDb(f: OutlierFilters & { liveOnly?: boolean; limit?: number }): OutlierItem[] {
  const chRows = allChannelRows();
  const channels = new Map<string, ChannelInfo>(chRows.map((c) => [c.id, { id: c.id, title: c.title, handle: c.handle, subscribers: c.subscribers, videoCount: c.video_count, viewCount: c.view_count, country: c.country, uploadsPlaylist: c.uploads_playlist }]));
  const since = new Date(Date.now() - f.days * 86400000).toISOString();
  const videos: VideoInfo[] = videosPublishedSince(since, f.liveOnly ?? true).map((r) => ({ id: r.id, channelId: r.channel_id, title: r.title, description: r.description, tags: r.tags, publishedAt: r.published_at, durationSec: r.duration_sec, views: r.views, likes: r.likes, comments: r.comments, thumbnail: r.thumbnail }));
  const baselines = new Map<string, { value: number; type: OutlierItem["baseline_type"] }>();
  const byChannel = new Map<string, { id: string; views: number; publishedAt: string; durationSec: number }[]>();
  for (const r of baselineRows()) {
    const list = byChannel.get(r.channel_id) ?? [];
    list.push({ id: r.id, views: r.views, publishedAt: r.published_at, durationSec: r.duration_sec });
    byChannel.set(r.channel_id, list);
  }
  for (const c of channels.values()) {
    const own = byChannel.get(c.id) ?? [];
    if (own.length >= 8) baselines.set(c.id, { value: medianBaseline(own), type: "median_last_20" });
    else baselines.set(c.id, { value: channelAverage(c.viewCount, c.videoCount), type: "channel_average" });
  }
  return findOutliers(videos, channels, baselines, f).slice(0, f.limit ?? 50);
}

export async function outliers(input: OutliersInput, deps: Deps = {}): Promise<Envelope> {
  const i = outliersInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const warnings: string[] = [];
  const now = new Date();
  const channels = new Map<string, ChannelInfo>();
  const baselines = new Map<string, { value: number; type: OutlierItem["baseline_type"] }>();
  let videos: VideoInfo[] = [];
  let isCached = true;
  let fetchedAt = now.toISOString();
  let mode: "query" | "channels" | "competitors";
  let maxSubs: number;

  if (i.query) {
    mode = "query";
    maxSubs = i.max_subs ?? 50_000;
    const p = await nichePool(i.query, i.days, deps, i.refresh);
    videos = p.pool.videos;
    for (const c of p.pool.channels) {
      channels.set(c.id, c);
      baselines.set(c.id, { value: channelAverage(c.viewCount, c.videoCount), type: "channel_average" });
    }
    isCached = p.cached;
    fetchedAt = p.fetchedAt;
    warnings.push("Query mode: baseline is the channel's average views per video (rough estimate). Use channels mode for a median baseline.");
  } else {
    const list = i.channels?.length ? i.channels : listCompetitorIds();
    mode = i.channels?.length ? "channels" : "competitors";
    maxSubs = i.max_subs ?? 0;
    if (!list.length) throw new Error("Give a query or channels, or add competitors first (competitors_add / competitors_seed).");
    for (const ref of list) {
      try {
        const ch = await loadChannel(ref, deps, i.refresh);
        const up = await loadUploads(ch, 50, deps, { refresh: i.refresh });
        channels.set(ch.id, ch);
        baselines.set(ch.id, { value: medianBaseline(up.value), type: "median_last_20" });
        videos.push(...up.value);
        isCached &&= up.cached;
        fetchedAt = up.fetchedAt;
      } catch (e) {
        warnings.push(`${ref}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  const items = findOutliers(videos, channels, baselines, { days: i.days, minMultiplier: i.min_multiplier, maxSubs, includeShorts: i.include_shorts }, now);
  const status = quotaStatus();
  if (status.level !== "ok") warnings.push(`Quota at ${status.percent}% (${status.used}/${status.limit}).`);
  if (yt.name === "demo") warnings.push("DEMO DATA: fake numbers. Add YOUTUBE_API_KEY to tools/research/.env.");
  const top = items.slice(0, i.limit);
  return {
    data: { mode, filters: { days: i.days, min_multiplier: i.min_multiplier, max_subs: maxSubs || "none", include_shorts: i.include_shorts }, scanned_videos: videos.length, found: items.length, formula: OUTLIER_FORMULA, outliers: top },
    summary: `${mode} mode: ${items.length} outliers (≥${i.min_multiplier}× baseline, last ${i.days} days) in ${videos.length} videos. Showing ${top.length}.${top[0] ? ` Top: "${top[0].title}" ${top[0].multiplier}× (${top[0].views.toLocaleString("en-US")} views, ${top[0].channel_subs.toLocaleString("en-US")} subs).` : ""}`,
    source: yt.name,
    fetched_at: fetchedAt,
    cached: isCached,
    quota_used: unitsCounter() - before,
    warnings,
  };
}
