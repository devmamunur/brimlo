---
name: hook
description: Build the first seconds of a recorded Brimlo video in DaVinci Resolve with computer use — mode A a gold text pop over the goal sentence, mode B a 10-second preview of real video clips from the end, mode C 4–5 still pictures with zoom and gold text — and write the short voice-over lines. Use for "/hook", "make the hook", "edit the first seconds", "add the first 10 seconds", "intro", "preview", "text pop", "cold open" after a video is recorded and edited.
argument-hint: "[game or videos/ file] [timecodes]"
---

# /hook

Mamunur edits the hook himself first; this skill is the backup (28 Oct 2026). Follow "The first 2 minutes rule" in `playbook/hooks-and-scripts.md`: the hook is **max 10 s**, the goal with a number is said in it, and real gameplay follows right after (no menus).

## 0. Pick the mode (ask him if he didn't say)

| Mode | What it is | When | Steps |
|---|---|---|---|
| **A — Text pop** (simplest, default) | The video starts on gameplay with his goal sentence; a big gold text ("1,000,000 TREES") pops on screen for ~2 s | Every video, as the minimum | Section 7 |
| **B — Clip preview** | A 10 s preview of 3–4 **real video clips** from the end (2.5–3.3 s each), slow zoom, short dissolves, optional gold text, then his line "This is how I got there", then the start | When the end looks very different from the start (bald planet, boss, huge numbers) | Section 8 (uses sections 1–4 for setup) |
| **C — Still pictures** (original, tested with Seabun) | 4–5 frozen frames with zoom, dissolves and gold text + voice-over | When short clips look too busy | Sections 1–6 |

Modes A and B were written on 28 Oct 2026 and are **not tested yet** on his Mac. Go slowly: check after every step, and Undo if something looks wrong. Write what worked back into this file.

## Mode C — still pictures

After recording, Mamunur wants a **10-second picture hook** at the very start: 4 or 5 still frames of the biggest moments, each with a slow zoom, a soft dissolve and big gold text. He then records a short **voice-over** over it (his choice, 26 Oct 2026; this is the only voice-over part of the video).

First built for Seabun on Mon 26 Oct 2026. Everything below was tested on Resolve 21 (free) on his Mac.

## 1. Get the moments

1. Find the video file in `videos/` (by game name). Read its "Cold open" section and what really happened.
2. Ask Mamunur for **4 or 5 timecodes** from the Resolve timeline (`HH:MM:SS:FF`) and what each shows. He finds them himself; do not ask him to rewatch the whole video.
3. Order them **small → big**. The biggest moment (boss, rarest drop, huge number) goes **last**. Never use the final win or boss death: save it for the end of the video.
4. Ask him to **save the project (Cmd+S)** before you start.

## 2. Timing (always exactly 10 s)

| Stills | Each | Frames at 60 fps |
|---|---|---|
| 4 | 2.5 s | 150 |
| 5 | 2.0 s | 120 |

Total = 600 frames = **two** "Insert Gap" steps (Resolve inserts 5 s each time). Check the timeline frame rate first and recompute if it is not 60.

## 3. How to drive Resolve (lessons, do not skip)

- Use computer use (`request_access` for DaVinci Resolve). Resolve may be on **either monitor**: if a screenshot is empty or shows the desktop, `app_list_windows` and `switch_display`.
- **Keyboard shortcuts do not reach Resolve reliably** (typed timecodes, `Cmd+=`, plain digits). Use **menus and mouse clicks**. Text fields (Console, Inspector) do accept typing.
- External Python scripting returns `None` in the free version. Use the in-app **Workspace → Console** (Lua tab). The global `resolve` works there (`Resolve()` does not). Move the Console window up so its input line is visible.
- Never click on the timeline to "focus" it: you may select a clip by accident. Use **Edit → Deselect All** before editing.
- After every step, check the result. If something is wrong, use **Edit → Undo** or delete only what you added.

## 4. Steps

**a. Read the timeline (Console):**
```lua
p = resolve:GetProjectManager():GetCurrentProject(); tl = p:GetCurrentTimeline(); print(tl:GetName(), tl:GetSetting('timelineFrameRate'), tl:GetStartTimecode(), tl:GetEndFrame(), tl:GetTrackCount('video'), tl:GetTrackCount('audio'))
```

