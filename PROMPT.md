# Prompt pack — "Mythic Meme" shorts

The look and pacing come from two reference videos:
- **Look and heart (mythic story):** golden-hour palette, flat 2D vector "paper-puppet" characters, gold jewellery, crossfades and ghosted flashbacks on emotional beats, an ending-first hook, a walk-away final shot.
- **Pace and jokes (Balkans-style explainer):** a question or shock hook, a visual change every 1–3s, meme inserts (chat app, game UI, signs, impact words, badges), word-by-word pop captions, a gag end card.

---

## 1. Script-writer prompt (any LLM)

```
You write 60-second vertical shorts in the "Mythic Meme" style.

STORY: <myth / historical episode>

Rules:
- ~150 words of narration, 18–22 beats, one beat every 2–3.5 s.
- Beat 1 tells the ending first ("A teacher asked a boy for his thumb.").
  Beat 2 is the shock reply in ≤5 words.
- Fast, dry, slightly sarcastic narration for setup/context beats.
  Slow, calm storyteller voice for the emotional climax (last 15 s). No jokes inside the climax.
- Include exactly 4 meme inserts across the first 40 s, chosen from:
  chat-app conversation, game UI (level up / skill bar / XP), wooden sign gag,
  impact word on a radial burst, achievement badge, rating/review card.
- Dialogue lines in quotes, max 6 words each.
- End on a single image + one line that reframes the story ("But the forest remembers who was better.").
- Optional 3 s gag end card (review card / checklist) after the emotional line.

Output a table: # | time | visual | caption (CAPS, names marked GOLD, danger words marked RED) | sfx.
```

## 2. Image / keyframe prompt (Midjourney, Flux, Ideogram, Imagen …)

```
Flat 2D vector illustration, Indian mythology, paper-cutout puppet character style,
front-facing symmetrical pose, large head, simple almond eyes, chunky torso,
long pleated dhoti, gold jewellery with red gems, soft gold rim light,
golden-hour sunset sky gradient from deep purple to orange to pale gold,
layered purple hill / forest silhouettes, low glowing sun, floating fireflies,
clean shapes, no outlines, subtle grain, vertical 9:16, cinematic,
[SCENE: <who, pose, setting, expression>]
--ar 9:16 --style raw
```
Character locks (paste into every scene):
- **Drona**: elderly sage, white beard and hair bun, three ash lines on forehead, saffron dhoti and shawl, rudraksha mala.
- **Ekalavya**: young forest archer, dark brown skin, shoulder-length black hair, red headband with one peacock feather, bead necklace, earthy green-brown dhoti, quiver.
- **Arjuna**: prince, tall conical golden crown, gold scale armour, royal blue dhoti, golden bow.

Meme-insert prompts (render as flat UI, same palette):
- `dark chat-app screenshot, channel "#ashram-admissions", messages from DRONACHARYA and EKALAVYA, red REJECTED rubber stamp, vertical 9:16`
- `game skill-tree UI over dark forest, gold frame, "ARCHERY LV 99", XP bar, archery target with arrows, "+999 XP" green text, "SELF-TAUGHT" gold stamp`
- `ashram wooden gate with hanging sign "PRINCES ONLY!" and handwritten red "no forest kids", a boy peeking from behind the post`

## 3. Image-to-video / text-to-video prompt (Veo, Kling, Runway, Sora, Hailuo …)

```
Animate this flat vector illustration like a 2D cutout puppet animation:
subtle breathing, occasional blink, cloth sway, sun rays slowly rotating,
fireflies drifting, slow camera push-in (5–10%). Keep the art flat — no 3D,
no realistic shading, no new characters. Duration 3 s, 9:16.
```
For meme beats add: `fast punch zoom in on the first frame, light camera shake, white flash`.
For emotional beats add: `very slow push-in, warm glow, soft crossfade feel, no shake`.

## 4. Edit recipe (CapCut / Premiere / this repo's renderer)

| Element | Setting |
|---|---|
| Format | 1080×1920, 30 fps, ~60 s |
| Cuts | Hard cut + 7% punch zoom + 0.12 s white flash on fast beats; 0.5 s crossfade on emotional beats |
| Captions | Poppins Bold 78 px, CAPS, white, 16 px dark stroke, word-by-word pop (132% → 100% in 0.13 s), centred at 69% of height; names gold `#FFCF4A` with glow, danger words red `#FF4A3D` |
| Title | "MAHABHARATA" in a gold serif, top, first shot only |
| Music | tanpura drone + dhol pulse at 100 bpm through the setup; drop the pulse and bring in a string pad + heartbeat for the climax |
| SFX | whoosh on every hard cut, boom on shock words, pops on chat messages, stamp on REJECTED, level-up chime, arrow twangs |
| VO | Calm, low storyteller voice; ~150 wpm; pause before the impact word and before the last line |
