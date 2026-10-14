import { z } from "zod";
import { cached, DAY_SEC } from "../cache.ts";
import { upsertChannel, upsertVideo } from "../db/repo.ts";
import { getYouTube, type ChannelInfo, type VideoInfo, type YouTubeProvider } from "../providers/index.ts";
import type { ChannelRef } from "../providers/types.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { median, viewsPerDay } from "../scoring/keyword.ts";
import { isShort, medianBaseline, multiplier } from "../scoring/outlier.ts";

export interface Deps {
  yt?: YouTubeProvider;
}

/** "@handle", "UCxxxxxxxxxxxxxxxxxxxxxx", or a youtube.com URL. */
export function parseChannelRef(input: string): ChannelRef {
  const s = input.trim();
  const id = /(?:^|\/channel\/)(UC[\w-]{22})(?:[/?#]|$)/.exec(s);
  if (id) return { id: id[1]! };
  const h = /youtube\.com\/(@[\w.\-]+)/.exec(s);
  if (h) return { handle: h[1]! };
  if (/^democh_/.test(s)) return { id: s };
  return { handle: s.startsWith("@") ? s : `@${s}` };
}

const refKey = (r: ChannelRef) => ("id" in r ? r.id : r.handle.toLowerCase());

export async function loadChannel(input: string, deps: Deps = {}, refresh = false): Promise<ChannelInfo> {
  const yt = deps.yt ?? getYouTube();
  const ref = parseChannelRef(input);
  const res = await cached<ChannelInfo | null>(
    `chan:v1:${yt.name}:${refKey(ref)}`,
    DAY_SEC,
    async () => ({ value: (await yt.resolveChannel(ref)) ?? null, source: yt.name }),
    { refresh },
  );
  if (!res.value) throw new Error(`Channel not found: ${input}`);
  if (!res.cached) upsertChannel(res.value, yt.name);
  return res.value;
}

/** Newest uploads of a channel with full video data. Cost: 1 (playlist) + 1 (videos) units per 50. */
export async function loadUploads(channel: ChannelInfo, n: number, deps: Deps = {}, opts: { refresh?: boolean; ttlSec?: number } = {}) {
  const yt = deps.yt ?? getYouTube();
  const playlist = channel.uploadsPlaylist ?? (channel.id.startsWith("UC") ? `UU${channel.id.slice(2)}` : "");
  const res = await cached<VideoInfo[]>(
    `up:v1:${yt.name}:${channel.id}:${n}`,
    opts.ttlSec ?? DAY_SEC,
    async () => {
      const ids = await yt.getUploadIds(playlist, n);
      return { value: await yt.getVideos(ids), source: yt.name };
    },
    { refresh: opts.refresh },
  );
  if (!res.cached) for (const v of res.value) upsertVideo(v, yt.name);
  return res;
}

const baseEnv = (yt: YouTubeProvider, before: number, warnings: string[] = []) => {
  const status = quotaStatus();
  if (status.level !== "ok") warnings.push(`Quota at ${status.percent}% (${status.used}/${status.limit}).`);
  if (yt.name === "demo") warnings.push("DEMO DATA: fake numbers. Add YOUTUBE_API_KEY to tools/research/.env.");
  return { source: yt.name as string, quota_used: unitsCounter() - before, warnings };
};

const vrow = (v: VideoInfo, now: Date, base?: number) => ({
  id: v.id,
  title: v.title,
  published_at: v.publishedAt,
  views: v.views,
  views_per_day: Math.round(viewsPerDay(v.views, v.publishedAt, now)),
  duration_min: Math.round(v.durationSec / 6) / 10,
  is_short: isShort(v.durationSec),
  ...(base ? { multiplier: multiplier(v.views, base) } : {}),
  url: `https://www.youtube.com/watch?v=${v.id}`,
});

// ---------- channel_videos ----------
export const channelVideosInput = z.object({
  channel: z.string().min(1).describe("@handle, channel id (UC...) or channel URL"),
  limit: z.number().int().min(1).max(50).default(20),
  sort: z.enum(["date", "views", "views_per_day"]).default("date"),
  include_shorts: z.boolean().default(false),
  refresh: z.boolean().default(false),
});

export async function channelVideos(input: z.infer<typeof channelVideosInput>, deps: Deps = {}): Promise<Envelope> {
  const i = channelVideosInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const ch = await loadChannel(i.channel, deps, i.refresh);
  const up = await loadUploads(ch, 50, deps, { refresh: i.refresh });
  const now = new Date();
  const longform = up.value.filter((v) => !isShort(v.durationSec));
  const base = medianBaseline(up.value);
  let list = i.include_shorts ? up.value : longform;
  const key = { date: (v: VideoInfo) => Date.parse(v.publishedAt), views: (v: VideoInfo) => v.views, views_per_day: (v: VideoInfo) => viewsPerDay(v.views, v.publishedAt, now) }[i.sort];
  list = [...list].sort((a, b) => key(b) - key(a)).slice(0, i.limit);
  const meta = baseEnv(yt, before);
  return {
    data: { channel: { id: ch.id, title: ch.title, handle: ch.handle, subscribers: ch.subscribers }, baseline_median_views: Math.round(base), videos: list.map((v) => vrow(v, now, base)) },
    summary: `${ch.title}: ${list.length} videos (sorted by ${i.sort}). Median views of recent long-form: ${Math.round(base).toLocaleString("en-US")}.`,
    fetched_at: up.fetchedAt,
    cached: up.cached,
    ...meta,
  };
}

// ---------- channel_stats ----------
export const channelStatsInput = z.object({
  channel: z.string().min(1).describe("@handle, channel id (UC...) or channel URL"),
  refresh: z.boolean().default(false),
});

export async function channelStats(input: z.infer<typeof channelStatsInput>, deps: Deps = {}): Promise<Envelope> {
  const i = channelStatsInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const ch = await loadChannel(i.channel, deps, i.refresh);
  const up = await loadUploads(ch, 50, deps, { refresh: i.refresh });
  const now = new Date();
  const days = (v: VideoInfo) => (now.getTime() - Date.parse(v.publishedAt)) / 86400000;
  const long = up.value.filter((v) => !isShort(v.durationSec));
  const last30 = up.value.filter((v) => days(v) <= 30);
  const last90 = up.value.filter((v) => days(v) <= 90);
  const best = [...long].sort((a, b) => b.views - a.views)[0];
  const med = median(long.slice(0, 20).map((v) => v.views));
  const newer = median(long.slice(0, 5).map((v) => v.views));
  const older = median(long.slice(5, 20).map((v) => v.views));
  const meta = baseEnv(yt, before);
  return {
    data: {
      id: ch.id,
      title: ch.title,
      handle: ch.handle,
      country: ch.country,
      subscribers: ch.subscribers,
      total_videos: ch.videoCount,
      total_views: ch.viewCount,
      uploads_last_30_days: last30.length,
      uploads_last_90_days: last90.length,
      uploads_per_week_90d: Math.round((last90.length / (90 / 7)) * 10) / 10,
      shorts_share_of_recent: up.value.length ? Math.round((1 - long.length / up.value.length) * 100) / 100 : 0,
      avg_duration_min_longform: long.length ? Math.round(long.reduce((a, v) => a + v.durationSec, 0) / long.length / 6) / 10 : 0,
      median_views_longform_last20: Math.round(med),
      median_views_per_day_last20: Math.round(median(long.slice(0, 20).map((v) => viewsPerDay(v.views, v.publishedAt, now)))),
      trend_newest5_vs_prev15: older > 0 ? Math.round((newer / older) * 100) / 100 : null,
      best_recent_video: best ? vrow(best, now, med) : null,
      note: "Computed from the last 50 uploads. View counts are totals today, so very new videos look weak.",
    },
    summary: `${ch.title}: ${ch.subscribers.toLocaleString("en-US")} subs, ${last30.length} uploads in 30 days, median ${Math.round(med).toLocaleString("en-US")} views (long-form, last 20).`,
    fetched_at: up.fetchedAt,
    cached: up.cached,
    ...meta,
  };
}
