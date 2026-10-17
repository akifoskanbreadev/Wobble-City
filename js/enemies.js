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
    const R = rng(1000 + idx * 77);
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
      if (len < 170 || s.x0 < 400) continue;
      const mid = (s.x0 + s.x1) / 2;
      if (nearAny(mid, level.checkpoints || [], 150) || inWater(mid) || inHaz(mid) || (level.egg && Math.abs(level.egg[0] - mid) < 260)) continue;
      if (R() > dens * 0.85) continue;
      const half = Math.max(30, Math.min(110, len / 2 - 40));
      const spiky = (diffKey === 'insane' || diffKey === 'noodle' || diffKey === 'hard') && (k++ % 3 === 2);
      list.push({ kind: spiky ? 'urchin' : 'blob', cx: mid, y: s.y, amp: half, sp: 38 + R() * 22, ph: R() * 6, hue: Math.floor(R() * 360) });
    }
    // a few bats floating over the course
    const xs = level.egg ? level.egg[0] : 3000;
    for (let x = 1100 + R() * 400; x < xs - 400; x += 900 + R() * 700) {
      if (R() > dens) continue;
      const g = groundAt(level, x);
      if (g === null || inWater(x)) continue;
      list.push({ kind: 'bat', cx: x, y: g - 120 - R() * 50, amp: 110, sp: 1.1 + R() * 0.6, ph: R() * 6, hue: 0 });
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
  const RADIUS = { blob: 20, urchin: 21, bat: 18 };
  const stompable = (e) => e.kind !== 'urchin';

  function draw(ctx, list, t, deadUntil) {
    for (const e of list) {
      const d = deadUntil && deadUntil[e.id];
      if (d && d > t) continue;
      const p = posAt(e, t);
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.lineWidth = 3; ctx.strokeStyle = '#2b2118'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const wob = Math.sin(t * 9 + e.id) * 2;
      if (e.kind === 'blob') {
        ctx.scale(p.dir, 1);
        // feet
        ctx.fillStyle = '#4a3a28'; for (const dx of [-9, 9]) { const l = Math.sin(t * 10 + dx) * 3; ctx.beginPath(); ctx.ellipse(dx + l, -3, 7, 4, 0, 0, 7); ctx.fill(); ctx.stroke(); }
        // body: grumpy mushroom/gnome
        ctx.fillStyle = 'hsl(' + e.hue + ',55%,52%)'; ctx.beginPath(); ctx.moveTo(-19, -6); ctx.quadraticCurveTo(-22, -34 + wob, 0, -38 + wob); ctx.quadraticCurveTo(22, -34 + wob, 19, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.ellipse(1, -17, 14, 9, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#2b2118'; ctx.beginPath(); ctx.arc(-3, -18, 2.4, 0, 7); ctx.arc(8, -18, 2.4, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, -25); ctx.lineTo(-1, -21); ctx.moveTo(14, -25); ctx.lineTo(6, -21); ctx.stroke();
      } else if (e.kind === 'urchin') {
        ctx.scale(p.dir, 1);
        ctx.fillStyle = '#6b4a8c';
        for (let i = 0; i < 11; i++) { const a = Math.PI + (i / 10) * Math.PI; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, -14 + Math.sin(a) * 14); ctx.lineTo(Math.cos(a) * 27, -14 + Math.sin(a) * 27); ctx.lineTo(Math.cos(a + 0.22) * 14, -14 + Math.sin(a + 0.22) * 14); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, -13, 15, Math.PI, 0); ctx.lineTo(15, -3); ctx.lineTo(-15, -3); ctx.closePath(); ctx.fillStyle = '#8f63b8'; ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4, -12, 3.2, 0, 7); ctx.arc(6, -12, 3.2, 0, 7); ctx.fill();
        ctx.fillStyle = '#2b2118'; ctx.beginPath(); ctx.arc(-3, -12, 1.5, 0, 7); ctx.arc(7, -12, 1.5, 0, 7); ctx.fill();
      } else {
        const f = Math.sin(t * 16 + e.id) * 0.7;
        ctx.fillStyle = '#4a4468';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 6, -2); ctx.quadraticCurveTo(s * 26, -22 - f * 14, s * 32, 2 - f * 10); ctx.quadraticCurveTo(s * 22, -4, s * 14, 4); ctx.quadraticCurveTo(s * 10, 0, s * 6, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = '#5d5683'; ctx.beginPath(); ctx.ellipse(0, 2, 11, 13, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-7, -18); ctx.lineTo(-2, -10); ctx.moveTo(8, -8); ctx.lineTo(7, -18); ctx.lineTo(2, -10); ctx.fillStyle = '#5d5683'; ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffdf5a'; ctx.beginPath(); ctx.arc(-4, 0, 3, 0, 7); ctx.arc(4, 0, 3, 0, 7); ctx.fill();
        ctx.fillStyle = '#2b2118'; ctx.beginPath(); ctx.arc(-4, 0, 1.2, 0, 7); ctx.arc(4, 0, 1.2, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
  }

  const api = { generate, posAt, draw, groundAt, stompable, RADIUS, RESPAWN: 9 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Enemies = api;
})(typeof window !== 'undefined' ? window : globalThis);
