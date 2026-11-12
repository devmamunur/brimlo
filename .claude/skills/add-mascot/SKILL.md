---
name: add-mascot
description: Add the moving Brimlo mascot (gold bag with crown) to the corner of a FINISHED long video — find the final export, reuse or make its transcript, check the corner is free of game HUD, make a 90-second preview, then render the full "<name> - mascot.mov" (mouth from voice, blinks, spring motion, wow/happy/sad/think faces from trigger words) and check it. Use when Mamunur says "add the mascot", "add mascot to [video]", "add avatar", "put the mascot on", "mascot version", "/add-mascot", or after /finish-video when the mascot test is running.
argument-hint: "[final video file name or path] [optional: corner br|bl|tr|tl]"
---

# /add-mascot

Puts the approved v4 mascot on a finished long video. The guide for Mamunur (how it works, process,
rules, test plan, future plan) is [playbook/mascot.md](../../../playbook/mascot.md). Tool details:
[tools/avatar/README.md](../../../tools/avatar/README.md). Reply in very simple English, short sentences.

## Steps

1. **Find the final export.** Check `tools/transcribe/out/*/summary.json` → `video` first. Otherwise search:
   `find "/Volumes/WD Black/Videos" -iname "*<words from the name>*" -not -path "*/CacheClip/*"`
   Use the **final Resolve export**, never the OBS recording and never a file that already ends in "- mascot".
   If several match, take the newest export and say which one. Drive not mounted → stop and tell him.
   Find `videos/<date>-<slug>.md` too (game, status, YouTube link).
   - If the video is **already published or scheduled with this file**, say so: the mascot file can't replace it
     on YouTube without a new upload. Make it only if he still wants it (test only).
2. **Transcript of this same file.** `grep -l "<file name>" tools/transcribe/out/*/summary.json`.
   It must be from **this exact export** (same `video` path; length in `summary.json` = file length).
   If the edit changed after the transcript, or there is none, run in the background (~5 min per hour):
   `tools/transcribe/run.sh "<path>" --game "<Game>" --name <video-file-slug>`
   Never make a transcript twice for the same file.
3. **Check the corner.** Grab 4 frames (10%, 35%, 60%, 85% of the length), crop the bottom-right 450×420 px,
   look at them. If game money/HP/buttons/minimap sit there, pick another free corner (`--corner bl|tl|tr`)
   and say why. If no corner is free, tell him and suggest no mascot for this video.
4. **Preview (always first).**
   `uv run tools/avatar/add_avatar.py "<export>" --best-preview [--corner xx]`
   → `tools/avatar/out/<name> - mascot preview.mp4` (picks the 90 s with the most faces, ~15 s to make).
   Check 1 s strips around 2–3 face changes (ffmpeg `fps=8,crop=...,tile=8x1`) for broken faces or effects
   cut off at the box edge. Send the preview with SendUserFile and wait for his OK.
5. **Full render** (background, ~9 min per hour of video):
   `uv run tools/avatar/add_avatar.py "<export>" [--corner xx]` → `<same folder>/<name> - mascot.mov`.
   Space needed: ~6.2 GB per hour on the WD Black drive (`df -h "/Volumes/WD Black"`).
6. **Check the result:** `ffprobe` duration = the export's duration, audio stream present, frames at
   start / middle / end show the mascot. Report the expression counts the tool prints.
7. **Keep the repo true:** in `videos/<date>-<slug>.md` top table set `| Mascot | yes (v4, corner br) |`
   (add the row if missing). Remind him:
   - upload the **"- mascot.mov"** file;
   - make the Short from the **normal** export (`/make-short`; the corner mascot gets cut in 9:16);
   - keep the normal export until the Short is made, then it can be deleted.

## Rules

- One test at a time: no webcam suggestion while the mascot test runs (Mamunur chose no face, 13 Nov 2026).
- Never put the mascot in Shorts.
- Changing trigger words or faces = edit `EXPR` in `tools/avatar/add_avatar.py` / run `tools/avatar/make_faces.py`,
  then update the tables in `playbook/mascot.md` and `tools/avatar/README.md`. Check new words against
  real transcripts first (count per hour across `tools/transcribe/out/*/segments.json`), not from memory.
- The look (v4) is approved. Don't change motion or faces without asking; new ideas go to
  `playbook/mascot.md` → "Future improvement plan".
