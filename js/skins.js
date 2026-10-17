/*
 * Skins: the animal you play as. The physics is always the same wobbly goose; a skin changes how it looks
 * (and, for long-necked animals, how long the neck is).
 *
 * Fields (all optional, defaults = the goose):
 *   neck     physical neck length multiplier          neckW  neck thickness multiplier
 *   body, wing, neckC, legC, headC   colours           legW   leg thickness multiplier
 *   tail(c)       body frame (origin body centre, +x front). Replaces the default tail.
 *   bodyDeco(c)   body frame, clipped to the body ellipse (38 x 24)
 *   neckDeco(c, n, nN)   WORLD coordinates, n = neck particles
 *   foot(c)       origin = foot centre, +x forward
 *   head(c, open, sk)    head frame (origin = head centre, +x = beak direction, +y = down, head radius 10): beak/snout AND the head disc
 *   eye           { x, y, r, bg }
 *   headBack(c)   drawn before the head disc (ears behind the head)
 *   headDeco(c)   drawn after the eye, before hats (comb, horns, ears)
 */
(function (root) {
  'use strict';
  const INK = '#1f2a36';
  const T = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
  const ol = (c, fill, lw) => { if (fill) { c.fillStyle = fill; c.fill(); } c.strokeStyle = INK; c.lineWidth = lw || 3; c.lineJoin = 'round'; c.stroke(); };
  const ell = (c, x, y, rx, ry, fill, lw, rot) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, 7); ol(c, fill, lw); };
  const poly = (c, pts, fill, lw) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); ol(c, fill, lw); };
  const circ = (c, x, y, r, fill, lw) => { c.beginPath(); c.arc(x, y, r, 0, 7); ol(c, fill, lw); };

  // goose-style two-part beak
  function beak(c, open, fill, len, thick) {
    len = len || 24; thick = thick || 5;
    c.fillStyle = fill; c.strokeStyle = INK; c.lineWidth = 3; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(4, -thick); c.lineTo(len + 2, -open * 0.3); c.lineTo(4, 0); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(4, 0); c.lineTo(len, 1 + open); c.lineTo(4, thick + open * 0.5); c.closePath(); c.fill(); c.stroke();
  }
  const disc = (c, fill, r) => circ(c, 0, 0, r || 10, fill || '#fff', 3);
  const gooseHead = (c, open, sk) => { beak(c, open, '#ff9b2f'); disc(c, sk.headC || '#fff'); };
  const claw = (c, col) => {   // three-toed claw foot
    c.strokeStyle = INK; c.lineWidth = 6.5; c.lineCap = 'round';
    for (const [x, y] of [[11, 2], [9, -1], [8, 5]]) { c.beginPath(); c.moveTo(0, 1); c.lineTo(x, y); c.stroke(); }
    c.strokeStyle = col; c.lineWidth = 3.2;
    for (const [x, y] of [[11, 2], [9, -1], [8, 5]]) { c.beginPath(); c.moveTo(0, 1); c.lineTo(x, y); c.stroke(); }
  };
  const hoof = (c, col) => { c.beginPath(); c.moveTo(-5, -3); c.lineTo(8, -3); c.lineTo(10, 5); c.lineTo(-5, 5); c.closePath(); ol(c, col, 2.5); };
  const paw = (c, col) => { ell(c, 3, 1, 8, 5, col, 2.5); c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.moveTo(7, -2); c.lineTo(7, 4); c.moveTo(10, -1); c.lineTo(10, 3); c.stroke(); };

  const SKINS = [
    { id: 'goose', name: 'Goose', price: 0 },

    { id: 'chicken', name: 'Chicken', price: 120, neck: 0.9, body: '#fffaf0', wing: '#f1e6d2', neckC: '#fffaf0', headC: '#fffaf0', legC: '#f5c542', legW: 0.75,
      tail(c) { for (const [a, l] of [[-0.9, 26], [-0.4, 30], [0.1, 24]]) { c.save(); c.translate(-32, -8); c.rotate(a); c.beginPath(); c.ellipse(-l / 2, 0, l / 2, 6, 0, 0, 7); ol(c, '#fffaf0', 3); c.restore(); } },
      foot(c) { claw(c, '#f5c542'); },
      head(c, open) { beak(c, open, '#f5b82e', 16, 4); disc(c, '#fffaf0'); },
      headDeco(c) { for (const [x, y, r] of [[-4, -10, 3.6], [0, -12.5, 4.4], [4, -10.5, 3.4]]) circ(c, x, y, r, '#e63946', 2.5); ell(c, 9, 8, 3, 5, '#e63946', 2.2); } },

    { id: 'penguin', name: 'Penguin', price: 200, neck: 0.85, body: '#2a3038', wing: '#1c2026', neckC: '#2a3038', headC: '#2a3038', legC: '#ff9b2f',
      tail(c) { poly(c, [[-30, -4], [-46, 8], [-32, 8]], '#2a3038', 3); },
      bodyDeco(c) { ell(c, 8, 7, 30, 22, '#ffffff', 0); },
      neckDeco(c, n, nN) { c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.beginPath(); c.moveTo(n[0].x, n[0].y); for (let i = 1; i < Math.floor(nN * 0.45); i++) c.lineTo(n[i].x, n[i].y); c.stroke(); },
      head(c, open) { beak(c, open, '#ff9b2f', 20, 4); disc(c, '#2a3038'); ell(c, 2, 3, 5, 4, '#ffffff', 0); },
      eye: { bg: '#ffffff' },
      headDeco(c) { c.strokeStyle = '#ffd23f'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-9, -4); c.quadraticCurveTo(-12, -9, -6, -11); c.stroke(); } },

    { id: 'duck', name: 'Mallard', price: 150, body: '#b99568', wing: '#7e8da3', neckC: '#2e9e5b', headC: '#2e9e5b', legC: '#ff9b2f',
      tail(c) { poly(c, [[-30, -10], [-48, -22], [-40, -4], [-30, 4]], '#6b543a', 3); },
      neckDeco(c, n, nN) { const i = Math.round(nN * 0.12); c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); c.moveTo(n[i].x - 4, n[i].y - 1); c.lineTo(n[i].x + 4, n[i].y + 1); c.stroke(); },
      head(c, open) { c.fillStyle = '#ffd23f'; c.strokeStyle = INK; c.lineWidth = 3; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(4, -4); c.quadraticCurveTo(26, -6 - open * 0.3, 27, -1); c.lineTo(4, 0); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(4, 0); c.lineTo(26, 0.5 + open); c.quadraticCurveTo(24, 5 + open, 4, 5 + open * 0.5); c.closePath(); c.fill(); c.stroke();
        disc(c, '#2e9e5b'); } },

    { id: 'blackswan', name: 'Black Swan', price: 300, neck: 1.2, body: '#2d2d38', wing: '#40404f', neckC: '#2d2d38', headC: '#2d2d38', legC: '#3a3a44', neckW: 0.9,
      tail(c) { poly(c, [[-28, -10], [-52, -24], [-44, -2], [-30, 6]], '#2d2d38', 3); },
      head(c, open) { beak(c, open, '#e63946', 22, 4); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(18, -2); c.lineTo(18, 4 + open * 0.5); c.stroke(); disc(c, '#2d2d38'); },
      eye: { bg: '#ffffff' } },

    { id: 'flamingo', name: 'Flamingo', price: 350, neck: 1.25, body: '#ff9fbd', wing: '#ff7aa6', neckC: '#ff9fbd', headC: '#ff9fbd', legC: '#ff8ab0', legW: 0.7, neckW: 0.85,
      tail(c) { poly(c, [[-30, -6], [-50, -10], [-36, 8]], '#ff7aa6', 3); },
      bodyDeco(c) { c.fillStyle = '#2a2a33'; c.beginPath(); c.ellipse(-22, -2, 12, 9, 0, 0, 7); c.fill(); },
      foot(c) { ell(c, 4, 2, 10, 3.6, '#ff8ab0', 2.5); },
      head(c, open) { c.fillStyle = '#ff9fbd'; c.strokeStyle = INK; c.lineWidth = 3; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(4, -5); c.quadraticCurveTo(16, -6, 22, 5 + open * 0.2); c.lineTo(15, 4); c.quadraticCurveTo(10, 2, 4, 2); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#23272f'; c.beginPath(); c.moveTo(16, -1); c.quadraticCurveTo(21, 0, 22, 5); c.lineTo(15, 4); c.closePath(); c.fill();
        disc(c, '#ff9fbd'); } },

    { id: 'ostrich', name: 'Ostrich', price: 320, neck: 1.3, body: '#3a3a42', wing: '#f4f0e6', neckC: '#eab6a4', headC: '#eab6a4', legC: '#eab6a4', legW: 1.25, neckW: 0.85,
      tail(c) { for (const a of [-0.9, -0.45, 0]) { c.save(); c.translate(-30, -6); c.rotate(a); c.beginPath(); c.ellipse(-12, 0, 13, 7, 0, 0, 7); ol(c, '#f4f0e6', 3); c.restore(); } },
      foot(c) { c.strokeStyle = INK; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 1); c.lineTo(12, 3); c.stroke(); c.strokeStyle = '#eab6a4'; c.lineWidth = 4.6; c.beginPath(); c.moveTo(0, 1); c.lineTo(12, 3); c.stroke(); },
      head(c, open) { beak(c, open, '#d9c7a1', 15, 4); disc(c, '#eab6a4', 9.5); },
      eye: { x: 2, y: -3, r: 3.6, bg: '#ffffff' },
      headDeco(c) { c.strokeStyle = INK; c.lineWidth = 1.5; for (const a of [-0.5, -0.1]) { c.beginPath(); c.moveTo(2, -6); c.lineTo(-2 + a * 8, -11); c.stroke(); } } },

    { id: 'parrot', name: 'Parrot', price: 280, body: '#3fbf5e', wing: '#2f7fd6', neckC: '#3fbf5e', headC: '#3fbf5e', legC: '#8a8f98',
      tail(c) { poly(c, [[-30, -6], [-62, -4], [-34, 6]], '#e63946', 3); poly(c, [[-30, -2], [-58, 8], [-34, 8]], '#2f7fd6', 3); },
      bodyDeco(c) { c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(14, 12, 24, 12, 0, 0, 7); c.fill(); },
      foot(c) { claw(c, '#8a8f98'); },
      head(c, open) { c.fillStyle = '#e63946'; c.strokeStyle = INK; c.lineWidth = 3; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(3, -7); c.quadraticCurveTo(20, -10, 20, 4 + open * 0.3); c.lineTo(12, 3); c.quadraticCurveTo(10, 0, 3, 0); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(3, 0); c.lineTo(15, 2 + open); c.lineTo(3, 5 + open * 0.5); c.closePath(); c.fill(); c.stroke();
        disc(c, '#3fbf5e'); ell(c, 3, -3, 5.5, 5.5, '#ffffff', 0); },
      headDeco(c) { for (const [x, y] of [[-6, -10], [-2, -12], [2, -11]]) { c.fillStyle = '#e63946'; c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); } } },

    { id: 'owl', name: 'Owl', price: 260, neck: 0.85, body: '#8f6c49', wing: '#6e5136', neckC: '#8f6c49', headC: '#9b7752', legC: '#e0a537',
      tail(c) { poly(c, [[-30, -6], [-48, -2], [-46, 8], [-32, 8]], '#6e5136', 3); },
      bodyDeco(c) { c.fillStyle = '#e6d3b0'; c.beginPath(); c.ellipse(10, 6, 24, 16, 0, 0, 7); c.fill(); c.strokeStyle = '#8f6c49'; c.lineWidth = 2; for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) { c.beginPath(); c.arc(-4 + x * 10 + (y % 2) * 5, 0 + y * 7, 3.5, 0.2, 2.9); c.stroke(); } },
      foot(c) { claw(c, '#e0a537'); },
      head(c, open) { c.fillStyle = '#ffb02e'; c.strokeStyle = INK; c.lineWidth = 3; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(8, -2); c.lineTo(17, 3 + open * 0.4); c.lineTo(8, 6); c.closePath(); c.fill(); c.stroke(); disc(c, '#9b7752', 11); ell(c, 4, -1, 8, 8, '#f3e4c4', 2); },
      eye: { x: 4, y: -1, r: 4.4, bg: '#ffd23f' },
      headDeco(c) { poly(c, [[-8, -7], [-9, -17], [-3, -10]], '#6e5136', 2.5); poly(c, [[2, -10], [5, -18], [8, -8]], '#6e5136', 2.5); } },

    { id: 'turkey', name: 'Turkey', price: 240, neck: 0.95, body: '#8b5a2b', wing: '#a8743d', neckC: '#d9a7a0', headC: '#7fb3e8', legC: '#d9a7a0',
      tail(c) { const cols = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9']; cols.forEach((col, i) => { c.save(); c.translate(-30, -4); c.rotate(-1.35 + i * 0.5); c.beginPath(); c.ellipse(-17, 0, 18, 6, 0, 0, 7); ol(c, col, 2.5); c.restore(); }); },
      foot(c) { claw(c, '#d9a7a0'); },
      head(c, open) { beak(c, open, '#f5b82e', 15, 4); disc(c, '#7fb3e8', 9.5); },
      headDeco(c) { ell(c, 8, 8, 3, 6, '#e63946', 2.2); ell(c, 14, -2, 2.4, 4, '#e63946', 2); } },

    { id: 'rubberduck', name: 'Rubber Duck', price: 180, neck: 0.8, body: '#ffd93d', wing: '#f2bb1f', neckC: '#ffd93d', headC: '#ffd93d', legC: '#ff9b2f',
      tail(c) { poly(c, [[-30, -6], [-46, -16], [-38, 2]], '#ffd93d', 3); },
      head(c, open) { c.fillStyle = '#ff9b2f'; c.strokeStyle = INK; c.lineWidth = 3; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(5, -4); c.quadraticCurveTo(24, -6 - open * 0.3, 22, 1); c.lineTo(5, 1); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(5, 1); c.lineTo(22, 1.5 + open); c.quadraticCurveTo(20, 5 + open, 5, 5 + open * 0.5); c.closePath(); c.fill(); c.stroke();
        disc(c, '#ffd93d', 11); },
      eye: { r: 2.4 } },

    { id: 'golden', name: 'Golden Goose', price: 1000, body: '#ffd23f', wing: '#f0b400', neckC: '#ffd23f', headC: '#ffd23f', legC: '#e69b00',
      tail(c) { poly(c, [[-30, -8], [-52, -20], [-36, 6]], '#ffd23f', 3); },
      bodyDeco(c) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-8, -12, 16, 5, -0.3, 0, 7); c.fill(); const s = (T() * 1.3) % 1; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(-40 + s * 90, -30, 6, 60); },
      head(c, open) { beak(c, open, '#ff8a00'); disc(c, '#ffd23f'); },
      headDeco(c) { const t = T() * 3; for (let i = 0; i < 3; i++) { const a = t + i * 2.1, r = 14 + Math.sin(t * 1.3 + i) * 3; c.fillStyle = '#fff6b0'; c.save(); c.translate(Math.cos(a) * r, Math.sin(a) * r - 4); c.rotate(a); c.fillRect(-1.5, -4, 3, 8); c.fillRect(-4, -1.5, 8, 3); c.restore(); } } },

    // ------------------------------------------------------------------ not birds
    { id: 'giraffe', name: 'Giraffe', price: 380, neck: 1.6, body: '#f2c14e', wing: '#e0a93a', neckC: '#f2c14e', headC: '#f2c14e', legC: '#d49a2a', legW: 0.9,
      tail(c) { c.strokeStyle = INK; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-34, 0); c.quadraticCurveTo(-48, 6, -50, 18); c.stroke(); c.strokeStyle = '#d49a2a'; c.lineWidth = 2.5; c.stroke(); circ(c, -50, 20, 4, '#8a5a1a', 2); },
      bodyDeco(c) { c.fillStyle = '#a8641f'; for (const [x, y, r] of [[-20, -6, 7], [-6, 8, 6], [10, -10, 7], [22, 6, 6], [-26, 12, 5], [2, -2, 4]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } },
      neckDeco(c, n, nN) { c.fillStyle = '#a8641f'; for (let i = 2; i < nN - 2; i += 3) { c.beginPath(); c.ellipse(n[i].x + (i % 2 ? 2 : -2), n[i].y, 2.6, 2.2, 0, 0, 7); c.fill(); } },
      foot: undefined,
      head(c, open) { ell(c, 12, 1 + open * 0.3, 10, 6, '#f2c14e', 3); circ(c, 18, -1, 1.4, INK, 0); disc(c, '#f2c14e'); },
      headBack(c) { poly(c, [[-8, -4], [-18, -8], [-9, 2]], '#e0a93a', 2.5); },
      headDeco(c) { for (const x of [-3, 3]) { c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, -9); c.lineTo(x - 1, -17); c.stroke(); circ(c, x - 1, -18, 2.6, '#8a5a1a', 2); } } },

    { id: 'llama', name: 'Llama', price: 330, neck: 1.1, body: '#f6eddb', wing: '#e8dcc2', neckC: '#f6eddb', headC: '#f6eddb', legC: '#e8dcc2', neckW: 1.2,
      tail(c) { circ(c, -36, -4, 6, '#f6eddb', 2.5); },
      bodyDeco(c) { c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 2; for (let x = -30; x < 36; x += 10) { c.beginPath(); c.arc(x, -18, 6, 0.2, 2.9); c.stroke(); } },
      foot(c) { hoof(c, '#8a6a4a'); },
      head(c, open) { ell(c, 11, 2 + open * 0.3, 11, 7, '#f6eddb', 3); circ(c, 19, 0, 1.4, INK, 0); disc(c, '#f6eddb'); },
      headBack(c) { poly(c, [[-6, -6], [-8, -19], [-1, -8]], '#f6eddb', 2.5); poly(c, [[0, -8], [3, -20], [6, -7]], '#f6eddb', 2.5); },
      headDeco(c) { poly(c, [[-4, -9], [-6, -17], [-1, -9]], '#f6eddb', 2); } },

    { id: 'dino', name: 'Dino', price: 360, neck: 1.4, body: '#6bbf6a', wing: '#4ea34d', neckC: '#6bbf6a', headC: '#6bbf6a', legC: '#4ea34d', legW: 1.2, neckW: 1.1,
      tail(c) { c.beginPath(); c.moveTo(-28, -8); c.quadraticCurveTo(-60, -10, -86, 8); c.quadraticCurveTo(-60, 4, -28, 10); c.closePath(); ol(c, '#6bbf6a', 3); },
      bodyDeco(c) { c.fillStyle = '#4ea34d'; for (const x of [-24, -12, 0, 12, 24]) poly(c, [[x - 5, -22], [x, -32], [x + 5, -22]], '#4ea34d', 0); c.fillStyle = '#4ea34d'; for (const [x, y] of [[-14, -4], [4, 4], [18, -8]]) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); } },
      foot(c) { c.fillStyle = '#4ea34d'; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.ellipse(4, 2, 11, 5, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#fff'; for (const x of [8, 11, 14]) { c.beginPath(); c.arc(x, 2, 1.4, 0, 7); c.fill(); } },
      head(c, open) { ell(c, 11, 1 + open * 0.3, 11, 7, '#6bbf6a', 3); circ(c, 18, -2, 1.3, INK, 0); disc(c, '#6bbf6a', 10); } },

    { id: 'cat', name: 'Cat', price: 220, body: '#f0902f', wing: '#d97a1c', neckC: '#f0902f', headC: '#f0902f', legC: '#f0902f',
      tail(c) { c.strokeStyle = INK; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.moveTo(-34, 0); c.bezierCurveTo(-60, 4, -56, -26, -44, -34); c.stroke(); c.strokeStyle = '#f0902f'; c.lineWidth = 6.5; c.stroke(); },
      bodyDeco(c) { c.strokeStyle = '#c96a10'; c.lineWidth = 3.5; for (let x = -26; x < 30; x += 12) { c.beginPath(); c.moveTo(x, -26); c.lineTo(x + 3, -12); c.stroke(); } },
      foot(c) { paw(c, '#ffffff'); },
      head(c, open) { disc(c, '#f0902f', 10.5); poly(c, [[12, -1], [17, 1 + open * 0.3], [12, 4]], '#ff8fb1', 2); c.strokeStyle = INK; c.lineWidth = 1.4; for (const dy of [-2, 1, 4]) { c.beginPath(); c.moveTo(9, 2 + dy * 0.2); c.lineTo(20, dy * 1.6 + 1); c.stroke(); } },
      headDeco(c) { poly(c, [[-8, -6], [-10, -18], [-1, -10]], '#f0902f', 2.5); poly(c, [[1, -10], [6, -18], [9, -7]], '#f0902f', 2.5); poly(c, [[-8, -9], [-8.5, -14], [-4, -10]], '#ff8fb1', 0); } },

    { id: 'bunny', name: 'Bunny', price: 230, neck: 0.9, body: '#f2eee8', wing: '#e3dcd2', neckC: '#f2eee8', headC: '#f2eee8', legC: '#f2eee8',
      tail(c) { circ(c, -36, -2, 8, '#ffffff', 2.5); },
      foot(c) { ell(c, 6, 2, 13, 4.6, '#f2eee8', 2.5); },
      head(c, open) { disc(c, '#f2eee8', 10.5); ell(c, 15, 3 + open * 0.3, 5, 4, '#f2eee8', 2.5); poly(c, [[16, 0], [20, 1], [17, 3]], '#ff8fb1', 1.5); c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); c.moveTo(14, 6); c.lineTo(15 + 0, 8 + open * 0.3); c.stroke(); },
      headBack(c) { c.save(); c.translate(-4, -8); c.rotate(-0.25); ell(c, 0, -11, 4.2, 12, '#f2eee8', 2.5); ell(c, 0, -11, 1.8, 8.5, '#ffb3cf', 0); c.restore(); },
      headDeco(c) { c.save(); c.translate(3, -9); c.rotate(0.25); ell(c, 0, -11, 4.2, 12, '#f2eee8', 2.5); ell(c, 0, -11, 1.8, 8.5, '#ffb3cf', 0); c.restore(); } },

    { id: 'frog', name: 'Frog', price: 210, neck: 0.8, body: '#5fc24c', wing: '#4aa63a', neckC: '#5fc24c', headC: '#5fc24c', legC: '#4aa63a',
      tail() {},
      bodyDeco(c) { c.fillStyle = '#d8f3a8'; c.beginPath(); c.ellipse(8, 12, 30, 14, 0, 0, 7); c.fill(); c.fillStyle = '#3c9a2e'; for (const [x, y] of [[-14, -8], [-2, -12], [12, -6]]) { c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.fill(); } },
      foot(c) { c.fillStyle = '#4aa63a'; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.ellipse(5, 2, 12, 4.4, 0, 0, 7); c.fill(); c.stroke(); for (const x of [9, 13, 17]) circ(c, x, 2, 1.6, '#4aa63a', 1.5); },
      head(c, open) { c.beginPath(); c.ellipse(5, 1, 14, 9, 0, 0, 7); ol(c, '#5fc24c', 3); c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(6, 4 + open * 0.3); c.quadraticCurveTo(14, 7 + open, 18, 3); c.stroke(); },
      eye: { x: 3, y: -6, r: 3.2, bg: '#ffffff' },
      headDeco(c) { circ(c, 3, -7, 5.6, '#5fc24c', 2.5); circ(c, 4, -7, 3.4, '#ffffff', 0); circ(c, 5, -7, 1.9, INK, 0); circ(c, -6, -6, 4.6, '#5fc24c', 2.5); circ(c, -5, -6, 2.8, '#ffffff', 0); circ(c, -4, -6, 1.6, INK, 0); } },
  ];

  const BY_ID = {};
  SKINS.forEach((s) => { BY_ID[s.id] = s; });
  root.Skins = { LIST: SKINS, BY_ID };
})(typeof window !== 'undefined' ? window : globalThis);
