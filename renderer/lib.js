// ---------- core helpers ----------
const W = 1080, H = 1920;
const C = document.getElementById('c');
let ctx = C.getContext('2d');
const TAU = Math.PI * 2;

const PAL = {
  sky: ['#1b1330', '#3d2350', '#8e3b62', '#e06d4c', '#f6b45e', '#fbd98a'],
  hillFar: '#8a4a66', hillMid: '#5e3354', hillNear: '#3e2342',
  ground: ['#4a2a3e', '#2a1626', '#160b14'],
  gold: '#f2c14e', goldL: '#ffe39a', goldD: '#a8742a',
  red: '#d4432f', ink: '#140a12'
};

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeOut = t => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
const easeBack = t => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647, (s - 1) / 2147483646); }

function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
function shade(h, a) { const [r, g, b] = hex2rgb(h); return a < 0 ? rgb2hex(r * (1 + a), g * (1 + a), b * (1 + a)) : rgb2hex(r + (255 - r) * a, g + (255 - g) * a, b + (255 - b) * a); }
function mix(h1, h2, t) { const a = hex2rgb(h1), b = hex2rgb(h2); return rgb2hex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)); }
function clayCol(h) { const [r, g, b] = hex2rgb(h); const L = (0.3 * r + 0.59 * g + 0.11 * b) / 255; return mix('#5c2f1c', '#e0a070', clamp(L * 1.2)); }

function E(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(rx, .01), Math.max(ry, .01), rot, 0, TAU); }
function fillE(x, y, rx, ry, c) { E(x, y, rx, ry); ctx.fillStyle = c; ctx.fill(); }
function circ(x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = c; ctx.fill(); }
function poly(pts, c, close = true) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close) ctx.closePath(); if (c) { ctx.fillStyle = c; ctx.fill(); } }
function stroke(pts, c, w, cap = 'round') { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.stroke(); }
function rrect(x, y, w, h, r, c) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (c) { ctx.fillStyle = c; ctx.fill(); } }

// ---------- backgrounds ----------
function sky(o = {}) {
  const dusk = o.dusk || 0; // 0..1 darker
  const g = ctx.createLinearGradient(0, -200, 0, 1200);
  const s = PAL.sky.map(c => shade(c, -0.45 * dusk));
  g.addColorStop(0, s[0]); g.addColorStop(0.3, s[1]); g.addColorStop(0.55, s[2]);
  g.addColorStop(0.75, s[3]); g.addColorStop(0.9, s[4]); g.addColorStop(1, s[5]);
  ctx.fillStyle = g; ctx.fillRect(-600, -600, W + 1200, 1800);
}
function sun(x, y, r, t, o = {}) {
  const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * (o.big ? 6 : 4));
  glow.addColorStop(0, 'rgba(255,236,170,0.9)'); glow.addColorStop(0.25, 'rgba(255,190,110,0.45)'); glow.addColorStop(1, 'rgba(255,150,90,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
  if (o.rays) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.05); ctx.globalAlpha = o.rays;
    for (let i = 0; i < 18; i++) { ctx.rotate(TAU / 18); const g = ctx.createLinearGradient(0, 0, 0, -1600); g.addColorStop(0, 'rgba(255,230,160,0.35)'); g.addColorStop(1, 'rgba(255,230,160,0)'); ctx.fillStyle = g; poly([[0, 0], [-60, -1600], [60, -1600]], g); }
    ctx.restore();
  }
  if (o.ring) { ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, TAU); ctx.strokeStyle = 'rgba(255,230,170,0.35)'; ctx.lineWidth = 4; ctx.stroke(); }
  const d = ctx.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
  d.addColorStop(0, '#fff6d6'); d.addColorStop(0.7, '#ffe08a'); d.addColorStop(1, '#ffc65c');
  circ(x, y, r, d);
}
function hills(y, amp, color, seed, wl = 260) {
  const R = rng(seed); const ph = R() * 10, ph2 = R() * 10;
  ctx.beginPath(); ctx.moveTo(-700, 2600);
  for (let x = -700; x <= W + 700; x += 20) {
    const yy = y - amp * (0.55 * Math.sin(x / wl + ph) + 0.3 * Math.sin(x / (wl * 0.43) + ph2) + 0.15 * Math.sin(x / (wl * 0.17)));
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(W + 700, 2600); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
function ground(y0, o = {}) {
  const g = ctx.createLinearGradient(0, y0, 0, 2000);
  const gc = PAL.ground.map(c => shade(c, -0.3 * (o.dusk || 0)));
  g.addColorStop(0, gc[0]); g.addColorStop(0.4, gc[1]); g.addColorStop(1, gc[2]);
  ctx.fillStyle = g; ctx.fillRect(-700, y0, W + 1400, 2600);
  // horizon light band
  const b = ctx.createLinearGradient(0, y0, 0, y0 + 90);
  b.addColorStop(0, 'rgba(255,190,120,0.35)'); b.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = b; ctx.fillRect(-700, y0, W + 1400, 90);
  // stones + grass
  const R = rng(o.seed || 7);
  for (let i = 0; i < 70; i++) {
    const x = -500 + R() * (W + 1000), yy = y0 + 40 + Math.pow(R(), 1.6) * 900, s = 0.4 + (yy - y0) / 500;
    if (R() < 0.5) fillE(x, yy, 9 * s, 3.5 * s, 'rgba(20,10,20,0.45)');
    else { ctx.strokeStyle = 'rgba(120,70,80,0.5)'; ctx.lineWidth = 2 * s; ctx.beginPath(); for (let k = -2; k <= 2; k++) { ctx.moveTo(x + k * 3 * s, yy); ctx.lineTo(x + k * 5 * s, yy - (10 + R() * 8) * s); } ctx.stroke(); }
  }
}
function tree(x, y, s, c1, c2, seed) {
  const R = rng(seed);
  ctx.fillStyle = c1; ctx.fillRect(x - 7 * s, y - 160 * s, 14 * s, 160 * s);
  for (let i = 0; i < 6; i++) { const ox = (R() - 0.5) * 120 * s, oy = -150 * s - R() * 120 * s, r = (45 + R() * 40) * s; circ(x + ox, y + oy, r, i % 2 ? c1 : c2); }
}
function forest(y0, t, o = {}) {
  const d = o.dusk || 0;
  const far = shade('#6a3658', -0.3 * d), farD = shade('#5a2d4c', -0.3 * d);
  const mid = shade('#40203c', -0.3 * d), midD = shade('#341a32', -0.3 * d);
  const R = rng(o.seed || 3);
  for (let i = 0; i < 14; i++) tree(-500 + i * 150 + R() * 60, y0 + 10, 1.4 + R() * 0.6, far, farD, 100 + i);
  hills(y0 + 30, 25, shade('#4e2a46', -0.3 * d), 21, 200);
  for (let i = 0; i < 9; i++) { const x = -550 + i * 270 + R() * 80; if (o.clear && x > 150 && x < 930) continue; tree(x, y0 + 60, 2.3 + R() * 0.7, mid, midD, 300 + i); }
  ground(y0 + 50, { seed: o.seed || 11, dusk: d });
}
function fireflies(t, n = 28, seed = 5, area = [0, 300, W, 1500]) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const bx = area[0] + R() * area[2], by = area[1] + R() * area[3], sp = 0.3 + R(), ph = R() * TAU;
    const x = bx + Math.sin(t * sp + ph) * 30, y = by - ((t * 18 * sp) % 200) + Math.cos(t * sp * 1.3 + ph) * 20;
    const a = 0.35 + 0.35 * Math.sin(t * 3 * sp + ph);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 14); g.addColorStop(0, `rgba(255,220,140,${a})`); g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 14, y - 14, 28, 28);
  }
}
function birds(t, x, y, n = 5) {
  ctx.strokeStyle = 'rgba(40,20,40,0.7)'; ctx.lineWidth = 2.5;
  for (let i = 0; i < n; i++) { const bx = x + i * 26 + t * 30, by = y + Math.sin(i * 2.1) * 14, f = Math.sin(t * 9 + i) * 5; ctx.beginPath(); ctx.moveTo(bx - 9, by - f); ctx.lineTo(bx, by); ctx.lineTo(bx + 9, by - f); ctx.stroke(); }
}
function banners(y, t, o = {}) {
  const cols = ['#e9e2d0', '#b8323a', '#2f4f9a', '#d9a531', '#2d7a5a', '#7a3a8a'];
  const R = rng(o.seed || 9);
  for (let i = 0; i < 26; i++) {
    const x = -300 + i * 65 + R() * 30, h = 70 + R() * 50, c = cols[Math.floor(R() * cols.length)];
    stroke([[x, y], [x, y - h]], '#2a1828', 3);
    const wv = Math.sin(t * 4 + i) * 4;
    poly([[x, y - h], [x + 30, y - h + 4 + wv], [x + 28, y - h + 22 + wv], [x, y - h + 20]], c);
  }
}
function hut(x, y, s) {
  rrect(x - 70 * s, y - 80 * s, 140 * s, 80 * s, 4, '#5a3428');
  ctx.fillStyle = '#2a1418'; ctx.fillRect(x - 18 * s, y - 55 * s, 36 * s, 55 * s);
  poly([[x - 105 * s, y - 70 * s], [x, y - 150 * s], [x + 105 * s, y - 70 * s]], '#a06a3a');
  ctx.strokeStyle = '#7a4a26'; ctx.lineWidth = 3 * s;
  for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(x, y - 150 * s); ctx.lineTo(x + i * 24 * s, y - 72 * s); ctx.stroke(); }
}
let GRAIN = null;
function grainAndVignette(t, v = 0.55) {
  const g = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(10,4,12,${v})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!GRAIN) { GRAIN = document.createElement('canvas'); GRAIN.width = 540; GRAIN.height = 960; const g2 = GRAIN.getContext('2d'); const id = g2.createImageData(540, 960); for (let i = 0; i < id.data.length; i += 4) { const n = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = n; id.data[i + 3] = 14; } g2.putImageData(id, 0, 0); }
  const f = Math.floor(t * 30) % 4;
  ctx.drawImage(GRAIN, -f * 37 % 100, -f * 53 % 100, W + 200, H + 200);
}

