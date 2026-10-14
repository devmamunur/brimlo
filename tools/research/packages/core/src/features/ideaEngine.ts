import { z } from "zod";
import { peek } from "../cache.ts";
import { getDb } from "../db/client.ts";
import { getYouTube } from "../providers/index.ts";
import { COSTS, quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { median } from "../scoring/keyword.ts";
import { isShort } from "../scoring/outlier.ts";
import { tokens } from "../scoring/text.ts";
import type { Deps } from "./channels.ts";
import { saveIdea } from "./ideas.ts";
import { keywordResearch, KEYWORD_COST } from "./keywords.ts";
import { nichePool, POOL_COST } from "./niche.ts";
import { outliers } from "./outliers.ts";
import { titlePatterns } from "./titles.ts";

export const ideaEngineInput = z.object({
  topic: z.string().min(2).describe("A game name or topic, e.g. 'idle mining game' or 'Rock Crusher'"),
  days: z.number().int().min(7).max(365).default(90),
  save_as: z.string().optional().describe("If set, save the evidence as an idea with this title (status 'idea')"),
  estimate_only: z.boolean().default(false).describe("Only show the quota cost (about 204 units when nothing is cached)"),
  refresh: z.boolean().default(false),
});

const RULES = [
  "Mac/CrossOver check first (games/checklist.md) before planning any game.",
  "One game = one video. No multi-part series.",
  "Never put other creators' names in titles, tags or descriptions.",
  "No long silent idle stretches: speed up or cut.",
  "Game budget max $10–15/month. Free first: demos, playtests, free-to-play.",
];

/**
 * Collects evidence only. Claude (you) writes the final ideas and titles from it.
 * Cost: keyword_research (~102) + niche pool (~102). Cached parts cost 0.
 */
export async function ideaEngine(input: z.infer<typeof ideaEngineInput>, deps: Deps = {}): Promise<Envelope> {
  const i = ideaEngineInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const topic = i.topic.trim().toLowerCase();

  if (i.estimate_only) {
    const kwCached = Boolean(peek(`kw:v1:${yt.name}:${topic}:true`));
    const poolCached = Boolean(peek(`pool:v1:${yt.name}:${topic}:${i.days}`));
    const units = yt.name === "demo" ? 0 : (kwCached && !i.refresh ? 0 : KEYWORD_COST) + (poolCached && !i.refresh ? 0 : POOL_COST);
    return { data: { estimated_units: units, keyword_research_cached: kwCached, niche_pool_cached: poolCached, full_cost: KEYWORD_COST + POOL_COST, search_calls: 2, search_cost_each: COSTS.search, quota: quotaStatus() }, summary: `idea_engine "${topic}": ~${units} units.`, source: yt.name, fetched_at: new Date().toISOString(), cached: false, quota_used: 0, warnings: [] };
  }

  const before = unitsCounter();
  const warnings: string[] = [];
  const kw: any = (await keywordResearch({ query: topic, limit: 10, expand: true, refresh: i.refresh, estimate_only: false }, { yt })).data;
  const out: any = (await outliers({ query: topic, days: i.days, min_multiplier: 5, limit: 10, include_shorts: false, refresh: i.refresh }, deps)).data;
  const patterns: any = (await titlePatterns({ query: topic, days: i.days, min_multiplier: 3, refresh: false }, deps)).data;
  const pool = await nichePool(topic, i.days, deps);

  // competitor coverage from the local database
  const tt = tokens(topic);
  const comp = getDb().prepare("SELECT v.id, v.title, v.views, v.published_at, c.title AS channel FROM videos v JOIN competitors k ON k.channel_id = v.channel_id JOIN channels c ON c.id = v.channel_id").all() as any[];
  const covered = comp.filter((v) => { const vt = new Set(tokens(v.title)); return tt.length > 0 && tt.filter((w) => vt.has(w)).length >= Math.max(1, Math.ceil(tt.length / 2)); }).sort((a, b) => b.views - a.views);

  // gaps: autocomplete phrases that no top video title contains
  const topTitles = pool.pool.videos.map((v) => new Set(tokens(v.title)));
  const sug = (kw.suggestions as { text: string }[]).map((s) => s.text);
  const gaps = sug.filter((s) => { const st = tokens(s); return s.toLowerCase() !== topic && st.length >= 2 && !topTitles.some((t) => st.every((w) => t.has(w))); }).slice(0, 10);

  const evidence = {
    topic,
    keyword: { competition: kw.competition.score, opportunity: kw.opportunity.score, median_views: kw.stats.median_views, median_views_per_day: kw.stats.median_views_per_day, small_channel_wins: kw.stats.small_channel_wins, formulas_in: "keyword_research" },
    top_suggestions: sug.slice(0, 10),
    gaps_no_top_video_covers_these_searches: gaps,
    outliers: out.outliers.slice(0, 8).map((o: any) => ({ title: o.title, views: o.views, multiplier: o.multiplier, channel_subs: o.channel_subs, duration_min: o.duration_min, url: o.url })),
    title_shapes: patterns.patterns.slice(0, 4).map((p: any) => ({ template: p.template, count: p.count, median_views: p.median_views, example: p.examples[0]?.title })),
    competitor_coverage: { videos_found: covered.length, channels: [...new Set(covered.map((v) => v.channel))], best: covered.slice(0, 3).map((v) => ({ title: v.title, channel: v.channel, views: v.views })), tracked_competitors_checked: new Set(comp.map((v) => v.channel)).size },
    typical_length_min: Math.round(median(pool.pool.videos.filter((v) => !isShort(v.durationSec)).map((v) => v.durationSec / 60))),
  };
  if (!comp.length) warnings.push("No competitor videos stored, so coverage is empty. Run competitors_seed then competitors_refresh.");
  if (yt.name === "demo") warnings.push("DEMO DATA: fake numbers.");
  if (quotaStatus().level !== "ok") warnings.push("Quota is above 70%.");
  let saved: unknown = null;
  if (i.save_as) saved = saveIdea({ title: i.save_as, game: i.topic, status: "idea", evidence });

  return {
    data: { evidence, rules: RULES, saved_idea: saved, next_steps: ["Pick 1–2 angles from outliers + gaps.", "Write 3 titles using playbook/titles.md templates, then run score_title.", "Check the game on Mac/CrossOver and its price before planning.", "Save the best with idea_save (include evidence)."] },
    summary: `Idea pack for "${topic}": competition ${kw.competition.score}, opportunity ${kw.opportunity.score}, ${out.found} outliers, ${gaps.length} search gaps, ${covered.length} competitor videos on this topic.`,
    source: yt.name,
    fetched_at: new Date().toISOString(),
    cached: unitsCounter() === before,
    quota_used: unitsCounter() - before,
    warnings,
  };
}
