# /// script
# dependencies = ["numpy", "pillow"]
# ///
"""Put the moving Brimlo mascot in a corner of a FINISHED video (after editing). v5, 14 Nov 2026.

How it moves (no camera, only the audio + transcript):
  - Mouth: only while Mamunur says words (Whisper word times); voice loudness -> closed / half / open.
  - Eyes: random blinks every 3-7 s.
  - Body: springs (soft, a little overshoot): breathing, sway, bob + stretch while talking.
  - Mini rig: the face slides on the body (looks around); the crown swings on its own.
  - Expressions: trigger words (EXPR below) -> wow / sad / money / happy / confused / think for ~2 s,
    each with its own move, gaze and effect. Optional experimental laugh finder (--laugh).
  - Corner: auto = the corner with the least game HUD.

Usage:
  uv run tools/avatar/add_avatar.py "<final video>" [--best-preview | --start 10:00 --duration 30]
        [--corner auto|br|bl|tr|tl] [--size 0.22] [--laugh] [--overlay-only] [--transcript <name>] [--out file]

  --transcript  folder in tools/transcribe/out/ made from THIS final file. If left out,
                it is found by the video path in summary.json. No transcript → run
                tools/transcribe/run.sh first (mouth needs the word times).
  --best-preview  make a 90 s preview of the part with the most expressions (do this first).
  --start/--duration  or pick the preview part yourself.
  Output: preview -> tools/avatar/out/<name> - mascot preview.mp4 ;
          full    -> next to the export, "<name> - mascot.mov" (HEVC 12 Mb/s, audio copied untouched).
  Guide: playbook/mascot.md
"""
import argparse
import glob
import json
import math
import os
import random
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from anim import Effects, Spring, make_sprites  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
FACES = os.path.join(ROOT, "channel", "brand", "avatar")
OUT_T = os.path.join(ROOT, "tools", "transcribe", "out")


def secs(t):
    s = 0.0
    for p in str(t).split(":"):
        s = s * 60 + float(p)
    return s


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate:format=duration", "-of", "json", path],
                         capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    st = d["streams"][0]
    n, m = st["r_frame_rate"].split("/")
    return st["width"], st["height"], float(n) / float(m), float(d["format"]["duration"])


def find_transcript(video, name):
    if name:
        return os.path.join(OUT_T, name, "segments.json")
    for s in glob.glob(os.path.join(OUT_T, "*", "summary.json")):
        try:
            if os.path.abspath(json.load(open(s)).get("video", "")) == os.path.abspath(video):
                return os.path.join(os.path.dirname(s), "segments.json")
        except Exception:
            pass
    return None


def voice_energy(video, start, dur, fps, nframes):
    """Voice-band (250-3500 Hz) loudness per video frame, in dB."""
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", video, "-vn",
           "-af", "highpass=f=250,lowpass=f=3500", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop = 16000 / fps
    e = np.zeros(nframes, np.float32)
    for i in range(nframes):
        seg = a[int(i * hop):int((i + 1) * hop)]
        e[i] = 20 * math.log10(float(np.sqrt(np.mean(seg ** 2))) + 1e-6) if len(seg) else -120
    return e


def mouth_track(words, start, fps, n, energy):
    """Mouth level per frame: 0 closed, 0.5 half, 1 open.
    Talking = Whisper word times (game sound never opens the mouth).
    Inside talking, the real voice loudness picks the level, with a short hold so it does not flicker."""
    talk = np.zeros(n, bool)
    pad = 0.04
    for (ws, we) in words:
        f0 = max(0, int((ws - start - pad) * fps))
        f1 = min(n, int(math.ceil((we - start + pad) * fps)))
        if f1 > f0:
            talk[f0:f1] = True
    # join tiny gaps (< 0.12 s) between words
    gap = int(0.12 * fps)
    i = 0
    while i < n:
        if not talk[i]:
            j = i
            while j < n and not talk[j]:
                j += 1
            if 0 < i and j < n and j - i <= gap:
                talk[i:j] = True
            i = j
        else:
            i += 1
    mouth = np.zeros(n, np.float32)
    if not talk.any():
        return talk, mouth
    e = smooth(energy, 2)
    lo, hi = np.percentile(e[talk], 20), np.percentile(e[talk], 90)
    z = np.clip((e - lo) / max(hi - lo, 1e-3), 0, 1.5)
    hold = max(2, int(0.07 * fps))
    state, held = 0.0, 0
    for i in range(n):
        if not talk[i]:
            target = 0.0
        elif z[i] > 0.62:
            target = 1.0
        elif z[i] > 0.3:
            target = 0.5
        elif z[i] < 0.22:
            target = 0.0
        else:
            target = state
        held += 1
        if target != state and (held >= hold or not talk[i]):
            state, held = target, 0
        mouth[i] = state
    return talk, mouth


