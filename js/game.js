/* Wobble City: rendering, input, menus, store, save data, minigame host.
 * Physics: physics.js. Levels: levels.js. Clothes: clothes.js. Minigames: minigames.js. */
(function () {
  'use strict';

  const STEP = 1 / 60;
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const INK = '#1f2a36';
  const LEVELS = window.Levels;
  const { World, Goose, buildLevel, touchesHazard, NECK_SEGS } = window.Physics;
  const { ITEMS, CATS, BY_ID } = window.Clothes;
  const SKINS = window.Skins;
  const ENEMIES = window.Enemies;
  const BOSS = window.Boss;
  const MECH = window.Mech;
  BOSS.decorate(LEVELS);   // adds the boss arenas to levels 10, 20 and 33

  // ---------------------------------------------------------------- viewport
  let W = 0, H = 0, DPR = 1, S = 1, VW = 0, VH = 0;
  let zoomMul = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    S = Math.max(0.5, Math.min(W / 760, H / 440)) * zoomMul;
    VW = W / S; VH = H / S;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------------------------------------------------------------- save data
  const KEY = 'wobble.save.v2';
  const DIFFS = {
    easy:   { name: 'Easy',   wobble: 1.15, tremor: 0,   mult: 1, desc: 'A mostly-obedient neck.' },
    normal: { name: 'Normal', wobble: 0.9,  tremor: 0.4, mult: 1, desc: 'Floppy, with occasional twitching.' },
    hard:   { name: 'Hard',   wobble: 0.5,  tremor: 1,   mult: 2, desc: 'Very wobbly. Double bread.' },
    insane: { name: 'Insane', wobble: 0.25, tremor: 2,   mult: 3, desc: 'A wet noodle with opinions. Triple bread.' },
    noodle: { name: 'Spaghetti', wobble: 0.22, tremor: 9, chaos: true, mult: 5, desc: 'Almost impossible. The neck whips about and the neck pad is haunted. 5x bread.' },
  };
  const DIFF_ORDER = ['easy', 'normal', 'hard', 'insane', 'noodle'];
  const defaults = () => ({ bread: 25, unlocked: 1, allDone: false, mg: false, owned: {}, equip: {}, best: {}, diff: 'normal', cheats: {}, skin: 'goose', skins: { goose: true }, enemies: true, stomps: 0, done: {}, perfect: {} });
  let save = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) save = Object.assign(defaults(), JSON.parse(raw));
  } catch (e) { /* storage unavailable: play without saving */ }
  if (!DIFFS[save.diff]) save.diff = 'normal';
  if (!save.cheats || typeof save.cheats !== 'object') save.cheats = {};
  if (window.BuildAGoose && Array.isArray(save.custom)) window.BuildAGoose.registerAll(save.custom);
  if (!SKINS.BY_ID[save.skin]) save.skin = 'goose';
  if (!save.skins || typeof save.skins !== 'object') save.skins = {};
  if (!save.tint || typeof save.tint !== 'object') save.tint = {};
  if (!save.equip || typeof save.equip !== 'object') save.equip = {};
  for (const k of Object.keys(save.equip)) {   // slots were reorganised (capes and wings moved to Back): move or drop old equips
    const item = BY_ID[save.equip[k]];
    if (!item) delete save.equip[k]; else if (item.cat !== k) { delete save.equip[k]; if (!save.equip[item.cat]) save.equip[item.cat] = item.id; }
  }
  save.skins.goose = true;
  if (!save.lvv) {   // the weather tier grew from 12 to 20 levels, so Mega levels moved 8 places: move their progress too
    save.lvv = 2;
    for (const key of ['done', 'perfect', 'best', 'bestTime']) {
      const o = save[key]; if (!o || typeof o !== 'object') continue;
      const n = {}; for (const k of Object.keys(o)) { const i = +k; n[i >= 115 && i < 130 ? i + 8 : k] = o[k]; } save[key] = n;
    }
  }
  save.unlocked = Math.max(1, Math.min(LEVELS.length, save.unlocked | 0));
  function persist() { save.updatedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } if (window.Sync && window.Sync.touch) window.Sync.touch(); }
  const syncCtx = { getSave: () => save,
    apply: (r) => { const own = save.cheats; const base = defaults(); for (const k of Object.keys(save)) delete save[k]; Object.assign(save, base, r, { cheats: own || {} }); try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } },
    done: () => location.reload() };
  setTimeout(() => { if (window.Sync && window.Sync.auto) window.Sync.auto(syncCtx); }, 1500);
  if (save.mg) { save.cheats.lol = true; save.mg = false; }   // older saves: the minigame code is now a normal, removable code
  const mgUnlocked = () => !!(has('lol') || save.allDone);
  let diffOverride = null;                      // multiplayer: both players use the host's difficulty
  const dKey = () => diffOverride || save.diff;
  const diff = () => DIFFS[dKey()];
  const mpOn = () => !!(window.MP && window.MP.active());
  // secret codes (type them in the Code box; type again to turn off)
  const CHEATS = {
    lol: 'All minigames', levels: 'All levels', speed: 'Super speed', neck: 'Long neck', money: 'Infinite bread', flaps: 'Infinite flaps',
    moon: 'Moon gravity', rainbow: 'Rainbow trail', disco: 'Disco sky', shield: 'Spike shield (no hazard deaths)', zoom: 'Wide zoom-out camera',
    admin: 'Admin console (codes are NOT switched on automatically)',
  };
  // one-shot codes: they give you something once instead of toggling
  const GIFTS = { skins: 'Every skin unlocked', clothes: 'Every cosmetic unlocked', bread: '+500 bread' };
  const has = (k) => !mpOn() && !(window.Battle && window.Battle.active()) && !!save.cheats[k] && !(window.Owner && window.Owner.blocks(k));   // codes are off during multiplayer games (admin no longer switches them on)   // admin switches on every code
  zoomMul = has('zoom') ? 0.7 : 1; resize();
  const tier3 = () => LEVELS.tier3 || 1e9;
  const levelOpen = (i) => {
    if (has('levels')) return true;
    if (i < (LEVELS.weather || LEVELS.length)) return i < save.unlocked;
    const start = i >= (LEVELS.sea || 1e9) ? LEVELS.sea : i >= tier3() ? tier3() : LEVELS.weather;      // the two bonus-bonus tiers open once the main 33 are done, one level at a time
    return !!save.allDone && (i === start || !!(save.done && save.done[i - 1]));
  };
  const rich = () => has('money');
  const money = () => (rich() ? '∞' : save.bread);
  const physItem = () => { const id = save.equip && save.equip.phys; const it = id && BY_ID[id]; return (it && it.phys) || {}; };
  const FX = () => (window.Owner && window.Owner.fx) || { time: 1, speed: 1, flap: 1, grav: 1, bounce: 0 };
  const gravK = () => (has('moon') ? 0.4 : 1) * (physItem().grav || 1) * FX().grav;
  function gooseOpts() {
    const d = diff(), PH = physItem();
    return { wobble: d.wobble * (PH.wobble || 1), tremor: d.tremor, chaos: !!d.chaos, speed: (has('speed') ? 2.3 : 1) * (PH.speed || 1) * FX().speed * ((SKINS.BY_ID[save.skin].phys || {}).speed || 1), flapK: ((SKINS.BY_ID[save.skin].phys || {}).flap || 1) * (PH.flap || 1) * FX().flap, neck: (SKINS.BY_ID[save.skin].neck || 1) * ((SKINS.BY_ID[save.skin].shape || {}).neck || 1) * (has('neck') ? 2.2 : 1), infFlaps: has('flaps'), legless: !!save.neckMode && !diffOverride,
      layout: SKINS.BY_ID[save.skin].shape || {}, jelly: physItem().jelly || SKINS.BY_ID[save.skin].jelly || null, bounce: Math.max(physItem().bounce || 0, FX().bounce || 0), hop: physItem().hop || 0, slip: physItem().slip || 1, glide: physItem().glide || 0,
      shapeW: (SKINS.BY_ID[save.skin].shape || {}).w || 1, shapeH: (SKINS.BY_ID[save.skin].shape || {}).h || 1, legM: ((SKINS.BY_ID[save.skin].shape || {}).leg || 1) * (physItem().jelly && !SKINS.BY_ID[save.skin].jelly ? 0.55 : 1) };
  }

  function applyPhys() {   // equip changes take effect at once (the body itself is rebuilt when we are not mid-level)
    if (world) world.gscale = gravK();
    if (goose && state !== 'play') { try { loadLevel(state === 'title' ? pick : levelIdx); } catch (e) { /* ignore */ } }
    else if (goose) applyFxLive();
  }
  function applyFxLive() {
    if (world) world.gscale = gravK();
    if (goose) { const o = gooseOpts(); goose.speed = o.speed; goose.flapK = o.flapK; goose.bounce = o.bounce; goose.hop = o.hop; goose.slip = o.slip; goose.glide = o.glide; }
  }
  const lookEquip = () => (save.tint && Object.keys(save.tint).length ? Object.assign({}, save.equip, { _tint: save.tint }) : save.equip);

  // ---------------------------------------------------------------- audio
  let actx = null;
  function audio() {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(type, f0, f1, dur, vol, delay) {
    if (save.sound === false) return;
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const snd = {
    honk: () => {
      const id = save.skin, vo = save.equip && save.equip.voice && BY_ID[save.equip.voice];
      if (vo && vo.voice) { vo.voice.forEach((v) => tone(v[0], v[1], v[2], v[3], v[4], v[5])); return; }
      if (id === 'chicken') { tone('square', 700, 500, 0.08, 0.12); tone('square', 640, 420, 0.1, 0.12, 0.12); }                       // bok bok
      else if (id === 'duck' || id === 'rubberduck') { tone('sawtooth', 520, 380, 0.14, 0.14); tone('sawtooth', 500, 360, 0.14, 0.14, 0.17); }   // quack
      else if (id === 'cat') { tone('triangle', 500, 900, 0.18, 0.14); tone('triangle', 900, 420, 0.3, 0.14, 0.18); }                      // meow
      else if (id === 'penguin') { tone('square', 300, 200, 0.2, 0.1); tone('sawtooth', 340, 240, 0.2, 0.08, 0.1); }
      else if (id === 'owl') { tone('sine', 330, 300, 0.3, 0.16); tone('sine', 260, 240, 0.4, 0.16, 0.35); }                              // hoo hoo
      else if (id === 'frog') { tone('square', 120, 90, 0.12, 0.14); tone('square', 140, 100, 0.12, 0.14, 0.15); }
      else if (id === 'dino') { tone('sawtooth', 120, 60, 0.6, 0.2); tone('square', 90, 50, 0.6, 0.1); }
      else if (id === 'parrot') { tone('triangle', 900, 1400, 0.12, 0.12); tone('triangle', 1300, 700, 0.18, 0.12, 0.14); }
      else if (id === 'giraffe' || id === 'llama') { tone('sine', 200, 340, 0.3, 0.14); tone('sine', 340, 220, 0.3, 0.14, 0.3); }
      else { tone('sawtooth', 400 + Math.random() * 50, 280, 0.32, 0.16); tone('square', 200, 145, 0.32, 0.07); }
    },
    flap: () => tone('triangle', 190, 90, 0.12, 0.07),
    bread: () => tone('sine', 740, 1180, 0.14, 0.12),
    egg: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.14, i * 0.11)),
    splash: () => tone('sine', 300, 70, 0.3, 0.12),
    boing: () => tone('sine', 200, 700, 0.25, 0.14),
    ouch: () => tone('square', 220, 80, 0.25, 0.1),
    buy: () => { tone('triangle', 660, 990, 0.12, 0.12); tone('triangle', 990, 1320, 0.14, 0.1, 0.1); },
    no: () => tone('square', 160, 110, 0.18, 0.08),
    tick: () => tone('square', 900, 900, 0.04, 0.05),
    low: () => tone('triangle', 140, 90, 0.2, 0.1),
  };

  // ---------------------------------------------------------------- state
  const input = { atkQueue: false, left: false, right: false, kLeft: false, kRight: false, flapHeld: false, flapQueue: false, honkQueue: false, padAim: null, mouseAim: null };
  const keys = new Set();
  let slow = false;
  let state = 'title';                 // title | play | done | store | mgmenu | mg | mgdone
  let levelIdx = 0, pick = 0, level = null, world = null, goose = null, extras = null;
  let checkpoint = null, bread = [], breadGot = 0, deaths = 0;
  let camX = 0, camY = 0, clock = 0, toastT = 0, honkText = 0, boingT = 0, splashes = [];
  let mgInst = null, mgDef = null;

  function toast(msg, secs) {
    const el = $('toast');
    el.textContent = msg; el.classList.add('show'); toastT = secs || 3;
  }

  let decor = null;
  let chasers = [], trailP = [], enemies = [], enemyDead = {}, levelClock = 0, hitCd = 0, prevCy = 0, lastVy = 0;
  let bolt = null, nextBolt = 6, hailOn = false;
  let mech = null, boss = null, bossPhase = null, eggPos = null, wxInfo = { a: 0, warn: 0, dir: 0 };
  function loadLevel(i, custom) {
    levelIdx = i; level = custom || LEVELS[i];
    world = new World();
    world.gscale = gravK();
    trailP = [];
    decor = window.Decor.generate(level, custom ? 0 : i);
    enemies = (save.enemies !== false) ? ENEMIES.generate(level, custom ? -1 : i, dKey()) : []; enemyDead = {}; levelClock = 0; hitCd = 0; prevCy = 0;
    chasers = (level.life || []).filter((l) => l.kind === 'chaser').map((l) => ({ x: l.trig - 700, y: l.y, r: l.r, v: l.v0, acc: l.acc, vmax: l.vmax, trig: l.trig, xEnd: l.xEnd, on: false, gone: false, ph: 0 }));
    extras = buildLevel(world, level);
    const d = diff();
    goose = new Goose(world, level.spawn[0], level.spawn[1], gooseOpts());
    if (window.Chungas) window.Chungas.onLevel(world, level, goose, Goose);
    boss = null; bossPhase = null; eggPos = level.egg; wxInfo = { a: 0, warn: 0, dir: 0 };
    if (level.boss && !custom && !mpOn() && !window.Battle.active()) { boss = BOSS.create(level.boss, dKey()); bossPhase = 'door'; }
    mech = MECH.build(world, level);
    applyWeather(custom); bolt = null; nextBolt = 6;
    th = THEMES[level.theme] || THEMES.meadow;
    checkpoint = { x: level.spawn[0], y: level.spawn[1] };
    bread = level.bread.map((b) => ({ x: b[0], y: b[1], got: false }));
    breadGot = 0; deaths = 0; splashes = [];
    const c = goose.center();
    camX = c.x - VW * 0.4; camY = c.y - VH * 0.58;
    $('levelName').textContent = custom ? level.name : (i + 1) + '/' + LEVELS.length + '  ' + level.name;
    updateHud();
  }

  // wind, waves and rain from level.weather (see levels.js)
  const WIND_MUL = { easy: 0.6, normal: 1, hard: 1.15, insane: 1.3, noodle: 1.3 };
  function applyWeather(custom) {
    const wx = level.weather;
    if (!wx || custom) return;
    if (wx.wind) { const spec = { wind: wx.wind * (WIND_MUL[dKey()] || 1), per: wx.per }; world.windFn = (t) => window.Physics.windInfo(spec, t).a; world.windSpec = spec; }
    if (wx.waves) { world.waveH = wx.waves; world.waveK = wx.waveK || 0; }
    if (wx.rain) { for (const sg of world.segs) if (sg.mu == null) sg.mu = 0.5; for (const so of world.solids) if (!so.pad && so.mu == null) so.mu = 0.55; }
    for (const q of goose.neck) q.wk = 3.5;
    for (const q of goose.body) q.wk = 0.9;
    for (const q of goose.feet) q.wk = 0.15;
  }

  function updateHud() {
    $('breadCount').textContent = '🍞 ' + breadGot + '/' + bread.length;
    const st = $('stamina');
    if (!st.children.length) for (let i = 0; i < 5; i++) st.appendChild(document.createElement('i'));
    const n = goose ? Math.floor(goose.stamina + 0.001) : 5;
    for (let i = 0; i < 5; i++) st.children[i].className = i < n ? 'on' : '';
    if (goose) $('speed').textContent = (Math.hypot(goose.velocity().x, goose.velocity().y) / 100).toFixed(1) + ' m/s';
  }

  function respawn() {
    if (boss && bossPhase === 'fight' && !boss.dead) BOSS.reset(boss);
    goose.reset(checkpoint.x, checkpoint.y);
    const c = goose.center();
    camX = c.x - VW * 0.4; camY = c.y - VH * 0.58;
  }

  // ---------------------------------------------------------------- level tick
  let trailAcc = 0, trailHue = 0;
  function spawnTrail(tr, c) {
    trailAcc += 1;
    if (trailAcc < 3) return; trailAcc = 0;
    trailHue = (trailHue + 25) % 360;
    const cols = tr.cols || ['#fff'];
    const k = tr.kind, up = (k === 'flame' || k === 'bubble' || k === 'heart' || k === 'note') ? -40 : k === 'firefly' ? -12 : (k === 'snow' || k === 'leaf' || k === 'confetti' || k === 'crumb') ? 25 : k === 'coin' ? 45 : 0;
    trailP.push({ k, x: c.x + (Math.random() - 0.5) * 24, y: c.y + (Math.random() - 0.5) * 18, vx: (Math.random() - 0.5) * 30, vy: up + (Math.random() - 0.5) * 30,
      t: 0, life: k === 'rainbow' ? 0.9 : 0.8 + Math.random() * 0.5, col: k === 'rainbow' ? 'hsl(' + trailHue + ',90%,60%)' : cols[(Math.random() * cols.length) | 0], r: 4 + Math.random() * 4, rot: Math.random() * 6 });
    if (trailP.length > 140) trailP.shift();
  }
  function drawTrail() {
    for (const q of trailP) {
      const a = 1 - q.t / q.life; ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(q.x, q.y); ctx.fillStyle = q.col; ctx.strokeStyle = q.col;
      const r = q.r;
      if (q.k === 'heart') { ctx.scale(r / 10, r / 10); ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-14, -2, -7, -12, 0, -4); ctx.bezierCurveTo(7, -12, 14, -2, 0, 8); ctx.fill(); }
      else if (q.k === 'bubble') { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); }
      else if (q.k === 'spark' || q.k === 'star') { ctx.rotate(q.rot + q.t * 3); ctx.fillRect(-r * 0.2, -r, r * 0.4, r * 2); ctx.fillRect(-r, -r * 0.2, r * 2, r * 0.4); }
      else if (q.k === 'flame') { ctx.beginPath(); ctx.arc(0, 0, r * a + 1, 0, 7); ctx.fill(); }
      else if (q.k === 'note') { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.5, -0.4, 0, 7); ctx.fill(); ctx.fillRect(r * 0.5, -r * 1.6, 1.6, r * 1.6); }
      else if (q.k === 'leaf') { ctx.rotate(q.rot + q.t * 4); ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.5, 0, 0, 7); ctx.fill(); }
      else if (q.k === 'rainbow') { ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, 7); ctx.fill(); }
      else if (q.k === 'confetti') { ctx.rotate(q.rot + q.t * 6); ctx.fillRect(-r * 0.7, -r * 0.35, r * 1.4, r * 0.7); }
      else if (q.k === 'coin') { ctx.scale(Math.abs(Math.cos(q.rot + q.t * 7)) + 0.15, 1); ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 7); ctx.fill(); }
      else if (q.k === 'crumb') { ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 7); ctx.fill(); }
      else if (q.k === 'pixel') { ctx.fillRect(-r * 0.5, -r * 0.5, r, r); }
      else if (q.k === 'firefly') { ctx.globalAlpha = Math.max(0, a) * (0.5 + 0.5 * Math.sin(q.t * 14)); ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, 7); ctx.fill(); ctx.globalAlpha *= 0.4; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, 7); ctx.fill(); }
      else if (q.k === 'bolt') { ctx.rotate(q.rot); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(0, -r * 0.2); ctx.lineTo(-r * 0.3, r * 0.2); ctx.lineTo(r, r); ctx.stroke(); }
      else if (q.k === 'ink') { ctx.beginPath(); ctx.arc(0, 0, r * (0.6 + q.t), 0, 7); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 7); ctx.fill(); }
      ctx.restore();
    }
  }
  // ---- deadly weather: lightning strikes (warning ring, then a bolt) and hailstones
  const L_MUL = { easy: 1.6, normal: 1.15, hard: 1, insane: 0.85, noodle: 0.85 };
  const hailStones = (T, x0, x1) => {
    const out = [], cell = 200, ph = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) {
      for (let j = 0; j < 2; j++) {
        const a = ph(i * 2 + j), x = i * cell + ph(i * 3 + j + 9) * cell, y = ((T * (360 + a * 100) + a * 1600) % 1600) - 900;
        const g = ENEMIES.groundAt(level, x);
        if (g !== null && y > g - 6) continue;
        out.push({ x, y, r: 9 });
      }
    }
    return out;
  };
  function stormTick() {
    const wx = level && level.weather; if (!wx || state !== 'play' || !goose) return;
    const T = world.time, c = goose.center();
    if (wx.lightning) {
      if (!bolt && T >= nextBolt) {
        const tx = c.x + Math.max(-140, Math.min(140, (goose.vx || 0) * 0.45));
        const g = ENEMIES.groundAt(level, tx);
        bolt = { x: tx, y: g !== null ? g : c.y + 50, warn: T, strike: T + (dKey() === 'easy' ? 2.0 : 1.5), hit: false };
        nextBolt = T + wx.lightning * (L_MUL[dKey()] || 1);
      }
      if (bolt && T >= bolt.strike && !bolt.hit) {
        bolt.hit = true; snd.no();
        if (canDie() && goose.body.concat(goose.feet).some((q) => Math.abs(q.x - bolt.x) < 48)) { hitCd = 1.2; deaths++; snd.ouch(); toast('⚡ Struck by lightning! Run from the warning ring.', 2.2); respawn(); }
      }
      if (bolt && T > bolt.strike + 0.4) bolt = null;
    }
    if (wx.hail && canDie()) {
      for (const h of hailStones(T, c.x - 60, c.x + 60)) {
        if (goose.body.concat(goose.feet).some((q) => Math.hypot(q.x - h.x, q.y - h.y) < h.r + q.r * 0.7)) { hitCd = 1.2; deaths++; snd.ouch(); toast('🧊 Hailstone! Look up and dodge.', 2); respawn(); return; }
      }
    }
  }
  function drawStormWorld(T) {
    const wx = level.weather; if (!wx) return;
    if (bolt) {
      const w = T - bolt.warn, st = T >= bolt.strike;
      ctx.save();
      if (!st) {
        const k = Math.min(1, w / (bolt.strike - bolt.warn)), blink = Math.floor(T * 8) % 2 ? 1 : 0.5;
        ctx.strokeStyle = 'rgba(255,230,80,' + 0.9 * blink + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(bolt.x, bolt.y, 48, 10, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(255,230,80,' + 0.18 * blink + ')'; ctx.beginPath(); ctx.ellipse(bolt.x, bolt.y, 48 * k, 10 * k, 0, 0, 7); ctx.fill();
        ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,230,80,' + blink + ')'; ctx.fillText('⚡', bolt.x, bolt.y - 18 - Math.sin(T * 10) * 4);
      } else {
        const f = 1 - (T - bolt.strike) / 0.4; ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0, f) + ')'; ctx.lineWidth = 9 * f + 2; ctx.shadowColor = '#bfe0ff'; ctx.shadowBlur = 24; ctx.lineJoin = 'round'; ctx.beginPath();
        let x = bolt.x, y = bolt.y - 1200; ctx.moveTo(x, y); for (let i = 1; i <= 14; i++) { y = bolt.y - 1200 + (1200 * i) / 14; x = bolt.x + (i === 14 ? 0 : Math.sin(i * 12.9 + Math.floor(bolt.strike * 10)) * 42); ctx.lineTo(x, y); } ctx.stroke();
      }
      ctx.restore();
    }
    if (wx.hail) {
      ctx.save(); ctx.fillStyle = '#eaf6ff'; ctx.strokeStyle = '#7a93aa'; ctx.lineWidth = 2;
      for (const h of hailStones(T, camX - 40, camX + VW + 40)) { ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(h.x - 3, h.y - 3, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#eaf6ff'; }
      ctx.restore();
    }
  }
  function chaserTick() {          // the giant fish in the narrow Deep Sea tunnels
    if (!chasers.length || state !== 'play') return;
    const c = goose.center(), parts = goose.body.concat(goose.feet);
    for (const f of chasers) {
      if (f.gone) continue;
      if (!f.on) { if (c.x > f.trig) { f.on = true; toast('🐟 A giant fish is chasing you! Swim, or tuck into a dip!', 2.6); } continue; }
      f.ph += STEP; f.v = Math.min(f.vmax, f.v + f.acc * STEP); f.x += f.v * STEP;
      if (f.x > f.xEnd + 200) { f.gone = true; continue; }
      if (canDie() && c.x < f.xEnd + 120) for (const q of parts) {
        const dx = (q.x - (f.x + f.r * 0.55)) / (f.r * 1.9), dy = (q.y - f.y) / f.r;
        if (dx * dx + dy * dy < 1 + q.r * 0.01) { hitCd = 1.2; deaths++; snd.ouch(); toast('🐟 Gulp! Too slow. Use the dips to hide.', 2.2); respawn(); f.x = f.trig - 700; f.on = false; f.v = 150; return; }
      }
    }
  }
  function drawChasers(c) {
    for (const f of chasers) {
      if (!f.on || f.gone) continue;
      const r = f.r, x = f.x, y = f.y + Math.sin(f.ph * 3) * 6;
      c.save(); c.translate(x, y);
      c.fillStyle = '#2f5d8a'; c.strokeStyle = '#142a40'; c.lineWidth = 5; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-r * 2.3, 0); c.lineTo(-r * 3.1, -r * 0.7 + Math.sin(f.ph * 7) * 10); c.lineTo(-r * 2.9, 0); c.lineTo(-r * 3.1, r * 0.7 - Math.sin(f.ph * 7) * 10); c.closePath(); c.fill(); c.stroke();   // tail
      c.beginPath(); c.ellipse(-r * 0.4, 0, r * 2.1, r, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#9ec7ea'; c.beginPath(); c.ellipse(-r * 0.2, r * 0.45, r * 1.7, r * 0.5, 0, 0, Math.PI); c.fill();
      c.fillStyle = '#2f5d8a'; c.beginPath(); c.moveTo(-r * 0.9, -r * 0.95); c.lineTo(-r * 0.2, -r * 1.6); c.lineTo(r * 0.4, -r * 0.9); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(r * 1.05, -r * 0.3, r * 0.26, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#c1121f'; c.beginPath(); c.arc(r * 1.12, -r * 0.3, r * 0.12, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(r * 1.5, r * 0.05); for (let i = 0; i < 6; i++) { c.lineTo(r * (1.55 - i * 0.18), r * 0.05 + (i % 2 ? 0 : r * 0.22)); } c.lineTo(r * 0.5, r * 0.05); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
  }
  function enemyTick() {
    chaserTick();
    const c = goose.center(), vy = (c.y - prevCy) / STEP; prevCy = c.y; lastVy = vy;
    if (!enemies.length || state !== 'play') return;
    const parts = goose.body.concat(goose.feet);
    if (hitCd <= 0 && canDie()) for (const b of ENEMIES.shots(enemies, levelClock)) {
      if (parts.some((q) => Math.hypot(q.x - b.x, q.y - b.y) < b.r + q.r * 0.8)) { hitCd = 1.2; deaths++; snd.ouch(); toast('Dodge the cannon shots!', 1.8); respawn(); return; }
    }
    for (const e of enemies) {
      if (enemyDead[e.id] > levelClock) continue;
      const p = ENEMIES.posAt(e, levelClock), r = ENEMIES.radiusAt(e, levelClock);
      const ey = p.y - (ENEMIES.FLYERS[e.kind] ? 0 : r);   // enemy centre
      let hit = false;
      for (const q of parts) if (Math.hypot(q.x - p.x, q.y - ey) < r + q.r * 0.8) { hit = true; break; }
      if (!hit) continue;
      const above = c.y < ey - r * 0.2 && vy > 40;
      if (above && ENEMIES.stompable(e)) {
        enemyDead[e.id] = levelClock + ENEMIES.RESPAWN; save.stomps = (save.stomps | 0) + 1; save.bread += 1; breadGot = breadGot;
        for (const q of parts) q.vy = Math.min(q.vy, -420);
        snd.boing(); toast('Stomp! +1 🍞', 0.9); persist();
      } else if (hitCd <= 0 && !has('shield') && !(save.cheats.admin && save.cheats.god && !mpOn())) {
        // enemies are deadly unless you stomp them from above
        hitCd = 1.2; deaths++; snd.ouch(); toast(e.kind === 'urchin' ? 'Ouch! Spikes!' : e.kind === 'turret' ? 'Ouch! Armoured: jump over it.' : e.kind === 'charger' ? 'Run! Or jump on its head.' : ({ jelly: 'Zap! Jellyfish sting.', puffer: 'Prickly! Pufferfish.', eel: 'Zap! Eel.', shark: 'Chomp!' })[e.kind] || 'Gotcha! Stomp them from above.', 1.8); respawn();
      }
    }
  }
  const canDie = () => hitCd <= 0 && !has('shield') && !(save.cheats.admin && save.cheats.god && !mpOn());
  function startBoss() {
    bossPhase = 'fight'; eggPos = boss.spec.egg; BOSS.reset(boss);
    checkpoint = { x: boss.spec.entry[0], y: boss.spec.entry[1] };
    goose.reset(checkpoint.x, checkpoint.y);
    const c = goose.center(); camX = c.x - VW * 0.4; camY = c.y - VH * 0.58;
    hitCd = 1; trailP = []; snd.egg();
    toast('👹 BOSS! ' + boss.T.intro, 5);
  }
  function bossHurt(res) {
    if (res === 'dead') { save.bread += 25 * diff().mult; persist(); snd.egg(); toast('🏆 ' + boss.T.name + ' defeated! The egg is free! +' + (25 * diff().mult) + ' 🍞', 3.5); }
    else if (res === 'hit') { snd.boing(); toast('Direct hit! ' + boss.hp + ' to go', 1.2); }
    else if (res === false && !boss.dead && boss.inv <= 0 && levelClock - (boss.lastWarn || -9) > 3) { boss.lastWarn = levelClock; snd.no(); toast('Too alert! Wait until he is out of breath (★), then hit him.', 2.2); }
  }
  function bossTick() {
    if (!boss || bossPhase !== 'fight' || state !== 'play') return;
    const c = goose.center(), parts = goose.body.concat(goose.feet);
    for (const e of BOSS.update(boss, STEP, { x: c.x, y: c.y })) { if (e === 'bonk') snd.boing(); else if (e === 'dash') snd.no(); else if (e === 'tired') snd.tick(); else snd.flap(); }
    if (boss.dead) return;
    if (BOSS.touches(boss, parts)) {
      const bc = BOSS.centre(boss), above = c.y < bc.y - boss.T.r * 0.1 && lastVy > 40;
      if (above) { bossHurt(BOSS.hit(boss)); for (const q of parts) q.vy = Math.min(q.vy, -560); }
      else if (BOSS.harmful(boss) && canDie()) { hitCd = 1.2; deaths++; snd.ouch(); toast('Ouch! Stomp him from above, or honk in his face.', 2); respawn(); return; }
    }
    if (BOSS.projHits(boss, parts) && canDie()) { hitCd = 1.2; deaths++; snd.ouch(); toast('Hit! Honk to scare projectiles away.', 2); respawn(); }
  }
  function tick() {
    if (input.atkQueue) { input.atkQueue = false; if (window.Battle.active()) window.Battle.attack(); }
    const frz = (window.MP && window.MP.frozen()) || (window.Battle && window.Battle.frozen && window.Battle.frozen());
    const move = (frz ? 0 : (input.left || input.kLeft ? -1 : 0) + (input.right || input.kRight ? 1 : 0)) * (FX().reverse ? -1 : 1);
    const aim = input.padAim || input.mouseAim || null;
    const flap = frz ? false : input.flapQueue;
    input.flapQueue = false;
    if (flap && goose.stamina >= 1 && goose.flapCd <= 0) snd.flap();
    if (input.honkQueue) { input.honkQueue = false; goose.honk(); snd.honk(); honkText = 0.7; if (boss && bossPhase === 'fight' && state === 'play') { BOSS.honkClear(boss, goose.head); if (BOSS.honkHits(boss, goose.head, goose.facing)) bossHurt(BOSS.hit(boss)); } }
    const wasWet = goose.swimming;
    goose.update(STEP, { move, flap, glide: input.flapHeld, aim });
    if (window.Chungas) window.Chungas.tick(goose, STEP);
    if (FX().fly && input.flapHeld) for (const q of goose.body.concat(goose.feet, goose.neck || [])) { q.vy = Math.max(-420, q.vy - 55); }
    world.step(STEP);
    if (window.MP) window.MP.tick(goose, STEP);
    if (window.Battle.active()) window.Battle.tick(goose, STEP);
    levelClock += STEP; hitCd = Math.max(0, hitCd - STEP);
    enemyTick();
    bossTick();
    if (mech && state === 'play') {
      for (const e of MECH.tick(mech, goose, world, STEP)) {
        if (e === 'saw') { if (canDie()) { hitCd = 1.2; deaths++; snd.ouch(); toast('Sliced by a blade!', 1.6); respawn(); } }
        else if (e === 'portal') { snd.boing(); trailP = []; }
        else if (e === 'gate') { snd.egg(); toast('🔓 Click! A gate opened.', 1.8); }
        else if (e === 'crumble') snd.tick();
      }
    }
    if (world.windSpec) wxInfo = window.Physics.windInfo(world.windSpec, world.time);
    stormTick();
    {
      const tid = has('rainbow') ? 't_rainbow' : save.equip.trail;
      const tr = tid && BY_ID[tid] && BY_ID[tid].trail;
      if (tr) spawnTrail(tr, goose.center(), Math.hypot(goose.vx || 0, goose.vy || 0));
      for (let i = trailP.length - 1; i >= 0; i--) { const q = trailP[i]; q.t += STEP; q.x += q.vx * STEP; q.y += q.vy * STEP; if (q.t > q.life) trailP.splice(i, 1); }
    }
    if (goose.swimming && !wasWet) { snd.splash(); const c = goose.center(); splashes.push({ x: c.x, y: c.y, t: 0 }); }
    if (goose.bounced) { goose.bounced = false; snd.boing(); boingT = 0.6; }

    const c = goose.center(), h = goose.head;
    if (goose.grounded) {
      for (const cp of level.checkpoints || []) {
        if (c.x > cp[0] && cp[0] > checkpoint.x && Math.abs(c.y - cp[1]) < 110) { checkpoint = { x: cp[0], y: cp[1] }; toast('Checkpoint!', 1.2); }
      }
    }
    if (c.y > level.deathY) { snd.splash(); deaths++; respawn(); toast('Whoops. Back to the last checkpoint.', 2); }
    else if (!has('shield') && !(save.cheats.admin && save.cheats.god && !mpOn()) && touchesHazard(goose, level.hazards)) { snd.ouch(); deaths++; respawn(); toast('Ouch! Thorns.', 1.6); }

    for (const b of bread) {
      if (b.got) continue;
      if (Math.hypot(h.x - b.x, h.y - b.y) < 26 || Math.hypot(c.x - b.x, c.y - b.y) < 40) { b.got = true; breadGot++; snd.bread(); updateHud(); }
    }

    if (state === 'play') {
      if (boss && bossPhase === 'door') { if (Math.hypot(h.x - level.egg[0], h.y - level.egg[1]) < 34) startBoss(); }
      else if (boss && bossPhase === 'fight') { if (boss.dead && boss.deadT > 1.4) { bossPhase = 'won'; toast('Grab the golden egg!', 2); } }
      else if (Math.hypot(h.x - eggPos[0], h.y - eggPos[1]) < 34) { if (!(mpOn() && window.MP.onEgg())) finishLevel(); }
    }
  }

  function finishLevel() {
    state = 'done'; snd.egg();
    const d = diff(), last = levelIdx === LEVELS.length - 1, champ = levelIdx === (LEVELS.weather || LEVELS.length) - 1;
    const reward = (breadGot + 10) * d.mult;
    save.bread += reward;
    save.done = save.done || {}; save.perfect = save.perfect || {};
    const tNow = levelClock; save.bestTime = save.bestTime || {}; const prevT = save.bestTime[levelIdx]; const newBest = prevT == null || tNow < prevT; if (newBest) save.bestTime[levelIdx] = tNow;
    const fmtT = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') + '.' + Math.floor((t % 1) * 10);
    save.done[levelIdx] = true; if (!deaths && breadGot === bread.length) save.perfect[levelIdx] = true;
    if (levelIdx + 1 < (LEVELS.weather || LEVELS.length)) save.unlocked = Math.max(save.unlocked, levelIdx + 2);
    let extra = '';
    if (levelIdx === LEVELS.campaign - 1 && !save.allDone) { save.allDone = true; extra = '\n🎮 You unlocked the minigames! ' + ((LEVELS.weather || LEVELS.length) - LEVELS.campaign) + ' bonus levels are waiting too.'; }
    persist();
    buildLevelPicker(); refreshMenu();
    $('doneTitle').textContent = champ ? 'You are the Wobble Champion!' : 'Egg acquired!';
    $('doneText').textContent = '⏱ ' + fmtT(tNow) + (newBest ? ' 🏆 new best!' : ' (best ' + fmtT(prevT) + ')') + '\nBread ' + breadGot + '/' + bread.length + (deaths ? '  ·  Falls ' + deaths : '  ·  No falls!') +
      '\n+' + reward + ' 🍞 (' + d.name + (d.mult > 1 ? ' ×' + d.mult : '') + ')' + extra;
    $('nextBtn').textContent = last ? 'Play again' : 'Next level';
    $('done').classList.remove('hidden');
  }

  // ---------------------------------------------------------------- drawing helpers
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function hills(par, color, amp, freq, baseY) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) {
      const wx = x / S + camX * par;
      ctx.lineTo(x, baseY - (Math.sin(wx * freq) * amp + Math.sin(wx * freq * 2.3 + 1.7) * amp * 0.4) * S);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }

  const THEMES = {
    meadow: { top: '#8fd0ff', bot: '#eaf8ff', cloud: 'rgba(255,255,255,.85)', h1: '#b8e4a8', h2: '#90d380', grass: '#5fc24c', grass2: '#7ad862', d1: '#a4723f', d2: '#6b4426' },
    desert: { top: '#ffcf8a', bot: '#fff1d0', cloud: 'rgba(255,255,255,.6)', h1: '#f0c98a', h2: '#e0b068', grass: '#d9a74e', grass2: '#ecc374', d1: '#c98f52', d2: '#8a5a30' },
    snow:   { top: '#b9dcff', bot: '#f4fbff', cloud: 'rgba(255,255,255,.95)', h1: '#dcecf7', h2: '#c3dcee', grass: '#eaf6ff', grass2: '#ffffff', d1: '#9cc3e0', d2: '#5f8fb8' },
    sunset: { top: '#ff8e72', bot: '#ffd9a0', cloud: 'rgba(255,230,210,.8)', h1: '#d58a8a', h2: '#b86a7a', grass: '#7fb04a', grass2: '#a0cf66', d1: '#8a5a48', d2: '#523038' },
    night:  { top: '#0f1740', bot: '#3a4c8a', cloud: 'rgba(170,190,255,.35)', h1: '#2a3566', h2: '#1d2552', grass: '#3e9a6a', grass2: '#58bd88', d1: '#4a4668', d2: '#272540', stars: true },
    candy:  { top: '#ffb6e1', bot: '#fff0fa', cloud: 'rgba(255,255,255,.9)', h1: '#ffc9ec', h2: '#f3a2d8', grass: '#ff7ac3', grass2: '#ff9fd6', d1: '#c46ba0', d2: '#83406a' },
    dungeon:{ top: '#17142a', bot: '#3b3560', cloud: 'rgba(150,140,200,.18)', h1: '#2a2548', h2: '#1d1a38', grass: '#5a5470', grass2: '#7a7494', d1: '#4a4466', d2: '#26223c', stars: true },
    sky:    { top: '#3f9bff', bot: '#e3f6ff', cloud: 'rgba(255,255,255,.9)', h1: '#cfeaff', h2: '#a6d3f6', grass: '#7fe063', grass2: '#a5f08a', d1: '#d6b48a', d2: '#9a7650' },
    jungle: { top: '#7fd9a2', bot: '#eaffd6', cloud: 'rgba(255,255,255,.55)', h1: '#5fb878', h2: '#3f9a5c', grass: '#2f9a3a', grass2: '#55c852', d1: '#7a5a34', d2: '#4a3320' },
    cavern: { top: '#1b1236', bot: '#5a3a8a', cloud: 'rgba(190,150,255,.2)', h1: '#3b2a66', h2: '#2a1d4d', grass: '#8a5ad6', grass2: '#b58aff', d1: '#4d3a78', d2: '#271c47', stars: true },
    factory:{ top: '#8f98a3', bot: '#e6dccb', cloud: 'rgba(110,110,110,.5)', h1: '#8a8f96', h2: '#6e737a', grass: '#8a9099', grass2: '#b4bac2', d1: '#6c5f55', d2: '#3e3733' },
    space:  { top: '#04020d', bot: '#2a1a5a', cloud: 'rgba(160,140,255,.15)', h1: '#3a2f66', h2: '#241d48', grass: '#9aa0b8', grass2: '#c4c9de', d1: '#5b5d78', d2: '#2c2d44', stars: true, dense: true },
    ocean:  { top: '#2b97d6', bot: '#0a3566', cloud: 'rgba(0,0,0,0)', h1: '#1a6aa6', h2: '#104f86', grass: '#2fa6a0', grass2: '#58d0b8', d1: '#cdb27a', d2: '#7a6a4a' },
    lava:   { top: '#3a0f14', bot: '#a8321c', cloud: 'rgba(255,150,100,.3)', h1: '#6e2018', h2: '#4a1612', grass: '#d9522b', grass2: '#ff8a4d', d1: '#4a2a28', d2: '#2a1514', stars: true },
  };
  let th = THEMES.meadow;

  function drawSky(cx, cy) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.top); g.addColorStop(1, th.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (th.stars) { ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < (th.dense ? 130 : 46); i++) ctx.fillRect(((i * 197 + 40) % W), ((i * 89) % (H * 0.7)), 2, 2); }
    if (level && level.sea) {   // under the sea: light rays and drifting bubbles instead of clouds and a sun
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) { const x = ((i * 233 - cx * 0.12 * S + Math.sin(clock * 0.2 + i) * 40) % (W + 300) + W + 300) % (W + 300) - 150, w = (50 + (i % 3) * 30) * S; const gr = ctx.createLinearGradient(0, 0, 0, H * 0.9); gr.addColorStop(0, 'rgba(160,230,255,.20)'); gr.addColorStop(1, 'rgba(160,230,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w * 2.4 - 120 * S, H); ctx.lineTo(x - 60 * S, H); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(220,245,255,.45)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) { const u = (((clock * (0.05 + (i % 5) * 0.012) + i * 0.137) % 1) + 1) % 1, x = ((i * 97 - cx * (0.06 + (i % 4) * 0.03) * S) % W + W) % W + Math.sin(clock + i) * 6, y = (1 - u) * H; ctx.beginPath(); ctx.arc(x, y, (2 + (i % 4)) * S, 0, 7); ctx.stroke(); }
      // schools of fish and a lazy turtle and manta, far behind the action (parallax)
      const fish = (x, y, sz, col, dir) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, sz, sz * 0.42, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - dir * sz * 0.8, y); ctx.lineTo(x - dir * sz * 1.5, y - sz * 0.5); ctx.lineTo(x - dir * sz * 1.5, y + sz * 0.5); ctx.closePath(); ctx.fill(); };
      for (let k = 0; k < 4; k++) {
        const dir = k % 2 ? -1 : 1, sp = 18 + k * 7, span = W + 500, base = ((clock * sp * dir + k * 421 - cx * 0.15 * S) % span + span) % span - 250;
        const cy0 = H * (0.18 + 0.17 * k) + Math.sin(clock * 0.5 + k) * 14, col = ['rgba(255,190,90,.55)', 'rgba(150,220,255,.5)', 'rgba(255,120,150,.5)', 'rgba(200,255,200,.45)'][k];
        for (let j = 0; j < 7; j++) fish(base + (j % 4) * 26 * dir * S - j * 6 * dir, cy0 + ((j * 37) % 40) - 20 + Math.sin(clock * 2 + j) * 4, (7 + (j % 3) * 2) * S, col, dir);
      }
      { const tx = (((clock * 14 - cx * 0.2 * S) % (W + 400)) + W + 400) % (W + 400) - 200, ty = H * 0.62 + Math.sin(clock * 0.6) * 12, fl = Math.sin(clock * 2.2) * 0.5;
        ctx.fillStyle = 'rgba(70,140,90,.55)'; ctx.beginPath(); ctx.ellipse(tx, ty, 34 * S, 20 * S, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(tx + 38 * S, ty - 2 * S, 8 * S, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(tx + 6 * S, ty + 16 * S, 22 * S, 6 * S, 0.5 + fl, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(tx - 20 * S, ty + 14 * S, 14 * S, 5 * S, -0.4 - fl, 0, 7); ctx.fill(); }
    } else window.Clouds.layers(ctx, cx, cy, W, H, S, level && level.theme, clock, level && level.weather && level.weather.storm);
    // sun / moon
    if (!(level && level.sea)) {
      const night = level && level.theme === 'night' || th.stars, sx = W * 0.8, sy = H * 0.2;
      if (night) { ctx.fillStyle = 'rgba(255,250,220,.15)'; ctx.beginPath(); ctx.arc(sx, sy, 60 * S, 0, 7); ctx.fill(); ctx.fillStyle = '#f6f1d6'; ctx.beginPath(); ctx.arc(sx, sy, 26 * S, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(160,150,120,.35)'; for (const [dx, dy, r] of [[-8, -6, 5], [7, 5, 6], [-2, 10, 3]]) { ctx.beginPath(); ctx.arc(sx + dx * S, sy + dy * S, r * S, 0, 7); ctx.fill(); } }
      else { const g2 = ctx.createRadialGradient(sx, sy, 8 * S, sx, sy, 90 * S); g2.addColorStop(0, 'rgba(255,245,190,.95)'); g2.addColorStop(0.35, 'rgba(255,235,150,.35)'); g2.addColorStop(1, 'rgba(255,235,150,0)'); ctx.fillStyle = g2; ctx.fillRect(sx - 100 * S, sy - 100 * S, 200 * S, 200 * S); ctx.fillStyle = '#fff6c4'; ctx.beginPath(); ctx.arc(sx, sy, 22 * S, 0, 7); ctx.fill(); }
    }
    const base = (540 - cy) * S;
    if (decor) window.Decor.drawFar(ctx, decor.far, level.theme, cx, W, H, S, th, base - 20 * S);
    hills(0.2, th.h1, 70, 0.004, base - 40 * S);
    hills(0.45, th.h2, 50, 0.007, base + 10 * S);
  }

  function drawTerrain(t) {
    const pts = t.pts;
    let i0 = 0, i1 = pts.length - 1;
    while (i0 < pts.length - 2 && pts[i0 + 1][0] < camX - 60) i0++;
    while (i1 > i0 + 1 && pts[i1 - 1][0] > camX + VW + 60) i1--;
    if (pts[i1][0] < camX - 60 || pts[i0][0] > camX + VW + 60) return;
    let miny = 1e9, maxy = -1e9;
    for (let i = i0; i <= i1; i++) { miny = Math.min(miny, pts[i][1]); maxy = Math.max(maxy, pts[i][1]); }
    const bottom = Math.max(maxy + 900, camY + VH + 60);
    const ice = t.mu != null && t.mu < 0.5;
    const dg = ctx.createLinearGradient(0, miny, 0, miny + 420);
    if (ice) { dg.addColorStop(0, '#cdeeff'); dg.addColorStop(1, '#7fb9e0'); } else { dg.addColorStop(0, th.d1); dg.addColorStop(1, th.d2); }
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.moveTo(pts[i0][0], bottom);
    for (let i = i0; i <= i1; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(pts[i1][0], bottom); ctx.closePath(); ctx.fill();
    const trace = (dy) => { ctx.beginPath(); ctx.moveTo(pts[i0][0], pts[i0][1] + dy); for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(pts[i][0], pts[i][1] + dy); };
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    window.Decor.terrainDetail(ctx, pts, i0, i1, level.theme, ice, camX, VW, clock);
    ctx.strokeStyle = ice ? '#eaf8ff' : th.grass; ctx.lineWidth = 12; trace(6); ctx.stroke();
    ctx.strokeStyle = ice ? '#ffffff' : th.grass2; ctx.lineWidth = 5; trace(3); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; trace(0); ctx.stroke();
  }

  function drawSolid(s) {
    if (s.x > camX + VW + 40 || s.x + s.w < camX - 40 || s.y > camY + VH + 40 || s.y + s.h < camY - 40) return;
    if (s.crumble || s.belt || s.gate) { MECH.drawSolid(ctx, s, clock, camX, VW, th, mech); return; }
    if (s.pad) {
      ctx.fillStyle = '#e63946'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      const sq = boingT > 0 ? Math.sin(boingT * 14) * 3 : 0;
      roundRect(ctx, s.x, s.y + sq, s.w, 14 - sq, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe479';
      for (let x = s.x + 12; x < s.x + s.w - 8; x += 22) ctx.fillRect(x, s.y + 3 + sq, 10, 3);
      return;
    }
    if (s.mover) {
      ctx.fillStyle = '#c28a4a'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      roundRect(ctx, s.x, s.y, s.w, s.h, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;
      for (let x = s.x + 26; x < s.x + s.w - 8; x += 26) { ctx.beginPath(); ctx.moveTo(x, s.y + 3); ctx.lineTo(x, s.y + s.h - 3); ctx.stroke(); }
      ctx.fillStyle = '#7ad862'; ctx.fillRect(s.x + 4, s.y - 3, s.w - 8, 5);
      return;
    }
    const dg = ctx.createLinearGradient(0, s.y, 0, s.y + Math.min(s.h, 300));
    dg.addColorStop(0, th.d1); dg.addColorStop(1, th.d2);
    ctx.fillStyle = dg; ctx.fillRect(s.x, s.y, s.w, s.h);
    if (s.h > 30) {   // stone-block texture
      ctx.save(); ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 2;
      const bh = 26, bw = 46;
      for (let y = s.y + 14, r = 0; y < Math.min(s.y + s.h, camY + VH + 60); y += bh, r++) {
        ctx.beginPath(); ctx.moveTo(s.x, y); ctx.lineTo(s.x + s.w, y); ctx.stroke();
        for (let x = s.x + (r % 2 ? bw / 2 : 0); x < s.x + s.w; x += bw) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + bh); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(s.x, s.y, 5, s.h); ctx.restore();
    }
    ctx.fillStyle = th.grass; ctx.fillRect(s.x, s.y, s.w, 12);
    ctx.fillStyle = th.grass2; ctx.fillRect(s.x, s.y, s.w, 5);
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.strokeRect(s.x, s.y, s.w, Math.min(s.h, 700));
  }

  function drawHazard(h) {
    if (h[0] > camX + VW + 40 || h[0] + h[2] < camX - 40) return;
    ctx.fillStyle = '#7a1f2b'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    for (let x = h[0]; x < h[0] + h[2] - 6; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, h[1] + h[3]); ctx.lineTo(x + 8, h[1] - 6); ctx.lineTo(x + 16, h[1] + h[3]); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  function drawIdle(c, x, y, dir) { /* unused placeholder for symmetry */ }

  function drawWorld() {
    ctx.save();
    ctx.scale(S * DPR, S * DPR);
    ctx.translate(-camX, -camY);

    if (decor) window.Decor.draw(ctx, decor.props, camX, VW, clock);
    for (const t of level.terrain || []) drawTerrain(t);
    for (const s of world.solids) drawSolid(s);
    if (mech) MECH.draw(ctx, mech, camX, camY, VW, VH, clock, world);
    for (const h of level.hazards || []) drawHazard(h);

    for (const cp of level.checkpoints || []) {
      const on = checkpoint.x >= cp[0];
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cp[0], cp[1] + 36); ctx.lineTo(cp[0], cp[1] - 12); ctx.stroke();
      ctx.fillStyle = on ? '#ffd23f' : '#ffffff';
      ctx.beginPath(); ctx.moveTo(cp[0], cp[1] - 12); ctx.lineTo(cp[0] + 22, cp[1] - 5 + Math.sin(clock * 5) * 2); ctx.lineTo(cp[0], cp[1] + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    for (const b of bread) {
      if (b.got) continue;
      ctx.save();
      ctx.translate(b.x, b.y + Math.sin(clock * 3 + b.x) * 4);
      ctx.rotate(Math.sin(clock * 2 + b.x * 0.1) * 0.15);
      ctx.fillStyle = '#d9993f'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      roundRect(ctx, -11, -10, 22, 20, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f7d79a'; roundRect(ctx, -7, -6, 14, 12, 4); ctx.fill();
      ctx.restore();
    }

    const e = eggPos || level.egg, pulse = 1 + Math.sin(clock * 4) * 0.06;
    ctx.save();
    ctx.translate(e[0], e[1] + Math.sin(clock * 2) * 3);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 44 * pulse);
    glow.addColorStop(0, 'rgba(255,230,120,.8)'); glow.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 44 * pulse, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 17, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.ellipse(-4, -6, 3, 6, 0.4, 0, 7); ctx.fill();
    ctx.restore();
    if (boss && bossPhase === 'door') BOSS.drawDoorSign(ctx, e[0], e[1], clock);
    if (boss && bossPhase === 'fight') BOSS.drawCage(ctx, e[0], e[1], clock);

    drawTrail();
    drawChasers(ctx); ENEMIES.draw(ctx, enemies, levelClock, enemyDead); ENEMIES.drawShots(ctx, enemies, levelClock); drawStormWorld(world.time);
    if (boss && bossPhase !== 'door') BOSS.draw(ctx, boss, clock);
    drawGoose(ctx, goose, window.Battle.active() ? window.Battle.equip(lookEquip()) : lookEquip(), save.skin);
    if (window.Chungas) window.Chungas.draw(ctx, (c2, g2, e2, s2) => drawGoose(c2, g2, e2, s2));
    if (window.Battle.active()) window.Battle.drawWorld(ctx, clock);
    if (decor) window.Decor.draw(ctx, decor.fore, camX, VW, clock);
    if (window.MP) window.MP.drawWorld(ctx, level, clock);
    if (honkText > 0) {
      const h = goose.head, f = goose.facing, t = 1 - honkText / 0.7;
      ctx.save();
      ctx.globalAlpha = Math.min(1, honkText * 3);
      ctx.fillStyle = INK; ctx.font = '800 ' + (22 + t * 10) + 'px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('HONK!', h.x + f * 20, h.y - 30 - t * 26);
      ctx.restore();
    }
    if (boingT > 0) {
      const c = goose.center(); ctx.save(); ctx.globalAlpha = Math.min(1, boingT * 3);
      ctx.fillStyle = '#e63946'; ctx.font = '800 24px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('BOING!', c.x, c.y - 70 - (0.6 - boingT) * 40); ctx.restore();
    }

    for (const w of world.waters) {
      if (w.x > camX + VW || w.x + w.w < camX || w.y > camY + VH + 100) continue;
      if (level.sea) { ctx.fillStyle = 'rgba(20,120,190,.22)'; ctx.fillRect(Math.max(w.x, camX - 20), Math.max(w.y, camY - 20), Math.min(w.w, VW + 40), VH + 40); continue; }
      drawPond(w);
    }
    for (const sp of splashes) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - sp.t) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 16, 14 + sp.t * 46, 5 + sp.t * 10, 0, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }

  // A proper pond: murky green-blue depth, drifting light caustics, rising bubbles, reeds and lily pads, rippled surface.
  function drawPond(w) {
    const wa = world.waveH || 2.5, wt = world.waveH ? world.time : clock;
    const surf = (x) => w.y + Math.sin(x * 0.06 + wt * 2.4) * wa + Math.sin(x * 0.017 - wt * 1.1) * (wa * 0.6 + 1.2);
    // the pond bed follows the real ground: water is only drawn above it, and not at all where the bank is higher than the water
    if (!w._bot) { w._bot = []; for (let x = w.x; x <= w.x + w.w + 8; x += 8) { const g = window.Decor.groundAt(level, x); w._bot.push(g === null ? w.y + w.h : Math.min(w.y + w.h, g + 3)); } }
    const botAt = (x) => { const i = Math.min(w._bot.length - 1, Math.max(0, Math.round((x - w.x) / 8))); return w._bot[i]; };
    const x0 = Math.max(w.x, camX - 20), x1 = Math.min(w.x + w.w, camX + VW + 20), dp = Math.min(w.h, 340);
    const wetAt = (x) => botAt(x) > surf(x) + 5;
    const g = ctx.createLinearGradient(0, w.y, 0, w.y + dp);
    g.addColorStop(0, 'rgba(120,205,200,.55)'); g.addColorStop(0.35, 'rgba(56,150,160,.68)'); g.addColorStop(1, 'rgba(20,70,100,.86)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, surf(x0));
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, surf(x));
    for (let x = x1; x >= x0; x -= 8) ctx.lineTo(x, Math.max(surf(x), botAt(x)));
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    // caustic light ribbons
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(220,255,240,.14)';
    for (let k = 0; k < 5; k++) {
      const yy = w.y + 26 + k * 34; if (yy > w.y + w.h) break;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 14) { const y = yy + Math.sin(x * 0.045 + wt * 1.3 + k * 2) * 6 + Math.sin(x * 0.11 - wt * 0.9 + k) * 3; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // god rays
    ctx.fillStyle = 'rgba(255,255,230,.05)';
    for (let x = Math.floor(x0 / 150) * 150; x < x1; x += 150) { const sx = x + Math.sin(wt * 0.4 + x) * 14; ctx.beginPath(); ctx.moveTo(sx, w.y); ctx.lineTo(sx + 46, w.y); ctx.lineTo(sx + 12, w.y + Math.min(w.h, 240)); ctx.lineTo(sx - 30, w.y + Math.min(w.h, 240)); ctx.closePath(); ctx.fill(); }
    // bubbles
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
    for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) {
      const h = Math.sin(x * 12.9898) * 43758.5453, r = h - Math.floor(h), per = 4 + r * 3, ph = ((wt / per) + r * 7) % 1;
      const by = w.y + Math.min(w.h, 260) * (1 - ph) + 12; if (by > w.y + w.h) continue;
      ctx.beginPath(); ctx.arc(x + r * 60 + Math.sin(ph * 12 + r * 9) * 5, by, 2 + r * 3, 0, 7); ctx.stroke();
    }
    ctx.restore();
    // reeds at the edges
    const reed = (rx, dir) => {
      ctx.strokeStyle = '#3f7d3a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) { const bx = rx + dir * k * 7, sw = Math.sin(wt * 1.6 + k) * 4; ctx.beginPath(); ctx.moveTo(bx, w.y + 34); ctx.quadraticCurveTo(bx + sw, w.y - 14, bx + sw * 1.6 + dir * 3, w.y - 44 - k * 6); ctx.stroke(); ctx.fillStyle = '#7a5230'; ctx.fillRect(bx + sw * 1.6 + dir * 3 - 2.5, w.y - 60 - k * 6, 5, 16); }
    };
    let wl = null, wr = null; for (let x = w.x; x <= w.x + w.w; x += 8) if (wetAt(x)) { if (wl === null) wl = x; wr = x; }
    if (wl !== null && wl > camX - 60 && wl < camX + VW + 60) reed(wl - 4, -1);
    if (wr !== null && wr > camX - 60 && wr < camX + VW + 60) reed(wr + 4, 1);
    // lily pads
    for (let x = Math.ceil((w.x + 80) / 170) * 170; x < w.x + w.w - 80; x += 170) {
      if (x < camX - 30 || x > camX + VW + 30) continue;
      const h = Math.sin(x * 4.1) * 9301.7, r = h - Math.floor(h), lx = x + r * 60;
      if (lx > w.x + w.w - 60 || !wetAt(lx - 18) || !wetAt(lx + 18)) continue;
      const ly = surf(lx) + 1; ctx.fillStyle = '#4fa14a'; ctx.strokeStyle = '#2b6a2e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(lx, ly, 17, 5, 0, 0.35, Math.PI * 2 - 0.1); ctx.lineTo(lx, ly); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (r > 0.6) { ctx.fillStyle = '#ffd1e6'; ctx.beginPath(); ctx.ellipse(lx + 3, ly - 5, 4, 5, 0, 0, 7); ctx.fill(); }
    }
    // surface sparkle + edge
    ctx.strokeStyle = 'rgba(235,255,250,.9)'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let x = x0, pen = false; x <= x1; x += 8) { if (!wetAt(x)) { pen = false; continue; } const y = surf(x); if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) { const a = Math.sin(wt * 3 + x * 0.7); if (a > 0.6) ctx.fillRect(x + 6, surf(x) - 1, 8 + a * 6, 2); }
  }

  // The goose. `cx` is any 2D context, `g` any object with the Goose drawing interface (so the store preview and
  // remote players can fake one), `equip` the worn clothes and `skin` a skin id (or object).
  // jelly skins: translucent gradient + shine; the body outline follows the four soft body particles
  function jellyFill(cx, sk, y0, y1) {
    const jc = sk.jellyC || ['#ff5c7a', '#ffb3c1'];
    const gr = cx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, jc[1]); gr.addColorStop(1, jc[0]); return gr;
  }
  function jellyShine(cx) { cx.save(); cx.fillStyle = 'rgba(255,255,255,.5)'; cx.beginPath(); cx.ellipse(-12, -13, 15, 5, -0.2, 0, 7); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.28)'; cx.beginPath(); cx.ellipse(18, -8, 5, 3, 0.4, 0, 7); cx.fill(); cx.restore(); }
  function drawJellyBody(cx, g, sk, f) {
    const P = g.body, c = g.center(), m = 10 + 4 * Math.max(0.6, ((sk.shape && sk.shape.h) || 1));
    const pts = P.map((p) => { const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1; return [p.x + (dx / d) * m, p.y + (dy / d) * m]; });
    // exaggerate the squish a little so it reads as jelly
    const wob = Math.sin(clock * 5) * 0.4;
    cx.save();
    cx.beginPath();
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let st = mid(pts[3], pts[0]); cx.moveTo(st[0], st[1]);
    for (let i = 0; i < 4; i++) { const q = pts[i], e = mid(pts[i], pts[(i + 1) % 4]); cx.quadraticCurveTo(q[0], q[1], e[0] + wob * 0, e[1]); }
    cx.closePath();
    const top = Math.min(...pts.map((p) => p[1])), bot = Math.max(...pts.map((p) => p[1])), jc = sk.jellyC || ['#ff5c7a', '#ffb3c1'];
    const gr = cx.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, jc[1]); gr.addColorStop(1, jc[0]);
    cx.globalAlpha = 0.93; cx.fillStyle = gr; cx.fill(); cx.globalAlpha = 1;
    cx.strokeStyle = INK; cx.lineWidth = 3; cx.stroke();
    cx.clip();
    cx.fillStyle = 'rgba(255,255,255,.45)'; const bx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4, by = top + (bot - top) * 0.2;
    cx.beginPath(); cx.ellipse(bx - 10 * f, by, 16, 5, 0, 0, 7); cx.fill();
    cx.restore();
  }

  function drawGoose(cx, g, equip, skin) {
    equip = equip || {};
    const sk = typeof skin === 'object' && skin ? skin : (SKINS.BY_ID[skin] || SKINS.BY_ID.goose);
    const c = g.center(), A = g.axes();
    const ang = Math.atan2(A.uy, A.ux), f = g.facing, n = g.neck, nN = n.length;
    const it = (cat) => (equip[cat] ? BY_ID[equip[cat]] : null);
    const bodyC = sk.body || '#ffffff';
    const shp = sk.shape || {}, dsx = (28 * (shp.w || 1) + 8) / 36, dsy = (13 * (shp.h || 1) + 8) / 21;
    // per-slot colour tint (store customisation); no tint where ctx.filter is unsupported
    const tints = equip._tint || {};
    const tint = (cat, fn) => {
      const d = tints[cat];
      if (d == null || !('filter' in cx)) { fn(); return; }
      cx.save(); cx.filter = d === 'gray' ? 'grayscale(1)' : d === 'dark' ? 'brightness(.55)' : d === 'bright' ? 'brightness(1.35) saturate(1.3)' : 'hue-rotate(' + d + 'deg) saturate(1.15)';
      fn(); cx.restore();
    };
    const PL = window.PhysLook, plId = equip.phys && PL && PL.has(equip.phys) ? equip.phys : null, plT = performance.now() / 1000;
    const auraItem = it('aura');
    if (auraItem) { cx.save(); cx.translate(c.x, c.y); tint('aura', () => auraItem.draw(cx, g.head.x - c.x, g.head.y - c.y)); cx.restore(); }
    cx.lineCap = 'round'; cx.lineJoin = 'round';

    const bodyItem = it('body');
    if (bodyItem && bodyItem.back) { cx.save(); cx.translate(c.x, c.y); cx.rotate(ang); cx.scale(f, 1); bodyItem.draw(cx); cx.restore(); }

    // legs and feet
    if (!g.legless) {
    const shoes = it('shoes'), legItem = it('legs'), lw = sk.legW || 1;
    for (let i = 0; i < 2; i++) {
      const hip = g.hips[i], ft = g.feet[i];
      cx.strokeStyle = INK; cx.lineWidth = 8.5 * lw;
      cx.beginPath(); cx.moveTo(hip.x, hip.y); cx.lineTo(ft.x, ft.y); cx.stroke();
      cx.strokeStyle = sk.legC || '#ff9b2f'; cx.lineWidth = 5 * lw;
      cx.beginPath(); cx.moveTo(hip.x, hip.y); cx.lineTo(ft.x, ft.y); cx.stroke();
      if (legItem) { cx.save(); cx.translate(ft.x, ft.y); cx.rotate(Math.atan2(hip.y - ft.y, hip.x - ft.x)); tint('legs', () => legItem.draw(cx)); cx.restore(); }
      cx.save(); cx.translate(ft.x, ft.y); cx.scale(f, 1);
      if (plId) { PL.feet(cx, plId, plT); }
      if (shoes) tint('shoes', () => shoes.draw(cx));
      else if (sk.foot) sk.foot(cx);
      else { cx.fillStyle = sk.legC || '#ff9b2f'; cx.strokeStyle = INK; cx.lineWidth = 2.5; cx.beginPath(); cx.ellipse(4, 2, 11, 4.5, 0, 0, 7); cx.fill(); cx.stroke(); }
      cx.restore();
    }
    }

    // neck
    const path = () => {
      cx.beginPath(); cx.moveTo(n[0].x, n[0].y);
      for (let i = 1; i < nN - 1; i++) cx.quadraticCurveTo(n[i].x, n[i].y, (n[i].x + n[i + 1].x) / 2, (n[i].y + n[i + 1].y) / 2);
      cx.lineTo(n[nN - 1].x, n[nN - 1].y);
    };
    const nw = sk.neckW || 1;
    cx.strokeStyle = INK; cx.lineWidth = 15 * nw; path(); cx.stroke();
    cx.strokeStyle = sk.neckC || '#ffffff'; cx.lineWidth = 10.5 * nw; path(); cx.stroke();
    if (sk.neckDeco) { cx.save(); sk.neckDeco(cx, n, nN); cx.restore(); }

    // body, tail, wing
    cx.save();
    cx.translate(c.x, c.y); cx.rotate(ang); cx.scale(f * dsx, dsy);
    cx.fillStyle = bodyC; cx.strokeStyle = INK; cx.lineWidth = 3;
    if (sk.tail) { cx.save(); sk.tail(cx); cx.restore(); }
    else { cx.beginPath(); cx.moveTo(-30, -8); cx.lineTo(-52, -20); cx.lineTo(-36, 6); cx.closePath(); cx.fill(); cx.stroke(); }
    const tailItem = it('tail');
    if (tailItem) { cx.save(); cx.translate(-34, -4); tint('tail', () => tailItem.draw(cx)); cx.restore(); }
    if (plId) PL.behind(cx, plId, plT);
    const bodyPath = () => { cx.beginPath(); if (shp.rect) roundRect(cx, -38, -24, 76, 48, 9); else cx.ellipse(0, 0, 38, 24, 0, 0, 7); };
    const jb = sk.jelly && g.body && g.body.length === 4;
    if (jb) {
      cx.restore();                                   // the jelly body is drawn straight from its four soft particles
      drawJellyBody(cx, g, sk, f);
      cx.save(); cx.translate(c.x, c.y); cx.rotate(ang); cx.scale(f * dsx, dsy);
    } else {
      cx.fillStyle = sk.jelly ? jellyFill(cx, sk, -24, 24) : bodyC; cx.strokeStyle = INK; cx.lineWidth = 3;
      bodyPath(); cx.fill();
      if (sk.bodyDeco) { cx.save(); bodyPath(); cx.clip(); sk.bodyDeco(cx); cx.restore(); }
      bodyPath(); cx.stroke();
      if (sk.jelly) jellyShine(cx);
    }
    if (plId && !jb) PL.over(cx, plId, plT, bodyPath);
    const backItem = it('back');
    if (plId) PL.back(cx, plId, plT);
    if (backItem) tint('back', () => backItem.draw(cx));
    if (bodyItem && !bodyItem.back) tint('body', () => bodyItem.draw(cx));
    const fp = g.flapT > 0 ? Math.sin((0.35 - g.flapT) * 36) : 0;
    cx.save();
    cx.translate(-4, -2); cx.rotate(-0.15 - fp * 0.9);
    cx.fillStyle = sk.wing || '#e4edf5'; cx.strokeStyle = INK; cx.lineWidth = 3;
    cx.beginPath(); cx.ellipse(-8, 0, 20 + Math.abs(fp) * 6, 10, 0, 0, 7); cx.fill(); cx.stroke();
    cx.restore();
    if (sk.bodyFront) { cx.save(); sk.bodyFront(cx); cx.restore(); }
    const petItem = it('pet'), heldItem = it('held');
    if (petItem) { cx.save(); cx.translate(-8, -24); tint('pet', () => petItem.draw(cx)); cx.restore(); }
    if (heldItem) { cx.save(); cx.translate(16, 2); tint('held', () => heldItem.draw(cx)); cx.restore(); }
    cx.restore();

    // neckwear
    const neckItem = it('neck');
    if (neckItem) {
      const i = neckItem.id === 'scarf' ? Math.round(nN * 0.62) : Math.round(nN * 0.74);
      const a = n[Math.max(0, i - 1)], b = n[Math.min(nN - 1, i + 1)];
      cx.save(); cx.translate(n[i].x, n[i].y); cx.rotate(Math.atan2(b.y - a.y, b.x - a.x)); tint('neck', () => neckItem.draw(cx)); cx.restore();
    }

    // head
    const h = g.head, p = n[nN - 3];
    let dx = h.x - p.x, dy = h.y - p.y;
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    let bx = dx * 0.35 + f * 0.65, by = dy * 0.35;
    const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    const open = g.honkT > 0 ? 5 + Math.sin(g.honkT * 40) * 2 : 0;
    cx.save();
    cx.translate(h.x, h.y); cx.rotate(Math.atan2(by, bx)); cx.scale(1, f);
    if (sk.headBack) { cx.save(); sk.headBack(cx); cx.restore(); }
    cx.fillStyle = '#ff9b2f'; cx.strokeStyle = INK; cx.lineWidth = 3;
    if (sk.head) sk.head(cx, open, sk);
    else {
      cx.beginPath(); cx.moveTo(4, -5); cx.lineTo(26, -open * 0.3); cx.lineTo(4, 0); cx.closePath(); cx.fill(); cx.stroke();
      cx.beginPath(); cx.moveTo(4, 0); cx.lineTo(24, 1 + open); cx.lineTo(4, 5 + open * 0.5); cx.closePath(); cx.fill(); cx.stroke();
      cx.fillStyle = sk.headC || '#ffffff';
      cx.beginPath(); cx.arc(0, 0, 10, 0, 7); cx.fill(); cx.stroke();
    }
    const eo = sk.eye || {}, ex = eo.x == null ? 3 : eo.x, ey = eo.y == null ? -3 : eo.y, er = eo.r || 2.8;
    if (eo.bg) { cx.fillStyle = eo.bg; cx.strokeStyle = INK; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(ex, ey, er * 1.7, 0, 7); cx.fill(); cx.stroke(); }
    cx.fillStyle = INK; cx.beginPath(); cx.arc(ex, ey, er, 0, 7); cx.fill();
    cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(ex + 0.9, ey - 0.9, er * 0.32, 0, 7); cx.fill();
    const eyes = it('eyes'), hat = it('hat'), face = it('face'), beakItem = it('beak');
    if (face) { cx.save(); tint('face', () => face.draw(cx)); cx.restore(); }
    if (plId) PL.head(cx, plId, plT);
    if (sk.headDeco) { cx.save(); sk.headDeco(cx); cx.restore(); }
    if (beakItem) { cx.save(); cx.translate(4, 0); tint('beak', () => beakItem.draw(cx)); cx.restore(); }
    if (eyes) { cx.save(); cx.translate(ex, ey); tint('eyes', () => eyes.draw(cx)); cx.restore(); }
    if (hat) {
      cx.save(); tint('hat', () => hat.draw(cx)); cx.restore();
      if (!eyes) {   // hats never cover your eyes: draw the eye back on top
        if (eo.bg) { cx.fillStyle = eo.bg; cx.strokeStyle = INK; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(ex, ey, er * 1.7, 0, 7); cx.fill(); cx.stroke(); }
        cx.fillStyle = INK; cx.beginPath(); cx.arc(ex, ey, er, 0, 7); cx.fill();
        cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(ex + 0.9, ey - 0.9, er * 0.32, 0, 7); cx.fill();
      }
    }
    cx.restore();
  }

  // a stand-in goose for the store preview
  function fakeGoose(t, skin) {
    const sk = typeof skin === 'object' && skin ? skin : (SKINS.BY_ID[skin] || SKINS.BY_ID.goose), L = sk.shape || {};
    const sw = L.w || 1, sh = L.h || 1, seg = 7 * (sk.neck || 1) * (L.neck || 1), lm = L.leg || 1, hf = L.hip || [-13 / 28, 13 / 28];
    const n = [];
    let x = (L.nx != null ? L.nx : 24) * sw, y = (L.ny != null ? L.ny : -17) * sh, a = ((L.ang != null ? L.ang : -98) * Math.PI) / 180;
    const step = ((L.bend != null ? L.bend : 4.2) * Math.PI) / 180;
    n.push({ x, y });
    for (let i = 1; i <= NECK_SEGS; i++) {
      a += step + Math.sin(t * 2 + i * 0.35) * 0.012 * (i / NECK_SEGS) * 6;
      x += Math.cos(a) * seg; y += Math.sin(a) * seg;
      n.push({ x, y });
    }
    const hx = hf.map((q) => q * 28 * sw), hy = 8 * sh;
    return {
      facing: 1, flapT: 0, honkT: 0, neck: n, head: n[n.length - 1],
      hips: hx.map((q) => ({ x: q, y: hy })), feet: hx.map((q) => ({ x: q, y: hy + 30 * lm })),
      center: () => ({ x: 0, y: 0 }), axes: () => ({ ux: 1, uy: 0, vx: 0, vy: 1 }),
    };
  }

  // ---------------------------------------------------------------- main loop
  let last = performance.now(), acc = 0, hudT = 0;
  function frame(now) {
    const real = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += real;
    if (toastT > 0) { toastT -= real; if (toastT <= 0) $('toast').classList.remove('show'); }
    honkText = Math.max(0, honkText - real);
    boingT = Math.max(0, boingT - real);
    for (const sp of splashes) sp.t += real * 1.4;
    splashes = splashes.filter((sp) => sp.t < 1);

    if (state === 'mg' && mgInst) {
      acc += real;
      let guard = 0;
      while (acc >= STEP && guard++ < 6) { mgInst.update(STEP); acc -= STEP; }
      if (acc > STEP * 6) acc = 0;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      mgInst.draw();
    } else if (state === 'mgdone' && mgInst) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      mgInst.draw();
    } else if (goose) {
      acc += (slow ? real * 0.25 : real) * FX().time;
      let guard = 0;
      while (acc >= STEP && guard++ < 6) {
        if (state === 'play') tick(); else { goose.update(STEP, { move: 0 }); world.step(STEP); }
        acc -= STEP;
      }
      if (acc > STEP * 6) acc = 0;
      const c = goose.center();
      let tx = c.x - VW * 0.5 + goose.facing * VW * 0.1, ty = c.y - VH * 0.58;
      if (boss && (bossPhase === 'fight' || bossPhase === 'won')) { const mid = (boss.spec.x0 + boss.spec.x1) / 2; tx = mid - VW * 0.5 + (c.x - mid) * 0.15; ty = boss.spec.floor - VH * 0.7; }
      const k = 1 - Math.pow(0.002, real);
      camX += (tx - camX) * k; camY += (ty - camY) * k;
      hudT += real;
      if (state === 'play' && hudT > 0.08) { hudT = 0; updateHud(); }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawSky(camX, camY);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawWorld();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawWeather();
      if (has('disco')) { ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'hsl(' + ((performance.now() / 8) % 360) + ',90%,55%)'; ctx.globalAlpha = 0.5; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      if (window.MP) window.MP.drawOverlay(ctx, canvas.width, canvas.height);
      drawAimHint();
    }
    if (state === 'store') drawStorePreview();
    requestAnimationFrame(frame);
  }

  // rain, snow, storm and wind overlay (screen space) from level.weather
  function drawWeather() {
    const wx = (level && level.weather) || {};
    if (!level || (!level.weather && !level.dark) || state === 'mg' || state === 'mgdone') return;
    const Wp = canvas.width, Hp = canvas.height, D = DPR;
    const slant = wx.wind ? (wxInfo.a / (world.windSpec ? world.windSpec.wind : 1)) * 0.6 : 0;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (wx.storm) {
      ctx.fillStyle = 'rgba(18,26,48,.2)'; ctx.fillRect(0, 0, Wp, Hp);
      const f = Math.sin(clock * 0.7) * 3 + Math.sin(clock * 1.9);           // an occasional lightning flash
      if (f > 3.2) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, (f - 3.2) * 1.6) + ')'; ctx.fillRect(0, 0, Wp, Hp); }
    }
    if (bolt && world.time >= bolt.strike) { const f = 1 - (world.time - bolt.strike) / 0.4; ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, 0.55 * f) + ')'; ctx.fillRect(0, 0, Wp, Hp); }
    if (level && level.dark) {   // the midnight zone: only a lantern's glow around you
      const gx = goose ? (goose.center().x - camX) * S : Wp / 2, gy = goose ? (goose.center().y - camY) * S : Hp / 2; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const g = ctx.createRadialGradient(gx, gy, 120 * D, gx, gy, 380 * D); g.addColorStop(0, 'rgba(0,8,24,0)'); g.addColorStop(1, 'rgba(0,8,24,.86)'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wp, Hp); ctx.restore();
    }
    if (wx.whiteout) {   // blizzard whiteout: it thickens and thins; only the area around you stays clear
      const k = Math.max(0, Math.sin(clock * 0.55)) * 0.8 + 0.12;
      const gx = (goose ? (goose.center().x - camX) * S : Wp / 2), gy = (goose ? (goose.center().y - camY) * S : Hp / 2);
      const g = ctx.createRadialGradient(gx, gy, 90 * D, gx, gy, 430 * D); g.addColorStop(0, 'rgba(235,243,252,0)'); g.addColorStop(1, 'rgba(235,243,252,' + k + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wp, Hp);
    }
    if (wx.rain) {
      ctx.strokeStyle = 'rgba(205,228,255,.55)'; ctx.lineWidth = 1.5 * D; ctx.beginPath();
      for (let i = 0; i < 150; i++) {
        const fx = (i * 0.754877) % 1, fy = (i * 0.569841) % 1, y = ((fy + clock * 1.6) % 1) * (Hp + 40 * D) - 20 * D;
        const x = (((fx * Wp + slant * y * 0.5 + slant * clock * 300 * D) % Wp) + Wp) % Wp;
        ctx.moveTo(x, y); ctx.lineTo(x + (slant * 14 - 2) * D, y + 22 * D);
      }
      ctx.stroke();
    }
    if (wx.snow) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 90; i++) {
        const fx = (i * 0.754877) % 1, fy = (i * 0.569841) % 1, y = ((fy + clock * 0.14) % 1) * Hp;
        const x = (((fx * Wp + Math.sin(clock * 1.3 + i) * 18 * D + slant * y * 0.8) % Wp) + Wp) % Wp;
        ctx.beginPath(); ctx.arc(x, y, (1.4 + (i % 3) * 0.7) * D, 0, 7); ctx.fill();
      }
    }
    if (wx.wind) {
      if (wxInfo.a) {   // streaks flying with the gust
        const k = Math.abs(wxInfo.a) / world.windSpec.wind;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * k) + ')'; ctx.lineWidth = 2 * D; ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const fy = (i * 0.618034) % 1, sp = 1.5 + (i % 4) * 0.5, x0 = (((i * 0.37 + clock * sp * wxInfo.dir) % 1) + 1) % 1 * (Wp + 200 * D) - 100 * D, y = fy * Hp, len = (50 + (i % 5) * 20) * D * k;
          ctx.moveTo(x0, y); ctx.lineTo(x0 - wxInfo.dir * len, y + Math.sin(clock * 3 + i) * 4 * D);
        }
        ctx.stroke();
      }
      if (wxInfo.warn || wxInfo.a) {
        const dir = wxInfo.dir, blink = wxInfo.warn ? (Math.floor(clock * 6) % 2 ? 1 : 0.35) : 1;
        ctx.globalAlpha = blink; ctx.font = '800 ' + 20 * D + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5 * D;
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.fillStyle = '#1f2a36';
        const txt = (dir < 0 ? '◀◀ ' : '') + '💨 ' + (wxInfo.warn ? 'GUST INCOMING' : 'GUST') + (dir > 0 ? ' ▶▶' : '');
        ctx.strokeText(txt, Wp / 2, 118 * D); ctx.fillText(txt, Wp / 2, 118 * D); ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  function drawAimHint() {
    const aim = input.padAim || input.mouseAim;
    if (!aim || state !== 'play') return;
    ctx.save();
    ctx.scale(S * DPR, S * DPR); ctx.translate(-camX, -camY);
    const b = goose.neck[0], l = Math.hypot(aim.x, aim.y) || 1;
    ctx.strokeStyle = 'rgba(31,42,54,.35)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + (aim.x / l) * 150, b.y + (aim.y / l) * 150); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- input
  function hold(el, down, up) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } el.classList.add('down'); audio(); down(); });
    const rel = () => { if (el.classList.contains('down')) { el.classList.remove('down'); up(); } };
    el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel); el.addEventListener('lostpointercapture', rel);
  }
  hold($('btnL'), () => { input.left = true; }, () => { input.left = false; });
  hold($('btnR'), () => { input.right = true; }, () => { input.right = false; });
  hold($('btnFlap'), () => { input.flapHeld = true; input.flapQueue = true; }, () => { input.flapHeld = false; });
  hold($('btnHonk'), () => { input.honkQueue = true; }, () => {});
  $('btnReset').addEventListener('click', () => { if (state === 'play') respawn(); });
  $('btnSlow').addEventListener('click', () => { slow = !slow; $('btnSlow').classList.toggle('on', slow); toast(slow ? 'Slow motion: watch the neck' : 'Normal speed', 1.2); });
  $('btnMenu').addEventListener('click', () => showMenu());
  $('mgMenuBtn').addEventListener('click', () => showMenu());

  (function neckStick() {
    const pad = $('neckpad'), knob = $('knob');
    let active = null;
    function set(e) {
      const r = pad.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const rad = r.width / 2, l = Math.hypot(dx, dy);
      if (l > rad) { dx = (dx / l) * rad; dy = (dy / l) * rad; }
      knob.style.transform = 'translate(' + dx * 0.8 + 'px,' + dy * 0.8 + 'px)';
      input.padAim = { x: dx / rad, y: dy / rad };
    }
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); audio(); active = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } set(e); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === active) set(e); });
    const end = (e) => { if (e.pointerId !== active) return; active = null; input.padAim = null; knob.style.transform = ''; };
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  })();

  let mouseDown = false;
  function mouseAimFrom(e) {
    const g = (state === 'play' ? goose : (mgInst && mgInst.goose)) || null;
    if (!g) return;
    const b = g.neck[0];
    const cam = state === 'play' ? { x: camX, y: camY, s: S } : (mgInst && mgInst.cam ? mgInst.cam() : { x: camX, y: camY, s: S });
    input.mouseAim = { x: e.clientX / cam.s + cam.x - b.x, y: e.clientY / cam.s + cam.y - b.y };
  }
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || (state !== 'play' && state !== 'mg')) return; mouseDown = true; audio(); mouseAimFrom(e); });
  window.addEventListener('pointermove', (e) => { if (mouseDown && e.pointerType === 'mouse') mouseAimFrom(e); });
  window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') { mouseDown = false; input.mouseAim = null; } });

  const keymap = { ArrowLeft: 'kLeft', KeyA: 'kLeft', ArrowRight: 'kRight', KeyD: 'kRight' };
  const isTyping = (t) => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  window.addEventListener('keydown', (e) => {
    if (isTyping(e.target)) return;
    keys.add(e.code);
    if (state === 'mg' && mgInst && mgInst.key && mgInst.key(e.code, true, e)) { e.preventDefault(); return; }
    if (keymap[e.code]) { input[keymap[e.code]] = true; e.preventDefault(); return; }
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (!e.repeat) { input.flapQueue = true; audio(); }
      input.flapHeld = true;
    } else if (e.code === 'KeyH' || e.code === 'KeyE') { if (!e.repeat) input.honkQueue = true; }
    else if (e.code === 'KeyF' || e.code === 'KeyJ') { if (!e.repeat) input.atkQueue = true; }
    else if (e.code === 'KeyR') { if (state === 'play') respawn(); }
    else if (e.code === 'KeyT') { if (state === 'play') $('btnSlow').click(); }
    else if (e.code === 'KeyN') { if (state === 'play' && save.cheats.admin) finishLevel(); }
    else if (e.code === 'Escape') { if (state === 'play' || state === 'mg') showMenu(); }
  });
  window.addEventListener('keyup', (e) => {
    if (isTyping(e.target)) return;
    keys.delete(e.code);
    if (state === 'mg' && mgInst && mgInst.key) mgInst.key(e.code, false, e);
    if (keymap[e.code]) input[keymap[e.code]] = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') input.flapHeld = false;
  });
  const releaseAll = () => { input.left = input.right = input.kLeft = input.kRight = input.flapHeld = false; keys.clear(); };
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); last = performance.now(); });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------------------------------------------------------------- overlays and menu
  const OVERLAYS = ['title', 'done', 'store', 'mgMenu', 'mgDone', 'codeModal'];
  function hideAll() { OVERLAYS.forEach((id) => $(id).classList.add('hidden')); }
  function setMode(ctl, hud) {
    document.body.dataset.ctl = ctl;           // std | custom | none
    $('hud').style.display = hud === 'level' ? 'flex' : 'none';
    $('mgHud').style.display = hud === 'mg' ? 'flex' : 'none';
  }

  function stopMinigame() {
    if (mgInst && mgInst.destroy) mgInst.destroy();
    mgInst = null; mgDef = null;
    $('mgControls').innerHTML = '';
    input.left = input.right = input.flapHeld = false; input.padAim = null; input.mouseAim = null; input.flapQueue = false; input.honkQueue = false;
  }

  function showMenu() {
    if (window.MP) window.MP.stopMode();
    window.Battle.stop();
    diffOverride = null;
    stopMinigame();
    hideAll();
    $('title').classList.remove('hidden');
    state = 'title';
    setMode('none', 'none');
    loadLevel(pick);
    $('toast').classList.remove('show');
    refreshMenu();
  }

  function refreshMenu() {
    $('menuBread').textContent = '🍞 ' + money();
    {
      const doneN = Object.keys(save.done || {}).length, perfN = Object.keys(save.perfect || {}).length;
      $('progress').textContent = '✅ ' + doneN + '/' + LEVELS.length + ' levels · ★ ' + perfN + ' perfect · 🦆 ' + (save.stomps | 0) + ' stomps';
    }
    $('soundBtn').textContent = save.sound === false ? '🔇 Sound: Off' : '🔊 Sound: On';
    $('btnWin').classList.toggle('hidden', !save.cheats.admin);
    $('btnAdm').classList.toggle('hidden', !save.cheats.admin);
    $('mgOpenBtn').textContent = (mgUnlocked() ? '🎮' : '🔒') + ' Minigames';
    $('mgOpenBtn').classList.toggle('dim', !mgUnlocked());
    DIFF_ORDER.forEach((k) => {
      const b = $('diffSeg').querySelector('[data-v="' + k + '"]');
      if (b) b.classList.toggle('sel', k === save.diff);
    });
    $('diffDesc').textContent = diff().desc;
    const ac = activeCodes();
    $('menuBread').title = ac.length ? 'Codes on: ' + ac.join(', ') : '';
    $('menuBread').textContent = '🍞 ' + money() + (ac.length ? '  ✨' + ac.length : '');
  }

  function buildLevelPicker() {
    const box = $('levels');
    box.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const hdr = i === LEVELS.campaign ? '⭐ Bonus levels' : i === LEVELS.weather ? '🌦️ Weather & waves' : i === tier3() ? '🚀 Mega worlds (long levels, new mechanics)' : i === LEVELS.sea ? '🌊 Deep Sea (completely underwater)' : '';
      if (hdr) { const d = document.createElement('div'); d.className = 'lvDiv'; d.textContent = hdr; box.appendChild(d); }
      const b = document.createElement('button');
      b.textContent = i + 1;
      b.title = lv.name;
      if (!levelOpen(i)) b.classList.add('locked');
      if (i === pick) b.classList.add('sel');
      if (save.perfect && save.perfect[i]) { b.classList.add('perfect'); b.title += ' ★ perfect'; } else if (save.done && save.done[i]) b.classList.add('done');
      if (i >= LEVELS.campaign) b.classList.add('bonus');
      if (i >= (LEVELS.weather || 1e9)) b.classList.add('wild');
      b.addEventListener('click', () => {
        if (levelOpen(i)) { pick = i; buildLevelPicker(); if (state === 'title') loadLevel(i); }
        else toast(i >= (LEVELS.weather || 1e9) ? (save.allDone ? 'Finish the level before this one first.' : 'Finish the first ' + LEVELS.campaign + ' levels to open these.') : 'Finish level ' + i + ' first.', 2);
      });
      box.appendChild(b);
    });
    const selBtn = box.querySelector('.sel');
    if (selBtn) { const top = selBtn.offsetTop - box.offsetTop; if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 36) box.scrollTop = Math.max(0, top - 30); }
    $('levelTitle').textContent = LEVELS[pick].name;
  }

  function startCustom(lv) {
    stopMinigame(); hideAll();
    loadLevel(levelIdx, lv);
    state = 'play'; setMode('std', 'level');
  }
  function startLevel(i) {
    stopMinigame();
    hideAll();
    pick = i;
    loadLevel(i);
    state = 'play';
    setMode('std', 'level');
    toast(level.hint, 5);
    buildLevelPicker();
  }

  // difficulty buttons
  (function () {
    const seg = $('diffSeg');
    DIFF_ORDER.forEach((k) => {
      const b = document.createElement('button');
      b.dataset.v = k; b.textContent = DIFFS[k].name;
      b.addEventListener('click', () => { save.diff = k; persist(); refreshMenu(); loadLevel(pick); });
      seg.appendChild(b);
    });
  })();

  $('startBtn').addEventListener('click', () => { audio(); startLevel(pick); });
  $('nextBtn').addEventListener('click', () => {
    audio();
    const next = levelIdx + 1 >= LEVELS.length ? 0 : levelIdx + 1;
    startLevel(next);
  });
  $('doneMenuBtn').addEventListener('click', () => showMenu());

  // ---------------------------------------------------------------- code box
  function openCode() {
    $('codeModal').classList.remove('hidden');
    say('');
    $('codeInput').value = '';
    $('codeList').classList.add('hidden'); $('codeShow').textContent = 'Active codes'; renderCodes();
    setTimeout(() => { try { $('codeInput').focus(); } catch (e) { /* ignore */ } }, 50);
  }
  function activeCodes() { return Object.keys(CHEATS).filter((k) => save.cheats[k]).map((k) => CHEATS[k]); }
  function say(text, good) { const m = $('codeMsg'); m.textContent = text; m.className = good === undefined ? '' : good ? 'ok' : 'bad'; }
  function renderCodes() {
    const list = $('codeList'), on = Object.keys(CHEATS).filter((k) => save.cheats[k]);
    list.innerHTML = '';
    if (!on.length) { const n = document.createElement('div'); n.className = 'none'; n.textContent = 'No active codes'; list.appendChild(n); }
    on.forEach((k) => {
      const r = document.createElement('div'); r.className = 'crow';
      const nm = document.createElement('span'); nm.innerHTML = '<b></b> <small></small>';
      nm.firstChild.textContent = k; nm.lastChild.textContent = CHEATS[k];
      const x = document.createElement('button'); x.className = 'x'; x.textContent = '✕'; x.title = 'Remove ' + k;
      x.addEventListener('click', () => removeCode(k));
      r.append(nm, x); list.appendChild(r);
    });
    $('adminPanel').classList.toggle('hidden', !(save.cheats.admin && !(window.Owner && window.Owner.blocks('admin'))));
    $('admGod').classList.toggle('on', !!save.cheats.god);
  }
  function applyCodes() { if (world) world.gscale = gravK(); zoomMul = has('zoom') ? 0.7 : 1; resize(); persist(); refreshMenu(); buildLevelPicker(); if (state === 'title') loadLevel(pick); renderCodes(); }
  function removeCode(k) {
    delete save.cheats[k];
    if (k === 'admin') delete save.cheats.god;
    snd.tick(); applyCodes();
    say('⛔ ' + k + ' removed', true);
  }
  function submitCode() {
    const inp = $('codeInput'), c = inp.value.trim().toLowerCase();
    if (!c) return;
    if (c === 'akif') {
      $('codeModal').classList.add('hidden'); snd.egg(); window.Owner.open();
    } else if ((GIFTS[c] || CHEATS[c]) && window.Owner && window.Owner.blocks(c) && (GIFTS[c] || !save.cheats[c])) {
      say('🔒 The owner locked the "' + c + '" code.', true); snd.no();
    } else if (GIFTS[c]) {
      if (c === 'skins') for (const k of SKINS.LIST) save.skins[k.id] = true;
      if (c === 'clothes') for (const it of ITEMS) save.owned[it.id] = true;
      if (c === 'bread') save.bread += 500;
      persist(); refreshMenu(); snd.egg(); say('🎁 ' + c + ': ' + GIFTS[c], true);
    } else if (CHEATS[c]) {
      const turnOn = !save.cheats[c];
      if (turnOn) save.cheats[c] = true; else { delete save.cheats[c]; if (c === 'admin') delete save.cheats.god; }
      applyCodes(); turnOn ? snd.egg() : snd.tick();
      say(turnOn ? '✅ ' + c + ': ' + CHEATS[c] + ' ON' : '⛔ ' + c + ' removed', true);
      $('codeList').classList.remove('hidden');
    } else if (c === 'sync') {
      $('codeModal').classList.add('hidden');
      window.Sync.open(syncCtx);
    } else if (c === 'codes') {
      renderCodes(); $('codeList').classList.remove('hidden'); say(activeCodes().length ? 'Your active codes:' : 'You have no active codes yet.');
    } else {
      say('Hmm, that is not a code.', false); snd.no(); inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
    }
    inp.value = '';
  }
  $('codeShow').addEventListener('click', () => { const l = $('codeList'); const show = l.classList.contains('hidden'); l.classList.toggle('hidden', !show); renderCodes(); $('codeShow').textContent = show ? 'Hide codes' : 'Active codes'; });
  $('admGod').addEventListener('click', () => { save.cheats.god = !save.cheats.god; persist(); renderCodes(); say(save.cheats.god ? '🛡 God mode ON' : 'God mode off', true); });
  $('admBread').addEventListener('click', () => { save.bread += 1000; persist(); refreshMenu(); say('+1000 🍞', true); snd.bread(); });
  $('admItems').addEventListener('click', () => { for (const it of ITEMS) save.owned[it.id] = true; for (const k of SKINS.LIST) save.skins[k.id] = true; persist(); say('You own every item!', true); snd.buy(); });
  $('btnWin').addEventListener('click', () => { if (state === 'play' && save.cheats.admin) finishLevel(); });
  const syncEnemyBtn = () => { $('enemyBtn').textContent = '👾 Enemies: ' + (save.enemies === false ? 'Off' : 'On'); };
  const syncNeckBtn = () => { $('neckBtn').textContent = '🦴 Neck mode: ' + (save.neckMode ? 'On' : 'Off'); };
  $('neckBtn').addEventListener('click', () => { save.neckMode = !save.neckMode; persist(); syncNeckBtn(); if (state === 'title') loadLevel(pick); toast(save.neckMode ? 'No legs! Hold left/right or aim the neck to drag yourself along.' : 'Legs are back.', 2.4); });
  syncNeckBtn();
  $('enemyBtn').addEventListener('click', () => { save.enemies = save.enemies === false; persist(); syncEnemyBtn(); if (state === 'title') loadLevel(pick); });
  syncEnemyBtn();
  {
    const today = new Date().toDateString();
    if (save.lastDaily !== today) { save.lastDaily = today; save.bread += 50; persist(); setTimeout(() => { toast('🎁 Daily gift: +50 bread!', 3); refreshMenu(); }, 600); }
  }
  $('soundBtn').addEventListener('click', () => { save.sound = save.sound === false; persist(); refreshMenu(); if (save.sound !== false) snd.honk(); });
  window.Battle.init({
    startCustom, toast, showMenu, award: (n) => { save.bread += n; persist(); refreshMenu(); }, save: () => save, persist, goose: () => goose,
    setMode: (on) => document.body.classList.toggle('battle', on), diffMult: () => diff().mult,
    aim: () => input.padAim || input.mouseAim && (() => { const c = goose.center(), a = input.mouseAim, l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; })() || null,
    sfx: (n) => { try { snd[n](); } catch (e) { /* ignore */ } },
  });
  $('battleBtn').addEventListener('click', () => { audio(); window.Battle.start(); });
  $('arenaBtn').addEventListener('click', () => { audio(); window.Battle.startBrawl(); });
  hold($('btnAtk'), () => { input.atkQueue = true; }, () => {});
  $('mpBtn').addEventListener('click', () => { audio(); window.MP.open(); });
  window.Hide3D.init({ save: () => save, Skins: SKINS, award: (n) => { save.bread += n; persist(); refreshMenu(); }, isOwner: () => !!(window.Owner && window.Owner.authed()) });
  window.Owner.init({ save: () => save, persist, refreshMenu, applyCodes, thumb: avatarThumb, ctl: { toMenu: () => { try { showMenu(); } catch (e) { /* ignore */ } }, applyFx: () => applyFxLive(), honk: () => { input.honkQueue = true; }, win: () => { if (state === 'play') finishLevel(); else toast('Start a level first.', 2); }, respawn: () => { if (goose && state === 'play') respawn(); }, refill: () => { if (goose) goose.stamina = 99; }, killEnemies: () => { enemies = []; }, toEgg: () => { if (goose && level && state === 'play') { const dx = level.egg[0] - 80 - goose.center().x, dy = level.egg[1] - 30 - goose.center().y; for (const p of goose.body.concat(goose.feet, goose.neck || [])) { p.x += dx; p.y += dy; p.ox = p.x; p.oy = p.y; } } }, randTp: () => { if (goose && level && state === 'play') { const dx = (Math.random() - 0.5) * 900, dy = -Math.random() * 300; for (const p of goose.body.concat(goose.feet, goose.neck || [])) { p.x += dx; p.y += dy; p.ox = p.x; p.oy = p.y; } } } }, CHEATS, GIFTS, levelCount: () => LEVELS.length, ownAll: () => { for (const k of SKINS.LIST) save.skins[k.id] = true; for (const it of ITEMS) save.owned[it.id] = true; } });
  window.Account.init({ rank: () => (save.cheats.admin ? 'admin' : ''), look: () => ({ skin: save.skin, equip: save.equip, tint: save.tint }), thumb: avatarThumb, where: () => (document.getElementById('h3') && document.getElementById('h3').style.display !== 'none' ? '3D hide' : document.getElementById('crew') && document.getElementById('crew').style.display !== 'none' ? 'Among Us' : document.getElementById('ch') && document.getElementById('ch').style.display !== 'none' ? 'Chameleon' : state === 'play' ? 'level ' + (levelIdx + 1) : state === 'mg' ? 'minigame' : 'menu') });
  $('accBtn').addEventListener('click', () => { audio(); window.Account.open(); });
  if (window.Helpers) window.Helpers.init({ ctx: () => {
    const o = { screen: state, level: level && level.name, levelNumber: levelIdx + 1, bread: save.bread, difficulty: (diff() || {}).name, activeCodes: Object.keys(save.cheats || {}).filter((k) => save.cheats[k]) };
    try { if (window.Battle && window.Battle.active()) { const b = window.Battle._state; o.battleTower = { floor: b.floor, hp: Math.round(b.hp), weapon: b.weapon }; } } catch (e) { /* ignore */ }
    try { const g = window.Crew && window.Crew._state && window.Crew._state(); if (g) o.amongUs = { phase: g.phase, role: g.me.role, tasksDone: g.tasksDone, tasksTotal: g.tasksTotal, lightsOut: g.lights > 0 }; } catch (e) { /* ignore */ }
    try { const g = window.Chameleon && window.Chameleon._state && window.Chameleon._state(); if (g) o.chameleon = { phase: g.ph, role: g.ps[g.me].role }; } catch (e) { /* ignore */ }
    try { if (window.MP && window.MP.active()) o.multiplayer = window.MP._state.mode; } catch (e) { /* ignore */ }
    return o; } });
  $('h3Btn').addEventListener('click', () => { audio(); window.Hide3D.open(); });
  // extra game modes: each is a full-screen overlay module with init({save, Skins, award}) and open()
  [['Chameleon', 'chamBtn'], ['Crew', 'crewBtn']].forEach(([m, b]) => {
    if (window[m] && window[m].init) window[m].init({ save: () => save, Skins: SKINS, award: (n) => { save.bread += n; persist(); refreshMenu(); }, isOwner: () => !!(window.Owner && window.Owner.authed()) });
    $(b).addEventListener('click', () => { audio(); if (window[m] && window[m].open) window[m].open(); });
  });
  window.MP.init({ save: () => save, levels: LEVELS, goose: () => goose, startLevel, startCustom, startMinigame, showMenu, toast, drawGoose: (c, g, e, sk) => drawGoose(c, g, e, sk),
    setDiff: (k) => { diffOverride = k; }, award: (n) => { save.bread += n; persist(); refreshMenu(); },
    appendMgText: (t) => { $('mgDoneText').textContent += t; } });
  $('codeBtn').addEventListener('click', () => { audio(); openCode(); });
  $('codeGo').addEventListener('click', submitCode);
  $('codeClose').addEventListener('click', () => $('codeModal').classList.add('hidden'));
  $('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitCode(); else if (e.key === 'Escape') $('codeModal').classList.add('hidden'); });

  // ---------------------------------------------------------------- clothing store
  let storeCat = 'hat', tryOn = {}, selectedItem = null;
  const storeCv = $('storeCanvas'), sctx = storeCv.getContext('2d');
  function sizeStoreCanvas() { const d = Math.min(window.devicePixelRatio || 1, 2); storeCv.width = 260 * d; storeCv.height = 300 * d; sctx.setTransform(d, 0, 0, d, 0, 0); }
  sizeStoreCanvas();

  const mkSkinItems = () => SKINS.LIST.filter((k) => !k.hidden).map((k) => ({ id: 'skin:' + k.id, sid: k.id, cat: 'skin', name: k.name, price: k.price || 0, custom: !!k.custom, shape: !!k.shape && !k.jelly && !k.custom, jelly: !!k.jelly && !k.custom }));
  let SKIN_ITEMS = mkSkinItems();
  const STORE_CATS = [{ id: 'skin', name: 'Animals' }, { id: 'shapes', name: 'Shapes' }, { id: 'jelly', name: 'Jelly' }, { id: 'build', name: '✨ Build-a-Goose' }].concat(CATS);
  const TINTS = [null, 30, 60, 120, 180, 210, 270, 300, 330, 'gray', 'dark', 'bright'];
  const itemsFor = (cat) => (cat === 'build' ? [] : cat === 'skin' ? SKIN_ITEMS.filter((i) => !i.shape && !i.jelly && !i.custom) : cat === 'shapes' ? SKIN_ITEMS.filter((i) => i.shape) : cat === 'jelly' ? SKIN_ITEMS.filter((i) => i.jelly) : ITEMS.filter((i) => i.cat === cat)).slice().sort((a, b) => a.price - b.price);
  const storeItem = (id) => BY_ID[id] || SKIN_ITEMS.find((x) => x.id === id);
  const isOwned = (it) => it.cat === 'skin' ? !!save.skins[it.sid] : !!save.owned[it.id];
  const isWearing = (it) => it.cat === 'skin' ? save.skin === it.sid : save.equip[it.cat] === it.id;
  function currentLook() { const l = Object.assign({}, save.equip, tryOn); delete l.skin; l._tint = save.tint; return l; }
  function currentSkin() { if (state === 'store' && storeCat === 'build' && window.BuildAGoose && window.BuildAGoose.draft) return 'custom_draft'; return tryOn.skin ? tryOn.skin.slice(5) : save.skin; }

  // scale + offset that fit a (possibly very long or tall) skin into the preview box; base box is 220 x 215 at 1.2x
  function fitFor(fg, sid) {
    const sk = SKINS.BY_ID[sid] || SKINS.BY_ID.goose, sw = ((sk.shape || {}).w) || 1;
    let minX = -42 * sw - 40, maxX = 42 * sw + 20, minY = -50;
    for (const p of fg.neck) { minX = Math.min(minX, p.x - 18); maxX = Math.max(maxX, p.x + 30); minY = Math.min(minY, p.y - 20); }
    for (const p of fg.feet) maxX = Math.max(maxX, p.x + 16);
    const wide = (maxX - minX) * 1.2, tall = (-minY + 40 + 20) * 1.2;
    return { s: Math.min(1, 220 / wide, 215 / tall), ox: -(minX + maxX) / 2 };
  }
  function drawStorePreview() {
    sctx.clearRect(0, 0, 260, 300);
    const g = sctx.createRadialGradient(130, 150, 20, 130, 150, 170);
    g.addColorStop(0, '#fff7da'); g.addColorStop(1, '#ffd98a');
    sctx.fillStyle = g; sctx.fillRect(0, 0, 260, 300);
    sctx.fillStyle = 'rgba(0,0,0,.12)'; sctx.beginPath(); sctx.ellipse(120, 262, 70, 9, 0, 0, 7); sctx.fill();
    sctx.save();
    const fg = fakeGoose(clock, currentSkin()), ft = fitFor(fg, currentSkin());
    sctx.translate(130 + ft.ox * ft.s * 1.2, 250); sctx.scale(1.2 * ft.s, 1.2 * ft.s);
    drawGoose(sctx, fg, currentLook(), currentSkin());
    sctx.restore();
  }

  function avatarThumb(lk, px) {   // a small picture of someone's goose (their skin and what they wear)
    lk = lk || {}; const sk = (lk.skin && SKINS.BY_ID[lk.skin]) ? lk.skin : 'goose';
    const cv = document.createElement('canvas'); cv.width = cv.height = px * 2; cv.style.width = cv.style.height = px + 'px';
    const c = cv.getContext('2d'), fg = fakeGoose(0, sk), ft = fitFor(fg, sk), k = Math.min(0.36, 0.36 * ft.s * 1.25) * (px * 2 / 96);
    c.translate(px + ft.ox * k, px * 1.55); c.scale(k, k);
    const eq = Object.assign({}, lk.equip || {}); delete eq.skin; if (lk.tint) eq._tint = lk.tint;
    try { drawGoose(c, fg, eq, sk); } catch (e) { /* ignore */ }
    return cv;
  }
  function iconFor(item) {
    if (item.cat === 'skin') {
      const cv = document.createElement('canvas'); cv.width = cv.height = 96;
      const c = cv.getContext('2d'), fg = fakeGoose(0, item.sid), ft = fitFor(fg, item.sid), k = Math.min(0.36, 0.36 * ft.s * 1.25);
      c.translate(48 + ft.ox * k, 74); c.scale(k, k);
      drawGoose(c, fg, {}, item.sid); return cv;
    }
    const cv = document.createElement('canvas'); cv.width = cv.height = 96;
    const c = cv.getContext('2d'); c.scale(2, 2);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.save();
    if (item.cat === 'hat' || item.cat === 'eyes') {
      c.translate(24, item.cat === 'hat' ? 32 : 26); c.scale(item.cat === 'hat' ? 1.5 : 1.9, item.cat === 'hat' ? 1.5 : 1.9);
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3;
      c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill(); c.stroke();
      if (item.cat === 'eyes') { c.fillStyle = INK; c.beginPath(); c.arc(3, -3, 2.8, 0, 7); c.fill(); c.translate(3, -3); }
      item.draw(c);
    } else if (item.cat === 'trail') {
      c.translate(24, 24); c.scale(1.6, 1.6); item.draw(c);
    } else if (item.cat === 'neck') {
      c.translate(24, 24); c.scale(1.7, 1.7); c.rotate(-Math.PI / 2);
      c.strokeStyle = INK; c.lineWidth = 15; c.beginPath(); c.moveTo(-18, 0); c.lineTo(18, 0); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 10.5; c.beginPath(); c.moveTo(-18, 0); c.lineTo(18, 0); c.stroke();
      item.draw(c);
    } else if (item.cat === 'body') {
      c.translate(26, 24); c.scale(0.55, 0.55);
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3;
      if (item.back) item.draw(c);
      c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.fill(); c.stroke();
      if (!item.back) item.draw(c);
    } else if (item.cat === 'face' || item.cat === 'beak') {
      c.translate(item.cat === 'face' ? 26 : 14, 26); c.scale(1.9, 1.9);
      c.fillStyle = '#ff9b2f'; c.strokeStyle = INK; c.lineWidth = 3;
      c.beginPath(); c.moveTo(4, -5); c.lineTo(26, -0.5); c.lineTo(4, 0); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(4, 0); c.lineTo(24, 1); c.lineTo(4, 5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill(); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(3, -3, 2.8, 0, 7); c.fill();
      if (item.cat === 'beak') c.translate(4, 0);
      item.draw(c);
    } else if (item.cat === 'back' || item.cat === 'held' || item.cat === 'tail' || item.cat === 'pet') {
      c.translate(item.cat === 'tail' ? 40 : item.cat === 'back' ? 36 : 28, item.cat === 'pet' ? 38 : 36); c.scale(0.62, 0.62);
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3;
      c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.fill(); c.stroke();
      c.save();
      if (item.cat === 'held') c.translate(16, 2); else if (item.cat === 'tail') c.translate(-34, -4); else if (item.cat === 'pet') c.translate(-8, -24);
      item.draw(c); c.restore();
    } else if (item.cat === 'aura') {
      c.translate(24, 26); c.scale(0.55, 0.55); c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 6, 38, 24, 0, 0, 7); c.fill(); c.stroke(); item.draw(c, 20, -34);
    } else if (item.cat === 'legs') {
      c.translate(24, 40); c.scale(1.7, 1.7);
      c.strokeStyle = INK; c.lineWidth = 8.5; c.beginPath(); c.moveTo(0, -26); c.lineTo(0, 0); c.stroke();
      c.strokeStyle = '#ff9b2f'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -26); c.lineTo(0, 0); c.stroke();
      c.rotate(-Math.PI / 2); item.draw(c);
    } else if (item.cat === 'voice' || item.cat === 'phys') {
      c.font = '34px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(item.emoji || '🔊', 24, 26);
    } else {
      c.translate(20, 22); c.scale(1.7, 1.7);
      c.strokeStyle = INK; c.lineWidth = 8.5; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 0); c.stroke();
      c.strokeStyle = '#ff9b2f'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 0); c.stroke();
      item.draw(c);
    }
    c.restore();
    return cv;
  }

  const ownedCount = (cat) => { const l = itemsFor(cat); return l.filter(isOwned).length + '/' + l.length; };
  function renderStore() {
    $('storeBread').textContent = '🍞 ' + money();
    const tabs = $('storeTabs');
    tabs.innerHTML = '';
    STORE_CATS.forEach((cat) => {
      const b = document.createElement('button');
      b.textContent = cat.id === 'build' ? cat.name : cat.name + ' ' + ownedCount(cat.id);
      if (cat.id === storeCat) b.classList.add('sel');
      b.addEventListener('click', () => { storeCat = cat.id; selectedItem = null; renderStore(); });
      tabs.appendChild(b);
    });
    const isSkinTab = storeCat === 'skin' || storeCat === 'shapes' || storeCat === 'jelly';
    if (storeCat === 'build') {   // Build-a-Goose: describe, re-roll, modify, move parts, save for 1000
      $('storeTools').innerHTML = ''; $('buyBar').classList.add('hidden');
      const grid = $('storeGrid'); grid.style.display = 'block'; grid.style.maxHeight = 'none'; grid.style.overflow = 'visible';
      window.BuildAGoose.panel(grid, { save, persist, rich, snd, toast, rerender: renderStore, refreshSkins: () => { SKIN_ITEMS = mkSkinItems(); },
        iconFor: (sid) => iconFor({ cat: 'skin', sid }) });
      return;
    }
    { const g0 = $('storeGrid'); g0.style.display = ''; g0.style.maxHeight = ''; g0.style.overflow = ''; }
    // tools: random outfit, clear all, colour swatches for the worn item in this slot
    const tools = $('storeTools'); tools.innerHTML = '';
    const tb = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', () => { audio(); fn(); }); tools.appendChild(b); };
    tb('🎲 Random outfit', () => {
      const slots = CATS.filter((c) => c.id !== 'voice' && c.id !== 'phys');
      for (const c of slots) { const own = ITEMS.filter((i) => i.cat === c.id && save.owned[i.id]); if (own.length && Math.random() < 0.7) save.equip[c.id] = own[(Math.random() * own.length) | 0].id; else delete save.equip[c.id]; }
      tryOn = {}; selectedItem = null; persist(); snd.tick(); renderStore();
    });
    tb('🧹 Take everything off', () => { save.equip = {}; save.tint = {}; tryOn = {}; selectedItem = null; persist(); applyPhys(); snd.tick(); renderStore(); });
    const tintable = !isSkinTab && storeCat !== 'voice' && storeCat !== 'phys' && storeCat !== 'trail' && (save.equip[storeCat] || tryOn[storeCat]);
    if (tintable) {
      const row = document.createElement('div'); row.className = 'tintRow';
      const lab = document.createElement('span'); lab.textContent = 'Colour:'; row.appendChild(lab);
      TINTS.forEach((t) => {
        const sw = document.createElement('i'); sw.className = 'sw' + ((save.tint[storeCat] == null ? null : save.tint[storeCat]) === t ? ' on' : '');
        sw.style.background = t == null ? 'conic-gradient(#e63946,#ffd23f,#4cc35a,#4aa3ff,#b57aff,#e63946)' : t === 'gray' ? '#9aa3ad' : t === 'dark' ? '#2a2f3a' : t === 'bright' ? '#fff7a0' : 'hsl(' + ((t + 0) % 360) + ',80%,60%)';
        sw.title = t == null ? 'Original colour' : String(t);
        sw.addEventListener('click', () => { if (t == null) delete save.tint[storeCat]; else save.tint[storeCat] = t; persist(); snd.tick(); renderStore(); });
        row.appendChild(sw);
      });
      tools.appendChild(row);
    }
    const grid = $('storeGrid');
    grid.innerHTML = '';
    // "none" tile
    const none = document.createElement('div');
    none.className = 'item' + (!save.equip[storeCat] && !tryOn[storeCat] ? ' on' : '');
    none.innerHTML = '<div class="ic">∅</div><b>None</b><span>Go bare</span>';
    none.addEventListener('click', () => { delete tryOn[storeCat]; delete save.equip[storeCat]; delete save.tint[storeCat]; persist(); if (storeCat === 'phys') applyPhys(); selectedItem = null; renderStore(); });
    if (!isSkinTab) grid.appendChild(none);
    itemsFor(storeCat).forEach((item) => {
      const owned = isOwned(item);
      const wearing = isWearing(item);
      const el = document.createElement('div');
      el.className = 'item' + (wearing ? ' on' : '') + (selectedItem === item.id ? ' sel' : '');
      const ic = document.createElement('div'); ic.className = 'ic'; ic.appendChild(iconFor(item));
      const nm = document.createElement('b'); nm.textContent = item.name; if (item.tip) el.title = item.tip;
      const st = document.createElement('span');
      st.textContent = wearing ? 'Wearing' : owned ? 'Owned' : '🍞 ' + item.price;
      el.append(ic, nm, st);
      el.addEventListener('click', () => {
        audio();
        if (item.voice) item.voice.forEach((v) => tone(v[0], v[1], v[2], v[3], v[4], v[5]));
        if (owned) {
          if (item.cat === 'skin') save.skin = item.sid;
          else if (wearing) delete save.equip[item.cat]; else save.equip[item.cat] = item.id;
          delete tryOn[item.cat]; selectedItem = null; persist(); snd.tick(); if (item.cat === 'phys') { applyPhys(); toast(wearing ? 'Physics: normal' : item.name + ' is on: ' + (item.tip || ''), 3); }
        } else { tryOn[item.cat] = item.id; selectedItem = item.id; snd.tick(); }
        renderStore();
      });
      grid.appendChild(el);
    });
    // buy bar
    const bar = $('buyBar');
    const it = selectedItem ? storeItem(selectedItem) : null;
    if (it && !isOwned(it)) {
      bar.classList.remove('hidden');
      $('buyText').textContent = 'Try on: ' + it.name + (it.tip ? ' (' + it.tip + ')' : '') + ' · 🍞 ' + it.price;
      const can = rich() || save.bread >= it.price;
      $('buyBtn').disabled = !can;
      $('buyBtn').textContent = can ? 'Buy' : 'Need ' + (it.price - save.bread) + ' more';
    } else bar.classList.add('hidden');
  }

  $('buyBtn').addEventListener('click', () => {
    const it = selectedItem ? storeItem(selectedItem) : null;
    if (!it || isOwned(it)) return;
    if (!rich() && save.bread < it.price) { snd.no(); return; }
    if (!rich()) save.bread -= it.price;
    if (it.cat === 'skin') { save.skins[it.sid] = true; save.skin = it.sid; }
    else { save.owned[it.id] = true; save.equip[it.cat] = it.id; if (it.cat === 'phys') { applyPhys(); toast(it.name + ' is on: ' + (it.tip || ''), 3); } }
    delete tryOn[it.cat]; selectedItem = null; persist(); snd.buy(); refreshMenu(); renderStore();
    toast('Bought ' + it.name + '!', 1.5);
  });

  function openStore() {
    hideAll(); stopMinigame();
    $('store').classList.remove('hidden');
    state = 'store'; tryOn = {}; selectedItem = null;
    renderStore();
  }
  $('storeBtn').addEventListener('click', () => { audio(); openStore(); });
  $('storeBack').addEventListener('click', () => { tryOn = {}; if (window.BuildAGoose) window.BuildAGoose.draft = null; showMenu(); });


  // ---------------------------------------------------------------- admin console (needs the admin code)
  let admOpen = false, admTimer = 0, admG = 1;
  function admRender() {
    const B = $('admBody');
    B.innerHTML = '';
    const sec = (t) => { const h = document.createElement('h4'); h.textContent = t; B.appendChild(h); const g = document.createElement('div'); g.className = 'grid'; B.appendChild(g); return g; };
    const btn = (g, label, fn, on) => { const b = document.createElement('button'); b.textContent = label; if (on) b.classList.add('on'); b.addEventListener('click', () => { fn(); admRender(); }); g.appendChild(b); return b; };
    let g = sec('Player');
    btn(g, 'God mode', () => { save.cheats.god = !save.cheats.god; persist(); }, save.cheats.god);
    btn(g, 'Respawn', () => { if (goose) respawn(); });
    btn(g, 'Win level', () => { if (state === 'play') finishLevel(); });
    btn(g, 'Teleport to egg', () => { if (goose && level) { const dx = level.egg[0] - 80 - goose.center().x, dy = level.egg[1] - 30 - goose.center().y; for (const p of goose.body.concat(goose.feet, goose.neck || [])) { p.x += dx; p.y += dy; p.ox = p.x; p.oy = p.y; } } });
    btn(g, 'Refill flaps', () => { if (goose) goose.stamina = 99; });
    g = sec('Codes (toggle any)');
    const allKeys = Object.keys(CHEATS).filter((k) => k !== 'admin'), allOn = allKeys.every((k) => save.cheats[k]);
    btn(g, allOn ? 'Turn ALL codes off' : 'Turn ALL codes on', () => { allKeys.forEach((k) => { if (allOn) delete save.cheats[k]; else save.cheats[k] = true; }); applyCodes(); }, allOn);
    Object.keys(CHEATS).filter((k) => k !== 'admin').forEach((k) => btn(g, k, () => { if (save.cheats[k]) delete save.cheats[k]; else save.cheats[k] = true; applyCodes(); }, save.cheats[k]));
    g = sec('Gravity');
    const sl = document.createElement('input'); sl.type = 'range'; sl.min = 0.1; sl.max = 2; sl.step = 0.05; sl.value = admG;
    const lb = document.createElement('label'); lb.textContent = 'x' + admG.toFixed(2); sl.addEventListener('input', () => { admG = +sl.value; lb.textContent = 'x' + admG.toFixed(2); if (world) world.gscale = admG; });
    g.append(sl, lb); btn(g, 'Reset', () => { admG = 1; if (world) world.gscale = gravK(); });
    g = sec('Level');
    const sel = document.createElement('select');
    LEVELS.forEach((lv, i) => { const o = document.createElement('option'); o.value = i; o.textContent = (i + 1) + '. ' + lv.name; if (i === levelIdx) o.selected = true; sel.appendChild(o); });
    g.appendChild(sel); btn(g, 'Jump to level', () => { $('admin').classList.add('hidden'); admOpen = false; startLevel(+sel.value); });
    const ds = document.createElement('select');
    DIFF_ORDER.forEach((k) => { const o = document.createElement('option'); o.value = k; o.textContent = DIFFS[k].name; if (k === save.diff) o.selected = true; ds.appendChild(o); });
    g.appendChild(ds); btn(g, 'Set difficulty', () => { save.diff = ds.value; persist(); if (state === 'play') loadLevel(levelIdx); });
    g = sec('Enemies');
    btn(g, 'Enemies ' + (save.enemies === false ? 'OFF' : 'ON'), () => { save.enemies = save.enemies === false; persist(); syncEnemyBtn(); if (state === 'play') loadLevel(levelIdx); });
    btn(g, 'Clear all', () => { enemies = []; });
    btn(g, 'Spawn blob here', () => { if (goose) { const c = goose.center(); enemies.push({ id: enemies.length + 100, kind: 'blob', cx: c.x + 150, y: c.y + 30, amp: 90, sp: 50, ph: 0, hue: 200 }); } });
    btn(g, 'Spawn bat here', () => { if (goose) { const c = goose.center(); enemies.push({ id: enemies.length + 100, kind: 'bat', cx: c.x + 150, y: c.y - 60, amp: 100, sp: 1.3, ph: 0, hue: 0 }); } });
    btn(g, 'Spawn urchin here', () => { if (goose) { const c = goose.center(); enemies.push({ id: enemies.length + 100, kind: 'urchin', cx: c.x + 150, y: c.y + 30, amp: 90, sp: 50, ph: 0, hue: 0 }); } });
    g = sec('Economy & unlocks');
    const num = document.createElement('input'); num.type = 'number'; num.value = save.bread; num.style.width = '90px';
    g.appendChild(num); btn(g, 'Set bread', () => { save.bread = Math.max(0, +num.value | 0); persist(); refreshMenu(); });
    btn(g, '+1000 🍞', () => { save.bread += 1000; persist(); refreshMenu(); });
    btn(g, 'Own all items + skins', () => { for (const it of ITEMS) save.owned[it.id] = true; for (const k of SKINS.LIST) save.skins[k.id] = true; persist(); });
    btn(g, 'Unlock all levels', () => { save.unlocked = LEVELS.length; persist(); buildLevelPicker(); });
    btn(g, 'Mark all done', () => { save.allDone = true; save.unlocked = LEVELS.length; persist(); refreshMenu(); });
    g = sec('Save data');
    const ta = document.createElement('textarea'); ta.value = JSON.stringify(save); B.appendChild(ta);
    g = sec('');
    btn(g, 'Load from box', () => { try { const o = JSON.parse(ta.value); save = Object.assign(defaults(), o); persist(); location.reload(); } catch (e) { alert('That is not valid save JSON.'); } });
    btn(g, 'Reset ALL progress', () => { if (confirm('Wipe the whole save?')) { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } location.reload(); } });
    g = sec('Debug');
    const dbg = document.createElement('div'); dbg.className = 'dbg'; dbg.id = 'admDbg'; B.appendChild(dbg);
  }
  function admDebug() {
    const d = $('admDbg'); if (!d || !goose) return;
    const c = goose.center();
    d.textContent = 'state ' + state + ' · level ' + (levelIdx + 1) + '/' + LEVELS.length + ' (' + (level ? level.name : '') + ')\nx ' + c.x.toFixed(0) + '  y ' + c.y.toFixed(0) + '  stamina ' + (goose.stamina || 0).toFixed(1) + '\nenemies ' + enemies.length + '  grav x' + (world ? world.gscale : 1).toFixed(2) + '  bread ' + save.bread + '  stomps ' + (save.stomps | 0);
  }
  function openAdmin() {
    if (!save.cheats.admin) return;      // never without the admin code
    $('codeModal').classList.add('hidden');
    admOpen = true; $('admin').classList.remove('hidden'); admRender();
    clearInterval(admTimer); admTimer = setInterval(() => { if (!admOpen || !save.cheats.admin) { clearInterval(admTimer); $('admin').classList.add('hidden'); admOpen = false; } else admDebug(); }, 300);
  }
  function closeAdmin() { admOpen = false; $('admin').classList.add('hidden'); clearInterval(admTimer); }
  $('btnAdm').addEventListener('click', openAdmin);
  $('admOpen').addEventListener('click', openAdmin);
  $('admClose').addEventListener('click', closeAdmin);

  // ---------------------------------------------------------------- minigames
  function openMgMenu() {
    if (!mgUnlocked()) { toast('Finish the first ' + LEVELS.campaign + ' levels to unlock the minigames. (Or find a secret code…)', 3.5); snd.no(); return; }
    hideAll();
    $('mgMenu').classList.remove('hidden');
    state = 'mgmenu';
    const box = $('mgList');
    box.innerHTML = '';
    window.Minigames.list.forEach((m) => {
      const el = document.createElement('div');
      el.className = 'mgcard';
      const best = save.best[m.id];
      el.innerHTML = '<div class="mgi">' + m.icon + '</div><b>' + m.name + '</b><p>' + m.desc + '</p><span>' + (best != null ? 'Best: ' + m.fmt(best) : 'Not played yet') + '</span>';
      const b = document.createElement('button'); b.className = 'big small-btn'; b.textContent = 'Play';
      b.addEventListener('click', () => { audio(); startMinigame(m.id); });
      el.appendChild(b);
      box.appendChild(el);
    });
  }
  $('mgOpenBtn').addEventListener('click', () => { audio(); openMgMenu(); });
  $('mgBack').addEventListener('click', () => showMenu());

  const host = {
    get ctx() { return ctx; },
    get W() { return W; }, get H() { return H; }, get S() { return S; }, get DPR() { return DPR; },
    input, keys, snd, tone, INK, Physics: window.Physics,
    clock: () => clock,
    drawGoose: (g, equip, skin) => drawGoose(ctx, g, equip || lookEquip(), skin || save.skin),
    readInput() {
      const move = (input.left || input.kLeft ? -1 : 0) + (input.right || input.kRight ? 1 : 0);
      const flap = input.flapQueue, honk = input.honkQueue;
      input.flapQueue = false; input.honkQueue = false;
      return { move, flap, honk, glide: input.flapHeld, aim: input.padAim || input.mouseAim || null };
    },
    drawSky: (cx, cy) => { drawSky(cx, cy); if ((state === 'mg' || state === 'mgdone') && mgDef && mgDef.deco && window.Minigames.scene) window.Minigames.scene(ctx, mgDef.deco, W, H, clock); },
    roundRect: (x, y, w, h, r) => roundRect(ctx, x, y, w, h, r),
    wobble: () => diff(),
    gooseOpts,
    toast,
    hud(o) {
      $('mgTitle').textContent = o.title || '';
      $('mgScore').textContent = o.text || '';
    },
    // ctl: 'std' (stick, flap, etc), or a list of custom buttons: { label, side:'L'|'R', big?, down(), up() }
    controls(ctl) {
      const box = $('mgControls');
      box.innerHTML = '';
      if (ctl === 'std') { document.body.dataset.ctl = 'std'; return; }
      document.body.dataset.ctl = 'custom';
      const L = document.createElement('div'), R = document.createElement('div');
      L.className = 'mgside left'; R.className = 'mgside right';
      (ctl || []).forEach((spec) => {
        const b = document.createElement('div');
        b.className = 'btn mgbtn' + (spec.big ? ' bigbtn' : '');
        b.textContent = spec.label;
        hold(b, () => spec.down && spec.down(), () => spec.up && spec.up());
        (spec.side === 'R' ? R : L).appendChild(b);
      });
      box.append(L, R);
    },
    end(score, text) { endMinigame(score, text); },
    award(n) { save.bread += n; persist(); },
  };

  function startMinigame(id) {
    stopMinigame();
    hideAll();
    mgDef = window.Minigames.list.find((m) => m.id === id);
    if (!mgDef) return;
    state = 'mg'; acc = 0; th = THEMES[mgDef.theme] || THEMES.meadow;
    setMode('std', 'mg');
    mgInst = mgDef.create(host);
  }

  function endMinigame(score, text) {
    if (state !== 'mg' || !mgDef) return;
    state = 'mgdone';
    const prev = save.best[mgDef.id];
    const isBest = prev == null || score > prev;
    if (isBest) save.best[mgDef.id] = score;
    const reward = mgDef.reward(score);
    save.bread += reward;
    persist(); refreshMenu();
    $('mgDoneTitle').textContent = mgDef.name;
    $('mgDoneText').textContent = (text || mgDef.fmt(score)) + '\n' + (isBest ? '🏆 New best!' : 'Best: ' + mgDef.fmt(prev)) + '\n+' + reward + ' 🍞';
    $('mgDone').classList.remove('hidden');
    if (window.MP) window.MP.onMgEnd(score);
  }
  $('mgAgain').addEventListener('click', () => { if (mgDef) { const id = mgDef.id; startMinigame(id); } });
  $('mgDoneList').addEventListener('click', () => { stopMinigame(); openMgMenu(); setMode('none', 'none'); });
  $('mgDoneMenu').addEventListener('click', () => showMenu());

  // ---------------------------------------------------------------- go
  buildLevelPicker();
  loadLevel(0);
  showMenu();
  requestAnimationFrame(frame);

  window.__wobble = {
    get goose() { return goose; }, get state() { return state; }, get save() { return save; }, input, host,
    startLevel, showMenu, openStore, openMgMenu, startMinigame, openCode, persist,
    get inst() { return mgInst; }, get level() { return level; }, drawGoose, fakeGoose, SKINS,
    get mech() { return mech; }, get boss() { return boss; }, get bossPhase() { return bossPhase; }, get world() { return world; }, get wx() { return wxInfo; }, get eggPos() { return eggPos; },
  };
})();
