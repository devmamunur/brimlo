---
name: titles
description: Generate title and thumbnail ideas for a Brimlo video using the channel's title templates and thumbnail rules, optionally scored with vidIQ (costs credits). Use for "/titles", "title ideas", "thumbnail idea", "is this title good", "review my title".
argument-hint: "[game name or title to review]"
---

# /titles

## Steps

1. Read `playbook/titles.md`, `playbook/thumbnails.md`, and the last 5 rows of `videos/log.md` (plus the "Title test log" in titles.md if it has data — prefer winning templates).
2. Understand the game in one sentence (video file in `videos/`, `games/backlog.md`, or a quick web search).
3. Write **6 titles**, at least 4 different templates (A–H). For each: template letter + one-line reason.
4. Mark the **top 3** and the single best pick with a reason.
5. Give **2 thumbnail concepts** (type, 2–4 words, which screenshot, colors from the brand).
6. If he gave a title to review: say what works, what to fix, and give a better version. Check against the rules (incremental word, promise, CAPS 1–3 words, "| Demo/Playtest/Name" rule, no creator names, not too long — aim ≤ 70 characters so it isn't cut on phones).
7. If a video file exists, update its Titles + Thumbnail sections.

## vidIQ (optional — costs credits)

Only if he asks to score/check: call `vidiq_balance` (free) first, then say the cost (`vidiq_score_title` — check its description for the current cost) and ask before spending more than 10 credits. Never use generation tools that cost credits when you can write titles yourself.

## Rules

- Never copy another channel's exact title. Copy the shape.
- Never include other creators' names.
- Simple English words he can say out loud.
