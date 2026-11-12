---
name: make-short
description: Make one ~55-second vertical YouTube Short from a finished long Brimlo video — find the file on the WD Black drive, transcribe it, pick the best moments (rewatch spikes + transcript), cut between words with ffmpeg at 1.1x speed, 1080x1920 with title and burned captions, check it, and send the final file (no DaVinci step). Use when Mamunur says "make a short", "short from [video]", "cut a short", "make shorts from this video", "/make-short", or gives a final video file name and asks for a Short.
argument-hint: "[final video file name or path] [optional: moment or idea]"
---

# /make-short

Turns one **finished long video** into **one Short**. The long video is the main product.
The Short exists only to bring new viewers to it (Mamunur, 13 Nov 2026: "my main target is a full video"). Keep the work fast and cheap.

Tool: `tools/shorts/` ([README](../../../tools/shorts/README.md)). The first Short made this way: `tools/shorts/plans/2026-10-23-outbreak-z.json` (Outbreak Z, 13 Nov 2026). Use it as the example.

## Steps

1. **Find the file.** Check `tools/transcribe/out/*/summary.json` → `video` first: a transcript for this file may already exist (step 2).
   Search the drive by name, without caring about case:
   `find "/Volumes/WD Black/Videos" -iname "*<words from the name>*" -not -path "*/CacheClip/*"`
   Use the **final export** (what is on YouTube), not the OBS recording, so times match YouTube retention. If several files match, pick the newest final export and say which one. If the drive is not mounted, stop and tell him.
   Find the matching `videos/<date>-<slug>.md` file (game, YouTube ID, published date).
2. **Transcript: check first, never make it twice** (Mamunur, 13 Nov 2026). Look in both places: `videos/transcripts/<slug>.md` (in the repo) and `tools/transcribe/out/<slug>/` (`grep -l '<file name>' tools/transcribe/out/*/summary.json`). If `segments.json` exists **for this same file** (`summary.json` → `video`), reuse it. If only the repo copy exists, read it to pick moments, but you still need `segments.json` for word times. Only if there is none, run it in the background (~6 min per hour):
   `tools/transcribe/run.sh "<path>" --game "<Game>" --name <video-file-slug>`
3. **Find the best moments.** Use both sources:
   - **Rewatch spikes** (if the video is published): `vidiq_channel_analytics` with `report: audience_retention`, `filters: video==<ID>` and dates from publish day to today. Skip the first 1–2% (intro). A point where `audienceWatchRatio` goes **up** compared with its neighbors = people skip there or rewatch it = the best moment. Multiply the ratio by the length to get the time.
   - **Transcript**: read `by-minute.md` around those times. Look for: a big reveal ("what is this, a minigun?"), a fail or a funny line, a huge number, an upgrade that changes everything, a win ("region cleared!").
4. **Build one story** of 6–10 clips, in time order: **problem → find/upgrade → power → payoff**.
   - **Final length 45–58 s.** Raw clips total ≤ ~63 s at speed 1.1. Never over 60 s.
   - **The first second must move: always add a hook flash** (Mamunur, 13 Nov 2026). Before the story, 1.5–2.5 s of the **best action in the whole Short** (the peak fight, crits, the big number on screen), zoomed in 1.3×, with one gold caption (2–4 words, true: "TWO BOSSES AT ONCE!"). Then cut hard to the story's start. In the plan this is the `"hook"` field. Pick a hook window where the audio is a short word or game sound, not half a sentence (use `words.py`). Why: the first two Shorts got Studio's "start on a cut, zoom or move" high-impact fix (slow first screen), and the Seabun Short, with only a 1.1 s hook, got "start with the boss fight". Make the hook real action, long enough to see.
   - End on the payoff (win screen, biggest number), not on talking afterwards.
   - Keep only lines a stranger understands with no context. Drop menu-only stretches unless the line is great.
5. **Exact cut points.** `python3 tools/shorts/words.py <slug> --from H:MM:SS --to H:MM:SS` prints every word with its time.
   - Start a clip ~0.1–0.3 s before its first word. End it just after the last word's `end`. **Never cut inside a word or sentence** (memory: cut only in real silence).
   - Game sound is mixed into the voice in the final export, so silence detection does not work. Word times are the rule.
6. **Captions** (in the plan, one per 2–6 words, matching the speech times):
   - His **real words**. Fix only grammar and Whisper mistakes ("his damage are 105" → "Damage: 105", "Influencer" → "Enforcer"). Never add claims he did not say, and never change the meaning.
   - Simple English, short. Gold (`"gold"`) for 2–4 key moments only (the item name, the big number, the win).
   - The hero is always "I" (memory). No new jokes he did not say.
7. **Title on top** (2 lines, up to ~12 characters each): the long video's promise in a few words, true for what the Short shows (example: "ONE KNIFE / TO MINIGUN"). Line 2 in gold.
8. **Write the plan** to `tools/shorts/plans/<video-file-slug>.json` (format: README). Output:
   `/Volumes/WD Black/Videos/da-vinci/shorts/<video-file-slug>-short.mp4`. Speed **1.1** (OK range 1.08–1.12; above 1.15 the game sound gets strange).
9. **Render and check:**
   `tools/hook/.venv/bin/python tools/shorts/make_short.py tools/shorts/plans/<slug>.json --check`
   Look at the `-check.jpg` sheet: are the captions under the game, readable, and matching the moment? Is the length right? Loudness should print about -14 LUFS. Fix the plan and run again if not. If `tools/hook/.venv` is missing: `python3 -m venv tools/hook/.venv && tools/hook/.venv/bin/pip install pillow`.
10. **Send the file** with SendUserFile (display: render).
11. **No DaVinci step** (Mamunur, 13 Nov 2026): the final export already has his voice preset and good audio, so the Short file is **final**. Do not open DaVinci, do not import, do not ask him to apply Warm or export. The tool sets loudness to -14 LUFS itself. The `-resolve.lua` file is still written in case he ever wants to edit by hand.
12. **Log it** in the video file: add a `## Short` section (status "made", file path, source times, length, plan path). Titles come later with `/short-details`.
13. **Reply in simple English:** the file path, the story of the Short in 5–7 bullet lines (each moment + the line said), one weak point if any, and the next step: "Upload this file to YouTube as it is, then `/short-details <Studio edit link>`."

## Rules

- **One Short per long video** unless he asks for more. Do not plan a Shorts schedule; long videos stay the focus.
- Everything shown must be **true to the video** (memory: titles must match the video). No fake text, no counts that are not on screen.
- No music added, no voice-over (he does not want voice-over). His live voice only.
- Do not change the long video or its file. Write only new files in the `shorts/` folder.
- A Short of a game whose launch wave is still on (≤ 48 h, rule 11) is worth doing fast; say so. Otherwise there is no rush.
- Cost: transcript is local and free. Retention is one vidIQ call (free to use). No `brimlo_*` quota needed.
