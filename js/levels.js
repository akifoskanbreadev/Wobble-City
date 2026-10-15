/*
 * Levels. World pixels, 100 px = 1 m, y points down.
 *   solids: [x, y, w, h]      static boxes
 *   water:  [x, surfaceY, w, h]  swimmable (goose floats; neck and legs get dragged)
 *   Fall below deathY and you respawn at the last checkpoint.
 * Goal: touch the golden egg with your HEAD. The body doesn't count.
 */
(function (root) {
  'use strict';
  const G = 520;

  const LEVELS = [
    {
      name: 'Duck Pond Stroll',
      hint: 'Walk right. Swim the pond. Touch the golden egg with your HEAD.',
      spawn: [60, G - 45], deathY: 1100,
      solids: [
        [-400, G, 1250, 700],
        [330, G - 30, 70, 30],
        [600, G - 55, 90, 55],
        [850, G + 50, 520, 650],      // pond bed
        [1370, G, 1600, 700],
      ],
      water: [[850, G - 15, 520, 100]],
      checkpoints: [[1400, G - 45]],
      bread: [[260, G - 70], [640, G - 130], [1000, G - 60], [1200, G - 60], [1700, G - 70], [2100, G - 70]],
      egg: [2600, G - 28],
    },
    {
      name: 'Puddle Hop',
      hint: 'Tap FLAP in mid-air to cross gaps. Hold FLAP to glide. Stamina refills on the ground.',
      spawn: [60, G - 45], deathY: 1000,
      solids: [
        [-400, G, 1000, 700],
        [790, G, 480, 700],
        [1500, G, 400, 700],
        [2200, G, 1100, 700],
      ],
      checkpoints: [[800, G - 45], [1510, G - 45], [2210, G - 45]],
      bread: [[700, G - 160], [1380, G - 190], [2050, G - 220], [1000, G - 60], [1700, G - 60]],
      egg: [3000, G - 28],
    },
    {
      name: 'Up The Bank',
      hint: 'Flap up the muddy steps. Chain flaps before you run out.',
      spawn: [60, G - 45], deathY: 1000,
      solids: [
        [-400, G, 1000, 700],
        [620, G - 80, 300, 700],
        [920, G - 160, 280, 800],
        [1200, G - 240, 280, 900],
        [1480, G - 320, 900, 1000],
      ],
      checkpoints: [[640, G - 125], [940, G - 205], [1220, G - 285]],
      bread: [[520, G - 130], [780, G - 210], [1060, G - 290], [1340, G - 370], [1800, G - 370]],
      egg: [2200, G - 348],
    },
    {
      name: 'The Tunnel',
      hint: 'You can\'t fit in. Hold the NECK pad and aim straight in. Your neck will do the rest, badly.',
      spawn: [60, G - 45], deathY: 1000,
      solids: [
        [-400, G, 1500, 700],
        [900, G - 52 - 120, 260, 120],    // slab: gap of 52 px above the floor
        [1100, G - 172, 60, 172],         // back wall of the tunnel
      ],
      checkpoints: [],
      bread: [[400, G - 80], [700, G - 80], [880, G - 60]],
      egg: [965, G - 24],
    },
    {
      name: 'Wobble Bridge',
      hint: 'Rising islands. Chain flaps, glide, and try not to swing your head into things.',
      spawn: [60, G - 45], deathY: 1100,
      solids: [
        [-400, G, 800, 700],
        [620, G - 40, 220, 800],
        [1060, G - 110, 200, 900],
        [1480, G - 190, 180, 1000],
        [1880, G - 270, 180, 1100],
        [2280, G - 190, 160, 1000],
        [2660, G - 280, 760, 1100],
      ],
      checkpoints: [[630, G - 85], [1070, G - 155], [1490, G - 235], [1890, G - 315], [2670, G - 325]],
      bread: [[510, G - 190], [950, G - 250], [1370, G - 300], [1770, G - 380], [2160, G - 340], [2550, G - 380]],
      egg: [3200, G - 308],
    },
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;
  else root.Levels = LEVELS;
})(typeof window !== 'undefined' ? window : globalThis);
