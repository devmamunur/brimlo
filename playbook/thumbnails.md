# Thumbnails

1280×720. Made with GPT image or Gemini (Nano Banana) from one prompt, reviewed by Mamunur, fixed with a follow-up message if needed.

## House style v3 — "My hands are doing the job" (default from 6 Nov 2026)

Mamunur's decision (6 Nov 2026), after studying 12 Azrilich thumbnails (median 92K views) and 6 small channels. Reference screenshots: [grid 1](thumbnail-examples/2026-11-06-azrilich-grid-1.webp), [grid 2](thumbnail-examples/2026-11-06-azrilich-grid-2.webp). We copy the **rules**, not the look: our hands wear **Brimlo navy sleeves with a gold cuff** (Azrilich uses white gloves).

### What Azrilich does (12 thumbnails, 6 Nov 2026)

| Thing | What we saw |
|---|---|
| Text | **11 of 12 have no text.** The only words are part of an object in the game (the lottery ticket says "FIND", a paper says "NOTICE OF TERMINATION") |
| Hands | 11 of 12: two big cartoon hands, first-person view, **doing the job right now** (peeling a potato, holding a fish, spraying the flesh wall, hammer + chisel on an egg, shovel on Mars) |
| Center | One big object, very close to the camera, 40–60% of the picture |
| Background | **The game's own world or the resource in a huge amount** (a sea of potatoes, crates of fish, a mountain of balls, an ocean full of trash). No rays, no plain color |
| Colors | Very bright and saturated. Dark games stay dark but strong (red flesh wall, purple sky), never grey or muddy |
| Lines | Thick black outlines, flat colors, a light white edge around the main things so they pop |
| Joke | A small funny detail that matches the title: the jellybean has a face, the egg has an eye, the king is tired of bottle flips |
| Title + thumbnail | The thumbnail **shows the action**, the title **tells the joke**. They never say the same words |

```
┌──────────────────────────────────────────┐
│   the game's world / a sea of resource   │  ← fills the whole background
│                                          │
│        [ ONE BIG OBJECT, CLOSE ]          │  ← 40–60%, one small funny detail
│                                          │
│  🧥✋ tool  → doing the job ←  item ✋🧥   │  ← navy sleeves + gold cuff
│                (no text)                 │
└──────────────────────────────────────────┘
```

### The rules (v3)

