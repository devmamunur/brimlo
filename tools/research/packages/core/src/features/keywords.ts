import { z } from "zod";
import { cached, DAY_SEC, peek } from "../cache.ts";
import { config } from "../config.ts";
import { logSearch, saveKeywordSnapshot, upsertChannel, upsertVideo } from "../db/repo.ts";
import { DEMO_SUGGESTIONS } from "../providers/demo.ts";
import { expandSuggestions, type Suggestion } from "../providers/autocomplete.ts";
import { getYouTube, type ChannelInfo, type VideoInfo, type YouTubeProvider } from "../providers/index.ts";
import { COSTS, quotaStatus, unitsCounter } from "../quota/guard.ts";
import { ageDays, competitionScore, median, opportunityScore, viewsPerDay } from "../scoring/keyword.ts";
import type { Envelope } from "../result.ts";

export const keywordInput = z.object({
  query: z.string().min(2).describe("Keyword or phrase, e.g. 'incremental game'"),
  limit: z.number().int().min(1).max(50).default(20).describe("How many suggestions and top videos to show (default 20)"),
  expand: z.boolean().default(true).describe("Expand autocomplete with a–z and modifier words (free, no quota)"),
  refresh: z.boolean().default(false).describe("Ignore the 24h cache and fetch again (costs quota)"),
  estimate_only: z.boolean().default(false).describe("Do not call anything. Only show the quota cost and cache state"),
});
export type KeywordInput = z.infer<typeof keywordInput>;

/** search.list + videos.list + channels.list */
export const KEYWORD_COST = COSTS.search + COSTS.videos + COSTS.channels;

interface Raw {
  provider: string;
  suggestions: Suggestion[];
  suggestionsFailed: boolean;
  videos: VideoInfo[];
  channels: ChannelInfo[];
}

export interface KeywordDeps {
  yt?: YouTubeProvider;
  expand?: typeof expandSuggestions;
}

export async function keywordResearch(input: KeywordInput, deps: KeywordDeps = {}): Promise<Envelope> {
  const { query, limit, expand, refresh } = keywordInput.parse(input);
  const q = query.trim().toLowerCase();
  const yt = deps.yt ?? getYouTube();
  const key = `kw:v1:${yt.name}:${q}:${expand}`;
  const warnings: string[] = [];

  if (input.estimate_only) {
    const hit = !refresh && peek(key);
    const units = hit || yt.name === "demo" ? 0 : KEYWORD_COST;
    const status = quotaStatus();
    return {
      data: { estimated_units: units, would_use_cache: Boolean(hit), full_cost_if_fetched: KEYWORD_COST, breakdown: { "search.list": COSTS.search, "videos.list": COSTS.videos, "channels.list": COSTS.channels, autocomplete: 0 }, quota: status },
      summary: `Estimate for "${q}": ${units} units${hit ? " (cached)" : ""}. Used today ${status.used}/${status.limit}.`,
      source: yt.name,
      fetched_at: new Date().toISOString(),
      cached: Boolean(hit),
      quota_used: 0,
      warnings,
    };
  }

  const before = unitsCounter();
  const res = await cached<Raw>(
    key,
    DAY_SEC,
    async () => {
      const ac = await (deps.expand ?? expandSuggestions)(q, expand);
      const ids = await yt.searchVideoIds(q, { maxResults: 50 });
      const videos = await yt.getVideos(ids);
      const channels = await yt.getChannels([...new Set(videos.map((v) => v.channelId))]);
      return { value: { provider: yt.name, suggestions: ac.suggestions, suggestionsFailed: ac.failed === ac.total, videos, channels }, source: yt.name };
    },
    { refresh },
  );
  const raw = res.value;
  const source = raw.provider;

  if (!res.cached) {
    for (const c of raw.channels) upsertChannel(c, source);
    for (const v of raw.videos) upsertVideo(v, source);
  }

  let suggestions = raw.suggestions;
  if (raw.suggestionsFailed || !suggestions.length) {
    if (config().demo) suggestions = DEMO_SUGGESTIONS(q).map((text, position) => ({ text, from: "seed", position }));
    else warnings.push("Autocomplete failed (network?). Suggestions are empty.");
  }

  const subs = new Map(raw.channels.map((c) => [c.id, c]));
  const now = new Date();
  const rows = raw.videos.map((v) => ({ views: v.views, publishedAt: v.publishedAt, channelSubs: subs.get(v.channelId)?.subscribers ?? 0 }));
  const competition = competitionScore(rows);
  const opportunity = opportunityScore(rows, now);

  const topVideos = raw.videos.slice(0, limit).map((v, i) => ({
    rank: i + 1,
    id: v.id,
    title: v.title,
    channel: subs.get(v.channelId)?.title ?? v.channelId,
    channel_subs: subs.get(v.channelId)?.subscribers ?? 0,
    views: v.views,
    views_per_day: Math.round(viewsPerDay(v.views, v.publishedAt, now)),
    age_days: Math.round(ageDays(v.publishedAt, now)),
    duration_min: Math.round(v.durationSec / 60),
    url: `https://www.youtube.com/watch?v=${v.id}`,
  }));

  if (!res.cached) {
    saveKeywordSnapshot({ query: q, competition: competition.score, opportunity: opportunity.score, suggestions: suggestions.slice(0, 50), topVideoIds: raw.videos.map((v) => v.id), source });
  }

  const quotaUsed = unitsCounter() - before;
  const status = quotaStatus();
  if (status.level !== "ok") warnings.push(`Quota at ${status.percent}% (${status.used}/${status.limit}). Stop line is 90%.`);
  if (source === "demo") warnings.push("DEMO DATA: videos, channels and scores are fake (autocomplete suggestions are real). Add YOUTUBE_API_KEY to tools/research/.env for real data.");
  logSearch("keyword_research", { query: q, limit, expand }, quotaUsed, res.cached, source);

  const medViews = Math.round(median(raw.videos.map((v) => v.views)));
  return {
    data: {
      query: q,
      suggestions: suggestions.slice(0, limit).map((s) => ({ text: s.text, from: s.from })),
      suggestions_total: suggestions.length,
      competition,
      opportunity,
      stats: {
        results_analyzed: raw.videos.length,
        median_views: medViews,
        median_views_per_day: Math.round(median(raw.videos.map((v) => viewsPerDay(v.views, v.publishedAt, now)))),
        median_channel_subs: Math.round(median(rows.map((r) => r.channelSubs))),
        small_channel_wins: rows.filter((r) => r.channelSubs < 50_000 && r.views >= 3 * r.channelSubs).length,
      },
      top_videos: topVideos,
      note: "Scores are estimates from the top 50 search results. They are not real search volume.",
    },
    summary: `"${q}": competition ${competition.score}/100 (${competition.label}), opportunity ${opportunity.score}/100 (${opportunity.label}). ${suggestions.length} suggestions, ${raw.videos.length} videos analyzed, median ${medViews.toLocaleString("en-US")} views.${source === "demo" ? " [DEMO DATA]" : ""}`,
    source,
    fetched_at: res.fetchedAt,
    cached: res.cached,
    quota_used: quotaUsed,
    warnings,
  };
}
