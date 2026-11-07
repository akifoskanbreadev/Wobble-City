/*
 * Goose Rounds: a 4-player duel game in the style of "Rounds". Geese shoot each other on a small arena;
 * last goose standing wins the round. Everyone except the round winner then picks one of three power-up cards,
 * so the geese get stranger every round. First to the target score wins the match.
 *
 * The host runs the simulation (players + bots) and sends snapshots; guests send their inputs and card picks.
 * Messages travel through MP as { t:'r', d:{...} } (see mp.js: rsend = guest to host, rall = host to everyone).
 * Solo: the "Goose Rounds" button on the main menu plays against 3 bots.
 */
(function (root) {
  'use strict';
  const W = 960, H = 540, STEP = 1 / 60;
  const COL = ['#ff5a5a', '#4a9eff', '#5ad86a', '#ffd23f'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---- arenas: [x, y, w, h] solid boxes. spawns for up to 4 geese. pit = no floor in the middle (fall = out).
  const MAPS = [
    { name: 'Meadow Mound', bg: ['#9fd8ff', '#e8f7d0'], solids: [[0, 500, 960, 40], [300, 380, 360, 24], [80, 290, 170, 22], [710, 290, 170, 22], [390, 200, 180, 22]], sp: [[100, 440], [860, 440], [200, 240], [760, 240]] },
    { name: 'Twin Towers', bg: ['#ffd9a8', '#ffeed0'], solids: [[0, 500, 960, 40], [150, 330, 40, 170], [770, 330, 40, 170], [300, 260, 360, 22], [60, 200, 140, 20], [760, 200, 140, 20]], sp: [[80, 440], [880, 440], [100, 150], [860, 150]] },
    { name: 'The Gap', bg: ['#b8a8ff', '#e8e0ff'], pit: true, solids: [[0, 480, 330, 60], [630, 480, 330, 60], [380, 380, 200, 20], [120, 300, 170, 20], [670, 300, 170, 20], [400, 220, 160, 20]], sp: [[100, 420], [860, 420], [180, 240], [780, 240]] },
    { name: 'Staircase', bg: ['#a8f0d0', '#e0ffe8'], solids: [[0, 500, 960, 40], [0, 430, 150, 70], [150, 360, 150, 140], [300, 290, 130, 24], [530, 290, 130, 24], [660, 360, 150, 140], [810, 430, 150, 70], [390, 190, 180, 22]], sp: [[60, 380], [900, 380], [220, 300], [740, 300]] },
    { name: 'Floating Islands', bg: ['#7ab8ff', '#cfe8ff'], pit: true, solids: [[60, 440, 220, 24], [680, 440, 220, 24], [370, 400, 220, 24], [180, 290, 160, 20], [620, 290, 160, 20], [400, 180, 160, 20]], sp: [[120, 380], [800, 380], [440, 340], [240, 230]] },
    { name: 'Pillar Pit', bg: ['#ffb8a8', '#ffe8d8'], pit: true, solids: [[0, 480, 200, 60], [760, 480, 200, 60], [300, 420, 40, 120], [620, 420, 40, 120], [400, 330, 160, 20], [100, 250, 150, 20], [710, 250, 150, 20]], sp: [[90, 420], [870, 420], [170, 190], [790, 190]] },
    { name: 'Sky Ladder', bg: ['#8ad0ff', '#f0f8ff'], solids: [[0, 500, 960, 40], [120, 420, 160, 20], [680, 420, 160, 20], [300, 340, 140, 20], [520, 340, 140, 20], [120, 260, 160, 20], [680, 260, 160, 20], [400, 180, 160, 20]], sp: [[80, 440], [880, 440], [200, 200], [760, 200]] },
    { name: 'Mushroom Grove', bg: ['#b8e0a0', '#f0ffd8'], solids: [[0, 500, 960, 40], [200, 400, 60, 100], [700, 400, 60, 100], [140, 380, 180, 22], [640, 380, 180, 22], [380, 300, 200, 22], [430, 180, 100, 20]], sp: [[80, 440], [880, 440], [170, 320], [730, 320]] },
    { name: 'Skyscrapers', bg: ['#a0b8e8', '#e8f0ff'], pit: true, solids: [[0, 420, 200, 120], [300, 360, 120, 180], [540, 300, 120, 240], [760, 400, 200, 140], [220, 240, 100, 20], [700, 200, 120, 20]], sp: [[90, 360], [860, 340], [360, 300], [600, 240]] },
    { name: 'The Bridge', bg: ['#ffc8a0', '#fff0e0'], pit: true, solids: [[0, 480, 260, 60], [700, 480, 260, 60], [260, 400, 440, 20], [380, 300, 200, 20], [100, 300, 120, 20], [740, 300, 120, 20]], sp: [[80, 420], [880, 420], [160, 240], [800, 240]] },
    { name: 'Zigzag', bg: ['#e0b8ff', '#f8e8ff'], solids: [[0, 500, 960, 40], [100, 420, 200, 20], [660, 340, 200, 20], [100, 260, 200, 20], [660, 180, 200, 20], [380, 300, 200, 20]], sp: [[60, 440], [900, 440], [200, 200], [760, 120]] },
    { name: 'The Cage', bg: ['#c8c8d8', '#eeeef4'], solids: [[0, 500, 960, 40], [200, 380, 20, 120], [740, 380, 20, 120], [200, 360, 220, 20], [540, 360, 220, 20], [400, 230, 160, 20], [60, 250, 120, 20], [780, 250, 120, 20]], sp: [[100, 440], [860, 440], [300, 300], [660, 300]] },
  ];

  // ---- cards: each tweaks a goose's stats
  const BASE = () => ({ dmg: 22, bspd: 720, br: 5, bounce: 0, shots: 1, spread: 0, rate: 1, hp: 100, move: 1, jump: 1, air: 0, vamp: 0, blast: 0, home: 0, shield: 0, dot: 0, size: 1, grav: 1, kb: 1, regen: 0, pierce: 0, revive: 0, thorns: 0 });
  const CARDS = {
    big:    { icon: '🔴', name: 'Big Bullets', desc: 'Bigger, harder-hitting, slower shots.', f: (s) => { s.dmg *= 1.5; s.br *= 1.6; s.bspd *= 0.8; s.rate *= 0.85; } },
    quick:  { icon: '⚡', name: 'Quick Draw', desc: 'Shoot much faster.', f: (s) => { s.rate *= 1.5; s.bspd *= 1.15; } },
    bounce: { icon: '🏀', name: 'Bouncy Bullets', desc: 'Bullets bounce 3 times.', f: (s) => { s.bounce += 3; s.dmg *= 0.9; } },
    triple: { icon: '🔱', name: 'Triple Shot', desc: '3 bullets per shot, weaker each.', f: (s) => { s.shots += 2; s.spread = 0.24; s.dmg *= 0.62; s.rate *= 0.85; } },
    mach:   { icon: '🔫', name: 'Machine Goose', desc: 'Spray bullets very fast. Less accurate.', f: (s) => { s.rate *= 2.2; s.dmg *= 0.5; s.spread = Math.max(s.spread, 0.1); } },
    tank:   { icon: '🛡️', name: 'Tank', desc: '+80% health, bigger and slower.', f: (s) => { s.hp *= 1.8; s.size *= 1.25; s.move *= 0.88; } },
    glass:  { icon: '💥', name: 'Glass Cannon', desc: 'Nearly double damage, 40% less health.', f: (s) => { s.dmg *= 1.9; s.hp *= 0.6; } },
    eggs:   { icon: '🥚', name: 'Fresh Eggs', desc: '+40% health and slow regeneration.', f: (s) => { s.hp *= 1.4; s.regen += 3; } },
    spring: { icon: '🦘', name: 'Springs', desc: 'Jump higher and one extra air jump.', f: (s) => { s.jump *= 1.18; s.air += 1; } },
    zoom:   { icon: '👟', name: 'Zoomies', desc: 'Run 35% faster.', f: (s) => { s.move *= 1.35; } },
    vamp:   { icon: '🧛', name: 'Vampire', desc: 'Heal for half of the damage you deal.', f: (s) => { s.vamp += 0.5; } },
    boom:   { icon: '💣', name: 'Explosive', desc: 'Bullets explode, hurting nearby geese.', f: (s) => { s.blast += 70; s.dmg *= 0.85; } },
    home:   { icon: '🎯', name: 'Homing', desc: 'Bullets steer towards enemies.', f: (s) => { s.home += 1; s.bspd *= 0.9; } },
    shield: { icon: '🔰', name: 'Bread Shield', desc: 'Block the first hit every round.', f: (s) => { s.shield += 1; } },
    poison: { icon: '☠️', name: 'Poison', desc: 'Hits poison for 8 damage a second, 3 s.', f: (s) => { s.dot += 8; s.dmg *= 0.8; } },
    float:  { icon: '🎈', name: 'Float', desc: 'Lower gravity: floaty jumps.', f: (s) => { s.grav *= 0.62; } },
    knock:  { icon: '🥊', name: 'Knockback', desc: 'Your bullets shove geese far away.', f: (s) => { s.kb *= 2.6; } },
    sniper: { icon: '🔭', name: 'Sniper', desc: 'Fast, strong, slow-firing shots.', f: (s) => { s.bspd *= 1.8; s.dmg *= 1.5; s.rate *= 0.6; } },
    tiny:   { icon: '🐣', name: 'Tiny Goose', desc: 'Smaller and quicker, 20% less health.', f: (s) => { s.size *= 0.72; s.move *= 1.12; s.hp *= 0.8; } },
  };
  Object.assign(CARDS, {
    pierce: { icon: '🏹', name: 'Piercing', desc: 'Bullets pass through one goose.', f: (s) => { s.pierce += 1; s.dmg *= 0.9; } },
    heavy:  { icon: '🪨', name: 'Heavy Hitters', desc: 'Harder knockback and +25% damage, a bit slower.', f: (s) => { s.dmg *= 1.25; s.kb *= 1.6; s.move *= 0.92; } },
    revive: { icon: '🍀', name: 'Second Wind', desc: 'Come back once per round with 40% health.', f: (s) => { s.revive += 1; } },
    thorns: { icon: '🌵', name: 'Thorns', desc: 'Geese that hit you take 30% of the damage back.', f: (s) => { s.thorns += 0.3; } },
    wings:  { icon: '🪽', name: 'Little Wings', desc: 'Two extra air jumps and floatier falls.', f: (s) => { s.air += 2; s.grav *= 0.9; } },
    sharp:  { icon: '🔎', name: 'Sharpshooter', desc: 'Faster, stronger shots.', f: (s) => { s.bspd *= 1.3; s.dmg *= 1.15; } },
    twin:   { icon: '👯', name: 'Twin Barrels', desc: 'Two bullets per shot.', f: (s) => { s.shots += 1; s.spread = Math.max(s.spread, 0.12); s.dmg *= 0.8; } },
    hop:    { icon: '🥾', name: 'Hop Boots', desc: 'Jump higher and run a bit faster.', f: (s) => { s.jump *= 1.1; s.move *= 1.15; } },
    anchor: { icon: '⚓', name: 'Anchor', desc: '+50% health, heavy gravity, a bit slower.', f: (s) => { s.hp *= 1.5; s.grav *= 1.3; s.move *= 0.9; } },
    rocket: { icon: '🚀', name: 'Rocket Rounds', desc: 'Faster bullets that explode.', f: (s) => { s.blast += 45; s.bspd *= 1.25; s.dmg *= 0.9; } },
    leech:  { icon: '🩸', name: 'Leech', desc: 'Poison hits that also heal you.', f: (s) => { s.vamp += 0.3; s.dot += 5; } },
    fort:   { icon: '🏰', name: 'Fortress', desc: 'A shield, +20% health, a bit slower.', f: (s) => { s.shield += 1; s.hp *= 1.2; s.move *= 0.92; } },
    needle: { icon: '🪡', name: 'Needle Shots', desc: 'Tiny fast bullets that pierce 2 geese.', f: (s) => { s.pierce += 2; s.bspd *= 1.4; s.dmg *= 0.7; s.br *= 0.7; } },
    pinball:{ icon: '🎱', name: 'Pinball', desc: 'Bullets bounce 5 times and move faster.', f: (s) => { s.bounce += 5; s.bspd *= 1.2; s.br *= 0.9; } },
    glide:  { icon: '🪂', name: 'Glider', desc: 'One extra air jump and floaty falls.', f: (s) => { s.air += 1; s.grav *= 0.75; } },
    ruth:   { icon: '😈', name: 'Ruthless', desc: '+35% damage and faster fire, 25% less health.', f: (s) => { s.dmg *= 1.35; s.rate *= 1.2; s.hp *= 0.75; } },
  });
  const CARD_IDS = Object.keys(CARDS);
  const statsOf = (cards) => { const s = BASE(); for (const c of cards) CARDS[c].f(s); return s; };

  // ---- shared state
  let S = null, host = null, running = false, cv = null, cx = null, ui = null, raf = 0, lastT = 0, acc = 0;
  let mine = { mx: 0, jump: 0, ax: 1, ay: 0, fire: 0 }, keys = {}, mouse = { x: 480, y: 270, has: false }, touchAim = null, sendT = 0, lastSent = '';
  let btnAim = null, offerT = 0, sim = null, view = {}, snap = null, offer = null, picked = false, parts = [], shake = 0, au = null;

  const blip = (f, d, type, v) => {
    try {
      au = au || new (root.AudioContext || root.webkitAudioContext)(); const o = au.createOscillator(), g = au.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f, au.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(30, f * 0.4), au.currentTime + d);
      g.gain.setValueAtTime(v || 0.05, au.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, au.currentTime + d); o.connect(g); g.connect(au.destination); o.start(); o.stop(au.currentTime + d);
    } catch (e) { /* no audio */ }
  };

  // ============================================================ the simulation (host only)
  function newSim(opts) {
    const rng = (() => { let a = (opts.seed || 1) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    const pl = opts.players.map((p, i) => ({ id: p.id, slot: i, bot: !!p.bot, cards: [], st: BASE(), score: 0, inp: { mx: 0, jump: 0, ax: 1, ay: 0, fire: 0 }, x: 0, y: 0, vx: 0, vy: 0, hp: 100, alive: true, face: 1, shieldUp: 0, cd: 0, onG: false, coy: 0, airLeft: 0, jh: 0, poison: 0, pOwner: -1, ai: { t: 0, jt: 0, mx: 0, err: 0 }, left: false }));
    const o = { rng, pl, bl: [], ph: 'count', t: 3, rnd: 0, map: 0, target: opts.target || 3, pk: [], offers: {}, winner: -1, pickT: 0, msg: '', endT: 0, ended: false, over: false };
    o.reset = () => { o.rnd++; o.map = (opts.mapOrder ? opts.mapOrder[(o.rnd - 1) % opts.mapOrder.length] : Math.floor(rng() * MAPS.length)); const sp = MAPS[o.map].sp.slice(); for (let i = sp.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sp[i], sp[j]] = [sp[j], sp[i]]; }
      o.pl.forEach((p, i) => { p.st = statsOf(p.cards); p.hp = p.st.hp; p.alive = !p.left; p.x = sp[i % 4][0]; p.y = sp[i % 4][1]; p.vx = p.vy = 0; p.shieldUp = p.st.shield; p.reviveLeft = p.st.revive; p.cd = 0.4; p.poison = 0; p.face = p.x < W / 2 ? 1 : -1; p.air = p.st.air; });
      o.bl = []; o.cr = []; o.crT = 7 + rng() * 4; o.pl.forEach((p) => { p.buffT = 0; p.buffK = ''; }); o.ph = 'count'; o.t = 2.6; o.winner = -1; };
    o.reset(); o.rnd = 1; return o;
  }
  const R = (p) => 20 * p.st.size;
  const CRATES = ['spd', 'rapid', 'big', 'heal', 'shield'], CRATE_ICON = { spd: '👟', rapid: '⚡', big: '🔴', heal: '❤️', shield: '🔰' };

  function collide(p, solids) {
    const r = R(p); p.onG = false; p.wall = 0;
    for (let it = 0; it < 3; it++) for (const s of solids) {
      const nx = clamp(p.x, s[0], s[0] + s[2]), ny = clamp(p.y, s[1], s[1] + s[3]); let dx = p.x - nx, dy = p.y - ny, d = Math.hypot(dx, dy);
      if (d < r) {
        if (d < 0.001) { dx = 0; dy = -1; d = 1; const pu = p.y - s[1], pd = s[1] + s[3] - p.y; if (pd < pu) dy = 1; }
        const px = dx / d, py = dy / d; p.x += px * (r - d); p.y += py * (r - d);
        const vn = p.vx * px + p.vy * py; if (vn < 0) { p.vx -= vn * px; p.vy -= vn * py; }
        if (py < -0.5) p.onG = true; else if (Math.abs(px) > 0.7 && Math.abs(py) < 0.6) p.wall = px > 0 ? -1 : 1;   // touching the side of a solid: -1 wall on the left, 1 on the right
      }
    }
  }
  function hurt(o, p, dmg, from, kx, ky) {
    if (!p.alive || o.ph !== 'fight') return;
    if (p.shieldUp > 0) { p.shieldUp--; o.ev.push(['sh', p.x, p.y]); return; }
    p.hp -= dmg; p.vx += kx; p.vy += ky; o.ev.push(['hit', p.x, p.y]);
    const a = o.pl.find((q) => q.id === from); if (a && a.st.vamp) a.hp = Math.min(a.st.hp, a.hp + dmg * a.st.vamp);
    if (p.st.thorns && a && a !== p && a.alive) { a.hp -= dmg * p.st.thorns; if (a.hp <= 0) { a.alive = false; o.ev.push(['die', a.x, a.y, a.slot]); } }
    if (p.hp <= 0 && p.reviveLeft > 0) { p.reviveLeft--; p.hp = p.st.hp * 0.4; p.shieldUp = Math.max(p.shieldUp, 1); o.ev.push(['sh', p.x, p.y]); return; }
    if (p.hp <= 0) { p.alive = false; o.ev.push(['die', p.x, p.y, p.slot]); }
  }
  function shoot(o, p) {
    const st = p.st, base = Math.atan2(p.inp.ay, p.inp.ax);
    for (let k = 0; k < st.shots; k++) {
      const a = base + (st.shots > 1 ? (k - (st.shots - 1) / 2) * st.spread : 0) + (st.shots === 1 ? (o.rng() - 0.5) * st.spread : (o.rng() - 0.5) * 0.04);
      o.bl.push({ x: p.x + Math.cos(a) * (R(p) + 6), y: p.y + Math.sin(a) * (R(p) + 6) - 4, vx: Math.cos(a) * st.bspd, vy: Math.sin(a) * st.bspd, own: p.id, dmg: st.dmg * (p.buffT > 0 && p.buffK === 'big' ? 1.6 : 1), r: st.br * (p.buffT > 0 && p.buffK === 'big' ? 1.4 : 1), bounce: st.bounce, blast: st.blast, home: st.home, dot: st.dot, kb: st.kb, pierce: st.pierce, hits: [], life: 4 });
    }
    p.cd = 0.5 / (st.rate * (p.buffT > 0 && p.buffK === 'rapid' ? 2 : 1)); p.vx -= Math.cos(base) * 40; o.ev.push(['shot', p.x, p.y]);
  }
  function botThink(o, p, dt) {
    const foes = o.pl.filter((q) => q.alive && q !== p); const ai = p.ai; ai.t -= dt; ai.jt -= dt;
    if (!foes.length) { p.inp.mx = 0; p.inp.fire = 0; return; }
    let tg = foes[0], bd = 1e9; for (const q of foes) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; tg = q; } }
    if (ai.t <= 0) { ai.t = 0.35 + o.rng() * 0.6; ai.err = (o.rng() - 0.5) * 0.18; const dir = Math.sign(tg.x - p.x) || 1; ai.mx = bd > 360 ? dir : bd < 160 ? -dir : (o.rng() < 0.5 ? dir : -dir) * (o.rng() < 0.6 ? 1 : 0); }
    if (o.cr && o.cr.length) { let bc = null, bd2 = 1e9; for (const c of o.cr) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd2) { bd2 = d; bc = c; } } if (bc && bd2 < 420 && ai.crate !== false) { ai.mx = Math.abs(bc.x - p.x) < 8 ? 0 : Math.sign(bc.x - p.x); if (bc.y < p.y - 30 && p.onG && ai.jt <= 0) { p.inp.jump = 1; ai.jt = 0.5; } } }
    p.inp.mx = ai.mx;
    const lead = bd / p.st.bspd, tx = tg.x + tg.vx * lead * 0.6, ty = tg.y + tg.vy * lead * 0.3 - 4 - 0.5 * 600 * lead * lead * 0 ;
    let a = Math.atan2(ty - p.y, tx - p.x) + ai.err; if (p.st.bspd < 900) a -= Math.min(0.18, bd / 5000);
    p.inp.ax = Math.cos(a); p.inp.ay = Math.sin(a);
    p.inp.fire = o.ph === 'fight' && bd < 620 && o.rng() < 0.97 ? 1 : 0;
    const wantUp = tg.y < p.y - 60 || (p.onG && o.rng() < 0.012);
    if (ai.jt <= 0 && wantUp) { p.inp.jump = 1; ai.jt = 0.5; } else if (ai.jt < 0.38) p.inp.jump = 0;
    if (p.y > H - 10) p.inp.jump = 1;
    // dodge: jump when a bullet is about to hit
    for (const b of o.bl) if (b.own !== p.id && Math.hypot(b.x - p.x, b.y - p.y) < 130 && Math.abs(b.vy) < 400 && ai.jt <= 0 && o.rng() < 0.08) { p.inp.jump = 1; ai.jt = 0.5; }
  }

  function stepSim(o, dt) {
    o.ev = [];
    const map = MAPS[o.map], solids = map.solids;
    if (o.ph === 'count') { o.t -= dt; if (o.t <= 0) { o.ph = 'fight'; o.t = 0; o.ev.push(['go']); } }
    else if (o.ph === 'fight') {
      o.t += dt;
      o.crT -= dt;   // power-up crates: stand on one to grab a short boost
      if (o.crT <= 0) { o.crT = 9 + o.rng() * 5; if (o.cr.length < 2) { const ss = solids.filter((q) => q[2] >= 100), q = ss[Math.floor(o.rng() * ss.length)]; if (q) o.cr.push({ x: q[0] + 30 + o.rng() * (q[2] - 60), y: q[1] - 16, k: CRATES[Math.floor(o.rng() * CRATES.length)], life: 16 }); } }
      for (const c of o.cr) for (const p of o.pl) if (!c.got && p.alive && Math.hypot(p.x - c.x, p.y - c.y) < R(p) + 14) {
        c.got = true; o.ev.push(['crate', c.x, c.y]);
        if (c.k === 'heal') p.hp = Math.min(p.st.hp, p.hp + 40); else if (c.k === 'shield') p.shieldUp += 1; else { p.buffK = c.k; p.buffT = 8; }
      }
      for (const c of o.cr) c.life -= dt;
      o.cr = o.cr.filter((c) => !c.got && c.life > 0);
      if (o.t > 35) for (const p of o.pl) if (p.alive) { p.hp -= (6 + (o.t - 35) * 2) * dt; if (p.hp <= 0) { p.alive = false; o.ev.push(['die', p.x, p.y, p.slot]); } }   // sudden death
    }
    for (const p of o.pl) {
      if (p.bot && p.alive) botThink(o, p, dt);
      if (!p.alive) continue;
      const st = p.st, inp = p.inp, canAct = o.ph !== 'over';
      if (p.buffT > 0) p.buffT -= dt;
      const tgt = (p.wl > 0 ? -p.wd : (canAct ? inp.mx : 0)) * 270 * st.move * (p.buffT > 0 && p.buffK === 'spd' ? 1.5 : 1), acc = p.onG ? 3200 : 1900;
      p.vx += clamp(tgt - p.vx, -acc * dt, acc * dt);
      p.vy += 1500 * st.grav * dt; if (p.vy > 1100) p.vy = 1100;
      p.wl = (p.wl || 0) - dt; if (p.wall && !p.onG && p.vy > 130 && canAct && inp.mx === p.wall) p.vy = 130;   // cling to a wall and slide slowly
      if (inp.mx) p.face = inp.mx;
      p.coy = p.onG ? 0.1 : p.coy - dt; if (p.onG) p.air = st.air;
      if (canAct && inp.jump && !p.jh) { if (p.coy > 0) { p.vy = -590 * st.jump; p.coy = 0; o.ev.push(['jump', p.x, p.y]); } else if (p.wall && !p.onG) { p.vy = -600 * st.jump; p.vx = -p.wall * 300; p.wd = p.wall; p.wl = 0.16; p.face = -p.wall; o.ev.push(['jump', p.x, p.y]); } else if (p.air > 0) { p.vy = -540 * st.jump; p.air--; o.ev.push(['jump', p.x, p.y]); } }
      p.jh = inp.jump; if (!inp.jump && p.vy < -200 && p.vy > -590 * st.jump + 20) p.vy *= 1 - dt * 4;   // short hop when released
      p.x += p.vx * dt; p.y += p.vy * dt; collide(p, solids);
      const r = R(p); if (p.x < r) { p.x = r; p.vx = Math.max(0, p.vx); } if (p.x > W - r) { p.x = W - r; p.vx = Math.min(0, p.vx); } if (p.y < -380) { p.y = -380; p.vy = Math.max(0, p.vy); }
      if (p.y > H + 100) { p.hp = 0; p.alive = false; o.ev.push(['die', p.x, H, p.slot]); }
      p.cd -= dt; if (o.ph === 'fight' && inp.fire && p.cd <= 0) shoot(o, p);
      if (st.regen && p.hp < st.hp && o.ph === 'fight') p.hp = Math.min(st.hp, p.hp + st.regen * dt);
      if (p.poison > 0) { p.poison -= dt; p.hp -= 8 * dt * (p.pDps || 1); if (p.hp <= 0 && p.alive) { p.alive = false; o.ev.push(['die', p.x, p.y, p.slot]); } }
    }
    for (const b of o.bl) {
      if (b.home) { let tg = null, bd = 1e9; for (const q of o.pl) if (q.alive && q.id !== b.own) { const d = Math.hypot(q.x - b.x, q.y - b.y); if (d < bd) { bd = d; tg = q; } } if (tg) { const sp = Math.hypot(b.vx, b.vy), a0 = Math.atan2(b.vy, b.vx); let da = Math.atan2(tg.y - b.y, tg.x - b.x) - a0; da = Math.atan2(Math.sin(da), Math.cos(da)); const a1 = a0 + clamp(da, -1, 1) * Math.min(1, dt * 2.6 * b.home); b.vx = Math.cos(a1) * sp; b.vy = Math.sin(a1) * sp; } }
      const px = b.x, py = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.y > H + 220 || b.y < -520) { b.dead = true; continue; }
      if (b.x < 0 || b.x > W) { if (b.bounce > 0) { b.bounce--; b.vx *= -1; b.x = clamp(b.x, 0, W); } else b.dead = true; continue; }
      for (const s of solids) if (b.x > s[0] - b.r && b.x < s[0] + s[2] + b.r && b.y > s[1] - b.r && b.y < s[1] + s[3] + b.r) {
        if (b.bounce > 0) { b.bounce--; const sideHit = px <= s[0] - b.r || px >= s[0] + s[2] + b.r; if (sideHit) b.vx *= -1; else b.vy *= -1; b.x = px; b.y = py; } else { b.dead = true; if (b.blast) explode(o, b); }
        break;
      }
      if (b.dead) continue;
      for (const q of o.pl) if (q.alive && q.id !== b.own && !(b.hits && b.hits.includes(q.id)) && Math.hypot(q.x - b.x, q.y - b.y) < R(q) + b.r) {
        const sp = Math.hypot(b.vx, b.vy) || 1; hurt(o, q, b.dmg, b.own, (b.vx / sp) * 190 * b.kb, (b.vy / sp) * 120 * b.kb - 60);
        if (b.dot) { q.poison = 3; q.pDps = b.dot / 8; }
        if (b.blast) explode(o, b, q);
        if (b.pierce > 0) { b.pierce--; b.hits.push(q.id); continue; }
        b.dead = true; break;
      }
    }
    o.bl = o.bl.filter((b) => !b.dead);
    // round end
    if (o.ph === 'fight') {
      const alive = o.pl.filter((p) => p.alive);
      if (alive.length <= 1) {
        o.ph = 'over'; o.t = 2.4; o.winner = alive.length ? alive[0].id : -1;
        if (alive.length) alive[0].score++;
        const champ = o.pl.find((p) => p.score >= o.target);
        o.matchWinner = champ ? champ.id : -2;
        o.msg = alive.length ? 'ROUND_WIN' : 'DRAW'; o.ev.push(['rend']);
      }
    } else if (o.ph === 'over') {
      o.t -= dt;
      if (o.t <= 0) {
        if (o.matchWinner >= 0) { o.ph = 'end'; o.t = 0; o.endT = 0; o.ev.push(['win']); }
        else { o.ph = 'pick'; o.t = 14; o.pk = o.pl.filter((p) => p.id !== o.winner && !p.left).map((p) => p.id); o.offers = {}; for (const id of o.pk) { const pool = CARD_IDS.slice(); const c = []; while (c.length < 3) c.push(pool.splice(Math.floor(o.rng() * pool.length), 1)[0]); o.offers[id] = c; } o.botPick = 0.9; }
      }
    } else if (o.ph === 'pick') {
      o.t -= dt; o.botPick -= dt;
      for (const id of o.pk.slice()) { const p = o.pl.find((q) => q.id === id); if ((p.bot || p.left) && o.botPick <= 0) pickCard(o, id, o.offers[id][Math.floor(o.rng() * 3)]); }
      if (o.t <= 0) for (const id of o.pk.slice()) pickCard(o, id, o.offers[id][0]);
      if (!o.pk.length) { o.reset(); o.ev.push(['next']); }
    } else if (o.ph === 'end') o.endT += dt;
  }
  function explode(o, b, skip) {
    o.ev.push(['boom', b.x, b.y, b.blast]);
    for (const q of o.pl) if (q.alive && q.id !== b.own && q !== skip) { const d = Math.hypot(q.x - b.x, q.y - b.y); if (d < b.blast + R(q)) hurt(o, q, b.dmg * 0.7 * (1 - d / (b.blast + R(q)) * 0.6), b.own, ((q.x - b.x) / (d || 1)) * 300, ((q.y - b.y) / (d || 1)) * 220 - 100); }
  }
  function pickCard(o, id, c) { const i = o.pk.indexOf(id); if (i < 0) return; const p = o.pl.find((q) => q.id === id); if (!o.offers[id] || !o.offers[id].includes(c)) c = o.offers[id][0]; p.cards.push(c); o.pk.splice(i, 1); }

  // ============================================================ snapshots (what clients draw)
  function mkSnap(o) {
    return { ph: o.ph, t: +o.t.toFixed(2), rnd: o.rnd, map: o.map, target: o.target, win: o.winner, mw: o.matchWinner, msg: o.msg, pk: o.pk.slice(),
      pl: o.pl.map((p) => [p.id, +p.x.toFixed(1), +p.y.toFixed(1), Math.round(p.hp), Math.round(p.st.hp), p.face, p.alive ? 1 : 0, p.shieldUp, +p.inp.ax.toFixed(2), +p.inp.ay.toFixed(2), p.score, p.cards, p.poison > 0 ? 1 : 0, p.slot, p.buffT > 0 ? p.buffK : ''] ),
      cr: (o.cr || []).map((c) => [Math.round(c.x), Math.round(c.y), c.k]),
      bl: o.bl.map((b) => [Math.round(b.x), Math.round(b.y), b.r, o.pl.findIndex((q) => q.id === b.own)]), };
  }

  // ============================================================ input
  function readInput() {
    const k = keys; let mx = (k.ArrowRight || k.KeyD || k.tR ? 1 : 0) - (k.ArrowLeft || k.KeyA || k.tL ? 1 : 0);
    const me = snap && snap.pl.find((p) => p[0] === host.myId); let ax = mine.ax, ay = mine.ay, fire = 0;
    if (touchAim) { ax = touchAim.ax; ay = touchAim.ay; fire = touchAim.fire; }
    else if (mouse.has && me) { const dx = mouse.x - me[1], dy = mouse.y - me[2], d = Math.hypot(dx, dy) || 1; ax = dx / d; ay = dy / d; fire = mouse.down ? 1 : 0; }
    if (k.tF) { fire = 1; if (btnAim) { ax = btnAim.ax; ay = btnAim.ay; } else if (!touchAim && me) { ax = me[5] || 1; ay = 0; } }
    if (k.KeyJ || k.KeyK || k.Enter) fire = 1;
    mine = { mx, jump: (k.ArrowUp || k.KeyW || k.Space || k.tJ) ? 1 : 0, ax: +ax.toFixed(2), ay: +ay.toFixed(2), fire };
    if (!mouse.has && !touchAim && me) { mine.ax = me[5] || 1; mine.ay = (k.ArrowUp || k.KeyW) ? -0.3 : 0; }
  }

  // ============================================================ drawing
  function drawGoose(p, t) {
    const wb = root.__wobble; if (!wb) return;
    const info = host.players.find((q) => q.id === p[0]) || {}, skin = info.skin || 'goose', equip = info.equip || {};
    const size = (p[4] && snap) ? sizeOf(p[0]) : 1, sc = 0.5 * size;
    const g = wb.fakeGoose(t, skin); g.facing = 1;   // the fake goose is built facing right, so mirror the whole picture to turn it
    cx.save(); cx.translate(p[1], p[2]); cx.scale((p[5] < 0 ? -1 : 1) * sc, sc); try { wb.drawGoose(cx, g, equip, skin); } catch (e) { /* ignore */ } cx.restore();
  }
  const sizeOf = (id) => { const q = snap.pl.find((x) => x[0] === id); return statsOf(q[11]).size; };
  function drawFrame(t) {
    const w = innerWidth, h = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
    const sc = Math.min(w / W, h / H), ox = (w - W * sc) / 2, oy = (h - H * sc) / 2; view.sc = sc; view.ox = ox; view.oy = oy;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = '#10141c'; cx.fillRect(0, 0, w, h);
    if (!snap) return;
    const map = MAPS[snap.map]; cx.save(); cx.translate(ox, oy); cx.scale(sc, sc);
    if (shake > 0) cx.translate((Math.random() - 0.5) * shake * 12, (Math.random() - 0.5) * shake * 12);
    cx.beginPath(); cx.rect(0, 0, W, H); cx.clip();
    const bg = cx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, map.bg[0]); bg.addColorStop(1, map.bg[1]); cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
    cx.fillStyle = 'rgba(255,255,255,.55)'; for (const [x, y, s] of [[120, 90, 1], [520, 60, 1.4], [800, 120, 0.9]]) { cx.beginPath(); cx.ellipse(x + Math.sin(t * 0.2 + x) * 10, y, 60 * s, 18 * s, 0, 0, 7); cx.ellipse(x + 30 * s, y - 10, 36 * s, 16 * s, 0, 0, 7); cx.fill(); }
    for (const s of map.solids) { cx.fillStyle = '#6b4a2e'; cx.fillRect(s[0], s[1], s[2], s[3]); cx.fillStyle = '#58c248'; cx.fillRect(s[0], s[1], s[2], Math.min(10, s[3])); cx.strokeStyle = '#2b2118'; cx.lineWidth = 3; cx.strokeRect(s[0], s[1], s[2], s[3]); }
    for (const c of (snap.cr || [])) { const bob = Math.sin(t * 4 + c[0]) * 3; cx.fillStyle = '#ffd23f'; cx.strokeStyle = '#2b2118'; cx.lineWidth = 3; cx.beginPath(); cx.rect(c[0] - 14, c[1] - 14 + bob, 28, 28); cx.fill(); cx.stroke(); cx.fillStyle = '#2b2118'; cx.font = '18px system-ui'; cx.textAlign = 'center'; cx.fillText(CRATE_ICON[c[2]] || '?', c[0], c[1] + 6 + bob); }
    // geese
    for (const p of snap.pl) {
      const v = view[p[0]]; if (!v) continue; const q = [p[0], v.x, v.y, p[3], p[4], p[5], p[6]];
      if (!p[6]) continue;
      const r = 20 * sizeOf(p[0]); cx.fillStyle = 'rgba(0,0,0,.15)'; cx.beginPath(); cx.ellipse(v.x, v.y + r + 1, r * 0.9, 4, 0, 0, 7); cx.fill();
      cx.strokeStyle = COL[p[13] % 4]; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(v.x, v.y + r - 2, r * 1.1, 6, 0, 0, 7); cx.stroke();
      drawGoose(q, t);
      if (p[7] > 0) { cx.strokeStyle = 'rgba(120,220,255,.9)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(v.x, v.y, r + 8, 0, 7); cx.stroke(); }
      if (p[14]) { cx.font = '16px system-ui'; cx.textAlign = 'center'; cx.fillText(CRATE_ICON[p[14]] || '', v.x, v.y - r - 58); }
      if (p[12]) { cx.fillStyle = '#7ad84a'; cx.font = '16px system-ui'; cx.textAlign = 'center'; cx.fillText('☠️', v.x, v.y - r - 52); }
      const ax = p[8], ay = p[9]; cx.strokeStyle = COL[p[13] % 4]; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(v.x + ax * (r + 6), v.y + ay * (r + 6)); cx.lineTo(v.x + ax * (r + 20), v.y + ay * (r + 20)); cx.stroke(); cx.fillStyle = COL[p[13] % 4]; cx.beginPath(); cx.arc(v.x + ax * (r + 24), v.y + ay * (r + 24), 3, 0, 7); cx.fill();
      const bw = 46, by = v.y - r - 40; cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(v.x - bw / 2 - 1, by - 1, bw + 2, 8); cx.fillStyle = p[3] / p[4] > 0.35 ? '#5ad86a' : '#ff5a5a'; cx.fillRect(v.x - bw / 2, by, bw * clamp(p[3] / p[4], 0, 1), 6);
    }
    for (const b of snap.bl) { cx.fillStyle = COL[b[3] % 4]; cx.strokeStyle = '#fff'; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(b[0], b[1], b[2], 0, 7); cx.fill(); cx.stroke(); }
    for (const q of parts) { cx.globalAlpha = Math.max(0, q.l); cx.fillStyle = q.c; cx.beginPath(); cx.arc(q.x, q.y, q.s, 0, 7); cx.fill(); } cx.globalAlpha = 1;
    // HUD
    const names = host.players;
    snap.pl.forEach((p, i) => {
      const x = 14 + i * 232, nm = ((names.find((q) => q.id === p[0]) || {}).name) || 'P' + (i + 1);
      cx.fillStyle = 'rgba(255,255,255,.85)'; cx.strokeStyle = COL[p[13] % 4]; cx.lineWidth = 4; cx.beginPath(); cx.roundRect ? cx.roundRect(x, 10, 220, 46, 12) : cx.rect(x, 10, 220, 46); cx.fill(); cx.stroke();
      cx.fillStyle = '#1f2a36'; cx.font = '800 14px system-ui'; cx.textAlign = 'left'; cx.fillText(nm + (p[0] === host.myId ? ' (you)' : ''), x + 10, 29);
      for (let k = 0; k < snap.target; k++) { cx.fillStyle = k < p[10] ? COL[p[13] % 4] : 'rgba(0,0,0,.18)'; cx.beginPath(); cx.arc(x + 14 + k * 17, 44, 6, 0, 7); cx.fill(); }
      cx.font = '15px system-ui'; cx.textAlign = 'right'; cx.fillText(p[11].slice(-6).map((c) => CARDS[c].icon).join(''), x + 212, 46);
    });
    // banners
    cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.strokeStyle = '#2b2118'; cx.lineWidth = 8; cx.lineJoin = 'round';
    const big = (txt, y, sz) => { cx.font = '900 ' + sz + 'px system-ui'; cx.strokeText(txt, W / 2, y); cx.fillText(txt, W / 2, y); };
    const nameOf = (id) => ((names.find((q) => q.id === id) || {}).name) || 'Goose';
    if (snap.ph === 'count') { big(Math.max(1, Math.ceil(snap.t)) + '', 280, 110); big('Round ' + snap.rnd + ' · ' + map.name, 340, 26); }
    else if (snap.ph === 'fight' && snap.t < 0.9) big('FIGHT!', 290, 90);
    else if (snap.ph === 'over') big(snap.win >= 0 ? nameOf(snap.win) + ' wins the round!' : 'Draw!', 290, 54);
    else if (snap.ph === 'pick' && !offer) big('Picking cards…', 290, 44);
    cx.restore();
  }

  // ============================================================ card UI + overlay DOM
  function mkUI() {
    ui = document.createElement('div'); ui.style.cssText = 'position:fixed;inset:0;z-index:870;background:#10141c;touch-action:none;user-select:none;-webkit-user-select:none';
    cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;left:0;top:0'; ui.appendChild(cv); cx = cv.getContext('2d');
    const btn = (txt, css, k) => { const b = document.createElement('div'); b.textContent = txt; b.style.cssText = 'position:absolute;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid #1f2a36;font:900 26px system-ui;display:flex;align-items:center;justify-content:center;color:#1f2a36;touch-action:none;' + css; const on = (e) => { keys[k] = 1; e.preventDefault(); b.style.background = 'rgba(255,255,255,.9)'; }, off = (e) => { keys[k] = 0; e && e.preventDefault(); b.style.background = 'rgba(255,255,255,.55)'; }; b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); ui.appendChild(b); return b; };
    ui.tb = [btn('◀', 'left:10px;bottom:14px', 'tL'), btn('▶', 'left:86px;bottom:14px', 'tR'), btn('⤊', 'right:10px;bottom:14px;width:72px;height:72px', 'tJ')];
    // shoot button: hold to fire; drag from it to aim (without dragging you shoot the way you are facing)
    const sb = document.createElement('div'); sb.textContent = '🔫'; sb.style.cssText = 'position:absolute;right:92px;bottom:14px;width:72px;height:72px;border-radius:50%;background:rgba(255,120,90,.65);border:3px solid #1f2a36;font:900 28px system-ui;display:flex;align-items:center;justify-content:center;touch-action:none';
    let so = null; const sOff = (e) => { keys.tF = 0; btnAim = null; so = null; sb.style.background = 'rgba(255,120,90,.65)'; if (e) e.preventDefault(); };
    sb.addEventListener('pointerdown', (e) => { keys.tF = 1; so = { x: e.clientX, y: e.clientY, id: e.pointerId }; sb.style.background = 'rgba(255,120,90,.95)'; try { sb.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } e.preventDefault(); });
    sb.addEventListener('pointermove', (e) => { if (!so || so.id !== e.pointerId) return; const dx = e.clientX - so.x, dy = e.clientY - so.y, d = Math.hypot(dx, dy); if (d > 14) btnAim = { ax: dx / d, ay: dy / d }; });
    sb.addEventListener('pointerup', sOff); sb.addEventListener('pointercancel', sOff); ui.appendChild(sb); ui.tb.push(sb);
    const leave = ui.leave = document.createElement('button'); leave.textContent = '✖ Leave'; leave.style.cssText = 'position:absolute;right:10px;bottom:10px;padding:6px 12px;border-radius:12px;border:2px solid #fff;background:rgba(0,0,0,.5);color:#fff;font:800 13px system-ui;cursor:pointer'; leave.addEventListener('click', () => { stop(); try { root.__wobble.showMenu(); } catch (e) { /* ignore */ } }); ui.appendChild(leave);
    ui.hint = document.createElement('div'); ui.hint.style.cssText = 'position:absolute;left:0;right:0;bottom:6px;text-align:center;color:rgba(255,255,255,.7);font:600 12px system-ui;pointer-events:none'; ui.hint.textContent = 'A/D move · W jump · mouse aim + click shoot (touch: drag on the right side to aim and shoot)'; ui.appendChild(ui.hint);
    ui.cards = document.createElement('div'); ui.cards.style.cssText = 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;background:rgba(10,14,24,.78);padding:12px'; ui.appendChild(ui.cards);
    ui.end = document.createElement('div'); ui.end.style.cssText = 'position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(10,14,24,.8);color:#fff;font:800 22px system-ui;text-align:center;padding:12px'; ui.appendChild(ui.end);
    // pointer: aim + shoot
    const toW = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - view.ox) / view.sc, (e.clientY - r.top - view.oy) / view.sc]; };
    cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { const p = toW(e); mouse.x = p[0]; mouse.y = p[1]; mouse.has = true; } else if (touchAim && touchAim.id === e.pointerId) updTouch(e); });
    cv.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { const p = toW(e); mouse.x = p[0]; mouse.y = p[1]; mouse.has = true; mouse.down = 1; } else if (e.clientX > innerWidth * 0.4) { touchAim = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ax: mine.ax, ay: mine.ay, fire: 0 }; updTouch(e); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } } });
    const up = (e) => { if (e.pointerType === 'mouse') mouse.down = 0; else if (touchAim && touchAim.id === e.pointerId) touchAim = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    document.body.appendChild(ui);
  }
  function updTouch(e) { const dx = e.clientX - touchAim.sx, dy = e.clientY - touchAim.sy, d = Math.hypot(dx, dy); if (d > 12) { touchAim.ax = dx / d; touchAim.ay = dy / d; touchAim.fire = 1; } else touchAim.fire = 0; }
  const kd = (e) => { if (!running) return; keys[e.code] = 1; if (/^(Arrow|Space|Key[WASDJK])/.test(e.code)) e.preventDefault(); };
  const ku = (e) => { keys[e.code] = 0; };

  function showCards(ids) {
    ui.cards.innerHTML = ''; ui.cards.style.display = 'flex';
    const h = document.createElement('div'); h.style.cssText = 'width:100%;text-align:center;color:#fff;font:900 24px system-ui;margin-bottom:4px'; h.textContent = '🃏 Pick a card!'; ui.cards.appendChild(h);
    ids.forEach((id) => {
      const c = CARDS[id], b = document.createElement('button'); b.style.cssText = 'width:min(200px,28vw);min-width:130px;padding:14px 8px;border-radius:18px;border:4px solid #1f2a36;background:#fff8e8;color:#1f2a36;font:700 14px system-ui;cursor:pointer';
      b.innerHTML = '<div style="font-size:44px">' + c.icon + '</div><div style="font:900 17px system-ui;margin:4px 0">' + c.name + '</div><div>' + c.desc + '</div>';
      b.addEventListener('click', () => { if (picked) return; picked = true; ui.cards.style.display = 'none'; offer = null; blip(660, 0.15, 'triangle'); if (host.host) pickCard(sim, host.myId, id); else host.send({ k: 'pick', c: id }); });
      ui.cards.appendChild(b);
    });
  }
  function showEnd(txt, solo) {
    ui.end.style.display = 'flex'; ui.end.innerHTML = '<div style="font-size:60px">🏆</div><div>' + txt + '</div>';
    if (solo) { const a = document.createElement('button'), m = document.createElement('button'); for (const b of [a, m]) b.style.cssText = 'padding:10px 20px;border-radius:14px;border:3px solid #fff;background:#ff9b2f;color:#1f2a36;font:900 18px system-ui;cursor:pointer'; a.textContent = '🔁 Play again'; m.textContent = '🏠 Menu'; a.addEventListener('click', () => { const o = host.opts; stop(); startSolo(o); }); m.addEventListener('click', () => { stop(); try { root.__wobble.showMenu(); } catch (e) { /* ignore */ } }); ui.end.appendChild(a); ui.end.appendChild(m); }
  }

  // ============================================================ loop + networking
  function applyEv(ev) {
    for (const e of ev) {
      if (e[0] === 'shot') blip(520 + Math.random() * 80, 0.09, 'square', 0.03);
      else if (e[0] === 'hit') { blip(180, 0.14, 'sawtooth', 0.06); shake = 0.25; for (let i = 0; i < 6; i++) parts.push({ x: e[1], y: e[2], vx: (Math.random() - 0.5) * 240, vy: (Math.random() - 0.7) * 240, l: 1, s: 3, c: '#fff' }); }
      else if (e[0] === 'sh') blip(900, 0.12, 'triangle', 0.05);
      else if (e[0] === 'die') { blip(110, 0.4, 'sawtooth', 0.09); shake = 0.7; for (let i = 0; i < 26; i++) parts.push({ x: e[1], y: e[2], vx: (Math.random() - 0.5) * 520, vy: (Math.random() - 0.8) * 420, l: 1.2, s: 2 + Math.random() * 4, c: i % 2 ? COL[(e[3] | 0) % 4] : '#fff' }); }
      else if (e[0] === 'boom') { blip(90, 0.3, 'sawtooth', 0.08); shake = 0.5; for (let i = 0; i < 18; i++) parts.push({ x: e[1], y: e[2], vx: (Math.random() - 0.5) * 420, vy: (Math.random() - 0.5) * 420, l: 0.7, s: 4, c: i % 2 ? '#ffd23f' : '#ff7a1a' }); }
      else if (e[0] === 'crate') { blip(660, 0.18, 'triangle', 0.06); for (let i = 0; i < 10; i++) parts.push({ x: e[1], y: e[2], vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.8) * 300, l: 0.8, s: 3, c: '#ffd23f' }); }
      else if (e[0] === 'jump') blip(380, 0.08, 'sine', 0.03);
      else if (e[0] === 'go') blip(880, 0.3, 'triangle', 0.06);
    }
  }
  function setSnap(s) {
    snap = s;
    for (const p of s.pl) { const v = view[p[0]] || (view[p[0]] = { x: p[1], y: p[2] }); if (!host.host) { v.x += (p[1] - v.x) * 0.55; v.y += (p[2] - v.y) * 0.55; if (Math.abs(p[1] - v.x) > 120 || Math.abs(p[2] - v.y) > 120) { v.x = p[1]; v.y = p[2]; } } else { v.x = p[1]; v.y = p[2]; } }
    if (s.ph === 'pick' && offer && s.pk.includes(host.myId) && !picked) { if (ui.cards.style.display !== 'flex') showCards(offer); }
    if (s.ph !== 'pick') { picked = false; offer = null; ui.cards.style.display = 'none'; }
    if (s.ph === 'end' && ui.end.style.display !== 'flex') { const nm = ((host.players.find((q) => q.id === s.mw) || {}).name) || 'A goose'; showEnd((s.mw === host.myId ? 'YOU WIN THE MATCH!' : nm + ' wins the match!'), host.solo); }
  }
  function loop(now) {
    if (!running) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; const t = now / 1000;
    offerT -= dt; readInput(); shake = Math.max(0, shake - dt * 2);
    for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 700 * dt; q.l -= dt * 1.1; } parts = parts.filter((q) => q.l > 0);
    if (host.host) {
      const me = sim.pl.find((p) => p.id === host.myId); if (me && !me.bot) me.inp = mine;
      acc += dt; let n = 0; while (acc >= STEP && n++ < 5) { stepSim(sim, STEP); acc -= STEP; applyEv(sim.ev); if (sim.ph === 'end') { if (sim.endT > 3.5 && !sim.ended && !host.solo) { sim.ended = true; try { root.MP.roundsEnd(sim.matchWinner, ((host.players.find((q) => q.id === sim.matchWinner) || {}).name || 'A goose') + ' won the match!'); } catch (e) { /* ignore */ } } } }
      if (sim.ph === 'pick' && !sim.sentOffer) { sim.sentOffer = 1; }
      if (sim.ph !== 'pick') sim.sentOffer = 0;
      if (sim.ph === 'pick' && !offer && sim.offers[host.myId] && sim.pk.includes(host.myId) && !picked) offer = sim.offers[host.myId];
      const s = mkSnap(sim); setSnap(s);
      sendT -= dt; if (sendT <= 0 && !host.solo) { sendT = 1 / 24; host.all({ k: 's', s, ev: sim.ev.filter((e) => e[0] !== 'jump').slice(0, 8) }); if (sim.ph === 'pick') for (const id of sim.pk) if (id !== host.myId && offerT <= 0) host.all({ k: 'offer', to: id, c: sim.offers[id] }); if (offerT <= 0) offerT = 0.5; }
    } else {
      sendT -= dt; const str = JSON.stringify(mine);
      if (sendT <= 0 || str !== lastSent) { if (sendT <= 0 || str !== lastSent) { host.send({ k: 'in', i: mine }); lastSent = str; sendT = 1 / 20; } }
      if (snap) for (const p of snap.pl) { const v = view[p[0]]; if (v) { v.x += (p[1] - v.x) * Math.min(1, dt * 22); v.y += (p[2] - v.y) * Math.min(1, dt * 22); } }
    }
    drawFrame(t);
  }
  function onNet(from, d) {
    if (!running || !d) return;
    if (host.host) {
      if (d.k === 'in' && sim) { const p = sim.pl.find((q) => q.id === from); const i = d.i; if (p && i && !p.bot) p.inp = { mx: clamp(+i.mx || 0, -1, 1), jump: i.jump ? 1 : 0, ax: clamp(+i.ax || 0, -1, 1), ay: clamp(+i.ay || 0, -1, 1), fire: i.fire ? 1 : 0 }; }
      else if (d.k === 'pick' && sim && sim.ph === 'pick' && typeof d.c === 'string' && CARDS[d.c]) pickCard(sim, from, d.c);
    } else if (d.k === 's') { setSnap(d.s); applyEv(d.ev || []); }
    else if (d.k === 'offer' && d.to === host.myId && Array.isArray(d.c) && !picked) { offer = d.c.filter((c) => CARDS[c]); if (snap && snap.ph === 'pick' && ui.cards.style.display !== 'flex') showCards(offer); }
  }
  function onDrop(id) { if (!running || !host.host || !sim) return; const p = sim.pl.find((q) => q.id === id); if (p) { p.bot = true; p.left = true; } }

  // ============================================================ start / stop
  function begin(o) {
    stop(); host = o; running = true; keys = {}; mouse = { x: 480, y: 270, has: false }; touchAim = null; view = {}; snap = null; offer = null; picked = false; parts = []; lastSent = ''; sendT = 0; acc = 0;
    mkUI(); addEventListener('keydown', kd); addEventListener('keyup', ku);
    const touch = matchMedia && matchMedia('(pointer:coarse)').matches; for (const b of ui.tb) b.style.display = touch ? 'flex' : 'none'; if (touch) { ui.leave.style.right = 'auto'; ui.leave.style.left = '50%'; ui.leave.style.transform = 'translateX(-50%)'; } ui.hint.style.display = touch ? 'none' : '';
    if (o.host) { sim = newSim({ seed: o.seed, players: o.players, target: o.target }); }
    lastT = performance.now(); raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (!running && !ui) return; running = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku);
    if (ui && ui.parentNode) ui.parentNode.removeChild(ui); ui = null; cv = null; sim = null; snap = null; keys = {};
  }
  // called by mp.js: o = { ids, myId, host, seed, target, players:[{id,skin,equip,name}] }
  function startNet(o) {
    const players = o.players.map((p, i) => Object.assign({}, p, { name: p.name || 'P' + (i + 1) }));
    begin({ host: o.host, myId: o.myId, seed: o.seed, target: o.target || 3, players, solo: false, send: (d) => root.MP.rsend(d), all: (d) => root.MP.rall(d) });
  }
  function startSolo(o) {
    const wb = root.__wobble, sv = wb && wb.save, names = ['You', 'Bot Bert', 'Bot Bella', 'Bot Bao'], skins = ['goose', 'duck', 'chicken', 'penguin'];
    const players = [{ id: 0, skin: (sv && sv.skin) || 'goose', equip: (sv && sv.equip) || {}, name: 'You' }];
    for (let i = 1; i < 4; i++) { const pool = (root.Skins ? root.Skins.LIST.filter((s) => !s.hidden && !s.jellyfish) : []); const sk = pool.length ? pool[Math.floor(Math.random() * pool.length)].id : skins[i]; players.push({ id: i, skin: sk, equip: {}, name: names[i], bot: true }); }
    const cfg = Object.assign({ target: 3 }, o || {});
    try { const h = document.getElementById('title'); if (h) h.classList.add('hidden'); } catch (e) { /* ignore */ }
    begin({ host: true, myId: 0, seed: (Math.random() * 1e9) | 0, target: cfg.target, players, solo: true, opts: cfg, send: () => {}, all: () => {} });
  }
  function pickMode() {
    let d = document.getElementById('roundsPick');
    if (!d) {
      d = document.createElement('div'); d.id = 'roundsPick'; d.className = 'overlay';
      d.innerHTML = '<div class="card" style="max-width:420px"><h2>🎴 Goose Rounds</h2><p class="small">Shoot the other geese. The loser of each round picks a power-up card. Up to 4 players.</p>' +
        '<div class="row" style="flex-direction:column;gap:8px"><button class="big" id="rpOnline">🌐 Play online (random players)</button><button class="big" id="rpFriends">👥 Play with friends (room word)</button><button class="big" id="rpBots">🤖 Solo vs 3 bots</button><button class="sec" id="rpClose">Back</button></div></div>';
      document.body.appendChild(d);
      const close = () => d.classList.add('hidden');
      document.getElementById('rpOnline').onclick = () => { close(); if (root.MP && root.MP.roundsQuick) root.MP.roundsQuick(); };
      document.getElementById('rpFriends').onclick = () => { close(); if (root.MP) root.MP.open(); };
      document.getElementById('rpBots').onclick = () => { close(); startSolo(); };
      document.getElementById('rpClose').onclick = close;
    }
    d.classList.remove('hidden');
  }
  function init() {
    const code = document.getElementById('codeBtn');
    if (code && !document.getElementById('roundsBtn')) { const b = document.createElement('button'); b.className = 'sec'; b.id = 'roundsBtn'; b.textContent = '🎴 Goose Rounds'; b.addEventListener('click', pickMode); code.parentNode.insertBefore(b, code); }
  }
  root.Rounds = { startNet, startSolo, stop, onNet, onDrop, active: () => running, CARDS, MAPS, _sim: () => sim, _mkSnap: mkSnap, _step: stepSim, _newSim: newSim };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Rounds;
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 60)); else setTimeout(init, 60); }
})(typeof window !== 'undefined' ? window : globalThis);
