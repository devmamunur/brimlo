"""Brimlo Short maker: cut clips from a long video, speed up, 1080x1920, burned captions.

Usage:
  tools/hook/.venv/bin/python tools/shorts/make_short.py tools/shorts/plans/<slug>.json
  tools/hook/.venv/bin/python tools/shorts/make_short.py tools/shorts/plans/<slug>.json --check

The plan file (JSON) says what to cut. All times are in the SOURCE video, as
seconds (7356.3) or "H:MM:SS.s" ("2:02:36.3"):

{
  "source": "/Volumes/WD Black/Videos/da-vinci/My Video.mp4",
  "output": "/Volumes/WD Black/Videos/da-vinci/shorts/my-video-short.mp4",
  "speed": 1.1,
  "title": [{"text": "ONE KNIFE", "gold": false}, {"text": "TO MINIGUN", "gold": true}],
  "clips": [
    {"start": "2:02:36.3", "end": "2:02:43.1",
     "captions": [["2:02:36.3", "2:02:40.3", "This single zombie child"],
                  ["2:02:40.3", "2:02:43.1", "defeated me. Oh my god!", "gold"]]}
  ]
}

Layout: blurred, darker copy of the game fills the 9:16 frame; the full 16:9 game
sits in the middle (y=620); title at the top (y 330/470); captions under the game
(y=1450). Audio: tiny fades at every cut, then atempo (voice pitch stays the same).
Encoder: h264_videotoolbox 12 Mb/s + AAC 192k. Needs ffmpeg + Pillow (no drawtext/libass needed).

--check  also writes <output>-check.jpg (8 frames on one sheet) and prints loudness.
Also writes <output>-resolve.lua: run it in DaVinci (Workspace > Console, Lua):
  dofile('<that path>')  -> imports the Short and makes a 1080x1920 timeline.
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

FONT = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
W, H = 1080, 1920
NAVY = (11, 16, 35, 255)
GOLD = (255, 200, 61, 255)
WHITE = (255, 255, 255, 255)
GAME_Y = 620          # top of the 16:9 game picture (1080x608)
CAPTION_Y = 1450      # center of caption text
TITLE_Y = (330, 470)  # centers of title line 1 and 2


def secs(t):
    if isinstance(t, (int, float)):
        return float(t)
    parts = [float(p) for p in str(t).split(":")]
    s = 0.0
    for p in parts:
        s = s * 60 + p
    return s


def text_png(path, text, color, size, y_center, max_w=980):
    while True:
        font = ImageFont.truetype(FONT, size)
        l, t, r, b = font.getbbox(text)
        if r - l <= max_w or size <= 40:
            break
        size -= 4
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = (W - (r - l)) // 2 - l
    y = y_center - (b - t) // 2 - t
    d.text((x, y), text, font=font, fill=color, stroke_width=max(6, size // 11), stroke_fill=NAVY)
    img.save(path)


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
tl:SetSetting("timelineFrameRate", "30")
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
    frames = []
    for i in range(8):
        t = dur * (i + 0.5) / 8
        p = os.path.join(tmp, f"c{i}.jpg")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", out,
                        "-frames:v", "1", "-vf", "scale=270:480", p], check=True)
        frames.append(p)
    sheet = base + "-check.jpg"
    args = []
    for p in frames:
        args += ["-i", p]
    layout = "0_0|w0_0|w0+w1_0|w0+w1+w2_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex",
                    "".join(f"[{i}]" for i in range(8)) + f"xstack=inputs=8:layout={layout}", sheet], check=True)
    for p in frames:
        os.remove(p)
    os.rmdir(tmp)
    r = subprocess.run(["ffmpeg", "-nostats", "-i", out, "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True)
    lufs = [l.strip() for l in r.stderr.splitlines() if l.strip().startswith("I:")]
    print(f"check sheet: {sheet}")
    print(f"length: {dur:.1f}s  loudness: {lufs[-1] if lufs else '?'}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    plan_path = sys.argv[1]
    plan = json.load(open(plan_path))
    src, out = plan["source"], plan["output"]
    speed = float(plan.get("speed", 1.1))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cap_dir = os.path.splitext(out)[0] + "-caps"
    os.makedirs(cap_dir, exist_ok=True)

    clips = list(plan["clips"])
    hook = plan.get("hook")
    if hook:  # 1-1.5 s flash of the best action, zoomed in, before the story
        clips.insert(0, {"start": hook["start"], "end": hook["end"], "zoom": hook.get("zoom", 1.3),
                         "captions": [[hook["start"], hook["end"], hook["caption"], "gold"]]})
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=width,height", "-of", "csv=p=0", src], capture_output=True, text=True).stdout
    # .mov files can print extra stream-group lines; take the first "W,H" line
    sw, sh = next(map(int, l.split(",")[:2]) for l in probe.splitlines() if l.count(",") >= 1)

    inputs, fc, caps = [], [], []
    offset = 0.0
    for i, clip in enumerate(clips):
        s, e = secs(clip["start"]), secs(clip["end"])
        dur = e - s
        if dur <= 0.3:
            sys.exit(f"clip {i}: end must be after start")
        inputs += ["-ss", f"{s:.3f}", "-t", f"{dur:.3f}", "-i", src]
        z = float(clip.get("zoom", 1))
        zoom = f",crop=iw/{z}:ih/{z},scale={sw}:{sh}" if z > 1 else ""
        fc.append(f"[{i}:v]setpts=PTS-STARTPTS{zoom},setsar=1[v{i}]")
        fc.append(f"[{i}:a]asetpts=PTS-STARTPTS,afade=t=in:d=0.04,"
                  f"afade=t=out:st={max(dur - 0.06, 0):.3f}:d=0.06[a{i}]")
        for c in clip.get("captions", []):
            cs, ce, txt = secs(c[0]), secs(c[1]), c[2]
            gold = len(c) > 3 and c[3] == "gold"
            a = (offset + max(cs, s) - s) / speed
            b = (offset + min(ce, e) - s) / speed
            caps.append((a, b, txt, gold))
        offset += dur
    n = len(clips)
    total = offset / speed

    fc.append("".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[cv][ca]")
    fc.append(f"[cv]setpts=PTS/{speed},fps=30,split[bgsrc][fgsrc]")
    # The Short is uploaded as-is (no DaVinci step), so set YouTube loudness here: -14 LUFS, peaks under -1.5 dB
    fc.append(f"[ca]atempo={speed},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]")
    fc.append("[bgsrc]scale=-2:1920,crop=1080:1920,boxblur=25:2,eq=brightness=-0.25[bg]")
    fc.append("[fgsrc]scale=1080:-2[fg]")
    fc.append(f"[bg][fg]overlay=0:{GAME_Y}[base]")

    images = []  # (file, enable window or None)
    for j, line in enumerate(plan.get("title", [])[:2]):
        p = os.path.join(cap_dir, f"title{j}.png")
        text_png(p, line["text"], GOLD if line.get("gold") else WHITE, 130 if j else 120, TITLE_Y[j])
        images.append((p, None))
    for k, (a, b, txt, gold) in enumerate(caps):
        p = os.path.join(cap_dir, f"cap{k:02d}.png")
        text_png(p, txt, GOLD if gold else WHITE, 96, CAPTION_Y)
        images.append((p, (a, b)))

    last = "base"
    for j, (p, win) in enumerate(images):
        inputs += ["-loop", "1", "-i", p]
        idx = n + j
        enable = f":enable='between(t,{win[0]:.2f},{win[1]:.2f})'" if win else ""
        fc.append(f"[{last}][{idx}:v]overlay=0:0:shortest=1{enable}[o{j}]")
        last = f"o{j}"

    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
           "-map", f"[{last}]", "-map", "[aout]", "-t", f"{total:.2f}",
           "-c:v", "h264_videotoolbox", "-b:v", "12M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
    print(f"clips={n} raw={offset:.1f}s final={total:.1f}s captions={len(caps)} speed={speed}")
    if total > 60:
        print("WARNING: longer than 60 s")
    subprocess.run(cmd, check=True)
    lua = os.path.splitext(out)[0] + "-resolve.lua"
    write_lua(out, lua, plan.get("timeline_name", os.path.splitext(os.path.basename(out))[0]))
    print(f"output: {out}")
    print(f"resolve import: dofile('{lua}')")
    if "--check" in sys.argv:
        check(out)


if __name__ == "__main__":
    main()
