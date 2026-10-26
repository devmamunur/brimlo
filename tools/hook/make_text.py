"""Make big gold hook-text overlays (1920x1080 transparent PNG) for the /hook skill.

Usage:
  tools/hook/.venv/bin/python tools/hook/make_text.py OUT_DIR "t1-skill-tree=FULL SKILL TREE" "t2-boss=GIANT CRAB BOSS" ...

Each argument is NAME=TEXT. Writes OUT_DIR/NAME.png. Text sits at the top, centered,
in the Brimlo gold gradient with a navy outline and a soft shadow.
Setup once: python3 -m venv tools/hook/.venv && tools/hook/.venv/bin/pip install pillow
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
W, H = 1920, 1080
MAX_TEXT_W = 1700
NAVY = (11, 16, 35, 255)
GOLD_TOP = (255, 200, 61)
GOLD_BOT = (255, 138, 0)


def make(out_dir, name, text):
    size = 150
    while True:
        font = ImageFont.truetype(FONT, size)
        l, t, r, b = font.getbbox(text)
        if r - l <= MAX_TEXT_W:
            break
        size -= 4
    th = b - t
    x = (W - (r - l)) // 2 - l
    y = 70 - t
    stroke = max(8, size // 12)

    # Mask of the letters only
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).text((x, y), text, font=font, fill=255)

    # Vertical gold gradient fill
    grad = Image.new("RGBA", (W, H))
    gd = ImageDraw.Draw(grad)
    for yy in range(H):
        k = min(max((yy - (y + t)) / max(th, 1), 0), 1)
        c = tuple(int(GOLD_TOP[i] + (GOLD_BOT[i] - GOLD_TOP[i]) * k) for i in range(3))
        gd.line([(0, yy), (W, yy)], fill=c + (255,))

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # Soft drop shadow
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((x + 8, y + 10), text, font=font, fill=(0, 0, 0, 200),
                            stroke_width=stroke, stroke_fill=(0, 0, 0, 200))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(10)))

    # Navy outline
    ol = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ol).text((x, y), text, font=font, fill=NAVY, stroke_width=stroke, stroke_fill=NAVY)
    img = Image.alpha_composite(img, ol)

    # Gold letters
    img.paste(grad, (0, 0), mask)
    path = os.path.join(out_dir, name + ".png")
    img.save(path)
    print(path, "font size", size)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    out = os.path.expanduser(sys.argv[1])
    os.makedirs(out, exist_ok=True)
    for arg in sys.argv[2:]:
        name, _, text = arg.partition("=")
        make(out, name, text.upper())
