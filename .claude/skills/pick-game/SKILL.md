---
name: pick-game
description: Choose the next game(s) for Brimlo — scout new Steam incremental demos, playtests and launches, check Mac/CrossOver, score each with the game checklist, and recommend picks for open calendar slots. Use for "/pick-game", "what game should I play", "find new games", "scout", "Next Fest demos".
argument-hint: "[optional: number of games, slot date, or 'next fest']"
---

# /pick-game

## Steps

1. Read `plan/calendar.md` (which slots are open ❓ and when), `games/backlog.md`, `games/checklist.md`, and the last 10 rows of `videos/log.md` (avoid the same theme twice in a row).
2. **Scout** — launch the `game-scout` agent (web only, no vidIQ credits) with: today's date, the open slots, themes that work (dark/horror, swarm/army, cozy cleanup, mining/digging/fishing) and satisfying job-sims with upgrades (see the sim picks in games/checklist.md; keep roughly 60% incremental / 40% sim), budget (free first, max $10–15/month), and the list of games already used/owned. Ask for 6–10 candidates with Steam link, status (demo/playtest/EA/full + end dates), price, macOS support, and whether big channels already covered it.
3. Add owned games from the backlog that are still unused as candidates too. **Owned and planned games come first.** The sim games in the "later queue" (games/checklist.md) are only recommended after the owned games are used up, unless he asks for them.
4. **Score** every candidate with `games/checklist.md` (Must = pass/fail, Strong = count). Show a table: game · free/paid · Mac · Must ✅/❌ · Strong score · deadline · why.
5. **Recommend** one game per open slot, with a backup Mac-native game. Prefer: time-sensitive free demos/playtests > new launches > owned unused > paid on sale.
6. **Optional vidIQ check** (only if he asks or a pick is borderline): "has a big channel covered it?" via `vidiq_youtube_search` or `vidiq_channel_videos` — say the cost first (≈5 credits/call), max 2 calls without asking.
7. **Update** `games/backlog.md` (candidates table, new info, test status) and put the picks into `plan/calendar.md` (status 📝). Tell him which games to Mac-test this week (Wed evening).

## Rules

- Never recommend a game that fails the Mac check or has anti-cheat.
- Never recommend Steam refunds as free rentals.
- Respect the monthly budget; say the month's spend so far if known.