1. **Style:** 2D cartoon vector, thick bold black outlines, flat cel-shaded colors, very bright and saturated, a thin white edge around the hands and the main object. Never photorealistic, never 3D render.
2. **Hands doing the job:** two big first-person cartoon hands from the bottom corners, wearing **navy (#0B1023) sleeves with a thin gold (#FFC83D) cuff**. **Bare peach-skin hands, never gloves** (11 Nov 2026: the AI copied SHRED A BILLION's black gloves from the screenshot; every other Brimlo thumbnail has bare hands, keep the look the same). They do the game's main action **right now**: peel, sort, crack, dig, feed, scrape, open. Not just holding a tool in the air. One hand is fine for a close-up of one item.
3. **One big object, close to the camera** (40–60% of the image): the thing the game is about. It must look like the real game's object.
4. **Background = the game's world or an absurd amount of the resource** (a sea of fish, a mountain of coins, the planet surface). No radial lines, no plain color.
5. **Colors:** bright for normal games. Dark or horror games may use dark red, purple or deep blue, but always strong and clear, never grey.
6. **One small funny detail** that matches the title (a face on the object, an angry boss, a warning sign). Only one.
7. **Text: none by default.** Allowed only in two cases:
   - **A true progress number or result is the whole idea** ("0.01%", "1 BILLION", "MAX", "0 TREES LEFT"). Max 3 words, top center, gold #FFC83D → #FF8A00, thick black outline.
   - **Words that are part of an object in the game** (a ticket, a sign, a screen, a note).
   - **Never repeat words from the title** (old mistakes: "FEED THE WORM", "WAY TOO MANY", "GOLDEN TICKET").
8. **Only numbers you saw in the game.**
9. **Final file:** exactly 1280×720, JPG or PNG, under 2 MB (not .webp).

### Pick the action (one per video)

| Game type | Hands do this | Example |
|---|---|---|
| Clean / scrape / restore | Tool on the dirty object | Hands with a fingernail scraping a dusty town |
| Sort / pick up | One hand holds one item up, the pile fills the back | Hand holds an orange fish, crates of fish behind |
| Crack / mine / dig | Hammer, pickaxe or shovel hitting the object | Hammer + chisel on a giant egg with an eye |
| Feed / grow | Hands throw or spray food at a hungry thing | Hands feed a tomato to a giant worm, ants all around |
| Open / gamble | Hands tear a pack or scratch a ticket | Hands rip a card pack, one golden card glows |
| Survivor / fight | Hand holds the weapon, the swarm or boss fills the back | Hand holds a minigun, a wave of zombies behind |

## The master prompt (one prompt for GPT or Gemini)

Attach 1–2 screenshots of the game (the main object and the world) so the AI copies the real shapes and colors. Fill the `[ ]` parts. Keep the "AVOID" part every time: it is the negative prompt.

```
Create a YouTube thumbnail, exactly 1280x720 pixels (16:9).

STYLE: bright 2D cartoon vector illustration. Thick bold black ink outlines on everything, flat cel-shaded colors, very high saturation, clean shapes, low detail, and a thin white edge around the hands and the main object so they pop. Use the attached [GAME] screenshots only as a reference for the shape and colors of [MAIN OBJECT] and [THE WORLD / RESOURCE], and redraw them in this cartoon style. Do not copy any text, numbers or menus from the screenshots.

HANDS: first-person view. Two big cartoon hands come in from the bottom-left and bottom-right corners. The hands are bare cartoon hands with warm peach skin (no gloves) and wear dark navy blue sleeves (#0B1023) with a thin gold cuff (#FFC83D). They are [DOING THE MAIN ACTION RIGHT NOW, e.g. peeling a giant potato with a red peeler].

CENTER: [MAIN OBJECT, e.g. one giant potato] very close to the camera, taking up about half of the image. It is the brightest and clearest thing in the picture. One small funny detail: [e.g. the potato looks scared].

BACKGROUND: the whole background is [THE GAME'S WORLD OR AN ABSURD AMOUNT OF THE RESOURCE, e.g. an endless sea of unpeeled potatoes on a factory belt]. [COLORS, e.g. bright daylight colors] / [for dark games: strong dark red and purple, still clear and saturated].

TEXT: none. No letters, numbers or words anywhere.

AVOID (negative prompt): any text, letters, numbers, words, photorealism, 3D render, realistic skin, realistic hands, photo, DSLR, cinematic lighting, grey or muddy colors, gloves of any color, extra fingers, more than two hands, fake logos, watermarks, signatures, the YouTube logo, a mascot or logo stamp in any corner, borders, frames, small inset image boxes in any corner, split screens, arrows, emoji, radial lines, plain empty background, tiny details, many small objects competing with the center object, blurry colors.
```

**With a progress number** (only when rule 7 allows): replace the TEXT line with `TEXT: at the top center, write exactly "[0 TREES LEFT]" in big bold yellow-gold cartoon letters (gold to orange gradient) with a thick black outline and a small drop shadow, readable when the image is shrunk to 160 px wide. This is the only text in the image.` and remove `any text, letters, numbers, words` from AVOID.

**Close-up version:** replace HANDS with `One big cartoon hand in a navy sleeve with a gold cuff comes in from the bottom-right and holds up [ITEM] right in front of the camera.`

### Fixing a result (don't start over)

Reply in the same chat with the image, and change only 1–3 things:

- "Keep everything exactly the same, but make the [object] 40% bigger and closer."
- "Keep everything the same, but the hands must be peeling the potato, not just holding the peeler."
- "Keep everything the same, but fill the background with many more [fish], all the way to the edges."
- "Keep everything the same, but remove all text."
- "Keep everything the same, but the sleeves must be dark navy with a thin gold cuff, not white gloves."

### Your 10-second check before upload

1. No text, or only a true number / an in-game word. Spelled right.
2. Two hands, five fingers each, navy sleeves with a gold cuff, **doing** the job.
3. The center object looks like the real game.
4. The background is full (the world or the resource), not empty.
5. Still clear at phone size (shrink it to ~160 px wide).
6. Thumbnail shows the action, title tells the joke; no repeated words; both match the first 30 seconds.

## Rules (always)

1. **One idea only.** One object, one action.
2. **Use the real game look.** Never promise what the video doesn't show.
3. **No Brimlo mascot or logo stamp in any corner** (Mamunur, 21 Oct 2026).
4. **No small square or framed image box in any corner.** One big subject fills the picture.
5. **No "100%" badge** unless you really finished the full game 100%.
6. **Never a number you did not read on screen.**
7. **Text never repeats the title** (6 Nov 2026).
8. **Test, don't guess:** use **Test & Compare** in Studio (it can test thumbnails and titles). Azrilich's titles on 6 Nov looked different on Mamunur's screen than in the public API (e.g. "just one more bottle flip…" vs "i flipped bottles until i lost my mind"), so he probably tests titles too.
9. **Don't replace a thumbnail that works** (real CTR above ~5%).

## Screenshot plan while recording

Take screenshots (or note timestamps) of:
- the main object up close (to attach to the prompt)
- the world / the resource at its biggest
- the funniest moment (for the small funny detail)
- the biggest true number on screen (only if you want a number thumbnail)

## Old styles (reference only)

- **v2 (28 Oct – 5 Nov 2026):** navy+gold POV hands holding a tool, one huge object, bright background with soft radial lines, gold text (max 3 words) at the top on most videos. Replaced by v3 because the text often repeated the title and the hands did not do anything.
- **v1 (until 27 Oct 2026):** big gold "A → B" hook text across the top + one before → after image. Example: [Outbreak Z v3](thumbnail-examples/2026-10-23-outbreak-z-v3-vidiq.webp).
