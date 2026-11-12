"""Animation parts for add_avatar.py: springs (soft, bouncy motion), face cross-fade,
and small effects (particles) for each expression. Brand colours: gold #FFC83D, navy #0B1023, teal #2EE6D6."""
import math
import random

from PIL import Image, ImageDraw, ImageFont

GOLD, ORANGE, NAVY, TEAL = (255, 200, 61, 255), (255, 138, 0, 255), (11, 16, 35, 255), (46, 230, 214, 255)


class Spring:
    """Damped spring: follows a target with a little overshoot (looks alive, never jumps)."""

    def __init__(self, x, hz, zeta):
        self.x, self.v, self.w, self.z = x, 0.0, 2 * math.pi * hz, zeta

    def step(self, target, dt):
        for _ in range(4):
            h = dt / 4
            a = -self.w * self.w * (self.x - target) - 2 * self.z * self.w * self.v
            self.v += a * h
            self.x += self.v * h
        return self.x

    def kick(self, dv):
        self.v += dv


def _font(size):
    for f in ("/System/Library/Fonts/Supplemental/Arial Black.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


def _sprite(draw_fn, size, ss=4):
    big = Image.new("RGBA", (size * ss, size * ss), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(big), size * ss)
    return big.resize((size, size), Image.LANCZOS)


def _star(points, d, S, r_out, r_in, fill, outline, ow):
    c = S / 2
    pts = []
    for k in range(points * 2):
        r = r_out if k % 2 == 0 else r_in
        a = -math.pi / 2 + k * math.pi / points
        pts.append((c + r * math.cos(a), c + r * math.sin(a)))
    d.polygon(pts, fill=fill, outline=outline, width=ow)


def _text(ch, size, fill):
    f = _font(int(size * 0.8))

    def fn(d, S):
        fb = _font(int(S * 0.8))
        d.text((S / 2, S / 2), ch, font=fb, fill=fill, anchor="mm", stroke_width=int(S * 0.07), stroke_fill=NAVY)
    del f
    return _sprite(fn, size)


def make_sprites(scale):
    """scale = mascot height in px / 240 (so effects grow with the mascot)."""
    s = lambda v: max(8, int(v * scale * 1.35))
    sp = {}
    sp["sparkle"] = _sprite(lambda d, S: _star(4, d, S, S * 0.48, S * 0.13, GOLD, ORANGE, max(1, S // 22)), s(26))
    sp["star"] = _sprite(lambda d, S: _star(5, d, S, S * 0.47, S * 0.21, GOLD, NAVY, max(2, S // 14)), s(30))
    sp["!"] = _text("!", s(56), GOLD)
    sp["?"] = _text("?", s(56), TEAL)

    def drop(d, S):
        c = S / 2
        d.polygon([(c, S * 0.05), (c - S * 0.3, S * 0.55), (c + S * 0.3, S * 0.55)], fill=(140, 215, 255, 255))
        d.ellipse([c - S * 0.3, S * 0.3, c + S * 0.3, S * 0.92], fill=(140, 215, 255, 255), outline=(30, 90, 160, 255), width=max(1, S // 16))
        d.ellipse([c - S * 0.14, S * 0.5, c - S * 0.02, S * 0.64], fill=(255, 255, 255, 230))
    sp["drop"] = _sprite(drop, s(26))
    return sp


def _fade(img, a):
    if a >= 0.999:
        return img
    r, g, b, al = img.split()
    al = al.point(lambda v: int(v * a))
    return Image.merge("RGBA", (r, g, b, al))


class Effects:
    """Particles that start when an expression starts. Positions are in the overlay box (px)."""

    def __init__(self, sprites, scale, seed=11):
        self.sp, self.sc, self.p, self.rnd = sprites, scale, [], random.Random(seed)

    def spawn(self, expr, head_x, head_y, size):
        R = self.rnd
        if expr == "wow":
            self.p.append(dict(k="!", x=head_x + size * 0.36, y=head_y + size * 0.05, vx=0, vy=-25, g=0, life=1.0, pop=True, rot=-12))
            for a in (-150, -110, -70, -30):
                a = math.radians(a + R.uniform(-10, 10))
                v = R.uniform(150, 210) * self.sc
                self.p.append(dict(k="star", x=head_x, y=head_y - size * 0.05, vx=v * math.cos(a), vy=v * math.sin(a), g=260 * self.sc, life=0.8, pop=True, rot=R.uniform(-30, 30), spin=R.uniform(-200, 200)))
        elif expr == "happy":
            for _ in range(7):
                a = math.radians(R.uniform(-170, -10))
                v = R.uniform(110, 220) * self.sc
                self.p.append(dict(k="sparkle", x=head_x + R.uniform(-0.2, 0.2) * size, y=head_y + size * 0.25, vx=v * math.cos(a), vy=v * math.sin(a), g=300 * self.sc, life=R.uniform(0.7, 1.0), pop=True, twinkle=True))
        elif expr == "think":
            self.p.append(dict(k="?", x=head_x + size * 0.38, y=head_y + size * 0.12, vx=6, vy=-28 * self.sc, g=0, life=1.5, pop=True, rot=10, sway=True))
        elif expr == "sad":
            self.p.append(dict(k="drop", x=head_x - size * 0.32, y=head_y + size * 0.30, vx=0, vy=10, g=60 * self.sc, life=1.4, pop=True))

    def draw(self, box, dt):
        alive = []
        for q in self.p:
            q.setdefault("age", 0.0)
            q["age"] += dt
            u = q["age"] / q["life"]
            if u >= 1:
                continue
            q["vy"] += q["g"] * dt
            q["x"] += q["vx"] * dt
            q["y"] += q["vy"] * dt
            if q.get("spin"):
                q["rot"] += q["spin"] * dt
            # scale: quick "back-out" pop in, then hold
            t = min(1.0, q["age"] / 0.18)
            sc = 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2 if q.get("pop") else 1.0
            if q.get("twinkle"):
                sc *= 0.75 + 0.25 * math.sin(q["age"] * 25)
            alpha = 1.0 if u < 0.6 else max(0.0, 1 - (u - 0.6) / 0.4)
            img = self.sp[q["k"]]
            w = max(2, int(img.width * sc))
            im = img.resize((w, w), Image.BICUBIC) if w != img.width else img
            rot = q.get("rot", 0) + (6 * math.sin(q["age"] * 5) if q.get("sway") else 0)
            if rot:
                im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
            im = _fade(im, alpha)
            x0, y0 = int(q["x"] - im.width / 2), int(q["y"] - im.height / 2)
            cx, cy = max(0, -x0), max(0, -y0)
            if cx < im.width and cy < im.height and x0 < box.width and y0 < box.height:
                box.alpha_composite(im.crop((cx, cy, im.width, im.height)), (x0 + cx, y0 + cy))
            alive.append(q)
        self.p = alive
