# Audio setup — OBS + DaVinci Resolve (voice presets)

Set up and checked: Sat 24 Oct 2026.
Goal: a calm, warm voice that is easy to listen to for 90 minutes, steady volume, YouTube-ready loudness.
Signal flow: **OBS (record) → Resolve A1 track (voice presets) → Bus 1 (master limiter) → Deliver (YouTube loudness)**.

---

## 1. Every new video — quick steps

**Before recording (OBS):**
1. Turn on **Do Not Disturb** (Control Center → Focus). Close Telegram, WhatsApp, browser. (OBS records *all* Mac sound on the Game track.)
2. Sit one hand (10–15 cm) from the mic.
3. Record 20 seconds, talk normally, play it back. Voice bar mostly **yellow** (about -12 to -6 dB), never **red**.

**In Resolve (Fairlight page):**
1. Top menu **Fairlight → Presets Library…**
2. Filter by **Global Track Presets** → click **Brimlo Voice B Warm** → click **Audio 1** (white border) → **Apply**.
3. Filter by **Global Bus Presets** → click **Brimlo Master** → click **Bus 1** → **Apply**.
4. Check track **A2** (game) is **not muted** (the **M** button must be grey).
5. Deliver page → render preset **Brimlo YouTube** → check video settings → render.

Note: when the Presets Library opens, the first item (e.g. "Dialog - Basic") is only *highlighted*. Nothing changes until you click **Apply**.

Do **not** turn on Leveler / Pitch / EQ in the Inspector for the clip. Everything lives on the A1 track. Turning them on for the clip would process your voice twice.

---

## 2. All saved presets in Resolve

| Preset | Type (where) | Use |
|---|---|---|
| **Brimlo Voice A Natural** | Global Track Preset (Presets Library) | Voice, smoother, no pitch change |
| **Brimlo Voice B Warm** ⭐ | Global Track Preset | **Recommended.** Warmer, calmer, a little lower |
| **Brimlo Voice C Deep** | Global Track Preset | Deepest. Only if B still sounds young |
| **Brimlo Master** | Global Bus Preset (Presets Library) | Whole Bus 1 setup = master limiter |
| **Brimlo YouTube** | Render preset (Deliver page) | Export with YouTube loudness |

All 3 voice presets were applied one by one and checked on 24 Oct 2026: leveler, pitch, EQ and compressor all load correctly.

---

## 3. What is inside the voice presets (A1 track)

Order on the track: **Dialogue Leveler → Pitch effect → Compressor/Limiter → EQ**.

**Same in all 3 presets:**
- **AI Dialogue Leveler** (Track FX "Dial Lev", yellow = on): Mode "Optimize moderate levels", Reduce loud ✓, Lift soft ✓, Reduce background ✗ (OBS already removes noise), Output Gain 2.0.
- **Compressor:** threshold -30 dB, ratio 2.7:1, knee 64, attack 10 ms, release ~150 ms, make-up +3.9 dB.
- **Limiter:** -3 dB.

**Different per preset:**

| | A Natural | B Warm ⭐ | C Deep |
|---|---|---|---|
| Pitch | 0 / 0 cents | 0 / **-50 cents** | **-1 semitone** / 0 |
| Band 1 high-pass | 80 Hz | 80 Hz | 75 Hz |
| Band 2 low shelf (warmth) | 180 Hz, +1.5 dB | 150 Hz, +3 dB | 120 Hz, +3.5 dB |
| Band 3 mud cut | 350 Hz, -2 dB | 350 Hz, -2.5 dB | 300 Hz, -2 dB |
| Band 4 sharpness cut | 4 kHz, -1 dB | 4 kHz, -2 dB | 4 kHz, -2 dB |
| Band 5 high shelf (soft top) | 10 kHz, -1 dB | 8 kHz, -1.5 dB | 7 kHz, -2.5 dB |

Q: Band 2 and 5 = 0.8 (gentle shelf), Band 3 and 4 = 1.0.

