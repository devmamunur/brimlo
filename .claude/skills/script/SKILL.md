---
name: script
description: Make or refresh a short recording script card for a Brimlo video — hook, opening, game-specific milestone lines, speed-up lines, ending and practice lines in simple English — so Mamunur can rehearse before live-commentary recording. Use for "/script", "write script", "what should I say", "practice lines", "how do I start/end the video".
argument-hint: "[game name or videos/ file]"
---

# /script

Mamunur records **live commentary** in English (second language). He needs a **card**, not a full script: a strong opening, lines for key moments, and a clean ending — practiced 2–3 times before recording.

## Steps

1. Find the video file in `videos/` (by game name or path). If none exists, suggest `/new-video` instead, or write the card into the reply if he only wants the script.
2. Read `playbook/hooks-and-scripts.md` (especially "The first 2 minutes rule") and `playbook/phrase-bank.md`.
3. Learn the game's real mechanics (web search the Steam page / reviews if needed) so milestone lines fit the actual game (resources, upgrades, prestige name, enemies, floors…).
4. Write the card into the video file's "Recording script" section (replace the old one):
   - **Before you press record**: which menus, settings, language screens and story text to finish *before* starting OBS (or to cut), so the video starts on gameplay.
   - **First sentence**: the goal with a big number from this game, said while already playing (hook formula 7). One line, max ~12 words.
   - **First action (by 0:05)**: the exact click / dig / shot to do while saying the first sentence.
   - **Where it ends (0:10–0:30)**: 1–2 sentences, Seabun style: "In one hour I'll have [X]. This is how I got there."
   - **Cold open** (optional, for `/hook` later): which late-game moment to show, max 10 s, voice-over says the goal number.
   - **Subscribe line (~2:00)**: one sentence.
   - **Running joke**: one simple bit for this game (a name, a "rival", a repeat line), plus 2 places to use it.
   - **Score lines**: 3, reading this game's real counter aloud ("[X] out of [Y]…", "Next goal: [Z]").
   - **Milestone lines**: 6–10, named after this game's real mechanics, with `[X]` placeholders for numbers. Short, with a number. Never "read the upgrade text".
   - **Speed-up / skip lines**: 2 (e.g. "Let me skip ahead a bit").
   - **Thinking-out-loud lines**: 2–3.
   - **Ending**: verdict + who it's for + price/demo + close (4–5 sentences).
   - **Practice lines**: 5, the hardest/most important ones.
   - The **first sentence** must always be one of the practice lines.
5. Reply with the first sentence, the "before you press record" list and the practice lines (so he can start practicing), plus the file path.

## Style rules

- Short sentences (max ~12 words). Common words. Present tense.
- Must sound natural when spoken by a calm, honest person. No hype words he wouldn't say.
- No jokes that depend on fast native timing. Light, simple humor is fine ("Oh no… okay, it's fine.").
- Avoid hard-to-pronounce words where a simple one works.
- Never write a "what is this?" tour, "hello, welcome", or lines that read menu/story text aloud in the first 2 minutes. Viewers left at exactly those moments (retention data, 28 Oct 2026).
- Positive lines for slow parts ("Okay, patience. We'll get there."), not complaints.
