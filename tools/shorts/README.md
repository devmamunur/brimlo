# tools/shorts — make a Short from a long video

Used by the `/make-short` skill (then `/short-details` fills YouTube Studio).

| File | What it does |
|---|---|
| `words.py` | Prints every word with its time from a transcript, to pick exact cut points: `python3 tools/shorts/words.py <transcript-name> --from 2:02:00 --to 2:10:00` |
| `make_short.py` | Reads a plan (JSON), cuts the clips, speeds up, makes 1080×1920 with title + captions, writes a DaVinci import script. `tools/hook/.venv/bin/python tools/shorts/make_short.py tools/shorts/plans/<slug>.json --check` |
| `plans/` | One plan per Short (in git). Example: `plans/2026-10-23-outbreak-z.json` |

## Plan format

```json
{
 "video_file": "videos/2026-10-23-outbreak-z.md",
 "transcript": "2026-10-23-outbreak-z",
 "source": "/Volumes/WD Black/Videos/da-vinci/<final export>.mp4",
 "output": "/Volumes/WD Black/Videos/da-vinci/shorts/<slug>-short.mp4",
 "timeline_name": "Outbreak Z Short",
 "speed": 1.1,
 "title": [{"text": "ONE KNIFE", "gold": false}, {"text": "TO MINIGUN", "gold": true}],
 "hook": {"start": 5124.95, "end": 5126.38, "caption": "TWO BOSSES AT ONCE!", "zoom": 1.3},
 "clips": [
  {"start": "2:02:36.3", "end": "2:02:43.1",
   "captions": [["2:02:36.3", "2:02:40.3", "This single zombie child"],
                ["2:02:40.3", "2:02:43.1", "defeated me. Oh my god!"]]}
 ]
}
```

All times are in the **source** video (seconds or `H:MM:SS.s`). A caption with a 4th item `"gold"` is drawn in gold.

`hook` (optional, but `/make-short` always uses it) adds a 1–1.5 s flash before the first clip. The picture is zoomed in by `zoom` (default 1.3) and gets one gold caption. Any clip can also have its own `"zoom": 1.3`.

## What it makes

- `<slug>-short.mp4`: 1080×1920, 30 fps, H.264 12 Mb/s, AAC 192k. A blurred, darker copy of the game fills the frame, the full 16:9 game sits in the middle, the title is at the top, and captions sit under the game in Arial Black with a navy outline.
- `<slug>-short-caps/`: the caption PNGs (can be deleted).
- `<slug>-short-resolve.lua`: in DaVinci, Workspace → Console (Lua) → `dofile('<path>')` imports the Short to a new 1080×1920 timeline.
- With `--check`: `<slug>-short-check.jpg` (8 frames) and the loudness.

## Notes

- This ffmpeg has no `drawtext`/`subtitles` filter, so captions are PNGs made with Pillow (from `tools/hook/.venv`).
- Speed uses `atempo`, so the voice pitch stays the same. 1.1 is the default; above ~1.15 the game sound gets strange.
- Final exports downloaded from YouTube are loud (Outbreak Z Short: about -8 LUFS). That's fine: the DaVinci export (**Brimlo YouTube Shorts** preset, Normalize Audio on) and YouTube both turn it down.
- The source voice and game sound are one mixed track, so silence detection does not find gaps. Cut between words using `words.py`.
