import { config } from "../config.ts";
import { assertQuota, COSTS, recordQuota, type Endpoint } from "../quota/guard.ts";
import type { ChannelInfo, ChannelRef, CommentInfo, SearchOptions, VideoInfo, YouTubeProvider } from "./types.ts";

const BASE = "https://www.googleapis.com/youtube/v3";

export function parseDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!m) return 0;
  const [d, h, min, s] = [m[1], m[2], m[3], m[4]].map((x) => Number(x ?? 0));
  return d! * 86400 + h! * 3600 + min! * 60 + s!;
}

async function call(endpoint: Endpoint, params: Record<string, string>): Promise<any> {
  assertQuota(COSTS[endpoint], endpoint);
  const url = new URL(`${BASE}/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: config().apiKey })) url.searchParams.set(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason ?? res.status;
    throw new Error(`YouTube API ${endpoint} failed (${reason}): ${body?.error?.message ?? res.statusText}`);
  }
  recordQuota(endpoint, COSTS[endpoint], params.q ?? params.id?.slice(0, 40));
  return body;
}

const chunk = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

const mapChannel = (c: any): ChannelInfo => ({
  id: c.id,
  title: c.snippet.title,
  handle: c.snippet.customUrl ?? null,
  subscribers: Number(c.statistics?.subscriberCount ?? 0),
  videoCount: Number(c.statistics?.videoCount ?? 0),
  viewCount: Number(c.statistics?.viewCount ?? 0),
  country: c.snippet.country ?? null,
  uploadsPlaylist: c.contentDetails?.relatedPlaylists?.uploads ?? null,
});

export const youtubeApi: YouTubeProvider = {
  name: "youtube-api",

  async searchVideoIds(query: string, opts: SearchOptions = {}) {
    const params: Record<string, string> = {
      part: "id",
      type: "video",
      q: query,
      maxResults: String(Math.min(50, opts.maxResults ?? 50)),
      order: opts.order ?? "relevance",
      regionCode: "US",
      relevanceLanguage: "en",
    };
    if (opts.publishedAfter) params.publishedAfter = opts.publishedAfter;
    const body = await call("search", params);
    return (body.items ?? []).map((i: any) => i.id?.videoId).filter(Boolean);
  },

  async getVideos(ids: string[]) {
    const out: VideoInfo[] = [];
    for (const batch of chunk([...new Set(ids)], 50)) {
      const body = await call("videos", { part: "snippet,statistics,contentDetails", id: batch.join(",") });
      for (const v of body.items ?? []) {
        out.push({
          id: v.id,
          channelId: v.snippet.channelId,
          title: v.snippet.title,
          description: v.snippet.description ?? "",
          tags: v.snippet.tags ?? [],
          publishedAt: v.snippet.publishedAt,
          durationSec: parseDuration(v.contentDetails?.duration),
          views: Number(v.statistics?.viewCount ?? 0),
          likes: Number(v.statistics?.likeCount ?? 0),
          comments: Number(v.statistics?.commentCount ?? 0),
          thumbnail: v.snippet.thumbnails?.medium?.url ?? v.snippet.thumbnails?.default?.url ?? "",
        });
      }
    }
    return out;
  },

  async getChannels(ids: string[]) {
    const out: ChannelInfo[] = [];
    for (const batch of chunk([...new Set(ids)], 50)) {
      const body = await call("channels", { part: "snippet,statistics,contentDetails", id: batch.join(",") });
      for (const c of body.items ?? []) out.push(mapChannel(c));
    }
    return out;
  },

  async resolveChannel(ref: ChannelRef) {
    const params: Record<string, string> = { part: "snippet,statistics,contentDetails" };
    if ("id" in ref) params.id = ref.id;
    else params.forHandle = ref.handle.startsWith("@") ? ref.handle : `@${ref.handle}`;
    const body = await call("channels", params);
    return body.items?.[0] ? mapChannel(body.items[0]) : undefined;
  },

  async getUploadIds(playlistId: string, max: number) {
    const ids: string[] = [];
    let pageToken: string | undefined;
    while (ids.length < max) {
      const params: Record<string, string> = { part: "contentDetails", playlistId, maxResults: String(Math.min(50, max - ids.length)) };
      if (pageToken) params.pageToken = pageToken;
      let body: any;
      try {
        body = await call("playlistItems", params);
      } catch (e) {
        // A channel with no public uploads has no uploads playlist yet.
        if (e instanceof Error && /playlistNotFound/.test(e.message)) return ids;
        throw e;
      }
      for (const i of body.items ?? []) if (i.contentDetails?.videoId) ids.push(i.contentDetails.videoId);
      pageToken = body.nextPageToken;
      if (!pageToken) break;
    }
    return ids.slice(0, max);
  },

  async getComments(videoId: string, max: number, order: "relevance" | "time") {
    const out: CommentInfo[] = [];
    let pageToken: string | undefined;
    try {
      while (out.length < max) {
        const params: Record<string, string> = { part: "snippet", videoId, order, textFormat: "plainText", maxResults: String(Math.min(100, max - out.length)) };
        if (pageToken) params.pageToken = pageToken;
        const body = await call("commentThreads", params);
        for (const t of body.items ?? []) {
          const c = t.snippet.topLevelComment.snippet;
          out.push({ id: t.id, author: c.authorDisplayName, text: c.textDisplay, likes: Number(c.likeCount ?? 0), publishedAt: c.publishedAt, replies: Number(t.snippet.totalReplyCount ?? 0) });
        }
        pageToken = body.nextPageToken;
        if (!pageToken) break;
      }
    } catch (e) {
      if (e instanceof Error && /commentsDisabled|forbidden/i.test(e.message)) return out;
      throw e;
    }
    return out.slice(0, max);
  },

  async searchChannelIds(query: string, max: number) {
    const body = await call("search", { part: "id", type: "channel", q: query, maxResults: String(Math.min(50, max)), regionCode: "US", relevanceLanguage: "en" });
    return (body.items ?? []).map((i: any) => i.id?.channelId).filter(Boolean);
  },
};