**b. Export the stills — on the Color page, one at a time.** In the Edit page, or inside a loop, every export is the same stale frame. Folder: `~/Movies/<Game>-hook/`.
```lua
resolve:OpenPage('color'); d='/Users/devmamun/Movies/<Game>-hook/'
```
Then, for each still, two **separate** Console lines with ~3 s between:
```lua
print(tl:SetCurrentTimecode('01:13:53:22'))
print(p:ExportCurrentFrameAsStill(d..'1-name.png'))
```
Check with Bash: `md5` of the files must all be different. Look at each picture (make a small jpg with `sips -Z 800`) and confirm it shows the right moment.

**c. Check the text is true.** Zoom into any in-game label (rarity, name, number) before you write it. Seabun: Mamunur said "epic fish", but the game said **"Rare"**, so the text became "FISH MOUNTS". No made-up counts or rarities.

**d. Make the 10-second gap.** Back on the Edit page (`resolve:OpenPage('edit')`), playhead to 0 (`tl:SetCurrentTimecode('00:00:00:00')`), **Edit → Deselect All**, then **Edit → Insert Gap** two times. Check that all tracks moved together:
```lua
for _,k in ipairs({{'video',1},{'audio',1},{'audio',2}}) do local L=tl:GetItemListInTrack(k[1],k[2]); print(k[1],k[2],#L,L[1]:GetStart(),L[#L]:GetEnd()) end
```
Every first clip must start at **600**, and the end frame must be the old end + 600.

**e. Place the stills on V1.** `AppendToTimeline` ignores `startFrame`/`endFrame` for stills (it uses 5 s). Set **marks** on the media pool item first. `D` = frames per still (150 or 120):
```lua
mp = p:GetMediaPool(); its = mp:ImportMedia({d..'1-name.png', d..'2-name.png', ...}); for i=1,#its do its[i]:SetMarkInOut(0,D) end
for i=1,#its do mp:AppendToTimeline({{mediaPoolItem=its[i], startFrame=0, endFrame=D, trackIndex=1, recordFrame=(i-1)*D, mediaType=1}}) end
local L=tl:GetItemListInTrack('video',1); for i=1,#its+1 do print(L[i]:GetName(), L[i]:GetStart(), L[i]:GetDuration()) end
```
The gameplay clip must still start at 600, untouched. If a still landed wrong, delete only the items with `GetStart() < 600` (`tl:DeleteClips(list, false)`) and place them again.

**f. Gold text on V2.** Make the PNGs (house style: gold gradient, navy outline, top of frame). One-time setup is in the script header.
```bash
tools/hook/.venv/bin/python tools/hook/make_text.py ~/Movies/<Game>-hook "t1-name=FULL SKILL TREE" "t2-name=GIANT CRAB BOSS"
```
Keep each text 1–4 words. Then add track V2 if needed and place the PNGs the same way with `trackIndex=2`:
```lua
if tl:GetTrackCount('video')<2 then tl:AddTrack('video') end
```

**g. Animation.** Zoom the timeline with the **zoom slider** (mouse drag) and scroll left until the stills show. Click each still on V1 → **Inspector → Video → Dynamic Zoom** dot (turn it red). Check all of them.

**h. Transitions.** Click still 1, **Cmd+click** the other V1 stills and all V2 texts → **Timeline → Add Video Only Transition**. Then **Timeline → Select Transitions** → Inspector → Transition → **Duration: 20 frames**. (The default 1 s mixes the texts together.)

**i. Check and save.** Click the ruler at the middle of each still and zoom the screenshot on the viewer: right picture, zoomed, text readable. Then **File → Save Project**.

## 5. Voice-over script

Write one short line per still, in order, plus a bridge line into the gameplay. Simple English, 2–5 words a line, so it fits 2–2.5 s when spoken slowly. Example (Seabun):

> "Full skill tree." · "A team of fish mounts." · "A legendary white shark." · "And a giant crab boss." · "This is how I got here."

Tell him to record it on **Audio 1** starting at 0:00, so his voice preset (Brimlo Voice B Warm) is applied. Resolve has **Timeline → Record Voiceover…**, or he can record in OBS with the same mic and drop it on A1.

## 6. After

- Update the video file's "Cold open" section: the stills, their original timecodes, the texts, the voice-over lines, and "done in Resolve on <date>".
- Tell him: all old timecodes are now **10 s later**; play the first 15 s once at full speed before export; the hook is silent until he records the voice-over.
- Do not change the log status here; `/publish` does that.

## 7. Mode A — text pop (no gap, nothing moves)