// ---------- characters ----------
const CHAR = {
  drona: { skin: '#c98d62', hair: 'drona', dhoti: '#d9822b', border: '#f2c14e', top: 'shawl', tilak: 'ash', neck: 'mala', band: '#f2c14e' },
  eka: { skin: '#8d5a3b', hair: 'eka', dhoti: '#6d5a34', border: '#3f7a4a', top: 'bare', neck: 'beads', quiver: true, band: '#8a3a2a' },
  arjuna: { skin: '#c78b5c', hair: 'arjuna', dhoti: '#2f5aa8', border: '#f2c14e', top: 'armour', tilak: 'red', neck: 'gold', quiver: true, band: '#f2c14e' },
  prince: { skin: '#c78b5c', hair: 'arjuna', dhoti: '#8a2f3a', border: '#f2c14e', top: 'bare', neck: 'gold', band: '#f2c14e' }
};

const POSES = {
  down: { L: [[-14, -71], [-18, -60], [-17.5, -48]], R: [[14, -71], [18, -60], [17.5, -48]] },
  namaste: { L: [[-14, -71], [-13, -57], [-1.6, -62]], R: [[14, -71], [13, -57], [1.6, -62]], hands: 'namaste' },
  point: { L: [[-14, -71], [-18, -60], [-17.5, -48]], R: [[14, -71], [25, -70], [35, -71]], hands: 'pointR' },
  bowdraw: { L: [[-14, -71], [-27, -72], [-39, -73]], R: [[14, -71], [25, -77], [11, -81]], bow: 'draw' },
  bless: { L: [[-14, -71], [-18, -60], [-17.5, -48]], R: [[14, -71], [24, -79], [23, -92]], hands: 'palmR' },
  offer: { L: [[-14, -71], [-15, -58], [-5, -53]], R: [[14, -71], [15, -58], [5, -53]], hands: 'offer' },
  holdbow: { L: [[-14, -71], [-18, -60], [-18, -50]], R: [[14, -71], [18, -60], [17.5, -48]], bow: 'side' },
  shoulderbow: { L: [[-14, -71], [-18, -60], [-17.5, -48]], R: [[14, -71], [20, -64], [12, -73]], bow: 'shoulder' },
  shock: { L: [[-14, -71], [-22, -66], [-18, -79]], R: [[14, -71], [22, -66], [18, -79]] },
  taste: { L: [[-14, -71], [-15, -59], [-7, -55]], R: [[14, -71], [17, -70], [5, -79.5]], hands: 'taste' },
  lift: { L: [[-14, -71], [-18, -60], [-17.5, -48]], R: [[14, -71], [26, -84], [24, -100]], hands: 'lift' },
  fly: { L: [[-14, -71], [-25, -80], [-34, -91]], R: [[14, -71], [18, -60], [17.5, -48]], hands: 'fly' },
  sword: { L: [[-14, -71], [-18, -60], [-17.5, -48]], R: [[14, -71], [24, -82], [22, -95]], hands: 'sword' },
  mace: { L: [[-14, -71], [-18, -60], [-17.5, -48]], R: [[14, -71], [24, -80], [20, -93]], hands: 'mace' },
  veena: { L: [[-14, -71], [-19, -62], [-9, -66]], R: [[14, -71], [17, -60], [8, -56]], hands: 'veena' },
  sweep: { L: [[-14, -71], [-16, -62], [-6, -58]], R: [[14, -71], [14, -60], [4, -52]], hands: 'sweep' }
};

