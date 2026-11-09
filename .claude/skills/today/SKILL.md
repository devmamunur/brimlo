---
name: today
description: Tell Mamunur what to do now — the ONE next game to play (checked today), what is due today, what is overdue, which stats to check, and one recommendation. Use for "what should I do today", "what's next", "what is left", "what do I need to do", "plan my week", "where are we", "status", "/today", or any general start-of-session question.
---

# /today

## Steps

1. Get today's real date (from the system, not memory).
2. Read `plan/calendar.md` (published/scheduled rows + the next planned video), the last 6 rows of `videos/log.md`, `channel/status.md` (Numbers + Open to-dos).
3. Find:
   - **Due today / next 3 days:** record, publish (10 PM Dhaka), run tests.
   - **Overdue:** a planned slot that passed without a ✅, a game not run-tested before its record date, a title swap check that is due (publish + 2–3 days, video below median → swap to B).
   - **Result checks due:** any video whose upload + 7 days is today or past and has no 7-day numbers in the log (pull them with `vidiq_channel_analytics`, channel `UCXf8abbaSiOThD3YhX8nGjQ`; ask him only for CTR/impressions from Studio). Any title A/B test older than 7 days → ask for the Studio test report.
   - **Next game (one only):** hype and search change every day. If the next planned game was not checked **today**, re-check it now (hours since launch, YouTube search for the game, big channels) or run `/pick-game`. If another game is clearly hotter today, say so and pick it instead.
   - Sunday → `/weekly-review`.
4. Reply in short simple English:
   - **Now (today)** — max 3 items, most important first.
   - **Next game** — ONE game to record next + the publish date, with its upload speed label (🔥/🟡/🟢, CLAUDE.md rule 11), the date/time you checked and the reason. One backup game in one line.
   - **Also open** — max 3 short lines (overdue checks, title swap check, weekly review).
   - **No week table, no list of later games** (Mamunur, 9 Nov 2026). For a planned new launch/demo/playtest, also say the hours since launch and, if over 48 h, "the launch window has passed".
5. Do not edit files unless something is clearly wrong (e.g. a published video still shows 📝); then fix it and say so.
