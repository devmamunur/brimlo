---
name: new-video
description: Plan the next Brimlo video BEFORE recording — upload speed label, A/B/C draft titles, thumbnail prompt, recording script card with practice lines, description draft — then create the video file and add it to the log and calendar. Use when Mamunur says "new video", "plan a video", "prepare [game]", "I want to make a video about [game]", "next video is [game]", "set up [game]", "get ready for recording", or "/new-video".
argument-hint: "[game name] [optional upload date]"
---

# /new-video

Plan one video end to end and save it in the repo. Write in **simple English, short sentences** (Mamunur is a non-native speaker). Spoken lines sound like **telling a story to friends, not a presentation**, with correct tense (future = "will") — the full rules are in `/script` → "Simple English".

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
   - **Upload speed label** (CLAUDE.md rule 11, thresholds in `channel/strategy.md` → "Upload speed label"): check the release/demo date and end date, then search YouTube for the game name (last 14 days): how many videos, the biggest channel and its views. **48-hour launch check:** if it is a new launch / demo / playtest, count the hours since it came out (channel/strategy.md → "48-hour launch check"). ≤ 48 h (day 0–2) → record today or tomorrow, publish within ~48 h of the launch. > 48 h → say "the launch window has passed" and do not plan it as a launch-wave video; use the game name only as the game type row in `playbook/titles.md` says. Decide 🔥 FAST / 🟡 SOON / 🟢 RELAXED. If FAST, pick the earliest free upload date (the day after the last video is fine).

3. **Write the plan** using `videos/_template.md`. Save as `videos/YYYY-MM-DD-game-slug.md` (upload date, lowercase, hyphens). Fill:
   - Header table (including the **Upload speed** and **Playlists** rows) and "Game in one sentence". **Playlists:** pick them by the rule in `playbook/upload-checklist.md` → Settings (1 genre list + "New Steam Demos Played to 100%" if it is a demo, playtest or itch.io game). Exact names only, never new ones. Fill the **Playlists** row of the video file.
   - **A/B/C title set** (`playbook/titles.md` → "A/B/C title set"): 3 titles, each a different pattern (P1–P7) of the **Brimlo title system**; A = best pick (live title), B and C = swap titles, one-line reason each. First fill the title card and pick the **game type row** (`playbook/titles.md` → "Title recipe by game type"); game name only as that row says (never first). Rules: no "Demo", no "incremental" in the title (game name + "demo" always go in the description and tags), Title Case, 30–55 characters, no creator names. These are **drafts**: mark the number/claim to confirm after recording.
   - Thumbnail idea in **house style v3** from `playbook/thumbnails.md`: 2D cartoon, first-person hands in **navy sleeves with a gold cuff** **doing the game's main action**, one big object close up, background full of the game world/resource, **no text by default** (only a true progress number or an in-game word, never the title's words). Fill the **master prompt (with its AVOID part)** for this game and say which screenshots to attach. **No inset boxes, no corner stamps, no "100%" badge for demos**, no counts he cannot read on screen.
   - **Recording script card** — this is the most important part for him. **Write it exactly like the `/script` skill** (`.claude/skills/script/SKILL.md`): fill `playbook/script-card/template.md` (examples in `playbook/script-card/examples/`) (story, Bangla word list, first 10 seconds table, first 2 minutes table with "Not yet" promises, timing table from 1–2 real YouTube transcripts of the game), in **very simple English** (`playbook/hooks-and-scripts.md` → "Simple words"). Short version of the rules:
     - Follow "The first 2 minutes rule" in `playbook/hooks-and-scripts.md`: **first sentence = the goal with a big number** (said while playing), first action by 0:05, what to finish before pressing record (menus, settings, story text), no menu reading.
     - Optional cold open note (max 10 s) + where-it-ends line (Seabun style).
     - Start-of-play lines (3–5 sentences), subscribe line for ~2:00, one running joke.
     - 6–8 milestone lines specific to this game's mechanics (first upgrade, new resource, prestige, big number, speed-up…). Use `[X]` placeholders for numbers.
     - Ending (verdict + who it's for + price/demo + close).
     - **5 practice lines** to say 3 times each before recording.
   - Chapter skeleton (names by progress), description draft, tags (game name, genre words, "relaxing gameplay", "gameplay to fall asleep to", brimlo — never other creators; see `playbook/upload-checklist.md`).

4. **Update the repo:**
   - Add/update the row in `videos/log.md` (status 📝 planned, link to the file).
   - Update the slot in `plan/calendar.md` (game name, status 📝).
   - Update the game's row in `games/backlog.md` (planned slot).

5. **Reply** briefly: **the launch check line first** for a new launch/demo/playtest (e.g. "⏱️ Launched Tue 3 Nov 2026 = 4 days ago → the launch window has passed ⛔" or "⏱️ Launched today 6 PM Dhaka = 5 hours ago → inside the 48-hour window ✅"), **then the upload speed label** (e.g. "🔥 FAST — publish within ~48 h of the launch, because …"), then the **A/B/C titles in one code block** (ready for Studio → A/B Testing), the **playlist(s)** in one line, the hook to practice, what to test before recording, and the file path. Don't paste the whole file.

## Rules

- One game = one video. Never plan a "Part 2".
- If the game is a demo/playtest with an end date, put the deadline in bold at the top; that usually makes it 🔥 FAST (publish within 1–2 days).
- Publish time: always 10 PM Dhaka (12 PM ET before Sun 1 Nov 2026, 11 AM ET after). No fixed upload days, and never write upload days in the description.
- Score the title options with `brimlo_score_title` (free, no quota) and note the score next to each option. Do not spend vidIQ credits here unless he asks. For a deeper check use `brimlo_idea_engine` (about 204 units, say the cost first).
