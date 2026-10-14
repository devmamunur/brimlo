import { z } from "zod";
import { getDb } from "../db/client.ts";
import { OWN_CHANNEL_ID, YPP } from "../dashboard.ts";
import { analyticsReport, oauthConfigured, oauthConnected, rowsToObjects } from "../providers/oauth.ts";
import { getYouTube } from "../providers/index.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { median, viewsPerDay } from "../scoring/keyword.ts";
import { isShort } from "../scoring/outlier.ts";
import { loadChannel, loadUploads, type Deps } from "./channels.ts";

export const ownChannelInput = z.object({
  days: z.number().int().min(7).max(90).default(28).describe("Analytics window for per-video stats (needs OAuth)"),
  refresh: z.boolean().default(false),
});

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Your own channel.
 * Public part (API key, ~3 units): subscribers, views, recent uploads.
 * OAuth part (optional): watch hours of the last 365 days, per-video views, average view duration and percentage.
 * NOT available in any API: impressions and click-through rate (CTR). Read those in YouTube Studio.
 */
export async function ownChannel(input: z.infer<typeof ownChannelInput>, deps: Deps = {}): Promise<Envelope> {
  const i = ownChannelInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const warnings: string[] = [];
  const ch = await loadChannel(yt.name === "demo" ? "democh_brimlo_0" : OWN_CHANNEL_ID, deps, i.refresh);
  const up = await loadUploads(ch, 20, deps, { refresh: i.refresh, ttlSec: 6 * 3600 });
  const now = new Date();
  const recent = up.value.filter((v) => !isShort(v.durationSec));

  let analytics: any = null;
  let watchHours: number | null = null;
  if (oauthConnected() && yt.name !== "demo") {
    try {
      const end = day(new Date(now.getTime() - 86400000));
      const total = rowsToObjects(await analyticsReport({ startDate: day(new Date(now.getTime() - 365 * 86400000)), endDate: end, metrics: "estimatedMinutesWatched,views,subscribersGained" }))[0] as any;
      const win = rowsToObjects(await analyticsReport({ startDate: day(new Date(now.getTime() - i.days * 86400000)), endDate: end, metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained" }))[0] as any;
      const perVideo = rowsToObjects(await analyticsReport({ startDate: day(new Date(now.getTime() - i.days * 86400000)), endDate: end, dimensions: "video", metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained", sort: "-views", maxResults: "15" })) as any[];
      const titles = new Map(up.value.map((v) => [v.id, v.title]));
      watchHours = Math.round(((total?.estimatedMinutesWatched ?? 0) / 60) * 10) / 10;
      analytics = {
        last_365_days: { watch_hours: watchHours, views: total?.views ?? 0, subscribers_gained: total?.subscribersGained ?? 0 },
        [`last_${i.days}_days`]: { views: win?.views ?? 0, watch_hours: Math.round(((win?.estimatedMinutesWatched ?? 0) / 60) * 10) / 10, avg_view_duration_sec: win?.averageViewDuration ?? 0, avg_view_percentage: win?.averageViewPercentage ?? 0, subscribers_gained: win?.subscribersGained ?? 0 },
        per_video: perVideo.map((r) => ({ id: r.video, title: titles.get(r.video) ?? null, views: r.views, watch_hours: Math.round((r.estimatedMinutesWatched / 60) * 10) / 10, avg_view_duration_sec: r.averageViewDuration, avg_view_percentage: r.averageViewPercentage, subscribers_gained: r.subscribersGained })),
      };
    } catch (e) {
      warnings.push(`Analytics failed: ${e instanceof Error ? e.message : e}`);
    }
  } else if (yt.name !== "demo") {
    warnings.push(oauthConfigured() ? "OAuth client is set but not connected. Run: pnpm research:cli auth" : "Watch hours need OAuth (optional). See README, 'Connect your own channel'.");
  }

  getDb().prepare("INSERT OR REPLACE INTO own_channel_snapshots (taken_at, subscribers, views, video_count, watch_hours_365d, watch_hours_source, source) VALUES (?,?,?,?,?,?,?)").run(day(now), ch.subscribers, ch.viewCount, ch.videoCount, watchHours, watchHours === null ? null : "analytics-api", yt.name);
  if (watchHours === null) {
    const prev = getDb().prepare("SELECT watch_hours_365d FROM own_channel_snapshots WHERE watch_hours_365d IS NOT NULL ORDER BY taken_at DESC LIMIT 1").get() as any;
    watchHours = prev?.watch_hours_365d ?? null;
  }

  const subsGoal = YPP.subs;
  if (quotaStatus().level !== "ok") warnings.push("Quota is above 70%.");
  if (yt.name === "demo") warnings.push("DEMO DATA: this is a fake channel.");
  return {
    data: {
      channel: { id: ch.id, title: ch.title, handle: ch.handle },
      ypp: {
        subscribers: { value: ch.subscribers, goal: subsGoal, percent: Math.min(100, Math.round((ch.subscribers / subsGoal) * 1000) / 10), left: Math.max(0, subsGoal - ch.subscribers) },
        watch_hours: { value: watchHours, goal: YPP.watchHours, percent: watchHours === null ? null : Math.min(100, Math.round((watchHours / YPP.watchHours) * 1000) / 10), source: analytics ? "analytics API (all watch time, last 365 days, an estimate of what YPP counts)" : watchHours === null ? "not connected" : "last saved value", note: "YPP counts public watch hours of the last 12 months. Check YouTube Studio for the official number." },
        rule: "1,000 subs + 8,000 watch hours (CLAUDE.md, rule for applicants from 1 Feb 2027).",
      },
      public: { subscribers: ch.subscribers, total_views: ch.viewCount, total_videos: ch.videoCount, recent_median_views: Math.round(median(recent.map((v) => v.views))) },
      recent_uploads: recent.slice(0, 10).map((v) => ({ id: v.id, title: v.title, published_at: v.publishedAt, views: v.views, views_per_day: Math.round(viewsPerDay(v.views, v.publishedAt, now)), duration_min: Math.round(v.durationSec / 6) / 10, likes: v.likes, comments: v.comments })),
      analytics,
      not_available: "Impressions and click-through rate (CTR) are not in any YouTube API. Read them in YouTube Studio and log them in analytics/weekly-reviews.md.",
    },
    summary: `${ch.title}: ${ch.subscribers.toLocaleString("en-US")}/${subsGoal.toLocaleString("en-US")} subs${watchHours === null ? ", watch hours unknown (connect OAuth)" : `, ${watchHours}/${YPP.watchHours.toLocaleString("en-US")} watch hours`}.`,
    source: yt.name,
    fetched_at: up.fetchedAt,
    cached: up.cached,
    quota_used: unitsCounter() - before,
    warnings,
  };
}
