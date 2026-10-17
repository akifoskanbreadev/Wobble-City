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
  const defaults = () => ({ bread: 25, unlocked: 1, allDone: false, mg: false, owned: {}, equip: {}, best: {}, diff: 'normal', cheats: {}, skin: 'goose', skins: { goose: true }, enemies: true, stomps: 0 });
  let save = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) save = Object.assign(defaults(), JSON.parse(raw));
  } catch (e) { /* storage unavailable: play without saving */ }
  if (!DIFFS[save.diff]) save.diff = 'normal';
  if (!save.cheats || typeof save.cheats !== 'object') save.cheats = {};
  if (!SKINS.BY_ID[save.skin]) save.skin = 'goose';
  if (!save.skins || typeof save.skins !== 'object') save.skins = {};
  save.skins.goose = true;
  save.unlocked = Math.max(1, Math.min(LEVELS.length, save.unlocked | 0));
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
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
    admin: 'Everything + admin tools',
  };
  // one-shot codes: they give you something once instead of toggling
  const GIFTS = { skins: 'Every skin unlocked', clothes: 'Every cosmetic unlocked', bread: '+500 bread' };
  const has = (k) => !mpOn() && !!(save.cheats[k] || save.cheats.admin);   // codes are off during multiplayer games   // admin switches on every code
  zoomMul = has('zoom') ? 0.7 : 1; resize();
  const levelOpen = (i) => has('levels') || i < save.unlocked;
  const rich = () => has('money');
  const money = () => (rich() ? '∞' : save.bread);
  function gooseOpts() {
    const d = diff();
    return { wobble: d.wobble, tremor: d.tremor, chaos: !!d.chaos, speed: has('speed') ? 2.3 : 1, neck: (SKINS.BY_ID[save.skin].neck || 1) * (has('neck') ? 2.2 : 1), infFlaps: has('flaps') };
  }

  // ---------------------------------------------------------------- audio
  let actx = null;
  function audio() {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(type, f0, f1, dur, vol, delay) {
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
    honk: () => { tone('sawtooth', 400 + Math.random() * 50, 280, 0.32, 0.16); tone('square', 200, 145, 0.32, 0.07); },
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
  const input = { left: false, right: false, kLeft: false, kRight: false, flapHeld: false, flapQueue: false, honkQueue: false, padAim: null, mouseAim: null };
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

  let trailP = [], enemies = [], enemyDead = {}, levelClock = 0, hitCd = 0, prevCy = 0;
  function loadLevel(i, custom) {
    levelIdx = i; level = custom || LEVELS[i];
    world = new World();
    world.gscale = has('moon') ? 0.4 : 1;
    trailP = [];
    enemies = (save.enemies !== false) ? ENEMIES.generate(level, custom ? -1 : i, dKey()) : []; enemyDead = {}; levelClock = 0; hitCd = 0; prevCy = 0;
    extras = buildLevel(world, level);
    const d = diff();
    goose = new Goose(world, level.spawn[0], level.spawn[1], gooseOpts());
    th = THEMES[level.theme] || THEMES.meadow;
    checkpoint = { x: level.spawn[0], y: level.spawn[1] };
    bread = level.bread.map((b) => ({ x: b[0], y: b[1], got: false }));
    breadGot = 0; deaths = 0; splashes = [];
    const c = goose.center();
    camX = c.x - VW * 0.4; camY = c.y - VH * 0.58;
    $('levelName').textContent = custom ? level.name : (i + 1) + '/' + LEVELS.length + '  ' + level.name;
    updateHud();
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
    const k = tr.kind, up = (k === 'flame' || k === 'bubble' || k === 'heart' || k === 'note') ? -40 : k === 'snow' || k === 'leaf' ? 25 : 0;
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
      else { ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 7); ctx.fill(); }
      ctx.restore();
    }
  }
  function enemyTick() {
    const c = goose.center(), vy = (c.y - prevCy) / STEP; prevCy = c.y;
    if (!enemies.length || state !== 'play') return;
    const parts = goose.body.concat(goose.feet);
    for (const e of enemies) {
      if (enemyDead[e.id] > levelClock) continue;
      const p = ENEMIES.posAt(e, levelClock), r = ENEMIES.RADIUS[e.kind];
      const ey = p.y - (e.kind === 'bat' ? 0 : r);   // enemy centre
      let hit = false;
      for (const q of parts) if (Math.hypot(q.x - p.x, q.y - ey) < r + q.r * 0.8) { hit = true; break; }
      if (!hit) continue;
      const above = c.y < ey - r * 0.2 && vy > 40;
      if (above && ENEMIES.stompable(e)) {
        enemyDead[e.id] = levelClock + ENEMIES.RESPAWN; save.stomps = (save.stomps | 0) + 1; save.bread += 1; breadGot = breadGot;
        for (const q of parts) q.vy = Math.min(q.vy, -420);
        snd.boing(); toast('Stomp! +1 🍞', 0.9); persist();
      } else if (hitCd <= 0 && !has('shield') && !(save.cheats.admin && save.cheats.god && !mpOn())) {
        hitCd = 1.2; const dir = c.x < p.x ? -1 : 1;
        for (const q of parts) { q.vx += dir * 520; q.vy = Math.min(q.vy, -330); }
        snd.ouch(); toast('Bonk!', 0.9);
      }
    }
  }
  function tick() {
    const frz = window.MP && window.MP.frozen();
    const move = frz ? 0 : (input.left || input.kLeft ? -1 : 0) + (input.right || input.kRight ? 1 : 0);
    const aim = input.padAim || input.mouseAim || null;
    const flap = frz ? false : input.flapQueue;
    input.flapQueue = false;
    if (flap && goose.stamina >= 1 && goose.flapCd <= 0) snd.flap();
    if (input.honkQueue) { input.honkQueue = false; goose.honk(); snd.honk(); honkText = 0.7; }
    const wasWet = goose.swimming;
    goose.update(STEP, { move, flap, glide: input.flapHeld, aim });
    world.step(STEP);
    if (window.MP) window.MP.tick(goose, STEP);
    levelClock += STEP; hitCd = Math.max(0, hitCd - STEP);
    enemyTick();
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

    if (state === 'play' && Math.hypot(h.x - level.egg[0], h.y - level.egg[1]) < 34) { if (!(mpOn() && window.MP.onEgg())) finishLevel(); }
  }

  function finishLevel() {
    state = 'done'; snd.egg();
    const d = diff(), last = levelIdx === LEVELS.length - 1;
    const reward = (breadGot + 10) * d.mult;
    save.bread += reward;
    if (!last) save.unlocked = Math.max(save.unlocked, levelIdx + 2);
    let extra = '';
    if (last && !save.allDone) { save.allDone = true; extra = '\n🎮 You unlocked the minigames!'; }
    persist();
    buildLevelPicker(); refreshMenu();
    $('doneTitle').textContent = last ? 'You are the Wobble Champion!' : 'Egg acquired!';
    $('doneText').textContent = 'Bread ' + breadGot + '/' + bread.length + (deaths ? '  ·  Falls ' + deaths : '  ·  No falls!') +
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
    lava:   { top: '#3a0f14', bot: '#a8321c', cloud: 'rgba(255,150,100,.3)', h1: '#6e2018', h2: '#4a1612', grass: '#d9522b', grass2: '#ff8a4d', d1: '#4a2a28', d2: '#2a1514', stars: true },
  };
  let th = THEMES.meadow;

  function drawSky(cx, cy) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.top); g.addColorStop(1, th.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (th.stars) { ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 46; i++) ctx.fillRect(((i * 197 + 40) % W), ((i * 89) % (H * 0.7)), 2, 2); }
    ctx.fillStyle = th.cloud;
    for (let i = 0; i < 7; i++) {
      const span = VW + 600;
      let wx = ((i * 520 + 100) - cx * 0.12) % span; if (wx < -300) wx += span;
      const x = wx * S, y = (60 + ((i * 73) % 150) - cy * 0.05) * S;
      ctx.beginPath();
      ctx.ellipse(x, y, 60 * S, 20 * S, 0, 0, 7);
      ctx.ellipse(x + 40 * S, y - 12 * S, 40 * S, 22 * S, 0, 0, 7);
      ctx.ellipse(x - 38 * S, y - 6 * S, 34 * S, 17 * S, 0, 0, 7);
      ctx.fill();
    }
    const base = (540 - cy) * S;
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
    ctx.strokeStyle = ice ? '#eaf8ff' : th.grass; ctx.lineWidth = 12; trace(6); ctx.stroke();
    ctx.strokeStyle = ice ? '#ffffff' : th.grass2; ctx.lineWidth = 5; trace(3); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; trace(0); ctx.stroke();
  }

  function drawSolid(s) {
    if (s.x > camX + VW + 40 || s.x + s.w < camX - 40 || s.y > camY + VH + 40 || s.y + s.h < camY - 40) return;
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

    for (const t of level.terrain || []) drawTerrain(t);
    for (const s of world.solids) drawSolid(s);
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

    const e = level.egg, pulse = 1 + Math.sin(clock * 4) * 0.06;
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

    drawTrail();
    ENEMIES.draw(ctx, enemies, levelClock, enemyDead);
    drawGoose(ctx, goose, save.equip, save.skin);
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
      const g = ctx.createLinearGradient(0, w.y, 0, w.y + Math.min(w.h, 260));
      g.addColorStop(0, 'rgba(88,184,240,.55)'); g.addColorStop(1, 'rgba(42,118,192,.75)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(w.x, w.y + w.h);
      for (let x = w.x; x <= w.x + w.w; x += 10) ctx.lineTo(x, w.y + Math.sin(x * 0.06 + clock * 2.4) * 2.5);
      ctx.lineTo(w.x + w.w, w.y + w.h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = w.x; x <= w.x + w.w; x += 10) { const y = w.y + Math.sin(x * 0.06 + clock * 2.4) * 2.5; if (x === w.x) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (const sp of splashes) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - sp.t) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 16, 14 + sp.t * 46, 5 + sp.t * 10, 0, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }

  // The goose. `cx` is any 2D context, `g` any object with the Goose drawing interface (so the store preview and
  // remote players can fake one), `equip` the worn clothes and `skin` a skin id (or object).
  function drawGoose(cx, g, equip, skin) {
    equip = equip || {};
    const sk = typeof skin === 'object' && skin ? skin : (SKINS.BY_ID[skin] || SKINS.BY_ID.goose);
    const c = g.center(), A = g.axes();
    const ang = Math.atan2(A.uy, A.ux), f = g.facing, n = g.neck, nN = n.length;
    const it = (cat) => (equip[cat] ? BY_ID[equip[cat]] : null);
    const bodyC = sk.body || '#ffffff';
    cx.lineCap = 'round'; cx.lineJoin = 'round';

    const bodyItem = it('body');
    if (bodyItem && bodyItem.back) { cx.save(); cx.translate(c.x, c.y); cx.rotate(ang); cx.scale(f, 1); bodyItem.draw(cx); cx.restore(); }

    // legs and feet
    const shoes = it('shoes'), lw = sk.legW || 1;
    for (let i = 0; i < 2; i++) {
      const hip = g.hips[i], ft = g.feet[i];
      cx.strokeStyle = INK; cx.lineWidth = 8.5 * lw;
      cx.beginPath(); cx.moveTo(hip.x, hip.y); cx.lineTo(ft.x, ft.y); cx.stroke();
      cx.strokeStyle = sk.legC || '#ff9b2f'; cx.lineWidth = 5 * lw;
      cx.beginPath(); cx.moveTo(hip.x, hip.y); cx.lineTo(ft.x, ft.y); cx.stroke();
      cx.save(); cx.translate(ft.x, ft.y); cx.scale(f, 1);
      if (shoes) shoes.draw(cx);
      else if (sk.foot) sk.foot(cx);
      else { cx.fillStyle = sk.legC || '#ff9b2f'; cx.strokeStyle = INK; cx.lineWidth = 2.5; cx.beginPath(); cx.ellipse(4, 2, 11, 4.5, 0, 0, 7); cx.fill(); cx.stroke(); }
      cx.restore();
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
    cx.translate(c.x, c.y); cx.rotate(ang); cx.scale(f, 1);
    cx.fillStyle = bodyC; cx.strokeStyle = INK; cx.lineWidth = 3;
    if (sk.tail) { cx.save(); sk.tail(cx); cx.restore(); }
    else { cx.beginPath(); cx.moveTo(-30, -8); cx.lineTo(-52, -20); cx.lineTo(-36, 6); cx.closePath(); cx.fill(); cx.stroke(); }
    cx.fillStyle = bodyC; cx.strokeStyle = INK; cx.lineWidth = 3;
    cx.beginPath(); cx.ellipse(0, 0, 38, 24, 0, 0, 7); cx.fill();
    if (sk.bodyDeco) { cx.save(); cx.beginPath(); cx.ellipse(0, 0, 38, 24, 0, 0, 7); cx.clip(); sk.bodyDeco(cx); cx.restore(); }
    cx.beginPath(); cx.ellipse(0, 0, 38, 24, 0, 0, 7); cx.stroke();
    if (bodyItem && !bodyItem.back) bodyItem.draw(cx);
    const fp = g.flapT > 0 ? Math.sin((0.35 - g.flapT) * 36) : 0;
    cx.save();
    cx.translate(-4, -2); cx.rotate(-0.15 - fp * 0.9);
    cx.fillStyle = sk.wing || '#e4edf5'; cx.strokeStyle = INK; cx.lineWidth = 3;
    cx.beginPath(); cx.ellipse(-8, 0, 20 + Math.abs(fp) * 6, 10, 0, 0, 7); cx.fill(); cx.stroke();
    cx.restore();
    cx.restore();

    // neckwear
    const neckItem = it('neck');
    if (neckItem) {
      const i = neckItem.id === 'scarf' ? Math.round(nN * 0.62) : Math.round(nN * 0.74);
      const a = n[Math.max(0, i - 1)], b = n[Math.min(nN - 1, i + 1)];
      cx.save(); cx.translate(n[i].x, n[i].y); cx.rotate(Math.atan2(b.y - a.y, b.x - a.x)); neckItem.draw(cx); cx.restore();
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
    const eyes = it('eyes'), hat = it('hat');
    if (sk.headDeco) { cx.save(); sk.headDeco(cx); cx.restore(); }
    if (eyes) { cx.save(); cx.translate(ex, ey); eyes.draw(cx); cx.restore(); }
    if (hat) { cx.save(); hat.draw(cx); cx.restore(); }
    cx.restore();
  }

  // a stand-in goose for the store preview
  function fakeGoose(t) {
    const n = [];
    let x = 24, y = -17, a = (-98 * Math.PI) / 180;
    n.push({ x, y });
    for (let i = 1; i <= NECK_SEGS; i++) {
      a += (4.2 * Math.PI) / 180 + Math.sin(t * 2 + i * 0.35) * 0.012 * (i / NECK_SEGS) * 6;
      x += Math.cos(a) * 7; y += Math.sin(a) * 7;
      n.push({ x, y });
    }
    return {
      facing: 1, flapT: 0, honkT: 0, neck: n, head: n[n.length - 1],
      hips: [{ x: -13, y: 8 }, { x: 13, y: 8 }], feet: [{ x: -13, y: 38 }, { x: 13, y: 38 }],
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
      acc += slow ? real * 0.25 : real;
      let guard = 0;
      while (acc >= STEP && guard++ < 6) {
        if (state === 'play') tick(); else { goose.update(STEP, { move: 0 }); world.step(STEP); }
        acc -= STEP;
      }
      if (acc > STEP * 6) acc = 0;
      const c = goose.center();
      const tx = c.x - VW * 0.5 + goose.facing * VW * 0.1, ty = c.y - VH * 0.58;
      const k = 1 - Math.pow(0.002, real);
      camX += (tx - camX) * k; camY += (ty - camY) * k;
      hudT += real;
      if (state === 'play' && hudT > 0.08) { hudT = 0; updateHud(); }
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawSky(camX, camY);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawWorld();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (has('disco')) { ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'hsl(' + ((performance.now() / 8) % 360) + ',90%,55%)'; ctx.globalAlpha = 0.5; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      if (window.MP) window.MP.drawOverlay(ctx, canvas.width, canvas.height);
      drawAimHint();
    }
    if (state === 'store') drawStorePreview();
    requestAnimationFrame(frame);
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
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    keys.add(e.code);
    if (state === 'mg' && mgInst && mgInst.key && mgInst.key(e.code, true, e)) { e.preventDefault(); return; }
    if (keymap[e.code]) { input[keymap[e.code]] = true; e.preventDefault(); return; }
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (!e.repeat) { input.flapQueue = true; audio(); }
      input.flapHeld = true;
    } else if (e.code === 'KeyH' || e.code === 'KeyE') { if (!e.repeat) input.honkQueue = true; }
    else if (e.code === 'KeyR') { if (state === 'play') respawn(); }
    else if (e.code === 'KeyT') { if (state === 'play') $('btnSlow').click(); }
    else if (e.code === 'KeyN') { if (state === 'play' && save.cheats.admin) finishLevel(); }
    else if (e.code === 'Escape') { if (state === 'play' || state === 'mg') showMenu(); }
  });
  window.addEventListener('keyup', (e) => {
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
      const b = document.createElement('button');
      b.textContent = i + 1;
      b.title = lv.name;
      if (!levelOpen(i)) b.classList.add('locked');
      if (i === pick) b.classList.add('sel');
      b.addEventListener('click', () => {
        if (levelOpen(i)) { pick = i; buildLevelPicker(); if (state === 'title') loadLevel(i); }
        else toast('Finish level ' + i + ' first.', 1.6);
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
    $('adminPanel').classList.toggle('hidden', !save.cheats.admin);
    $('admGod').classList.toggle('on', !!save.cheats.god);
  }
  function applyCodes() { if (world) world.gscale = has('moon') ? 0.4 : 1; zoomMul = has('zoom') ? 0.7 : 1; resize(); persist(); refreshMenu(); buildLevelPicker(); if (state === 'title') loadLevel(pick); renderCodes(); }
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
      const all = Object.keys(CHEATS).map((k) => k + ' = ' + CHEATS[k]).concat(Object.keys(GIFTS).map((k) => k + ' = ' + GIFTS[k] + ' (one-time)'), ['codes = show your active codes', 'akif = this list']);
      say('All codes:\n' + all.join('\n'), true); snd.egg();
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
    } else if (c === 'codes') {
      renderCodes(); $('codeList').classList.remove('hidden'); say(activeCodes().length ? 'Your active codes:' : 'You have no active codes yet.');
    } else { say('Hmm, that is not a code.', false); snd.no(); inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); }
    inp.value = '';
  }
  $('codeShow').addEventListener('click', () => { const l = $('codeList'); const show = l.classList.contains('hidden'); l.classList.toggle('hidden', !show); renderCodes(); $('codeShow').textContent = show ? 'Hide codes' : 'Active codes'; });
  $('admGod').addEventListener('click', () => { save.cheats.god = !save.cheats.god; persist(); renderCodes(); say(save.cheats.god ? '🛡 God mode ON' : 'God mode off', true); });
  $('admBread').addEventListener('click', () => { save.bread += 1000; persist(); refreshMenu(); say('+1000 🍞', true); snd.bread(); });
  $('admItems').addEventListener('click', () => { for (const it of ITEMS) save.owned[it.id] = true; for (const k of SKINS.LIST) save.skins[k.id] = true; persist(); say('You own every item!', true); snd.buy(); });
  $('btnWin').addEventListener('click', () => { if (state === 'play' && save.cheats.admin) finishLevel(); });
  const syncEnemyBtn = () => { $('enemyBtn').textContent = '👾 Enemies: ' + (save.enemies === false ? 'Off' : 'On'); };
  $('enemyBtn').addEventListener('click', () => { save.enemies = save.enemies === false; persist(); syncEnemyBtn(); if (state === 'title') loadLevel(pick); });
  syncEnemyBtn();
  $('mpBtn').addEventListener('click', () => { audio(); window.MP.open(); });
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

  const SKIN_ITEMS = SKINS.LIST.map((k) => ({ id: 'skin:' + k.id, sid: k.id, cat: 'skin', name: k.name, price: k.price || 0 }));
  const STORE_CATS = [{ id: 'skin', name: 'Skins' }].concat(CATS);
  const storeItem = (id) => BY_ID[id] || SKIN_ITEMS.find((x) => x.id === id);
  const isOwned = (it) => it.cat === 'skin' ? !!save.skins[it.sid] : !!save.owned[it.id];
  const isWearing = (it) => it.cat === 'skin' ? save.skin === it.sid : save.equip[it.cat] === it.id;
  function currentLook() { const l = Object.assign({}, save.equip, tryOn); delete l.skin; return l; }
  function currentSkin() { return tryOn.skin ? tryOn.skin.slice(5) : save.skin; }

  function drawStorePreview() {
    sctx.clearRect(0, 0, 260, 300);
    const g = sctx.createRadialGradient(130, 150, 20, 130, 150, 170);
    g.addColorStop(0, '#fff7da'); g.addColorStop(1, '#ffd98a');
    sctx.fillStyle = g; sctx.fillRect(0, 0, 260, 300);
    sctx.fillStyle = 'rgba(0,0,0,.12)'; sctx.beginPath(); sctx.ellipse(120, 262, 70, 9, 0, 0, 7); sctx.fill();
    sctx.save();
    sctx.translate(100, 235); sctx.scale(1.2, 1.2);
    drawGoose(sctx, fakeGoose(clock), currentLook(), currentSkin());
    sctx.restore();
  }

  function iconFor(item) {
    if (item.cat === 'skin') {
      const cv = document.createElement('canvas'); cv.width = cv.height = 96;
      const c = cv.getContext('2d'); c.translate(14, 36); c.scale(0.5, 0.5);
      drawGoose(c, fakeGoose(0), {}, item.sid); return cv;
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
    } else {
      c.translate(20, 22); c.scale(1.7, 1.7);
      c.strokeStyle = INK; c.lineWidth = 8.5; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 0); c.stroke();
      c.strokeStyle = '#ff9b2f'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 0); c.stroke();
      item.draw(c);
    }
    c.restore();
    return cv;
  }

  function renderStore() {
    $('storeBread').textContent = '🍞 ' + money();
    const tabs = $('storeTabs');
    tabs.innerHTML = '';
    STORE_CATS.forEach((cat) => {
      const b = document.createElement('button');
      b.textContent = cat.name;
      if (cat.id === storeCat) b.classList.add('sel');
      b.addEventListener('click', () => { storeCat = cat.id; selectedItem = null; renderStore(); });
      tabs.appendChild(b);
    });
    const grid = $('storeGrid');
    grid.innerHTML = '';
    // "none" tile
    const none = document.createElement('div');
    none.className = 'item' + (!save.equip[storeCat] && !tryOn[storeCat] ? ' on' : '');
    none.innerHTML = '<div class="ic">∅</div><b>None</b><span>Go bare</span>';
    none.addEventListener('click', () => { delete tryOn[storeCat]; delete save.equip[storeCat]; persist(); selectedItem = null; renderStore(); });
    if (storeCat !== 'skin') grid.appendChild(none);
    (storeCat === 'skin' ? SKIN_ITEMS : ITEMS.filter((i) => i.cat === storeCat)).forEach((item) => {
      const owned = isOwned(item);
      const wearing = isWearing(item);
      const el = document.createElement('div');
      el.className = 'item' + (wearing ? ' on' : '') + (selectedItem === item.id ? ' sel' : '');
      const ic = document.createElement('div'); ic.className = 'ic'; ic.appendChild(iconFor(item));
      const nm = document.createElement('b'); nm.textContent = item.name;
      const st = document.createElement('span');
      st.textContent = wearing ? 'Wearing' : owned ? 'Owned' : '🍞 ' + item.price;
      el.append(ic, nm, st);
      el.addEventListener('click', () => {
        audio();
        if (owned) {
          if (item.cat === 'skin') save.skin = item.sid;
          else if (wearing) delete save.equip[item.cat]; else save.equip[item.cat] = item.id;
          delete tryOn[item.cat]; selectedItem = null; persist(); snd.tick();
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
      $('buyText').textContent = 'Try on: ' + it.name + ' · 🍞 ' + it.price;
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
    else { save.owned[it.id] = true; save.equip[it.cat] = it.id; }
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
  $('storeBack').addEventListener('click', () => { tryOn = {}; showMenu(); });


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
    Object.keys(CHEATS).filter((k) => k !== 'admin').forEach((k) => btn(g, k, () => { if (save.cheats[k]) delete save.cheats[k]; else save.cheats[k] = true; applyCodes(); }, save.cheats[k]));
    g = sec('Gravity');
    const sl = document.createElement('input'); sl.type = 'range'; sl.min = 0.1; sl.max = 2; sl.step = 0.05; sl.value = admG;
    const lb = document.createElement('label'); lb.textContent = 'x' + admG.toFixed(2); sl.addEventListener('input', () => { admG = +sl.value; lb.textContent = 'x' + admG.toFixed(2); if (world) world.gscale = admG; });
    g.append(sl, lb); btn(g, 'Reset', () => { admG = 1; if (world) world.gscale = has('moon') ? 0.4 : 1; });
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
    if (!mgUnlocked()) { toast('Finish all ' + LEVELS.length + ' levels to unlock the minigames. (Or find a secret code…)', 3.5); snd.no(); return; }
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
    drawGoose: (g, equip, skin) => drawGoose(ctx, g, equip || save.equip, skin || save.skin),
    readInput() {
      const move = (input.left || input.kLeft ? -1 : 0) + (input.right || input.kRight ? 1 : 0);
      const flap = input.flapQueue, honk = input.honkQueue;
      input.flapQueue = false; input.honkQueue = false;
      return { move, flap, honk, glide: input.flapHeld, aim: input.padAim || input.mouseAim || null };
    },
    drawSky,
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
    state = 'mg'; acc = 0; th = THEMES.meadow;
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
  };
})();
