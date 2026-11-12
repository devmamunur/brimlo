"""Print word-level times from a transcript, to pick exact cut points for a Short.

Usage:
  python3 tools/shorts/words.py <transcript-name> [--from 2:02:00] [--to 2:10:00]

<transcript-name> = the folder in tools/transcribe/out/ (e.g. 2026-10-23-outbreak-z).
Each line: [segment start] word@seconds ...   and "end <seconds>" after each segment.
Cut BETWEEN words: start a clip ~0.1-0.3 s before its first word, end it just after
the last word's end. Whisper word times can be off by ~0.2 s, so leave that margin.
"""
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "transcribe", "out")


def secs(t):
    s = 0.0
    for p in str(t).split(":"):
        s = s * 60 + float(p)
    return s


def hms(t):
    return "%d:%02d:%05.2f" % (t // 3600, t % 3600 // 60, t % 60)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    name = sys.argv[1]
    a = secs(sys.argv[sys.argv.index("--from") + 1]) if "--from" in sys.argv else 0
    b = secs(sys.argv[sys.argv.index("--to") + 1]) if "--to" in sys.argv else 10 ** 9
    segs = json.load(open(os.path.join(ROOT, name, "segments.json")))
    for s in segs:
        if s["end"] < a or s["start"] > b:
            continue
        toks = s["text"].split()
        ws = s.get("words") or []
        if ws and len(ws) == len(toks):
            line = " ".join(f"{tok}@{w[0]:.1f}" for tok, w in zip(toks, ws))
            end = ws[-1][1]
        else:  # word count mismatch: show the segment only
            line = s["text"].strip()
            end = s["end"]
        print(f"[{hms(s['start'])}] {line}")
        print(f"    end {end:.1f}")


if __name__ == "__main__":
    main()
