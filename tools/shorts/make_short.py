"""Brimlo Short maker: cut clips from a long video, speed up, 1080x1920, word-by-word captions.

Usage:
  tools/hook/.venv/bin/python tools/shorts/make_short.py tools/shorts/plans/<slug>.json
  tools/hook/.venv/bin/python tools/shorts/make_short.py tools/shorts/plans/<slug>.json --check

The plan file (JSON) says what to cut. All times are in the SOURCE video, as
seconds (7356.3) or "H:MM:SS.s" ("2:02:36.3"):

{
  "source": "/Volumes/WD Black/Videos/da-vinci/My Video.mp4",
  "output": "/Volumes/WD Black/Videos/da-vinci/shorts/my-video-short.mp4",
  "transcript": "2026-10-23-outbreak-z",      # word times for the captions (optional)
  "speed": 1.1,
  "game_aspect": 1.0,                          # width/height of the game crop (1.0 = square)
  "title": [{"text": "ONE KNIFE", "gold": false}, {"text": "TO MINIGUN", "gold": true}],
  "hook": {"start": 5124.95, "end": 5126.38, "caption": "TWO BOSSES!", "zoom": 1.3, "focus": 0.5},
  "clips": [
    {"start": "2:02:36.3", "end": "2:02:43.1", "focus": 0.4, "push": 0.12,
     "captions": [["2:02:36.3", "2:02:40.3", "This single zombie child"],
                  ["2:02:40.3", "2:02:43.1", "defeated me. Oh my god!", "gold"]]}
  ]
}

focus  where the action is, left (0.0) to right (1.0) of the 16:9 game; the crop centers there.
push   slow zoom-in over the clip (0.12 = ends 12% closer). Use it on the big moments.
zoom   fixed zoom (the hook uses 1.3).

Layout: blurred, darker copy of the game fills the 9:16 frame; the game crop (square by
default, 1080x1080) sits under the 2-line title; captions over the lower part of the game.
Captions: each caption line is shown 1-3 words at a time, the word being said is
highlighted (teal; white inside a gold caption), each group pops in. Word times come
from the transcript when the words match, else they are spread by word length.
Audio: tiny fades at every cut, then atempo (voice pitch stays the same), -14 LUFS.
Encoder: h264_videotoolbox 16 Mb/s, 30 fps + AAC 192k. Needs ffmpeg + Pillow.

--check  also writes <output>-check.jpg (12 frames on one sheet) and prints loudness.
Also writes <output>-resolve.lua: run it in DaVinci (Workspace > Console, Lua):
  dofile('<that path>')  -> imports the Short and makes a 1080x1920 timeline.
"""
import difflib
import json
import os
import re
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

FONT = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
W, H = 1080, 1920
FPS = 30
NAVY = (11, 16, 35, 255)
GOLD = (255, 200, 61, 255)
TEAL = (46, 230, 214, 255)
WHITE = (255, 255, 255, 255)
TITLE_Y = (250, 375)   # centers of title line 1 and 2
GAME_TOP = 470         # top of the game crop
CAPTION_Y = 1420       # center of caption text (over the lower part of the game)
CAP_SIZE = 118         # caption font size (shrinks if the group is too wide)
POP = 0.1              # seconds the bigger "pop" frame shows when a word group appears
ROOT = os.path.dirname(os.path.abspath(__file__))


def secs(t):
    if isinstance(t, (int, float)):
        return float(t)
    s = 0.0
    for p in str(t).split(":"):
        s = s * 60 + float(p)
    return s


def norm(w):
    return re.sub(r"[^a-z0-9%]", "", w.lower())


def fit_font(text, size, max_w):
    while True:
        font = ImageFont.truetype(FONT, size)
        l, t, r, b = font.getbbox(text)
        if r - l <= max_w or size <= 40:
            return font, size
        size -= 4


