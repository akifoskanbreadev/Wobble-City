/* More stuff, part 12: 12 skins plus hats, eyes, face, neck, back, held, pets, auras and trails. */
(function (root) {
  'use strict';
  const INK = '#1f2a36', T = () => performance.now() / 1000;
  const S = root.Skins;
  if (S) {
    const add = (o) => { S.LIST.push(Object.assign({ legC: '#ff9b2f' }, o)); S.BY_ID[o.id] = S.LIST[S.LIST.length - 1]; };
    const clip = (c, fn) => { c.save(); c.beginPath(); c.ellipse(0, 0, 36, 22, 0, 0, 7); c.clip(); fn(); c.restore(); };
    const bands = (c, cols) => cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(-40, -24 + i * (48 / cols.length), 80, 48 / cols.length + 0.5); });
    const dots = (c, col, n, r) => { c.fillStyle = col; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(((i * 37) % 64) - 32, ((i * 19) % 36) - 18, r, 0, 7); c.fill(); } };
    const zig = (c, col) => { c.strokeStyle = col; c.lineWidth = 3; for (let y = -16; y <= 16; y += 10) { c.beginPath(); for (let x = -36; x <= 36; x += 9) c.lineTo(x, y + ((x / 9) & 1 ? 4 : -4)); c.stroke(); } };
    const L = [
      ['m12_pumpkin', 'Pumpkin Goose', 480, '#ff8a1a', '#e07010', '#3a8a2a', (c) => clip(c, () => { c.strokeStyle = '#b85a00'; c.lineWidth = 2; for (const x of [-18, -6, 6, 18]) { c.beginPath(); c.ellipse(x, 0, 6, 22, 0, 0, 7); c.stroke(); } })],
      ['m12_ocean', 'Wave Goose', 440, '#3a86ff', '#2a66d8', '#ffd23f', (c) => clip(c, () => zig(c, '#a8d4ff'))],
      ['m12_sand', 'Beach Goose', 380, '#ffe6a8', '#f0cc80', '#e0a050', (c) => clip(c, () => dots(c, '#d8b070', 12, 1.8))],
      ['m12_neon', 'Neon Goose', 700, '#161626', '#0a0a18', '#19d6ff', (c) => clip(c, () => { zig(c, '#ff2ad4'); c.globalAlpha = 0.5; zig(c, '#19d6ff'); c.globalAlpha = 1; })],
      ['m12_robot', 'Robo Goose', 560, '#b8c2d4', '#8a96aa', '#555', (c) => clip(c, () => { c.strokeStyle = '#6a7488'; c.lineWidth = 2; for (const x of [-20, 0, 20]) { c.beginPath(); c.moveTo(x, -24); c.lineTo(x, 24); c.stroke(); } c.beginPath(); c.moveTo(-40, 0); c.lineTo(40, 0); c.stroke(); dots(c, '#6a7488', 6, 1.4); })],
      ['m12_leaf', 'Leafy Goose', 420, '#6ac04a', '#4a9a2a', '#8a5a2a', (c) => clip(c, () => { c.strokeStyle = '#2a7a1a'; c.lineWidth = 2; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(-30, i * 6); c.lineTo(30, i * 6 - 6); c.stroke(); } })],
      ['m12_cake', 'Cake Goose', 520, '#fff0d8', '#ffd0e0', '#e86a8a', (c) => clip(c, () => { bands(c, ['#fff0d8', '#ff9ac0', '#fff0d8', '#8a5a3a']); dots(c, '#e63946', 5, 2.2); })],
      ['m12_denim', 'Denim Goose', 400, '#4a6ea8', '#3a5a90', '#d8a050', (c) => clip(c, () => { c.strokeStyle = '#ffd88a'; c.lineWidth = 1.4; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(-34, 12); c.lineTo(34, 12); c.stroke(); c.setLineDash([]); dots(c, '#3a5a90', 10, 1.6); })],
      ['m12_koi', 'Koi Goose', 640, '#fff', '#ffe8d0', '#ff7a1a', (c) => clip(c, () => { dots(c, '#ff6a1a', 4, 8); dots(c, '#222', 3, 4); })],
      ['m12_magma', 'Magma Goose', 720, '#3a2a2a', '#2a1a1a', '#ff4a1a', (c) => clip(c, () => { c.strokeStyle = '#ff7a1a'; c.lineWidth = 2.4; for (const [x, y] of [[-20, -8], [4, 6], [18, -10]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10, y + 8); c.lineTo(x + 4, y + 16); c.stroke(); } })],
      ['m12_cloud', 'Cloud Goose', 460, '#f4faff', '#dceeff', '#9ac8ff', (c) => clip(c, () => dots(c, '#c8e0f8', 8, 5))],
      ['m12_dino', 'Dino Goose', 600, '#8ad060', '#6aa840', '#e0a050', (c) => clip(c, () => { c.fillStyle = '#4a8a2a'; for (let x = -28; x <= 28; x += 14) { c.beginPath(); c.moveTo(x - 5, -22); c.lineTo(x, -12); c.lineTo(x + 5, -22); c.fill(); } dots(c, '#4a8a2a', 5, 3); })],
    ];
    for (const [id, name, price, body, wing, legC, deco] of L) add({ id, name, price, body, wing, neckC: body, headC: body, legC, bodyDeco: deco });
  }
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const poly = (c, pts, fill, lw) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); outline(c, fill, lw || 2.4); };
    const dot = (c, x, y, r, f) => { c.beginPath(); c.arc(x, y, r, 0, 7); outline(c, f, 1.6); };
    add({ id: 'm12_witch', cat: 'hat', name: 'Witch Hat', price: 80, draw(c) { poly(c, [[-14, -6], [14, -6], [4, -8], [2, -28], [-4, -28], [-4, -8]], '#3a2a5a', 2.4); c.fillStyle = '#ffd23f'; c.fillRect(-4, -12, 8, 3); } });
    add({ id: 'm12_chef', cat: 'hat', name: 'Chef Hat', price: 55, draw(c) { dot(c, -6, -16, 6, '#fff'); dot(c, 6, -16, 6, '#fff'); dot(c, 0, -20, 6.5, '#fff'); c.fillStyle = '#fff'; c.fillRect(-9, -14, 18, 8); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(-9, -14, 18, 8); } });
    add({ id: 'm12_beanie', cat: 'hat', name: 'Bobble Beanie', price: 40, draw(c) { c.beginPath(); c.arc(0, -4, 11, Math.PI, 0); c.closePath(); outline(c, '#3a86ff', 2.4); c.fillStyle = '#fff'; c.fillRect(-11, -6, 22, 4); c.strokeStyle = INK; c.lineWidth = 1.6; c.strokeRect(-11, -6, 22, 4); dot(c, 0, -17, 3.4, '#fff'); } });
    add({ id: 'm12_viking', cat: 'hat', name: 'Viking Helmet', price: 85, draw(c) { c.beginPath(); c.arc(0, -4, 11, Math.PI, 0); c.closePath(); outline(c, '#9aa4b4', 2.4); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 10, -8); c.quadraticCurveTo(s * 20, -10, s * 17, -22); c.quadraticCurveTo(s * 14, -12, s * 8, -9); c.closePath(); outline(c, '#f2e6cf', 1.8); } } });
    add({ id: 'm12_sombrero', cat: 'hat', name: 'Sombrero', price: 70, draw(c) { ell(c, 0, -5, 22, 4.4, '#e8b04a', 2.2); c.beginPath(); c.arc(0, -6, 8, Math.PI, 0); c.closePath(); outline(c, '#e8b04a', 2.2); c.fillStyle = '#e63946'; c.fillRect(-8, -8, 16, 2.4); } });
    add({ id: 'm12_flowerhat', cat: 'hat', name: 'Flower Crown', price: 45, draw(c) { [-9, -3, 3, 9].forEach((x, i) => dot(c, x, -7 - (i % 2) * 2, 3, ['#ff8ac8', '#ffd23f', '#fff', '#ff6a6a'][i])); } });
    add({ id: 'm12_monocle', cat: 'eyes', name: 'Monocle', price: 40, draw(c) { c.strokeStyle = '#ffd23f'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 6, 0, 7); c.stroke(); c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 6); c.lineTo(-3, 16); c.stroke(); } });
    add({ id: 'm12_3d', cat: 'eyes', name: '3D Glasses', price: 35, draw(c) { c.fillStyle = 'rgba(230,50,60,.7)'; c.fillRect(-12, -4, 11, 8); c.fillStyle = 'rgba(40,160,255,.7)'; c.fillRect(1, -4, 11, 8); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(-12, -4, 24, 8); } });
    add({ id: 'm12_goggles', cat: 'eyes', name: 'Pilot Goggles', price: 60, draw(c) { for (const x of [-6, 6]) { c.beginPath(); c.arc(x, 0, 6, 0, 7); outline(c, 'rgba(120,200,255,.6)', 2.4); } c.strokeStyle = '#6a3a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-12, 0); c.lineTo(-20, 0); c.stroke(); } });
    add({ id: 'm12_mask', cat: 'face', name: 'Hero Mask', price: 50, draw(c) { poly(c, [[-12, -4], [12, -4], [10, 6], [0, 3], [-10, 6]], '#e63946', 2.2); } });
    add({ id: 'm12_stache', cat: 'face', name: 'Fancy Moustache', price: 35, draw(c) { c.beginPath(); c.moveTo(0, 2); c.quadraticCurveTo(-8, -2, -13, 6); c.quadraticCurveTo(-6, 4, 0, 6); c.quadraticCurveTo(6, 4, 13, 6); c.quadraticCurveTo(8, -2, 0, 2); outline(c, '#3a2410', 1.8); } });
    add({ id: 'm12_blush', cat: 'face', name: 'Rosy Cheeks', price: 20, draw(c) { c.fillStyle = 'rgba(255,100,130,.55)'; c.beginPath(); c.arc(-2, 5, 4.4, 0, 7); c.arc(8, 5, 4.4, 0, 7); c.fill(); } });
    add({ id: 'm12_freckle', cat: 'face', name: 'Freckles', price: 15, draw(c) { c.fillStyle = '#a0582a'; for (const [x, y] of [[-3, 3], [1, 5], [5, 3], [9, 5], [-1, 8], [6, 8]]) { c.beginPath(); c.arc(x, y, 0.9, 0, 7); c.fill(); } } });
    add({ id: 'm12_bowtie2', cat: 'neck', name: 'Polka Bow Tie', price: 30, draw(c) { poly(c, [[0, 0], [-9, -5], [-9, 5]], '#e63946', 1.8); poly(c, [[0, 0], [9, -5], [9, 5]], '#e63946', 1.8); dot(c, 0, 0, 2, '#fff'); } });
    add({ id: 'm12_chain', cat: 'neck', name: 'Gold Chain', price: 75, draw(c) { c.strokeStyle = '#ffd23f'; c.lineWidth = 2.4; c.setLineDash([3, 2]); c.beginPath(); c.moveTo(-5, -8); c.quadraticCurveTo(0, 14, 5, -8); c.stroke(); c.setLineDash([]); dot(c, 0, 10, 3.2, '#ffd23f'); } });
    add({ id: 'm12_cape', cat: 'back', name: 'Hero Cape', price: 90, draw(c) { const w = Math.sin(T() * 5) * 3; c.beginPath(); c.moveTo(6, -20); c.quadraticCurveTo(-24, -18 + w, -44, 10 + w); c.lineTo(-30, 14); c.quadraticCurveTo(-14, 6, 6, 12); c.closePath(); outline(c, '#e63946', 2.4); } });
    add({ id: 'm12_jet', cat: 'back', name: 'Jetpack', price: 140, draw(c) { c.beginPath(); c.rect(-22, -20, 12, 22); outline(c, '#9aa4b4', 2.2); c.fillStyle = '#ff8a1a'; const f = 6 + Math.sin(T() * 30) * 3; c.beginPath(); c.moveTo(-20, 2); c.lineTo(-16, 2 + f + 6); c.lineTo(-12, 2); c.closePath(); c.fill(); } });
    add({ id: 'm12_fairy', cat: 'back', name: 'Fairy Wings', price: 110, draw(c) { const w = Math.sin(T() * 9) * 3; for (const [dx, dy, a] of [[-12, -24, 1], [-14, -12, 0.8]]) ell(c, dx, dy + w * a, 11, 6, 'rgba(190,230,255,.8)', 1.8); } });
    add({ id: 'm12_umbrella', cat: 'held', name: 'Umbrella', price: 50, draw(c) { c.strokeStyle = '#444'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -34); c.stroke(); c.beginPath(); c.moveTo(-20, -34); c.quadraticCurveTo(0, -56, 20, -34); c.quadraticCurveTo(10, -38, 0, -34); c.quadraticCurveTo(-10, -38, -20, -34); outline(c, '#3a86ff', 2); } });
    add({ id: 'm12_guitar', cat: 'held', name: 'Guitar', price: 85, draw(c) { c.save(); c.rotate(-0.6); ell(c, 0, -4, 8, 11, '#c0762a', 2); ell(c, 0, -20, 6, 7, '#c0762a', 2); c.fillStyle = '#3a2410'; c.fillRect(-1.6, -44, 3.2, 24); dot(c, 0, -5, 3, '#2a1a10'); c.restore(); } });
    add({ id: 'm12_pizza', cat: 'held', name: 'Pizza Slice', price: 40, draw(c) { poly(c, [[-9, -18], [9, -18], [0, 2]], '#ffc84a', 2.2); c.fillStyle = '#e63946'; for (const [x, y] of [[-3, -13], [3, -10], [0, -5]]) { c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fill(); } } });
    add({ id: 'm12_sign', cat: 'held', name: 'Honk Sign', price: 45, draw(c) { c.strokeStyle = '#6a3a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -26); c.stroke(); c.beginPath(); c.rect(-14, -44, 28, 18); outline(c, '#fff', 2); c.fillStyle = '#e63946'; c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.fillText('HONK', 0, -31); } });
    const Pt = (id, name, price, draw) => add({ id, cat: 'pet', name, price, draw(c) { c.save(); c.translate(0, Math.sin(T() * 3 + id.length) * 1.4); draw(c); c.restore(); } });
    Pt('m12_hedgehog', 'Hedgehog', 90, (c) => { c.fillStyle = '#6a4a2a'; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(-7 + i * 2.4, -9); c.lineTo(-8 + i * 2.4, -15); c.lineTo(-5 + i * 2.4, -9); c.fill(); } ell(c, 0, -5, 8, 5, '#c8a070', 1.8); dot(c, 6, -5, 2.4, '#f0d0a8'); dot(c, 7.4, -5.4, 0.7, INK); });
    Pt('m12_octo', 'Mini Octopus', 110, (c) => { dot(c, 0, -10, 6.4, '#c85ab8'); c.strokeStyle = '#c85ab8'; c.lineWidth = 2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 2.6, -5); c.quadraticCurveTo(i * 3.4, 0, i * 4.4 + Math.sin(T() * 4 + i) * 1.4, 1); c.stroke(); } dot(c, -2, -11, 1, INK); dot(c, 2.4, -11, 1, INK); });
    Pt('m12_hamster', 'Hamster', 80, (c) => { ell(c, 0, -5, 8, 6.4, '#f0c890', 1.8); dot(c, 5, -5, 3.6, '#f0c890'); dot(c, 3, -11, 2, '#ffb0b8'); dot(c, 6.4, -6, 0.8, INK); });
    Pt('m12_axolotl', 'Axolotl', 130, (c) => { ell(c, 0, -5, 8, 5, '#ffb0c8', 1.8); for (const dy of [-8, -5, -2]) { c.strokeStyle = '#ff7a9a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(4, dy - 2); c.lineTo(10, dy - 4); c.stroke(); } dot(c, 5.4, -6, 0.9, INK); });
    add({ id: 'm12_a_snow', cat: 'aura', name: 'Snow Flurry', price: 120, draw(c) { for (let i = 0; i < 12; i++) { const t = (T() * 0.5 + i / 12) % 1; c.fillStyle = '#fff'; c.globalAlpha = 1 - t * 0.4; c.beginPath(); c.arc(Math.sin(i * 3.7) * 44 + Math.sin(t * 8 + i) * 5, -50 + t * 90, 2.2, 0, 7); c.fill(); } c.globalAlpha = 1; } });
    add({ id: 'm12_a_hearts', cat: 'aura', name: 'Floating Hearts', price: 120, draw(c) { for (let i = 0; i < 5; i++) { const t = (T() * 0.6 + i / 5) % 1; c.globalAlpha = 1 - t; c.font = '14px system-ui'; c.textAlign = 'center'; c.fillText('💗', Math.sin(i * 2.3) * 30, 10 - t * 70); } c.globalAlpha = 1; } });
    add({ id: 'm12_a_notes', cat: 'aura', name: 'Music Notes', price: 110, draw(c) { for (let i = 0; i < 4; i++) { const t = (T() * 0.5 + i / 4) % 1; c.globalAlpha = 1 - t; c.font = '16px system-ui'; c.textAlign = 'center'; c.fillText(['🎵', '🎶'][i % 2], Math.sin(i * 2.9 + t * 3) * 28, 10 - t * 70); } c.globalAlpha = 1; } });
    const tr = (id, name, price, kind, cols, em) => add({ id, cat: 'trail', name, price, trail: { kind, cols }, draw(c) { c.font = '16px system-ui'; c.textAlign = 'center'; c.fillText(em, 0, 5); } });
    tr('m12_t_pink', 'Cotton Candy', 90, 'bubble', ['#ff9ac8', '#9ad0ff'], '🍭');
    tr('m12_t_green', 'Slime Drips', 85, 'bubble', ['#7ad84a', '#b8ff6a'], '🟢');
    tr('m12_t_stars', 'Shooting Stars', 130, 'spark', ['#fff3b0', '#ffd23f', '#fff'], '🌠');
  }
})(window);
