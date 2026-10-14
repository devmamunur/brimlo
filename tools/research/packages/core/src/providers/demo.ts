import type { ChannelInfo, SearchOptions, VideoInfo, YouTubeProvider } from "./types.ts";

/**
 * DEMO provider: fake but realistic-looking data, fully derived from the id,
 * so the same query always gives the same result. Never used when an API key is set.
 * Costs no quota. Ids look like `demo_<slug>_<n>`.
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

const slugify = (q: string) => q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "x";
const THEMES = ["rat swarm", "rock crusher", "tiny factory", "space mine", "ant colony", "lava forge", "robot farm", "pixel city", "deep cave", "cookie bakery"];
const TEMPLATES = [
  (q: string, t: string) => `The ${t} incremental game where numbers go INSANE`,
  (q: string, t: string) => `I Played 100% of This ${t} game`,
  (q: string, t: string) => `${q}: I Turned $1 Into a BILLION (${t})`,
  (q: string, t: string) => `A Game Where You Build a ${t} and It's ADDICTIVE!`,
  (q: string, t: string) => `Best ${q} of 2026 | ${t}`,
  (q: string, t: string) => `I Beat the Hardest ${q} Level (${t})`,
];

function parseId(id: string) {
  const m = /^demo_(.+)_(\d+)$/.exec(id);
  return m ? { slug: m[1]!, i: Number(m[2]) } : undefined;
}

function makeVideo(slug: string, i: number): VideoInfo {
  const r = rng(hash(`${slug}:${i}`));
  const subs = Math.floor(10 ** (2.4 + r() * 3.6));
  const ageDays = Math.floor(2 + r() * 400);
  const views = Math.floor(subs * (0.1 + r() * r() * 60));
  const theme = THEMES[Math.floor(r() * THEMES.length)]!;
  const tpl = TEMPLATES[Math.floor(r() * TEMPLATES.length)]!;
  const q = slug.replace(/-/g, " ");
  return {
    id: `demo_${slug}_${i}`,
    channelId: `democh_${slug}_${i}`,
    title: tpl(q, theme),
    description: `[DEMO] Demo description about ${q}.`,
    tags: ["incremental game", "idle game", q, theme].slice(0, 2 + Math.floor(r() * 3)),
    publishedAt: new Date(Date.now() - ageDays * 86400000).toISOString(),
    durationSec: Math.floor((8 + r() * 112) * 60),
    views,
    likes: Math.floor(views * 0.03),
    comments: Math.floor(views * 0.002),
    thumbnail: `https://i.ytimg.com/vi/demo_${slug}_${i}/mqdefault.jpg`,
  };
}

function makeChannel(slug: string, i: number): ChannelInfo {
  const v = makeVideo(slug, i);
  const r = rng(hash(`${slug}:${i}`));
  const subs = Math.floor(10 ** (2.4 + r() * 3.6));
  return {
    id: v.channelId,
    title: `Demo Channel ${i + 1}`,
    handle: `@demochannel${i + 1}`,
    subscribers: subs,
    videoCount: 20 + Math.floor(r() * 400),
    viewCount: subs * Math.floor(20 + r() * 200),
    country: "US",
    uploadsPlaylist: null,
  };
}

export const demoProvider: YouTubeProvider = {
  name: "demo",
  async searchVideoIds(query: string, opts: SearchOptions = {}) {
    const slug = slugify(query);
    return Array.from({ length: Math.min(50, opts.maxResults ?? 50) }, (_, i) => `demo_${slug}_${i}`);
  },
  async getVideos(ids: string[]) {
    return ids.flatMap((id) => {
      const p = parseId(id);
      return p ? [makeVideo(p.slug, p.i)] : [];
    });
  },
  async getChannels(ids: string[]) {
    return ids.flatMap((id) => {
      const m = /^democh_(.+)_(\d+)$/.exec(id);
      return m ? [makeChannel(m[1]!, Number(m[2]))] : [];
    });
  },
};

export const DEMO_SUGGESTIONS = (q: string) => [`${q} 2026`, `${q} steam`, `best ${q}`, `${q} for beginners`, `${q} no commentary`, `${q} 100%`];
