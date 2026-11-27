---
name: new-video
description: Plan the next Brimlo video BEFORE recording — GO / FOLLOW label, A/B/C draft titles, thumbnail prompt, recording script card with practice lines, description draft — then create the video file and add it to the log and calendar. Use when Mamunur says "new video", "plan a video", "prepare [game]", "I want to make a video about [game]", "next video is [game]", "set up [game]", "get ready for recording", or "/new-video".
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
   - **GO / FOLLOW label** (CLAUDE.md rule 11, `channel/strategy.md` → "GO / FOLLOW"; replaces the old 🔥/🟡/🟢 labels and the 48-hour launch check, 27 Nov 2026): if `/pick-game` ran in the last few hours, reuse its verdict; else run `brimlo_wave_scan` or `brimlo_youtube_search` for the game (hours 0) and check in Chrome (2 screenshots, newest first). Say the hours since the first English outlier video, how many big English videos (≥ 30K) and huge ones (≥ 100K, 14 days) exist. GO → publish the same night. FOLLOW → tonight or tomorrow, with a new angle (100% / ending). Neither → say so and suggest `/pick-game` instead. Also check the niche: a "one simple, crazy chore" game only (CLAUDE.md niche).

3. **Write the plan** using `videos/_template.md`. Save as `videos/YYYY-MM-DD-game-slug.md` (upload date, lowercase, hyphens). Fill:
   - Header table (including the **Upload speed** row, now filled with GO / FOLLOW, and the **Playlists** row) and "Game in one sentence". **Playlists:** pick them by the rule in `playbook/upload-checklist.md` → Settings (1 genre list + "New Steam Demos Played to 100%" if it is a demo, playtest or itch.io game). Exact names only, never new ones. Fill the **Playlists** row of the video file.
   - **A/B/C title set** (`playbook/titles.md` → "A/B/C title set"): 3 titles; **A = the house pattern** "I [did the chore] [100% of] [GIANT THING] With [tiny tool]" (titles.md rule 0), B and C = swap titles with other patterns (P1–P7), one-line reason each. **No game name in the title** (titles.md rule 1). Rules: no "Demo", no "incremental" in the title (game name + "demo" always go in the description and tags), Title Case, 30–55 characters, no creator names. These are **drafts**: mark the number/claim to confirm after recording.
   - Thumbnail idea in **house style v3** from `playbook/thumbnails.md`: 2D cartoon, first-person hands in **navy sleeves with a gold cuff** **doing the game's main action**, one big object close up, background full of the game world/resource, **text test from 28 Nov 2026: 2–3 big words at the top for 5 videos** (`playbook/thumbnails.md` → "Text test"; never the title's words). Fill the **master prompt (with its AVOID part)** for this game and say which screenshots to attach. **No inset boxes, no corner stamps, no "100%" badge for demos**, no counts he cannot read on screen.
   - **Recording script card** — **short card by default** (27 Nov 2026, daily uploads): see `/script` → "Short card". Full card only for a GO game that looks big or when he asks. **Write it like the `/script` skill** (`.claude/skills/script/SKILL.md`): fill `playbook/script-card/template.md` (examples in `playbook/script-card/examples/`) (story, Bangla word list, Reason → Goal → Go start, first loop with the first upgrade before 1:30 and "Not yet" promises, timing table from 1–2 real YouTube transcripts of the game), in **very simple English** (`playbook/hooks-and-scripts.md` → "Simple words"). Short version of the rules:
     - Follow `playbook/hooks-and-scripts.md` → "The start: Reason → Goal → Go": a silly reason, "So…" + the goal with a number (first action starts here), tiny tool now + "Let's get [verb]-ing". What to finish before pressing record (menus, settings, story text, new save). No tour, no store page.
     - Subscribe line after the first big upgrade (~5–10 min, never in the first 5 min), one running joke.
     - 6–8 milestone lines specific to this game's mechanics (first upgrade, new resource, prestige, big number, speed-up…). Use `[X]` placeholders for numbers.
     - Ending: the 4 warm lines from `playbook/hooks-and-scripts.md` → "Ending" (good part only, no price).
     - **5 practice lines** to say 3 times each before recording.
   - Chapter skeleton (names by progress), description draft, tags (game name, genre words, "relaxing gameplay", "gameplay to fall asleep to", brimlo — never other creators; see `playbook/upload-checklist.md`).

4. **Update the repo:**
   - Add/update the row in `videos/log.md` (status 📝 planned, link to the file).
   - Update the slot in `plan/calendar.md` (game name, status 📝).
   - Update the game's row in `games/backlog.md` (planned slot).

5. **Reply** briefly: **the GO / FOLLOW line first** (e.g. "✅ GO — first English outlier 18 h ago, 0 big videos → publish tonight 10 PM Dhaka" or "🥈 FOLLOW — 3 videos ≥ 100K this week, small channel got 4K → 100% angle"), then the **A/B/C titles in one code block** (A = live, B + C = swap titles; each passes the 3 MUST checks in `playbook/titles.md` rule 4), the **playlist(s)** in one line, the hook to practice, what to test before recording, and the file path. Don't paste the whole file.

## Rules

- One game = one video. Never plan a "Part 2".
- If the game is a demo/playtest with an end date, put the deadline in bold at the top; that usually makes it 🔥 FAST (publish within 1–2 days).
- Publish time: always 10 PM Dhaka (12 PM ET before Sun 1 Nov 2026, 11 AM ET after). No fixed upload days, and never write upload days in the description.
- Score the title options with `brimlo_score_title` (free, no quota) and note the score next to each option. Do not spend vidIQ credits here unless he asks. For a deeper check use `brimlo_idea_engine` (about 204 units, say the cost first).
