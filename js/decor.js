/*
 * Scenery. Everything here is NON-COLLIDABLE decoration: props placed on the terrain (trees, cacti, snowmen, lollipops, ...),
 * foreground tufts, far-away landmarks and terrain texture details. Placement is seeded by the level, so every level
 * gets its own repeatable layout, and each theme has its own set of props.
 */
(function (root) {
  'use strict';
  const rng = (a) => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const sh = (c, a) => c; // (colour helper placeholder)

  function groundAt(level, x) {
    let best = null;
    for (const t of level.terrain || []) for (let i = 0; i + 1 < t.pts.length; i++) {
      const [x1, y1] = t.pts[i], [x2, y2] = t.pts[i + 1];
      if (x >= x1 && x <= x2 && x2 > x1) { const y = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1); if (best === null || y < best) best = y; }
    }
    return best;
  }
  const slopeAt = (level, x) => { const a = groundAt(level, x - 14), b = groundAt(level, x + 14); return a == null || b == null ? 99 : Math.abs(b - a); };

  // ---------------------------------------------------------------- prop catalogue per theme: [kind, weight]
  const POOLS = {
    meadow: [['oak', 5], ['bush', 5], ['flowers', 6], ['rock', 3], ['fence', 2], ['mushroom', 2], ['sign', 1], ['haystack', 2], ['birch', 3], ['reeds', 1]],
    desert: [['cactus', 6], ['palm', 3], ['deadbush', 4], ['bones', 2], ['rock', 4], ['sign', 1], ['tumble', 2], ['pillar', 2], ['aloe', 3]],
    snow:   [['pine', 7], ['snowman', 2], ['igloo', 1], ['crystal', 3], ['mound', 4], ['lamp', 2], ['fence', 1], ['sign', 1], ['deadbush', 2]],
    sunset: [['autumn', 6], ['lamp', 2], ['wheat', 5], ['rock', 3], ['haystack', 3], ['cabin', 1], ['fence', 2], ['bush', 3], ['sign', 1]],
    night:  [['deadtree', 5], ['grave', 3], ['lantern', 3], ['glowshroom', 4], ['pine', 3], ['rock', 3], ['crystal', 2], ['sign', 1]],
    candy:  [['lollipop', 6], ['cane', 5], ['gumdrop', 5], ['cupcake', 3], ['cone', 3], ['sprinkleflower', 5], ['donut', 2]],
    dungeon:[['torch', 6], ['pillar', 4], ['skulls', 3], ['ribs', 2], ['crystal', 3], ['glowshroom', 3], ['grave', 2], ['lantern', 2]],
    lava:   [['charred', 5], ['vent', 4], ['obsidian', 5], ['skulls', 2], ['torch', 3], ['rock', 3], ['ribs', 2]],
  };
  const FAR_VARIANTS = { meadow: ['farm', 'hills', 'windmill'], desert: ['pyramids', 'mesas', 'dunes'], snow: ['peaks', 'peaks', 'pines'], sunset: ['city', 'mesas', 'peaks'], night: ['castle', 'peaks', 'city'], candy: ['lollies', 'clouds', 'lollies'], lava: ['volcano', 'volcano', 'peaks'], dungeon: ['castle', 'peaks', 'castle'] };

  function generate(level, seedIdx) {
    const theme = level.theme || 'meadow', pool = POOLS[theme] || POOLS.meadow, R = rng(7000 + (seedIdx | 0) * 131 + hash(level.name || ''));
    const total = pool.reduce((a, p) => a + p[1], 0);
    const pick = () => { let r = R() * total; for (const p of pool) { r -= p[1]; if (r <= 0) return p[0]; } return pool[0][0]; };
    // every level favours three kinds, which gives it a recognisable look
    const fav = [pick(), pick(), pick()];
    const props = [], fore = [];
    let minX = 1e9, maxX = -1e9;
    for (const t of level.terrain || []) for (const p of t.pts) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); }
    const water = level.water || [], haz = level.hazards || [];
    const bad = (x) => water.some((w) => x > w[0] - 20 && x < w[0] + w[2] + 20) || haz.some((h) => x > h[0] - 30 && x < h[0] + h[2] + 30);
    const egg = level.egg ? level.egg[0] : 1e9;
    for (let x = minX + 120 + R() * 100; x < maxX - 80; x += 70 + R() * 150) {
      const gy = groundAt(level, x);
      if (gy == null || bad(x) || slopeAt(level, x) > 22 || Math.abs(x - egg) < 70) continue;
      const kind = R() < 0.55 ? fav[(R() * 3) | 0] : pick();
      props.push({ k: kind, x, y: gy + 3, s: 0.8 + R() * 0.6, f: R() < 0.5 ? 1 : -1, r: R(), a: (R() * 1000) | 0 });
      if (R() < 0.25) fore.push({ k: 'tuft', x: x + 30 + R() * 50, y: groundAt(level, x + 40) + 2, s: 0.8 + R() * 0.5, f: 1, r: R(), a: 0, theme });
    }
    // small props on top of wide platforms
    for (const s of level.solids || []) {
      if (s[2] >= 150 && s[3] <= 40 && R() < 0.7) props.push({ k: R() < 0.5 ? 'rock' : (R() < 0.5 ? 'flowers' : 'bush'), x: s[0] + 40 + R() * (s[2] - 80), y: s[1] + 3, s: 0.55, f: 1, r: R(), a: 0 });
    }
    // grass/foreground tufts along the whole level
    for (let x = minX; x < maxX; x += 55 + R() * 80) { const gy = groundAt(level, x); if (gy != null && !bad(x)) fore.push({ k: 'tuft', x, y: gy + 3, s: 0.7 + R() * 0.7, f: 1, r: R(), a: 0, theme }); }
    const far = (FAR_VARIANTS[theme] || FAR_VARIANTS.meadow)[((seedIdx | 0) + hash(level.name || '')) % 3];
    return { props, fore, far, theme, seed: hash(level.name || '') };
  }

  // ---------------------------------------------------------------- drawing helpers
  function blob(c, x, y, r, col, hi) {
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, hi || col); g.addColorStop(1, col); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  function trunk(c, w, h, c1, c2) {
    const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g;
    c.beginPath(); c.moveTo(-w, 0); c.quadraticCurveTo(-w * 0.7, -h * 0.5, -w * 0.5, -h); c.lineTo(w * 0.5, -h); c.quadraticCurveTo(w * 0.7, -h * 0.5, w, 0); c.closePath(); c.fill();
  }
  function poly(c, pts, fill, stroke) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); } }
  const SOFT = 'rgba(30,20,10,.35)';

  const DRAW = {
    oak(c, p, t) { trunk(c, 9, 62, '#6b4a2a', '#4a321c'); const sw = Math.sin(t * 0.8 + p.a) * 1.5; for (const [x, y, r, col] of [[-22, -70, 26, '#3f8f3a'], [20, -72, 26, '#3f8f3a'], [0, -92, 30, '#4fa545'], [-6, -62, 24, '#357a32']]) blob(c, x + sw, y, r, col, '#7fd070'); },
    birch(c, p, t) { trunk(c, 5, 80, '#f1ede2', '#cfc9b8'); c.fillStyle = '#3a3a3a'; for (let y = -70; y < -8; y += 14) c.fillRect(-4, y, 5, 2); for (const [x, y, r] of [[-12, -86, 18], [12, -92, 20], [0, -104, 18]]) blob(c, x + Math.sin(t + p.a) * 1.2, y, r, '#8fcf5a', '#c8f08c'); },
    bush(c, p) { for (const [x, y, r] of [[-16, -12, 14], [0, -18, 17], [16, -12, 14]]) blob(c, x, y, r, '#3d8f43', '#6fc86a'); c.fillStyle = '#ff6f91'; for (const [x, y] of [[-12, -16], [6, -24], [14, -10]]) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); } },
    flowers(c, p, t) { const cols = ['#ff6f91', '#ffd23f', '#fff', '#b57aff', '#ff9b2f']; for (let i = 0; i < 6; i++) { const x = -22 + i * 9, h = 12 + ((i * 7 + p.a) % 10), sw = Math.sin(t * 1.6 + i + p.a) * 1.5; c.strokeStyle = '#3f8f3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + sw, -h / 2, x + sw, -h); c.stroke(); blob(c, x + sw, -h, 4, cols[(i + p.a) % 5], '#fff'); } },
    rock(c, p) { poly(c, [[-22, 0], [-16, -16], [-4, -24], [12, -20], [22, -6], [24, 0]], '#8d9199', 'rgba(0,0,0,.3)'); poly(c, [[-16, -16], [-4, -24], [4, -14], [-8, -8]], 'rgba(255,255,255,.25)'); },
    fence(c) { c.fillStyle = '#a07a4a'; for (let x = -30; x <= 30; x += 15) { c.fillRect(x - 3, -30, 6, 30); poly(c, [[x - 3, -30], [x, -35], [x + 3, -30]], '#a07a4a'); } c.fillRect(-32, -24, 64, 4); c.fillRect(-32, -12, 64, 4); },
    mushroom(c) { c.fillStyle = '#f4ecd8'; c.fillRect(-4, -16, 8, 16); c.beginPath(); c.arc(0, -16, 16, Math.PI, 0); c.fillStyle = '#d62839'; c.fill(); c.fillStyle = '#fff'; for (const [x, y] of [[-7, -22], [3, -26], [9, -19]]) { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); } },
    sign(c) { c.fillStyle = '#7a5530'; c.fillRect(-2, -40, 4, 40); poly(c, [[-22, -46], [14, -46], [24, -38], [14, -30], [-22, -30]], '#c9a25a', 'rgba(0,0,0,.4)'); c.fillStyle = 'rgba(60,40,20,.7)'; c.fillRect(-16, -41, 22, 3); c.fillRect(-16, -35, 14, 3); },
    haystack(c) { c.beginPath(); c.moveTo(-24, 0); c.quadraticCurveTo(-24, -34, 0, -34); c.quadraticCurveTo(24, -34, 24, 0); c.closePath(); c.fillStyle = '#e8c15a'; c.fill(); c.strokeStyle = '#c29a38'; c.lineWidth = 1.5; for (let i = -16; i <= 16; i += 8) { c.beginPath(); c.moveTo(i, -2); c.lineTo(i * 0.7, -30); c.stroke(); } },
    reeds(c, p, t) { c.strokeStyle = '#7a8f3a'; c.lineWidth = 2.5; for (let i = 0; i < 7; i++) { const x = -14 + i * 5, h = 30 + ((i * 11 + p.a) % 22), sw = Math.sin(t * 1.5 + i) * 2; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + sw, -h / 2, x + sw * 1.5, -h); c.stroke(); c.fillStyle = '#5b3d20'; c.fillRect(x + sw * 1.5 - 2, -h - 6, 4, 10); } },
    cactus(c) { c.fillStyle = '#4e9a4a'; const g = c.createLinearGradient(-8, 0, 8, 0); g.addColorStop(0, '#6fbf64'); g.addColorStop(1, '#3a7a3a'); c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(-8, -64, 16, 64, 8) : c.rect(-8, -64, 16, 64); c.fill(); c.beginPath(); c.roundRect ? c.roundRect(-26, -46, 10, 26, 5) : c.rect(-26, -46, 10, 26); c.fill(); c.fillRect(-26, -26, 22, 8); c.beginPath(); c.roundRect ? c.roundRect(16, -52, 10, 30, 5) : c.rect(16, -52, 10, 30); c.fill(); c.fillRect(2, -32, 22, 8); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; for (let y = -58; y < -4; y += 9) { c.beginPath(); c.moveTo(-2, y); c.lineTo(2, y + 2); c.stroke(); } },
    aloe(c) { c.fillStyle = '#6aa86a'; for (let i = -3; i <= 3; i++) poly(c, [[0, 0], [i * 7 - 3, -22 - (3 - Math.abs(i)) * 4], [i * 7 + 3, -22 - (3 - Math.abs(i)) * 4]], '#6aa86a'); },
    palm(c, p, t) { c.strokeStyle = '#8a6a3a'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(14, -50, 6, -92); c.stroke(); c.strokeStyle = '#a98a55'; c.lineWidth = 3; for (let y = -10; y > -90; y -= 12) { c.beginPath(); c.moveTo(1 + (-y) * 0.04, y); c.lineTo(9 + (-y) * 0.04, y - 2); c.stroke(); } for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.1 + i * 0.16) + Math.sin(t + i) * 0.04; c.strokeStyle = '#3f9a4a'; c.lineWidth = 5; c.beginPath(); c.moveTo(6, -92); c.quadraticCurveTo(6 + Math.cos(a) * 26, -92 + Math.sin(a) * 26 - 8, 6 + Math.cos(a) * 44, -92 + Math.sin(a) * 40 + 10); c.stroke(); } },
    deadbush(c) { c.strokeStyle = '#8a6f4a'; c.lineWidth = 2; for (const a of [-1.1, -0.7, -0.3, 0.1, 0.5, 0.9]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(a) * 22, -18 - Math.cos(a) * 10); c.stroke(); } },
    bones(c) { c.fillStyle = '#efe6d2'; c.beginPath(); c.ellipse(0, -10, 12, 10, 0, 0, 7); c.fill(); c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(-4, -11, 3, 0, 7); c.arc(5, -11, 3, 0, 7); c.fill(); c.fillStyle = '#efe6d2'; c.fillRect(-14, -3, 28, 4); },
    tumble(c, p, t) { c.save(); c.translate(0, -12); c.rotate(t * 0.0 + p.a); c.strokeStyle = '#b8955a'; c.lineWidth = 1.6; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(0, 0, 5 + i * 1.4, i, i + 3.4); c.stroke(); } c.restore(); },
    pillar(c) { const g = c.createLinearGradient(-9, 0, 9, 0); g.addColorStop(0, '#e8d8b0'); g.addColorStop(1, '#bba578'); c.fillStyle = g; c.fillRect(-9, -52, 18, 52); c.fillRect(-13, -56, 26, 6); c.fillRect(-12, -6, 24, 6); c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-3, -50); c.lineTo(-3, -8); c.moveTo(3, -50); c.lineTo(3, -8); c.stroke(); },
    pine(c, p) { trunk(c, 6, 20, '#5a3d26', '#3e2916'); for (let i = 0; i < 4; i++) { const w = 32 - i * 6, y = -14 - i * 22; poly(c, [[-w, y], [0, y - 36], [w, y]], i % 2 ? '#2f7a4a' : '#2a6d42'); poly(c, [[-w * 0.7, y - 10], [0, y - 36], [w * 0.7, y - 10]], 'rgba(255,255,255,.85)'); } },
    snowman(c) { blob(c, 0, -14, 16, '#f6fbff', '#fff'); blob(c, 0, -38, 12, '#f6fbff', '#fff'); c.fillStyle = '#222'; c.beginPath(); c.arc(-4, -40, 1.6, 0, 7); c.arc(4, -40, 1.6, 0, 7); c.fill(); poly(c, [[0, -37], [12, -35], [0, -34]], '#ff8a1f'); c.fillStyle = '#c0272d'; c.fillRect(-12, -30, 24, 4); c.fillStyle = '#222'; c.fillRect(-8, -56, 16, 4); c.fillRect(-5, -66, 10, 10); },
    igloo(c) { c.beginPath(); c.arc(0, 0, 34, Math.PI, 0); c.fillStyle = '#e8f6ff'; c.fill(); c.strokeStyle = 'rgba(100,150,190,.6)'; c.lineWidth = 1.5; for (let y = -8; y > -32; y -= 9) { c.beginPath(); c.arc(0, 0, 34 - (-y) * 0.1, Math.PI * 1.02, Math.PI * 1.98); c.stroke(); } c.fillStyle = '#2d4a63'; c.beginPath(); c.arc(0, 0, 12, Math.PI, 0); c.fill(); },
    crystal(c, p, t) { for (const [x, h, w] of [[-10, 26, 7], [0, 40, 9], [11, 22, 6]]) poly(c, [[x - w, 0], [x - w * 0.4, -h], [x + w * 0.4, -h + 4], [x + w, 0]], 'rgba(150,220,255,.85)', 'rgba(255,255,255,.7)'); c.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(t * 3 + p.a) * 0.4) + ')'; c.fillRect(-1, -36, 3, 3); },
    mound(c) { c.beginPath(); c.ellipse(0, 0, 30, 14, 0, Math.PI, 0); c.fillStyle = '#f2f9ff'; c.fill(); },
    lamp(c, p, t) { c.fillStyle = '#3a3f4a'; c.fillRect(-2.5, -70, 5, 70); c.fillRect(-7, -4, 14, 4); poly(c, [[-9, -78], [9, -78], [6, -68], [-6, -68]], '#2a2e36'); const g = c.createRadialGradient(0, -74, 2, 0, -74, 38); g.addColorStop(0, 'rgba(255,230,150,.65)'); g.addColorStop(1, 'rgba(255,230,150,0)'); c.fillStyle = g; c.fillRect(-40, -114, 80, 80); blob(c, 0, -73, 4, '#ffe9a0'); },
    autumn(c, p, t) { trunk(c, 8, 58, '#5e3f24', '#42291a'); const cols = [['#e2711d', '#ffb25a'], ['#c0392b', '#ff7b5a'], ['#e8b923', '#ffe07a']]; const cc = cols[p.a % 3]; for (const [x, y, r] of [[-20, -66, 24], [20, -70, 24], [0, -88, 28]]) blob(c, x + Math.sin(t + p.a) * 1.3, y, r, cc[0], cc[1]); },
    wheat(c, p, t) { c.strokeStyle = '#d9b54a'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { const x = -20 + i * 5, h = 26 + ((i * 5 + p.a) % 10), sw = Math.sin(t * 2 + i * 0.7) * 2.5; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x, -h / 2, x + sw, -h); c.stroke(); c.fillStyle = '#e8c85a'; c.beginPath(); c.ellipse(x + sw, -h - 3, 2.2, 6, sw * 0.05, 0, 7); c.fill(); } },
    cabin(c) { c.fillStyle = '#8a5a3a'; c.fillRect(-30, -34, 60, 34); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1.5; for (let y = -28; y < 0; y += 8) { c.beginPath(); c.moveTo(-30, y); c.lineTo(30, y); c.stroke(); } poly(c, [[-36, -34], [0, -62], [36, -34]], '#6b3d2a'); c.fillStyle = '#ffd27a'; c.fillRect(-20, -24, 12, 12); c.fillStyle = '#4a2e1c'; c.fillRect(8, -24, 12, 24); },
    deadtree(c) { c.strokeStyle = '#2a2433'; c.lineCap = 'round'; c.lineWidth = 9; c.beginPath(); c.moveTo(0, 0); c.lineTo(2, -60); c.stroke(); c.lineWidth = 4; for (const [x, y, dx, dy] of [[1, -30, -26, -26], [2, -44, 24, -22], [2, -58, -14, -26], [2, -58, 14, -20]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke(); } },
    grave(c) { c.beginPath(); c.moveTo(-12, 0); c.lineTo(-12, -28); c.arc(0, -28, 12, Math.PI, 0); c.lineTo(12, 0); c.closePath(); c.fillStyle = '#7d8493'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = 'rgba(30,30,40,.6)'; c.fillRect(-1.5, -34, 3, 14); c.fillRect(-6, -30, 12, 3); },
    lantern(c, p, t) { c.strokeStyle = '#2a2e36'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -52); c.quadraticCurveTo(0, -60, 10, -60); c.stroke(); const fl = 0.8 + Math.sin(t * 7 + p.a) * 0.15; const g = c.createRadialGradient(10, -50, 2, 10, -50, 42 * fl); g.addColorStop(0, 'rgba(255,200,110,.7)'); g.addColorStop(1, 'rgba(255,200,110,0)'); c.fillStyle = g; c.fillRect(-34, -92, 90, 90); c.fillStyle = '#2a2e36'; c.fillRect(5, -56, 10, 3); c.fillStyle = '#ffd27a'; c.fillRect(6, -52, 8, 9); c.fillStyle = '#2a2e36'; c.fillRect(5, -43, 10, 3); },
    glowshroom(c, p, t) { const a = 0.55 + Math.sin(t * 2 + p.a) * 0.2; const g = c.createRadialGradient(0, -12, 2, 0, -12, 32); g.addColorStop(0, 'rgba(120,255,220,' + a + ')'); g.addColorStop(1, 'rgba(120,255,220,0)'); c.fillStyle = g; c.fillRect(-34, -44, 68, 56); c.fillStyle = '#d6f5ea'; c.fillRect(-3, -14, 6, 14); c.beginPath(); c.arc(0, -14, 12, Math.PI, 0); c.fillStyle = '#35d6b0'; c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(-4, -19, 2, 0, 7); c.arc(5, -17, 1.6, 0, 7); c.fill(); },
    lollipop(c, p) { c.fillStyle = '#f5ecf0'; c.fillRect(-2.5, -54, 5, 54); const cols = [['#ff5fa2', '#fff'], ['#6ec6ff', '#fff'], ['#ffd23f', '#fff']][p.a % 3]; blob(c, 0, -66, 18, cols[0], cols[1]); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; c.beginPath(); for (let a = 0; a < 14; a += 0.3) c.lineTo(Math.cos(a) * a * 1.1, -66 + Math.sin(a) * a * 1.1); c.stroke(); },
    cane(c) { c.lineCap = 'round'; c.lineWidth = 9; c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -48); c.arc(-11, -48, 11, 0, -Math.PI, true); c.stroke(); c.strokeStyle = '#e63946'; c.lineWidth = 9; c.setLineDash([6, 8]); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -48); c.arc(-11, -48, 11, 0, -Math.PI, true); c.stroke(); c.setLineDash([]); },
    gumdrop(c, p) { const cols = ['#ff7ab8', '#7ad8ff', '#a8e063', '#ffb347']; const col = cols[p.a % 4]; c.beginPath(); c.moveTo(-16, 0); c.quadraticCurveTo(-16, -30, 0, -30); c.quadraticCurveTo(16, -30, 16, 0); c.closePath(); c.fillStyle = col; c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; for (const [x, y] of [[-8, -8], [2, -14], [8, -6], [-2, -4]]) c.fillRect(x, y, 2, 2); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-6, -20, 3, 6, 0.4, 0, 7); c.fill(); },
    cupcake(c, p) { poly(c, [[-14, -16], [14, -16], [10, 0], [-10, 0]], '#d99a5b'); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1; for (let x = -8; x <= 8; x += 5) { c.beginPath(); c.moveTo(x, -16); c.lineTo(x * 0.7, 0); c.stroke(); } blob(c, 0, -24, 14, '#ff9fd0', '#ffe0ef'); blob(c, 0, -36, 9, '#ff9fd0', '#ffe0ef'); blob(c, 0, -46, 4, '#e63946'); },
    cone(c) { poly(c, [[-12, -30], [12, -30], [0, 0]], '#e0a458', 'rgba(0,0,0,.25)'); blob(c, 0, -34, 14, '#fff0b8', '#fff'); blob(c, 0, -46, 11, '#ffb3d9', '#ffe0ef'); },
    sprinkleflower(c, p, t) { const cols = ['#ff6fb5', '#6ec6ff', '#ffd23f', '#a8e063']; for (let i = 0; i < 4; i++) { const x = -14 + i * 9, h = 14 + ((i * 5 + p.a) % 9), sw = Math.sin(t * 1.5 + i) * 1.4; c.strokeStyle = '#7ad862'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + sw, -h); c.stroke(); blob(c, x + sw, -h, 5, cols[i], '#fff'); } },
    donut(c, p) { c.save(); c.translate(0, -16); c.beginPath(); c.arc(0, 0, 16, 0, 7); c.arc(0, 0, 6, 0, 7, true); c.fillStyle = '#e0a458'; c.fill('evenodd'); c.beginPath(); c.arc(0, -1, 14, 0, 7); c.arc(0, -1, 6.5, 0, 7, true); c.fillStyle = '#ff7ab8'; c.fill('evenodd'); c.fillStyle = '#fff'; for (const [x, y] of [[-8, -6], [6, -8], [9, 4], [-4, 9]]) c.fillRect(x, y, 3, 1.5); c.restore(); },
    charred(c) { c.strokeStyle = '#1c1517'; c.lineCap = 'round'; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(-3, -44); c.stroke(); c.lineWidth = 3.5; for (const [x, y, dx, dy] of [[-2, -26, 20, -18], [-3, -40, -18, -14]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke(); } c.strokeStyle = 'rgba(255,110,40,.6)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -4); c.lineTo(-2, -38); c.stroke(); },
    vent(c, p, t) { poly(c, [[-24, 0], [-10, -20], [10, -20], [24, 0]], '#3a2420', 'rgba(0,0,0,.4)'); const g = c.createRadialGradient(0, -22, 2, 0, -22, 34); g.addColorStop(0, 'rgba(255,150,50,.8)'); g.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = g; c.fillRect(-36, -60, 72, 60); for (let i = 0; i < 3; i++) { const u = (t * 0.7 + i / 3 + p.a * 0.01) % 1; c.fillStyle = 'rgba(90,70,70,' + (0.45 * (1 - u)) + ')'; c.beginPath(); c.arc(Math.sin(u * 6 + i) * 8, -22 - u * 60, 5 + u * 12, 0, 7); c.fill(); } },
    obsidian(c) { for (const [x, h, w] of [[-9, 30, 7], [2, 46, 9], [13, 24, 6]]) poly(c, [[x - w, 0], [x, -h], [x + w, 0]], '#251f2e', 'rgba(140,100,220,.5)'); },
    skulls(c) { c.fillStyle = '#e6dcc6'; for (const [x, y, r] of [[-10, -8, 8], [8, -7, 7], [0, -18, 7]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } c.fillStyle = '#2a1a1a'; for (const [x, y] of [[-12, -9], [-7, -9], [6, -8], [10, -8], [-2, -19], [3, -19]]) c.fillRect(x - 1, y - 1, 2.5, 3); },
    torch(c, p, t) { c.fillStyle = '#5a3d26'; c.fillRect(-2.5, -44, 5, 44); c.fillStyle = '#2a2e36'; c.fillRect(-5, -48, 10, 6); const f = 1 + Math.sin(t * 12 + p.a) * 0.18; const g = c.createRadialGradient(0, -56, 2, 0, -56, 36 * f); g.addColorStop(0, 'rgba(255,200,90,.75)'); g.addColorStop(1, 'rgba(255,100,20,0)'); c.fillStyle = g; c.fillRect(-40, -96, 80, 80); poly(c, [[-5, -48], [0, -66 * f], [5, -48]], '#ff9b2f'); poly(c, [[-2.5, -48], [0, -58 * f], [2.5, -48]], '#ffe07a'); },
    ribs(c) { c.strokeStyle = '#e6dcc6'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(i * 8, -4, 12, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); } c.fillRect(-22, -3, 44, 3); },
    tuft(c, p, t) { const th = p.theme; const col = th === 'snow' ? '#eef8ff' : th === 'desert' ? '#c9a45a' : th === 'candy' ? '#ff9fd6' : th === 'lava' ? '#5a2a22' : th === 'night' ? '#58bd88' : '#5fc24c'; c.strokeStyle = col; c.lineWidth = 2.2; c.lineCap = 'round'; for (let i = -2; i <= 2; i++) { const h = 8 + (3 - Math.abs(i)) * 3 + ((i * 7 + p.a) % 3), sw = Math.sin(t * 2 + i + p.x * 0.01) * 1.5; c.beginPath(); c.moveTo(i * 3, 0); c.quadraticCurveTo(i * 3 + sw, -h * 0.6, i * 4 + sw * 2, -h); c.stroke(); } },
  };

  function draw(c, list, camX, VW, t) {
    for (const p of list) {
      if (p.x < camX - 120 || p.x > camX + VW + 120) continue;
      const f = DRAW[p.k]; if (!f) continue;
      c.save(); c.translate(p.x, p.y); c.scale(p.s * p.f, p.s); c.lineCap = 'round'; c.lineJoin = 'round';
      f(c, p, t); c.restore();
    }
  }

  // ---------------------------------------------------------------- far landmarks (screen space, slow parallax)
  function drawFar(c, kind, theme, camX, W, H, S, th, baseY) {
    const par = 0.12, period = 1500 * S, off = -((camX * par * S) % period), base = baseY;
    const dark = th.h2 || '#789', mid = th.h1 || '#9ab';
    c.save(); c.globalAlpha = 0.9;
    for (let k = -1; k < W / period + 2; k++) {
      c.save(); c.translate(off + k * period, base); c.scale(S, S);
      const col = dark;
      if (kind === 'windmill') { c.fillStyle = col; poly(c, [[-18, 0], [-12, -90], [12, -90], [18, 0]], col); c.fillStyle = mid; c.save(); c.translate(0, -90); c.rotate(performance.now() / 4000); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.fillRect(-3, -60, 6, 60); poly(c, [[3, -60], [18, -60], [18, -20], [3, -20]], 'rgba(255,255,255,.35)'); } c.restore(); }
      else if (kind === 'farm') { c.fillStyle = col; c.fillRect(100, -50, 80, 50); poly(c, [[90, -50], [140, -86], [190, -50]], col); c.fillRect(200, -80, 24, 80); c.beginPath(); c.arc(212, -80, 12, Math.PI, 0); c.fill(); }
      else if (kind === 'pyramids') { poly(c, [[60, 0], [190, -140], [320, 0]], col); poly(c, [[300, 0], [380, -84], [460, 0]], mid); }
      else if (kind === 'mesas') { poly(c, [[40, 0], [60, -90], [210, -90], [240, 0]], col); poly(c, [[300, 0], [316, -60], [420, -60], [440, 0]], mid); }
      else if (kind === 'dunes') { c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(200, -90, 420, 0); c.fill(); c.fillStyle = mid; c.beginPath(); c.moveTo(250, 0); c.quadraticCurveTo(450, -70, 640, 0); c.fill(); }
      else if (kind === 'peaks') { poly(c, [[0, 0], [120, -200], [240, 0]], col); poly(c, [[90, -150], [120, -200], [150, -150], [128, -160], [112, -140]], 'rgba(255,255,255,.8)'); poly(c, [[200, 0], [320, -140], [440, 0]], mid); }
      else if (kind === 'pines') { for (let i = 0; i < 9; i++) { const x = 20 + i * 52, h = 50 + (i * 37 % 40); poly(c, [[x - 20, 0], [x, -h * 1.5], [x + 20, 0]], i % 2 ? col : mid); } }
      else if (kind === 'city') { for (let i = 0; i < 12; i++) { const x = i * 40, h = 40 + ((i * 53) % 110); c.fillStyle = i % 2 ? col : mid; c.fillRect(x, -h, 34, h); c.fillStyle = 'rgba(255,230,150,.55)'; for (let y = -h + 8; y < -6; y += 14) c.fillRect(x + 6, y, 4, 5), c.fillRect(x + 20, y, 4, 5); } }
      else if (kind === 'castle') { c.fillStyle = col; c.fillRect(60, -70, 200, 70); for (const x of [60, 150, 240]) { c.fillRect(x, -130, 28, 130); poly(c, [[x - 6, -130], [x + 14, -170], [x + 34, -130]], col); } c.fillStyle = 'rgba(255,220,120,.7)'; for (const x of [70, 160, 250]) c.fillRect(x + 6, -100, 6, 10); }
      else if (kind === 'lollies') { for (let i = 0; i < 6; i++) { const x = 40 + i * 90; c.fillStyle = mid; c.fillRect(x - 3, -90, 6, 90); c.fillStyle = i % 2 ? '#ff9fd6' : '#9fd8ff'; c.beginPath(); c.arc(x, -100, 26, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 4; c.beginPath(); for (let a = 0; a < 12; a += 0.3) c.lineTo(x + Math.cos(a) * a * 2, -100 + Math.sin(a) * a * 2); c.stroke(); } }
      else if (kind === 'clouds') { c.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 4; i++) { const x = 60 + i * 130; for (const [dx, dy, r] of [[0, -90, 36], [32, -104, 44], [70, -90, 34]]) { c.beginPath(); c.arc(x + dx, dy, r, 0, 7); c.fill(); } } }
      else if (kind === 'volcano') { poly(c, [[20, 0], [150, -190], [190, -190], [330, 0]], '#2a1514'); const g = c.createLinearGradient(0, -200, 0, -150); g.addColorStop(0, 'rgba(255,140,40,.9)'); g.addColorStop(1, 'rgba(255,60,20,0)'); c.fillStyle = g; c.fillRect(140, -200, 60, 60); c.fillStyle = 'rgba(80,60,60,.5)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(170 + i * 12, -210 - i * 26, 16 + i * 8, 0, 7); c.fill(); } }
      else { c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(220, -120, 440, 0); c.fill(); }
      c.restore();
    }
    c.restore();
  }

  // ---------------------------------------------------------------- terrain texture (drawn right after the terrain fill)
  function terrainDetail(c, pts, i0, i1, theme, ice, camX, VW, t) {
    const R = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
    const y = (x) => { for (let i = i0; i < i1; i++) { if (x >= pts[i][0] && x <= pts[i + 1][0] && pts[i + 1][0] > pts[i][0]) return pts[i][1] + ((pts[i + 1][1] - pts[i][1]) * (x - pts[i][0])) / (pts[i + 1][0] - pts[i][0]); } return null; };
    const x0 = Math.max(pts[i0][0], Math.floor(camX / 26) * 26 - 26), x1 = Math.min(pts[i1][0], camX + VW + 26);
    c.save();
    for (let x = x0; x < x1; x += 26) {
      const gy = y(x); if (gy == null) continue;
      const n = Math.floor(x / 26);
      // pebbles / ore / sprinkles / ice cracks deeper in the ground
      for (let k = 0; k < 3; k++) {
        const px = x + R(n * 3 + k) * 26, py = gy + 26 + R(n * 5 + k * 11) * 150, r = 2 + R(n * 7 + k) * 4;
        if (ice) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px, py); c.lineTo(px + r * 3, py + r); c.lineTo(px + r * 5, py - r); c.stroke(); }
        else if (theme === 'candy') { c.fillStyle = ['#ff5fa2', '#6ec6ff', '#ffd23f', '#fff'][(n + k) % 4]; c.save(); c.translate(px, py); c.rotate(R(n + k) * 3); c.fillRect(-4, -1.4, 8, 2.8); c.restore(); }
        else if (theme === 'lava') { c.strokeStyle = 'rgba(255,' + (90 + (k * 40)) + ',30,' + (0.45 + Math.sin(t * 2 + n) * 0.2) + ')'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, py); c.lineTo(px + r * 3, py + r * 2); c.lineTo(px + r * 5, py + r); c.stroke(); }
        else { c.fillStyle = k % 2 ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.13)'; c.beginPath(); c.ellipse(px, py, r * 1.4, r, R(n + k) * 2, 0, 7); c.fill(); }
      }
      // strata
      if (!ice && n % 2 === 0) { c.strokeStyle = 'rgba(0,0,0,.09)'; c.lineWidth = 2; for (const d of [58, 118]) { const a = y(x), b = y(x + 26); if (a != null && b != null) { c.beginPath(); c.moveTo(x, a + d); c.lineTo(x + 26, b + d); c.stroke(); } } }
      // surface details: grass blades, snow sparkles, sand ripples
      if (theme === 'snow' || ice) { if (R(n * 13) > 0.7) { c.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(t * 4 + n) * 0.4) + ')'; c.fillRect(x + 8, gy + 10 + R(n) * 20, 2.5, 2.5); } }
      else if (theme === 'desert') { c.strokeStyle = 'rgba(255,240,200,.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 2, gy + 18); c.quadraticCurveTo(x + 13, gy + 14, x + 24, gy + 18); c.stroke(); }
      else if (theme !== 'lava') { c.strokeStyle = theme === 'candy' ? '#ff9fd6' : theme === 'night' ? '#58bd88' : '#4fb143'; c.lineWidth = 2; c.lineCap = 'round'; for (let k = 0; k < 2; k++) { const bx = x + k * 13 + R(n + k) * 8, by = y(bx); if (by == null) continue; c.beginPath(); c.moveTo(bx, by + 1); c.lineTo(bx + (R(n * 2 + k) - 0.5) * 6, by - 6 - R(n + 3 * k) * 5); c.stroke(); } }
    }
    c.restore();
  }

  const api = { generate, draw, drawFar, terrainDetail, groundAt, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Decor = api;
})(typeof window !== 'undefined' ? window : globalThis);
