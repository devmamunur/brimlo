---
name: pick-game
description: Choose the next game(s) for Brimlo — scout new Steam incremental/idle/clicker/survivor-like and job-sim demos, playtests and launches, check CrossOver/Mac, game wave on big channels, score with the game checklist, recommend picks with upload speed labels for open calendar slots. Use for "what game should I play", "find new games", "which game next", "any hot game", "scout", "new demos", "Next Fest", "is [game] good for the channel", "should I play [game]", or "/pick-game".
argument-hint: "[optional: number of games, slot date, or 'next fest']"
---

# /pick-game

## Steps

1. Read `plan/calendar.md` (which slots are open ❓ and when), `games/backlog.md`, `games/checklist.md`, and the last 10 rows of `videos/log.md` (avoid the same theme twice in a row).
2. **Scout** — launch the `game-scout` agent (free brimlo Steam/itch tools + web search, no vidIQ credits) with: today's date, the open slots, themes that work (dark/horror, swarm/army, cozy cleanup, mining/digging/fishing) and satisfying job-sims with upgrades (see the sim picks in games/checklist.md; keep roughly 60% incremental / 40% sim), budget (free first, max $10–15/month), and the list of games already used/owned. Ask for 6–10 candidates with Steam link, status (demo/playtest/EA/full + end dates), price, whether it runs in CrossOver (Windows-only is fine), and whether big channels already covered it.
   - **24-hour launch check (8 Nov 2026):** for every launch / new demo / new playtest, find the release date and time and count the hours since. ≤ 24 h → the best kind of 🔥 FAST pick (record today or tomorrow). > 24 h → write `⏱️ … N days ago → the launch window has passed ⛔` for that game in the reply, every time, and judge it by `channel/strategy.md` → "24-hour launch check". Also look at small English channels that posted it 1–2 days ago: under ~500 views = the wave is over.
   - **Game wave check:** also list the games Azrilich (@AzrilichIdle) and JonnyBebop (@JonnyBebop) posted in the last 7 days (`brimlo_channel_videos`, ~3 units each). A game a big channel posted in the last 7 days that runs in CrossOver is a 🔥 FAST candidate, not a reason to skip (channel/strategy.md → "Game wave check").
3. Add owned games from the backlog that are still unused as candidates too. **Owned and planned games come first.** The sim games in the "later queue" (games/checklist.md) are only recommended after the owned games are used up, unless he asks for them.
4. **Score** every candidate with `games/checklist.md` (Must = pass/fail, Strong = count). Show a table: game · free/paid · Mac · Must ✅/❌ · Strong score · deadline · **hours since launch** (≤ 24 h ✅ / passed ⛔) · **upload speed** (🔥 FAST / 🟡 SOON / 🟢 RELAXED, CLAUDE.md rule 11; base it on release date + how many YouTube videos exist, from the scout's coverage check) · why.
5. **Validate on YouTube in Chrome (always, before recommending).** API searches miss videos (7 Nov 2026: vidIQ search showed The Big Suck's top English video as 3.0K; the real top was JustPatrick-Idle 67K). For **every game you will recommend, including backups**, check the real YouTube search page in his desktop Chrome with the **Claude in Chrome** extension (tools `mcp__claude-in-chrome__*`; load the core set in one ToolSearch call: `tabs_context_mcp, tabs_create_mcp, navigate, get_page_text, read_page, computer`):
   - Open a **new tab** (never use his open tabs) → `https://www.youtube.com/results?search_query=<game name>` (URL-encode the name). If the name is a common phrase, also search `<game name> game`.
   - Read the page with `get_page_text` (scroll once and read again to see ~20 results). Take a screenshot only if the text is unclear. His vidIQ extension shows subscriber counts and outlier badges (e.g. 4.7x) next to each result: use them.
   - Write down the **top 3–5 videos about this game**: channel, subscribers, views, age, language, demo or full game, title angle. Ignore unrelated videos and the developer's own trailer (but note a big trailer as a demand signal).
   - **Read-only:** do not click like/subscribe/comment, do not sign in or change any account setting, close the tab when done.
   - Re-set the speed label and the coverage note from this check. If it disagrees with the API numbers, **the browser wins** — say so in one line.
   - If Chrome is not connected, say so, use `vidiq_youtube_search` with `order: viewCount` instead, and mark the game "not browser-checked".
6. **Recommend** one game per open slot, with a backup game. Put 🔥 FAST games in the earliest slots (record them first); 🟢 RELAXED games fill later slots and the buffer. Say each pick's label and why in one line. Windows-only is fine: **CrossOver Steam is the main way to play** (Mamunur, 25 Oct 2026). Never prefer or rank up a game for being Mac native. Prefer: time-sensitive free demos/playtests > new launches > owned unused > paid on sale.
7. **Optional coverage check** (only if he asks or a pick is borderline): "has a big channel covered it?" Use `brimlo_idea_engine` (run `estimate_only` first; ~204 units cold, shows competitor coverage, outliers, title shapes and search gaps) or `brimlo_keyword_research "<game name>"` (~102 units; shows who ranks). Say the cost first; max 2 checks (about 400 units) without asking. Check `source` is not `demo`. While the vidIQ subscription lasts (until November 2026), also cross-check a borderline pick with vidIQ (`vidiq_youtube_search`, ≈5 credits) and report both.
8. **Update** `games/backlog.md` (candidates table, new info, test status, and the Chrome coverage numbers with the date checked) and put the picks into `plan/calendar.md` (status 📝). Tell him which games to Mac-test this week (Wed evening).

## Rules

- Never recommend a game that fails his CrossOver test or has anti-cheat. Not having a Mac build is never a reason to skip.
- Never recommend Steam refunds as free rentals.
- Never give a speed label or coverage claim for a recommended game without the Chrome YouTube check (step 5), or say clearly that it was not browser-checked.
- Respect the monthly budget; say the month's spend so far if known.
