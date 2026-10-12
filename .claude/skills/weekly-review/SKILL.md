---
name: weekly-review
description: Run Brimlo's Sunday weekly review — collect YouTube Studio stats, log them per video and for the channel, find the best/worst video and why, track YPP progress, check energy, and decide changes for next week. Use for "/weekly-review", "weekly review", "check my stats", "how is the channel doing".
argument-hint: "[optional: paste stats]"
---

# /weekly-review

Honest, short, practical. One clear decision at the end.

## Steps

1. Read `analytics/weekly-reviews.md` (last review + template), `videos/log.md`, `channel/status.md`, `plan/calendar.md` (this week + next week).
2. **Get numbers.** First try vidIQ own-channel tools only if the channel is authorized (see CLAUDE.md "Known setup gaps"); check `vidiq_balance` (free) and say the cost before paid calls. Otherwise ask him to paste, in one message:
   - Channel last 7 days: views, watch hours, subs gained, total subs, 365-day watch hours (Earn tab).
   - For each video from the last ~4 weeks: views, impressions CTR, average view duration, retention at 30 s and 5 min, subs gained, top traffic source.
   - Hours worked this week and energy (1–5).
   A screenshot is fine — read it.
3. **Log it:**
   - New entry at the top of the reviews section in `analytics/weekly-reviews.md` using the template.
   - Fill 7-day / 28-day results in each video file and in `videos/log.md`. Recompute the medians table. Mark hits (≥ 3x median 7-day views) with ⭐.
   - Update "Numbers" and "YPP progress" in `channel/status.md`.
   - Update the "Title test log" in `playbook/titles.md`.
4. **Analyze** (simple words):
   - Best and worst video — likely why (game newness, theme, title template, thumbnail, length, first 30 s retention).
   - Patterns across videos (which template/theme/length wins). Say how sure you are — with < 10 videos, patterns are weak.
   - YPP pace: hours per week now vs needed for 8,000 in 365 days.
   - Energy: if ≤ 2 two weeks in a row → recommend dropping one video/week, not stopping.
5. **Decide**: 1–3 concrete changes for next week (e.g. "use template A on both videos", "fix first 30 s", "pick a demo for Friday"). Update `plan/calendar.md` if slots change.
6. On checkpoint dates (Sun 1 Nov, Sun 8 Nov, Sun 6 Dec, Sun 3 Jan 2027) also compare against the targets in `plan/roadmap.md`.

## Rules

- Don't invent numbers. If something is missing, write "?".
- Compare videos with each other, not with big channels.
