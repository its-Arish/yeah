# Notes for AI assistants working in this repo

- Episodes live in `episodes/<name>/episode.txt` (format: FORMAT.md). Writing a new video means writing that file. Prefer the generic `stage`, `chat`, `sign`, `levelup`, `problem` and `review` scenes over adding new code.
- Pipeline: `make_timeline.py` → `out/<name>.json` → `render.py` (Playwright + canvas → ffmpeg) + `audio.py` (numpy synth) → `build.sh` writes aligned stems to `out/<name>/`: video (with and without captions, no audio), music.wav, sfx.wav (all SFX on one full-length track), mix.wav, captions.srt, markers.csv, preview.mp4. Stems must stay exactly the timeline length; build.sh checks this.
- Before a full render, check `python3 render.py out/<name>.json out/stills --stills t1,t2,...` and look at the frames. Captions sit at y≈1335 (69%), so keep faces above that.
- Keep the beat rules in FORMAT.md: ending-first hook, a change every 2–3.5 s, 3–5 meme inserts early, `calm` before the confrontation, `fade` + `sad` for the climax, optional `review` gag card.
- A new character is a `cast:` override of a built-in one. New poses go in `POSES` and new hair/top styles in `drawPerson` in `renderer/lib.js`.
- `out/` is git-ignored. Never commit rendered video.