# Trigger phrases, checked against 12 of Mamunur's transcripts (~16 h, 14 Nov 2026).
# At the same word, the first face in this order wins: wow > sad > money > happy > confused > think.
# Longer phrases first inside a list. Very common words ("what", "no", "good", "yes", "money") are left out on purpose.
EXPR = {
    "wow":      dict(hold=1.6, cool=4,  words=["oh my god", "my god", "oh god", "oh wow", "oh my", "wow", "whoa", "amazing",
                                              "huge", "insane", "crazy", "incredible", "what the", "holy", "massive",
                                              "powerful", "too many", "so many", "very fast", "look at this", "look at that"]),
    "sad":      dict(hold=2.2, cool=6,  words=["i died", "i'm dead", "game over", "died", "dead", "i lost", "lost", "oh no",
                                              "no no", "not good", "failed", "damn", "sad", "too bad", "missed", "broke"]),
    "money":    dict(hold=2.0, cool=8,  words=["lots of money", "so much money", "million dollars", "thousand dollars",
                                              "million", "billion", "trillion", "max out", "maxed out", "maxed", "max level",
                                              "level up", "profit", "dollars", "rich"]),
    "happy":    dict(hold=1.8, cool=6,  words=["let's go", "lets go", "perfect", "great", "beautiful", "finally", "awesome",
                                              "nice", "cool", "yes yes", "oh yes", "yay", "love it", "i love", "satisfying",
                                              "easy", "completed", "complete", "i win", "we win", "cleared", "very good", "fun"]),
    "confused": dict(hold=1.8, cool=8,  words=["what happened", "i don't know", "too expensive", "not enough", "can't afford",
                                              "come on", "why", "wait", "weird", "strange", "how is this"]),
    "think":    dict(hold=1.6, cool=25, words=["let's see", "lets see", "let me see", "let me think", "what is this",
                                              "should i", "hmm", "interesting", "which one"]),
}


def expression_track(segs, start, fps, n):
    """Which expression ('' = normal) for each frame, from trigger words with their real times."""
    import re
    hits = []
    for sg in segs:
        toks = [re.sub(r"[^a-z']", "", t.lower()) for t in sg["text"].split()]
        ws = sg.get("words") or []
        def tstart(k):
            if len(ws) == len(toks):
                return ws[k][0]
            return sg["start"] + (sg["end"] - sg["start"]) * k / max(1, len(toks))
        k = 0
        while k < len(toks):
            found = None
            for e, cfg in EXPR.items():
                for ph in cfg["words"]:
                    pw = ph.split()
                    if toks[k:k + len(pw)] == pw:
                        found = (e, len(pw))
                        break
                if found:
                    break
            if found:
                hits.append((tstart(k), found[0]))
                k += found[1]
            else:
                k += 1
    track = np.array([""] * n, dtype=object)
    last_any, last = -99.0, {e: -99.0 for e in EXPR}
    used = {e: 0 for e in EXPR}
    for t, e in sorted(hits):
        t -= start
        if t < 0 or t * fps >= n:
            continue
        if t - last[e] < EXPR[e]["cool"] or t - last_any < 1.2:
            continue
        f0, f1 = max(0, int((t - 0.05) * fps)), min(n, int((t + EXPR[e]["hold"]) * fps))
        track[f0:f1] = e
        last[e] = last_any = t
        used[e] += 1
    return track, used


def blink_track(n, fps, seed=7):
    rnd = random.Random(seed)
    b = np.zeros(n, bool)
    t = rnd.uniform(2, 4)
    while t * fps < n:
        f = int(t * fps)
        b[f:f + max(2, int(0.13 * fps))] = True
        t += rnd.uniform(3.0, 7.0)
    return b


