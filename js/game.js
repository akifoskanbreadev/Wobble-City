/* Wobble City: rendering, input, game flow. Physics is in physics.js, levels in levels.js. */
(function () {
  'use strict';

  const STEP = 1 / 60;
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const INK = '#1f2a36';
  const LEVELS = window.Levels;
  const { World, Goose, NECK_SEGS } = window.Physics;

  // ---------------------------------------------------------------- viewport
  let W = 0, H = 0, DPR = 1, S = 1, VW = 0, VH = 0;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    S = Math.max(0.5, Math.min(W / 760, H / 440));
    VW = W / S; VH = H / S;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------------------------------------------------------------- storage (best effort)
  let unlocked = 1;
  try { unlocked = Math.max(1, Math.min(LEVELS.length, parseInt(localStorage.getItem('wobble.unlocked') || '1', 10) || 1)); } catch (e) {}
  function saveUnlocked() { try { localStorage.setItem('wobble.unlocked', String(unlocked)); } catch (e) {} }

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
  const honkSound = () => { tone('sawtooth', 400 + Math.random() * 50, 280, 0.32, 0.16); tone('square', 200, 145, 0.32, 0.07); };
  const flapSound = () => tone('triangle', 190, 90, 0.12, 0.07);
  const breadSound = () => tone('sine', 740, 1180, 0.14, 0.12);
  const eggSound = () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.14, i * 0.11));
  const splashSound = () => tone('sine', 300, 70, 0.3, 0.12);

  // ---------------------------------------------------------------- state
  const input = { left: false, right: false, kLeft: false, kRight: false, flapHeld: false, flapQueue: false, honkQueue: false, padAim: null, mouseAim: null };
  let wobble = 1, slow = false;
  let state = 'title';           // title | play | done
  let levelIdx = 0, level = null, world = null, goose = null;
  let checkpoint = null, bread = [], breadGot = 0, deaths = 0;
  let camX = 0, camY = 0, clock = 0, toastT = 0, honkText = 0, splashes = [];

  function toast(msg, secs) {
    const el = $('toast');
    el.textContent = msg; el.classList.add('show'); toastT = secs || 3;
  }

  function loadLevel(i) {
    levelIdx = i; level = LEVELS[i];
    world = new World();
    world.solids = level.solids.map((s) => ({ x: s[0], y: s[1], w: s[2], h: s[3] }));
    world.waters = (level.water || []).map((s) => ({ x: s[0], y: s[1], w: s[2], h: s[3] }));
    goose = new Goose(world, level.spawn[0], level.spawn[1], { wobble });
    checkpoint = { x: level.spawn[0], y: level.spawn[1] };
    bread = level.bread.map((b) => ({ x: b[0], y: b[1], got: false }));
    breadGot = 0; deaths = 0; splashes = [];
    const c = goose.center();
    camX = c.x - VW * 0.4; camY = c.y - VH * 0.58;
    $('levelName').textContent = (i + 1) + '/' + LEVELS.length + '  ' + level.name;
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

  // ---------------------------------------------------------------- simulation tick
  function tick() {
    const move = (input.left || input.kLeft ? -1 : 0) + (input.right || input.kRight ? 1 : 0);
    const aim = input.padAim || input.mouseAim || null;
    const flap = input.flapQueue;
    input.flapQueue = false;
    if (flap && goose.stamina >= 1 && goose.flapCd <= 0) flapSound();
    if (input.honkQueue) { input.honkQueue = false; goose.honk(); honkSound(); honkText = 0.7; }
    const wasWet = goose.swimming;
    goose.update(STEP, { move, flap, glide: input.flapHeld, aim });
    world.step(STEP);
    if (goose.swimming && !wasWet) { splashSound(); const c = goose.center(); splashes.push({ x: c.x, y: c.y, t: 0 }); }

    const c = goose.center(), h = goose.head;
    if (goose.grounded) for (const cp of level.checkpoints || []) if (c.x > cp[0] && cp[0] > checkpoint.x) { checkpoint = { x: cp[0], y: cp[1] }; toast('Checkpoint!', 1.2); }

    if (c.y > level.deathY) { splashSound(); deaths++; respawn(); toast('Whoops. Back to the last checkpoint.', 2); }

    for (const b of bread) {
      if (b.got) continue;
      if (Math.hypot(h.x - b.x, h.y - b.y) < 26 || Math.hypot(c.x - b.x, c.y - b.y) < 40) { b.got = true; breadGot++; breadSound(); updateHud(); }
    }

    if (state === 'play' && Math.hypot(h.x - level.egg[0], h.y - level.egg[1]) < 34) {
      state = 'done'; eggSound();
      const last = levelIdx === LEVELS.length - 1;
      if (!last && unlocked < levelIdx + 2) { unlocked = levelIdx + 2; saveUnlocked(); buildLevelPicker(); }
      $('doneTitle').textContent = last ? 'You are the Wobble Champion!' : 'Egg acquired!';
      $('doneText').textContent = 'Bread ' + breadGot + '/' + bread.length + (deaths ? '  ·  Falls ' + deaths : '  ·  No falls!');
      $('nextBtn').textContent = last ? 'Play again' : 'Next level';
      $('done').classList.remove('hidden');
    }
  }

  // ---------------------------------------------------------------- drawing
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#8fd0ff'); g.addColorStop(1, '#eaf8ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 7; i++) {
      const span = VW + 600;
      let wx = ((i * 520 + 100) - camX * 0.12) % span; if (wx < -300) wx += span;
      const x = wx * S, y = (60 + ((i * 73) % 150) - camY * 0.05) * S;
      ctx.beginPath();
      ctx.ellipse(x, y, 60 * S, 20 * S, 0, 0, 7);
      ctx.ellipse(x + 40 * S, y - 12 * S, 40 * S, 22 * S, 0, 0, 7);
      ctx.ellipse(x - 38 * S, y - 6 * S, 34 * S, 17 * S, 0, 0, 7);
      ctx.fill();
    }
    const base = (540 - camY) * S;
    hills(0.2, '#b8e4a8', 70, 0.004, base - 40 * S);
    hills(0.45, '#90d380', 50, 0.007, base + 10 * S);
  }

  function drawWorld() {
    ctx.save();
    ctx.scale(S * DPR, S * DPR);
    ctx.translate(-camX, -camY);

    for (const s of world.solids) {
      if (s.x > camX + VW + 40 || s.x + s.w < camX - 40 || s.y > camY + VH + 40 || s.y + s.h < camY - 40) continue;
      const dg = ctx.createLinearGradient(0, s.y, 0, s.y + Math.min(s.h, 300));
      dg.addColorStop(0, '#a4723f'); dg.addColorStop(1, '#6b4426');
      ctx.fillStyle = dg; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#5fc24c'; ctx.fillRect(s.x, s.y, s.w, 12);
      ctx.fillStyle = '#7ad862'; ctx.fillRect(s.x, s.y, s.w, 5);
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      for (let x = s.x + 14; x < s.x + s.w - 6; x += 38) ctx.fillRect(x, s.y + 12, 6, 4);
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.strokeRect(s.x, s.y, s.w, Math.min(s.h, 700));
    }

    // checkpoints
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
      roundRect(-11, -10, 22, 20, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f7d79a'; roundRect(-7, -6, 14, 12, 4); ctx.fill();
      ctx.restore();
    }

    // egg
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

    drawGoose();

    // water in front of the goose, so legs and body look submerged
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

  function drawGoose() {
    const g = goose, c = g.center(), A = g.axes();
    const ang = Math.atan2(A.uy, A.ux), f = g.facing, n = g.neck;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // feet
    for (let i = 0; i < 2; i++) {
      const hip = g.hips[i], ft = g.feet[i];
      ctx.strokeStyle = INK; ctx.lineWidth = 8.5;
      ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(ft.x, ft.y); ctx.stroke();
      ctx.strokeStyle = '#ff9b2f'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(ft.x, ft.y); ctx.stroke();
      ctx.fillStyle = '#ff9b2f'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(ft.x + f * 4, ft.y + 2, 11, 4.5, 0, 0, 7); ctx.fill(); ctx.stroke();
    }

    // neck, tapering from base to head
    const path = () => {
      ctx.beginPath(); ctx.moveTo(n[0].x, n[0].y);
      for (let i = 1; i < n.length - 1; i++) ctx.quadraticCurveTo(n[i].x, n[i].y, (n[i].x + n[i + 1].x) / 2, (n[i].y + n[i + 1].y) / 2);
      ctx.lineTo(n[n.length - 1].x, n[n.length - 1].y);
    };
    ctx.strokeStyle = INK; ctx.lineWidth = 15; path(); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10.5; path(); ctx.stroke();

    // body
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(ang);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-30 * f, -8); ctx.lineTo(-52 * f, -20); ctx.lineTo(-36 * f, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 24, 0, 0, 7); ctx.fill(); ctx.stroke();
    const fp = g.flapT > 0 ? Math.sin((0.35 - g.flapT) * 36) : 0;
    ctx.save();
    ctx.translate(-4 * f, -2); ctx.rotate((-0.15 - fp * 0.9) * f);
    ctx.fillStyle = '#e4edf5';
    ctx.beginPath(); ctx.ellipse(-8 * f, 0, 20 + Math.abs(fp) * 6, 10, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.restore();

    // head + beak
    const h = g.head, p = n[n.length - 3];
    let dx = h.x - p.x, dy = h.y - p.y;
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    let bx = dx * 0.35 + f * 0.65, by = dy * 0.35;
    const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    const open = g.honkT > 0 ? 6 + Math.sin(g.honkT * 40) * 2 : 0;
    const px = -by * f, py = bx * f;
    ctx.fillStyle = '#ff9b2f'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(h.x + bx * 4 + px * 4, h.y + by * 4 + py * 4);
    ctx.lineTo(h.x + bx * 24 + px * (2 + open * 0.3), h.y + by * 24 + py * (2 + open * 0.3));
    ctx.lineTo(h.x + bx * 4 - px * (4 + open), h.y + by * 4 - py * (4 + open));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(h.x, h.y, 10, 0, 7); ctx.fill(); ctx.stroke();
    const ex = h.x + bx * 2 + px * 5, ey = h.y + by * 2 + py * 5;
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ex, ey, 2.8, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 0.9, ey - 0.9, 0.9, 0, 7); ctx.fill();

    if (honkText > 0) {
      const t = 1 - honkText / 0.7;
      ctx.save();
      ctx.globalAlpha = Math.min(1, honkText * 3);
      ctx.fillStyle = INK; ctx.font = '800 ' + (22 + t * 10) + 'px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('HONK!', h.x + f * 20, h.y - 22 - t * 26);
      ctx.restore();
    }
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

  // ---------------------------------------------------------------- main loop
  let last = performance.now(), acc = 0, hudT = 0;
  function frame(now) {
    const real = Math.min(0.05, (now - last) / 1000);
    last = now;
    const dt = slow ? real * 0.25 : real;
    clock += real;
    if (toastT > 0) { toastT -= real; if (toastT <= 0) $('toast').classList.remove('show'); }
    honkText = Math.max(0, honkText - real);
    for (const sp of splashes) sp.t += real * 1.4;
    splashes = splashes.filter((sp) => sp.t < 1);

    if (goose) {
      acc += dt;
      while (acc >= STEP) {
        if (state === 'play') tick(); else { goose.update(STEP, { move: 0 }); world.step(STEP); }
        acc -= STEP;
      }
      const c = goose.center();
      const tx = c.x - VW * 0.5 + goose.facing * VW * 0.1, ty = c.y - VH * 0.58;
      const k = 1 - Math.pow(0.002, real);
      camX += (tx - camX) * k; camY += (ty - camY) * k;
      hudT += real;
      if (state === 'play' && hudT > 0.08) { hudT = 0; updateHud(); }
    }

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawSky();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (goose) { drawWorld(); ctx.setTransform(1, 0, 0, 1, 0, 0); drawAimHint(); }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- input
  function hold(el, down, up) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('down'); audio(); down(); });
    const rel = () => { el.classList.remove('down'); up(); };
    el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel); el.addEventListener('lostpointercapture', rel);
  }
  hold($('btnL'), () => { input.left = true; }, () => { input.left = false; });
  hold($('btnR'), () => { input.right = true; }, () => { input.right = false; });
  hold($('btnFlap'), () => { input.flapHeld = true; input.flapQueue = true; }, () => { input.flapHeld = false; });
  hold($('btnHonk'), () => { input.honkQueue = true; }, () => {});
  $('btnReset').addEventListener('click', () => { if (state === 'play') respawn(); });
  $('btnSlow').addEventListener('click', () => { slow = !slow; $('btnSlow').classList.toggle('on', slow); toast(slow ? 'Slow motion: watch the neck' : 'Normal speed', 1.2); });

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
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); audio(); active = e.pointerId; pad.setPointerCapture(e.pointerId); set(e); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === active) set(e); });
    const end = (e) => { if (e.pointerId !== active) return; active = null; input.padAim = null; knob.style.transform = ''; };
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  })();

  let mouseDown = false;
  function mouseAimFrom(e) {
    if (!goose) return;
    const b = goose.neck[0];
    input.mouseAim = { x: e.clientX / S + camX - b.x, y: e.clientY / S + camY - b.y };
  }
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || state !== 'play') return; mouseDown = true; audio(); mouseAimFrom(e); });
  window.addEventListener('pointermove', (e) => { if (mouseDown && e.pointerType === 'mouse') mouseAimFrom(e); });
  window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') { mouseDown = false; input.mouseAim = null; } });

  const keymap = { ArrowLeft: 'kLeft', KeyA: 'kLeft', ArrowRight: 'kRight', KeyD: 'kRight' };
  window.addEventListener('keydown', (e) => {
    if (keymap[e.code]) { input[keymap[e.code]] = true; e.preventDefault(); return; }
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (!e.repeat) { input.flapQueue = true; audio(); }
      input.flapHeld = true;
    } else if (e.code === 'KeyH' || e.code === 'KeyE') { if (!e.repeat) input.honkQueue = true; }
    else if (e.code === 'KeyR') { if (state === 'play') respawn(); }
    else if (e.code === 'KeyT') { $('btnSlow').click(); }
  });
  window.addEventListener('keyup', (e) => {
    if (keymap[e.code]) input[keymap[e.code]] = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') input.flapHeld = false;
  });
  const releaseAll = () => { input.left = input.right = input.kLeft = input.kRight = input.flapHeld = false; };
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); last = performance.now(); });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------------------------------------------------------------- menus
  let pick = 0;
  function buildLevelPicker() {
    const box = $('levels');
    box.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const b = document.createElement('button');
      b.textContent = i + 1;
      b.title = lv.name;
      if (i >= unlocked) b.classList.add('locked');
      if (i === pick) b.style.background = '#1f2a36', b.style.color = '#fff';
      b.addEventListener('click', () => { if (i < unlocked) { pick = i; buildLevelPicker(); loadLevel(i); toast(level.hint, 4); } });
      box.appendChild(b);
    });
  }
  $('wobbleSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    wobble = parseFloat(b.dataset.v);
    for (const x of $('wobbleSeg').children) x.classList.toggle('sel', x === b);
    loadLevel(pick);
  });
  $('startBtn').addEventListener('click', () => {
    audio(); $('title').classList.add('hidden');
    loadLevel(pick); state = 'play'; toast(level.hint, 5);
  });
  $('nextBtn').addEventListener('click', () => {
    audio(); $('done').classList.add('hidden');
    pick = levelIdx + 1 >= LEVELS.length ? 0 : levelIdx + 1;
    buildLevelPicker(); loadLevel(pick); state = 'play'; toast(level.hint, 5);
  });

  buildLevelPicker();
  loadLevel(0);
  requestAnimationFrame(frame);

  // test hook for automated checks
  window.__wobble = { get goose() { return goose; }, get state() { return state; }, input, loadLevel, start: () => $('startBtn').click() };
})();
