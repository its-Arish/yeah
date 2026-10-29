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
    for tok in text.lstrip('~').upper().split():
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


LEAD, TAIL = 0.15, 0.9   # VO mode: a shot starts LEAD s before its first spoken line; the last line gets TAIL s


def compile_episode(src, base_dir='.'):
    base_dir = pathlib.Path(base_dir)
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
        lines = [c.strip() for c in caps.split(' / ') if c.strip()] if caps and caps != '-' else []
        shots.append(dict(scene=scene, secs=None if secs == 'auto' else float(secs), tin=tin, mood=mood,
                          lines=lines, fx=fx, data={}, ln=ln_no))

    fps = int(meta.get('fps', 30))
    tl = {"title": meta.get('title', 'Untitled'), "fps": fps, "shots": [], "captions": [], "sfx": [],
          "music": {"pulse": [], "pad": [], "heartbeat": []}}
    if 'cast' in meta:
        tl['cast'] = parse_value(meta['cast'])

    # ---------- timing ----------
    vo = None
    if 'vo_align' in meta:
        al = json.loads((base_dir / meta['vo_align']).read_text())
        ph = list(al['phrases']); k = 0
        for s in shots:
            s['ph'] = []
            for ln in s['lines']:
                if k >= len(ph):
                    raise SystemExit(f'line {s["ln"]}: more caption lines than aligned phrases. Re-run vo_align.py')
                want = caption_line(ln)[0]
                if want != ph[k]['text']:
                    raise SystemExit(f'line {s["ln"]}: "{want}" != aligned "{ph[k]["text"]}". Re-run vo_align.py after editing captions')
                s['ph'].append(ph[k]); k += 1
        if k != len(ph):
            raise SystemExit('fewer caption lines than aligned phrases. Re-run vo_align.py')
        vo = {"path": str((base_dir / meta['vo']).resolve()) if 'vo' in meta else None, "duration": al['duration']}
        last_ph = max(i for i, s in enumerate(shots) if s['ph'])
        starts = []
        for i, s in enumerate(shots):
            if i == 0: st = 0.0
            elif s['ph']: st = max(starts[-1] + 0.3, s['ph'][0]['t0'] - LEAD)
            else:
                prev = shots[i - 1]
                if prev['secs'] is not None and not prev['ph']: st = starts[-1] + prev['secs']
                else:
                    st = prev['ph'][-1]['t1'] + TAIL
                    if i - 1 == last_ph: st = max(st, al['duration'])
            starts.append(round(st, 3))
        ends = starts[1:] + [round(starts[-1] + shots[-1]['secs'], 3) if shots[-1]['secs'] is not None
                              else round(max(shots[-1]['ph'][-1]['t1'] + TAIL, al['duration']), 3)]
    else:
        starts, t = [], 0.0
        for s in shots:
            if s['secs'] is None:
                raise SystemExit(f'line {s["ln"]}: secs "auto" needs a voice-over (vo_align: in the header)')
            starts.append(round(t, 3)); t += s['secs']
        ends = starts[1:] + [round(t, 3)]

    for i, s in enumerate(shots):
        t0, t1 = starts[i], ends[i]
        data = dict(s['data'])
        cam = data.pop('cam', None) or SCENE_CAMS.get(s['scene'], DEFAULT_CAM)
        shot = {"scene": s['scene'], "t0": t0, "t1": t1, "in": s['tin'], "cam": cam}
        words = [w for p in s.get('ph', []) for w in p['words']]
        punches, nowhoosh = [], False
        for tok in s['fx']:
            if tok == 'nowhoosh':
                nowhoosh = True; continue
            name, _, at = tok.partition('@')
            if at.startswith('w'):
                n = int(at[1:])
                if not words or n < 1 or n > len(words):
                    raise SystemExit(f'line {s["ln"]}: {tok}: shot has {len(words)} spoken words')
                when = words[n - 1][1]
            else:
                when = t0 + float(at or 0)
            when = round(when, 3)
            if name == 'punch':
                punches.append(when); tl['sfx'].append({"t": when, "type": "impact"})
                if abs(when - t0) < 0.05: nowhoosh = True
            elif name in SFX_NAMES:
                tl['sfx'].append({"t": when, "type": name})
            else:
                raise SystemExit(f'line {s["ln"]}: unknown fx "{name}". Known: punch, nowhoosh, {", ".join(sorted(SFX_NAMES))}')
        if punches: shot['punch'] = punches
        if data: shot['data'] = data
        if s['tin'] == 'cut' and i > 0 and not nowhoosh:
            tl['sfx'].append({"t": t0, "type": "whoosh"})
        tl['shots'].append(shot)
        # captions
        if vo is not None:
            for ln, p in zip(s['lines'], s['ph']):
                if ln.startswith('~'): continue
                text, hl = caption_line(ln)
                cap = {"t0": round(max(0, p['t0'] - 0.05), 3), "t1": round(p['t1'] + 0.8, 3), "text": text,
                       "wt": [round(w[1], 3) for w in p['words']]}
                if hl: cap['hl'] = hl
                tl['captions'].append(cap)
        elif s['lines']:
            start = t0 + (0.3 if i == 0 else 0.1)
            step = (t1 - start) / len(s['lines'])
            for k, ln in enumerate(s['lines']):
                if ln.startswith('~'): continue
                text, hl = caption_line(ln)
                cap = {"t0": round(start + k * step, 3), "t1": round(start + (k + 1) * step, 3), "text": text}
                if hl: cap['hl'] = hl
                tl['captions'].append(cap)
        for track in MOODS[s['mood']]:
            r = tl['music'][track]
            if r and abs(r[-1][1] - t0) < 1e-6: r[-1][1] = t1
            else: r.append([t0, t1])
    caps = tl['captions']
    for a, b in zip(caps, caps[1:]):       # a caption never overlaps the next one
        a['t1'] = round(min(a['t1'], b['t0']), 3)
    # snap the end to a whole frame so video frames and audio samples describe exactly the same length
    import math
    dur = round(math.ceil(ends[-1] * fps - 1e-6) / fps, 6)
    tl['shots'][-1]['t1'] = dur
    tl['duration'] = dur
    if vo is not None:
        tl['vo'] = vo
    tl['sfx'].sort(key=lambda e: e['t'])
    return tl


if __name__ == '__main__':
    src_path = pathlib.Path(sys.argv[1])
    tl = compile_episode(src_path.read_text(), src_path.parent)
    out = sys.argv[2] if len(sys.argv) > 2 else None
    js = json.dumps(tl, indent=1)
    if out:
        pathlib.Path(out).parent.mkdir(parents=True, exist_ok=True)
        pathlib.Path(out).write_text(js)
        print(f'{out}: {len(tl["shots"])} shots, {len(tl["captions"])} caption lines, {tl["duration"]}s' + (' (voice-over timed)' if 'vo' in tl else ''))
    else:
        print(js)
