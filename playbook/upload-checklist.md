# Upload checklist

Run through this before every upload. After uploading, run `/publish`.

## Video

- [ ] First sentence = the goal with a big number (cold open, if any, max 10 s)
- [ ] Real gameplay by 0:05 (0:10 with a cold open)
- [ ] No menus, story text or "what is this?" tour in the first 2 minutes
- [ ] Subscribe line near 2:00
- [ ] No silence longer than ~3 s; grind sped up or cut
- [ ] Voice clear over game sound
- [ ] Short honest verdict at the end

## Title

- [ ] Uses a pattern P1–P7 from the Brimlo title system in [titles.md](titles.md)
- [ ] No game name, no "|", no "incremental", no "Demo" in the title (game name + "demo" go in the description and tags)
- [ ] True to the video (every number/claim happens on screen)
- [ ] Title Case, 30–55 characters, max one CAPS word, no emoji
- [ ] Title A/B test set up in Studio (A = live title, B + C from the video file)
- [ ] No other creators' names

## Thumbnail

- [ ] House style v3: 2D cartoon, navy+gold POV hands **doing the job**, one big object close up, background full of the game world/resource, **no text** (or a true progress number / in-game word), never the title's words
- [ ] Made with the master prompt + AVOID part in [thumbnails.md](thumbnails.md); object looks like the real game
- [ ] Readable at phone size
- [ ] No corner boxes and no mascot/logo stamp in any corner
- [ ] No number on it that I did not read on screen
- [ ] Title, thumbnail and first 30 seconds promise the same thing

## Description

```
[Line 1: one short personal line, e.g. "This one was really fun. Help Brimlo reach 100 subs :)"]
[Line 2: game name + "incremental game" + the hook, one sentence]
[Line 3: demo / playtest / launch info if relevant]
CURRENT SUBS: [real number from Studio]

Calm, full-length gameplay to relax or fall asleep to. You rest. I'll keep going.
Which game should I play next? Tell me in the comments.

🎮 [Game] on Steam: [link]
Developer: [name]

Chapters
00:00 [Cold open title]
00:30 [...]
...

#incrementalgame #[GameName] #idlegame
```

## Chapters

- [ ] First one is **00:00**
- [ ] At least **3** chapters, each at least **10 seconds**
- [ ] **Max 10 chapters, only the important moments**, made from the real captions after publish (Mamunur, 25 Oct 2026). Never guess times.
- [ ] Named by progress ("First Prestige", "1 Million Gold"), not "Part 1"

## Settings

- [ ] Tags (10–15, they matter little): game name in 3–4 forms + 1–2 common misspellings + "[game] gameplay / full playthrough" + genre words (incremental game, idle game, bullet heaven / tower defense if true) + "relaxing gameplay" + "gameplay to fall asleep to" (true for every Brimlo video: calm, full-length; matches the description line) + brimlo. No junk tags. Never "ASMR", "no talking" or "sleep" alone: we talk all video.
- [ ] Category: Gaming · Language: English · **Not made for kids**
- [ ] Altered/synthetic content: No (unless you used AI visuals)
- [ ] **End screen** (set on all 11 public videos, Fri 6 Nov 2026). Same 3 elements on every video, last 20 seconds:
  1. Video → **Best for viewer** (YouTube picks the best next video for this person)
  2. Playlist → the video's **genre playlist** (the first name in its Playlists row; never the demo list)
  3. Subscribe
  - Fast way: End screen → **Import from video** → pick a video that is in the same genre playlist → Save.
  - The last 20 seconds must not hide anything important: keep talking ("thanks for watching…") over gameplay, no text there.
- [ ] Add to playlists — the video file's **Playlists** row says which. Use the 4 names below **exactly** (made in Studio 6 Nov 2026). Never rename them and never invent a new one; if a game fits none, ask Mamunur before making a 5th. Rule: **1 genre list** + the demo list if it is a demo, playtest or itch.io game:
  - **Incremental Games: Numbers Go UP** — idle, incremental, clicker
  - **Satisfying Upgrade Games** — cleaning, restoring, digging, sorting, job sims with upgrades
  - **Survivor-Like Games: Weak to OP** — survivor-like, bullet heaven
  - **New Steam Demos Played to 100%** — every demo, playtest or itch.io game (extra list, on top of the genre list)
- [ ] Test & Compare (if available): 2–3 thumbnails or titles
- [ ] **Scheduled for 10 PM Dhaka** (12 PM ET until 31 Oct 2026; 11 AM ET from 1 Nov 2026)

## After it's live

- [ ] **Fix the subtitles** (same day, once the automatic captions exist): run the subtitle cleaner in [tools/subtitles/](../tools/subtitles/README.md) and upload the file in Studio (Edit subtitles → ⋮ → Upload file → Publish). Auto captions get an accent wrong; good subtitles help viewers understand you (JonnyBebop's viewers praise his). The chapters are made from these captions too.
- [ ] **Pin your own comment** right after publishing: one funny moment or extra fact from the video + "Which game should I play next?"
- [ ] **Reply to every comment** in the first 48 h, short and friendly. marqujj does this and gets 150–376 comments per video.
- [ ] Game suggestions from comments → write them in `games/backlog.md`. When you play one, say "You suggested this one" in the video and the description.
- [ ] Run `/publish` so the log and calendar stay true
