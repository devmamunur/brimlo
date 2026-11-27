# Before or after the big channels? Wave timing study (Fri 27 Nov 2026)

**Question (Mamunur):** when big channels (50K–100K views) already posted a game, is it still worth playing? Or is it better to pick a game where only small channels have posted, as early as possible (6–24 h)?
**Data:** all 20 Brimlo long videos (`brimlo_channel_videos`, 27 Nov 2026) + the full YouTube history (`brimlo_youtube_search`, all time) of 5 games we played: Heroll: IF, Drink the Ocean, Every Last Grain, Kick Rocks, Mycelarium (~120 videos, publish time + subs + views). Cost ~620 units.

## 1. Brimlo results by when we published

| When we published | Videos (views on 27 Nov 2026) | Average |
|---|---|---|
| **Before the big channels** (small channels got outlier views, 0–1 big channel) | Drink the Ocean 3,991 · Every Last Grain 1,974 · I Am Plague 1,740 · Wait They Can Climb 803 · Big Ice 432 | **~1,800** |
| **After the big channels** (2+ English videos with 50K+) | Mycelarium 877 · Wipe Them Out 515 · Kick Rocks 338 · Shred a Billion 240 · Heroll: IF 29 | **~400** |
| **No wave** | Way Too Many Fish 250 · Pack Ripper 150 · Deforest a Planet 149 · Quadrillion Carrots 94 · Rust & Shine 78 · Scrapecremental 53 · The Pool Problem 20 | **~110** |

Before the big channels ≈ **4×** after them, ≈ 16× no wave. Small sample (17 videos): a guide, not a law.

## 2. Why early works: the big channels send search traffic to the first videos

- **Drink the Ocean:** we published Sat 14 Nov 22:15 UTC (~30 h after the first outlier). The big videos came **after** us: mcveety 1.17M (16 Nov), Jyku Plays 205K (16 Nov), Sonoket 170K (17 Nov), Kindly Keyin 281K (20 Nov), YumiLive 197K (25 Nov). **78% of our views came from YouTube search.** Their viewers searched the game and found the few videos that existed.
- **Every Last Grain:** Ridiculously Random 23 Nov 19:20 UTC, BonsaiBroz 24 Nov 05:33 (95K), we 24 Nov 16:15 (~11 h after the first big video). After us: Malakye G 41K, Sonoket 92K, DangerouslyFunny 268K. We are at 1,974 and still growing.
- **Heroll: IF:** Beelz 31K and Zueljin 25K (21 Nov), Gohjoe 86K and Dabble 71K (24 Nov 17:00). We published 26 Nov 20:30 (~51 h after the two big videos): 29 views, CTR 1.2%, search 0.

## 3. Late is not always dead — but only with "more than them"

- Mycelarium: Trey Tries Games (3.7K subs) posted on **day 9**, after Yusterday 411K and FungalBrainRot 250K, and got **1.5M** ("I Took Over the World As a Mushroom", 100%). Mykey (762 subs) day 14: 100K ("I Played 100% of Mycelarium").
- Kick Rocks: Normalhs (1.2K subs) 225K on day 12; ImCade 283K on day 18.
- So fans of a game do want more videos. The late winners gave more: 100% / the ending, or a much stronger simple story title. Normal late "first try" videos fail (Heroll late videos: 45, 40, 60, 129 views; Kank Sim 278 on Every Last Grain).
- The search tool lists top videos first, so failed late videos are under-counted: real late results are worse than they look.

## 4. Fit matters too

All Brimlo hits are **one simple, crazy goal** games (drink the ocean, empty a desert, a mushroom eats the world, rats eat everything, a mountain of ice). Heroll is a complex roguelike RPG with its own audience: Home viewers did not click (1.2%).

## Decision (27 Nov 2026)

1. **GO** = a live English wave (small channels with outlier views, first signal ≤ 48 h, best ≤ 24 h) **and** 0 big English videos (≥ 30K), or exactly 1 big video ≤ 24 h old **and** not cooling **and** a simple-goal game that fits Brimlo. Record now, publish tonight.
2. **LATE** (2+ big videos, or the first one > 24 h old) = not the BEST pick. Only with a "more than them" plan (100% / full ending / full game when others did the demo). Expect ~400.
3. **No wave = no pick** (~110 views). A new Steam demo with no YouTube wave is "watch", not BEST (exception: a new Mana game, which is watched for its first signal).
4. **No GO game → say "No game now. Rest, scan again in ~6–12 h."** A rest day costs nothing; a wrong pick costs a full evening and ~100–400 views.
5. Tool: `brimlo_wave_scan` now gives each game a `stage` (EARLY / BIG_JUST_POSTED / LATE), `big_videos`, `cooling`, a `verdict` (GO / LATE / NO) and an overall `verdict` (GO / CHECK / ONLY_LATE / NO_GAME).

This updates (does not replace) [2026-11-10-fresh-game-timing.md](2026-11-10-fresh-game-timing.md) and the 28 Oct "a big channel is not a reason to skip" rule: **one** big video in the last 24 h is still GO (its viewers search the game now); two or more, or older than 24 h, is LATE.