function drawPerson(x, y, h, p, t = 0) {
  p = Object.assign({}, CHAR[p.who] || {}, p);
  const sari = p.body === 'sari'; if (sari) p.dhoti = p.sari || p.dhoti;
  const col = p.clay ? clayCol : (c => c);
  const skin = col(p.skin), skinD = col(shade(p.skin, -0.28)), skinL = col(shade(p.skin, 0.15));
  const gold = col(PAL.gold), goldD = col(PAL.goldD);
  const pose = POSES[p.pose || 'down'];
  const ky = p.kneel ? 22 : 0;
  const br = Math.sin(t * 2.1 + (p.phase || 0)) * 0.45;
  ctx.save(); ctx.translate(x, y); ctx.scale(h / 100, h / 100);
  if (p.alpha != null) ctx.globalAlpha *= p.alpha;
  if (p.rot) ctx.rotate(p.rot);
  fillE(0, -0.5, 22, 3.2, 'rgba(15,5,15,0.35)');
  const rim = p.rim !== false && !p.clay;
  const setRim = on => { if (on && rim) { ctx.shadowColor = 'rgba(255,205,130,0.75)'; ctx.shadowBlur = 18 * h / 300; } else { ctx.shadowBlur = 0; } };

  // legs / dhoti
  const dh = col(p.dhoti), dhD = col(shade(p.dhoti, -0.25)), bd = col(p.border);
  setRim(true);
  if (!p.kneel) {
    fillE(-5.5, -2.5, 4.6, 2.4, skin); fillE(5.5, -2.5, 4.6, 2.4, skin);
    if (sari) { ctx.beginPath(); ctx.moveTo(-12.5, -50); ctx.lineTo(12.5, -50); ctx.quadraticCurveTo(17, -25, 19.5, -3); ctx.lineTo(-19.5, -3); ctx.quadraticCurveTo(-17, -25, -12.5, -50); ctx.fillStyle = dh; ctx.fill(); }
    else poly([[-12, -49], [12, -49], [15.8, -5], [-15.8, -5]], dh);
  } else {
    ctx.beginPath(); ctx.moveTo(-12, -27); ctx.lineTo(12, -27); ctx.quadraticCurveTo(25, -18, 24, -1); ctx.lineTo(-24, -1); ctx.quadraticCurveTo(-25, -18, -12, -27); ctx.fillStyle = dh; ctx.fill();
  }
  setRim(false);
  ctx.save(); ctx.globalAlpha *= 0.6; ctx.strokeStyle = dhD; ctx.lineWidth = 0.6;
  if (!p.kneel) { for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 2.6, -46); ctx.lineTo(i * 3.9, -6); ctx.stroke(); } }
  else { for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 2.6, -25); ctx.lineTo(i * 6, -2); ctx.stroke(); } }
  ctx.restore();
  if (!p.kneel && sari) { poly([[-19, -7], [19, -7], [19.5, -3], [-19.5, -3]], bd); }
  else if (!p.kneel) { poly([[-15.4, -9.5], [15.4, -9.5], [15.8, -5], [-15.8, -5]], bd); }
  else { ctx.fillStyle = bd; ctx.fillRect(-24, -4, 48, 3); }

  ctx.save(); ctx.translate(0, ky + br * 0.25);
  // back hair, quiver
  if (p.monkey) { ctx.beginPath(); ctx.moveTo(6, -50); ctx.bezierCurveTo(30, -52 + Math.sin(t * 2) * 2, 34, -80, 24, -96); ctx.quadraticCurveTo(20, -104, 27, -106); ctx.strokeStyle = col(shade(p.skin, -0.15)); ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.stroke(); }
  if (p.halo) { const hg = ctx.createRadialGradient(0, -88, 8, 0, -88, 26); hg.addColorStop(0, 'rgba(255,236,170,0.9)'); hg.addColorStop(0.55, 'rgba(255,214,120,0.45)'); hg.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = hg; ctx.fillRect(-30, -118, 60, 60); ctx.beginPath(); ctx.arc(0, -88, 15, 0, TAU); ctx.strokeStyle = col('#ffe08a'); ctx.lineWidth = 1.2; ctx.stroke(); }
  if (p.hair === 'wild') { ctx.fillStyle = col('#140c10'); ctx.beginPath(); for (let i = 0; i <= 18; i++) { const a = Math.PI * 0.95 + i / 18 * Math.PI * 1.1, r = i % 2 ? 13 : 18.5; ctx.lineTo(Math.cos(a) * r, -88 + Math.sin(a) * r * 0.95); } ctx.lineTo(13, -70); ctx.lineTo(-13, -70); ctx.closePath(); ctx.fill(); }
  if (p.quiver) { ctx.save(); ctx.translate(10, -74); ctx.rotate(0.45); rrect(-3.5, -16, 7, 30, 2, col('#6b3a22')); ctx.fillStyle = col('#b8863a'); ctx.fillRect(-3.5, -16, 7, 2); for (let i = 0; i < 4; i++) { stroke([[-2 + i * 1.4, -16], [-2 + i * 1.4, -22]], col('#ddd'), 0.8); poly([[-3 + i * 1.4, -22], [-1 + i * 1.4, -22], [-2 + i * 1.4, -26]], col(i % 2 ? '#c8452f' : '#eee')); } ctx.restore(); }
  if (p.hair === 'eka') { ctx.fillStyle = col('#1d1216'); E(0, -84, 11.2, 14.5); ctx.fill(); }
  if (p.hair === 'arjuna') { rrect(-11, -96, 22, 34, 6, col('#1a1014')); }
  if (p.hair === 'drona') { ctx.fillStyle = col('#e9e2d6'); E(0, -86, 10, 11.5); ctx.fill(); }
  const hc = col(p.hairCol || '#1d1216');
  if (p.hair === 'bun') { ctx.fillStyle = hc; E(0, -87, 10, 12); ctx.fill(); circ(0, -99.5, 5.2, hc); }
  if (p.hair === 'jata') { ctx.fillStyle = col('#24161a'); E(0, -84, 11, 14.5); ctx.fill(); }

  // neck + torso
  ctx.fillStyle = skinD; ctx.fillRect(-3.8, -80, 7.6, 9);
  setRim(true);
  ctx.beginPath(); ctx.moveTo(-15, -73); ctx.quadraticCurveTo(-17.5, -60, -11.8, -47.5); ctx.lineTo(11.8, -47.5); ctx.quadraticCurveTo(17.5, -60, 15, -73); ctx.quadraticCurveTo(0, -77.5, -15, -73); ctx.closePath();
  ctx.fillStyle = p.top === 'armour' ? gold : skin; ctx.fill();
  setRim(false);
  if (p.top === 'armour') {
    ctx.save(); ctx.clip(); ctx.strokeStyle = goldD; ctx.lineWidth = 0.55;
    for (let r = 0; r < 9; r++) for (let c = -6; c <= 6; c++) { ctx.beginPath(); ctx.arc(c * 3 + (r % 2) * 1.5, -73 + r * 3.2, 1.5, 0, Math.PI); ctx.stroke(); }
    ctx.restore(); circ(0, -60, 2.6, col('#f6e7c0')); circ(0, -60, 1.5, col('#c8452f'));
  } else {
    ctx.strokeStyle = skinD; ctx.lineWidth = 0.5; ctx.globalAlpha *= 0.6;
    ctx.beginPath(); ctx.arc(-5.5, -66, 5, 0.3, Math.PI - 0.4); ctx.stroke(); ctx.beginPath(); ctx.arc(5.5, -66, 5, 0.4, Math.PI - 0.3); ctx.stroke();
    ctx.globalAlpha /= 0.6;
  }
  if (sari) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(-15, -73); ctx.quadraticCurveTo(-17.5, -60, -11.8, -47.5); ctx.lineTo(11.8, -47.5); ctx.quadraticCurveTo(17.5, -60, 15, -73); ctx.closePath(); ctx.clip();
    ctx.fillStyle = col(shade(p.sari || p.dhoti, -0.2)); ctx.fillRect(-16, -74, 32, 14); ctx.restore();
    poly([[-15.5, -73.5], [-7, -76], [14.5, -53], [12.5, -47], [3, -47]], dh); stroke([[-7, -76], [14.5, -53]], bd, 1.1);
  }
  if (p.top === 'shawl') { poly([[-15.2, -73], [-7, -75.5], [13, -52], [12, -47.5], [4, -47.5]], col('#e8953a')); stroke([[-7, -75.5], [13, -52]], gold, 0.8); stroke([[-12, -72], [11, -48]], col('#f4efe6'), 0.6); }
  if (p.quiver && p.top !== 'shawl') stroke([[-13, -50], [14, -74]], col('#5a3020'), 1.6);
  if (!sari) { ctx.fillStyle = gold; ctx.fillRect(-12.6, -51, 25.2, 3.2); circ(0, -49.4, 1.5, col('#c8452f')); }
  // necklace
  if (p.neck === 'mala') { for (let a = 0.15; a < Math.PI - 0.1; a += 0.17) circ(Math.cos(a) * 7.5, -74 + Math.sin(a) * 10, 0.85, col('#5a2c18')); }
  if (p.neck === 'gold') { ctx.strokeStyle = gold; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, -76, 6.5, 5, 0, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -76, 8.5, 8.5, 0, 0.2, Math.PI - 0.2); ctx.stroke(); circ(0, -67.6, 1.3, col('#c8452f')); }
  if (p.neck === 'beads') { for (let a = 0.2; a < Math.PI - 0.15; a += 0.22) circ(Math.cos(a) * 6.8, -76 + Math.sin(a) * 6.5, 0.75, col(Math.round(a * 10) % 2 ? '#e9e0cf' : '#b23a2a')); poly([[-0.9, -69.5], [0.9, -69.5], [0, -66.5]], col('#efe6d4')); }

  // extra heads (Ravana): 5 to the left, 4 to the right, behind the main head
  if (p.heads > 1) {
    const extra = p.heads - 1, nl = Math.ceil(extra / 2), nr = extra - nl;
    const side = (k, s) => { const hx = s * k * 9.6, hy = -86 + k * 1.1, sc = 1 - k * 0.04;
      ctx.save(); ctx.translate(hx, hy); ctx.scale(sc, sc);
      fillE(0, 0, 8.2, 10, col(shade(p.skin, -0.12 - k * 0.03))); fillE(-2.4 * s * 0 - 3.3, -0.6, 2, 1.25, col('#f8f1e6')); fillE(3.3, -0.6, 2, 1.25, col('#f8f1e6')); circ(-3.3, -0.5, 0.9, col('#2a160e')); circ(3.3, -0.5, 0.9, col('#2a160e'));
      stroke([[-5, -3.6], [-1.2, -2.6]], col('#140c10'), 0.9); stroke([[5, -3.6], [1.2, -2.6]], col('#140c10'), 0.9);
      ctx.beginPath(); ctx.moveTo(0, 5); ctx.quadraticCurveTo(-3, 4, -5, 6.5); ctx.moveTo(0, 5); ctx.quadraticCurveTo(3, 4, 5, 6.5); ctx.strokeStyle = col('#140c10'); ctx.lineWidth = 1.3; ctx.stroke();
      poly([[-8, -7], [8, -7], [5, -15], [2, -22], [0, -27], [-2, -22], [-5, -15]], col(PAL.gold)); circ(0, -10, 1.3, col('#c8302a'));
      ctx.restore(); };
    for (let k = nl; k >= 1; k--) side(k, -1);
    for (let k = nr; k >= 1; k--) side(k, 1);
  }
  // head
  setRim(true);
  fillE(0, -87, 8.7, 10.7, skin);
  setRim(false);
  fillE(-8.6, -87, 1.6, 2.6, skinD); fillE(8.6, -87, 1.6, 2.6, skinD);
  fillE(0, -82, 6.5, 3.5, col(shade(p.skin, -0.06)));
  const muz = col(p.muzzleCol || '#efd2a8');
  if (p.monkey) { fillE(-10.3, -88, 2.8, 3.6, skinD); fillE(10.3, -88, 2.8, 3.6, skinD); fillE(-10.3, -88, 1.5, 2.2, muz); fillE(10.3, -88, 1.5, 2.2, muz); ctx.beginPath(); ctx.moveTo(0, -84); ctx.bezierCurveTo(-9, -82, -8.6, -92, -3.6, -91.2); ctx.quadraticCurveTo(0, -90, 3.6, -91.2); ctx.bezierCurveTo(8.6, -92, 9, -82, 0, -84); ctx.fillStyle = muz; ctx.fill(); }
  // earrings
  circ(-8.9, -83.4, 1.7, gold); circ(8.9, -83.4, 1.7, gold); circ(-8.9, -83.4, 0.7, col('#c8452f')); circ(8.9, -83.4, 0.7, col('#c8452f'));
  // face
  const ex = p.expr || 'neutral';
  const blink = p.eyes === 'closed' || (p.clay) || ((t * 1 + (p.phase || 0)) % 3.7 < 0.12);
  const browCol = p.hair === 'drona' ? col('#d8d0c4') : col('#1d1216');
  for (const s of [-1, 1]) {
    const cx = s * 3.6, cy = -87.6;
    if (blink || (p.eyes === 'one' && s < 0)) { ctx.beginPath(); ctx.moveTo(cx - 2.4, cy); ctx.quadraticCurveTo(cx, cy + 1.2, cx + 2.4, cy); ctx.strokeStyle = col('#2a1410'); ctx.lineWidth = 0.7; ctx.stroke(); }
    else {
      fillE(cx, cy, 2.5, ex === 'shock' ? 2.1 : 1.55, col('#f8f1e6'));
      const lx = (p.look || 0) * 0.8;
      circ(cx + lx, cy + 0.1, ex === 'shock' ? 1.0 : 1.2, col('#2a160e')); circ(cx + lx + 0.4, cy - 0.4, 0.35, '#fff');
      ctx.beginPath(); ctx.ellipse(cx, cy, 2.6, ex === 'shock' ? 2.2 : 1.6, 0, Math.PI + 0.2, TAU - 0.2); ctx.strokeStyle = col('#2a1410'); ctx.lineWidth = 0.7; ctx.stroke();
    }
    let bi = -91.2, bo = -91.4;
    if (ex === 'stern') { bi = -89.9; bo = -91.9; } if (ex === 'sad') { bi = -92.2; bo = -90.6; } if (ex === 'shock') { bi = -93.2; bo = -92.8; }
    stroke([[s * 1.4, bi], [s * 5.8, bo]], p.hair === 'bun' && p.hairCol && p.old ? col('#bdb5aa') : browCol, sari ? 0.7 : 1.05);
    if (p.old) { ctx.save(); ctx.globalAlpha *= 0.55; stroke([[s * 6.4, -88.5], [s * 7.4, -89.6]], skinD, 0.35); stroke([[s * 6.4, -87], [s * 7.5, -86.6]], skinD, 0.35); stroke([[s * 2, -85.4], [s * 5, -85.2]], skinD, 0.35); stroke([[s * 3.4, -82.5], [s * 4.6, -79]], skinD, 0.4); ctx.restore(); }
  }
  ctx.beginPath(); ctx.moveTo(-0.3, -87); ctx.quadraticCurveTo(1.4, -83, -0.4, -82.6); ctx.strokeStyle = skinD; ctx.lineWidth = 0.6; ctx.stroke();
  const lip = col('#7a2f26');
  if (ex === 'shock') fillE(0, -79.4, 1.4, 1.9, col('#3a1410'));
  else { const cy = ex === 'smile' ? -78.4 : ex === 'sad' || ex === 'stern' ? -80.4 : -79.5; const ey = ex === 'sad' ? -79.2 : -79.8; ctx.beginPath(); ctx.moveTo(-2.2, ey); ctx.quadraticCurveTo(0, cy, 2.2, ey); ctx.strokeStyle = lip; ctx.lineWidth = 0.9; ctx.stroke(); }
  if (p.monkey) { fillE(0, -80.6, 6.4, 4.6, muz); circ(-1.1, -82.6, 0.55, col('#3a2014')); circ(1.1, -82.6, 0.55, col('#3a2014')); ctx.beginPath(); ctx.moveTo(-3.2, -79.4); ctx.quadraticCurveTo(0, ex === 'smile' ? -77.2 : ex === 'sad' ? -80.2 : -78.6, 3.2, -79.4); ctx.strokeStyle = col('#7a2f26'); ctx.lineWidth = 0.8; ctx.stroke(); if (ex === 'shock') fillE(0, -78.8, 1.6, 1.8, col('#3a1410')); }
  if (p.stache) { ctx.beginPath(); ctx.moveTo(0, -81.6); ctx.bezierCurveTo(-3, -82.6, -6, -81.6, -7, -78.6); ctx.quadraticCurveTo(-4.5, -80.6, 0, -80.4); ctx.moveTo(0, -81.6); ctx.bezierCurveTo(3, -82.6, 6, -81.6, 7, -78.6); ctx.quadraticCurveTo(4.5, -80.6, 0, -80.4); ctx.fillStyle = col(p.stacheCol || '#140c10'); ctx.fill(); }
  if (p.fangs) { poly([[-2.1, -79.6], [-1.2, -79.6], [-1.65, -77.4]], '#fff8ec'); poly([[1.2, -79.6], [2.1, -79.6], [1.65, -77.4]], '#fff8ec'); }
  if (sari) { circ(0, -92.6, 0.85, col('#c8302a')); circ(2.3, -83.2, 0.55, gold); }
  if (p.old) { ctx.save(); ctx.globalAlpha *= 0.5; for (let i = 0; i < 3; i++) stroke([[-4.5, -96 + i * 1.3], [4.5, -96 + i * 1.3]], skinD, 0.3); ctx.restore(); }
  if (p.tilak === 'red') { stroke([[0, -94], [0, -91]], col('#c8302a'), 0.9); }
  if (p.tilak === 'ash') { for (let i = 0; i < 3; i++) stroke([[-4, -95.3 + i * 1.2], [4, -95.3 + i * 1.2]], col('#efe9de'), 0.55); circ(0, -94.1, 0.7, col('#c8302a')); }
  if (p.tear) { fillE(-3.4, -84.6 + (t * 2 % 3), 0.6, 0.9, 'rgba(200,230,255,0.85)'); }

  // front hair / crown / beard
  if (p.hair === 'eka') {
    ctx.fillStyle = col('#1d1216'); ctx.beginPath(); ctx.ellipse(0, -91.5, 9.2, 7.4, 0, Math.PI, TAU); ctx.fill();
    poly([[-9, -91], [-6, -88.5], [-4, -91.5], [-1, -89], [2, -91.5], [5, -88.8], [9, -91]], col('#1d1216'));
    ctx.beginPath(); ctx.ellipse(0, -94.8, 9.3, 2, 0, 0.05, Math.PI - 0.05); ctx.strokeStyle = col('#b23a2a'); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save(); ctx.translate(7, -96); ctx.rotate(0.35 + Math.sin(t * 2) * 0.04);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-4, -9, 0, -18); ctx.quadraticCurveTo(4, -9, 0, 0); ctx.fillStyle = col('#1f7a6a'); ctx.fill();
    circ(0, -14, 2.1, col('#d9b13a')); circ(0, -14, 1.4, col('#2a4fa0')); circ(0, -14, 0.6, col('#111'));
    ctx.restore();
  }
  if (p.hair === 'drona') {
    ctx.fillStyle = col('#efe8dc'); ctx.beginPath(); ctx.ellipse(0, -91, 9.1, 7.6, 0, Math.PI, TAU); ctx.fill();
    circ(0, -100.5, 3.8, col('#efe8dc')); stroke([[-3, -98.5], [3, -98.5]], col('#c9a26a'), 0.8);
    ctx.beginPath(); ctx.moveTo(-8.4, -86); ctx.quadraticCurveTo(-9.5, -72, 0, -62); ctx.quadraticCurveTo(9.5, -72, 8.4, -86); ctx.quadraticCurveTo(6, -80.5, 3, -79.2); ctx.quadraticCurveTo(0, -77.5, -3, -79.2); ctx.quadraticCurveTo(-6, -80.5, -8.4, -86); ctx.fillStyle = col('#efe8dc'); ctx.fill();
    ctx.strokeStyle = col('#cfc6b8'); ctx.lineWidth = 0.4; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 2, -77); ctx.lineTo(i * 1.2, -66); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, -81.4); ctx.quadraticCurveTo(-3, -82, -5.4, -78.8); ctx.moveTo(0, -81.4); ctx.quadraticCurveTo(3, -82, 5.4, -78.8); ctx.strokeStyle = col('#efe8dc'); ctx.lineWidth = 1.5; ctx.stroke();
    if (ex === 'shock') fillE(0, -79.3, 1.2, 1.5, col('#3a1410'));
    else { ctx.beginPath(); ctx.moveTo(-1.8, -79.6); ctx.quadraticCurveTo(0, ex === 'smile' ? -78.6 : -80.2, 1.8, -79.6); ctx.strokeStyle = lip; ctx.lineWidth = 0.8; ctx.stroke(); }
  }
  if (p.hair === 'wild') {
    ctx.fillStyle = col('#140c10'); ctx.beginPath(); ctx.moveTo(-9.3, -89); for (let i = 0; i <= 8; i++) { const xx = -9.3 + i * 18.6 / 8; ctx.lineTo(xx, i % 2 ? -92 : -95.5 - Math.sin(i) * 1.5); } ctx.lineTo(9.3, -89); ctx.quadraticCurveTo(0, -94, -9.3, -89); ctx.fill();
    if (p.crown) { ctx.fillStyle = col(PAL.gold); ctx.fillRect(-9.6, -97.5, 19.2, 3); for (let i = -2; i <= 2; i++) poly([[i * 4 - 1.6, -97.5], [i * 4 + 1.6, -97.5], [i * 4, -102 - (i === 0 ? 3 : 0)]], col(PAL.gold)); circ(0, -96, 1.2, col('#c8302a')); }
  }
  if (p.hair === 'bun') {
    ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(0, -91.2, 9.3, 7.8, 0, Math.PI, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9.3, -91); ctx.quadraticCurveTo(-5, -95, 0, -97.5); ctx.quadraticCurveTo(5, -95, 9.3, -91); ctx.lineTo(9.3, -89); ctx.quadraticCurveTo(5, -93, 0, -95); ctx.quadraticCurveTo(-5, -93, -9.3, -89); ctx.fill();
    stroke([[0, -98.8], [0, -95.5]], col(shade(p.hairCol || '#1d1216', p.old ? -0.25 : 0.25)), 0.5);
    if (p.veil) { ctx.save(); ctx.globalAlpha *= 0.95; ctx.beginPath(); ctx.ellipse(0, -90, 11.5, 13, 0, Math.PI * 0.95, TAU + 0.05); ctx.lineTo(12, -74); ctx.lineTo(9.5, -74); ctx.quadraticCurveTo(10, -88, 0, -96); ctx.quadraticCurveTo(-10, -88, -9.5, -74); ctx.lineTo(-12, -74); ctx.closePath(); ctx.fillStyle = col(p.sari || p.dhoti); ctx.fill(); ctx.restore(); }
  }
  if (p.hair === 'plain') { ctx.fillStyle = col('#1d1216'); ctx.beginPath(); ctx.ellipse(0, -91.5, 9.1, 7.2, 0, Math.PI, TAU); ctx.fill(); poly([[-9, -91], [-5, -89], [0, -91], [5, -89], [9, -91]], col('#1d1216')); }
  if (p.hair === 'jata') {
    const jc = col('#24161a');
    ctx.fillStyle = jc; ctx.beginPath(); ctx.ellipse(0, -91.5, 9.2, 7.4, 0, Math.PI, TAU); ctx.fill();
    E(0, -104, 5.6, 8.5); ctx.fill(); E(0, -97.5, 7.5, 3); ctx.fill();
    ctx.strokeStyle = col('#3a262a'); ctx.lineWidth = 0.6; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 2, -97); ctx.quadraticCurveTo(i * 3, -104, i * 1.2, -111); ctx.stroke(); }
    for (let a = 0; a < Math.PI; a += 0.32) circ(Math.cos(a) * 6.2, -99 + Math.sin(a) * 1.6, 0.75, col('#7a3a1a'));
    poly([[-9, -91], [-6, -88.6], [-3, -91], [0, -89], [3, -91], [6, -88.6], [9, -91]], jc);
  }
  if (p.hair === 'fur') { ctx.fillStyle = col(shade(p.skin, -0.2)); ctx.beginPath(); ctx.ellipse(0, -91, 9.6, 7.4, 0, Math.PI, TAU); ctx.fill(); poly([[-9.6, -90], [-7, -87.5], [-4.5, -90], [0, -88], [4.5, -90], [7, -87.5], [9.6, -90]], col(shade(p.skin, -0.2))); }
  if (p.hair === 'arjuna' || p.mukut) {
    ctx.fillStyle = p.hair === 'arjuna' ? col('#1a1014') : col(shade(p.skin, -0.2)); ctx.beginPath(); ctx.ellipse(0, -92, 9, 5.5, 0, Math.PI, TAU); ctx.fill();
    const g = ctx.createLinearGradient(-9, 0, 9, 0); g.addColorStop(0, col('#b8862b')); g.addColorStop(0.5, col('#ffe08a')); g.addColorStop(1, col('#b8862b'));
    setRim(true); poly([[-9.6, -94], [9.6, -94], [6.5, -105], [2.8, -118], [0, -128], [-2.8, -118], [-6.5, -105]], g); setRim(false);
    for (const yy of [-98, -105, -112]) { const w = (yy + 128) * 0.31; stroke([[-w, yy], [w, yy]], goldD, 0.6); }
    poly([[-9.6, -94], [-13, -99], [-8, -97]], g); poly([[9.6, -94], [13, -99], [8, -97]], g);
    ctx.fillStyle = gold; ctx.fillRect(-9.8, -96, 19.6, 2.6); circ(0, -100, 1.8, col('#c8302a')); circ(0, -129, 1.2, col('#c8302a'));
  }

  // arms
  const armband = col(p.band || PAL.gold);
  for (const side of ['L', 'R']) {
    const a = pose[side];
    stroke(a, skinD, 6.6); stroke(a, skin, 5.4);
    const mx = lerp(a[0][0], a[1][0], 0.55), my = lerp(a[0][1], a[1][1], 0.55);
    E(mx, my, 3, 1.3, Math.atan2(a[1][1] - a[0][1], a[1][0] - a[0][0]) + Math.PI / 2); ctx.fillStyle = armband; ctx.fill();
    if (!(pose.hands === 'namaste' || pose.hands === 'offer')) { circ(a[2][0], a[2][1], 2.9, skin); }
    E(lerp(a[1][0], a[2][0], 0.8), lerp(a[1][1], a[2][1], 0.8), 2.5, 1.1, Math.atan2(a[2][1] - a[1][1], a[2][0] - a[1][0]) + Math.PI / 2); ctx.fillStyle = gold; ctx.fill();
  }
  if (pose.hands === 'namaste') { ctx.beginPath(); ctx.moveTo(0, -70); ctx.quadraticCurveTo(-3.4, -64, -2.2, -59.5); ctx.lineTo(2.2, -59.5); ctx.quadraticCurveTo(3.4, -64, 0, -70); ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = skinD; ctx.lineWidth = 0.5; ctx.stroke(); stroke([[0, -69], [0, -60]], skinD, 0.4); }
  if (pose.hands === 'pointR') { stroke([[36, -71], [41, -71.5]], skin, 1.6); }
  if (pose.hands === 'palmR') { rrect(19.5, -98.5, 7, 7.5, 2.5, skin); }
  if (pose.hands === 'lift') { circ(24, -100, 3, skin); mountainRock(24, -101, 46, t, 1); }
  if (pose.hands === 'fly') { circ(-34, -91, 2.9, skin); }
  if (pose.hands === 'sword') {
    ctx.save(); ctx.shadowColor = 'rgba(255,80,60,0.9)'; ctx.shadowBlur = 20 * h / 300;
    ctx.beginPath(); ctx.moveTo(21, -96); ctx.quadraticCurveTo(36, -118, 22, -140); ctx.quadraticCurveTo(30, -118, 18, -97); ctx.closePath(); ctx.fillStyle = col('#eef2f6'); ctx.fill(); ctx.restore();
    rrect(17, -98, 9, 3, 1, col(PAL.gold)); circ(22, -93, 2.8, skin);
  }
  if (pose.hands === 'mace') {
    stroke([[20, -93], [17, -126]], col('#5a3a1a'), 2); circ(20, -93, 2.8, skin);
    ctx.save(); ctx.translate(16.5, -131); for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); poly([[-1.2, -7], [1.2, -7], [0, -10]], col(PAL.goldD)); } ctx.restore();
    const mg = ctx.createRadialGradient(15, -133, 1, 16.5, -131, 8); mg.addColorStop(0, col('#ffe9a8')); mg.addColorStop(1, col(PAL.goldD)); circ(16.5, -131, 7.5, mg);
  }
  if (pose.hands === 'veena') {
    stroke([[-17, -92], [15, -42]], col('#6b3b1f'), 2.2); circ(-15, -88, 5, col('#8a4a22')); circ(13, -46, 7.5, col('#9a5a2a')); circ(13, -46, 5.5, col('#b8863a'));
    for (let i = -1; i <= 1; i++) stroke([[-16 + i * 0.6, -90], [14 + i * 0.6, -44]], 'rgba(255,240,200,0.8)', 0.2);
    circ(-9, -66, 2.6, skin); circ(8, -56, 2.6, skin);
  }
  if (pose.hands === 'taste' && p.conch) {
    circ(5, -79.5, 2.6, skin); ctx.save(); ctx.translate(6, -82); ctx.rotate(-0.6); fillE(0, -3, 3.2, 5.5, col('#f6efe2')); ctx.beginPath(); ctx.arc(0, -2, 2, 0, TAU * 0.8); ctx.strokeStyle = col('#c9b9a0'); ctx.lineWidth = 0.4; ctx.stroke(); ctx.restore(); circ(-7, -55, 2.6, skin);
  }
  if (pose.hands === 'taste' && !p.conch) {
    circ(5, -79.5, 2.6, skin); circ(4.2, -80.2, 1.5, col('#b0233a')); circ(3.8, -80.6, 0.45, '#ffd0d8');
    circ(-7, -55, 2.6, skin); fillE(-7, -56.5, 7, 2.2, col('#3f8a4a'));
    for (const [bx, by, c] of [[-10, -57.5, '#9a1f3a'], [-7.5, -58, '#c0303a'], [-5, -57.6, '#7a1a4a'], [-8.6, -59.4, '#b02a3a']]) circ(bx, by, 1.15, col(c));
  }
  if (pose.hands === 'sweep') { stroke([[-8, -59], [10, -2]], col('#7a5a2a'), 1.2); poly([[8, -6], [14, -6], [17, 0], [5, 0]], col('#c9a14a')); circ(-6, -58, 2.6, skin); circ(4, -52, 2.6, skin); }
  if (pose.hands === 'offer') {
    fillE(-4, -53, 3, 2.2, skin); fillE(4, -53, 3, 2.2, skin);
    if (p.leaf) { fillE(0, -55, 8.5, 2.6, col('#3f8a4a')); if (p.berries) for (const [bx, by, c] of [[-4.5, -56.5, '#9a1f3a'], [-1.5, -57, '#c0303a'], [1.5, -56.6, '#7a1a4a'], [4.5, -56.8, '#b02a3a'], [0, -58.6, '#a8243a'], [-3, -58.5, '#8a1a40'], [3, -58.6, '#c02a3a']]) { circ(bx, by, 1.25, col(c)); circ(bx - 0.4, by - 0.4, 0.35, '#ffc8d0'); } stroke([[-8, -55], [8, -55]], col('#2a5a30'), 0.4); const gg = ctx.createRadialGradient(0, -57, 0, 0, -57, 9); gg.addColorStop(0, 'rgba(255,230,160,0.95)'); gg.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = gg; ctx.fillRect(-10, -67, 20, 20); }
  }
  const wood = col('#6b3b1f');
  if (pose.bow === 'draw') {
    const drawn = p.drawn !== false;
    ctx.beginPath(); ctx.moveTo(-38, -106); ctx.quadraticCurveTo(-52, -73, -38, -40); ctx.strokeStyle = wood; ctx.lineWidth = 1.8; ctx.stroke();
    circ(-38, -106, 1, gold); circ(-38, -40, 1, gold);
    if (drawn) { stroke([[-38, -106], [11, -81], [-38, -40]], 'rgba(255,245,225,0.9)', 0.35); stroke([[12, -81], [-52, -77]], col('#e6d6b0'), 0.8); poly([[-52, -77], [-48, -79.5], [-48, -75]], col('#bfc4c8')); poly([[12, -81], [16, -83.5], [15, -81]], col('#c8452f')); poly([[12, -81], [16, -78.5], [15, -81]], col('#c8452f')); }
    else stroke([[-38, -106], [-38, -40]], 'rgba(255,245,225,0.9)', 0.35);
  }
  if (pose.bow === 'side') { ctx.beginPath(); ctx.moveTo(-19, -100); ctx.quadraticCurveTo(-28, -70, -19, -40); ctx.strokeStyle = wood; ctx.lineWidth = 1.8; ctx.stroke(); stroke([[-19, -100], [-19, -40]], 'rgba(255,245,225,0.8)', 0.3); }
  if (pose.bow === 'shoulder') { ctx.beginPath(); ctx.moveTo(4, -105); ctx.quadraticCurveTo(26, -80, 18, -45); ctx.strokeStyle = wood; ctx.lineWidth = 1.8; ctx.stroke(); stroke([[4, -105], [18, -45]], 'rgba(255,245,225,0.8)', 0.3); }
  ctx.restore();
  ctx.restore();
}

