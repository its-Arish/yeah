# yeah — Mythic Meme Shorts

A reusable format for **60-second vertical shorts** that mixes two styles:
- **Mythic story look:** golden-hour palette, flat vector puppet characters, an ending-first emotional twist.
- **Meme explainer pace:** a cut every 1–3 s, chat and game-UI inserts, impact words, word-pop captions, a gag end card.

You write **one text file per episode** and get a finished MP4 (1080×1920, 30 fps, music and SFX, -14 LUFS). Everything is drawn in code: no AI-video credits, no stock assets.

## Make a video

```bash
pip install -r requirements.txt && python -m playwright install chromium   # plus ffmpeg on PATH
./build.sh episodes/ekalavya/episode.txt          # -> out/ekalavya.mp4  (~60 s video, ~4 min to render)
```

**Without installing anything:** push an `episodes/<name>/episode.txt` to GitHub. The **Build episodes** action renders it, and you download the MP4 from the run's *Artifacts*. You can also start it from *Actions → Build episodes → Run workflow*.

## New episode in 4 steps
1. `cp -r episodes/karna-armour episodes/my-story`. This template uses only generic scenes and adds new characters.
2. Write the script. The script-writer prompt in [PROMPT.md](PROMPT.md) gives you ~150 words in the right beat structure.
3. Turn each beat into a line of `episode.txt`. All columns, scenes, poses and data keys are in [FORMAT.md](FORMAT.md).
4. Check a few frames, then build:
   ```bash
   python3 make_timeline.py episodes/my-story/episode.txt out/my-story.json
   python3 render.py out/my-story.json out/stills --stills 1,5,12,30
   ./build.sh episodes/my-story/episode.txt
   ```

## What's inside

| Path | What it is |
|---|---|
| `episodes/ekalavya/` | The full 61 s reference episode (`episode.txt`) and its script and VO read (`script.md`) |
| `episodes/karna-armour/` | A 23 s template built only from generic scenes and custom characters |
| `make_timeline.py` | Compiles `episode.txt` into the timeline JSON (caption timing, highlights, SFX cues, music sections, cameras) |
| `renderer/` | Canvas renderer: `lib.js` (backgrounds, puppet characters, props), `scenes.js` (scenes, including the generic `stage`), `index.html` (camera, transitions, captions), `fonts/` (bundled, OFL) |
| `render.py` | Renders frames in headless Chromium and pipes them to ffmpeg; `--stills` gives quick previews |
| `audio.py` | Synthesized tanpura drone, dhol pulse, string pad, heartbeat and all SFX, driven by the timeline |
| `export_sfx.py` | Exports every sound as a separate WAV, plus a cue sheet |
| `build.sh` | Episode to finished MP4 |
| `PROMPT.md` | Prompt pack: script writer, keyframe/image prompts, image-to-video prompts, edit recipe |
| `.github/workflows/build-episodes.yml` | Cloud rendering on push |

## Voice-over
The build adds no voice; the captions carry the story. To add one, record or generate a VO from `script.md`, then:
```bash
ffmpeg -i out/ekalavya.mp4 -i vo.wav -filter_complex "[0:a]volume=0.35[m];[m][1:a]amix=inputs=2:duration=first" -c:v copy out/ekalavya_vo.mp4
```
