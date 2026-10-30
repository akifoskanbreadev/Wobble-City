/*
 * Soft light for every level and mode. Each theme / 3D map has its own light colour and strength
 * (warm gold meadow, hot orange desert, icy blue-white snow, cool dim night, pink candy ...).
 * 2D levels get a tinted soft-light wash, a sun bloom and a vignette; the 3D modes feed the same colours to the engine.
 *   Light.get(key, weather)               -> { col:[r,g,b] 0-255, k: strength 0-1, dim: ambient 0-1, vig:[r,g,b] }
 *   Light.post2d(ctx, W, H, key, weather, t)   (screen space, after everything is drawn)
 *   Light.apply3d(renderer, key, o)       sets the engine's light colour / ambient / direction
 */
(function (root) {
  'use strict';
  const T = {
    meadow: { col: [255, 226, 150], k: 0.5, dim: 1, vig: [20, 40, 20] },
    desert: { col: [255, 170, 80], k: 0.62, dim: 1, vig: [70, 30, 0] },
    snow: { col: [190, 225, 255], k: 0.62, dim: 1.05, vig: [40, 70, 110] },
    sunset: { col: [255, 140, 100], k: 0.62, dim: 0.95, vig: [70, 20, 40] },
    night: { col: [110, 140, 255], k: 0.38, dim: 0.72, vig: [5, 8, 30] },
    candy: { col: [255, 170, 225], k: 0.5, dim: 1.02, vig: [90, 20, 80] },
    dungeon: { col: [255, 150, 70], k: 0.5, dim: 0.62, vig: [10, 5, 15] },
    sky: { col: [255, 250, 215], k: 0.45, dim: 1.05, vig: [30, 60, 110] },
    jungle: { col: [200, 255, 140], k: 0.5, dim: 0.9, vig: [5, 40, 10] },
    cavern: { col: [190, 130, 255], k: 0.5, dim: 0.7, vig: [20, 5, 50] },
    factory: { col: [255, 190, 120], k: 0.42, dim: 0.88, vig: [30, 25, 20] },
    space: { col: [140, 170, 255], k: 0.42, dim: 0.7, vig: [3, 2, 15] },
    ocean: { col: [120, 230, 235], k: 0.5, dim: 0.9, vig: [0, 30, 60] },
    lava: { col: [255, 110, 50], k: 0.62, dim: 0.85, vig: [60, 5, 0] },
    // the 3D hide & seek maps
    suburb: { col: [255, 232, 170], k: 0.5, dim: 1, vig: [20, 40, 20] },
    camp: { col: [255, 215, 140], k: 0.5, dim: 0.95, vig: [10, 40, 10] },
    school: { col: [255, 240, 200], k: 0.45, dim: 1.02, vig: [30, 40, 60] },
    mall: { col: [255, 250, 240], k: 0.4, dim: 1.08, vig: [30, 30, 40] },
    farm: { col: [255, 215, 140], k: 0.55, dim: 1, vig: [40, 40, 10] },
    haunt: { col: [150, 120, 255], k: 0.45, dim: 0.62, vig: [10, 0, 25] },
    beach: { col: [255, 235, 170], k: 0.5, dim: 1.02, vig: [20, 50, 70] },
    toy: { col: [255, 245, 210], k: 0.45, dim: 1.05, vig: [40, 30, 60] },
    castle: { col: [255, 225, 165], k: 0.5, dim: 0.98, vig: [30, 30, 40] },
    pirate: { col: [255, 205, 130], k: 0.52, dim: 0.95, vig: [40, 25, 10] },
    neon: { col: [255, 80, 200], k: 0.55, dim: 0.62, vig: [20, 0, 40] },
    // other modes
    tavern: { col: [255, 190, 110], k: 0.55, dim: 0.6, vig: [20, 8, 0] },
    tavernDark: { col: [60, 60, 120], k: 0.1, dim: 0.12, vig: [0, 0, 5] },
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function get(key, wx) {
    let L = T[key] || T.meadow; L = { col: L.col.slice(), k: L.k, dim: L.dim, vig: L.vig.slice() };
    if (wx) {
      if (wx.whiteout || wx.snow) { L.col = mix(L.col, [205, 232, 255], 0.75); L.k = Math.max(L.k, 0.62) + (wx.whiteout ? 0.1 : 0); L.vig = mix(L.vig, [60, 90, 130], 0.6); }
      else if (wx.storm || wx.rain) { L.col = mix(L.col, [150, 170, 200], 0.55); L.k *= 0.8; L.dim *= 0.85; L.vig = mix(L.vig, [10, 15, 30], 0.5); }
    }
    return L;
  }
  // small cached noise textures (speckled earth, fine grain) used to take the flat "vector" look off surfaces
  const texCache = {};
  function tex(kind, size) {
    const k = kind + size; if (texCache[k]) return texCache[k];
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'); let seed = kind === 'grain' ? 7 : 31;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    if (kind === 'grain') { const im = c.createImageData(size, size); for (let i = 0; i < im.data.length; i += 4) { const v = rnd() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); }
    else { for (let i = 0; i < size * 1.6; i++) { const x = rnd() * size, y = rnd() * size, r = 0.6 + rnd() * 2.6; c.fillStyle = rnd() < 0.55 ? 'rgba(0,0,0,' + (0.1 + rnd() * 0.22) + ')' : 'rgba(255,255,255,' + (0.05 + rnd() * 0.14) + ')'; c.beginPath(); c.ellipse(x, y, r * (0.8 + rnd() * 1.2), r, rnd() * 3, 0, 7); c.fill(); } }
    return (texCache[k] = cv);
  }
  const motes = []; for (let i = 0; i < 38; i++) motes.push({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random(), p: Math.random() * 6 });
  function post2d(c, W, H, key, wx, t) {
    const L = get(key, wx), s = Math.max(W, H), r = L.col[0] | 0, g = L.col[1] | 0, b = L.col[2] | 0, sx = W * 0.8, sy = H * 0.2;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    // the soft light: a tinted wash, strongest near the sun
    c.globalCompositeOperation = 'soft-light';
    let gr = c.createRadialGradient(sx, sy, 0, sx, sy, s * 1.05);
    gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + Math.min(1, L.k * 0.6) + ')'); gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',' + L.k * 0.2 + ')');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    // sun bloom
    c.globalCompositeOperation = 'screen';
    gr = c.createRadialGradient(sx, sy, 0, sx, sy, s * 0.55);
    gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + (0.1 * L.k + 0.015 * Math.sin(t * 0.7)) + ')'); gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    // dim the whole scene a little where the light is weak, and tint the corners
    c.globalCompositeOperation = 'source-over';
    const v = L.vig, dimA = Math.max(0, (1 - L.dim) * 0.45);
    gr = c.createRadialGradient(W / 2, H / 2, s * 0.32, W / 2, H / 2, s * 0.85);
    gr.addColorStop(0, 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + dimA + ')'); gr.addColorStop(1, 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + (0.34 + dimA) + ')');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    // slanting shafts of light from the sun (not in blizzards and storms, where the sky is closed)
    if (!(wx && (wx.whiteout || wx.storm)) && key !== 'dungeon' && key !== 'cavern' && key !== 'space') {
      c.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) { const a0 = 0.9 + i * 0.28 + Math.sin(t * 0.15 + i) * 0.03, wd = 0.07 + 0.02 * (i % 2), x2 = sx + Math.cos(a0) * s * 1.2, y2 = sy + Math.sin(a0) * s * 1.2, x3 = sx + Math.cos(a0 + wd) * s * 1.2, y3 = sy + Math.sin(a0 + wd) * s * 1.2; const rg = c.createLinearGradient(sx, sy, x2, y2); rg.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + 0.05 * L.k + ')'); rg.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)'); c.fillStyle = rg; c.beginPath(); c.moveTo(sx, sy); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fill(); }
    }
    // drifting specks of light in the air (pollen, dust, ice glitter) in the colour of the light
    c.globalCompositeOperation = 'screen';
    for (const m of motes) { const x = ((m.x * W + Math.sin(t * 0.3 * m.s + m.p) * 30 + t * 6 * m.s) % W + W) % W, y = ((m.y * H + Math.cos(t * 0.25 * m.s + m.p) * 20 - t * 4 * m.s) % H + H) % H, a = (0.18 + 0.2 * Math.sin(t * 1.3 + m.p)) * L.k; c.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + Math.max(0, a) + ')'; c.beginPath(); c.arc(x, y, (1 + m.s * 1.4) * (W / 900 + 0.4), 0, 7); c.fill(); }
    // fine film grain
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.04; c.fillStyle = c.createPattern(tex('grain', 128), 'repeat'); c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    c.restore();
  }
  // 3D: the colour of the sun/lamp, a tinted ambient and a direction (low and warm for dusk, high for noon)
  function apply3d(R, key, o) {
    o = o || {}; const L = get(key, null), kk = o.k != null ? o.k : L.k, dim = Math.min(1, o.dim != null ? o.dim : L.dim), c = o.col || L.col, cap = (v) => Math.min(0.92, v);
    R.lightCol = [cap(c[0] / 255 * (0.5 + kk) * dim), cap(c[1] / 255 * (0.5 + kk) * dim), cap(c[2] / 255 * (0.5 + kk) * dim)];
    R.ambCol = [cap((0.6 + 0.35 * c[0] / 255) * dim), cap((0.6 + 0.35 * c[1] / 255) * dim), cap((0.6 + 0.35 * c[2] / 255) * dim)];
    R.lightDir = o.dir || (key === 'sunset' || key === 'pirate' ? [0.8, 0.45, 0.3] : [0.45, 0.85, 0.3]);
  }
  root.Light = { get, post2d, apply3d, tex, TABLE: T };
})(typeof window !== 'undefined' ? window : globalThis);
