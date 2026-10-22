/*
 * Levels. World pixels, 100 px = 1 m, y points down.
 *   terrain: [{ pts:[[x,y],...], mu? }]  polylines, solid below the line (hills, ramps, valleys); mu < 1 is ice
 *   solids:  [x, y, w, h, opts?]        boxes (stones, walls, ceilings); opts: { mu }
 *   water:   [x, surfaceY, w, h]        swimmable
 *   pads:    [x, topY, w]               bounce pads
 *   hazards: [x, y, w, h]               thorns: touching with body or feet = respawn
 *   movers:  [{x,y,w,h, ax,ay, per, ph}] moving platforms (sinusoidal)
 * Goal: touch the golden egg with your HEAD. The body doesn't count.
 */
(function (root) {
  'use strict';
  const G = 520;

  // terrain path builder
  function path(x, y) {
    const pts = [[x, y]];
    const o = {
      flat(dx) { x += dx; pts.push([x, y]); return o; },
      to(dx, dy) { x += dx; y += dy; pts.push([x, y]); return o; },
      // smooth bump (h>0 up) or dip (h<0) that returns to the same height
      bump(dx, h) { const n = Math.max(4, Math.round(dx / 36)), x0 = x; for (let i = 1; i <= n; i++) pts.push([x0 + (dx * i) / n, y - h * 0.5 * (1 - Math.cos((2 * Math.PI * i) / n))]); x = x0 + dx; return o; },
      // smooth S-curve step to a new height
      step(dx, dy) { const n = Math.max(3, Math.round(dx / 36)), x0 = x, y0 = y; for (let i = 1; i <= n; i++) pts.push([x0 + (dx * i) / n, y0 + dy * 0.5 * (1 - Math.cos((Math.PI * i) / n))]); x = x0 + dx; y = y0 + dy; return o; },
      pts() { return pts; },
      get x() { return x; }, get y() { return y; },
    };
    return o;
  }

  const LEVELS = [];

  // 1 ------------------------------------------------------------------------------
  {
    const t = path(-400, G).flat(700).bump(260, 70).flat(110).bump(300, -45).flat(80).bump(380, 115).flat(120)
      .step(170, 70).flat(360).step(170, -70).flat(220).bump(300, 95).flat(520);
    LEVELS.push({
      name: 'Rolling Meadow',
      hint: 'Hills, a dip, and a pond to swim. Touch the golden egg with your HEAD.',
      spawn: [60, G - 45], deathY: 1100,
      terrain: [{ pts: t.pts() }],
      water: [[1390, G - 6, 560, 200]],
      checkpoints: [[2000, G - 45]],
      bread: [[360, G - 120], [640, G - 130], [1000, G - 170], [1250, G - 200], [1660, G - 40], [2150, G - 70], [2480, G - 150]],
      egg: [2940, G - 28],
    });
  }

  // 2 ------------------------------------------------------------------------------
  LEVELS.push({
    name: 'Stepping Stones',
    hint: 'Hop across the stones. Fall in and you can swim, then flap back up.',
    spawn: [60, G - 45], deathY: 1200,
    terrain: [{ pts: path(-400, G).flat(700).pts() }, { pts: path(2000, G - 40).flat(700).pts() }],
    solids: [
      [300, G + 40, 1700, 600],
      [400, G - 10, 120, 24], [590, G - 35, 110, 24], [780, G - 5, 120, 24], [970, G - 45, 110, 24],
      [1160, G - 15, 120, 24], [1350, G - 50, 110, 24], [1540, G - 25, 120, 24], [1730, G - 55, 100, 24],
    ],
    water: [[300, G - 20, 1700, 400]],
    checkpoints: [[2020, G - 85]],
    bread: [[460, G - 70], [645, G - 95], [1025, G - 105], [1405, G - 110], [1780, G - 115], [2300, G - 90]],
    egg: [2600, G - 68],
  });

  // 3 ------------------------------------------------------------------------------
  LEVELS.push({
    name: 'Bouncy Gorge',
    hint: 'Thorns below! Drop onto the bouncy pads to spring up to the ledges.',
    spawn: [60, G - 45], deathY: 1300,
    terrain: [{ pts: path(-400, G).flat(1000).pts() }, { pts: path(2100, G - 20).flat(900).pts() }],
    solids: [
      [600, G + 300, 1500, 400],
      [1040, G - 230, 220, 800],        // ledge 1
      [1700, G - 150, 200, 800],        // ledge 2
    ],
    pads: [[720, G + 286, 200], [1380, G + 286, 200]],
    hazards: [[610, G + 270, 110, 30], [920, G + 270, 120, 30], [1260, G + 270, 120, 30], [1580, G + 270, 120, 30], [1900, G + 270, 200, 30]],
    checkpoints: [[1060, G - 275], [1720, G - 195], [2120, G - 65]],
    bread: [[800, G + 100], [1150, G - 300], [1480, G - 60], [1800, G - 230], [2300, G - 90], [2600, G - 90]],
    egg: [2800, G - 48],
  });

  // 4 ------------------------------------------------------------------------------
  {
    const dry = path(-400, G).flat(600).step(200, -70).flat(660).pts();
    LEVELS.push({
      name: 'Slippery Slopes',
      hint: 'Ice! You slide and can\'t stop. Brace before the thorns, and flap over the gap.',
      spawn: [60, G - 45], deathY: 1100,
      terrain: [
        { pts: dry },
        { pts: path(1060, G - 70).flat(540).pts(), mu: 0.06 },
        { pts: path(2040, G - 10).flat(120).step(200, -60).flat(700).pts() },
      ],
      solids: [[1600, G + 240, 440, 600]],
      hazards: [[1620, G + 210, 400, 30]],
      checkpoints: [[1080, G - 115], [2070, G - 55]],
      bread: [[500, G - 80], [860, G - 150], [1250, G - 130], [1480, G - 130], [1820, G - 120], [2400, G - 130]],
      egg: [2950, G - 98],
    });
  }

  // 5 ------------------------------------------------------------------------------
  LEVELS.push({
    name: 'Cliffside',
    hint: 'Climb the ledges to the top. Stamina refills when your feet touch something.',
    spawn: [60, G - 45], deathY: 1100,
    terrain: [{ pts: path(-400, G).flat(700).pts() }],
    solids: [
      [250, G - 42, 70, 42],
      [320, G - 90, 170, 28], [160, G - 190, 150, 28], [330, G - 290, 160, 28], [520, G - 390, 150, 28],
      [330, G - 490, 150, 28], [140, G - 590, 160, 28], [330, G - 690, 160, 28], [540, G - 780, 420, 28],
    ],
    checkpoints: [[350, G - 135], [540, G - 435], [350, G - 735]],
    bread: [[400, G - 140], [235, G - 240], [600, G - 440], [220, G - 640], [410, G - 740], [700, G - 830]],
    egg: [880, G - 810],
  });

  // 6 ------------------------------------------------------------------------------
  LEVELS.push({
    name: 'The Tunnel',
    hint: 'Too low to walk in. Hold the NECK pad and aim straight in. Your neck will do the rest, badly.',
    spawn: [60, G - 45], deathY: 1000,
    terrain: [{ pts: path(-400, G).flat(500).bump(240, 80).flat(100).bump(200, 50).flat(1400).pts() }],
    solids: [
      [1160, G - 52 - 400, 300, 400],   // rock above the tunnel mouth
      [1400, G - 452, 60, 452],         // back wall
    ],
    checkpoints: [[1000, G - 45]],
    bread: [[330, G - 120], [650, G - 60], [900, G - 70], [1080, G - 60]],
    egg: [1235, G - 24],
  });

  // 7 ------------------------------------------------------------------------------
  LEVELS.push({
    name: 'Moving Day',
    hint: 'The platforms move. Land on them to refill your stamina. The thorns do not move.',
    spawn: [60, G - 45], deathY: 1300,
    terrain: [{ pts: path(-400, G).flat(800).pts() }, { pts: path(1960, G - 40).flat(300).step(200, -90).flat(600).pts() }],
    solids: [[400, G + 300, 1560, 500]],
    hazards: [[420, G + 270, 1520, 30]],
    movers: [
      { x: 520, y: G - 10, w: 160, h: 24, ax: 80, ay: 0, per: 4.5, ph: 0 },
      { x: 880, y: G - 70, w: 160, h: 24, ax: 0, ay: 55, per: 3.6, ph: 0.25 },
      { x: 1260, y: G - 30, w: 160, h: 24, ax: 90, ay: 0, per: 5, ph: 0.5 },
      { x: 1640, y: G - 70, w: 160, h: 24, ax: 0, ay: 60, per: 4.2, ph: 0 },
    ],
    checkpoints: [[1970, G - 85]],
    bread: [[600, G - 90], [960, G - 150], [1350, G - 110], [1720, G - 150], [2300, G - 190]],
    egg: [2900, G - 150],
  });

  // 8 ------------------------------------------------------------------------------
  {
    const a = path(-400, G).flat(500).bump(240, 70).flat(560).pts();
    LEVELS.push({
      name: 'Grand Gander',
      hint: 'Everything at once. Hills, a pond, ice, a bounce pad, a moving platform, then the climb.',
      spawn: [60, G - 45], deathY: 1300,
      terrain: [
        { pts: a },
        { pts: path(900, G - 0).step(150, 60).flat(260).step(150, -60).flat(260).pts() },                    // pond basin
        { pts: path(1720, G).flat(520).pts(), mu: 0.06 },                                                    // ice runway
        { pts: path(2640, G - 20).flat(500).pts() },
      ],
      solids: [
        [2240, G + 260, 400, 700],
        [3140, G - 110, 230, 800], [3430, G - 210, 200, 900], [3690, G - 310, 280, 1000],
      ],
      water: [[950, G - 6, 510, 200]],
      hazards: [[2260, G + 230, 360, 30]],
      pads: [],
      movers: [{ x: 2330, y: G - 20, w: 140, h: 24, ax: 70, ay: 0, per: 4, ph: 0 }],
      checkpoints: [[1730, G - 45], [2660, G - 65], [3150, G - 155], [3440, G - 255]],
      bread: [[400, G - 130], [1250, G - 60], [1900, G - 60], [2400, G - 90], [2900, G - 80], [3260, G - 180], [3540, G - 270]],
      egg: [3860, G - 338],
    });
  }

  // ==================================================================================
  // Levels 9+ are composed from sections. Each section starts at the cursor (c.x, c.y = ground height),
  // adds geometry, and leaves the cursor on flat ground to the right. Every piece is built from a shape
  // proven in levels 1-8, with its size turned up as the game goes on.
  // ==================================================================================
  const S = {};
  const sync = (c, p) => { c.x = p.x; c.y = p.y; };
  const cont = (c) => { if (!c.p) { c.p = path(c.x, c.y); c.lv.terrain.push({ pts: c.p.pts() }); } return c.p; };
  const brk = (c) => { c.p = null; };
  const low = (c, y) => { c.low = Math.max(c.low, y); };
  const br = (c, x, y) => { c.lv.bread.push([Math.round(x), Math.round(y)]); };
  const pit = (c, x0, w, y) => {   // thorn pit floor with its thorns
    c.lv.solids.push([x0, y + 300, w, 500]);
    c.lv.hazards.push([x0 + 6, y + 270, w - 12, 30]);
    low(c, y + 800);
  };

  S.flat = (len) => (c) => { const p = cont(c), x0 = c.x; p.flat(len); sync(c, p); if (len >= 300) br(c, x0 + len / 2, c.y - 75); };
  S.hills = (n, h) => (c) => {
    const p = cont(c);
    for (let i = 0; i < n; i++) {
      const x0 = p.x + 70, w = 240 + i * 20, up = i % 2 === 0;
      p.flat(70).bump(w, up ? h : -Math.min(45, h * 0.6));
      br(c, x0 + w / 2, p.y - (up ? h + 60 : 90));
    }
    sync(c, p);
  };
  S.climb = (n, dy) => (c) => {
    const p = cont(c);
    for (let i = 0; i < n; i++) { p.flat(130).step(200, -dy); br(c, p.x - 100, p.y - 70); }
    sync(c, p);
  };
  S.descend = (n, dy) => (c) => {
    const p = cont(c);
    for (let i = 0; i < n; i++) { p.flat(100).step(220, dy); br(c, p.x - 110, p.y - 90); }
    sync(c, p); low(c, c.y);
  };
  S.pond = (len) => (c) => {
    const p = cont(c), x0 = c.x, y = c.y;
    p.step(150, 60).flat(len).step(150, -60);
    c.lv.water.push([x0 + 50, y - 6, len + 200, 200]);
    br(c, x0 + 150 + len / 2, y - 70); sync(c, p); low(c, y + 200);
  };
  S.stones = (n) => (c) => {
    brk(c);
    const x0 = c.x, y = c.y, len = 100 + n * 190, tops = [10, 35, 5, 45, 15, 50, 25, 55];
    c.lv.solids.push([x0, y + 40, len, 600]);
    c.lv.water.push([x0, y - 20, len, 400]);
    for (let i = 0; i < n; i++) {
      const top = y - tops[i % 8];
      c.lv.solids.push([x0 + 100 + i * 190, top, 115, 24]);
      if (i % 2 === 0) br(c, x0 + 157 + i * 190, top - 60);
    }
    c.x = x0 + len; low(c, y + 640);
  };
  S.gap = (n, gw) => (c) => {
    brk(c);
    const x0 = c.x, y = c.y, W = gw * (n + 1) + 110 * n, tops = [0, 30, 10, 40, 0, 25];
    pit(c, x0, W, y);
    for (let i = 0; i < n; i++) {
      const px = x0 + gw * (i + 1) + 110 * i, top = y - tops[i % 6];
      c.lv.solids.push([px, top, 110, 22]);
      br(c, px + 55, top - 70);
      if (n >= 5 && i === Math.floor(n / 2)) c.lv.checkpoints.push([px + 40, top - 45]);   // halfway checkpoint on long gaps
    }
    c.x = x0 + W;
  };
  S.movers = (n, fast) => (c) => {
    brk(c);
    const x0 = c.x, y = c.y, W = 120 + n * 370 + 60;
    pit(c, x0, W, y);
    const pat = [[80, 0, 4.5, 0], [0, 55, 3.6, 0.25], [90, 0, 5, 0.5], [0, 60, 4.2, 0]];
    for (let i = 0; i < n; i++) {
      const q = pat[i % 4], mx = x0 + 120 + i * 370, my = y - 10 - (i % 2) * 60;
      c.lv.movers.push({ x: mx, y: my, w: 160, h: 24, ax: q[0], ay: q[1], per: q[2] * (fast ? 0.8 : 1), ph: q[3] });
      br(c, mx + 80, my - 80);
    }
    c.x = x0 + W;
  };
  S.ice = (len, pitW) => (c) => {
    brk(c);
    const p = path(c.x, c.y);
    c.lv.terrain.push({ pts: p.pts(), mu: 0.06 });
    const x0 = c.x; p.flat(len); c.x = p.x;
    br(c, x0 + len * 0.35, c.y - 70); br(c, x0 + len * 0.75, c.y - 70);
    if (pitW) { pit(c, c.x, pitW, c.y); c.x += pitW; c.y += 40; }
    brk(c);
  };
  S.gorge = () => (c) => {    // level 3's pad gorge, as a section
    brk(c);
    const x0 = c.x, y = c.y;
    c.lv.solids.push([x0, y + 300, 1500, 400], [x0 + 440, y - 230, 220, 800], [x0 + 1100, y - 150, 200, 800]);
    c.lv.pads.push([x0 + 120, y + 286, 200], [x0 + 780, y + 286, 200]);
    for (const [hx, hw] of [[10, 110], [320, 120], [660, 120], [980, 120], [1300, 200]]) c.lv.hazards.push([x0 + hx, y + 270, hw, 30]);
    br(c, x0 + 200, y + 100); br(c, x0 + 550, y - 300); br(c, x0 + 880, y - 60); br(c, x0 + 1200, y - 230);
    c.lv.checkpoints.push([x0 + 460, y - 275], [x0 + 1120, y - 195]);   // one on each ledge, like level 3
    c.x = x0 + 1500; c.y = y - 20; low(c, y + 700);
  };
  S.bounceUp = (h) => (c) => {
    const p = cont(c), x0 = c.x, y = c.y;
    p.flat(380);
    c.lv.pads.push([x0 + 60, y - 14, 200]);
    c.lv.solids.push([x0 + 380, y - h, 320, h + 500]);
    br(c, x0 + 160, y - 200); br(c, x0 + 540, y - h - 60);
    c.x = x0 + 700; c.y = y - h; brk(c);
  };
  S.drop = (h) => (c) => {
    brk(c);
    br(c, c.x + 40, c.y + h / 2);
    c.y += h; low(c, c.y);
  };
  S.walls = (n, h) => (c) => {
    const p = cont(c);
    for (let i = 0; i < n; i++) {
      p.flat(200);
      c.lv.solids.push([p.x, p.y - h, 70, h]);
      br(c, p.x + 35, p.y - h - 70);
      p.flat(70);
    }
    sync(c, p);
  };
  // Final sections: they place the egg themselves.
  S.tower = (k) => (c) => {
    const p = cont(c); p.flat(150); sync(c, p);
    const dx = c.x - 300, dy = c.y - G, lv = c.lv;
    const L = [[250, 42, 70, 42, 0], [320, 90, 170, 28], [160, 190, 150, 28], [330, 290, 160, 28], [520, 390, 150, 28],
      [330, 490, 150, 28], [140, 590, 160, 28], [330, 690, 160, 28], [540, 780, 420, 28]];
    lv.wp = [];
    const n = Math.min(8, k);
    lv.solids.push([250 + dx, G - 42 + dy, 70, 42]);
    for (let i = 1; i <= n; i++) {
      const [lx, up, w, h] = L[i];
      let x = lx, ww = w;
      if (i === n && n < 8) {   // widen the top ledge AWAY from the one below it, so there is room to hop up from the side
        const prevMid = L[i - 1][0] + L[i - 1][2] / 2;
        if (prevMid < lx + w / 2) ww = w + 260; else { x = lx - 260; ww = w + 260; }
      }
      lv.solids.push([x + dx, G - up + dy, ww, h]);
      lv.wp.push([lx + w / 2 + dx, G - up + dy]);
      if (i < n || n === 8) br(c, lx + w / 2 + dx, G - up + dy - 50);
      if (i % 3 === 1 && i < n) lv.checkpoints.push([lx + w / 2 + dx - 30, G - up + dy - 45]);
      if (i === n) lv.egg = n === 8 ? [880 + dx, G - 810 + dy] : [(x === lx ? lx + w + 150 : lx - 150) + dx, G - up + dy - 30];
    }
    c.x += 800; low(c, c.y + 400);
  };
  S.tunnel = () => (c) => {
    const p = cont(c); p.flat(520); sync(c, p);
    const x0 = c.x, y = c.y;
    c.lv.solids.push([x0, y - 452, 300, 400], [x0 + 240, y - 452, 60, 452]);
    p.flat(300); sync(c, p);
    c.lv.egg = [x0 + 75, y - 24]; c.lv.tunnel = true;
  };

  // ---------------------------------------------------------------------------- Mega World sections (mechanics: see mech.js)
  S.fans = (n) => (c) => {          // thorn pit crossed by riding fan columns up to a staircase of ledges
    brk(c);
    const x0 = c.x, y = c.y, lift = 250, W = 140 + n * 440 + 60;
    pit(c, x0, W, y);
    let ly = y;
    for (let i = 0; i < n; i++) {
      const fx = x0 + 110 + i * 440;
      c.lv.solids.push([fx - 70, ly, 140, 22]);
      c.lv.zones.push([fx - 60, ly - lift - 90, 120, lift + 90, 0, -1450, 1, 'fan']);
      c.lv.solids.push([fx + 110, ly - lift, 330, 24]);
      br(c, fx + 270, ly - lift - 70); br(c, fx, ly - 170);
      ly -= lift;
    }
    c.x = x0 + 110 + (n - 1) * 440 + 440; c.y = ly; brk(c); low(c, y + 800);
  };
  S.crumble = (n) => (c) => {       // platforms that fall away under your feet
    brk(c);
    const x0 = c.x, y = c.y, W = n * 230 + 110, tops = [0, 30, 10, 45, 15, 35];
    pit(c, x0, W, y);
    for (let i = 0; i < n; i++) { const px = x0 + 70 + i * 230, top = y - tops[i % 6]; c.lv.crumble.push([px, top, 150, 24]); br(c, px + 75, top - 70); }
    c.x = x0 + W; if (n % 3 === 2) c.lv.checkpoints.push([x0 + 70 + Math.floor(n / 2) * 230 + 40, y - 80]);
  };
  S.belts = (n) => (c) => {         // conveyor belts over thorns, alternating direction
    brk(c);
    const x0 = c.x, y = c.y, seg = 330, W = n * seg + 60;
    pit(c, x0, W, y);
    for (let i = 0; i < n; i++) { c.lv.belts.push([x0 + 30 + i * seg, y, seg - 20, (i % 2 ? -1 : 1) * 135]); br(c, x0 + 30 + i * seg + seg / 2, y - 70); }
    c.x = x0 + W; c.lv.checkpoints.push([x0 + 30 + Math.floor(n / 2) * seg + 60, y - 50]);
  };
  S.saws = (n) => (c) => {          // spinning blades sweeping to and fro along the ground: hop over them
    const p = cont(c), x0 = c.x; p.flat(260 + n * 360); sync(c, p);
    for (let i = 0; i < n; i++) {
      const sx = x0 + 330 + i * 360;
      c.lv.saws.push({ x: sx, y: c.y - 27, r: 26, ax: 60, ay: 0, per: 3.2 + (i % 3) * 0.5, ph: (i * 0.37) % 1 });
      br(c, sx, c.y - 150); br(c, sx + 180, c.y - 75);
    }
  };
  S.portals = (n) => (c) => {       // pits too wide to cross: hop through the portals instead
    brk(c);
    const x0 = c.x, y = c.y, unit = 900, W = n * unit + 260;
    pit(c, x0, W, y);
    c.lv.solids.push([x0, y, 240, 40]);
    for (let i = 0; i < n; i++) {
      c.lv.solids.push([x0 + (i + 1) * unit, y, 240, 40]);
      c.lv.portals.push({ a: [x0 + i * unit + 190, y - 50], b: [x0 + (i + 1) * unit + 50, y - 50], hue: 20 + i * 70 });
      br(c, x0 + i * unit + 520, y - 160); br(c, x0 + (i + 1) * unit + 150, y - 70);
    }
    c.x = x0 + n * unit + 240; c.lv.checkpoints.push([x0 + Math.ceil(n / 2) * unit + 150, y - 45]);
  };
  S.gates = () => (c) => {          // find the button, then the gate opens
    const p = cont(c), x0 = c.x; p.flat(900); sync(c, p);
    c.lv.solids.push([x0 + 160, c.y - 110, 150, 24]);
    c.lv.gates.push({ btn: [x0 + 205, c.y - 124, 60, 14], box: [x0 + 640, c.y - 430, 44, 430] });
    br(c, x0 + 235, c.y - 190); br(c, x0 + 480, c.y - 70);
  };
  S.lowgrav = (len) => (c) => {     // floaty moon jumps over a wide pit
    brk(c);
    const x0 = c.x, y = c.y, W = len;
    pit(c, x0, W, y);
    c.lv.zones.push([x0 - 120, y - 1000, W + 240, 1400, 0, 0, 0.28, 'moon']);
    const tops = [0, 80, 30, 120, 50, 90];
    for (let i = 0; i * 380 + 150 < W; i++) { const top = y - tops[i % 6]; c.lv.solids.push([x0 + 80 + i * 380, top, 150, 24]); br(c, x0 + 155 + i * 380, top - 140); }
    c.x = x0 + W; { const ci = Math.max(0, Math.floor((W - 300) / 760)); c.lv.checkpoints.push([x0 + 80 + ci * 380 + 75, y - tops[ci % 6] - 45]); }
  };
  S.antigrav = (h) => (c) => {      // a column that floats you up to a high ledge
    const p = cont(c), x0 = c.x, y = c.y; p.flat(340); sync(c, p);
    c.lv.solids.push([x0 + 100, y - h - 120, 24, h + 120]);
    c.lv.solids.push([x0 + 330, y - h, 340, h + 400]);
    c.lv.zones.push([x0 + 124, y - h - 60, 206, h + 60, 0, 0, -0.15, 'anti']);
    br(c, x0 + 226, y - h / 2); br(c, x0 + 500, y - h - 70);
    c.x = x0 + 670; c.y = y - h; brk(c); low(c, y + 400);
  };

  // ---------------------------------------------------------------------------- Deep Sea sections (the whole level is under water; see composeSea)
  const quiet = (c, x0, x1) => { (c.lv.noLife = c.lv.noLife || []).push([x0 - 160, x1 + 160]); };
  S.slalom = (n) => (c) => {        // pillars rising from the floor and hanging from the roof: weave over and under
    const p = cont(c), x0 = c.x, y = c.y; p.flat(150 + n * 340 + 100); sync(c, p);
    for (let i = 0; i < n; i++) {
      const px = x0 + 170 + i * 340;
      if (i % 2 === 0) { c.lv.solids.push([px, y - 220, 90, 520]); br(c, px + 45, y - 300); }
      else { c.lv.solids.push([px, y - 1000, 90, 700]); br(c, px + 45, y - 110); }
    }
    quiet(c, x0 + 170, x0 + 170 + n * 340);
  };
  S.current = (len, dir) => (c) => {   // a river in the sea: with it you fly, against it you swim hard
    const p = cont(c), x0 = c.x, y = c.y; p.flat(len); sync(c, p);
    c.lv.zones.push([x0, y - 560, len, 620, dir * 150, 0, 1, 'current']);
    for (let i = 0; i < 2; i++) c.lv.hazards.push([x0 + len * (0.3 + i * 0.35), y - 24, 120, 24]);
    br(c, x0 + len * 0.25, y - 150); br(c, x0 + len * 0.5, y - 260); br(c, x0 + len * 0.75, y - 150);
  };
  S.cave = (len) => (c) => {         // a low roof over a thorny floor: stay in the middle
    const p = cont(c), x0 = c.x, y = c.y; p.flat(len + 120); sync(c, p);
    c.lv.solids.push([x0 + 60, y - 1000, len, 660]);                                     // roof, bottom at y - 340
    for (let x = 220; x < len - 100; x += 380) { c.lv.hazards.push([x0 + x, y - 24, 100, 24]); c.lv.hazards.push([x0 + x + 190, y - 364, 80, 24]); }
    for (let x = 200; x < len - 100; x += 300) br(c, x0 + x + 60, y - 130);
    quiet(c, x0 + 60, x0 + 60 + len);
  };
  S.trench = (d) => (c) => {         // the floor drops away into a thorny trench; follow the up-current back out
    const p = cont(c), x0 = c.x, y = c.y; p.flat(60).step(240, d).flat(520).step(240, -d).flat(60); sync(c, p);
    c.lv.hazards.push([x0 + 360, y + d - 24, 140, 24]); c.lv.hazards.push([x0 + 620, y + d - 24, 110, 24]);
    c.lv.zones.push([x0 + 560, y - 200, 340, d + 280, 0, -260, 1, 'current']);
    br(c, x0 + 250, y + d * 0.45); br(c, x0 + 480, y + d - 150); br(c, x0 + 760, y + d * 0.4);
    low(c, y + d + 100); quiet(c, x0 + 150, x0 + 900);
  };
  function composeSea(name, hint, secs, o) {
    o = o || {};
    const lv = { name, hint, theme: 'ocean', sea: true, spawn: [60, G - 45], deathY: 0, terrain: [], solids: [], water: [], hazards: [], pads: [], movers: [], checkpoints: [], bread: [], egg: null, crumble: [], belts: [], zones: [], saws: [], portals: [], gates: [], dark: !!o.dark, seaDense: o.dense || 1 };
    const c = { x: -400, y: G, p: null, low: G, lv };
    S.flat(700)(c);
    secs.forEach((f, i) => { f(c); if (i < secs.length - 1) { S.flat(170)(c); lv.checkpoints.push([c.x - 70, c.y - 45]); } });
    S.flat(260)(c); lv.egg = [c.x - 120, c.y - 28];
    lv.deathY = c.low + 650;
    const W = c.x + 1400;
    lv.water.push([-700, -700, W, c.low + 1400]);                  // the whole level is under water
    lv.solids.push([-700, -1000, W, 300]);                           // a roof far above (out of sight) so you can't escape upwards
    lv.solids.push([-700, -1000, 300, c.low + 1800]);                // a wall at the start
    return lv;
  }

  function compose(name, hint, theme, secs) {
    const lv = { name, hint, theme, spawn: [60, G - 45], deathY: 0, terrain: [], solids: [], water: [], hazards: [], pads: [], movers: [], checkpoints: [], bread: [], egg: null, crumble: [], belts: [], zones: [], saws: [], portals: [], gates: [] };
    const c = { x: -400, y: G, p: null, low: G, lv };
    S.flat(700)(c);
    secs.forEach((f, i) => {
      f(c);
      if (lv.egg) return;
      if (i < secs.length - 1) { S.flat(170)(c); lv.checkpoints.push([c.x - 70, c.y - 45]); }
    });
    if (!lv.egg) { S.flat(260)(c); lv.egg = [c.x - 120, c.y - 28]; }
    lv.deathY = c.low + 650;
    return lv;
  }

  const D = (name, hint, theme, secs) => LEVELS.push(compose(name, hint, theme, secs));
  const s = S;
  D('Sunny Side Up', 'A gentle start: hills, a pond, more hills.', 'meadow', [s.hills(3, 60), s.pond(300), s.hills(2, 80)]);
  D('Hay Bale Hurdles', 'Flap over the walls, then hop the stones.', 'meadow', [s.walls(3, 90), s.hills(2, 70), s.stones(4)]);
  D('Pad Parade', 'Red pads launch you skyward. Aim for the ledge.', 'meadow', [s.bounceUp(220), s.hills(2, 70), s.bounceUp(260), s.hills(1, 60)]);
  D('Duck Pond Derby', 'So much water. Flap out when you need to.', 'meadow', [s.pond(500), s.stones(6), s.pond(300)]);
  D('Dune Run', 'Climb the dunes and slide down the other side.', 'desert', [s.hills(4, 90), s.climb(3, 70), s.descend(3, 70)]);
  D('Cactus Gap', 'Thorn pits with little platforms. Do not look down.', 'desert', [s.gap(3, 80), s.hills(2, 60), s.gap(4, 110)]);
  D('Oasis Hop', 'Stones, walls and a long swim.', 'desert', [s.stones(8), s.walls(3, 110), s.pond(400)]);
  D('Pyramid Pass', 'Up the sandy steps, over the edge, then the tall climb.', 'desert', [s.climb(5, 80), s.drop(200), s.tower(5)]);
  D('Frosty Start', 'Ice! Plan your braking before the thorns.', 'snow', [s.ice(500), s.hills(2, 60), s.ice(500, 260)]);
  D('Snowdrift Shuffle', 'Walls, then a long slide, then a thorny gap.', 'snow', [s.walls(4, 100), s.ice(600), s.gap(3, 100)]);
  D('Glacier Gap', 'Slide, hop the moving floes, slide again.', 'snow', [s.ice(400, 300), s.movers(3), s.ice(450, 320)]);
  D('Icicle Climb', 'Bounce up, slide along, then climb the ice tower.', 'snow', [s.bounceUp(300), s.ice(500), s.tower(6)]);
  D('Blizzard Bridge', 'Long thorn gaps with a skating rink in the middle.', 'snow', [s.gap(5, 130), s.ice(700, 340), s.gap(4, 150)]);
  D('Sunset Strip', 'Big hills, a pond and tall walls.', 'sunset', [s.hills(5, 100), s.pond(400), s.walls(3, 110), s.hills(3, 90)]);
  D('Canyon Crossing', 'The gorge again, then moving platforms.', 'sunset', [s.gorge(), s.hills(2, 80), s.movers(3)]);
  D('Red Rock Rise', 'Climb, bounce to the high ledge, drop down, hurdle walls.', 'sunset', [s.climb(4, 85), s.bounceUp(380), s.drop(250), s.walls(3, 120)]);
  D('Twilight Tumble', 'Faster platforms, wider gaps, and the gorge to finish.', 'sunset', [s.movers(4, true), s.gap(5, 140), s.gorge()]);
  D('Moonlit Meadow', 'A long night walk with everything in it.', 'night', [s.hills(4, 100), s.stones(7), s.walls(4, 120), s.pond(500)]);
  D('Spooky Spires', 'Launch, hurdle, ride the platforms, then climb the spire.', 'night', [s.bounceUp(420), s.walls(3, 120), s.movers(3, true), s.tower(7)]);
  D('Starfall Slide', 'Two huge ice slides with thorn gaps between.', 'night', [s.ice(600, 300), s.gap(6, 140), s.ice(700, 360), s.hills(2, 80)]);
  D('Midnight Tunnel', 'Gaps, then a tunnel too low to walk into. Use the NECK pad.', 'night', [s.hills(3, 80), s.gap(4, 130), s.tunnel()]);
  D('Candy Climb', 'Sticky sweet steps and a very tall tower.', 'candy', [s.climb(5, 90), s.walls(4, 120), s.tower(8)]);
  D('Sugar Rush', 'Fast platforms, a slippery slide, the gorge and a gap.', 'candy', [s.movers(4, true), s.ice(700, 340), s.gorge(), s.gap(5, 150)]);
  D('Lava Leap', 'Do NOT fall. Long gaps, fast platforms, tall walls.', 'lava', [s.gap(6, 160), s.movers(5, true), s.walls(4, 120), s.gorge()]);
  D('The Final Honk', 'Everything. All of it. Then the tallest tower of all.', 'lava',
    [s.hills(4, 100), s.pond(500), s.ice(600, 320), s.gorge(), s.movers(4, true), s.climb(4, 85), s.walls(3, 120), s.tower(8)]);


  // ------------------------------------------------------------------ campaign 2: 70 more levels (7 worlds x 10)
  // Built only from the sections above, inside the parameter ranges the original 33 levels already use.
  LEVELS.campaign = LEVELS.length;                       // the first 33 are the main campaign (finishing them unlocks the minigames)
  (function () {
    const rng = (a) => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const R = rng(20261017);
    const lerp = (a, b, d) => Math.round(a + (b - a) * d);
    // name -> [factory(d), what the hint says]
    const SEC = {
      hills:   [(d) => s.hills(lerp(2, 5, d), lerp(60, 100, d)), 'rolling hills'],
      climb:   [(d) => s.climb(lerp(3, 5, d), lerp(70, 90, d)), 'a steep climb'],
      descend: [(d) => s.descend(lerp(2, 3, d), 70), 'a long descent'],
      pond:    [(d) => s.pond(lerp(300, 500, d)), 'a swim'],
      stones:  [(d) => s.stones(lerp(4, 8, d)), 'stepping stones'],
      gap:     [(d) => s.gap(lerp(3, 6, d), lerp(80, 160, d)), 'thorn gaps'],
      movers:  [(d) => s.movers(lerp(3, 5, d), d > 0.5), 'moving platforms'],
      ice:     [(d) => s.ice(lerp(450, 700, d), lerp(260, 360, d)), 'a slippery slide'],
      gorge:   [() => s.gorge(), 'the pad gorge'],
      bounce:  [(d) => s.bounceUp(lerp(220, 420, d)), 'bounce pads'],
      drop:    [(d) => s.drop(lerp(200, 250, d)), 'a big drop'],
      walls:   [(d) => s.walls(lerp(3, 4, d), lerp(90, 120, d)), 'tall walls'],
      tower:   [(d) => s.tower(lerp(5, 8, d)), 'a tall tower finish'],
      tunnel:  [() => s.tunnel(), 'a low tunnel finish'],
    };
    const POOL = {
      meadow: ['hills', 'pond', 'stones', 'walls', 'bounce', 'descend', 'climb'],
      desert: ['hills', 'climb', 'descend', 'gap', 'stones', 'pond', 'drop'],
      snow:   ['ice', 'walls', 'gap', 'movers', 'bounce', 'hills', 'drop'],
      sunset: ['gorge', 'movers', 'hills', 'drop', 'walls', 'climb', 'bounce'],
      night:  ['stones', 'pond', 'walls', 'gap', 'movers', 'bounce', 'hills'],
      candy:  ['climb', 'walls', 'bounce', 'ice', 'stones', 'hills', 'movers'],
      lava:   ['gap', 'movers', 'walls', 'gorge', 'ice', 'drop', 'climb'],
    };
    const FINISH = { meadow: 'tower', desert: 'tower', snow: 'tower', sunset: 'tower', night: 'tunnel', candy: 'tower', lava: 'tower' };
    const ADJ = {
      meadow: ['Sunny', 'Breezy', 'Clover', 'Daisy', 'Buttercup', 'Honeyed', 'Mossy', 'Dewy', 'Lazy', 'Golden'],
      desert: ['Dusty', 'Scorched', 'Mirage', 'Camel', 'Sandy', 'Parched', 'Sunbaked', 'Dune', 'Canyon', 'Saffron'],
      snow:   ['Frozen', 'Snowy', 'Icy', 'Chilly', 'Frosty', 'Crystal', 'Penguin', 'Blizzard', 'Glacial', 'Mittened'],
      sunset: ['Amber', 'Crimson', 'Rusty', 'Dusky', 'Glowing', 'Ember', 'Twilight', 'Copper', 'Peach', 'Rosy'],
      night:  ['Moonlit', 'Starry', 'Hooting', 'Midnight', 'Shadowy', 'Cosmic', 'Spooky', 'Silent', 'Foggy', 'Owlish'],
      candy:  ['Sugary', 'Gummy', 'Minty', 'Sprinkled', 'Caramel', 'Fudgy', 'Jelly', 'Syrupy', 'Frosted', 'Sherbet'],
      lava:   ['Molten', 'Smoky', 'Fiery', 'Cinder', 'Volcanic', 'Blazing', 'Magma', 'Ashen', 'Sizzling', 'Scorching'],
    };
    const NOUN = ['Run', 'Dash', 'Trek', 'Hop', 'Stroll', 'Gauntlet', 'Rush', 'Ramble', 'Scramble', 'Marathon', 'Waddle', 'Sprint', 'Passage', 'Path', 'Crossing', 'Jaunt'];
    const themes = ['meadow', 'desert', 'snow', 'sunset', 'night', 'candy', 'lava'];
    themes.forEach((th, w) => {
      let prev = '';
      for (let j = 0; j < 10; j++) {
        const d = Math.min(1, 0.15 + j * 0.085 + w * 0.02);          // each world ramps up; later worlds start a little harder
        const count = Math.min(6, 2 + Math.floor((j + 1) / 2.5));        // 2 .. 6 sections before the finish
        const picks = [];
        for (let k = 0; k < count; k++) {
          let key; let guard = 0;
          do { key = POOL[th][Math.floor(R() * POOL[th].length)]; } while ((key === prev || (picks.length && key === picks[picks.length - 1])) && ++guard < 20);
          picks.push(key); prev = key;
        }
        const fin = (j >= 3 && (j % 2 === 1 || j === 9)) ? FINISH[th] : null;   // some levels end in a tower/tunnel
        const names = picks.concat(fin ? [fin] : []);
        const secs = names.map((k) => SEC[k][0](d));
        const hint = 'Features ' + names.map((k) => SEC[k][1]).slice(0, 3).join(', ') + (names.length > 3 ? ' and more.' : '.');
        const name = ADJ[th][j] + ' ' + NOUN[Math.floor(R() * NOUN.length)];
        D(name, hint, th, secs);
      }
    });
  })();


  // ------------------------------------------------------------------ bonus bonus: weather & waves (indices 103+)
  // level.weather = { wind: gust acceleration, per: seconds per gust cycle, waves: wave height px, waveK: wave push, rain, snow, storm }
  LEVELS.weather = LEVELS.length;
  const W = (name, hint, theme, weather, secs) => { const lv = compose(name, hint, theme, secs); lv.weather = weather; LEVELS.push(lv); };
  W('Choppy Pond', 'Waves! The water shoves your neck around. Keep swimming.', 'meadow', { waves: 4, waveK: 220 }, [s.hills(2, 70), s.pond(500), s.stones(5), s.pond(350)]);
  W('Breezy Hills', 'Wind gusts blow your neck sideways. Watch the arrow.', 'meadow', { wind: 380, per: 7 }, [s.hills(4, 100), s.walls(3, 100), s.hills(2, 80)]);
  W('Drizzle Dash', 'Rain makes the ground slippery. Brake early.', 'meadow', { rain: true }, [s.hills(3, 80), s.stones(5), s.walls(3, 100)]);
  W('Tidal Tumble', 'Big swells over a long swim.', 'sunset', { waves: 7, waveK: 300 }, [s.pond(500), s.walls(3, 110), s.stones(6), s.pond(500)]);
  W('Gale Gap', 'Thorn gaps and a howling wind. Time your hops.', 'desert', { wind: 520, per: 6 }, [s.gap(3, 90), s.hills(2, 70), s.gap(4, 110)]);
  W('Slip and Slide', 'Ice, a crosswind and a long skate.', 'snow', { wind: 300, per: 8 }, [s.ice(500, 280), s.hills(2, 60), s.ice(600, 320)]);
  W('Thunder Climb', 'Rain, wind and lightning. Run from the yellow ring!', 'night', { rain: true, wind: 350, per: 7, storm: true, lightning: 9 }, [s.climb(4, 85), s.walls(3, 110), s.tower(6)]);
  W('Stormy Seas', 'Rain, swells and stepping stones. Hold on.', 'night', { rain: true, waves: 8, waveK: 380, storm: true, lightning: 10 }, [s.stones(8), s.pond(500), s.stones(6)]);
  W('Blizzard Run', 'A whiteout! You can only see near yourself. Snow, gusts and ice.', 'snow', { snow: true, wind: 450, per: 6, whiteout: true }, [s.ice(700), s.walls(3, 100), s.ice(600, 300)]);
  W('Hurricane Tower', 'A mighty wind, then a climb.', 'sunset', { wind: 700, per: 5.5 }, [s.climb(4, 85), s.walls(3, 110), s.tower(5)]);
  W('Storm Chaser', 'Rain, wind and waves, then a floating finish.', 'night', { rain: true, wind: 420, per: 6, waves: 6, waveK: 300, storm: true, lightning: 8 }, [s.pond(400), s.gap(3, 100), s.movers(3), s.tower(6)]);
  W('The Great Tempest', 'Every kind of weather, one big finale.', 'lava', { rain: true, wind: 600, per: 5.5, waves: 8, waveK: 380, storm: true, lightning: 7, hail: true }, [s.hills(3, 90), s.pond(500), s.ice(500, 280), s.gorge(), s.movers(4, true), s.tower(7)]);

  W('Hailstorm Hill', 'Hailstones fall from the sky! Look up and dodge them.', 'meadow', { rain: true, storm: true, hail: true }, [s.hills(4, 90), s.walls(3, 100), s.stones(5), s.hills(2, 70)]);
  W('Lightning Rod', 'Lightning picks a spot near you. Leave the ring before it strikes.', 'night', { rain: true, storm: true, lightning: 6.5, wind: 300, per: 8 }, [s.hills(3, 80), s.gap(3, 110), s.walls(3, 110), s.hills(2, 70)]);
  W('Whiteout Pass', 'A blizzard so thick you can barely see. Follow the ice.', 'snow', { snow: true, whiteout: true, wind: 420, per: 6 }, [s.hills(3, 70), s.ice(600, 300), s.gap(3, 100), s.ice(500)]);
  W('Typhoon Bay', 'Huge waves, wind and lightning over the water.', 'sunset', { rain: true, storm: true, waves: 10, waveK: 420, wind: 450, per: 6, lightning: 8 }, [s.pond(500), s.stones(6), s.pond(450), s.walls(3, 100)]);
  W('Frozen Barrage', 'Hail and a bitter wind over slippery ice.', 'snow', { snow: true, hail: true, wind: 480, per: 6 }, [s.ice(600, 280), s.walls(3, 100), s.ice(700), s.climb(3, 80)]);
  W('Dust Devil', 'A fierce desert gale: hop the thorn gaps between the gusts.', 'desert', { wind: 700, per: 4.5 }, [s.hills(3, 80), s.gap(4, 120), s.walls(3, 110), s.gap(4, 130)]);
  W('Cyclone Summit', 'Wind, lightning and hail on the mountain top.', 'lava', { storm: true, wind: 650, per: 5, lightning: 7.5, hail: true }, [s.climb(4, 85), s.walls(3, 110), s.hills(2, 80), s.tower(6)]);
  W('Apocalypse Gale', 'EVERYTHING: wind, waves, hail, lightning and rain. Good luck.', 'night', { rain: true, storm: true, wind: 700, per: 5, waves: 9, waveK: 400, lightning: 6, hail: true }, [s.hills(3, 90), s.pond(500), s.gap(3, 110), s.stones(6), s.movers(3), s.tower(6)]);


  // ------------------------------------------------------------------ bonus x3: MEGA WORLDS (indices tier3+): long levels, new mechanics, new environments
  LEVELS.tier3 = LEVELS.length;
  const M = (name, hint, theme, weather, secs) => { const lv = compose(name, hint, theme, secs); if (weather) lv.weather = weather; lv.mega = true; LEVELS.push(lv); };
  // world 1: sky islands (fans, crumbling clouds)
  M('Cloud Hopper', 'Ride the fan columns up, then hop the crumbling clouds. Do not stand still!', 'sky', null, [s.hills(3, 70), s.fans(3), s.crumble(5), s.hills(2, 60), s.fans(2), s.crumble(6), s.saws(2), s.tower(6)]);
  M('Gust Isles', 'Fans, crumbling clouds and gusts of wind. Mind the blades.', 'sky', { wind: 420, per: 7 }, [s.crumble(5), s.hills(3, 80), s.fans(4), s.saws(3), s.crumble(7), s.movers(4), s.fans(2), s.tower(7)]);
  M('Thunder Isles', 'A storm over the sky islands: rain, wind and everything crumbles.', 'sky', { rain: true, wind: 380, per: 6.5, storm: true }, [s.fans(3), s.crumble(6), s.saws(4), s.walls(3, 110), s.fans(4), s.movers(4, true), s.crumble(8), s.fans(2), s.tower(8)]);
  // world 2: jungle ruins (saws, gates, rivers)
  M('Vine Valley', 'Blades in the jungle, a swim and a locked gate. Find the button!', 'jungle', null, [s.hills(4, 90), s.saws(3), s.pond(500), s.gates(), s.stones(6), s.saws(4), s.crumble(6), s.hills(2, 80), s.tower(6)]);
  M('Monsoon Ruins', 'Heavy rain, rough rivers and spinning blades.', 'jungle', { rain: true, waves: 6, waveK: 300, storm: true }, [s.pond(500), s.stones(7), s.saws(4), s.gates(), s.pond(450), s.crumble(7), s.climb(4, 85), s.saws(3), s.tower(7)]);
  M('Temple Trials', 'Gates, blades and crumbling bridges. The old temple tests everything.', 'jungle', null, [s.gates(), s.saws(5), s.crumble(8), s.walls(4, 120), s.gates(), s.movers(5, true), s.gap(5, 150), s.saws(4), s.tower(8)]);
  // world 3: crystal caverns (portals, gates)
  M('Glow Grotto', 'Wide pits, glowing portals. Step in to hop across.', 'cavern', null, [s.hills(3, 70), s.portals(2), s.crumble(5), s.saws(3), s.portals(3), s.gap(4, 120), s.gates(), s.tower(6)]);
  M('Mirror Maze', 'Portals everywhere, blades at the exits.', 'cavern', null, [s.portals(4), s.gates(), s.saws(5), s.crumble(7), s.portals(3), s.movers(4, true), s.saws(4), s.tower(7)]);
  M('Crystal Blizzard', 'Snow, wind, ice and portals.', 'cavern', { snow: true, wind: 450, per: 6 }, [s.ice(700), s.portals(3), s.crumble(6), s.gates(), s.saws(4), s.ice(600, 300), s.portals(2), s.tower(8)]);
  // world 4: clockwork factory (conveyors, saws, gates)
  M('Gear Gallery', 'Conveyor belts over thorns. Run against the flow!', 'factory', null, [s.belts(4), s.saws(3), s.gates(), s.belts(5), s.crumble(5), s.movers(4), s.belts(4), s.tower(6)]);
  M('Conveyor Chaos', 'Longer belts, faster blades.', 'factory', null, [s.belts(6), s.saws(5), s.belts(6), s.gates(), s.movers(5, true), s.saws(4), s.belts(5), s.tower(7)]);
  M('Rusty Gale', 'The factory roof in a gale. Rain and wind blow you off the belts.', 'factory', { rain: true, wind: 520, per: 6, storm: true }, [s.belts(5), s.saws(5), s.fans(3), s.belts(6), s.gates(), s.crumble(8), s.fans(2), s.tower(8)]);
  // world 5: cosmic orbit (gravity)
  M('Moon Walk', 'Low gravity! Jump much further. Then float up the pink column.', 'space', null, [s.lowgrav(1100), s.antigrav(420), s.lowgrav(1400), s.gap(4, 140), s.tower(6)]);
  M('Star Station', 'Low gravity, portals and anti-gravity lifts.', 'space', null, [s.lowgrav(1000), s.portals(3), s.antigrav(460), s.saws(4), s.belts(4), s.gates(), s.lowgrav(1300), s.tower(7)]);
  M('Event Horizon', 'The final mega level: everything, in space, in a storm of cosmic wind.', 'space', { wind: 500, per: 6 }, [s.antigrav(380), s.lowgrav(1200), s.portals(4), s.crumble(8), s.saws(6), s.belts(5), s.fans(4), s.gates(), s.antigrav(500), s.movers(5, true), s.tower(8)]);

  // world 6-10: second lap, harder and with storms
  M('Zephyr Heights', 'High winds up in the clouds: fans, crumbling paths and spinning blades.', 'sky', { wind: 480, per: 6 }, [s.fans(3), s.crumble(6), s.saws(4), s.movers(4, true), s.fans(3), s.crumble(8), s.tower(7)]);
  M('Aurora Reach', 'A calm night above the clouds, but every platform falls.', 'sky', null, [s.crumble(7), s.fans(2), s.crumble(8), s.antigrav(420), s.saws(4), s.crumble(8), s.tower(8)]);
  M('Skyfall', 'Lightning and gales over the sky islands.', 'sky', { rain: true, wind: 450, per: 6, storm: true, lightning: 9 }, [s.fans(4), s.crumble(7), s.saws(5), s.fans(3), s.movers(5, true), s.crumble(8), s.tower(8)]);
  M('Canopy Crossing', 'Rope-bridge blades, a river swim and a locked gate.', 'jungle', null, [s.hills(3, 90), s.saws(4), s.pond(500), s.gates(), s.crumble(7), s.saws(5), s.stones(7), s.tower(7)]);
  M('Poison Pools', 'Rough water and blades in the deep jungle.', 'jungle', { rain: true, waves: 7, waveK: 320, storm: true }, [s.pond(500), s.saws(4), s.stones(8), s.gates(), s.pond(500), s.crumble(7), s.saws(4), s.tower(7)]);
  M('Jaguar Gate', 'Three gates, many blades, and crumbling bridges between them.', 'jungle', null, [s.gates(), s.crumble(7), s.saws(5), s.gates(), s.movers(5, true), s.walls(4, 120), s.gates(), s.tower(8)]);
  M('Echo Chambers', 'Portals, wide pits and an icy wind.', 'cavern', { wind: 400, per: 7 }, [s.portals(3), s.crumble(6), s.saws(4), s.portals(3), s.gap(5, 140), s.gates(), s.tower(7)]);
  M('Prism Pass', 'Portals and conveyor belts through glittering rock.', 'cavern', null, [s.portals(4), s.belts(5), s.gates(), s.saws(5), s.portals(3), s.movers(5, true), s.tower(8)]);
  M('Geode Gauntlet', 'Everything the caves have: portals, blades, gates and a blizzard.', 'cavern', { snow: true, wind: 480, per: 6, whiteout: true }, [s.ice(700), s.portals(3), s.gates(), s.saws(5), s.crumble(8), s.portals(4), s.ice(600, 300), s.tower(8)]);
  M('Boiler Room', 'Fast belts and bobbing blades over thorns.', 'factory', null, [s.belts(6), s.saws(5), s.gates(), s.belts(6), s.crumble(7), s.saws(5), s.belts(5), s.tower(7)]);
  M('Assembly Line', 'Belts, gates and fan lifts. Mind the gaps.', 'factory', null, [s.belts(5), s.fans(3), s.gates(), s.belts(7), s.movers(5, true), s.saws(6), s.fans(3), s.tower(8)]);
  M('Overclocked', 'A storm on the factory roof. Everything is faster and slipperier.', 'factory', { rain: true, wind: 560, per: 5.5, storm: true, lightning: 8 }, [s.belts(7), s.saws(6), s.fans(3), s.belts(6), s.gates(), s.crumble(8), s.saws(5), s.tower(8)]);
  M('Asteroid Alley', 'Low gravity, anti-gravity columns and blades in orbit.', 'space', null, [s.lowgrav(1200), s.antigrav(460), s.saws(5), s.lowgrav(1500), s.portals(3), s.antigrav(500), s.tower(7)]);
  M('Nebula Run', 'Gravity games with belts, gates and solar wind.', 'space', { wind: 520, per: 6 }, [s.lowgrav(1100), s.belts(5), s.antigrav(480), s.gates(), s.crumble(8), s.lowgrav(1400), s.portals(4), s.tower(8)]);
  M('Big Bang', 'The very last Mega level. Everything, in space, in a cosmic storm.', 'space', { wind: 560, per: 5.5, storm: true, lightning: 8, hail: true }, [s.antigrav(420), s.lowgrav(1300), s.portals(4), s.crumble(9), s.saws(6), s.belts(6), s.fans(4), s.gates(), s.antigrav(520), s.movers(5, true), s.saws(5), s.tower(8)]);

  // ------------------------------------------------------------------ bonus x4: DEEP SEA (completely underwater)
  LEVELS.sea = LEVELS.length;
  const D2 = (name, hint, secs, o) => { const lv = composeSea(name, hint, secs, o); LEVELS.push(lv); };
  D2('Shallow Reef', 'The whole level is underwater! Tap FLAP to swim up; you sink slowly.', [S.slalom(3), S.current(700, 1), S.slalom(3)]);
  D2('Kelp Forest', 'Weave between the rocks. Jellyfish drift about: swim around them!', [S.slalom(4), S.flat(500), S.current(800, 1), S.cave(700)]);
  D2('Sandy Drift', 'Ride the current forwards, then fight it backwards.', [S.current(900, 1), S.slalom(4), S.current(900, -1), S.flat(400)]);
  D2('Jellyfish Fields', 'Dozens of jellyfish. They sting! Keep your distance.', [S.flat(1200), S.slalom(3), S.flat(1100), S.current(700, 1)], { dense: 1.5 });
  D2('Sunken Ship', 'A low cave, a deep trench, then more rocks.', [S.cave(900), S.trench(300), S.slalom(5), S.cave(800)]);
  D2('Whirl Run', 'Currents both ways, with spinning propellers.', [S.current(1000, -1), S.saws(3), S.current(1000, 1), S.slalom(5)]);
  D2('Shark Alley', 'Sharks sweep the open water. Watch for their fins, then swim behind them.', [S.flat(1500), S.cave(900), S.slalom(5), S.flat(1100)], { dense: 1.4 });
  D2('Midnight Zone', 'No light down here except your lantern.', [S.slalom(4), S.cave(800), S.current(900, 1), S.trench(350), S.slalom(4)], { dark: true });
  D2('Coral Gates', 'Find the button to open each gate, between the propellers.', [S.gates(), S.slalom(5), S.saws(4), S.cave(900), S.gates()]);
  D2('The Abyss', 'The deepest, darkest level. Everything lives here.', [S.cave(900), S.slalom(6), S.current(1000, -1), S.saws(4), S.trench(400), S.cave(1000), S.slalom(5)], { dark: true, dense: 1.3 });

  // ------------------------------------------------------------------ dedicated multiplayer race tracks
  const RACE = [];
  LEVELS.race = RACE;
  const T = (name, hint, theme, secs) => RACE.push(compose(name, hint, theme, secs));
  T('Sprint Straight', 'Mostly flat and fast. Grab the pads.', 'meadow', [s.hills(3, 60), s.bounceUp(260), s.hills(3, 70), s.stones(4)]);
  T('Thorn Dash', 'Thorn gaps all the way.', 'desert', [s.gap(3, 90), s.hills(2, 70), s.gap(4, 120), s.walls(3, 100)]);
  T('Ice Run', 'Slide, brake, slide again.', 'snow', [s.ice(500, 280), s.hills(2, 60), s.ice(600, 320)]);
  T('Pond Chase', 'Swim, hop, swim.', 'meadow', [s.pond(400), s.stones(5), s.pond(350), s.hills(2, 70)]);
  T('Moving Maze', 'Hop the platforms before they hop away.', 'sunset', [s.movers(3), s.hills(2, 70), s.movers(4, true)]);
  T('Sky Climb', 'Bounce up and climb the tower.', 'night', [s.bounceUp(320), s.walls(3, 100), s.tower(6)]);
  T('Candy Cannon', 'Climbs, walls and a sugary tower.', 'candy', [s.climb(4, 80), s.walls(3, 110), s.bounceUp(300), s.tower(6)]);
  T('Lava Sprint', 'Short but nasty.', 'lava', [s.gap(4, 130), s.movers(4, true), s.walls(3, 110)]);

  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;
  else root.Levels = LEVELS;
})(typeof window !== 'undefined' ? window : globalThis);
