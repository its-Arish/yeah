#!/usr/bin/env bash
# Build one episode into separate, frame/sample-aligned editing stems.
#
#   ./build.sh episodes/ekalavya/episode.txt
#
# -> out/ekalavya/
#      ekalavya_video.mp4              video with burned-in captions; no audio (or the voice-over, if the episode has one)
#      ekalavya_vo.wav                 (voice-over episodes) the processed VO, aligned to 0:00
#      ekalavya_video_nocaptions.mp4   same video without captions (skip with NOCAPS=0)
#      ekalavya_music.wav              music bed only      } 24-bit 44.1 kHz stereo, exactly the
#      ekalavya_sfx.wav                ALL sound effects on one track } video length, start at 0:00
#      ekalavya_mix.wav                music + sfx (reference)
#      ekalavya_captions.srt           caption timings (re-style captions in your editor)
#      ekalavya_markers.csv            every shot / caption / sfx cue / music section with timecodes
#      ekalavya_preview.mp4            everything combined, loudness-normalized (-14 LUFS)
#      ekalavya_timeline.json          the compiled timeline these files were made from
#
# Drop video + music + sfx on three tracks at 0:00 and they line up exactly.
set -euo pipefail
cd "$(dirname "$0")"
SRC=${1:?usage: ./build.sh episodes/<name>/episode.txt}
NAME=$(basename "$(dirname "$SRC")"); [[ "$SRC" == *.json ]] && NAME=$(basename "${SRC%.json}")
DIR=out/$NAME; P=$DIR/$NAME
mkdir -p "$DIR"
if [[ "$SRC" == *.txt ]]; then python3 make_timeline.py "$SRC" "${P}_timeline.json"; else cp "$SRC" "${P}_timeline.json"; fi
TL=${P}_timeline.json

HAS_VO=$(python3 -c "import json,sys; print(1 if json.load(open(sys.argv[1])).get('vo') else 0)" "$TL")
# voice-over episodes: captions + VO go together in the main video, so no caption-free copy by default
[[ "$HAS_VO" == "1" ]] && NOCAPS=${NOCAPS:-0}
python3 render.py "$TL" "${P}_video.mp4" &
PIDS=$!
if [[ "${NOCAPS:-1}" != "0" ]]; then python3 render.py "$TL" "${P}_video_nocaptions.mp4" --no-captions & PIDS="$PIDS $!"; fi
python3 audio.py "$TL" "$P"
python3 export_meta.py "$TL" "$P"
for p in $PIDS; do wait "$p"; done

if [[ "$HAS_VO" == "1" ]]; then   # main video = picture + captions + voice-over (same level as the stems)
  ffmpeg -y -v error -i "${P}_video.mp4" -i "${P}_vo.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "${P}_video_vo.mp4"
  mv "${P}_video_vo.mp4" "${P}_video.mp4"
fi
ffmpeg -y -v error -i "${P}_video.mp4" -i "${P}_mix.wav" -map 0:v -map 1:a \
  -af loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100 -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${P}_preview.mp4"

python3 - "$TL" "$DIR" <<'EOF'
import json, subprocess, sys, pathlib
tl = json.load(open(sys.argv[1])); d = pathlib.Path(sys.argv[2])
want = round(tl['duration'] * tl.get('fps', 30))
for f in sorted(d.glob('*_video*.mp4')):
    n = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', str(f)], capture_output=True, text=True).stdout.strip())
    print(f'{f.name}: {n} frames ({n / tl.get("fps", 30):.3f}s)', '' if n == want else f'  !! expected {want}')
for f in sorted(d.glob('*.wav')):
    n = int(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=duration_ts', '-of', 'csv=p=0', str(f)], capture_output=True, text=True).stdout.strip())
    print(f'{f.name}: {n} samples ({n / 44100:.3f}s)')
EOF
echo "built $DIR/"
