#!/usr/bin/env python3
"""Write editing sidecars for a compiled timeline.

usage: python3 export_meta.py out/ekalavya.json out/ekalavya/ekalavya
writes <prefix>_captions.srt (one cue per caption line) and <prefix>_markers.csv
(every shot, caption, sfx cue and music section with start/end in seconds, frames and timecode).
"""
import csv, json, sys

tl = json.load(open(sys.argv[1])); prefix = sys.argv[2]; fps = tl.get('fps', 30)

def srt_tc(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'
def tc(t):
    f = int(round(t * fps)); s, fr = divmod(f, fps); m, s = divmod(s, 60); h, m = divmod(m, 60)
    return f'{h:02}:{m:02}:{s:02}:{fr:02}'

with open(f'{prefix}_captions.srt', 'w') as f:
    for i, c in enumerate(tl['captions'], 1):
        f.write(f"{i}\n{srt_tc(c['t0'])} --> {srt_tc(c['t1'])}\n{c['text']}\n\n")

rows = []
for i, s in enumerate(tl['shots'], 1):
    rows.append(['shot', s['t0'], s['t1'], f"{i:02d} {s['scene']} ({s['in']})"])
for c in tl['captions']:
    rows.append(['caption', c['t0'], c['t1'], c['text']])
for e in tl['sfx']:
    rows.append(['sfx', e['t'], '', e['type']])
for track, ranges in tl.get('music', {}).items():
    for a, b in ranges:
        rows.append(['music', a, b, track])
rows.sort(key=lambda r: (float(r[1]), r[0]))
with open(f'{prefix}_markers.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['type', 'start_s', 'end_s', 'start_frame', 'start_tc', 'end_tc', 'label'])
    for typ, a, b, label in rows:
        w.writerow([typ, f'{float(a):.3f}', f'{float(b):.3f}' if b != '' else '', int(round(float(a) * fps)), tc(float(a)), tc(float(b)) if b != '' else '', label])
print(f'{prefix}_captions.srt, {prefix}_markers.csv')