---

## 4. Bus 1 and export

- **Bus 1:** limiter -1.5 dB (preset "Brimlo Master"). Bus volume 0 dB. Stops overload.
- **Deliver → "Brimlo YouTube":** Audio → Audio Normalization ✓ → Normalize to standard → Standard **YouTube** (-14 LUFS, -1 dBTP).

---

## 5. How to check it is working (Fairlight mixer, column A1)

| Look at | Should be |
|---|---|
| Track FX row | "Dial Lev" in **yellow** (A2's grey is correct) |
| Effects row | "Pitch" |
| Effects In row | "In" in **yellow** |
| Timeline A1 name | small "fx" |

- Exact numbers: double-click "Pitch" in the Effects row; double-click the EQ or Dynamics graph; click "Audio 1" at the bottom of the strip → Inspector shows the leveler.
- Hear it: while playing, click "In" or "Dial Lev" off (grey) and on (yellow). Leave both **yellow** after.
- If the leveler makes no difference, it may need Resolve Studio. Then make the compressor stronger instead.

---

## 6. OBS setup (checked 24 Oct 2026)

| Area | Setting |
|---|---|
| Output mode | **Advanced** (Simple mode records only one mixed audio track) |
| Recording path | `/Volumes/WD Black/Videos/obs` |
| Format | Hybrid MOV |
| Video encoder | Apple VT **HEVC** Hardware, CBR **10000 Kbps**, keyframe 2 s, 60 fps (set Mon 26 Oct 2026, not tested yet). Old setting if the test fails: Apple VT H.264 Hardware, CBR 12000 Kbps. See [recording-and-editing.md](recording-and-editing.md). |
| Recording audio tracks | **1 + 2** on. Names: 1 = **Voice**, 2 = **Game** |
| Video | 1920×1080 canvas and output, 60 fps |
| Audio | 48 kHz, stereo. Global audio devices disabled (sources used instead) |
| Advanced | NV12, Rec.709, Limited (standard) |
| Mic "Audio Input Capture" (fifine) | Track 1 only, **Mono**, fader -5 dB |
| Mic filters | Noise Suppression (**RNNoise**) → **Limiter -3 dB** |
| Game "macOS Audio Capture" | Desktop Audio Capture (all Mac sound), Track 2 only, fader -10 dB, no filters |
| Screen "Left Display Full" | No audio tracks |

In Resolve: **A1 = Voice, A2 = Game.**

**Do not add EQ, pitch or compressor in OBS.** OBS bakes them into the file and you cannot undo it. Tone work happens in Resolve.

Optional: OBS → Profile → Rename the profile from "Untitled" to "Brimlo", then Profile → Export to keep a backup.

---

## 7. Voice target and free tips

Brimlo videos are long and relaxing ("You relax. I'll grind."). The voice must be easy on the ears, warm and close, steady in volume, and still sound like you. A voice that sounds fake is worse than a slightly young one.

EQ and pitch change **tone**, not **accent**. The biggest free wins:
- One hand from the mic (closer = warmer, deeper).
- Talk slower and a little softer. Short sentences. Small pauses.
- Smile a little when you talk.

**If something sounds wrong:**
- Fake / robotic → less pitch: C → B → A.
- Boomy / muddy → lower Band 2 gain by 1 dB.
- "S" sounds hurt → lower Band 5 gain by 1 dB.
- Voice hard to hear over the game → lower the A2 fader, not more EQ.
- Change one thing at a time. To keep a change: Presets Library → Global Track Presets → Save New → **Create New** (never "Update" by mistake).

---

## 8. Open items

- [ ] Listen to B Warm for 1–2 minutes (settings were checked, but not by ear).
- [ ] Test if the AI Dialogue Leveler changes the sound in the free version.
- [ ] Mic level test (20 s recording).
- [ ] Optional: make a "Brimlo Template" project so nothing needs to be applied per video.

**Winner preset:** _______________  (date: __________)
