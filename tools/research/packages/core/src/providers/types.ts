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
}
