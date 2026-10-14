import { config } from "../config.ts";
import { demoProvider } from "./demo.ts";
import type { YouTubeProvider } from "./types.ts";
import { youtubeApi } from "./youtube-api.ts";

export const getYouTube = (): YouTubeProvider => (config().demo ? demoProvider : youtubeApi);
export type { ChannelInfo, VideoInfo, YouTubeProvider } from "./types.ts";