function dog(x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  const fur = '#9a6a3c', furD = '#6e4626', furL = '#c99a62';
  fillE(0, -1, 34, 4, 'rgba(15,5,15,0.35)');
  // tail
  const wag = o.bark ? Math.sin(t * 20) * 0.3 : Math.sin(t * 6) * 0.15;
  ctx.save(); ctx.translate(26, -38); ctx.rotate(-0.6 + wag); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -14, 6, -26); ctx.strokeStyle = furD; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
  for (const lx of [-18, -9, 14, 22]) { rrect(lx - 3.5, -24, 7, 23, 3, lx > 0 ? furD : fur); fillE(lx, -2, 5, 2.6, furD); }
  fillE(2, -34, 30, 14, fur); fillE(-2, -28, 20, 7, furL);
  // head
  const hx = -28, hy = -50;
  fillE(hx, hy, 15, 14, fur);
  // ear
  ctx.save(); ctx.translate(hx + 6, hy - 8); ctx.rotate(0.5 + (o.bark ? Math.sin(t * 20) * 0.15 : 0)); fillE(0, 8, 5, 11, furD); ctx.restore();
  // snout + jaw
  const open = o.bark ? (Math.sin(t * 18) > 0 ? 1 : 0.25) : 0;
  fillE(hx - 14, hy + 4, 11, 6.5, furL);
  ctx.save(); ctx.translate(hx - 6, hy + 9); ctx.rotate(open * 0.45); fillE(-8, 2, 10, 3.6, furL); ctx.restore();
  if (open > 0.5) fillE(hx - 15, hy + 10, 7, 3.4, '#5a1a1a');
  circ(hx - 24, hy + 1.5, 3, '#1a0e0e');
  // eye
  if (o.dazed) { ctx.strokeStyle = '#1a0e0e'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i * 0.9, r = i * 0.35; ctx.lineTo(hx - 3 + Math.cos(a) * r, hy - 4 + Math.sin(a) * r); } ctx.stroke(); }
  else { fillE(hx - 3, hy - 4, 3, 3.2, '#fff'); circ(hx - 4, hy - 4, 1.8, '#1a0e0e'); }
  // arrows muzzle
  const n = o.arrows || 0;
  for (let i = 0; i < n; i++) {
    const ax = hx - 22 + i * 3.6, ang = -0.25 + (i % 2) * 0.5;
    ctx.save(); ctx.translate(ax, hy + 6); ctx.rotate(Math.PI / 2 + ang);
    stroke([[-16, 0], [16, 0]], '#e6d6b0', 1.4); poly([[16, 0], [12, -2.4], [12, 2.4]], '#bfc4c8'); poly([[-16, 0], [-20, -3], [-18, 0]], '#c8452f'); poly([[-16, 0], [-20, 3], [-18, 0]], '#c8452f');
    ctx.restore();
  }
  ctx.restore();
}

