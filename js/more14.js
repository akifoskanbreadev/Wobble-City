/* More stuff, part 14: 10 skins and 22 clothes. */
(function (root) {
  'use strict';
  const INK = '#1f2a36', T = () => performance.now() / 1000;
  const S = root.Skins;
  if (S) {
    const add = (o) => { S.LIST.push(Object.assign({ legC: '#ff9b2f' }, o)); S.BY_ID[o.id] = S.LIST[S.LIST.length - 1]; };
    const clip = (c, fn) => { c.save(); c.beginPath(); c.ellipse(0, 0, 36, 22, 0, 0, 7); c.clip(); fn(); c.restore(); };
    const dots = (c, col, n, r, k) => { c.fillStyle = col; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(((i * (k || 41)) % 64) - 32, ((i * 23) % 36) - 18, r, 0, 7); c.fill(); } };
    const bands = (c, cols, ang) => { c.save(); c.rotate(ang || 0); cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(-50, -30 + i * (60 / cols.length), 100, 60 / cols.length + 0.5); }); c.restore(); };
    const L = [
      ['m14_pizza', 'Pizza Goose', 480, '#ffd070', '#f0a830', '#c07a20', (c) => clip(c, () => { dots(c, '#d62828', 7, 5, 37); dots(c, '#fff3b0', 5, 3, 29); })],
      ['m14_galaxy2', 'Nebula Goose', 760, '#1a1040', '#2a1860', '#9b5de5', (c) => clip(c, () => { for (let i = 0; i < 14; i++) { c.fillStyle = ['#fff', '#d08aff', '#8ad0ff'][i % 3]; c.globalAlpha = 0.5 + 0.5 * Math.sin(T() * 2 + i); c.fillRect(-32 + (i * 19) % 64, -18 + (i * 13) % 36, 2, 2); } c.globalAlpha = 1; })],
      ['m14_cactus', 'Cactus Goose', 440, '#5ab050', '#3a8a38', '#2a6a28', (c) => clip(c, () => { c.strokeStyle = '#2a6a28'; c.lineWidth = 1.6; for (let x = -28; x <= 28; x += 10) { c.beginPath(); c.moveTo(x, -22); c.lineTo(x, 22); c.stroke(); } c.fillStyle = '#fff'; for (let i = 0; i < 9; i++) c.fillRect(-30 + i * 7, -10 + (i % 3) * 9, 2, 2); })],
      ['m14_candycane', 'Candy Cane Goose', 520, '#fff', '#ffd0d4', '#e63946', (c) => clip(c, () => bands(c, ['#e63946', '#fff', '#e63946', '#fff', '#e63946', '#fff'], 0.6))],
      ['m14_denim', 'Denim Goose', 400, '#4a78b8', '#3a5a98', '#2a3a6a', (c) => clip(c, () => { c.strokeStyle = '#ffd070'; c.lineWidth = 1.2; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(-34, 10); c.lineTo(34, 10); c.stroke(); c.setLineDash([]); c.fillStyle = '#3a5a98'; c.fillRect(8, -6, 14, 12); })],
      ['m14_lava', 'Magma Goose', 640, '#2a1a1a', '#1a0e0e', '#ff6a1a', (c) => clip(c, () => { c.strokeStyle = '#ff7a1a'; c.lineWidth = 2.2; c.shadowColor = '#f60'; c.shadowBlur = 6; for (const [x, y] of [[-22, -8], [0, 4], [20, -6]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8, y + 7); c.lineTo(x + 2, y + 14); c.stroke(); } })],
      ['m14_cow', 'Cow Goose', 420, '#fff', '#eee', '#f0a0a0', (c) => clip(c, () => { c.fillStyle = '#222'; for (const [x, y, r] of [[-18, -6, 8], [6, 8, 9], [22, -8, 6]]) { c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0.4, 0, 7); c.fill(); } })],
      ['m14_pastel', 'Pastel Goose', 380, '#ffe0f0', '#d8f0ff', '#c8b0ff', (c) => clip(c, () => bands(c, ['#ffd0e8', '#d0e8ff', '#e0ffd8', '#fff0c0'], 0))],
      ['m14_circuit', 'Circuit Goose', 680, '#10283a', '#0a1c2a', '#2affd0', (c) => clip(c, () => { c.strokeStyle = '#2affd0'; c.lineWidth = 1.4; for (const y of [-12, 0, 12]) { c.beginPath(); c.moveTo(-34, y); c.lineTo(-8, y); c.lineTo(0, y + 6); c.lineTo(34, y + 6); c.stroke(); c.fillStyle = '#2affd0'; c.fillRect(-10, y - 2, 4, 4); } })],
      ['m14_gold2', 'Golden Goose Deluxe', 1200, '#ffd23f', '#ffb800', '#c08000', (c) => clip(c, () => { const g = c.createLinearGradient(-30, -20, 30, 20); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5 + 0.4 * Math.sin(T() * 2), 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-40, -24, 80, 48); })],
    ];
    for (const [id, name, price, body, wing, legC, deco] of L) add({ id, name, price, body, wing, neckC: body, headC: body, legC, bodyDeco: deco });
  }
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const poly = (c, pts, fill, lw) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); outline(c, fill, lw || 2.4); };
    const dot = (c, x, y, r, f) => { c.beginPath(); c.arc(x, y, r, 0, 7); outline(c, f, 1.6); };
    add({ id: 'm14_beanie', cat: 'hat', name: 'Beanie', price: 40, draw(c) { c.beginPath(); c.arc(0, -5, 10, Math.PI, 0); c.closePath(); outline(c, '#e63946', 2.2); c.fillStyle = '#fff'; c.fillRect(-10, -7, 20, 3.4); dot(c, 0, -16, 2.6, '#fff'); } });
    add({ id: 'm14_chef', cat: 'hat', name: 'Chef Hat', price: 55, draw(c) { for (const x of [-5, 0, 5]) dot(c, x, -16 - (x === 0 ? 2 : 0), 5.4, '#fff'); c.fillStyle = '#fff'; c.fillRect(-8, -14, 16, 9); c.strokeStyle = INK; c.lineWidth = 1.8; c.strokeRect(-8, -14, 16, 9); } });
    add({ id: 'm14_viking', cat: 'hat', name: 'Viking Helmet', price: 85, draw(c) { c.beginPath(); c.arc(0, -4, 10, Math.PI, 0); c.closePath(); outline(c, '#9aa4b4', 2.2); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 9, -8); c.quadraticCurveTo(s * 18, -10, s * 15, -22); c.quadraticCurveTo(s * 13, -12, s * 8, -9); c.closePath(); outline(c, '#f4ecd0', 1.8); } } });
    add({ id: 'm14_wizard2', cat: 'hat', name: 'Starry Wizard Hat', price: 95, draw(c) { poly(c, [[-12, -5], [12, -5], [3, -32], [-1, -30]], '#3a2a88', 2.2); ell(c, 0, -5, 16, 3.4, '#3a2a88', 2); c.fillStyle = '#ffd23f'; c.fillRect(-3, -18, 3, 3); c.fillRect(3, -11, 3, 3); } });
    add({ id: 'm14_halo2', cat: 'hat', name: 'Neon Halo', price: 70, draw(c) { c.strokeStyle = '#6affd8'; c.lineWidth = 3; c.shadowColor = '#6affd8'; c.shadowBlur = 8 + Math.sin(T() * 4) * 3; c.beginPath(); c.ellipse(0, -16, 10, 3.4, 0, 0, 7); c.stroke(); c.shadowBlur = 0; } });
    add({ id: 'm14_heart', cat: 'eyes', name: 'Heart Glasses', price: 45, draw(c) { for (const x of [-6, 6]) { c.fillStyle = '#ff5a8a'; c.beginPath(); c.moveTo(x, 4); c.bezierCurveTo(x - 8, -2, x - 5, -8, x, -3); c.bezierCurveTo(x + 5, -8, x + 8, -2, x, 4); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke(); } } });
    add({ id: 'm14_visor', cat: 'eyes', name: 'Cyber Visor', price: 90, draw(c) { c.fillStyle = 'rgba(40,255,200,.75)'; c.fillRect(-12, -4, 26, 7); c.strokeStyle = INK; c.lineWidth = 1.8; c.strokeRect(-12, -4, 26, 7); c.fillStyle = '#fff'; c.fillRect(-12 + ((T() * 20) % 26), -3, 3, 5); } });
    add({ id: 'm14_stache', cat: 'face', name: 'Big Moustache', price: 30, draw(c) { c.fillStyle = '#4a2a14'; c.beginPath(); c.moveTo(8, 4); c.quadraticCurveTo(14, -2, 20, 3); c.quadraticCurveTo(26, 0, 28, 6); c.quadraticCurveTo(18, 8, 8, 4); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); } });
    add({ id: 'm14_blush', cat: 'face', name: 'Rosy Cheeks', price: 15, draw(c) { c.fillStyle = 'rgba(255,90,120,.55)'; c.beginPath(); c.arc(0, 5, 4.4, 0, 7); c.fill(); } });
    add({ id: 'm14_bell', cat: 'neck', name: 'Jingle Bell', price: 25, draw(c) { c.strokeStyle = '#c03030'; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, -3); c.lineTo(6, -3); c.stroke(); dot(c, 0, 4 + Math.sin(T() * 6) * 0.6, 4, '#ffd23f'); } });
    add({ id: 'm14_scarf2', cat: 'neck', name: 'Rainbow Scarf', price: 50, draw(c) { ['#ff4d4d', '#ffd23f', '#4cd964', '#3a86ff'].forEach((col, i) => { c.fillStyle = col; c.fillRect(-7, -6 + i * 3.4, 14, 3.5); }); c.strokeStyle = INK; c.lineWidth = 1.6; c.strokeRect(-7, -6, 14, 14); } });
    add({ id: 'm14_jetpack', cat: 'back', name: 'Jetpack', price: 120, draw(c) { for (const y of [-14, -4]) { c.beginPath(); c.rect(-22, y, 10, 8); outline(c, '#8a96a8', 2); } const f = 6 + Math.sin(T() * 30) * 3; for (const y of [-14, -4]) { c.fillStyle = '#ff9a2a'; c.beginPath(); c.moveTo(-22, y + 8); c.lineTo(-17, y + 8 + f * 2); c.lineTo(-12, y + 8); c.fill(); } } });
    add({ id: 'm14_wings2', cat: 'back', name: 'Butterfly Wings', price: 95, draw(c) { const w = 1 + Math.sin(T() * 5) * 0.12; for (const [sy, col] of [[-1, '#ff8ac8'], [1, '#8ad0ff']]) { c.save(); c.translate(-8, -12); c.scale(1, w); ell(c, -12, sy * 8, 15, 9, col, 2); c.restore(); } } });
    add({ id: 'm14_tail4', cat: 'tail', name: 'Peacock Tail', price: 90, draw(c) { for (let i = -2; i <= 2; i++) { c.save(); c.translate(-6, -2); c.rotate(i * 0.3 + Math.sin(T() * 2) * 0.05); ell(c, -22, 0, 18, 5, '#2a9d8f', 1.8); dot(c, -34, 0, 2.6, '#ffd23f'); c.restore(); } } });
    add({ id: 'm14_umbrella', cat: 'held', name: 'Umbrella', price: 45, draw(c) { c.strokeStyle = '#555'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -28); c.stroke(); c.beginPath(); c.arc(0, -28, 17, Math.PI, 0); c.closePath(); outline(c, '#e63946', 2); c.fillStyle = '#fff'; c.fillRect(-1, -45, 2, 17); } });
    add({ id: 'm14_guitar', cat: 'held', name: 'Guitar', price: 75, draw(c) { c.save(); c.rotate(-0.6); c.strokeStyle = '#6a4018'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, -40); c.stroke(); ell(c, 0, -2, 9, 11, '#c07a30', 2); dot(c, 0, -2, 3, '#3a2008'); c.restore(); } });
    add({ id: 'm14_icecream', cat: 'held', name: 'Ice Cream', price: 30, draw(c) { poly(c, [[-5, -14], [5, -14], [0, 2]], '#e8b060', 1.8); dot(c, 0, -18, 6, '#ff9ac8'); dot(c, 0, -25, 4.6, '#fff3b0'); } });
    add({ id: 'm14_torch', cat: 'held', name: 'Torch', price: 40, draw(c) { c.strokeStyle = '#6a4018'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(0, 4); c.lineTo(4, -22); c.stroke(); for (let i = 0; i < 3; i++) { c.fillStyle = ['#ff4a1a', '#ff9a2a', '#ffe14a'][i]; c.beginPath(); c.ellipse(4, -28 - Math.sin(T() * 12 + i) * 1.5, 6 - i * 1.6, 9 - i * 2, 0, 0, 7); c.fill(); } } });
    const Pt = (id, name, price, draw) => add({ id, cat: 'pet', name, price, draw(c) { c.save(); c.translate(0, Math.sin(T() * 3 + id.length) * 1.4); draw(c); c.restore(); } });
    Pt('m14_bunny', 'Mini Bunny', 100, (c) => { ell(c, 0, -5, 8, 5.5, '#fff', 1.8); dot(c, 5, -10, 4.2, '#fff'); for (const x of [3, 7]) ell(c, x, -18, 1.8, 5, '#fff', 1.4); dot(c, 6.4, -10.4, 0.9, INK); });
    Pt('m14_ghost', 'Friendly Ghost', 110, (c) => { c.beginPath(); c.arc(0, -10, 8, Math.PI, 0); c.lineTo(8, -1); c.lineTo(4, -4); c.lineTo(0, -1); c.lineTo(-4, -4); c.lineTo(-8, -1); c.closePath(); c.globalAlpha = 0.85; outline(c, '#fff', 1.8); c.globalAlpha = 1; dot(c, -3, -10, 1.2, INK); dot(c, 3, -10, 1.2, INK); });
    Pt('m14_robot', 'Mini Robot', 130, (c) => { c.beginPath(); c.rect(-7, -14, 14, 11); outline(c, '#9aa4b4', 1.8); dot(c, -2.6, -9, 1.6, '#2affd0'); dot(c, 2.6, -9, 1.6, '#2affd0'); c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -14); c.lineTo(0, -19); c.stroke(); dot(c, 0, -20, 1.6, '#ff4a4a'); });
    add({ id: 'm14_a_snow', cat: 'aura', name: 'Snowfall', price: 90, draw(c) { c.fillStyle = '#fff'; for (let i = 0; i < 12; i++) { const t = (T() * 0.35 + i / 12) % 1; c.globalAlpha = 0.9 - t * 0.5; c.beginPath(); c.arc(Math.sin(i * 3.1 + t * 4) * 38, -50 + t * 90, 2 + (i % 3) * 0.7, 0, 7); c.fill(); } c.globalAlpha = 1; } });
    add({ id: 'm14_a_hearts', cat: 'aura', name: 'Floating Hearts', price: 100, draw(c) { for (let i = 0; i < 5; i++) { const t = (T() * 0.4 + i / 5) % 1; c.globalAlpha = 1 - t; c.fillStyle = '#ff5a8a'; c.font = '14px system-ui'; c.fillText('♥', Math.sin(i * 2.3) * 28, 10 - t * 70); } c.globalAlpha = 1; } });
    const tr = (id, name, price, kind, cols, em) => add({ id, cat: 'trail', name, price, trail: { kind, cols }, draw(c) { c.font = '16px system-ui'; c.textAlign = 'center'; c.fillText(em, 0, 5); } });
    tr('m14_t_hearts', 'Love Trail', 110, 'spark', ['#ff5a8a', '#ffb0c8', '#fff'], '💗');
    tr('m14_t_snow', 'Snowflake Trail', 100, 'spark', ['#fff', '#cfeaff', '#8ad0ff'], '❄️');
  }
})(window);
