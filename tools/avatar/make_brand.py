# /// script
# dependencies = ["pillow"]
# ///
"""Brand files with the mascot: stickers (one per face), YouTube watermark, channel banner.

Run: uv run tools/avatar/make_brand.py   (made 14 Nov 2026)
Out: channel/brand/mascot-stickers/*.png, channel/brand/watermark-mascot-150.png (+300),
     channel/brand/banner-mascot-2026-11-14.png
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
AV = os.path.join(ROOT, "channel", "brand", "avatar")
BR = os.path.join(ROOT, "channel", "brand")
ST = os.path.join(BR, "mascot-stickers")


def with_shadow(im, blur=10, off=(6, 12), alpha=0.45):
    pad = blur * 3
    c = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", c.size, (0, 0, 0, 0))
    a = im.split()[3].point(lambda v: int(v * alpha))
    sh.paste(Image.new("RGBA", im.size, (0, 0, 0, 255)), (pad + off[0], pad + off[1]), a)
    c.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))
    c.alpha_composite(im, (pad, pad))
    return c.crop(c.getbbox())


def face(name):
    return Image.open(os.path.join(AV, f"brimlo-{name}.png")).convert("RGBA")


os.makedirs(ST, exist_ok=True)
for name, src in [("normal", "mouth-closed"), ("talk", "mouth-open"), ("wow", "wow-open"), ("happy", "happy-open"),
                  ("sad", "sad-closed"), ("money", "money-open"), ("confused", "confused-closed"), ("think", "think-closed")]:
    im = face(src)
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)   # 1080 px tall, for thumbnails
    with_shadow(im, 16, (8, 16)).save(os.path.join(ST, f"mascot-{name}.png"))

# YouTube "branding watermark": square, transparent, shows bottom-right on every video
for px in (150, 300):
    im = face("mouth-closed")
    im.thumbnail((int(px * 0.92), int(px * 0.92)), Image.LANCZOS)
    c = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    c.alpha_composite(im, ((px - im.width) // 2, (px - im.height) // 2))
    c.save(os.path.join(BR, f"watermark-mascot-{px}.png"))

# Banner: mascot left of the tagline, inside the safe area that shows on every device (1546x423 in the middle)
ban = Image.open(os.path.join(BR, "banner-2026-11-05.png")).convert("RGBA")
im = face("happy-closed")
h = 400
im = with_shadow(im.resize((round(im.width * h / im.height), h), Image.LANCZOS), 10, (6, 10), 0.5)
ban.alpha_composite(im, (1080 - im.width - 10, 1440 // 2 - im.height // 2 + 6))
ban.convert("RGB").save(os.path.join(BR, "banner-mascot-2026-11-14.png"), quality=95)
print("done")
