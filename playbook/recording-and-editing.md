# Recording and editing

Goal: one finished video in one day (record 3–4 h → edit 2 h → package 1 h).

## OBS setup (once)

1. **Output → Recording format: Hybrid MP4** (OBS 30.2+). Recording path: a folder on the **1 TB SSD** (`Brimlo/01-Raw/`).
2. **Settings → Hotkeys → "Add Chapter Marker"** → choose a key you can press easily (e.g. F9).
3. **Audio:** mic on its **own track** (Advanced Audio Properties → Tracks). Game sound on another track.
4. Video: 1920×1080, 60 fps, Apple hardware encoder.
5. Sources: macOS Screen Capture (game window) for Mac games; for CrossOver games, capture the window or the display.
6. Test once: record 2 minutes, press the marker, check in DaVinci that the marker is in the right place (one user saw markers ~65 s late).
7. **Stop recording cleanly.** If OBS crashes, markers are lost.

## SSD folders

```
Brimlo/
  01-Raw/          OBS recordings
  02-Projects/     DaVinci / CapCut projects
  03-Exports/      final videos
  04-Thumbnails/   Canva exports + screenshots
```

Storage: ~5–9 GB per recorded hour → ~60–70 GB per week. **Delete raw files 1–4 weeks after a video is live**; keep the export.

## While recording

- Press the **marker** at every milestone (new upgrade type, prestige, big number, funny moment, mistake).
- Take a **screenshot** at the start (tiny) and at the biggest moment (huge) for the thumbnail.
- Voice break every hour. Water nearby.
- If a sentence goes wrong: pause 2 s, say it again.

## Light edit (DaVinci Resolve free) — ~2 hours

1. Import. Markers appear on the clip.
2. **Cut:** loading screens, menus, mistakes, long silence.
3. **Speed up idle waits** 4x–16x and add a small "x8" label. Never leave minutes of silent waiting (monetization risk).
4. **Cold open:** copy 5–15 s of the best late moment to the very start.
5. Check audio: voice clear over game sound (lower the game track if needed).
6. Write chapters from your markers.
7. Export: H.264/H.265, 1080p60.

Silence removal: one source says Resolve 20.2+/21 free has *Clip → Audio Operations → Ripple Delete Silence* — check your version. Use it on menu parts only, not on gameplay. CapCut's auto silence removal is mostly a paid feature.

## Length guide

- 60–120 minutes. Shorter is fine if the game is short. **Never stretch.**
- From 9 Nov: the Saturday session makes **two** 60–90 min videos on **two different games**.

## Upload

- Big files can take hours on slow internet → start in the evening, let it run overnight.
- Always **schedule** in Studio for 12 PM ET (Studio handles the clock change).
