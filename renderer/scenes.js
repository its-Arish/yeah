// Each scene: draw(lt, T, d) in world space (camera applied), optional over(lt, T, d) in screen space.
const HZ = 1150; // horizon
// Per-shot data from the episode file (`> key: value` lines). D('key', fallback)
let CUR = null;
const D = (k, def) => (CUR && CUR.data && CUR.data[k] != null) ? CUR.data[k] : def;

function sunsetBase(T, o = {}) {
  sky(o); sun(o.sunX ?? 540, o.sunY ?? 1060, o.sunR ?? 90, T, { rays: o.rays, ring: o.ring, big: o.big });
  if (o.birds) birds(T, 120, 520);
  hills(HZ - 30, 70, shade(PAL.hillFar, -0.4 * (o.dusk || 0)), 1, 300);
  hills(HZ + 10, 40, shade(PAL.hillMid, -0.4 * (o.dusk || 0)), 2, 220);
}
function forestBase(T, o = {}) {
  sky(o); sun(o.sunX ?? 540, o.sunY ?? 1040, o.sunR ?? 85, T, { rays: o.rays, ring: o.ring, big: o.big });
  forest(HZ, T, o);
}
function avatar(cx, cy, r, who, T, o = {}) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = o.bg || '#3a2a4a'; ctx.fill(); ctx.clip();
  const h = r * 6.2; drawPerson(cx, cy + 6 + 0.87 * h, h, Object.assign({ who, rim: false }, o), T);
  ctx.restore();
}
function star(cx, cy, r, filled) {
  ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath();
  ctx.fillStyle = filled ? '#f2b53a' : 'rgba(0,0,0,0)'; ctx.fill(); ctx.strokeStyle = filled ? '#b8862b' : '#9a8f84'; ctx.lineWidth = 3; ctx.stroke();
}
function stamp(text, cx, cy, p, o = {}) {
  if (p <= 0) return;
  const s = lerp(2.4, 1, easeOut(p / 0.25));
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.rot ?? -0.18); ctx.scale(s, s); ctx.globalAlpha = clamp(p / 0.1);
  ctx.font = `700 ${o.size || 110}px Pop`; const w = ctx.measureText(text).width + 70, h = (o.size || 110) * 1.35;
  ctx.strokeStyle = o.color || '#e0322a'; ctx.lineWidth = 12; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 18); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 10); ctx.stroke();
  ctx.fillStyle = o.color || '#e0322a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 6);
  ctx.restore();
}

