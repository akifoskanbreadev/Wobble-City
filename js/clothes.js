/*
 * Clothing store catalogue and drawing code.
 * Each item draws in a local frame so the same code works in the game and the store preview:
 *   hat   : origin = head centre, +x = beak direction, +y = down. Head radius is 10.
 *   eyes  : origin = the eye (head frame shifted), radius ~9 available.
 *   neck  : origin = a point on the neck, +x = along the neck toward the head, +y = across it. Half width ~5.
 *   body  : origin = body centre, +x = toward the front, body ellipse is 38 x 24. `back` items draw behind the body.
 *   shoes : origin = foot centre, +x = forward.
 */
(function (root) {
  'use strict';
  const INK = '#1f2a36';
  const T = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);

  function outline(ctx, fill, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = lw || 2.5; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function ell(ctx, x, y, rx, ry, fill, lw) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); outline(ctx, fill, lw); }

  const ITEMS = [
    // ------------------------------------------------------------------ hats
    { id: 'party', cat: 'hat', name: 'Party Hat', price: 30, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(8, -7); ctx.lineTo(0, -34); ctx.closePath(); outline(ctx, '#ff6fb5');
      ctx.strokeStyle = '#ffe479'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(5, -18); ctx.moveTo(-3, -23); ctx.lineTo(3, -25); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -35, 3.5, 0, 7); outline(ctx, '#ffe479', 2);
    } },
    { id: 'beanie', cat: 'hat', name: 'Beanie', price: 40, draw(ctx) {
      ctx.beginPath(); ctx.arc(0, -4, 11.5, Math.PI, 0); ctx.closePath(); outline(ctx, '#4aa3ff');
      rr(ctx, -12.5, -6, 25, 6, 3); outline(ctx, '#2f7fd6');
      ctx.beginPath(); ctx.arc(0, -17, 4, 0, 7); outline(ctx, '#fff', 2);
    } },
    { id: 'chef', cat: 'hat', name: 'Chef Hat', price: 70, draw(ctx) {
      ctx.beginPath(); ctx.arc(-6, -22, 7, 0, 7); ctx.arc(6, -22, 7, 0, 7); ctx.arc(0, -27, 8, 0, 7); outline(ctx, '#fff');
      rr(ctx, -9, -20, 18, 14, 2); outline(ctx, '#fff');
    } },
    { id: 'tophat', cat: 'hat', name: 'Top Hat', price: 60, draw(ctx) {
      rr(ctx, -9, -31, 18, 24, 2); outline(ctx, '#2a2f3a');
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-9, -14, 18, 5);
      ell(ctx, 0, -7, 15, 4, '#2a2f3a');
    } },
    { id: 'cowboy', cat: 'hat', name: 'Cowboy Hat', price: 80, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-8, -8); ctx.quadraticCurveTo(-9, -24, 0, -22); ctx.quadraticCurveTo(9, -24, 8, -8); ctx.closePath(); outline(ctx, '#b57a3d');
      ctx.beginPath(); ctx.moveTo(-22, -9); ctx.quadraticCurveTo(0, 2, 22, -9); ctx.quadraticCurveTo(0, -12, -22, -9); outline(ctx, '#c98b4a');
    } },
    { id: 'pirate', cat: 'hat', name: 'Pirate Hat', price: 90, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-22, -6); ctx.quadraticCurveTo(-16, -26, 0, -24); ctx.quadraticCurveTo(16, -26, 22, -6); ctx.quadraticCurveTo(0, -12, -22, -6); outline(ctx, '#23272f');
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -15, 3.2, 0, 7); ctx.fill();
      ctx.fillRect(-3.5, -12.5, 7, 2.5);
    } },
    { id: 'propeller', cat: 'hat', name: 'Propeller Cap', price: 120, draw(ctx) {
      ctx.beginPath(); ctx.arc(0, -5, 11, Math.PI, 0); ctx.closePath(); outline(ctx, '#ff5252');
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-11, -9, 22, 3);
      ctx.fillStyle = INK; ctx.fillRect(-1.5, -20, 3, 6);
      const a = T() * 22;
      ctx.save(); ctx.translate(0, -21); ctx.scale(Math.cos(a), 1);
      ell(ctx, 0, 0, 15, 2.8, '#7ad862', 2); ctx.restore();
    } },
    { id: 'halo', cat: 'hat', name: 'Halo', price: 150, draw(ctx) {
      const b = Math.sin(T() * 3) * 1.5;
      ctx.save(); ctx.shadowColor = '#ffe479'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(0, -22 + b, 13, 4, 0, 0, 7); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    } },
    { id: 'crown', cat: 'hat', name: 'Royal Crown', price: 200, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-11, -7); ctx.lineTo(-13, -24); ctx.lineTo(-6, -15); ctx.lineTo(0, -27); ctx.lineTo(6, -15); ctx.lineTo(13, -24); ctx.lineTo(11, -7); ctx.closePath(); outline(ctx, '#ffd23f');
      ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(0, -11, 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#4aa3ff'; ctx.beginPath(); ctx.arc(-6.5, -10, 1.8, 0, 7); ctx.arc(6.5, -10, 1.8, 0, 7); ctx.fill();
    } },

    // ------------------------------------------------------------------ eyewear
    { id: 'nerd', cat: 'eyes', name: 'Nerd Glasses', price: 30, draw(ctx) {
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(180,220,255,.35)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(-16, -3); ctx.stroke();
    } },
    { id: 'eyepatch', cat: 'eyes', name: 'Eye Patch', price: 35, draw(ctx) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, -9); ctx.lineTo(8, 6); ctx.stroke();
      ell(ctx, 0, 0, 7, 6.5, '#23272f', 2);
    } },
    { id: 'shades', cat: 'eyes', name: 'Sunglasses', price: 40, draw(ctx) {
      rr(ctx, -9, -6, 18, 12, 4); outline(ctx, '#111', 2);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-6, -4, 5, 2);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(-18, -4); ctx.stroke();
    } },
    { id: '3d', cat: 'eyes', name: '3D Glasses', price: 45, draw(ctx) {
      rr(ctx, -10, -7, 20, 14, 3); outline(ctx, '#e9e2cf', 2);
      ctx.fillStyle = 'rgba(230,57,70,.8)'; ctx.fillRect(-8, -5, 8, 10);
      ctx.fillStyle = 'rgba(0,160,255,.8)'; ctx.fillRect(0, -5, 8, 10);
    } },
    { id: 'heart', cat: 'eyes', name: 'Heart Glasses', price: 50, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-14, -2, -8, -12, 0, -4); ctx.bezierCurveTo(8, -12, 14, -2, 0, 8); outline(ctx, '#ff4f8b', 2);
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(-4, -3, 1.8, 0, 7); ctx.fill();
    } },
    { id: 'monocle', cat: 'eyes', name: 'Monocle', price: 60, draw(ctx) {
      ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, 7); ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = 'rgba(200,230,255,.3)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(1, 8.5); ctx.quadraticCurveTo(-4, 20, -12, 24); ctx.lineWidth = 1.5; ctx.stroke();
    } },

    // ------------------------------------------------------------------ neckwear
    { id: 'bell', cat: 'neck', name: 'Bell Collar', price: 20, draw(ctx) {
      rr(ctx, -2, -8, 4, 16, 2); outline(ctx, '#e63946', 2);
      ctx.beginPath(); ctx.arc(0, 11, 4, 0, 7); outline(ctx, '#ffd23f', 2);
    } },
    { id: 'bowtie', cat: 'neck', name: 'Bow Tie', price: 25, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -8); ctx.lineTo(-9, 8); ctx.closePath(); ctx.moveTo(0, 0); ctx.lineTo(9, -8); ctx.lineTo(9, 8); ctx.closePath(); outline(ctx, '#e63946', 2);
      ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 7); outline(ctx, '#b8222d', 2);
    } },
    { id: 'tie', cat: 'neck', name: 'Necktie', price: 30, draw(ctx) {
      rr(ctx, -2, -7, 4, 14, 1); outline(ctx, '#1d6fd6', 2);
      ctx.beginPath(); ctx.moveTo(-1, 6); ctx.lineTo(-4, 20); ctx.lineTo(0, 26); ctx.lineTo(4, 20); ctx.lineTo(1, 6); ctx.closePath(); outline(ctx, '#1d6fd6', 2);
    } },
    { id: 'scarf', cat: 'neck', name: 'Winter Scarf', price: 35, draw(ctx) {
      rr(ctx, -4, -8, 8, 16, 3); outline(ctx, '#e63946', 2);
      ctx.fillStyle = '#fff'; ctx.fillRect(-4, -3, 8, 2.5); ctx.fillRect(-4, 2.5, 8, 2.5);
      ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(-7, 20 + Math.sin(T() * 4) * 1.5); ctx.lineTo(0, 18); ctx.lineTo(3, 6); ctx.closePath(); outline(ctx, '#e63946', 2);
    } },
    { id: 'pearls', cat: 'neck', name: 'Pearl Necklace', price: 60, draw(ctx) {
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(Math.abs(i) * -0.4, i * 2.6, 2.4, 0, 7); outline(ctx, '#fff7f0', 1.5); }
    } },
    { id: 'medal', cat: 'neck', name: 'Gold Medal', price: 80, draw(ctx) {
      rr(ctx, -2, -8, 4, 16, 1.5); outline(ctx, '#2f7fd6', 2);
      ctx.beginPath(); ctx.arc(0, 14, 6, 0, 7); outline(ctx, '#ffd23f', 2);
      ctx.fillStyle = '#d4a017'; ctx.font = '800 7px system-ui'; ctx.textAlign = 'center'; ctx.fillText('1', 0, 16.6);
    } },

    // ------------------------------------------------------------------ body
    { id: 'sweater', cat: 'body', name: 'Stripy Sweater', price: 55, draw(ctx) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.clip();
      ctx.fillStyle = 'rgba(230,57,70,.9)'; for (let x = -34; x < 36; x += 14) ctx.fillRect(x, -26, 7, 52);
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    } },
    { id: 'lifevest', cat: 'body', name: 'Life Vest', price: 50, draw(ctx) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.clip();
      ctx.fillStyle = '#ff9b2f'; ctx.fillRect(-14, -26, 28, 52);
      ctx.fillStyle = '#fff'; ctx.fillRect(-14, -4, 28, 4);
      ctx.restore();
      rr(ctx, -14, -24, 28, 48, 6); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
    } },
    { id: 'tutu', cat: 'body', name: 'Ballet Tutu', price: 70, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-26, 12); for (let i = 0; i <= 8; i++) ctx.lineTo(-26 + i * 6.5, 12 + (i % 2 ? 9 : 3)); ctx.lineTo(26, 12); ctx.closePath(); outline(ctx, '#ff9ccf', 2);
    } },
    { id: 'cape', cat: 'body', name: 'Hero Cape', price: 100, back: true, draw(ctx) {
      const w = Math.sin(T() * 5) * 3;
      ctx.beginPath(); ctx.moveTo(8, -18); ctx.quadraticCurveTo(-30, -26 + w, -56, -4 + w * 2); ctx.lineTo(-48, 14 + w); ctx.quadraticCurveTo(-24, 20, 8, 12); ctx.closePath(); outline(ctx, '#d62839', 3);
    } },
    { id: 'tux', cat: 'body', name: 'Tuxedo', price: 120, draw(ctx) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.clip();
      ctx.fillStyle = '#23272f'; ctx.fillRect(-40, -26, 80, 12); ctx.fillRect(-40, 8, 80, 18);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(12, -14); ctx.lineTo(34, -14); ctx.lineTo(34, 8); ctx.lineTo(18, 8); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    } },

    // ------------------------------------------------------------------ shoes
    { id: 'wellies', cat: 'shoes', name: 'Wellies', price: 45, draw(ctx) {
      rr(ctx, -5, -14, 10, 16, 3); outline(ctx, '#ffd23f', 2.5);
      ell(ctx, 4, 1.5, 12, 5, '#ffd23f', 2.5);
    } },
    { id: 'sneakers', cat: 'shoes', name: 'Sneakers', price: 50, draw(ctx) {
      ell(ctx, 4, 1.5, 12.5, 5.5, '#fff', 2.5);
      ctx.fillStyle = '#e63946'; ctx.fillRect(-3, -1, 14, 2.4);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 5.8); ctx.lineTo(16, 5.8); ctx.stroke();
    } },
    { id: 'boots', cat: 'shoes', name: 'Cowboy Boots', price: 60, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-5, -15); ctx.lineTo(5, -15); ctx.lineTo(5, -1); ctx.lineTo(14, 1); ctx.lineTo(14, 7); ctx.lineTo(-7, 7); ctx.closePath(); outline(ctx, '#8b5a2b', 2.5);
      ctx.fillStyle = '#d9a35e'; ctx.fillRect(-5, -15, 10, 3);
    } },
    { id: 'flippers', cat: 'shoes', name: 'Flippers', price: 40, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(18, -5); ctx.lineTo(22, 3); ctx.lineTo(18, 9); ctx.lineTo(-4, 6); ctx.closePath(); outline(ctx, '#2bb3a3', 2.5);
    } },
  ];

  const CATS = [
    { id: 'hat', name: 'Hats' },
    { id: 'eyes', name: 'Eyewear' },
    { id: 'neck', name: 'Neck' },
    { id: 'body', name: 'Body' },
    { id: 'shoes', name: 'Shoes' },
  ];
  const BY_ID = {};
  ITEMS.forEach((i) => { BY_ID[i.id] = i; });

  root.Clothes = { ITEMS, CATS, BY_ID };
})(typeof window !== 'undefined' ? window : globalThis);
