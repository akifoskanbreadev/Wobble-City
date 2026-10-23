/*
 * Maps for 3D Hide & Seek. Every map is a 5x5 town of plots (houses, big buildings, gardens, yards, woods, plazas) on a
 * 120x120 baseplate, built from boxes. Every map has 100+ hiding spots of ~25 kinds, indoors and out.
 *   H3Maps.LIST            -> [{ id, name, emoji, blurb }]
 *   H3Maps.build(i, seed)  -> { name, size, mesh, roofs, solids, spots, spawns, rects, sky }
 */
(function (root) {
  'use strict';
  const E = root.H3E, S = 120, H = S / 2, CELL = 24;
  const mulberry = (a) => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // ------------------------------------------------------------------ themes
  const THEMES = [
    { id: 'suburb', name: 'Sunny Suburb', emoji: '🏡', blurb: 'Houses, hedges, cars and mailboxes.', sky: '#9fd4ff', g: ['#7bc558', '#73bd50'], road: '#8a8f99', walls: ['#f4e3c1', '#ffd9d0', '#d6ecff', '#e9f5c9'], roof: ['#c0503a', '#4f6fb5', '#6a4a3a'], floor: '#d9b98a', leaf: '#3fa34d', trunk: '#7a5230', fence: '#ffffff',
      out: ['bush', 'car', 'crate', 'pot', 'barrel', 'carton'], inn: ['bed', 'wardrobe', 'sofa', 'shelf'], deco: ['tree', 'lamp', 'flowers'], mix: { house: 5, big: 1, garden: 4, yard: 3, wood: 1, plaza: 2 } },
    { id: 'camp', name: 'Pine Camp', emoji: '🏕️', blurb: 'Tents, logs, hollow trees and a boathouse.', sky: '#a8dcff', g: ['#5fae4a', '#58a444'], road: '#a68a64', walls: ['#a8774a', '#8e633c', '#c19a6b'], roof: ['#3d6b3a', '#5b3d26'], floor: '#b88a5a', leaf: '#2c7a3c', trunk: '#6b4423', fence: '#8a6a45',
      out: ['tent', 'log', 'tree', 'boat', 'bush', 'barrel'], inn: ['bed', 'shelf', 'crate', 'sofa'], deco: ['pine', 'pine', 'lamp'], mix: { house: 2, big: 1, garden: 2, yard: 3, wood: 6, plaza: 1 } },
    { id: 'school', name: 'Goose School', emoji: '🏫', blurb: 'Lockers, classrooms and a sports yard.', sky: '#b7e0ff', g: ['#79c26a', '#71b862'], road: '#9a9aa5', walls: ['#ffe08a', '#ffc27a', '#a9d8ff'], roof: ['#d24a43', '#3f6fb5'], floor: '#e8d9b3', leaf: '#3aa24c', trunk: '#7a5230', fence: '#3f6fb5',
      out: ['bush', 'crate', 'barrel', 'pot', 'carton', 'car'], inn: ['locker', 'locker', 'shelf', 'carton', 'sofa'], deco: ['tree', 'lamp', 'flowers'], mix: { house: 3, big: 5, garden: 2, yard: 3, wood: 1, plaza: 2 } },
    { id: 'mall', name: 'Mega Mall', emoji: '🛍️', blurb: 'A huge shopping centre of shops and stockrooms.', sky: '#cfe8ff', g: ['#c8ccd6', '#c0c4cf'], road: '#9aa0ad', walls: ['#ff9eb5', '#9ed8ff', '#ffe27a', '#b8f0b0'], roof: ['#6a6f7d', '#8a8fa0'], floor: '#f2f2f2', leaf: '#4cb35a', trunk: '#7a5230', fence: '#ffffff',
      out: ['crate', 'carton', 'pot', 'barrel', 'car', 'dumpster'], inn: ['shelf', 'shelf', 'carton', 'locker', 'sofa'], deco: ['lamp', 'flowers', 'tree'], mix: { house: 2, big: 6, garden: 1, yard: 3, wood: 0, plaza: 3 } },
    { id: 'farm', name: 'Old Farm', emoji: '🚜', blurb: 'Haystacks, barns, tractors and pens.', sky: '#a6d8ff', g: ['#8cc759', '#84be52'], road: '#b69a6a', walls: ['#b5412f', '#c9553f', '#e8d7a8'], roof: ['#6a4a3a', '#7d7d86'], floor: '#d6b878', leaf: '#4aa04a', trunk: '#7a5230', fence: '#8a6a45',
      out: ['haystack', 'haystack', 'barrel', 'crate', 'tree', 'car'], inn: ['haystack', 'crate', 'shelf', 'barrel'], deco: ['tree', 'fence', 'flowers'], mix: { house: 3, big: 2, garden: 2, yard: 5, wood: 2, plaza: 1 } },
    { id: 'haunt', name: 'Haunted Mansion', emoji: '👻', blurb: 'Creaky wardrobes, coffins and a spooky garden.', sky: '#2a2342', g: ['#4a5a45', '#425240'], road: '#58505f', walls: ['#7d7596', '#6b6385', '#8a7f9e'], roof: ['#2f2a40', '#3a3150'], floor: '#4b3b4e', leaf: '#3c5c3c', trunk: '#3a2a22', fence: '#2f2a40', night: true,
      out: ['tree', 'bush', 'coffin', 'pot', 'crate', 'barrel'], inn: ['coffin', 'wardrobe', 'bed', 'sofa', 'shelf'], deco: ['deadtree', 'lamp', 'deadtree'], mix: { house: 3, big: 5, garden: 4, yard: 1, wood: 2, plaza: 1 } },
    { id: 'beach', name: 'Beach Resort', emoji: '🏖️', blurb: 'Sandcastles, umbrellas, boats and cabanas.', sky: '#8fdcff', g: ['#f3dd9a', '#eed68e'], road: '#d9c27a', walls: ['#ffffff', '#7fd6e8', '#ffb79a'], roof: ['#ff6f61', '#2fb5c9'], floor: '#f6e7b4', leaf: '#3fb36a', trunk: '#9a6b3a', fence: '#ffffff',
      out: ['sandcastle', 'umbrella', 'boat', 'barrel', 'crate', 'pot'], inn: ['bed', 'shelf', 'sofa', 'carton'], deco: ['palm', 'palm', 'lamp'], mix: { house: 3, big: 1, garden: 3, yard: 4, wood: 2, plaza: 3 } },
    { id: 'snow', name: 'Snow Village', emoji: '⛄', blurb: 'Igloos, snowmen, cabins and snow drifts.', sky: '#cfe7ff', g: ['#f2f8ff', '#e6f0fb'], road: '#c1d3e6', walls: ['#a8774a', '#c19a6b', '#7a5a3a'], roof: ['#ffffff', '#dfeaf7'], floor: '#c9a678', leaf: '#2e7d52', trunk: '#6b4423', fence: '#8a6a45',
      out: ['snowman', 'igloo', 'log', 'tree', 'crate', 'barrel'], inn: ['bed', 'wardrobe', 'sofa', 'shelf'], deco: ['pine', 'lamp', 'pine'], mix: { house: 5, big: 1, garden: 3, yard: 3, wood: 3, plaza: 2 } },
    { id: 'candy', name: 'Candy Land', emoji: '🍭', blurb: 'Gift boxes, gumdrops and cupcake houses.', sky: '#ffd6f0', g: ['#ffb3d9', '#ffa6d1'], road: '#ffe6a8', walls: ['#fff0f5', '#c8f5ff', '#fff3b0', '#d9c8ff'], roof: ['#ff5c8a', '#6ec6ff', '#ffb347'], floor: '#ffe6f0', leaf: '#7ee08a', trunk: '#ff8fb0', fence: '#ffffff',
      out: ['present', 'gumdrop', 'gumdrop', 'carton', 'pot', 'crate'], inn: ['present', 'shelf', 'bed', 'sofa'], deco: ['candy', 'candy', 'lamp'], mix: { house: 4, big: 2, garden: 4, yard: 2, wood: 2, plaza: 3 } },
    { id: 'space', name: 'Space Station', emoji: '🚀', blurb: 'Pods, lockers, crates and glowing corridors.', sky: '#0b1030', g: ['#5b6377', '#535b6e'], road: '#3a4054', walls: ['#aab4c8', '#8f9ab3', '#c3ccdd'], roof: ['#3a4054', '#4d556b'], floor: '#2d3246', leaf: '#47d6a0', trunk: '#8f9ab3', fence: '#3ad6ff', night: true,
      out: ['pod', 'crate', 'carton', 'barrel', 'dumpster', 'locker'], inn: ['locker', 'pod', 'shelf', 'carton'], deco: ['crystal', 'lamp', 'crystal'], mix: { house: 3, big: 4, garden: 1, yard: 4, wood: 0, plaza: 3 } },
    { id: 'toy', name: 'Toy Factory', emoji: '🧸', blurb: 'Giant building blocks, toy boxes and conveyors.', sky: '#bfe6ff', g: ['#ffe27a', '#ffd966'], road: '#6ea8ff', walls: ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c'], roof: ['#ffffff', '#ff922b'], floor: '#f1f3f5', leaf: '#51cf66', trunk: '#ff922b', fence: '#ff6b6b',
      out: ['present', 'crate', 'carton', 'gumdrop', 'barrel', 'pod'], inn: ['present', 'shelf', 'carton', 'crate', 'locker'], deco: ['block', 'block', 'lamp'], mix: { house: 3, big: 4, garden: 2, yard: 4, wood: 0, plaza: 3 } },
    { id: 'castle', name: 'Castle Keep', emoji: '🏰', blurb: 'Towers, barrels, thrones and stable yards.', sky: '#a9d3ff', g: ['#6fae5a', '#67a553'], road: '#9b9b9b', walls: ['#c9c9cf', '#b6b6be', '#d6d0c4'], roof: ['#7b4a8a', '#a33b3b'], floor: '#8a8a92', leaf: '#3f8f4a', trunk: '#6b4423', fence: '#a0a0a8',
      out: ['barrel', 'haystack', 'crate', 'bush', 'tree', 'carton'], inn: ['wardrobe', 'bed', 'barrel', 'shelf', 'sofa'], deco: ['tree', 'pillar', 'lamp'], mix: { house: 3, big: 4, garden: 3, yard: 3, wood: 1, plaza: 2 } },
    { id: 'desert', name: 'Desert Ruins', emoji: '🏜️', blurb: 'Pillars, pots, cacti and sand-buried crates.', sky: '#ffe2a8', g: ['#eed18d', '#e8c97e'], road: '#c9a65c', walls: ['#e2c58a', '#d4b074', '#f0d9a4'], roof: ['#c98b4a', '#b27a3e'], floor: '#d9bd84', leaf: '#5aa04a', trunk: '#9a6b3a', fence: '#c9a65c',
      out: ['pot', 'crate', 'barrel', 'carton', 'haystack', 'sandcastle'], inn: ['pot', 'shelf', 'coffin', 'carton'], deco: ['cactus', 'pillar', 'cactus'], mix: { house: 3, big: 2, garden: 3, yard: 4, wood: 1, plaza: 3 } },
    { id: 'pirate', name: 'Pirate Cove', emoji: '🏴‍☠️', blurb: 'Rowboats, treasure barrels and tavern cellars.', sky: '#9ad8f0', g: ['#d9c58a', '#d1bd80'], road: '#8a6a45', walls: ['#8a5f3a', '#a06f44', '#73502f'], roof: ['#4a3322', '#2f4f6a'], floor: '#a8814f', leaf: '#3fa35a', trunk: '#7a5230', fence: '#6b4a2d',
      out: ['boat', 'barrel', 'crate', 'barrel', 'sandcastle', 'umbrella'], inn: ['barrel', 'crate', 'bed', 'shelf', 'coffin'], deco: ['palm', 'lamp', 'palm'], mix: { house: 4, big: 2, garden: 2, yard: 5, wood: 1, plaza: 2 } },
    { id: 'neon', name: 'Neon City', emoji: '🌃', blurb: 'Glowing streets, dumpsters, cars and arcades.', sky: '#140a2e', g: ['#2a2a44', '#262640'], road: '#1a1a2c', walls: ['#3d3d66', '#4a3d66', '#2f4a66'], roof: ['#ff3d9a', '#3dd6ff', '#b6ff3d'], floor: '#20203a', leaf: '#3dffa0', trunk: '#5a5a88', fence: '#ff3d9a', night: true,
      out: ['dumpster', 'car', 'crate', 'carton', 'barrel', 'pot'], inn: ['locker', 'shelf', 'sofa', 'carton', 'crate'], deco: ['lamp', 'crystal', 'lamp'], mix: { house: 3, big: 4, garden: 1, yard: 5, wood: 0, plaza: 3 } },
  ];

  const NAMES = { bush: 'Bush', crate: 'Crate', barrel: 'Barrel', locker: 'Locker', wardrobe: 'Wardrobe', haystack: 'Haystack', dumpster: 'Dumpster', tent: 'Tent', sofa: 'Sofa', bed: 'Bed', car: 'Car', boat: 'Boat', snowman: 'Snowman', log: 'Hollow log', pipe: 'Pipe', stall: 'Stall', carton: 'Big box', pot: 'Giant pot', sandcastle: 'Sandcastle', shelf: 'Shelf', igloo: 'Igloo', gumdrop: 'Gumdrop', present: 'Gift box', pod: 'Pod', tree: 'Hollow tree', umbrella: 'Cabana', coffin: 'Coffin' };

  // ------------------------------------------------------------------ builder
  function build(idx, seed) {
    const th = THEMES[((idx % THEMES.length) + THEMES.length) % THEMES.length];
    const R = mulberry((seed | 0) + idx * 7919 + 1), rnd = (a, b) => a + R() * (b - a), pick = (a) => a[(R() * a.length) | 0];
    const m = E.mesh(), roofs = [], solids = [], spots = [], rects = [], buildings = [];
    const sol = (x0, z0, x1, z1, top) => solids.push([x0, z0, x1, z1, top]);
    const psol = (x0, z0, x1, z1, top) => solids.push([x0, z0, x1, z1, top, 1]);          // props: never block the camera
    const box = (x, y0, z, w, h, d, c, ry) => m.box(x, y0, z, w, h, d, c, ry);
    const wall = (x0, z0, x1, z1, h, c) => { box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, h, z1 - z0, c); sol(x0, z0, x1, z1, h); };
    const vary = (c, k) => E.shade(c, 1 + (R() - 0.5) * k);
    const free = (x, z, r) => Math.abs(x) < H - 2.5 && Math.abs(z) < H - 2.5 && !solids.some((s) => x > s[0] - r && x < s[2] + r && z > s[1] - r && z < s[3] + r);

    // ground: baseplate tiles + roads
    for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) box(-H + 3 + i * 6, -0.3, -H + 3 + j * 6, 6, 0.3, 6, E.shade(th.g[(i + j) & 1], 1 + (((i * 7 + j * 13) % 5) - 2) * 0.012));
    for (let k = 0; k <= 5; k++) { const p = -H + k * CELL; if (k > 0 && k < 5) { box(p, 0, 0, 4, 0.04, S, th.road); box(0, 0, p, S, 0.04, 4, th.road); } }
    // border fence
    const fence = (x0, z0, x1, z1) => { box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, 2.4, z1 - z0, th.fence); sol(x0, z0, x1, z1, 2.4); };
    fence(-H - 1, -H - 1, H + 1, -H + 0.4); fence(-H - 1, H - 0.4, H + 1, H + 1); fence(-H - 1, -H, -H + 0.4, H); fence(H - 0.4, -H, H + 1, H);

    // ---------------------------------------------------------------- spot visuals: each builds boxes around (x,z), turned by ry
    const VIS = {};
    const mk = (type, fn) => { VIS[type] = fn; };
    const P = (x, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (dx, y0, dz, w, h, d, col) => box(x + dx * c + dz * s, y0, z - dx * s + dz * c, w, h, d, col, ry); };
    mk('bush', (p) => { for (let i = 0; i < 7; i++) p(rnd(-0.9, 0.9), 0, rnd(-0.9, 0.9), rnd(1.4, 2), rnd(1.4, 2.3), rnd(1.4, 2), vary(th.leaf, 0.3)); p(0, 0, 0, 1.4, 1, 1.4, E.shade(th.leaf, 0.7)); });
    mk('crate', (p) => { p(0, 0, 0, 2.3, 2.2, 2.3, '#c8923f'); for (const s of [-1, 1]) { p(s * 1.1, 0, 0, 0.18, 2.24, 2.34, '#8a5f28'); p(0, 0, s * 1.1, 2.34, 2.24, 0.18, '#8a5f28'); } p(0, 2.2, 0, 2.4, 0.12, 2.4, '#a8742e'); });
    mk('barrel', (p) => { p(0, 0, 0, 1.9, 2.2, 1.9, '#8a5a2b'); p(0, 0.35, 0, 2.02, 0.2, 2.02, '#3a3a40'); p(0, 1.6, 0, 2.02, 0.2, 2.02, '#3a3a40'); p(0, 2.2, 0, 1.5, 0.1, 1.5, '#6b4423'); });
    mk('locker', (p) => { p(0, 0, 0, 1.7, 3.3, 1.5, th.id === 'space' ? '#9aa6bd' : '#4d8fd6'); p(0, 0.2, 0.78, 1.4, 2.9, 0.06, '#3a6fb0'); p(0.5, 1.5, 0.82, 0.1, 0.3, 0.06, '#e6e6e6'); for (let i = 0; i < 3; i++) p(0, 2.5 + i * 0.18, 0.82, 1.1, 0.07, 0.04, '#1d3f6b'); });
    mk('wardrobe', (p) => { p(0, 0, 0, 2.7, 3.7, 1.5, '#8a5a38'); p(-0.66, 0.2, 0.78, 1.2, 3.3, 0.06, '#6f4528'); p(0.66, 0.2, 0.78, 1.2, 3.3, 0.06, '#6f4528'); p(-0.15, 1.7, 0.84, 0.12, 0.4, 0.06, '#f1d27a'); p(0.15, 1.7, 0.84, 0.12, 0.4, 0.06, '#f1d27a'); p(0, 3.7, 0, 2.9, 0.2, 1.7, '#6f4528'); });
    mk('haystack', (p) => { p(0, 0, 0, 2.8, 1.3, 2.4, '#e3c25a'); p(0, 1.3, 0, 2.3, 1, 2, '#ecce6a'); p(0, 2.3, 0, 1.5, 0.8, 1.4, '#f2d777'); });
    mk('dumpster', (p) => { p(0, 0.35, 0, 3, 1.7, 1.9, '#3f8f5a'); p(0, 2.05, 0, 3.1, 0.2, 2, '#2d6f44'); for (const s of [-1, 1]) p(s * 1.2, 0, 0.7, 0.4, 0.4, 0.4, '#222'); });
    mk('tent', (p) => { p(0, 0, 0, 3.2, 0.9, 2.8, '#e8743b'); p(0, 0.9, 0, 2.5, 0.9, 2.5, '#f08a4b'); p(0, 1.8, 0, 1.6, 0.8, 2.2, '#f4a261'); p(0, 0, 1.4, 1.1, 1.5, 0.08, '#2a1d12'); });
    mk('sofa', (p) => { p(0, 0, 0, 3.2, 0.9, 1.6, '#b0455f'); p(0, 0.9, -0.6, 3.2, 1.1, 0.5, '#9a3a52'); p(-1.5, 0.9, 0.1, 0.4, 0.7, 1.4, '#9a3a52'); p(1.5, 0.9, 0.1, 0.4, 0.7, 1.4, '#9a3a52'); p(-0.7, 0.9, 0.2, 1.2, 0.3, 1, '#c85a76'); p(0.7, 0.9, 0.2, 1.2, 0.3, 1, '#c85a76'); });
    mk('bed', (p) => { p(0, 0, 0, 2.8, 0.8, 2, '#8a5a38'); p(0, 0.8, 0.05, 2.6, 0.5, 1.8, '#f2f2f2'); p(-0.9, 1.3, 0, 0.9, 0.25, 1.2, '#ffffff'); p(0.4, 1.3, 0, 1.6, 0.2, 1.8, '#6ec6ff'); p(-1.45, 0, 0, 0.2, 1.8, 2.1, '#6f4528'); });
    mk('car', (p) => { const col = pick(['#e63946', '#3a86ff', '#ffd23f', '#2fbf71', '#ff8c42']); p(0, 0.35, 0, 3.6, 1, 1.9, col); p(-0.2, 1.35, 0, 1.9, 0.9, 1.7, '#bfe6ff'); p(-0.2, 2.2, 0, 2, 0.12, 1.8, col); for (const sx of [-1.1, 1.1]) for (const sz of [-0.95, 0.95]) p(sx, 0, sz, 0.8, 0.8, 0.3, '#1d1d1d'); });
    mk('boat', (p) => { p(0, 0.1, 0, 3.6, 0.9, 1.8, '#a0692e'); p(1.9, 0.5, 0, 0.8, 0.6, 1.2, '#a0692e'); p(-0.2, 1, -0.5, 1.2, 0.18, 0.4, '#7a4d1f'); p(-0.2, 1, 0.5, 1.2, 0.18, 0.4, '#7a4d1f'); p(0, 1, 0, 0.12, 2, 0.12, '#6b4423'); p(0.5, 1.6, 0, 0.05, 1.2, 1, '#ffffff'); });
    mk('snowman', (p) => { p(0, 0, 0, 2.2, 1.5, 2.2, '#ffffff'); p(0, 1.5, 0, 1.7, 1.2, 1.7, '#f4f9ff'); p(0, 2.7, 0, 1.2, 1, 1.2, '#ffffff'); p(0, 3.1, 0.65, 0.2, 0.2, 0.5, '#ff8c1a'); p(-0.25, 3.35, 0.6, 0.1, 0.1, 0.05, '#111'); p(0.25, 3.35, 0.6, 0.1, 0.1, 0.05, '#111'); p(0, 3.7, 0, 1.3, 0.3, 1.3, '#222'); p(0, 3.9, 0, 0.8, 0.6, 0.8, '#222'); });
    mk('log', (p) => { p(0, 0, 0, 3.4, 1.7, 1.7, '#7a5230'); p(1.72, 0.1, 0, 0.1, 1.5, 1.5, '#2a1d12'); p(-1.72, 0.1, 0, 0.1, 1.5, 1.5, '#c9a066'); p(0, 1.7, 0, 3, 0.12, 1.2, '#4f8f3d'); });
    mk('pipe', (p) => { p(0, 0, 0, 2.8, 2.4, 2.4, '#7d8794'); p(0, 0.3, 1.24, 1.6, 1.7, 0.06, '#15181d'); p(0, 2.4, 0, 3, 0.25, 2.6, '#5d6672'); });
    mk('stall', (p) => { p(-1.05, 0, 0, 0.12, 2.6, 2.3, '#d8c8f0'); p(1.05, 0, 0, 0.12, 2.6, 2.3, '#d8c8f0'); p(0, 0, -1.1, 2.2, 2.6, 0.12, '#d8c8f0'); p(0, 0.3, 1.1, 2.2, 2.1, 0.1, '#b79be0'); });
    mk('carton', (p) => { p(0, 0, 0, 2.5, 2.3, 2.5, '#d9b46c'); p(0, 2.3, 0, 2.5, 0.08, 0.5, '#f2e2b8'); p(0, 0.9, 1.27, 0.5, 1.4, 0.04, '#f2e2b8'); });
    mk('pot', (p) => { p(0, 0, 0, 2, 1.6, 2, '#c8663a'); p(0, 1.6, 0, 2.3, 0.3, 2.3, '#d97a4a'); for (let i = 0; i < 4; i++) p(rnd(-0.6, 0.6), 1.9, rnd(-0.6, 0.6), 1.2, rnd(1, 1.8), 1.2, vary(th.leaf, 0.3)); p(0.5, 2.8, 0.3, 0.5, 0.5, 0.5, '#ff6f91'); });
    mk('sandcastle', (p) => { p(0, 0, 0, 3, 1.2, 3, '#e8cf8a'); p(0, 1.2, 0, 2, 1, 2, '#f0d998'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { p(sx * 1.2, 1.2, sz * 1.2, 0.9, 1.3, 0.9, '#e0c47a'); p(sx * 1.2, 2.5, sz * 1.2, 0.5, 0.4, 0.5, '#ff6f61'); } });
    mk('shelf', (p) => { p(0, 0, 0, 2.9, 0.15, 1.1, '#7a5230'); p(-1.4, 0, 0, 0.12, 2.8, 1.1, '#7a5230'); p(1.4, 0, 0, 0.12, 2.8, 1.1, '#7a5230'); p(0, 0, -0.5, 2.9, 2.8, 0.1, '#6b4423'); for (let k = 1; k <= 3; k++) { p(0, k * 0.85, 0, 2.9, 0.12, 1.1, '#7a5230'); for (let i = 0; i < 4; i++) p(-1 + i * 0.7, k * 0.85 + 0.12, 0.1, 0.5, rnd(0.3, 0.6), 0.6, pick(['#e63946', '#3a86ff', '#ffd23f', '#2fbf71'])); } });
    mk('igloo', (p) => { p(0, 0, 0, 3.2, 1.2, 3.2, '#e9f4ff'); p(0, 1.2, 0, 2.5, 1, 2.5, '#f4faff'); p(0, 2.2, 0, 1.6, 0.7, 1.6, '#ffffff'); p(0, 0, 1.62, 1.1, 1, 0.08, '#16314d'); });
    mk('gumdrop', (p) => { const col = pick(['#ff5c8a', '#6ec6ff', '#ffd43b', '#9be564', '#c77dff']); p(0, 0, 0, 2.6, 1.2, 2.6, col); p(0, 1.2, 0, 2.1, 1, 2.1, col); p(0, 2.2, 0, 1.4, 0.7, 1.4, col); p(0.3, 2.7, 0.3, 0.5, 0.2, 0.3, '#ffffff'); });
    mk('present', (p) => { const col = pick(['#ff5c8a', '#4dabf7', '#ffd43b', '#69db7c', '#b197fc']); p(0, 0, 0, 2.5, 2.3, 2.5, col); p(0, 0, 0, 0.45, 2.34, 2.54, '#ffffff'); p(0, 0, 0, 2.54, 2.34, 0.45, '#ffffff'); p(0, 2.3, 0, 0.9, 0.5, 0.9, '#ffffff'); });
    mk('pod', (p) => { p(0, 0, 0, 2.4, 2.8, 2.4, '#c3ccdd'); p(0, 0.4, 1.22, 1.5, 1.6, 0.06, '#2de2ff'); p(0, 2.8, 0, 2.6, 0.2, 2.6, '#7b86a3'); p(1.2, 0.3, 0, 0.2, 0.3, 0.8, '#ff4d6d'); });
    mk('tree', (p) => { p(0, 0, 0, 2.6, 3.4, 2.6, th.trunk); p(0, 0.2, 1.32, 1.1, 1.6, 0.06, '#1a1008'); p(0, 3.4, 0, 4.6, 1.5, 4.6, th.leaf); p(0, 4.9, 0, 3.4, 1.3, 3.4, E.shade(th.leaf, 1.12)); });
    mk('umbrella', (p) => { p(0, 0, 0, 2.8, 0.2, 2.8, '#f6e7b4'); for (const sx of [-1.3, 1.3]) for (const sz of [-1.3, 1.3]) p(sx, 0, sz, 0.14, 2.6, 0.14, '#ffffff'); for (let i = 0; i < 4; i++) p(-1.05 + i * 0.7, 2.6, 0, 0.7, 0.18, 3.2, i & 1 ? '#ff6f61' : '#ffffff'); p(0, 0.2, -1.2, 2.5, 1.6, 0.1, '#7fd6e8'); });
    mk('coffin', (p) => { p(0, 0, 0, 1.5, 1.2, 3.2, '#3a2a22'); p(0, 1.2, 0, 1.2, 0.2, 2.9, '#2a1d17'); p(0, 1.4, 0.2, 0.2, 0.05, 1.2, '#c9a24a'); p(0, 1.4, 0.2, 0.7, 0.05, 0.2, '#c9a24a'); });

    // a spot: visual + solid + record
    function addSpot(type, x, z, ry, via, indoor, bi) {
      if (!VIS[type]) type = 'crate';
      VIS[type](P(x, z, ry || 0));
      const r = 1.45; psol(x - r, z - r, x + r, z + r, 9);
      spots.push({ id: spots.length, type, name: NAMES[type] || type, x, z, ry: ry || 0, via: via || null, indoor: !!indoor, b: indoor ? bi : null, occ: -1, shake: 0 });
    }
    // simple decoration (not hiding places)
    function deco(kind, x, z) {
      const lv = (c) => vary(c, 0.25);
      if (kind === 'tree') { box(x, 0, z, 0.9, 3.4, 0.9, th.trunk); box(x, 3, z, 4, 1.6, 4, lv(th.leaf)); box(x, 4.4, z, 2.8, 1.4, 2.8, lv(th.leaf)); psol(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 4); }
      else if (kind === 'pine') { box(x, 0, z, 0.8, 2, 0.8, th.trunk); box(x, 1.4, z, 3.6, 1.3, 3.6, lv(th.leaf)); box(x, 2.6, z, 2.6, 1.3, 2.6, lv(th.leaf)); box(x, 3.8, z, 1.6, 1.3, 1.6, lv(th.leaf)); box(x, 5, z, 0.7, 1, 0.7, '#ffffff'); psol(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 4); }
      else if (kind === 'deadtree') { box(x, 0, z, 0.8, 4, 0.8, '#3a2a22'); box(x + 0.9, 2.2, z, 2, 0.4, 0.4, '#3a2a22'); box(x - 0.8, 3, z, 1.8, 0.4, 0.4, '#3a2a22'); psol(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 4); }
      else if (kind === 'palm') { box(x, 0, z, 0.7, 4.2, 0.7, '#9a6b3a'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; box(x + Math.cos(a) * 1.3, 4, z + Math.sin(a) * 1.3, 2.6, 0.3, 0.9, th.leaf, -a); } psol(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 4); }
      else if (kind === 'cactus') { box(x, 0, z, 0.9, 3, 0.9, '#4aa860'); box(x + 0.9, 1.5, z, 0.9, 0.5, 0.5, '#4aa860'); box(x + 1.15, 1.5, z, 0.5, 1.3, 0.5, '#4aa860'); box(x - 0.9, 1.9, z, 0.9, 0.5, 0.5, '#4aa860'); box(x - 1.15, 1.9, z, 0.5, 1, 0.5, '#4aa860'); psol(x - 0.6, z - 0.6, x + 0.6, z + 0.6, 3); }
      else if (kind === 'lamp') { box(x, 0, z, 0.3, 4, 0.3, '#333'); box(x, 4, z, 0.9, 0.7, 0.9, th.night ? '#fff6a8' : '#ffe9a0'); psol(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 4); }
      else if (kind === 'flowers') { for (let i = 0; i < 6; i++) box(x + rnd(-1.5, 1.5), 0, z + rnd(-1.5, 1.5), 0.5, rnd(0.4, 0.8), 0.5, pick(['#ff6f91', '#ffd23f', '#b197fc', '#ffffff', '#4dabf7'])); }
      else if (kind === 'candy') { for (let i = 0; i < 6; i++) box(x, i * 0.7, z, 0.6, 0.7, 0.6, i & 1 ? '#ff3d6e' : '#ffffff'); box(x + 0.4, 4.2, z, 1, 0.6, 0.6, '#ff3d6e'); psol(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 4); }
      else if (kind === 'crystal') { box(x, 0, z, 0.9, 3.6, 0.9, th.night ? '#46f0ff' : '#9be8ff', 0.5); box(x + 0.9, 0, z + 0.4, 0.6, 2.2, 0.6, '#c77dff', 0.2); psol(x - 0.6, z - 0.6, x + 1.2, z + 0.8, 3); }
      else if (kind === 'block') { const c = pick(['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c']); box(x, 0, z, 2.2, 2.2, 2.2, c); box(x - 0.5, 2.2, z, 0.6, 0.3, 0.6, c); box(x + 0.5, 2.2, z, 0.6, 0.3, 0.6, c); psol(x - 1.1, z - 1.1, x + 1.1, z + 1.1, 2.2); }
      else if (kind === 'pillar') { box(x, 0, z, 1.4, 4.2, 1.4, '#d8d0c0'); box(x, 4.2, z, 1.8, 0.4, 1.8, '#c0b8a8'); psol(x - 0.7, z - 0.7, x + 0.7, z + 0.7, 4.2); }
      else if (kind === 'fence') { for (let i = -2; i <= 2; i++) box(x + i * 0.9, 0, z, 0.2, 1.2, 0.2, '#8a6a45'); box(x, 0.8, z, 4.6, 0.15, 0.15, '#8a6a45'); }
    }

    // ---------------------------------------------------------------- plots
    const wmix = []; for (const k in th.mix) for (let i = 0; i < th.mix[k]; i++) wmix.push(k);
    const sideDoors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    function building(cx, cz, big) {
      const bi = buildings.length, w = big ? rnd(17, 20) : rnd(12, 14.5), d = big ? rnd(13, 15) : rnd(9.5, 11), x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, t = 0.6, hgt = 4.6, wc = pick(th.walls), dw = 3.8;
      const side = pick(sideDoors), door = { x: cx + (side[0] ? side[0] * w / 2 : rnd(-w / 4, w / 4)), z: cz + (side[1] ? side[1] * d / 2 : rnd(-d / 4, d / 4)) };
      box(cx, 0, cz, w, 0.12, d, th.floor);                                                     // the floor
      const seg = (ax0, az0, ax1, az1, horiz, doorOn) => {                                      // one wall, with a doorway if doorOn
        if (!doorOn) { wall(ax0, az0, ax1, az1, hgt, wc); return; }
        const dc = horiz ? door.x : door.z;
        if (horiz) { wall(ax0, az0, dc - dw / 2, az1, hgt, wc); wall(dc + dw / 2, az0, ax1, az1, hgt, wc); box(dc, 3.4, (az0 + az1) / 2, dw, hgt - 3.4, az1 - az0, wc); }
        else { wall(ax0, az0, ax1, dc - dw / 2, hgt, wc); wall(ax0, dc + dw / 2, ax1, az1, hgt, wc); box((ax0 + ax1) / 2, 3.4, dc, ax1 - ax0, hgt - 3.4, dw, wc); }
      };
      seg(x0, z0, x1, z0 + t, true, side[1] === -1); seg(x0, z1 - t, x1, z1, true, side[1] === 1);
      seg(x0, z0 + t, x0 + t, z1 - t, false, side[0] === -1); seg(x1 - t, z0 + t, x1, z1 - t, false, side[0] === 1);
      for (let i = 0; i < 3; i++) { const wx = x0 + (i + 1) * w / 4; box(wx, 2, z0 - 0.02, 1.4, 1.2, 0.1, '#9fd8ff'); box(wx, 2, z1 + 0.02, 1.4, 1.2, 0.1, '#9fd8ff'); }   // painted windows
      roofs.push({ x: cx, z: cz, w: w + 1.2, d: d + 1.2, y: hgt, h: 0.5, c: pick(th.roof), x0, x1, z0, z1 });
      rects.push([x0, z0, x1, z1, '#9a9aa8']);
      // the way in, for the bots: a point outside the door and a point inside
      const out = [door.x + side[0] * 3.2, door.z + side[1] * 3.2], inn = [door.x - side[0] * 2.4, door.z - side[1] * 2.4];
      if (big) {                                              // a partition wall splits a big building into two rooms, with a doorway
        const px = cx + rnd(-2, 2), gz = cz + rnd(-2, 2);
        wall(px - 0.3, z0 + t, px + 0.3, gz - 1.8, hgt, wc); wall(px - 0.3, gz + 1.8, px + 0.3, z1 - t, hgt, wc);
      }
      // furniture inside
      const n = big ? 7 : 4, put = [];
      let guard = 0;
      while (put.length < n && guard++ < 80) {
        const x = rnd(x0 + 2.2, x1 - 2.2), z = rnd(z0 + 2.2, z1 - 2.2);
        if (Math.hypot(x - inn[0], z - inn[1]) < 3 || Math.hypot(x - door.x, z - door.z) < 3.4 || put.some((q) => Math.hypot(q[0] - x, q[1] - z) < 3.6)) continue;
        if (big && Math.abs(x - (cx)) < 3.2) continue;
        if (!free(x, z, 1.5)) continue;
        put.push([x, z]);
      }
      for (const [x, z] of put) addSpot(pick(th.inn), x, z, pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), [out, inn], true, bi);
      buildings.push({ x0, z0, x1, z1, out, inn });
    }
    function scatter(cx, cz, n, types, spread) {
      let guard = 0, placed = 0;
      while (placed < n && guard++ < 120) {
        const x = cx + rnd(-spread, spread), z = cz + rnd(-spread, spread);
        if (!free(x, z, 2.2)) continue;
        addSpot(pick(types), x, z, rnd(0, Math.PI * 2)); placed++;
      }
    }
    function decorate(cx, cz, n, spread) { let g = 0, k = 0; while (k < n && g++ < 80) { const x = cx + rnd(-spread, spread), z = cz + rnd(-spread, spread); if (!free(x, z, 1.8)) continue; deco(pick(th.deco), x, z); k++; } }
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const cx = -H + CELL / 2 + i * CELL + rnd(-1, 1), cz = -H + CELL / 2 + j * CELL + rnd(-1, 1), kind = pick(wmix);
      if (kind === 'house') { building(cx, cz, false); scatter(cx, cz, 2, th.out, 9.5); decorate(cx, cz, 3, 10); }
      else if (kind === 'big') { building(cx, cz, true); scatter(cx, cz, 2, th.out, 10); decorate(cx, cz, 2, 10); }
      else if (kind === 'garden') { scatter(cx, cz, 5, th.out, 9.5); decorate(cx, cz, 5, 10); }
      else if (kind === 'yard') { scatter(cx, cz, 7, th.out, 9); decorate(cx, cz, 2, 10); }
      else if (kind === 'wood') { scatter(cx, cz, 5, th.out.concat(['tree', 'bush']), 10); decorate(cx, cz, 9, 10.5); }
      else { deco('lamp', cx, cz); box(cx, 0, cz, 5, 0.5, 5, th.road); box(cx, 0.5, cz, 3, 0.4, 3, E.shade(th.road, 1.1)); psol(cx - 2.5, cz - 2.5, cx + 2.5, cz + 2.5, 0.9); scatter(cx, cz, 4, th.out, 9.5); decorate(cx, cz, 4, 10); }
    }
    // keep at least 100 spots: top up with outdoor ones on open ground
    let guard = 0; while (spots.length < 110 && guard++ < 400) { const x = rnd(-H + 5, H - 5), z = rnd(-H + 5, H - 5); if (free(x, z, 2.4)) addSpot(pick(th.out), x, z, rnd(0, Math.PI * 2)); }

    // spawn points on open ground
    const spawns = []; guard = 0; while (spawns.length < 16 && guard++ < 600) { const x = rnd(-H + 4, H - 4), z = rnd(-H + 4, H - 4); if (free(x, z, 1.6)) spawns.push([x, z]); }
    return { name: th.name, theme: th, size: S, mesh: m, roofs, solids, spots, spawns, rects, buildings, sky: th.sky, night: !!th.night };
  }

  root.H3Maps = { LIST: THEMES.map((t, i) => ({ id: t.id, index: i, name: t.name, emoji: t.emoji, blurb: t.blurb })), build, mulberry };
})(window);
