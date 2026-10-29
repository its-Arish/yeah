#!/usr/bin/env python3
"""Synthesize the music bed + SFX for a timeline (no samples needed).

usage: python3 audio.py out/ekalavya.json out/audio.wav   (compile the episode first)
"""
import json, sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
tl = json.load(open(sys.argv[1]))
N = int((tl['duration'] + 0.5) * SR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if i >= N or j <= i: return
    s = sig[:j - i] * gain
    L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))

def band(x, lo, hi, order=2):
    sos = butter(order, [lo, hi], btype='band', fs=SR, output='sos'); return sosfilt(sos, x)
def lp(x, f):
    sos = butter(2, f, btype='low', fs=SR, output='sos'); return sosfilt(sos, x)
def hp(x, f):
    sos = butter(2, f, btype='high', fs=SR, output='sos'); return sosfilt(sos, x)

def mask(ranges, fade=0.6):
    m = np.zeros(N); t = np.arange(N) / SR
    for a, b in ranges:
        m = np.maximum(m, np.clip(np.minimum((t - a) / fade, (b - t) / fade), 0, 1))
    return m

# --- tanpura-style drone: plucked Pa Sa Sa sa(low) on D ---
base = 73.42  # D2
def pluck(f, dur=2.6):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for h in range(1, 14):
        s += np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h)) * (0.8 ** h) * (1 + 0.6 * np.sin(2 * np.pi * 0.7 * h * t))
    return s * env(n, 0.01, 1.4) * 0.12
cycle = [base * 1.5 * 2, base * 4, base * 4, base * 2]
t = 0.0; k = 0
while t < tl['duration']:
    add(pluck(cycle[k % 4]), t, 0.9, pan=-0.3 + 0.2 * (k % 4)); t += 0.62; k += 1
# soft low pad under everything
tt = np.arange(N) / SR
pad = (np.sin(2 * np.pi * base * tt) + 0.5 * np.sin(2 * np.pi * base * 1.5 * tt) + 0.3 * np.sin(2 * np.pi * base * 2 * tt + 0.5 * np.sin(2 * np.pi * 0.2 * tt)))
pad = lp(pad, 400) * 0.05
L += pad; R += pad
# emotional string-ish pad (sawtooth chord, low-passed, slow swell)
m = mask(tl['music'].get('pad', []), 1.2)
chord = sum(((tt * f) % 1 - 0.5) for f in [base * 2, base * 2 * 1.2, base * 3, base * 4 * 1.2, base * 6])
chord = lp(chord, 1200) * 0.06 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.25 * tt))
L += chord * m; R += np.roll(chord, 400) * m

# --- percussion pulse (dhol-like) for fast sections, 100 bpm ---
def dhol(f0=110, f1=50, dur=0.35, g=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.12)
    s += band(rng.standard_normal(n), 1500, 5000) * env(n, 0.001, 0.02) * 0.3
    return s * g
def tik():
    n = int(0.08 * SR); return band(rng.standard_normal(n), 2500, 9000) * env(n, 0.001, 0.015) * 0.25
beat = 60 / 100
for a, b in tl['music'].get('pulse', []):
    t = a; i = 0
    while t < b - 0.05:
        if i % 4 in (0, 3) or i % 8 == 6: add(dhol(), t, 0.55)
        add(tik(), t + beat / 2, 0.5, pan=0.3)
        if i % 4 == 2: add(dhol(260, 160, 0.2), t, 0.35, pan=-0.2)
        t += beat; i += 1
for a, b in tl['music'].get('heartbeat', []):
    t = a
    while t < b:
        add(dhol(70, 40, 0.3), t, 0.8); add(dhol(70, 40, 0.3), t + 0.22, 0.55); t += 0.95

