/*
 * More stuff, part 5: 24 new skins, 20 new clothes (hats, glasses, neckwear, shoes) and 5 new minigames.
 *   Minigames: 🔨 Bread Whack · 🧺 Bread Catch · 🎵 Simon Honk · 🧱 Block Stack · ⚡ Quick Draw
 * Same contracts as skins4.js / clothes4.js / minigames3.js.
 */
(function (root) {
  'use strict';
  // ================================================================ skins
  const S = root.Skins;
  if (S) {
    const { INK } = S.H;
    const add = (o) => { S.LIST.push(Object.assign({ legC: '#ff9b2f' }, o)); S.BY_ID[o.id] = S.LIST[S.LIST.length - 1]; };
    const clip = (c, fn) => { c.save(); c.beginPath(); c.ellipse(0, 0, 36, 22, 0, 0, 7); c.clip(); fn(); c.restore(); };
    const stripes = (c, col, w, gap, ang) => { c.save(); c.rotate(ang || 0); c.fillStyle = col; for (let x = -60; x < 60; x += gap) c.fillRect(x, -40, w, 80); c.restore(); };
    const dots = (c, col, r, gx, gy) => { c.fillStyle = col; for (let x = -36; x < 40; x += gx) for (let y = -22; y < 26; y += gy) { c.beginPath(); c.arc(x + ((y / gy) & 1 ? gx / 2 : 0), y, r, 0, 7); c.fill(); } };
    const check = (c, col, s) => { c.fillStyle = col; for (let x = -40; x < 40; x += s) for (let y = -24; y < 26; y += s) if (((x / s + y / s) & 1) === 0) c.fillRect(x, y, s, s); };
    const waves = (c, col) => { c.strokeStyle = col; c.lineWidth = 1.8; for (let y = -16; y < 22; y += 9) { c.beginPath(); for (let x = -38; x <= 38; x += 4) { const yy = y + Math.sin(x * 0.28 + y) * 2.2; x === -38 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); } };
    const stars = (c, col) => { c.fillStyle = col; for (const [x, y, r] of [[-20, -6, 3.2], [-4, 8, 2.6], [10, -10, 3.4], [22, 6, 2.4], [-26, 10, 2]]) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); } };
    const hearts = (c, col) => { c.fillStyle = col; for (const [x, y, s] of [[-18, -4, 1], [2, 8, 0.8], [16, -8, 1.1], [24, 8, 0.7], [-6, -12, 0.7]]) { c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-8, -2, -4, -8, 0, -3); c.bezierCurveTo(4, -8, 8, -2, 0, 4); c.fill(); c.restore(); } };
    const T = [
      // id, name, price, body, wing, leg, deco(c)
      ['m5_sunset', 'Sunset Goose', 520, '#ff9a5a', '#ff6a8a', '#7a2a5a', (c) => clip(c, () => { const g = c.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, '#ffd45a'); g.addColorStop(0.5, '#ff7a4a'); g.addColorStop(1, '#b03a8a'); c.fillStyle = g; c.fillRect(-40, -24, 80, 48); })],
      ['m5_ocean', 'Ocean Goose', 440, '#3a9ad9', '#2a7ab9', '#1a5a8a', (c) => clip(c, () => waves(c, 'rgba(255,255,255,.55)'))],
      ['m5_forest', 'Forest Goose', 380, '#3f8f4a', '#2e6f38', '#7a5a2a', (c) => clip(c, () => dots(c, '#8fd06a', 2, 11, 9))],
      ['m5_blossom', 'Blossom Goose', 460, '#ffd6e4', '#ffb3cc', '#c85a7a', (c) => clip(c, () => dots(c, '#ff7aa8', 2.4, 13, 11))],
      ['m5_choc', 'Chocolate Goose', 400, '#6a3a1e', '#4a2610', '#3a1e0a', (c) => clip(c, () => check(c, 'rgba(255,255,255,.1)', 8))],
      ['m5_gum', 'Bubblegum Goose', 420, '#ff8ac8', '#ff5aa8', '#c83a88', (c) => clip(c, () => dots(c, '#ffd0ea', 3, 14, 12))],
      ['m5_pumpkin', 'Pumpkin Goose', 440, '#ff8a1a', '#d96a0a', '#4a7a2a', (c) => clip(c, () => stripes(c, 'rgba(120,50,0,.35)', 2.4, 9, 0))],
      ['m5_snowman', 'Snow Goose', 360, '#ffffff', '#e6f2ff', '#ff8a2a', (c) => clip(c, () => dots(c, '#cfe6ff', 2, 12, 10))],
      ['m5_checker', 'Checker Goose', 380, '#ffffff', '#eeeeee', '#222', (c) => clip(c, () => check(c, '#222', 9))],
      ['m5_starry', 'Starry Goose', 500, '#2a3a8a', '#1a2a6a', '#ffd23f', (c) => clip(c, () => stars(c, '#ffe27a'))],
      ['m5_love', 'Love Goose', 440, '#ffd0d8', '#ffb0c0', '#e0405a', (c) => clip(c, () => hearts(c, '#ff4a6a'))],
      ['m5_sky', 'Cloud Goose', 340, '#9ad4ff', '#7ac0f5', '#ffffff', (c) => clip(c, () => dots(c, '#ffffff', 5, 18, 14))],
      ['m5_emerald', 'Emerald Goose', 640, '#2fbf7a', '#1f9f5f', '#ffd23f', (c) => clip(c, () => { c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-10, -8, 14, 4, -0.4, 0, 7); c.fill(); })],
      ['m5_ruby', 'Ruby Goose', 640, '#d6283c', '#a81a2c', '#ffd23f', (c) => clip(c, () => { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-10, -8, 14, 4, -0.4, 0, 7); c.fill(); })],
      ['m5_amethyst', 'Amethyst Goose', 640, '#9a5ae0', '#7a3ac0', '#ffd23f', (c) => clip(c, () => { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-10, -8, 14, 4, -0.4, 0, 7); c.fill(); })],
      ['m5_silver', 'Silver Goose', 700, '#d8dde6', '#aeb6c4', '#8a93a3', (c) => clip(c, () => { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-8, -8, 16, 4, -0.4, 0, 7); c.fill(); })],
      ['m5_bee', 'Bee Goose', 420, '#ffd23f', '#ffe27a', '#222', (c) => clip(c, () => stripes(c, '#222', 5, 14, 0))],
      ['m5_ladybug', 'Ladybug Goose', 420, '#e8283c', '#c41a2c', '#222', (c) => clip(c, () => dots(c, '#1a1a1a', 3.4, 17, 15))],
      ['m5_panda', 'Panda Goose', 460, '#ffffff', '#222222', '#222', (c) => clip(c, () => { c.fillStyle = '#222'; c.fillRect(-40, 4, 80, 30); })],
      ['m5_mud', 'Muddy Goose', 260, '#b58a5a', '#946a3a', '#6a4a2a', (c) => clip(c, () => dots(c, 'rgba(70,40,10,.4)', 3, 15, 12))],
      ['m5_ghosty', 'Midnight Goose', 480, '#14142a', '#262650', '#8a6aff', (c) => clip(c, () => stars(c, '#b8a8ff'))],
      ['m5_mango', 'Mango Goose', 400, '#ffb02a', '#ff8a1a', '#7a9a2a', (c) => clip(c, () => stripes(c, 'rgba(255,90,40,.5)', 6, 22, 0.5))],
      ['m5_tv', 'Static Goose', 380, '#9aa0aa', '#7a808a', '#555', (c) => clip(c, () => { c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 40; i++) c.fillRect(-36 + ((i * 37) % 72), -20 + ((i * 53) % 40), 3, 2); })],
      ['m5_rainbowjelly', 'Rainbow Stripe Goose', 560, '#ffffff', '#fff0f8', '#ff9b2f', (c) => clip(c, () => ['#ff4d4d', '#ffa63a', '#ffe14a', '#4cd964', '#3a86ff', '#9b5de5'].forEach((col, i) => { c.fillStyle = col; c.fillRect(-40, -22 + i * 7.5, 80, 7.5); }))],
    ];
    for (const [id, name, price, body, wing, legC, deco] of T) add({ id, name, price, body, wing, neckC: body, headC: body, legC, bodyDeco: deco });
  }

  // ================================================================ clothes
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const poly = (ctx, pts, fill, lw) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); outline(ctx, fill, lw || 2.5); };
    add({ id: 'm5_chef', cat: 'hat', name: 'Chef Hat', price: 70, draw(c) { ell(c, 0, -9, 11, 4, '#fff', 2.4); ell(c, -5, -16, 6, 6, '#fff', 2.4); ell(c, 5, -16, 6, 6, '#fff', 2.4); ell(c, 0, -20, 6.5, 6, '#fff', 2.4); } });
    add({ id: 'm5_party', cat: 'hat', name: 'Party Cone', price: 40, draw(c) { poly(c, [[-8, -7], [8, -7], [0, -30]], '#ff4d8d'); c.fillStyle = '#ffe14a'; for (const [x, y] of [[-2, -14], [2, -20], [0, -10]]) { c.beginPath(); c.arc(x, y, 1.5, 0, 7); c.fill(); } c.beginPath(); c.arc(0, -31, 3, 0, 7); outline(c, '#3a86ff', 2); } });
    add({ id: 'm5_prop', cat: 'hat', name: 'Propeller Cap', price: 75, draw(c) { c.beginPath(); c.arc(0, -4, 10.5, Math.PI, 0); c.closePath(); outline(c, '#3a86ff'); c.fillStyle = '#ff4d4d'; c.fillRect(-10, -9, 20, 3); const t = performance.now() / 60; c.save(); c.translate(0, -15); c.scale(Math.cos(t), 1); ell(c, 0, 0, 12, 2.4, '#ffd23f', 2); c.restore(); c.fillStyle = INKC; c.fillRect(-1, -15, 2, 6); } });
    add({ id: 'm5_cowboy', cat: 'hat', name: 'Cowboy Hat', price: 80, draw(c) { ell(c, 0, -6, 18, 3.6, '#a8743a', 2.4); poly(c, [[-9, -7], [9, -7], [7, -18], [2, -15], [-2, -15], [-7, -18]], '#b9824a'); c.fillStyle = '#5a3a1a'; c.fillRect(-9, -9, 18, 2.4); } });
    add({ id: 'm5_flowers', cat: 'hat', name: 'Flower Crown', price: 55, draw(c) { for (const [x, col] of [[-9, '#ff7aa8'], [-3, '#fff'], [3, '#ffd23f'], [9, '#c08aff']]) { c.beginPath(); c.arc(x, -9 + Math.abs(x) * 0.12, 3.6, 0, 7); outline(c, col, 2); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, -9 + Math.abs(x) * 0.12, 1.1, 0, 7); c.fill(); } } });
    add({ id: 'm5_antlers', cat: 'hat', name: 'Antlers', price: 60, draw(c) { c.strokeStyle = '#7a5230'; c.lineWidth = 3; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 4, -8); c.lineTo(s * 8, -22); c.moveTo(s * 6.4, -15); c.lineTo(s * 13, -18); c.moveTo(s * 7.6, -19); c.lineTo(s * 5, -26); c.stroke(); } } });
    add({ id: 'm5_halo', cat: 'hat', name: 'Halo', price: 90, draw(c) { c.save(); c.translate(0, -18); c.scale(1, 0.35); c.strokeStyle = '#8a6a00'; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.stroke(); c.strokeStyle = '#ffe27a'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.stroke(); c.restore(); } });
    add({ id: 'm5_bucket', cat: 'hat', name: 'Bucket Hat', price: 45, draw(c) { poly(c, [[-11, -6], [11, -6], [8, -16], [-8, -16]], '#4aa0e8'); ell(c, 0, -6, 14, 3, '#3a86d0', 2.2); } });
    add({ id: 'm5_heartshades', cat: 'eyes', name: 'Heart Shades', price: 50, draw(c) { c.beginPath(); c.moveTo(0, 5); c.bezierCurveTo(-9, -1, -5, -8, 0, -3); c.bezierCurveTo(5, -8, 9, -1, 0, 5); outline(c, '#ff3a6a', 2.2); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-3, -2, 2, 1.2, -0.5, 0, 7); c.fill(); } });
    add({ id: 'm5_monocle', cat: 'eyes', name: 'Monocle', price: 45, draw(c) { c.beginPath(); c.arc(1, 0, 6, 0, 7); c.fillStyle = 'rgba(200,235,255,.35)'; c.fill(); c.strokeStyle = '#c9a227'; c.lineWidth = 2.2; c.stroke(); c.beginPath(); c.moveTo(1, 6); c.quadraticCurveTo(-2, 14, -7, 18); c.stroke(); } });
    add({ id: 'm5_3d', cat: 'eyes', name: '3D Glasses', price: 40, draw(c) { c.beginPath(); c.rect(-8, -5, 16, 10); outline(c, '#fff', 2.2); c.fillStyle = '#ff3a3a'; c.fillRect(-7, -4, 7, 8); c.fillStyle = '#19b8d6'; c.fillRect(0, -4, 7, 8); } });
    add({ id: 'm5_starshades', cat: 'eyes', name: 'Star Shades', price: 55, draw(c) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.6 : 8; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); outline(c, '#ffd23f', 2.2); } });
    add({ id: 'm5_ribbon', cat: 'neck', name: 'Red Ribbon', price: 35, draw(c) { poly(c, [[0, 0], [-8, -5], [-8, 5]], '#e63946', 2.2); poly(c, [[0, 0], [8, -5], [8, 5]], '#e63946', 2.2); c.beginPath(); c.arc(0, 0, 2.4, 0, 7); outline(c, '#b01a2a', 2); } });
    add({ id: 'm5_scarf', cat: 'neck', name: 'Cosy Scarf', price: 50, draw(c) { c.fillStyle = '#3a86ff'; c.strokeStyle = INKC; c.lineWidth = 2.2; c.beginPath(); c.rect(-5, -7, 10, 9); c.fill(); c.stroke(); c.fillStyle = '#ffe14a'; c.fillRect(-5, -4, 10, 2.4); c.beginPath(); c.rect(-4, 2, 5, 11); c.fillStyle = '#3a86ff'; c.fill(); c.stroke(); } });
    add({ id: 'm5_lei', cat: 'neck', name: 'Flower Lei', price: 45, draw(c) { for (let i = 0; i < 5; i++) { const x = -6 + i * 3, y = -4 + Math.sin(i / 4 * Math.PI) * 9; c.beginPath(); c.arc(x, y, 2.6, 0, 7); outline(c, ['#ff7aa8', '#ffd23f', '#fff', '#ff9a5a', '#c08aff'][i], 1.8); } } });
    add({ id: 'm5_bell', cat: 'neck', name: 'Jingle Bell', price: 30, draw(c) { c.strokeStyle = '#e63946'; c.lineWidth = 3; c.beginPath(); c.moveTo(-5, -6); c.quadraticCurveTo(0, 6, 5, -6); c.stroke(); c.beginPath(); c.arc(0, 5, 4, 0, 7); outline(c, '#ffd23f', 2); c.fillStyle = '#8a6a00'; c.fillRect(-1, 6, 2, 3); } });
    add({ id: 'm5_boots', cat: 'shoes', name: 'Cowboy Boots', price: 60, draw(c) { poly(c, [[-4, -10], [6, -10], [6, 0], [16, 2], [16, 8], [-4, 8]], '#9a5a2a', 2.4); c.fillStyle = '#d8b04a'; c.fillRect(-4, -10, 10, 2.4); } });
    add({ id: 'm5_sneakers', cat: 'shoes', name: 'Hi-Top Sneakers', price: 60, draw(c) { poly(c, [[-4, -8], [5, -8], [6, 0], [17, 3], [17, 8], [-4, 8]], '#ffffff', 2.4); c.fillStyle = '#e63946'; c.fillRect(-4, 5, 21, 3); c.fillRect(-3, -5, 8, 2); } });
    add({ id: 'm5_wellies', cat: 'shoes', name: 'Wellies', price: 40, draw(c) { poly(c, [[-4, -12], [6, -12], [6, 0], [15, 2], [15, 8], [-4, 8]], '#ffd23f', 2.4); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-2, -10, 3, 12); } });
    add({ id: 'm5_clown', cat: 'shoes', name: 'Clown Shoes', price: 50, draw(c) { ell(c, 8, 2, 16, 6.5, '#e63946', 2.4); c.beginPath(); c.arc(20, 0, 3, 0, 7); outline(c, '#ffe14a', 2); } });
    add({ id: 'm5_rocket', cat: 'shoes', name: 'Rocket Boots', price: 95, draw(c) { poly(c, [[-4, -8], [6, -8], [6, 2], [16, 4], [16, 9], [-4, 9]], '#b8c2d4', 2.4); const f = 4 + Math.sin(performance.now() / 50) * 2; poly(c, [[-4, 9], [4, 9], [0, 12 + f]], '#ff8a1a', 1.8); } });
  }
  const INKC = '#1f2a36';

  // ================================================================ minigames
  const MG = root.Minigames; if (!MG) return;
  const R = () => Math.random(), clamp = (v, a, b) => (v < a ? a : v > b ? b : v), INK = INKC;
  const frame = (host, lw, lh) => { const s = Math.min(host.W / lw, host.H / lh); return { s, ox: (host.W - lw * s) / 2, oy: (host.H - lh * s) / 2 }; };
  const toL = (host, f, e) => { const r = host.ctx.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - f.ox) / f.s, y: (e.clientY - r.top - f.oy) / f.s }; };
  const onPtr = (host, type, fn) => { const cv = host.ctx.canvas, h = (e) => { if (type === 'pointerdown' && e.pointerType === 'mouse' && e.button !== 0) return; fn(e); }; cv.addEventListener(type, h); return () => cv.removeEventListener(type, h); };
  const say = (c, text, x, y, size, col) => { c.save(); c.font = '800 ' + size + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(text, x, y); c.fillStyle = col || INK; c.fillText(text, x, y); c.restore(); };
  const emo = (c, e, x, y, size) => { c.font = size + 'px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, x, y); c.textBaseline = 'alphabetic'; };
  const mkGoose = (c, x, y, s, f, t) => {
    c.save(); c.translate(x, y); c.scale(s * f, s); c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = INK; c.lineWidth = 9; c.beginPath(); c.moveTo(10, -8); c.quadraticCurveTo(24, -22, 18, -38); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.moveTo(10, -8); c.quadraticCurveTo(24, -22, 18, -38); c.stroke();
    c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 22, 14, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.arc(18, -40, 8, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#ff9b2f'; c.beginPath(); c.moveTo(24, -42); c.lineTo(36, -39); c.lineTo(24, -36); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(20, -42, 1.8, 0, 7); c.fill();
    c.strokeStyle = '#ff9b2f'; c.lineWidth = 3; const w = Math.sin((t || 0) * 14) * 4; c.beginPath(); c.moveTo(-5, 12); c.lineTo(-5 + w, 22); c.moveTo(7, 12); c.lineTo(7 - w, 22); c.stroke();
    c.restore();
  };

  // ------------------------------------------------------------ 🔨 Bread Whack
  function createWhack(host) {
    const c = host.ctx, holes = []; for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) holes.push({ x: 200 + q * 200, y: 190 + r * 105, up: 0, kind: 'bread', hit: 0 });
    let t = 0, left = 30, score = 0, spawn = 0.6, over = false, flash = 0;
    const tap = (e) => {
      if (over) return; const f = frame(host, 800, 480), p = toL(host, f, e); let best = null, bd = 80;
      for (const h of holes) { const d = Math.hypot(h.x - p.x, h.y - 10 - p.y); if (d < bd) { bd = d; best = h; } }
      if (!best || best.up <= 0) { return; }
      if (best.kind === 'bread') { score += 1; host.tone('triangle', 500, 800, 0.1, 0.15); } else if (best.kind === 'gold') { score += 5; host.tone('sine', 700, 1200, 0.18, 0.2); } else { score = Math.max(0, score - 3); flash = 0.4; host.snd.ouch(); }
      best.up = 0; best.hit = 0.3;
    };
    const off = onPtr(host, 'pointerdown', tap);
    return {
      destroy() { off(); },
      update(dt) {
        if (over) return; t += dt; left -= dt; flash = Math.max(0, flash - dt);
        spawn -= dt; if (spawn <= 0) { spawn = Math.max(0.28, 0.7 - t * 0.012); const free = holes.filter((h) => h.up <= 0); if (free.length) { const h = free[(R() * free.length) | 0], r = R(); h.kind = r < 0.15 ? 'burnt' : r < 0.25 ? 'gold' : 'bread'; h.up = 0.8 + R() * 0.5 - Math.min(0.35, t * 0.008); } }
        for (const h of holes) { h.up = Math.max(0, h.up - dt); h.hit = Math.max(0, h.hit - dt); }
        host.hud({ title: 'Bread Whack', text: Math.ceil(left) + 's · ' + score + ' pts' });
        if (left <= 0) { over = true; host.end(score, 'You whacked ' + score + ' points of bread'); }
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        for (const h of holes) {
          c.fillStyle = '#5a3a1e'; c.beginPath(); c.ellipse(h.x, h.y + 12, 52, 20, 0, 0, 7); c.fill(); c.fillStyle = '#2a1a0a'; c.beginPath(); c.ellipse(h.x, h.y + 10, 44, 15, 0, 0, 7); c.fill();
          if (h.up > 0 || h.hit > 0) { const k = h.hit > 0 ? 0.6 : Math.min(1, h.up * 6); c.save(); c.beginPath(); c.rect(h.x - 60, h.y - 70, 120, 82); c.clip(); emo(c, h.hit > 0 ? '💥' : h.kind === 'bread' ? '🍞' : h.kind === 'gold' ? '⭐' : '🔥', h.x, h.y + 40 - k * 56, 52); c.restore(); }
        }
        if (flash > 0) { c.fillStyle = 'rgba(230,57,70,' + flash * 0.5 + ')'; c.fillRect(0, 0, 800, 480); }
        c.fillStyle = INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('Tap the bread 🍞 (⭐ = 5!). Do NOT tap the burnt toast 🔥.', 400, 466); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🧺 Bread Catch
  function createCatch(host) {
    const c = host.ctx; let t = 0, gx = 400, tx = 400, score = 0, lives = 3, left = 40, spawn = 0.5, items = [], over = false, kL = 0, kR = 0, bump = 0;
    const move = (e) => { const f = frame(host, 800, 480); tx = clamp(toL(host, f, e).x, 40, 760); };
    const o1 = onPtr(host, 'pointermove', move), o2 = onPtr(host, 'pointerdown', move);
    return {
      destroy() { o1(); o2(); },
      key(code, down) { if (code === 'ArrowLeft' || code === 'KeyA') { kL = down ? 1 : 0; return true; } if (code === 'ArrowRight' || code === 'KeyD') { kR = down ? 1 : 0; return true; } return false; },
      update(dt) {
        if (over) return; t += dt; left -= dt; bump = Math.max(0, bump - dt);
        if (kL || kR) tx = clamp(tx + (kR - kL) * 520 * dt, 40, 760);
        gx += (tx - gx) * Math.min(1, dt * 12);
        spawn -= dt; if (spawn <= 0) { spawn = Math.max(0.25, 0.6 - t * 0.008); const r = R(); items.push({ x: 40 + R() * 720, y: -30, vy: 200 + R() * 140 + t * 4, k: r < 0.18 ? 'rock' : r < 0.26 ? 'gold' : 'bread' }); }
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i]; it.y += it.vy * dt;
          if (it.y > 395 && it.y < 450 && Math.abs(it.x - gx) < 52) { if (it.k === 'rock') { lives--; bump = 0.4; host.snd.ouch(); } else { score += it.k === 'gold' ? 5 : 1; host.tone('triangle', 500, 800, 0.08, 0.12); } items.splice(i, 1); }
          else if (it.y > 520) items.splice(i, 1);
        }
        host.hud({ title: 'Bread Catch', text: Math.ceil(left) + 's · ' + score + ' pts · ' + '❤'.repeat(Math.max(0, lives)) });
        if (lives <= 0 || left <= 0) { over = true; host.end(score, 'You caught ' + score + ' points of bread'); }
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        for (const it of items) emo(c, it.k === 'rock' ? '🪨' : it.k === 'gold' ? '🌟' : '🍞', it.x, it.y, 38);
        mkGoose(c, gx, 430 + (bump > 0 ? Math.sin(bump * 40) * 4 : 0), 1.15, tx < gx - 4 ? -1 : 1, t);
        c.fillStyle = INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('Drag (or arrow keys) to move the goose. Catch bread, dodge the rocks!', 400, 470); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🎵 Simon Honk
  function createSimon(host) {
    const c = host.ctx, cols = ['#e63946', '#2fbf71', '#3a86ff', '#ffd23f'], fr = [330, 440, 550, 660]; let seq = [], idx = 0, state = 'show', t = 0, showI = 0, showT = 0.6, lit = -1, litT = 0, score = 0, over = false;
    const next = () => { seq.push((R() * 4) | 0); idx = 0; state = 'show'; showI = 0; showT = 0.7; lit = -1; };
    next();
    const pad = (i) => ({ x: 200 + (i % 2) * 240, y: 110 + ((i / 2) | 0) * 160, w: 200, h: 140 });
    const press = (i) => {
      if (over || state !== 'input') return; lit = i; litT = 0.25; host.tone('sine', fr[i], fr[i], 0.25, 0.2);
      if (seq[idx] !== i) { over = true; host.snd.ouch(); host.end(score, 'You copied ' + score / 10 + ' rounds'); return; }
      idx++; if (idx >= seq.length) { score += 10; state = 'wait'; showT = 0.7; }
    };
    const off = onPtr(host, 'pointerdown', (e) => { const f = frame(host, 800, 480), p = toL(host, f, e); for (let i = 0; i < 4; i++) { const q = pad(i); if (p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) press(i); } });
    return {
      destroy() { off(); },
      key(code, down) { const m = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, KeyQ: 0, KeyW: 1, KeyA: 2, KeyS: 3 }; if (code in m) { if (down) press(m[code]); return true; } return false; },
      update(dt) {
        if (over) return; t += dt; litT -= dt; if (litT <= 0 && state !== 'show') lit = -1;
        if (state === 'show') { showT -= dt; if (showT <= 0) { if (showI < seq.length) { lit = seq[showI]; litT = 0.35; host.tone('sine', fr[lit], fr[lit], 0.3, 0.18); showI++; showT = Math.max(0.35, 0.6 - seq.length * 0.015); } else { lit = -1; state = 'input'; } } else if (litT <= 0) lit = -1; }
        else if (state === 'wait') { showT -= dt; if (showT <= 0) next(); }
        host.hud({ title: 'Simon Honk', text: (state === 'input' ? 'Your turn!' : 'Watch…') + ' · round ' + seq.length });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        for (let i = 0; i < 4; i++) { const q = pad(i); c.fillStyle = cols[i]; c.globalAlpha = lit === i ? 1 : 0.45; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.roundRect ? c.roundRect(q.x, q.y, q.w, q.h, 22) : c.rect(q.x, q.y, q.w, q.h); c.fill(); c.stroke(); c.globalAlpha = 1; }
        say(c, state === 'input' ? 'Your turn!' : 'Watch…', 400, 70, 34, '#1f2a36'); c.fillStyle = INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('Copy the pattern by tapping the pads (or keys 1 to 4).', 400, 466); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🧱 Block Stack
  function createStack(host) {
    const c = host.ctx; const H = 28; let layers = [{ x: 250, w: 300 }], cur = { x: 0, w: 300, dir: 1 }, speed = 260, score = 0, over = false, camY = 0, cut = null, t = 0;
    const drop = () => {
      if (over) return; const top = layers[layers.length - 1], l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w), w = r - l;
      if (w <= 4) { over = true; host.snd.ouch(); host.end(score, 'Your tower is ' + score + ' blocks tall'); return; }
      const perfect = Math.abs(cur.x - top.x) < 6; if (perfect) { cut = null; layers.push({ x: top.x, w: top.w }); host.tone('sine', 800, 1200, 0.15, 0.2); } else { cut = { x: cur.x < top.x ? cur.x : r, w: cur.w - w, y: layers.length, t: 0 }; layers.push({ x: l, w }); host.tone('triangle', 300, 400, 0.1, 0.15); }
      score++; speed = Math.min(620, speed + 14); cur = { x: score % 2 ? 0 : 800 - layers[layers.length - 1].w, w: layers[layers.length - 1].w, dir: score % 2 ? 1 : -1 };
    };
    const off = onPtr(host, 'pointerdown', drop);
    host.controls([{ label: '⬇ DROP', side: 'R', big: true, down: drop }]);
    return {
      destroy() { off(); },
      key(code, down) { if (code === 'Space' || code === 'Enter') { if (down) drop(); return true; } return false; },
      update(dt) {
        if (over) return; t += dt; cur.x += cur.dir * speed * dt; if (cur.x < 0) { cur.x = 0; cur.dir = 1; } if (cur.x + cur.w > 800) { cur.x = 800 - cur.w; cur.dir = -1; }
        const want = Math.max(0, (layers.length - 7) * H); camY += (want - camY) * Math.min(1, dt * 5); if (cut) cut.t += dt;
        host.hud({ title: 'Block Stack', text: score + ' blocks' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        const Y = (i) => 440 - i * H + camY;
        layers.forEach((l, i) => { c.fillStyle = 'hsl(' + ((i * 22) % 360) + ',75%,60%)'; c.strokeStyle = INK; c.lineWidth = 3; c.fillRect(l.x, Y(i), l.w, H); c.strokeRect(l.x, Y(i), l.w, H); });
        if (cut && cut.t < 1) { c.globalAlpha = 1 - cut.t; c.fillStyle = '#999'; c.fillRect(cut.x, Y(cut.y) + cut.t * 300, cut.w, H); c.globalAlpha = 1; }
        if (!over) { c.fillStyle = 'hsl(' + ((layers.length * 22) % 360) + ',75%,60%)'; c.strokeStyle = INK; c.fillRect(cur.x, Y(layers.length), cur.w, H); c.strokeRect(cur.x, Y(layers.length), cur.w, H); }
        c.fillStyle = INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('Tap to drop the block. Overhang gets chopped off. Line it up!', 400, 470); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ ⚡ Quick Draw
  function createDraw(host) {
    const c = host.ctx; let round = 0, state = 'wait', timer = 1.5 + R() * 2, since = 0, score = 0, msg = '', over = false, results = [];
    const tap = () => {
      if (over) return;
      if (state === 'wait') { state = 'early'; timer = 1.2; msg = '😬 Too early!'; results.push(0); host.snd.ouch(); }
      else if (state === 'go') { const ms = Math.round(since * 1000), pts = Math.round(clamp(100 - (ms - 180) / 5, 0, 100)); score += pts; results.push(ms); state = 'show'; timer = 1.2; msg = ms + ' ms  +' + pts; host.tone('sine', 700, 1100, 0.15, 0.2); }
    };
    const off = onPtr(host, 'pointerdown', tap);
    host.controls([{ label: '⚡ HONK', side: 'R', big: true, down: tap }]);
    return {
      destroy() { off(); },
      key(code, down) { if (code === 'Space' || code === 'Enter') { if (down) tap(); return true; } return false; },
      update(dt) {
        if (over) return; timer -= dt; if (state === 'go') since += dt;
        if (state === 'wait' && timer <= 0) { state = 'go'; since = 0; host.tone('square', 600, 600, 0.12, 0.15); }
        else if ((state === 'show' || state === 'early') && timer <= 0) { round++; if (round >= 5) { over = true; host.end(score, 'Quick draw score ' + score); } else { state = 'wait'; timer = 1.2 + R() * 2.6; } }
        host.hud({ title: 'Quick Draw', text: 'Round ' + Math.min(5, round + 1) + '/5 · ' + score + ' pts' });
      },
      draw() {
        const f = frame(host, 800, 480); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.fillStyle = state === 'go' ? '#2fbf71' : state === 'early' ? '#e8a33a' : '#d94b4b'; c.fillRect(-400, -400, 1600, 1300);
        say(c, state === 'go' ? 'HONK NOW!' : state === 'wait' ? 'Wait for green…' : msg, 400, 230, 56, '#1f2a36'); if (state === 'go') emo(c, '🪿', 400, 330, 90);
        c.fillStyle = '#fff'; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('Tap the moment the screen turns green. Too early = 0 points.', 400, 466); c.restore();
      },
    };
  }

  const add = (o) => MG.list.push(Object.assign({ theme: 'meadow', deco: 'farm' }, o));
  add({ id: 'm5whack', name: 'Bread Whack', icon: '🔨', desc: 'Bread pops out of holes. Tap it fast, grab the stars, dodge the burnt toast.', theme: 'meadow', fmt: (s) => s + ' pts', reward: (s) => s * 2, create: createWhack });
  add({ id: 'm5catch', name: 'Bread Catch', icon: '🧺', desc: 'Slide the goose to catch falling bread. Rocks cost a life.', theme: 'sky', fmt: (s) => s + ' pts', reward: (s) => s * 2, create: createCatch });
  add({ id: 'm5simon', name: 'Simon Honk', icon: '🎵', desc: 'Watch the pattern, then copy it. It gets longer every round.', theme: 'night', fmt: (s) => s + ' pts', reward: (s) => s, create: createSimon });
  add({ id: 'm5stack', name: 'Block Stack', icon: '🧱', desc: 'Drop sliding blocks to build the tallest tower you can.', theme: 'sunset', fmt: (s) => s + ' blocks', reward: (s) => s * 3, create: createStack });
})(window);
