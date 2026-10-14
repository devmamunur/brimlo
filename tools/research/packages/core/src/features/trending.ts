import { z } from "zod";
import { getYouTube } from "../providers/index.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { ageDays, viewsPerDay } from "../scoring/keyword.ts";
import { isShort } from "../scoring/outlier.ts";
import type { Deps } from "./channels.ts";
import { nichePool } from "./niche.ts";

export const trendingInput = z.object({
  query: z.string().min(2).describe("Niche, e.g. 'incremental game demo'"),
  days: z.number().int().min(1).max(30).default(7).describe("Only videos published in the last N days"),
  limit: z.number().int().min(1).max(50).default(15),
  refresh: z.boolean().default(false),
});

export async function trending(input: z.infer<typeof trendingInput>, deps: Deps = {}): Promise<Envelope> {
  const i = trendingInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const p = await nichePool(i.query, i.days, deps, i.refresh);
  const ch = new Map(p.pool.channels.map((c) => [c.id, c]));
  const now = new Date();
  const list = p.pool.videos
    .filter((v) => !isShort(v.durationSec) && ageDays(v.publishedAt, now) <= i.days)
    .map((v) => ({ v, vpd: viewsPerDay(v.views, v.publishedAt, now) }))
    .sort((a, b) => b.vpd - a.vpd)
    .slice(0, i.limit);
  return {
    data: {
      window_days: i.days,
      note: "views_per_day = total views ÷ age (minimum 6 hours). It is an estimate, not the exact first-week number. Very new videos can look inflated.",
      videos: list.map(({ v, vpd }) => ({ id: v.id, title: v.title, channel: ch.get(v.channelId)?.title ?? v.channelId, channel_subs: ch.get(v.channelId)?.subscribers ?? 0, views: v.views, views_per_day: Math.round(vpd), age_days: Math.round(ageDays(v.publishedAt, now) * 10) / 10, duration_min: Math.round(v.durationSec / 6) / 10, url: `https://www.youtube.com/watch?v=${v.id}` })),
    },
    summary: `${list.length} fast-growing "${i.query}" videos from the last ${i.days} days.${list[0] ? ` Top: "${list[0].v.title}" (~${Math.round(list[0].vpd).toLocaleString("en-US")}/day).` : ""}`,
    source: yt.name,
    fetched_at: p.fetchedAt,
    cached: p.cached,
    quota_used: unitsCounter() - before,
    warnings: [...(yt.name === "demo" ? ["DEMO DATA: fake numbers."] : []), ...(quotaStatus().level !== "ok" ? ["Quota is above 70%."] : [])],
  };
}
