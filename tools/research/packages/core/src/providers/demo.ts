import type { ChannelInfo, ChannelRef, CommentInfo, SearchOptions, VideoInfo, YouTubeProvider } from "./types.ts";

/**
 * DEMO provider: fake but realistic-looking data, fully derived from the id,
 * so the same input always gives the same result. Never used when an API key is set.
 * Costs no quota.
 *
 * Ids:  demo_<slug>_<n>          search result n (each from its own channel n)
 *       demoup_<slug>_<c>_<k>    upload k of channel c
 *       democh_<slug>_<c>        channel c
 */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const slugify = (q: string) => q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "x";
const THEMES = ["rat swarm", "rock crusher", "tiny factory", "space mine", "ant colony", "lava forge", "robot farm", "pixel city", "deep cave", "cookie bakery"];
const TEMPLATES = [
  (q: string, t: string) => `The ${t} incremental game where numbers go INSANE`,
  (q: string, t: string) => `I Played 100% of This ${t} game`,
  (q: string, t: string) => `${q}: I Turned $1 Into a BILLION (${t})`,
  (q: string, t: string) => `A Game Where You Build a ${t} and It's ADDICTIVE!`,
  (q: string, t: string) => `Best ${q} of 2026 | ${t}`,
  (q: string, t: string) => `I made a ${t} so big it bullied the sun`,
];

function channelSubs(slug: string, c: number) {
  const r = rng(hash(`${slug}:ch:${c}`));
  return Math.floor(10 ** (2.4 + r() * 3.6));
}

function build(id: string, slug: string, c: number, k: number, kind: "search" | "upload"): VideoInfo {
  const r = rng(hash(`${slug}:${c}:${k}:${kind}`));
  const subs = channelSubs(slug, c);
  const ageDays = kind === "upload" ? 1 + k * (2 + Math.floor(r() * 5)) + Math.floor(r() * 3) : Math.floor(2 + r() * 400);
  // uploads: a steady base, with an occasional outlier
  const outlier = kind === "upload" && r() < 0.12 ? 4 + r() * 25 : 1;
  const views = Math.floor(subs * (kind === "upload" ? (0.05 + r() * 0.25) * outlier : 0.1 + r() * r() * 60));
  const theme = THEMES[Math.floor(r() * THEMES.length)]!;
  const tpl = TEMPLATES[Math.floor(r() * TEMPLATES.length)]!;
  const q = slug.replace(/-/g, " ");
  return {
    id,
    channelId: `democh_${slug}_${c}`,
    title: tpl(q, theme),
    description: `[DEMO] Demo description about ${q}. ${theme} incremental game, idle, upgrades.`,
    tags: ["incremental game", "idle game", q, theme].slice(0, 2 + Math.floor(r() * 3)),
    publishedAt: new Date(Date.now() - ageDays * 86400000).toISOString(),
    durationSec: Math.floor((r() < 0.08 ? 0.5 : 8 + r() * 112) * 60),
    views,
    likes: Math.floor(views * 0.03),
    comments: Math.floor(views * 0.002),
    thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  };
}

function video(id: string): VideoInfo | undefined {
  let m = /^demo_(.+)_(\d+)$/.exec(id);
  if (m) return build(id, m[1]!, Number(m[2]), Number(m[2]), "search");
  m = /^demoup_(.+)_(\d+)_(\d+)$/.exec(id);
  if (m) return build(id, m[1]!, Number(m[2]), Number(m[3]), "upload");
  return undefined;
}

function channel(id: string): ChannelInfo | undefined {
  const m = /^democh_(.+)_(\d+)$/.exec(id);
  if (!m) return undefined;
  const slug = m[1]!;
  const c = Number(m[2]);
  const r = rng(hash(`${slug}:chx:${c}`));
  const subs = channelSubs(slug, c);
  const videoCount = 20 + Math.floor(r() * 400);
  return {
    id,
    title: `Demo Channel ${c + 1}`,
    handle: `@${slug.replace(/-/g, "")}${c || ""}`,
    subscribers: subs,
    videoCount,
    viewCount: subs * Math.floor(5 + r() * 20) * videoCount / 10,
    country: "US",
    uploadsPlaylist: `demopl_${slug}_${c}`,
  };
}

export const demoProvider: YouTubeProvider = {
  name: "demo",
  async searchVideoIds(query: string, opts: SearchOptions = {}) {
    const slug = slugify(query);
    return Array.from({ length: Math.min(50, opts.maxResults ?? 50) }, (_, i) => `demo_${slug}_${i}`);
  },
  async getVideos(ids: string[]) {
    return ids.flatMap((id) => video(id) ?? []);
  },
  async getChannels(ids: string[]) {
    return ids.flatMap((id) => channel(id) ?? []);
  },
  async resolveChannel(ref: ChannelRef) {
    if ("id" in ref) return channel(ref.id);
    const slug = slugify(ref.handle.replace(/^@/, ""));
    return channel(`democh_${slug}_0`);
  },
  async getUploadIds(playlistId: string, max: number) {
    const m = /^demopl_(.+)_(\d+)$/.exec(playlistId);
    if (!m) return [];
    return Array.from({ length: Math.min(max, 60) }, (_, k) => `demoup_${m[1]}_${m[2]}_${k}`);
  },
  async getComments(videoId: string, max: number): Promise<CommentInfo[]> {
    if (!videoId.startsWith("demo")) return [];
    const r = rng(hash(videoId));
    const lines = ["this game is so addictive", "what is the name of this game?", "the upgrade at 20:10 is broken lol", "great calm commentary", "please try the demo next", "numbers go brrr"];
    return Array.from({ length: Math.min(max, 12) }, (_, i) => ({ id: `${videoId}_c${i}`, author: `demo_user_${i}`, text: `[DEMO] ${lines[Math.floor(r() * lines.length)]}`, likes: Math.floor(r() * 200), publishedAt: new Date(Date.now() - i * 86400000).toISOString(), replies: Math.floor(r() * 5) }));
  },
  async searchChannelIds(query: string, max: number) {
    const slug = slugify(query);
    return Array.from({ length: Math.min(max, 10) }, (_, i) => `democh_${slug}_${i}`);
  },
};

export const DEMO_SUGGESTIONS = (q: string) => [`${q} 2026`, `${q} steam`, `best ${q}`, `${q} for beginners`, `${q} no commentary`, `${q} 100%`];
