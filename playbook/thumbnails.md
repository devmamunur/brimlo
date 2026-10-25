# Thumbnails

1280×720. Made with GPT image (from the game's key art + screenshots), finished in Canva if needed.

## House style (the default for every video, from 25 Oct 2026; bright pictures from 26 Oct 2026)

Mamunur's chosen pattern. **Best example:** [Outbreak Z v3 (vidIQ-improved)](thumbnail-examples/2026-10-23-outbreak-z-v3-vidiq.webp). Older version: [v2](thumbnail-examples/2026-10-23-outbreak-z-v2.webp). v3 beat v2 because the text and hero are bigger and the zombies are brighter, so it reads better at phone size (25 Oct 2026).

```
┌──────────────────────────────────────────┐
│   BIG GOLD HOOK TEXT ACROSS THE TOP      │  ← 2–3 words, fills the full width
│                                          │
│  [before]        [HERO / after]   [game  │
│  small/dull      big, glowing,    context│
│  item, left      center-right     right] │
│                                          │
│   BRIGHT, colorful game background       │
└──────────────────────────────────────────┘
```

1. **Hook text on top:** 2–3 words (or "A → B", or **one big number you saw on screen**: "$57 BILLION", "LVL 999"), huge, fills the top ~25% from edge to edge (small side margins only). Gold gradient #FFC83D → #FF8A00, thick navy #0B1023 outline, soft glow. The text is the hook. It does not repeat the title.
2. **One clean image under it:** one clear before → after story. The "before" is grey and dull on the left. The "after" (the hero) is **big: about half of the picture**, center-right, slightly cropped by the bottom edge, with a warm glow (like a legendary loot drop). Bigger hero beats more empty space.
3. **Show the game type:** add 3–4 context things on the right (zombies, rats, coins, rocks…), **brightly lit by the action** (glowing eyes, sparks, rim light), so a viewer knows the genre in one second. Keep them smaller than the hero.
4. **Bright picture, always** (Mamunur's decision, 25 Oct 2026, from the next video on): bright, saturated, well-lit game colors, like daylight. Easy to see and understand on a phone. Even dark games (zombies, plague, horror) get a **brightly lit** scene: strong light on the hero, colorful glows, no black or dark navy areas. Softly blurred, low detail, no crowd filling every pixel. Navy stays only as the text outline. (Ridiculously Random uses bright pictures on all 25 thumbnails; study 25 Oct 2026.)
5. **Only one arrow:** if the text has an arrow, do not add a second arrow in the picture.
6. **Must match the game:** the hero, items and colors must look like the real game (check against your footage). Never show something the video does not have.
7. **Final file:** exactly 1280×720, JPG or PNG, under 2 MB (not .webp).
8. **Improve, then test:** after GPT, run the image through vidIQ (thumbnail score / improve) for a second pass. Upload the best one as **B** in Test & Compare, never as a blind swap of a thumbnail with good CTR.

## Rules (always)

1. **One idea only.** Pick one:
   - before → after (the house style)
   - "0%" vs "100%" split
   - one giant number ("160,000 RATS"), only if read on screen
   - one hero object grown huge
2. **2–4 words max**, or one number. Heavy font. Do not repeat the title.
3. **Use the real game look.** AI art is fine, but it must be built from the game's key art and screenshots. Never promise what the video doesn't show (Test & Compare picks by watch time, not clicks).
4. **Strong contrast:** bright, colorful picture; the hero is the brightest thing; gold text with a thick navy outline so it stays readable on a bright picture.
5. Brand colors: gold **#FFC83D → #FF8A00** text on navy **#0B1023**; teal **#2EE6D6** only for small accents.
6. **No Brimlo mascot or logo mark in the corner** of every thumbnail (Mamunur's decision, 21 Oct 2026). Use the mascot only when it is part of the idea (for example a reaction face), never as a stamp.
7. **Phone test:** shrink to ~160 px wide. Can't read it? Cut words.
8. If Test & Compare is available, test the new thumbnail against the old one instead of swapping it.
9. **Never add a small square or framed image box in the bottom-left corner** (or any corner). Most successful channels do not. One big subject fills the picture. If you need a "before", make it a big part of the picture, not a tiny inset.
10. **Never put a number on the thumbnail that you did not read on screen in the video.** If you did not count, use a word ("I'M RICH!") not a count.
11. The thumbnail, title and first 30 seconds must promise the same thing (see the Digging a Hole video: scary eye thumbnail, no scary moment, 1:14 average watch).
12. **Don't replace a thumbnail that works.** If the real CTR is good (above ~5%), keep it. Use Test & Compare for a new version.

## Screenshot plan while recording

Take screenshots (or note timestamps) at:
- the very start (the weak "before" item or state)
- the biggest moment (the "after" hero: best weapon, giant number, final upgrade)
- the hero character / item card up close (so GPT can match the real look)

## One prompt for GPT (house style)

When he asks for a thumbnail prompt, give **ONE single detailed prompt**, not several short ones. Say which files to attach: (1) the Steam key art, (2) a screenshot of the "after" hero item/character, (3) optional: a screenshot of the "before" item. Fill the `[ ]` parts:

```
Make a YouTube thumbnail, exactly 1280x720 pixels (16:9), using the attached [GAME] images as the style and character reference. Keep the game's own art style and the real look of [HERO] and [AFTER ITEM] from the attached screenshots. TOP: huge bold heavy text that fills the top 25% of the image from edge to edge with only small side margins, spelled exactly: "[BEFORE] → [AFTER]" (or "[2–3 WORD HOOK]"), gold gradient (#FFC83D to #FF8A00), thick dark navy (#0B1023) outline, soft glow, readable when shrunk to 160 px wide. LEFT: [BEFORE ITEM], large but plain, grey and dull, with a cold dim light. CENTER-RIGHT: [HERO] with [AFTER ITEM], very big, taking about half of the image and slightly cropped by the bottom edge, [ACTION, e.g. firing toward the right edge], with a warm gold glow around [AFTER ITEM] like a legendary loot drop. RIGHT EDGE: 3 or 4 [GAME CONTEXT, e.g. zombies] clearly visible and brightly lit by the action (glowing eyes, sparks, warm rim light), smaller than the hero, not covering the hero, the item or the text. BACKGROUND: [SETTING, e.g. ruined city street] in BRIGHT, saturated, well-lit colors (daylight or strong colorful light, no black or dark areas), softly blurred, low detail, so the hero and text still stand out. Only one arrow (the one in the text). No other text, no numbers, no logos, no mascot, no borders, no frames or inset image boxes in any corner. High contrast, bold, phone-readable.
```

To fix a version GPT already made: attach it, say "Keep everything exactly as it is" and list only the 1–3 changes.

After GPT answers: check the spelling of the text, that the hero and item match the game, and do the phone test. Then improve it once with vidIQ, export 1280×720 JPG/PNG under 2 MB, and upload it to Test & Compare.
