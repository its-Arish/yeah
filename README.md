# yeah — Mythic Meme Shorts

A reusable format for **60-second vertical shorts** that mixes two styles:
- **Mythic story look:** golden-hour palette, flat vector puppet characters, an ending-first emotional twist.
- **Meme explainer pace:** a cut every 1–3 s, chat and game-UI inserts, impact words, word-pop captions, a gag end card.

You write **one text file per episode** and get **separate editing stems that line up exactly**: the video, the music and the SFX, each exactly as long as the timeline. Drop them on three tracks at 0:00 in CapCut, Premiere, DaVinci or Final Cut and keep editing. Everything is drawn in code: no AI-video credits, no stock assets.

## What a build gives you (`out/<name>/`)

| File | What it is |
|---|---|
| `<name>_video.mp4` | 1080×1920, 30 fps, captions burned in, **no audio** |
| `<name>_video_nocaptions.mp4` | The same video without captions, so you can restyle them in your editor (skip with `NOCAPS=0`) |
| `<name>_music.wav` | Music bed only (drone, drums, pad, heartbeat). 24-bit, 44.1 kHz stereo |
| `<name>_sfx.wav` | **All** sound effects on **one** track, same length as the video, each effect at its exact cue |
| `<name>_mix.wav` | music + sfx summed, for reference |
| `<name>_captions.srt` | Caption timings, to import as subtitles/text in your editor |
| `<name>_markers.csv` | Every shot, caption, SFX cue and music section with start/end in seconds, frames and timecode |
| `<name>_preview.mp4` | Everything combined, -14 LUFS, ready to post as-is |
| `<name>_timeline.json` | The compiled timeline these files were made from |

Video and WAVs are exactly the same length (frame/sample-checked at the end of every build). Music and SFX share one gain, so both faders at 0 dB give the intended balance. Peaks are at most -1 dBFS.

## Make a video

```bash
pip install -r requirements.txt && python -m playwright install chromium   # plus ffmpeg on PATH
./build.sh episodes/ekalavya/episode.txt          # -> out/ekalavya/  (~6 min for a 60 s episode)
```

**Without installing anything:** push an `episodes/<name>/episode.txt` to GitHub. The **Build episodes** action renders it, and you download the stems folder from the run's *Artifacts*. You can also start it from *Actions → Build episodes → Run workflow*.

## New episode in 4 steps
1. `cp -r episodes/karna-armour episodes/my-story`. This template uses only generic scenes and adds new characters.
2. Write the script. The script-writer prompt in [PROMPT.md](PROMPT.md) gives you ~150 words in the right beat structure.
3. Turn each beat into a line of `episode.txt`. All columns, scenes, poses and data keys are in [FORMAT.md](FORMAT.md).
4. Check a few frames, then build:
   ```bash
   python3 make_timeline.py episodes/my-story/episode.txt out/my-story/my-story_timeline.json
   python3 render.py out/my-story/my-story_timeline.json out/stills --stills 1,5,12,30
   ./build.sh episodes/my-story/episode.txt
   ```

## What's inside

| Path | What it is |
|---|---|
| `episodes/ekalavya/` | The full 61 s reference episode (`episode.txt`) and its script and VO read (`script.md`) |
| `episodes/shabari/` | Ramayana Ep 1, a 99 s voice-over episode (VO, alignment, Ramayana cast) |
| `episodes/kumbhakarna/` | Ramayana Ep 2, a 95 s voice-over episode (Kumbhakarna, ten-headed Ravana, Saraswati, elephants, autocorrect gag) |
| `episodes/jatayu/` | Ramayana Ep 3, an 84 s voice-over episode (Jatayu vs Ravana, VS screen, funeral pyre) |
| `episodes/karna-armour/` | A 23 s template built only from generic scenes and custom characters |
| `make_timeline.py` | Compiles `episode.txt` into the timeline JSON (caption timing, highlights, SFX cues, music sections, cameras) |
| `renderer/` | Canvas renderer: `lib.js` (backgrounds, puppet characters, props), `scenes.js` (scenes, including the generic `stage`), `index.html` (camera, transitions, captions), `fonts/` (bundled, OFL) |
| `render.py` | Renders frames in headless Chromium and pipes them to ffmpeg; `--stills` gives quick previews |
| `audio.py` | Synthesized tanpura drone, dhol pulse, string pad, heartbeat and all SFX, driven by the timeline |
| `vo_align.py` | Fits the script's caption lines to a voice-over recording (pause detection plus a speaking-rate fit), giving word-level timings |
| `export_meta.py` | Writes the SRT captions and the markers CSV |
| `export_sfx.py` | (optional) Exports each sound as its own short WAV, if you want a sound library |
| `build.sh` | Episode → all the stems above |
| `PROMPT.md` | Prompt pack: script writer, keyframe/image prompts, image-to-video prompts, edit recipe |
| `.github/workflows/build-episodes.yml` | Cloud rendering on push |

## Voice-over
**Voice-over episodes** (for example `episodes/shabari`): put the recording next to `episode.txt` and run `vo_align.py`. The whole video is then timed to the voice, and `<name>_video.mp4` comes out with the voice-over and captions built in. See FORMAT.md, "Voice-over episodes".

Without a VO file, the build adds no voice and the captions carry the story. Record or generate a VO from `script.md` and put it on a fourth track in your editor. Use `markers.csv` to line lines up with shots, and duck the music track by about 6–8 dB under the voice.
