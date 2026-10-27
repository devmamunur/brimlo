# Thumbnails

1280×720. Made with GPT image or Gemini (Nano Banana) from one prompt, reviewed by Mamunur, fixed with a follow-up message if needed.

## House style v2 — "POV hands + one big object" (default from 28 Oct 2026)

Mamunur's decision (28 Oct 2026), after looking at Azrilich and JonnyBebop: bright, colorful 2D cartoon thumbnails with one clear idea. We copy their **rules**, not their look: our hands wear **Brimlo navy sleeves with a gold cuff** (Azrilich uses white gloves; copying them exactly would make us look like a copy).

```
┌──────────────────────────────────────────┐
│        1,000,000 TREES                   │  ← max 3 words / one number, gold, top center
│                                          │
│          [ ONE HUGE OBJECT ]             │  ← center, ~50% of the image
│      (pile of the resource behind it)    │
│                                          │
│  🧥✋ tool                    tool ✋🧥   │  ← navy sleeves + gold cuff, from bottom corners
│   bright simple background + soft rays   │
└──────────────────────────────────────────┘
```

1. **Style:** 2D cartoon vector, thick bold black outlines, flat cel-shaded colors, very bright and saturated. Never photorealistic, never 3D render.
2. **First-person hands:** two cartoon hands come in from the bottom-left and bottom-right corners, wearing **navy (#0B1023) sleeves with a thin gold (#FFC83D) cuff**, holding the game's tool (axe, pickaxe, scraper, pitchfork, cards…). One hand is fine when it holds up one item (close-up idea).
3. **One huge object in the center** (about half of the image): the thing the game is about, shown at its most extreme (the giant egg, the rusty knife, the planet full of trees). It must look like the real game's object.
4. **Absurd amount:** a big pile of the game's resource behind or around the object (coins, carrots, logs, cards) when the game is about numbers going up.
5. **Background:** bright and simple (teal grid, light sky, green grass, a clean room in light colors) with soft white radial lines toward the center. No dark backgrounds, even for dark games.
6. **Text:** none, or **max 3 words / one number** at the top center: bold yellow-gold cartoon letters (gold #FFC83D → orange #FF8A00), thick black outline, small drop shadow. Same style every video. The AI may write the text; **check the spelling yourself** (Mamunur, 28 Oct 2026).
7. **Only numbers you saw in the game.** If you did not see the number, use no text or a word.
8. **Final file:** exactly 1280×720, JPG or PNG, under 2 MB (not .webp).

Three ways to fill the center (pick one per video):

| Idea | When | Example |
|---|---|---|
| **Hands + tool on the object** (default) | Clean, cut, crack, mine, scrape, restore | Hands with an axe, a tiny planet full of trees in the center, logs around it |
| **Absurd pile** | Pure number-goes-up games | Hands holding a pitchfork against a mountain of carrots |
| **Close-up of one item** | One iconic item (a card, a coin, a legendary fish) | One hand holds up a glowing rare card, opened packs behind it |

## The master prompt (one prompt for GPT or Gemini)

Attach 1–2 screenshots of the game (the main object and the resource) so the AI copies the real shapes and colors. Fill the `[ ]` parts. Keep the "AVOID" part every time: it is the negative prompt.

```
Create a YouTube thumbnail, exactly 1280x720 pixels (16:9).

STYLE: bright 2D cartoon vector illustration, like a flash game. Thick bold black ink outlines on everything, flat cel-shaded colors, very high saturation, glossy highlights, clean shapes, low detail. Use the attached [GAME] screenshots only as a reference for the shape and colors of [MAIN OBJECT] and [RESOURCE], and redraw them in this cartoon style.

COMPOSITION: first-person view. Two cartoon hands come in from the bottom-left and bottom-right corners. The hands wear dark navy blue sleeves (#0B1023) with a thin gold cuff (#FFC83D). They are holding [TOOL, e.g. a small wooden axe].

CENTER: one huge, oversized [MAIN OBJECT, e.g. a tiny round planet covered in thousands of green trees, half of them already cut down] in the exact center, taking up about 50% of the image. It is the brightest and clearest thing in the picture.

AROUND IT: [RESOURCE PILE, e.g. a big messy pile of cut wooden logs] behind and around the object, so it looks like an absurd amount.

BACKGROUND: simple, bright and clean [e.g. light teal sky], with soft white radial lines pointing to the center object. Daylight colors, no dark areas.

TEXT: at the top center, write exactly "[1,000,000 TREES]" in big bold yellow-gold cartoon letters (gold to orange gradient) with a thick black outline and a small drop shadow, readable when the image is shrunk to 160 px wide. This is the only text in the image.

AVOID (negative prompt): photorealism, 3D render, realistic skin, realistic hands, photo, DSLR, cinematic lighting, dark background, black or dark navy areas, gloomy colors, white gloves, extra fingers, more than two hands, any other text, extra words, misspelled text, fake logos, watermarks, signatures, the YouTube logo, a mascot or logo stamp in any corner, borders, frames, small inset image boxes in any corner, split screens, arrows, emoji, crowded scenes, tiny details, many small objects competing with the center object, blurry or muddy colors.
```

**No text version:** replace the TEXT line with `TEXT: none. No letters, numbers or words anywhere.` and add `any text` to the AVOID list.

**Close-up version:** replace COMPOSITION with `One cartoon hand in a navy sleeve with a gold cuff comes in from the bottom-right and holds up [ITEM] right in front of the camera, taking up about half of the image.`

### Fixing a result (don't start over)

Reply in the same chat with the image, and change only 1–3 things:

- "Keep everything exactly the same, but make the [object] 40% bigger."
- "Keep everything the same, but fix the text to say exactly '1,000,000 TREES'."
- "Keep everything the same, but make the background brighter and remove the extra objects on the left."
- "Keep everything the same, but the sleeves must be dark navy with a thin gold cuff, not white gloves."

### Your 10-second check before upload

1. The text is spelled right, and the number is one you really saw in the game.
2. No extra text, fake logo or strange letters anywhere.
3. Two hands, five fingers each, navy sleeves with a gold cuff.
4. The center object looks like the real game, not something else.
5. Still clear at phone size (shrink it to ~160 px wide).
6. Thumbnail, title and first 30 seconds promise the same thing.

## Rules (always)

1. **One idea only.** One object, one action, max 3 words.
2. **Use the real game look.** The object and resource must be recognisable from the game. Never promise what the video doesn't show.
3. **Bright, always.** Even horror or zombie games get a bright, colorful scene.
4. **No Brimlo mascot or logo stamp in any corner** (Mamunur, 21 Oct 2026). The mascot only appears when it is part of the idea.
5. **No small square or framed image box in any corner.** One big subject fills the picture.
6. **No "100%" badge** unless you really finished the full game 100% (that badge is JonnyBebop's brand, and demos can't be 100%).
7. **Never a number you did not read on screen.**
8. **Don't replace a thumbnail that works** (real CTR above ~5%). Test new versions with **Test & Compare** (Studio → video → thumbnail → Test & Compare): old style vs new style for the next 3 videos.
9. **Same text style every video** (same gold, same outline, top center), so the channel looks like one brand after 5–10 videos.

## Screenshot plan while recording

Take screenshots (or note timestamps) of:
- the main object up close (to attach to the prompt)
- the resource pile at its biggest
- the biggest number on screen (for the text)

## Old style (until 27 Oct 2026, for reference only)

Big gold "A → B" hook text across the top + one before → after image + game context. Example: [Outbreak Z v3](thumbnail-examples/2026-10-23-outbreak-z-v3-vidiq.webp). Replaced by house style v2 on 28 Oct 2026. Keep it only for Test & Compare against the new style.