# --- SFX ---
def whoosh(dur=0.35):
    n = int(dur * SR); x = rng.standard_normal(n); t = np.arange(n) / SR
    out = np.zeros(n); seg = 512
    for s in range(0, n, seg):
        f = 400 + 3500 * (s / n)
        out[s:s + seg] = band(x[s:s + seg + 0], max(100, f * 0.6), f * 1.4, 1)[:len(out[s:s + seg])]
    return out * np.sin(np.pi * t / dur) ** 2 * 0.5
def impact():
    n = int(1.4 * SR); t = np.arange(n) / SR
    f = 30 + 70 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.5) * 1.1
    s += lp(rng.standard_normal(n), 900) * env(n, 0.001, 0.12) * 0.9
    return s
def riser(dur=1.4):
    n = int(dur * SR); t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 800) * (t / dur) ** 2 * 0.4
    s += np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / dur) ** 2) / SR) * (t / dur) ** 2 * 0.15
    return s
def pop():
    n = int(0.12 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (600 + 900 * np.exp(-t * 40)) * t) * env(n, 0.001, 0.04) * 0.5
def ding(f=1320):
    n = int(1.2 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)) * env(n, 0.002, 0.35) * 0.35
def stampfx():
    return impact()[:int(0.5 * SR)] * 0.6 + np.pad(pop(), (0, int(0.5 * SR) - len(pop()))) * 0.6
def arrow():
    n = int(0.25 * SR); t = np.arange(n) / SR
    s = band(rng.standard_normal(n), 2000, 7000) * env(n, 0.003, 0.08) * 0.5
    s += np.sin(2 * np.pi * (180 - 100 * t) * t) * env(n, 0.001, 0.05) * 0.4  # string twang
    return s
def thunk():
    return dhol(220, 90, 0.25) * 0.8 + np.pad(band(rng.standard_normal(int(0.03 * SR)), 1000, 4000) * 0.3, (0, int(0.22 * SR)))
def bark():
    n = int(0.22 * SR); t = np.arange(n) / SR
    f = 420 + 300 * np.sin(np.pi * t / 0.22)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + rng.standard_normal(n) * 0.3
    s = band(s, 500, 2400) * np.sin(np.pi * t / 0.22) ** 0.6
    return s * 0.45
def levelup():
    out = np.zeros(int(1.6 * SR))
    for i, f in enumerate([523, 659, 784, 1047, 1319]):
        d = ding(f) * 0.6; s = int(i * 0.09 * SR); out[s:s + len(d)] += d[:len(out) - s]
    return out
def dramatic():
    n = int(1.5 * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) for f in [146.8, 174.6, 207.6]) * env(n, 0.01, 0.6) * 0.18
    im = impact(); s[:len(im)] += im[:n] * 0.4
    return s

FX = {'whoosh': lambda: whoosh(), 'impact': impact, 'riser': lambda: riser(1.4), 'riser_short': lambda: riser(0.6) * 0.6,
      'pop': pop, 'ding': ding, 'stamp': stampfx, 'arrow': arrow, 'thunk': thunk, 'bark': bark, 'levelup': levelup, 'dramatic': dramatic}
for e in tl['sfx']:
    ty = e['type']
    if ty == 'arrows7':
        for i in range(7):
            add(arrow(), e['t'] + i * 0.12, 0.8, pan=-0.5 + i * 0.12)
            add(thunk() * 0.4, e['t'] + i * 0.12 + 0.17, 0.6)
    else:
        add(FX[ty](), e['t'], 0.9 if ty != 'whoosh' else 0.6)

# master: duck nothing (no VO), gentle limiter, fades
mix = np.stack([L, R], 1)
mix[:int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))[:, None]
fo = int(0.6 * SR); end = int(tl['duration'] * SR)
mix[end - fo:end] *= np.linspace(1, 0, fo)[:, None]; mix[end:] = 0
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix = mix / np.max(np.abs(mix)) * 0.89
wavfile.write(sys.argv[2], SR, (mix * 32767).astype(np.int16))
print('ok', mix.shape[0] / SR, 's')
