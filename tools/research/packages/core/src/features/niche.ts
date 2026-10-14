import { cached, DAY_SEC } from "../cache.ts";
import { upsertChannel, upsertVideo } from "../db/repo.ts";
import { getYouTube, type ChannelInfo, type VideoInfo, type YouTubeProvider } from "../providers/index.ts";
import { COSTS } from "../quota/guard.ts";

export interface NicheDeps {
  yt?: YouTubeProvider;
}

export interface NichePool {
  videos: VideoInfo[];
  channels: ChannelInfo[];
}

/** search.list + videos.list + channels.list */
export const POOL_COST = COSTS.search + COSTS.videos + COSTS.channels;

/**
 * Shared "what is working in this niche" pool: videos from the last `days` days,
 * ordered by views. Used by outliers, title_patterns, description_and_tags, trending, idea_engine.
 * Cached 24h, so several tools on one query cost the 102 units only once.
 */
export async function nichePool(query: string, days: number, deps: NicheDeps = {}, refresh = false) {
  const yt = deps.yt ?? getYouTube();
  const q = query.trim().toLowerCase();
  const res = await cached<NichePool>(
    `pool:v1:${yt.name}:${q}:${days}`,
    DAY_SEC,
    async () => {
      const publishedAfter = new Date(Date.now() - days * 86400000).toISOString();
      const ids = await yt.searchVideoIds(q, { maxResults: 50, publishedAfter, order: "viewCount" });
      const videos = await yt.getVideos(ids);
      const channels = await yt.getChannels([...new Set(videos.map((v) => v.channelId))]);
      return { value: { videos, channels }, source: yt.name };
    },
    { refresh },
  );
  if (!res.cached) {
    for (const c of res.value.channels) upsertChannel(c, yt.name);
    for (const v of res.value.videos) upsertVideo(v, yt.name);
  }
  return { ...res, provider: yt.name, pool: res.value };
}
