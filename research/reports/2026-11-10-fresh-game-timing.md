# When to play a new game: day 0–2 check (Tue 10 Nov 2026)

**Question (Mamunur):** should /pick-game always look first for games that came out 0–2 days ago, so Brimlo can catch the breakout like other small channels?
**Method:** for 7 recent games I took each YouTube video's publish date minus the game's release date (from the vidIQ searches in [2026-11-10-game-name-in-title-check.md](2026-11-10-game-name-in-title-check.md)), plus a 48-hour "what is blowing up now" scan.

## 1. Full launches and playtests: day 0–2 is the window (confirmed)

| Game (type, release) | Day 0–2 videos | Day 3+ videos |
|---|---|---|
| Mycelarium (full launch, Tue 3 Nov) | Yusterday 1.6K subs **245K (day 0)** · JustPatrick-Idle 4.1K **70K (day 1)** · FungalBrainRot 8.3K **80K (day 2)** · Fun Under Five 2.5K 8.1K (day 2) · Crohnie Gamer 126 subs 6.8K (day 2) · A D C 120 subs 3.5K (day 0) | LiamsiL 663 subs 2.3K (day 3) · small channels 128–360 (day 3) · Brimlo 47 after 17 h (day 4) |
| I Am Plague (playtest, Tue 6 Oct) | BryBry 1.1K subs **22.7K (day 1)** · Sharkinbear 2.3K **18.6K (day 1)** | mikesgood 1.3K (day 2) · Brimlo ~1K (day 11) |

**Even 120-subscriber channels got 3.5K–6.8K on day 0–2** of a hyped launch. Day 3+ drops to hundreds.

## 2. Demos: the wave usually starts LATER than the release

| Demo (release) | When the English wave started | Proof |
|---|---|---|
| Wait, They Can Climb?! (~Sat 1 Nov) | day 6 | Ash Swoon 41K and Erdem 64K on 7 Nov; English videos before that: 74–326 |
| Ant Mill Inc (Sun 18 Oct) | day 9–11 | Danielsan 110K (day 9), Haikrazon 212K (day 11) |
| Way Too Many Fish! (Tue 20 Oct) | day 12 | Slow Mo 1.9K on day 4; Azrilich 202K on day 12; IdleAlex 16.9K on day 14 |
| Zombie Incremental (Sat 7 Nov) | day 1 | Ash Swoon 8.2K in ~1 day |

So for a **demo**, "out 0–2 days ago" alone is not enough: most demos sit quiet for days, then one creator's video takes off and the wave starts. **The real window is 0–2 days after the wave starts** (the first video with outlier views), or 0–2 days after release if the demo already has demand signals (Next Fest, a big trailer, a known developer, a creator already covering it).

## 3. The 48-hour wave scan works

`vidiq_youtube_search` "incremental game", `publishedAfter` = 48 h ago, `order: viewCount`, long videos (run Mon 9 Nov 2026) showed the games waving right now: 10 Million Pixels (ImCade 191K), Stick A Fork (DangerouslyFunny 213K), Your party died again (Idle cub 152K), RIP IT (Blitz 103K), Potato Please (65K), High Voltage (60K), Incremental Traffic (49K), Round and Round Inc (Ruddaii 2.9K subs → 27K), Booster Pack Heroes, One More Floor (Yusterday 13K), Playrooms. This finds fresh waves that Steam lists miss.

## 4. Quality matters, but views do not need a great game

Hay! One Billion! has **Mixed (65%)** reviews and still got 868K + 1.9M on big channels. So reviews do not decide views. But Mamunur wants good games (his own enjoyment shows in commentary), so the quality gate stays: real upgrade loop, no fake/asset-flip game, and reviews ≥ ~80% when there are 10+ reviews.

## Decision (10 Nov 2026)

- Launch window = **day 0–2 (≤ 48 h)** for full launches, early access and playtests (was ≤ 24 h).
- /pick-game looks **fresh first**: (1) launches/playtests ≤ 48 h, (2) demos/games whose YouTube wave started ≤ 48 h ago with few English videos, (3) brand-new demos (≤ 48 h) with demand signals. Only if none passes the quality gate → the old system.
- **Always one game**, playable **today or tomorrow**.
