import { z } from "zod";
import { getYouTube } from "../providers/index.ts";
import { unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { isShort } from "../scoring/outlier.ts";
import { loadChannel, loadUploads, type Deps } from "./channels.ts";
import { keepRow, nameKey, searchPool, stageOf, toRow, WATCH_CHANNELS, type SearchRow } from "./youtubeSearch.ts";

export const followScanInput = z.object({
  channels: z.array(z.string().min(2)).max(60).default(Object.values(WATCH_CHANNELS)).describe("Channel ids (UC…) or @handles to read. Default: the channel-watch list (tracked small channels + big incremental channels)"),
  days: z.number().int().min(3).max(60).default(21).describe("Look at their uploads from the last N days"),
  uploads_per_channel: z.number().int().min(5).max(50).default(30),
  max_games: z.number().int().min(1).max(20).default(12).describe("History-check the top N games (~102 units each)"),
  refresh: z.boolean().default(false),
});

/** For /weekly-review and the scheduled FOLLOW refresh: which games did niche channels play in the last N days,
 * and which of them are in a proven live wave (FOLLOW = 1+ English long video ≥ 50K in 21 days, not cooling). */
export async function followScan(input: z.infer<typeof followScanInput>, deps: Deps = {}): Promise<Envelope> {
  const i = followScanInput.parse(input);
  const yt = deps.yt ?? getYouTube();
  const before = unitsCounter();
  const now = new Date();
  const failed: string[] = [];
  const byGame = new Map<string, { name: string; link: string | null; rows: (SearchRow & { by: string })[] }>();
  for (const ref of i.channels) {
    try {
      const ch = await loadChannel(ref, deps, i.refresh);
      const up = await loadUploads(ch, i.uploads_per_channel, deps, { refresh: i.refresh, ttlSec: 6 * 3600 });
      for (const v of up.value) {
        if (isShort(v.durationSec)) continue;
        const r = toRow(v, ch, now);
        if (r.age_hours > i.days * 24 || !keepRow(r, { includeLive: false }) || !r.game) continue;
        const key = nameKey(r.game);
        if (key === "name:") continue;
        const g = byGame.get(key) ?? { name: r.game, link: r.game_link, rows: [] };
        if (!g.link && r.game_link) g.link = r.game_link;
        g.rows.push({ ...r, by: ch.title });
        byGame.set(key, g);
      }
    } catch (e) {
      failed.push(`channel ${ref}: ${e instanceof Error ? e.message : String(e)}`);
      if (e instanceof Error && /quota/i.test(e.message)) break;
    }
  }
  // games played by more watched channels first (a shared wave), then the biggest video
  const chans = (g: { rows: { by: string }[] }) => new Set(g.rows.map((r) => r.by)).size;
  const ranked = [...byGame.entries()].sort((a, b) => chans(b[1]) - chans(a[1]) || Math.max(...b[1].rows.map((r) => r.views)) - Math.max(...a[1].rows.map((r) => r.views)));
  const games = [];
  for (const [key, g] of ranked.slice(0, i.max_games)) {
    let hist: SearchRow[] = [];
    try {
      const res = await searchPool(g.name, { hours: 0, order: "relevance", duration: "any", english: true, gaming: false }, deps, i.refresh);
      const ch = new Map(res.value.channels.map((c) => [c.id, c]));
      hist = res.value.videos.filter((v) => !isShort(v.durationSec)).map((v) => toRow(v, ch.get(v.channelId), now)).filter((r) => !r.live && r.game && nameKey(r.game) === key);
    } catch (e) {
      failed.push(`history ${g.name}: ${e instanceof Error ? e.message : String(e)}`);
      if (e instanceof Error && /quota/i.test(e.message)) break;
    }
    const all = new Map([...hist, ...g.rows].map((r) => [r.id, r]));
    const rows = [...all.values()];
    const st = stageOf(rows);
    const en = rows.filter((r) => r.english && r.duration_min >= 10).sort((a, b) => b.views - a.views);
    const firstEn = en.length ? Math.max(...en.map((r) => r.age_hours)) : null;
    const verdict = st.cooling ? "NO (cooling)" : st.proven_videos_21d >= 1 ? "FOLLOW" : st.stage === "EARLY" && firstEn !== null && firstEn <= 48 ? "GO? (run /pick-game now)" : "LATE";
    games.push({
      game: g.name,
      link: g.link,
      verdict,
      proven_videos_21d: st.proven_videos_21d,
      big_videos: st.big_videos,
      cooling: st.cooling,
      first_english_video_days_ago: firstEn === null ? null : Math.round(firstEn / 2.4) / 10,
      played_by: g.rows.map((r) => ({ channel: r.by, views: r.views, days_ago: Math.round(r.age_hours / 2.4) / 10, title: r.title })),
      biggest_english: en.slice(0, 4).map((r) => ({ channel: r.channel, subs: r.channel_subs, views: r.views, days_ago: Math.round(r.age_hours / 2.4) / 10 })),
    });
  }
  const follow = games.filter((g) => g.verdict === "FOLLOW");
  return {
    data: {
      checked_at: now.toISOString(),
      channels_read: i.channels.length,
      games_found: byGame.size,
      rules: "FOLLOW = 1+ English long video ≥ 50K in the last 21 days and not cooling (3+ channels with 500–50K subs from the last 1–4 days all < 500 views). Game names come from links/descriptions/titles: check them. Claude still runs the gates (price ≤ $5, simple one-goal fit, runs, not used in videos/log.md).",
      games,
      not_checked: ranked.slice(i.max_games).map(([, g]) => g.name),
    },
    summary: `FOLLOW scan: ${byGame.size} games from ${i.channels.length} channels (last ${i.days} days); ${follow.length} FOLLOW: ${follow.map((g) => g.game).join(", ") || "none"}.`,
    source: yt.name,
    fetched_at: now.toISOString(),
    cached: false,
    quota_used: unitsCounter() - before,
    warnings: failed.length ? [`Some calls failed: ${failed.join(" | ")}`] : [],
  };
}
