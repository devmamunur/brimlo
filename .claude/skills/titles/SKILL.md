---
name: titles
description: Title and thumbnail ideas or reviews for a Brimlo video — A/B/C titles (A = live, B + C = swap titles) from the Brimlo title system (P1–P7), scored with brimlo_score_title, and thumbnail concepts / an AI image prompt in house style v3. Use for "title ideas", "give me titles", "better title", "is this title good", "review my title", "change the title", "thumbnail idea", "thumbnail prompt", "make a thumbnail", "A/B test titles", or "/titles". After a recording with a video path, prefer /finish-video.
argument-hint: "[game name or title to review]"
---

# /titles

## Steps

1. Read `playbook/titles.md`, `playbook/thumbnails.md`, and the last 5 rows of `videos/log.md` (plus the "Title test log" in titles.md if it has data — prefer winning templates).
2. Understand the game and **fill the title card** in `playbook/titles.md` → "Title recipe by game type": game name, **game type row**, concept in one line, hot right now (launch/playtest or YouTube wave ≤ 48 h?), core fact. Sources: the video file in `videos/`, `games/backlog.md`, the Steam page (`brimlo_steam_game`).
3. Write **6 titles** with the **Brimlo title system** in `playbook/titles.md`, using the **winning hook of the game type row** first (patterns P1–P7), at least 3 different patterns. For each: pattern + one-line reason. Game name only as the row says (survivor/horde/action or launch day: at the end after " | " or " - ", or inside the sentence; never first). Never "Demo" or "incremental" in the title. Title Case, 30–55 characters. Only facts that really happen in the video (ask or check the transcript if it is recorded).
4. **Score all 6 with `brimlo_score_title`** (free, no quota; pass up to 5 titles per call, so call twice or score your best 5). Use the `keyword` argument if the video has a target keyword. Keep the real score and the top fixes. Then output the **A/B/C test set** (see `playbook/titles.md` → "A/B/C test set"): A = best pick (the live title), B and C = test titles, **each a different pattern**, in one code block he can paste into Studio → A/B Testing, plus one line per title (pattern + why). The score is a checklist from `playbook/titles.md`, not a prediction of views: say so, and trust the playbook and the title test log over a 5-point difference.
5. Give **2 thumbnail concepts** in **house style v3** from `playbook/thumbnails.md` (2D cartoon, POV hands in navy sleeves with a gold cuff **doing the job**, one big object close up, background full of the game world/resource, **no text by default**; text only for a true progress number or an in-game word, never the title's words; which screenshot). **No inset boxes, no corner stamps, no "100%" badge for demos**, and no counts he did not read on screen. If he asks for an AI image prompt, give **one single filled master prompt including the AVOID (negative prompt) part** from `playbook/thumbnails.md`, and list the files to attach.
6. If he gave a title to review: say what works, what to fix, and give a better version. Check against the Brimlo title system rules (the game type row's hook and name rule, P1–P7, never the game name first, no "incremental", Title Case with max one CAPS word, true to the video, **never the word "Demo" in a title** (put it in the description and tags), no creator names, short — aim 30–55 characters).
7. If a video file exists, update its Titles section (the A/B/C set) + Thumbnail section.
8. **Reply format:** always end with the A/B/C block, even for a title review (the improved title becomes A), then one line with the **playlist(s)** (exact names from `playbook/upload-checklist.md` → Settings; also fill the video file's Playlists row).

## Optional: what is winning in the niche (costs YouTube API units)

If he wants fresh shapes, run `brimlo_title_patterns` for the genre (about 102 units; say the cost and ask if the task total goes over 300). Use the shapes, never the exact words.

## vidIQ (the subscription runs until November 2026; use it freely for a cross-check on the final 2–3 titles)

Use `vidiq_score_title` on the final titles. Do not count or report credits (see CLAUDE.md rule 2). **vidIQ scores click appeal, not honesty:** its suggestions often promise a "secret" or "broke the game" that the video never shows. Only pick a title the video really delivers (check the transcript or his notes). A 97 true title beats a 99 misleading one.

## Rules

- The title must match what the first 30 seconds and the thumbnail show.
- Never copy another channel's exact title. Copy the shape.
- Never include other creators' names.
- Simple English words he can say out loud.
