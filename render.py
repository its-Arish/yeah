#!/usr/bin/env python3
"""Render a timeline to MP4 frames using the canvas renderer in headless Chromium.

usage: python3 render.py out/ekalavya.json out/video_silent.mp4 [--stills 1,4.5,10]  (compile the episode first)
"""
import base64, json, subprocess, sys, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
tl_path, out = sys.argv[1], sys.argv[2]
stills = None
if '--stills' in sys.argv:
    stills = [float(x) for x in sys.argv[sys.argv.index('--stills') + 1].split(',')]
tl = json.loads(pathlib.Path(tl_path).read_text())
fps = tl.get('fps', 30)
n = int(round(tl['duration'] * fps))

with sync_playwright() as p:
    b = p.chromium.launch(args=['--allow-file-access-from-files'])
    page = b.new_page(viewport={'width': 1080, 'height': 1920})
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto((ROOT / 'renderer' / 'index.html').as_uri())
    page.evaluate('j => setTL(j)', tl)
    page.evaluate('ready()')
    if stills:
        outdir = pathlib.Path(out); outdir.mkdir(parents=True, exist_ok=True)
        for t in stills:
            d = page.evaluate('([t]) => frame(t, 0.9)', [t])
            (outdir / f'still_{t:06.2f}.jpg').write_bytes(base64.b64decode(d.split(',')[1]))
    else:
        ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-r', str(fps), '-i', '-',
                               '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
        for i in range(n):
            d = page.evaluate('([t]) => frame(t, 0.93)', [i / fps])
            ff.stdin.write(base64.b64decode(d.split(',')[1]))
            if i % 150 == 0:
                print(f'frame {i}/{n}', flush=True)
        ff.stdin.close(); ff.wait()
    if errs:
        print('PAGE ERRORS:', *errs[:5], sep='\n')
    b.close()