def text_png(path, text, color, size, y_center, max_w=980):
    font, size = fit_font(text, size, max_w)
    l, t, r, b = font.getbbox(text)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.text(((W - (r - l)) // 2 - l, y_center - (b - t) // 2 - t), text, font=font, fill=color,
           stroke_width=max(6, size // 11), stroke_fill=NAVY)
    img.save(path)


def words_png(path, words, active, gold, size, y_center=CAPTION_Y):
    """One caption group; word `active` highlighted (None = none)."""
    font, size = fit_font(" ".join(words), size, 1000)
    space = font.getlength(" ")
    widths = [font.getlength(w) for w in words]
    total = sum(widths) + space * (len(words) - 1)
    _, t, _, b = font.getbbox("Ag")
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = (W - total) / 2
    base, hi = (GOLD, WHITE) if gold else (WHITE, TEAL)
    for i, w in enumerate(words):
        d.text((x, y_center - (b - t) // 2 - t), w, font=font, fill=hi if i == active else base,
               stroke_width=max(7, size // 10), stroke_fill=NAVY)
        x += widths[i] + space
    img.save(path)


def load_words(name):
    """All transcript words as (token, start, end), or [] if there is no word data."""
    if not name:
        return []
    p = os.path.join(ROOT, "..", "transcribe", "out", name, "segments.json")
    if not os.path.exists(p):
        return []
    out = []
    for s in json.load(open(p)):
        toks, ws = s["text"].split(), s.get("words") or []
        if ws and len(ws) == len(toks):
            out += [(tok, w[0], w[1]) for tok, w in zip(toks, ws)]
    return out


def word_times(text, cs, ce, tw):
    """Start time of every word of a caption line (source seconds)."""
    words = text.split()
    times = [None] * len(words)
    near = [w for w in tw if cs - 0.3 <= (w[1] + w[2]) / 2 <= ce + 0.3]
    if near:
        sm = difflib.SequenceMatcher(None, [norm(w) for w in words], [norm(w[0]) for w in near],
                                     autojunk=False)
        for a, b, n in sm.get_matching_blocks():
            for k in range(n):
                times[a + k] = min(max(near[b + k][1], cs), ce)
    # fill gaps by word length between known times
    lens = [max(len(w), 2) for w in words]
    i = 0
    while i < len(words):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(words) and times[j] is None:
            j += 1
        t0 = times[i - 1] if i > 0 else cs
        t1 = times[j] if j < len(words) else ce
        if i > 0:  # the previous known word takes its share first
            span, weights = t1 - t0, lens[i - 1:j]
            acc = t0 + span * weights[0] / sum(weights)
            for k in range(i, j):
                times[k] = acc
                acc += span * lens[k] / sum(weights)
        else:
            span, weights = t1 - t0, lens[i:j]
            acc = t0
            for k in range(i, j):
                times[k] = acc
                acc += span * lens[k] / sum(weights)
        i = j
    for k in range(1, len(times)):  # keep order
        times[k] = max(times[k], times[k - 1])
    return words, times


def groups(words):
    """Split a caption line into groups of 1-3 words (break after punctuation, ~16 chars max)."""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        text = " ".join(words[k] for k in cur)
        nxt = words[i + 1] if i + 1 < len(words) else ""
        if (len(cur) == 3 or re.search(r"[.!?,…]$", w) or len(text) + 1 + len(nxt) > 16):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def write_lua(out, lua_path, name):
    lua = f'''-- Import a Brimlo Short and make a 1080x1920 timeline (made by tools/shorts/make_short.py)
local path = {json.dumps(out)}
local project = resolve:GetProjectManager():GetCurrentProject()
local mp = project:GetMediaPool()
mp:SetCurrentFolder(mp:GetRootFolder())
local items = mp:ImportMedia({{path}})
if not items or #items == 0 then print("IMPORT FAILED: " .. path) return end
local tl = mp:CreateEmptyTimeline({json.dumps(name)})
project:SetCurrentTimeline(tl)
tl:SetSetting("useCustomSettings", "1")
tl:SetSetting("timelineResolutionWidth", "1080")
tl:SetSetting("timelineResolutionHeight", "1920")
tl:SetSetting("timelineFrameRate", "{FPS}")
tl:SetSetting("timelineOutputResolutionWidth", "1080")
tl:SetSetting("timelineOutputResolutionHeight", "1920")
mp:AppendToTimeline({{items[1]}})
print("project=" .. project:GetName())
print("tl=" .. tl:GetName() .. " w=" .. tostring(tl:GetSetting("timelineResolutionWidth")) .. " h=" .. tostring(tl:GetSetting("timelineResolutionHeight")))
print("v1=" .. #tl:GetItemListInTrack("video", 1) .. " a1=" .. #tl:GetItemListInTrack("audio", 1) .. " frames=" .. (tl:GetEndFrame() - tl:GetStartFrame()))
'''
    with open(lua_path, "w") as f:
        f.write(lua)


def check(out):
    base = os.path.splitext(out)[0]
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                "-of", "csv=p=0", out], capture_output=True, text=True).stdout)
    tmp = base + "-check-frames"
    os.makedirs(tmp, exist_ok=True)
    n, cols = 12, 6
    frames = []
    for i in range(n):
        t = dur * (i + 0.5) / n
        p = os.path.join(tmp, f"c{i:02d}.jpg")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", out,
                        "-frames:v", "1", "-vf", "scale=270:480", p], check=True)
        frames.append(p)
    sheet = base + "-check.jpg"
    args = []
    for p in frames:
        args += ["-i", p]
    layout = "|".join(f"{(i % cols) * 270}_{(i // cols) * 480}" for i in range(n))
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex",
                    "".join(f"[{i}]" for i in range(n)) + f"xstack=inputs={n}:layout={layout}", sheet],
                   check=True)
    shutil.rmtree(tmp)
    r = subprocess.run(["ffmpeg", "-nostats", "-i", out, "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True)
    lufs = [l.strip() for l in r.stderr.splitlines() if l.strip().startswith("I:")]
    print(f"check sheet: {sheet}")
    print(f"length: {dur:.1f}s  loudness: {lufs[-1] if lufs else '?'}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    plan = json.load(open(sys.argv[1]))
    src, out = plan["source"], plan["output"]
    speed = float(plan.get("speed", 1.1))
    aspect = float(plan.get("game_aspect", 1.0))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cap_dir = os.path.splitext(out)[0] + "-caps"
    shutil.rmtree(cap_dir, ignore_errors=True)
    os.makedirs(cap_dir)
    tw = load_words(plan.get("transcript"))

    clips = list(plan["clips"])
    hook = plan.get("hook")
    if hook:  # short flash of the best action, zoomed in, before the story
        clips.insert(0, {"start": hook["start"], "end": hook["end"], "zoom": hook.get("zoom", 1.3),
                         "focus": hook.get("focus", 0.5), "hook": True,
                         "captions": [[hook["start"], hook["end"], hook["caption"], "gold"]]})

    gw = W                                  # game crop size on the Short
    gh = int(round(W / aspect / 2)) * 2
    inputs, fc, events = [], [], []         # events: (t0, t1, png) in OUTPUT seconds
    offset = 0.0
    k = 0

    def ev(t0, t1, png):
        if t1 - t0 > 0.01:
            events.append((t0, t1, png))

    for i, clip in enumerate(clips):
        s, e = secs(clip["start"]), secs(clip["end"])
        dur = e - s
        if dur <= 0.3:
            sys.exit(f"clip {i}: end must be after start")
        inputs += ["-ss", f"{s:.3f}", "-t", f"{dur:.3f}", "-i", src]
        z = float(clip.get("zoom", 1))
        f = min(max(float(clip.get("focus", 0.5)), 0.0), 1.0)
        # crop the action area (zoom first, then the game_aspect box centered on focus)
        cw = f"ih/{z}*{aspect}"
        chain = [f"crop=w='min(iw,{cw})':h='ih/{z}':x='max(0,min(iw-ow,iw*{f}-ow/2))':y='(ih-oh)/2'",
                 f"scale={gw}:{gh}", f"fps={FPS}"]
        push = float(clip.get("push", 0))
        if push > 0:  # slow zoom-in; work at 2x size so the move is smooth
            nfr = max(int(dur * FPS), 1)
            chain += [f"scale={gw * 2}:{gh * 2}",
                      f"zoompan=z='1+{push}*on/{nfr}':d=1:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2'"
                      f":s={gw}x{gh}:fps={FPS}"]
        fc.append(f"[{i}:v]setpts=PTS-STARTPTS,{','.join(chain)},setsar=1[v{i}]")
        fc.append(f"[{i}:a]asetpts=PTS-STARTPTS,afade=t=in:d=0.04,"
                  f"afade=t=out:st={max(dur - 0.06, 0):.3f}:d=0.06[a{i}]")

        def o(t):  # source time -> output time
            return (offset + min(max(t, s), e) - s) / speed

        for c in clip.get("captions", []):
            cs, ce, txt = max(secs(c[0]), s), min(secs(c[1]), e), c[2]
            gold = len(c) > 3 and c[3] == "gold"
            if clip.get("hook"):  # one big gold line, pops in
                p0, p1 = os.path.join(cap_dir, f"{k:03d}p.png"), os.path.join(cap_dir, f"{k:03d}.png")
                words_png(p0, txt.split(), None, True, int(CAP_SIZE * 1.15))
                words_png(p1, txt.split(), None, True, CAP_SIZE)
                ev(o(cs), min(o(cs) + POP, o(ce)), p0)
                ev(o(cs) + POP, o(ce), p1)
                k += 1
                continue
            words, times = word_times(txt, cs, ce, tw)
            for g in groups(words):
                gws = [words[x] for x in g]
                g_end = times[g[-1] + 1] if g[-1] + 1 < len(words) else ce
                for n_, x in enumerate(g):
                    t0 = times[x]
                    t1 = times[x + 1] if n_ + 1 < len(g) else g_end
                    p = os.path.join(cap_dir, f"{k:03d}.png")
                    if n_ == 0:  # pop: first 0.1 s a bit bigger
                        pp = os.path.join(cap_dir, f"{k:03d}p.png")
                        words_png(pp, gws, 0, gold, int(CAP_SIZE * 1.12))
                        ev(o(t0), min(o(t0) + POP, o(t1)), pp)
                        t0s = min(o(t0) + POP, o(t1))
                    else:
                        t0s = o(t0)
                    words_png(p, gws, n_, gold, CAP_SIZE)
                    ev(t0s, o(t1), p)
                    k += 1
        offset += dur
    n = len(clips)
    total = offset / speed

    # caption track: one PNG sequence with durations (concat demuxer), blank in the gaps
    blank = os.path.join(cap_dir, "blank.png")
    Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(blank)
    events.sort()
    lst, t = [], 0.0
    for t0, t1, p in events:
        t0 = max(t0, t)
        if t1 - t0 < 0.01:
            continue
        if t0 - t > 0.01:
            lst.append((blank, t0 - t))
        lst.append((p, t1 - t0))
        t = t1
    lst.append((blank, max(total - t, 0.1)))
    cap_list = os.path.join(cap_dir, "captions.txt")
    with open(cap_list, "w") as fh:
        fh.write("ffconcat version 1.0\n")
        for p, d in lst:
            fh.write(f"file '{p}'\nduration {d:.3f}\n")
        fh.write(f"file '{blank}'\n")

    fc.append("".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[cv][ca]")
    fc.append(f"[cv]setpts=PTS/{speed},fps={FPS},split[bgsrc][fgsrc]")
    # The Short is uploaded as-is (no DaVinci step), so set YouTube loudness here: -14 LUFS, peaks under -1.5 dB
    fc.append(f"[ca]atempo={speed},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]")
    fc.append("[bgsrc]scale=-2:1920,crop=1080:1920,boxblur=25:2,eq=brightness=-0.3[bg]")
    fc.append(f"[bg][fgsrc]overlay=0:{GAME_TOP}[base]")

    last = "base"
    idx = n
    for j, line in enumerate(plan.get("title", [])[:2]):
        p = os.path.join(cap_dir, f"title{j}.png")
        text_png(p, line["text"], GOLD if line.get("gold") else WHITE, 130 if j else 120, TITLE_Y[j])
        inputs += ["-loop", "1", "-i", p]
        fc.append(f"[{last}][{idx}:v]overlay=0:0:shortest=1[t{j}]")
        last, idx = f"t{j}", idx + 1
    inputs += ["-f", "concat", "-safe", "0", "-i", cap_list]
    fc.append(f"[{idx}:v]format=rgba,fps={FPS}[capv]")
    fc.append(f"[{last}][capv]overlay=0:0:eof_action=pass[outv]")

    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
           "-map", "[outv]", "-map", "[aout]", "-t", f"{total:.2f}", "-r", str(FPS),
           "-c:v", "h264_videotoolbox", "-b:v", "16M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
    print(f"clips={n} raw={offset:.1f}s final={total:.1f}s caption-frames={len(events)} "
          f"speed={speed} words-from-transcript={'yes' if tw else 'no'}")
    if total > 120:
        print("WARNING: longer than 120 s (our Shorts max is 2:00)")
    subprocess.run(cmd, check=True)
    lua = os.path.splitext(out)[0] + "-resolve.lua"
    write_lua(out, lua, plan.get("timeline_name", os.path.splitext(os.path.basename(out))[0]))
    print(f"output: {out}")
    print(f"resolve import: dofile('{lua}')")
    if "--check" in sys.argv:
        check(out)


if __name__ == "__main__":
    main()
