---
name: today
description: Tell Mamunur what to do now — what is due today and this week, what is overdue, which stats to check, and one recommendation. Use for "what should I do today", "what's next", "what is left", "what do I need to do", "plan my week", "where are we", "status", "/today", or any general start-of-session question.
---

# /today

## Steps

1. Get today's real date (from the system, not memory).
2. Read `plan/calendar.md` (this week + next week), the last 6 rows of `videos/log.md`, `channel/status.md` (Numbers + Open to-dos).
3. Find:
   - **Due today / next 3 days:** record, publish (10 PM Dhaka), run tests.
   - **Overdue:** a planned slot that passed without a ✅, a game not run-tested before its record date, a missing title A/B test.
   - **Result checks due:** any video whose upload + 7 days is today or past and has no 7-day numbers in the log (pull them with `vidiq_channel_analytics`, channel `UCXf8abbaSiOThD3YhX8nGjQ`; ask him only for CTR/impressions from Studio). Any title A/B test older than 7 days → ask for the Studio test report.
   - **Hot games:** if the last game check is older than 3 days, say "/pick-game" is worth a run.
   - Sunday → `/weekly-review`.
4. Reply in short simple English:
   - **Now (today)** — max 3 items, most important first.
   - **This week** — table: date · what · command.
   - **Later** — max 3 lines.
   - **One recommendation** with the reason.
   Give the upload speed label (🔥/🟡/🟢) for each planned video (CLAUDE.md rule 11).
5. Do not edit files unless something is clearly wrong (e.g. a published video still shows 📝); then fix it and say so.
