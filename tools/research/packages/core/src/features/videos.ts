import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { cached, DAY_SEC } from "../cache.ts";
import { RESEARCH_ROOT } from "../config.ts";
import { getDb } from "../db/client.ts";
import { upsertVideo } from "../db/repo.ts";
import { getYouTube, type VideoInfo, type YouTubeProvider } from "../providers/index.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { viewsPerDay } from "../scoring/keyword.ts";
import { medianBaseline, multiplier } from "../scoring/outlier.ts";
import { truncate } from "../scoring/text.ts";
import { loadChannel, loadUploads, type Deps } from "./channels.ts";

const run = promisify(execFile);

export function parseVideoId(input: string): string {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s) || /^demo(up)?_[\w-]+$/.test(s)) return s;
  const m = /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/.exec(s);
  if (m) return m[1]!;
  throw new Error(`Cannot find a video id in: ${input}`);
}

export async function loadVideo(input: string, deps: Deps = {}, refresh = false) {
  const yt = deps.yt ?? getYouTube();
  const id = parseVideoId(input);
  const res = await cached<VideoInfo | null>(`vid:v1:${yt.name}:${id}`, 6 * 3600, async () => ({ value: (await yt.getVideos([id]))[0] ?? null, source: yt.name }), { refresh });
  if (!res.value) throw new Error(`Video not found or private: ${input}`);
  if (!res.cached) upsertVideo(res.value, yt.name);
  return { ...res, video: res.value, yt };
}

function envelope(data: unknown, summary: string, yt: YouTubeProvider | string, fetchedAt: string, isCached: boolean, before: number, warnings: string[] = []): Envelope {
  const name = typeof yt === "string" ? yt : yt.name;
  const status = quotaStatus();
  if (status.level !== "ok") warnings.push(`Quota at ${status.percent}% (${status.used}/${status.limit}).`);
  if (name === "demo") warnings.push("DEMO DATA: fake numbers. Add YOUTUBE_API_KEY to tools/research/.env.");
  return { data, summary, source: name, fetched_at: fetchedAt, cached: isCached, quota_used: unitsCounter() - before, warnings };
}

// ---------- video_stats ----------
export const videoStatsInput = z.object({
  video: z.string().min(1).describe("Video id or URL"),
  compare_channel: z.boolean().default(true).describe("Also load the channel's last uploads to compute the outlier multiplier (~3 extra units)"),
  refresh: z.boolean().default(false),
});
export async function videoStats(input: z.infer<typeof videoStatsInput>, deps: Deps = {}): Promise<Envelope> {
  const i = videoStatsInput.parse(input);
  const before = unitsCounter();
  const { video: v, yt, fetchedAt, cached: c } = await loadVideo(i.video, deps, i.refresh);
  const now = new Date();
  let channel: any = null;
  let mult: number | null = null;
  let baseline: number | null = null;
  if (i.compare_channel) {
    const ch = await loadChannel(v.channelId, deps);
    const up = await loadUploads(ch, 50, deps);
    baseline = medianBaseline(up.value);
    mult = multiplier(v.views, baseline);
    channel = { id: ch.id, title: ch.title, subscribers: ch.subscribers };
  }
  const history = getDb().prepare("SELECT taken_at, views, likes, comments FROM video_stats_snapshots WHERE video_id = ? ORDER BY taken_at").all(v.id);
  const ageDays = (now.getTime() - Date.parse(v.publishedAt)) / 86400000;
  return envelope(
    {
      id: v.id,
      title: v.title,
      channel,
      published_at: v.publishedAt,
      age_days: Math.round(ageDays * 10) / 10,
      duration_min: Math.round(v.durationSec / 6) / 10,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      views_per_day: Math.round(viewsPerDay(v.views, v.publishedAt, now)),
      like_rate_percent: v.views ? Math.round((v.likes / v.views) * 1000) / 10 : 0,
      comment_rate_per_1000_views: v.views ? Math.round((v.comments / v.views) * 10000) / 10 : 0,
      channel_baseline_median: baseline === null ? null : Math.round(baseline),
      outlier_multiplier: mult,
      snapshots: history,
      thumbnail: v.thumbnail,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      note: "Multiplier and views per day are estimates.",
    },
    `"${truncate(v.title, 70)}": ${v.views.toLocaleString("en-US")} views, ${Math.round(viewsPerDay(v.views, v.publishedAt, now)).toLocaleString("en-US")}/day${mult ? `, ${mult}× channel median` : ""}.`,
    yt,
    fetchedAt,
    c,
    before,
  );
}

