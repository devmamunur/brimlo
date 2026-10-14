import { z } from "zod";
import { channelStats, channelStatsInput, channelVideos, channelVideosInput } from "./features/channels.ts";
import { competitorsAdd, competitorsAddInput, competitorsList, competitorsListInput, competitorsRefresh, competitorsRefreshInput, competitorsRemove, competitorsRemoveInput, competitorsSeed, competitorsSeedInput } from "./features/competitors.ts";
import { ideaEngine, ideaEngineInput } from "./features/ideaEngine.ts";
import { ideaSave, ideaSaveInput, ideasList, ideasListInput, ideaUpdate, ideaUpdateInput } from "./features/ideas.ts";
import { keywordInput, keywordResearch } from "./features/keywords.ts";
import { ownChannel, ownChannelInput } from "./features/ownChannel.ts";
import { descriptionAndTags, descriptionAndTagsInput } from "./features/tags.ts";
import { scoreTitleInput, scoreTitleTool, titlePatterns, titlePatternsInput } from "./features/titles.ts";
import { trending, trendingInput } from "./features/trending.ts";
import { outliers, outliersInput } from "./features/outliers.ts";
import { similarChannels, similarChannelsInput, similarVideos, similarVideosInput } from "./features/similar.ts";
import { videoComments, videoCommentsInput, videoStats, videoStatsInput, videoTags, videoTagsInput, videoTranscript, videoTranscriptInput } from "./features/videos.ts";
import { quotaStatus } from "./quota/guard.ts";
import type { Envelope } from "./result.ts";

/**
 * One registry. The CLI, the MCP server and the HTTP API all read this list.
 * Add a tool here and it shows up everywhere.
 */
export interface ToolDef {
  name: string;
  title: string;
  description: string;
  /** CLI: the first positional argument fills this field. */
  primary?: string;
  schema: z.ZodObject<any>;
  run: (input: any) => Promise<Envelope>;
}

const quotaTool: ToolDef = {
  name: "quota_status",
  title: "Quota status",
  description: "Free. Shows today's YouTube API quota use (units used, left, searches left, mode live/demo). Check this before expensive research.",
  schema: z.object({}),
  run: async () => {
    const s = quotaStatus();
    return {
      data: s,
      summary: `Quota ${s.used}/${s.limit} units (${s.percent}%), level ${s.level}. About ${s.searches_left} searches left before the 90% stop. Mode: ${s.mode}.`,
      source: "local",
      fetched_at: new Date().toISOString(),
      cached: false,
      quota_used: 0,
      warnings: s.level === "ok" ? [] : [`Quota level is ${s.level}.`],
    };
  },
};

