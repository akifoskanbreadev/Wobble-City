/*
 * Boss fights. Levels 10, 20 and 33 end with a boss: touch the egg and you are whisked into an arena.
 * Beat the boss by STOMPING it from above or HONKING at it up close (it needs a few hits); only then can you
 * reach the golden egg at the far end. Touching it any other way, or getting hit by what it throws, sends you
 * back to the arena door. The arena is added to the level data at load time (decorate), so no level file changes.
 * Single player only: the multiplayer maps never contain a boss.
 */
(function (root) {
  'use strict';
  const INK = '#2b2118';
  const FLOOR = 520;

  const TYPES = {
    farmer: { name: 'Angry Farmer', hp: 3, r: 60, speed: 85, throwEvery: 3.4, proj: 'fork', intro: 'The Angry Farmer wants his egg back! Stomp him or HONK in his face.' },
    fox:    { name: 'Giant Fox', hp: 4, r: 64, speed: 120, dash: true, intro: 'A Giant Fox! Dodge his charge, then stomp or honk.' },
    dragon: { name: 'Lava Dragon', hp: 5, r: 72, speed: 75, throwEvery: 2.4, proj: 'fire', intro: 'The Lava Dragon guards the final egg! Dodge the fireballs.' },
  };
  const BOSS_LEVELS = { 9: 'farmer', 19: 'fox', 32: 'dragon' };
  const SPEED = { easy: 0.75, normal: 1, hard: 1.2, insane: 1.4, noodle: 1.4 };

  // Adds an arena far to the right of each boss level and remembers it as level.boss.
  function decorate(LEVELS) {
    for (const k of Object.keys(BOSS_LEVELS)) {
      const lv = LEVELS[+k];
      if (!lv || lv.boss) continue;
      let maxX = lv.egg ? lv.egg[0] : 0;
      for (const t of lv.terrain || []) for (const p of t.pts) maxX = Math.max(maxX, p[0]);
      for (const a of lv.solids || []) maxX = Math.max(maxX, a[0] + a[2]);
      for (const m of lv.movers || []) maxX = Math.max(maxX, m.x + m.w + (m.ax || 0));
      for (const a of lv.water || []) maxX = Math.max(maxX, a[0] + a[2]);
      const x0 = Math.ceil((maxX + 1800) / 100) * 100, x1 = x0 + 900, F = FLOOR;
      lv.terrain.push({ pts: [[x0 - 300, F], [x1 + 300, F]] });
      lv.solids.push([x0 - 80, F - 1000, 80, 1300], [x1, F - 1000, 80, 1300]);
      lv.boss = { type: BOSS_LEVELS[k], x0, x1, floor: F, entry: [x0 + 110, F - 45], egg: [x1 - 90, F - 30] };
      const T = TYPES[lv.boss.type];
      lv.hint = (lv.hint || '') + ' 👹 Boss at the end: ' + T.name + '.';
    }
  }

  function create(spec, dKey) {
    const T = TYPES[spec.type];
    const hp = Math.max(2, T.hp - (dKey === 'easy' ? 1 : 0));
    const b = { spec, T, type: spec.type, hp, max: hp, mul: SPEED[dKey] || 1, proj: [] };
    reset(b);
    return b;
  }
  function reset(b) {
    b.x = b.spec.x1 - 230; b.dir = -1; b.state = 'walk'; b.st = 0; b.inv = 0; b.atk = 2.2; b.t = 0;
    b.dead = false; b.deadT = 0; b.proj.length = 0; b.dashDir = -1; b.vx = 0;
  }
  const radius = (b) => b.T.r;
  const centre = (b) => ({ x: b.x, y: b.spec.floor - b.T.r });

  // Returns a list of events for the game: 'throw', 'dash', 'bonk', 'dead'.
  function update(b, dt, p) {
    const ev = [];
    const sp = b.spec, T = b.T, r = T.r;
    const lo = sp.x0 + r + 10, hi = sp.x1 - r - 10;
    b.t += dt;
    b.inv = Math.max(0, b.inv - dt);
    const rage = 1 + (1 - b.hp / b.max) * 0.6;
    if (b.dead) { b.deadT += dt; return ev; }
    const toward = p.x < b.x ? -1 : 1;
    if (b.state === 'hurt') {
      b.st -= dt; b.vx = 0;
      if (b.st <= 0) b.state = 'walk';
    } else if (b.state === 'walk') {
      b.dir = toward;
      b.x += b.dir * T.speed * b.mul * rage * dt;
      b.atk -= dt;
      if (b.atk <= 0) {
        if (T.dash) { b.state = 'telegraph'; b.st = 0.9 / Math.min(1.4, b.mul); b.dashDir = toward; b.dir = toward; ev.push('dash'); }
        else {
          const hx = b.x + b.dir * 50, hy = sp.floor - r * 1.6;
          if (T.proj === 'fork') b.proj.push({ k: 'fork', x: hx, y: hy, vx: Math.max(-430, Math.min(430, (p.x - hx) / 1.05)), vy: -470, r: 16, a: 0 });
          else b.proj.push({ k: 'fire', x: b.x + b.dir * 60, y: sp.floor - r * 1.2, vx: b.dir * 300 * b.mul, vy: 0, r: 20, a: 0 });
          ev.push('throw');
          b.atk = (T.throwEvery / (b.mul * rage));
        }
      }
    } else if (b.state === 'telegraph') {
      b.st -= dt;
      if (b.st <= 0) { b.state = 'dash'; b.vx = b.dashDir * 560 * b.mul; }
    } else if (b.state === 'dash') {
      b.x += b.vx * dt;
      if (b.x <= lo || b.x >= hi) { b.x = Math.max(lo, Math.min(hi, b.x)); b.state = 'dazed'; b.st = 1.5; b.vx = 0; ev.push('bonk'); }
    } else if (b.state === 'dazed') {
      b.st -= dt;
      if (b.st <= 0) { b.state = 'walk'; b.atk = 2.2 / rage; }
    }
    b.x = Math.max(lo, Math.min(hi, b.x));
    for (let i = b.proj.length - 1; i >= 0; i--) {
      const q = b.proj[i];
      q.a += dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.k === 'fork') q.vy += 900 * dt;
      if (q.y > sp.floor || q.x < sp.x0 || q.x > sp.x1 || q.a > 4) b.proj.splice(i, 1);
    }
    return ev;
  }

  // Is the boss dangerous to touch right now? (Not while it is hurt or dying.)
  const harmful = (b) => !b.dead && b.state !== 'hurt';
  // Hit it (a stomp or a honk). Returns 'dead', 'hit' or false (it was invulnerable).
  function hit(b) {
    if (b.dead || b.inv > 0) return false;
    b.hp -= 1; b.inv = 1.8; b.state = 'hurt'; b.st = 1.3; b.proj.length = 0;
    if (b.hp <= 0) { b.dead = true; b.deadT = 0; return 'dead'; }
    return 'hit';
  }
  // A honk from head `h` facing `f` hits if the boss is close, in front, and roughly at head height.
  function honkHits(b, h, f) {
    if (b.dead) return false;
    const c = centre(b);
    return Math.abs(h.x - c.x) < b.T.r + 260 && (c.x - h.x) * f > -30 && Math.abs(h.y - c.y) < b.T.r + 140;
  }
  function touches(b, parts) {
    const c = centre(b), R = b.T.r * 0.85;
    for (const q of parts) if (Math.hypot(q.x - c.x, q.y - c.y) < R + q.r * 0.8) return true;
    return false;
  }
  function projHits(b, parts) {
    for (const q of b.proj) for (const o of parts) if (Math.hypot(o.x - q.x, o.y - q.y) < q.r + o.r * 0.8) return true;
    return false;
  }
  // honking scares projectiles away
  function honkClear(b, h) { b.proj = b.proj.filter((q) => Math.hypot(q.x - h.x, q.y - h.y) > 260); }

  // ------------------------------------------------------------------ drawing (feet at y=0, facing +x)
  function fill(c, col) { c.fillStyle = col; }
  function eyeAngry(c, x, y, s) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 8 * s, 0, 7); c.fill(); c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(x + 2 * s, y + 1, 3.6 * s, 0, 7); c.fill(); c.lineWidth = 4; c.beginPath(); c.moveTo(x - 11 * s, y - 12 * s); c.lineTo(x + 9 * s, y - 4 * s); c.stroke(); }
  function dizzy(c, t, y) { c.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; c.beginPath(); c.arc(Math.cos(a) * 34, y + Math.sin(a) * 9, 6, 0, 7); c.fill(); } }

  function drawFarmer(c, b, t) {
    const walk = b.state === 'walk' ? Math.sin(t * 8) * 6 : 0, hurt = b.state === 'hurt';
    fill(c, '#5b3d26'); c.beginPath(); c.ellipse(-16 + walk, -6, 18, 8, 0, 0, 7); c.ellipse(16 - walk, -6, 18, 8, 0, 0, 7); c.fill(); c.stroke();
    fill(c, '#2f5fb8'); c.beginPath(); c.rect(-26, -54, 20, 50); c.rect(6, -54, 20, 50); c.fill(); c.stroke();
    fill(c, '#d83a2e'); c.beginPath(); c.ellipse(0, -84, 40, 38, 0, 0, 7); c.fill(); c.stroke();
    fill(c, '#2f5fb8'); c.beginPath(); c.rect(-28, -74, 56, 30); c.fill(); c.stroke(); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(-14, -78, 4, 0, 7); c.arc(14, -78, 4, 0, 7); c.fill();
    fill(c, '#f0b890'); c.beginPath(); c.arc(0, -126, 26, 0, 7); c.fill(); c.stroke();
    fill(c, '#d9d0c0'); c.beginPath(); c.ellipse(10, -112, 24, 14, 0, 0, 7); c.fill(); c.stroke();       // big beard
    fill(c, '#f2d16b'); c.beginPath(); c.ellipse(0, -146, 44, 9, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(0, -154, 24, 16, 0, Math.PI, 0); c.fill(); c.stroke();   // straw hat
    eyeAngry(c, 10, -128, 0.9);
    c.save(); c.translate(34, -70); c.rotate(hurt ? 0.3 : -0.5 + Math.sin(t * 6) * 0.05);                      // pitchfork
    c.strokeStyle = '#7a5230'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 50); c.lineTo(0, -80); c.stroke();
    c.strokeStyle = '#aaa'; c.lineWidth = 4; c.beginPath(); c.moveTo(-14, -70); c.lineTo(-14, -100); c.moveTo(0, -80); c.lineTo(0, -108); c.moveTo(14, -70); c.lineTo(14, -100); c.moveTo(-14, -78); c.lineTo(14, -78); c.stroke();
    c.restore();
    if (hurt) dizzy(c, t, -170);
  }
  function drawFox(c, b, t) {
    const tele = b.state === 'telegraph', dash = b.state === 'dash', dazed = b.state === 'dazed' || b.state === 'hurt';
    const sh = tele ? Math.sin(t * 60) * 3 : 0, low = tele ? 14 : 0;
    c.translate(sh, low);
    c.strokeStyle = INK;
    fill(c, '#e0661f'); c.beginPath(); c.moveTo(-60, -60); c.quadraticCurveTo(-120, -90 - Math.sin(t * 4) * 12, -130, -30); c.quadraticCurveTo(-100, -40, -60, -40); c.closePath(); c.fill(); c.stroke();   // tail
    fill(c, '#fff'); c.beginPath(); c.moveTo(-112, -60); c.quadraticCurveTo(-132, -50, -130, -30); c.quadraticCurveTo(-118, -36, -108, -44); c.closePath(); c.fill(); c.stroke();
    const run = dash ? Math.sin(t * 24) * 14 : (b.state === 'walk' ? Math.sin(t * 9) * 8 : 0);
    fill(c, '#7a3510'); for (const lx of [-40, -14, 22, 46]) { c.beginPath(); c.rect(lx + (lx % 2 ? run : -run) - 7, -40, 14, 40); c.fill(); c.stroke(); }
    fill(c, '#e0661f'); c.beginPath(); c.ellipse(0, -62, 74, 40, 0, 0, 7); c.fill(); c.stroke();
    fill(c, '#fff3e0'); c.beginPath(); c.ellipse(10, -44, 48, 18, 0, 0, 7); c.fill();
    const hy = dazed ? -50 : -86;
    fill(c, '#e0661f'); c.beginPath(); c.ellipse(64, hy, 40, 32, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(88, hy - 10); c.lineTo(132, hy + 6); c.lineTo(90, hy + 22); c.closePath(); c.fill(); c.stroke();
    fill(c, INK); c.beginPath(); c.arc(130, hy + 6, 6, 0, 7); c.fill();
    fill(c, '#e0661f'); for (const ex of [40, 62]) { c.beginPath(); c.moveTo(ex - 12, hy - 22); c.lineTo(ex + 4, hy - 60 + (dazed ? 14 : 0)); c.lineTo(ex + 16, hy - 20); c.closePath(); c.fill(); c.stroke(); }
    if (!dazed) { fill(c, '#fff'); c.beginPath(); c.moveTo(96, hy + 14); c.lineTo(102, hy + 26); c.lineTo(108, hy + 15); c.moveTo(110, hy + 15); c.lineTo(116, hy + 26); c.lineTo(122, hy + 12); c.fill(); }
    eyeAngry(c, 70, hy - 8, 0.8);
    if (tele) { c.fillStyle = '#ff2a2a'; c.font = '900 40px system-ui'; c.textAlign = 'center'; c.fillText('!', 70, hy - 70); }
    if (dazed) dizzy(c, t, hy - 52);
    c.translate(-sh, -low);
  }
  function drawDragon(c, b, t) {
    const hurt = b.state === 'hurt', f = Math.sin(t * 7);
    fill(c, '#2f8f3c'); c.beginPath(); c.moveTo(-70, -50); c.quadraticCurveTo(-140, -50 + f * 10, -150, -100); c.quadraticCurveTo(-110, -70, -60, -30); c.closePath(); c.fill(); c.stroke();
    fill(c, '#1f6a2d'); c.beginPath(); c.moveTo(-30, -100); c.lineTo(-70, -170 + f * 8); c.lineTo(-90, -130); c.lineTo(-110, -150 + f * 8); c.lineTo(-100, -90); c.closePath(); c.fill(); c.stroke();    // wing
    fill(c, '#2f8f3c'); for (const lx of [-30, 24]) { c.beginPath(); c.rect(lx - 14, -44, 28, 44); c.fill(); c.stroke(); c.beginPath(); c.ellipse(lx + 8, -4, 20, 8, 0, 0, 7); c.fill(); c.stroke(); }
    fill(c, '#3aa84a'); c.beginPath(); c.ellipse(0, -84, 64, 52, 0, 0, 7); c.fill(); c.stroke();
    fill(c, '#ffe08a'); c.beginPath(); c.ellipse(14, -74, 36, 38, 0, 0, 7); c.fill();
    fill(c, '#d83a2e'); for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-40 + i * 16, -128 + (i % 2) * 4); c.lineTo(-32 + i * 16, -148); c.lineTo(-24 + i * 16, -128); c.closePath(); c.fill(); c.stroke(); }
    fill(c, '#3aa84a'); c.beginPath(); c.ellipse(60, -130, 38, 30, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(96, -122, 26, 18, 0, 0, 7); c.fill(); c.stroke();
    fill(c, '#fff'); for (const hx of [-8, 14]) { c.beginPath(); c.moveTo(60 + hx, -156); c.lineTo(66 + hx, -186); c.lineTo(76 + hx, -154); c.closePath(); c.fill(); c.stroke(); }
    eyeAngry(c, 62, -136, 0.9);
    if (!hurt && b.atk < 0.6) { const g = c.createRadialGradient(116, -122, 2, 116, -122, 40); g.addColorStop(0, 'rgba(255,200,60,.95)'); g.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = g; c.beginPath(); c.arc(116, -122, 40, 0, 7); c.fill(); }
    if (hurt) dizzy(c, t, -196);
  }
  function drawProj(c, q, t) {
    c.save(); c.translate(q.x, q.y); c.strokeStyle = INK; c.lineWidth = 2.5;
    if (q.k === 'fork') { c.rotate(Math.atan2(q.vy, q.vx)); c.strokeStyle = '#7a5230'; c.lineWidth = 5; c.beginPath(); c.moveTo(-24, 0); c.lineTo(14, 0); c.stroke(); c.strokeStyle = '#bbb'; c.lineWidth = 3; c.beginPath(); c.moveTo(10, -8); c.lineTo(28, -8); c.moveTo(10, 0); c.lineTo(30, 0); c.moveTo(10, 8); c.lineTo(28, 8); c.moveTo(10, -8); c.lineTo(10, 8); c.stroke(); }
    else { const g = c.createRadialGradient(0, 0, 2, 0, 0, 26); g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#ff9a2e'); g.addColorStop(1, 'rgba(230,50,20,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 26 + Math.sin(t * 20) * 3, 0, 7); c.fill(); }
    c.restore();
  }

  function draw(c, b, t) {
    const sp = b.spec;
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 3; c.strokeStyle = INK;
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(b.x, sp.floor + 2, b.T.r * 1.1, 8, 0, 0, 7); c.fill();
    for (const q of b.proj) drawProj(c, q, t);
    if (!b.dead || b.deadT < 1.4) {
      c.save(); c.translate(b.x, sp.floor);
      if (b.dead) { c.globalAlpha = Math.max(0, 1 - b.deadT / 1.4); c.rotate(b.dir * b.deadT * 0.8); }
      else if (b.inv > 0 && Math.floor(b.inv * 12) % 2) c.globalAlpha = 0.45;
      c.scale(b.dir, 1);
      (b.type === 'farmer' ? drawFarmer : b.type === 'fox' ? drawFox : drawDragon)(c, b, t);
      c.restore();
      if (!b.dead) {   // name and hearts
        c.font = '800 16px system-ui, sans-serif'; c.textAlign = 'center'; c.fillStyle = INK; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4;
        const label = b.T.name + '  ' + '❤'.repeat(b.hp) + '🖤'.repeat(b.max - b.hp), ty = sp.floor - b.T.r * 2 - 70;
        c.strokeText(label, b.x, ty); c.fillText(label, b.x, ty);
      }
    }
    c.restore();
  }

  // the cage drawn over a locked egg
  function drawCage(c, x, y, t) {
    c.save(); c.translate(x, y); c.strokeStyle = '#555'; c.lineWidth = 4;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 10, -30); c.lineTo(i * 10, 28); c.stroke(); }
    c.beginPath(); c.ellipse(0, -30, 24, 8, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(0, 28, 24, 8, 0, 0, 7); c.stroke();
    c.restore();
  }
  // a little skull-flag over the door egg so players know a boss is waiting
  function drawDoorSign(c, x, y, t) {
    c.save(); c.translate(x, y - 64 + Math.sin(t * 3) * 3); c.font = '900 26px system-ui'; c.textAlign = 'center'; c.fillText('👹', 0, 0); c.restore();
  }

  const api = { TYPES, BOSS_LEVELS, decorate, create, reset, update, hit, harmful, honkHits, honkClear, touches, projHits, centre, radius, draw, drawCage, drawDoorSign };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Boss = api;
})(typeof window !== 'undefined' ? window : globalThis);
