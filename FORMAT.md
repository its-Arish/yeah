# The episode format

Each video is one plain-text file: `episodes/<name>/episode.txt`. One line is one shot.

```
title: Why Ekalavya gave his thumb away
fps: 30
cast: {"karna": {"base": "arjuna", "dhoti": "#a8322a"}}      # optional new characters

# scene | secs | in  | mood | captions                                  | fx
title   | 3.2  | black | fast | A teacher asked a boy / for his !THUMB.!  | riser_short@0
  > title: MAHABHARATA
boyYes  | 2.0  | cut   | fast | And the boy said *YES.*                   | punch@0.75
```

| Column | Values |
|---|---|
| **scene** | A scene name from the tables below. Use `stage` for anything new. |
| **secs** | Shot length. The whole video is the sum, so aim for about 60. |
| **in** | `cut` (punch-zoom, flash and an automatic whoosh), `fade` (0.5 s crossfade, for emotional beats), `black` (fade up from black, for the first shot) |
| **mood** | `fast` (drum pulse), `calm` (drone only), `sad` (string pad), `heartbeat` (pad plus heartbeat) |
| **captions** | ` / ` starts a new on-screen line. Lines are spread evenly across the shot and pop in word by word. `*gold*` marks names (and can cover several words), `!red!` marks danger words, `-` means no caption. |
| **fx** | `name@seconds-into-shot`, separated by spaces. `punch@s` adds a zoom, shake and flash plus a boom. `nowhoosh` turns off the cut whoosh. Sounds: `whoosh impact riser riser_short pop ding stamp arrow thunk bark levelup dramatic arrows7` |
| **`> key: value`** | Data for the shot above it. Values can be plain text or JSON. `> cam: {"z":[1,1.1],"x":[540,540],"y":[960,940]}` overrides the camera (start to end; the canvas is 1080×1920). |

## Beat rules (what makes the format work)
1. **Shot 1 tells the ending.** **Shot 2 is the shock reply** in 5 words or fewer, with a `punch`.
2. **Every 2–3.5 s something changes.** Use `cut` for the setup.
3. **Use 3–5 meme inserts in the first 40 s:** `chat`, `sign`, `levelup`, `problem` (impact word), a `badge` on a stage shot.
4. **The impact word comes just before the confrontation.** Switch the mood to `calm` there.
5. **The climax uses `fade` and `sad` or `heartbeat` moods, with no jokes.** End on one image and a line that reframes the story.
6. **Optional 3 s `review` card as the last joke.**

## Scenes

### Generic (for any story)
| scene | data keys |
|---|---|
| `stage` | `bg`: `sunset` / `forest` / `ashram` / `battlefield`; `dusk` 0–1; `sun` `{"x","y","r","rays","ring","big"}`; `chars`: list of characters (below); `title`; `badge`; `tint: red`; `flashback: true`; `fireflies` (count) |
| `chat` | `channel`, `messages` `[[sec, who, NAME, text], …]`, `typer`, `left` (name, or `""` for none), `leftAt`, `stamp` (or `""`), `stampAt` |
| `sign` | `small` (`line1\|line2`), `big` (`LINE1\|LINE2`), `scribble` |
| `levelup` | `who`, `header`, `skill`, `sub`, `stamp` |
| `problem` | `word`, `who` (avatar, or `""`) |
| `review` | `header`, `who`, `name`, `sub`, `rows` `[[sec, stars, quote, author], …]` |

### Character entry (inside `chars`)
```json
{"who": "eka", "x": 540, "y": 1750, "h": 1000, "pose": "namaste", "expr": "neutral",
 "kneel": false, "eyes": "open", "look": 0, "clay": false, "leaf": false, "tear": false,
 "switch": 1.2, "pose2": "point", "expr2": "stern", "enter": 0.4}
```
- **x, y:** feet position. **h:** full height in px (1000 is a medium shot; for a close-up use h about 2000 with y about 2600).
- **pose:** `down`, `namaste`, `point`, `bowdraw`, `bless`, `offer`, `holdbow`, `shoulderbow`, `shock`
- **expr:** `neutral`, `smile`, `stern`, `sad`, `shock`. `eyes: closed` closes the eyes. `look` runs from -1 to 1. `clay: true` makes a terracotta statue.
- **switch:** the second at which `pose2`/`expr2` take over. **enter:** fade-in duration.

### Built-in characters, and making new ones
`drona` (sage), `eka` (forest archer), `arjuna` (crowned prince), `prince`. To make a new character, start from a built-in one in the `cast:` header and override any of `skin`, `dhoti`, `border`, `hair` (`drona`/`eka`/`arjuna`), `top` (`bare`/`armour`/`shawl`), `tilak` (`red`/`ash`), `neck` (`mala`/`gold`/`beads`), `quiver`, `band`.

### Story-specific scenes (Ekalavya episode; reusable as-is)
`title boyYes drona clay practice dog noScratch arjuna promise meet youAre fee hand offer bowdown legend`. Each one draws a fixed composition. For a new story, write the shot as a `stage` instead, or add a function to `renderer/scenes.js`.
