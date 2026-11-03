/* More stuff, part 13: 12 skins and 26 clothes (hats, eyes, face, neck, back, tail, held, pets, auras, trails). */
(function (root) {
  'use strict';
  const INK = '#1f2a36', T = () => performance.now() / 1000;
  const S = root.Skins;
  if (S) {
    const add = (o) => { S.LIST.push(Object.assign({ legC: '#ff9b2f' }, o)); S.BY_ID[o.id] = S.LIST[S.LIST.length - 1]; };
    const clip = (c, fn) => { c.save(); c.beginPath(); c.ellipse(0, 0, 36, 22, 0, 0, 7); c.clip(); fn(); c.restore(); };
    const dots = (c, col, n, r, k) => { c.fillStyle = col; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(((i * (k || 41)) % 64) - 32, ((i * 23) % 36) - 18, r, 0, 7); c.fill(); } };
    const bands = (c, cols, ang) => { c.save(); c.rotate(ang || 0); cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(-50, -30 + i * (60 / cols.length), 100, 60 / cols.length + 0.5); }); c.restore(); };
    const grid = (c, col) => { c.strokeStyle = col; c.lineWidth = 1.4; for (let x = -36; x <= 36; x += 9) { c.beginPath(); c.moveTo(x, -24); c.lineTo(x, 24); c.stroke(); } for (let y = -24; y <= 24; y += 9) { c.beginPath(); c.moveTo(-40, y); c.lineTo(40, y); c.stroke(); } };
    const L = [
      ['m13_sushi', 'Sushi Goose', 520, '#fff', '#f4f4f4', '#222', (c) => clip(c, () => { c.fillStyle = '#ff7a6a'; c.fillRect(-40, -6, 80, 18); c.fillStyle = '#1a2a1a'; c.fillRect(-40, 12, 80, 12); })],
      ['m13_taco', 'Taco Goose', 460, '#ffd070', '#f0b040', '#c07a20', (c) => clip(c, () => { dots(c, '#5ab83a', 8, 4, 31); dots(c, '#e63946', 5, 3, 53); })],
      ['m13_matrix', 'Hacker Goose', 700, '#0a1a0a', '#061006', '#2aff4a', (c) => clip(c, () => { c.fillStyle = '#2aff4a'; c.font = '9px monospace'; for (let i = 0; i < 30; i++) c.fillText(String(i % 2), -34 + (i * 11) % 68, -16 + (i * 7) % 36); })],
      ['m13_sunflower', 'Sunflower Goose', 440, '#ffd23f', '#e0a010', '#5a8a2a', (c) => clip(c, () => { c.fillStyle = '#6a3a10'; c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill(); })],
      ['m13_ice2', 'Glacier Goose', 560, '#c8f0ff', '#a0d8f0', '#4a98c8', (c) => clip(c, () => { c.strokeStyle = '#fff'; c.lineWidth = 2; for (const [x, y] of [[-20, -8], [8, 6], [22, -10]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 9, y + 9); c.lineTo(x + 2, y + 17); c.stroke(); } })],
      ['m13_wood', 'Wooden Goose', 360, '#b07a42', '#8a5a2a', '#6a4018', (c) => clip(c, () => { c.strokeStyle = '#7a4a20'; c.lineWidth = 1.6; for (let y = -18; y <= 18; y += 7) { c.beginPath(); c.moveTo(-40, y); c.quadraticCurveTo(0, y + 4, 40, y); c.stroke(); } })],
      ['m13_aurora', 'Aurora Goose', 760, '#14204a', '#0a1030', '#7affc8', (c) => clip(c, () => bands(c, ['#14204a', '#2a8a6a', '#7affc8', '#8a5aff', '#14204a'], 0.3))],
      ['m13_circuit', 'Circuit Goose', 600, '#2a3a4a', '#1a2a3a', '#19d6ff', (c) => clip(c, () => { c.strokeStyle = '#19d6ff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-34, -10); c.lineTo(-10, -10); c.lineTo(0, 4); c.lineTo(24, 4); c.moveTo(-20, 16); c.lineTo(10, 16); c.lineTo(20, 8); c.stroke(); dots(c, '#19d6ff', 5, 2.2, 29); })],
      ['m13_graph', 'Graph Paper Goose', 340, '#fffef0', '#f4f4e0', '#3a6ad8', (c) => clip(c, () => grid(c, 'rgba(60,110,220,.45)'))],
      ['m13_lemon', 'Lemon Goose', 400, '#fff04a', '#f0d820', '#7aa02a', (c) => clip(c, () => { c.strokeStyle = '#d8c010'; c.lineWidth = 1.6; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(i * 1.047) * 40, Math.sin(i * 1.047) * 40); c.stroke(); } })],
      ['m13_camo', 'Camo Goose', 420, '#6a7a4a', '#5a6a3a', '#3a4a2a', (c) => clip(c, () => { dots(c, '#3a4a2a', 7, 7, 37); dots(c, '#9aa86a', 6, 5, 43); })],
      ['m13_disco', 'Mirrorball Goose', 720, '#d8dde6', '#b8c0d0', '#ffd23f', (c) => clip(c, () => { grid(c, 'rgba(90,100,120,.6)'); for (let i = 0; i < 9; i++) { c.fillStyle = ['#fff', '#ffe27a', '#8ad0ff', '#ff8ac8'][i % 4]; c.globalAlpha = 0.5 + 0.5 * Math.sin(T() * 3 + i); c.fillRect(-32 + (i * 17) % 64, -18 + (i * 11) % 36, 8, 8); } c.globalAlpha = 1; })],
    ];
    for (const [id, name, price, body, wing, legC, deco] of L) add({ id, name, price, body, wing, neckC: body, headC: body, legC, bodyDeco: deco });
  }
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const poly = (c, pts, fill, lw) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); outline(c, fill, lw || 2.4); };
    const dot = (c, x, y, r, f) => { c.beginPath(); c.arc(x, y, r, 0, 7); outline(c, f, 1.6); };
    add({ id: 'm13_tophat', cat: 'hat', name: 'Top Hat', price: 80, draw(c) { c.fillStyle = '#1a1a22'; c.fillRect(-9, -26, 18, 20); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(-9, -26, 18, 20); ell(c, 0, -6, 15, 3.4, '#1a1a22', 2); c.fillStyle = '#e63946'; c.fillRect(-9, -12, 18, 3); } });
    add({ id: 'm13_fez', cat: 'hat', name: 'Fez', price: 50, draw(c) { poly(c, [[-9, -6], [9, -6], [7, -18], [-7, -18]], '#c0282c', 2.2); c.strokeStyle = '#ffd23f'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(3, -18); c.lineTo(9, -10); c.stroke(); } });
    add({ id: 'm13_cat', cat: 'hat', name: 'Cat Ears', price: 45, draw(c) { for (const s of [-1, 1]) poly(c, [[s * 4, -7], [s * 10, -20], [s * 14, -7]], '#333', 2); } });
    add({ id: 'm13_straw', cat: 'hat', name: 'Straw Hat', price: 40, draw(c) { ell(c, 0, -6, 19, 4, '#f0d070', 2.2); c.beginPath(); c.arc(0, -7, 9, Math.PI, 0); c.closePath(); outline(c, '#f0d070', 2.2); c.fillStyle = '#e63946'; c.fillRect(-9, -10, 18, 2.6); } });
    add({ id: 'm13_party2', cat: 'hat', name: 'Disco Hat', price: 90, draw(c) { c.beginPath(); c.arc(0, -4, 11, Math.PI, 0); c.closePath(); outline(c, '#c8d0e0', 2.2); c.fillStyle = '#fff'; for (const [x, y] of [[-5, -8], [2, -11], [6, -6]]) c.fillRect(x, y, 3, 3); } });
    add({ id: 'm13_reading', cat: 'eyes', name: 'Reading Glasses', price: 35, draw(c) { for (const x of [-6, 6]) { c.beginPath(); c.arc(x, 0, 5.4, 0, 7); c.strokeStyle = '#6a4a2a'; c.lineWidth = 2; c.stroke(); } c.beginPath(); c.moveTo(-1, 0); c.lineTo(1, 0); c.stroke(); } });
    add({ id: 'm13_eyepatch', cat: 'eyes', name: 'Eye Patch', price: 30, draw(c) { c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(1, 0, 6.5, 0, 7); c.fill(); c.strokeStyle = '#1a1a1a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-6, -4); c.lineTo(-14, -10); c.stroke(); } });
    add({ id: 'm13_lasers', cat: 'eyes', name: 'Laser Eyes', price: 100, draw(c) { c.fillStyle = '#ff2a2a'; c.beginPath(); c.arc(1, 0, 3, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,40,40,.8)'; c.lineWidth = 3; c.shadowColor = '#f00'; c.shadowBlur = 8; c.beginPath(); c.moveTo(4, 0); c.lineTo(46 + Math.sin(T() * 20) * 3, 2); c.stroke(); } });
    add({ id: 'm13_whisk', cat: 'face', name: 'Cat Whiskers', price: 20, draw(c) { c.strokeStyle = '#333'; c.lineWidth = 1.6; for (const d of [-4, 2, 8]) { c.beginPath(); c.moveTo(4, 5 + d / 2); c.lineTo(20, 2 + d); c.stroke(); } } });
    add({ id: 'm13_clown', cat: 'face', name: 'Clown Nose', price: 25, draw(c) { dot(c, 16, 3, 4.4, '#e63946'); } });
    add({ id: 'm13_bandaid', cat: 'face', name: 'Band-Aid', price: 15, draw(c) { c.save(); c.rotate(-0.5); c.fillStyle = '#f0c8a0'; c.fillRect(-7, 2, 14, 5); c.strokeStyle = INK; c.lineWidth = 1.4; c.strokeRect(-7, 2, 14, 5); c.restore(); } });
    add({ id: 'm13_tie2', cat: 'neck', name: 'Striped Tie', price: 35, draw(c) { poly(c, [[-3, -6], [3, -6], [5, 12], [0, 17], [-5, 12]], '#3a86ff', 2); c.fillStyle = '#fff'; c.fillRect(-3, 2, 6, 2.4); c.fillRect(-4, 7, 8, 2.4); } });
    add({ id: 'm13_collar', cat: 'neck', name: 'Spiked Collar', price: 45, draw(c) { c.fillStyle = '#222'; c.fillRect(-6, -4, 12, 6); c.strokeStyle = INK; c.lineWidth = 1.6; c.strokeRect(-6, -4, 12, 6); c.fillStyle = '#ccc'; for (const x of [-4, 0, 4]) { c.beginPath(); c.moveTo(x - 1.5, -4); c.lineTo(x, -8); c.lineTo(x + 1.5, -4); c.fill(); } } });
    add({ id: 'm13_cape2', cat: 'back', name: 'Vampire Cape', price: 100, draw(c) { const w = Math.sin(T() * 4) * 3; c.beginPath(); c.moveTo(8, -22); c.quadraticCurveTo(-26, -22 + w, -48, 12 + w); c.lineTo(-38, 16); c.lineTo(-30, 10); c.lineTo(-22, 17); c.lineTo(-12, 10); c.lineTo(-2, 14); c.lineTo(8, 10); c.closePath(); outline(c, '#7a1a2a', 2.6); } });
    add({ id: 'm13_balloon2', cat: 'back', name: 'Balloon Bunch', price: 85, draw(c) { for (const [x, col, k] of [[-20, '#e63946', 0], [-8, '#ffd23f', 1], [4, '#3a86ff', 2]]) { const w = Math.sin(T() * 2 + k) * 3; c.strokeStyle = '#666'; c.lineWidth = 1; c.beginPath(); c.moveTo(-8, -10); c.lineTo(x + w, -48); c.stroke(); ell(c, x + w, -56, 7, 9, col, 1.8); } } });
    add({ id: 'm13_tail2', cat: 'tail', name: 'Fox Tail', price: 55, draw(c) { const w = Math.sin(T() * 3) * 4; ell(c, -14, -2 + w * 0.3, 15, 6, '#e8801a', 2); ell(c, -26, -2 + w * 0.6, 6, 5, '#fff', 1.6); } });
    add({ id: 'm13_tail3', cat: 'tail', name: 'Dino Tail', price: 70, draw(c) { poly(c, [[-4, -4], [-30, 0 + Math.sin(T() * 3) * 3], [-4, 6]], '#6ad06a', 2); c.fillStyle = '#3aa03a'; for (const x of [-10, -18, -24]) { c.beginPath(); c.moveTo(x - 2, -2); c.lineTo(x, -7); c.lineTo(x + 2, -2); c.fill(); } } });
    add({ id: 'm13_net', cat: 'held', name: 'Bug Net', price: 40, draw(c) { c.strokeStyle = '#8a5a2a'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, 4); c.lineTo(8, -30); c.stroke(); c.beginPath(); c.arc(10, -38, 9, 0, 7); c.strokeStyle = '#666'; c.lineWidth = 1.6; c.fillStyle = 'rgba(255,255,255,.4)'; c.fill(); c.stroke(); } });
    add({ id: 'm13_camera', cat: 'held', name: 'Camera', price: 60, draw(c) { c.beginPath(); c.rect(-10, -12, 20, 13); outline(c, '#444', 2); c.beginPath(); c.arc(0, -5, 4.4, 0, 7); outline(c, '#8ad0ff', 1.6); c.fillStyle = '#ff4a4a'; c.fillRect(5, -15, 4, 3); } });
    add({ id: 'm13_trophy', cat: 'held', name: 'Trophy', price: 120, draw(c) { c.beginPath(); c.moveTo(-8, -26); c.lineTo(8, -26); c.lineTo(5, -12); c.lineTo(-5, -12); c.closePath(); outline(c, '#ffd23f', 2); c.fillStyle = '#ffd23f'; c.fillRect(-2, -12, 4, 6); c.fillRect(-6, -6, 12, 4); } });
    add({ id: 'm13_wandfire', cat: 'held', name: 'Sparkler', price: 35, draw(c) { c.strokeStyle = '#888'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 4); c.lineTo(5, -22); c.stroke(); for (let i = 0; i < 8; i++) { const a = T() * 9 + i * 0.8, r = 6 + (i % 3) * 3; c.fillStyle = i % 2 ? '#ffd23f' : '#fff'; c.beginPath(); c.arc(5 + Math.cos(a) * r, -24 + Math.sin(a) * r, 1.6, 0, 7); c.fill(); } } });
    const Pt = (id, name, price, draw) => add({ id, cat: 'pet', name, price, draw(c) { c.save(); c.translate(0, Math.sin(T() * 3 + id.length) * 1.4); draw(c); c.restore(); } });
    Pt('m13_fox', 'Baby Fox', 100, (c) => { ell(c, 0, -5, 8, 5.5, '#e8801a', 1.8); dot(c, 5, -10, 4.4, '#e8801a'); c.fillStyle = '#e8801a'; c.strokeStyle = INK; c.lineWidth = 1.4; for (const x of [3, 7.4]) { c.beginPath(); c.moveTo(x - 1.6, -13); c.lineTo(x, -19); c.lineTo(x + 1.6, -13); c.closePath(); c.fill(); c.stroke(); } ell(c, -9, -5, 5, 2.6, '#fff', 1.2); dot(c, 6.4, -10.4, 0.8, INK); });
    Pt('m13_panda', 'Panda Cub', 130, (c) => { ell(c, 0, -5, 8, 6, '#fff', 1.8); dot(c, 5, -10, 4.4, '#fff'); dot(c, 2.4, -14, 1.8, '#222'); dot(c, 7.6, -14, 1.8, '#222'); dot(c, 6.6, -10.4, 1, '#222'); });
    Pt('m13_dragon2', 'Tiny Dragon', 150, (c) => { ell(c, 0, -5, 8, 5.4, '#e04a3a', 1.8); dot(c, 6, -10, 4, '#e04a3a'); c.fillStyle = '#ffb02a'; for (const x of [-4, 0, 4]) { c.beginPath(); c.moveTo(x - 1.6, -9); c.lineTo(x, -13); c.lineTo(x + 1.6, -9); c.fill(); } dot(c, 7.4, -10.6, 0.8, INK); });
    Pt('m13_star', 'Star Sprite', 120, (c) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9; c.lineTo(Math.cos(a) * r, -12 + Math.sin(a) * r); } c.closePath(); outline(c, '#ffd23f', 1.8); dot(c, -2, -12, 0.9, INK); dot(c, 2, -12, 0.9, INK); });
    add({ id: 'm13_a_leaves', cat: 'aura', name: 'Falling Leaves', price: 110, draw(c) { for (let i = 0; i < 6; i++) { const t = (T() * 0.4 + i / 6) % 1; c.save(); c.translate(Math.sin(i * 2.7 + t * 5) * 36, -50 + t * 90); c.rotate(t * 8 + i); ell(c, 0, 0, 4.4, 2.2, ['#e8801a', '#d0a020', '#a83a1a'][i % 3], 1); c.restore(); } } });
    add({ id: 'm13_a_bubbles', cat: 'aura', name: 'Bubble Cloud', price: 100, draw(c) { for (let i = 0; i < 7; i++) { const t = (T() * 0.5 + i / 7) % 1; c.globalAlpha = 1 - t; c.strokeStyle = '#8ad0ff'; c.lineWidth = 2; c.beginPath(); c.arc(Math.sin(i * 2.1) * 34, 14 - t * 70, 3 + (i % 3) * 2, 0, 7); c.stroke(); } c.globalAlpha = 1; } });
    add({ id: 'm13_a_lightning', cat: 'aura', name: 'Storm Cloud', price: 130, draw(c) { ell(c, 0, -52, 22, 8, '#4a5068', 2); if (Math.sin(T() * 5) > 0.7) { c.strokeStyle = '#ffe14a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -44); c.lineTo(-6, -30); c.lineTo(2, -28); c.lineTo(-4, -12); c.stroke(); } } });
    const tr = (id, name, price, kind, cols, em) => add({ id, cat: 'trail', name, price, trail: { kind, cols }, draw(c) { c.font = '16px system-ui'; c.textAlign = 'center'; c.fillText(em, 0, 5); } });
    tr('m13_t_rain', 'Rainbow Sparkle', 140, 'spark', ['#ff4d4d', '#ffd23f', '#4cd964', '#3a86ff', '#9b5de5'], '🌈');
    tr('m13_t_fire2', 'Purple Flames', 120, 'flame', ['#9b5de5', '#d08aff', '#fff'], '🟣');
    tr('m13_t_coins', 'Coin Trail', 100, 'spark', ['#ffd23f', '#fff3b0'], '🪙');
  }
})(window);
