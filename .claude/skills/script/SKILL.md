---
name: script
description: Make or refresh a short recording script card for a Brimlo video — a simple story, first 10 seconds, first 2 minutes, game-specific lines, running joke, ending, practice lines and a word list with Bangla meanings, all in very simple English — plus the A/B/C titles. Use for "write script", "what should I say", "practice lines", "how do I start the video", "how do I end the video", "help me talk in the video", "opening line", or "/script" — before recording.
argument-hint: "[game name or videos/ file]"
---

# /script

Mamunur records **live commentary** in English. English is his second language (Bangladesh). He needs a **card**, not a full script: a simple story, a strong first 10 seconds, a busy first 2 minutes, lines for big moments and a clean ending. He practices it 2–3 times before recording.

**Model card (copy its shape and its level of English):** [videos/2026-11-08-mycelarium.md](../../../videos/2026-11-08-mycelarium.md) → "Recording script". Mamunur approved this format on Fri 6 Nov 2026.

## Steps

1. **Find the video file** in `videos/` (by game name or path). If none exists, create it from `videos/_template.md` and add it to `videos/log.md` and `plan/calendar.md` (or suggest `/new-video` if the whole plan is missing).
2. **Read** `playbook/hooks-and-scripts.md` ("The first 2 minutes rule" and "Simple words") and `playbook/phrase-bank.md`.
3. **Learn the game from real play, not from memory:**
   - `brimlo_steam_game` / `brimlo_steam_reviews` for facts. If they fail, use a web search.
   - **Read 1–2 YouTube transcripts of the game** with `brimlo_video_transcript` (free). Pick the biggest recent English videos (Mamunur may send links). Use them to learn the real mechanics, the order of events and the timings.
   - Write in the file: a short "Game facts" list (resources, costs, enemies, goals, ending), a **timing table** ("When things happened in their videos": first rain/enemy/new area/big unlock/ending, with times), and one line on **what they did badly that we don't do** (e.g. "Welcome…", reading help text, reading the whole upgrade menu, stopping halfway).
   - Note the on-screen counter (e.g. "333 cm", "coins", "fish 12/18"). Score lines read it aloud.
4. **Write the card** into the "Recording script" section (replace the old one). Same sections, same order as the model card:
   1. **The story of this video** (3–5 short lines): a small hero, a small problem, a big end. Often: give the main thing a funny human name (e.g. "Kevin" the mushroom) if the game lets you name it. **Never name it Brimlo** (Brimlo is the channel; it confuses the story). A new name and story every video.
   2. **Words you will use (with Bangla)**: a table of the 12–20 game words he will say: `Word | Bangla | Say it like`. Include the game name's pronunciation and any hard animal/object names. Explain game words in a few words ("node (a stop point on the root, game word)").
   3. **Before you press record**: what to finish before OBS (purchase/run check, new save, naming screen, settings, language, story text), where OBS starts, "don't read the help text", "don't open the upgrade menu in the first 2 minutes", which screenshots to take.
   4. **Cold open** (optional, for `/hook` later): which end moment to show, max 10 s, one voice-over line.
   5. **First 10 seconds**: a table `Time | On screen | Say` with 3 rows (0:00, ~0:03, ~0:07). Row 1 introduces the hero while the mouse points at it. Row 2 = the first action + the goal with a number. Row 3 = the big dream.
   6. **0:10 – 0:30**: "Right now X is small. At the end of this video… Start to end, in one video." + a line that explains the main cost in one sentence.
   7. **First 2 minutes**: a table `When | Do | Say` — something new every 15–20 seconds (first resource, first build, first blocker, first enemy, first free/bonus event from the timing table), plus a backup line if the event comes late. Plant 1–2 **"Not yet"** promises (a blocker or thing you can't use yet) that you pay off later with "Remember…?".
   8. **Subscribe line (~2:00)**: tied to the story ("Do you want to see how big Kevin gets? Subscribe…").
   9. **Running joke**: from this game's real events (enemies, a rival, a strange rule). 5–7 lines for different moments; "use it 4–5 times, not more". Say which jokes not to reuse (check the last 3 video files).
   10. **Score lines**: 3–4, reading the real on-screen counter with `[X]`.
   11. **Lines for big moments**: a table `Moment | Say`, 12–16 rows named after the game's real mechanics, with `[X]` numbers, including the "Remember…?" payoffs, a before-and-after line, a slow-part skip line and a waiting line.
   12. **Thinking out loud**: 3 lines.
   13. **Ending**: 5 short lines: what happened (with numbers) → best part / bad part → who it's for + price → close the story/joke → "Thanks for watching… You rest. I'll keep going. See you next time." Price: say "a few dollars" or "free demo" unless the US price is checked.
   14. **Practice lines**: 5 (the first 10 seconds lines + the hardest ones). The first line of the video is always line 1.
5. **Titles:** if the file has an A/B/C set, repeat it; if not, make one (`playbook/titles.md` → "A/B/C test set"), score with `brimlo_score_title`, and save it. The first 10 seconds must fit title A. Note which claim each title needs to be true.
6. **Reply** in chat as plain text (no HTML): the A/B/C titles (one code block), the first 10 seconds, the "before you press record" list, the 5 practice lines, and the file path. Keep the reply short; the full card is in the file.

## Simple English (most important style rule)

Mamunur must understand every word on first read and say it without stopping. Write like for a learner at about A2–B1 level.

- Max ~10–12 words per line. One idea per line. Present tense.
- Use the most common word. Swap hard words (full list in `playbook/hooks-and-scripts.md` → "Simple words"), e.g. somewhere → "under / here", bully/enemy → "bad guys / animals", network → "roots / [hero]", patience → "Okay. Slowly.", honestly → drop it, thirsty → "needs water", reached → "got to", tasks for "evolution tasks".
- Use plain words for game actions, not the game's jargon: "water", "food", "grow", "roots" — not "shots", "hyphae", "yield". Use the game's word only if it's on screen all the time (e.g. "node"), and explain it once in the word list.
- No idioms, no slang, no wordplay that needs native timing. Light jokes only ("Smart crow.", "Sorry, worm.").
- No words that are hard to say for a Bangla speaker if an easy one works (avoid long words with many "th", "r" + "l" clusters).
- Calm, kind, honest voice. No hype.
- Never in the first 2 minutes: "Hello, welcome", "what is this?" tours, reading menus, help text or story text (retention data, 28 Oct 2026).
- Slow parts: positive lines ("Okay. Slowly. We'll get there."), never complaints.
- Before saving, re-read every line once and ask: "Would a Bangladeshi learner know every word?" If not, change the word.
