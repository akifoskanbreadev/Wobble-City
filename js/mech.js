/*
 * Level mechanics for the Mega Worlds. Level data may carry:
 *   crumble: [[x,y,w,h]]                  platforms that fall away ~0.55s after you stand on them, and come back
 *   belts:   [[x,y,w,vx]]                 conveyor belts (a solid whose surface moves: friction drags you along)
 *   zones:   [[x,y,w,h,ax,ay,g,kind]]     fans (ay<0 pushes up), low gravity (g<1), anti-gravity (g<0)
 *   saws:    [{x,y,r,ax,ay,per,ph}]       spinning blades on a sinusoidal path. Deadly.
 *   portals: [{a:[x,y], b:[x,y], hue}]    walk into one end and pop out of the other
 *   gates:   [{btn:[x,y,w,h], box:[x,y,w,h]}]  touch the button and the gate opens for good
 * build() puts the solids/zones into the physics world; tick() runs the rules; draw() paints it all.
 */
(function (root) {
  'use strict';
  const INK = '#1f2a36';

  function build(world, lv) {
    const m = { crumbles: [], saws: [], portals: [], gates: [], zones: [], belts: [], armed: [], pcd: 0 };
    for (const c of lv.crumble || []) {
      const s = { x: c[0], y: c[1], w: c[2], h: c[3] || 24, vx: 0, vy: 0, crumble: true };
      world.solids.push(s); m.crumbles.push({ s, hit: -1, gone: false, back: 0 });
    }
    for (const b of lv.belts || []) {
      const s = { x: b[0], y: b[1], w: b[2], h: 26, vx: b[3], vy: 0, belt: true, mu: 1.5 };
      world.solids.push(s); m.belts.push(s);
    }
    for (const z of lv.zones || []) {
      const o = { x: z[0], y: z[1], w: z[2], h: z[3], ax: z[4] || 0, ay: z[5] || 0, g: z[6] == null ? 1 : z[6], kind: z[7] || 'fan' };
      world.zones.push(o); m.zones.push(o);
    }
    for (const s of lv.saws || []) m.saws.push(Object.assign({ ax: 0, ay: 0, per: 3, ph: 0, r: 32 }, s));
    for (const p of lv.portals || []) { m.portals.push(p); m.armed.push(true); }
    for (const g of lv.gates || []) {
      const s = { x: g.box[0], y: g.box[1], w: g.box[2], h: g.box[3], vx: 0, vy: 0, gate: true };
      world.solids.push(s); m.gates.push({ btn: g.btn, s, open: false, t: 0 });
    }
    return m;
  }

  const sawPos = (s, t) => ({ x: s.x + s.ax * Math.sin((t / s.per + s.ph) * 6.2831853), y: s.y + s.ay * Math.sin((t / s.per + s.ph) * 6.2831853) });
  const shift = (g, dx, dy) => { for (const q of g.body.concat(g.feet, g.neck)) { q.x += dx; q.y += dy; q.ox = q.x; q.oy = q.y; } };

  // Returns events: 'saw', 'portal', 'crumble', 'gate'.
  function tick(m, goose, world, dt) {
    const ev = [], T = world.time, parts = goose.body.concat(goose.feet), head = goose.head, c = goose.center();
    m.time = T;
    for (const k of m.crumbles) {
      if (!k.gone) {
        if (k.hit < 0) { for (const q of parts) if (q.cs === k.s && T - q.groundT < 0.1) { k.hit = T; break; } }
        else if (T - k.hit > 0.55) { const i = world.solids.indexOf(k.s); if (i >= 0) world.solids.splice(i, 1); k.gone = true; k.back = T + 3.4; ev.push('crumble'); }
      } else if (T > k.back) {
        const s = k.s; let free = true;
        for (const q of parts) if (q.x > s.x - 12 && q.x < s.x + s.w + 12 && q.y > s.y - 30 && q.y < s.y + s.h + 30) free = false;
        if (free) { world.solids.push(s); k.gone = false; k.hit = -1; }
      }
    }
    for (const s of m.saws) {
      const p = sawPos(s, T);
      for (const q of parts.concat([head])) if (Math.hypot(q.x - p.x, q.y - p.y) < s.r + q.r * 0.7) { ev.push('saw'); return ev; }
    }
    m.pcd = Math.max(0, m.pcd - dt);
    m.portals.forEach((p, i) => {
      const da = Math.min(Math.hypot(head.x - p.a[0], head.y - p.a[1]), Math.hypot(c.x - p.a[0], c.y - p.a[1]));
      const db = Math.min(Math.hypot(head.x - p.b[0], head.y - p.b[1]), Math.hypot(c.x - p.b[0], c.y - p.b[1]));
      if (da > 110 && db > 110) m.armed[i] = true;
      if (m.armed[i] && m.pcd <= 0) {
        if (da < 44) { shift(goose, p.b[0] + 80 - c.x, p.b[1] - c.y + 6); m.armed[i] = false; m.pcd = 0.6; ev.push('portal'); }
        else if (db < 44) { shift(goose, p.a[0] - 80 - c.x, p.a[1] - c.y + 6); m.armed[i] = false; m.pcd = 0.6; ev.push('portal'); }
      }
    });
    for (const g of m.gates) {
      if (g.open) { g.t = Math.min(1, g.t + dt * 2); continue; }
      const b = g.btn;
      for (const q of parts) if (q.x > b[0] - 6 && q.x < b[0] + b[2] + 6 && q.y > b[1] - 46 && q.y < b[1] + b[3] + 12) {
        g.open = true; const i = world.solids.indexOf(g.s); if (i >= 0) world.solids.splice(i, 1); ev.push('gate'); break;
      }
    }
    return ev;
  }

  // ---- drawing
  function drawSolid(c, s, t, camX, VW, th, state) {
    if (s.crumble) {
      const k = state && state.crumbles.find((q) => q.s === s), sh = k && k.hit >= 0 ? Math.sin(t * 60) * 2 : 0, fade = k && k.hit >= 0 ? 1 - Math.min(1, (state.time - k.hit) / 0.55) * 0.35 : 1;
      c.save(); c.globalAlpha = fade; c.translate(sh, 0);
      const g = c.createLinearGradient(0, s.y, 0, s.y + s.h); g.addColorStop(0, '#d9c7a3'); g.addColorStop(1, '#a8916a');
      c.fillStyle = g; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.roundRect ? c.roundRect(s.x, s.y, s.w, s.h, 7) : c.rect(s.x, s.y, s.w, s.h); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(60,40,20,.45)'; c.lineWidth = 2; c.beginPath();
      c.moveTo(s.x + s.w * 0.3, s.y + 2); c.lineTo(s.x + s.w * 0.36, s.y + s.h * 0.5); c.lineTo(s.x + s.w * 0.3, s.y + s.h - 2);
      c.moveTo(s.x + s.w * 0.7, s.y + 2); c.lineTo(s.x + s.w * 0.62, s.y + s.h * 0.55); c.lineTo(s.x + s.w * 0.68, s.y + s.h - 2); c.stroke();
      c.restore(); return;
    }
    if (s.belt) {
      c.fillStyle = '#4a4f57'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.roundRect ? c.roundRect(s.x, s.y, s.w, s.h, 12) : c.rect(s.x, s.y, s.w, s.h); c.fill(); c.stroke();
      c.save(); c.beginPath(); c.rect(s.x + 4, s.y, s.w - 8, s.h); c.clip();
      c.strokeStyle = '#ffd23f'; c.lineWidth = 4; const off = ((t * s.vx * 0.5) % 28 + 28) % 28, d = s.vx >= 0 ? 1 : -1;
      for (let x = s.x - 28 + off; x < s.x + s.w + 28; x += 28) { c.beginPath(); c.moveTo(x - 6 * d, s.y + 5); c.lineTo(x + 2 * d, s.y + s.h / 2); c.lineTo(x - 6 * d, s.y + s.h - 5); c.stroke(); }
      c.restore();
      c.fillStyle = '#2a2d33'; for (const x of [s.x + 8, s.x + s.w - 8]) { c.beginPath(); c.arc(x, s.y + s.h / 2, 9, 0, 7); c.fill(); c.stroke(); c.save(); c.translate(x, s.y + s.h / 2); c.rotate(t * s.vx * 0.05); c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.moveTo(0, -6); c.lineTo(0, 6); c.stroke(); c.restore(); }
      return;
    }
    if (s.gate) {
      c.fillStyle = '#5a6270'; c.strokeStyle = INK; c.lineWidth = 3; c.fillRect(s.x, s.y, s.w, s.h); c.strokeRect(s.x, s.y, s.w, s.h);
      c.fillStyle = '#e2584d'; for (let y = s.y + 18; y < s.y + s.h - 10; y += 40) { c.fillRect(s.x + 4, y, s.w - 8, 12); c.strokeRect(s.x + 4, y, s.w - 8, 12); }
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(s.x + s.w / 2, s.y + 12, 7, 0, 7); c.fill(); c.stroke();
      return;
    }
  }

  function draw(c, m, camX, camY, VW, VH, t, world) {
    // zones
    for (const z of m.zones) {
      if (z.x > camX + VW || z.x + z.w < camX) continue;
      c.save(); c.beginPath(); c.rect(z.x, z.y, z.w, z.h); c.clip();
      if (z.kind === 'fan') {
        const g = c.createLinearGradient(0, z.y + z.h, 0, z.y); g.addColorStop(0, 'rgba(190,235,255,.4)'); g.addColorStop(1, 'rgba(190,235,255,0)'); c.fillStyle = g; c.fillRect(z.x, z.y, z.w, z.h);
        c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.lineCap = 'round';
        for (let i = 0; i < 9; i++) { const u = ((t * 0.9 + i * 0.37) % 1), x = z.x + 10 + ((i * 53) % (z.w - 20)), y = z.y + z.h - u * z.h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(u * 9 + i) * 5, y - 26); c.stroke(); }
      } else if (z.kind === 'current') {
        const dir = Math.sign(z.ax) || 1;
        c.fillStyle = 'rgba(190,240,255,.10)'; c.fillRect(z.x, z.y, z.w, z.h);
        c.strokeStyle = 'rgba(220,250,255,.55)'; c.lineWidth = 3; c.lineCap = 'round';
        for (let i = 0; i < 12; i++) { const u = (((t * 0.35 * dir + i * 0.137) % 1) + 1) % 1, x = z.x + u * z.w, y = z.y + ((i * 83) % Math.max(20, z.h - 20)) + 10; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dir * 34, y); c.stroke(); }
      } else {
        const anti = z.g < 0, col = anti ? [255, 120, 200] : [150, 130, 255];
        const g = c.createLinearGradient(0, z.y, 0, z.y + z.h); g.addColorStop(0, 'rgba(' + col + ',.16)'); g.addColorStop(1, 'rgba(' + col + ',.05)'); c.fillStyle = g; c.fillRect(z.x, z.y, z.w, z.h);
        c.fillStyle = 'rgba(' + col + ',.8)';
        for (let i = 0; i < 26; i++) { const u = ((t * (anti ? -0.12 : 0.05) + i * 0.173) % 1 + 1) % 1, x = z.x + ((i * 97) % z.w), y = z.y + (anti ? 1 - u : u) * z.h; c.beginPath(); c.arc(x, y, 1.8 + (i % 3), 0, 7); c.fill(); }
        if (anti) { c.strokeStyle = 'rgba(255,170,220,.7)'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { const y = z.y + z.h - ((t * 50 + i * z.h / 4) % z.h); const x = z.x + z.w / 2; c.beginPath(); c.moveTo(x - 14, y + 10); c.lineTo(x, y - 6); c.lineTo(x + 14, y + 10); c.stroke(); } }
      }
      c.restore();
    }
    // fan bases
    for (const z of m.zones) if (z.kind === 'fan') {
      const cx = z.x + z.w / 2, by = z.y + z.h - 80;
      c.save(); c.translate(cx, by + 80); c.fillStyle = '#6d7684'; c.strokeStyle = INK; c.lineWidth = 3; c.fillRect(-34, -14, 68, 14); c.strokeRect(-34, -14, 68, 14);
      c.save(); c.translate(0, -18); for (let i = 0; i < 3; i++) { c.rotate(t * 18 + i * 2.094); c.fillStyle = '#c8d0da'; c.beginPath(); c.ellipse(0, -14, 5, 15, 0, 0, 7); c.fill(); c.stroke(); } c.restore();
      c.restore();
    }
    // saws
    for (const s of m.saws) {
      const p = sawPos(s, world.time);
      if (p.x < camX - 80 || p.x > camX + VW + 80) continue;
      if (s.ax || s.ay) { c.strokeStyle = 'rgba(40,40,50,.35)'; c.lineWidth = 4; c.setLineDash([6, 8]); c.beginPath(); c.moveTo(s.x - s.ax, s.y - s.ay); c.lineTo(s.x + s.ax, s.y + s.ay); c.stroke(); c.setLineDash([]); }
      c.save(); c.translate(p.x, p.y); c.rotate(t * 9 * (s.ph > 0.5 ? -1 : 1));
      c.fillStyle = '#c9ced6'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath();
      const n = 14; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * 6.2832, r = i % 2 ? s.r * 0.78 : s.r * 1.04; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#e2584d'; c.beginPath(); c.arc(0, 0, s.r * 0.3, 0, 7); c.fill(); c.stroke(); c.restore();
    }
    // portals
    for (const p of m.portals) for (const [pt, k] of [[p.a, 0], [p.b, 1]]) {
      if (pt[0] < camX - 80 || pt[0] > camX + VW + 80) continue;
      const hue = (p.hue == null ? 280 : p.hue) + k * 140;
      c.save(); c.translate(pt[0], pt[1]);
      const g = c.createRadialGradient(0, 0, 4, 0, 0, 52); g.addColorStop(0, 'hsla(' + hue + ',90%,75%,.9)'); g.addColorStop(0.6, 'hsla(' + hue + ',90%,55%,.5)'); g.addColorStop(1, 'hsla(' + hue + ',90%,55%,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 36, 54, 0, 0, 7); c.fill();
      c.strokeStyle = 'hsl(' + hue + ',90%,70%)'; c.lineWidth = 4; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, 0, 14 + i * 7 + Math.sin(t * 4 + i) * 2, 24 + i * 10, t * (i % 2 ? 1 : -1) * 0.6, 0, 3.6); c.stroke(); }
      c.restore();
    }
    // gate buttons
    for (const g of m.gates) {
      const b = g.btn; c.save(); c.strokeStyle = INK; c.lineWidth = 3;
      c.fillStyle = '#4a4f57'; c.fillRect(b[0] - 6, b[1] + 4, b[2] + 12, 10); c.strokeRect(b[0] - 6, b[1] + 4, b[2] + 12, 10);
      c.fillStyle = g.open ? '#6ee06a' : '#e2584d'; const h = g.open ? 4 : 10; c.beginPath(); c.roundRect ? c.roundRect(b[0], b[1] + 4 - h, b[2], h, 4) : c.rect(b[0], b[1] + 4 - h, b[2], h); c.fill(); c.stroke();
      c.restore();
    }
  }

  const api = { build, tick, draw, drawSolid, sawPos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Mech = api;
})(typeof window !== 'undefined' ? window : globalThis);
