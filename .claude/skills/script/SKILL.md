---
name: script
description: Make or refresh a short recording script card for a Brimlo video — a simple story, first 10 seconds, first 2 minutes, game-specific lines, running joke, ending, practice lines and a word list with Bangla meanings, all in very simple English — plus the A/B/C titles. Use for "write script", "what should I say", "practice lines", "how do I start the video", "how do I end the video", "help me talk in the video", "opening line", or "/script" — before recording.
argument-hint: "[game name or videos/ file]"
---

# /script

Mamunur records **live commentary** in English. English is his second language (Bangladesh). He needs a **card**, not a full script: a simple story, a strong first 10 seconds, a busy first 2 minutes, lines for big moments and a clean ending. He practices it 2–3 times before recording.

**Format:** [playbook/script-card/template.md](../../../playbook/script-card/template.md) — copy it and fill every `[ … ]`. **Approved examples** (learn the shape and English level, never copy lines or jokes): [playbook/script-card/examples/](../../../playbook/script-card/examples/). Format approved by Mamunur on Fri 6 Nov 2026.

## Steps

1. **Find the video file** in `videos/` (by game name or path). If none exists, create it from `videos/_template.md` and add it to `videos/log.md` and `plan/calendar.md` (or suggest `/new-video` if the whole plan is missing).
2. **Read** `playbook/hooks-and-scripts.md` ("The first 2 minutes rule" and "Simple words") and `playbook/phrase-bank.md`.
3. **Learn the game from real play, not from memory:**
   - `brimlo_steam_game` / `brimlo_steam_reviews` for facts. If they fail, use a web search.
   - **Read 1–2 YouTube transcripts of the game** with `brimlo_video_transcript` (free). Pick the biggest recent English videos (Mamunur may send links). Use them to learn the real mechanics, the order of events and the timings.
   - Write in the file (template → "Research block"): a short "Game facts" list (resources, costs, enemies, goals, ending), a **timing table** ("When things happened in their videos": first rain/enemy/new area/big unlock/ending, with times), and one line on **what they did badly that we don't do** (e.g. "Welcome…", reading help text, reading the whole upgrade menu, stopping halfway).
   - Note the on-screen counter (e.g. "333 cm", "coins", "fish 12/18"). Score lines read it aloud.
