#!/bin/sh
# Brimlo video reader. Usage: tools/transcribe/run.sh "/path/to/video.mov" --game "Game Name"
DIR="$(cd "$(dirname "$0")" && pwd)"
exec uv run --quiet --project "$DIR" python "$DIR/transcribe.py" "$@"
