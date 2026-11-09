---
name: publish
description: Record that a Brimlo video was recorded, uploaded, scheduled, published, renamed or made private — update the video file, video log, calendar, game backlog and channel status, and log title swaps. Use when Mamunur says "I uploaded", "I scheduled", "video is live", "I published", "I recorded", "I changed the title", "I set it private", "here is the link", or "/publish".
argument-hint: "[game or video file] [status: recorded|scheduled|published] [title] [date] [link]"
---

# /publish

Keep the log true. Ask only for what's missing (title, date, status, YouTube link, final length).

## Steps

1. Find the video file in `videos/` (by game name). If none exists (e.g. made outside the system), create it from `videos/_template.md` with the facts he gives.
2. Ask for missing facts in **one** short question: final title, upload date/time, status, link, length.
3. Run a quick check against `playbook/upload-checklist.md` — mention only items that look missing (e.g. game name or "|" in the title, title not true to the video, no chapters). Don't block.
4. Update:
   - **Title swap check** (10 Nov 2026, no Studio A/B tests for now): write a swap-check date (publish + 2–3 days) in the video file. On a title change ("I changed the title"), note the date + old/new title in the video file and add a row to the Title test log in `playbook/titles.md`. Do not remind him to start a Studio A/B test unless the video gets ~1,000+ impressions a week (`playbook/titles.md` → "A/B/C title set").
   - **Playlists + end screen**: ask if he added the video to the playlist(s) in its Playlists row and set the end screen (Best for viewer + its genre playlist + Subscribe; fastest: Import from video, from one in the same genre playlist — `playbook/upload-checklist.md` → Settings). Mark the End screen row in the video file. If the row is empty, pick them by the rule in `playbook/upload-checklist.md` → Settings and tell him.
   - **Video file**: status, upload date, final title ("Chosen"), link, length, chapters/description if given. Add result check dates (upload + 7 days, + 28 days) in the Results table header.
   - **`videos/log.md`**: the row (status ✅/🕒/🎬, title, length, file link). Keep rows in upload-date order. Number new rows.
   - **`plan/calendar.md`**: the slot's status; move things if the date changed.
   - **`games/backlog.md`**: mark the game used.
   - **`channel/status.md`**: "Right now" section (published/scheduled count, next video).
5. Reply in 2–3 lines: what was logged, what's next on the calendar, and the date to check 7-day results.

## Rules

- Dates as "Day DD Mon YYYY". Upload time 12 PM ET (10 PM Dhaka before 1 Nov 2026, 11 PM after).
- If a planned slot is now empty because a video moved, say so and suggest filling it (`/pick-game`).
