---
name: pick-game
description: Choose the next game(s) for Brimlo — scout new Steam incremental demos, playtests and launches, check Mac/CrossOver, score each with the game checklist, and recommend picks for open calendar slots. Use for "/pick-game", "what game should I play", "find new games", "scout", "Next Fest demos".
argument-hint: "[optional: number of games, slot date, or 'next fest']"
---

# /pick-game

## Steps

1. Read `plan/calendar.md` (which slots are open ❓ and when), `games/backlog.md`, `games/checklist.md`, and the last 10 rows of `videos/log.md` (avoid the same theme twice in a row).
2. **Scout** — launch the `game-scout` agent (free brimlo Steam/itch tools + web search, no vidIQ credits) with: today's date, the open slots, themes that work (dark/horror, swarm/army, cozy cleanup, mining/digging/fishing) and satisfying job-sims with upgrades (see the sim picks in games/checklist.md; keep roughly 60% incremental / 40% sim), budget (free first, max $10–15/month), and the list of games already used/owned. Ask for 6–10 candidates with Steam link, status (demo/playtest/EA/full + end dates), price, whether it runs in CrossOver (Windows-only is fine), and whether big channels already covered it.
3. Add owned games from the backlog that are still unused as candidates too. **Owned and planned games come first.** The sim games in the "later queue" (games/checklist.md) are only recommended after the owned games are used up, unless he asks for them.
4. **Score** every candidate with `games/checklist.md` (Must = pass/fail, Strong = count). Show a table: game · free/paid · Mac · Must ✅/❌ · Strong score · deadline · why.
5. **Recommend** one game per open slot, with a backup game. Windows-only is fine: **CrossOver Steam is the main way to play** (Mamunur, 25 Oct 2026). Never prefer or rank up a game for being Mac native. Prefer: time-sensitive free demos/playtests > new launches > owned unused > paid on sale.
6. **Optional coverage check** (only if he asks or a pick is borderline): "has a big channel covered it?" Use `brimlo_idea_engine` (run `estimate_only` first; ~204 units cold, shows competitor coverage, outliers, title shapes and search gaps) or `brimlo_keyword_research "<game name>"` (~102 units; shows who ranks). Say the cost first; max 2 checks (about 400 units) without asking. Check `source` is not `demo`. While the vidIQ subscription lasts (until November 2026), also cross-check a borderline pick with vidIQ (`vidiq_youtube_search`, ≈5 credits) and report both.
7. **Update** `games/backlog.md` (candidates table, new info, test status) and put the picks into `plan/calendar.md` (status 📝). Tell him which games to Mac-test this week (Wed evening).

## Rules

- Never recommend a game that fails his CrossOver test or has anti-cheat. Not having a Mac build is never a reason to skip.
- Never recommend Steam refunds as free rentals.
- Respect the monthly budget; say the month's spend so far if known.
