import { z } from "zod";
import { cached } from "../cache.ts";
import { upsertChannel, upsertVideo } from "../db/repo.ts";
import { getYouTube, type ChannelInfo, type VideoInfo } from "../providers/index.ts";
import { COSTS, quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { channelAverage, isShort } from "../scoring/outlier.ts";
import { truncate } from "../scoring/text.ts";
import type { Deps } from "./channels.ts";

/**
 * YouTube search like vidIQ's: last N hours, sort by views, long only, with
 * channel size, views per hour, outlier score, language and the GAME NAME
 * (read from links and the description, not only the title).
 * wave_scan runs several searches and groups the results by game.
 */

const SEARCH_TTL_SEC = 2 * 3600; // waves move fast: keep searches 2 hours only
const ONE_SEARCH_COST = COSTS.search + COSTS.videos + COSTS.channels; // ~102

// ---------- game name from a video (pure, tested) ----------

export interface GameGuess {
  name: string | null;
  /** Grouping key: steam:<appid>, itch:<dev>/<slug>, web:<host>/<slug> or name:<words> */
  key: string | null;
  link: string | null;
  source: "steam_link" | "itch_link" | "web_link" | "description" | "title" | "none";
}

const titleCase = (s: string) => s.replace(/\s+/g, " ").trim().replace(/\b([a-z])/g, (m) => m.toUpperCase());
const stripEdition = (n: string) => n.replace(/\s*[(\[]?\b(demo|playtest|prologue|full release|early access)\b[)\]]?\s*$/i, "").trim() || n;
const slugName = (slug: string) => {
  let raw = slug;
  try {
    raw = decodeURIComponent(slug);
  } catch {
    /* keep raw */
  }
  return stripEdition(titleCase(raw.replace(/[_+-]+/g, " ")));
};
const nameKey = (n: string) =>
  "name:" +
  n
    .toLowerCase()
    .replace(/\b(demo|full game|full release|gameplay|playtest|early access|steam|game)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Browser game sites: <url> → host + slug. Add more sites here. */
const WEB_GAME_SITES: RegExp[] = [
  /https?:\/\/(?:www\.)?(mana\.gs)\/([\w-]+)/i,
  /https?:\/\/(?:www\.)?(crazygames\.com)\/game\/([\w-]+)/i,
  /https?:\/\/(?:www\.)?(poki\.com)\/[a-z]{2}\/g\/([\w-]+)/i,
  /https?:\/\/(?:www\.)?(roblox\.com)\/games\/\d+\/([\w-]+)/i,
  /https?:\/\/(?:www\.)?(gamejolt\.com)\/games\/([\w-]+)/i,
  /https?:\/\/(?:www\.)?(armorgames\.com)\/(?:play\/\d+\/)?([\w-]+)/i,
  /https?:\/\/(?:www\.)?(kongregate\.com)\/(?:[a-z]{2}\/)?games\/[\w-]+\/([\w-]+)/i,
  /https?:\/\/(?:www\.)?(newgrounds\.com)\/portal\/view\/(\d+)/i,
];

const DESC_PHRASES =
  /(?:the game is called|this game is called|game is called|name of the game(?: is)?|game name|game title|game|juego|jogo|spiel)\s*[:=\-–]\s*["“']?([^\n"”'!?|(\[]{2,50})|(?:the game is called|this game is called|game is called|name of the game is)\s+["“']?([^\n"”'.!?|(\[]{2,50})/i;

const TITLE_NOISE = /\b(part|ep\.?|episode|day|#\d|full game|gameplay|walkthrough|let'?s play|no commentary|100%|ending|review|live|stream|test|reaction|tutorial|guide|shorts?)\b/i;

/** Self-promo links that are not the game. */
const NOT_A_GAME = /(twitch\.tv|tiktok\.com|twitter\.com|x\.com|instagram\.com|discord\.gg|discord\.com|patreon\.com|youtube\.com|youtu\.be|ko-fi\.com|amzn|amazon\.|streamlabs|throne\.com|merch)/i;

export function gameFromVideo(v: Pick<VideoInfo, "title" | "description">): GameGuess {
  const d = v.description ?? "";
  // 1. Steam store link (first one; usually the game)
  const st = /store\.steampowered\.com\/app\/(\d+)(?:\/([^/\s?#)]+))?/i.exec(d);
  if (st) return { name: st[2] ? slugName(st[2]) : `Steam app ${st[1]}`, key: `steam:${st[1]}`, link: `https://store.steampowered.com/app/${st[1]}`, source: "steam_link" };
  // 2. itch.io game page
  const it = /https?:\/\/([\w-]+)\.itch\.io\/([\w-]+)/i.exec(d);
  if (it) return { name: slugName(it[2]!), key: `itch:${it[1]!.toLowerCase()}/${it[2]!.toLowerCase()}`, link: it[0], source: "itch_link" };
  // 3. browser game sites
  for (const re of WEB_GAME_SITES) {
    const m = re.exec(d);
    if (m && !NOT_A_GAME.test(m[0])) return { name: /^\d+$/.test(m[2]!) ? null : slugName(m[2]!), key: `web:${m[1]!.toLowerCase()}/${m[2]!.toLowerCase()}`, link: m[0], source: "web_link" };
  }
  // 4. "The game is called X" / "Game: X" in the description
  const dp = DESC_PHRASES.exec(d);
  const fromDesc = (dp?.[1] ?? dp?.[2])?.replace(/\s+(on steam|by .*|here.*|link.*)$/i, "").replace(/[.,:;]+$/, "").trim();
  if (fromDesc && fromDesc.length >= 2 && !NOT_A_GAME.test(fromDesc) && !/^https?:/i.test(fromDesc)) {
    const name = stripEdition(titleCase(fromDesc));
    return { name, key: nameKey(name), link: null, source: "description" };
  }
  // 5. "I played 100% of X, a cozy …" / "X gameplay" in the description start
  const pl = /\b(?:i )?played (?:100% of |all of |through |the full game of )?([A-Z][\w'’!&:. ]{2,40}?)(?=,| -| –|\.|\s+(?:a|an|the|and|which|until|from|to)\b)/.exec(d.slice(0, 300));
  if (pl && !/^(this|it|the game|a game|every|all)\b/i.test(pl[1]!)) {
    const name = stripEdition(pl[1]!.trim());
    return { name, key: nameKey(name), link: null, source: "description" };
  }
  // 6. Title start: "X Gameplay …" / "X Demo …"
  const ts = /^([A-Z][\w'’!&:. ]{2,40}?)\s+(?:gameplay|playthrough|first look|demo)\b/i.exec(v.title);
  if (ts && !TITLE_NOISE.test(ts[1]!) && !/^(i|my|this|new|the best|best)\b/i.test(ts[1]!)) {
    const name = stripEdition(ts[1]!.trim());
    return { name, key: nameKey(name), link: null, source: "title" };
  }
  // 7. Title end: "... | Game Name" or "... - Game Name"
  const parts = v.title.split(/\s+[|–—-]\s+|\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    const last = parts[parts.length - 1]!.replace(/[#!?]+$/, "").replace(/\((?:demo|full game)\)/i, "").trim();
    if (last.length >= 3 && last.length <= 40 && /[a-z]{2}/i.test(last) && !TITLE_NOISE.test(last)) return { name: stripEdition(last), key: nameKey(last), link: null, source: "title" };
  }
  return { name: null, key: null, link: null, source: "none" };
}

// ---------- language (pure) ----------

const NON_LATIN = /[Ѐ-ӿ؀-ۿऀ-ॿঀ-৿฀-๿぀-ヿ一-鿿가-힯]/;
const OTHER_LANG_WORDS =
  /\b(jogo|juego|jugando|joguei|spiel|ich|und|das|der|mit|eine|el|los|las|una|con|pero|para|é|não|você|um|uma|mais|très|avec|une|je|oyun|oynadım|bir|ve|gra|grę|jest|nie)\b/i;

/** "en", another code, or "en?"/"other?" when guessed from the title. */
export function videoLanguage(v: Pick<VideoInfo, "title" | "language">): { lang: string; english: boolean; guessed: boolean } {
  if (v.language) {
    const lang = v.language.toLowerCase();
    return { lang, english: lang.startsWith("en"), guessed: false };
  }
  if (NON_LATIN.test(v.title) || OTHER_LANG_WORDS.test(v.title)) return { lang: "other?", english: false, guessed: true };
  return { lang: "en?", english: true, guessed: true };
}

// ---------- shared row builder ----------

export interface SearchRow {
  id: string;
  title: string;
  channel: string;
  channel_id: string;
  channel_subs: number;
  views: number;
  age_hours: number;
  views_per_hour: number;
  /** views ÷ channel average views per video. Estimate, like vidIQ's outlier score. */
  outlier_score: number;
  duration_min: number;
  language: string;
  english: boolean;
  game: string | null;
  game_key: string | null;
  game_link: string | null;
  game_source: GameGuess["source"];
  live: boolean;
  /** YouTube category id; "20" = Gaming. */
  category: string | null;
  published_at: string;
  url: string;
  description_start: string;
}

export function toRow(v: VideoInfo, ch: ChannelInfo | undefined, now = new Date()): SearchRow {
  const hours = Math.max(1, (now.getTime() - Date.parse(v.publishedAt)) / 3600000);
  const avg = ch ? channelAverage(ch.viewCount, ch.videoCount) : 0;
  const g = gameFromVideo(v);
  const l = videoLanguage(v);
  return {
    id: v.id,
    title: v.title,
    channel: ch?.title ?? v.channelId,
    channel_id: v.channelId,
    channel_subs: ch?.subscribers ?? 0,
    views: v.views,
    age_hours: Math.round(hours * 10) / 10,
    views_per_hour: Math.round(v.views / hours),
    outlier_score: avg > 0 ? Math.round((v.views / avg) * 10) / 10 : 0,
    duration_min: Math.round(v.durationSec / 6) / 10,
    language: l.lang,
    english: l.english,
    game: g.name,
    game_key: g.key,
    game_link: g.link,
    game_source: g.source,
    live: Boolean(v.live),
    category: v.categoryId ?? null,
    published_at: v.publishedAt,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    description_start: truncate((v.description ?? "").replace(/\s+/g, " "), 160),
  };
}

/** Drop live streams (not comparable) and non-gaming videos without a game link. */
export function keepRow(r: SearchRow, o: { includeLive: boolean }): boolean {
  if (!o.includeLive && r.live) return false;
  if (r.category && r.category !== "20" && !r.game_link) return false;
  return true;
}

// ---------- fetch (cached search + videos + channels) ----------

interface SearchPool {
  videos: VideoInfo[];
  channels: ChannelInfo[];
}

async function searchPool(query: string, o: { hours: number; order: "viewCount" | "date" | "relevance"; duration: "any" | "short" | "medium" | "long"; english: boolean; gaming: boolean }, deps: Deps, refresh: boolean) {
  const yt = deps.yt ?? getYouTube();
  const q = query.trim().toLowerCase();
  return cached<SearchPool>(
    `yts:v2:${yt.name}:${q}:${o.hours}:${o.order}:${o.duration}:${o.english ? "en" : "all"}:${o.gaming ? "g" : "any"}`,
    SEARCH_TTL_SEC,
    async () => {
      const publishedAfter = o.hours > 0 ? new Date(Date.now() - o.hours * 3600000).toISOString() : undefined;
      const ids = await yt.searchVideoIds(q, { maxResults: 50, publishedAfter, order: o.order, videoDuration: o.duration, relevanceLanguage: o.english ? "en" : "", videoCategoryId: o.gaming ? "20" : undefined });
      const videos = await yt.getVideos(ids);
      const channels = await yt.getChannels([...new Set(videos.map((v) => v.channelId))]);
      for (const c of channels) upsertChannel(c, yt.name);
      for (const v of videos) upsertVideo(v, yt.name);
      return { value: { videos, channels }, source: yt.name };
    },
    { refresh },
  );
}

function warningsFor(source: string): string[] {
  const w: string[] = [];
  const s = quotaStatus();
  if (s.level !== "ok") w.push(`Quota at ${s.percent}% (${s.used}/${s.limit}).`);
  if (source === "demo") w.push("DEMO DATA: fake numbers. Add YOUTUBE_API_KEY to tools/research/.env.");
  return w;
}

// ---------- youtube_search ----------

export const youtubeSearchInput = z.object({
  query: z.string().min(2).describe("Search words, e.g. 'incremental game'"),
  hours: z.number().int().min(0).max(24 * 365).default(48).describe("Only videos from the last N hours (48 = the launch/wave window). 0 = all time"),
  order: z.enum(["viewCount", "date", "relevance"]).default("viewCount"),
  duration: z.enum(["any", "short", "medium", "long"]).default("long").describe("YouTube filter: long > 20 min, medium 4–20 min, short < 4 min"),
  english_only: z.boolean().default(true).describe("Bias the search to English (relevanceLanguage=en) and drop videos that are clearly not English"),
  min_outlier: z.number().min(0).default(0).describe("Keep only videos with outlier_score ≥ N"),
  gaming_only: z.boolean().default(true).describe("Search only the YouTube Gaming category"),
  include_live: z.boolean().default(false).describe("Keep live streams (off: they are not comparable)"),
  limit: z.number().int().min(1).max(50).default(25),
  estimate_only: z.boolean().default(false),
  refresh: z.boolean().default(false),
});

export async function youtubeSearch(input: z.infer<typeof youtubeSearchInput>, deps: Deps = {}): Promise<Envelope> {
  const i = youtubeSearchInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  if (i.estimate_only) {
    return { data: { estimated_units: ONE_SEARCH_COST, note: "0 if the same search ran in the last 2 hours (cache)." }, summary: `This search costs about ${ONE_SEARCH_COST} units (0 if cached).`, source: yt.name, fetched_at: new Date().toISOString(), cached: false, quota_used: 0, warnings: [] };
  }
  const before = unitsCounter();
  const res = await searchPool(i.query, { hours: i.hours, order: i.order, duration: i.duration, english: i.english_only, gaming: i.gaming_only }, deps, i.refresh);
  const ch = new Map(res.value.channels.map((c) => [c.id, c]));
  const now = new Date();
  let rows = res.value.videos
    .filter((v) => i.duration === "short" || !isShort(v.durationSec))
    .map((v) => toRow(v, ch.get(v.channelId), now))
    .filter((r) => keepRow(r, { includeLive: i.include_live }));
  if (i.english_only) rows = rows.filter((r) => r.english);
  rows = rows.filter((r) => r.outlier_score >= i.min_outlier);
  if (i.order === "viewCount") rows.sort((a, b) => b.views - a.views);
  rows = rows.slice(0, i.limit);
  const top = rows[0];
  return {
    data: {
      query: i.query,
      window_hours: i.hours,
      note: "outlier_score = views ÷ the channel's average views per video (rough estimate). views_per_hour = views ÷ age. game = read from Steam/itch/browser-game links, then the description ('The game is called …'), then the title end. Check games marked source 'title' or null by opening the video.",
      videos: rows,
    },
    summary: `${rows.length} videos for "${i.query}" ${i.hours ? `in the last ${i.hours} h` : "(all time)"} (${i.order}, ${i.duration}).${top ? ` Top: "${truncate(top.title, 60)}" ${top.views.toLocaleString("en-US")} views, ${top.outlier_score}x, game: ${top.game ?? "?"}.` : ""}`,
    source: res.source,
    fetched_at: res.fetchedAt,
    cached: res.cached,
    quota_used: unitsCounter() - before,
    warnings: warningsFor(res.source),
  };
}

// ---------- wave_scan ----------

export const DEFAULT_WAVE_QUERIES = [
  "incremental game",
  "idle game",
  "satisfying game upgrades",
  "zombie incremental",
  "survivor incremental",
  "browser game",
  "free game",
];

export const waveScanInput = z.object({
  queries: z.array(z.string().min(2)).min(1).max(12).default(DEFAULT_WAVE_QUERIES).describe("Searches to run. Each costs ~102 units (0 if run in the last 2 hours)"),
  hours: z.number().int().min(6).max(24 * 14).default(48).describe("Window. 48 = the Brimlo launch/wave window"),
  duration: z.enum(["any", "medium", "long"]).default("long"),
  min_outlier: z.number().min(0).default(3).describe("A video counts as a wave signal at outlier_score ≥ N (or very high views per hour on a small channel)"),
  gaming_only: z.boolean().default(true).describe("Search only the YouTube Gaming category"),
  include_live: z.boolean().default(false),
  history_check: z.number().int().min(0).max(15).default(10).describe("Up to N OPEN/CROWDED candidates (all of them by default), search the game name with NO time limit (~102 units each) to find when the English wave really started and how many English videos exist in total. A 48-h search alone cannot see older videos"),
  limit: z.number().int().min(1).max(40).default(15),
  estimate_only: z.boolean().default(false),
  refresh: z.boolean().default(false),
});

export interface WaveGame {
  game: string;
  key: string;
  link: string | null;
  name_source: GameGuess["source"];
  videos: number;
  english_long_videos: number;
  other_language_videos: number;
  total_views: number;
  best_outlier: number;
  best_views_per_hour: number;
  /** Sum of views per hour of the English videos: how hot the English wave is right now. */
  english_views_per_hour: number;
  biggest_channel_subs: number;
  /** Hours since the first English signal video (outlier or fast) — the Brimlo clock. null = no English signal. */
  english_wave_age_hours: number | null;
  inside_48h: boolean;
  crowded: boolean;
  status: "OPEN" | "CROWDED" | "OLD" | "NO_ENGLISH_SIGNAL";
  /** Filled by the history check (all time, not only the window). */
  history?: { checked: boolean; english_long_videos_all_time: number; first_english_signal_days_ago: number | null; oldest_english_video_days_ago: number | null; biggest_english_channel_subs: number; note: string; possible_name_clash: { title: string; channel: string; channel_subs: number; views: number; days_ago: number | null; url: string }[] };
  top: Pick<SearchRow, "title" | "channel" | "channel_subs" | "views" | "age_hours" | "outlier_score" | "views_per_hour" | "language" | "url">[];
  found_by: string[];
}

/** A wave signal needs real views (≥ 1,000) AND a high outlier score or fast growth on a small channel. */
const isSignal = (r: SearchRow, minOutlier: number) => r.views >= 1_000 && (r.outlier_score >= minOutlier || (r.channel_subs < 50_000 && r.views_per_hour >= 300));

/** Pure: group search rows by game and judge each wave. */
export function groupWaves(rows: (SearchRow & { query: string })[], minOutlier: number, windowHours = 48): { games: WaveGame[]; unknown: SearchRow[] } {
  const groups = new Map<string, (SearchRow & { query: string })[]>();
  const unknown: SearchRow[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.id)) {
      // same video found by another query: remember the query
      for (const list of groups.values()) list.filter((x) => x.id === r.id).forEach((x) => (x.query = [...new Set(`${x.query},${r.query}`.split(","))].join(",")));
      continue;
    }
    seen.add(r.id);
    if (!r.game_key) {
      if (isSignal(r, minOutlier)) unknown.push(r);
      continue;
    }
    const list = groups.get(r.game_key) ?? [];
    list.push(r);
    groups.set(r.game_key, list);
  }
  // merge groups that are the same game: name key + link key, or a Steam demo app + the main app
  const byName = new Map<string, string>();
  for (const k of [...groups.keys()].sort((a, b) => Number(a.startsWith("name:")) - Number(b.startsWith("name:")))) {
    const list = groups.get(k)!;
    const nk = nameKey(list.find((r) => r.game)?.game ?? "");
    if (nk === "name:") continue;
    const target = byName.get(nk);
    if (target && target !== k) {
      groups.get(target)!.push(...list);
      groups.delete(k);
    } else byName.set(nk, k);
  }
  const games: WaveGame[] = [];
  for (const [key, list] of groups) {
    const signals = list.filter((r) => isSignal(r, minOutlier));
    if (!signals.length) continue;
    const english = list.filter((r) => r.english);
    const englishSignals = signals.filter((r) => r.english);
    const firstEnglish = englishSignals.length ? Math.max(...englishSignals.map((r) => r.age_hours)) : null;
    const englishLong = english.filter((r) => r.duration_min >= 10).length;
    const biggest = Math.max(...list.map((r) => r.channel_subs));
    const crowded = englishLong > 5 || english.some((r) => r.channel_subs > 100_000 && r.duration_min >= 10);
    const inside = firstEnglish !== null && firstEnglish <= windowHours;
    const linked = list.find((r) => r.game_link);
    games.push({
      game: (linked ?? list[0]!).game ?? key,
      key,
      link: linked?.game_link ?? null,
      name_source: (linked ?? list[0]!).game_source,
      videos: list.length,
      english_long_videos: englishLong,
      other_language_videos: list.length - english.length,
      total_views: list.reduce((s, r) => s + r.views, 0),
      best_outlier: Math.max(...list.map((r) => r.outlier_score)),
      best_views_per_hour: Math.max(...list.map((r) => r.views_per_hour)),
      english_views_per_hour: english.reduce((s, r) => s + r.views_per_hour, 0),
      biggest_channel_subs: biggest,
      english_wave_age_hours: firstEnglish,
      inside_48h: inside,
      crowded,
      status: firstEnglish === null ? "NO_ENGLISH_SIGNAL" : !inside ? "OLD" : crowded ? "CROWDED" : "OPEN",
      top: [...list]
        .sort((a, b) => b.views - a.views)
        .slice(0, 4)
        .map((r) => ({ title: r.title, channel: r.channel, channel_subs: r.channel_subs, views: r.views, age_hours: r.age_hours, outlier_score: r.outlier_score, views_per_hour: r.views_per_hour, language: r.language, url: r.url })),
      found_by: [...new Set(list.flatMap((r) => r.query.split(",")))],
    });
  }
  const rank = { OPEN: 0, CROWDED: 1, NO_ENGLISH_SIGNAL: 2, OLD: 3 } as const;
  games.sort((a, b) => rank[a.status] - rank[b.status] || b.english_views_per_hour - a.english_views_per_hour || b.best_outlier - a.best_outlier);
  unknown.sort((a, b) => b.outlier_score - a.outlier_score);
  return { games, unknown };
}

/** Pure: judge a game's all-time English history from a no-time-limit search of its name.
 * Strong match = same link key, or the same game name read from the video's link/description/title. Only strong matches can make a game OLD.
 * Videos that only contain the words (no game name read) are "possible name clash" (shown, not counted). Roblox/Minecraft/Fortnite are skipped. */
export function judgeHistory(g: WaveGame, rows: SearchRow[], minOutlier: number, windowHours: number): WaveGame {
  const nk = nameKey(g.game);
  const words = g.game.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const text = (r: SearchRow) => (r.title + " " + r.description_start).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ");
  const strong: SearchRow[] = [];
  const weak: SearchRow[] = [];
  for (const r of rows) {
    if (r.game_key === g.key) {
      strong.push(r);
      continue;
    }
    // a different game that shares the name (Roblox / Minecraft maps, other platforms)
    if (/roblox|minecraft|fortnite/i.test(r.title + " " + r.description_start + " " + (r.game_link ?? ""))) continue;
    // the game name read from the video (link, description, title) is the same → same game (e.g. Steam demo + main app)
    if (r.game && nameKey(r.game) === nk) strong.push(r);
    // the words only appear in the title/description → maybe the same game, maybe a name clash
    else if (words.length >= 4 && text(r).includes(words)) weak.push(r);
  }
  const enOf = (list: SearchRow[]) => list.filter((r) => r.english && r.duration_min >= 10);
  const en = enOf(strong);
  const enWeak = enOf(weak);
  const sig = (list: SearchRow[]) => list.filter((r) => isSignal(r, minOutlier) || r.views >= 5_000);
  const firstSignalH = sig(en).length ? Math.max(...sig(en).map((r) => r.age_hours)) : null;
  const oldestH = en.length ? Math.max(...en.map((r) => r.age_hours)) : null;
  const biggest = en.length ? Math.max(...en.map((r) => r.channel_subs)) : 0;
  const days = (h: number | null) => (h === null ? null : Math.round((h / 24) * 10) / 10);
  const olderWeak = sig(enWeak).filter((r) => r.age_hours > windowHours).sort((a, b) => b.views - a.views);
  const history = {
    checked: true,
    english_long_videos_all_time: en.length,
    first_english_signal_days_ago: days(firstSignalH),
    oldest_english_video_days_ago: days(oldestH),
    biggest_english_channel_subs: biggest,
    note: "",
    possible_name_clash: olderWeak.slice(0, 3).map((r) => ({ title: r.title, channel: r.channel, channel_subs: r.channel_subs, views: r.views, days_ago: days(r.age_hours), url: r.url })),
  };
  let status = g.status;
  if (firstSignalH !== null && firstSignalH > windowHours) {
    status = "OLD";
    history.note = `English wave started ~${days(firstSignalH)} days ago (older videos of the same game found). Not a fresh wave — only a re-wave.`;
  } else if (en.length > 5 || biggest > 100_000) {
    status = status === "OLD" ? "OLD" : "CROWDED";
    history.note = `${en.length} English long videos in total, biggest channel ${biggest.toLocaleString("en-US")} subs.`;
  } else history.note = `Fresh: ${en.length} English long videos of this game in total, first signal ${days(firstSignalH) ?? "-"} days ago.`;
  if (olderWeak.length) history.note += ` ${olderWeak.length} older video(s) share the name but may be a different game (name clash) — check in Chrome.`;
  const firstH = Math.max(firstSignalH ?? 0, g.english_wave_age_hours ?? 0);
  return { ...g, status, english_wave_age_hours: firstH || g.english_wave_age_hours, inside_48h: status !== "OLD" && g.inside_48h, crowded: status === "CROWDED", history };
}

export async function waveScan(input: z.infer<typeof waveScanInput>, deps: Deps = {}): Promise<Envelope> {
  const i = waveScanInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const queries = [...new Set(i.queries.map((q) => q.trim().toLowerCase()))];
  if (i.estimate_only) {
    const units = (queries.length + i.history_check) * ONE_SEARCH_COST;
    return { data: { queries, estimated_units: units, note: "Searches run in the last 2 hours cost 0 (cache)." }, summary: `Wave scan: ${queries.length} searches ≈ ${units} units (less if cached).`, source: yt.name, fetched_at: new Date().toISOString(), cached: false, quota_used: 0, warnings: [] };
  }
  const before = unitsCounter();
  const now = new Date();
  const rows: (SearchRow & { query: string })[] = [];
  let allCached = true;
  let source: string = yt.name;
  const failed: string[] = [];
  for (const q of queries) {
    try {
      const res = await searchPool(q, { hours: i.hours, order: "viewCount", duration: i.duration, english: false, gaming: i.gaming_only }, deps, i.refresh);
      allCached &&= res.cached;
      source = res.source;
      const ch = new Map(res.value.channels.map((c) => [c.id, c]));
      for (const v of res.value.videos) {
        if (isShort(v.durationSec)) continue;
        const r = toRow(v, ch.get(v.channelId), now);
        if (keepRow(r, { includeLive: i.include_live })) rows.push({ ...r, query: q });
      }
    } catch (e) {
      failed.push(`${q}: ${e instanceof Error ? e.message : String(e)}`);
      if (e instanceof Error && /quota/i.test(e.message)) break;
    }
  }
  const grouped = groupWaves(rows, i.min_outlier, i.hours);
  let games = grouped.games;
  const unknown = grouped.unknown;
  // history check: every OPEN/CROWDED candidate (OPEN first), up to history_check
  const candidates = games.filter((g) => g.status === "OPEN" || g.status === "CROWDED");
  const toCheck: WaveGame[] = [];
  for (const g of candidates) {
    if (toCheck.length >= i.history_check) break;
    toCheck.push(g);
    try {
      const res = await searchPool(g.game, { hours: 0, order: "relevance", duration: "any", english: true, gaming: false }, deps, i.refresh);
      const ch = new Map(res.value.channels.map((c) => [c.id, c]));
      const hist = res.value.videos.filter((v) => !isShort(v.durationSec)).map((v) => toRow(v, ch.get(v.channelId), now)).filter((r) => !r.live);
      games = games.map((x) => (x.key === g.key ? judgeHistory(x, hist, i.min_outlier, i.hours) : x));
    } catch (e) {
      failed.push(`history ${g.game}: ${e instanceof Error ? e.message : String(e)}`);
      if (e instanceof Error && /quota/i.test(e.message)) break;
    }
  }
  // fill the shortlist from checked games first; refill if the check pushed some out
  const rank = { OPEN: 0, CROWDED: 1, NO_ENGLISH_SIGNAL: 2, OLD: 3 } as const;
  games.sort((a, b) => rank[a.status] - rank[b.status] || Number(Boolean(b.history)) - Number(Boolean(a.history)) || b.english_views_per_hour - a.english_views_per_hour);
  const open = games.filter((g) => g.status === "OPEN");
  const warnings = warningsFor(source);
  if (failed.length) warnings.push(`Some searches failed: ${failed.join(" | ")}`);
  if (unknown.length) warnings.push(`${unknown.length} signal videos have no game name found. Open them (description / first minute) — a hit game can hide here.`);
  return {
    data: {
      checked_at: now.toISOString(),
      window_hours: i.hours,
      queries,
      rules:
        "status OPEN = first English signal video ≤ window AND ≤ 5 English long videos AND no English long video from a channel over 100K. CROWDED = inside the window but many/big English videos. OLD = first English signal older than the window. Signal = ≥ 1,000 views AND (outlier_score ≥ min_outlier, or a channel under 50K with ≥ 300 views/hour). All scores are estimates. Only searched videos are seen: always confirm the pick with the real YouTube search in Chrome.",
      shortlist_note: "Up to 3 OPEN games by wave numbers only (English views per hour). Claude still runs the quality gate (free/owned, niche, runs in CrossOver/Chrome) before calling one BEST.",
      shortlist: games.filter((g) => g.status === "OPEN").slice(0, 3).map((g) => ({ game: g.game, history_checked: Boolean(g.history), english_wave_age_hours: g.english_wave_age_hours, english_long_videos: g.history?.english_long_videos_all_time ?? g.english_long_videos, link: g.link })),
      history_note: i.history_check ? `History checked for the top ${toCheck.length} candidates. Games without 'history' were only seen in the ${i.hours}-h window: run wave_scan again with more history_check or check them in Chrome.` : "No history check: a game can look fresh but have older videos.",
      games: games.slice(0, i.limit),
      unknown_game_signals: unknown.slice(0, 10).map((r) => ({ title: r.title, channel: r.channel, channel_subs: r.channel_subs, views: r.views, age_hours: r.age_hours, outlier_score: r.outlier_score, language: r.language, url: r.url, description_start: r.description_start })),
    },
    summary: `Wave scan (${queries.length} searches + ${toCheck.length} history checks, last ${i.hours} h): ${games.length} games with signals, ${open.length} OPEN${open.length ? `: ${open.slice(0, 3).map((g) => `${g.game} (wave ${g.english_wave_age_hours} h, ${g.history ? `${g.history.english_long_videos_all_time} EN long all time` : "history not checked"})`).join("; ")}` : ""}. ${unknown.length} signal videos without a game name.`,
    source,
    fetched_at: now.toISOString(),
    cached: allCached,
    quota_used: unitsCounter() - before,
    warnings,
  };
}
