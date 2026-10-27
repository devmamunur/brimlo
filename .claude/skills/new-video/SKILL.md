---
name: new-video
description: Plan the next Brimlo YouTube video for a game — title options, thumbnail idea, hook, recording script card with practice lines, chapters and description — then create the video file and add it to the log and calendar. Use when Mamunur says "new video", "plan a video", "prepare [game]", or "/new-video".
argument-hint: "[game name] [optional upload date]"
---

# /new-video

Plan one video end to end and save it in the repo. Write in **simple English, short sentences** (Mamunur is a non-native speaker).

## Steps

1. **Read context** (only what you need):
   - `plan/calendar.md` — find the next open slot, or use the date given.
   - `games/backlog.md` — is the game owned/free? Mac or CrossOver? Tested?
   - `videos/log.md` — last 5 videos (avoid repeating the same title template or theme back to back).
   - `playbook/titles.md`, `playbook/hooks-and-scripts.md`, `playbook/phrase-bank.md`.

2. **Check the game** (if not already known):
   - Web search the Steam page: one-sentence idea, release status (demo / playtest / early access / full), price, developer video policy, any end date.
   - If Mac status is unknown or not tested → tell him to do the 10-minute test from `games/checklist.md` **before** recording.
   - If the game fails a "Must" in `games/checklist.md`, say so and suggest the next backlog game instead.
   - **Upload speed label** (CLAUDE.md rule 11, thresholds in `channel/strategy.md` → "Upload speed label"): check the release/demo date and end date, then search YouTube for the game name (last 14 days): how many videos, the biggest channel and its views. Decide 🔥 FAST / 🟡 SOON / 🟢 RELAXED. If FAST, pick the earliest free upload date (the day after the last video is fine).

3. **Write the plan** using `videos/_template.md`. Save as `videos/YYYY-MM-DD-game-slug.md` (upload date, lowercase, hyphens). Fill:
   - Header table (including the **Upload speed** row) and "Game in one sentence".
   - **3 titles** from different templates in `playbook/titles.md`, and pick one with a one-line reason. Follow the title rules (incremental word, game name rule, **never the word "Demo" in a title** — it goes in the description and tags, no creator names).
   - Thumbnail idea in the **house style** from `playbook/thumbnails.md`: big gold hook text across the top (2–3 words or "A → B"), one clean before → after image under it, a little game context on the right, **bright, colorful, well-lit picture** (no dark backgrounds, Mamunur 25 Oct 2026). Say which screenshots to take. **No small inset boxes in any corner**, no counts he cannot read on screen.
   - **Recording script card** — this is the most important part for him:
     - Follow "The first 2 minutes rule" in `playbook/hooks-and-scripts.md`: **first sentence = the goal with a big number** (said while playing), first action by 0:05, what to finish before pressing record (menus, settings, story text), no menu reading.
     - Optional cold open note (max 10 s) + where-it-ends line (Seabun style).
     - Start-of-play lines (3–5 sentences), subscribe line for ~2:00, one running joke.
     - 6–8 milestone lines specific to this game's mechanics (first upgrade, new resource, prestige, big number, speed-up…). Use `[X]` placeholders for numbers.
     - Ending (verdict + who it's for + price/demo + close).
     - **5 practice lines** to say 3 times each before recording.
   - Chapter skeleton (names by progress), description draft, tags (game name, genre words, brimlo — never other creators).

4. **Update the repo:**
   - Add/update the row in `videos/log.md` (status 📝 planned, link to the file).
   - Update the slot in `plan/calendar.md` (game name, status 📝).
   - Update the game's row in `games/backlog.md` (planned slot).

5. **Reply** briefly: **the upload speed label first** (e.g. "🔥 FAST — publish within 1–2 days after recording, because …"), then the chosen title, the hook to practice, what to test before recording, and the file path. Don't paste the whole file.

## Rules

- One game = one video. Never plan a "Part 2".
- If the game is a demo/playtest with an end date, put the deadline in bold at the top; that usually makes it 🔥 FAST (publish within 1–2 days).
- Publish time: always 10 PM Dhaka (12 PM ET before Sun 1 Nov 2026, 11 AM ET after). No fixed upload days, and never write upload days in the description.
- Score the title options with `brimlo_score_title` (free, no quota) and note the score next to each option. Do not spend vidIQ credits here unless he asks. For a deeper check use `brimlo_idea_engine` (about 204 units, say the cost first).