4. **Write the card** into the "Recording script" section (replace the old one), using `playbook/script-card/template.md`. Put the research (facts + timing table) in the template's "Research block" above the script. The 14 sections, in order:
   1. **The story of this video** (3–5 short lines): me, a small problem, a big end. **The hero is always me ("I")** (Mamunur, 8 Nov 2026): no named character, no "Bob", no "Kevin". Mamunur is the one in the game world: "I'm alone on this roof." / "I'm one tiny mushroom." Nobody else is in the story. Write it in first person: "I'm alone on this roof. Thousands of zombies are coming." A new story every video.
   2. **Words you will use (with Bangla)**: a table of the 12–20 game words he will say: `Word | Bangla | Say it like`. Include the game name's pronunciation and any hard animal/object names. Explain game words in a few words ("node (a stop point on the root, game word)").
   3. **Before you press record**: what to finish before OBS (purchase/run check, new save, naming screen, settings, language, story text), where OBS starts, "don't read the help text", "don't open the upgrade menu in the first 2 minutes", which screenshots to take.
   4. **Cold open** (optional, for `/hook` later): which end moment to show, max 10 s, one voice-over line.
   5. **First 10 seconds**: a table `Time | On screen | Say` with 3 rows (0:00, ~0:03, ~0:07). Row 1 says where I am and how small I am ("I'm alone on this roof."), while the mouse points at the start. Row 2 = the first action + the goal with a number. Row 3 = the big dream.
   6. **0:10 – 0:30**: "Right now X is small. At the end of this video… I'll play the whole game today, all the way to the end." + a line that explains the main cost in one sentence.
   7. **First 2 minutes**: a table `When | Do | Say` — something new every 15–20 seconds (first resource, first build, first blocker, first enemy, first free/bonus event from the timing table), plus a backup line if the event comes late. Plant 1–2 **"Not yet"** promises (a blocker or thing you can't use yet) that you pay off later with "Remember…?".
   8. **Subscribe line (~2:00)**: tied to the story, short, then back to playing: "Want to see if I can stay alive? Subscribe and stay with me." **Don't add an upload-plan sentence** ("I finish a new game every few days" ✗, Mamunur, 6 Nov 2026) — it turns the line into an ad.
   9. **Running joke**: from this game's real events (enemies, a rival, a strange rule). 5–7 lines for different moments; "use it 4–5 times, not more". Say which jokes not to reuse (check the last 3 video files).
   10. **Score lines**: 3–4, reading the real on-screen counter with `[X]`.
   11. **Lines for big moments**: a table `Moment | Say`, 12–16 rows named after the game's real mechanics, with `[X]` numbers, including the "Remember…?" payoffs, a before-and-after line, a slow-part skip line and a waiting line.
   12. **Thinking out loud**: 3 lines.
   13. **Ending**: 4 short, warm lines, like finishing a story for friends: "And that's it! I was just [tiny start]. And look at me now. [result with numbers]." → "My favorite part? [X]." (good part only) → "If you like calm games where something small gets really big, you'll like this one." → "Thanks for watching. See you next time." **Don't add** (Mamunur, 6 Nov 2026): a bad part, price or "link in the description", a joke/story close line, "Which game should I play next? Tell me in the comments", or "You rest. I'll keep going."
   14. **Practice lines**: 5 (the first 10 seconds lines + the hardest ones). The first line of the video is always line 1.
5. **Titles:** if the file has an A/B/C set, repeat it; if not, make one (`playbook/titles.md` → "A/B/C title set"), score with `brimlo_score_title`, and save it. The first 10 seconds must fit title A. Note which claim each title needs to be true.
6. **Reply** in chat as plain text (no HTML): the A/B/C titles (one code block), the **playlist(s)** in one line (exact names from `playbook/upload-checklist.md` → Settings), the first 10 seconds, the "before you press record" list, the 5 practice lines, and the file path. Keep the reply short; the full card is in the file.

## Simple English (most important style rule)

Mamunur must understand every word on first read and say it without stopping. Write like for a learner at about A2–B1 level.

**The voice: telling a story to friends, not giving a university presentation** (Mamunur, 6 Nov 2026). Use "I", "we" and "you". The hero is always "I" (no character names, 8 Nov 2026). Use small reactions ("Oh no.", "Nice!", "Wait…", "Okay, okay."), little opinions ("I like this part.") and talk to the viewer ("Look at this."). No announcing or summary lines ("In this video we will explore…", "Start to end, in one video."), no lists of features, no formal words.

**Keep it clean** (Mamunur, 6 Nov 2026): every line must earn its place. No extra sentences, no ad-like add-ons (upload plans, price, "link in the description", "tell me in the comments", taglines), no filler. When in doubt, cut the line. Short and warm beats long and complete.

- Max ~10–12 words per line. One idea per line.
- **Correct tense in every line, from the first second to the end** (Mamunur, 6 Nov 2026). Ask for each line: is this happening now, will it happen later, or did it already happen?
  - **Now** (what is on screen) → present: "I'm one tiny mushroom." · "It's raining!"
  - **Later in the video / at the end** (the hook, the first 10 seconds, the 0:10–0:30 promise, "Not yet" lines) → **will** or **going to**: "At the end of this video, my roots will be everywhere." · "I'm going to eat the whole forest." Never present tense for a future thing ("my roots are everywhere" ✗).
  - **Already done** (payoffs, before-and-after, ending) → past: "Remember the rock? I couldn't go through it." · "I was one tiny mushroom. Now…"
  - Before saving, read every line of the hook, first 10 seconds and 0:10–0:30 once only for tense.
- Use the most common word. Swap hard words (full list in `playbook/hooks-and-scripts.md` → "Simple words"), e.g. somewhere → "under / here", bully/enemy → "bad guys / animals", network → "roots / my roots", patience → "Okay. Slowly.", honestly → drop it, thirsty → "needs water", reached → "got to", tasks for "evolution tasks".
- **Simple words everywhere in the file** — game facts, research notes and tables too, not only the spoken lines.
- Use plain words for game actions, not the game's jargon: "water", "food", "grow", "roots" — not "shots", "hyphae", "yield". Use the game's word only if it's on screen all the time (e.g. "node"), and explain it once in the word list.
- No idioms, no slang, no wordplay that needs native timing. Light jokes only ("Smart crow.", "Sorry, worm.").
- No words that are hard to say for a Bangla speaker if an easy one works (avoid long words with many "th", "r" + "l" clusters).
- Calm, kind, honest voice. No hype.
- **Sound like a person talking, not an AI script** (Mamunur, 6 Nov 2026). No slogan-like fragments with no subject or verb ("Start to end, in one video." ✗). Write a full, casual sentence with "I" or the hero ("I'll play the whole game today, all the way to the end." ✓). Read each line aloud in your head after the line before it: if a friend wouldn't say it like that, rewrite it.
- Never in the first 2 minutes: "Hello, welcome", "what is this?" tours, reading menus, help text or story text (retention data, 28 Oct 2026).
- Slow parts: positive lines ("Okay. Slowly. We'll get there."), never complaints.
- Before saving, re-read every line once and ask: "Would a Bangladeshi learner know every word?" If not, change the word.
