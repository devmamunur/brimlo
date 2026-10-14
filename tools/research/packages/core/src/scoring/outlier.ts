import { median, viewsPerDay } from "./keyword.ts";

/**
 * Outlier multiplier = video views ÷ baseline. ESTIMATE.
 * baseline = median views of the channel's recent long-form videos (best), or
 * channel total views ÷ video count (rough fallback when we only know the channel totals).
 */
export const OUTLIER_FORMULA =
  "multiplier = views ÷ baseline. baseline = median views of the channel's last ~20 long-form uploads (excluding Shorts) when known, " +
  "otherwise channel_total_views ÷ channel_video_count (rough). Videos under 3 days old are flagged 'young' because their views are still growing.";

export interface Candidate {
  id: string;
  views: number;
  publishedAt: string;
  durationSec: number;
}

export const SHORT_MAX_SEC = 61;
export const isShort = (durationSec: number) => durationSec > 0 && durationSec <= SHORT_MAX_SEC;

export function medianBaseline(videos: Candidate[], take = 20): number {
  const recent = [...videos]
    .filter((v) => !isShort(v.durationSec))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, take);
  return median(recent.map((v) => v.views));
}

export function channelAverage(viewCount: number, videoCount: number): number {
  return videoCount > 0 ? viewCount / videoCount : 0;
}

export function multiplier(views: number, baseline: number): number {
  if (baseline <= 0) return 0;
  return Math.round((views / baseline) * 10) / 10;
}

export const isYoung = (publishedAt: string, now = new Date()) => now.getTime() - Date.parse(publishedAt) < 3 * 86400000;

export { viewsPerDay };
