/*
 * More stuff, part 10: 12 skins and 24 clothes (hats, eyes, face, back, held, aura, trails).
 */
(function (root) {
  'use strict';
  const INK = '#1f2a36', T = () => performance.now() / 1000;
  const S = root.Skins;
  if (S) {
    const add = (o) => { S.LIST.push(Object.assign({ legC: '#ff9b2f' }, o)); S.BY_ID[o.id] = S.LIST[S.LIST.length - 1]; };
    const clip = (c, fn) => { c.save(); c.beginPath(); c.ellipse(0, 0, 36, 22, 0, 0, 7); c.clip(); fn(); c.restore(); };
    const bands = (c, cols) => cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(-40, -24 + i * (48 / cols.length), 80, 48 / cols.length + 0.5); });
    const spots = (c, col, n, seed) => { c.fillStyle = col; for (let i = 0; i < n; i++) { const x = ((i * 47 + seed * 13) % 64) - 32, y = ((i * 29 + seed * 7) % 36) - 18, r = 2 + ((i * 5 + seed) % 4); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } };
    const T2 = [
      ['m10_pride', 'Pride Goose', 520, '#ffffff', '#f4f4f4', '#ff9b2f', (c) => clip(c, () => bands(c, ['#e63946', '#ff9a2a', '#ffe14a', '#4cd964', '#3a86ff', '#9b5de5']))],
      ['m10_sunrise', 'Sunrise Goose', 480, '#ffd8a0', '#ffb070', '#e8603a', (c) => clip(c, () => bands(c, ['#ffe9a8', '#ffc870', '#ff9a5a', '#e8603a']))],
      ['m10_night', 'Starlight Goose', 520, '#10183a', '#1b2a5a', '#ffe14a', (c) => clip(c, () => { spots(c, '#fff', 14, 3); spots(c, '#ffe27a', 6, 9); })],
      ['m10_toxic', 'Toxic Goose', 460, '#9aff3a', '#6ad010', '#2a2a2a', (c) => clip(c, () => spots(c, '#3a7a0a', 9, 5))],
      ['m10_sakura', 'Sakura Goose', 460, '#ffe8f0', '#ffc8dc', '#e8708a', (c) => clip(c, () => spots(c, '#ff9ab8', 11, 2))],
      ['m10_mono', 'Monochrome Goose', 400, '#e8e8e8', '#222222', '#222', (c) => clip(c, () => bands(c, ['#fff', '#222', '#fff', '#222']))],
      ['m10_royal', 'Royal Goose', 700, '#5a2ab8', '#3a1a98', '#ffd23f', (c) => clip(c, () => { spots(c, '#ffd23f', 8, 4); })],
      ['m10_stone', 'Stone Goose', 340, '#9a9aa4', '#7a7a86', '#5a5a64', (c) => clip(c, () => spots(c, '#6a6a76', 12, 8))],
      ['m10_lagoon', 'Lagoon Goose', 440, '#2ad0c8', '#1a98b8', '#ffd23f', (c) => clip(c, () => bands(c, ['#8af4ee', '#2ad0c8', '#1a98b8', '#1a68a8']))],
      ['m10_rust', 'Rusty Goose', 320, '#b8602a', '#8a4018', '#5a3010', (c) => clip(c, () => spots(c, '#6a3010', 13, 6))],
      ['m10_bubblegum2', 'Fizzy Goose', 420, '#ff9ae8', '#c88af0', '#8a5ad8', (c) => clip(c, () => { spots(c, 'rgba(255,255,255,.7)', 12, 1); })],
      ['m10_gold2', 'Treasure Goose', 800, '#ffd23f', '#e0a010', '#a87a10', (c) => clip(c, () => { spots(c, '#fff3b0', 10, 7); })],
    ];
    for (const [id, name, price, body, wing, legC, deco] of T2) add({ id, name, price, body, wing, neckC: body, headC: body, legC, bodyDeco: deco });
  }
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const poly = (c, pts, fill, lw) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); outline(c, fill, lw || 2.4); };
    const dot = (c, x, y, r, f) => { c.beginPath(); c.arc(x, y, r, 0, 7); outline(c, f, 1.6); };
    add({ id: 'm10_unicorn', cat: 'hat', name: 'Unicorn Horn', price: 90, draw(c) { poly(c, [[-3, -9], [3, -9], [0, -26]], '#fff4a8', 2.2); c.strokeStyle = '#ff8ac8'; c.lineWidth = 1.4; for (const y of [-13, -17, -21]) { c.beginPath(); c.moveTo(-2, y); c.lineTo(2, y - 1); c.stroke(); } } });
    add({ id: 'm10_pirate2', cat: 'hat', name: 'Captain Hat', price: 95, draw(c) { poly(c, [[-14, -6], [-8, -16], [8, -16], [14, -6], [0, -3]], '#1a1a3a', 2.4); dot(c, 0, -10, 2.4, '#ffd23f'); } });
    add({ id: 'm10_bow', cat: 'hat', name: 'Hair Bow', price: 35, draw(c) { poly(c, [[0, -13], [-9, -19], [-9, -7]], '#ff4d8d', 2); poly(c, [[0, -13], [9, -19], [9, -7]], '#ff4d8d', 2); dot(c, 0, -13, 2.4, '#d6246a'); } });
    add({ id: 'm10_hardhat', cat: 'hat', name: 'Hard Hat', price: 45, draw(c) { c.beginPath(); c.arc(0, -4, 11, Math.PI, 0); c.closePath(); outline(c, '#ffd23f', 2.4); c.fillStyle = '#ffd23f'; c.fillRect(-13, -6, 26, 3); c.fillRect(-2, -15, 4, 8); } });
    add({ id: 'm10_graduate', cat: 'hat', name: 'Graduation Cap', price: 75, draw(c) { poly(c, [[-14, -12], [0, -17], [14, -12], [0, -7]], '#1a1a22', 2.2); c.fillStyle = '#1a1a22'; c.fillRect(-6, -9, 12, 5); c.strokeStyle = '#ffd23f'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(10, -13); c.lineTo(13, -3); c.stroke(); } });
    add({ id: 'm10_ninja', cat: 'hat', name: 'Ninja Headband', price: 50, draw(c) { c.fillStyle = '#e63946'; c.fillRect(-11, -6, 22, 4); c.strokeStyle = INK; c.lineWidth = 1.6; c.strokeRect(-11, -6, 22, 4); poly(c, [[-11, -4], [-20, -1], [-17, -7]], '#e63946', 1.6); } });
    add({ id: 'm10_swirl', cat: 'eyes', name: 'Swirly Eyes', price: 30, draw(c) { c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); for (let a = 0; a < 12; a += 0.4) c.lineTo(Math.cos(a) * a * 0.6, Math.sin(a) * a * 0.6); c.stroke(); } });
    add({ id: 'm10_hearteyes', cat: 'eyes', name: 'Heart Eyes', price: 35, draw(c) { c.beginPath(); c.moveTo(0, 5); c.bezierCurveTo(-8, -1, -4, -7, 0, -2); c.bezierCurveTo(4, -7, 8, -1, 0, 5); c.fillStyle = '#ff2a5a'; c.fill(); } });
    add({ id: 'm10_cyber', cat: 'eyes', name: 'Cyber Visor', price: 85, draw(c) { c.beginPath(); c.rect(-10, -3, 20, 7); c.fillStyle = '#19d6ff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2.2; c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-8, -2, 9, 1.8); } });
    add({ id: 'm10_tear', cat: 'face', name: 'Little Tear', price: 20, draw(c) { c.fillStyle = '#6ad0ff'; c.beginPath(); c.moveTo(-1, 2); c.quadraticCurveTo(-4, 7, -1, 9); c.quadraticCurveTo(2, 7, -1, 2); c.fill(); } });
    add({ id: 'm10_scar', cat: 'face', name: 'Battle Scar', price: 30, draw(c) { c.strokeStyle = '#a02a2a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-4, -2); c.lineTo(4, 7); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1; for (const t of [0.3, 0.55, 0.8]) { c.beginPath(); c.moveTo(-4 + 8 * t - 2, -2 + 9 * t + 1); c.lineTo(-4 + 8 * t + 2, -2 + 9 * t - 1); c.stroke(); } } });
    add({ id: 'm10_stars', cat: 'face', name: 'Star Sticker', price: 20, draw(c) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2 : 4.4; c.lineTo(Math.cos(a) * r + 3, Math.sin(a) * r + 4); } c.closePath(); c.fillStyle = '#ffd23f'; c.fill(); } });
    add({ id: 'm10_angel', cat: 'back', name: 'Feathered Wings', price: 150, draw(c) { const w = Math.sin(T() * 3) * 3; for (let i = 0; i < 4; i++) ell(c, -12 - i * 3, -22 + i * 5 + w, 14 - i * 2, 4.4, '#fff', 1.8); } });
    add({ id: 'm10_cloak', cat: 'back', name: 'Wizard Cloak', price: 110, draw(c) { const w = Math.sin(T() * 4) * 2; c.beginPath(); c.moveTo(8, -18); c.quadraticCurveTo(-26, -20 + w, -46, 8 + w); c.lineTo(-40, 16); c.quadraticCurveTo(-18, 20, 8, 12); c.closePath(); outline(c, '#4a2a9a', 2.6); c.fillStyle = '#ffd23f'; for (const [x, y] of [[-14, -2], [-28, 4], [-6, 6]]) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); } } });
    add({ id: 'm10_sword2', cat: 'held', name: 'Laser Sword', price: 130, draw(c) { c.save(); c.rotate(-0.5); c.fillStyle = '#555'; c.fillRect(-2, -4, 4, 10); const g = c.createLinearGradient(0, -34, 0, -4); g.addColorStop(0, '#fff'); g.addColorStop(1, '#19d6ff'); c.fillStyle = g; c.shadowColor = '#19d6ff'; c.shadowBlur = 8; c.fillRect(-2, -34, 4, 30); c.restore(); } });
    add({ id: 'm10_cup', cat: 'held', name: 'Hot Cocoa', price: 40, draw(c) { c.beginPath(); c.rect(-6, -10, 12, 12); outline(c, '#fff', 2); c.fillStyle = '#6a3a1a'; c.fillRect(-5, -9, 10, 3); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(7, -4, 3.4, -1.5, 1.5); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.6; const w = Math.sin(T() * 4) * 2; c.beginPath(); c.moveTo(-1, -13); c.quadraticCurveTo(-3 + w, -17, -1, -21); c.stroke(); } });
    add({ id: 'm10_kite', cat: 'held', name: 'Kite', price: 55, draw(c) { const w = Math.sin(T() * 2) * 3; c.strokeStyle = '#666'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 2); c.quadraticCurveTo(8 + w, -22, 14 + w, -40); c.stroke(); poly(c, [[14 + w, -52], [22 + w, -42], [14 + w, -34], [6 + w, -42]], '#e63946', 1.8); } });
    add({ id: 'm10_lantern', cat: 'held', name: 'Lantern', price: 60, draw(c) { c.strokeStyle = '#444'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -10); c.stroke(); c.beginPath(); c.rect(-5, -22, 10, 12); outline(c, '#ffe27a', 2); c.fillStyle = 'rgba(255,230,120,.25)'; c.beginPath(); c.arc(0, -16, 18, 0, 7); c.fill(); } });
    add({ id: 'm10_butter', cat: 'aura', name: 'Butterflies', price: 130, draw(c) { for (let i = 0; i < 4; i++) { const a = T() * 1.2 + i * 1.57, x = Math.cos(a) * 46, y = Math.sin(a * 1.3) * 24 - 6, f = Math.abs(Math.sin(T() * 12 + i)); ell(c, x - 3, y, 3 * f + 0.8, 3, ['#ff8ac8', '#8ad0ff', '#ffd23f', '#b8ff8a'][i], 1); ell(c, x + 3, y, 3 * f + 0.8, 3, ['#ff8ac8', '#8ad0ff', '#ffd23f', '#b8ff8a'][i], 1); } } });
    add({ id: 'm10_rainc', cat: 'aura', name: 'Rain Cloud', price: 100, draw(c) { ell(c, 0, -52, 22, 8, '#8a98b0', 2); for (let i = 0; i < 6; i++) { const t = (T() * 1.4 + i / 6) % 1; c.strokeStyle = '#6ab8ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-16 + i * 6, -44 + t * 70); c.lineTo(-16 + i * 6 - 1, -40 + t * 70); c.stroke(); } } });
    add({ id: 'm10_embers', cat: 'aura', name: 'Embers', price: 140, draw(c) { for (let i = 0; i < 9; i++) { const t = (T() * 0.9 + i / 9) % 1; c.globalAlpha = 1 - t; c.fillStyle = i % 2 ? '#ff8a1a' : '#ffd23f'; c.beginPath(); c.arc(Math.sin(i * 2.9) * 34 + Math.sin(t * 6 + i) * 4, 18 - t * 64, 2.4 * (1 - t) + 0.6, 0, 7); c.fill(); } c.globalAlpha = 1; } });
    const tr = (id, name, price, kind, cols, em) => add({ id, cat: 'trail', name, price, trail: { kind, cols }, draw(c) { c.font = '16px system-ui'; c.textAlign = 'center'; c.fillText(em, 0, 5); } });
    tr('m10_t_fire', 'Blue Flames', 110, 'flame', ['#3a86ff', '#19d6ff', '#fff'], '🔵');
    tr('m10_t_bubbles', 'Pink Bubbles', 80, 'bubble', ['#ff8ac8', '#ffc8e8'], '🫧');
    tr('m10_t_gold', 'Gold Dust', 120, 'spark', ['#ffd23f', '#fff3b0'], '✨');
  }
})(window);
