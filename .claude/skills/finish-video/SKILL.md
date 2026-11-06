---
name: finish-video
description: After a Brimlo video is recorded or edited — read the video file (transcript, quiet parts, screenshots), then write the A/B/C test titles, the description, chapters, tags and the thumbnail prompt from what really happens in the video. Use when Mamunur sends a video path (.mov/.mp4), says "I recorded", "I finished editing", "video is ready", "make title and description", "write the description", "make chapters", "thumbnail prompt for this video", "read my video", "check my video", "/finish-video".
argument-hint: "[path to the edited export] [game name]"
---

# /finish-video

Turns a finished recording into everything needed for upload. Everything must be **true to the video** (memory: titles must match the video).

## Steps

1. **Find the video file** in `videos/` (by game name). If none exists, create it from `videos/_template.md`.
2. **Read the video** (skip if `videos/transcripts/<name>.md` already exists for this export):
   `tools/transcribe/run.sh "<path>" --game "<game>" --name <video-file-name>` (run in the background; ~5 min per hour of video). Use the **edited export**, so times match YouTube.
   Then read `tools/transcribe/out/<name>/by-minute.md`, `summary.json`, `silences.txt` and look at `contact.jpg`.
3. **Write down the facts** (in the video file, "What really happened"): the goal said at the start, the biggest true numbers, the end result, the funniest moment, the running joke, what the first 15 seconds show.
4. **Check the opening** against `playbook/hooks-and-scripts.md`: is the goal + action in the first 15 seconds? (Home viewers leave after ~15 s — analytics 6 Nov 2026.) If not, suggest a fix (cut the start, or `/hook`).
5. **Long quiet parts** (`silences.txt`, rule 5): list stretches over ~20 s with times, to speed up or cut. Never cut inside speech (memory: cut only in real silence).
6. **Titles: A/B/C test set** (`playbook/titles.md` → Brimlo title system + "A/B/C test set"). Each title a different pattern, every claim from step 3. One code block.
7. **Thumbnail:** one filled master prompt in house style v3 (`playbook/thumbnails.md`, with the AVOID part) + which frames from `frames/` to attach. No text unless a true progress number or an in-game word.
8. **Description** in the format of `playbook/upload-checklist.md` → Description. Game name + "demo" in the first lines (search brings 1/3 of watch time). Real numbers only.
9. **Chapters:** max 10, only from the transcript times (never guessed), named by progress. If the export may still change, say the chapters are final only after the edit is final.
10. **Playlists:** pick them by the rule in `playbook/upload-checklist.md` → Settings (1 genre list + "New Steam Demos Played to 100%" if it is a demo, playtest or itch.io game). Exact names only, never new ones. Fill the **Playlists** row of the video file. Check the genre against what really happens in the video.
11. **Tags:** per the checklist (game name forms, genre words, "relaxing gameplay", "gameplay to fall asleep to", brimlo).
12. Save it all in the video file (Titles, Playlists, Thumbnail, Description, Chapters, Tags) and reply with: A/B/C block, **playlist(s) in one line** (+ "End screen: import from [a video in the same genre playlist]"), thumbnail prompt, description (with chapters) ready to paste, quiet parts to fix. Plain text, no HTML.
13. Remind him: after upload run `/publish` and start the title A/B test in Studio.