const SCENES = {
  title: {
    draw(lt, T) {
      sunsetBase(T, { rays: 0.45, birds: true });
      banners(HZ + 15, T);
      ground(HZ + 10);
      drawPerson(330, 1730, 960, { who: 'drona', pose: 'bless', expr: 'stern', look: 0.6 }, T);
      drawPerson(770, 1730, 960, { who: 'eka', kneel: true, pose: 'namaste', expr: 'neutral', look: -0.4, phase: 1 }, T);
      fireflies(T, 18, 4);
    },
    over(lt) {
      const a = clamp(lt / 0.4);
      txt(D('title', 'MAHABHARATA'), 540, 250, 86, { font: 'LoraB', weight: 700, fill: PAL.gold, stroke: '#3a1a10', sw: 8, align: 'center', alpha: a, shadow: 'rgba(0,0,0,0.6)' });
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = PAL.gold; ctx.fillRect(330, 305, 420, 4); ctx.restore();
    }
  },
  boyYes: {
    draw(lt, T) {
      forestBase(T, { sunY: 760, sunR: 140, rays: 0.6, ring: true, clear: true });
      drawPerson(540, 760 + 0.87 * 2600, 2600, { who: 'eka', pose: 'namaste', expr: lt > 0.75 ? 'smile' : 'neutral', eyes: lt > 0.75 && lt < 1.3 ? 'closed' : 'open' }, T);
      fireflies(T, 30, 8);
    }
  },
  drona: {
    draw(lt, T) {
      sunsetBase(T, { sunX: 820, sunY: 1070, sunR: 75, birds: true });
      hut(150, HZ + 40, 1.3); hut(930, HZ + 30, 1.05);
      banners(HZ + 20, T, { seed: 4 });
      ground(HZ + 20, { seed: 3 });
      drawPerson(200, 1360, 330, { who: 'prince', pose: 'bowdraw', rim: false }, T);
      drawPerson(880, 1350, 300, { who: 'arjuna', pose: 'bowdraw', rim: false }, T);
      drawPerson(540, 1860, 1150, { who: 'drona', pose: lt > 1.4 ? 'bless' : 'down', expr: 'neutral' }, T);
    }
  },
  sign: {
    draw(lt, T) {
      forestBase(T, { sunY: 1000, rays: 0.3, seed: 13 });
      const peek = easeOut((lt - 0.6) / 0.5);
      drawPerson(lerp(1080, 905, peek), 2050, 1150, { who: 'eka', expr: 'sad', look: -1 }, T);
      const wood = '#6a3f26', woodD = '#4a2a18';
      for (const x of [215, 865]) { rrect(x - 34, 240, 68, 1500, 10, wood); ctx.fillStyle = woodD; ctx.fillRect(x - 34, 240, 14, 1500); }
      rrect(130, 250, 820, 70, 12, wood); poly([[100, 260], [540, 140], [980, 260]], '#9a6234');
      // hanging board
      const sw = Math.sin(lt * 3.2) * 0.035 * Math.exp(-lt * 0.6);
      ctx.save(); ctx.translate(540, 320); ctx.rotate(sw);
      stroke([[-230, 0], [-230, 210]], '#2a1a12', 5); stroke([[230, 0], [230, 210]], '#2a1a12', 5);
      rrect(-330, 200, 660, 520, 22, '#c8945a'); ctx.strokeStyle = '#7a4a26'; ctx.lineWidth = 10; ctx.stroke();
      ctx.strokeStyle = 'rgba(122,74,38,0.35)'; ctx.lineWidth = 3; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-310, 250 + i * 70); ctx.bezierCurveTo(-100, 240 + i * 70, 100, 262 + i * 70, 310, 250 + i * 70); ctx.stroke(); }
      const small = D('small', "DRONACHARYA'S|ARCHERY ACADEMY").split('|'), big = D('big', 'PRINCES|ONLY!').split('|');
      small.forEach((s, i) => txt(s, 0, 262 + i * 48, 40, { fill: '#4a2412' }));
      big.forEach((s, i) => txt(s, 0, 420 + i * 120, big.length > 2 ? 100 : 128, { fill: '#2a120a' }));
      if (lt > 1.05) txt(D('scribble', 'no forest kids'), 40, 650, 58, { font: 'LoraI', weight: 700, fill: '#c22a20', rot: -0.06, scale: easeBack((lt - 1.05) / 0.25) });
      ctx.restore();
    }
  },
  chat: {
    draw(lt, T) { sunsetBase(T, {}); ground(HZ); ctx.fillStyle = 'rgba(8,4,12,0.55)'; ctx.fillRect(-100, -100, W + 200, H + 200); },
    over(lt, T) {
      rrect(60, 170, 960, 1560, 40, '#17111f');
      ctx.fillStyle = '#211830'; ctx.beginPath(); ctx.roundRect(60, 170, 960, 170, [40, 40, 0, 0]); ctx.fill();
      txt('←', 120, 245, 56, { fill: '#cfc4dc' });
      txt(D('channel', '#ashram-admissions'), 170, 232, 50, { align: 'left', fill: '#fff' });
      circ(178, 290, 9, '#3ccf6e'); txt('3 ONLINE', 198, 291, 30, { align: 'left', fill: '#9a90a8', weight: 500 });
      const NC = ['#7fd18b', '#f2a64e', '#7fb8f2', '#f27fb8'], whoIdx = {};
      const msgs = D('messages', [[0.3, 'eka', 'EKALAVYA', 'sir can i join ur archery class pls'], [1.0, 'drona', 'DRONACHARYA', 'which kingdom r u from'], [1.7, 'eka', 'EKALAVYA', 'the forest'], [2.3, 'drona', 'DRONACHARYA', 'no.']])
        .map(([t0, who, name, m]) => { if (!(who in whoIdx)) whoIdx[who] = Object.keys(whoIdx).length; return [t0, who, name, NC[whoIdx[who] % 4], m]; });
      const lastIdx = msgs.length - 1;
      let y = 420;
      msgs.forEach(([t0, who, name, nc, m], i) => {
        if (lt < t0) return;
        const p = easeBack((lt - t0) / 0.22), a = clamp((lt - t0) / 0.12);
        ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - p) * 40);
        avatar(150, y + 40, 52, who, T, { bg: ['#2c4a34', '#5a3a20', '#2a3a6a', '#5a2a4a'][whoIdx[who] % 4], expr: whoIdx[who] === 1 ? 'stern' : 'neutral' });
        txt(name, 230, y + 8, 38, { align: 'left', fill: nc });
        ctx.font = '700 38px Pop'; const nw = ctx.measureText(name).width;
        txt(`12:0${i + 1} AM`, 250 + nw, y + 10, 26, { align: 'left', fill: '#7a7088', weight: 500 });
        txt(m, 230, y + 66, i === lastIdx && m.length < 6 ? 64 : 42, { align: 'left', fill: '#eee8f4', weight: 500 });
        ctx.restore();
        y += 190;
      });
      const leftAt = D('leftAt', 2.75); if (D('left', 'DRONACHARYA') && lt > leftAt) { const a = clamp((lt - leftAt) / 0.15); ctx.save(); ctx.globalAlpha = a; stroke([[120, y + 10], [960, y + 10]], '#e0322a', 3); txt(D('left', 'DRONACHARYA') + ' has left the chat', 540, y + 60, 36, { fill: '#e85a50', weight: 500 }); ctx.restore(); }
      const typing = msgs.some(([t0, w], i) => i > 0 && w !== msgs[i - 1][1] && lt > t0 - 0.45 && lt < t0);
      if (typing) { for (let i = 0; i < 3; i++) circ(120 + i * 26, 1560 + Math.sin(T * 12 + i) * 6, 8, '#9a90a8'); txt(D('typer', 'Dronacharya') + ' is typing...', 210, 1562, 32, { align: 'left', fill: '#9a90a8', weight: 500 }); }
      rrect(100, 1610, 880, 90, 45, '#2a2236'); txt('Message ' + D('channel', '#ashram-admissions'), 150, 1655, 32, { align: 'left', fill: '#6a6078', weight: 500 });
      if (D('stamp', 'REJECTED')) stamp(D('stamp', 'REJECTED'), 540, 980, lt - D('stampAt', 2.9), { size: 130 });
    }
  },
  clay: {
    draw(lt, T) {
      forestBase(T, { sunY: 1000, rays: 0.25, clear: true, seed: 17 });
      drawPerson(340, 1720, 880, { who: 'eka', kneel: true, pose: 'offer', expr: 'neutral', look: 1 }, T);
      const rev = easeOut((lt - 0.3) / 2.4);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 1720 - 1300 * rev, W, 1300 * rev + 40); ctx.clip();
      drawPerson(760, 1720, 980, { who: 'drona', clay: true, pose: 'bless', expr: 'neutral' }, T);
      ctx.restore();
      const R = rng(42);
      for (let i = 0; i < 26; i++) { const ph = (lt * 0.8 + R()) % 1; fillE(640 + R() * 260, 1710 - ph * 120, 6 * (1 - ph), 6 * (1 - ph), `rgba(200,140,90,${0.6 * (1 - ph)})`); }
      fireflies(T, 20, 9);
    }
  },
  practice: {
    draw(lt, T) {
      forestBase(T, { sunX: 300, sunY: 1000, rays: 0.3, clear: true, seed: 19 });
      drawPerson(910, 1500, 600, { who: 'drona', clay: true, pose: 'bless' }, T);
      const rel = lt > 1.3;
      drawPerson(660, 1740, 1000, { who: 'eka', pose: 'bowdraw', expr: 'stern', drawn: !rel, look: -1 }, T);
      if (rel) { arrowFly(140, 925, -500, 905, (lt - 1.3) / 0.25); ctx.globalAlpha = clamp(1 - (lt - 1.3) / 0.5); for (let i = 0; i < 6; i++) stroke([[100 - i * 30, 880 + i * 18], [-200, 880 + i * 18]], 'rgba(255,240,200,0.5)', 3); ctx.globalAlpha = 1; }
      fireflies(T, 16, 2);
    }
  },
  levelup: {
    draw(lt, T) { forestBase(T, { clear: true }); ctx.fillStyle = 'rgba(10,6,20,0.72)'; ctx.fillRect(-100, -100, W + 200, H + 200); },
    over(lt, T) {
      // hex grid
      ctx.strokeStyle = 'rgba(242,193,78,0.12)'; ctx.lineWidth = 2;
      for (let r = 0; r < 18; r++) for (let c = 0; c < 9; c++) { const x = c * 135 + (r % 2) * 67, y = r * 117; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * 76, y + Math.sin(a) * 76); } ctx.closePath(); ctx.stroke(); }
      txt(D('header', 'SKILL UNLOCKED'), 540, 230, 56, { fill: PAL.gold, stroke: '#1a0e10', sw: 8 });
      rrect(90, 300, 900, 300, 30, 'rgba(30,20,40,0.92)'); ctx.strokeStyle = PAL.gold; ctx.lineWidth = 5; ctx.stroke();
      avatar(220, 450, 95, D('who', 'eka'), T, { bg: '#2c4a34', expr: 'smile' });
      const p = ease(lt / 2.1), lv = Math.round(1 + 98 * p);
      txt(D('skill', 'ARCHERY'), 350, 380, 50, { align: 'left', fill: '#fff' });
      txt('LV ' + lv, 940, 380, 70, { align: 'right', fill: PAL.gold, stroke: '#1a0e10', sw: 8, scale: 1 + 0.08 * Math.sin(lt * 30) * (1 - p) });
      rrect(350, 450, 590, 46, 23, '#3a2c48'); rrect(350, 450, Math.max(46, 590 * ((lt * 2.3) % 1 * (1 - p) + p)), 46, 23, '#f2c14e');
      txt(D('sub', 'SELF-TAUGHT · NO TEACHER'), 350, 545, 30, { align: 'left', fill: '#b8aec8', weight: 500 });
      // target
      const tx = 540, ty = 1010;
      const rings = ['#f4efe6', '#1c1c22', '#3a7bd5', '#e0322a', '#f2c14e'];
      for (let i = 0; i < 5; i++) circ(tx, ty, 200 - i * 40, rings[i]);
      const hits = [[0.6, 10, -15], [1.1, -25, 20], [1.6, 22, 18]];
      hits.forEach(([h, dx, dy]) => {
        if (lt < h) return;
        const k = easeOut((lt - h) / 0.12);
        stroke([[tx + dx, ty + dy], [tx + dx + 70 * k, ty + dy - 90 * k]], '#e6d6b0', 9);
        poly([[tx + dx + 70 * k, ty + dy - 90 * k], [tx + dx + 100 * k, ty + dy - 100 * k], [tx + dx + 80 * k, ty + dy - 120 * k]], '#c8452f');
        const f = (lt - h) / 0.8; if (f < 1) txt('+999 XP', tx + dx + 150, ty + dy - 120 - f * 120, 48, { fill: '#7fe08b', stroke: '#0a1a0e', sw: 7, alpha: 1 - f });
      });
      stamp(D('stamp', 'SELF-TAUGHT'), 540, 1520, lt - 2.2, { size: 92, color: PAL.gold, rot: -0.1 });
    }
  },
  dog: {
    draw(lt, T) {
      forestBase(T, { sunX: 760, sunY: 1000, rays: 0.25, seed: 23 });
      const fire = 1.9; let n = 0;
      for (let i = 0; i < 7; i++) if (lt > fire + i * 0.12 + 0.17) n++;
      dog(760, 1640, 700, T, { bark: lt < fire, arrows: n, dazed: n >= 7 });
      for (let i = 0; i < 7; i++) { const st = fire + i * 0.12; const tx = 760 + (-50 + i * 3.6) * 7, ty = 1640 - 44 * 7; arrowFly(-250, 1150 + i * 22, tx, ty, (lt - st) / 0.17, 90); }
      if (lt < fire) [[0.3, 330, 1060, -0.15], [0.9, 260, 900, 0.1], [1.4, 380, 760, -0.08]].forEach(([b, x, y, r]) => {
        if (lt < b) return; const s = easeBack((lt - b) / 0.18);
        ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(s, s);
        ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k * TAU / 16, rr = k % 2 ? 105 : 140; ctx.lineTo(Math.cos(a) * rr * 1.3, Math.sin(a) * rr * 0.8); } ctx.closePath(); ctx.fillStyle = '#fff2c8'; ctx.fill(); ctx.strokeStyle = '#1a0e10'; ctx.lineWidth = 7; ctx.stroke();
        txt('WOOF!', 0, 4, 74, { fill: '#e0322a', stroke: '#1a0e10', sw: 6 }); ctx.restore();
      });
    }
  },
  noScratch: {
    draw(lt, T) { forestBase(T, { sunX: 300, sunY: 900, rays: 0.4, clear: true, seed: 29 }); dog(1000, 1720, 1400, T, { arrows: 7, dazed: true }); },
    over(lt, T) {
      const p = easeBack((lt - 0.25) / 0.3);
      if (lt > 0.25) {
        ctx.save(); ctx.translate(540, 360); ctx.scale(p, p);
        rrect(-330, -80, 660, 160, 80, '#2fbf62'); ctx.strokeStyle = '#0d3a1e'; ctx.lineWidth = 8; ctx.stroke();
        circ(-250, 0, 52, '#fff'); stroke([[-275, 0], [-255, 22], [-222, -22]], '#2fbf62', 13);
        txt(D('badge', '0 SCRATCHES'), 40, 6, 66, { fill: '#fff' });
        ctx.restore();
      }
      const R = rng(7);
      for (let i = 0; i < 10; i++) { const x = 300 + R() * 520, y = 700 + R() * 500, ph = (T * 1.5 + R()) % 1, s = Math.sin(ph * Math.PI) * 26; ctx.save(); ctx.translate(x, y); ctx.rotate(ph); poly([[0, -s], [s * 0.25, -s * 0.25], [s, 0], [s * 0.25, s * 0.25], [0, s], [-s * 0.25, s * 0.25], [-s, 0], [-s * 0.25, -s * 0.25]], '#fff6d0'); ctx.restore(); }
    }
  },
  arjuna: {
    draw(lt, T) {
      forestBase(T, { sunY: 700, sunR: 120, rays: 0.5, ring: true, seed: 31 });
      drawPerson(540, 2700, 2000, { who: 'arjuna', pose: 'shock', expr: lt > 0.3 ? 'shock' : 'neutral' }, T);
    },
    over(lt) {
      if (lt > 0.3) { const a = 0.35 * clamp((lt - 0.3) / 0.3); const g = ctx.createRadialGradient(540, 800, 300, 540, 900, 1100); g.addColorStop(0, 'rgba(120,0,20,0)'); g.addColorStop(1, `rgba(120,0,20,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    }
  },
  promise: {
    draw(lt, T) {
      sunsetBase(T, { sunY: 950, sunR: 120, rays: 0.6, big: true }); ground(HZ, { seed: 33 });
      drawPerson(370, 1730, 1000, { who: 'drona', pose: 'bless', expr: 'smile', look: 0.7 }, T);
      drawPerson(730, 1730, 860, { who: 'arjuna', pose: 'namaste', expr: 'smile', look: -0.6, phase: 2 }, T);
    },
    over(lt, T) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#e9b98a'; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(540, 900, 100, 540, 900, 1100); g.addColorStop(0, 'rgba(255,220,170,0.35)'); g.addColorStop(1, 'rgba(60,20,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
      const g2 = ctx.createRadialGradient(540, 960, 500, 540, 960, 1150); g2.addColorStop(0, 'rgba(20,8,16,0)'); g2.addColorStop(1, 'rgba(20,8,16,0.85)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      txt(D('label', 'FLASHBACK'), 540, 240, 34, { fill: 'rgba(255,230,190,0.75)', weight: 500 });
    }
  },
  problem: {
    draw(lt, T) { burst(540, 960, T, '#d9533a', '#f08a4a', 22); },
    over(lt, T) {
      const s = easeBack(lt / 0.22) * (1 + 0.03 * Math.sin(lt * 40) * Math.exp(-lt * 3));
      txt(D('word', 'PROBLEM.'), 540, 900, D('word', 'PROBLEM.').length > 9 ? 140 : 190, { fill: PAL.gold, stroke: PAL.ink, sw: 22, scale: s, rot: -0.05, shadow: 'rgba(0,0,0,0.5)', shadowBlur: 30 });
      if (D('who', 'arjuna')) avatar(540, 1260, 130, D('who', 'arjuna'), T, { bg: '#2a3a6a', expr: 'shock' });
    }
  },
  meet: {
    draw(lt, T) {
      forestBase(T, { sunY: 1010, rays: 0.35, clear: true, seed: 37 });
      drawPerson(540, 1470, 560, { who: 'drona', clay: true, pose: 'bless' }, T);
      drawPerson(250, 1770, 960, { who: 'drona', pose: lt > 1.8 ? 'point' : 'down', expr: 'stern', look: 0.8 }, T);
      drawPerson(820, 1770, 880, { who: 'eka', pose: 'namaste', expr: lt > 1.8 ? 'neutral' : 'smile', look: -0.8, phase: 1.5 }, T);
      fireflies(T, 18, 12);
    }
  },
  youAre: {
    draw(lt, T) {
      forestBase(T, { sunX: 760, sunY: 820, sunR: 110, rays: 0.4, clear: true, seed: 41 });
      ctx.save(); ctx.globalAlpha = 0.75; drawPerson(190, 1600, 800, { who: 'drona', clay: true, pose: 'bless' }, T); ctx.restore();
      drawPerson(560, 2520, 1900, { who: 'eka', pose: 'namaste', expr: 'smile', look: -0.5 }, T);
      fireflies(T, 22, 14);
    }
  },
  fee: {
    draw(lt, T) {
      forestBase(T, { dusk: 0.35 + 0.25 * clamp(lt / 3), sunY: 760, sunR: 120, rays: 0.3, seed: 43 });
      drawPerson(540, 2650, 2100, { who: 'drona', pose: 'down', expr: 'stern' }, T);
    },
    over(lt) {
      const a = 0.45 * clamp((lt - 1.6) / 0.4);
      const g = ctx.createRadialGradient(540, 820, 250, 540, 960, 1150); g.addColorStop(0, 'rgba(150,10,20,0)'); g.addColorStop(1, `rgba(150,10,20,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  },
  hand: {
    draw(lt, T) {
      sky({ dusk: 0.5 }); sun(540, 980, 300, T, { big: true });
      hills(HZ + 100, 50, '#2a1428', 5, 260); ctx.fillStyle = '#140a14'; ctx.fillRect(-300, HZ + 120, W + 600, 1500);
      ctx.beginPath(); ctx.moveTo(640, -150); ctx.quadraticCurveTo(380, 960, 640, 2100); ctx.strokeStyle = '#1a0c10'; ctx.lineWidth = 44; ctx.lineCap = 'round'; ctx.stroke();
      stroke([[640, -150], [640, 2100]], 'rgba(255,230,190,0.6)', 3);
      const sk = '#3a2118', rim = 'rgba(255,200,120,0.9)';
      ctx.save(); ctx.shadowColor = rim; ctx.shadowBlur = 30;
      rrect(380, 860, 170, 230, 70, sk);
      for (let i = 0; i < 4; i++) rrect(470, 880 + i * 52, 120, 50, 24, sk);
      ctx.restore();
      ctx.strokeStyle = '#24130e'; ctx.lineWidth = 4; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(480, 880 + i * 52); ctx.lineTo(585, 880 + i * 52); ctx.stroke(); }
      const pulse = 0.6 + 0.4 * Math.sin(lt * 5);
      ctx.save(); ctx.translate(470, 850); ctx.rotate(-0.35);
      ctx.shadowColor = `rgba(255,205,90,${pulse})`; ctx.shadowBlur = 60; rrect(-30, -40, 150, 52, 26, sk);
      ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(255,215,120,${pulse})`; ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
    },
    over(lt) { ctx.fillStyle = `rgba(0,0,0,${0.5 * clamp((lt - 1.8) / 1)})`; ctx.fillRect(0, 0, W, H); }
  },
  offer: {
    draw(lt, T) {
      forestBase(T, { dusk: 0.6, sunY: 1100, sunR: 70, clear: true, seed: 47 });
      drawPerson(300, 1460, 560, { who: 'drona', clay: true, pose: 'bless' }, T);
      drawPerson(740, 1750, 1000, { who: 'drona', pose: 'down', expr: 'stern', eyes: 'closed' }, T);
      drawPerson(380, 1770, 900, { who: 'eka', kneel: true, pose: 'offer', leaf: true, expr: 'sad', look: 1 }, T);
      fireflies(T, 26, 21);
    }
  },
  bowdown: {
    draw(lt, T) {
      forestBase(T, { dusk: 0.3, sunY: 880, sunR: 150, rays: 0.8, ring: true, clear: true, seed: 53 });
      drawPerson(540, 1940, 1600, { who: 'eka', kneel: true, pose: 'namaste', expr: 'sad', eyes: 'closed', tear: true }, T);
      fireflies(T, 30, 23);
    }
  },
  legend: {
    draw(lt, T) {
      sky({}); sun(860, 1080, 80, T, { rays: 0.4 });
      hills(HZ - 10, 60, PAL.hillFar, 61, 320);
      // Arjuna on a far hill
      ctx.beginPath(); ctx.moveTo(-200, 1300); ctx.quadraticCurveTo(250, 960, 650, 1300); ctx.fillStyle = PAL.hillMid; ctx.fill();
      drawPerson(250, 1090, 300, { who: 'arjuna', pose: 'holdbow', expr: 'smile' }, T);
      const g = ctx.createRadialGradient(250, 960, 0, 250, 960, 220); g.addColorStop(0, 'rgba(255,220,140,0.45)'); g.addColorStop(1, 'rgba(255,220,140,0)'); ctx.fillStyle = g; ctx.fillRect(0, 700, 500, 500);
      ground(1260, { seed: 59, dusk: 0.2 });
      const wx = lerp(600, 720, ease(lt / 4.4));
      drawPerson(wx, 1900, 1050, { who: 'eka', pose: 'shoulderbow', expr: 'neutral', eyes: lt > 3.2 ? 'closed' : 'open', look: -1 }, T);
      tree(1180, 2000, 3.4, '#1c0e1c', '#241226', 71); tree(1100, 2080, 2.2, '#160a16', '#1c0e1c', 72);
      fireflies(T, 24, 31);
    },
    over(lt) { ctx.fillStyle = `rgba(0,0,0,${0.35 * clamp((lt - 3.4) / 1)})`; ctx.fillRect(0, 0, W, H); }
  },
  review: {
    draw(lt, T) { burst(540, 960, T * 0.3, '#4a2276', '#5a2c8a', 24); },
    over(lt, T) {
      ctx.save(); ctx.translate(540, 980); ctx.rotate(-0.025);
      rrect(-420, -640, 840, 1280, 16, '#f7f2e6');
      ctx.strokeStyle = 'rgba(80,120,200,0.25)'; ctx.lineWidth = 2; for (let y = -500; y < 620; y += 62) { ctx.beginPath(); ctx.moveTo(-420, y); ctx.lineTo(420, y); ctx.stroke(); }
      stroke([[-330, -640], [-330, 640]], 'rgba(220,60,60,0.45)', 3);
      for (let i = 0; i < 8; i++) { circ(-360 + i * 104, -640, 16, '#4a2276'); stroke([[-360 + i * 104, -660], [-360 + i * 104, -620]], '#bbb', 6); }
      txt(D('header', 'RATE MY GURU'), 30, -540, 76, { fill: '#d62f2a' });
      stroke([[-230, -480], [290, -480]], '#d62f2a', 5);
      avatar(-230, -370, 62, D('who', 'drona'), T, { bg: '#e8953a', expr: 'stern' });
      txt(D('name', 'DRONACHARYA'), -140, -390, 50, { align: 'left', fill: '#2a1a2a' });
      txt(D('sub', 'archery teacher · 4.0 avg'), -140, -338, 30, { align: 'left', fill: '#8a7f78', weight: 500 });
      const rows = D('rows', [[0.4, 1, 'asked for my thumb as a fee', 'Ekalavya, self-taught'], [1.1, 5, '10/10 would be favourite again', 'Arjuna'], [1.8, 3, 'mmmf', 'the dog']]).map(([a, n, q, w]) => [a, n, '"' + q + '"', '— ' + w]);
      rows.forEach(([t0, n, q, who], i) => {
        if (lt < t0) return; const s = easeBack((lt - t0) / 0.2); const y = -200 + i * 250;
        ctx.save(); ctx.translate(0, y); ctx.scale(s, s);
        for (let k = 0; k < 5; k++) star(-270 + k * 62, -40, 26, k < n);
        txt(q, -300, 32, 44, { align: 'left', font: 'LoraI', weight: 700, fill: '#2a1a2a' });
        txt(who, -300, 90, 32, { align: 'left', fill: '#8a7f78', weight: 500 });
        ctx.restore();
      });
      if (lt > 2.4) { const k = clamp((lt - 2.4) / 0.35); ctx.beginPath(); ctx.ellipse(10, -180, 400, 140, -0.03, -0.4, -0.4 + TAU * 1.05 * k); ctx.strokeStyle = '#d62f2a'; ctx.lineWidth = 8; ctx.stroke(); }
      ctx.restore();
    }
  }
};

// ---------- generic, data-driven scene (use this for new stories) ----------
// > bg: sunset | forest | ashram | battlefield      > dusk: 0..1      > sun: {"x":540,"y":1050,"r":90,"rays":0.4}
// > chars: [{"who":"karna","x":540,"y":1750,"h":1000,"pose":"namaste","expr":"neutral","switch":1.2,"pose2":"point","expr2":"stern"}]
// > badge: TEXT (green pill)   > tint: red (vignette)   > fireflies: 20
SCENES.stage = {
  draw(lt, T) {
    const bg = D('bg', 'sunset'), dusk = D('dusk', 0), s = D('sun', {});
    const so = { dusk, sunX: s.x ?? 540, sunY: s.y ?? 1050, sunR: s.r ?? 90, rays: s.rays ?? 0.35, ring: s.ring, big: s.big, clear: true, seed: D('seed', 7) };
    if (bg === 'forest') forestBase(T, so);
    else {
      sunsetBase(T, Object.assign(so, { birds: bg !== 'battlefield' }));
      if (bg === 'ashram') { hut(150, HZ + 40, 1.3); hut(930, HZ + 30, 1.05); }
      if (bg === 'battlefield' || bg === 'ashram') banners(HZ + 18, T, { seed: D('seed', 7) });
      ground(HZ + 10, { seed: D('seed', 7), dusk });
    }
    for (const c of D('chars', [])) {
      const late = c.switch != null && lt > c.switch;
      const p = Object.assign({}, c, { pose: late && c.pose2 ? c.pose2 : c.pose, expr: late && c.expr2 ? c.expr2 : c.expr });
      if (c.enter) { const k = easeOut(lt / c.enter); p.alpha = k; }
      drawPerson(c.x ?? 540, c.y ?? 1750, c.h ?? 1000, p, T);
    }
    if (D('fireflies', 18)) fireflies(T, D('fireflies', 18), D('seed', 7));
  },
  over(lt, T) {
    if (D('tint', null) === 'red') { const g = ctx.createRadialGradient(540, 820, 250, 540, 960, 1150); g.addColorStop(0, 'rgba(150,10,20,0)'); g.addColorStop(1, `rgba(150,10,20,${0.45 * clamp(lt / 0.6)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (D('flashback', false)) SCENES.promise.over(lt, T);
    if (D('title', null)) SCENES.title.over(lt, T);
    if (D('badge', null)) SCENES.noScratch.over(lt, T);
  }
};
