#!/usr/bin/env bash
# Build one episode into a finished MP4.
#   ./build.sh episodes/ekalavya/episode.txt            -> out/ekalavya.mp4
#   ./build.sh episodes/ekalavya/episode.txt out/x.mp4
#   ./build.sh timeline/some.json out/x.mp4             (pre-compiled timeline also works)
set -euo pipefail
cd "$(dirname "$0")"
SRC=${1:?usage: ./build.sh episodes/<name>/episode.txt [out.mp4]}
if [[ "$SRC" == *.txt ]]; then
  NAME=$(basename "$(dirname "$SRC")")
  OUT=${2:-out/$NAME.mp4}
  mkdir -p out
  TL="out/$NAME.json"
  python3 make_timeline.py "$SRC" "$TL"
else
  TL=$SRC; OUT=${2:-out/$(basename "${SRC%.json}").mp4}
fi
mkdir -p "$(dirname "$OUT")"
python3 render.py "$TL" "${OUT%.mp4}_silent.mp4"
python3 audio.py "$TL" "${OUT%.mp4}_audio.wav"
ffmpeg -y -v error -i "${OUT%.mp4}_silent.mp4" -i "${OUT%.mp4}_audio.wav" \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v libx264 -preset veryfast -crf 24 -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
rm -f "${OUT%.mp4}_silent.mp4"
echo "built $OUT"