// ---------- video_tags ----------
export const videoTagsInput = z.object({ video: z.string().min(1).describe("Video id or URL"), refresh: z.boolean().default(false) });
export async function videoTags(input: z.infer<typeof videoTagsInput>, deps: Deps = {}): Promise<Envelope> {
  const i = videoTagsInput.parse(input);
  const before = unitsCounter();
  const { video: v, yt, fetchedAt, cached: c } = await loadVideo(i.video, deps, i.refresh);
  const hashtags = [...new Set(v.description.match(/#[\w]+/g) ?? [])];
  return envelope(
    { id: v.id, title: v.title, tags: v.tags, tag_count: v.tags.length, tag_characters: v.tags.join(",").length, hashtags, description_first_lines: v.description.split("\n").slice(0, 4).join("\n"), description_length: v.description.length },
    `${v.tags.length} tags, ${hashtags.length} hashtags on "${truncate(v.title, 60)}".`,
    yt,
    fetchedAt,
    c,
    before,
  );
}

// ---------- video_comments ----------
export const videoCommentsInput = z.object({
  video: z.string().min(1).describe("Video id or URL"),
  limit: z.number().int().min(1).max(100).default(20),
  order: z.enum(["relevance", "time"]).default("relevance"),
  refresh: z.boolean().default(false),
});
export async function videoComments(input: z.infer<typeof videoCommentsInput>, deps: Deps = {}): Promise<Envelope> {
  const i = videoCommentsInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const id = parseVideoId(i.video);
  const res = await cached(`cm:v1:${yt.name}:${id}:${i.order}:${i.limit}`, 6 * 3600, async () => ({ value: await yt.getComments(id, i.limit, i.order), source: yt.name }), { refresh: i.refresh });
  const list = res.value.map((c) => ({ author: c.author, text: truncate(c.text.replace(/\s+/g, " "), 300), likes: c.likes, replies: c.replies, published_at: c.publishedAt }));
  return envelope({ video: id, comments: list }, `${list.length} comments (${i.order}). Most liked: ${list[0] ? `"${truncate(list[0].text, 80)}" (${list[0].likes} likes)` : "none"}.`, yt, res.fetchedAt, res.cached, before, list.length ? [] : ["No comments returned. Comments may be off."]);
}

// ---------- video_transcript (yt-dlp) ----------
export const videoTranscriptInput = z.object({
  video: z.string().min(1).describe("Video id or URL"),
  lang: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/, "Language code like en or en-US").default("en"),
  max_chars: z.number().int().min(500).max(20000).default(6000).describe("Characters to return. The full text is saved to a file"),
  offset: z.number().int().min(0).default(0).describe("Start position, to read the next part"),
  refresh: z.boolean().default(false),
});

/** Parse yt-dlp json3 captions to lines like "[12:30] text". Timestamp about every 30 s. */
export function parseJson3(raw: string): { text: string; segments: number } {
  const data = JSON.parse(raw) as { events?: { tStartMs?: number; segs?: { utf8?: string }[] }[] };
  const lines: string[] = [];
  let lastStamp = -1e9;
  let buf = "";
  let segments = 0;
  for (const e of data.events ?? []) {
    const t = (e.segs ?? []).map((s) => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim();
    if (!t) continue;
    segments++;
    const ms = e.tStartMs ?? 0;
    if (ms - lastStamp >= 30_000) {
      if (buf) lines.push(buf.trim());
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      buf = `[${m}:${String(s).padStart(2, "0")}] ${t}`;
      lastStamp = ms;
    } else buf += " " + t;
  }
  if (buf) lines.push(buf.trim());
  return { text: lines.join("\n"), segments };
}

/** YT_DLP_PATH, else the project's own copy (tools/research/.venv), else the system yt-dlp. */
export function ytDlpPath(): string {
  if (process.env.YT_DLP_PATH) return process.env.YT_DLP_PATH;
  const local = path.join(RESEARCH_ROOT, ".venv", "bin", "yt-dlp");
  return existsSync(local) ? local : "yt-dlp";
}

async function fetchTranscript(id: string, lang: string): Promise<{ text: string; segments: number }> {
  if (id.startsWith("demo")) {
    const text = "[0:00] [DEMO] Hello everyone, today we play a new incremental game.\n[0:30] [DEMO] Let me buy the first upgrade and watch the numbers go up.";
    return { text, segments: 2 };
  }
  const dir = mkdtempSync(path.join(os.tmpdir(), "brimlo-yt-"));
  try {
    const args = ["--skip-download", "--no-playlist", "--no-warnings", "--write-auto-subs", "--write-subs", "--sub-langs", `${lang}.*,${lang}`, "--sub-format", "json3", "-o", path.join(dir, "%(id)s.%(ext)s"), `https://www.youtube.com/watch?v=${id}`];
    try {
      await run(ytDlpPath(), args, { timeout: 120_000, maxBuffer: 10_000_000 });
    } catch (e: any) {
      if (e?.code === "ENOENT") throw new Error("yt-dlp is not installed. Install it (pipx install yt-dlp) and try again.");
      throw new Error(`yt-dlp failed: ${truncate(String(e?.stderr || e?.message || e).trim(), 400)}. An old yt-dlp is the most common cause: run 'yt-dlp -U' or 'pipx upgrade yt-dlp'.`);
    }
    const files = readdirSync(dir).filter((f) => f.endsWith(".json3"));
    const file = files.find((f) => f.endsWith(`.${lang}.json3`)) ?? files[0];
    if (!file) throw new Error(`No ${lang} captions found for this video.`);
    return parseJson3(readFileSync(path.join(dir, file), "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function videoTranscript(input: z.infer<typeof videoTranscriptInput>, deps: Deps = {}): Promise<Envelope> {
  const i = videoTranscriptInput.parse(input);
  const before = unitsCounter();
  const id = parseVideoId(i.video);
  const res = await cached(`tr:v1:${id}:${i.lang}`, 30 * DAY_SEC, async () => ({ value: await fetchTranscript(id, i.lang), source: "yt-dlp" }), { refresh: i.refresh });
  const dir = path.join(RESEARCH_ROOT, "data", "transcripts");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.${i.lang}.txt`);
  writeFileSync(file, res.value.text);
  const slice = res.value.text.slice(i.offset, i.offset + i.max_chars);
  const more = i.offset + i.max_chars < res.value.text.length;
  return envelope(
    { video: id, lang: i.lang, total_chars: res.value.text.length, offset: i.offset, next_offset: more ? i.offset + i.max_chars : null, saved_to: path.relative(path.resolve(RESEARCH_ROOT, "../.."), file), text: slice },
    `Transcript of ${id}: ${res.value.text.length.toLocaleString("en-US")} chars${more ? ` (showing ${i.max_chars}, next_offset ${i.offset + i.max_chars})` : ""}.`,
    "yt-dlp",
    res.fetchedAt,
    res.cached,
    before,
    id.startsWith("demo") ? ["DEMO transcript."] : [],
  );
}
