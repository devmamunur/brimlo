# Learn DaVinci Resolve (only what Brimlo needs)

Saved 28 Oct 2026. Only the skills for our videos: cut, remove gaps, speed up, voice level, export. No color grading, effects or B-roll. About **50 minutes** in total. Links checked on YouTube on 28 Oct 2026.

## 1. The basics — one tutorial, only these chapters (~30 min)

**"In Depth DaVinci Resolve Video Editing Tutorial – Mac & PC"** (Content Creators, 2025)
https://youtu.be/-MrHvGoq9lY

| Watch | What you learn | Link at that time |
|---|---|---|
| 2:51 – 11:25 | Import the recording, the timeline, cut with the blade tool, smooth playback | https://youtu.be/-MrHvGoq9lY?t=171 |
| 11:25 – 14:10 | Project settings for YouTube | https://youtu.be/-MrHvGoq9lY?t=685 |
| 23:23 – 26:27 | Voice volume and normalize audio | https://youtu.be/-MrHvGoq9lY?t=1403 |
| 26:27 – 30:36 | **Remove dead space** with keyboard shortcuts (most important) | https://youtu.be/-MrHvGoq9lY?t=1587 |
| 1:04:26 – 1:05:00 | Export | https://youtu.be/-MrHvGoq9lY?t=3866 |

Skip the rest of that video (LUTs, color, B-roll, transitions, captions, "advanced edit").

**Shorter option (12 min, all basics in one):** "DaVinci Resolve Beginners Tutorial: Edit like a PRO for FREE!" (Ben Claremont) — https://youtu.be/SrJOE2pEp7A · trimming 3:30, audio levels 5:51, text 8:34, transitions 9:09, export 11:05.

## 2. Remove silences automatically (free version, ~2 min)

- **"Automatically Remove Silences with One Click! – DaVinci Resolve 20"** (Daniel Batal) — https://youtu.be/p6dHrxavAH8
- **"Automatically Remove Silences & Leave Spaces"** (Daniel Batal, 2026) — https://youtu.be/7oAPK9tFeWo — keeps a small pause, good for a calm style.

## 3. Speed up boring parts (20 s)

- **"INSTANTLY Speed Up & Slow Down Video Clips"** (Daniel Batal) — https://youtu.be/CAPoKh_WvLU — use it for the grind (4×, 8×).

## 4. Export for YouTube (3 min)

- **"Get Your Export To Look GREAT on YouTube"** (Daniel Batal) — https://youtu.be/n8bgxaFztW0

## Optional

- **Hindi / Urdu beginner series** (GFXMentor) — start with "Class 0: Install & First Look": https://youtu.be/CTQsT9rG2l8 · Class 1 (Media Management): https://youtu.be/N5wkFXKUdVg. Watch only the editing classes.
- **Free auto subtitles plugin** (if you ever want subtitles inside the video): https://youtu.be/U36KbpoAPxM. Not needed now; we upload subtitles in Studio (`tools/subtitles/`).
- **Later, not now:** the 5-hour full course by Casey Faris — https://youtu.be/MCDVcQIA3UM. It teaches everything; the Edit page part (0:28:57 – 1:30:44) is the only useful part for us.

## 5. The first 10–30 seconds (the hook edit)

### The Brimlo hook style (simple, works for a calm voice)

```
0:00–0:05  Gameplay + your goal sentence ("This planet has 1,000,000 trees…")
           + one gold text pop on screen for 2 s: "1,000,000 TREES"
0:05–0:15  Preview: 3 fast clips (2–3 s each) of the END result
           (bald planet, huge numbers, the boss) + your line:
           "In one hour I'll have hundreds of workers. This is how I got there."
           Short dissolve between clips, light zoom-in, one whoosh sound.
0:15–0:30  Cut back to the start and keep playing. No menus, no tour.
```

- **Step 1 (start here):** only the goal sentence + the text pop. No preview. Easy and already much better.
- **Step 2 (when you feel ready):** add the 10-second preview. Seabun (our best opening) used this idea.
- `/hook` can build the preview from still pictures and make the gold text PNGs for you (`tools/hook/make_text.py`). Real video clips also work.

### What to learn for it (~5 min of videos)

| Skill | Video | Length |
|---|---|---|
| Place text / a title, add a dissolve transition | Ben Claremont, text 8:34 + transitions 9:09 — https://youtu.be/SrJOE2pEp7A?t=514 | ~1.5 min |
| Slow zoom-in on a clip | "Create INSTANT Zoom In or Zoom Out" (Daniel Batal) — https://youtu.be/bnxHdyVwR_A | 1 min |
| Dynamic Zoom (one-click slow zoom) | "Dynamic Zoom effect in DaVinci Resolve" (RESO\VED) — https://youtu.be/yLjOyIurel8 | 23 s |
| Simple text animation (optional) | "SMOOTH Sliding TEXT ANIMATION" (Davinci Made Simple) — https://youtu.be/HtasfXOIzqY | 49 s |
| Sound effect (whoosh) on a cut | "Sound Effect trick in DaVinci Resolve" (RESO\VED) — https://youtu.be/16BiucMplsw | 36 s |

Free whoosh sounds: YouTube Studio → Audio Library → Sound effects → search "whoosh".

### Why hooks work (optional theory, 15 min)

- "Give me 15 mins, and I'll make your hooks impossible to skip" (Kallaway) — https://youtu.be/2byPP_9F0-Q — made for short videos, but mistake 1 (**delay**) and mistake 2 (**confusion**) are exactly what our retention data showed.

## Your editing routine (after you learn the above)

1. Import the recording. **Cut the first 2 minutes hard**: menus, tours, anything before the action.
2. **Ripple Delete Silence** on the voice track. Then check that the satisfying moments are still there.
3. **Keep satisfying moments** (a big reveal, the last tree falling) at normal speed for 5–15 s with the game sound up.
4. **Speed up repeats** 4–8× and **dead air** 8–16×. Say "Let me skip ahead a bit" live before it.
5. Apply the voice presets ([voice-presets.md](voice-presets.md)).
6. Optional: `/hook` 10-second picture intro.
7. Watch 0:00–2:00 once (goal sentence, action by 0:05, no menus, subscribe line).
8. Export with the **Brimlo YouTube** preset.

More detail: [recording-and-editing.md](recording-and-editing.md).
