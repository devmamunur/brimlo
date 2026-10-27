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

New to Resolve? Watch the short video list in [learn-davinci.md](learn-davinci.md) first (~50 min, only what we need).

1. Import. Markers appear on the clip.
2. **Cut the first 2 minutes hard** (see "The first 2 minutes rule" in [hooks-and-scripts.md](hooks-and-scripts.md)). Remove every menu, settings screen, language screen, story text and "what is this?" tour before the first real action. The video must start on gameplay plus the goal line.
3. **Cut:** loading screens, menus, mistakes, and **every silence longer than ~3 seconds**, in the whole video. Winners have no gaps; our videos had 9–20 gaps each (28 Oct review). You don't need to talk faster. Just remove the quiet parts.
4. **Speed up the grind and idle waits** 4x–16x and add a small "x8" label. Say "Let me skip ahead a bit" live before it. Never leave minutes of silent waiting (monetization risk).
5. **Cold open (optional):** run `/hook` with 4–5 timecodes of the best moments. It builds a 10 s picture hook (stills, zoom, dissolves, gold text) and gives you a short voice-over script to record on Audio 1. **Max 10 s.** The voice-over must say the goal with a number. Right after it: gameplay, not a menu.
6. Audio: Fairlight → Presets Library → apply **Brimlo Voice B Warm** to Audio 1 and **Brimlo Master** to Bus 1 (see [voice-presets.md](voice-presets.md)). Check A2 (game) is not muted. Voice clear over game sound (lower the game track if needed).
7. Write chapters from your markers.
8. **First 2 minutes check before export:** watch 0:00–2:00 once. ✅ The goal with a number is in the first sentence. ✅ The first real action is by 0:05 (0:10 with a cold open). ✅ No menu, no reading aloud, no tour. ✅ The subscribe line is near 2:00. If any check fails, cut more.
9. Export: render preset **Brimlo YouTube** (YouTube loudness -14 LUFS), H.264/H.265, 1080p60.

Silence removal: one source says Resolve 20.2+/21 free has *Clip → Audio Operations → Ripple Delete Silence* — check your version. Run it on the voice track (Audio 1) so it finds the gaps in your talking, then watch the result for jumpy cuts in the middle of a big moment. If it is not in your version, cut gaps by hand with the blade tool (B). CapCut's auto silence removal is mostly a paid feature.

**After 7 days, check:** Studio → video → Engagement → hover the retention curve at 1:00. Before the new rules it was 17–45%; the target is **60%+**.

## Length guide

- 60–120 minutes. Shorter is fine if the game is short. **Never stretch.**
- The length is whatever is left **after** the cuts above. Do not keep quiet parts just to reach a length. A busy 50 min video is better than a 90 min video with gaps.
- From 9 Nov: the Saturday session makes **two** 60–90 min videos on **two different games**.

## Upload

- Big files can take hours on slow internet → start in the evening, let it run overnight.
- Always **schedule** in Studio for **10 PM Dhaka** (12 PM ET until 31 Oct 2026, 11 AM ET from 1 Nov 2026).
- After it is live: fix the English subtitles in Studio (see [upload-checklist.md](upload-checklist.md) → "After it's live").
