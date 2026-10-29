# Video reader (transcript + screenshots)

Reads one recording on this Mac and makes a full transcript and screenshots, so Claude can see what happened in the video and suggest a better title, description, chapters and thumbnail.

- **Fast:** Whisper large-v3-turbo through **mlx-whisper** (open source, made for Apple Silicon). A 56-minute video takes about **4–5 minutes** on the Mac mini M4.
- **Local:** nothing is uploaded. Audio is pulled with **ffmpeg**.
- **Safe on quiet parts:** settings stop Whisper from inventing or repeating text when you are not talking.

## Use it

Tell Claude: *"read my video: /Volumes/WD Black/Videos/da-vinci/Game.mov"*. Or run it yourself:

```bash
tools/transcribe/run.sh "/Volumes/WD Black/Videos/da-vinci/Deforest-a-Planet.mov" --game "Deforest a Planet" --name 2026-10-30-deforest-a-planet
```

Use the **edited DaVinci export**, so the timestamps match the YouTube video. Use `--name` with the video file's name in `videos/` (without `.md`).

Options: `--frames 24` (number of screenshots, 0 = none) · `--gap 20` (list quiet stretches at least this long, in seconds) · `--model turbo|large|small` · `--redo` (make the transcript again).

## What you get

In `tools/transcribe/out/<name>/` (not in git):

| File | What it is |
|---|---|
| `transcript.txt` | Every line with its time: `[00:12:34] text` |
| `by-minute.md` | The same text grouped per minute (short to read). A copy goes to `videos/transcripts/<name>.md` |
| `subtitles.srt` | Subtitles you can upload in Studio (Subtitles → Upload file → With timing). Better than the YouTube auto captions |
| `silences.txt` | Every stretch where you do not talk (rule 5: no long silent parts) |
| `frames/` + `contact.jpg` | Evenly spaced screenshots, and all of them on one sheet: thumbnail references |
| `summary.json` | Length, words, talk %, longest quiet part |

## Setup (done once, 30 Oct 2026)

`brew install ffmpeg` · `uv` installs Python 3.12 + mlx-whisper into `tools/transcribe/.venv` on the first run · the model (~1.6 GB) downloads to `~/.cache/huggingface` on the first run.

## Limits

- Whisper sometimes mishears game words (e.g. "bold" for "bald", "x" for "axe"). Check names before you use a line in a title.
- No speaker split. Game voices may show up as text.
