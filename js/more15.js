/* More stuff, part 15: 8 skins and 14 clothes. */
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
      ['m15_tiger', 'Tiger Goose', 520, '#ff9a2a', '#e07a10', '#c06010', (c) => clip(c, () => { c.fillStyle = '#2a1a0a'; for (let x = -30; x <= 30; x += 12) { c.beginPath(); c.moveTo(x, -22); c.lineTo(x + 4, -4); c.lineTo(x - 2, 22); c.lineTo(x + 6, 22); c.lineTo(x + 8, -4); c.lineTo(x + 5, -22); c.fill(); } })],
      ['m15_ocean', 'Ocean Goose', 480, '#4ab8e8', '#2a98d0', '#1a6a98', (c) => clip(c, () => { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; for (const y of [-12, 0, 12]) { c.beginPath(); for (let x = -36; x <= 36; x += 4) c.lineTo(x, y + Math.sin(x * 0.25 + T() * 2) * 3); c.stroke(); } })],
      ['m15_bubblegum', 'Bubblegum Goose', 400, '#ff9ad0', '#ff6ab8', '#d03a98', (c) => clip(c, () => { dots(c, '#ffd0ec', 8, 4, 37); })],
      ['m15_mint', 'Mint Choc Goose', 440, '#8af0d0', '#5ad8b0', '#3a8a70', (c) => clip(c, () => { c.fillStyle = '#4a2a1a'; for (let i = 0; i < 9; i++) c.fillRect(-30 + (i * 17) % 60, -16 + (i * 11) % 32, 5, 4); })],
      ['m15_thunder', 'Thunder Goose', 640, '#3a4068', '#2a3050', '#ffe14a', (c) => clip(c, () => { if (Math.sin(T() * 4) > 0.2) { c.strokeStyle = '#ffe14a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, -20); c.lineTo(-14, 0); c.lineTo(-2, 0); c.lineTo(-10, 20); c.stroke(); } })],
      ['m15_leopard', 'Leopard Goose', 500, '#e8c070', '#d0a040', '#a07020', (c) => clip(c, () => { c.strokeStyle = '#3a2208'; c.lineWidth = 2.4; for (const [x, y] of [[-22, -8], [-4, 8], [14, -8], [26, 6], [-24, 10]]) { c.beginPath(); c.arc(x, y, 5, 0.4, 5.6); c.stroke(); } })],
      ['m15_ghost', 'Spooky Goose', 580, '#e8e8f8', '#c8c8e8', '#8a8ab8', (c) => clip(c, () => { c.fillStyle = '#1a1a2a'; for (const x of [-10, 12]) { c.beginPath(); c.ellipse(x, -2, 3.4, 5, 0, 0, 7); c.fill(); } })],
      ['m15_rgb', 'RGB Goose', 900, '#222', '#111', '#fff', (c) => clip(c, () => { const h = (T() * 80) % 360; c.fillStyle = 'hsl(' + h + ',90%,55%)'; c.fillRect(-40, -24, 80, 14); c.fillStyle = 'hsl(' + (h + 120) + ',90%,55%)'; c.fillRect(-40, -10, 80, 14); c.fillStyle = 'hsl(' + (h + 240) + ',90%,55%)'; c.fillRect(-40, 4, 80, 22); })],
    ];
    for (const [id, name, price, body, wing, legC, deco] of L) add({ id, name, price, body, wing, neckC: body, headC: body, legC, bodyDeco: deco });
  }
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const poly = (c, pts, fill, lw) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); outline(c, fill, lw || 2.4); };
    const dot = (c, x, y, r, f) => { c.beginPath(); c.arc(x, y, r, 0, 7); outline(c, f, 1.6); };
    add({ id: 'm15_cap', cat: 'hat', name: 'Backwards Cap', price: 35, draw(c) { c.beginPath(); c.arc(0, -5, 10, Math.PI, 0); c.closePath(); outline(c, '#3a86ff', 2.2); c.fillStyle = '#3a86ff'; c.fillRect(-18, -6, 10, 3.4); c.strokeStyle = INK; c.lineWidth = 1.6; c.strokeRect(-18, -6, 10, 3.4); } });
    add({ id: 'm15_pirate', cat: 'hat', name: 'Pirate Hat', price: 80, draw(c) { poly(c, [[-16, -4], [16, -4], [10, -14], [0, -20], [-10, -14]], '#222', 2.2); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -10, 2.6, 0, 7); c.fill(); c.fillRect(-3, -7, 6, 1.6); } });
    add({ id: 'm15_flower', cat: 'hat', name: 'Flower Crown', price: 55, draw(c) { ['#ff5a8a', '#ffd23f', '#fff', '#ff9a4a', '#8ad0ff'].forEach((col, i) => dot(c, -12 + i * 6, -8 - Math.sin(i * 1.3) * 2, 3.4, col)); } });
    add({ id: 'm15_crown2', cat: 'hat', name: 'Ice Crown', price: 110, draw(c) { poly(c, [[-10, -4], [-10, -16], [-5, -10], [0, -20], [5, -10], [10, -16], [10, -4]], '#9ae0ff', 2); c.fillStyle = '#fff'; c.fillRect(-1, -14 + Math.sin(T() * 3) * 1.5, 2, 2); } });
    add({ id: 'm15_nerd', cat: 'eyes', name: 'Nerd Glasses', price: 30, draw(c) { for (const x of [-6, 6]) { c.beginPath(); c.arc(x, 0, 5.6, 0, 7); c.strokeStyle = '#111'; c.lineWidth = 2.6; c.stroke(); } c.fillStyle = '#fff'; c.fillRect(-2, -1, 4, 2); } });
    add({ id: 'm15_stars', cat: 'eyes', name: 'Star Eyes', price: 60, draw(c) { c.fillStyle = '#ffd23f'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + T(), r = i % 2 ? 2.6 : 6; c.lineTo(1 + Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); } });
    add({ id: 'm15_beard', cat: 'face', name: 'Wizard Beard', price: 45, draw(c) { poly(c, [[6, 6], [20, 4], [14, 26], [10, 30], [5, 22]], '#f0f0f0', 1.8); } });
    add({ id: 'm15_freckles', cat: 'face', name: 'Freckles', price: 15, draw(c) { c.fillStyle = '#a0603a'; for (const [x, y] of [[0, 4], [4, 6], [-2, 7], [3, 2]]) { c.beginPath(); c.arc(x, y, 0.9, 0, 7); c.fill(); } } });
    add({ id: 'm15_bow', cat: 'neck', name: 'Big Bow', price: 30, draw(c) { poly(c, [[0, 0], [-10, -6], [-10, 6]], '#ff5a8a', 1.8); poly(c, [[0, 0], [10, -6], [10, 6]], '#ff5a8a', 1.8); dot(c, 0, 0, 2.6, '#e63972'); } });
    add({ id: 'm15_medal2', cat: 'neck', name: 'Gold Medal', price: 65, draw(c) { c.strokeStyle = '#e63946'; c.lineWidth = 3; c.beginPath(); c.moveTo(-5, -4); c.lineTo(0, 8); c.lineTo(5, -4); c.stroke(); dot(c, 0, 11, 5, '#ffd23f'); } });
    add({ id: 'm15_cape3', cat: 'back', name: 'Hero Cape', price: 80, draw(c) { const w = Math.sin(T() * 4) * 3; c.beginPath(); c.moveTo(8, -22); c.quadraticCurveTo(-26, -22 + w, -44, 14 + w); c.lineTo(-4, 12); c.closePath(); outline(c, '#e63946', 2.2); } });
    add({ id: 'm15_sword', cat: 'held', name: 'Pixel Sword', price: 70, draw(c) { c.strokeStyle = '#6a4018'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 4); c.lineTo(3, -10); c.stroke(); c.fillStyle = '#ffd23f'; c.fillRect(-4, -12, 12, 3); poly(c, [[1, -13], [6, -13], [6, -38], [3.5, -42], [1, -38]], '#cfe0f0', 1.8); } });
    add({ id: 'm15_balloon3', cat: 'held', name: 'Party Balloon', price: 30, draw(c) { c.strokeStyle = '#777'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 4); c.lineTo(4, -30); c.stroke(); ell(c, 5, -40 + Math.sin(T() * 2) * 2, 9, 11, '#ff5a8a', 2); } });
    const tr = (id, name, price, kind, cols, em) => add({ id, cat: 'trail', name, price, trail: { kind, cols }, draw(c) { c.font = '16px system-ui'; c.textAlign = 'center'; c.fillText(em, 0, 5); } });
    tr('m15_t_stars', 'Shooting Stars', 130, 'spark', ['#ffd23f', '#fff', '#8ad0ff'], '🌠');
  }
})(window);