function arrowFly(x1, y1, x2, y2, p, len = 120) {
  if (p <= 0 || p >= 1) return;
  const x = lerp(x1, x2, p), y = lerp(y1, y2, p), a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.globalAlpha = 0.35; stroke([[-len * 2.2, 0], [-len, 0]], '#fff3d0', 6); ctx.globalAlpha = 1;
  stroke([[-len, 0], [0, 0]], '#e6d6b0', 5); poly([[14, 0], [0, -8], [0, 8]], '#d8dde2'); poly([[-len, 0], [-len - 16, -11], [-len - 8, 0]], '#c8452f'); poly([[-len, 0], [-len - 16, 11], [-len - 8, 0]], '#c8452f');
  ctx.restore();
}

// ---------- typography ----------
function txt(s, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 700} ${size}px ${o.font || 'Pop'}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
  if (o.scale) { ctx.translate(x, y); ctx.scale(o.scale, o.scale); x = 0; y = 0; }
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur || 20; }
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || size * 0.16; ctx.strokeText(s, x, y); ctx.shadowBlur = 0; }
  ctx.fillStyle = o.fill || '#fff'; ctx.fillText(s, x, y);
  ctx.restore();
}
function burst(cx, cy, t, c1, c2, n = 20) {
  ctx.fillStyle = c1; ctx.fillRect(-600, -600, W + 1200, H + 1200);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.4);
  for (let i = 0; i < n; i++) { if (i % 2) continue; const a0 = i / n * TAU, a1 = (i + 1) / n * TAU; poly([[0, 0], [Math.cos(a0) * 2500, Math.sin(a0) * 2500], [Math.cos(a1) * 2500, Math.sin(a1) * 2500]], c2); }
  ctx.restore();
}

