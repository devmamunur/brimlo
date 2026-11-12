---
name: short-details
description: Write the A/B/C titles, description and tags for a Brimlo Short and fill them in YouTube Studio in Chrome — title, description, tags, game title, related video (the full long video), no playlist — then save and check. Use when Mamunur sends a studio.youtube.com/video/<id>/edit link for a Short, or says "short title", "short description", "tags for the short", "fill the short in studio", "/short-details".
argument-hint: "[YouTube Studio edit link of the Short] [optional: long video or game name]"
---

# /short-details

The Short is already uploaded (scheduled or private). Running this command with the edit link **is his OK to fill in and save** title, description, tags, game title and related video. **Do not change** visibility, schedule time, audience (not made for kids), thumbnail, or anything else.

## 1. Know the Short

- Open the link in **Chrome** (Claude in Chrome; read the `chrome-browser` skill first). Read the page text: check it **is a Short** (length ≤ 3:00, link `youtube.com/shorts/…`), and note the file name and the current title.
- Find which long video it came from: the newest `## Short` section in `videos/*.md` with status "made", or the name he gave. Read its plan `tools/shorts/plans/<slug>.json` (the moments and captions = what the Short really shows) and the long video's YouTube ID.
- Check the game today with `brimlo_steam_game` (release date, demo or full game). Never write a date you did not check.

## 2. Write the details

**Titles: an A/B/C set** (CLAUDE.md, `playbook/titles.md` → "A/B/C title set"). A = live; B and C are swap titles in different patterns.
- Game name **by game type** (`playbook/titles.md` → "Game name: decide by game type"): survivor/horde/zombie/action → hook first, ` | Game Name` at the end. Cozy/satisfying/sim/clicker → a story title with no game name.
- Built from the moment the Short shows: the reveal, the fail, the big number, the win. Every claim is true in the Short (memory: titles must match the video). Title Case, one CAPS word, ≤ ~60 characters with the name. No "Demo" in the title, no emoji, no "#shorts" in the title, no other creators.
- Score the 3 titles with `brimlo_score_title` (keyword = the main word, e.g. the item or the game). It is an **estimate**, and the truth wins over the score.

**Description** (short, simple English):
```
[2 sentences: what happens in this Short, in first person, true]

[Game] is a [genre in plain words]. [One line on how it plays.]

▶ Watch the full run: https://www.youtube.com/watch?v=<long video ID>

🎮 [Game] on Steam ([free demo / out now]): <store link>
[Release line only if checked today]

Help Brimlo reach [next goal] subs :)

#[GameNameNoSpaces] #[genre word] #[genre word]
```
Never write upload days. No chapters in a Short.

**Tags:** 12–16 tags, ≤ 500 characters. Game name forms first (Game, Game gameplay, Game + item/moment, Game demo if it is a demo), then genre words (vidIQ `vidiq_keyword_research` on the genre once if unsure), then 1–2 broad words (new indie games, steam demo, incremental games). No creator names.

**Other fields:** Game title = the game (pick the exact match in the list). **Related video = the long video.** **Playlists: none**: Shorts never go in playlists (Mamunur, 13 Nov 2026).

## 3. Fill Studio in Chrome

Studio UI notes (they worked on 13 Nov 2026):
- **Title / description** are `#textbox` boxes: click the box, `cmd+a`, type the new text. When typing `#` in the description, a hashtag menu opens; press Escape after typing.
- **Tags:** `find` "Tags" textbox (under "Show more"), click it, and type all tags comma-separated **with a comma at the end** so the last one becomes a chip.
- **Game title:** type the name, wait 2 s, and click the exact match in the dropdown (the first item, without a year).
- **Related video:** click the "Related video" card (right column), wait, and click the long video's tile in the grid. Typing in the search box did not work. Check that the card shows the long video's title.
- **Playlists:** leave it at "Select". If a playlist is ticked, untick it.
- **Save** (top right). Wait 3 s, then check: a "Changes saved" toast, and a JS read-back of the title (`document.querySelector('#textbox').innerText`), the playlist box (`ytcp-video-metadata-playlists` innerText = "Select"), and `#save` `aria-disabled="true"`.
- Close the tab you opened.

If a step fails twice, stop and tell him what is left to do by hand. Do not keep trying.

## 4. Log and reply

- Update the long video's file → `## Short` section: status "scheduled"/"published" (as Studio shows), the Short link, the A/B/C block, tags, "Related video: <long video>", "Playlists: none".
- Reply in simple English: the A/B/C block (one code block), the description, the tags, what was set in Studio, and one tip if Studio showed a "high impact" fix. Remind him: if the Short is weak after 2–3 days, swap to B by hand. No Studio A/B test.
