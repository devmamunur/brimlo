# Brimlo mascot: guide

The moving Brimlo mascot (the gold bag with the crown) sits in a corner of the video.
It talks when you talk, blinks, breathes, looks around, its crown wobbles, and it reacts to your words.
It is added **after** you edit, so recording and editing stay the same as before.

- **Status:** v5 (14 Nov 2026). v4 look approved by Mamunur (13 Nov 2026: "now this feels live and very good"). **Test phase**: see "Test plan".
- **Skill:** `/add-mascot` (or just say "add the mascot to [video]").
- **Tool code:** [tools/avatar/](../tools/avatar/README.md) (technical details for the AI).
- **Software:** only our Python code + ffmpeg (already installed). No apps, nothing paid.

---

## 1. How the system works (simple)

```
Final export (.mov from Resolve)
   │
   ├─► Transcript (tools/transcribe)  ── every word + its exact time
   │        ├─► Talking?      → mouth moves only while you say words
   │        └─► Trigger words → face changes ("oh my god" → wow)
   │
   ├─► Voice loudness (from the audio) → mouth closed / half / open
   ├─► 12 frames of the game           → auto corner (the emptiest corner)
   │
   └─► add_avatar.py draws the mascot frame by frame and puts it on the video
            → "<name> - mascot.mov" (same length, same sound) → upload this file
```

No camera, no face tracking, no live app, no OBS change.

### What each part does

| Part | How it works |
|---|---|
| **Mouth** | Moves only during your words (so loud game sounds never move it). Your real voice loudness picks closed / half / open. |
| **Eyes** | Random blinks every 3–7 seconds. |
| **Look around** (mini rig) | The face slides a little on the body: calm glances when idle, mostly at the viewer while talking, up-right when thinking, down when sad. |
| **Crown** (mini rig) | The crown is its own part. After a jump or bounce it swings and settles a moment later ("secondary motion"). |
| **Body** | Soft "spring" motion like jelly: breathing, gentle sway, soft bob while talking. It never stands frozen. |
| **Expressions** | Your trigger words change the face for about 2 seconds, with its own move and effect (table below). |
| **Corner** | Auto: the tool looks at 12 frames and picks the corner with the least game HUD. Bottom-right wins a tie. |

### The 6 expressions (+ 1 experimental)

| Face | Move | Effect |
|---|---|---|
| 😮 **wow** (raised brows, "O" mouth) | jumps up, stretches | gold "!" + stars |
| 😄 **happy** (happy eyes, big grin) | bouncy wiggle | gold sparkles |
| 😢 **sad** (sad brows, frown, tear) | sinks, leans, looks down | sweat drop |
| 💰 **money** (green "$" eyes, grin) | jump + shimmy | gold coins burst |
| 😕 **confused** (uneven brows, wavy mouth) | head shake, looks aside | teal "?!" |
| 🤔 **think** (one brow up, "hmm" mouth) | tilts head, looks up-right | teal "?" floats up |
| 😂 **laugh** — experimental, OFF by default | fast giggle bounce, happy face | gold "HA" "HA" |

In your videos the face changes about **2 times per minute** (all 11 videos, ~16 h).

### Cheat sheet: every trigger word (exact list in the tool)

Keep this next to you while recording. Say these when you **really** feel it. Natural is best.
Small words also count inside a longer sentence ("this is great").

**😮 WOW** (surprise, big moment)
> oh my god · my god · oh god · oh wow · oh my · wow · whoa · amazing · huge · insane · crazy · incredible · what the · holy · massive · powerful · too many · so many · very fast · look at this · look at that

**😢 SAD** (you die, lose, fail)
> I died · I'm dead · game over · died · dead · I lost · lost · oh no · no no · not good · failed · damn · sad · too bad · missed · broke

**💰 MONEY** (big numbers, max level)
> lots of money · so much money · million dollars · thousand dollars · million · billion · trillion · max out · maxed out · maxed · max level · level up · profit · dollars · rich

**😄 HAPPY** (good upgrade, win, nice moment)
> let's go · perfect · great · beautiful · finally · awesome · nice · cool · yes yes · oh yes · yay · love it · I love · satisfying · easy · completed · complete · I win · we win · cleared · very good · fun

