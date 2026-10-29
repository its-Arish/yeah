#!/usr/bin/env python3
"""Align an episode's caption lines to a voice-over recording (no speech-to-text needed).

usage: python3 vo_align.py episodes/shabari/episode.txt episodes/shabari/vo.wav [out.json]

How it works: the caption lines in episode.txt are the VO script, one spoken phrase per line.
The VO is split into speech segments at pauses (energy VAD). A dynamic-programming pass then
matches blocks of consecutive phrases to blocks of consecutive segments, so that each block's
speaking time fits its text length (chars x speaking rate), preferring pauses at punctuation.
Word times inside a block are spread by character count over the speech (not the pauses).

Writes JSON: {"duration", "segments": [[t0,t1],...], "phrases": [{"text","t0","t1","words":[[w,t0,t1],...]}]}
Check the result with the printed table; nudge with "> vo_shift: phraseIndex:+0.2" if ever needed.
"""
import json, re, subprocess, sys, pathlib
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from make_timeline import caption_line  # noqa: E402

ep_path, vo_path = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else str(pathlib.Path(ep_path).with_name('vo_align.json'))

# ---- phrases = caption lines of the episode, in order ----
phrases = []
for ln in pathlib.Path(ep_path).read_text().splitlines():
    s = ln.strip()
    if not s or s.startswith('#') or s.startswith('>') or '|' not in s:
        continue
    cols = [c.strip() for c in s.split('|')]
    if len(cols) >= 5 and cols[4] and cols[4] != '-':
        for c in cols[4].split(' / '):
            if c.strip():
                phrases.append(caption_line(c.strip())[0])

# ---- VAD ----
SR = 16000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', vo_path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32); dur = len(x) / SR
hop, win = 160, 400
e = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, 'same')[::hop]); db = 20 * np.log10(e + 1e-7)
floor, peak = np.percentile(db, 8), np.percentile(db, 99)
thr = floor + 0.33 * (peak - floor)
on = db > thr
t = np.arange(len(db)) * hop / SR
segs = []; i = 0
while i < len(on):
    if on[i]:
        j = i
        while j < len(on) and on[j]: j += 1
        segs.append([t[i], t[min(j, len(t) - 1)]]); i = j
    else: i += 1
merged = []
for s in segs:  # merge pauses shorter than 0.22 s, drop blips < 0.08 s
    if merged and s[0] - merged[-1][1] < 0.22: merged[-1][1] = s[1]
    else: merged.append(s)
segs = [s for s in merged if s[1] - s[0] >= 0.08]
gaps = [segs[k + 1][0] - segs[k][1] for k in range(len(segs) - 1)]

# ---- DP: blocks of phrases <-> blocks of segments ----
def nchars(p): return len(re.sub(r'[^A-Za-z0-9]', '', p)) + 3  # +3 ~ per-phrase overhead
pc = [nchars(p) for p in phrases]
speech = sum(b - a for a, b in segs)
rate = speech / sum(pc)  # seconds per char
P, S = len(phrases), len(segs)
INF = 1e18
cost = np.full((P + 1, S + 1), INF); back = {}
cost[0][0] = 0
for i in range(P + 1):
    for j in range(S + 1):
        if cost[i][j] >= INF: continue
        for k in range(1, 5):
            if i + k > P: break
            for m in range(1, 7):
                if j + m > S: break
                exp = rate * sum(pc[i:i + k])
                got = sum(b - a for a, b in segs[j:j + m])
                c = ((got - exp) / (0.35 + 0.25 * exp)) ** 2
                c += 0.6 * (k - 1)  # phrases spoken without a pause between them
                # a pause inside a phrase is fine after a comma/ellipsis, cheap-ish otherwise
                c += 0.25 * (m - 1)
                # strong boundary bonus: long pause after block end at sentence end
                if j + m < S:
                    g = gaps[j + m - 1]
                    end = phrases[i + k - 1].rstrip('"')
                    c -= 0.4 * min(g, 1.5) if end.endswith(('.', '?', '!', ':', '...')) else 0.1 * min(g, 1.5)
                if cost[i][j] + c < cost[i + k][j + m]:
                    cost[i + k][j + m] = cost[i][j] + c; back[(i + k, j + m)] = (i, j)
if cost[P][S] >= INF:
    sys.exit('alignment failed: script and audio do not match in length')
blocks = []; ij = (P, S)
while ij != (0, 0):
    pi, pj = back[ij]; blocks.append((pi, ij[0], pj, ij[1])); ij = (pi, pj)
blocks.reverse()

# ---- spread phrases/words over each block's speech time ----
res = []
for (i0, i1, j0, j1) in blocks:
    sp = segs[j0:j1]
    total = sum(b - a for a, b in sp)
    def at(frac):  # position along speech (skipping pauses) -> absolute time
        d = frac * total
        for a, b in sp:
            if d <= b - a + 1e-9: return a + d
            d -= b - a
        return sp[-1][1]
    words = [(pi, w) for pi in range(i0, i1) for w in phrases[pi].split()]
    wc = [len(re.sub(r'[^A-Za-z0-9]', '', w)) + 1.5 for _, w in words]
    cum = np.concatenate([[0], np.cumsum(wc)]) / sum(wc)
    for pi in range(i0, i1):
        idx = [k for k, (q, _) in enumerate(words) if q == pi]
        ws = [[words[k][1], round(at(cum[k]), 3), round(at(cum[k + 1]), 3)] for k in idx]
        res.append({'text': phrases[pi], 't0': ws[0][1], 't1': ws[-1][2], 'words': ws})

pathlib.Path(out).write_text(json.dumps({'duration': round(dur, 3), 'segments': [[round(a, 3), round(b, 3)] for a, b in segs], 'phrases': res}, indent=1))
print(f'VO {dur:.2f}s, {len(segs)} speech segments, {P} phrases, rate {1/rate:.1f} chars/s -> {out}')
for k, p in enumerate(res):
    print(f"{k:2d} {p['t0']:6.2f}-{p['t1']:6.2f}  {p['text']}")