1. Ask: the **exact text** (1–3 words, a number only if he read it on screen, e.g. "1,000,000 TREES") and the **timecode** where he says the goal (usually 00:00:00:00–00:00:05:00).
2. Ask him to save (Cmd+S). Read the timeline with step 4a.
3. Make the PNG:
```bash
tools/hook/.venv/bin/python tools/hook/make_text.py ~/Movies/<Game>-hook "pop=1,000,000 TREES"
```
4. Put it on V2 for 2 s (120 frames at 60 fps) at the goal frame `F` (timeline frame = timecode minus the timeline start; check `tl:GetStartFrame()`):
```lua
if tl:GetTrackCount('video')<2 then tl:AddTrack('video') end
mp=p:GetMediaPool(); it=mp:ImportMedia({'/Users/devmamun/Movies/<Game>-hook/pop.png'})[1]; it:SetMarkInOut(0,120)
print(mp:AppendToTimeline({{mediaPoolItem=it, startFrame=0, endFrame=120, trackIndex=2, recordFrame=F, mediaType=1}}))
```
5. Select only the text clip → **Timeline → Add Video Only Transition** → Inspector → Transition → **Duration: 10 frames** (a quick fade in and out). Optional: Inspector → Video → Zoom 1.1 → 1.0 for a small "pop".
6. Check the viewer at F+60 (text readable, not covering the important part of the game), then **File → Save Project**.

## 8. Mode B — clip preview (10 s)

1. Ask for **3 or 4 timecodes from the Resolve timeline** of the best end moments, each with what it shows. Order small → big; never use the final win (save it for the end). **Pick moments from normal-speed parts**: inside a sped-up clip the source frame maths below is wrong.
2. Save (Cmd+S), read the timeline (4a), check the frame rate. Per clip: 4 clips = 150 frames, 3 clips = 200 frames at 60 fps (total 600 = 10 s).
3. **Find the source frame for each moment before inserting the gap** (timeline frames shift after it). For timeline frame `f` on V1:
```lua
function src(f) for _,it in ipairs(tl:GetItemListInTrack('video',1)) do if it:GetStart()<=f and f<it:GetEnd() then return it:GetMediaPoolItem(), it:GetLeftOffset()+(f-it:GetStart()) end end end
m1,s1=src(<frame1>); print(m1:GetName(), s1)
```
Repeat for each moment; write down the media pool item and source frame. If `src` returns nil, the frame is in a gap: ask for another timecode.
4. Make the 10 s gap at the start (step 4d) and check that every first clip starts at 600.
5. Place the clips **video only** on V1 (their game audio would clash with the voice-over), centered on each moment. `D` = frames per clip:
```lua
mp=p:GetMediaPool(); local L={{m1,s1},{m2,s2},{m3,s3}}
for i,c in ipairs(L) do print(mp:AppendToTimeline({{mediaPoolItem=c[1], startFrame=c[2]-D/2, endFrame=c[2]+D/2, trackIndex=1, recordFrame=(i-1)*D, mediaType=1}})) end
local V=tl:GetItemListInTrack('video',1); for i=1,#L+1 do print(V[i]:GetName(), V[i]:GetStart(), V[i]:GetDuration()) end
```
The gameplay clip must still start at 600. If anything landed wrong, delete only items with `GetStart() < 600` and try again.
6. Optional gold text per clip on V2 (step 7.3–7.4 with `recordFrame=(i-1)*D`, length D). Keep it to 1–3 words, true to the game (step 4c).
7. **Dynamic Zoom** on each preview clip (step 4g) and **dissolves of 15–20 frames** between them (step 4h). Add one more dissolve at frame 600 into the gameplay.
8. Optional whoosh: if he has a whoosh file (YouTube Audio Library), import it and put it on a free audio track at each cut, quiet (−12 dB).
9. Check the viewer in the middle of each clip, then **File → Save Project**.

**Voice-over (mode B):** one short line per clip + the bridge, said slowly; the goal number goes in the first or last line. Example (Deforest a Planet): "One small axe." · "Hundreds of workers." · "A bald planet." · "This planet had [X] trees. This is how I cut them all." He records it on **Audio 1** from 0:00 (Timeline → Record Voiceover…, or OBS), so his voice preset applies.

**After mode A or B:** same as section 6 (update the video file's cold open notes; with mode B all old timecodes are 10 s later; watch the first 15 s once at full speed).

