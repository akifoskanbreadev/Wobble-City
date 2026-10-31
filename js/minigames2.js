/*
 * Wobble City minigames, part 2: themed backdrops for every minigame plus ten new games.
 * Same contract as minigames.js: { id, name, icon, desc, fmt, reward, create(host) } and
 * instances { update(dt), draw(), key?(code, down), destroy?(), goose?, cam?() }.
 */
(function (root) {
  'use strict';
  const MG = root.Minigames;
  const INK = '#1f2a36';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const R = () => Math.random();           // looked up per call so seeded duels stay in sync
  const fmtPts = (s) => s + ' pts';

  // ======================================================================= backdrops
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fill(); }
  function fillBg(c, W, H, a, b) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  function stars(c, W, H, t, n) { for (let i = 0; i < n; i++) { c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.6 + hash(i) * 1.4) + i)); c.fillStyle = '#fff'; const s = hash(i + 9) > 0.9 ? 3 : 2; c.fillRect(hash(i + 1) * W, hash(i + 2) * H * 0.75, s, s); } c.globalAlpha = 1; }
  function bird(c, x, y, s, t) { c.strokeStyle = 'rgba(30,40,60,.55)'; c.lineWidth = 2; const f = Math.sin(t * 7 + x) * 5 * s; c.beginPath(); c.moveTo(x - 9 * s, y - f); c.quadraticCurveTo(x - 4 * s, y - 5 * s, x, y); c.quadraticCurveTo(x + 4 * s, y - 5 * s, x + 9 * s, y - f); c.stroke(); }

  const SCENES = {
    city(c, W, H, t) {                                        // night skyline with lit windows
      fillBg(c, W, H, '#0b1030', '#3a2f6a'); stars(c, W, H, t, 60);
      c.fillStyle = '#f6f1d6'; c.beginPath(); c.arc(W * 0.82, H * 0.18, 26, 0, 7); c.fill(); c.fillStyle = '#d8d3b4'; c.beginPath(); c.arc(W * 0.82 - 8, H * 0.18 - 6, 5, 0, 7); c.arc(W * 0.82 + 8, H * 0.18 + 8, 4, 0, 7); c.fill();
      for (let layer = 0; layer < 2; layer++) {
        const base = H - 10, n = Math.ceil(W / 46) + 1;
        for (let i = 0; i < n; i++) {
          const h = (60 + hash(i + layer * 50) * 150) * (layer ? 0.75 : 1), w = 40 + hash(i + 3) * 26, x = i * 46 - 10 * layer;
          c.fillStyle = layer ? '#1c1f4a' : '#262a5e'; c.fillRect(x, base - h, w, h);
          c.fillStyle = layer ? '#2d3170' : '#3a3f86';
          for (let wy = base - h + 8; wy < base - 8; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 12) if (hash(wx * 0.31 + wy * 0.17 + i) > 0.55) { c.fillStyle = hash(wx + wy) > 0.5 ? '#ffd86b' : '#9fc2ff'; c.globalAlpha = layer ? 0.35 : 0.8; c.fillRect(wx, wy, 5, 7); } c.globalAlpha = 1;
        }
      }
    },
    clouds(c, W, H, t) {                                       // daytime sky with big drifting clouds
      fillBg(c, W, H, '#5ab0ff', '#d9f1ff');
      c.fillStyle = '#9ec7e8'; poly(c, [[0, H], [0, H * 0.78], [W * 0.15, H * 0.62], [W * 0.3, H * 0.76], [W * 0.5, H * 0.58], [W * 0.7, H * 0.76], [W * 0.88, H * 0.64], [W, H * 0.78], [W, H]]);
      for (let i = 0; i < 6; i++) { const x = ((i * 220 + t * (8 + i * 3)) % (W + 300)) - 150, y = 60 + (i * 83) % (H * 0.6), s = 0.8 + hash(i) * 0.9; window.Clouds.one(c, x, y, 240 * s, 0.6 + hash(i + 4) * 0.4, 'day', i); }
      for (let i = 0; i < 4; i++) bird(c, ((i * 260 + t * 40) % (W + 100)) - 50, 80 + i * 55 + Math.sin(t + i) * 10, 1, t);
    },
    bakery(c, W, H, t) {                                       // pink bakery with bunting and cupcakes
      fillBg(c, W, H, '#ffc1e6', '#fff3fb');
      c.fillStyle = '#f7a6d4'; for (let i = 0; i < 6; i++) { const x = i * W / 5; c.beginPath(); c.arc(x, H + 20, 130 + hash(i) * 40, Math.PI, 0); c.fill(); }
      for (let i = 0; i < 5; i++) { const x = (i + 0.5) * W / 5, y = H - 60 - hash(i + 2) * 40; c.fillStyle = '#e8b27a'; poly(c, [[x - 22, y], [x + 22, y], [x + 16, y + 34], [x - 16, y + 34]]); c.fillStyle = ['#ff6fb5', '#fff', '#8be0d0', '#ffd23f', '#c98cff'][i]; c.beginPath(); c.arc(x, y - 4, 26, Math.PI, 0); c.fill(); c.fillStyle = '#e63946'; c.beginPath(); c.arc(x, y - 30, 5, 0, 7); c.fill(); }
      c.strokeStyle = '#7a4b6a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 24); c.quadraticCurveTo(W / 2, 74, W, 24); c.stroke();
      const cols = ['#ff5c8a', '#ffd23f', '#6bd6ff', '#9be564', '#c98cff'];
      for (let i = 0; i < 14; i++) { const u = (i + 0.5) / 14, x = u * W, y = 24 + Math.sin(u * Math.PI) * 50 + Math.sin(t * 2 + i) * 2; c.fillStyle = cols[i % 5]; poly(c, [[x - 11, y], [x + 11, y], [x, y + 22]]); }
      for (let i = 0; i < 30; i++) { c.fillStyle = cols[i % 5]; c.fillRect(((hash(i) * W + t * 12 * (1 + hash(i + 3))) % W), (hash(i + 5) * H * 0.9 + t * 20) % H, 6, 2); }
    },
    reeds(c, W, H, t) {                                        // sunset pond, reeds, dragonflies
      fillBg(c, W, H, '#ff9a76', '#ffe2a8');
      c.fillStyle = '#ffd66b'; c.beginPath(); c.arc(W * 0.3, H * 0.62, 60, 0, 7); c.fill();
      c.fillStyle = '#7d4c63'; poly(c, [[0, H * 0.66], [W * 0.2, H * 0.5], [W * 0.4, H * 0.64], [W * 0.62, H * 0.48], [W * 0.85, H * 0.62], [W, H * 0.55], [W, H * 0.7], [0, H * 0.7]]);
      const wg = c.createLinearGradient(0, H * 0.68, 0, H); wg.addColorStop(0, '#f0907a'); wg.addColorStop(1, '#3d4f7c'); c.fillStyle = wg; c.fillRect(0, H * 0.68, W, H * 0.32);
      c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { const y = H * 0.7 + i * (H * 0.03), x = (hash(i) * W + t * 10) % W; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 40, y); c.stroke(); }
      for (let i = 0; i < 18; i++) { const x = i * (W / 17), h = 60 + hash(i) * 60, sw = Math.sin(t * 1.4 + i) * 5; c.strokeStyle = '#2f4a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, H); c.quadraticCurveTo(x + sw, H - h / 2, x + sw * 1.6, H - h); c.stroke(); if (i % 3 === 0) { c.fillStyle = '#6b3d2a'; c.fillRect(x + sw * 1.6 - 3, H - h - 22, 6, 24); } }
      for (let i = 0; i < 3; i++) { const x = (i * 300 + t * 30) % (W + 80) - 40, y = H * 0.55 + Math.sin(t * 2 + i) * 14; c.fillStyle = '#3fd0c9'; c.fillRect(x, y, 14, 2); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(x + 4, y - 3, 6, 2, 0.3, 0, 7); c.ellipse(x + 8, y - 3, 6, 2, -0.3, 0, 7); c.fill(); }
    },
    stage(c, W, H, t) {                                        // theatre: curtains and spotlights
      fillBg(c, W, H, '#1a0f24', '#4a2250');
      for (let i = 0; i < 3; i++) { const x = W * (0.2 + i * 0.3), sw = Math.sin(t * 0.8 + i) * 40; const g = c.createLinearGradient(x, 0, x + sw, H); g.addColorStop(0, 'rgba(255,240,190,.5)'); g.addColorStop(1, 'rgba(255,240,190,0)'); c.fillStyle = g; poly(c, [[x - 6, 0], [x + 6, 0], [x + sw + 90, H], [x + sw - 90, H]]); }
      c.fillStyle = '#7a1f2e'; for (const side of [0, 1]) { const w = Math.min(120, W * 0.16); for (let i = 0; i < 4; i++) { const x = side ? W - w + i * (w / 4) : i * (w / 4); c.fillStyle = i % 2 ? '#8f2536' : '#701b2a'; c.fillRect(x, 0, w / 4 + 1, H); } }
      c.fillStyle = '#c9a050'; c.fillRect(0, 0, W, 14); c.fillStyle = '#5a3a1e'; c.fillRect(0, H - 40, W, 40); c.fillStyle = '#7a5230'; for (let i = 0; i < W; i += 60) c.fillRect(i, H - 40, 2, 40);
    },
    space(c, W, H, t) {
      fillBg(c, W, H, '#05061a', '#201a4a'); stars(c, W, H, t, 90);
      const px = W * 0.78, py = H * 0.3; const g = c.createRadialGradient(px - 10, py - 10, 4, px, py, 54); g.addColorStop(0, '#ffb870'); g.addColorStop(1, '#a8432c'); c.fillStyle = g; c.beginPath(); c.arc(px, py, 50, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,225,180,.6)'; c.lineWidth = 4; c.beginPath(); c.ellipse(px, py, 82, 16, -0.4, 0, 7); c.stroke();
      c.fillStyle = '#4e7bd4'; c.beginPath(); c.arc(W * 0.15, H * 0.7, 22, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(W * 0.15 - 6, H * 0.7 - 6, 8, 0, 7); c.fill();
    },
    arcade(c, W, H, t) {                                       // neon grid
      fillBg(c, W, H, '#10002b', '#3c096c');
      const hz = H * 0.55; c.fillStyle = '#ff2e93'; c.beginPath(); c.arc(W / 2, hz, 90, Math.PI, 0); c.fill(); c.fillStyle = '#10002b'; for (let i = 0; i < 5; i++) c.fillRect(W / 2 - 90, hz - 14 - i * 14, 180, 2 + i);
      c.strokeStyle = 'rgba(0,229,255,.7)'; c.lineWidth = 1.5;
      for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(W / 2 + i * 12, hz); c.lineTo(W / 2 + i * (W / 12), H); c.stroke(); }
      for (let i = 0; i < 9; i++) { const u = ((i + t * 0.4) % 9) / 9, y = hz + u * u * (H - hz); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    },
    beach(c, W, H, t) {
      fillBg(c, W, H, '#6ed0ff', '#fff4d0');
      c.fillStyle = '#fff3a0'; c.beginPath(); c.arc(W * 0.85, H * 0.18, 34, 0, 7); c.fill();
      c.fillStyle = '#2aa7d8'; c.fillRect(0, H * 0.55, W, H * 0.2);
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); for (let x = 0; x <= W; x += 20) { const y = H * 0.56 + i * 14 + Math.sin(x * 0.04 + t * 2 + i) * 3; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
      c.fillStyle = '#f2d590'; poly(c, [[0, H], [0, H * 0.78], [W * 0.5, H * 0.74], [W, H * 0.8], [W, H]]);
      for (const px of [W * 0.1, W * 0.92]) { c.strokeStyle = '#6b4a2a'; c.lineWidth = 6; c.beginPath(); c.moveTo(px, H * 0.8); c.quadraticCurveTo(px + 14, H * 0.55, px + 4, H * 0.38); c.stroke(); c.fillStyle = '#3f9d4a'; for (let k = 0; k < 5; k++) { const a = -0.4 + k * 0.9 + Math.sin(t + k) * 0.05; c.beginPath(); c.ellipse(px + 4 + Math.cos(a) * 22, H * 0.38 + Math.sin(a) * 10, 28, 7, a, 0, 7); c.fill(); } }
    },
    farm(c, W, H, t) {
      fillBg(c, W, H, '#8fd0ff', '#f4fbff');
      c.fillStyle = '#a5d97a'; poly(c, [[0, H], [0, H * 0.7], [W * 0.3, H * 0.62], [W * 0.6, H * 0.7], [W, H * 0.6], [W, H]]); c.fillStyle = '#86c45f'; poly(c, [[0, H], [0, H * 0.82], [W * 0.5, H * 0.74], [W, H * 0.84], [W, H]]);
      const bx = W * 0.14, by = H * 0.72; c.fillStyle = '#b53a2c'; c.fillRect(bx, by - 70, 110, 70); poly(c, [[bx - 8, by - 70], [bx + 55, by - 112], [bx + 118, by - 70]]); c.fillStyle = '#fff'; c.fillRect(bx + 40, by - 40, 30, 40); c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(bx + 40, by - 40, 30, 40); c.beginPath(); c.moveTo(bx + 40, by - 40); c.lineTo(bx + 70, by); c.moveTo(bx + 70, by - 40); c.lineTo(bx + 40, by); c.stroke();
      c.fillStyle = '#c9ccd2'; c.fillRect(bx + 120, by - 100, 20, 100); c.fillStyle = '#e9ecf2'; poly(c, [[bx + 116, by - 100], [bx + 130, by - 120], [bx + 144, by - 100]]);
      c.strokeStyle = '#d9c9a0'; c.lineWidth = 4; for (let x = W * 0.45; x < W; x += 36) { c.beginPath(); c.moveTo(x, H * 0.8); c.lineTo(x, H * 0.72); c.stroke(); } c.beginPath(); c.moveTo(W * 0.45, H * 0.75); c.lineTo(W, H * 0.75); c.moveTo(W * 0.45, H * 0.78); c.lineTo(W, H * 0.78); c.stroke();
      for (let i = 0; i < 3; i++) bird(c, ((i * 330 + t * 28) % (W + 80)) - 40, 70 + i * 40, 0.9, t);
    },
    desert(c, W, H, t) {
      fillBg(c, W, H, '#ffb259', '#ffe9b8');
      c.fillStyle = '#fff3c0'; c.beginPath(); c.arc(W * 0.5, H * 0.46, 64, 0, 7); c.fill();
      c.fillStyle = '#c98353'; poly(c, [[0, H * 0.7], [W * 0.12, H * 0.5], [W * 0.2, H * 0.5], [W * 0.3, H * 0.7]]); poly(c, [[W * 0.62, H * 0.7], [W * 0.75, H * 0.44], [W * 0.84, H * 0.44], [W * 0.95, H * 0.7]]);
      c.fillStyle = '#e8b36a'; poly(c, [[0, H], [0, H * 0.78], [W * 0.4, H * 0.7], [W, H * 0.8], [W, H]]);
      for (const [x, s] of [[W * 0.2, 1], [W * 0.88, 1.3]]) { const y = H * 0.82; c.fillStyle = '#3f7d4a'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.roundRect ? c.roundRect(x - 9 * s, y - 70 * s, 18 * s, 70 * s, 9 * s) : c.rect(x - 9 * s, y - 70 * s, 18 * s, 70 * s); c.fill(); c.stroke(); c.beginPath(); c.roundRect ? c.roundRect(x - 30 * s, y - 50 * s, 14 * s, 8 * s, 4) : c.rect(x - 30 * s, y - 50 * s, 14 * s, 8 * s); c.fill(); c.stroke(); }
      const tx = ((t * 40) % (W + 120)) - 60; c.fillStyle = '#a07040'; c.beginPath(); c.arc(tx, H * 0.86 - Math.abs(Math.sin(t * 5)) * 8, 12, 0, 7); c.fill();
    },
    forest(c, W, H, t) {
      fillBg(c, W, H, '#1c3a2a', '#6aa86a');
      for (let layer = 0; layer < 3; layer++) { c.fillStyle = ['#2a5a3a', '#1f4a30', '#16382a'][layer]; for (let i = 0; i < 14; i++) { const x = i * W / 12 - layer * 17 + (layer * 41) % 30, h = 90 + hash(i + layer * 7) * 90 + layer * 30, w = 46 + layer * 10; poly(c, [[x, H - 40 + layer * 10], [x + w / 2, H - 40 + layer * 10 - h], [x + w, H - 40 + layer * 10]]); } }
      for (let i = 0; i < 22; i++) { const x = (hash(i) * W + Math.sin(t * 0.5 + i) * 30 + W) % W, y = H * 0.35 + hash(i + 2) * H * 0.5 + Math.cos(t * 0.7 + i) * 14; c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)); c.fillStyle = '#e8ff7a'; c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); } c.globalAlpha = 1;
    },
  };
  MG.scene = (ctx, kind, W, H, clock) => { const f = SCENES[kind]; if (f) { ctx.save(); f(ctx, W, H, clock || 0); ctx.restore(); } };

  // existing games get a theme + backdrop
  const THEME = { tetris: ['night', 'city'], up: ['meadow', 'clouds'], bread: ['candy', 'bakery'], flappy: ['sunset', 'reeds'], honk: ['night', 'stage'] };
  MG.list.forEach((m) => { const t = THEME[m.id]; if (t) { m.theme = t[0]; m.deco = t[1]; } });

  // ======================================================================= shared helpers
  function frame(host, lw, lh) { const W = host.W, H = host.H, s = Math.min(W / lw, H / lh); return { s, ox: (W - lw * s) / 2, oy: (H - lh * s) / 2 }; }
  function toLogical(host, f, e) { const r = host.ctx.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - f.ox) / f.s, y: (e.clientY - r.top - f.oy) / f.s }; }
  function onTap(host, fn) { const cv = host.ctx.canvas; const h = (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; fn(e); }; cv.addEventListener('pointerdown', h); return () => cv.removeEventListener('pointerdown', h); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function say(c, text, x, y, size, col) { c.save(); c.font = '800 ' + size + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(text, x, y); c.fillStyle = col || INK; c.fillText(text, x, y); c.restore(); }
  function miniGoose(c, x, y, s, f, t) {                       // quick vector goose for games that need no physics
    c.save(); c.translate(x, y); c.scale(s * f, s); c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = INK; c.lineWidth = 9; c.beginPath(); c.moveTo(10, -8); c.quadraticCurveTo(24, -22, 18, -38); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.moveTo(10, -8); c.quadraticCurveTo(24, -22, 18, -38); c.stroke();
    c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 22, 14, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#e8eef5'; c.beginPath(); c.ellipse(-4, -2 + Math.sin((t || 0) * 8) * 1.5, 11, 7, -0.3, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.arc(18, -40, 8, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke();
    c.fillStyle = '#ff9b2f'; poly(c, [[24, -42], [36, -39], [24, -36]]); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(20, -42, 1.8, 0, 7); c.fill();
    c.strokeStyle = '#ff9b2f'; c.lineWidth = 3; c.beginPath(); c.moveTo(-5, 12); c.lineTo(-5, 22); c.moveTo(7, 12); c.lineTo(7, 22); c.stroke();
    c.restore();
  }
  function burst(list, x, y, col, n) { for (let i = 0; i < n; i++) { const a = R() * 6.28, v = 60 + R() * 220; list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.5 + R() * 0.4, t: 0, col }); } }
  function stepParts(list, dt) { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.t += dt; p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > p.life) list.splice(i, 1); } }
  function drawParts(c, list) { for (const p of list) { c.globalAlpha = clamp(1 - p.t / p.life, 0, 1); c.fillStyle = p.col; c.fillRect(p.x - 2, p.y - 2, 4, 4); } c.globalAlpha = 1; }
  function makeWorld(host, x, y) {
    const world = new host.Physics.World(); const goose = new host.Physics.Goose(world, x, y, host.gooseOpts());
    const box = (bx, by, w, h) => { world.solids.push({ x: bx, y: by, w, h, vx: 0, vy: 0 }); };
    return { world, goose, box };
  }
  function steer(host, goose, world, dt) {
    const inp = host.readInput();
    if (inp.flap && goose.stamina >= 1 && goose.flapCd <= 0) host.snd.flap();
    if (inp.honk) { goose.honk(); host.snd.honk(); }
    goose.update(dt, { move: inp.move, flap: inp.flap, glide: inp.glide, aim: inp.aim });
    world.step(dt);
  }
  const groundWorld = (host) => { const w = makeWorld(host, 450, 475); w.box(-300, 520, 1500, 600); w.box(-300, -3000, 300, 4000); w.box(900, -3000, 300, 4000); return w; };
  function groundDraw(host, c, sc) { c.fillStyle = '#7a5230'; c.fillRect(-300, 520, 1500, 600); c.fillStyle = '#5fc24c'; c.fillRect(-300, 520, 1500, 12); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(-300, 520); c.lineTo(1200, 520); c.stroke(); c.fillStyle = 'rgba(31,42,54,.25)'; c.fillRect(-300, -300, 300, 820); c.fillRect(900, -300, 300, 820); }

  // ======================================================================= POND DASH (runner)
  function createDash(host) {
    const c = host.ctx; let jumpQ = false, over = false, t = 0, dist = 0, bread = 0, vy = 0, y = 0, jumps = 2, sx = 0, nextX = 700, hint = 3, shake = 0;
    const obs = [], parts = [];
    host.controls([{ label: 'JUMP', side: 'R', big: true, down: () => { jumpQ = true; } }]);
    const off = onTap(host, () => { jumpQ = true; });
    const spd = () => 300 + Math.min(320, t * 8);
    return {
      key(code, down) { if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') { if (down) jumpQ = true; return true; } return false; },
      destroy() { off(); },
      update(dt) {
        if (over) return;
        t += dt; hint -= dt; shake = Math.max(0, shake - dt * 3);
        const v = spd(); sx += v * dt; dist += v * dt / 40;
        if (jumpQ) { jumpQ = false; if (jumps > 0) { vy = jumps === 2 ? 640 : 540; jumps--; host.snd.flap(); burst(parts, 140, 380 - y, '#fff', 6); } }
        vy -= 1750 * dt; y += vy * dt; if (y <= 0) { y = 0; vy = 0; jumps = 2; }
        while (nextX < sx + 1100) {
          const r = R();
          if (r < 0.3) obs.push({ k: 'log', x: nextX, w: 46, h: 44, y: 0 });
          else if (r < 0.52) obs.push({ k: 'reed', x: nextX, w: 28, h: 92, y: 0 });
          else if (r < 0.72) obs.push({ k: 'crow', x: nextX, w: 42, h: 26, y: 36 + R() * 90, ph: R() * 6 });
          else { for (let i = 0; i < 4; i++) obs.push({ k: 'bread', x: nextX + i * 40, w: 24, h: 24, y: 50 + Math.sin(i * 0.9) * 40 + 30, got: false }); }
          nextX += 380 + R() * 260 + v * 0.35;
        }
        const gx = sx + 140, g = { x0: gx - 15, x1: gx + 15, y0: y + 4, y1: y + 46 };
        for (let i = obs.length - 1; i >= 0; i--) {
          const o = obs[i]; if (o.x < sx - 100) { obs.splice(i, 1); continue; }
          const ox = o.k === 'crow' ? o.x - Math.sin(t * 2 + o.ph) * 0 : o.x, oy = o.k === 'crow' ? o.y + Math.sin(t * 3 + o.ph) * 10 : o.y;
          if (g.x1 > ox + 4 && g.x0 < ox + o.w - 4 && g.y1 > oy + 4 && g.y0 < oy + o.h - 4) {
            if (o.k === 'bread') { if (!o.got) { o.got = true; bread++; host.snd.bread(); burst(parts, 140, 380 - y - 30, '#ffd23f', 5); obs.splice(i, 1); } }
            else { over = true; shake = 1; host.snd.ouch(); host.end(Math.floor(dist) + bread * 5, Math.floor(dist) + ' m and ' + bread + ' bread'); }
          }
        }
        stepParts(parts, dt);
        host.hud({ title: 'Pond Dash', text: Math.floor(dist) + ' m · 🍞 ' + bread });
      },
      draw() {
        const W = host.W, H = host.H, f = frame(host, 800, 480);
        host.drawSky(0, 0);
        c.save(); c.translate(f.ox + (shake ? (R() - 0.5) * 10 * shake : 0), f.oy); c.scale(f.s, f.s);
        c.fillStyle = '#3d2a1a'; c.fillRect(-200, 430, 1200, 200); c.fillStyle = '#5fc24c'; c.fillRect(-200, 424, 1200, 12);
        c.fillStyle = '#4aa03a'; for (let x = -((sx * 1) % 40); x < 1000; x += 40) c.fillRect(x, 424, 3, 8);
        c.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -((sx) % 90); x < 1000; x += 90) { c.beginPath(); c.ellipse(x + 20, 470, 14, 6, 0, 0, 7); c.fill(); }
        c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(-200, 424); c.lineTo(1000, 424); c.stroke();
        for (const o of obs) {
          const x = o.x - sx, base = 424;
          if (o.k === 'log') { c.fillStyle = '#8a5a34'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, x, base - o.h, o.w, o.h, 10); c.fill(); c.stroke(); c.fillStyle = '#b58352'; c.beginPath(); c.ellipse(x + o.w / 2, base - o.h / 2, 9, 13, 0, 0, 7); c.fill(); c.stroke(); }
          else if (o.k === 'reed') { c.strokeStyle = INK; c.lineWidth = 3; c.fillStyle = '#4e8a3a'; for (let i = 0; i < 3; i++) { const bx = x + 6 + i * 9; c.beginPath(); c.moveTo(bx, base); c.quadraticCurveTo(bx + Math.sin(t * 2 + i) * 4, base - o.h * 0.6, bx + (i - 1) * 3, base - o.h + 8 * i); c.stroke(); } c.fillStyle = '#7a4a2a'; rr(c, x + 10, base - o.h - 6, 9, 30, 4); c.fill(); c.stroke(); }
          else if (o.k === 'crow') { const yy = base - o.y - o.h - Math.sin(t * 3 + o.ph) * 10, fl = Math.sin(t * 14 + o.ph) * 10; c.fillStyle = '#2a2d3a'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.ellipse(x + 21, yy + 13, 19, 10, 0, 0, 7); c.fill(); c.stroke(); poly(c, [[x + 14, yy + 8], [x + 26, yy + 8], [x + 20, yy - 8 - fl]]); c.stroke(); c.fillStyle = '#ffb347'; poly(c, [[x + 2, yy + 11], [x - 8, yy + 14], [x + 2, yy + 16]]); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 8, yy + 10, 2, 0, 7); c.fill(); }
          else { c.fillStyle = '#d9993f'; c.strokeStyle = INK; c.lineWidth = 2; rr(c, x, base - o.y - 24, 24, 22, 7); c.fill(); c.stroke(); c.fillStyle = '#f7d79a'; rr(c, x + 5, base - o.y - 19, 14, 12, 4); c.fill(); }
        }
        c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(140, 426, 24 - y * 0.05, 5, 0, 0, 7); c.fill();
        miniGoose(c, 140, 400 - y, 1.1, 1, t * 1.6 + (y > 0 ? 8 : 0));
        drawParts(c, parts);
        if (hint > 0) say(c, 'Tap / Space to jump — double jump allowed!', 400, 120, 22);
        c.restore();
      },
    };
  }

  // ======================================================================= WHACK-A-FOX
  function createFox(host) {
    const c = host.ctx; const { world, goose } = groundWorld(host);
    const holes = [0, 1, 2, 3, 4].map((i) => ({ x: 110 + i * 170, st: 'idle', t: 0, dur: 1, kind: 'fox', hit: false, wait: 0.5 + R() * 1.5 }));
    let time = 45, score = 0, over = false, elapsed = 0, msg = '', msgT = 0, sc = 1, camX = 0, camY = 0; const parts = [];
    host.controls('std');
    return {
      goose, cam: () => ({ x: camX, y: camY, s: sc }),
      update(dt) {
        if (over) return;
        steer(host, goose, world, dt); elapsed += dt; time -= dt; msgT = Math.max(0, msgT - dt);
        const hd = goose.head, busy = holes.filter((h) => h.st !== 'idle').length;
        for (const h of holes) {
          if (h.st === 'idle') { h.wait -= dt; if (h.wait <= 0 && busy < 2 + Math.min(2, (elapsed / 15) | 0)) { const r = R(); h.kind = r < 0.14 ? 'gold' : r < 0.32 ? 'badger' : 'fox'; h.st = 'up'; h.t = 0; h.hit = false; h.dur = Math.max(0.7, 1.5 - elapsed * 0.012); } else if (h.wait <= 0) h.wait = 0.3; }
          else { h.t += dt; if (h.st === 'up' && h.t > h.dur) h.st = 'down', h.t = 0; else if (h.st === 'down' && h.t > 0.25) { h.st = 'idle'; h.wait = 0.3 + R() * (1.6 - Math.min(1, elapsed / 60)); } }
          const k = h.st === 'up' ? Math.min(1, h.t / 0.18) : h.st === 'down' ? 1 - h.t / 0.25 : 0;
          if (!h.hit && k > 0.45 && Math.hypot(hd.x - h.x, hd.y - (520 - k * 52 - 14)) < 34) {
            h.hit = true; h.st = 'down'; h.t = 0.05;
            if (h.kind === 'badger') { score = Math.max(0, score - 3); host.snd.ouch(); msg = 'Oops! -3'; burst(parts, h.x, 480, '#888', 8); }
            else { const v = h.kind === 'gold' ? 5 : 1; score += v; host.snd.bread(); msg = '+' + v; burst(parts, h.x, 480, h.kind === 'gold' ? '#ffd23f' : '#ff8a3d', 10); }
            msgT = 0.7;
          }
        }
        stepParts(parts, dt);
        host.hud({ title: 'Whack-a-Fox', text: 'Score ' + score + ' · ' + Math.max(0, Math.ceil(time)) + 's' });
        if (time <= 0) { over = true; host.end(score, 'You bonked ' + score + ' points of foxes'); }
      },
      draw() {
        const W = host.W, H = host.H; sc = Math.min(W / 940, H / 560); camX = 450 - W / (2 * sc); camY = 285 - H / (2 * sc);
        host.drawSky(0, 0); c.save(); c.scale(sc, sc); c.translate(-camX, -camY); groundDraw(host, c, sc);
        for (const h of holes) {
          c.fillStyle = '#2b1a10'; c.beginPath(); c.ellipse(h.x, 524, 48, 13, 0, 0, 7); c.fill();
          const k = h.st === 'up' ? Math.min(1, h.t / 0.18) : h.st === 'down' ? 1 - h.t / 0.25 : 0;
          if (k > 0.02) {
            c.save(); c.beginPath(); c.rect(h.x - 70, 380, 140, 144); c.clip(); const cy = 524 - k * 70;
            const col = h.kind === 'badger' ? ['#4a4a55', '#d9d9e2'] : h.kind === 'gold' ? ['#ffd23f', '#fff1a8'] : ['#f0792a', '#ffe9d0'];
            c.fillStyle = col[0]; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(h.x, cy, 30, 26, 0, 0, 7); c.fill(); c.stroke();
            poly(c, [[h.x - 26, cy - 14], [h.x - 22, cy - 40], [h.x - 8, cy - 22]]); c.stroke(); poly(c, [[h.x + 26, cy - 14], [h.x + 22, cy - 40], [h.x + 8, cy - 22]]); c.stroke();
            c.fillStyle = col[1]; c.beginPath(); c.ellipse(h.x, cy + 8, 16, 11, 0, 0, 7); c.fill(); c.fillStyle = INK; c.beginPath(); c.arc(h.x - 11, cy - 4, 3, 0, 7); c.arc(h.x + 11, cy - 4, 3, 0, 7); c.fill(); c.beginPath(); c.arc(h.x, cy + 3, 4, 0, 7); c.fill();
            if (h.kind === 'badger') { c.fillStyle = '#fff'; c.fillRect(h.x - 3, cy - 26, 6, 16); }
            c.restore();
          }
          c.fillStyle = '#5fc24c'; c.fillRect(h.x - 52, 516, 12, 8); c.fillRect(h.x + 40, 516, 12, 8);
        }
        host.drawGoose(goose); drawParts(c, parts);
        if (msgT > 0) { const h = goose.head; c.globalAlpha = Math.min(1, msgT * 3); say(c, msg, h.x, h.y - 30, 22); c.globalAlpha = 1; }
        c.restore();
      },
    };
  }

  // ======================================================================= GOOSE SNAKE
  function createSnake(host) {
    const c = host.ctx, COLS = 20, ROWS = 12, CS = 36;
    let body = [[8, 6], [7, 6], [6, 6]], dir = [1, 0], q = [], food = null, tick = 0, score = 0, over = false, t = 0, step = 0.18, pop = 0;
    const parts = [];
    const place = () => { for (let k = 0; k < 200; k++) { const p = [(R() * COLS) | 0, (R() * ROWS) | 0]; if (!body.some((b) => b[0] === p[0] && b[1] === p[1])) { food = p; return; } } };
    place();
    const turn = (d) => { const last = q.length ? q[q.length - 1] : dir; if (d[0] === -last[0] && d[1] === -last[1]) return; if (q.length < 3) q.push(d); };
    const rel = (s) => { const last = q.length ? q[q.length - 1] : dir; turn(s < 0 ? [last[1], -last[0]] : [-last[1], last[0]]); };
    host.controls([{ label: '◀', side: 'L', big: true, down: () => turn([-1, 0]) }, { label: '▶', side: 'L', big: true, down: () => turn([1, 0]) }, { label: '▲', side: 'R', big: true, down: () => turn([0, -1]) }, { label: '▼', side: 'R', big: true, down: () => turn([0, 1]) }]);   // four arrows
    return {
      key(code, down) {
        if (!down) return code.startsWith('Arrow') || 'WASD'.includes(code.slice(3));
        const m = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] }[code];
        if (m) { turn(m); return true; } return false;
      },
      update(dt) {
        if (over) return; t += dt; tick += dt; pop = Math.max(0, pop - dt * 4); stepParts(parts, dt);
        while (tick >= step) {
          tick -= step; if (q.length) dir = q.shift();
          const h = [body[0][0] + dir[0], body[0][1] + dir[1]];
          if (h[0] < 0 || h[1] < 0 || h[0] >= COLS || h[1] >= ROWS || body.slice(0, -1).some((b) => b[0] === h[0] && b[1] === h[1])) { over = true; host.snd.ouch(); host.end(score, 'Your flock grew to ' + body.length + ' goslings'); return; }
          body.unshift(h);
          if (h[0] === food[0] && h[1] === food[1]) { score += 10; host.snd.bread(); pop = 1; burst(parts, h[0] * CS + CS / 2, h[1] * CS + CS / 2, '#ffd23f', 10); place(); step = Math.max(0.075, step - 0.004); } else body.pop();
        }
        host.hud({ title: 'Goose Snake', text: 'Score ' + score + ' · flock ' + body.length });
      },
      draw() {
        const f = frame(host, COLS * CS + 20, ROWS * CS + 20); host.drawSky(0, 0);
        c.save(); c.translate(f.ox + 10 * f.s, f.oy + 10 * f.s); c.scale(f.s, f.s);
        c.fillStyle = '#7ec850'; c.strokeStyle = INK; c.lineWidth = 4; rr(c, -6, -6, COLS * CS + 12, ROWS * CS + 12, 14); c.fill(); c.stroke();
        for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) { c.fillStyle = (i + j) % 2 ? '#74bf48' : '#86d25a'; c.fillRect(i * CS, j * CS, CS, CS); if (hash(i * 13 + j * 7) > 0.85) { c.fillStyle = '#fff'; c.fillRect(i * CS + 10, j * CS + 12, 3, 3); c.fillStyle = '#ffd23f'; c.fillRect(i * CS + 13, j * CS + 12, 2, 2); } }
        c.fillStyle = '#d9993f'; c.strokeStyle = INK; c.lineWidth = 2.5; rr(c, food[0] * CS + 6, food[1] * CS + 7, CS - 12, CS - 14, 7); c.fill(); c.stroke(); c.fillStyle = '#f7d79a'; rr(c, food[0] * CS + 11, food[1] * CS + 12, CS - 22, CS - 24, 4); c.fill();
        for (let i = body.length - 1; i >= 0; i--) {
          const b = body[i], x = b[0] * CS + CS / 2, y = b[1] * CS + CS / 2;
          if (i === 0) {
            c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(x, y, CS * 0.46 * (1 + pop * 0.15), 0, 7); c.fill(); c.stroke();
            c.fillStyle = '#ff9b2f'; const bx = x + dir[0] * 14, by = y + dir[1] * 14; c.beginPath(); c.arc(bx, by, 6, 0, 7); c.fill(); c.stroke();
            c.fillStyle = INK; const px = -dir[1], py = dir[0]; c.beginPath(); c.arc(x + dir[0] * 4 + px * 7, y + dir[1] * 4 + py * 7, 2.4, 0, 7); c.arc(x + dir[0] * 4 - px * 7, y + dir[1] * 4 - py * 7, 2.4, 0, 7); c.fill();
          } else { c.fillStyle = i % 2 ? '#ffe46b' : '#ffd23f'; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, CS * 0.36, 0, 7); c.fill(); c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(x - 4, y - 3, 1.8, 0, 7); c.arc(x + 4, y - 3, 1.8, 0, 7); c.fill(); }
        }
        drawParts(c, parts); c.restore();
      },
    };
  }

  // ======================================================================= SIMON HONK
  function createSimon(host) {
    const c = host.ctx, COL = [['#e63946', '#ff8f98'], ['#3a78ff', '#8fb4ff'], ['#ffd23f', '#fff1a8'], ['#4cc35a', '#a6ecaa']], FREQ = [262, 330, 392, 523];
    const seq = []; let state = 'wait', idx = 0, lit = -1, litT = 0, timer = 1, round = 0, over = false, flash = 0, f = null;
    function play(i) { lit = i; litT = 0.32; host.tone('triangle', FREQ[i], FREQ[i], 0.28, 0.25); }
    function press(i) {
      if (state !== 'input' || over) return; play(i);
      if (seq[idx] !== i) { over = true; host.snd.ouch(); host.end(round, 'You remembered ' + round + (round === 1 ? ' honk' : ' honks')); return; }
      idx++; if (idx >= seq.length) { round++; state = 'wait'; timer = 0.9; host.snd.bread(); }
    }
    host.controls([0, 1, 2, 3].map((i) => ({ label: ['🟥', '🟦', '🟨', '🟩'][i], side: i % 2 ? 'R' : 'L', big: false, down: () => press(i) })));
    const off = onTap(host, (e) => { if (!f) return; const p = toLogical(host, f, e); if (p.x < 190 || p.x > 610 || p.y < 30 || p.y > 450) return; press((p.x > 400 ? 1 : 0) + (p.y > 240 ? 2 : 0)); });
    return {
      key(code, down) { const m = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, KeyQ: 0, KeyW: 1, KeyA: 2, KeyS: 3, ArrowLeft: 0, ArrowUp: 1, ArrowDown: 2, ArrowRight: 3 }[code]; if (m == null) return false; if (down) press(m); return true; },
      destroy() { off(); },
      update(dt) {
        if (over) return; litT = Math.max(0, litT - dt); if (litT <= 0) lit = -1; flash = Math.max(0, flash - dt);
        if (state === 'wait') { timer -= dt; if (timer <= 0) { seq.push((R() * 4) | 0); state = 'show'; idx = 0; timer = 0.5; } }
        else if (state === 'show') { timer -= dt; if (timer <= 0) { if (idx < seq.length) { play(seq[idx]); idx++; timer = Math.max(0.28, 0.62 - seq.length * 0.02); } else { state = 'input'; idx = 0; } } }
        host.hud({ title: 'Simon Honk', text: 'Round ' + (round + 1) + ' · ' + (state === 'input' ? 'your turn!' : 'watch…') });
      },
      draw() {
        f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.fillStyle = '#2b2118'; rr(c, 180, 20, 440, 440, 40); c.fill();
        for (let i = 0; i < 4; i++) {
          const x = 190 + (i % 2) * 210, y = 30 + ((i / 2) | 0) * 210, on = lit === i;
          c.fillStyle = on ? COL[i][1] : COL[i][0]; c.globalAlpha = on ? 1 : 0.85; rr(c, x, y, 200, 200, 26); c.fill(); c.globalAlpha = 1;
          c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
          if (on) { c.fillStyle = 'rgba(255,255,255,.4)'; rr(c, x + 8, y + 8, 184, 184, 20); c.fill(); }
          c.fillStyle = 'rgba(255,255,255,.55)'; rr(c, x + 14, y + 12, 80, 14, 7); c.fill();
          c.fillStyle = 'rgba(0,0,0,.35)'; c.font = '800 28px system-ui'; c.textAlign = 'center'; c.fillText(['Q', 'W', 'A', 'S'][i], x + 100, y + 112);
        }
        miniGoose(c, 400, 255, 1.0, 1, 0); c.restore();
      },
    };
  }

  // ======================================================================= SPACE GOOSE
  function createSpace(host) {
    const c = host.ctx; let x = 400, mv = 0, fire = false, cd = 0, lives = 3, score = 0, over = false, t = 0, spawn = 1, inv = 0, shake = 0;
    const bullets = [], foes = [], shots = [], parts = [], keys = { l: 0, r: 0 };
    host.controls([{ label: '◀', side: 'L', down: () => { keys.l = 1; }, up: () => { keys.l = 0; } }, { label: '▶', side: 'L', down: () => { keys.r = 1; }, up: () => { keys.r = 0; } }, { label: 'HONK', side: 'R', big: true, down: () => { fire = true; } }]);
    return {
      key(code, down) {
        if (code === 'ArrowLeft' || code === 'KeyA') { keys.l = down ? 1 : 0; return true; } if (code === 'ArrowRight' || code === 'KeyD') { keys.r = down ? 1 : 0; return true; }
        if (code === 'Space' || code === 'ArrowUp' || code === 'KeyH') { if (down) fire = true; return true; } return false;
      },
      update(dt) {
        if (over) return; t += dt; cd -= dt; inv = Math.max(0, inv - dt); shake = Math.max(0, shake - dt * 3);
        mv = keys.r - keys.l; x = clamp(x + mv * 420 * dt, 40, 760);
        if (fire) { fire = false; if (cd <= 0) { bullets.push({ x, y: 400 }); cd = 0.24; host.snd.honk && host.tone('square', 520, 260, 0.1, 0.12); } }
        spawn -= dt; if (spawn <= 0) { foes.push({ x: 60 + R() * 680, y: -30, ph: R() * 6, k: R() < 0.25 ? 'big' : 'small', hp: 0, sh: 1 + R() * 2 }); foes[foes.length - 1].hp = foes[foes.length - 1].k === 'big' ? 3 : 1; spawn = Math.max(0.35, 1.1 - t * 0.012); }
        for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; b.y -= 620 * dt; if (b.y < -20) bullets.splice(i, 1); }
        for (let i = foes.length - 1; i >= 0; i--) {
          const e = foes[i]; e.y += (55 + t * 0.9) * dt; e.x += Math.sin(t * 1.6 + e.ph) * 70 * dt; e.sh -= dt;
          if (e.sh <= 0 && e.y > 20 && e.y < 300) { shots.push({ x: e.x, y: e.y + 14 }); e.sh = 1.6 + R() * 2; }
          let dead = false;
          for (let j = bullets.length - 1; j >= 0; j--) { const b = bullets[j]; if (Math.abs(b.x - e.x) < (e.k === 'big' ? 30 : 22) && Math.abs(b.y - e.y) < 18) { bullets.splice(j, 1); e.hp--; burst(parts, b.x, b.y, '#fff', 3); if (e.hp <= 0) { dead = true; break; } } }
          if (dead) { score += e.k === 'big' ? 30 : 10; burst(parts, e.x, e.y, e.k === 'big' ? '#ff8a3d' : '#6bf', 14); host.snd.bread(); foes.splice(i, 1); continue; }
          if (e.y > 520) { foes.splice(i, 1); hurt(); continue; }
          if (inv <= 0 && Math.abs(e.x - x) < 34 && Math.abs(e.y - 410) < 30) { foes.splice(i, 1); burst(parts, e.x, e.y, '#ff6', 12); hurt(); }
        }
        for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.y += 260 * dt; if (s.y > 520) shots.splice(i, 1); else if (inv <= 0 && Math.abs(s.x - x) < 22 && Math.abs(s.y - 410) < 26) { shots.splice(i, 1); hurt(); } }
        stepParts(parts, dt);
        host.hud({ title: 'Space Goose', text: 'Score ' + score + ' · ' + '❤'.repeat(Math.max(0, lives)) });
        function hurt() { lives--; inv = 1.4; shake = 1; host.snd.ouch(); if (lives <= 0) { over = true; host.end(score, 'You zapped ' + Math.floor(score / 10) + ' space gremlins'); } }
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox + (shake ? (R() - 0.5) * 12 * shake : 0), f.oy); c.scale(f.s, f.s);
        for (const e of foes) {
          const big = e.k === 'big'; c.save(); c.translate(e.x, e.y); const s = big ? 1.35 : 1; c.scale(s, s);
          c.fillStyle = big ? '#b06cff' : '#5ad0a0'; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 4, 26, 10, 0, 0, 7); c.fill(); c.stroke();
          c.fillStyle = 'rgba(190,240,255,.85)'; c.beginPath(); c.arc(0, -2, 13, Math.PI, 0); c.fill(); c.stroke();
          c.fillStyle = INK; c.beginPath(); c.arc(-4, -5, 2, 0, 7); c.arc(4, -5, 2, 0, 7); c.fill();
          c.fillStyle = '#ffe46b'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.arc(k * 14, 6 + Math.sin(t * 8 + k) * 1, 2.2, 0, 7); c.fill(); } c.restore();
        }
        c.strokeStyle = '#fff'; c.lineWidth = 3; for (const b of bullets) { c.beginPath(); c.ellipse(b.x, b.y, 7, 12, 0, 0, 7); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#7fe0ff'; c.stroke(); }
        for (const s of shots) { c.fillStyle = '#ff5c6c'; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, 6, 0, 7); c.fill(); c.stroke(); }
        if (!(inv > 0 && Math.floor(t * 12) % 2)) { c.fillStyle = '#ff7a2f'; poly(c, [[x - 8, 428], [x + 8, 428], [x, 452 + Math.sin(t * 40) * 6]]); miniGoose(c, x, 410, 1.1, 1, t); }
        drawParts(c, parts); c.restore();
      },
    };
  }

  // ======================================================================= EGG STACK
  function createStack(host) {
    const c = host.ctx, BH = 30; let W0 = 220;
    const blocks = [{ x: 290, w: 220 }]; let cur = { x: 0, w: 220, dir: 1 }, speed = 260, over = false, drop = false, floors = 0, camY = 0, t = 0, combo = 0, msg = '', msgT = 0; const falls = [], parts = [];
    host.controls([{ label: 'DROP', side: 'R', big: true, down: () => { drop = true; } }]);
    const off = onTap(host, () => { drop = true; });
    return {
      key(code, down) { if (code === 'Space' || code === 'ArrowDown' || code === 'Enter') { if (down) drop = true; return true; } return false; },
      destroy() { off(); },
      update(dt) {
        t += dt; msgT = Math.max(0, msgT - dt);
        for (let i = falls.length - 1; i >= 0; i--) { const f = falls[i]; f.vy += 1400 * dt; f.y += f.vy * dt; f.r += dt * 2 * f.rd; if (f.y > 900) falls.splice(i, 1); }
        stepParts(parts, dt); camY += ((Math.max(0, floors - 6) * BH) - camY) * Math.min(1, dt * 4);
        if (over) return;
        cur.x += cur.dir * speed * dt; if (cur.x < 0) { cur.x = 0; cur.dir = 1; } if (cur.x + cur.w > 800) { cur.x = 800 - cur.w; cur.dir = -1; }
        if (drop) {
          drop = false; const top = blocks[blocks.length - 1], l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w), ov = r - l;
          if (ov <= 0) { falls.push({ x: cur.x, y: 0, w: cur.w, vy: 0, r: 0, rd: 1, i: floors + 1 }); over = true; host.snd.ouch(); host.end(floors, 'Your tower is ' + floors + ' floors high'); return; }
          const perfect = Math.abs(cur.x - top.x) < 5;
          if (perfect) { combo++; cur.x = top.x; msg = combo > 1 ? 'PERFECT x' + combo + '!' : 'Perfect!'; msgT = 0.8; host.snd.bread(); const grow = combo >= 3 ? 12 : 0; blocks.push({ x: top.x - grow / 2, w: Math.min(260, top.w + grow) }); burst(parts, top.x + top.w / 2, 0, '#ffd23f', 12); }
          else {
            combo = 0; host.snd.boing(); if (cur.x < top.x) falls.push({ x: cur.x, y: 0, w: top.x - cur.x, vy: 0, r: 0, rd: -1, i: floors + 1 }); else falls.push({ x: top.x + top.w, y: 0, w: cur.x + cur.w - (top.x + top.w), vy: 0, r: 0, rd: 1, i: floors + 1 });
            blocks.push({ x: l, w: ov });
          }
          floors++; const nb = blocks[blocks.length - 1]; cur = { x: cur.dir > 0 ? 0 : 800 - nb.w, w: nb.w, dir: -cur.dir }; speed = Math.min(620, 260 + floors * 9);
        }
        host.hud({ title: 'Egg Stack', text: 'Floors ' + floors + (combo > 1 ? ' · perfect x' + combo : '') });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        const gy = 440 + camY; c.fillStyle = '#7a5230'; c.fillRect(-200, gy, 1200, 600); c.fillStyle = '#5fc24c'; c.fillRect(-200, gy, 1200, 12); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(-200, gy); c.lineTo(1000, gy); c.stroke();
        const crate = (x, y, w, i) => { const hue = (i * 23) % 360; c.fillStyle = 'hsl(' + (30 + hue % 20) + ',60%,' + (48 + (i % 3) * 4) + '%)'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, x, y, w, BH, 6); c.fill(); c.stroke(); c.strokeStyle = 'rgba(31,42,54,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 8, y + 6); c.lineTo(x + w - 8, y + 6); c.moveTo(x + 8, y + BH - 6); c.lineTo(x + w - 8, y + BH - 6); c.stroke(); if (w > 70) { c.beginPath(); c.moveTo(x + 10, y + 7); c.lineTo(x + w - 10, y + BH - 7); c.stroke(); } };
        blocks.forEach((b, i) => crate(b.x, gy - (i + 1) * BH, b.w, i));
        const ty = gy - (blocks.length + 1) * BH - 30; if (!over) { crate(cur.x, ty, cur.w, floors + 1); c.strokeStyle = 'rgba(31,42,54,.3)'; c.lineWidth = 2; c.setLineDash([5, 6]); c.beginPath(); c.moveTo(cur.x + cur.w / 2, ty + BH); c.lineTo(cur.x + cur.w / 2, gy - blocks.length * BH); c.stroke(); c.setLineDash([]); }
        for (const fl of falls) { c.save(); c.translate(fl.x + fl.w / 2, gy - (blocks.length) * BH - BH + fl.y); c.rotate(fl.r * 0.4); c.translate(-(fl.x + fl.w / 2), 0); crate(fl.x, 0, fl.w, fl.i); c.restore(); }
        const top = blocks[blocks.length - 1]; miniGoose(c, top.x + top.w / 2, gy - blocks.length * BH - 22, 0.9, 1, t * 0.4);
        drawParts(c, parts); if (msgT > 0) say(c, msg, 400, 90, 30, '#c27a00'); c.restore();
      },
    };
  }

  // ======================================================================= BREAD BREAKER
  function createBreaker(host) {
    const c = host.ctx, COLS = 10, BW = 70, BHT = 24; let px = 400, pw = 120, mv = 0, over = false, lives = 3, score = 0, t = 0, level = 0, stuck = true, shake = 0; const ball = { x: 400, y: 430, vx: 0, vy: 0 }, parts = [], keys = { l: 0, r: 0 }; let bricks = [], f = null;
    const build = () => { bricks = []; for (let r = 0; r < 4 + Math.min(3, level); r++) for (let i = 0; i < COLS; i++) bricks.push({ x: 50 + i * BW, y: 50 + r * (BHT + 6), r, hp: r < 1 && level > 0 ? 2 : 1 }); };
    build();
    host.controls([{ label: '◀', side: 'L', down: () => { keys.l = 1; }, up: () => { keys.l = 0; } }, { label: '▶', side: 'L', down: () => { keys.r = 1; }, up: () => { keys.r = 0; } }, { label: 'LAUNCH', side: 'R', big: true, down: () => launch() }]);
    function launch() { if (stuck) { stuck = false; const a = -Math.PI / 2 + (R() - 0.5) * 0.7, s = 360 + level * 30; ball.vx = Math.cos(a) * s; ball.vy = Math.sin(a) * s; } }
    const move = (e) => { if (e.pointerType === 'mouse' || true) { if (f) px = clamp(toLogical(host, f, e).x, pw / 2, 800 - pw / 2); } };
    const cv = ctx0(); function ctx0() { return host.ctx.canvas; }
    cv.addEventListener('pointermove', move); const off = onTap(host, (e) => { move(e); launch(); });
    return {
      key(code, down) { if (code === 'ArrowLeft' || code === 'KeyA') { keys.l = down ? 1 : 0; return true; } if (code === 'ArrowRight' || code === 'KeyD') { keys.r = down ? 1 : 0; return true; } if (code === 'Space' || code === 'ArrowUp') { if (down) launch(); return true; } return false; },
      destroy() { off(); cv.removeEventListener('pointermove', move); },
      update(dt) {
        if (over) return; t += dt; shake = Math.max(0, shake - dt * 4); stepParts(parts, dt);
        px = clamp(px + (keys.r - keys.l) * 520 * dt, pw / 2, 800 - pw / 2);
        if (stuck) { ball.x = px; ball.y = 432; } else {
          const steps = 3; for (let s = 0; s < steps; s++) {
            ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
            if (ball.x < 8) { ball.x = 8; ball.vx = Math.abs(ball.vx); } if (ball.x > 792) { ball.x = 792; ball.vx = -Math.abs(ball.vx); } if (ball.y < 8) { ball.y = 8; ball.vy = Math.abs(ball.vy); }
            if (ball.vy > 0 && ball.y > 436 && ball.y < 452 && Math.abs(ball.x - px) < pw / 2 + 6) { const u = (ball.x - px) / (pw / 2), sp = Math.min(640, Math.hypot(ball.vx, ball.vy) * 1.015), a = -Math.PI / 2 + u * 1.0; ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.y = 436; host.snd.boing(); }
            for (const b of bricks) {
              if (b.hp <= 0) continue; if (ball.x > b.x - 6 && ball.x < b.x + BW - 4 + 6 && ball.y > b.y - 6 && ball.y < b.y + BHT + 6) {
                const dx = Math.min(ball.x - b.x, b.x + BW - 4 - ball.x), dy = Math.min(ball.y - b.y, b.y + BHT - ball.y); if (dx < dy) ball.vx *= -1; else ball.vy *= -1;
                b.hp--; score += 10 + b.r * 2; host.snd.bread(); burst(parts, ball.x, ball.y, '#f7d79a', 6); shake = 0.3; break;
              }
            }
          }
          if (ball.y > 500) { lives--; host.snd.ouch(); stuck = true; if (lives <= 0) { over = true; host.end(score, 'You crumbled ' + score + ' points of bread'); } }
        }
        if (bricks.every((b) => b.hp <= 0)) { level++; build(); stuck = true; score += 100; }
        host.hud({ title: 'Bread Breaker', text: 'Score ' + score + ' · ' + '❤'.repeat(Math.max(0, lives))});
      },
      draw() {
        f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox + (shake ? (R() - 0.5) * 6 * shake : 0), f.oy); c.scale(f.s, f.s);
        c.strokeStyle = 'rgba(0,229,255,.8)'; c.lineWidth = 3; c.strokeRect(0, 0, 800, 480);
        const cols = ['#ff5c8a', '#ff9b2f', '#ffd23f', '#4cc35a', '#3a9bff', '#b57aff', '#ff6fb5'];
        for (const b of bricks) { if (b.hp <= 0) continue; c.fillStyle = b.hp > 1 ? '#8a5a2b' : cols[b.r % cols.length]; c.strokeStyle = INK; c.lineWidth = 2.5; rr(c, b.x, b.y, BW - 4, BHT, 9); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.4)'; rr(c, b.x + 5, b.y + 4, BW - 24, 5, 3); c.fill(); }
        c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, px - pw / 2, 444, pw, 18, 9); c.fill(); c.stroke(); c.fillStyle = '#ff9b2f'; rr(c, px - 18, 444, 36, 18, 9); c.fill(); c.stroke(); miniGoose(c, px, 444, 0.55, 1, t);
        c.fillStyle = '#ffd23f'; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.arc(ball.x, ball.y, 8, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ball.x - 2, ball.y - 3, 2.5, 0, 7); c.fill();
        drawParts(c, parts); if (stuck) say(c, 'Tap / Space to launch', 400, 330, 22, '#fff'); c.restore();
      },
    };
  }

  // ======================================================================= FEATHER STORM (dodge)
  function createDodge(host) {
    const c = host.ctx; const { world, goose } = groundWorld(host); const rocks = [], parts = []; let t = 0, spawn = 1, lives = 3, inv = 0, over = false, sc = 1, camX = 0, camY = 0, msg = '', msgT = 0;
    host.controls('std');
    return {
      goose, cam: () => ({ x: camX, y: camY, s: sc }),
      update(dt) {
        if (over) return; steer(host, goose, world, dt); t += dt; inv = Math.max(0, inv - dt); msgT = Math.max(0, msgT - dt); spawn -= dt;
        if (spawn <= 0) { const k = R() < 0.18 ? 'ice' : 'rock', x = 40 + R() * 820; rocks.push({ x, y: -60, warn: 0.9, k, vy: 0, r: k === 'ice' ? 16 : 24 }); if (t > 20 && R() < 0.4) rocks.push({ x: clamp(x + (R() - 0.5) * 160, 40, 860), y: -60, warn: 1.1, k: 'rock', vy: 0, r: 24 }); spawn = Math.max(0.3, 1.0 - t * 0.011); }
        const c0 = goose.center(), hd = goose.head;
        for (let i = rocks.length - 1; i >= 0; i--) {
          const r = rocks[i]; if (r.warn > 0) { r.warn -= dt; continue; } r.vy += 900 * dt; r.y += r.vy * dt;
          if (inv <= 0 && (Math.hypot(c0.x - r.x, c0.y - r.y) < r.r + 30 || Math.hypot(hd.x - r.x, hd.y - r.y) < r.r + 12)) { lives--; inv = 1.3; host.snd.ouch(); burst(parts, r.x, r.y, '#aaa', 12); rocks.splice(i, 1); msg = 'Ow!'; msgT = 0.7; if (lives <= 0) { over = true; host.end(Math.round(t * 10) / 10, 'You survived ' + t.toFixed(1) + ' seconds'); return; } continue; }
          if (r.y > 520 - r.r) { burst(parts, r.x, 516, r.k === 'ice' ? '#bdf' : '#8a7560', 8); rocks.splice(i, 1); }
        }
        stepParts(parts, dt); host.hud({ title: 'Feather Storm', text: t.toFixed(1) + 's · ' + '❤'.repeat(Math.max(0, lives)) });
      },
      draw() {
        const W = host.W, H = host.H; sc = Math.min(W / 940, H / 560); camX = 450 - W / (2 * sc); camY = 285 - H / (2 * sc);
        host.drawSky(0, 0); c.save(); c.scale(sc, sc); c.translate(-camX, -camY); groundDraw(host, c, sc);
        for (const r of rocks) {
          if (r.warn > 0) { c.fillStyle = 'rgba(230,57,70,' + (0.35 + 0.3 * Math.sin(r.warn * 20)) + ')'; c.beginPath(); c.ellipse(r.x, 522, r.r + 8, 7, 0, 0, 7); c.fill(); c.fillStyle = '#e63946'; c.font = '800 22px system-ui'; c.textAlign = 'center'; c.fillText('!', r.x, 40); continue; }
          c.save(); c.translate(r.x, r.y); c.rotate(r.y * 0.01); c.strokeStyle = INK; c.lineWidth = 3;
          if (r.k === 'ice') { c.fillStyle = '#bfe8ff'; poly(c, [[0, -r.r - 6], [r.r * 0.7, 0], [0, r.r + 6], [-r.r * 0.7, 0]]); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; poly(c, [[0, -r.r], [r.r * 0.3, -4], [-r.r * 0.2, 0]]); }
          else { c.fillStyle = '#8f8a84'; poly(c, [[-r.r, 4], [-r.r * 0.6, -r.r * 0.8], [r.r * 0.4, -r.r], [r.r, -2], [r.r * 0.7, r.r * 0.8], [-r.r * 0.5, r.r]]); c.stroke(); c.fillStyle = '#b5b0a8'; poly(c, [[-r.r * 0.5, -r.r * 0.5], [r.r * 0.3, -r.r * 0.7], [0, 0]]); }
          c.restore();
        }
        if (!(inv > 0 && Math.floor(inv * 14) % 2)) host.drawGoose(goose); drawParts(c, parts);
        if (msgT > 0) say(c, msg, goose.head.x, goose.head.y - 30, 22); c.restore();
      },
    };
  }

  // ======================================================================= GOOSE CANNON
  function createCannon(host) {
    const c = host.ctx; let phase = 'angle', ang = 0.9, angT = 0, power = 0, powT = 0, shots = 5, total = 0, over = false, t = 0, tx = 400 + R() * 300, wind = (R() - 0.5) * 90, boosts = 1, msg = '', msgT = 0, wait = 0; const fl = { x: 0, y: 0, vx: 0, vy: 0, on: false }, trail = [], parts = [];
    const tap = () => {
      if (over || wait > 0) return;
      if (phase === 'angle') phase = 'power'; else if (phase === 'power') { phase = 'fly'; const s = 260 + power * 520; fl.x = 96; fl.y = 392; fl.vx = Math.cos(ang) * s; fl.vy = -Math.sin(ang) * s; fl.on = true; boosts = 1; trail.length = 0; host.tone('sawtooth', 160, 60, 0.3, 0.25); burst(parts, 100, 392, '#ffb347', 14); }
      else if (phase === 'fly' && boosts > 0) { boosts--; fl.vy -= 230; host.snd.flap(); }
    };
    host.controls([{ label: 'GO', side: 'R', big: true, down: tap }]); const off = onTap(host, tap);
    return {
      key(code, down) { if (code === 'Space' || code === 'Enter' || code === 'ArrowUp') { if (down) tap(); return true; } return false; },
      destroy() { off(); },
      update(dt) {
        if (over) return; t += dt; msgT = Math.max(0, msgT - dt); stepParts(parts, dt);
        if (wait > 0) { wait -= dt; if (wait <= 0) { if (shots <= 0) { over = true; host.end(total, 'Total ' + total + ' points over 5 shots'); } else { phase = 'angle'; tx = 360 + R() * 340; wind = (R() - 0.5) * 100; fl.on = false; } } }
        if (phase === 'angle') { angT += dt * 1.9; ang = 0.25 + (Math.sin(angT) * 0.5 + 0.5) * 1.05; }
        if (phase === 'power') { powT += dt * 2.3; power = Math.abs(Math.sin(powT)); }
        if (phase === 'fly' && fl.on) {
          fl.vy += 520 * dt; fl.vx += wind * dt; fl.x += fl.vx * dt; fl.y += fl.vy * dt; if (trail.length === 0 || t % 0.05 < dt) trail.push([fl.x, fl.y]);
          if (fl.y >= 420) {
            fl.y = 420; fl.on = false; shots--; const d = Math.abs(fl.x - tx), pts = d < 40 ? 100 : Math.max(0, Math.round(80 - d / 4)); total += pts; phase = 'land'; wait = 1.4; msg = d < 40 ? 'SPLASH! +100' : '+' + pts; msgT = 1.3; host.snd[d < 40 ? 'bread' : 'low'] && host.snd[d < 40 ? 'bread' : 'low'](); burst(parts, fl.x, 420, d < 40 ? '#6bf' : '#a87', 14);
          }
          if (fl.x > 900) { fl.on = false; shots--; phase = 'land'; wait = 1.2; msg = 'Out of range!'; msgT = 1; }
        }
        host.hud({ title: 'Goose Cannon', text: 'Score ' + total + ' · shots left ' + shots });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.fillStyle = '#f2d590'; c.fillRect(-200, 420, 1200, 200); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(-200, 420); c.lineTo(1000, 420); c.stroke();
        c.fillStyle = '#2aa7d8'; rr(c, tx - 46, 414, 92, 20, 10); c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx - 30, 422); c.quadraticCurveTo(tx - 15, 417, tx, 422); c.quadraticCurveTo(tx + 15, 427, tx + 30, 422); c.stroke();
        c.fillStyle = INK; c.font = '700 14px system-ui'; c.textAlign = 'center'; c.fillText('wind ' + (wind > 0 ? '→' : '←') + ' ' + Math.abs(Math.round(wind / 4)), 640, 56);
        c.save(); c.translate(80, 400); c.rotate(-ang); c.fillStyle = '#444b57'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, -6, -13, 58, 26, 8); c.fill(); c.stroke(); c.restore(); c.fillStyle = '#6b4a2a'; c.beginPath(); c.arc(80, 410, 20, 0, 7); c.fill(); c.stroke();
        if (phase === 'angle' || phase === 'power') { c.strokeStyle = 'rgba(31,42,54,.35)'; c.lineWidth = 3; c.setLineDash([4, 8]); c.beginPath(); let x = 96, y = 392, vx = Math.cos(ang) * (260 + (phase === 'power' ? power : 0.5) * 520), vy = -Math.sin(ang) * (260 + (phase === 'power' ? power : 0.5) * 520); c.moveTo(x, y); for (let i = 0; i < 12; i++) { vy += 520 * 0.05; vx += wind * 0.05; x += vx * 0.05; y += vy * 0.05; c.lineTo(x, y); } c.stroke(); c.setLineDash([]); }
        if (phase === 'power') { c.fillStyle = 'rgba(255,255,255,.85)'; c.strokeStyle = INK; c.lineWidth = 3; rr(c, 30, 440, 200, 22, 11); c.fill(); c.stroke(); c.fillStyle = power > 0.85 ? '#e63946' : '#4cc35a'; rr(c, 33, 443, 194 * power, 16, 8); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,.7)'; for (const p of trail) { c.beginPath(); c.arc(p[0], p[1], 3, 0, 7); c.fill(); }
        if (fl.on) miniGoose(c, fl.x, fl.y, 0.7, 1, t * 3); else if (phase === 'land') miniGoose(c, fl.x, 410, 0.7, 1, 0);
        drawParts(c, parts); if (msgT > 0) say(c, msg, 400, 150, 34, '#0a7aa8');
        if (phase === 'angle') say(c, 'Tap to lock the angle', 400, 60, 22); if (phase === 'power') say(c, 'Tap to lock the power', 400, 60, 22); if (phase === 'fly' && boosts > 0) say(c, 'Tap to flap once!', 400, 60, 20);
        c.restore();
      },
    };
  }

  // ======================================================================= QUICK DRAW
  function createDraw(host) {
    let round = 0, state = 'intro', timer = 1.2, since = 0, total = 0, last = 0, over = false, msg = '', early = false, t = 0, shake = 0;
    const c = host.ctx;
    const tap = () => {
      if (over) return;
      if (state === 'wait') { state = 'result'; early = true; last = 0; timer = 1.4; msg = 'Too early!'; host.snd.ouch(); shake = 1; }
      else if (state === 'go') { state = 'result'; early = false; last = Math.max(0, Math.round(650 - since * 1000)); total += last; timer = 1.3; msg = Math.round(since * 1000) + ' ms  →  +' + last; host.tone('square', 660, 880, 0.15, 0.2); }
    };
    host.controls([{ label: 'HONK!', side: 'R', big: true, down: tap }]); const off = onTap(host, tap);
    return {
      key(code, down) { if (code === 'Space' || code === 'Enter' || code === 'KeyH') { if (down) tap(); return true; } return false; },
      destroy() { off(); },
      update(dt) {
        if (over) return; t += dt; shake = Math.max(0, shake - dt * 3); timer -= dt; if (state === 'go') since += dt;
        if (state === 'intro' && timer <= 0) { state = 'wait'; timer = 1.2 + R() * 2.6; }
        else if (state === 'wait' && timer <= 0) { state = 'go'; since = 0; host.tone('sine', 880, 880, 0.12, 0.2); }
        else if (state === 'go' && since > 1.5) { state = 'result'; last = 0; msg = 'Too slow!'; timer = 1.2; }
        else if (state === 'result' && timer <= 0) { round++; if (round >= 5) { over = true; host.end(total, 'Total ' + total + ' points over 5 rounds'); } else { state = 'wait'; timer = 1.2 + R() * 2.6; } }
        host.hud({ title: 'Quick Draw', text: 'Round ' + Math.min(5, round + 1) + '/5 · ' + total + ' pts' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox + (shake ? (R() - 0.5) * 12 * shake : 0), f.oy); c.scale(f.s, f.s);
        c.fillStyle = state === 'go' ? '#4cc35a' : state === 'result' ? (early ? '#e63946' : '#3a9bff') : '#ffcf6b'; c.strokeStyle = INK; c.lineWidth = 5; rr(c, 160, 70, 480, 300, 28); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, 176, 84, 448, 40, 16); c.fill();
        const text = state === 'intro' ? 'Get ready…' : state === 'wait' ? 'Wait for it…' : state === 'go' ? 'HONK!!' : msg;
        say(c, text, 400, 240, state === 'go' ? 80 : 44, state === 'go' ? '#fff' : INK);
        if (state === 'go') { c.strokeStyle = INK; c.lineWidth = 4; c.strokeText && c.strokeText('', 0, 0); }
        miniGoose(c, 400, 350 + (state === 'go' ? -Math.abs(Math.sin(t * 20)) * 12 : 0), 1.3, 1, t);
        c.fillStyle = INK; c.font = '700 16px system-ui'; c.textAlign = 'center'; c.fillText('Tap / Space the instant it turns green. Early = 0 points.', 400, 440); c.restore();
      },
    };
  }

  // ======================================================================= register
  const add = (o) => MG.list.push(o);
  add({ id: 'dash', name: 'Pond Dash', icon: '🏃', desc: 'Auto-run through the reeds. Jump logs, duck crows… well, jump over them twice.', theme: 'meadow', deco: 'forest', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 6), create: createDash });
  add({ id: 'fox', name: 'Whack-a-Fox', icon: '🦊', desc: 'Bonk the foxes with your wobbly head. Gold foxes are worth 5. Badgers hurt.', theme: 'meadow', deco: 'farm', fmt: fmtPts, reward: (s) => s * 2, create: createFox });
  add({ id: 'snake', name: 'Goose Snake', icon: '🐍', desc: 'Eat bread and grow your line of goslings. Don’t bump into the wall or your own flock.', theme: 'meadow', deco: 'farm', fmt: fmtPts, reward: (s) => Math.floor(s / 4), create: createSnake });
  add({ id: 'simon', name: 'Simon Honk', icon: '🎵', desc: 'Watch the pads light up, then honk the same order. It keeps growing.', theme: 'night', deco: 'stage', fmt: (s) => s + ' rounds', reward: (s) => s * 4, create: createSimon });
  add({ id: 'space', name: 'Space Goose', icon: '🚀', desc: 'Defend the galaxy by honking at gremlin saucers. Three lives.', theme: 'night', deco: 'space', fmt: fmtPts, reward: (s) => Math.floor(s / 6), create: createSpace });
  add({ id: 'stack', name: 'Egg Stack', icon: '📦', desc: 'Drop swinging crates onto the tower. Overhang gets chopped off. Perfect drops grow it back.', theme: 'meadow', deco: 'farm', fmt: (s) => s + ' floors', reward: (s) => s * 3, create: createStack });
  add({ id: 'breaker', name: 'Bread Breaker', icon: '🧈', desc: 'Bounce the ball off your goose paddle and crumble every loaf.', theme: 'night', deco: 'arcade', fmt: fmtPts, reward: (s) => Math.floor(s / 8), create: createBreaker });
  add({ id: 'dodge', name: 'Feather Storm', icon: '☄️', desc: 'Rocks and ice rain from the sky. Watch the red warnings and keep your feathers.', theme: 'dungeon', deco: 'forest', fmt: (s) => s.toFixed(1) + ' s', reward: (s) => Math.floor(s * 1.5), create: createDodge });
  add({ id: 'cannon', name: 'Goose Cannon', icon: '💥', desc: 'Time your angle and power, fire yourself at the pond, and flap once mid-air.', theme: 'meadow', deco: 'beach', fmt: fmtPts, reward: (s) => Math.floor(s / 5), create: createCannon });
  add({ id: 'draw', name: 'Quick Draw', icon: '🤠', desc: 'Honk the moment the card turns green. Five rounds. Fastest beak wins.', theme: 'desert', deco: 'desert', fmt: fmtPts, reward: (s) => Math.floor(s / 12), create: createDraw });
})(window);
