#!/usr/bin/env python3
"""Compile a plain-text episode file into a renderer timeline JSON.

usage: python3 make_timeline.py episodes/ekalavya/episode.txt [out.json]

Episode format (see FORMAT.md):
    title: Why Ekalavya gave his thumb away
    fps: 30

    # scene | secs | in | mood | captions | fx
    title | 3.2 | black | fast | A teacher asked a boy / for his !THUMB.! | riser_short@0
      > title: MAHABHARATA

- captions: split into on-screen lines with " / "; *WORD* = gold, !WORD! = red; "-" = no caption
- in:   cut | fade | black
- mood: fast (drum pulse) | calm (drone only) | sad (string pad) | heartbeat (pad + heartbeat)
- fx:   name@seconds-into-shot ...; punch@s = zoom/shake/flash + impact boom; nowhoosh = no cut whoosh
- "> key: value" lines under a shot pass data to that scene (JSON or plain text); "> cam: {...}" overrides the camera
"""
import json, re, sys, pathlib

SFX_NAMES = {'whoosh', 'impact', 'riser', 'riser_short', 'pop', 'ding', 'stamp', 'arrow', 'thunk', 'bark', 'levelup', 'dramatic', 'arrows7'}
DEFAULT_CAM = {"z": [1.0, 1.08], "x": [540, 540], "y": [960, 960]}
SCENE_CAMS = {
    "title": {"z": [1.0, 1.12], "x": [540, 560], "y": [1100, 1080]},
    "boyYes": {"z": [1.0, 1.06], "x": [540, 540], "y": [960, 940]},
    "drona": {"z": [1.05, 1.15], "x": [520, 540], "y": [1050, 1000]},
    "sign": {"z": [1.0, 1.1], "x": [540, 560], "y": [900, 880]},
    "chat": {"z": [1.0, 1.0], "x": [540, 540], "y": [960, 960]},
    "clay": {"z": [1.0, 1.1], "x": [540, 600], "y": [1150, 1100]},
    "practice": {"z": [1.1, 1.0], "x": [520, 540], "y": [1050, 1050]},
    "levelup": {"z": [1.0, 1.0], "x": [540, 540], "y": [960, 960]},
    "dog": {"z": [1.0, 1.08], "x": [540, 600], "y": [1200, 1200]},
    "noScratch": {"z": [1.0, 1.06], "x": [540, 540], "y": [960, 960]},
    "arjuna": {"z": [1.0, 1.18], "x": [540, 540], "y": [1000, 960]},
    "promise": {"z": [1.1, 1.0], "x": [540, 540], "y": [1050, 1050]},
    "problem": {"z": [1.0, 1.0], "x": [540, 540], "y": [960, 960]},
    "meet": {"z": [1.0, 1.1], "x": [540, 540], "y": [1150, 1120]},
    "youAre": {"z": [1.0, 1.08], "x": [540, 540], "y": [900, 880]},
    "fee": {"z": [1.0, 1.18], "x": [540, 540], "y": [880, 800]},
    "hand": {"z": [1.0, 1.12], "x": [540, 500], "y": [960, 900]},
    "offer": {"z": [1.12, 1.0], "x": [540, 540], "y": [1150, 1150]},
    "bowdown": {"z": [1.0, 1.1], "x": [540, 540], "y": [960, 940]},
    "legend": {"z": [1.15, 1.0], "x": [600, 540], "y": [1100, 1050]},
    "review": {"z": [1.0, 1.04], "x": [540, 540], "y": [960, 960]},
}
MOODS = {'fast': ['pulse'], 'calm': [], 'sad': ['pad'], 'heartbeat': ['pad', 'heartbeat']}


def parse_value(v):
    v = v.strip()
    try:
        return json.loads(v)
    except Exception:
        return v


def caption_line(text):
    """*gold* and !red! markers; a marked span may cover several words (*GOD MODE.*)."""
    hl, words, mode = {}, [], None
    for tok in text.upper().split():
        opened = None
        if mode is None and tok[:1] in '*!' or (mode is None and len(tok) > 1 and tok[0] in '"\'(' and tok[1] in '*!'):
            i = 0 if tok[0] in '*!' else 1
            opened = tok[i]; mode = 'gold' if opened == '*' else 'red'
            tok = tok[:i] + tok[i + 1:]
        cur = mode
        mark = '*' if cur == 'gold' else '!'
        if cur and mark in tok:
            tok = tok.replace(mark, '', 1); mode = None
        elif cur is None:
            for mk, col in (('*', 'gold'), ('!', 'red')):
                if tok.count(mk) >= 2:
                    tok = tok.replace(mk, ''); cur = col
        words.append(tok)
        if cur: hl[tok] = cur
    return ' '.join(words), hl


