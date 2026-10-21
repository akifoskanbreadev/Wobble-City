/*
 * Build-a-Goose: describe a skin in words, get one, then re-roll it, change it with more words, or move its body parts with sliders.
 * Everything runs inside the game (no network): a prompt is read word by word for colours, parts, patterns, animals, sizes and
 * extras, and the rest is filled in from a random seed ("Try again" changes the seed).
 *
 * A custom skin is a small JSON spec; makeSkin(spec) turns it into a normal Skins entry (same fields as skins.js, plus `shape`).
 * Pure part (no DOM): generate, modify, makeSkin, registerAll.   UI part: BuildAGoose.panel(host, ctx).
 */
(function (root) {
  'use strict';
  const S = root.Skins, H = S.H, { INK, ol, ell, poly, circ, beak, disc, claw, paw } = H;
  const PRICE = 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ------------------------------------------------------------------ colours
  const COLS = {
    red: '#e63946', orange: '#ff8a1f', yellow: '#ffd23f', green: '#4cc35a', blue: '#3a86ff', purple: '#8a4ad6', pink: '#ff7eb6', brown: '#8a5a32',
    black: '#2a2f3a', white: '#ffffff', grey: '#9aa3ad', gray: '#9aa3ad', gold: '#e8b82a', silver: '#cfd6de', teal: '#1fb8a8', cyan: '#3ad6ff', lime: '#9be04a',
    navy: '#23408f', maroon: '#8a2a3a', cream: '#fff3d6', peach: '#ffc9a8', mint: '#a8f0cf', lavender: '#c9b3ff', turquoise: '#2fd6c8', magenta: '#e0359a',
    beige: '#e8d4b2', tan: '#c8a06a', rose: '#f08aa0', violet: '#9a5cf0', indigo: '#4a3fb0', coral: '#ff7a68', olive: '#8a9a3a', crimson: '#c4163a',
  };
  const hex2 = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const toHex = (a) => '#' + a.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => { const A = hex2(a), B = hex2(b); return toHex(A.map((v, i) => v + (B[i] - v) * k)); };
  const shade = (c, k) => (k < 0 ? mix(c, '#000000', -k) : mix(c, '#ffffff', k));
  const lum = (c) => { const [r, g, b] = hex2(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const MODS = { dark: (c) => shade(c, -0.4), deep: (c) => shade(c, -0.25), light: (c) => shade(c, 0.45), pale: (c) => shade(c, 0.55), pastel: (c) => shade(c, 0.5), bright: (c) => mix(c, '#ffffff', 0.12), neon: (c) => mix(c, '#ffffff', 0.18) };

  const PARTS = { body: 'body', torso: 'body', wing: 'wing', wings: 'wing', neck: 'neck', head: 'head', face: 'head', leg: 'leg', legs: 'leg', feet: 'leg', foot: 'leg', beak: 'beak', bill: 'beak', snout: 'beak', mouth: 'beak', belly: 'belly', tummy: 'belly', eye: 'eye', eyes: 'eye', tail: 'tail' };
  const PATTERNS = { striped: 'stripes', stripes: 'stripes', stripey: 'stripes', tiger: 'stripes', zebra: 'stripes', spotted: 'spots', spots: 'spots', dotted: 'spots', polka: 'spots', leopard: 'spots', cow: 'spots', checkered: 'checks', checked: 'checks', checkers: 'checks', checker: 'checks', plaid: 'checks', starry: 'stars', stars: 'stars', star: 'stars', hearts: 'hearts', heart: 'hearts', rainbow: 'rainbow', swirl: 'swirl', swirly: 'swirl' };
  const EXTRAS = { crown: 'crown', crowns: 'crown', bow: 'bow', ribbon: 'bow', glasses: 'glasses', sunglasses: 'shades', shades: 'shades', horns: 'horns', horn: 'horns', antlers: 'antlers', mohawk: 'mohawk', halo: 'halo', antenna: 'antenna', antennae: 'antenna', moustache: 'moustache', mustache: 'moustache', shell: 'shell', spikes: 'spikes', fins: 'spikes', blush: 'blush', tusks: 'tusks', fangs: 'tusks', teeth: 'tusks', ears: 'cat', scarf: 'scarf', freckles: 'freckles', wings: 'bigwings' };
  const UP = { long: 1.35, longer: 1.35, big: 1.3, bigger: 1.3, huge: 1.6, giant: 1.7, tall: 1.35, taller: 1.35, thick: 1.3, fat: 1.3, wide: 1.3, large: 1.3, enormous: 1.8, chonky: 1.3 };
  const DOWN = { short: 0.7, shorter: 0.7, small: 0.75, smaller: 0.75, tiny: 0.55, little: 0.75, mini: 0.6, thin: 0.75, skinny: 0.72, narrow: 0.75, slim: 0.78, teeny: 0.5, stubby: 0.6, flat: 0.6 };
  const INTENS = { very: 1.35, super: 1.5, really: 1.3, extra: 1.4, so: 1.3, extremely: 1.7, ultra: 1.6, mega: 1.7 };

  // animal / object presets: partial spec merged under the colour & extra words
  const ANIMALS = {
    dog: { shape: { w: 1.7, h: 0.95, leg: 1.1, neck: 0.9, nx: 28, ny: -8, ang: -30, bend: 1, hip: [-0.8, 0.8] }, head: 'snout', ears: 'droop', tail: 'point', foot: 'paw', col: '#d9a566' },
    puppy: { shape: { w: 1.4, h: 0.9, leg: 0.8, neck: 0.8, nx: 26, ny: -8, ang: -35, bend: 1, hip: [-0.75, 0.75] }, head: 'snout', ears: 'droop', tail: 'point', foot: 'paw', col: '#e8c08a' },
    dachshund: { shape: { w: 2.5, h: 0.62, leg: 0.5, neck: 0.8, nx: 32, ny: -3, ang: -24, bend: 1.2, hip: [-0.82, 0.8] }, head: 'snout', ears: 'droop', tail: 'point', foot: 'paw', col: '#b5733a' },
    sausage: { shape: { w: 2.5, h: 0.62, leg: 0.5, neck: 0.8, nx: 32, ny: -3, ang: -24, bend: 1.2, hip: [-0.82, 0.8] }, head: 'snout', ears: 'droop', tail: 'point', foot: 'paw', col: '#b5733a' },
    cat: { shape: { w: 1.2, h: 0.9, leg: 0.8, neck: 0.75, nx: 24, ny: -12, ang: -75, bend: 2.2, hip: [-0.55, 0.55] }, head: 'cat', ears: 'cat', tail: 'long', foot: 'paw', col: '#f0a050' },
    kitten: { shape: { w: 0.95, h: 0.85, leg: 0.7, neck: 0.7, nx: 22, ny: -10, ang: -75, bend: 2.2, hip: [-0.55, 0.55] }, head: 'cat', ears: 'cat', tail: 'long', foot: 'paw', col: '#e8d4b2' },
    bunny: { shape: { w: 1.0, h: 1.0, leg: 0.7, neck: 0.65, nx: 22, ny: -14, ang: -85, bend: 2.5, hip: [-0.5, 0.5] }, head: 'cat', ears: 'bunny', tail: 'fluff', foot: 'paw', col: '#f4efe8' },
    rabbit: 'bunny',
    duck: { head: 'duck', beakCol: '#ffb02f', col: '#ffe14a', leg: '#ff9b2f', tail: 'point' },
    chick: { shape: { w: 0.8, h: 0.8, leg: 0.7, neck: 0.55 }, head: 'duck', beakCol: '#ff9b2f', col: '#ffe86a', tail: 'point' },
    dino: { shape: { w: 1.8, h: 1.2, leg: 1.0, neck: 0.9, nx: 28, ny: -14, ang: -50, bend: 1.5, stiff: 1.5, hip: [-0.7, 0.7] }, head: 'snout', tail: 'long', extras: ['spikes'], foot: 'claw', col: '#6aa84a', pattern: 'spots' },
    dinosaur: 'dino', trex: 'dino',
    brontosaurus: { shape: { w: 1.8, h: 1.25, leg: 1.3, neck: 2.1, nx: 22, ny: -14, ang: -64, bend: 2.4, stiff: 1.7, hip: [-0.72, 0.72] }, head: 'snout', tail: 'long', foot: 'claw', col: '#6aa84a' },
    longneck: 'brontosaurus',
    dragon: { shape: { w: 1.7, h: 1.1, leg: 0.9, neck: 1.1, nx: 26, ny: -14, ang: -62, bend: 2, stiff: 1.6, hip: [-0.7, 0.7] }, head: 'snout', tail: 'long', extras: ['horns', 'spikes', 'bigwings'], foot: 'claw', col: '#c4163a' },
    giraffe: { shape: { w: 1.2, h: 1.0, leg: 1.9, neck: 2.2, nx: 22, ny: -14, ang: -78, bend: 1.8, stiff: 1.4, hip: [-0.7, 0.7] }, head: 'snout', ears: 'droop', extras: ['horns'], foot: 'hoof', col: '#f2c14a', pattern: 'spots', patCol: '#9a5a2a' },
    snake: { shape: { w: 2.3, h: 0.5, leg: 0.3, neck: 0.55, nx: 30, ny: -4, ang: -40, bend: 2.5, stiff: 2.2, hip: [-0.78, 0.78] }, head: 'round', tail: 'long', foot: 'none', col: '#4ab35f', pattern: 'stripes' },
    worm: 'snake',
    caterpillar: { shape: { w: 2.3, h: 0.7, leg: 0.4, neck: 0.55, nx: 30, ny: -4, ang: -35, bend: 2.5, stiff: 2, hip: [-0.8, 0.8] }, head: 'round', foot: 'none', extras: ['antenna'], col: '#7ad862', pattern: 'stripes', patCol: '#3f9a4f' },
    lizard: { shape: { w: 2.1, h: 0.5, leg: 0.42, neck: 0.75, nx: 30, ny: -2, ang: -12, bend: 0.5, stiff: 2.4, hip: [-0.8, 0.8] }, head: 'snout', tail: 'long', foot: 'claw', col: '#4ab35f' },
    crocodile: 'lizard', gator: 'lizard', alligator: 'lizard',
    frog: { shape: { w: 1.1, h: 0.85, leg: 0.55, neck: 0.5, nx: 24, ny: -12, ang: -80, bend: 2, hip: [-0.6, 0.6] }, head: 'round', foot: 'paw', col: '#4cc35a', extras: ['froggy'] },
    table: { shape: { w: 2.2, h: 0.36, leg: 1.7, neck: 1, nx: 6, ny: -6, hip: [-0.9, 0.9], rect: true }, foot: 'box', col: '#b8803f', leg: '#8a5a2b', head: 'goose' },
    bench: 'table', chair: 'table',
    cube: { shape: { w: 1.1, h: 1.35, leg: 0.8, nx: 14, ny: -26, rect: true }, foot: 'box', head: 'goose' },
    box: 'cube', crate: 'cube', block: 'cube',
    cow: { shape: { w: 1.5, h: 1.1, leg: 0.9, neck: 0.8, nx: 28, ny: -8, ang: -45, bend: 1.5, hip: [-0.7, 0.7] }, head: 'snout', ears: 'droop', extras: ['horns'], foot: 'hoof', col: '#ffffff', pattern: 'spots', patCol: '#2a2f3a', tail: 'point' },
    pig: { shape: { w: 1.4, h: 1.05, leg: 0.5, neck: 0.55, nx: 26, ny: -8, ang: -50, bend: 2, hip: [-0.65, 0.65] }, head: 'pig', ears: 'cat', foot: 'hoof', col: '#ffb3c6', tail: 'fluff' },
    penguin: { shape: { w: 0.9, h: 1.35, leg: 0.5, neck: 0.65, nx: 12, ny: -22, hip: [-0.4, 0.4] }, head: 'duck', beakCol: '#ff9b2f', foot: 'paw', col: '#2a2f3a', belly: '#ffffff', leg: '#ff9b2f' },
    robot: { shape: { w: 1.2, h: 1.2, leg: 1.0, neck: 1.0, nx: 14, ny: -24, rect: true }, head: 'box', foot: 'box', extras: ['antenna'], col: '#aab4c0', belly: '#6d7684', leg: '#6d7684' },
    shark: { shape: { w: 1.8, h: 1.0, leg: 0.5, neck: 0.7, nx: 28, ny: -6, ang: -35, bend: 1.5, hip: [-0.75, 0.75] }, head: 'snout', extras: ['spikes', 'tusks'], foot: 'none', tail: 'long', col: '#7f9db3', belly: '#e8f2fa' },
    elephant: { shape: { w: 1.7, h: 1.5, leg: 0.9, neck: 0.9, nx: 30, ny: -2, ang: -20, bend: 0.8, stiff: 2.2, hip: [-0.7, 0.7] }, head: 'snout', ears: 'big', foot: 'hoof', col: '#a8b0ba', extras: ['tusks'] },
    swan: { shape: { w: 1.5, h: 0.85, leg: 0.7, neck: 1.5, nx: 28, ny: -10, ang: -110, bend: 6.5, stiff: 1.5, hip: [-0.5, 0.5] }, head: 'goose', col: '#ffffff', tail: 'point' },
    ghost: { shape: { w: 1.0, h: 1.3, leg: 0.3, neck: 0.8 }, head: 'round', foot: 'none', col: '#f4fbff', tail: 'none' },
  };
  const LAYOUT = { backwards: { nx: -24, ny: -17, ang: -98, bend: 4.2 }, reverse: { nx: -24, ny: -17, ang: -98, bend: 4.2 } };
  const FOOTS = ['claw', 'paw', 'box', 'hoof', 'none'];
  const defaultSpec = () => ({ v: 1, name: 'My Goose', prompt: '', seed: 1, col: { body: '#ffffff', wing: '#e4edf5', neck: '#ffffff', head: '#ffffff', leg: '#ff9b2f', beak: '#ff9b2f', belly: null, eye: null }, pattern: 'none', patCol: null, jelly: false,
    shape: { w: 1, h: 1, leg: 1, neck: 1, nx: 24, ny: -17, ang: -98, bend: 4.2, hip: [-13 / 28, 13 / 28], rect: false }, headKind: 'goose', headSize: 1, ears: null, tail: 'default', foot: 'claw', extras: [], legW: 1, neckW: 1 });

  // ------------------------------------------------------------------ reading a prompt
  const words = (t) => (t.toLowerCase().replace(/[^a-z' -]/g, ' ').replace(/-/g, ' ').match(/[a-z']+/g) || []);
  function parse(text) {
    const w = words(text), d = { cols: {}, free: [], pattern: null, patCol: null, ops: {}, extrasAdd: [], extrasDel: [], animal: null, layout: null, jelly: null, rect: null, unknown: [] };
    const colourAt = (i) => {
      let c = COLS[w[i]]; if (!c) return null;
      for (let k = 1; k <= 2 && i - k >= 0; k++) { const m = MODS[w[i - k]]; if (m) { c = m(c); break; } }
      return c;
    };
    const used = new Set();
    for (let i = 0; i < w.length; i++) {
      const c = colourAt(i); if (!c) continue;
      used.add(i);
      // "<colour> <part>" / "<colour> and <colour> <part>" / "<part> is <colour>"
      let j = i + 1; while (w[j] === 'and' || w[j] === 'with') j++;
      if (PARTS[w[i + 1]]) { d.cols[PARTS[w[i + 1]]] = c; used.add(i + 1); continue; }
      if (PATTERNS[w[i + 1]]) { d.patCol = c; d.pattern = PATTERNS[w[i + 1]]; used.add(i + 1); continue; }
      let b = i - 1; while (b >= 0 && (MODS[w[b]] || w[b] === 'is' || w[b] === 'are' || w[b] === 'be' || w[b] === 'to')) b--;
      if (b >= 0 && PARTS[w[b]] && (i - b <= 3) && !colourAt(b)) { d.cols[PARTS[w[b]]] = c; used.add(b); continue; }
      d.free.push(c);
    }
    for (let i = 0; i < w.length; i++) {
      const x = w[i];
      let mult = 1; if (INTENS[w[i - 1]]) mult = INTENS[w[i - 1]];
      const op = UP[x] ? UP[x] : DOWN[x] ? DOWN[x] : 0;
      if (op) {
        const f = op > 1 ? Math.pow(op, mult) : Math.pow(op, 1 / (mult === 1 ? 1 : mult * 0.8));
        let nxt = null; for (let k = 1; k <= 2; k++) { const t = PARTS[w[i + k]] || (w[i + k] === 'necked' ? 'neck' : w[i + k] === 'legged' ? 'leg' : null) || (w[i + k] === 'ears' ? 'ears' : null); if (t) { nxt = t; break; } }
        if (w[i + 1] === 'necked') nxt = 'neck'; if (w[i + 1] === 'legged') nxt = 'leg';
        if (nxt === 'neck') d.ops.neck = (d.ops.neck || 1) * f;
        else if (nxt === 'leg') d.ops.leg = (d.ops.leg || 1) * f;
        else if (nxt === 'head') d.ops.head = (d.ops.head || 1) * f;
        else if (nxt === 'tail') d.ops.tail = (d.ops.tail || 1) * f;
        else if (nxt === 'body') { d.ops.w = (d.ops.w || 1) * f; d.ops.h = (d.ops.h || 1) * Math.sqrt(f); }
        else if (x === 'tall' || x === 'taller') { d.ops.h = (d.ops.h || 1) * f; d.ops.leg = (d.ops.leg || 1) * Math.sqrt(f); }
        else if (x === 'wide' || x === 'long' || x === 'longer' || x === 'narrow') d.ops.w = (d.ops.w || 1) * f;
        else if (x === 'flat') d.ops.h = (d.ops.h || 1) * f;
        else if (x === 'thick' || x === 'thin' || x === 'skinny' || x === 'slim') { d.ops.w = (d.ops.w || 1) * Math.sqrt(f); d.ops.h = (d.ops.h || 1) * Math.sqrt(f); }
        else { d.ops.w = (d.ops.w || 1) * f; d.ops.h = (d.ops.h || 1) * f; d.ops.leg = (d.ops.leg || 1) * Math.sqrt(f); d.ops.neck = (d.ops.neck || 1) * Math.sqrt(f); }
        continue;
      }
      if (PATTERNS[x] && !used.has(i) && !d.pattern) d.pattern = PATTERNS[x];
      const neg = ['no', 'remove', 'without', 'delete', 'lose'].includes(w[i - 1]) || (w[i - 1] === 'off' && w[i - 2] === 'take');
      if (EXTRAS[x]) { (neg ? d.extrasDel : d.extrasAdd).push(EXTRAS[x]); continue; }
      if (ANIMALS[x] && !d.animal) { d.animal = x; continue; }
      if (LAYOUT[x]) { d.layout = LAYOUT[x]; continue; }
      if (['jelly', 'slime', 'gummy', 'squishy', 'wobbly', 'jiggly'].includes(x)) { d.jelly = !neg; continue; }
      if (['square', 'blocky', 'rectangular', 'boxy'].includes(x)) d.rect = true;
      if (['round', 'curvy'].includes(x)) d.rect = false;
      if (!used.has(i) && x.length > 2 && !['and', 'with', 'the', 'a', 'an', 'make', 'it', 'its', 'for', 'that', 'has', 'have', 'wearing', 'add', 'goose', 'skin', 'is', 'are', 'but', 'more', 'less', 'some', 'of', 'on', 'in', 'like', 'my', 'me'].includes(x)) d.unknown.push(x);
    }
    return d;
  }

  // ------------------------------------------------------------------ random helpers
  const rng = (a) => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const PALETTE = ['#ff7eb6', '#4cc35a', '#3a86ff', '#ffd23f', '#8a4ad6', '#ff8a1f', '#1fb8a8', '#e63946', '#fff3d6', '#9be04a'];
  const mergeShape = (a, b) => Object.assign({}, a, b, { hip: (b && b.hip) ? b.hip.slice() : a.hip.slice() });
  const autoStiff = (sh) => clamp(1 + Math.abs((sh.ang == null ? -98 : sh.ang) + 98) / 33, 1, 3.8) * (sh.stiff || 1) / (sh.stiff ? 1 : 1);

  // generate from scratch
  function generate(prompt, seed) {
    seed = seed == null ? (hashStr(prompt) % 100000) : seed;
    const R = rng(seed * 7919 + hashStr(prompt)), d = parse(prompt);
    const sp = defaultSpec(); sp.prompt = prompt; sp.seed = seed;
    let key = d.animal; let an = key ? ANIMALS[key] : null; while (typeof an === 'string') an = ANIMALS[an];
    if (an) {
      sp.shape = mergeShape(sp.shape, an.shape || {}); if (an.shape && an.shape.stiff) sp.shape.stiff = an.shape.stiff;
      if (an.head) sp.headKind = an.head; if (an.ears) sp.ears = an.ears; if (an.tail) sp.tail = an.tail; if (an.foot) sp.foot = an.foot;
      if (an.extras) sp.extras = an.extras.slice(); if (an.pattern) { sp.pattern = an.pattern; sp.patCol = an.patCol || null; }
      if (an.col) { sp.col.body = sp.col.neck = sp.col.head = an.col; sp.col.wing = shade(an.col, -0.12); }
      if (an.beakCol) sp.col.beak = an.beakCol; if (an.leg) sp.col.leg = an.leg; if (an.belly) sp.col.belly = an.belly;
      if (!an.leg) sp.col.leg = an.col ? shade(an.col, -0.25) : sp.col.leg;
    } else if (d.free.length === 0 && Object.keys(d.cols).length === 0) {
      // nothing recognised: invent a goose from the words
      const c = PALETTE[(seed + hashStr(prompt)) % PALETTE.length];
      sp.col.body = sp.col.neck = sp.col.head = c; sp.col.wing = shade(c, -0.15); sp.col.leg = R() < 0.5 ? '#ff9b2f' : shade(c, -0.3);
    }
    if (d.free.length) {
      const [a, b, c] = d.free;
      sp.col.body = sp.col.neck = sp.col.head = a; sp.col.wing = b || shade(a, -0.15); sp.col.leg = c || b || shade(a, -0.3); if (c) sp.col.beak = c;
      if (!an || !an.leg) sp.col.leg = c || (b ? b : shade(a, -0.3));
    }
    // re-roll: wobble the proportions a little and swap spare colours
    if (seed > 0 && (seed % 100000) !== (hashStr(prompt) % 100000)) {
      const j = () => 0.88 + R() * 0.24;
      sp.shape.w *= j(); sp.shape.h *= j(); sp.shape.leg *= j(); sp.shape.neck *= j();
      if (!d.free.length && !Object.keys(d.cols).length && !an) { const c = PALETTE[Math.floor(R() * PALETTE.length)]; sp.col.body = sp.col.neck = sp.col.head = c; sp.col.wing = shade(c, -0.15); }
      if (sp.pattern === 'none' && R() < 0.35) sp.pattern = ['stripes', 'spots', 'checks', 'stars', 'hearts'][Math.floor(R() * 5)];
      if (R() < 0.35) sp.extras.push(['crown', 'bow', 'glasses', 'horns', 'mohawk', 'halo', 'blush', 'scarf'][Math.floor(R() * 8)]);
    } else if (!an && !d.free.length && sp.pattern === 'none' && d.unknown.length && R() < 0.5) sp.pattern = ['stripes', 'spots', 'stars'][Math.floor(R() * 3)];
    apply(sp, d, true);
    sp.name = nameFor(prompt, an ? key : null);
    return fix(sp);
  }
  function nameFor(prompt, key) {
    const w = words(prompt).filter((x) => !['a', 'an', 'the', 'with', 'and', 'goose', 'make', 'me'].includes(x));
    const s = (key && w.indexOf(key) < 0 ? key + ' ' : '') + w.slice(0, 3).join(' ');
    return (s.trim() || 'My Goose').replace(/\b\w/g, (m) => m.toUpperCase()).slice(0, 22);
  }

  // change an existing spec with more words
  function modify(spec, text) {
    const sp = JSON.parse(JSON.stringify(spec)), d = parse(text);
    if (d.animal) { // "make it a cat": keep the colours the person chose unless they name new ones
      const g = generate(d.animal, sp.seed); sp.shape = g.shape; sp.headKind = g.headKind; sp.ears = g.ears; sp.tail = g.tail; sp.foot = g.foot; if (g.extras.length) sp.extras = Array.from(new Set(sp.extras.concat(g.extras)));
      if (g.pattern !== 'none' && sp.pattern === 'none') { sp.pattern = g.pattern; sp.patCol = g.patCol; }
    }
    if (d.free.length === 1 && !Object.keys(d.cols).length) { const a = d.free[0]; sp.col.body = sp.col.neck = sp.col.head = a; sp.col.wing = shade(a, -0.15); if (lum(sp.col.leg) > 0.15) { /* keep legs */ } }
    else if (d.free.length > 1) { sp.col.body = sp.col.neck = sp.col.head = d.free[0]; sp.col.wing = d.free[1]; if (d.free[2]) sp.col.leg = d.free[2]; }
    sp.prompt = (sp.prompt + ' · ' + text).slice(0, 200);
    apply(sp, d, false);
    return fix(sp);
  }

  function apply(sp, d, fresh) {
    for (const k of Object.keys(d.cols)) {
      const c = d.cols[k];
      if (k === 'body') { sp.col.body = c; if (!d.cols.neck) sp.col.neck = c; if (!d.cols.head) sp.col.head = c; if (!d.cols.wing) sp.col.wing = shade(c, -0.15); }
      else sp.col[k] = c;
    }
    if (d.pattern) sp.pattern = d.pattern;
    if (d.patCol) sp.patCol = d.patCol;
    const o = d.ops, sh = sp.shape;
    if (o.w) sh.w *= o.w; if (o.h) sh.h *= o.h; if (o.leg) sh.leg *= o.leg; if (o.neck) sh.neck *= o.neck; if (o.head) sp.headSize *= o.head; if (o.tail) sp.tailLen = (sp.tailLen || 1) * o.tail;
    if (d.layout) Object.assign(sh, d.layout);
    if (d.rect != null) sh.rect = d.rect;
    if (d.jelly != null) sp.jelly = d.jelly;
    for (const e of d.extrasAdd) if (!sp.extras.includes(e)) sp.extras.push(e);
    if (d.extrasDel.length) sp.extras = sp.extras.filter((e) => !d.extrasDel.includes(e) && !(e === 'shades' && d.extrasDel.includes('glasses')));
    if (d.extrasAdd.includes('cat') && !sp.ears) sp.ears = 'cat';
    if (d.extrasDel.includes('cat')) sp.ears = null;
  }

  // keep every number somewhere the physics can handle
  const LIM = { w: [0.5, 2.7], h: [0.4, 2.2], leg: [0.3, 2.1], neck: [0.4, 2.5], nx: [-34, 40], ny: [-40, 8], ang: [-140, 20], bend: [-2, 8] };
  function fix(sp) {
    const sh = sp.shape;
    for (const k of Object.keys(LIM)) sh[k] = clamp(+sh[k] || 0, LIM[k][0], LIM[k][1]);
    sh.hip = [clamp(sh.hip[0], -1, -0.15), clamp(sh.hip[1], 0.15, 1)];
    if (sh.hip[1] - sh.hip[0] < 0.9) { const m = (sh.hip[0] + sh.hip[1]) / 2; sh.hip = [clamp(m - 0.45, -1, -0.15), clamp(m + 0.45, 0.15, 1)]; }
    sh.stiff = autoStiff(Object.assign({}, sh, { stiff: 0 }));
    sp.headSize = clamp(sp.headSize || 1, 0.6, 2); sp.tailLen = clamp(sp.tailLen || 1, 0.3, 2.5);
    sp.legW = clamp(sp.legW || 1, 0.5, 2.5);
    return sp;
  }

  // ------------------------------------------------------------------ spec -> skin
  const rr = (c, x, y, w, h, r, fill, lw) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); ol(c, fill, lw); };
  const starPath = (c, x, y, r) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); };
  const heartPath = (c, x, y, r) => { c.beginPath(); c.moveTo(x, y + r * 0.8); c.bezierCurveTo(x - r * 1.6, y - r * 0.3, x - r * 0.5, y - r * 1.2, x, y - r * 0.4); c.bezierCurveTo(x + r * 0.5, y - r * 1.2, x + r * 1.6, y - r * 0.3, x, y + r * 0.8); c.closePath(); };

  function makeSkin(sp) {
    sp = fix(JSON.parse(JSON.stringify(sp)));
    const C = sp.col, sh = sp.shape, hs = sp.headSize, pc = sp.patCol || shade(C.body, lum(C.body) > 0.5 ? -0.35 : 0.4);
    const has = (e) => sp.extras.includes(e);
    const sk = {
      id: sp.id || 'custom_draft', name: sp.name, price: PRICE, custom: true, spec: sp,
      body: C.body, wing: C.wing, neckC: C.neck, headC: C.head, legC: C.leg, legW: sp.legW, neckW: sp.neckW || 1,
      neck: 1, shape: Object.assign({}, sh, { hip: sh.hip.slice() }),
      eye: { x: 3 * hs + (sp.headKind === 'snout' ? 4 : 0), y: -3 * hs, r: 2.8 * hs * (has('froggy') ? 1.5 : 1) },
    };
    if (sp.jelly) { sk.jelly = { c: 0.02, k: 1500 }; sk.jellyC = [C.body, shade(C.body, 0.5)]; sk.shape.leg = Math.min(sk.shape.leg, 0.7); }
    // pattern + belly on the body (clipped to the body shape by the game)
    sk.bodyDeco = function (c) {
      if (C.belly) { c.fillStyle = C.belly; c.beginPath(); c.ellipse(4, 8, 30, 15, 0, 0, 7); c.fill(); }
      if (sp.pattern === 'stripes') { c.fillStyle = pc; for (let x = -34; x < 40; x += 13) { c.beginPath(); c.moveTo(x, -30); c.lineTo(x + 6, -30); c.lineTo(x + 2, 30); c.lineTo(x - 4, 30); c.fill(); } }
      else if (sp.pattern === 'spots') { c.fillStyle = pc; for (const [x, y, r] of [[-26, -8, 7], [-8, 8, 6], [10, -10, 8], [26, 6, 6], [-14, -18, 4], [18, 16, 4], [0, -2, 3]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }
      else if (sp.pattern === 'checks') { c.fillStyle = pc; for (let x = -40, i = 0; x < 40; x += 14, i++) for (let y = -28, j = 0; y < 28; y += 14, j++) if ((i + j) & 1) c.fillRect(x, y, 14, 14); }
      else if (sp.pattern === 'stars') { c.fillStyle = pc; for (const [x, y, r] of [[-24, -8, 6], [-4, 8, 5], [14, -8, 7], [28, 8, 5], [-12, -18, 3]]) { starPath(c, x, y, r); c.fill(); } }
      else if (sp.pattern === 'hearts') { c.fillStyle = pc; for (const [x, y, r] of [[-24, -6, 6], [-4, 9, 5], [14, -8, 6], [28, 8, 4]]) { heartPath(c, x, y, r); c.fill(); } }
      else if (sp.pattern === 'rainbow') { const cs = ['#ff4d4d', '#ff9b2f', '#ffd23f', '#4cc35a', '#3a86ff', '#8a4ad6']; cs.forEach((col, i) => { c.fillStyle = col; c.fillRect(-40, -24 + i * 8, 80, 8); }); }
      else if (sp.pattern === 'swirl') { c.strokeStyle = pc; c.lineWidth = 3; c.beginPath(); for (let a = 0; a < 18; a += 0.2) c.lineTo(Math.cos(a) * a * 2.2, Math.sin(a) * a * 1.4); c.stroke(); }
      if (has('shell')) { c.fillStyle = shade(C.body, -0.25); c.beginPath(); c.arc(-2, -4, 28, Math.PI, 0); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; for (const x of [-18, -2, 14]) { c.beginPath(); c.moveTo(x, -26); c.lineTo(x, -2); c.stroke(); } }
      if (has('scarf')) { c.fillStyle = '#e63946'; c.fillRect(20, -26, 10, 52); }
    };
    // tail
    const tl = sp.tailLen || 1;
    if (sp.tail !== 'none') sk.tail = function (c) {
      const col = C.wing;
      if (has('spikes')) { c.fillStyle = shade(C.body, -0.3); for (let x = -26; x < 24; x += 12) { poly(c, [[x, -22], [x + 5, -34], [x + 10, -22]], shade(C.body, -0.3), 2.5); } }
      if (has('bigwings')) { poly(c, [[-6, -18], [-30, -58], [-2, -46], [14, -60], [18, -18]], shade(C.wing, 0.05), 3); }
      if (sp.tail === 'long') poly(c, [[-34, -6], [-34 - 38 * tl, 6], [-34, 8]], col, 3);
      else if (sp.tail === 'fluff') circ(c, -38, -4, 9 * tl, '#fff', 3);
      else if (sp.tail === 'point') poly(c, [[-34, -6], [-34 - 18 * tl, -18], [-34 - 12 * tl, 4]], col, 3);
      else poly(c, [[-34, -8], [-34 - 24 * tl, -14], [-34 - 16 * tl, 4]], '#fff', 3);
    };
    // feet
    const F = sp.foot;
    if (F === 'paw') sk.foot = (c) => paw(c, C.leg);
    else if (F === 'box') sk.foot = (c) => rr(c, -6, -2, 20, 9, 3, C.leg, 2.8);
    else if (F === 'hoof') sk.foot = (c) => H.hoof(c, C.leg);
    else if (F === 'none') sk.foot = (c) => ell(c, 2, 1, 6, 4, C.leg, 2.4);
    else sk.foot = (c) => claw(c, C.leg);
    // head
    const hk = sp.headKind, bc = C.beak;
    sk.head = function (c, open) {
      c.save(); c.scale(hs, hs);
      if (hk === 'goose') beak(c, open, bc, 24, 5);
      else if (hk === 'duck') { c.beginPath(); c.moveTo(4, -5); c.quadraticCurveTo(26, -7 - open * 0.2, 28, -1); c.quadraticCurveTo(26, 5 + open, 4, 5 + open * 0.5); c.closePath(); ol(c, bc, 3); }
      else if (hk === 'snout') { rr(c, -2, -6, 28, 12 + open * 0.5, 5, C.beak === '#ff9b2f' ? C.head : C.beak, 3); circ(c, 22, -2, 2, INK, 1); }
      else if (hk === 'pig') { rr(c, 2, -5, 16, 12, 5, shade(C.head, 0.25), 3); circ(c, 11, 1, 1.6, INK, 1); circ(c, 15, 1, 1.6, INK, 1); }
      else if (hk === 'cat') { poly(c, [[7, -1], [12, -1], [9.5, 3]], '#ff7eb6', 1.8); c.strokeStyle = INK; c.lineWidth = 1.4; for (const y of [-1, 3]) { c.beginPath(); c.moveTo(10, y); c.lineTo(22, y - 3 + (y > 0 ? 6 : 0)); c.stroke(); } }
      else if (hk === 'round') { ell(c, 8, 1, 5, 4, shade(C.head, 0.1), 2.5); if (sp.extras.includes('froggy')) { c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(4, 5); c.quadraticCurveTo(14, 9 + open * 0.4, 22, 4); c.stroke(); } }
      else if (hk === 'box') { rr(c, -9, -9, 22, 18, 3, C.head, 3); }
      disc(c, C.head);
      c.restore();
    };
    sk.headBack = function (c) {
      c.save(); c.scale(hs, hs);
      if (sp.ears === 'bunny') { for (const dx of [-4, 3]) { c.save(); c.translate(dx, -8); c.rotate(-0.25); ell(c, 0, -13, 4.5, 15, C.head, 2.6); ell(c, 0, -13, 2, 10, '#ffb3c6', 0); c.restore(); } }
      if (sp.ears === 'cat') { for (const dx of [-6, 3]) poly(c, [[dx, -6], [dx + 2, -17], [dx + 8, -7]], C.head, 2.6); }
      if (sp.ears === 'droop') { ell(c, -4, 6, 4.4, 10, shade(C.head, -0.22), 2.6, 0.25); }
      if (sp.ears === 'big') { ell(c, -6, 4, 9, 13, shade(C.head, -0.1), 2.8, 0.1); }
      if (has('horns')) { for (const dx of [-5, 3]) poly(c, [[dx, -8], [dx - 1, -19], [dx + 5, -8]], '#f2e6cf', 2.4); }
      if (has('antlers')) { c.strokeStyle = '#8a5a32'; c.lineWidth = 3; for (const dx of [-4, 4]) { c.beginPath(); c.moveTo(dx, -8); c.lineTo(dx - 3, -22); c.moveTo(dx - 2, -16); c.lineTo(dx + 4, -22); c.stroke(); } }
      c.restore();
    };
    sk.headDeco = function (c) {
      c.save(); c.scale(hs, hs);
      if (has('mohawk')) { c.fillStyle = '#e63946'; for (let i = -6; i < 6; i += 3) poly(c, [[i, -9], [i + 1.5, -19 - (i % 2) * 2], [i + 3, -9]], '#e63946', 2); }
      if (has('crown')) poly(c, [[-8, -9], [-8, -19], [-4, -14], [0, -21], [4, -14], [8, -19], [8, -9]], '#ffd23f', 2.6);
      if (has('halo')) { c.strokeStyle = '#ffe66a'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -18, 9, 3, 0, 0, 7); c.stroke(); }
      if (has('antenna')) { c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -9); c.lineTo(2, -20); c.stroke(); circ(c, 2, -21, 3, '#e63946', 2); }
      if (has('bow')) { poly(c, [[-4, -9], [-12, -14], [-12, -4]], '#ff4d8d', 2.2); poly(c, [[-4, -9], [4, -14], [4, -4]], '#ff4d8d', 2.2); circ(c, -4, -9, 2.6, '#ff2a74', 1.8); }
      if (has('glasses')) { c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc(3, -3, 5, 0, 7); c.moveTo(-2, -3); c.lineTo(-9, -4); c.stroke(); }
      if (has('shades')) { c.fillStyle = INK; c.beginPath(); c.roundRect ? c.roundRect(-3, -7, 14, 7, 2) : c.rect(-3, -7, 14, 7); c.fill(); }
      if (has('moustache')) { c.fillStyle = '#4a3326'; c.beginPath(); c.ellipse(9, 4, 6, 2.6, 0, 0, 7); c.fill(); }
      if (has('blush')) { c.fillStyle = 'rgba(255,100,130,.55)'; c.beginPath(); c.ellipse(-1, 3, 3.6, 2.2, 0, 0, 7); c.fill(); }
      if (has('freckles')) { c.fillStyle = 'rgba(120,70,40,.6)'; for (const [x, y] of [[-3, 3], [0, 5], [3, 3]]) { c.beginPath(); c.arc(x, y, 0.9, 0, 7); c.fill(); } }
      if (has('tusks')) { for (const dy of [3]) poly(c, [[12, dy], [15, dy + 7], [9, dy + 2]], '#fff', 1.8); }
      c.restore();
    };
    if (has('scarf')) sk.neckDeco = (c, n, nN) => { c.strokeStyle = '#e63946'; c.lineWidth = 9; c.lineCap = 'round'; const a = n[Math.min(2, nN - 1)], b = n[Math.min(4, nN - 1)]; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
    return sk;
  }

  // keep the skin registry in step with the specs
  function register(sp, id) {
    sp.id = id || sp.id; const sk = makeSkin(sp); sk.id = sp.id;
    if (!S.BY_ID[sk.id]) { S.LIST.push(sk); } else { const i = S.LIST.findIndex((x) => x.id === sk.id); if (i >= 0) S.LIST[i] = sk; }
    S.BY_ID[sk.id] = sk; return sk;
  }
  function registerAll(list) { for (const sp of list || []) { try { register(sp, sp.id); } catch (e) { /* skip a broken spec */ } } }
  function setDraft(sp) { const sk = makeSkin(sp); sk.id = 'custom_draft'; S.BY_ID.custom_draft = sk; return sk; }

  const api = { PRICE, generate, modify, parse, makeSkin, register, registerAll, setDraft, defaultSpec, fix, LIM, ANIMALS, draft: null };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BuildAGoose = api;
})(typeof window !== 'undefined' ? window : globalThis);
