---
name: weekly-review
description: Run Brimlo's weekly review — pull real stats with vidIQ analytics (views, engaged views, watch hours, retention, traffic sources) plus CTR from Studio, log them per video and for the channel, find the best/worst video and why, check title A/B tests, track YPP progress and energy, and decide changes for next week. Use for "weekly review", "check my stats", "how is the channel doing", "how did my videos do", "analytics", "my numbers", "why no views", or "/weekly-review". Default on Sundays.
argument-hint: "[optional: paste stats]"
---

# /weekly-review

Honest, short, practical. One clear decision at the end.

## Steps

1. Read `analytics/weekly-reviews.md` (last review + template), `videos/log.md`, `channel/status.md`, `plan/calendar.md` (this week + next week).
2. **Get numbers** (what worked on Wed 11 Nov 2026 — do it yourself, ask him only for what you cannot read):
   - `brimlo_own_channel` (~3 units): subs, total views, recent uploads with public views. If `source` is `demo`, ignore it.
   - `vidiq_channel_analytics` (channel `UCXf8abbaSiOThD3YhX8nGjQ`, free to use): last 7 days totals (views, engagedViews, minutes, subs), 365-day minutes, per-video table (`dimensions: video`), `report: traffic_sources`, and `report: audience_retention` + `filters: video==ID` for the newest 2–3 videos (rough retention at ~30 s–2 min and 5 min). The API is ~2 days behind: the newest videos show almost nothing.
   - **~7-day views per video:** read the daily public-view snapshots in `tools/research/data/brimlo.sqlite` (`sqlite3 -readonly`, table `video_stats_snapshots`), take the value nearest to day 7. Write "(day N)" for videos younger than 7 days.
   - **Studio in Chrome** (Claude in Chrome, his own sign-in): Analytics → Advanced mode, last 28 days, breakdown **Content** with metrics Impressions, Impressions CTR, Views, Avg view duration, Watch time, Subscribers; then breakdown **Traffic source** (CTR per source). Earn tab → qualified watch hours (shows the date of its data). Direct URL that worked: `studio.youtube.com/channel/UCXf8abbaSiOThD3YhX8nGjQ/analytics/tab-overview/period-default/explore?entity_type=CHANNEL&entity_id=UCXf8abbaSiOThD3YhX8nGjQ&time_period=4_weeks&explore_type=TABLE_AND_CHART&metric=VIDEO_THUMBNAIL_IMPRESSIONS&t_metrics=VIDEO_THUMBNAIL_IMPRESSIONS&t_metrics=VIDEO_THUMBNAIL_IMPRESSIONS_VTR&t_metrics=VIEWS&t_metrics=AVERAGE_WATCH_TIME&t_metrics=WATCH_TIME&t_metrics=SUBSCRIBERS_NET_CHANGE&dimension=VIDEO` (change `dimension=TRAFFIC_SOURCE_TYPE` for sources). Scroll down and read the table from a screenshot (page text does not include it).
   - Ask him only for: hours worked this week and energy (1–5). If Chrome is not available, ask him for the Studio numbers in one message (a screenshot is fine).
3. **Log it:**
   - New entry at the top of the reviews section in `analytics/weekly-reviews.md` using the template.
   - Fill results in each video file (a "Results — weekly review <date>" block) and the 7-day / CTR / Avg view / Subs columns in `videos/log.md`. **Edit table rows by splitting on unescaped `|` only** (titles contain `\|`, empty cells look like `| |`); check the diff after. Recompute the medians table. Mark hits (≥ 3x median 7-day views) with ⭐.
   - Update "Numbers" and "YPP progress" in `channel/status.md`.
   - Update the "Title test log" in `playbook/titles.md`.
4. **Analyze** (simple words):
   - Best and worst video — likely why (YouTube wave or not, theme, title pattern, thumbnail, length, first 1–2 min retention).
   - Patterns across videos. Say how sure you are — with < 10 videos, patterns are weak.
   - Traffic: CTR and avg view per source (Search vs Home vs Suggested).
   - YPP pace: hours per week now vs needed for 8,000 in 365 days (~154 h/week).
   - Energy: if ≤ 2 two weeks in a row → recommend dropping one video/week, not stopping.
5. **Fix what you can (he asked for this, 11 Nov 2026):** for a video with **CTR under ~2% on 300+ impressions**, write a new title from `playbook/titles.md` (game type row, true to the video, check the old video file for facts), change it in Studio (Details → title → Save; wait for the page to load before clicking the title, or the keys go to the video player), and log it (video file, `videos/log.md`, Title test log). Keep " - Game Name" on an older video that ranks for its name in search (titles.md exception). **Thumbnails: only judge them.** Say "keep" or describe a new idea; Mamunur makes and uploads thumbnails himself.
6. **Decide**: 1–3 concrete changes for next week. Then a short "Suggestions for the future" list. **Every suggestion must match the current rules** (e.g. game name only by game type) — do not give a general tip that the next step breaks. Update `plan/calendar.md` if slots change.
7. On checkpoint dates (Sun 6 Dec, Sun 3 Jan 2027) also compare against the targets in `plan/roadmap.md`.
8. Rules are not fixed: if the numbers clearly disagree with a rule, say so and suggest a market check; change the rule only after that check (date + reason in the file).

## Rules

- Don't invent numbers. If something is missing, write "?".
- Compare videos with each other, not with big channels.
