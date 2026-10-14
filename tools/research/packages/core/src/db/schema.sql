CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY, handle TEXT, title TEXT, subscribers INTEGER, video_count INTEGER,
  view_count INTEGER, country TEXT, uploads_playlist TEXT, fetched_at TEXT, source TEXT
);
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY, channel_id TEXT, title TEXT, description TEXT, tags TEXT, published_at TEXT,
  duration_sec INTEGER, views INTEGER, likes INTEGER, comments INTEGER, thumbnail TEXT,
  fetched_at TEXT, source TEXT
);
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
CREATE TABLE IF NOT EXISTS video_stats_snapshots (
  video_id TEXT NOT NULL, taken_at TEXT NOT NULL, views INTEGER, likes INTEGER, comments INTEGER,
  PRIMARY KEY (video_id, taken_at)
);
CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT, query TEXT NOT NULL UNIQUE, first_seen TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS keyword_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, keyword_id INTEGER NOT NULL REFERENCES keywords(id),
  taken_at TEXT NOT NULL, competition REAL, opportunity REAL,
  suggestions TEXT, top_video_ids TEXT, source TEXT
);
CREATE TABLE IF NOT EXISTS competitors (
  channel_id TEXT PRIMARY KEY, handle TEXT, title TEXT, added_at TEXT NOT NULL,
  last_checked_at TEXT, note TEXT
);
CREATE TABLE IF NOT EXISTS searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT, tool TEXT NOT NULL, input TEXT, created_at TEXT NOT NULL,
  quota_used INTEGER NOT NULL DEFAULT 0, cached INTEGER NOT NULL DEFAULT 0, source TEXT
);
CREATE TABLE IF NOT EXISTS quota_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, ts TEXT NOT NULL,
  endpoint TEXT NOT NULL, units INTEGER NOT NULL, note TEXT
);
CREATE INDEX IF NOT EXISTS idx_quota_day ON quota_log(day);
CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, game TEXT,
  status TEXT NOT NULL DEFAULT 'idea', evidence TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ref_type TEXT, ref_id TEXT, body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, fetched_at INTEGER NOT NULL, ttl_sec INTEGER NOT NULL, source TEXT
);
