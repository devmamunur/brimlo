# Brimlo mascot (avatar) tool

Puts the moving Brimlo mascot (gold bag with crown) in the corner of a **finished** video.
No camera, no live setup, no OBS change. It is added **after** editing.

**Guide for Mamunur (process, rules, test plan, future plan): [playbook/mascot.md](../../playbook/mascot.md). Skill: `/add-mascot`.**

**Status (13 Nov 2026): v4 approved ("feels live and very good"), test phase.** v1 feedback from Mamunur: "soulless", random mouth, not smooth → v2 fixed mouth + smoothness → v3 added expressions from trigger words (Mamunur: "talking worked properly now") → v4 spring motion, cross-fades, a move + effect per expression (Mamunur: "now it feels good", asked for more professional animation). Test it on 1–2 videos, then compare retention (see "Test plan").

## How it moves

| Part | What drives it |
|---|---|
| Mouth | Moves only while you speak (Whisper **word times**). Inside speech, your **real voice loudness** picks closed / half / open, with a short hold so it does not flicker. Game sound does not move the mouth. |
| Eyes | Random blinks every 3–7 s |
| Body | **Springs** (`anim.py`): every move eases in, overshoots a little and settles, like soft jelly. Slow breathing, gentle idle sway, soft bob + stretch while talking. Taller = thinner (keeps its volume). |

| Expressions | **Trigger words** in the transcript change the face for ~2 s (table below). Faces cross-fade in 0.12 s. Each one has its own move and effect: |
| | 😮 wow: jumps up + stretches, "!" and gold stars burst · 😄 happy: bouncy wiggle, gold sparkles · 😢 sad: sinks, squashes and leans, sweat drop · 🤔 think: tilts the head, teal "?" floats up |

### Expressions (v3, 13 Nov 2026)

Trigger words were picked from 11 transcripts (~16 h). Numbers = how often Mamunur says them per hour.

| Face | Trigger words | Pause before same face again |
|---|---|---|
| 😮 wow (raised brows, "O" mouth) | "oh my god" (14/h), "oh god", "wow", "amazing", "huge", "insane", "what happened", "what the"… | 4 s |
| 😢 sad (sad brows, frown, tear) | "I died / died / dead" (5/h), "lost", "oh no", "no no", "not good", "failed"… | 6 s |
| 😄 happy (happy eyes, big grin) | "perfect" (16/h), "let's go" (11/h), "great", "beautiful", "finally", "awesome", "nice", "yes yes"… | 6 s |
| 🤔 think (one brow up, "hmm" mouth) | "let's see" (34/h), "what is this" (9/h), "should I" (7/h), "hmm", "interesting"… | 25 s |

Wipe Them Out (58 min): 99 face changes (27 wow, 35 happy, 6 sad, 31 think) ≈ 1–2 per minute.
Edit the lists in `EXPR` at the top of `add_avatar.py`.

Limits: it reacts to **words**, not feelings ("oh my god" said calmly still shows wow). Laughs are
never written by Whisper, so there is no "haha" face.

## Use

1. Export the final video from Resolve as usual.
2. Transcribe the **final** file (the same as `/finish-video` does), if not done yet:
   `tools/transcribe/run.sh "<final video>" --game "<game>" --name <video-file-name>`
3. Make a 90-second preview first (it picks the part with the most faces) and watch it:
   `uv run tools/avatar/add_avatar.py "<final video>" --best-preview` → `tools/avatar/out/<name> - mascot preview.mp4`
4. Full video (about 9 minutes for 1 hour of video on the Mac mini M4):
   `uv run tools/avatar/add_avatar.py "<final video>"`
   → `<same folder>/<name> - mascot.mov` (HEVC 12 Mb/s, audio copied untouched). Upload this file.

Options: `--corner br|bl|tr|tl` (default bottom-right; change it if the game has HUD there) ·
`--size 0.22` (height as part of the video height) · `--transcript <name>` (if it is not found by itself).

## Files

- `channel/brand/avatar/brimlo-mouth-{closed,half,open}[-blink].png` — the 6 normal faces.
- `channel/brand/avatar/brimlo-{wow,happy,sad,think}-{closed,half,open}.png` — the 12 expression faces.
- `make_faces.py` — makes all 18 faces from `channel/brand/logo-v3-2026-11-05.png` (positions tuned to this logo).
- `add_avatar.py` — the video tool. `anim.py` — springs, cross-fade helper, effects (sprites in brand colours). Output in `tools/avatar/out/` is not in git.

## Test plan

No channel in the niche was found using a mascot (Mamunur, 13 Nov 2026), so this is a guess, not proven.
Use it on 1–2 videos of similar games. After 7 days compare **average view duration** and the
**first 2 minutes of retention** with the last normal videos. Better or same → keep. Worse → drop it.