export const tools: ToolDef[] = [
  {
    name: "keyword_research",
    title: "Keyword research",
    description:
      "Research a YouTube keyword: autocomplete suggestions (a–z + idle/incremental/game modifiers, free), top 50 ranking videos, competition score and opportunity score (0–100, estimates, formulas included). " +
      "Costs ~102 API units when fetched fresh (search=100), 0 when cached (24h). Use estimate_only to see the cost first.",
    primary: "query",
    schema: keywordInput,
    run: keywordResearch,
  },
  {
    name: "channel_videos",
    title: "Channel videos",
    description: "List a channel's recent uploads (last 50 scanned) with views, views/day and outlier multiplier vs the channel's median. Sort by date, views or views_per_day. ~3 units, cached 24h.",
    primary: "channel",
    schema: channelVideosInput,
    run: channelVideos,
  },
  {
    name: "channel_stats",
    title: "Channel stats",
    description: "Channel summary: subs, upload frequency (30/90 days), average duration, median views of recent long-form, trend, best recent video. ~3 units, cached 24h.",
    primary: "channel",
    schema: channelStatsInput,
    run: channelStats,
  },
  {
    name: "outliers",
    title: "Outlier videos",
    description:
      "Find outlier videos: views ≥ N× the channel baseline. Three modes: `query` (niche search, ~102 units, small channels <50K by default, rough baseline), `channels` (list of channels, ~3 units each, median baseline), or neither (scans tracked competitors). Sorted small channels first, then multiplier. Estimates.",
    primary: "query",
    schema: outliersInput,
    run: outliers,
  },
  { name: "competitors_list", title: "List competitors", description: "Free. List tracked competitor channels with stored stats.", schema: competitorsListInput, run: competitorsList },
  { name: "competitors_add", title: "Add competitor", description: "Track a channel (@handle, id or URL). ~1 unit.", primary: "channel", schema: competitorsAddInput, run: competitorsAdd },
  { name: "competitors_remove", title: "Remove competitor", description: "Stop tracking a channel. Free.", primary: "channel", schema: competitorsRemoveInput, run: competitorsRemove },
  {
    name: "competitors_refresh",
    title: "Refresh competitors",
    description: "Check tracked competitors: new uploads since the last check and outliers from the last 30 days. ~3 units per channel, cached 12h. Use this for the weekly competitor check.",
    primary: "channel",
    schema: competitorsRefreshInput,
    run: competitorsRefresh,
  },
  {
    name: "competitors_seed",
    title: "Seed competitors",
    description: "Add every youtube.com/@handle link found in research/competitors.md as a tracked competitor (~1 unit each, skips ones already tracked).",
    schema: competitorsSeedInput,
    run: competitorsSeed,
  },
  { name: "video_stats", title: "Video stats", description: "Stats of one video: views, views/day, like rate, outlier multiplier vs its channel, stored snapshots. 1–4 units.", primary: "video", schema: videoStatsInput, run: videoStats },
  { name: "video_tags", title: "Video tags", description: "Tags, hashtags and description start of any public video (works for other channels' videos). 1 unit.", primary: "video", schema: videoTagsInput, run: videoTags },
  { name: "video_comments", title: "Video comments", description: "Top or newest comments of a video. 1 unit per 100.", primary: "video", schema: videoCommentsInput, run: videoComments },
  { name: "video_transcript", title: "Video transcript", description: "Transcript with timestamps via yt-dlp (0 units). Long text is paged with max_chars/offset; the full text is saved under tools/research/data/transcripts/.", primary: "video", schema: videoTranscriptInput, run: videoTranscript },
  { name: "similar_videos", title: "Similar videos", description: "Videos similar to a given one by title words and tags. Local DB is free; online:true also searches YouTube (100 units).", primary: "video", schema: similarVideosInput, run: similarVideos },
  { name: "similar_channels", title: "Similar channels", description: "Channels similar to a given one by topic words. Local DB is free; online:true also searches YouTube (100 units).", primary: "channel", schema: similarChannelsInput, run: similarChannels },
  {
    name: "score_title",
    title: "Score title",
    description: "Free, local, no quota. Scores 1–5 titles 0–100 against playbook/titles.md (length, template A–I, keyword, CAPS, no emoji/creator names, power words, clarity, autocomplete demand, shape vs stored high-view titles). Returns reasons and 3 fixes. A checklist, not a prediction of views.",
    primary: "title",
    schema: scoreTitleInput,
    run: scoreTitleTool,
  },
  {
    name: "title_patterns",
    title: "Title patterns",
    description: "Mine the niche's outlier titles into shapes: playbook template counts, structure shares (first person, CAPS, '|' suffix...), common words and phrases, with examples. ~102 units, cached 24h (shared with outliers/trending/tags).",
    primary: "query",
    schema: titlePatternsInput,
    run: titlePatterns,
  },
  {
    name: "description_and_tags",
    title: "Description and tags",
    description: "From the niche's top videos: most common tags, a suggested tag list (max 500 chars), hashtags, description keywords and a draft of the first 2 description lines. Creator/channel names are filtered out. Optional `video` compares its tags to the niche. ~102 units, cached.",
    primary: "keyword",
    schema: descriptionAndTagsInput,
    run: descriptionAndTags,
  },
  {
    name: "trending",
    title: "Trending in niche",
    description: "Fast-growing videos in a niche published in the last N days (default 7), sorted by views/day (estimate). ~102 units, cached 24h.",
    primary: "query",
    schema: trendingInput,
    run: trending,
  },
  {
    name: "idea_engine",
    title: "Idea engine",
    description: "Evidence pack for a game or topic: keyword scores, outliers, title shapes, search gaps, competitor coverage, project rules. You (Claude) write the final ideas from it. ~204 units cold, 0 cached; use estimate_only first. save_as stores it as an idea.",
    primary: "topic",
    schema: ideaEngineInput,
    run: ideaEngine,
  },
  { name: "ideas_list", title: "List ideas", description: "Free. Saved ideas (status idea/planned/recorded) with evidence.", schema: ideasListInput, run: ideasList },
  { name: "idea_save", title: "Save idea", description: "Free. Save a video idea with evidence so it shows in the dashboard.", primary: "title", schema: ideaSaveInput, run: ideaSave },
  { name: "idea_update", title: "Update idea", description: "Free. Change an idea's title/game/status/evidence, or delete it.", schema: ideaUpdateInput, run: ideaUpdate },
  {
    name: "own_channel",
    title: "Own channel",
    description: "Brimlo's own stats: subscribers, views, recent uploads, YPP progress (1,000 subs + 8,000 watch hours). Public part ~3 units. If OAuth is connected it also returns watch hours (365 days) and per-video views, average view duration and percentage. Impressions/CTR are NOT available from any API (read them in Studio).",
    schema: ownChannelInput,
    run: ownChannel,
  },
  quotaTool,
];
