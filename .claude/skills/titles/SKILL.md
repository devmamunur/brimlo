---
name: titles
description: Generate title and thumbnail ideas for a Brimlo video using the channel's title templates and thumbnail rules, scored for free with the brimlo_score_title tool (vidIQ optional, costs credits). Use for "/titles", "title ideas", "thumbnail idea", "is this title good", "review my title".
argument-hint: "[game name or title to review]"
---

# /titles

## Steps

1. Read `playbook/titles.md`, `playbook/thumbnails.md`, and the last 5 rows of `videos/log.md` (plus the "Title test log" in titles.md if it has data — prefer winning templates).
2. Understand the game in one sentence (video file in `videos/`, `games/backlog.md`, or a quick web search).
3. Write **6 titles**, at least 4 different templates (A–H). For each: template letter + one-line reason.
4. **Score all 6 with `brimlo_score_title`** (free, no quota; pass up to 5 titles per call, so call twice or score your best 5). Use the `keyword` argument if the video has a target keyword. Keep the real score and the top fixes. Mark the **top 3** and the single best pick with a reason. The score is a checklist from `playbook/titles.md`, not a prediction of views: say so, and trust the playbook and the title test log over a 5-point difference.
5. Give **2 thumbnail concepts** in the **house style** from `playbook/thumbnails.md` (big gold hook text on top, one clean before → after image, a little game context, calm dark background; 2–3 words, which screenshot). **No small inset or corner image boxes** and no counts he did not read on screen (see `playbook/thumbnails.md` rules 9–11). If he asks for an AI image prompt, give **one single detailed prompt** from the template at the end of `playbook/thumbnails.md`, and list the files to attach.
6. If he gave a title to review: say what works, what to fix, and give a better version. Check against the rules (incremental word, promise, CAPS 1–3 words, "| Demo/Playtest/Name" rule, no creator names, not too long — aim ≤ 70 characters so it isn't cut on phones).
7. If a video file exists, update its Titles + Thumbnail sections.

## Optional: what is winning in the niche (costs YouTube API units)

If he wants fresh shapes, run `brimlo_title_patterns` for the genre (about 102 units; say the cost and ask if the task total goes over 300). Use the shapes, never the exact words.

## vidIQ (the subscription runs until November 2026; use it freely for a cross-check on the final 2–3 titles)

Use `vidiq_score_title` on the final titles. Do not count or report credits (see CLAUDE.md rule 2). **vidIQ scores click appeal, not honesty:** its suggestions often promise a "secret" or "broke the game" that the video never shows. Only pick a title the video really delivers (check the transcript or his notes). A 97 true title beats a 99 misleading one.

## Rules

- The title must match what the first 30 seconds and the thumbnail show.
- Never copy another channel's exact title. Copy the shape.
- Never include other creators' names.
- Simple English words he can say out loud.
