import { describe, expect, it } from "vitest";
import { gameFromVideo, groupWaves, judgeHistory, keepRow, stageOf, toRow, verdictOf, videoLanguage } from "../src/features/youtubeSearch.ts";
import type { ChannelInfo, VideoInfo } from "../src/providers/types.ts";

const now = new Date("2026-11-14T15:00:00Z");
const ch = (id: string, subs: number, views = subs * 20, videos = 100): ChannelInfo => ({ id, title: id, subscribers: subs, viewCount: views, videoCount: videos });
const vid = (id: string, channelId: string, title: string, description: string, views: number, hoursAgo: number, min = 60, language: string | null = null): VideoInfo => ({
  id, channelId, title, description, tags: [], views, likes: 0, comments: 0, thumbnail: "", durationSec: min * 60, language,
  publishedAt: new Date(now.getTime() - hoursAgo * 3600000).toISOString(),
});

describe("gameFromVideo", () => {
  it("reads 'The game is called …' from the description when the title has no name", () => {
    const g = gameFromVideo({ title: "I drank the entire ocean with a straw", description: "In this game I drank the entire ocean with a straw, I completed the full game. The game is called drink the ocean.\n\nI go live on https://www.twitch.tv/x" });
    expect(g.name).toBe("Drink The Ocean");
    expect(g.source).toBe("description");
  });
  it("prefers a Steam link and skips self-promo links", () => {
    const g = gameFromVideo({ title: "Numbers go up", description: "twitch: https://twitch.tv/me\nWishlist: https://store.steampowered.com/app/5401660/Diversion/ " });
    expect(g).toMatchObject({ key: "steam:5401660", name: "Diversion", source: "steam_link" });
  });
  it("reads itch and browser game sites", () => {
    expect(gameFromVideo({ title: "x", description: "play: https://dev.itch.io/moon-cleaner" }).key).toBe("itch:dev/moon-cleaner");
    expect(gameFromVideo({ title: "x", description: "https://mana.gs/drink-the-ocean" })).toMatchObject({ key: "web:mana.gs/drink-the-ocean", name: "Drink The Ocean" });
  });
  it("uses the title end and ignores noise", () => {
    expect(gameFromVideo({ title: "I Became Unstoppable | Wipe Them Out!", description: "" }).name).toBe("Wipe Them Out");
    expect(gameFromVideo({ title: "My run - Part 2", description: "" }).source).toBe("none");
    expect(gameFromVideo({ title: "Snake Challenge Live - 42", description: "" }).source).toBe("none");
  });
});

describe("gameFromVideo: played / gameplay / demo", () => {
  it("reads 'I played 100% of X, a …' and 'X Gameplay: …'", () => {
    expect(gameFromVideo({ title: "I Took Over the World As a Mushroom", description: "I played 100% of Mycelarium, a cozy incremental game about the planet." }).name).toBe("Mycelarium");
    expect(gameFromVideo({ title: "We March as One Gameplay: Day 1 of Release", description: "" }).name).toBe("We March as One");
  });
  it("drops 'Demo' from the shown name", () => {
    expect(gameFromVideo({ title: "x", description: "https://store.steampowered.com/app/123/SHRED_A_BILLION_Demo/" }).name).toBe("SHRED A BILLION");
  });
});

describe("videoLanguage", () => {
  it("uses the API field, else guesses from the title", () => {
    expect(videoLanguage({ title: "x", language: "es-419" }).english).toBe(false);
    expect(videoLanguage({ title: "Bebí todo el océano con una pajita", language: null }).english).toBe(false);
    expect(videoLanguage({ title: "Ich trinke das Meer", language: null }).english).toBe(false);
    expect(videoLanguage({ title: "I drank the ocean", language: null }).english).toBe(true);
  });
});

