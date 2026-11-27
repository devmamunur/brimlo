import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { getYouTube, type VideoInfo } from "../providers/index.ts";
import { unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { isShort } from "../scoring/outlier.ts";
import { loadChannel, loadUploads, type Deps } from "./channels.ts";
import { gameFromVideo, videoLanguage } from "./youtubeSearch.ts";

/** Repo root = tools/research/packages/core/src/features → up 6. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../..");

export const channelDumpInput = z.object({
  channel: z.string().min(1).describe("@handle, channel id (UC...) or channel URL"),
  max: z.number().int().min(1).max(3000).default(1500).describe("Max uploads to read (newest first). Cost ≈ 2 units per 50 videos"),
  save: z.boolean().default(true).describe("Write the full dump to research/data/channels/<handle>.json (in git, so the data is not lost)"),
  refresh: z.boolean().default(false),
});

const fmtHour = (d: Date, tz: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
const fmtDay = (d: Date, tz: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short" }).format(d);

export interface DumpRow {
  id: string;
  title: string;
  published_utc: string;
  publish_dhaka: string;
  publish_et: string;
  weekday_et: string;
  views: number;
  likes: number;
  comments: number;
  duration_min: number;
  is_short: boolean;
  live: boolean;
  game: string | null;
  game_key: string | null;
  game_source: string;
  language: string;
  title_chars: number;
  caps_words: number;
  has_number: boolean;
  game_name_in_title: boolean;
  thumbnail: string;
  url: string;
  description_start: string;
}

export function dumpRow(v: VideoInfo): DumpRow {
  const d = new Date(v.publishedAt);
  const g = gameFromVideo(v);
  const words = v.title.split(/\s+/);
  const gameWords = (g.name ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  return {
    id: v.id,
    title: v.title,
    published_utc: v.publishedAt,
    publish_dhaka: fmtHour(d, "Asia/Dhaka"),
    publish_et: fmtHour(d, "America/New_York"),
    weekday_et: fmtDay(d, "America/New_York"),
    views: v.views,
    likes: v.likes,
    comments: v.comments,
    duration_min: Math.round(v.durationSec / 6) / 10,
    is_short: isShort(v.durationSec),
    live: Boolean(v.live),
    game: g.name,
    game_key: g.key,
    game_source: g.source,
    language: videoLanguage(v).lang,
    title_chars: v.title.length,
    caps_words: words.filter((w) => w.length >= 2 && /[A-Z]/.test(w) && w === w.toUpperCase() && /[A-Z]{2}/.test(w)).length,
    has_number: /\d/.test(v.title),
    game_name_in_title: gameWords.length >= 3 && v.title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").includes(gameWords),
    thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    description_start: (v.description ?? "").slice(0, 300),
  };
}

/** Every upload of a channel (not only the last 50), with game name, publish time in Dhaka + US Eastern, and title features. Saved as JSON for later studies. */
export async function channelDump(input: z.infer<typeof channelDumpInput>, deps: Deps = {}): Promise<Envelope> {
  const i = channelDumpInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const ch = await loadChannel(i.channel, deps, i.refresh);
  const up = await loadUploads(ch, i.max, deps, { refresh: i.refresh });
  const rows = up.value.map(dumpRow).sort((a, b) => a.published_utc.localeCompare(b.published_utc));
  const long = rows.filter((r) => !r.is_short && !r.live);
  const handle = (ch.handle ?? ch.id).replace(/^@/, "");
  let file: string | null = null;
  if (i.save) {
    file = resolve(REPO_ROOT, "research/data/channels", `${handle.toLowerCase()}.json`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ channel: { id: ch.id, title: ch.title, handle: ch.handle, subscribers: ch.subscribers, views: ch.viewCount, videos: ch.videoCount }, fetched_at: new Date().toISOString(), uploads: rows }, null, 1));
  }
  const first = rows[0]?.published_utc ?? null;
  return {
    data: {
      channel: { id: ch.id, title: ch.title, handle: ch.handle, subscribers: ch.subscribers },
      uploads: rows.length,
      long_videos: long.length,
      shorts: rows.filter((r) => r.is_short).length,
      first_upload: first,
      file,
      newest: rows.slice(-10).reverse().map((r) => ({ title: r.title, views: r.views, published_utc: r.published_utc, game: r.game })),
    },
    summary: `${ch.title}: ${rows.length} uploads (${long.length} long) since ${first?.slice(0, 10)}${file ? `, saved to ${file}` : ""}.`,
    source: yt.name,
    fetched_at: new Date().toISOString(),
    cached: up.cached,
    quota_used: unitsCounter() - before,
    warnings: [],
  };
}
