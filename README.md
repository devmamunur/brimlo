# Brimlo — YouTube Channel OS

This folder is the **brain** of the Brimlo YouTube channel (@BrimloIdle).
It keeps the plan, every video, the scripts, the research and the stats in one place.
When you open Claude Code here, Claude reads `CLAUDE.md` and knows everything about the channel.

---

## 1. How to start

1. Open this folder in VS Code (or a terminal).
2. Start Claude Code.
3. Ask: **"What should I do today?"**
   Claude checks the calendar and the log and tells you what's due.

That's it. You don't need to remember where files are.

---

## 2. Commands you will use

Type these in Claude Code.

| Command | When | Example |
|---|---|---|
| `/new-video` | Planning a video (titles, thumbnail, hook, recording script, chapters, description) | `/new-video Rock Crusher` |
| `/script` | Only the recording script + practice lines | `/script I Am Plague` |
| `/titles` | Title and thumbnail ideas, or check your title | `/titles Sorting Inc` |
| `/pick-game` | Choosing the next game (scouts new demos, checks Mac, scores games) | `/pick-game next fest` |
| `/publish` | After you record, schedule or publish a video | `/publish Digging a Hole scheduled "My title" 14 Oct` |
| `/weekly-review` | Every Sunday — paste your Studio numbers or a screenshot | `/weekly-review` |

You can also just talk normally: *"I scheduled the Rock Crusher video for Tuesday"* — Claude will update the log.

---

## 3. Your week

| Day | What | Command |
|---|---|---|
| Mon | Scout new games (30 min) | `/pick-game` |
| Tue | Video goes live | `/publish` |
| Wed | Test weekend games on Mac / CrossOver (30 min) | |
| Thu | Prepare titles + script, **practice the opening** (30 min) | `/new-video`, `/script` |
| Fri | Video goes live | `/publish` |
| Sat | Record + edit + upload video A | |
| Sun | Record + edit + upload video B, then weekly review | `/weekly-review` |

Upload time: **12 PM US Eastern** = **10 PM Dhaka** (until 31 Oct) / **11 PM Dhaka** (from 1 Nov 2026).

Full routine: [plan/weekly-routine.md](plan/weekly-routine.md)

---

## 4. Before every recording (practice)

1. Open the video file in `videos/` (made by `/new-video`).
2. Read the **Recording script** section.
3. Say the **opening** and the **5 practice lines** out loud, 3 times each.
4. Keep [playbook/phrase-bank.md](playbook/phrase-bank.md) open on a second screen while you play.
5. Press the OBS marker key at every big moment.

---

## 5. Folders

```
CLAUDE.md            Claude's brain (rules + where things are)
README.md            This guide

channel/
  profile.md         Name, handle, brand, description, tools
  strategy.md        How the channel wins (format, frequency, games, packaging)
  status.md          Current numbers, YPP progress, open to-dos

plan/
  roadmap.md         3-month plan (Oct 2026 – Jan 2027) and checkpoints
  calendar.md        Week-by-week upload calendar  ← what's next
  weekly-routine.md  What to do each day

videos/
  log.md             Full log of every video + results
  _template.md       Template for a new video
  2026-10-16-....md  One file per video (titles, script, chapters, results)

games/
  backlog.md         Owned games, free sources, candidates, Mac status
  checklist.md       Score a game before recording it

playbook/
  titles.md          Title templates and rules
  thumbnails.md      Thumbnail rules
  hooks-and-scripts.md   How to start, run and end a video
  phrase-bank.md     Simple English sentences for live commentary
  recording-and-editing.md   OBS setup, markers, light edit, storage
  upload-checklist.md        Check before every upload
  monetization-and-policy.md YPP, money, Bangladesh tax, policy risks

research/
  competitors.md     Channels to learn from
  keywords.md        vidIQ keyword data
  reports/           Full research reports
  notes/             Notes behind the reports

analytics/
  weekly-reviews.md  Sunday review log

archive/             Old plans (history only — don't follow)

.claude/
  skills/            The slash commands above
  agents/            Research helpers:
                       game-scout      (finds new games, web only)
                       channel-analyst (vidIQ data — uses credits)
```

---

## 6. vidIQ credits

vidIQ is connected, but credits are limited. Claude checks the balance first and **asks before spending more than 10 credits**. Most vidIQ calls cost 5 credits.

To let Claude read your own channel stats, authorize the channel once: ask Claude *"connect my YouTube channel to vidIQ"*.

---

## 7. Keep it true

The system only works if the log is correct. After every upload or schedule, run `/publish` (or just tell Claude). Every Sunday, run `/weekly-review`.

---

## 8. Main rules (short)

- One game = one video. **No series.**
- Talk while you play. **No long silent parts** — speed them up.
- Put **"incremental"** in titles. Never use other creators' names.
- New games first (demos, playtests, launches). Be early.
- Free games first. Max **$10–15 a month** on games.
- Test every game on Mac / CrossOver before planning it.
- Tired two weeks in a row? Drop one video a week. **Don't stop.**
