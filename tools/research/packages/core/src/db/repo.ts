import type { ChannelInfo, VideoInfo } from "../providers/types.ts";
import { clean, getDb } from "./client.ts";

const iso = () => new Date().toISOString();

export function upsertChannel(c: ChannelInfo, source: string) {
  getDb()
    .prepare(
      `INSERT INTO channels (id, handle, title, subscribers, video_count, view_count, country, uploads_playlist, fetched_at, source)
       VALUES (:id,:handle,:title,:subscribers,:video_count,:view_count,:country,:uploads_playlist,:fetched_at,:source)
       ON CONFLICT(id) DO UPDATE SET handle=excluded.handle, title=excluded.title, subscribers=excluded.subscribers,
         video_count=excluded.video_count, view_count=excluded.view_count, country=excluded.country,
         uploads_playlist=excluded.uploads_playlist, fetched_at=excluded.fetched_at, source=excluded.source`,
    )
    .run(clean({ id: c.id, handle: c.handle, title: c.title, subscribers: c.subscribers, video_count: c.videoCount, view_count: c.viewCount, country: c.country, uploads_playlist: c.uploadsPlaylist, fetched_at: iso(), source }) as any);
}

export function upsertVideo(v: VideoInfo, source: string) {
  const db = getDb();
  const now = iso();
  db.prepare(
    `INSERT INTO videos (id, channel_id, title, description, tags, published_at, duration_sec, views, likes, comments, thumbnail, fetched_at, source)
     VALUES (:id,:channel_id,:title,:description,:tags,:published_at,:duration_sec,:views,:likes,:comments,:thumbnail,:fetched_at,:source)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, tags=excluded.tags,
       views=excluded.views, likes=excluded.likes, comments=excluded.comments, thumbnail=excluded.thumbnail,
       duration_sec=excluded.duration_sec, fetched_at=excluded.fetched_at, source=excluded.source`,
  ).run(clean({ id: v.id, channel_id: v.channelId, title: v.title, description: v.description, tags: JSON.stringify(v.tags), published_at: v.publishedAt, duration_sec: v.durationSec, views: v.views, likes: v.likes, comments: v.comments, thumbnail: v.thumbnail, fetched_at: now, source }) as any);
  db.prepare("INSERT OR REPLACE INTO video_stats_snapshots (video_id, taken_at, views, likes, comments) VALUES (?,?,?,?,?)").run(v.id, now.slice(0, 10), v.views, v.likes, v.comments);
}

export function saveKeywordSnapshot(s: { query: string; competition: number; opportunity: number; suggestions: unknown; topVideoIds: string[]; source: string }) {
  const db = getDb();
  const now = iso();
  db.prepare("INSERT OR IGNORE INTO keywords (query, first_seen) VALUES (?,?)").run(s.query, now);
  const { id } = db.prepare("SELECT id FROM keywords WHERE query = ?").get(s.query) as { id: number };
  db.prepare("INSERT INTO keyword_snapshots (keyword_id, taken_at, competition, opportunity, suggestions, top_video_ids, source) VALUES (?,?,?,?,?,?,?)").run(id, now, s.competition, s.opportunity, JSON.stringify(s.suggestions), JSON.stringify(s.topVideoIds), s.source);
}

export function logSearch(tool: string, input: unknown, quotaUsed: number, cached: boolean, source: string) {
  getDb().prepare("INSERT INTO searches (tool, input, created_at, quota_used, cached, source) VALUES (?,?,?,?,?,?)").run(tool, JSON.stringify(input), iso(), quotaUsed, cached ? 1 : 0, source);
}

export interface VideoRow {
  id: string;
  channel_id: string;
  title: string;
  description: string;
  tags: string[];
  published_at: string;
  duration_sec: number;
  views: number;
  likes: number;
  comments: number;
  thumbnail: string;
  fetched_at: string;
  source: string;
}
export interface ChannelRow {
  id: string;
  handle: string | null;
  title: string;
  subscribers: number;
  video_count: number;
  view_count: number;
  country: string | null;
  uploads_playlist: string | null;
  fetched_at: string;
  source: string;
}

const parseVideo = (r: any): VideoRow => ({ ...r, tags: r.tags ? JSON.parse(r.tags) : [] });

export const getVideoRow = (id: string): VideoRow | undefined => {
  const r = getDb().prepare("SELECT * FROM videos WHERE id = ?").get(id);
  return r ? parseVideo(r) : undefined;
};
export const getVideosByChannel = (channelId: string): VideoRow[] =>
  getDb().prepare("SELECT * FROM videos WHERE channel_id = ? ORDER BY published_at DESC").all(channelId).map(parseVideo);
export const getChannelRow = (id: string): ChannelRow | undefined => getDb().prepare("SELECT * FROM channels WHERE id = ?").get(id) as ChannelRow | undefined;
export const findChannelRow = (q: string): ChannelRow | undefined => {
  const n = q.trim().toLowerCase().replace(/^@/, "");
  return getDb()
    .prepare("SELECT * FROM channels WHERE id = ? OR lower(replace(handle,'@','')) = ? OR lower(title) = ? LIMIT 1")
    .get(q.trim(), n, n) as ChannelRow | undefined;
};
export const allVideoRows = (liveOnly: boolean, limit = 5000): VideoRow[] =>
  getDb()
    .prepare(`SELECT * FROM videos ${liveOnly ? "WHERE source != 'demo'" : ""} ORDER BY views DESC LIMIT ?`)
    .all(limit)
    .map(parseVideo);
export const allChannelRows = (): ChannelRow[] => getDb().prepare("SELECT * FROM channels").all() as unknown as ChannelRow[];