// ---------- props ----------
function elephant(x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale((o.flip ? -1 : 1) * s / 100, s / 100);
  const g = '#8c8798', gD = '#6c6778', step = Math.sin(t * 6 + (o.phase || 0));
  fillE(0, -1, 40, 4, 'rgba(15,5,15,0.3)');
  for (const [lx, ph] of [[-22, 0], [-10, 1], [14, 0.5], [26, 1.5]]) { const lift = Math.max(0, Math.sin(t * 6 + ph * 3 + (o.phase || 0))) * 4; rrect(lx - 5, -34 - lift, 10, 33, 4, lx < 0 ? gD : g); }
  fillE(2, -46, 34, 22, g); ctx.save(); ctx.translate(30, -50); ctx.rotate(-0.5 + step * 0.04); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, 8, 6, 22); ctx.strokeStyle = gD; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  fillE(-34, -56, 17, 16, g); fillE(-26, -56, 11, 15, gD);
  ctx.beginPath(); ctx.moveTo(-46, -50); ctx.quadraticCurveTo(-56, -30, -50, -12 + step * 2); ctx.strokeStyle = g; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
  poly([[-44, -46], [-54, -40], [-44, -42]], '#f4efe6'); circ(-40, -61, 2, '#1a0e0e');
  rrect(-14, -72, 30, 10, 3, '#b8323a'); ctx.fillStyle = PAL.gold; ctx.fillRect(-14, -64, 30, 2);
  ctx.restore();
}
function drum(x, y, s, t, hit = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  const sq = 1 + 0.08 * hit;
  fillE(0, -1, 26, 4, 'rgba(15,5,15,0.3)');
  rrect(-24, -50 * sq, 48, 48 * sq, 6, '#a8452a'); for (let i = -2; i <= 2; i++) stroke([[i * 10, -50 * sq], [i * 10 + 5, -2]], '#f2c14e', 1.2);
  fillE(0, -50 * sq, 24, 7, '#e9dcc2'); fillE(0, -50 * sq, 24, 7, 'rgba(0,0,0,0)');
  if (hit > 0) { ctx.strokeStyle = `rgba(255,240,200,${hit})`; ctx.lineWidth = 3; for (let r = 30; r <= 60; r += 15) { ctx.beginPath(); ctx.arc(0, -55, r + (1 - hit) * 20, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
  ctx.restore();
}
function bed(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  fillE(0, -1, 70, 5, 'rgba(15,5,15,0.35)');
  rrect(-66, -26, 132, 18, 4, '#5a3a24'); rrect(-62, -34, 124, 12, 5, '#c9b28a'); rrect(-60, -40, 30, 10, 5, '#efe6d4');
  for (const lx of [-62, 58]) rrect(lx, -10, 6, 10, 1, '#4a2a18');
  ctx.restore();
}
function lankaCity(y0, t, fire = 0) {
  const R = rng(77);
  for (let i = 0; i < 22; i++) {
    const x = -300 + i * 80 + R() * 30, w = 40 + R() * 40, h = 90 + R() * 220;
    const c = mix('#4a2032', '#8a5a2a', R() * 0.5);
    ctx.fillStyle = c; ctx.fillRect(x, y0 - h, w, h);
    ctx.beginPath(); ctx.arc(x + w / 2, y0 - h, w / 2, Math.PI, 0); ctx.fill();
    stroke([[x + w / 2, y0 - h - w / 2], [x + w / 2, y0 - h - w / 2 - 26]], c, 3); circ(x + w / 2, y0 - h - w / 2 - 28, 4, '#f2c14e');
    for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(255,200,110,${0.5 + 0.4 * Math.sin(t * 3 + i + k)})`; ctx.fillRect(x + 8 + k * (w - 16) / 3, y0 - h * 0.6, 5, 9); }
  }
  if (fire > 0) {
    for (let i = 0; i < 16; i++) { const fx = -200 + i * 100 + R() * 60, fh = (80 + R() * 160) * (0.8 + 0.2 * Math.sin(t * 7 + i)) * fire;
      const g = ctx.createLinearGradient(0, y0 - fh, 0, y0); g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(0.4, 'rgba(255,140,40,0.8)'); g.addColorStop(1, 'rgba(200,40,20,0.9)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx - 40, y0); ctx.quadraticCurveTo(fx - 30, y0 - fh * 0.6, fx + Math.sin(t * 5 + i) * 10, y0 - fh); ctx.quadraticCurveTo(fx + 30, y0 - fh * 0.6, fx + 40, y0); ctx.fill(); }
  }
}

// ---------- Ep 3 (Jatayu) art ----------
// vulture: mode perch | fly | fall | lying ; o.eyes 'closed' ; o.flip ; o.nowings
function vulture(x, y, s, t, o = {}) {
  const mode = o.mode || 'perch';
  ctx.save(); ctx.translate(x, y); ctx.scale((o.flip ? -1 : 1) * s / 100, s / 100);
  if (o.rot) ctx.rotate(o.rot);
  const body = '#7a6a5a', bodyD = '#5e5044', wingC = '#5a4e46', wingL = '#8a7a6a', ruff = '#efe6d6', skin = '#d9a08a', gold = '#d9a43a';
  const flap = mode === 'fly' ? Math.sin(t * 7) : 0;
  const glow = o.rim !== false;
  if (glow) { ctx.shadowColor = 'rgba(255,205,130,0.7)'; ctx.shadowBlur = 16 * s / 300; }
  const wing = (side) => {
    if (o.nowings) return;
    ctx.save(); ctx.scale(side, 1);
    if (mode === 'fly' || mode === 'fall') {
      ctx.translate(10, -48); ctx.rotate((mode === 'fall' ? 0.9 : -0.25) + flap * 0.45);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(40, -30, 82, -14); ctx.lineTo(78, -6);
      for (let i = 0; i < 7; i++) { ctx.lineTo(74 - i * 10, 4 + (i % 2) * 7); }
      ctx.lineTo(0, 14); ctx.closePath(); ctx.fillStyle = wingC; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = wingL; ctx.lineWidth = 1.2; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 11, -4); ctx.lineTo(12 + i * 11, 8); ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.moveTo(8, -62); ctx.quadraticCurveTo(26, -50, 22, -14); ctx.lineTo(14, -6); ctx.lineTo(10, -16); ctx.quadraticCurveTo(10, -40, 4, -58); ctx.closePath(); ctx.fillStyle = wingC; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = wingL; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(12 + i * 2, -46 + i * 9); ctx.lineTo(21, -42 + i * 9); ctx.stroke(); }
    }
    ctx.restore();
  };
  wing(-1); wing(1);
  if (glow) { ctx.shadowColor = 'rgba(255,205,130,0.7)'; ctx.shadowBlur = 16 * s / 300; }
  // body
  fillE(0, -40, 15, 24, body); fillE(0, -36, 10.5, 17, '#9a8670');
  ctx.shadowBlur = 0; ctx.strokeStyle = '#6e5e4e'; ctx.lineWidth = 0.7;
  for (let r = 0; r < 5; r++) for (let c = -2; c <= 2; c++) { if (Math.abs(c) + r * 0.3 > 3) continue; ctx.beginPath(); ctx.arc(c * 3.6 + (r % 2) * 1.8, -48 + r * 5.5, 2, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.shadowBlur = 0;
  // tail + legs
  poly([[-7, -18], [7, -18], [10, 0], [-10, 0]], bodyD);
  if (mode === 'perch') { for (const lx of [-5, 5]) { stroke([[lx, -18], [lx, -2]], gold, 2.2); stroke([[lx - 4, 0], [lx, -2], [lx + 4, 0]], gold, 1.6); } }
  // ruff
  for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; circ(Math.cos(a) * 10, -60 + Math.sin(a) * -3 + 2, 4, ruff); }
  fillE(0, -61, 11, 4.5, ruff);
  // neck + head
  stroke([[0, -62], [0, -70]], skin, 5);
  fillE(0, -76, 7.5, 7, skin);
  const closed = o.eyes === 'closed';
  for (const sx of [-1, 1]) {
    if (closed) { ctx.beginPath(); ctx.moveTo(sx * 3.5 - 1.6, -78); ctx.quadraticCurveTo(sx * 3.5, -77, sx * 3.5 + 1.6, -78); ctx.strokeStyle = '#2a1410'; ctx.lineWidth = 0.6; ctx.stroke(); }
    else { circ(sx * 3.5, -78, 1.7, '#f8e7b0'); circ(sx * 3.5, -78, 0.9, '#2a1410'); circ(sx * 3.5 + 0.3, -78.4, 0.3, '#fff'); }
    stroke([[sx * 1.3, -80.5], [sx * 5.4, -81.4]], '#efe6d6', 0.9);
  }
  // hooked beak
  ctx.beginPath(); ctx.moveTo(-2.4, -76); ctx.lineTo(2.4, -76); ctx.quadraticCurveTo(2.6, -70, 0, -66.5); ctx.quadraticCurveTo(-1.4, -69, -2.4, -76); ctx.fillStyle = '#e8c070'; ctx.fill();
  poly([[-0.8, -67.5], [0.8, -67.5], [0, -65.8]], '#3a2a1a');
  // golden crest (royal bird)
  poly([[-3, -82], [0, -89], [3, -82]], gold); circ(0, -84, 1, '#c8302a');
  ctx.restore();
}
function pushpaka(x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * 6); ctx.scale(s / 100, s / 100); ctx.rotate(o.tilt || 0);
  // clouds under
  for (let i = -3; i <= 3; i++) fillE(i * 16, 6 + Math.abs(i) * 1.5, 14, 7, 'rgba(255,240,225,0.75)');
  // hull (front part, drawn over riders' legs)
  ctx.beginPath(); ctx.moveTo(-62, -14); ctx.quadraticCurveTo(0, -4, 62, -14); ctx.lineTo(50, 6); ctx.quadraticCurveTo(0, 14, -50, 6); ctx.closePath();
  const g = ctx.createLinearGradient(0, -14, 0, 12); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#a8742a'); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 1; ctx.stroke();
  for (let i = -4; i <= 4; i++) circ(i * 11, -3, 2, i % 2 ? '#c8302a' : '#2f5aa8');
  poly([[-62, -14], [-74, -30], [-56, -16]], '#f2c14e'); poly([[62, -14], [74, -30], [56, -16]], '#f2c14e');
  ctx.restore();
}
function pyre(x, y, s, t, fire = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  fillE(0, 0, 60, 6, 'rgba(15,5,15,0.4)');
  for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) { const yy = -6 - r * 9; if (r % 2) rrect(-40 + i * 22, yy - 5, 14, 9, 3, '#5a3a24'); else rrect(-46, yy - 4 + 0, 92, 7, 3, i === 0 ? '#6a4428' : 'rgba(0,0,0,0)'); }
  if (fire > 0) {
    for (let i = 0; i < 9; i++) {
      const fx = -36 + i * 9, fh = (34 + 22 * Math.sin(i * 1.7)) * (0.8 + 0.2 * Math.sin(t * 9 + i)) * fire;
      const fg = ctx.createLinearGradient(0, -40 - fh, 0, -38); fg.addColorStop(0, 'rgba(255,230,140,0)'); fg.addColorStop(0.35, 'rgba(255,170,60,0.9)'); fg.addColorStop(1, 'rgba(230,70,30,0.95)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(fx - 8, -36); ctx.quadraticCurveTo(fx - 6, -36 - fh * 0.6, fx + Math.sin(t * 6 + i) * 3, -38 - fh); ctx.quadraticCurveTo(fx + 6, -36 - fh * 0.6, fx + 8, -36); ctx.fill();
    }
    const gl = ctx.createRadialGradient(0, -50, 5, 0, -50, 140); gl.addColorStop(0, `rgba(255,170,80,${0.35 * fire})`); gl.addColorStop(1, 'rgba(255,170,80,0)'); ctx.fillStyle = gl; ctx.fillRect(-150, -200, 300, 260);
    const R = rng(91); for (let i = 0; i < 14; i++) { const ph = (t * 0.5 + R()) % 1; circ(-30 + R() * 60 + Math.sin(t * 2 + i) * 8, -60 - ph * 150, 1.5 * (1 - ph), `rgba(255,210,120,${1 - ph})`); }
  }
  ctx.restore();
}
function feathers(t, x, y, n = 10, seed = 3, spread = 500) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.25 + R()) % 1, fx = x + (R() - 0.5) * spread + Math.sin(t * 1.5 + i) * 40, fy = y + ph * 900;
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.sin(t * 2 + i) * 0.8); ctx.globalAlpha *= Math.sin(ph * Math.PI);
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(12, 0, 0, 30); ctx.quadraticCurveTo(-12, 0, 0, -30); ctx.fillStyle = i % 3 ? '#6e6258' : '#d9a43a'; ctx.fill();
    stroke([[0, -30], [0, 34]], '#efe6d6', 1.5); ctx.restore();
  }
}

// ---------- Ep 4 (Sanjeevani) art ----------
function mountainRock(x, y, s, t, glow = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(-38, -30); ctx.lineTo(-26, -24); ctx.lineTo(-12, -62); ctx.lineTo(-2, -50); ctx.lineTo(8, -78); ctx.lineTo(22, -46); ctx.lineTo(32, -52); ctx.lineTo(50, 0);
  for (let i = 0; i <= 10; i++) ctx.lineTo(50 - i * 10, 4 + (i % 2) * 7); ctx.closePath();
  const g = ctx.createLinearGradient(0, -78, 0, 8); g.addColorStop(0, '#8a7e96'); g.addColorStop(1, '#4a3e52'); ctx.fillStyle = g; ctx.fill();
  poly([[-12, -62], [-2, -50], [8, -78], [16, -60], [10, -56], [4, -62], [-4, -52], [-9, -56]], '#eef2fa');
  stroke([[-30, -10], [-20, -30]], 'rgba(30,20,40,0.4)', 1.2); stroke([[18, -12], [24, -36]], 'rgba(30,20,40,0.4)', 1.2);
  if (glow > 0) { const R = rng(55); for (let i = 0; i < 22; i++) { const px = -40 + R() * 80, py = -4 - R() * 40 * (1 - Math.abs(px) / 60); if (py < -55) continue; const a = (0.5 + 0.5 * Math.sin(t * 4 + i * 1.7)) * glow;
    const gg = ctx.createRadialGradient(px, py, 0, px, py, 6); gg.addColorStop(0, `rgba(190,255,170,${a})`); gg.addColorStop(1, 'rgba(190,255,170,0)'); ctx.fillStyle = gg; ctx.fillRect(px - 6, py - 6, 12, 12); circ(px, py, 1.1, `rgba(235,255,210,${0.6 + 0.4 * a})`); } }
  ctx.restore();
}
function nightSky(t, o = {}) {
  const g = ctx.createLinearGradient(0, -200, 0, 1200); g.addColorStop(0, '#05071a'); g.addColorStop(0.55, '#141842'); g.addColorStop(0.85, '#3a2a5e'); g.addColorStop(1, o.dawn ? '#e0805a' : '#5a3a6a');
  ctx.fillStyle = g; ctx.fillRect(-600, -600, W + 1200, 1900);
  const R = rng(o.seed || 21); for (let i = 0; i < 140; i++) { const x = -300 + R() * (W + 600), y = -300 + R() * 1300, a = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + R()) + i)); circ(x, y, 1 + R() * 2.2, `rgba(255,255,240,${a * (1 - y / 1500)})`); }
  if (o.moon !== false) { const mx = o.moonX ?? 820, my = o.moonY ?? 380; const mg = ctx.createRadialGradient(mx, my, 20, mx, my, 260); mg.addColorStop(0, 'rgba(230,235,255,0.5)'); mg.addColorStop(1, 'rgba(230,235,255,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - 260, my - 260, 520, 520); circ(mx, my, 70, '#f4f2e6'); circ(mx - 20, my - 12, 12, 'rgba(200,200,190,0.5)'); circ(mx + 18, my + 20, 9, 'rgba(200,200,190,0.5)'); }
}
function snowPeaks(y0, t) {
  const peaks = [[-200, 360], [120, 520], [420, 420], [700, 600], [980, 460], [1250, 380]];
  for (const [px, ph] of peaks) { poly([[px - 330, y0], [px, y0 - ph], [px + 330, y0]], '#3a3e66'); poly([[px - 95, y0 - ph * 0.71], [px, y0 - ph], [px + 95, y0 - ph * 0.71], [px + 40, y0 - ph * 0.76], [px, y0 - ph * 0.7], [px - 45, y0 - ph * 0.77]], '#e8ecf8'); }
}
