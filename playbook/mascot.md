# Brimlo mascot: guide

The moving Brimlo mascot (the gold bag with the crown) sits in the bottom-right corner of the video.
It talks when you talk, blinks, breathes, and reacts to your words. It is added **after** you edit,
so recording and editing stay the same as before.

- **Status:** approved look v4 (Mamunur, 13 Nov 2026: "now this feels live and very good"). **Test phase**: see "Test plan".
- **Skill:** `/add-mascot` (or just say "add the mascot to [video]").
- **Tool code:** [tools/avatar/](../tools/avatar/README.md) (technical details for the AI).

---

## 1. How the system works (simple)

```
Final export (.mov from Resolve)
   │
   ├─► Transcript (tools/transcribe)  ── every word + its exact time
   │        │
   │        ├─► Talking?      → mouth moves only while you say words
   │        └─► Trigger words → face changes ("oh my god" → wow)
   │
   ├─► Voice loudness (from the audio) → mouth closed / half / open
   │
   └─► add_avatar.py draws the mascot frame by frame and puts it on the video
            → "<name> - mascot.mov" (same length, same sound) → upload this file
```

What it does **not** use: no camera, no face tracking, no live app, no OBS change.

### What each part does

| Part | How it works |
|---|---|
| **Mouth** | Moves only during your words (so loud game sounds never move it). Your real voice loudness picks closed / half / open. |
| **Eyes** | Random blinks every 3–7 seconds. |
| **Body** | Soft "spring" motion like jelly: slow breathing, gentle sway, soft bob while talking. It never stands frozen. |
| **Expressions** | Your trigger words change the face for about 2 seconds, with its own move and effect (table below). |

### The 4 expressions

| Face | You say (most common first) | Move | Effect |
|---|---|---|---|
| 😮 **wow** | "oh my god", "oh god", "wow", "amazing", "huge", "insane", "what happened" | jumps up, stretches | gold "!" + stars |
| 😄 **happy** | "perfect", "let's go", "great", "beautiful", "finally", "awesome", "nice", "yes yes" | bouncy wiggle | gold sparkles |
| 😢 **sad** | "I died", "died", "dead", "lost", "oh no", "no no", "not good", "failed" | sinks, leans | sweat drop + tear |
| 🤔 **think** | "let's see", "what is this", "should I", "hmm", "interesting" | tilts head | teal "?" floats up |

These words come from **your own 11 videos** (about 16 hours). You don't need to change how you talk.
In Wipe Them Out (58 min) the face changed 99 times, about 1–2 times per minute.

The same face waits a little before it can show again (wow 4 s, happy/sad 6 s, think 25 s),
so it never changes too often.

### The 18 face pictures

`channel/brand/avatar/`: 6 normal faces (mouth closed / half / open, each with a blink version) +
4 expressions × 3 mouth sizes. They are all made from the channel logo by `tools/avatar/make_faces.py`.

---

## 2. Video making process (with the mascot)

| Step | What | Who / tool |
|---|---|---|
| 1 | Record with live commentary (no change) | OBS |
| 2 | Edit and export the **final** video (no change) | Resolve → `playbook/recording-and-editing.md` |
| 3 | Titles, description, chapters, thumbnail. This also makes the **transcript** of the final export. | `/finish-video` |
| 4 | **Add the mascot**: preview first, then the full video (~9 min per hour of video) | `/add-mascot` |
| 5 | Watch the preview + 2–3 random parts of the full file. Upload **"<name> - mascot.mov"** | you |
| 6 | Make the Short from the **normal** export (without the mascot; a corner mascot gets cut in 9:16) | `/make-short` |
| 7 | Log it | `/publish` |

**Important rules**

1. **The transcript must be made from the same final export.** If you change the edit and export again,
   make a new transcript first. Otherwise the mouth and faces will be out of sync.
2. **Preview first, always.** 90 seconds is about 15 seconds of work for the Mac. A full hour is about 9 minutes.
3. **Check the corner.** If the game shows money, HP or buttons in the bottom-right, use another corner
   (`--corner bl` = bottom-left, `tl` = top-left, `tr` = top-right).
4. **Storage:** the mascot file is about 6 GB per hour. Keep the normal export until the Short is made,
   then you can delete it (keep the mascot file, it is what's on YouTube).
5. Write **Mascot: yes / no** in the video file (`videos/<date>-<slug>.md`, top table) so we can compare later.

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
- Don't use it on a video if the corner covers important game info and no corner is free. Skip the mascot for that video.

---

## 4. Test plan (is it worth it?)

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

## 5. Future improvement plan

Only start these **after the test says "keep"**. Order = most value for the least work.

| # | Idea | Why | Work |
|---|---|---|---|
| 1 | **"Money eyes" face** for big numbers ("million", "billion", "max", "level up") | Fits the niche: numbers going up is the whole point | Small: 3 new faces + trigger words |
| 2 | **More trigger words** from new transcripts (check every ~10 videos) | Your words change with new games | Small: edit the `EXPR` list |
| 3 | **Confused / annoyed face** ("wait", "why", "come on") | More variety | Small |
| 4 | **Auto corner**: the tool picks a corner with no game HUD | Fewer manual checks | Medium |
| 5 | **Eyes look around** (pupils move on their own) | Feels more alive | Medium: split the eyes into layers |
| 6 | **Crown wobbles** after a jump (separate crown layer) | Professional "secondary motion" | Medium |
| 7 | **Laugh face** ("haha") from the sound itself | Whisper never writes laughs | Medium-hard; may be wrong often |
| 8 | **Mascot in branding**: thumbnail corner sticker, end screen, channel banner | Builds a recognizable brand | Small (design only) |
| 9 | **Overlay-only file** (transparent .mov) to place by hand in Resolve | For videos where you want full control | Medium |
| 10 | **Full Live2D rig** (real separate parts, like VTubers) | Most alive | Big (many hours or paid artist): only if the mascot clearly helps |

---

## 6. History

| Version | Date | What changed | Feedback |
|---|---|---|---|
| v1 | 13 Nov 2026 | 2 faces, mouth on a fixed rhythm, jumps | "soulless", random, not smooth |
| v2 | 13 Nov 2026 | Mouth from real voice (closed/half/open), smooth motion | "talking worked properly now" |
| v3 | 13 Nov 2026 | 4 expressions from trigger words | "now it feels good" |
| v4 | 13 Nov 2026 | Spring motion, cross-fades, a move + effect per face | "feels live and very good" ✅ |
