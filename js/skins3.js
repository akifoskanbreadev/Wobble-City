/*
 * Layout skins and jelly skins.
 *  - Layout skins change where the parts sit: leg positions, where the neck is attached, which way it points,
 *    how long and stiff it is, and how long the body is. (The Lovely Dog is based on the player's own drawing.)
 *    shape: { w, h, leg, neck, nx, ny (neck anchor), ang, bend (neck rest angle, deg), stiff, hip: [back, front] (fractions of body half-length), rect }
 *  - Jelly skins: soft-body physics (pressure + squishy links). jelly: { c: softness, k: pressure }, jellyC: [base, light]
 */
(function (root) {
  'use strict';
  const S = root.Skins, { INK, ol, ell, poly, circ, beak, disc, claw, paw, T } = S.H;
  const add = (o) => { S.LIST.push(o); S.BY_ID[o.id] = o; };
  const stripes = (c, col, w, gap, ang) => { c.save(); c.rotate(ang || 0); c.fillStyle = col; for (let x = -60; x < 60; x += gap) c.fillRect(x, -40, w, 80); c.restore(); };
  const dots = (c, col, r, gx, gy) => { c.fillStyle = col; for (let x = -36; x < 40; x += gx) for (let y = -22; y < 26; y += gy) { c.beginPath(); c.arc(x + ((y / gy) & 1 ? gx / 2 : 0), y, r, 0, 7); c.fill(); } };
  const block = (c, x, y, w, h, fill, lw) => { c.beginPath(); c.rect(x, y, w, h); ol(c, fill, lw); };
  const rr = (c, x, y, w, h, r, fill, lw) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); ol(c, fill, lw); };

  // block-style foot (like the legs in the dog drawing)
  const boxFoot = (col) => (c) => { rr(c, -6, -2, 20, 9, 3, col, 2.8); };
  const longHead = (col, len, th) => (c, open, sk) => { rr(c, -10, -th - 1, len, th * 2 + 2 + open * 0.5, 6, col, 3); };

  // ================================================================ layout skins
  // THE LOVELY DOG: the player's own drawing, brought to life: a long blocky body, two thick legs at each end, a long straight neck out of the front and a little snout with one ear.
  add({ id: 'lovelydog', name: 'Lovely Dog', price: 500, neckW: 1.5, legW: 2.3, legC: '#fff', body: '#ffffff', wing: '#ffffff', neckC: '#ffffff', headC: '#ffffff', eye: { x: 9, y: -2, r: 1.8 },
    shape: { w: 2.1, h: 0.95, leg: 1.25, neck: 1.35, nx: 30, ny: -8, ang: -3, bend: 0, stiff: 3.4, hip: [-0.86, 0.86], rect: true },
    tail(c) { c.beginPath(); c.moveTo(-36, -10); c.lineTo(-48, -22); c.lineTo(-40, -4); c.closePath(); ol(c, '#fff', 3); },
    foot: boxFoot('#fff'),
    head(c, open) { rr(c, -10, -9, 34, 19 + open * 0.4, 8, '#fff', 3); },
    headDeco(c) { c.beginPath(); c.ellipse(-3, -14, 3.4, 6.5, 0.4, 0, 7); ol(c, '#fff', 2.8); },
    wingOff: true });
  add({ id: 'dachshund', name: 'Sausage Dog', price: 420, neckW: 1.3, legW: 1.3, legC: '#8a5a32', body: '#b5733a', wing: '#8f5a2a', neckC: '#b5733a', headC: '#b5733a', eye: { x: 7, y: -3, r: 2.2 },
    shape: { w: 2.5, h: 0.62, leg: 0.5, neck: 0.8, nx: 32, ny: -3, ang: -24, bend: 1.2, stiff: 2.2, hip: [-0.82, 0.8] },
    tail(c) { poly(c, [[-36, -6], [-50, -16], [-38, 2]], '#b5733a', 3); },
    foot(c) { ell(c, 4, 1, 8, 4, '#8a5a32', 2.5); },
    head(c, open) { ell(c, 10, 2, 16, 7 + open * 0.2, '#b5733a', 3); ell(c, 0, 0, 10, 10, '#b5733a', 3); circ(c, 24, 0, 3.2, INK, 2); },
    headDeco(c) { c.beginPath(); c.ellipse(-4, 4, 5, 11, 0.2, 0, 7); ol(c, '#7a4a22', 2.6); } });
  add({ id: 'brontosaurus', name: 'Long-Neck Dino', price: 560, neckW: 1.2, legC: '#4e8a3a', legW: 1.6, body: '#6aa84a', wing: '#4e8a3a', neckC: '#6aa84a', headC: '#6aa84a',
    shape: { w: 1.8, h: 1.25, leg: 1.3, neck: 2.1, nx: 22, ny: -14, ang: -64, bend: 2.4, stiff: 1.7, hip: [-0.72, 0.72] },
    tail(c) { poly(c, [[-34, -8], [-72, 4], [-34, 8]], '#6aa84a', 3); },
    bodyDeco(c) { c.fillStyle = 'rgba(60,110,40,.5)'; for (const [x, y, r] of [[-20, -6, 5], [0, 8, 6], [18, -4, 4]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } },
    foot(c) { ell(c, 3, 2, 10, 5, '#4e8a3a', 2.8); },
    head(c, open) { ell(c, 8, 2, 13, 8, '#6aa84a', 3); ell(c, 0, 0, 9, 9, '#6aa84a', 3); } });
  add({ id: 'coffeetable', name: 'Table Goose', price: 480, legC: '#8a5a2b', legW: 1.8, body: '#b8803f', wing: '#8a5a2b', neckC: '#ffffff', headC: '#ffffff',
    shape: { w: 2.2, h: 0.36, leg: 1.7, neck: 1, nx: 6, ny: -6, ang: -98, bend: 4.2, stiff: 1, hip: [-0.9, 0.9], rect: true },
    foot: boxFoot('#8a5a2b'), tail(c) { c.beginPath(); c.rect(-38, -6, 6, 4); ol(c, '#b8803f', 3); },
    bodyDeco(c) { c.strokeStyle = 'rgba(80,40,10,.4)'; c.lineWidth = 1.5; for (let y = -16; y < 18; y += 8) { c.beginPath(); c.moveTo(-40, y); c.lineTo(40, y + 3); c.stroke(); } } });
  add({ id: 'lizard', name: 'Lizard Goose', price: 400, legC: '#2f8f4a', legW: 1.2, body: '#4ab35f', wing: '#2f8f4a', neckC: '#4ab35f', headC: '#4ab35f', eye: { x: 6, y: -4, r: 2.4 },
    shape: { w: 2.1, h: 0.5, leg: 0.42, neck: 0.75, nx: 30, ny: -2, ang: -12, bend: 0.5, stiff: 2.4, hip: [-0.8, 0.8] },
    tail(c) { poly(c, [[-34, -4], [-76, 10], [-34, 6]], '#4ab35f', 3); }, foot(c) { claw(c, '#2f8f4a'); },
    bodyDeco(c) { c.fillStyle = 'rgba(30,100,50,.45)'; for (let x = -34; x < 40; x += 10) { c.beginPath(); c.moveTo(x, -26); c.lineTo(x + 5, -14); c.lineTo(x + 10, -26); c.fill(); } },
    head(c, open) { ell(c, 8, 1, 14, 7, '#4ab35f', 3); ell(c, 0, 0, 9, 9, '#4ab35f', 3); } });
  add({ id: 'backwards', name: 'Backwards Goose', price: 380, legC: '#ff9b2f', body: '#fff', wing: '#e4edf5',
    shape: { w: 1.2, h: 1, nx: -24, ny: -17, ang: -98, bend: 4.2, stiff: 1, hip: [-0.46, 0.46] },
    tail(c) { poly(c, [[30, -8], [54, -20], [38, 6]], '#fff', 3); } });
  add({ id: 'tallboi', name: 'Tall Boi', price: 440, legC: '#ff9b2f', legW: 0.9, body: '#e8f0ff', wing: '#cfd9e6', neckC: '#e8f0ff', headC: '#e8f0ff',
    shape: { w: 0.62, h: 2.1, leg: 0.8, neck: 1, nx: 20, ny: -12, ang: -98, bend: 4.2, stiff: 1, hip: [-0.4, 0.4] },
    bodyDeco(c) { stripes(c, 'rgba(120,150,200,.3)', 5, 14, 0); } });
  add({ id: 'widestance', name: 'Wide Stance', price: 360, legC: '#ff9b2f', legW: 1.1, body: '#fff', wing: '#e4edf5',
    shape: { w: 1.7, h: 0.8, leg: 1.1, hip: [-0.95, 0.95], nx: 26, ny: -14 } });
  add({ id: 'anteater', name: 'Snout Beast', price: 450, neckW: 1.1, legC: '#5a4636', legW: 1.2, body: '#8a6a4a', wing: '#6a4f36', neckC: '#8a6a4a', headC: '#8a6a4a', eye: { x: 7, y: -3, r: 2.2 },
    shape: { w: 1.9, h: 0.9, leg: 0.8, neck: 1.5, nx: 30, ny: 2, ang: 14, bend: -1.2, stiff: 2.6, hip: [-0.8, 0.78] },
    tail(c) { poly(c, [[-34, -8], [-72, -30], [-60, 0], [-34, 6]], '#5a4636', 3); },
    bodyDeco(c) { c.strokeStyle = 'rgba(40,25,10,.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-34, -22); c.lineTo(30, 4); c.stroke(); },
    head(c, open) { ell(c, 12, 2, 20, 5 + open * 0.2, '#8a6a4a', 3); ell(c, 0, 0, 9, 9, '#8a6a4a', 3); circ(c, 30, 1, 2.6, INK, 2); } });
  add({ id: 'swanboat', name: 'Swan Boat', price: 460, neckW: 1.1, legC: '#ffd23f', body: '#ffffff', wing: '#e4edf5',
    shape: { w: 1.5, h: 0.85, leg: 0.7, neck: 1.5, nx: 28, ny: -10, ang: -110, bend: 6.5, stiff: 1.5, hip: [-0.5, 0.5] },
    tail(c) { poly(c, [[-34, -10], [-58, -26], [-40, 2]], '#fff', 3); } });
  add({ id: 'crate', name: 'Crate Goose', price: 340, legC: '#8a5a2b', legW: 1.3, body: '#c98a4a', wing: '#a8692f', neckC: '#fff', headC: '#fff',
    shape: { w: 1.1, h: 1.35, leg: 0.8, nx: 14, ny: -26, rect: true },
    foot: boxFoot('#8a5a2b'),
    bodyDeco(c) { c.strokeStyle = '#6a3f18'; c.lineWidth = 4; c.beginPath(); c.moveTo(-38, -24); c.lineTo(38, 24); c.moveTo(38, -24); c.lineTo(-38, 24); c.stroke(); c.strokeRect(-34, -20, 68, 40); } });
  add({ id: 'caterpillar', name: 'Caterpillar', price: 520, legC: '#ffd23f', legW: 0.9, body: '#7ad862', wing: '#5fb94a', neckC: '#7ad862', headC: '#7ad862', eye: { x: 5, y: -4, r: 3 },
    shape: { w: 2.3, h: 0.7, leg: 0.4, neck: 0.55, nx: 30, ny: -4, ang: -35, bend: 2.5, stiff: 2, hip: [-0.8, 0.8] },
    bodyDeco(c) { c.strokeStyle = 'rgba(40,110,40,.55)'; c.lineWidth = 3; for (let x = -26; x < 36; x += 13) { c.beginPath(); c.moveTo(x, -26); c.lineTo(x, 26); c.stroke(); } },
    headDeco(c) { c.strokeStyle = INK; c.lineWidth = 2.4; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 3 - 2, -9); c.quadraticCurveTo(s * 8, -20, s * 12 - 2, -22); c.stroke(); circ(c, s * 12 - 2, -22, 2.2, '#e63946', 1.5); } } });

  // ================================================================ jelly skins (soft body)
  const J = (o) => add(Object.assign({ legW: 0.8, legC: '#fff', neckW: 1, jelly: { c: 0.02, k: 1500 }, jellyC: ['#ff5c7a', '#ffb3c1'] }, o, { shape: Object.assign({ leg: 0.5 }, o.shape || {}) }));
  J({ id: 'jelly_straw', name: 'Strawberry Jelly', price: 380, jellyC: ['#e63a5a', '#ffb0bf'], neckC: '#ff7e96', headC: '#ffb0bf', legC: '#ff7e96', wing: '#ffd0da' });
  J({ id: 'jelly_lime', name: 'Lime Jelly', price: 380, jellyC: ['#5ac23a', '#d6ffa8'], neckC: '#8ee06a', headC: '#d6ffa8', legC: '#8ee06a', wing: '#e8ffcb' });
  J({ id: 'jelly_grape', name: 'Grape Jelly', price: 400, jellyC: ['#8a4ad6', '#d9b8ff'], neckC: '#a678e8', headC: '#d9b8ff', legC: '#a678e8', wing: '#eadcff' });
  J({ id: 'jelly_lemon', name: 'Lemon Jelly', price: 400, jellyC: ['#f2c21a', '#fff1a0'], neckC: '#ffd84a', headC: '#fff1a0', legC: '#ffd84a', wing: '#fff8cc' });
  J({ id: 'jelly_blue', name: 'Blueberry Jelly', price: 420, jellyC: ['#2f6be0', '#a8c8ff'], neckC: '#5f8ff0', headC: '#a8c8ff', legC: '#5f8ff0', wing: '#d0e0ff' });
  J({ id: 'jelly_orange', name: 'Orange Jelly', price: 420, jellyC: ['#ff8a1f', '#ffd0a0'], neckC: '#ffa04a', headC: '#ffd0a0', legC: '#ffa04a', wing: '#ffe6c8' });
  J({ id: 'jelly_mega', name: 'Mega Jelly', price: 600, shape: { w: 1.5, h: 1.5, leg: 0.4 }, jelly: { c: 0.03, k: 1100 }, jellyC: ['#d43ad6', '#ffb8ff'], neckC: '#e87aea', headC: '#ffb8ff', legC: '#e87aea', wing: '#ffd8ff' });
  J({ id: 'jelly_mini', name: 'Mini Jelly', price: 450, shape: { w: 0.75, h: 0.75, leg: 0.4, neck: 0.8 }, jelly: { c: 0.012, k: 1900 }, jellyC: ['#1fb8b0', '#aef5f0'], neckC: '#5fd6cf', headC: '#aef5f0', legC: '#5fd6cf', wing: '#d0fbf8' });
  J({ id: 'jelly_cube', name: 'Jelly Cube', price: 520, shape: { w: 1.1, h: 1.5, leg: 0.4 }, jelly: { c: 0.016, k: 1700 }, jellyC: ['#3ab8ff', '#bfeaff'], neckC: '#6acfff', headC: '#bfeaff', legC: '#6acfff', wing: '#e0f5ff' });
  J({ id: 'jelly_slime', name: 'Goo Slime', price: 640, shape: { w: 1.3, h: 1.0, leg: 0.3 }, jelly: { c: 0.05, k: 900, damp: 3 }, jellyC: ['#3ad66a', '#b8ffd0'], neckC: '#6aea90', headC: '#b8ffd0', legC: '#6aea90', wing: '#d8ffe6' });
})(typeof window !== 'undefined' ? window : globalThis);