**😕 CONFUSED** (surprised in a bad way, can't afford)
> what happened · I don't know · too expensive · not enough · can't afford · come on · why · wait · weird · strange · how is this

**🤔 THINK** (choosing an upgrade, reading something new)
> let's see · let me see · let me think · what is this · should I · hmm · interesting · which one

**Good to know**
- "yes", "what", "no", "good" and "money" alone do **not** count: you say them too often (30–50 times an hour).
- If two words are at the same spot, this order wins: wow → sad → money → happy → confused → think.
- The same face can't come back too fast: wow 4 s, happy/sad 6 s, money/confused 8 s, think 25 s.
- Laughs are never written in the transcript. The experimental `--laugh` switch tries to hear them in the sound (see Guidelines).
- Want a new word? Tell the AI. It checks your real transcripts first, then adds it to the tool and this list.

### Picture files

| Files | What |
|---|---|
| `channel/brand/avatar/brimlo-mouth-*.png` | 6 normal faces (mouth closed / half / open, each with a blink) |
| `channel/brand/avatar/brimlo-{wow,happy,sad,think,money,confused}-*.png` | 6 expressions × 3 mouth sizes |
| `channel/brand/avatar/brimlo-body-blank.png` | Plain body with no face (for the mini rig) |

All are made from the channel logo by `tools/avatar/make_faces.py`.

---

## 2. Video making process (with the mascot)

| Step | What | Who / tool |
|---|---|---|
| 1 | Record with live commentary (no change) | OBS |
| 2 | Edit and export the **final** video (no change) | Resolve → `playbook/recording-and-editing.md` |
| 3 | Titles, description, chapters, thumbnail. This also makes the **transcript** of the final export. | `/finish-video` |
| 4 | **Add the mascot**: 90 s preview first (~20 s of work), then the full video (~10 min per hour of video) | `/add-mascot` |
| 5 | Watch the preview + 2–3 random parts of the full file. Upload **"<name> - mascot.mov"** | you |
| 6 | Make the Short from the **normal** export (without the mascot; a corner mascot gets cut in 9:16) | `/make-short` |
| 7 | Log it | `/publish` |

**Important rules**

1. **The transcript must be made from the same final export.** If you change the edit and export again,
   make a new transcript first. Otherwise the mouth and faces will be out of sync.
2. **Preview first, always.**
3. **Corner:** auto picks the emptiest corner. If it is still wrong for a game, force one:
   `--corner br` (bottom-right) · `bl` (bottom-left) · `tr` (top-right) · `tl` (top-left).
4. **Storage:** the mascot file is about 6 GB per hour. Keep the normal export until the Short is made,
   then you can delete it (keep the mascot file, it is what's on YouTube).
5. Write **Mascot: yes / no** in the video file (`videos/<date>-<slug>.md`, top table) so we can compare later.

### Option: place the mascot by hand in Resolve (overlay-only file)

For a video where you want full control (move it, hide it in one part, change the size):

1. `/add-mascot` with "overlay only" (tool: `--overlay-only`). It makes `"<name> - mascot overlay.mov"`
   (transparent ProRes 4444, ~4.4 GB per hour) + a `.txt` with the exact Position X / Y for Resolve.
2. In Resolve: new timeline with the **final export** on V1, the overlay on V2 at the same start.
   Inspector → Transform → Position X / Y from the `.txt`.
3. Change what you want, then export again. (No new transcript needed: the timing does not change.)

---

## 3. Guidelines

**Do**
- Talk naturally. The faces follow your real words.
- Keep it small (default size = 22% of the video height). It should never cover game numbers.
- Use it on every video during the test, so the comparison is fair.

**Don't**
- Don't add a webcam at the same time (one test at a time; you chose no face for now).
- Don't put it in Shorts (the 9:16 crop cuts it).
- Don't "act" for the mascot or say "oh my god" more often. Viewers notice fake reactions.
- Don't skip the preview when the game has HUD in many corners.

**Laugh switch (experimental)**
- Off by default. Turn it on only after checking: "add the mascot with laugh".
- First test (14 Nov 2026): Wipe Them Out 0 laughs found; SHRED A BILLION 13 found, but many sit close
  together (17:38–20:00), which may be a game sound. Check file: `tools/avatar/out/laugh-check-shred-a-billion.m4a`
  (10 moments, 3 s each). If most are real laughs, we keep the switch; if not, it stays off.

---

## 4. Branding files (made 14 Nov 2026)

| File | Use |
|---|---|
| `channel/brand/mascot-stickers/mascot-{normal,talk,wow,happy,sad,money,confused,think}.png` | Transparent stickers (1080 px tall, with shadow) for community posts, end screens, Shorts covers, or a **thumbnail test** |
| `channel/brand/watermark-mascot-150.png` (+ `-300`) | YouTube Studio → Customization → Branding → **Video watermark** (shows bottom-right on every video; "Entire video") |
| `channel/brand/banner-mascot-2026-11-14.png` | New channel banner: mascot next to the tagline, inside the safe area that shows on all devices |

Notes
- Thumbnails: the house style (`playbook/thumbnails.md`) has **no corner boxes**. A mascot sticker in a thumbnail
  is a separate test: try it on 1–2 videos only after the mascot test says "keep", and check CTR in Studio.
- Watermark: if the mascot is in the bottom-right of the video, YouTube's watermark sits in the same corner.
  Use the watermark only if the auto corner often picks another corner, or set the mascot to `--corner bl`.

---

## 5. Test plan (is it worth it?)

No channel in our niche was found using a mascot (Mamunur, 13 Nov 2026), so this is a **guess, not proven**.

1. Use it on the **next 2 long videos**.
2. After 7 days, compare with the last normal videos of a similar game type:
   - **Average view duration** (main number)
   - **Retention at 1:00 and 2:00**
   - Comments about the mascot (good or bad)
3. Decide in the weekly review (`/weekly-review`):
   - Better or the same → keep it on all videos.
   - Worse → stop, and look at why (size? corner? distracting?).

Note: 2 videos is a small test. Game choice changes numbers more than the mascot does.
Treat the result as a signal, not proof.

---

## 6. Improvement plan

### Done (14 Nov 2026, v5)

| # | Upgrade | Result |
|---|---|---|
| 1 | Money eyes face | ✅ "$" eyes + coins; "lots of money", "million", "maxed", "level up"… |
| 2 | More trigger words | ✅ checked on 12 transcripts; ~30 new words (powerful, completed, game over, too expensive…) |
| 3 | Confused / annoyed face | ✅ "why", "wait", "I don't know", "too expensive", "not enough"… |
| 4 | Auto corner | ✅ default; picks the emptiest corner from 12 frames |
| 5 | Eyes look around | ✅ as a face slide on the body (mini rig) |
| 6 | Crown wobble | ✅ crown is its own part with secondary motion |
| 7 | Laugh face | 🟡 built, **off by default**; needs your ear check (see Guidelines) |
| 8 | Mascot in branding | ✅ stickers, watermark, banner (upload is your choice) |
| 9 | Overlay-only file | ✅ `--overlay-only` (ProRes 4444 + Resolve position) |
| 10 | Full Live2D rig | ❌ not doable with code: needs the Live2D app + the art cut into parts + hand rigging (artist work). Only if the test clearly says the mascot helps. |

### Next ideas (only after the test says "keep")

| Idea | Why | Work |
|---|---|---|
| Real pupils that move inside the eyes (redraw eyes as layers) | Even more alive than the face slide | Medium |
| Mascot waves "bye" + points at the end screen in the last 20 s | Pushes viewers to the next video | Medium |
| Mascot reacts to big **game** sounds (explosion → small jump) | Lives even when you are quiet | Medium; risk: too busy |
| New words every ~10 videos | Your words change with new games | Small |

---

## 7. History

| Version | Date | What changed | Feedback |
|---|---|---|---|
| v1 | 13 Nov 2026 | 2 faces, mouth on a fixed rhythm, jumps | "soulless", random, not smooth |
| v2 | 13 Nov 2026 | Mouth from real voice (closed/half/open), smooth motion | "talking worked properly now" |
| v3 | 13 Nov 2026 | 4 expressions from trigger words | "now it feels good" |
| v4 | 13 Nov 2026 | Spring motion, cross-fades, a move + effect per face | "feels live and very good" ✅ |
| v5 | 14 Nov 2026 | Money + confused faces, ~30 new words, look-around + crown wobble (mini rig), auto corner, laugh (off), overlay-only, branding files | — |
