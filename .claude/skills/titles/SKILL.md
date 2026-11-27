---
name: titles
description: Title and thumbnail ideas or reviews for a Brimlo video — A/B/C titles (A = live, B + C = swap titles) from the Brimlo title system (P1–P7), scored with brimlo_score_title, and thumbnail concepts / an AI image prompt in house style v3. Use for "title ideas", "give me titles", "better title", "is this title good", "review my title", "change the title", "thumbnail idea", "thumbnail prompt", "make a thumbnail", "A/B test titles", or "/titles". After a recording with a video path, prefer /finish-video.
argument-hint: "[game name or title to review]"
---

# /titles

All title rules live in `playbook/titles.md`. This skill is only the steps; do not repeat rules here.

## Steps

1. Read `playbook/titles.md`, `playbook/thumbnails.md`, and the last 5 rows of `videos/log.md` (and the "Title test log" in titles.md — prefer shapes that won there).
2. **Fill the title card** (titles.md → "Title recipe by game type"): game name, game type row, concept, hot right now (≤ 48 h?), core fact. Sources: the video file in `videos/`, `games/backlog.md`, the Steam page (`brimlo_steam_game`). Only facts that really happen in the video (check the transcript if it is recorded).
3. Write **6 titles**: at least 1 in the **house pattern** "I [did the chore] [100% of] [GIANT THING] With [tiny tool]" (titles.md rule 0 — this is title A when it fits), at least 2 **bold joke titles** (titles.md rule 6, Azrilich style: a radical, funny sentence from the game's core idea), the game type row's winning hook, at least 3 different patterns (P1–P7), **no game name** (titles.md rule 1). **Every title must pass the 3 MUST checks** (titles.md → Rules, rule 4): a true number of 1,000,000+ in digits (only when the video reaches one; under 1,000,000 the number is not needed), one clear goal, 30–55 characters. Drop any title that fails.
4. **Score all 6 with `brimlo_score_title`** (free; up to 5 per call). Note: the scorer still checks the old A–I templates, so its "template" part is out of date — use the score only to compare, never to pick. Cross-check the final 2–3 with `vidiq_score_title`. vidIQ scores click appeal, not honesty: never pick a title the video does not deliver.
5. Output the **A/B/C title set** (titles.md → "A/B/C title set"): A = live title, B + C = **swap titles** for a hand swap after 2–3 days (no Studio A/B test), each a different pattern, in one code block, with one line per title (pattern + why).
6. Give **2 thumbnail concepts** in house style v3 (`playbook/thumbnails.md`). If he asks for an AI image prompt, give one filled master prompt **including the AVOID part**, and list the files to attach.
7. **Title review:** say what works and what to fix against titles.md → Rules (name rule, 3 MUST checks, hook first, Title Case, bold joke from the game's core idea — rule 6), then give a better version as A.
8. If a video file exists, update its Titles (A/B/C) + Thumbnail sections and the **Playlists** row.
9. **Reply format:** always end with the A/B/C block, then one line with the **playlist(s)** (exact names from `playbook/upload-checklist.md` → Settings).

## Optional: fresh shapes from the niche

`brimlo_title_patterns` for the genre (~102 units, CLAUDE.md rule 2) or `vidiq_outliers`. Use the shapes, never the exact words. Big-entertainment shapes (MrBeast "vs", "Win $X", "Every…") are only for a B swap test, never A (titles.md, 19 Nov 2026).