describe("groupWaves", () => {
  it("groups by game across name and link, and marks a fresh small wave OPEN", () => {
    const chans = new Map([["a", ch("a", 28_700, 28_700 * 5)], ["b", ch("b", 70_000)], ["c", ch("c", 26, 300, 10)]]);
    const vids = [
      vid("v1", "a", "I drank the entire ocean with a straw", "The game is called drink the ocean.", 19_600, 21),
      vid("v2", "b", "This Straw Game Is Weird", "Play it: https://mana.gs/drink-the-ocean", 18_000, 14),
      vid("v3", "c", "Drinking the sea", "game: Drink the Ocean", 10_500, 23),
    ];
    const rows = vids.map((v) => ({ ...toRow(v, chans.get(v.channelId), now), query: "incremental game" }));
    const { games } = groupWaves(rows, 3);
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({ key: "web:mana.gs/drink-the-ocean", videos: 3, status: "OPEN", inside_48h: true });
    expect(games[0]!.english_wave_age_hours).toBe(23);
  });
  it("merges a Steam demo app with the main app by name", () => {
    const chans = new Map([["a", ch("a", 1_000, 10_000)], ["b", ch("b", 2_000, 20_000)]]);
    const rows = [
      vid("m1", "a", "x", "https://store.steampowered.com/app/111/Shred_It/", 9_000, 10),
      vid("m2", "b", "y", "https://store.steampowered.com/app/222/Shred_It_Demo/", 8_000, 20),
    ].map((v) => ({ ...toRow(v, chans.get(v.channelId), now), query: "q" }));
    const { games } = groupWaves(rows, 3);
    expect(games).toHaveLength(1);
    expect(games[0]!.videos).toBe(2);
  });
  it("puts signal videos with no game name in unknown, and marks big-channel waves CROWDED and old waves OLD", () => {
    const chans = new Map([["s", ch("s", 1_000, 10_000)], ["big", ch("big", 1_190_000, 1_190_000 * 10)], ["t", ch("t", 5_000, 50_000)]]);
    const rows = [
      vid("u1", "s", "I did something crazy", "subscribe!", 50_000, 10),
      vid("d1", "big", "Feed the wall | Diversion", "", 97_000, 13),
      vid("d2", "t", "Wall game | Diversion", "", 9_000, 20),
      vid("o1", "t", "Old one | Old Game", "", 20_000, 100),
    ].map((v) => ({ ...toRow(v, chans.get(v.channelId), now), query: "q" }));
    const { games, unknown } = groupWaves(rows, 3);
    expect(unknown.map((u) => u.id)).toEqual(["u1"]);
    expect(games.find((g) => g.game === "Diversion")!.status).toBe("CROWDED");
    expect(games.find((g) => g.game === "Old Game")!.status).toBe("OLD");
  });
});

describe("keepRow", () => {
  it("drops live streams and non-gaming videos without a game link", () => {
    const base = toRow(vid("x", "a", "AI model full test", "", 1000, 5), ch("a", 100), now);
    expect(keepRow({ ...base, category: "28" }, { includeLive: false })).toBe(false);
    expect(keepRow({ ...base, category: "20" }, { includeLive: false })).toBe(true);
    expect(keepRow({ ...base, category: "20", live: true }, { includeLive: false })).toBe(false);
    expect(keepRow({ ...base, category: "24", game_link: "https://mana.gs/x" }, { includeLive: false })).toBe(true);
  });
});

describe("judgeHistory", () => {
  it("marks a game OLD when older English videos with views exist", () => {
    const chans = new Map([["a", ch("a", 5_000, 50_000)], ["b", ch("b", 300_000, 3_000_000)]]);
    const fresh = [vid("n1", "a", "I Took Over the World | Mycelarium", "", 9_000, 30)].map((v) => ({ ...toRow(v, chans.get(v.channelId), now), query: "q" }));
    const g = groupWaves(fresh, 3).games[0]!;
    expect(g.status).toBe("OPEN");
    const hist = [vid("o1", "b", "Mycelarium is great | Mycelarium", "", 186_000, 24 * 8)].map((v) => toRow(v, chans.get(v.channelId), now));
    const j = judgeHistory(g, hist, 3, 48);
    expect(j.status).toBe("OLD");
    expect(j.history!.first_english_signal_days_ago).toBe(8);
    // new English signal in the window → a re-wave label, not a drop
    expect(j.re_wave).toBe(true);
    expect(j.history!.note).toMatch(/re-wave/);
  });
  it("does not mark OLD for a different game with the same name (Roblox / other link)", () => {
    const chans = new Map([["a", ch("a", 28_700, 28_700 * 5)], ["r", ch("r", 5_950_000, 5_950_000 * 50)]]);
    const rows = [vid("n1", "a", "I drank the entire ocean with a straw", "The game is called drink the ocean.", 19_600, 21)].map((v) => ({ ...toRow(v, chans.get(v.channelId), now), query: "q" }));
    const g = groupWaves(rows, 3).games[0]!;
    const hist = [
      ...rows,
      toRow(vid("r1", "r", "Drink the Ocean in Roblox!", "", 900_000, 24 * 190), chans.get("r"), now),
      toRow(vid("r2", "r", "DRINK THE OCEAN challenge", "", 500_000, 24 * 191), chans.get("r"), now),
    ];
    const j = judgeHistory(g, hist, 3, 48);
    expect(j.status).toBe("OPEN");
    expect(j.history!.possible_name_clash).toHaveLength(1);
    expect(j.history!.note).toMatch(/name clash/);
  });
  it("keeps a fresh game OPEN", () => {
    const chans = new Map([["a", ch("a", 5_000, 50_000)]]);
    const rows = [vid("n1", "a", "Sip | Drink the Ocean", "", 9_000, 20)].map((v) => ({ ...toRow(v, chans.get(v.channelId), now), query: "q" }));
    const g = groupWaves(rows, 3).games[0]!;
    const j = judgeHistory(g, rows, 3, 48);
    expect(j.status).toBe("OPEN");
    expect(j.history!.english_long_videos_all_time).toBe(1);
  });
});