def compile_episode(src):
    meta, shots = {}, []
    for ln_no, raw in enumerate(src.splitlines(), 1):
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        if line.lstrip().startswith('>'):
            if not shots:
                raise SystemExit(f'line {ln_no}: "> data" line before any shot')
            k, _, v = line.lstrip()[1:].partition(':')
            shots[-1]['data'][k.strip()] = parse_value(v)
            continue
        if '|' not in line and ':' in line and not shots:
            k, _, v = line.partition(':'); meta[k.strip()] = v.strip(); continue
        cols = [c.strip() for c in line.split('|')]
        if len(cols) < 5:
            raise SystemExit(f'line {ln_no}: need "scene | secs | in | mood | captions [| fx]"')
        scene, secs, tin, mood, caps = cols[:5]
        fx = cols[5].split() if len(cols) > 5 else []
        if tin not in ('cut', 'fade', 'black'):
            raise SystemExit(f'line {ln_no}: "in" must be cut, fade or black')
        if mood not in MOODS:
            raise SystemExit(f'line {ln_no}: mood must be one of {", ".join(MOODS)}')
        shots.append(dict(scene=scene, secs=float(secs), tin=tin, mood=mood, caps=caps, fx=fx, data={}))

    fps = int(meta.get('fps', 30))
    tl = {"title": meta.get('title', 'Untitled'), "fps": fps, "shots": [], "captions": [], "sfx": [],
          "music": {"pulse": [], "pad": [], "heartbeat": []}}
    if 'cast' in meta:
        tl['cast'] = parse_value(meta['cast'])
    t = 0.0
    for i, s in enumerate(shots):
        t0, t1 = round(t, 3), round(t + s['secs'], 3)
        data = dict(s['data'])
        cam = data.pop('cam', None) or SCENE_CAMS.get(s['scene'], DEFAULT_CAM)
        shot = {"scene": s['scene'], "t0": t0, "t1": t1, "in": s['tin'], "cam": cam}
        punches = []
        nowhoosh = False
        for tok in s['fx']:
            if tok == 'nowhoosh':
                nowhoosh = True; continue
            name, _, at = tok.partition('@')
            at = float(at or 0)
            if name == 'punch':
                punches.append(round(t0 + at, 3)); tl['sfx'].append({"t": round(t0 + at, 3), "type": "impact"})
                if at == 0: nowhoosh = True
            elif name in SFX_NAMES:
                tl['sfx'].append({"t": round(t0 + at, 3), "type": name})
            else:
                raise SystemExit(f'shot {i + 1} ({s["scene"]}): unknown fx "{name}". Known: punch, nowhoosh, {", ".join(sorted(SFX_NAMES))}')
        if punches: shot['punch'] = punches
        if data: shot['data'] = data
        if s['tin'] == 'cut' and i > 0 and not nowhoosh:
            tl['sfx'].append({"t": t0, "type": "whoosh"})
        tl['shots'].append(shot)
        # captions: spread lines evenly across the shot
        if s['caps'] and s['caps'] != '-':
            lines = [c.strip() for c in s['caps'].split(' / ') if c.strip()]
            start = t0 + (0.3 if i == 0 else 0.1)
            step = (t1 - start) / len(lines)
            for k, ln in enumerate(lines):
                text, hl = caption_line(ln)
                cap = {"t0": round(start + k * step, 3), "t1": round(start + (k + 1) * step, 3), "text": text}
                if hl: cap['hl'] = hl
                tl['captions'].append(cap)
        for track in MOODS[s['mood']]:
            r = tl['music'][track]
            if r and abs(r[-1][1] - t0) < 1e-6: r[-1][1] = t1
            else: r.append([t0, t1])
        t = t1
    tl['duration'] = round(t, 3)
    tl['sfx'].sort(key=lambda e: e['t'])
    return tl


if __name__ == '__main__':
    src = pathlib.Path(sys.argv[1]).read_text()
    tl = compile_episode(src)
    out = sys.argv[2] if len(sys.argv) > 2 else None
    js = json.dumps(tl, indent=1)
    if out:
        pathlib.Path(out).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(out).write_text(js)
        print(f'{out}: {len(tl["shots"])} shots, {len(tl["captions"])} caption lines, {tl["duration"]}s')
    else:
        print(js)
