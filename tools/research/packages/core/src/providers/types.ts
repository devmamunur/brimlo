export interface ChannelInfo {
  id: string;
  title: string;
  handle?: string | null;
  subscribers: number;
  videoCount: number;
  viewCount: number;
  country?: string | null;
  uploadsPlaylist?: string | null;
}

export interface VideoInfo {
  id: string;
  channelId: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  durationSec: number;
  views: number;
  likes: number;
  comments: number;
  thumbnail: string;
}

export interface CommentInfo {
  id: string;
  author: string;
  text: string;
  likes: number;
  publishedAt: string;
  replies: number;
}

export type ChannelRef = { id: string } | { handle: string };

export interface SearchOptions {
  maxResults?: number;
  publishedAfter?: string;
  order?: "relevance" | "viewCount" | "date";
}

export interface YouTubeProvider {
  name: "youtube-api" | "demo";
  searchVideoIds(query: string, opts?: SearchOptions): Promise<string[]>;
  getVideos(ids: string[]): Promise<VideoInfo[]>;
  getChannels(ids: string[]): Promise<ChannelInfo[]>;
  /** channels.list by id or handle. 1 unit. */
  resolveChannel(ref: ChannelRef): Promise<ChannelInfo | undefined>;
  /** playlistItems.list on a channel's uploads playlist, newest first. 1 unit per 50. */
  getUploadIds(playlistId: string, max: number): Promise<string[]>;
  /** commentThreads.list. 1 unit per page. Returns [] when comments are off. */
  getComments(videoId: string, max: number, order: "relevance" | "time"): Promise<CommentInfo[]>;
  /** search.list type=channel. 100 units. */
  searchChannelIds(query: string, max: number): Promise<string[]>;
}
