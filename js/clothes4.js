/*
 * Clothes, part 4: more hats, eyewear, neckwear and shoes. Same drawing frames as clothes.js
 * (hat: head centre, +x toward the beak, head radius 10; eyes: the eye; neck: +x along the neck; shoes: foot centre).
 */
(function (root) {
  'use strict';
  const C = root.Clothes, { INK, outline, rr, ell } = C.H;
  const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
  const poly = (ctx, pts, fill, lw) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); outline(ctx, fill, lw || 2.5); };
  // ---- hats
  add({ id: 'pirate', cat: 'hat', name: 'Pirate Hat', price: 60, draw(ctx) {
    poly(ctx, [[-15, -5], [-9, -17], [0, -13], [9, -17], [15, -5], [0, -3]], '#23232b');
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -10, 3, 0, 7); ctx.fill(); ctx.fillRect(-4, -7, 8, 1.6);
  } });
  add({ id: 'wizard', cat: 'hat', name: 'Wizard Hat', price: 80, draw(ctx) {
    ell(ctx, 0, -6, 15, 3.5, '#4b3aa8'); poly(ctx, [[-9, -7], [9, -7], [3, -36], [-2, -30]], '#5d49c9');
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(-1, -17, 2.2, 0, 7); ctx.arc(3, -26, 1.6, 0, 7); ctx.fill();
  } });
  add({ id: 'viking', cat: 'hat', name: 'Viking Helmet', price: 90, draw(ctx) {
    ctx.beginPath(); ctx.arc(0, -4, 11.5, Math.PI, 0); ctx.closePath(); outline(ctx, '#9aa5b5');
    rr(ctx, -12, -5, 24, 4, 2); outline(ctx, '#6c7787');
    poly(ctx, [[-10, -10], [-19, -22], [-13, -9]], '#f4ecd2', 2); poly(ctx, [[10, -10], [19, -22], [13, -9]], '#f4ecd2', 2);
  } });
  add({ id: 'chef', cat: 'hat', name: 'Chef Hat', price: 50, draw(ctx) {
    rr(ctx, -9, -10, 18, 8, 2); outline(ctx, '#fff');
    for (const [x, y, r] of [[-7, -17, 6], [0, -20, 7], [7, -17, 6]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); outline(ctx, '#fff', 2.2); }
  } });
  add({ id: 'halo', cat: 'hat', name: 'Halo', price: 70, draw(ctx) {
    ctx.save(); ctx.shadowColor = '#ffe479'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.ellipse(0, -16, 10, 3.2, 0, 0, 7); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3.2; ctx.stroke(); ctx.restore();
  } });
  add({ id: 'devil', cat: 'hat', name: 'Devil Horns', price: 55, draw(ctx) {
    poly(ctx, [[-8, -8], [-12, -20], [-3, -10]], '#d6192b', 2.2); poly(ctx, [[8, -8], [12, -20], [3, -10]], '#d6192b', 2.2);
  } });
  add({ id: 'cowboy', cat: 'hat', name: 'Cowboy Hat', price: 70, draw(ctx) {
    ell(ctx, 0, -7, 18, 4, '#9a6a3a'); rr(ctx, -8, -17, 16, 11, 4); outline(ctx, '#b07a44');
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-8, -9, 16, 2.6);
  } });
  add({ id: 'traffic', cat: 'hat', name: 'Traffic Cone', price: 45, draw(ctx) {
    poly(ctx, [[-9, -6], [9, -6], [3, -30], [-3, -30]], '#ff7a1a'); ctx.fillStyle = '#fff'; ctx.fillRect(-6, -17, 12, 4);
    rr(ctx, -11, -8, 22, 3, 1.5); outline(ctx, '#ff7a1a', 2);
  } });
  // ---- eyewear
  add({ id: 'heartglass', cat: 'eyes', name: 'Heart Glasses', price: 40, draw(ctx) {
    ctx.save(); ctx.translate(0, -1); ctx.beginPath(); ctx.moveTo(0, 7); ctx.bezierCurveTo(-12, -1, -7, -10, 0, -4); ctx.bezierCurveTo(7, -10, 12, -1, 0, 7); outline(ctx, '#ff4d8d', 2.4); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(-16, -5); ctx.strokeStyle = '#ff4d8d'; ctx.lineWidth = 2.4; ctx.stroke();
  } });
  add({ id: 'monocle', cat: 'eyes', name: 'Monocle', price: 45, draw(ctx) {
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.fillStyle = 'rgba(200,230,255,.3)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(2, 18, -4, 22); ctx.lineWidth = 1.4; ctx.stroke();
  } });
  add({ id: 'glass3d', cat: 'eyes', name: '3D Glasses', price: 35, draw(ctx) {
    rr(ctx, -9, -7, 18, 14, 3); outline(ctx, 'rgba(255,60,60,.65)', 2.4);
    ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(-16, -4); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.stroke();
  } });
  add({ id: 'visor', cat: 'eyes', name: 'Cyber Visor', price: 85, draw(ctx) {
    rr(ctx, -10, -5, 24, 9, 4); outline(ctx, '#19d6ff', 2.4); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-6, -3, 12, 2);
  } });
  // ---- neckwear
  add({ id: 'bandana', cat: 'neck', name: 'Bandana', price: 30, draw(ctx) {
    poly(ctx, [[-6, -6], [6, -6], [0, 8]], '#d6192b', 2.2); ctx.fillStyle = '#fff'; for (const [x, y] of [[-2, -3], [2, -2], [0, 2]]) { ctx.beginPath(); ctx.arc(x, y, 1, 0, 7); ctx.fill(); }
  } });
  add({ id: 'medal', cat: 'neck', name: 'Gold Medal', price: 60, draw(ctx) {
    ctx.strokeStyle = '#3a86ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(0, 6); ctx.lineTo(4, -6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 8, 5, 0, 7); outline(ctx, '#ffd23f', 2.2);
  } });
  add({ id: 'chain', cat: 'neck', name: 'Bling Chain', price: 120, draw(ctx) {
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.quadraticCurveTo(0, 9, 5, -6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 5, 4, 0, 7); outline(ctx, '#19d6ff', 2);
  } });
  // ---- shoes
  add({ id: 'skates', cat: 'shoes', name: 'Roller Skates', price: 65, draw(ctx) {
    ell(ctx, 4, -1, 11, 5, '#ff4d8d', 2.4); ctx.fillStyle = '#fff'; for (const x of [-3, 10]) { ctx.beginPath(); ctx.arc(x, 6, 3.2, 0, 7); outline(ctx, '#fff', 1.8); }
  } });
  add({ id: 'flippers', cat: 'shoes', name: 'Flippers', price: 40, draw(ctx) {
    poly(ctx, [[-3, -2], [20, -8], [20, 8], [-3, 4]], '#19b8d6', 2.4);
  } });
  add({ id: 'bunnyslip', cat: 'shoes', name: 'Bunny Slippers', price: 55, draw(ctx) {
    ell(ctx, 4, 1, 12, 5.5, '#ffd0e4', 2.4); ell(ctx, 10, -5, 2.2, 6, '#ffd0e4', 2); ell(ctx, 4, -6, 2.2, 6, '#ffd0e4', 2);
  } });
})(window);
