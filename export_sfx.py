#!/usr/bin/env python3
"""Export every synthesized SFX + music stem from audio.py as individual WAV files.
usage: python3 make_timeline.py episodes/ekalavya/episode.txt out/ekalavya.json && python3 export_sfx.py out/ekalavya.json out/sfx
"""
import sys, pathlib, numpy as np
from scipy.io import wavfile
src = pathlib.Path(__file__).with_name('audio.py').read_text()
src = src.split('for e in tl[\'sfx\']:')[0]          # everything up to the cue loop (defs + music)
outdir = pathlib.Path(sys.argv[2]); outdir.mkdir(parents=True, exist_ok=True)
g = {'__name__': 'sfx'}; sys.argv = [sys.argv[0], sys.argv[1], '/dev/null']
exec(src, g)
SR = g['SR']
def save(name, x, norm=0.89):
    x = np.asarray(x, float)
    if x.ndim == 1: x = np.stack([x, x], 1)
    pk = np.max(np.abs(x)) or 1
    wavfile.write(outdir / f'{name}.wav', SR, (x / pk * norm * 32767).astype(np.int16))
names = {'whoosh': 'whoosh_cut', 'impact': 'impact_boom', 'riser': 'riser_long', 'riser_short': 'riser_short',
         'pop': 'pop_chat_message', 'ding': 'ding_sparkle', 'stamp': 'stamp_rejected', 'arrow': 'arrow_twang',
         'thunk': 'arrow_thunk_target', 'bark': 'dog_bark_synth', 'levelup': 'level_up_chime', 'dramatic': 'dramatic_sting'}
for k, fn in g['FX'].items(): save(names[k], fn())
# seven-arrow volley as used at 25.1s
v = np.zeros(int(1.4 * SR))
for i in range(7):
    a = g['arrow'](); s = int(i * 0.12 * SR); v[s:s + len(a)] += a * 0.8
    th = g['thunk']() * 0.4; s2 = s + int(0.17 * SR); v[s2:s2 + len(th)] += th[:len(v) - s2]
save('arrows_seven_volley', v)
# music stems / loops
d, h = g['dhol'], g['tik']
beat = 60 / 100; bar = np.zeros(int(beat * 8 * SR) + SR // 2)
for i in range(8):
    t = int(i * beat * SR)
    def put(x, at):
        bar[at:at + len(x)] += x[:len(bar) - at]
    if i % 4 in (0, 3) or i % 8 == 6: put(d() * 0.55, t)
    put(h() * 0.5, t + int(beat / 2 * SR))
    if i % 4 == 2: put(d(260, 160, 0.2) * 0.35, t)
save('dhol_pulse_loop_100bpm_2bars', bar[:int(beat * 8 * SR)])
save('dhol_hit_low', d()); save('dhol_hit_high', d(260, 160, 0.2)); save('tick_hat', h())
hb = np.zeros(int(0.95 * SR)); x1 = d(70, 40, 0.3); hb[:len(x1)] += x1 * 0.8; hb[int(0.22 * SR):int(0.22 * SR) + len(x1)] += x1 * 0.55
save('heartbeat_single', hb)
base = g['base']; cyc = [base * 3, base * 4, base * 4, base * 2]
tl = np.zeros(int(0.62 * 4 * SR) + int(2.6 * SR))
for k, f in enumerate(cyc):
    p = g['pluck'](f); s = int(k * 0.62 * SR); tl[s:s + len(p)] += p
save('tanpura_drone_cycle', tl)
tt = np.arange(int(8 * SR)) / SR
pad = sum(((tt * f) % 1 - 0.5) for f in [base * 2, base * 2.4, base * 3, base * 4.8, base * 6])
pad = g['lp'](pad, 1200) * np.minimum(1, tt / 2) * np.minimum(1, (8 - tt) / 2)
save('emotional_string_pad_8s', pad)
print('\n'.join(sorted(p.name for p in outdir.glob('*.wav'))))
