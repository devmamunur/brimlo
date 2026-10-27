# Subtitle cleaner

Turns YouTube's automatic English captions into a clean subtitle file you can upload in Studio.

What it does: removes "uh / um / mhm", "[music]" and ">>"; makes short 1–2 line subtitles; fixes game names that the auto captions get wrong (list in `fixes.json`). It cannot hear the audio, so other misheard words stay.

## Use it (about 5 minutes per video)

1. Wait until YouTube has made the automatic captions (a few hours after publish).
2. Download them:
   `yt-dlp --skip-download --write-auto-subs --sub-langs en --sub-format vtt -o "%(id)s.%(ext)s" "https://youtu.be/VIDEO_ID"`
3. Add new game-name fixes to `fixes.json` if needed (check the text for how the auto captions spell the game). If a fix turns two words into one, write `"Name ~DEL~"` so the timings stay right.
4. Make the file:
   `python3 -I tools/subtitles/vtt2srt.py VIDEO_ID.en.vtt game.srt tools/subtitles/fixes.json`
5. Studio → video → Languages → **Edit subtitles** → ⋮ → **Upload file** → With timing → pick `game.srt` → check the first lines → **Publish**.
