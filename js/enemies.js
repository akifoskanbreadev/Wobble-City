/*
 * Enemies. They are generated from a level's terrain (so level data stays untouched) and their
 * position is a pure function of the level clock, which keeps every player in a multiplayer
 * room in sync without sending enemy state.
 *   blob   walks a patrol on flat ground          - stomp it from above, or get bonked
 *   bat    flies a lazy figure around a point     - stomp it too
 *   urchin spiky walker (Hard and up)              - can NOT be stomped, just avoid it
 */
(function (root) {
  'use strict';
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const DENSITY = { easy: 0.45, normal: 0.7, hard: 1, insane: 1.15, noodle: 1.15 };

  function groundAt(level, x) {
    let best = null;
    for (const t of level.terrain || []) {
      for (let i = 0; i + 1 < t.pts.length; i++) {
        const [x1, y1] = t.pts[i], [x2, y2] = t.pts[i + 1];
        if (x >= x1 && x <= x2 && x2 > x1) { const y = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1); if (best === null || y < best) best = y; }
      }
    }
    return best;
  }

  function generate(level, idx, diffKey) {
    const list = [];
    if (idx < 1) return list;                              // the very first level stays peaceful
    const R = rng(1000 + idx * 77), theme = level.theme || 'meadow';
    const dens = DENSITY[diffKey] || 0.7;
    const stretches = [];
    for (const t of level.terrain || []) {
      let s = null;
      for (let i = 0; i + 1 < t.pts.length; i++) {
        const [x1, y1] = t.pts[i], [x2, y2] = t.pts[i + 1];
        if (Math.abs(y2 - y1) < 5) { if (!s) s = { x0: x1, x1: x2, y: y1 }; else s.x1 = x2; }
        else { if (s) stretches.push(s); s = null; }
      }
      if (s) stretches.push(s);
    }
    const nearAny = (x, arr, d) => arr.some((a) => Math.abs(a[0] - x) < d);
    const inWater = (x) => (level.water || []).some((w) => x > w[0] - 40 && x < w[0] + w[2] + 40);
    const inHaz = (x) => (level.hazards || []).some((h) => x > h[0] - 60 && x < h[0] + h[2] + 60);
    let k = 0;
    for (const s of stretches) {
      const len = s.x1 - s.x0;
      if (len < 170 || s.x0 < 400 || (level.boss && s.x0 >= level.boss.x0 - 400)) continue;
      const mid = (s.x0 + s.x1) / 2;
      if (nearAny(mid, level.checkpoints || [], 150) || inWater(mid) || inHaz(mid) || (level.egg && Math.abs(level.egg[0] - mid) < 260)) continue;
      if (R() > dens * 0.85) continue;
      const half = Math.max(30, Math.min(110, len / 2 - 40));
      const spiky = (diffKey === 'insane' || diffKey === 'noodle' || diffKey === 'hard') && (k++ % 3 === 2);
      list.push({ kind: spiky ? 'urchin' : 'blob', cx: mid, y: s.y, amp: half, sp: 38 + R() * 22, ph: R() * 6, hue: Math.floor(R() * 360), theme });
    }
    // a few bats floating over the course
    const xs = level.egg ? level.egg[0] : 3000;
    for (let x = 1100 + R() * 400; x < xs - 400; x += 900 + R() * 700) {
      if (R() > dens) continue;
      const g = groundAt(level, x);
      if (g === null || inWater(x)) continue;
      list.push({ kind: 'bat', cx: x, y: g - 120 - R() * 50, amp: 110, sp: 1.1 + R() * 0.6, ph: R() * 6, hue: 0, theme });
    }
    for (const e of list) { e.id = list.indexOf(e); }
    return list;
  }

  const tri = (u) => { u = ((u % 2) + 2) % 2; return u < 1 ? u * 2 - 1 : 3 - u * 2; };   // triangle wave -1..1

  // state at time t. Squashed enemies come back after RESPAWN seconds (squash time comes from the game).
  function posAt(e, t) {
    if (e.kind === 'bat') return { x: e.cx + Math.sin(t * e.sp + e.ph) * e.amp, y: e.y + Math.sin(t * e.sp * 2 + e.ph) * 24, dir: Math.cos(t * e.sp + e.ph) >= 0 ? 1 : -1 };
    const u = (t * e.sp) / (2 * e.amp) + e.ph;
    const x = e.cx + tri(u) * e.amp;
    const dir = tri(u + 0.01) > tri(u) ? 1 : -1;
    return { x, y: e.y, dir };
  }
  const RADIUS = { blob: 26, urchin: 24, bat: 20 };
  const stompable = (e) => e.kind !== 'urchin';

  // ---- looks. Walkers are drawn with their feet at y=0 facing +x; flyers around their centre.
  const OUT = '#2b2118';
  function body(c, w, h, col, hi) { const g = c.createRadialGradient(-w * 0.3, -h * 0.7, 2, 0, -h * 0.5, w * 1.2); g.addColorStop(0, hi); g.addColorStop(1, col); c.fillStyle = g; }
  function eyes(c, x, y, sep, r, look) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x - sep, y, r, 0, 7); c.arc(x + sep, y, r, 0, 7); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(x - sep + look, y, r * 0.5, 0, 7); c.arc(x + sep + look, y, r * 0.5, 0, 7); c.fill(); }
  function brows(c, x, y, sep, w) { c.strokeStyle = OUT; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x - sep - w, y - 3); c.lineTo(x - sep + w * 0.6, y + 1); c.moveTo(x + sep + w, y - 3); c.lineTo(x + sep - w * 0.6, y + 1); c.stroke(); }
  const LOOKS = {
    meadow(c, e, t) { // grumpy mushroom gnome
      const w = Math.sin(t * 10 + e.id) * 3;
      c.fillStyle = '#5b3d26'; for (const dx of [-9, 9]) { c.beginPath(); c.ellipse(dx + (dx > 0 ? w : -w), -3, 7, 4, 0, 0, 7); c.fill(); c.stroke(); }
      c.fillStyle = '#f2e6cf'; c.beginPath(); c.moveTo(-10, -4); c.quadraticCurveTo(-12, -20, -9, -26); c.lineTo(9, -26); c.quadraticCurveTo(12, -20, 10, -4); c.closePath(); c.fill(); c.stroke();
      body(c, 24, 20, 'hsl(' + e.hue + ',60%,45%)', 'hsl(' + e.hue + ',70%,68%)'); c.beginPath(); c.moveTo(-26, -24); c.quadraticCurveTo(-26, -50, 0, -52); c.quadraticCurveTo(26, -50, 26, -24); c.quadraticCurveTo(0, -18, -26, -24); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, r] of [[-12, -40, 4], [6, -45, 4.5], [16, -34, 3]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
      eyes(c, 3, -17, 6, 3.4, 1); brows(c, 3, -17, 6, 5);
    },
    desert(c, e, t) { // scorpion
      const w = Math.sin(t * 12 + e.id) * 2;
      c.strokeStyle = '#6b3a1a'; c.lineWidth = 3; for (const dx of [-10, -2, 6, 14]) { c.beginPath(); c.moveTo(dx, -8); c.lineTo(dx + 5 + w * (dx % 2 ? 1 : -1), 0); c.stroke(); }
      c.lineWidth = 6; c.beginPath(); c.moveTo(-14, -12); c.quadraticCurveTo(-34, -14, -32, -34); c.quadraticCurveTo(-30, -46, -16, -42); c.stroke(); c.strokeStyle = '#b5651d'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-14, -12); c.quadraticCurveTo(-34, -14, -32, -34); c.quadraticCurveTo(-30, -46, -16, -42); c.stroke();
      c.fillStyle = '#ff3d2e'; c.beginPath(); c.moveTo(-17, -42); c.lineTo(-10, -40); c.lineTo(-16, -34); c.fill();
      body(c, 20, 12, '#b5651d', '#e0a060'); c.beginPath(); c.ellipse(0, -12, 18, 10, 0, 0, 7); c.fill(); c.stroke();
      for (const s of [1]) { c.fillStyle = '#c4753a'; c.beginPath(); c.ellipse(22, -12, 8, 6, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(22, -18); c.lineTo(30, -24); c.lineTo(28, -14); c.fill(); c.stroke(); }
      eyes(c, 6, -17, 4, 2.6, 1);
    },
    snow(c, e, t) { // slime-ball
      const sq = Math.sin(t * 6 + e.id) * 2;
      body(c, 22, 22, '#9fdcff', '#eafaff'); c.beginPath(); c.moveTo(-22 - sq, 0); c.quadraticCurveTo(-24 - sq, -36 + sq, 0, -36 + sq); c.quadraticCurveTo(24 + sq, -36 + sq, 22 + sq, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-8, -26, 5, 8, 0.5, 0, 7); c.fill();
      eyes(c, 4, -17, 6, 4, 1); brows(c, 4, -17, 6, 5); c.fillStyle = '#e63946'; c.fillRect(-14, -3, 28, 3);
    },
    sunset(c, e, t) { // wasp-bug beetle
      const w = Math.sin(t * 14 + e.id) * 2;
      c.strokeStyle = '#2a1a10'; c.lineWidth = 3; for (const dx of [-10, 0, 10]) { c.beginPath(); c.moveTo(dx, -10); c.lineTo(dx + 4 + w, 0); c.stroke(); }
      body(c, 20, 16, '#c0392b', '#ff8a6a'); c.beginPath(); c.ellipse(0, -16, 20, 15, 0, 0, 7); c.fill(); c.stroke(); c.strokeStyle = OUT; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -2); c.stroke(); c.fillStyle = OUT; for (const [x, y] of [[-9, -18], [9, -18], [-7, -9], [7, -9]]) { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); }
      c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(20, -14, 8, 0, 7); c.fill(); eyes(c, 21, -15, 3.2, 2.2, 1);
    },
    night(c, e, t) { // skull-lantern ghoul
      const w = Math.sin(t * 8 + e.id) * 2;
      c.fillStyle = 'rgba(120,255,210,.25)'; c.beginPath(); c.arc(0, -22, 30, 0, 7); c.fill();
      c.fillStyle = '#e9e4d6'; c.beginPath(); c.moveTo(-14, -2 + w); c.lineTo(-14, -26); c.arc(0, -28, 14, Math.PI, 0); c.lineTo(14, -2 - w); c.lineTo(8, -8); c.lineTo(2, -2 + w); c.lineTo(-4, -8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#103a30'; c.beginPath(); c.ellipse(-5, -28, 4, 5, 0, 0, 7); c.ellipse(6, -28, 4, 5, 0, 0, 7); c.fill(); c.fillStyle = '#5affd0'; c.beginPath(); c.arc(-5, -28, 1.8, 0, 7); c.arc(6, -28, 1.8, 0, 7); c.fill();
      c.fillStyle = '#103a30'; c.fillRect(-4, -18, 10, 3);
    },
    candy(c, e, t) { // gummy bear
      const w = Math.sin(t * 9 + e.id) * 2, col = ['#ff5f6d', '#7ed957', '#ffcf40', '#5fb4ff'][e.id % 4];
      body(c, 18, 28, col, '#fff'); c.globalAlpha = 0.92; for (const [x, y, r] of [[0, -14, 15], [0, -34, 12]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.stroke(); } for (const x of [-9, 9]) { c.beginPath(); c.arc(x, -44, 5, 0, 7); c.fill(); c.stroke(); } c.beginPath(); c.ellipse(-12, -2 + w, 6, 6, 0, 0, 7); c.ellipse(12, -2 - w, 6, 6, 0, 0, 7); c.fill(); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-6, -38, 3, 6, 0.5, 0, 7); c.fill(); eyes(c, 3, -34, 4.5, 3, 1); brows(c, 3, -34, 4.5, 4);
    },
    lava(c, e, t) { // fire imp
      const f = Math.sin(t * 12 + e.id);
      const g = c.createRadialGradient(0, -22, 2, 0, -22, 34); g.addColorStop(0, 'rgba(255,170,40,.6)'); g.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = g; c.fillRect(-36, -60, 72, 60);
      c.fillStyle = '#3a1a14'; for (const dx of [-8, 8]) { c.beginPath(); c.ellipse(dx + f * 2 * Math.sign(dx), -3, 6, 4, 0, 0, 7); c.fill(); c.stroke(); }
      body(c, 18, 22, '#d9381e', '#ff9a3c'); c.beginPath(); c.ellipse(0, -20, 15, 18, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#3a1a14'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 8, -34); c.lineTo(s * 14, -48); c.lineTo(s * 3, -37); c.fill(); }
      c.fillStyle = '#ffe07a'; c.beginPath(); c.moveTo(-3, -38); c.lineTo(0, -52 - f * 3); c.lineTo(3, -38); c.fill();
      eyes(c, 3, -22, 5, 3, 1); c.fillStyle = OUT; c.beginPath(); c.arc(3, -12, 4, 0, Math.PI); c.fill();
    },
  };
  const FLY = {
    bat(c, e, t) { const f = Math.sin(t * 16 + e.id) * 0.7; c.fillStyle = '#5a4f7a'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 6, -2); c.quadraticCurveTo(s * 26, -24 - f * 14, s * 34, 2 - f * 10); c.quadraticCurveTo(s * 24, -4, s * 17, 5); c.quadraticCurveTo(s * 12, 0, s * 6, 6); c.closePath(); c.fill(); c.stroke(); } body(c, 12, 14, '#6d6290', '#9a90c0'); c.beginPath(); c.ellipse(0, 2, 11, 13, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-8, -8); c.lineTo(-7, -19); c.lineTo(-2, -10); c.moveTo(8, -8); c.lineTo(7, -19); c.lineTo(2, -10); c.fill(); c.stroke(); eyes(c, 0, 0, 4.5, 3, 0); c.fillStyle = '#fff'; c.fillRect(-3, 8, 2, 4); c.fillRect(2, 8, 2, 4); },
    wasp(c, e, t) { const f = Math.sin(t * 40 + e.id); c.fillStyle = 'rgba(200,230,255,.6)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 8, -12, 14, 6 + f * 2, s * -0.5, 0, 7); c.fill(); c.stroke(); } c.fillStyle = '#ffcf33'; c.beginPath(); c.ellipse(0, 0, 20, 13, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = OUT; for (const x of [-8, 2, 11]) c.fillRect(x, -12, 4, 24); c.beginPath(); c.moveTo(-20, 0); c.lineTo(-30, 3); c.lineTo(-20, 5); c.fill(); c.fillStyle = '#ffcf33'; c.beginPath(); c.arc(18, -2, 8, 0, 7); c.fill(); c.stroke(); eyes(c, 20, -4, 3, 2.6, 1); },
    ghost(c, e, t) { const w = Math.sin(t * 5 + e.id) * 3; c.globalAlpha = 0.9; const g = c.createLinearGradient(0, -22, 0, 20); g.addColorStop(0, '#f4fbff'); g.addColorStop(1, 'rgba(190,220,255,.7)'); c.fillStyle = g; c.beginPath(); c.moveTo(-18, 16); c.lineTo(-18, -4); c.arc(0, -4, 18, Math.PI, 0); c.lineTo(18, 16); for (let i = 0; i < 4; i++) c.quadraticCurveTo(18 - i * 9 - 4.5, 24 + w, 18 - (i + 1) * 9, 16); c.closePath(); c.fill(); c.stroke(); c.globalAlpha = 1; c.fillStyle = OUT; c.beginPath(); c.ellipse(-6, -4, 3, 5, 0, 0, 7); c.ellipse(7, -4, 3, 5, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(0, 7, 4, 5, 0, 0, 7); c.fill(); },
  };
  const LOOK_ALIAS = { sky: 'snow', jungle: 'sunset', cavern: 'night', factory: 'lava', space: 'candy' };
  const FLY_BY = { sky: 'wasp', jungle: 'wasp', cavern: 'bat', factory: 'bat', space: 'ghost', meadow: 'wasp', desert: 'bat', snow: 'ghost', sunset: 'bat', night: 'ghost', candy: 'wasp', lava: 'bat' };

  function urchin(c, e, t) {
    c.fillStyle = '#5c3d82';
    for (let i = 0; i < 13; i++) { const a = Math.PI + (i / 12) * Math.PI, wob = Math.sin(t * 6 + i) * 1.5; c.beginPath(); c.moveTo(Math.cos(a) * 14, -14 + Math.sin(a) * 14); c.lineTo(Math.cos(a) * (28 + wob), -14 + Math.sin(a) * (28 + wob)); c.lineTo(Math.cos(a + 0.2) * 14, -14 + Math.sin(a + 0.2) * 14); c.closePath(); c.fill(); c.stroke(); }
    body(c, 16, 18, '#8e62bd', '#c3a0ec'); c.beginPath(); c.arc(0, -13, 15, Math.PI, 0); c.lineTo(15, -3); c.lineTo(-15, -3); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#d62839'; c.beginPath(); c.arc(-5, -12, 3.6, 0, 7); c.arc(7, -12, 3.6, 0, 7); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(-4, -12, 1.5, 0, 7); c.arc(8, -12, 1.5, 0, 7); c.fill(); brows(c, 1, -12, 6, 5);
  }

  function draw(ctx, list, t, deadUntil) {
    for (const e of list) {
      const d = deadUntil && deadUntil[e.id];
      if (d && d > t) continue;
      const p = posAt(e, t);
      ctx.save();
      if (e.kind !== 'bat') { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 22, 5, 0, 0, 7); ctx.fill(); }
      ctx.translate(p.x, p.y);
      ctx.lineWidth = 2.6; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (e.kind === 'bat') { ctx.scale(p.dir, 1); (FLY[FLY_BY[e.theme] || 'bat'])(ctx, e, t); }
      else { ctx.scale(p.dir, 1); (e.kind === 'urchin' ? urchin : (LOOKS[e.theme] || LOOKS[LOOK_ALIAS[e.theme]] || LOOKS.meadow))(ctx, e, t); }
      ctx.restore();
    }
  }

  const api = { generate, posAt, draw, groundAt, stompable, RADIUS, RESPAWN: 9 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Enemies = api;
})(typeof window !== 'undefined' ? window : globalThis);
