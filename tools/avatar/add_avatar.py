# /// script
# dependencies = ["numpy", "pillow"]
# ///
"""Put the moving Brimlo mascot in the corner of a FINISHED video (after editing).

How it moves (no camera, only the audio + transcript):
  - Mouth: opens/closes only while Mamunur says words (Whisper word times),
    in syllable steps, and stays shut on quiet sounds inside a word.
  - Eyes: random blinks every 2-6 s.
  - Body: soft breathing when quiet, small bob + sway while talking,
    a little stretch with the voice. No jumps (they looked random).
  - Expressions: trigger words in the transcript ("oh my god" -> wow, "perfect" -> happy,
    "I died" -> sad, "let's see" -> think) change the face for ~2 s with a small pop.

Usage:
  uv run tools/avatar/add_avatar.py "<final video>" [--transcript <name>]
        [--start 10:00 --duration 30] [--corner br|bl|tr|tl] [--size 0.26] [--out file]

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


# Trigger phrases (from 11 transcripts, 13 Nov 2026). First match wins: wow > sad > happy > think.
EXPR = {
    "wow":   dict(hold=1.6, cool=4,  words=["oh my god", "my god", "oh god", "wow", "whoa", "amazing", "huge", "insane",
                                           "crazy", "incredible", "what happened", "what the", "holy", "massive"]),
    "sad":   dict(hold=2.2, cool=6,  words=["i died", "died", "dead", "i lost", "lost", "oh no", "no no", "not good",
                                           "failed", "damn", "sad", "too bad", "missed"]),
    "happy": dict(hold=1.8, cool=6,  words=["let's go", "lets go", "perfect", "great", "beautiful", "finally", "awesome",
                                           "nice", "cool", "yes yes", "oh yes", "yay", "love it", "satisfying", "easy"]),
    "think": dict(hold=1.6, cool=25, words=["let's see", "lets see", "what is this", "should i", "hmm", "interesting",
                                           "which one", "let me think", "let me see"]),
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


def load_faces(size_px):
    names = {("", 0.0, 0): "mouth-closed", ("", 0.5, 0): "mouth-half", ("", 1.0, 0): "mouth-open",
             ("", 0.0, 1): "mouth-closed-blink", ("", 0.5, 1): "mouth-half-blink", ("", 1.0, 1): "mouth-open-blink"}
    for e in EXPR:
        for lv, ln in ((0.0, "closed"), (0.5, "half"), (1.0, "open")):
            names[(e, lv, 0)] = f"{e}-{ln}"
    faces = {}
    for key, name in names.items():
        im = Image.open(os.path.join(FACES, f"brimlo-{name}.png")).convert("RGBA")
        h = size_px
        w = round(im.width * h / im.height)
        im = im.resize((w, h), Image.LANCZOS)
        # soft shadow so it reads on any game
        pad = 24
        canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        alpha = im.split()[3].point(lambda v: int(v * 0.55))
        sh.paste(Image.new("RGBA", im.size, (0, 0, 0, 255)), (pad + 4, pad + 8), alpha)
        sh = sh.filter(ImageFilter.GaussianBlur(7))
        canvas.alpha_composite(sh)
        canvas.alpha_composite(im, (pad, pad))
        faces[key] = canvas
    return faces


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--transcript")
    ap.add_argument("--start", default="0")
    ap.add_argument("--duration")
    ap.add_argument("--corner", default="br", choices=["br", "bl", "tr", "tl"])
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
    faces = load_faces(size_px)
    fw, fh = faces[("", 0.0, 0)].size
    BW, BH = fw + 100, fh + 110          # extra room for effects above and beside the head
    m = args.margin
    x = {"br": W - BW - m + 40, "tr": W - BW - m + 40, "bl": m - 40, "tl": m - 40}[args.corner]
    y = {"br": H - BH - m + 20, "bl": H - BH - m + 20, "tr": m - 60, "tl": m - 60}[args.corner]
    x, y = max(0, min(W - BW, x)), max(0, min(H - BH, y))
    ax, ay = BW / 2, BH - 30             # anchor: bottom middle of the bag (stays on the ground)
    sx0, sy0 = fw / 2, fh - 30 + 4
    scale = size_px / 240
    fx = Effects(make_sprites(scale), scale)

    def frame(img, sx, sy, dy, rot):
        # inverse affine around the bottom anchor: scale + lean + lift, sub-pixel smooth
        c, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        Y = ay + dy
        coeffs = (c / sx, -s_ / sx, sx0 - (c * ax - s_ * Y) / sx,
                  s_ / sy, c / sy, sy0 - (s_ * ax + c * Y) / sy)
        return img.transform((BW, BH), Image.AFFINE, coeffs, resample=Image.BICUBIC)

    out = args.out
    if not out:
        name = os.path.splitext(os.path.basename(args.video))[0]
        if args.duration or args.best_preview:   # previews stay in the repo's out folder (not in git)
            out = os.path.join(HERE, "out", name + " - mascot preview.mp4")
        else:                                    # the full video goes next to the final export
            out = os.path.splitext(args.video)[0] + " - mascot.mov"
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
    w_e = {e: 0.0 for e in EXPR}           # smooth weight of each expression (0..1)
    kw = 1 - math.exp(-1 / (0.12 * fps))
    shown_key, fade_from, fade_k = None, None, 0
    FADE = max(2, int(0.12 * fps))
    KICK = {"wow": (-300, 1.4, 0), "happy": (-220, 0.9, 0), "sad": (60, -0.9, -30), "think": (-40, 0.3, 70)}
    for i in range(n):
        t = i * dt
        e = expr[i]
        for k in w_e:
            w_e[k] += ((1.0 if e == k else 0.0) - w_e[k]) * kw
        breathe = math.sin(2 * math.pi * t / 3.4)
        bob = talk_s[i] * (0.5 - 0.5 * math.cos(2 * math.pi * t / 0.9))
        sway = 1.3 * math.sin(2 * math.pi * t / 5.3) + 0.6 * math.sin(2 * math.pi * t / 2.1)
        # targets
        sy_t = 1 + 0.010 * breathe + 0.012 * mouth_s[i] + 0.010 * bob
        dy_t = -3.0 * bob
        rot_t = sway * (1 - 0.5 * talk_s[i])
        hp = abs(math.sin(2 * math.pi * t / 0.55))
        dy_t += w_e["wow"] * -6 + w_e["happy"] * (-6 * hp) + w_e["sad"] * 6 + w_e["think"] * -2
        sy_t += w_e["wow"] * 0.035 + w_e["happy"] * 0.02 * hp - w_e["sad"] * 0.05
        rot_t += w_e["happy"] * 5 * math.sin(2 * math.pi * t / 0.55) - w_e["sad"] * 4 + w_e["think"] * 8
        rot_t *= 1 - 0.7 * w_e["wow"]
        # new expression: kick the springs + start its effect
        if e and (i == 0 or expr[i - 1] != e):
            kd, ks, kr = KICK[e]
            sp_dy.kick(kd * scale)
            sp_sy.kick(ks)
            sp_rot.kick(kr)
            fx.spawn(e, ax, ay - size_px * 1.0 + sp_dy.x, size_px)
        dy = sp_dy.step(dy_t * scale, dt)
        sy = sp_sy.step(sy_t, dt)
        rot = sp_rot.step(rot_t, dt)
        sx = 1 - 0.006 * breathe - 0.006 * mouth_s[i] - 0.6 * (sy - 1 - 0.010 * breathe)   # keep volume: taller = thinner
        # face picture, with a quick cross-fade when the expression changes
        key = (e, float(mouth[i]), int(blink[i]) if not e else 0)
        if shown_key is not None and key[0] != shown_key[0]:
            fade_from, fade_k = faces[shown_key], 0
        shown_key = key
        img = faces[key]
        if fade_from is not None and fade_k < FADE:
            fade_k += 1
            img = Image.blend(fade_from, img, fade_k / FADE)
        box = frame(img, sx, sy, dy, rot)
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
