# Brimlo mascot (avatar) tool

Puts the moving Brimlo mascot (gold bag with crown) in a corner of a **finished** video, after editing.
No camera, no live app, no OBS change. Only Python (numpy, Pillow, scipy via `uv`) + ffmpeg.

**Guide for Mamunur (how it works, process, cheat sheet of trigger words, rules, test plan, plans):
[playbook/mascot.md](../../playbook/mascot.md). Skill: `/add-mascot`.**

**Status:** v5, 14 Nov 2026 (v4 look approved 13 Nov 2026: "feels live and very good"). Test phase.

## Files

| File | What |
|---|---|
| `add_avatar.py` | The video tool (below). Trigger words = `EXPR` at the top. Rig positions = `CROWN_POLY`, `CROWN_CUT_Y`, `CROWN_PIVOT`. |
| `anim.py` | `Spring` (damped spring motion), `Effects` (particles: ! stars, sparkles, sweat drop, ?, coins, ?!, HA) and their sprites in brand colours. |
| `make_faces.py` | Makes all face pictures + the plain body from `channel/brand/logo-v3-2026-11-05.png` (pixel positions tuned to this logo). |
| `make_brand.py` | Stickers, YouTube watermark and the mascot banner in `channel/brand/`. |
| `out/` | Previews, overlays, check files. Not in git. |

## Use

```
uv run tools/avatar/add_avatar.py "<final export>" --best-preview     # 90 s preview, most faces → tools/avatar/out/
uv run tools/avatar/add_avatar.py "<final export>"                    # full → "<name> - mascot.mov" next to the export
```

| Option | Default | What |
|---|---|---|
| `--transcript <name>` | found by `summary.json` → `video` | Folder in `tools/transcribe/out/` made from this same export (needed for word times). |
| `--corner auto\|br\|bl\|tr\|tl` | `auto` | Auto = least fixed HUD in 12 sampled frames (median edge map), bottom-right wins near-ties. |
| `--size 0.22` | 0.22 | Mascot height as part of the video height. |
| `--best-preview` / `--start --duration` | | Preview the 90 s with the most different faces / a part you pick. |
| `--laugh` | off | **Experimental** laugh finder (outside words, voice-band heavy, 3–7 bursts/s). Can be wrong. |
| `--overlay-only` | off | Only the mascot as transparent ProRes 4444 (`- mascot overlay.mov`, ~4.4 GB/h) + `.txt` with Resolve Position X/Y. |

Speed on the Mac mini M4: ~6× real time (1 h video ≈ 10 min). Output: HEVC 12 Mb/s, audio copied untouched.

## How it works

| Part | Driven by |
|---|---|
| Mouth | Talking = Whisper word times (+0.04 s pad, gaps < 0.12 s joined). Level = voice-band (250–3500 Hz) loudness inside talk, percentiles 20/90 → closed / half / open, min hold ~0.07 s. |
| Blinks | Random every 3–7 s (not during expressions). |
| Body | Springs: `dy` 3 Hz ζ0.35, `sy` 4 Hz ζ0.3, `rot` 2 Hz ζ0.45. Breathing, idle sway, talk bob, volume kept (taller = thinner). Kicks when a face starts. |
| Mini rig | Face layer = pixels that differ from `brimlo-body-blank.png`, slid by a gaze spring (±2.8 % x, ±1.8 % y of size). Crown = own layer, cut above `CROWN_CUT_Y`, rotated around `CROWN_PIVOT`, springs pushed by the body's speed changes. |
| Expressions | `EXPR` trigger phrases (first match in order wow > sad > money > happy > confused > think), hold 1.6–2.2 s, cool-down per face. 0.12 s cross-fade, own move, gaze and effect. |

Rates on 11 transcripts (~16 h): ~2.1 face changes per minute (happy 0.67, think 0.58, wow 0.32, money 0.23, sad 0.14, confused 0.14).

Limits: reacts to **words**, not feelings. No real Live2D rig (needs artist work in the Live2D app).
