---
name: publish
description: Record that a Brimlo video was recorded, scheduled or published — update the video file, the full video log, the calendar, the game backlog and channel status so the repo stays true. Use for "/publish", "I uploaded", "I scheduled", "video is live", "I recorded".
argument-hint: "[game or video file] [status: recorded|scheduled|published] [title] [date] [link]"
---

# /publish

Keep the log true. Ask only for what's missing (title, date, status, YouTube link, final length).

## Steps

1. Find the video file in `videos/` (by game name). If none exists (e.g. made outside the system), create it from `videos/_template.md` with the facts he gives.
2. Ask for missing facts in **one** short question: final title, upload date/time, status, link, length.
3. Run a quick check against `playbook/upload-checklist.md` — mention only items that look missing (e.g. no "incremental" in the title, no chapters). Don't block.
4. Update:
   - **Video file**: status, upload date, final title ("Chosen"), link, length, chapters/description if given. Add result check dates (upload + 7 days, + 28 days) in the Results table header.
   - **`videos/log.md`**: the row (status ✅/🕒/🎬, title, length, file link). Keep rows in upload-date order. Number new rows.
   - **`plan/calendar.md`**: the slot's status; move things if the date changed.
   - **`games/backlog.md`**: mark the game used.
   - **`channel/status.md`**: "Right now" section (published/scheduled count, next video).
5. Reply in 2–3 lines: what was logged, what's next on the calendar, and the date to check 7-day results.

## Rules

- Dates as "Day DD Mon YYYY". Upload time 12 PM ET (10 PM Dhaka before 1 Nov 2026, 11 PM after).
- If a planned slot is now empty because a video moved, say so and suggest filling it (`/pick-game`).
