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
