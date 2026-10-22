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
    const R = rng(1000 + idx * 77), R2 = rng(5000 + idx * 31), theme = level.theme || 'meadow';
    const dens = DENSITY[diffKey] || 0.7;
    if (level.sea) return seaLife(level, idx, dens, R2);
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
      const e0 = { kind: spiky ? 'urchin' : 'blob', cx: mid, y: s.y, amp: half, sp: 38 + R() * 22, ph: R() * 6, hue: Math.floor(R() * 360), theme };
      // specialised enemies take over some stretches, more of them the further you get
      const sp = Math.min(0.75, 0.22 + idx * 0.007 + (level.mega ? 0.12 : 0) + (level.weather ? 0.06 : 0));
      if (!spiky && idx >= 5 && R2() < sp && !level.sea) {
        const q = R2();
        if (q < 0.34) { e0.kind = 'charger'; e0.amp = Math.max(e0.amp, 85); e0.sp = 46; }
        else if (q < 0.68) { e0.kind = 'hopper'; e0.sp = 46; e0.amp = Math.max(e0.amp, 70); }
        else if (len >= 260) { e0.kind = 'turret'; e0.cx = s.x1 - 60; e0.dir = -1; e0.per = 3.4 - Math.min(1, idx / 130) * 0.7; e0.amp = 0; }
      }
      list.push(e0);
    }
    // a few bats floating over the course
    const xs = level.egg ? level.egg[0] : 3000;
    for (let x = 1100 + R() * 400; x < xs - 400; x += 900 + R() * 700) {
      if (R() > dens) continue;
      const g = groundAt(level, x);
      if (g === null || inWater(x)) continue;
      list.push({ kind: idx >= 8 && R2() < 0.45 ? 'diver' : 'bat', cx: x, y: g - 120 - R() * 50, amp: 110, sp: 1.1 + R() * 0.6, ph: R() * 6, hue: 0, theme });
    }
    for (const e of list) { e.id = list.indexOf(e); }
    return list;
  }

  // ---- the deep sea: creatures drift through the open water; every one of them hurts, so swim around them
  function seaLife(level, idx, dens, R) {
    const list = [], xs = level.egg ? level.egg[0] : 3000, floor = level.seaFloor || 520;
    let k = 0;
    const dn = level.seaDense || 1;
    for (let x = 1000 + R() * 300; x < xs - 500; x += (780 - dens * 150) / dn + R() * 420 / dn) {
      if ((level.noLife || []).some((r) => x > r[0] && x < r[1])) continue;
      if ((level.checkpoints || []).some((c) => Math.abs(c[0] - x) < 240)) continue;
      const g = groundAt(level, x); if (g === null) continue;
      const kind = ['jelly', 'puffer', 'eel', 'shark', 'jelly', 'puffer'][(k++ + Math.floor(R() * 3)) % 6];
      const e = { kind, cx: x, y: g - 190 - R() * 120, amp: 90, sp: 1.0 + R() * 0.5, ph: R() * 6, theme: 'ocean', hue: Math.floor(R() * 360) };
      if (kind === 'shark') { e.amp = 420; e.sp = 1; e.y = g - 330; if ((level.noLife || []).some((r) => e.cx + e.amp > r[0] && e.cx - e.amp < r[1])) e.skip = true; }
      if (kind === 'eel') { e.amp = 160; e.sp = 0.9; }
      if (kind === 'puffer') { e.amp = 70; }
      list.push(e);
    }
    const out = list.filter((e) => !e.skip); out.forEach((e, i) => { e.id = i; });
    return out;
  }

  const tri = (u) => { u = ((u % 2) + 2) % 2; return u < 1 ? u * 2 - 1 : 3 - u * 2; };   // triangle wave -1..1

  // state at time t. Squashed enemies come back after RESPAWN seconds (squash time comes from the game).
  function posAt(e, t) {
    if (e.kind === 'bat') return { x: e.cx + Math.sin(t * e.sp + e.ph) * e.amp, y: e.y + Math.sin(t * e.sp * 2 + e.ph) * 24, dir: Math.cos(t * e.sp + e.ph) >= 0 ? 1 : -1 };
    if (e.kind === 'diver') {   // hovers, shakes (warning), plunges 150 px, climbs back; 4.4 s cycle
      const C = 4.4, s = (((t + e.ph) % C) + C) % C, sway = Math.sin(t * 0.9 + e.ph) * e.amp * 0.5;
      const dive = s < 2.8 ? 0 : s < 3.3 ? 0 : s < 3.65 ? (s - 3.3) / 0.35 : s < 4.4 ? 1 - (s - 3.65) / 0.75 : 0;
      return { x: e.cx + sway, y: e.y + dive * 150 + Math.sin(t * 3 + e.ph) * 4, dir: Math.cos(t * 0.9 + e.ph) >= 0 ? 1 : -1, warn: s >= 2.8 && s < 3.3, dive: s >= 3.3 && s < 3.65 };
    }
    if (e.kind === 'jelly') return { x: e.cx + Math.sin(t * e.sp * 0.6 + e.ph) * e.amp * 0.5, y: e.y + Math.sin(t * e.sp + e.ph) * 70, dir: 1 };
    if (e.kind === 'puffer') return { x: e.cx + Math.sin(t * e.sp * 0.7 + e.ph) * e.amp, y: e.y + Math.cos(t * e.sp * 0.5 + e.ph) * 40, dir: Math.cos(t * e.sp * 0.7 + e.ph) >= 0 ? 1 : -1 };
    if (e.kind === 'eel') return { x: e.cx + Math.sin(t * e.sp * 0.8 + e.ph) * e.amp, y: e.y + Math.sin(t * e.sp * 2.4 + e.ph) * 36, dir: Math.cos(t * e.sp * 0.8 + e.ph) >= 0 ? 1 : -1 };
    if (e.kind === 'shark') { const u = t * 0.42 * e.sp + e.ph; return { x: e.cx + tri(u) * e.amp, y: e.y + Math.sin(t * 0.9 + e.ph) * 50, dir: tri(u + 0.01) > tri(u) ? 1 : -1 }; }
    if (e.kind === 'turret') return { x: e.cx, y: e.y, dir: e.dir || -1 };
    if (e.kind === 'hopper') {   // hops along a patrol: a parabola every 1.3 s
      const s = (((t / 1.3 + e.ph) % 1) + 1) % 1, u2 = (t * e.sp) / (2 * e.amp) + e.ph;
      return { x: e.cx + tri(u2) * e.amp, y: e.y - 4 * s * (1 - s) * 90, dir: tri(u2 + 0.01) > tri(u2) ? 1 : -1 };
    }
    if (e.kind === 'charger') {  // 5 s cycle: patrol 3 s, shake 0.7 s (telegraph), dash 1.3 s at 3.2x speed
      const C = 5, k = Math.floor((t + e.ph) / C), s = (t + e.ph) - k * C, dist = 3 * e.sp + 1.3 * e.sp * 3.2;
      const part = s < 3 ? s * e.sp : s < 3.7 ? 3 * e.sp : 3 * e.sp + (s - 3.7) * e.sp * 3.2 * (s < 5 ? 1 : 0);
      const tau = k * dist + Math.min(part, dist), u2 = tau / (2 * e.amp);
      return { x: e.cx + tri(u2) * e.amp, y: e.y, dir: tri(u2 + 0.002) > tri(u2) ? 1 : -1, wind: s >= 3 && s < 3.7, dash: s >= 3.7 };
    }
    const u = (t * e.sp) / (2 * e.amp) + e.ph;
    const x = e.cx + tri(u) * e.amp;
    const dir = tri(u + 0.01) > tri(u) ? 1 : -1;
    return { x, y: e.y, dir };
  }
  const RADIUS = { diver: 22, blob: 26, urchin: 24, bat: 20, charger: 28, hopper: 22, turret: 26, jelly: 26, puffer: 22, eel: 18, shark: 40 };
  const FLYERS = { diver: 1, bat: 1, jelly: 1, puffer: 1, eel: 1, shark: 1 };
  const SEA = { jelly: 1, puffer: 1, eel: 1, shark: 1 };
  const radiusAt = (e, t) => {
    if (e.kind === 'puffer') { const s = (((t + e.ph) % 4) + 4) % 4; return 22 + 24 * (s < 2 ? 0 : s < 2.5 ? (s - 2) * 2 : s < 3.5 ? 1 : (4 - s) * 2); }
    return RADIUS[e.kind] || 24;
  };
  const stompable = (e) => !(e.kind === 'urchin' || e.kind === 'turret' || SEA[e.kind]);
  // turret bolts fly straight and slowly; position is a pure function of the clock
  function shots(list, t) {
    const out = [];
    for (const e of list) if (e.kind === 'turret') {
      const per = e.per || 3.4, k = Math.floor(t / per);
      for (let j = k - 1; j <= k; j++) { if (j < 0) continue; const age = t - j * per - ((e.id * 0.37) % 1); if (age < 0 || age > 3.2) continue; out.push({ x: e.cx + (e.dir || -1) * (34 + age * 230), y: e.y - 36, r: 10, id: e.id }); }
    }
    return out;
  }

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

  const NEWLOOK = {
    diver(c, e, t, p) { // dive-bomber: shakes red, then plunges
      const f = Math.sin(t * (p.warn ? 40 : 14) + e.id) * 0.7, sh = p.warn ? Math.sin(t * 50) * 2 : 0; c.translate(sh, 0);
      c.fillStyle = p.warn || p.dive ? '#c0392b' : '#7a4f9a';
      for (const s2 of [-1, 1]) { c.beginPath(); c.moveTo(s2 * 6, -2); c.lineTo(s2 * 36, -14 - f * 12); c.lineTo(s2 * 26, 2); c.lineTo(s2 * 16, -2 + f * 4); c.closePath(); c.fill(); c.stroke(); }
      body(c, 12, 14, '#6d4a8a', '#b08ad0'); c.beginPath(); c.ellipse(0, 2, 12, 14, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#ffcf33'; c.beginPath(); c.moveTo(10, 0); c.lineTo(22, 6); c.lineTo(8, 8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = p.warn || p.dive ? '#ff3a2e' : '#fff'; c.beginPath(); c.arc(5, -3, 3.4, 0, 7); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(6, -3, 1.4, 0, 7); c.fill();
      brows(c, 5, -3, 0, 5);
    },
    charger(c, e, t, p) { // horned boar-ish charger; shakes before a dash
      const sh = p.wind ? Math.sin(t * 60) * 2 : 0, run = p.dash ? Math.sin(t * 30) * 4 : Math.sin(t * 10) * 2;
      c.translate(sh, 0);
      c.fillStyle = '#4a3326'; for (const dx of [-14, 12]) { c.beginPath(); c.ellipse(dx + run * Math.sign(dx), -4, 6, 5, 0, 0, 7); c.fill(); c.stroke(); }
      const col = 'hsl(' + (e.hue % 40 + 8) + ',55%,38%)'; body(c, 28, 26, col, '#e8a070'); c.beginPath(); c.ellipse(0, -24, 28, 20, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#f2e6cf'; for (const s2 of [0, 1]) { c.beginPath(); c.moveTo(18 + s2 * 6, -38); c.quadraticCurveTo(34, -52 + s2 * 6, 40, -40 + s2 * 4); c.lineTo(24 + s2 * 4, -34); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle = p.wind || p.dash ? '#ff3a2e' : '#fff'; c.beginPath(); c.arc(16, -28, 4, 0, 7); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(17, -28, 1.8, 0, 7); c.fill();
      brows(c, 17, -28, 0, 6); if (p.wind) { c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-26 - i * 8, -6 - i * 3, 3 - i * 0.6, 0, 7); c.fill(); } }
    },
    hopper(c, e, t) { // frog
      c.fillStyle = '#3f9a4f'; body(c, 22, 22, '#3f9a4f', '#a8f0a0'); c.beginPath(); c.ellipse(0, -16, 22, 15, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#2f7a3d'; c.beginPath(); c.ellipse(-14, -4, 10, 6, 0, 0, 7); c.fill(); c.stroke();
      for (const x of [8, 18]) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x, -30, 6, 0, 7); c.fill(); c.stroke(); c.fillStyle = OUT; c.beginPath(); c.arc(x + 1.4, -30, 2.4, 0, 7); c.fill(); }
      c.strokeStyle = '#d33'; c.lineWidth = 2.4; c.beginPath(); c.arc(16, -14, 6, 0.2, Math.PI - 0.2); c.stroke();
    },
    turret(c, e, t) { // armoured cannon: can not be stomped
      const per = e.per || 3.4, ph = (t % per) / per, rec = ph < 0.12 ? (0.12 - ph) * 40 : 0;
      c.fillStyle = '#5a6572'; c.beginPath(); c.moveTo(-24, 0); c.lineTo(-20, -24); c.quadraticCurveTo(0, -42, 20, -24); c.lineTo(24, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#39414b'; c.save(); c.translate(0, -30); c.fillRect(-6 + rec * 0.5, -9, 38 - rec, 18); c.strokeRect(-6 + rec * 0.5, -9, 38 - rec, 18); c.restore();
      c.fillStyle = ph > 0.82 ? '#ff4a2a' : '#f2c14a'; c.beginPath(); c.arc(-6, -14, 5, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#cfd6de'; for (const x of [-16, 16]) { c.beginPath(); c.arc(x, -6, 2.4, 0, 7); c.fill(); }
    },
    jelly(c, e, t) { // jellyfish
      const w = Math.sin(t * 5 + e.id) * 3; c.globalAlpha = 0.92;
      const g = c.createRadialGradient(-6, -10, 2, 0, -4, 30); g.addColorStop(0, '#ffd6f5'); g.addColorStop(1, 'hsl(' + (290 + e.hue % 40) + ',70%,62%)'); c.fillStyle = g;
      c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(-26, -34 - w, 0, -34 - w); c.quadraticCurveTo(26, -34 - w, 26, 0); c.quadraticCurveTo(0, 6, -26, 0); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,190,240,.9)'; c.lineWidth = 3; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 9, 2); c.quadraticCurveTo(i * 9 + w * 2, 20, i * 9 - w, 38 + (i & 1) * 6); c.stroke(); }
      c.globalAlpha = 1; c.fillStyle = OUT; c.beginPath(); c.arc(-7, -16, 2.6, 0, 7); c.arc(8, -16, 2.6, 0, 7); c.fill(); c.strokeStyle = '#ffe14a'; c.lineWidth = 2; c.setLineDash([3, 4]); c.beginPath(); c.arc(0, -8, 33, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.setLineDash([]);
    },
    puffer(c, e, t) { // pufferfish: blows up, spikes out
      const R = radiusAt(e, t), big = (R - 22) / 24, w = Math.sin(t * 8 + e.id);
      c.fillStyle = big > 0.3 ? '#ff6a3a' : '#f2c14a';
      if (big > 0.2) for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.2832; c.beginPath(); c.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); c.lineTo(Math.cos(a) * (R + 10) , Math.sin(a) * (R + 10)); c.lineTo(Math.cos(a + 0.2) * R * 0.8, Math.sin(a + 0.2) * R * 0.8); c.fill(); c.stroke(); }
      body(c, R, R, big > 0.3 ? '#ff8a4a' : '#f2c14a', '#fff2b0'); c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#f2c14a'; c.beginPath(); c.moveTo(-R, 0); c.lineTo(-R - 14, -8 + w * 4); c.lineTo(-R - 14, 8 + w * 4); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(R * 0.4, -R * 0.2, 6, 0, 7); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(R * 0.4 + 1.5, -R * 0.2, 2.8, 0, 7); c.fill();
      c.beginPath(); c.arc(R * 0.75, R * 0.2, big > 0.3 ? 4 : 2, 0, 7); c.fill();
    },
    eel(c, e, t) { // electric eel: long wavy body
      c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 17; c.beginPath(); for (let i = 0; i <= 9; i++) { const x = -i * 11, y = Math.sin(t * 6 - i * 0.7 + e.id) * 9; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      c.strokeStyle = '#4fa86a'; c.lineWidth = 12; c.beginPath(); for (let i = 0; i <= 9; i++) { const x = -i * 11, y = Math.sin(t * 6 - i * 0.7 + e.id) * 9; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      c.strokeStyle = '#ffe14a'; c.lineWidth = 2.4; c.beginPath(); for (let i = 1; i <= 8; i++) { const x = -i * 11 + 4, y = Math.sin(t * 6 - i * 0.7 + e.id) * 9; c.moveTo(x, y - 3); c.lineTo(x - 4, y + 3); if (i % 3 == 0) { c.moveTo(x, y - 12); c.lineTo(x - 5, y - 20); } } c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(4, -3 + Math.sin(t * 6 + e.id) * 9, 4, 0, 7); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(5, -3 + Math.sin(t * 6 + e.id) * 9, 1.8, 0, 7); c.fill();
    },
    shark(c, e, t) { // shark
      const w = Math.sin(t * 5 + e.id) * 5;
      c.fillStyle = '#6f8aa0'; c.beginPath(); c.moveTo(-60, w); c.lineTo(-82, -16 + w); c.lineTo(-78, 14 + w); c.closePath(); c.fill(); c.stroke();
      body(c, 50, 24, '#7f9db3', '#c9dfee'); c.beginPath(); c.moveTo(-60, w); c.quadraticCurveTo(-20, -30, 42, -12); c.quadraticCurveTo(58, 0, 42, 12); c.quadraticCurveTo(-20, 28, -60, w); c.fill(); c.stroke();
      c.fillStyle = '#e8f2fa'; c.beginPath(); c.moveTo(-20, 14); c.quadraticCurveTo(10, 22, 42, 10); c.quadraticCurveTo(10, 8, -20, 14); c.fill();
      c.fillStyle = '#6f8aa0'; c.beginPath(); c.moveTo(-6, -22); c.lineTo(8, -46); c.lineTo(18, -16); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(30, -4, 4.5, 0, 7); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(31.5, -4, 2, 0, 7); c.fill(); brows(c, 31, -4, 0, 6);
      c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(36 - i * 5, 5); c.lineTo(38 - i * 5, 10); c.lineTo(41 - i * 5, 5); c.fill(); }
    },
  };

  function drawShots(ctx, list, t) {
    for (const b of shots(list, t)) {
      ctx.save(); ctx.translate(b.x, b.y);
      const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, b.r + 2); g.addColorStop(0, '#fff3b0'); g.addColorStop(1, '#ff6a2a'); ctx.fillStyle = g; ctx.strokeStyle = OUT; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }

  function draw(ctx, list, t, deadUntil) {
    for (const e of list) {
      const d = deadUntil && deadUntil[e.id];
      if (d && d > t) continue;
      const p = posAt(e, t);
      ctx.save();
      if (!FLYERS[e.kind]) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 22, 5, 0, 0, 7); ctx.fill(); }
      ctx.translate(p.x, p.y);
      ctx.lineWidth = 2.6; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (NEWLOOK[e.kind]) { if (e.kind !== 'jelly') ctx.scale(p.dir, 1); NEWLOOK[e.kind](ctx, e, t, p); }
      else if (e.kind === 'bat') { ctx.scale(p.dir, 1); (FLY[FLY_BY[e.theme] || 'bat'])(ctx, e, t); }
      else { ctx.scale(p.dir, 1); (e.kind === 'urchin' ? urchin : (LOOKS[e.theme] || LOOKS[LOOK_ALIAS[e.theme]] || LOOKS.meadow))(ctx, e, t); }
      ctx.restore();
    }
  }

  const api = { generate, posAt, draw, drawShots, shots, radiusAt, FLYERS, groundAt, stompable, RADIUS, RESPAWN: 9 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Enemies = api;
})(typeof window !== 'undefined' ? window : globalThis);
