/*
 * 🐾 Pet Pal: a tamagotchi-style pet you keep between play sessions.
 * Hatch an egg, feed it, play with it, clean up after it and let it sleep. Time keeps running while the game is closed:
 * if you do not feed your pet for 24 hours it RUNS AWAY. 12 species in four rarities, growing baby > kid > adult,
 * a happy or grumpy adult form depending on how well you cared for it, shiny pets, sickness, a daily gift and a pet dex.
 * State lives in save.pets (see the shape in load()).
 */
(function (root) {
  'use strict';
  const MG = root.Minigames; if (!MG) return;
  const HOUR = 36e5, DAY = 24 * HOUR, INK = '#1f2a36';
  const R = () => Math.random(), clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  let nowFn = () => Date.now();

  const SPECIES = {
    chick:   { name: 'Chick',   tier: 0, col: '#ffe14a', col2: '#ffb02a' },
    bunny:   { name: 'Bunny',   tier: 0, col: '#fff0f4', col2: '#ffb0c8' },
    hamster: { name: 'Hamster', tier: 0, col: '#f0c890', col2: '#fff0d8' },
    frog:    { name: 'Frog',    tier: 0, col: '#6ad06a', col2: '#b8f0a0' },
    kitten:  { name: 'Kitten',  tier: 1, col: '#ff9a4a', col2: '#fff0d8' },
    puppy:   { name: 'Puppy',   tier: 1, col: '#c8a070', col2: '#6a4a2a' },
    penguin: { name: 'Penguin', tier: 1, col: '#2a3a5a', col2: '#ffffff' },
    slime:   { name: 'Slime',   tier: 1, col: '#6ad0ff', col2: '#d8f4ff' },
    ghost:   { name: 'Ghost',   tier: 2, col: '#eef0ff', col2: '#b8c0ff' },
    octopus: { name: 'Octopus', tier: 2, col: '#c85ab8', col2: '#ffb0e8' },
    dragon:  { name: 'Dragon',  tier: 3, col: '#e04a3a', col2: '#ffb02a' },
    alien:   { name: 'Alien',   tier: 3, col: '#9aff6a', col2: '#2a8a2a' },
    panda:   { name: 'Panda',   tier: 0, col: '#ffffff', col2: '#222222' },
    fox:     { name: 'Fox',     tier: 1, col: '#e8801a', col2: '#ffffff' },
    unicorn: { name: 'Unicorn', tier: 2, col: '#fff0fa', col2: '#d08aff' },
    phoenix: { name: 'Phoenix', tier: 3, col: '#ff7a1a', col2: '#ffe14a' },
  };
  const TIERS = [
    { name: 'Common Egg', icon: '🥚', price: 40, rare: 'Chick · Bunny · Hamster · Frog · Panda' },
    { name: 'Spotted Egg', icon: '🥚', price: 120, rare: 'Kitten · Puppy · Penguin · Slime · Fox' },
    { name: 'Glowing Egg', icon: '🔮', price: 300, rare: 'Ghost · Octopus · Unicorn' },
    { name: 'Legendary Egg', icon: '🌟', price: 800, rare: 'Dragon · Alien · Phoenix' },
  ];
  const FOODS = [
    { id: 'bread', icon: '🍞', name: 'Bread', cost: 0, full: 30, joy: 0 },
    { id: 'berry', icon: '🍓', name: 'Berries', cost: 0, full: 18, joy: 8 },
    { id: 'cake', icon: '🍰', name: 'Cake', cost: 5, full: 45, joy: 20 },
    { id: 'med', icon: '💊', name: 'Medicine', cost: 8, full: 0, joy: 0, cure: true },
  ];
  const NAMES = ['Pico', 'Mochi', 'Biscuit', 'Nugget', 'Waddles', 'Pip', 'Tofu', 'Bean', 'Sprout', 'Gizmo', 'Pudding', 'Zippy', 'Maple', 'Noodle', 'Button', 'Fudge'];

  // ---------------------------------------------------------------- state
  const SV = () => root.__wobble && root.__wobble.save;
  function load() {
    const s = SV(); if (!s) return { cur: null, dex: {}, hatched: 0, lost: 0, adults: 0, giftDay: '', lastLost: null };
    if (!s.pets) s.pets = { cur: null, dex: {}, hatched: 0, lost: 0, adults: 0, giftDay: '', lastLost: null };
    return s.pets;
  }
  const save = () => { try { root.__wobble.persist(); } catch (e) { /* ignore */ } };
  const dayKey = () => new Date(nowFn()).toISOString().slice(0, 10);
  const ageH = (p) => Math.max(0, (nowFn() - p.hatchAt) / HOUR);
  const stageOf = (p) => (nowFn() < p.hatchAt ? 'egg' : ageH(p) < 12 ? 'baby' : ageH(p) < 48 ? 'kid' : 'adult');
  const formOf = (p) => (p.care >= 62 ? 'happy' : p.care <= 38 ? 'grumpy' : 'normal');
  function newPet(tier) {
    const ids = Object.keys(SPECIES).filter((k) => SPECIES[k].tier === tier), sp = ids[Math.floor(R() * ids.length)], t = nowFn();
    return { sp, name: NAMES[Math.floor(R() * NAMES.length)], born: t, hatchAt: t + 25000, full: 70, joy: 70, clean: 100, energy: 100, poops: 0, sick: false, sleeping: false, lastFed: t, lastTick: t, care: 70, shiny: R() < 0.06, form: 'normal', counted: false, fed: 0, tapped: 0, poopT: 0 };
  }
  // advance the pet by dt hours (used live every second and to catch up after being away)
  function tick(p, h) {
    if (h <= 0 || nowFn() < p.hatchAt) return;
    const sl = p.sleeping, sickK = p.sick ? 2 : 1;
    p.full = clamp(p.full - h * 4.1 * (sl ? 0.5 : 1), 0, 100);
    p.joy = clamp(p.joy - h * (sl ? 1 : 2.5) * sickK - h * (p.poops * 0.8) - (p.full < 15 ? h * 2 : 0), 0, 100);
    p.clean = clamp(p.clean - h * 1.2 - h * p.poops * 2.2, 0, 100);
    p.energy = clamp(p.energy + (sl ? h * 14 : -h * 3), 0, 100);
    if (sl && p.energy >= 100) p.sleeping = false;
    if (!sl) { p.poopT += h; while (p.poopT >= 3.2) { p.poopT -= 3.2; p.poops = Math.min(4, p.poops + 1); } }
    if (!p.sick && (p.clean < 15 || (p.poops >= 4 && p.clean < 40))) p.sick = true;
    p.care = clamp(p.care + (((p.full + p.joy + p.clean) / 3) - p.care) * Math.min(1, h * 0.08), 0, 100);
    const st = stageOf(p); if (st !== 'baby' && p.form === 'normal' || (st === 'adult' && !p.formLocked)) { p.form = formOf(p); if (st === 'adult') p.formLocked = true; }
  }
  const hoursLeft = (p) => (p.lastFed + DAY - nowFn()) / HOUR;
  function sync(d) {   // bring the pet up to date; return 'ranaway' if it left
    const p = d.cur; if (!p) return null;
    const now = nowFn(), h = (now - p.lastTick) / HOUR; p.lastTick = now;
    if (h > 0) { const wasAwake = !p.sleeping; tick(p, Math.min(h, 400)); void wasAwake; }
    const st = stageOf(p);
    if (st === 'adult' && !p.counted) { p.counted = true; d.adults++; d.dex[p.sp] = (d.dex[p.sp] || 0) + 1; const sv = SV(); if (sv) sv.bread += p.shiny ? 150 : 50; d.justAdult = p.name; }
    if (st !== 'egg' && hoursLeft(p) <= 0) { d.lost++; d.lastLost = { name: p.name, sp: p.sp, at: now, hours: Math.round((now - p.lastFed) / HOUR) }; d.cur = null; return 'ranaway'; }
    return null;
  }

  // ---------------------------------------------------------------- drawing a pet (feet at y = 0, facing right)
  function drawPet(c, p, t, o) {
    o = o || {}; const sp = SPECIES[p.sp], st = o.stage || stageOf(p), sc = st === 'baby' ? 0.7 : st === 'kid' ? 0.9 : 1.1, form = p.form || 'normal';
    const bob = p.sleeping ? Math.sin(t * 1.5) * 2 : Math.sin(t * 3) * 3 + (o.hop || 0), sq = 1 + Math.sin(t * 3) * 0.015, rx = 54 * sc, ry = 48 * sc;
    const col = p.sick ? '#b8d878' : p.shiny ? 'hsl(' + ((t * 60) % 360) + ',80%,70%)' : sp.col;
    c.save(); c.translate(o.x || 0, (o.y || 0) + bob * 0.5); c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 4; c.strokeStyle = INK;
    c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(0, 4 - bob * 0.5, rx * 0.9, 9, 0, 0, 7); c.fill();
    const by = -ry - 6;   // body centre
    const part = (fn) => { c.save(); fn(); c.restore(); };
    // behind the body
    if (p.sp === 'dragon' || p.sp === 'phoenix') part(() => { c.fillStyle = sp.col2; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 30 * sc, by - 10); c.quadraticCurveTo(s * 110 * sc, by - 70 - Math.sin(t * 4) * 10, s * 80 * sc, by + 10); c.quadraticCurveTo(s * 60 * sc, by - 10, s * 30 * sc, by + 10); c.fill(); c.stroke(); } c.fillStyle = col; c.beginPath(); c.moveTo(rx * 0.8, by + 20); c.quadraticCurveTo(rx * 1.7, by + 40 + Math.sin(t * 3) * 8, rx * 1.4, by - 10); c.lineTo(rx * 0.8, by); c.fill(); c.stroke(); });
    if (p.sp === 'kitten' || p.sp === 'fox') part(() => { c.strokeStyle = INK; c.lineWidth = 14 * sc; c.beginPath(); c.moveTo(rx * 0.8, by + 20); c.quadraticCurveTo(rx * 1.5, by - 10 + Math.sin(t * 3) * 14, rx * 1.2, by - 60 * sc); c.stroke(); c.strokeStyle = col; c.lineWidth = 8 * sc; c.stroke(); if (p.sp === 'fox') { c.strokeStyle = '#fff'; c.lineWidth = 6 * sc; c.beginPath(); c.moveTo(rx * 1.3, by - 40 * sc); c.lineTo(rx * 1.2, by - 60 * sc); c.stroke(); } });
    if (p.sp === 'puppy') part(() => { c.strokeStyle = INK; c.lineWidth = 12 * sc; c.beginPath(); c.moveTo(rx * 0.85, by + 14); c.quadraticCurveTo(rx * 1.4, by - 10 + Math.sin(t * 12) * 12, rx * 1.3, by - 40 * sc); c.stroke(); c.strokeStyle = col; c.lineWidth = 6 * sc; c.stroke(); });
    if (p.sp === 'octopus') part(() => { c.strokeStyle = INK; for (let i = -2; i <= 2; i++) { c.lineWidth = 16 * sc; c.beginPath(); c.moveTo(i * 20 * sc, by + ry * 0.6); c.quadraticCurveTo(i * 26 * sc + Math.sin(t * 3 + i) * 10, by + ry * 1.1, i * 30 * sc + Math.sin(t * 3 + i * 2) * 14, -4); c.stroke(); c.strokeStyle = col; c.lineWidth = 10 * sc; c.stroke(); c.strokeStyle = INK; } });
    if (p.sp === 'penguin') part(() => { c.fillStyle = '#ff9b2f'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 22 * sc, -2, 16 * sc, 7, 0, 0, 7); c.fill(); c.stroke(); } });
    if (p.sp === 'chick' || p.sp === 'frog' || p.sp === 'hamster' || p.sp === 'bunny' || p.sp === 'kitten' || p.sp === 'puppy' || p.sp === 'alien' || p.sp === 'dragon') part(() => { c.fillStyle = p.sp === 'chick' ? '#ff9b2f' : col; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 24 * sc, -4, 15 * sc, 8, 0, 0, 7); c.fill(); c.stroke(); } });
    // body
    c.fillStyle = col;
    if (p.sp === 'ghost') { c.globalAlpha = 0.88; c.beginPath(); c.moveTo(-rx, by + ry * 0.6); c.lineTo(-rx, by); c.arc(0, by, rx, Math.PI, 0); c.lineTo(rx, by + ry * 0.7); for (let i = 0; i < 5; i++) c.quadraticCurveTo(rx - (i * 2 + 1) * rx / 5, by + ry * 0.7 + 18 + Math.sin(t * 4 + i) * 6, rx - (i + 1) * rx * 0.4, by + ry * 0.7); c.closePath(); c.fill(); c.stroke(); c.globalAlpha = 1; }
    else if (p.sp === 'slime') { const w = Math.sin(t * 4) * 4; c.globalAlpha = 0.9; c.beginPath(); c.moveTo(-rx * 1.1, -4); c.quadraticCurveTo(-rx * 1.1, by - ry * 1.3 - w, 0, by - ry * 1.15 - w); c.quadraticCurveTo(rx * 1.1, by - ry * 1.3 - w, rx * 1.1, -4); c.quadraticCurveTo(0, 6, -rx * 1.1, -4); c.fill(); c.stroke(); c.globalAlpha = 1; c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-rx * 0.5, by - ry * 0.6, 10 * sc, 18 * sc, 0.5, 0, 7); c.fill(); }
    else { c.beginPath(); c.ellipse(0, by, rx * sq, ry / sq, 0, 0, 7); c.fill(); c.stroke(); }
    // belly
    if (p.sp === 'penguin' || p.sp === 'fox' || p.sp === 'unicorn' || p.sp === 'phoenix' || p.sp === 'kitten' || p.sp === 'bunny' || p.sp === 'hamster' || p.sp === 'frog' || p.sp === 'dragon') { c.fillStyle = sp.col2; c.beginPath(); c.ellipse(0, by + ry * 0.35, rx * 0.62, ry * 0.58, 0, 0, 7); c.fill(); }
    if (p.sp === 'puppy') { c.fillStyle = sp.col2; c.beginPath(); c.ellipse(-rx * 0.45, by - ry * 0.45, 14 * sc, 17 * sc, 0.3, 0, 7); c.fill(); }
    // ears / horns / antenna
    part(() => {
      c.fillStyle = col; c.lineWidth = 4;
      if (p.sp === 'bunny') for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 20 * sc, by - ry - 26 * sc, 11 * sc, 34 * sc, s * 0.15, 0, 7); c.fill(); c.stroke(); c.fillStyle = sp.col2; c.beginPath(); c.ellipse(s * 20 * sc, by - ry - 26 * sc, 5 * sc, 22 * sc, s * 0.15, 0, 7); c.fill(); c.fillStyle = col; }
      if (p.sp === 'panda') { c.fillStyle = '#222'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 36 * sc, by - ry * 0.8, 13 * sc, 0, 7); c.fill(); c.stroke(); } }
      if (p.sp === 'unicorn') { c.fillStyle = '#d08aff'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(-rx * 0.5 - i * 5 * sc, by - ry * (0.9 - i * 0.2), 9 * sc, 14 * sc, 0.4, 0, 7); c.fill(); } c.fillStyle = '#fff4a8'; c.beginPath(); c.moveTo(-4 * sc, by - ry + 2); c.lineTo(2, by - ry - 34 * sc); c.lineTo(8 * sc, by - ry + 2); c.closePath(); c.fill(); c.stroke(); }
      if (p.sp === 'phoenix') { c.fillStyle = '#ffe14a'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 9 * sc - 6, by - ry + 4); c.quadraticCurveTo(i * 12 * sc, by - ry - 36 * sc - Math.sin(t * 8 + i) * 6, i * 9 * sc + 6, by - ry + 4); c.fill(); c.stroke(); } }
      if (p.sp === 'kitten' || p.sp === 'fox') for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 14 * sc, by - ry + 6); c.lineTo(s * 38 * sc, by - ry - 28 * sc); c.lineTo(s * 40 * sc, by - ry + 14); c.closePath(); c.fill(); c.stroke(); }
      if (p.sp === 'puppy') for (const s of [-1, 1]) { c.fillStyle = sp.col2; c.beginPath(); c.ellipse(s * (rx * 0.85), by - ry * 0.35, 13 * sc, 28 * sc, s * 0.25, 0, 7); c.fill(); c.stroke(); }
      if (p.sp === 'hamster') for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 34 * sc, by - ry * 0.85, 12 * sc, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#ffb0b8'; c.beginPath(); c.arc(s * 34 * sc, by - ry * 0.85, 6 * sc, 0, 7); c.fill(); c.fillStyle = col; }
      if (p.sp === 'dragon') for (const s of [-1, 1]) { c.fillStyle = '#fff0b8'; c.beginPath(); c.moveTo(s * 18 * sc, by - ry + 4); c.lineTo(s * 26 * sc, by - ry - 28 * sc); c.lineTo(s * 36 * sc, by - ry + 8); c.closePath(); c.fill(); c.stroke(); }
      if (p.sp === 'alien') { c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(0, by - ry + 4); c.lineTo(0, by - ry - 34 * sc); c.stroke(); c.fillStyle = '#ff4aa8'; c.beginPath(); c.arc(0, by - ry - 38 * sc + Math.sin(t * 5) * 3, 8 * sc, 0, 7); c.fill(); c.stroke(); }
      if (p.sp === 'chick') { c.fillStyle = '#ffb02a'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 8 * sc - 5, by - ry + 4); c.lineTo(i * 10 * sc, by - ry - 18 * sc); c.lineTo(i * 8 * sc + 5, by - ry + 4); c.fill(); c.stroke(); } }
      if (p.sp === 'frog') { c.fillStyle = col; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 26 * sc, by - ry + 2, 15 * sc, 0, 7); c.fill(); c.stroke(); } }
    });
    // face
    const ex = 19 * sc, ey = by - 8 * sc, mood = p.sick ? 'sick' : p.sleeping ? 'sleep' : p.full < 25 ? 'hungry' : p.joy > 65 && p.full > 40 ? 'happy' : p.joy < 30 ? 'sad' : 'ok';
    const blink = Math.sin(t * 0.9 + p.born % 7) > 0.985 || mood === 'sleep';
    for (const s of [-1, 1]) {
      c.save(); c.translate(s * ex, ey);
      if (blink) { c.strokeStyle = INK; c.lineWidth = 3.5; c.beginPath(); c.arc(0, 0, 7 * sc, 0.1, Math.PI - 0.1); c.stroke(); }
      else if (p.sp === 'alien') { c.fillStyle = '#111'; c.beginPath(); c.ellipse(0, 0, 11 * sc, 15 * sc, s * 0.5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-2 * s, -4, 3, 0, 7); c.fill(); }
      else { c.fillStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 9 * sc, 0, 7); c.fill(); c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(Math.sin(t * 0.7) * 2 + 1, mood === 'sad' ? 2 : 0, 4.6 * sc, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -2, 1.6, 0, 7); c.fill(); }
      if (form === 'grumpy' && !blink) { c.strokeStyle = INK; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-9 * s * sc, -14 * sc); c.lineTo(8 * s * sc, -7 * sc); c.stroke(); }
      c.restore();
    }
    if (form === 'happy' || mood === 'happy') { c.fillStyle = 'rgba(255,90,120,.35)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 33 * sc, ey + 14 * sc, 8 * sc, 5 * sc, 0, 0, 7); c.fill(); } }
    c.strokeStyle = INK; c.lineWidth = 3.5; c.fillStyle = INK; const my = ey + 16 * sc;
    if (p.sp === 'chick' || p.sp === 'penguin') { c.fillStyle = '#ff9b2f'; c.beginPath(); c.moveTo(-9 * sc, my - 6); c.lineTo(9 * sc, my - 6); c.lineTo(0, my + 7 * sc); c.closePath(); c.fill(); c.stroke(); }
    else if (mood === 'happy') { c.beginPath(); c.arc(0, my - 7 * sc, 10 * sc, 0.2, Math.PI - 0.2); c.stroke(); }
    else if (mood === 'hungry') { c.beginPath(); c.ellipse(0, my, 6 * sc, 8 * sc, 0, 0, 7); c.fill(); }
    else if (mood === 'sad' || mood === 'sick') { c.beginPath(); c.arc(0, my + 6, 8 * sc, Math.PI + 0.3, -0.3); c.stroke(); }
    else if (mood === 'sleep') { c.beginPath(); c.arc(0, my, 4 * sc, 0, 7); c.stroke(); }
    else { c.beginPath(); c.moveTo(-6 * sc, my); c.lineTo(6 * sc, my); c.stroke(); }
    if (p.sp === 'kitten') { c.lineWidth = 2; for (const s of [-1, 1]) for (const d of [-5, 3]) { c.beginPath(); c.moveTo(s * 24 * sc, my - 4 + d); c.lineTo(s * 50 * sc, my - 8 + d * 2); c.stroke(); } }
    if (st === 'adult') { if (form === 'happy') { c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-14, by - ry - 2); c.lineTo(-18, by - ry - 22); c.lineTo(-7, by - ry - 12); c.lineTo(0, by - ry - 26); c.lineTo(7, by - ry - 12); c.lineTo(18, by - ry - 22); c.lineTo(14, by - ry - 2); c.closePath(); c.fill(); c.stroke(); } else if (form === 'grumpy') { c.fillStyle = '#6a6a76'; c.fillRect(-rx * 0.8, by + ry * 0.1, rx * 1.6, 6); } }
    if (p.shiny) { for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; c.fillStyle = '#fff'; c.font = '16px system-ui'; c.textAlign = 'center'; c.fillText('✦', Math.cos(a) * (rx + 10), by + Math.sin(a) * ry); } }
    if (p.sick) { c.font = '26px system-ui'; c.textAlign = 'center'; c.fillText('🤒', rx * 0.6, by - ry - 8); }
    if (p.sleeping) { c.fillStyle = INK; c.font = '800 ' + (18 + Math.sin(t * 2) * 3) + 'px system-ui'; c.textAlign = 'center'; c.fillText('z Z', rx * 0.7, by - ry - 6 - (t * 8) % 14); }
    c.restore();
  }
  function drawEgg(c, p, t, x, y, wob, tierIcon) {
    c.save(); c.translate(x, y); c.rotate(Math.sin(t * (wob ? 14 : 2)) * (wob ? 0.12 : 0.04)); c.lineWidth = 4; c.strokeStyle = INK;
    const g = c.createLinearGradient(-40, -100, 40, 0); g.addColorStop(0, '#fffdf2'); g.addColorStop(1, p && p.shiny ? '#ffd0f8' : '#f0dca8'); c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -112); c.bezierCurveTo(54, -112, 58, -20, 0, -6); c.bezierCurveTo(-58, -20, -54, -112, 0, -112); c.fill(); c.stroke();
    c.fillStyle = 'rgba(120,90,40,.25)'; for (const [dx, dy, r] of [[-18, -60, 7], [14, -78, 5], [20, -42, 8], [-10, -30, 4]]) { c.beginPath(); c.arc(dx, dy, r, 0, 7); c.fill(); }
    if (tierIcon) { c.font = '34px system-ui'; c.textAlign = 'center'; c.fillText(tierIcon, 0, -52); }
    c.restore();
  }

  // ---------------------------------------------------------------- the minigame
  const frame = (host, lw, lh) => { const s = Math.min(host.W / lw, host.H / lh); return { s, ox: (host.W - lw * s) / 2, oy: (host.H - lh * s) / 2 }; };
  const toL = (host, f, e) => { const r = host.ctx.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - f.ox) / f.s, y: (e.clientY - r.top - f.oy) / f.s }; };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
  const dur = (h) => { const m = Math.max(0, Math.floor(h * 60)); return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm'; };

  function create(host) {
    const c = host.ctx, d = load(); let t = 0, mode = 'main', toast = '', toastT = 0, hearts = [], bubbles = [], hop = 0, lastSecond = 0, ball = null, playT = 0, playHits = 0, sub = null, lastGift = 0;
    const say = (s, secs) => { toast = s; toastT = secs || 2.4; };
    let status = sync(d); if (d.justAdult) { say('🎉 ' + d.justAdult + ' grew into an adult! Bonus bread!', 4); d.justAdult = null; }
    save();
    const p = () => d.cur;
    const btn = (id, label, x, y, w, h) => ({ id, label, x, y, w, h });
    const mainBtns = () => [btn('feed', '🍞 Feed', 40, 408, 128, 58), btn('play', '⚽ Play', 178, 408, 128, 58), btn('clean', '🧼 Clean', 316, 408, 128, 58), btn('sleep', p() && p().sleeping ? '☀️ Wake' : '💤 Sleep', 454, 408, 128, 58), btn('pet', '🤚 Pet', 592, 408, 128, 58)];
    const topBtns = () => [btn('dex', '📖', 590, 56, 56, 44), btn('done', '✖', 654, 56, 56, 44)];
    function adopt(tier) {
      const T = TIERS[tier], sv = SV(); if (!sv || sv.bread < T.price) { say('Not enough bread 🍞 (' + T.price + ')'); host.snd.no && host.snd.no(); return; }
      sv.bread -= T.price; d.cur = newPet(tier); d.hatched++; d.lastLost = null; save(); mode = 'main'; say('🥚 Your egg will hatch in a few seconds. Tap it to keep it warm!', 4);
    }
    function act(id) {
      const pet = p(); if (!pet) return; const st = stageOf(pet);
      if (st === 'egg') { say('Wait for it to hatch… tap the egg!'); return; }
      if (id === 'sleep') { if (pet.sleeping) { pet.sleeping = false; say('☀️ Good morning!'); } else { if (pet.energy > 92) return say('Not sleepy yet.'); pet.sleeping = true; say('💤 Shhh…'); } save(); return; }
      if (pet.sleeping) return say('Shhh, ' + pet.name + ' is sleeping. Tap ☀️ Wake first.');
      if (id === 'feed') { mode = 'food'; return; }
      if (id === 'clean') { if (!pet.poops && pet.clean > 95) return say(pet.name + ' is already clean ✨'); for (let i = 0; i < 12; i++) bubbles.push({ x: 400 + (R() - 0.5) * 200, y: 330 + (R() - 0.5) * 120, v: 30 + R() * 50, r: 6 + R() * 12, l: 1.4 }); pet.poops = 0; pet.clean = 100; pet.joy = clamp(pet.joy + 6, 0, 100); pet.care = clamp(pet.care + 1, 0, 100); host.tone('sine', 500, 900, 0.2, 0.1); say('🧼 Squeaky clean!'); save(); return; }
      if (id === 'play') { if (pet.sick) return say(pet.name + ' feels too sick to play. Medicine helps 💊'); if (pet.energy < 20) return say(pet.name + ' is too tired. Let it sleep 💤'); mode = 'play'; playT = 9; playHits = 0; ball = { x: 400, y: 200, vx: 260, vy: 0 }; return; }
      if (id === 'pet') { pet.tapped++; pet.joy = clamp(pet.joy + 3, 0, 100); hop = 14; for (let i = 0; i < 3; i++) hearts.push({ x: 400 + (R() - 0.5) * 90, y: 270, v: 40 + R() * 30, l: 1.2 }); host.tone('sine', 700, 1000, 0.1, 0.1); }
    }
    function feed(f) {
      const pet = p(), sv = SV(); if (!pet) return;
      if (f.cure) { if (!pet.sick) return say(pet.name + ' is not sick.'); if (sv.bread < f.cost) return say('Not enough bread 🍞'); sv.bread -= f.cost; pet.sick = false; pet.clean = Math.max(pet.clean, 40); say('💊 All better!'); save(); mode = 'main'; return; }
      if (pet.full >= 95) return say(pet.name + ' is full!');
      if (sv.bread < f.cost) return say('Not enough bread 🍞');
      sv.bread -= f.cost; pet.full = clamp(pet.full + f.full, 0, 100); pet.joy = clamp(pet.joy + f.joy, 0, 100); pet.lastFed = nowFn(); pet.fed++; pet.care = clamp(pet.care + 1.5, 0, 100); pet.poopT += f.id === 'cake' ? 1.5 : 0.4;
      hop = 18; for (let i = 0; i < 4; i++) hearts.push({ x: 400 + (R() - 0.5) * 90, y: 260, v: 40 + R() * 30, l: 1.1, e: f.icon }); host.tone('triangle', 400, 700, 0.14, 0.12);
      const k = dayKey(); if (d.giftDay !== k) { d.giftDay = k; const g = stageOf(pet) === 'baby' ? 5 : stageOf(pet) === 'kid' ? 10 : 20; sv.bread += g; d.days = (d.days | 0) + 1; say('Yum! 🎁 Daily care gift: +' + g + ' 🍞', 3); } else say('Yum! ' + f.icon);
      mode = 'main'; save();
    }
    const tap = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return; const f = frame(host, 800, 480), q = toL(host, f, e), hit = (b) => q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h;
      for (const b of topBtns()) if (hit(b)) { if (b.id === 'done') { host.end(Math.max(d.adults, 0) * 10 + (d.days | 0), 'Your pets miss you. Come back tomorrow to feed them!'); return; } mode = mode === 'dex' ? 'main' : 'dex'; return; }
      if (mode === 'dex') { mode = 'main'; return; }
      const pet = p();
      if (!pet) { for (let i = 0; i < 4; i++) { const b = btn('t' + i, '', 40 + i * 190, 130, 175, 240); if (hit(b)) { adopt(i); return; } } return; }
      if (mode === 'food') { FOODS.forEach((fd, i) => { if (hit(btn('f', '', 100 + i * 150, 190, 140, 150))) feed(fd); }); if (hit(btn('x', '', 330, 360, 140, 40))) mode = 'main'; return; }
      if (mode === 'play') { if (ball && Math.hypot(q.x - ball.x, q.y - ball.y) < 60) { playHits++; ball.vy = -420; ball.vx = (R() < 0.5 ? -1 : 1) * (200 + R() * 220); hop = 10; host.tone('triangle', 500 + playHits * 30, 900 + playHits * 30, 0.1, 0.12); } return; }
      if (stageOf(pet) === 'egg') { if (Math.hypot(q.x - 400, q.y - 330) < 90) { pet.hatchAt -= 3000; hop = 6; hearts.push({ x: 400, y: 260, v: 50, l: 1, e: '💛' }); } return; }
      for (const b of mainBtns()) if (hit(b)) { act(b.id); return; }
      for (let i = 0; i < pet.poops; i++) { const px = 250 + i * 70, py = 400; if (Math.hypot(q.x - px, q.y - py + 30) < 36) { pet.poops--; pet.clean = clamp(pet.clean + 15, 0, 100); pet.joy = clamp(pet.joy + 2, 0, 100); host.tone('sine', 600, 900, 0.1, 0.1); save(); return; } }
      if (Math.hypot(q.x - 400, q.y - 330) < 110) act('pet');
    };
    const cv = c.canvas, onDown = (e) => tap(e); cv.addEventListener('pointerdown', onDown);

    const bar = (x, y, w, v, icon, col) => { c.font = '18px system-ui'; c.textAlign = 'left'; c.fillStyle = INK; c.fillText(icon, x, y + 13); c.fillStyle = 'rgba(0,0,0,.22)'; rr(c, x + 28, y, w, 14, 7); c.fill(); c.fillStyle = v < 25 ? '#ff5a5a' : col; if (v > 0) { rr(c, x + 28, y, Math.max(10, w * v / 100), 14, 7); c.fill(); } c.strokeStyle = INK; c.lineWidth = 2; rr(c, x + 28, y, w, 14, 7); c.stroke(); };
    const button = (b, on) => { c.fillStyle = on === false ? 'rgba(255,255,255,.5)' : '#fff8e8'; c.strokeStyle = INK; c.lineWidth = 3.5; rr(c, b.x, b.y, b.w, b.h, 16); c.fill(); c.stroke(); c.fillStyle = INK; c.font = '800 18px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1); c.textBaseline = 'alphabetic'; };

    return {
      destroy() { cv.removeEventListener('pointerdown', onDown); save(); },
      key(code, down) { if (!down) return; if (code === 'Escape') { mode = 'main'; } },
      update(dt) {
        t += dt; toastT = Math.max(0, toastT - dt); hop = Math.max(0, hop - dt * 40);
        for (const h of hearts) { h.y -= h.v * dt; h.l -= dt; } hearts = hearts.filter((h) => h.l > 0);
        for (const b of bubbles) { b.y -= b.v * dt; b.l -= dt; } bubbles = bubbles.filter((b) => b.l > 0);
        if (t - lastSecond >= 1) { lastSecond = t; const r = sync(d); if (r === 'ranaway') { status = r; mode = 'main'; save(); } else if (p()) { const pet = p(); if (d.justAdult) { say('🎉 ' + d.justAdult + ' grew into an adult! +bread', 4); d.justAdult = null; } if (pet.sleeping && pet.energy >= 100) say('☀️ ' + pet.name + ' woke up.'); save(); } }
        if (mode === 'play' && ball) {
          ball.vy += 900 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; if (ball.y > 380) { ball.y = 380; ball.vy = -Math.abs(ball.vy) * 0.85 - 120; } if (ball.x < 100 || ball.x > 700) { ball.vx *= -1; ball.x = clamp(ball.x, 100, 700); }
          playT -= dt;
          if (playT <= 0) { const pet = p(); if (pet) { const gain = Math.min(45, 6 + playHits * 5); pet.joy = clamp(pet.joy + gain, 0, 100); pet.energy = clamp(pet.energy - 15, 0, 100); pet.full = clamp(pet.full - 5, 0, 100); pet.care = clamp(pet.care + 2, 0, 100); const sv = SV(); const bonus = playHits >= 8 ? 5 : 0; if (bonus && sv) sv.bread += bonus; say('⚽ ' + playHits + ' catches! +' + gain + ' joy' + (bonus ? ' · +5 🍞' : ''), 3); save(); } mode = 'main'; ball = null; }
        }
        host.hud({ title: 'Pet Pal', text: p() ? p().name : 'Adopt a pet' });
      },
      draw() {
        const f = frame(host, 800, 480); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        const hr = new Date(nowFn()).getHours(), night = hr >= 21 || hr < 6, pet = p(), dark = pet && pet.sleeping;
        const g = c.createLinearGradient(0, 0, 0, 480); if (night) { g.addColorStop(0, '#1a2250'); g.addColorStop(1, '#3a3a7a'); } else { g.addColorStop(0, '#9fd8ff'); g.addColorStop(1, '#e8f7d0'); } c.fillStyle = g; c.fillRect(0, 0, 800, 480);
        if (night) { c.fillStyle = '#fff'; for (let i = 0; i < 26; i++) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); c.fillRect((i * 97) % 800, (i * 53) % 220, 2, 2); } c.globalAlpha = 1; }
        c.fillStyle = night ? '#2a4a3a' : '#7ad05a'; c.fillRect(0, 340, 800, 140); c.fillStyle = night ? '#335a46' : '#58b848'; c.fillRect(0, 340, 800, 10);
        // window + rug
        c.fillStyle = 'rgba(255,255,255,.55)'; c.strokeStyle = INK; c.lineWidth = 4; rr(c, 90, 120, 120, 100, 10); c.fill(); c.stroke(); c.beginPath(); c.moveTo(150, 120); c.lineTo(150, 220); c.moveTo(90, 170); c.lineTo(210, 170); c.stroke();
        c.fillStyle = night ? '#6a4a7a' : '#e87a8a'; c.beginPath(); c.ellipse(400, 392, 230, 28, 0, 0, 7); c.fill();
        if (pet) {
          const st = stageOf(pet);
          if (st === 'egg') { drawEgg(c, pet, t, 400, 392, hop > 0 || (pet.hatchAt - nowFn()) < 6000, null); say0(c, 'Hatching in ' + Math.ceil((pet.hatchAt - nowFn()) / 1000) + 's · tap the egg to help!', 400, 80); }
          else drawPet(c, pet, t, { x: 400, y: 392, hop, stage: st });
          for (let i = 0; i < pet.poops; i++) { c.font = '34px system-ui'; c.textAlign = 'center'; c.fillText('💩', 250 + i * 70, 410); }
          for (const h of hearts) { c.globalAlpha = Math.min(1, h.l); c.font = '26px system-ui'; c.textAlign = 'center'; c.fillText(h.e || '💗', h.x, h.y); } c.globalAlpha = 1;
          for (const b of bubbles) { c.globalAlpha = Math.min(1, b.l); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.stroke(); } c.globalAlpha = 1;
          // top-left info + bars
          c.save(); c.translate(0, 38);
          c.fillStyle = 'rgba(255,255,255,.8)'; rr(c, 14, 10, 300, 168, 14); c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
          const sp = SPECIES[pet.sp]; c.fillStyle = INK; c.font = '900 20px system-ui'; c.textAlign = 'left'; c.fillText((pet.shiny ? '✨ ' : '') + pet.name, 26, 36); c.font = '700 13px system-ui'; c.fillText(sp.name + ' · ' + st + ' · age ' + dur(ageH(pet)).replace(/ \d+m$/, '') + (st === 'adult' ? ' · ' + (pet.form === 'happy' ? 'happy form 👑' : pet.form === 'grumpy' ? 'grumpy form' : 'normal form') : ''), 26, 54);
          bar(26, 66, 190, pet.full, '🍞', '#ffb02a'); bar(26, 90, 190, pet.joy, '😊', '#ff7aa8'); bar(26, 114, 190, pet.clean, '🧼', '#4ab8ff'); bar(26, 138, 190, pet.energy, '🔋', '#7ad84a');
          const hl = hoursLeft(pet); if (st !== 'egg') { c.font = '800 13px system-ui'; c.fillStyle = hl < 8 ? '#d02a2a' : INK; c.fillText(hl < 8 ? '⚠️ Runs away in ' + dur(hl) + '!' : '🕒 Feed within ' + dur(hl), 26, 168); }
          c.restore();
          if (st !== 'egg' && mode === 'main') for (const b of mainBtns()) button(b);
        } else {
          c.fillStyle = INK; c.font = '900 28px system-ui'; c.textAlign = 'center'; c.fillText(d.lastLost && status === 'ranaway' || d.lastLost ? '💔 ' + d.lastLost.name + ' ran away' : '🐾 Adopt a pet', 400, 56);
          c.font = '700 15px system-ui'; c.fillText(d.lastLost ? 'You did not feed ' + d.lastLost.name + ' for ' + d.lastLost.hours + ' hours. Be kinder to the next one…' : 'Pick an egg. Feed your pet every day or it will run away!', 400, 84);
          c.font = '800 16px system-ui'; c.fillText('You have ' + Math.floor((SV() || { bread: 0 }).bread) + ' 🍞', 400, 112);
          TIERS.forEach((T, i) => { const x = 40 + i * 190; c.fillStyle = '#fff8e8'; c.strokeStyle = INK; c.lineWidth = 4; rr(c, x, 130, 175, 240, 18); c.fill(); c.stroke(); drawEgg(c, null, t + i, x + 87, 270, false, T.icon); c.fillStyle = INK; c.font = '900 17px system-ui'; c.textAlign = 'center'; c.fillText(T.name, x + 87, 300); c.font = '600 12px system-ui'; c.fillText(T.rare, x + 87, 322); c.font = '900 18px system-ui'; c.fillStyle = '#c0701a'; c.fillText(T.price + ' 🍞', x + 87, 352); });
          c.font = '600 13px system-ui'; c.fillStyle = INK; c.fillText('Pets that grew up so far: ' + d.adults + ' · Pets that ran away: ' + d.lost, 400, 410);
        }
        for (const b of topBtns()) button(b);
        if (mode === 'food' && pet) {
          c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, 800, 480); say0(c, 'What should ' + pet.name + ' eat?', 400, 150, '#fff');
          FOODS.forEach((fd, i) => { const x = 100 + i * 150, ok = !fd.cure || pet.sick; c.fillStyle = ok ? '#fff8e8' : 'rgba(255,248,232,.55)'; c.strokeStyle = INK; c.lineWidth = 4; rr(c, x, 190, 140, 150, 18); c.fill(); c.stroke(); c.font = '56px system-ui'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(fd.icon, x + 70, 255); c.font = '800 16px system-ui'; c.fillText(fd.name, x + 70, 284); c.font = '700 13px system-ui'; c.fillText(fd.cure ? 'cures sickness' : '+' + fd.full + ' food' + (fd.joy ? ' +' + fd.joy + ' joy' : ''), x + 70, 306); c.fillText(fd.cost ? fd.cost + ' 🍞' : 'free', x + 70, 328); });
          button(btn('x', '← Back', 330, 360, 140, 40));
        }
        if (mode === 'play' && ball) { c.font = '56px system-ui'; c.textAlign = 'center'; c.fillText('⚽', ball.x, ball.y + 18); say0(c, 'Tap the ball! ' + playHits + ' · ' + Math.ceil(playT) + 's', 400, 80); }
        if (mode === 'dex') {
          c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, 800, 480); c.fillStyle = '#fff8e8'; c.strokeStyle = INK; c.lineWidth = 4; rr(c, 60, 50, 680, 380, 20); c.fill(); c.stroke();
          c.fillStyle = INK; c.font = '900 24px system-ui'; c.textAlign = 'center'; c.fillText('📖 Pet Dex · ' + Object.keys(d.dex).length + '/' + Object.keys(SPECIES).length + ' raised to adult', 400, 90);
          Object.keys(SPECIES).forEach((k, i) => { const x = 118 + (i % 8) * 80, y = 215 + Math.floor(i / 8) * 130, got = d.dex[k]; c.save(); c.translate(x, y); c.scale(0.4, 0.4); if (got) drawPet(c, { sp: k, born: 0, hatchAt: 0, full: 80, joy: 80, clean: 90, energy: 90, form: 'normal', care: 70, poops: 0 }, t, { stage: 'adult' }); else { c.globalAlpha = 0.35; c.filter = 'brightness(0)'; drawPet(c, { sp: k, born: 0, hatchAt: 0, full: 80, joy: 80, clean: 90, energy: 90, form: 'normal', care: 70, poops: 0 }, 0, { stage: 'adult' }); c.filter = 'none'; } c.restore(); c.fillStyle = INK; c.font = '700 13px system-ui'; c.textAlign = 'center'; c.fillText(got ? SPECIES[k].name + (got > 1 ? ' ×' + got : '') : '???', x, y + 22); });
          c.font = '600 13px system-ui'; c.fillText('Tap anywhere to close', 400, 416);
        }
        if (toastT > 0) { c.globalAlpha = Math.min(1, toastT); c.fillStyle = 'rgba(31,42,54,.9)'; c.font = '800 16px system-ui'; const w = c.measureText(toast).width + 34; rr(c, 400 - w / 2, 372 - 0, w, 34, 17); c.fill(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(toast, 400, 395); c.globalAlpha = 1; }
        if (dark && mode !== 'dex') { c.fillStyle = 'rgba(10,10,40,.45)'; c.fillRect(0, 0, 800, 400); c.font = '800 14px system-ui'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('💤 Lights out', 400, 30); }
        c.restore();
      },
    };
    function say0(cc, s, x, y, col) { cc.save(); cc.font = '900 22px system-ui'; cc.textAlign = 'center'; cc.lineWidth = 6; cc.strokeStyle = 'rgba(255,255,255,.9)'; cc.strokeText(s, x, y); cc.fillStyle = col || INK; cc.fillText(s, x, y); cc.restore(); }
  }

  MG.list.push({ id: 'petpal', name: 'Pet Pal', icon: '🐾', desc: 'Hatch and raise a pet. Feed it every day or it runs away! 16 species, evolutions and a pet dex.', theme: 'meadow', deco: 'farm', fmt: (s) => s + ' care pts', reward: (s) => Math.min(30, s), create });

  // achievements + helper hooks
  setTimeout(() => {
    const A = root.Achievements && root.Achievements.LIST; if (!A) return;
    const add = (id, icon, name, desc, val, goal, reward) => { if (!A.some((a) => a.id === id)) A.push({ id, icon, name, desc, val, goal, reward }); };
    const P = (s) => s.pets || { dex: {}, hatched: 0, adults: 0, lost: 0 };
    add('pet1', '🐣', 'Egg Sitter', 'Hatch your first pet.', (s) => P(s).hatched, 1, 20);
    add('pet2', '🐾', 'Good Parent', 'Raise a pet to adulthood.', (s) => P(s).adults, 1, 100);
    add('pet5', '📖', 'Pet Collector', 'Raise 5 different species to adults.', (s) => Object.keys(P(s).dex).length, 5, 250);
    add('pet12', '🏅', 'Gotta Raise Them All', 'Raise all 16 species to adults.', (s) => Object.keys(P(s).dex).length, 16, 800);
    add('petday7', '🗓️', 'Week of Care', 'Get the daily care gift 7 days.', (s) => P(s).days || 0, 7, 120);
  }, 400);
  root.Pets = { SPECIES, TIERS, newPet, tick, sync, stageOf, load, _setNow: (f) => { nowFn = f || (() => Date.now()); }, _drawPet: drawPet };
})(window);
