import { z } from "zod";
import { getYouTube } from "../providers/index.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { isShort } from "../scoring/outlier.ts";
import { bigrams, jaccard, tokens, topCounts } from "../scoring/text.ts";
import type { Deps } from "./channels.ts";
import { nichePool } from "./niche.ts";
import { creatorNames, } from "./titles.ts";
import { loadVideo } from "./videos.ts";

export const TAG_LIMIT = 500;

/** Words that fill almost every description (social links, calls to action) and say nothing about the game. */
const BOILERPLATE = new Set("channel discord twitter instagram facebook tiktok reddit patreon twitch join member members membership become subscribe subscribed subscribing follow social links link support supporter thanks thank music business inquiries inquiry email contact merch store shop copyright rights reserved free watch watching like comment comments share notification notifications bell series playlist playlists following check community server server please enjoy video videos upload uploaded stream streams live gaming gamer gamers youtube official website steam wishlist wishlisted demo page epidemic sound chats super code use affiliate sponsor sponsored sponsorship promo discount coupon patron donate donation paypal kofi".split(" "));
const isBoiler = (phrase: string) => phrase.split(" ").some((w) => BOILERPLATE.has(w));

/** Join tags with commas until the 500-character limit (YouTube counts the commas). */
export function fitTags(tags: string[], limit = TAG_LIMIT): string[] {
  const out: string[] = [];
  let len = 0;
  for (const t of tags) {
    const add = t.length + (out.length ? 1 : 0);
    if (len + add > limit) continue;
    out.push(t);
    len += add;
  }
  return out;
}

const cleanDescription = (d: string) =>
  d
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/#[\w]+/g, " ")
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, " ")
    .replace(/@\w+/g, " ");

export const descriptionAndTagsInput = z.object({
  keyword: z.string().min(2).optional().describe("Niche keyword, e.g. 'incremental game'"),
  video: z.string().optional().describe("A video id/URL to compare with the niche tags (adds missing/extra tags)"),
  days: z.number().int().min(7).max(365).default(180),
  top: z.number().int().min(5).max(50).default(25).describe("How many top videos of the niche to learn from"),
  refresh: z.boolean().default(false),
});

export async function descriptionAndTags(input: z.infer<typeof descriptionAndTagsInput>, deps: Deps = {}): Promise<Envelope> {
  const i = descriptionAndTagsInput.parse(input);
  if (!i.keyword && !i.video) throw new Error("Give `keyword` or `video`.");
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const warnings: string[] = [];
  let target: Awaited<ReturnType<typeof loadVideo>>["video"] | undefined;
  if (i.video) target = (await loadVideo(i.video, deps)).video;
  const keyword = (i.keyword ?? tokens(target!.title).slice(0, 3).join(" ")).toLowerCase();
  const p = await nichePool(keyword, i.days, deps, i.refresh);

  const chTitle = new Map(p.pool.channels.map((c) => [c.id, c.title.toLowerCase()]));
  const banned = [...new Set([...chTitle.values(), ...creatorNames()])].filter((n) => n.length >= 4);
  const bannedTokens = new Set(banned.flatMap((n) => tokens(n)));
  const mentionsCreator = (s: string) => banned.some((n) => s.toLowerCase().includes(n));

  const vids = p.pool.videos.filter((v) => !isShort(v.durationSec)).sort((a, b) => b.views - a.views).slice(0, i.top);
  const tagCounts = topCounts(vids.flatMap((v) => [...new Set(v.tags.map((t) => t.toLowerCase().trim()))]).filter((t) => t && !mentionsCreator(t)), 60);
  const suggestedTags = fitTags([keyword, ...tagCounts.filter((t) => t.count >= 2).map((t) => t.text), ...tagCounts.filter((t) => t.count < 2).map((t) => t.text)].filter((t, k, a) => a.indexOf(t) === k));

  const descWords = topCounts(vids.flatMap((v) => [...new Set(tokens(cleanDescription(v.description)))]).filter((w) => !bannedTokens.has(w) && !BOILERPLATE.has(w)), 15, 2);
  const descPhrases = topCounts(vids.flatMap((v) => [...new Set(bigrams(cleanDescription(v.description)))]).filter((ph) => !ph.split(" ").some((w) => bannedTokens.has(w)) && !isBoiler(ph)), 12, 2);
  const hashtags = topCounts(vids.flatMap((v) => [...new Set((v.description.match(/#\w+/g) ?? []).map((h) => h.toLowerCase()))]).filter((h) => !mentionsCreator(h.slice(1))), 5, 2).map((h) => h.text);

  // Draft lines use the niche's own tags (most reliable), then description phrases.
  const kwTokens = new Set(tokens(keyword));
  const pool2 = [...tagCounts.filter((t) => t.count >= 2 && t.text.length >= 8 && !isBoiler(t.text) && t.text !== keyword && tokens(t.text).some((w) => !kwTokens.has(w))).map((t) => t.text), ...descPhrases.map((p) => p.text)];
  const k1 = pool2[0] ?? "idle upgrades";
  const k2 = pool2.slice(1).find((p) => jaccard(tokens(p), tokens(k1)) < 0.5) ?? "numbers go up";
  const firstLines = [`A calm, full-length look at this ${keyword}: live commentary, no cuts, no rush.`, `Here we play ${k1} and ${k2}. Watch the numbers only go up.`];

  let compare: unknown = null;
  if (target) {
    const mine = new Set(target.tags.map((t) => t.toLowerCase()));
    const niche = suggestedTags.map((t) => t.toLowerCase());
    compare = { video: { id: target.id, title: target.title, tag_count: target.tags.length }, missing_niche_tags: niche.filter((t) => !mine.has(t)).slice(0, 15), tags_not_used_by_top_videos: [...mine].filter((t) => !niche.includes(t)).slice(0, 15) };
  }
  if (p.pool.videos.length < 10) warnings.push("Few videos found. Tag stats may be weak.");
  warnings.push("Rule: never add other creators' names. Channel and tracked-competitor names were filtered out automatically; check the list once by eye.");
  if (yt.name === "demo") warnings.push("DEMO DATA: fake numbers.");
  if (quotaStatus().level !== "ok") warnings.push("Quota is above 70%.");
  return {
    data: { keyword, learned_from_videos: vids.length, suggested_tags: suggestedTags, suggested_tags_characters: suggestedTags.join(",").length, tag_frequency: tagCounts.slice(0, 25), suggested_hashtags: hashtags, description_keywords: descWords, description_phrases: descPhrases, description_first_lines_draft: firstLines, compare, note: "Tags can include game names from other videos: keep only the ones that fit your video. Tags matter little for ranking today; the title, thumbnail and first lines of the description matter more. The first lines are a draft: rewrite them in your own words." },
    summary: `${suggestedTags.length} suggested tags (${suggestedTags.join(",").length}/${TAG_LIMIT} chars) from ${vids.length} top "${keyword}" videos.`,
    source: yt.name,
    fetched_at: p.fetchedAt,
    cached: p.cached,
    quota_used: unitsCounter() - before,
    warnings,
  };
}
