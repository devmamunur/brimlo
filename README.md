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
| `/today` | What to do now, this week, what is overdue | `/today` |
| `/new-video` | Planning a video before recording (A/B/C titles, thumbnail, script) | `/new-video Rock Crusher` |
| `/script` | Only the recording script + practice lines | `/script I Am Plague` |
| `/finish-video` | After recording: A/B/C titles, description, chapters, thumbnail prompt from the real video | `/finish-video /Volumes/WD Black/Videos/Game.mov` |
| `/titles` | Title and thumbnail ideas, or check your title | `/titles Sorting Inc` |
| `/hook` | Build the first 10 seconds in DaVinci Resolve | `/hook Pack Ripper` |
| `/pick-game` | Choosing the next game (scouts new demos, checks Mac, scores games) | `/pick-game next fest` |
| `/publish` | After you record, schedule or publish a video | `/publish Digging a Hole scheduled "My title" 14 Oct` |
| `/weekly-review` | Every Sunday — paste your Studio numbers or a screenshot | `/weekly-review` |

You can also just talk normally (*"I scheduled the Rock Crusher video"*, *"what should I do today?"*). Claude picks the right command by itself (table in `CLAUDE.md`).

---

## 3. Your week

3–4 videos a week, **no fixed days**, always published at **10 PM Dhaka**. Make a video on one day, publish it on another. Hot games go first (🔥 FAST). Full routine: [plan/weekly-routine.md](plan/weekly-routine.md)

---

## 4. Before every recording (practice)

1. Open the video file in `videos/` (made by `/new-video`).
2. Read the **Recording script** section.
3. Say the **opening** and the **5 practice lines** out loud, 3 times each.
4. Keep [playbook/phrase-bank.md](playbook/phrase-bank.md) open on a second screen while you play.
5. Press the OBS marker key at every big moment.

---

## 5. Folders

The full map (folders, tools, which command for which request) is in [CLAUDE.md](CLAUDE.md).

---

## 6. vidIQ

vidIQ is connected and authorized for the Brimlo channel (6 Nov 2026). Claude uses it freely for analytics, keywords and title checks. Impressions and CTR are only in YouTube Studio.

---

## 7. Keep it true

The system only works if the log is correct. After every upload or schedule, run `/publish` (or just tell Claude). Every Sunday, run `/weekly-review`.

---

## 8. Main rules (short)

- One game = one video. **No series.**
- Talk while you play. **No long silent parts** — speed them up.
- Titles: the Brimlo title system (no game name, A/B/C test every video). Never use other creators' names.
- New games first (demos, playtests, launches). Be early.
- Free games first. Max **$10–15 a month** on games.
- Test every game in CrossOver Steam (main) or Mac Steam before planning it.
- Tired two weeks in a row? Drop one video a week. **Don't stop.**
