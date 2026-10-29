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
  shock: { L: [[-14, -71], [-22, -66], [-18, -79]], R: [[14, -71], [22, -66], [18, -79]] }
};

function drawPerson(x, y, h, p, t = 0) {
  p = Object.assign({}, CHAR[p.who] || {}, p);
  const col = p.clay ? clayCol : (c => c);
  const skin = col(p.skin), skinD = col(shade(p.skin, -0.28)), skinL = col(shade(p.skin, 0.15));
  const gold = col(PAL.gold), goldD = col(PAL.goldD);
  const pose = POSES[p.pose || 'down'];
  const ky = p.kneel ? 22 : 0;
  const br = Math.sin(t * 2.1 + (p.phase || 0)) * 0.45;
  ctx.save(); ctx.translate(x, y); ctx.scale(h / 100, h / 100);
  if (p.alpha != null) ctx.globalAlpha *= p.alpha;
  fillE(0, -0.5, 22, 3.2, 'rgba(15,5,15,0.35)');
  const rim = p.rim !== false && !p.clay;
  const setRim = on => { if (on && rim) { ctx.shadowColor = 'rgba(255,205,130,0.75)'; ctx.shadowBlur = 18 * h / 300; } else { ctx.shadowBlur = 0; } };

  // legs / dhoti
  const dh = col(p.dhoti), dhD = col(shade(p.dhoti, -0.25)), bd = col(p.border);
  setRim(true);
  if (!p.kneel) {
    fillE(-5.5, -2.5, 4.6, 2.4, skin); fillE(5.5, -2.5, 4.6, 2.4, skin);
    poly([[-12, -49], [12, -49], [15.8, -5], [-15.8, -5]], dh);
  } else {
    ctx.beginPath(); ctx.moveTo(-12, -27); ctx.lineTo(12, -27); ctx.quadraticCurveTo(25, -18, 24, -1); ctx.lineTo(-24, -1); ctx.quadraticCurveTo(-25, -18, -12, -27); ctx.fillStyle = dh; ctx.fill();
  }
  setRim(false);
  ctx.save(); ctx.globalAlpha *= 0.6; ctx.strokeStyle = dhD; ctx.lineWidth = 0.6;
  if (!p.kneel) { for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 2.6, -46); ctx.lineTo(i * 3.9, -6); ctx.stroke(); } }
  else { for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 2.6, -25); ctx.lineTo(i * 6, -2); ctx.stroke(); } }
  ctx.restore();
  if (!p.kneel) { poly([[-15.4, -9.5], [15.4, -9.5], [15.8, -5], [-15.8, -5]], bd); }
  else { ctx.fillStyle = bd; ctx.fillRect(-24, -4, 48, 3); }

  ctx.save(); ctx.translate(0, ky + br * 0.25);
  // back hair, quiver
  if (p.quiver) { ctx.save(); ctx.translate(10, -74); ctx.rotate(0.45); rrect(-3.5, -16, 7, 30, 2, col('#6b3a22')); ctx.fillStyle = col('#b8863a'); ctx.fillRect(-3.5, -16, 7, 2); for (let i = 0; i < 4; i++) { stroke([[-2 + i * 1.4, -16], [-2 + i * 1.4, -22]], col('#ddd'), 0.8); poly([[-3 + i * 1.4, -22], [-1 + i * 1.4, -22], [-2 + i * 1.4, -26]], col(i % 2 ? '#c8452f' : '#eee')); } ctx.restore(); }
  if (p.hair === 'eka') { ctx.fillStyle = col('#1d1216'); E(0, -84, 11.2, 14.5); ctx.fill(); }
  if (p.hair === 'arjuna') { rrect(-11, -96, 22, 34, 6, col('#1a1014')); }
  if (p.hair === 'drona') { ctx.fillStyle = col('#e9e2d6'); E(0, -86, 10, 11.5); ctx.fill(); }

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
  if (p.top === 'shawl') { poly([[-15.2, -73], [-7, -75.5], [13, -52], [12, -47.5], [4, -47.5]], col('#e8953a')); stroke([[-7, -75.5], [13, -52]], gold, 0.8); stroke([[-12, -72], [11, -48]], col('#f4efe6'), 0.6); }
  if (p.quiver && p.top !== 'shawl') stroke([[-13, -50], [14, -74]], col('#5a3020'), 1.6);
  ctx.fillStyle = gold; ctx.fillRect(-12.6, -51, 25.2, 3.2); circ(0, -49.4, 1.5, col('#c8452f'));
  // necklace
  if (p.neck === 'mala') { for (let a = 0.15; a < Math.PI - 0.1; a += 0.17) circ(Math.cos(a) * 7.5, -74 + Math.sin(a) * 10, 0.85, col('#5a2c18')); }
  if (p.neck === 'gold') { ctx.strokeStyle = gold; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, -76, 6.5, 5, 0, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -76, 8.5, 8.5, 0, 0.2, Math.PI - 0.2); ctx.stroke(); circ(0, -67.6, 1.3, col('#c8452f')); }
  if (p.neck === 'beads') { for (let a = 0.2; a < Math.PI - 0.15; a += 0.22) circ(Math.cos(a) * 6.8, -76 + Math.sin(a) * 6.5, 0.75, col(Math.round(a * 10) % 2 ? '#e9e0cf' : '#b23a2a')); poly([[-0.9, -69.5], [0.9, -69.5], [0, -66.5]], col('#efe6d4')); }

  // head
  setRim(true);
  fillE(0, -87, 8.7, 10.7, skin);
  setRim(false);
  fillE(-8.6, -87, 1.6, 2.6, skinD); fillE(8.6, -87, 1.6, 2.6, skinD);
  fillE(0, -82, 6.5, 3.5, col(shade(p.skin, -0.06)));
  // earrings
  circ(-8.9, -83.4, 1.7, gold); circ(8.9, -83.4, 1.7, gold); circ(-8.9, -83.4, 0.7, col('#c8452f')); circ(8.9, -83.4, 0.7, col('#c8452f'));
  // face
  const ex = p.expr || 'neutral';
  const blink = p.eyes === 'closed' || (p.clay) || ((t * 1 + (p.phase || 0)) % 3.7 < 0.12);
  const browCol = p.hair === 'drona' ? col('#d8d0c4') : col('#1d1216');
  for (const s of [-1, 1]) {
    const cx = s * 3.6, cy = -87.6;
    if (blink) { ctx.beginPath(); ctx.moveTo(cx - 2.4, cy); ctx.quadraticCurveTo(cx, cy + 1.2, cx + 2.4, cy); ctx.strokeStyle = col('#2a1410'); ctx.lineWidth = 0.7; ctx.stroke(); }
    else {
      fillE(cx, cy, 2.5, ex === 'shock' ? 2.1 : 1.55, col('#f8f1e6'));
      const lx = (p.look || 0) * 0.8;
      circ(cx + lx, cy + 0.1, ex === 'shock' ? 1.0 : 1.2, col('#2a160e')); circ(cx + lx + 0.4, cy - 0.4, 0.35, '#fff');
      ctx.beginPath(); ctx.ellipse(cx, cy, 2.6, ex === 'shock' ? 2.2 : 1.6, 0, Math.PI + 0.2, TAU - 0.2); ctx.strokeStyle = col('#2a1410'); ctx.lineWidth = 0.7; ctx.stroke();
    }
    let bi = -91.2, bo = -91.4;
    if (ex === 'stern') { bi = -89.9; bo = -91.9; } if (ex === 'sad') { bi = -92.2; bo = -90.6; } if (ex === 'shock') { bi = -93.2; bo = -92.8; }
    stroke([[s * 1.4, bi], [s * 5.8, bo]], browCol, 1.05);
  }
  ctx.beginPath(); ctx.moveTo(-0.3, -87); ctx.quadraticCurveTo(1.4, -83, -0.4, -82.6); ctx.strokeStyle = skinD; ctx.lineWidth = 0.6; ctx.stroke();
  const lip = col('#7a2f26');
  if (ex === 'shock') fillE(0, -79.4, 1.4, 1.9, col('#3a1410'));
  else { const cy = ex === 'smile' ? -78.4 : ex === 'sad' || ex === 'stern' ? -80.4 : -79.5; const ey = ex === 'sad' ? -79.2 : -79.8; ctx.beginPath(); ctx.moveTo(-2.2, ey); ctx.quadraticCurveTo(0, cy, 2.2, ey); ctx.strokeStyle = lip; ctx.lineWidth = 0.9; ctx.stroke(); }
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
  if (p.hair === 'arjuna') {
    ctx.fillStyle = col('#1a1014'); ctx.beginPath(); ctx.ellipse(0, -92, 9, 5.5, 0, Math.PI, TAU); ctx.fill();
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
  if (pose.hands === 'offer') {
    fillE(-4, -53, 3, 2.2, skin); fillE(4, -53, 3, 2.2, skin);
    if (p.leaf) { fillE(0, -55, 8.5, 2.6, col('#3f8a4a')); stroke([[-8, -55], [8, -55]], col('#2a5a30'), 0.4); const gg = ctx.createRadialGradient(0, -57, 0, 0, -57, 9); gg.addColorStop(0, 'rgba(255,230,160,0.95)'); gg.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = gg; ctx.fillRect(-10, -67, 20, 20); }
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
