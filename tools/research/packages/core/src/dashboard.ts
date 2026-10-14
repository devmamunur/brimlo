import { existsSync } from "node:fs";
import path from "node:path";
import { config, RESEARCH_ROOT } from "./config.ts";
import { getDb } from "./db/client.ts";
import { getChannelRow, getVideoRow, getVideosByChannel } from "./db/repo.ts";
import { listIdeas } from "./features/ideas.ts";
import { outliersFromDb } from "./features/outliers.ts";
import { oauthConnected } from "./providers/oauth.ts";
import { quotaStatus } from "./quota/guard.ts";
import { viewsPerDay } from "./scoring/keyword.ts";

/** Read-only queries for the dashboard. They only read the local database and cost no quota. */

const all = (sql: string, ...p: any[]) => getDb().prepare(sql).all(...p) as any[];
const one = (sql: string, ...p: any[]) => getDb().prepare(sql).get(...p) as any;

/** Brimlo (@brimloidle). Override with YOUTUBE_OWN_CHANNEL if the channel ever changes. */
export const OWN_CHANNEL_ID = process.env.YOUTUBE_OWN_CHANNEL?.trim() || "UCXf8abbaSiOThD3YhX8nGjQ";
export const YPP = { subs: 1000, watchHours: 8000 };

export function ownSnapshots(limit = 30) {
  return all("SELECT * FROM own_channel_snapshots ORDER BY taken_at DESC LIMIT ?", limit).reverse();
}

export function overview() {
  const own = ownSnapshots(30);
  const latest = own[own.length - 1] ?? null;
  const counts = {
    videos: one("SELECT COUNT(*) AS n FROM videos").n,
    channels: one("SELECT COUNT(*) AS n FROM channels").n,
    keywords: one("SELECT COUNT(*) AS n FROM keywords").n,
    competitors: one("SELECT COUNT(*) AS n FROM competitors").n,
    ideas: one("SELECT COUNT(*) AS n FROM ideas").n,
  };
  return {
    mode: config().demo ? "demo" : "live",
    quota: quotaStatus(),
    ypp: {
      subs: { value: latest?.subscribers ?? null, goal: YPP.subs },
      watch_hours: { value: latest?.watch_hours_365d ?? null, goal: YPP.watchHours, source: latest?.watch_hours_source ?? null },
      note: "Watch hours need the OAuth connection (own_channel). Subscribers come from the public API.",
    },
    own_last_7_days: own.slice(-7),
    own_latest: latest,
    counts,
    new_outliers: outliersFromDb({ days: 30, minMultiplier: 5, maxSubs: 0, includeShorts: false, liveOnly: !config().demo, limit: 6 }),
    recent_searches: all("SELECT tool, input, created_at, quota_used, cached, source FROM searches ORDER BY id DESC LIMIT 8"),
    ideas_recent: listIdeas().slice(0, 4),
  };
}

export function listKeywords() {
  return all(`SELECT k.id, k.query, k.first_seen, s.taken_at, s.competition, s.opportunity, s.source,
      (SELECT COUNT(*) FROM keyword_snapshots WHERE keyword_id = k.id) AS snapshots
    FROM keywords k JOIN keyword_snapshots s ON s.id = (SELECT MAX(id) FROM keyword_snapshots WHERE keyword_id = k.id)
    ORDER BY s.taken_at DESC`);
}

export function keywordDetail(id: number) {
  const k = one("SELECT * FROM keywords WHERE id = ?", id);
  if (!k) return undefined;
  const snaps = all("SELECT * FROM keyword_snapshots WHERE keyword_id = ? ORDER BY taken_at", id).map((s) => ({ ...s, suggestions: JSON.parse(s.suggestions ?? "[]"), top_video_ids: JSON.parse(s.top_video_ids ?? "[]") }));
  const last = snaps[snaps.length - 1];
  const videos = (last?.top_video_ids ?? []).slice(0, 20).map((vid: string) => {
    const v = getVideoRow(vid);
    const c = v ? getChannelRow(v.channel_id) : undefined;
    return v ? { id: v.id, title: v.title, channel: c?.title ?? v.channel_id, channel_subs: c?.subscribers ?? 0, views: v.views, views_per_day: Math.round(viewsPerDay(v.views, v.published_at)), published_at: v.published_at, duration_min: Math.round(v.duration_sec / 6) / 10, thumbnail: v.thumbnail } : null;
  }).filter(Boolean);
  return { keyword: k, history: snaps.map((s) => ({ taken_at: s.taken_at, competition: s.competition, opportunity: s.opportunity })), suggestions: last?.suggestions ?? [], top_videos: videos, source: last?.source };
}

export function videoDetail(id: string) {
  const v = getVideoRow(id);
  if (!v) return undefined;
  const c = getChannelRow(v.channel_id);
  const snaps = all("SELECT taken_at, views, likes, comments FROM video_stats_snapshots WHERE video_id = ? ORDER BY taken_at", id);
  const siblings = getVideosByChannel(v.channel_id);
  return { video: { ...v, views_per_day: Math.round(viewsPerDay(v.views, v.published_at)), url: `https://www.youtube.com/watch?v=${v.id}` }, channel: c ?? null, snapshots: snaps, channel_videos_stored: siblings.length, transcript_file: existsSync(path.join(RESEARCH_ROOT, "data", "transcripts", `${id}.en.txt`)) ? `data/transcripts/${id}.en.txt` : null };
}

export function recentSearches(limit = 30) {
  return all("SELECT * FROM searches ORDER BY id DESC LIMIT ?", limit);
}

export function settingsInfo() {
  const c = config();
  return {
    mode: c.demo ? "demo" : "live",
    youtube_api_key: c.apiKey ? "set" : "missing",
    forced_demo: process.env.BRIMLO_DEMO === "1",
    database: path.relative(path.resolve(RESEARCH_ROOT, "../.."), c.dbPath),
    quota: quotaStatus(),
    oauth: {
      client_configured: Boolean(process.env.YOUTUBE_OAUTH_CLIENT_ID && process.env.YOUTUBE_OAUTH_CLIENT_SECRET),
      connected: oauthConnected(),
      own_channel_id: OWN_CHANNEL_ID,
    },
  };
}

const EXPORTABLE = { videos: "videos", channels: "channels", keywords: "keyword_snapshots", ideas: "ideas", competitors: "competitors", searches: "searches", quota: "quota_log" } as const;
export type ExportTable = keyof typeof EXPORTABLE;
export const exportTables = Object.keys(EXPORTABLE) as ExportTable[];

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Stop spreadsheet formula injection from titles like "=1+1".
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function exportTable(table: ExportTable, format: "csv" | "json") {
  const rows = all(`SELECT * FROM ${EXPORTABLE[table]}`);
  if (format === "json") return { type: "application/json", body: JSON.stringify(rows, null, 2) };
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return { type: "text/csv", body: [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") };
}