def smooth(x, k):
    if k <= 1:
        return x
    w = np.ones(k) / k
    return np.convolve(x, w, mode="same")


# Mini rig. Positions are in the 540x585 face pictures (channel/brand/avatar).
CROWN_POLY = [(174, 38), (243, 55), (263, 10), (307, 46), (360, 20), (368, 94), (364, 104), (208, 123)]
CROWN_CUT_Y = 96          # above this line the crown is lifted off the body (so it can wobble)
CROWN_PIVOT = (286, 112)  # the crown swings around this point (its bottom middle)
PAD = 24


def _face_names():
    names = {("", 0.0, 0): "mouth-closed", ("", 0.5, 0): "mouth-half", ("", 1.0, 0): "mouth-open",
             ("", 0.0, 1): "mouth-closed-blink", ("", 0.5, 1): "mouth-half-blink", ("", 1.0, 1): "mouth-open-blink"}
    for e in EXPR:
        for lv, ln in ((0.0, "closed"), (0.5, "half"), (1.0, "open")):
            names[(e, lv, 0)] = f"{e}-{ln}"
    for lv, ln in ((0.0, "closed"), (0.5, "half"), (1.0, "open")):   # laugh uses the happy pictures
        names[("laugh", lv, 0)] = f"happy-{ln}"
    return names