describe("isSignal floor", () => {
  it("a 5-view video on a 3-sub channel is not a wave", () => {
    const chans = new Map([["z", ch("z", 3, 10, 10)]]);
    const rows = [vid("z1", "z", "I Tried to Collect Coins | One Million Coins", "", 5, 30)].map((v) => ({ ...toRow(v, chans.get(v.channelId), now), query: "q" }));
    expect(groupWaves(rows, 3).games).toHaveLength(0);
  });
});

describe("stageOf + verdictOf (wave-timing study 27 Nov 2026)", () => {
  const row = (id: string, subs: number, views: number, hoursAgo: number, min = 60) => toRow(vid(id, id, "x", "", views, hoursAgo, min, "en"), ch(id, subs), now);
  const live = { status: "OPEN" as const, re_wave: false };
  it("Heroll on 26 Nov: two big videos ~46 h old → LATE", () => {
    const st = stageOf([row("gohjoe", 202_000, 77_000, 46), row("dabble", 18_000, 61_000, 46), row("beelz", 100_000, 28_000, 120), row("moon", 15, 1_000, 18)]);
    expect(st).toMatchObject({ stage: "LATE", big_videos: 2 });
    expect(verdictOf({ ...live, ...st, english_wave_age_hours: 40 }).verdict).toBe("LATE");
  });
  it("Every Last Grain on 24 Nov: one big video 6 h old → BIG_JUST_POSTED, GO", () => {
    const st = stageOf([row("bonsai", 56_000, 35_000, 6), row("rr", 1_780, 15_000, 16), row("yummy", 175, 3_000, 30)]);
    expect(st.stage).toBe("BIG_JUST_POSTED");
    expect(verdictOf({ ...live, ...st, english_wave_age_hours: 30 }).verdict).toBe("GO");
  });
  it("Drink the Ocean on 14 Nov: no big video yet → EARLY, GO", () => {
    const st = stageOf([row("jayify", 28_000, 19_600, 21), row("kit", 26, 10_500, 23), row("short", 75_000, 500_000, 13, 2)]);
    expect(st).toMatchObject({ stage: "EARLY", big_videos: 0 });
    expect(verdictOf({ ...live, ...st, english_wave_age_hours: 23 }).verdict).toBe("GO");
  });
  it("small channels from the last days all under 500 views → cooling, NO", () => {
    const st = stageOf([row("a", 200, 3_000, 110), row("b", 300, 120, 40), row("c", 50, 60, 30)]);
    expect(st.cooling).toBe(true);
    expect(verdictOf({ ...live, ...st, english_wave_age_hours: 70 }).verdict).toBe("NO");
  });
  it("old wave with no re-wave → NO", () => {
    expect(verdictOf({ status: "OLD", re_wave: false, stage: "EARLY", cooling: false, english_wave_age_hours: 300, big_videos: 0, first_big_video_hours_ago: null }).verdict).toBe("NO");
  });
});

describe("live-test fixes (27 Nov 2026)", () => {
  it("a line of dashes is not a game name", () => {
    expect(gameFromVideo({ title: "I 100%'d Your Party Died Again and It Was Amazing", description: "Game: --------------------------------------------------\nmore" }).name ?? "").not.toMatch(/^-+$/);
  });
  it("big English channels with no small outliers → LATE, not 'no wave'", () => {
    expect(verdictOf({ status: "NO_ENGLISH_SIGNAL", re_wave: false, stage: "LATE", cooling: false, english_wave_age_hours: null, big_videos: 2, first_big_video_hours_ago: 22 }).verdict).toBe("LATE");
  });
});

describe("FOLLOW: huge live waves (channel study 27 Nov 2026)", () => {
  const row = (id: string, subs: number, views: number, hoursAgo: number) => toRow(vid(id, id, "x", "", views, hoursAgo, 60, "en"), ch(id, subs), now);
  const live = { status: "OPEN" as const, re_wave: false };
  it("Kick Rocks on 25 Nov: 3 huge videos + a small channel win → FOLLOW", () => {
    const st = stageOf([row("imcade", 1_200_000, 150_000, 10), row("normalhs", 1_180, 225_000, 140), row("mcveety", 44_400, 104_000, 70), row("lemon", 2_340, 5_800, 50)]);
    expect(st.huge_videos_14d).toBe(3);
    expect(verdictOf({ ...live, ...st, english_wave_age_hours: 40 }).verdict).toBe("FOLLOW");
  });
  it("Heroll on 26 Nov: big but not huge (86K, 71K) → LATE, not FOLLOW", () => {
    const st = stageOf([row("gohjoe", 202_000, 86_000, 46), row("dabble", 18_000, 71_000, 46), row("moon", 15, 6_000, 20)]);
    expect(verdictOf({ ...live, ...st, english_wave_age_hours: 40 }).verdict).toBe("LATE");
  });
});
