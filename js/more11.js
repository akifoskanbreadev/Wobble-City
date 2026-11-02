/* More stuff, part 11: 12 skins, pets, neck, shoes, tails, held and trails. */
(function (root) {
  'use strict';
  const INK = '#1f2a36', T = () => performance.now() / 1000;
  const S = root.Skins;
  if (S) {
    const add = (o) => { S.LIST.push(Object.assign({ legC: '#ff9b2f' }, o)); S.BY_ID[o.id] = S.LIST[S.LIST.length - 1]; };
    const clip = (c, fn) => { c.save(); c.beginPath(); c.ellipse(0, 0, 36, 22, 0, 0, 7); c.clip(); fn(); c.restore(); };
    const stripes = (c, col, n, w) => { c.fillStyle = col; for (let i = 0; i < n; i++) c.fillRect(-34 + i * (68 / n), -24, w, 48); };
    const checks = (c, col, s) => { c.fillStyle = col; for (let x = -36; x < 36; x += s * 2) for (let y = -24; y < 24; y += s * 2) { c.fillRect(x, y, s, s); c.fillRect(x + s, y + s, s, s); } };
    const dots = (c, col, n, r) => { c.fillStyle = col; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(((i * 41) % 64) - 32, ((i * 23) % 36) - 18, r, 0, 7); c.fill(); } };
    const L = [
      ['m11_zebra', 'Zebra Goose', 520, '#fff', '#eee', '#333', (c) => clip(c, () => stripes(c, '#222', 8, 4))],
      ['m11_tiger', 'Tiger Goose', 520, '#ff9a2a', '#e8801a', '#333', (c) => clip(c, () => stripes(c, '#3a2410', 6, 3))],
      ['m11_cow', 'Cow Goose', 480, '#fff', '#f4f4f4', '#ffb0b8', (c) => clip(c, () => dots(c, '#222', 6, 6))],
      ['m11_check', 'Picnic Goose', 440, '#fff', '#ffd0d0', '#e63946', (c) => clip(c, () => checks(c, '#e63946', 6))],
      ['m11_choco', 'Chocolate Goose', 420, '#6a3a1a', '#4a2410', '#e0b070', (c) => clip(c, () => checks(c, 'rgba(255,255,255,.12)', 8))],
      ['m11_mint', 'Mint Goose', 400, '#aaf0d0', '#7ad8b0', '#2aa078', (c) => clip(c, () => dots(c, '#fff', 8, 2.4))],
      ['m11_lava', 'Lava Goose', 700, '#2a1a1a', '#1a0a0a', '#ff6a1a', (c) => clip(c, () => dots(c, '#ff6a1a', 9, 3.4))],
      ['m11_ice', 'Frosty Goose', 540, '#d8f4ff', '#b0e4ff', '#6ab8e8', (c) => clip(c, () => dots(c, '#fff', 10, 2))],
      ['m11_candy', 'Candy Cane Goose', 480, '#fff', '#fff', '#e63946', (c) => clip(c, () => { c.save(); c.rotate(0.6); stripes(c, '#e63946', 8, 4); c.restore(); })],
      ['m11_galaxy2', 'Nebula Goose', 800, '#3a1a6a', '#6a2a9a', '#ff8ae8', (c) => clip(c, () => { dots(c, '#ff8ae8', 5, 6); dots(c, '#fff', 14, 1); })],
      ['m11_banana', 'Banana Goose', 380, '#ffe14a', '#f0c820', '#6a4a1a', (c) => clip(c, () => dots(c, '#8a6a2a', 7, 1.6))],
      ['m11_berry', 'Berry Goose', 420, '#8a2a7a', '#6a1a5a', '#4cc04a', (c) => clip(c, () => dots(c, '#c85ab8', 8, 2.6))],
    ];
    for (const [id, name, price, body, wing, legC, deco] of L) add({ id, name, price, body, wing, neckC: body, headC: body, legC, bodyDeco: deco });
  }
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const dot = (c, x, y, r, f) => { c.beginPath(); c.arc(x, y, r, 0, 7); outline(c, f, 1.6); };
    const Pt = (id, name, price, draw) => add({ id, cat: 'pet', name, price, draw(c) { c.save(); c.translate(0, Math.sin(T() * 3 + id.length) * 1.4); draw(c); c.restore(); } });
    Pt('m11_bunny', 'Bunny', 90, (c) => { ell(c, 0, -5, 8, 6, '#fff', 1.8); dot(c, 5, -11, 4.2, '#fff'); ell(c, 4, -18, 1.8, 5, '#fff', 1.4); ell(c, 7, -18, 1.8, 5, '#fff', 1.4); dot(c, 6.4, -11, 0.8, INK); dot(c, -7, -5, 2.4, '#fff'); });
    Pt('m11_chick', 'Baby Chick', 60, (c) => { dot(c, 0, -6, 6.4, '#ffe14a'); ell(c, 6.4, -6, 2.4, 1.2, '#ff8a1a', 1); dot(c, 2.6, -8, 0.9, INK); });
    Pt('m11_penguin', 'Penguin', 110, (c) => { ell(c, 0, -8, 6, 8, '#222', 1.8); ell(c, 0.6, -7, 3.4, 5.4, '#fff', 0); ell(c, 4, -9, 2.2, 1.2, '#ff8a1a', 1); dot(c, 2, -12, 0.8, '#fff'); });
    Pt('m11_bee', 'Bee', 70, (c) => { const w = Math.abs(Math.sin(T() * 30)) * 3; ell(c, -2, -14 - w, 3.4, 2, 'rgba(200,240,255,.8)', 1); ell(c, 3, -14 - w, 3.4, 2, 'rgba(200,240,255,.8)', 1); ell(c, 0, -9, 6, 4.4, '#ffd23f', 1.8); c.fillStyle = INK; c.fillRect(-2, -13, 1.8, 8); c.fillRect(2, -13, 1.8, 8); });
    Pt('m11_ghost', 'Little Ghost', 100, (c) => { c.beginPath(); c.moveTo(-6, -2); c.lineTo(-6, -12); c.arc(0, -12, 6, Math.PI, 0); c.lineTo(6, -2); c.lineTo(3, -4); c.lineTo(0, -2); c.lineTo(-3, -4); c.closePath(); outline(c, '#fff', 1.8); dot(c, -2, -11, 1, INK); dot(c, 2, -11, 1, INK); });
    Pt('m11_dino', 'Baby Dino', 120, (c) => { ell(c, 0, -5, 8, 5.5, '#6ad06a', 1.8); dot(c, 6, -11, 4.4, '#6ad06a'); dot(c, 7.4, -12, 0.8, INK); c.fillStyle = '#3aa03a'; for (const x of [-4, 0, 4]) { c.beginPath(); c.moveTo(x - 1.6, -10); c.lineTo(x, -14); c.lineTo(x + 1.6, -10); c.fill(); } });
    add({ id: 'm11_scarf2', cat: 'neck', name: 'Rainbow Scarf', price: 55, draw(c) { ['#e63946', '#ffd23f', '#4cd964', '#3a86ff'].forEach((col, i) => { c.fillStyle = col; c.fillRect(-4, -8 + i * 4, 8, 4); }); c.strokeStyle = INK; c.lineWidth = 1.6; c.strokeRect(-4, -8, 8, 16); } });
    add({ id: 'm11_locket', cat: 'neck', name: 'Heart Locket', price: 45, draw(c) { c.strokeStyle = '#ffd23f'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, -8); c.lineTo(0, 8); c.lineTo(4, -8); c.stroke(); c.beginPath(); c.moveTo(0, 14); c.bezierCurveTo(-7, 9, -3, 5, 0, 9); c.bezierCurveTo(3, 5, 7, 9, 0, 14); outline(c, '#ff4d8d', 1.6); } });
    add({ id: 'm11_flower', cat: 'neck', name: 'Flower Lei', price: 50, draw(c) { ['#ff8ac8', '#ffd23f', '#fff', '#ff6a6a'].forEach((col, i) => dot(c, ((i % 2) * 2 - 1) * 2, -6 + i * 4.4, 3, col)); } });
    add({ id: 'm11_flip', cat: 'shoes', name: 'Flippers', price: 55, draw(c) { c.beginPath(); c.moveTo(-3, -2); c.lineTo(18, -3); c.lineTo(20, 5); c.lineTo(-3, 5); c.closePath(); outline(c, '#2ad0c8', 2.2); } });
    add({ id: 'm11_heels', cat: 'shoes', name: 'High Heels', price: 60, draw(c) { ell(c, 4, 1.5, 11, 4, '#e63946', 2.2); c.fillStyle = '#e63946'; c.fillRect(-4, 2, 3, 6); c.strokeStyle = INK; c.lineWidth = 1.4; c.strokeRect(-4, 2, 3, 6); } });
    add({ id: 'm11_skates', cat: 'shoes', name: 'Roller Skates', price: 65, draw(c) { ell(c, 4, 0, 11, 4.4, '#ff8ac8', 2.2); dot(c, -2, 6, 2.4, '#fff'); dot(c, 10, 6, 2.4, '#fff'); } });
    add({ id: 'm11_fluff', cat: 'tail', name: 'Bunny Tail', price: 30, draw(c) { dot(c, -4, 0, 6, '#fff'); } });
    add({ id: 'm11_peacock', cat: 'tail', name: 'Peacock Tail', price: 110, draw(c) { for (let i = -3; i <= 3; i++) { c.save(); c.rotate(i * 0.3 - 1.4); ell(c, 14, 0, 14, 4, '#2ad0c8', 1.6); dot(c, 22, 0, 2, '#ffd23f'); c.restore(); } } });
    add({ id: 'm11_balloon', cat: 'held', name: 'Balloon', price: 35, draw(c) { const w = Math.sin(T() * 2) * 2; c.strokeStyle = '#666'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 2); c.lineTo(w, -34); c.stroke(); ell(c, w, -44, 8, 10, '#ff4d6d', 2); } });
    add({ id: 'm11_ice', cat: 'held', name: 'Ice Cream', price: 40, draw(c) { c.beginPath(); c.moveTo(-5, -8); c.lineTo(5, -8); c.lineTo(0, 4); c.closePath(); outline(c, '#e0b070', 2); dot(c, 0, -11, 6, '#ff9ac8'); dot(c, 0, -17, 4.4, '#fff'); } });
    add({ id: 'm11_flag', cat: 'held', name: 'Victory Flag', price: 50, draw(c) { const w = Math.sin(T() * 5) * 2; c.strokeStyle = '#5a3a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -34); c.stroke(); c.beginPath(); c.moveTo(1, -34); c.quadraticCurveTo(10, -30 + w, 20, -34); c.lineTo(20, -22); c.quadraticCurveTo(10, -26 + w, 1, -22); c.closePath(); outline(c, '#e63946', 1.8); } });
    add({ id: 'm11_wand2', cat: 'held', name: 'Star Wand', price: 70, draw(c) { c.strokeStyle = '#8a5a2a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, 4); c.lineTo(6, -22); c.stroke(); c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9; c.lineTo(6 + Math.cos(a) * r, -28 + Math.sin(a) * r); } c.closePath(); outline(c, '#ffd23f', 1.8); } });
    const tr = (id, name, price, kind, cols, em) => add({ id, cat: 'trail', name, price, trail: { kind, cols }, draw(c) { c.font = '16px system-ui'; c.textAlign = 'center'; c.fillText(em, 0, 5); } });
    tr('m11_t_hearts', 'Heart Trail', 90, 'spark', ['#ff4d8d', '#ff9ac8'], '💗');
    tr('m11_t_leaf', 'Falling Leaves', 80, 'spark', ['#e8801a', '#d0a020', '#a83a1a'], '🍂');
    tr('m11_t_snow', 'Snowfall', 80, 'bubble', ['#fff', '#d8f4ff'], '❄️');
    add({ id: 'm11_halo', cat: 'aura', name: 'Spinning Planets', price: 150, draw(c) { for (let i = 0; i < 3; i++) { const a = T() * (1 + i * 0.5) + i * 2.1; dot(c, Math.cos(a) * 42, Math.sin(a) * 18 - 6, 3.4 - i * 0.6, ['#ff8a1a', '#3a86ff', '#b8ff8a'][i]); } } });
  }
})(window);
