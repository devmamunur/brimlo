#!/usr/bin/env python3
"""OBS check for Brimlo recordings (made 18 Nov 2026).

Why: on 17 Nov 2026 at 22:51 the Mac display went to sleep (displaysleep = 30 min).
macOS stopped both OBS ScreenCaptureKit streams ("Stream stopped as no capture
source was not found"): the screen video AND "macOS Audio Capture" (game sound).
They do not come back by themselves. Two recordings were lost: one with only the
wallpaper, one with no game sound (track 2 = -91 dB, total silence).

Usage:
  python3 tools/obs-check/check.py           # before recording: check OBS + keep display awake 5 h
  python3 tools/obs-check/check.py --file X  # after recording: check video + both audio tracks of X
  python3 tools/obs-check/check.py --last    # same, for the newest recording
  python3 tools/obs-check/check.py --stop    # done for the day: let the display sleep again
"""
import argparse
import glob
import os
import re
import subprocess
import sys

LOG_DIR = os.path.expanduser("~/Library/Application Support/obs-studio/logs")
REC_DIR = "/Volumes/WD Black/Videos/obs"
SILENT_DB = -80.0  # mean volume below this = no sound at all
OK, BAD, WARN = "✅", "❌", "⚠️"


def newest(pattern):
    files = glob.glob(pattern)
    return max(files, key=os.path.getmtime) if files else None


def obs_running():
    return subprocess.run(["pgrep", "-x", "OBS"], capture_output=True).returncode == 0


def check_log():
    """True if OBS capture streams are alive (no 'Stream stopped' since OBS started)."""
    log = newest(os.path.join(LOG_DIR, "*.txt"))
    if not log:
        print(f"{WARN} No OBS log found.")
        return True
    lines = open(log, errors="ignore").read().splitlines()
    stops = [l for l in lines if "Stream stopped as no capture source" in l]
    if stops:
        t = stops[-1].split(": ")[0]
        print(f"{BAD} OBS lost its screen/game-sound capture at {t} (the display slept or changed).")
        print("   FIX: Quit OBS (Cmd+Q) and open it again. That restarts both captures.")
        print("   Then run this check again.")
        return False
    print(f"{OK} OBS captures are alive (log: {os.path.basename(log)}).")
    return True


def keep_awake(hours=5):
    # caffeinate -d keeps the display on; -i keeps the Mac awake. No system setting is changed.
    subprocess.run(["pkill", "-f", "caffeinate -d -i -t"], capture_output=True)
    subprocess.Popen(["caffeinate", "-d", "-i", "-t", str(hours * 3600)],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    print(f"{OK} Display will stay awake for {hours} hours (caffeinate).")
    print("   When you finish recording: python3 tools/obs-check/check.py --stop")


def stop_awake():
    subprocess.run(["pkill", "-f", "caffeinate -d -i -t"], capture_output=True)
    print(f"{OK} Keep-awake stopped. The display and Mac can sleep normally again.")


def mean_db(path, track, start, dur=60):
    r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-ss", str(start), "-t", str(dur),
                        "-i", path, "-map", f"0:a:{track}", "-af", "volumedetect", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"mean_volume: (-?[\d.]+) dB", r.stderr)
    return float(m.group(1)) if m else None


def check_file(path):
    print(f"File: {path}")
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type",
                        "-of", "default=nw=1", path], capture_output=True, text=True).stdout
    dur = float(re.search(r"duration=([\d.]+)", p).group(1))
    n_audio = p.count("codec_type=audio")
    print(f"   Length {dur/60:.1f} min, {n_audio} audio tracks.")
    good = True
    if n_audio < 2:
        print(f"{BAD} Only {n_audio} audio track(s). Need 2: Track 1 = voice, Track 2 = game.")
        return False
    # check start, middle and end, so a capture that died mid-recording is caught
    points = sorted({max(0, min(t, dur - 10)) for t in (5, dur / 2, dur - 70)})
    names = {0: "Track 1 (your voice)", 1: "Track 2 (game sound)"}
    for track in (0, 1):
        vals = [mean_db(path, track, s, 60 if dur > 70 else max(1, dur - s)) for s in points]
        vals = [v for v in vals if v is not None]
        silent = [v for v in vals if v < SILENT_DB]
        txt = ", ".join(f"{v:.0f} dB" for v in vals)
        if not vals or len(silent) == len(vals):
            print(f"{BAD} {names[track]}: SILENT ({txt}).")
            good = False
        elif vals[-1] < SILENT_DB or (len(vals) > 2 and vals[1] < SILENT_DB):
            print(f"{BAD} {names[track]}: goes silent part way ({txt}). The capture died during recording.")
            good = False
        elif silent:
            print(f"{WARN} {names[track]}: quiet at the start only ({txt}). Fine if the game had a quiet menu.")
        else:
            print(f"{OK} {names[track]}: has sound ({txt}).")
    if not good:
        print("   FIX for no game sound: Quit OBS (Cmd+Q), open it again, play the game,")
        print("   and watch the 'macOS Audio Capture' bar move in the Audio Mixer.")
    return good


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file")
    ap.add_argument("--last", action="store_true")
    ap.add_argument("--hours", type=int, default=5)
    ap.add_argument("--stop", action="store_true")
    a = ap.parse_args()
    if a.stop:
        stop_awake()
        return
    if a.file or a.last:
        path = a.file or newest(os.path.join(REC_DIR, "*.mov"))
        if not path:
            sys.exit(f"{BAD} No recording found in {REC_DIR}")
        ok = check_file(path)
    else:
        ok = True
        if not obs_running():
            print(f"{WARN} OBS is not open. Open OBS, then run this again.")
            ok = False
        else:
            ok = check_log()
        keep_awake(a.hours)
        print("\nNext: make a 10-second test recording with game sound playing, then run:")
        print("   python3 tools/obs-check/check.py --last")
    print("\nRESULT:", "READY ✅" if ok else "NOT READY ❌ — fix the lines above")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
