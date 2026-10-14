import { z } from "zod";
import { getDb } from "../db/client.ts";
import { allVideoRows } from "../db/repo.ts";
import { suggest } from "../providers/autocomplete.ts";
import { getYouTube } from "../providers/index.ts";
import { config } from "../config.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { median } from "../scoring/keyword.ts";
import { channelAverage, isShort } from "../scoring/outlier.ts";
import { bigrams, tokens, topCounts } from "../scoring/text.ts";
import { detectTemplate, scoreTitle, TEMPLATE_NAMES, type TemplateId } from "../scoring/title.ts";
import type { Deps } from "./channels.ts";
import { nichePool } from "./niche.ts";

/** Names we should never put in a title: tracked competitors + channels seen in research (live data only). */
export function creatorNames(): string[] {
  const rows = getDb().prepare("SELECT title, handle FROM competitors").all() as { title: string; handle: string | null }[];
  const names = rows.flatMap((r) => [r.title, r.handle ?? ""]);
  return [...new Set(names.map((n) => n.toLowerCase().replace(/^@/, "").trim()).filter((n) => n.length >= 4))];
}

// ---------- score_title ----------
export const scoreTitleInput = z.object({
  title: z.string().min(3).optional().describe("One title to score"),
  titles: z.array(z.string().min(3)).max(5).optional().describe("Up to 5 titles to score and compare"),
  keyword: z.string().optional().describe("Main keyword the title should contain. Default: 'incremental'"),
  check_demand: z.boolean().default(true).describe("Check YouTube autocomplete for the keyword (free, no quota)"),
});
export interface TitleDeps {
  suggest?: (q: string) => Promise<string[]>;
}
export async function scoreTitleTool(input: z.infer<typeof scoreTitleInput>, deps: TitleDeps = {}): Promise<Envelope> {
  const i = scoreTitleInput.parse(input);
  const list = i.titles?.length ? i.titles : i.title ? [i.title] : [];
  if (!list.length) throw new Error("Give `title` or `titles`.");
  let suggestions: string[] | null = null;
  const warnings: string[] = [];
  if (i.check_demand) {
    try {
      suggestions = await (deps.suggest ?? suggest)((i.keyword ?? "incremental game").toLowerCase());
    } catch {
      warnings.push("Autocomplete failed. The 'demand' part was skipped.");
    }
  }
  const reference = allVideoRows(!config().demo).filter((v) => !isShort(v.duration_sec)).slice(0, 150).map((v) => ({ id: v.id, title: v.title, views: v.views }));
  const names = creatorNames();
  const results = list.map((t) => scoreTitle(t, { keyword: i.keyword, creatorNames: names, suggestions, reference: reference.length >= 10 ? reference : null }));
  if (!names.length) warnings.push("No competitors are tracked, so creator names were not checked. Run competitors_seed.");
  const ranked = [...results].sort((a, b) => b.score - a.score);
  return {
    data: { results, ranking: ranked.map((r) => ({ title: r.title, score: r.score })), best: ranked[0]?.title, how: "Checklist score from playbook/titles.md: length 15, template 15, keyword 15, CAPS 10, rules (no emoji/creator names) 10, power words 15, clarity 10, demand 5, proven-shape 5. Parts that cannot be checked are left out and the score is rescaled. It is not a prediction of views." },
    summary: results.length === 1 ? `"${results[0]!.title}": ${results[0]!.score}/100 (${results[0]!.label}). Top fix: ${results[0]!.fixes[0] ?? "none"}` : `Best of ${results.length}: "${ranked[0]!.title}" (${ranked[0]!.score}/100).`,
    source: "local",
    fetched_at: new Date().toISOString(),
    cached: false,
    quota_used: 0,
    warnings,
  };
}

// ---------- title_patterns ----------
export const titlePatternsInput = z.object({
  query: z.string().min(2).describe("Niche, e.g. 'incremental game'"),
  days: z.number().int().min(7).max(365).default(90),
  min_multiplier: z.number().min(1).default(3).describe("Use videos at least N× their channel's average. If fewer than 8 match, the top 15 by views/day are used"),
  refresh: z.boolean().default(false),
});
const STRUCT: [string, (t: string) => boolean][] = [
  ["starts with 'I' (first person)", (t) => /^i\s/i.test(t)],
  ["contains 'where you'", (t) => /\bwhere you\b/i.test(t)],
  ["has a CAPS word", (t) => /\b[A-Z]{3,}\b/.test(t)],
  ["has a number", (t) => /\d/.test(t)],
  ["has a '|' suffix", (t) => /\|/.test(t)],
  ["is a question", (t) => /\?/.test(t)],
  ["has the word 'incremental'", (t) => /incremental/i.test(t)],
];
export async function titlePatterns(input: z.infer<typeof titlePatternsInput>, deps: Deps = {}): Promise<Envelope> {
  const i = titlePatternsInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const p = await nichePool(i.query, i.days, deps, i.refresh);
  const ch = new Map(p.pool.channels.map((c) => [c.id, c]));
  const scored = p.pool.videos
    .filter((v) => !isShort(v.durationSec))
    .map((v) => { const c = ch.get(v.channelId); return { v, mult: c ? v.views / Math.max(1, channelAverage(c.viewCount, c.videoCount)) : 0 }; });
  let pick = scored.filter((x) => x.mult >= i.min_multiplier);
  let basis = `outliers (≥${i.min_multiplier}× channel average)`;
  if (pick.length < 8) {
    pick = [...scored].sort((a, b) => b.v.views - a.v.views).slice(0, 15);
    basis = "top 15 videos by views (too few outliers)";
  }
  const byTpl = new Map<string, typeof pick>();
  for (const x of pick) {
    const k = detectTemplate(x.v.title) ?? "none";
    byTpl.set(k, [...(byTpl.get(k) ?? []), x]);
  }
  const patterns = [...byTpl.entries()]
    .map(([id, xs]) => ({ template: id === "none" ? "no playbook template" : `${id}: ${TEMPLATE_NAMES[id as TemplateId]}`, count: xs.length, share: Math.round((xs.length / pick.length) * 100) / 100, median_views: Math.round(median(xs.map((x) => x.v.views))), examples: [...xs].sort((a, b) => b.v.views - a.v.views).slice(0, 3).map((x) => ({ title: x.v.title, views: x.v.views })) }))
    .sort((a, b) => b.count - a.count);
  const titles = pick.map((x) => x.v.title);
  const struct = STRUCT.map(([name, fn]) => ({ feature: name, share: Math.round((titles.filter(fn).length / Math.max(1, titles.length)) * 100) / 100 }));
  const lens = titles.map((t) => t.length);
  return {
    data: { basis, titles_analyzed: titles.length, patterns, structure: struct, avg_title_length: Math.round(lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length)), common_words: topCounts(titles.flatMap((t) => tokens(t)), 12, 2), common_phrases: topCounts(titles.flatMap((t) => bigrams(t)), 10, 2), note: "Study the SHAPE. Do not copy exact words or creator names (playbook rule 7 and 6)." },
    summary: `${titles.length} titles from ${basis}. Most common shape: ${patterns[0]?.template ?? "n/a"} (${patterns[0]?.count ?? 0}).`,
    source: yt.name,
    fetched_at: p.fetchedAt,
    cached: p.cached,
    quota_used: unitsCounter() - before,
    warnings: [...(yt.name === "demo" ? ["DEMO DATA: fake numbers."] : []), ...(quotaStatus().level !== "ok" ? ["Quota is above 70%."] : [])],
  };
}
