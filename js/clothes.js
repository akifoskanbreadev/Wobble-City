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

    // ================================================================== more hats
    { id: 'wizard', cat: 'hat', name: 'Wizard Hat', price: 140, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-10, -7); ctx.quadraticCurveTo(-4, -22, 10, -40); ctx.quadraticCurveTo(8, -20, 12, -7); ctx.closePath(); outline(ctx, '#6a3fc4');
      ell(ctx, 1, -7, 17, 4.5, '#5530a8');
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(-1, -18, 2, 0, 7); ctx.arc(4, -27, 1.6, 0, 7); ctx.fill();
    } },
    { id: 'viking', cat: 'hat', name: 'Viking Helmet', price: 130, draw(ctx) {
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 10, -10); ctx.quadraticCurveTo(sx * 22, -12, sx * 20, -26); ctx.quadraticCurveTo(sx * 15, -16, sx * 8, -13); ctx.closePath(); outline(ctx, '#f4efe0', 2.5); }
      ctx.beginPath(); ctx.arc(0, -4, 11.5, Math.PI, 0); ctx.closePath(); outline(ctx, '#9aa4b2');
      ctx.fillStyle = '#6f7885'; ctx.fillRect(-11.5, -6, 23, 3);
    } },
    { id: 'sombrero', cat: 'hat', name: 'Sombrero', price: 110, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-5, -22, 0, -22); ctx.quadraticCurveTo(5, -22, 6, -8); ctx.closePath(); outline(ctx, '#e9c46a');
      ell(ctx, 0, -7, 26, 5, '#e9c46a'); ctx.strokeStyle = '#e63946'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -7, 23, 3.4, 0, 0.1, Math.PI - 0.1); ctx.stroke();
    } },
    { id: 'beret', cat: 'hat', name: 'Beret', price: 60, draw(ctx) {
      ctx.save(); ctx.rotate(-0.2); ell(ctx, 1, -10, 15, 7, '#d62839'); ctx.fillStyle = '#d62839'; rr(ctx, -2, -20, 4, 5, 2); outline(ctx, '#d62839', 2); ctx.restore();
    } },
    { id: 'grad', cat: 'hat', name: 'Graduation Cap', price: 100, draw(ctx) {
      rr(ctx, -8, -12, 16, 7, 2); outline(ctx, '#23272f');
      ctx.beginPath(); ctx.moveTo(-18, -14); ctx.lineTo(0, -20); ctx.lineTo(18, -14); ctx.lineTo(0, -8); ctx.closePath(); outline(ctx, '#2f3542');
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(15, -12); ctx.lineTo(15, -4 + Math.sin(T() * 4)); ctx.stroke();
    } },
    { id: 'pumpkin', cat: 'hat', name: 'Pumpkin', price: 90, draw(ctx) {
      ell(ctx, 0, -12, 13, 11, '#ff8a1f'); ctx.strokeStyle = '#c4630a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, -12, 6, 11, 0, 0, 7); ctx.stroke();
      rr(ctx, -2, -26, 4, 6, 1); outline(ctx, '#3f8f3a', 2);
      ctx.fillStyle = '#3a2a10'; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-3, -10); ctx.lineTo(-9, -10); ctx.closePath(); ctx.moveTo(3, -14); ctx.lineTo(6, -10); ctx.lineTo(0, -10); ctx.closePath(); ctx.fill();
    } },
    { id: 'bunnyears', cat: 'hat', name: 'Bunny Ears', price: 70, draw(ctx) {
      for (const [x, r] of [[-5, -0.18], [4, 0.2]]) { ctx.save(); ctx.translate(x, -8); ctx.rotate(r); ell(ctx, 0, -12, 4.4, 13, '#fff'); ell(ctx, 0, -12, 1.9, 9, '#ffb3cf', 0); ctx.restore(); }
    } },
    { id: 'catears', cat: 'hat', name: 'Cat Ears', price: 55, draw(ctx) {
      ctx.strokeStyle = '#23272f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -3, 11, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      for (const x of [-7, 5]) { ctx.beginPath(); ctx.moveTo(x - 4, -11); ctx.lineTo(x, -22); ctx.lineTo(x + 5, -10); ctx.closePath(); outline(ctx, '#23272f', 2); ctx.fillStyle = '#ff8fb1'; ctx.beginPath(); ctx.moveTo(x - 2, -11); ctx.lineTo(x, -18); ctx.lineTo(x + 2.5, -11); ctx.fill(); }
    } },
    { id: 'antlers', cat: 'hat', name: 'Antlers', price: 85, draw(ctx) {
      ctx.strokeStyle = INK; ctx.lineCap = 'round';
      for (const sx of [-1, 1]) for (const [w, col] of [[6, INK], [3.4, '#a0733a']]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(sx * 4 - 2, -8); ctx.lineTo(sx * 8 - 2, -22); ctx.moveTo(sx * 7 - 2, -16); ctx.lineTo(sx * 14 - 2, -20); ctx.moveTo(sx * 8 - 2, -22); ctx.lineTo(sx * 6 - 2, -29); ctx.stroke(); }
    } },
    { id: 'flowers', cat: 'hat', name: 'Flower Crown', price: 75, draw(ctx) {
      const cols = ['#ff6fb5', '#ffd23f', '#9b6bff', '#ff8a1f', '#7ad8ff'];
      ctx.strokeStyle = '#3f8f3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-1, 0, 11.5, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      for (let i = 0; i < 5; i++) { const a = Math.PI * (1.12 + i * 0.19); ctx.beginPath(); ctx.arc(-1 + Math.cos(a) * 11.5, Math.sin(a) * 11.5, 3.6, 0, 7); outline(ctx, cols[i], 1.8); ctx.beginPath(); ctx.arc(-1 + Math.cos(a) * 11.5, Math.sin(a) * 11.5, 1.2, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
    } },
    { id: 'headphones', cat: 'hat', name: 'Headphones', price: 95, draw(ctx) {
      ctx.strokeStyle = '#23272f'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, 12.5, Math.PI * 1.1, Math.PI * 1.95); ctx.stroke();
      rr(ctx, -6, -4, 9, 11, 3); outline(ctx, '#e63946', 2.2);
    } },
    { id: 'fez', cat: 'hat', name: 'Fez', price: 65, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(-6, -20); ctx.lineTo(6, -20); ctx.lineTo(8, -7); ctx.closePath(); outline(ctx, '#c0272d');
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-10, -14 + Math.sin(T() * 3)); ctx.stroke(); ctx.beginPath(); ctx.arc(-10, -13, 2, 0, 7); ctx.fillStyle = '#ffd23f'; ctx.fill();
    } },
    { id: 'santa', cat: 'hat', name: 'Santa Hat', price: 80, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-10, -6); ctx.quadraticCurveTo(-8, -26, 8, -26); ctx.quadraticCurveTo(14, -20, 10, -6); ctx.closePath(); outline(ctx, '#d62839');
      ctx.beginPath(); ctx.arc(8, -26, 3.8, 0, 7); outline(ctx, '#fff', 2); rr(ctx, -11, -9, 22, 5, 2.5); outline(ctx, '#fff', 2);
    } },
    { id: 'hardhat', cat: 'hat', name: 'Hard Hat', price: 50, draw(ctx) {
      ctx.beginPath(); ctx.arc(0, -4, 11.5, Math.PI, 0); ctx.closePath(); outline(ctx, '#ffc21a'); rr(ctx, -14, -6, 28, 4, 2); outline(ctx, '#ffc21a', 2); rr(ctx, -2.5, -17, 5, 11, 2); outline(ctx, '#e6a800', 1.8);
    } },
    { id: 'cone', cat: 'hat', name: 'Traffic Cone', price: 45, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(-3, -30); ctx.lineTo(3, -30); ctx.lineTo(9, -7); ctx.closePath(); outline(ctx, '#ff7a1a');
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-6.5, -16); ctx.lineTo(6.5, -16); ctx.lineTo(5.4, -21); ctx.lineTo(-5.4, -21); ctx.closePath(); ctx.fill();
    } },
    { id: 'bucket', cat: 'hat', name: 'Bucket Hat', price: 50, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-8, -17); ctx.lineTo(8, -17); ctx.lineTo(9, -6); ctx.closePath(); outline(ctx, '#d9c69a');
      ell(ctx, 0, -6, 16, 4, '#c9b385');
    } },
    { id: 'tiara', cat: 'hat', name: 'Tiara', price: 160, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-7, -15); ctx.lineTo(-3, -10); ctx.lineTo(0, -18); ctx.lineTo(3, -10); ctx.lineTo(7, -15); ctx.lineTo(9, -8); ctx.closePath(); outline(ctx, '#dfe8f2', 2);
      ctx.beginPath(); ctx.arc(0, -13, 2, 0, 7); ctx.fillStyle = '#ff5fa2'; ctx.fill();
    } },
    { id: 'ninja', cat: 'hat', name: 'Ninja Headband', price: 55, draw(ctx) {
      ctx.save(); ctx.rotate(-0.1); rr(ctx, -11, -8, 22, 5, 2); outline(ctx, '#e63946', 2); ctx.restore();
      ctx.strokeStyle = '#e63946'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, -6); ctx.quadraticCurveTo(-20, -4, -26, -9 + Math.sin(T() * 6) * 3); ctx.moveTo(-10, -5); ctx.quadraticCurveTo(-19, 1, -25, -1 + Math.sin(T() * 6 + 1) * 3); ctx.stroke();
    } },
    { id: 'unicorn', cat: 'hat', name: 'Unicorn Horn', price: 210, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(0, -32); ctx.lineTo(4, -9); ctx.closePath(); outline(ctx, '#fff4c9', 2.5);
      ctx.strokeStyle = '#ff7ac3'; ctx.lineWidth = 1.8; for (const y of [-14, -20, -26]) { ctx.beginPath(); ctx.moveTo(-3 + (y + 14) * -0.05, y); ctx.lineTo(3.5 + (y + 14) * 0.06, y - 3); ctx.stroke(); }
    } },
    { id: 'mushroom', cat: 'hat', name: 'Mushroom Cap', price: 70, draw(ctx) {
      ctx.beginPath(); ctx.arc(0, -6, 15, Math.PI, 0); ctx.closePath(); outline(ctx, '#e63946');
      ctx.fillStyle = '#fff'; for (const [x, y, r] of [[-7, -12, 3], [3, -17, 3.4], [9, -10, 2.4]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    } },

    // ================================================================== more eyewear
    { id: 'goggles', cat: 'eyes', name: 'Pilot Goggles', price: 70, draw(ctx) {
      ctx.strokeStyle = '#6b4a24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-22, -4); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); outline(ctx, 'rgba(120,200,255,.45)', 3.5); ctx.strokeStyle = '#8a8f98'; ctx.lineWidth = 1.5; ctx.stroke();
    } },
    { id: 'vr', cat: 'eyes', name: 'VR Headset', price: 120, draw(ctx) {
      rr(ctx, -10, -9, 22, 17, 5); outline(ctx, '#2a2f3a', 2.5); ctx.fillStyle = '#4a90ff'; ctx.fillRect(-5, -5, 14, 2.4);
      ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-22, -4); ctx.stroke();
    } },
    { id: 'starglasses', cat: 'eyes', name: 'Star Glasses', price: 80, draw(ctx) {
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.4 : 10; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); outline(ctx, '#ffd23f', 2.2);
    } },
    { id: 'hipster', cat: 'eyes', name: 'Round Frames', price: 45, draw(ctx) {
      ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, 7); ctx.strokeStyle = '#111'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8.5, -1); ctx.lineTo(-17, -3); ctx.stroke();
    } },
    { id: 'lasers', cat: 'eyes', name: 'Laser Eyes', price: 150, draw(ctx) {
      const l = 40 + Math.sin(T() * 20) * 10; const g = ctx.createLinearGradient(0, 0, l, 0); g.addColorStop(0, 'rgba(255,40,40,.95)'); g.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = g; ctx.fillRect(0, -2, l, 4); ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, 7); ctx.fillStyle = '#ff3030'; ctx.fill();
    } },
    { id: 'googly', cat: 'eyes', name: 'Googly Eyes', price: 40, draw(ctx) {
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); outline(ctx, '#fff', 2.5); const a = T() * 5; ctx.beginPath(); ctx.arc(Math.cos(a) * 3.4, Math.sin(a * 1.3) * 3.4, 4, 0, 7); ctx.fillStyle = INK; ctx.fill();
    } },
    { id: 'spiral', cat: 'eyes', name: 'Hypno Eyes', price: 65, draw(ctx) {
      ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, 7); outline(ctx, '#fff', 2); ctx.strokeStyle = '#7b3fe4'; ctx.lineWidth = 1.8; ctx.beginPath(); const t = T() * 4; for (let a = 0; a < 18; a += 0.3) ctx.lineTo(Math.cos(a + t) * a * 0.42, Math.sin(a + t) * a * 0.42); ctx.stroke();
    } },
    { id: 'visor', cat: 'eyes', name: 'Cyber Visor', price: 130, draw(ctx) {
      rr(ctx, -22, -4, 38, 8, 4); outline(ctx, '#1a1d24', 2); const x = ((T() * 40) % 30) - 12; ctx.fillStyle = '#ff2b4a'; ctx.fillRect(x, -2, 7, 4);
    } },
    { id: 'lashes', cat: 'eyes', name: 'Eyelashes', price: 35, draw(ctx) {
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; for (const [a, l] of [[-2.5, 7], [-2.0, 8.5], [-1.5, 7.5]]) { ctx.beginPath(); ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3); ctx.lineTo(Math.cos(a) * (3 + l), Math.sin(a) * (3 + l)); ctx.stroke(); }
    } },

    // ================================================================== more neckwear
    { id: 'bandana', cat: 'neck', name: 'Bandana', price: 35, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(6, -7); ctx.lineTo(4, 12); ctx.lineTo(0, 17); ctx.lineTo(-4, 12); ctx.closePath(); outline(ctx, '#d62839', 2);
      ctx.fillStyle = '#fff'; for (const [x, y] of [[-2, 0], [2, 5], [-1, 9]]) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 7); ctx.fill(); }
    } },
    { id: 'lei', cat: 'neck', name: 'Flower Lei', price: 55, draw(ctx) {
      const cols = ['#ff6fb5', '#ffd23f', '#ff8a1f', '#fff', '#ff5252'];
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(Math.abs(i) * -0.8, i * 3, 3.4, 0, 7); outline(ctx, cols[(i + 3) % 5], 1.6); }
    } },
    { id: 'pinkbow', cat: 'neck', name: 'Pink Bow', price: 30, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-12, -12, -10, 2); ctx.quadraticCurveTo(-12, 12, 0, 0); ctx.moveTo(0, 0); ctx.quadraticCurveTo(12, -12, 10, 2); ctx.quadraticCurveTo(12, 12, 0, 0); outline(ctx, '#ff7ab8', 2);
      ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 7); outline(ctx, '#e04f98', 1.8);
    } },
    { id: 'ruff', cat: 'neck', name: 'Royal Ruff', price: 90, draw(ctx) {
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(-1, i * 2.8, 7, 3.2, 0, 0, 7); outline(ctx, '#fff', 1.6); }
    } },
    { id: 'goldchain', cat: 'neck', name: 'Gold Chain', price: 110, draw(ctx) {
      ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(-5, 3, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(-1.5, 10, 4, 0, 7); outline(ctx, '#ffd23f', 2);
    } },
    { id: 'locket', cat: 'neck', name: 'Heart Locket', price: 70, draw(ctx) {
      ctx.strokeStyle = '#c0c8d4'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 17); ctx.bezierCurveTo(-8, 10, -4, 4, 0, 8); ctx.bezierCurveTo(4, 4, 8, 10, 0, 17); outline(ctx, '#ff4f8b', 2);
    } },
    { id: 'diamonds', cat: 'neck', name: 'Diamond Necklace', price: 180, draw(ctx) {
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(Math.abs(i) * -0.4, i * 2.6 - 3); ctx.lineTo(Math.abs(i) * -0.4 + 3, i * 2.6); ctx.lineTo(Math.abs(i) * -0.4, i * 2.6 + 3.4); ctx.lineTo(Math.abs(i) * -0.4 - 3, i * 2.6); ctx.closePath(); outline(ctx, '#9fe8ff', 1.4); }
    } },
    { id: 'spikes', cat: 'neck', name: 'Punk Collar', price: 65, draw(ctx) {
      rr(ctx, -3, -7, 6, 14, 2); outline(ctx, '#23272f', 2); ctx.fillStyle = '#cfd6df'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-3, i * 3 - 1.4); ctx.lineTo(-9, i * 3); ctx.lineTo(-3, i * 3 + 1.4); ctx.closePath(); ctx.fill(); }
    } },
    { id: 'rainbowscarf', cat: 'neck', name: 'Rainbow Scarf', price: 75, draw(ctx) {
      const cols = ['#e63946', '#ff9b2f', '#ffd23f', '#4caf50', '#4aa3ff', '#9b6bff']; rr(ctx, -4, -8, 8, 16, 3); ctx.save(); ctx.clip(); cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-4, -8 + i * 2.7, 8, 2.8); }); ctx.restore(); rr(ctx, -4, -8, 8, 16, 3); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(-7, 21 + Math.sin(T() * 4) * 1.5); ctx.lineTo(0, 19); ctx.lineTo(3, 6); ctx.closePath(); outline(ctx, '#4aa3ff', 2);
    } },

    // ================================================================== more body
    { id: 'hoodie', cat: 'body', name: 'Hoodie', price: 85, draw(ctx) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.clip(); ctx.fillStyle = '#6b7a99'; ctx.fillRect(-40, -26, 80, 52); ctx.fillStyle = '#586689'; ctx.fillRect(-14, 6, 30, 16); ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(28, -10); ctx.lineTo(27, 4); ctx.moveTo(33, -8); ctx.lineTo(32, 2); ctx.stroke();
    } },
    { id: 'armor', cat: 'body', name: 'Knight Armor', price: 160, draw(ctx) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.clip(); ctx.fillStyle = '#b8c2cf'; ctx.fillRect(-40, -26, 80, 52); ctx.strokeStyle = '#7d8896'; ctx.lineWidth = 2; for (let x = -28; x <= 28; x += 14) { ctx.beginPath(); ctx.moveTo(x, -26); ctx.lineTo(x, 26); ctx.stroke(); } ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-36, -22, 72, 6); ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    } },
    { id: 'angelwings', cat: 'body', name: 'Angel Wings', price: 170, back: true, draw(ctx) {
      const w = Math.sin(T() * 4) * 3;
      for (const k of [0, 1]) { ctx.save(); ctx.translate(-8, -10); ctx.rotate(-0.6 + k * 0.25 + w * 0.02); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-26 - k * 6, -22, -48 - k * 4, -14 + w); ctx.quadraticCurveTo(-34, -4, -26, 2); ctx.quadraticCurveTo(-34, 2, -20, 10); ctx.closePath(); outline(ctx, k ? '#f1f6ff' : '#ffffff', 2.5); ctx.restore(); }
    } },
    { id: 'devilwings', cat: 'body', name: 'Devil Wings', price: 170, back: true, draw(ctx) {
      const w = Math.sin(T() * 5) * 3;
      ctx.save(); ctx.translate(-8, -10); ctx.rotate(-0.5 + w * 0.02); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -30 + w); ctx.lineTo(-30, -10); ctx.lineTo(-44, -22 + w); ctx.lineTo(-40, 2); ctx.quadraticCurveTo(-20, 0, 0, 6); ctx.closePath(); outline(ctx, '#b8222d', 2.5); ctx.restore();
    } },
    { id: 'backpack', cat: 'body', name: 'Backpack', price: 60, back: true, draw(ctx) {
      rr(ctx, -34, -16, 20, 28, 6); outline(ctx, '#f0902f', 2.5); rr(ctx, -31, -2, 14, 9, 3); outline(ctx, '#d97a1c', 2);
    } },
    { id: 'jetpack', cat: 'body', name: 'Jetpack', price: 220, back: true, draw(ctx) {
      for (const dy of [-12, 2]) { rr(ctx, -36, dy - 6, 14, 22, 5); outline(ctx, '#b8c2cf', 2.5); const f = 8 + Math.sin(T() * 40 + dy) * 4; ctx.beginPath(); ctx.moveTo(-34, dy + 16); ctx.lineTo(-29, dy + 16 + f); ctx.lineTo(-24, dy + 16); ctx.closePath(); ctx.fillStyle = '#ff9b2f'; ctx.fill(); }
    } },
    { id: 'shell', cat: 'body', name: 'Turtle Shell', price: 100, draw(ctx) {
      ctx.beginPath(); ctx.ellipse(-2, -6, 28, 20, 0, Math.PI, 0); ctx.closePath(); outline(ctx, '#3f8f3a', 3);
      ctx.strokeStyle = '#2b6a28'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-8, -20); ctx.moveTo(-2, -6); ctx.lineTo(-2, -26); ctx.moveTo(10, -6); ctx.lineTo(4, -20); ctx.moveTo(-28, -6); ctx.lineTo(22, -6); ctx.stroke();
    } },
    { id: 'hawaiian', cat: 'body', name: 'Hawaiian Shirt', price: 75, draw(ctx) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.clip(); ctx.fillStyle = '#2bb3d6'; ctx.fillRect(-40, -26, 80, 52);
      const cols = ['#ff6fb5', '#ffd23f', '#fff']; for (let i = 0; i < 9; i++) { ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.arc(-30 + (i * 9) % 62, -14 + ((i * 17) % 28), 3.4, 0, 7); ctx.fill(); } ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    } },
    { id: 'jacket', cat: 'body', name: 'Leather Jacket', price: 140, draw(ctx) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.clip(); ctx.fillStyle = '#23272f'; ctx.fillRect(-40, -26, 80, 52); ctx.strokeStyle = '#cfd6df'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, -24); ctx.lineTo(14, 24); ctx.stroke(); ctx.fillStyle = '#cfd6df'; for (let y = -18; y < 22; y += 8) ctx.fillRect(12, y, 4, 2); ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    } },
    { id: 'saddle', cat: 'body', name: 'Saddle', price: 50, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-14, -20); ctx.quadraticCurveTo(0, -30, 14, -20); ctx.lineTo(18, -8); ctx.quadraticCurveTo(0, -14, -18, -8); ctx.closePath(); outline(ctx, '#8b5a2b', 2.5);
      ctx.strokeStyle = '#d9a35e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-6, 18); ctx.moveTo(8, -8); ctx.lineTo(8, 18); ctx.stroke();
    } },

    // ================================================================== more shoes
    { id: 'rollerskates', cat: 'shoes', name: 'Roller Skates', price: 90, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(5, -10); ctx.lineTo(5, -1); ctx.lineTo(14, 1); ctx.lineTo(14, 5); ctx.lineTo(-7, 5); ctx.closePath(); outline(ctx, '#ff8fc3', 2.5);
      for (const x of [-4, 10]) { ctx.beginPath(); ctx.arc(x, 8, 3.2, 0, 7); outline(ctx, '#fff', 2); }
    } },
    { id: 'bunnyslippers', cat: 'shoes', name: 'Bunny Slippers', price: 70, draw(ctx) {
      ell(ctx, 4, 1, 13, 6, '#ffc2dc', 2.5); for (const dx of [0, 5]) { ctx.save(); ctx.translate(2 + dx, -4); ctx.rotate(-0.2 + dx * 0.05); ell(ctx, 0, -6, 2.4, 7, '#ffc2dc', 2); ctx.restore(); }
    } },
    { id: 'goldboots', cat: 'shoes', name: 'Golden Boots', price: 200, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-5, -15); ctx.lineTo(5, -15); ctx.lineTo(5, -1); ctx.lineTo(15, 1); ctx.lineTo(15, 7); ctx.lineTo(-7, 7); ctx.closePath(); outline(ctx, '#ffd23f', 2.5); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-3, -13, 2.5, 10);
    } },
    { id: 'iceskates', cat: 'shoes', name: 'Ice Skates', price: 80, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-5, -11); ctx.lineTo(5, -11); ctx.lineTo(5, -1); ctx.lineTo(13, 1); ctx.lineTo(13, 4); ctx.lineTo(-7, 4); ctx.closePath(); outline(ctx, '#fff', 2.5);
      ctx.strokeStyle = '#9fb0c4'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(17, 8); ctx.stroke();
    } },
    { id: 'rocketboots', cat: 'shoes', name: 'Rocket Boots', price: 240, draw(ctx) {
      ctx.beginPath(); ctx.moveTo(-5, -15); ctx.lineTo(5, -15); ctx.lineTo(5, -1); ctx.lineTo(13, 1); ctx.lineTo(13, 6); ctx.lineTo(-7, 6); ctx.closePath(); outline(ctx, '#d62839', 2.5);
      const f = 7 + Math.sin(T() * 40) * 3; ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(-1, 7 + f); ctx.lineTo(4, 7); ctx.closePath(); ctx.fillStyle = '#ffb02e'; ctx.fill();
    } },
    { id: 'flipflops', cat: 'shoes', name: 'Flip Flops', price: 30, draw(ctx) {
      ell(ctx, 4, 3, 12, 3.6, '#4aa3ff', 2.3); ctx.strokeStyle = '#ff6fb5'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(8, -2); ctx.lineTo(10, 3); ctx.stroke();
    } },
    { id: 'clogs', cat: 'shoes', name: 'Wooden Clogs', price: 40, draw(ctx) {
      ell(ctx, 4, 1.5, 12.5, 6, '#c9954f', 2.5); ctx.strokeStyle = '#9a6a2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(12, 0); ctx.stroke();
    } },

    // ================================================================== trails (particles that follow you; draw() is just the store icon)
    { id: 't_sparkle', cat: 'trail', name: 'Sparkles', price: 90, trail: { kind: 'spark', cols: ['#fff6b0', '#ffd23f', '#fff'] }, draw(ctx) { ctx.fillStyle = '#ffd23f'; for (const [x, y, s] of [[-8, 4, 5], [4, -6, 7], [9, 8, 4]]) { ctx.fillRect(x - 1, y - s, 2, s * 2); ctx.fillRect(x - s, y - 1, s * 2, 2); } } },
    { id: 't_hearts', cat: 'trail', name: 'Hearts', price: 100, trail: { kind: 'heart', cols: ['#ff4f8b', '#ff8fb1', '#ffc2dc'] }, draw(ctx) { ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(-14, -1, -7, -12, 0, -4); ctx.bezierCurveTo(7, -12, 14, -1, 0, 9); outline(ctx, '#ff4f8b', 2); } },
    { id: 't_bubbles', cat: 'trail', name: 'Bubbles', price: 70, trail: { kind: 'bubble', cols: ['#bfe9ff'] }, draw(ctx) { for (const [x, y, r] of [[-6, 4, 6], [5, -4, 4.5], [8, 7, 3]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.strokeStyle = '#4aa3ff'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = 'rgba(190,230,255,.5)'; ctx.fill(); } } },
    { id: 't_rainbow', cat: 'trail', name: 'Rainbow', price: 250, trail: { kind: 'rainbow' }, draw(ctx) { const cols = ['#e63946', '#ff9b2f', '#ffd23f', '#4caf50', '#4aa3ff', '#9b6bff']; cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, 10, 16 - i * 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }); } },
    { id: 't_flames', cat: 'trail', name: 'Flames', price: 160, trail: { kind: 'flame', cols: ['#ff3d00', '#ff9b2f', '#ffd23f'] }, draw(ctx) { ctx.beginPath(); ctx.moveTo(0, 10); ctx.bezierCurveTo(-12, 4, -6, -6, 0, -12); ctx.bezierCurveTo(6, -6, 12, 4, 0, 10); outline(ctx, '#ff7a1a', 2); ctx.beginPath(); ctx.moveTo(0, 10); ctx.bezierCurveTo(-5, 6, -2, 1, 0, -3); ctx.bezierCurveTo(3, 1, 5, 6, 0, 10); ctx.fillStyle = '#ffd23f'; ctx.fill(); } },
    { id: 't_notes', cat: 'trail', name: 'Music Notes', price: 80, trail: { kind: 'note', cols: ['#7b3fe4', '#ff4f8b', '#2f7fd6'] }, draw(ctx) { ctx.fillStyle = '#7b3fe4'; ctx.beginPath(); ctx.ellipse(-4, 7, 4.4, 3.2, -0.4, 0, 7); ctx.fill(); ctx.fillRect(-0.6, -9, 2.2, 16); ctx.beginPath(); ctx.moveTo(1.6, -9); ctx.quadraticCurveTo(10, -6, 7, 1); ctx.lineTo(6, -2); ctx.quadraticCurveTo(7, -5, 1.6, -5); ctx.fill(); } },
    { id: 't_stars', cat: 'trail', name: 'Stars', price: 110, trail: { kind: 'star', cols: ['#ffd23f', '#fff', '#9fe8ff'] }, draw(ctx) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.6 : 11; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); outline(ctx, '#ffd23f', 2); } },
    { id: 't_snow', cat: 'trail', name: 'Snowflakes', price: 85, trail: { kind: 'snow', cols: ['#ffffff', '#dff3ff'] }, draw(ctx) { ctx.strokeStyle = '#4aa3ff'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(-Math.cos(a) * 10, -Math.sin(a) * 10); ctx.stroke(); } } },
    { id: 't_leaves', cat: 'trail', name: 'Falling Leaves', price: 60, trail: { kind: 'leaf', cols: ['#7ad862', '#f0a030', '#d9552b'] }, draw(ctx) { ctx.beginPath(); ctx.ellipse(0, 0, 11, 6, -0.6, 0, 7); outline(ctx, '#7ad862', 2); ctx.strokeStyle = '#3f8f3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(8, -5); ctx.stroke(); } },
    { id: 't_glitter', cat: 'trail', name: 'Disco Glitter', price: 140, trail: { kind: 'spark', cols: ['#ff4f8b', '#4aa3ff', '#ffd23f', '#7ad862', '#b57aff'] }, draw(ctx) { const cols = ['#ff4f8b', '#4aa3ff', '#ffd23f', '#7ad862']; [[-8, -3], [3, -8], [8, 4], [-2, 7]].forEach(([x, y], i) => { ctx.fillStyle = cols[i]; ctx.fillRect(x - 3, y - 3, 6, 6); }); } },
  ];

  const CATS = [
    { id: 'hat', name: 'Hats' },
    { id: 'eyes', name: 'Eyewear' },
    { id: 'neck', name: 'Neck' },
    { id: 'body', name: 'Body' },
    { id: 'shoes', name: 'Shoes' },
    { id: 'trail', name: 'Trails' },
  ];
  const BY_ID = {};
  ITEMS.forEach((i) => { BY_ID[i.id] = i; });

  root.Clothes = { ITEMS, CATS, BY_ID };
})(typeof window !== 'undefined' ? window : globalThis);
