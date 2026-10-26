# Recording and editing

Goal: one finished video in one day (record 3–4 h → edit 2 h → package 1 h).

## OBS setup (once)

Full, checked OBS + Resolve audio setup: **[voice-presets.md](voice-presets.md)** (24 Oct 2026). Short version:

1. **Output mode: Advanced. Recording format: Hybrid MOV.** Recording path on the **1 TB SSD**: `/Volumes/WD Black/Videos/obs`.
2. **Settings → Hotkeys → "Add Chapter Marker"** → choose a key you can press easily (e.g. F9).
3. **Audio:** mic on **Track 1 (Voice)** only, game on **Track 2 (Game)** only. Mic filters: RNNoise → Limiter -3 dB. No EQ/pitch/compressor in OBS.
4. Video: 1920×1080, **60 fps**, **Apple VT HEVC (H.265)** hardware encoder, CBR **10000 Kbps**, keyframe 2 s, profile main (**set in OBS on Mon 26 Oct 2026, not tested yet**). Test before the next real recording: record 2 minutes of a busy game moment, check it looks sharp and edits smoothly in Resolve, and check the file size (~150 MB expected, estimate). If it fails, go back to Apple VT H.264, 12000 Kbps.
   - Why: the **bitrate** sets the file size, not the fps. 30 fps at 12000 Kbps gives about the same file size. Seabun (60 fps, H.264 12000 Kbps) was ~16 GB raw. Why 10000 and not 8000: the video is compressed 3 times (OBS → Resolve export → YouTube), and OBS forum users advise more data for recordings you edit than for streams. HEVC 10000 should look better than the old H.264 12000 and be ~1/6 smaller (estimate). Keep 60 fps: survivor-likes move a lot, and YouTube plays 1080p60 at a higher quality than 1080p30.
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

Storage: ~5.4 GB per recorded hour at H.264 12000 Kbps (~4.5 GB/h at HEVC 10000 Kbps, estimate) → ~60–70 GB per week. The 1 TB SSD holds ~15 weeks of raw files at 4 videos a week. **Delete raw files 1–4 weeks after a video is live**; keep the export.

## While recording

- Press the **marker** at every milestone (new upgrade type, prestige, big number, funny moment, mistake).
- Take a **screenshot** at the start (tiny) and at the biggest moment (huge) for the thumbnail.
- Voice break every hour. Water nearby.
- If a sentence goes wrong: pause 2 s, say it again.

## Light edit (DaVinci Resolve free) — ~2 hours

1. Import. Markers appear on the clip.
2. **Cut:** loading screens, menus, mistakes, long silence.
3. **Speed up idle waits** 4x–16x and add a small "x8" label. Never leave minutes of silent waiting (monetization risk).
4. **Cold open:** run `/hook` with 4–5 timecodes of the best moments. It builds a 10 s picture hook (stills, zoom, dissolves, gold text) and gives you a short voice-over script to record on Audio 1.
5. Audio: Fairlight → Presets Library → apply **Brimlo Voice B Warm** to Audio 1 and **Brimlo Master** to Bus 1 (see [voice-presets.md](voice-presets.md)). Check A2 (game) is not muted. Voice clear over game sound (lower the game track if needed).
6. Write chapters from your markers.
7. Export: render preset **Brimlo YouTube** (YouTube loudness -14 LUFS), H.264/H.265, 1080p60.

Silence removal: one source says Resolve 20.2+/21 free has *Clip → Audio Operations → Ripple Delete Silence* — check your version. Use it on menu parts only, not on gameplay. CapCut's auto silence removal is mostly a paid feature.

## Length guide

- 60–120 minutes. Shorter is fine if the game is short. **Never stretch.**
- From 9 Nov: the Saturday session makes **two** 60–90 min videos on **two different games**.

## Upload

- Big files can take hours on slow internet → start in the evening, let it run overnight.
- Always **schedule** in Studio for 12 PM ET (Studio handles the clock change).
