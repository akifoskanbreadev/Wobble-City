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
      bread: [[360, G - 120], [640, G - 130], [1000, G - 170], [1250, G - 100], [1660, G - 40], [2150, G - 70], [2480, G - 150]],
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

  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;
  else root.Levels = LEVELS;
})(typeof window !== 'undefined' ? window : globalThis);