def load_rig(size_px):
    """Body (no face, crown top cut), face layer per picture, crown layer, shadow. All on one padded canvas."""
    from PIL import ImageDraw
    k = size_px / 585
    def ld(name):
        im = Image.open(os.path.join(FACES, f"brimlo-{name}.png")).convert("RGBA")
        return im.resize((round(im.width * k), size_px), Image.LANCZOS)
    blank = ld("body-blank")
    w, h = blank.size
    cw, ch = w + PAD * 2, h + PAD * 2
    def canvas(im):
        c = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); c.alpha_composite(im, (PAD, PAD)); return c
    # crown mask (soft) on the canvas
    cm = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(cm).polygon([(PAD + x * k, PAD + y * k) for x, y in CROWN_POLY], fill=255)
    cm = cm.filter(ImageFilter.MaxFilter(max(3, int(16 * k) | 1))).filter(ImageFilter.GaussianBlur(0.8))
    B = canvas(blank)
    crown = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    crown.paste(B, (0, 0), Image.fromarray(np.minimum(np.array(B)[..., 3], np.array(cm)).astype(np.uint8)))
    cut = np.array(cm).astype(np.float32) / 255
    cut[int(PAD + CROWN_CUT_Y * k):, :] = 0
    body = np.array(B).astype(np.float32)
    body[..., 3] *= 1 - cut
    body = Image.fromarray(body.clip(0, 255).astype(np.uint8), "RGBA")
    # shadow from the full shape
    sh = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    al = B.split()[3].point(lambda v: int(v * 0.55))
    sh.paste(Image.new("RGBA", (cw, ch), (0, 0, 0, 255)), (4, 8), al)
    shadow = sh.filter(ImageFilter.GaussianBlur(7))
    # face layers = what differs from the plain body
    Bn = np.array(B).astype(np.int16)
    feats = {}
    for key, name in _face_names().items():
        F = canvas(ld(name))
        Fn = np.array(F).astype(np.int16)
        diff = np.abs(Fn[..., :3] - Bn[..., :3]).max(-1) > 14
        mk = Image.fromarray((diff * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
        a2 = np.minimum(np.array(mk), Fn[..., 3]).astype(np.uint8)
        f = np.array(F); f[..., 3] = a2
        feats[key] = Image.fromarray(f, "RGBA")
    pivot = (PAD + CROWN_PIVOT[0] * k, PAD + CROWN_PIVOT[1] * k)
    return dict(body=body, crown=crown, shadow=shadow, feats=feats, pivot=pivot, size=(cw, ch))


def pick_corner(video, total, BW, BH, W, H):
    """Corner with the least fixed game HUD: sample 12 frames, find edges that stay in place."""
    sw, shh = 480, 270
    fr = []
    for j in range(12):
        t = total * (0.05 + 0.9 * j / 11)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1",
                              "-vf", f"scale={sw}:{shh},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
        if len(raw) == sw * shh:
            g = np.frombuffer(raw, np.uint8).reshape(shh, sw).astype(np.float32)
            fr.append(np.abs(np.diff(g, axis=1))[:-1, :] + np.abs(np.diff(g, axis=0))[:, :-1])
    if not fr:
        return "br", {}
    static = np.median(np.stack(fr), 0)            # edges that are there in most frames = HUD / UI
    rw, rh = int(BW / W * sw * 0.8), int(BH / H * shh * 0.8)
    reg = {"br": static[-rh:, -rw:], "bl": static[-rh:, :rw], "tr": static[:rh, -rw:], "tl": static[:rh, :rw]}
    score = {c: float((r > 25).mean() * 100) for c, r in reg.items()}
    best = min(score, key=lambda c: score[c] - (0.6 if c == "br" else 0))   # tiny bonus: bottom-right is home
    return best, score


def laugh_hits(video, start, dur, words):
    """Experimental: laughs (Whisper never writes them). Voice-heavy, rhythmic (3-7 bursts/s), outside words."""
    sr, hz = 16000, 100
    def dec(af):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", video, "-vn",
                              "-af", af, "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"], capture_output=True).stdout
        a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
        m = len(a) // (sr // hz)
        return np.sqrt((a[:m * (sr // hz)].reshape(m, -1) ** 2).mean(1) + 1e-10)
    v = dec("highpass=f=250,lowpass=f=3500")
    f = dec("anull")
    m = min(len(v), len(f))
    v, f = v[:m], f[:m]
    busy = np.zeros(m, bool)
    for ws, we in words:
        a0, a1 = int((ws - start - 0.2) * hz), int((we - start + 0.2) * hz)
        if a1 > 0 and a0 < m:
            busy[max(0, a0):min(m, a1)] = True
    vdb = 20 * np.log10(v)
    talk_lvl = np.median(vdb[busy]) if busy.any() else np.median(vdb)
    hits, last, win = [], -99.0, int(0.8 * hz)
    for i in range(0, m - win, 10):
        if busy[i:i + win].any():
            continue
        seg = v[i:i + win]
        if 20 * np.log10(seg.mean()) < talk_lvl - 4 or (seg ** 2).sum() / ((f[i:i + win] ** 2).sum() + 1e-12) < 0.55:
            continue
        x = seg - seg.mean()
        ac = np.correlate(x, x, "full")[win - 1:]
        if ac[0] <= 0:
            continue
        ac = ac / ac[0]
        lo, hi = int(0.14 * hz), int(0.3 * hz)
        if ac[lo:hi].max() >= 0.45:
            t = start + i / hz
            if t - last > 10:
                hits.append(t)
                last = t
    return hits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--transcript")
    ap.add_argument("--start", default="0")
    ap.add_argument("--duration")
    ap.add_argument("--corner", default="auto", choices=["auto", "br", "bl", "tr", "tl"],
                    help="auto = pick the corner with the least game HUD (bottom-right if free)")
    ap.add_argument("--laugh", action="store_true", help="EXPERIMENTAL: find laughs in the sound (can be wrong)")
    ap.add_argument("--overlay-only", action="store_true",
                    help="make only the mascot as a transparent ProRes 4444 .mov to place by hand in Resolve")
    ap.add_argument("--size", type=float, default=0.22, help="mascot height as part of video height")
    ap.add_argument("--margin", type=int, default=12)
    ap.add_argument("--out")
    ap.add_argument("--best-preview", action="store_true",
                    help="make a 90 s preview of the part with the most different expressions")
    args = ap.parse_args()

    W, H, fps, total = probe(args.video)
    start = secs(args.start)
    dur = secs(args.duration) if args.duration else total - start
    n = int(dur * fps)

    tpath = find_transcript(args.video, args.transcript)
    if not tpath or not os.path.exists(tpath):
        sys.exit("No transcript for this video. Run first:\n  tools/transcribe/run.sh \"%s\" --game \"<game>\" --name <name>" % args.video)
    segs = json.load(open(tpath))
    words = [tuple(w) for s in segs for w in s.get("words", [])]
    if args.best_preview:
        q = 4
        tr, _ = expression_track(segs, 0, q, int(total * q))
        best = (-1, -1, 0)
        for st in range(0, max(1, int(total) - 90), 15):
            w = tr[st * q:(st + 90) * q]
            kinds = len({e for e in w if e})
            cnt = sum(1 for k in range(1, len(w)) if w[k] and w[k] != w[k - 1])
            best = max(best, (kinds, cnt, st))
        start, dur = float(best[2]), 90.0
        n = int(dur * fps)
        print(f"best preview: {int(start // 60)}:{int(start % 60):02d} (+90 s), {best[0]} kinds of face, {best[1]} changes")
    print(f"video {W}x{H} {fps:.2f} fps, {dur/60:.1f} min, {len(words)} words from {os.path.basename(os.path.dirname(tpath))}")

    energy = voice_energy(args.video, start, dur, fps, n)
    talk, mouth = mouth_track(words, start, fps, n, energy)
    blink = blink_track(n, fps)
    expr, used = expression_track(segs, start, fps, n)
    if args.laugh:
        lh = laugh_hits(args.video, start, dur, words)
        used["laugh"] = 0
        for t in lh:
            f0, f1 = int((t - start) * fps), int((t - start + 1.6) * fps)
            if 0 <= f0 < n and not any(expr[f0:min(n, f1)]):
                expr[f0:min(n, f1)] = "laugh"
                used["laugh"] += 1
                for j in range(f0, min(n, f1)):          # laughing mouth: open / half at ~6 per second
                    mouth[j] = 1.0 if int((j - f0) / fps * 12) % 2 == 0 else 0.5
    # smooth talking presence (eases in/out over ~0.4 s) and smooth mouth level
    talk_s = np.zeros(n, np.float32)
    mouth_s = np.zeros(n, np.float32)
    ka, km = 1 - math.exp(-1 / (0.4 * fps)), 1 - math.exp(-1 / (0.06 * fps))
    ts = ms = 0.0
    for i in range(n):
        ts += (float(talk[i]) - ts) * ka
        ms += (float(mouth[i]) - ms) * km
        talk_s[i], mouth_s[i] = ts, ms

    size_px = int(H * args.size)
    rig = load_rig(size_px)
    feats = rig["feats"]
    fw, fh = rig["size"]
    BW, BH = fw + 100, fh + 110          # extra room for effects above and beside the head
    corner = args.corner
    if corner == "auto":
        corner, score = pick_corner(args.video, total, BW, BH, W, H)
        print("corner auto:", corner, "(HUD score, lower = emptier):", {k: round(v, 1) for k, v in score.items()})
    m = args.margin
    x = {"br": W - BW - m + 40, "tr": W - BW - m + 40, "bl": m - 40, "tl": m - 40}[corner]
    y = {"br": H - BH - m + 20, "bl": H - BH - m + 20, "tr": m - 60, "tl": m - 60}[corner]
    x, y = max(0, min(W - BW, x)), max(0, min(H - BH, y))
    ax, ay = BW / 2, BH - 30             # anchor: bottom middle of the bag (stays on the ground)
    sx0, sy0 = fw / 2, fh - 30 + 4
    scale = size_px / 240
    fx = Effects(make_sprites(scale), scale)
    GX, GY = 0.028 * size_px, 0.018 * size_px   # how far the face can look sideways / up-down (px)

    def frame(img, sx, sy, dy, rot):
        # inverse affine around the bottom anchor: scale + lean + lift, sub-pixel smooth
        c, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        Y = ay + dy
        coeffs = (c / sx, -s_ / sx, sx0 - (c * ax - s_ * Y) / sx,
                  s_ / sy, c / sy, sy0 - (s_ * ax + c * Y) / sy)
        return img.transform((BW, BH), Image.AFFINE, coeffs, resample=Image.BICUBIC)

    def compose(feat, gx, gy, crot, cdy):
        """Mini rig: shadow + body + face (slid by gaze) + crown (swings on its own)."""
        cv = rig["shadow"].copy()
        cv.alpha_composite(rig["body"])
        cv.alpha_composite(feat.transform(rig["size"], Image.AFFINE, (1, 0, -gx, 0, 1, -gy), resample=Image.BICUBIC))
        cv.alpha_composite(rig["crown"].rotate(crot, resample=Image.BICUBIC, center=rig["pivot"], translate=(0, cdy)))
        return cv

    out = args.out
    if not out:
        name = os.path.splitext(os.path.basename(args.video))[0]
        if args.duration or args.best_preview:   # previews stay in the repo's out folder (not in git)
            out = os.path.join(HERE, "out", name + " - mascot preview.mp4")
        else:                                    # the full video goes next to the final export
            out = os.path.splitext(args.video)[0] + " - mascot.mov"
    if args.overlay_only:
        out = os.path.splitext(out)[0].replace(" - mascot preview", " - mascot").replace(" - mascot", "") + " - mascot overlay.mov"
        cmd = ["ffmpeg", "-v", "error", "-stats", "-y",
               "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{BW}x{BH}", "-framerate", f"{fps}", "-i", "-",
               "-c:v", "prores_ks", "-profile:v", "4444", "-qscale:v", "14", "-pix_fmt", "yuva444p10le", "-alpha_bits", "8", out]
        # Resolve: Inspector > Transform > Position is measured from the centre, Y goes up
        rx, ry = x + BW / 2 - W / 2, -(y + BH / 2 - H / 2)
        note = (f"Overlay for: {os.path.basename(args.video)}\nPut it on V2 at the start of the timeline (it starts at {start:.2f} s).\n"
                f"Inspector > Transform > Position X = {rx:.0f}, Y = {ry:.0f} (zoom 1.0) -> {corner} corner.\n"
                f"In other apps: top-left of the box at x={x}, y={y} on a {W}x{H} frame.\n")
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        open(os.path.splitext(out)[0] + ".txt", "w").write(note)
        print(note)
    else:
        vcodec = ["-c:v", "hevc_videotoolbox", "-b:v", "12M", "-tag:v", "hvc1"]
        acodec = ["-c:a", "aac", "-b:a", "192k"] if out.endswith(".mp4") else ["-c:a", "copy"]
        cmd = ["ffmpeg", "-v", "error", "-stats", "-y",
               "-ss", str(start), "-t", str(dur), "-i", args.video,
               "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{BW}x{BH}", "-framerate", f"{fps}", "-i", "-",
               "-filter_complex", f"[0:v][1:v]overlay={x}:{y}:format=auto,format=yuv420p[v]",
               "-map", "[v]", "-map", "0:a?", *vcodec, *acodec, out]
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    dt = 1 / fps
    sp_dy, sp_sy, sp_rot = Spring(0, 3.0, 0.35), Spring(1, 4.0, 0.30), Spring(0, 2.0, 0.45)
    sp_gx, sp_gy = Spring(0, 2.6, 0.8), Spring(0, 2.6, 0.8)        # gaze: quick but soft
    sp_cr, sp_cdy = Spring(0, 3.2, 0.22), Spring(0, 4.5, 0.25)     # crown: wobbly, lags the body
    allx = list(EXPR) + ["laugh"]
    w_e = {e: 0.0 for e in allx}           # smooth weight of each expression (0..1)
    kw = 1 - math.exp(-1 / (0.12 * fps))
    shown_key, fade_from, fade_k = None, None, 0
    FADE = max(2, int(0.12 * fps))
    KICK = {"wow": (-300, 1.4, 0), "happy": (-220, 0.9, 0), "sad": (60, -0.9, -30), "think": (-40, 0.3, 70),
            "money": (-260, 1.1, 0), "confused": (-60, 0.4, -60), "laugh": (-160, 0.8, 30)}
    GAZE = {"think": (0.8, -0.9), "sad": (-0.2, 0.9), "wow": (0, -0.4), "money": (0, -0.2), "confused": (-0.7, 0.1)}
    rnd = random.Random(5)
    look, look_until = (0.0, 0.0), 0.0
    prev_vdy, prev_vrot = 0.0, 0.0
    for i in range(n):
        t = i * dt
        e = expr[i]
        for k in w_e:
            w_e[k] += ((1.0 if e == k else 0.0) - w_e[k]) * kw
        breathe = math.sin(2 * math.pi * t / 3.4)
        bob = talk_s[i] * (0.5 - 0.5 * math.cos(2 * math.pi * t / 0.9))
        sway = 1.3 * math.sin(2 * math.pi * t / 5.3) + 0.6 * math.sin(2 * math.pi * t / 2.1)
        # body targets
        sy_t = 1 + 0.010 * breathe + 0.012 * mouth_s[i] + 0.010 * bob
        dy_t = -3.0 * bob
        rot_t = sway * (1 - 0.5 * talk_s[i])
        hp = abs(math.sin(2 * math.pi * t / 0.55))
        lp = abs(math.sin(2 * math.pi * t / 0.33))
        dy_t += (w_e["wow"] * -6 + w_e["happy"] * (-6 * hp) + w_e["sad"] * 6 + w_e["think"] * -2
                 + w_e["money"] * (-5 * hp) + w_e["laugh"] * (-5 * lp))
        sy_t += w_e["wow"] * 0.035 + w_e["happy"] * 0.02 * hp - w_e["sad"] * 0.05 + w_e["laugh"] * 0.02 * lp
        rot_t += (w_e["happy"] * 5 * math.sin(2 * math.pi * t / 0.55) - w_e["sad"] * 4 + w_e["think"] * 8
                  + w_e["money"] * 3 * math.sin(2 * math.pi * t / 0.3) + w_e["confused"] * 5 * math.sin(2 * math.pi * t / 0.7)
                  + w_e["laugh"] * 3 * math.sin(2 * math.pi * t / 0.33))
        rot_t *= 1 - 0.7 * w_e["wow"]
        # gaze target: the face's look for this expression, else calm random glances
        if e in GAZE:
            g = GAZE[e]
        else:
            if t >= look_until:
                look = rnd.choice([(0, 0), (0, 0), (0.7, 0), (-0.7, 0), (0.5, -0.5), (-0.5, -0.4), (0.3, 0.4)])
                if talk_s[i] > 0.5:
                    look = (look[0] * 0.4, look[1] * 0.4)       # while talking, mostly at the viewer
                look_until = t + rnd.uniform(2.5, 6.0)
            g = look
        # new expression: kick the springs + start its effect
        if e and (i == 0 or expr[i - 1] != e):
            kd, ks, kr = KICK[e]
            sp_dy.kick(kd * scale)
            sp_sy.kick(ks)
            sp_rot.kick(kr)
            sp_cr.kick(rnd.choice((-1, 1)) * 90)
            fx.spawn(e, ax, ay - size_px * 1.0 + sp_dy.x, size_px)
        dy = sp_dy.step(dy_t * scale, dt)
        sy = sp_sy.step(sy_t, dt)
        rot = sp_rot.step(rot_t, dt)
        sx = 1 - 0.006 * breathe - 0.006 * mouth_s[i] - 0.6 * (sy - 1 - 0.010 * breathe)   # keep volume: taller = thinner
        gx = sp_gx.step(g[0] * GX, dt)
        gy = sp_gy.step(g[1] * GY, dt)
        # crown: pushed by the body's changes in speed (secondary motion)
        sp_cdy.kick(-(sp_dy.v - prev_vdy) * 0.35)
        sp_cr.kick(-(sp_rot.v - prev_vrot) * 0.6)
        prev_vdy, prev_vrot = sp_dy.v, sp_rot.v
        cdy = max(-8 * scale, min(3 * scale, sp_cdy.step(0, dt)))
        crot = max(-9, min(9, sp_cr.step(0, dt)))
        # face layer, with a quick cross-fade when the expression changes
        key = (e, float(mouth[i]), int(blink[i]) if not e else 0)
        if shown_key is not None and key[0] != shown_key[0]:
            fade_from, fade_k = feats[shown_key], 0
        shown_key = key
        feat = feats[key]
        if fade_from is not None and fade_k < FADE:
            fade_k += 1
            feat = Image.blend(fade_from, feat, fade_k / FADE)
        box = frame(compose(feat, gx, gy, crot, cdy), sx, sy, dy, rot)
        fx.draw(box, dt)
        p.stdin.write(box.tobytes())
    p.stdin.close()
    if p.wait() != 0:
        sys.exit("ffmpeg failed")
    print("done:", out)
    print(f"talking {talk.mean()*100:.0f}% of frames, mouth half {np.mean(mouth==0.5)*100:.0f}% open {np.mean(mouth==1)*100:.0f}%, mouth changes/s while talking {np.sum(np.diff(mouth)!=0)/max(1,talk.sum()/fps):.1f}")
    print("expressions:", used)


if __name__ == "__main__":
    main()
