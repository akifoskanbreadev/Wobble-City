/*
 * Realistic-looking clouds. Each cloud is a cumulus painted once into an offscreen canvas out of a few dozen soft,
 * overlapping puffs (lit from the top-left, shaded and flat underneath, with wispy fringes), then drawn in three
 * parallax layers. Sprites are cached per colour tint, so a theme like sunset gets warm clouds and night gets dark ones.
 */
(function (root) {
  'use strict';
  const rng = (a) => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // light / mid / shade colours (r,g,b) and an overall opacity
  const TINTS = {
    day:    { light: [255, 255, 255], mid: [236, 243, 252], shade: [170, 188, 214], a: 1 },
    desert: { light: [255, 252, 240], mid: [251, 236, 212], shade: [214, 176, 132], a: 0.95 },
    snow:   { light: [255, 255, 255], mid: [242, 248, 255], shade: [188, 208, 232], a: 1 },
    sunset: { light: [255, 240, 222], mid: [255, 204, 178], shade: [196, 118, 134], a: 0.95 },
    night:  { light: [150, 162, 214], mid: [96, 108, 170], shade: [42, 52, 104], a: 0.7 },
    candy:  { light: [255, 255, 255], mid: [255, 228, 245], shade: [232, 160, 208], a: 0.95 },
    lava:   { light: [214, 150, 130], mid: [140, 78, 70], shade: [60, 28, 28], a: 0.65 },
    storm:  { light: [168, 176, 190], mid: [120, 128, 146], shade: [74, 80, 98], a: 0.95 },
  };
  const THEME_TINT = { meadow: 'day', desert: 'desert', snow: 'snow', sunset: 'sunset', night: 'night', candy: 'candy', lava: 'lava', dungeon: 'night', sky: 'day', jungle: 'day', cavern: 'night', factory: 'storm', space: 'night' };
  const rgb = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')';
  const mixc = (a, b, k) => [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];

  const cache = {};
  const SW = 560, SH = 280;

  function make(tintKey, variant) {
    const T = TINTS[tintKey] || TINTS.day;
    const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
    const c = cv.getContext('2d'), R = rng(9000 + variant * 7919);
    const baseY = 205, left = 90, right = SW - 90, span = right - left;
    // puff list: a billowing dome on a flat base
    const puffs = [];
    const lumps = 2 + (variant % 3);
    const centres = []; for (let i = 0; i < lumps; i++) centres.push({ x: left + span * ((i + 0.5 + (R() - 0.5) * 0.5) / lumps), h: 70 + R() * 90 });
    const dome = (x) => { let h = 22; for (const k of centres) h = Math.max(h, k.h * Math.exp(-Math.pow((x - k.x) / (span / lumps * 0.75), 2))); return h; };
    for (let i = 0; i < 170; i++) {
      const x = left + R() * span, top = dome(x);
      const y = baseY - Math.pow(R(), 0.75) * top * 0.95, r = 14 + R() * 24 + top * 0.2;
      puffs.push({ x, y: Math.min(y, baseY - 8), r });
    }
    for (let x = left - 10; x < right + 10; x += 24 + R() * 10) puffs.push({ x, y: baseY - 4 - R() * 8, r: 20 + R() * 18 });     // flat-ish base
    puffs.sort((a, b) => b.y - a.y);                                                                                              // back (low) first, tops painted last
    for (const p of puffs) {
      const g = c.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
      const lit = Math.max(0, Math.min(1, (baseY - p.y) / 130));                    // higher puffs are brighter
      const core = mixc(T.mid, T.light, lit);
      g.addColorStop(0, rgb(core, 0.6)); g.addColorStop(0.55, rgb(mixc(T.shade, T.mid, 0.5 + lit * 0.4), 0.32)); g.addColorStop(1, rgb(T.shade, 0));
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill();
    }
    // under-shading, flat bottom
    c.globalCompositeOperation = 'source-atop';
    const sg = c.createLinearGradient(0, baseY - 90, 0, baseY + 10);
    sg.addColorStop(0, rgb(T.shade, 0)); sg.addColorStop(1, rgb(T.shade, 0.5));
    c.fillStyle = sg; c.fillRect(0, 0, SW, SH);
    // sunlit highlights on the upper-left rims
    const hg = c.createLinearGradient(0, 20, 0, baseY - 20);
    hg.addColorStop(0, rgb(T.light, 0.55)); hg.addColorStop(1, rgb(T.light, 0));
    c.fillStyle = hg; c.fillRect(0, 0, SW, SH);
    c.globalCompositeOperation = 'source-over';
    // wispy fringe: tiny faint puffs around the edge
    for (let i = 0; i < 40; i++) {
      const x = left - 20 + R() * (span + 40), y = baseY - R() * (dome(x) + 8), r = 12 + R() * 22;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgb(T.light, 0.14)); g.addColorStop(1, rgb(T.light, 0));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    // soft flat-bottom fade
    c.globalCompositeOperation = 'destination-out';
    const fg = c.createLinearGradient(0, baseY - 22, 0, baseY + 30); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = fg; c.fillRect(0, baseY - 22, SW, SH);
    c.globalCompositeOperation = 'source-over';
    return cv;
  }

  function sprite(tintKey, variant) {
    const k = tintKey + ':' + (variant % 6);
    return cache[k] || (cache[k] = make(tintKey, variant % 6));
  }
  const tintFor = (theme, storm) => (storm ? 'storm' : THEME_TINT[theme] || 'day');

  // one cloud, centred at x,y, `w` pixels wide
  function one(c, x, y, w, alpha, tintKey, variant) {
    const T = TINTS[tintKey] || TINTS.day, sp = sprite(tintKey, variant), h = w * SH / SW;
    c.save(); c.globalAlpha = alpha * T.a; c.drawImage(sp, x - w / 2, y - h * 0.7, w, h); c.restore();
  }

  // three parallax layers across the sky. W,H = canvas pixels, S = world->pixel scale.
  function layers(c, camX, camY, W, H, S, theme, t, storm) {
    const tk = tintFor(theme, storm);
    const L = [
      { n: 5, par: 0.04, size: 230, alpha: 0.55, y0: 0.05, y1: 0.34, drift: 3 },
      { n: 5, par: 0.09, size: 330, alpha: 0.8, y0: 0.1, y1: 0.46, drift: 5 },
      { n: 4, par: 0.16, size: 460, alpha: 0.95, y0: 0.18, y1: 0.55, drift: 8 },
    ];
    L.forEach((l, li) => {
      const w = l.size * S, span = W + w * 1.6;
      for (let i = 0; i < l.n; i++) {
        const r1 = (Math.sin(i * 12.9898 + li * 78.233) * 43758.5453) % 1, r2 = (Math.sin(i * 39.346 + li * 11.135) * 24634.6345) % 1;
        const u = Math.abs(r1), v = Math.abs(r2);
        let x = ((i + u * 0.6) * span / l.n - camX * l.par * S + t * l.drift * S) % span; if (x < 0) x += span;
        const y = (l.y0 + (l.y1 - l.y0) * v) * H - camY * 0.03 * S * (li + 1);
        one(c, x - w * 0.3, y, w * (0.8 + u * 0.4), l.alpha, tk, li * 2 + i);
      }
    });
  }

  const api = { sprite, one, layers, tintFor, TINTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Clouds = api;
})(typeof window !== 'undefined' ? window : globalThis);
