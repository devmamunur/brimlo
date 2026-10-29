"""Brimlo video reader: full transcript + frame grabs from one recording.

Fast and local: ffmpeg pulls the audio, mlx-whisper (Whisper large-v3-turbo on
Apple Silicon) writes the transcript. Nothing is uploaded anywhere.

Usage:
    tools/transcribe/run.sh "/Volumes/WD Black/Videos/da-vinci/Deforest-a-Planet.mov" --game "Deforest a Planet"

Output (tools/transcribe/out/<name>/, not in git):
    transcript.txt   one line per spoken segment: [HH:MM:SS] text
    by-minute.md     the same text grouped per minute (short to read)
    subtitles.srt    upload-ready subtitles (Studio → Subtitles → Upload file → With timing)
    silences.txt     every stretch with no talking longer than --gap seconds
    frames/          evenly spaced screenshots (thumbnail references)
    contact.jpg      all frames on one sheet
    summary.json     length, words, talk %, file list
A copy of by-minute.md also goes to videos/transcripts/<name>.md (in git).
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
MODELS = {
    "turbo": "mlx-community/whisper-large-v3-turbo",  # best speed/quality
    "large": "mlx-community/whisper-large-v3-mlx",  # slower, a bit more exact
    "small": "mlx-community/whisper-small-mlx",  # quick test only
}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"Command failed: {' '.join(map(str, cmd))}\n{r.stderr[-2000:]}")
    return r.stdout


def need(tool):
    if not shutil.which(tool):
        sys.exit(f"{tool} not found. Install it with: brew install ffmpeg")


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "video"


def hms(sec, ms=False):
    sec = max(0.0, sec)
    h, rem = divmod(int(sec), 3600)
    m, s = divmod(rem, 60)
    if ms:
        return f"{h:02d}:{m:02d}:{s:02d},{int((sec % 1) * 1000):03d}"
    return f"{h:02d}:{m:02d}:{s:02d}"


def duration(video):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=nw=1:nk=1", str(video)])
    return float(out.strip())


def extract_audio(video, wav):
    if wav.exists() and wav.stat().st_size > 0:
        print("Audio: already extracted, reusing it.")
        return
    print("Audio: extracting (16 kHz mono)…")
    t = time.time()
    run(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-vn", "-ac", "1",
         "-ar", "16000", "-c:a", "pcm_s16le", str(wav)])
    print(f"Audio: done in {time.time() - t:.0f} s.")


def transcribe(wav, raw_json, model, prompt, lang):
    if raw_json.exists():
        print("Transcript: already made, reusing it (use --redo to make it again).")
        return json.loads(raw_json.read_text())
    import mlx_whisper  # import late so --help is fast

    print(f"Transcript: running Whisper ({model}). The first run downloads the model (~1.6 GB).")
    t = time.time()
    result = mlx_whisper.transcribe(
        str(wav),
        path_or_hf_repo=MODELS[model],
        language=lang,
        initial_prompt=prompt,
        # These three stop Whisper from inventing or repeating text in quiet parts.
        condition_on_previous_text=False,
        word_timestamps=True,
        hallucination_silence_threshold=2.0,
        verbose=False,
    )
    print(f"Transcript: done in {time.time() - t:.0f} s.")
    segs = [{"start": round(s["start"], 2), "end": round(s["end"], 2),
             "text": s["text"].strip(), "no_speech": round(s.get("no_speech_prob", 0), 3),
             "logprob": round(s.get("avg_logprob", 0), 3),
             "words": [[round(w["start"], 2), round(w["end"], 2)] for w in s.get("words", [])]}
            for s in result["segments"]]
    raw_json.write_text(json.dumps(segs, indent=1))
    return segs


# Common Whisper filler it writes for music or silence.
JUNK = re.compile(r"^(thanks? (you )?for watching[.!]*|you|\.+|subtitles by.*|♪+.*)$", re.I)


def clean(segs):
    out, last, repeats = [], None, 0
    for s in segs:
        text = s["text"]
        if not text or JUNK.match(text):
            continue
        if s["no_speech"] > 0.6 and s["logprob"] < -1.0:
            continue  # probably not speech
        if text == last:
            repeats += 1
            if repeats >= 2:
                continue  # Whisper loop: keep at most two copies
        else:
            repeats = 0
        last = text
        out.append(s)
    return out


def write_texts(segs, total, out, gap):
    lines = [f"[{hms(s['start'])}] {s['text']}" for s in segs]
    (out / "transcript.txt").write_text("\n".join(lines) + "\n")

    srt = []
    for i, s in enumerate(segs, 1):
        srt.append(f"{i}\n{hms(s['start'], True)} --> {hms(s['end'], True)}\n{s['text']}\n")
    (out / "subtitles.srt").write_text("\n".join(srt))

    minutes = {}
    for s in segs:
        minutes.setdefault(int(s["start"] // 60), []).append(s["text"])
    md = [f"# Transcript by minute ({hms(total)} long)", ""]
    md += [f"**{m // 60}:{m % 60:02d}** {' '.join(t)}" for m, t in sorted(minutes.items())]
    (out / "by-minute.md").write_text("\n\n".join(md) + "\n")

    # Word timings show the real quiet parts; segment times stretch over them.
    spans = [tuple(w) for s in segs for w in (s.get("words") or [[s["start"], s["end"]]])]
    silences, prev, talk = [], 0.0, 0.0
    for a, b in sorted(spans) + [(total, total)]:
        if a - prev >= gap:
            silences.append((prev, a))
        talk += max(0.0, b - max(a, prev))
        prev = max(prev, b)
    rows = [f"{hms(a)} → {hms(b)}  ({b - a:.0f} s quiet)" for a, b in silences]
    head = f"Stretches with no talking of {gap:.0f} s or more: {len(rows)}\n"
    (out / "silences.txt").write_text(head + "\n".join(rows) + "\n")

    return {"words": sum(len(s["text"].split()) for s in segs), "segments": len(segs),
            "talk_percent": round(100 * talk / total, 1) if total else 0,
            "silences": len(rows), "longest_silence_s": round(max((b - a for a, b in silences), default=0))}


def grab_frames(video, total, out, count):
    frames = out / "frames"
    if frames.exists() and len(list(frames.glob("*.jpg"))) == count:
        print("Frames: already grabbed, reusing them.")
    else:
        shutil.rmtree(frames, ignore_errors=True)
        frames.mkdir()
        print(f"Frames: grabbing {count} screenshots…")
        for i in range(count):
            t = total * (i + 0.5) / count
            run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", str(video),
                 "-frames:v", "1", "-vf", "scale=1280:-2", "-q:v", "3",
                 str(frames / f"{i + 1:02d}_{hms(t).replace(':', '-')}.jpg")])
    cols = 6
    rows = -(-count // cols)
    run(["ffmpeg", "-y", "-v", "error", "-pattern_type", "glob", "-i", str(frames / "*.jpg"),
         "-vf", f"scale=480:-2,tile={cols}x{rows}:padding=4", "-frames:v", "1", "-q:v", "3",
         str(out / "contact.jpg")])


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("video", type=Path, help="path to the .mov / .mp4 / .mkv file")
    p.add_argument("--name", help="output folder name (default: from the file name)")
    p.add_argument("--game", default="", help="game name, helps Whisper spell it right")
    p.add_argument("--model", choices=MODELS, default="turbo")
    p.add_argument("--lang", default="en")
    p.add_argument("--frames", type=int, default=24, help="how many screenshots (0 = none)")
    p.add_argument("--gap", type=float, default=20, help="list quiet stretches at least this long (s)")
    p.add_argument("--redo", action="store_true", help="make the transcript again")
    a = p.parse_args()

    need("ffmpeg")
    need("ffprobe")
    video = a.video.expanduser()
    if not video.is_file():
        sys.exit(f"File not found: {video}")
    name = slugify(a.name or video.stem)
    out = HERE / "out" / name
    out.mkdir(parents=True, exist_ok=True)
    raw_json = out / "segments.json"
    if a.redo:
        raw_json.unlink(missing_ok=True)

    start = time.time()
    total = duration(video)
    print(f"Video: {video.name}, {hms(total)} long → {out}")
    wav = out / "audio.wav"
    extract_audio(video, wav)
    prompt = f"Brimlo gameplay commentary, live while playing{f' {a.game}' if a.game else ''}. Incremental game, upgrades."
    segs = clean(transcribe(wav, raw_json, a.model, prompt, a.lang))
    stats = write_texts(segs, total, out, a.gap)
    if a.frames:
        grab_frames(video, total, out, a.frames)
    wav.unlink(missing_ok=True)  # big file; segments.json keeps the result

    copy = REPO / "videos" / "transcripts" / f"{name}.md"
    copy.parent.mkdir(exist_ok=True)
    shutil.copy(out / "by-minute.md", copy)

    summary = {"video": str(video), "game": a.game, "length": hms(total), "model": a.model,
               **stats, "seconds_taken": round(time.time() - start), "out": str(out),
               "transcript_copy": str(copy.relative_to(REPO))}
    (out / "summary.json").write_text(json.dumps(summary, indent=1))
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main()
