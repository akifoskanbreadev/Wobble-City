/*
 * Wobble City minigames, part 3: six more quick party games.
 *   🫧 Bubble Pop · 🃏 Memory Match · 🎨 Colour Clash · 🏁 Goose Race · 🍞 Perfect Toast · 🎈 Balloon Pump
 * Same contract as minigames2.js: { id, name, icon, desc, fmt, reward, create(host) } with instances { update(dt), draw(), key?, destroy? }.
 */
(function (root) {
  'use strict';
  const MG = root.Minigames; if (!MG) return;
  const INK = '#1f2a36', R = () => Math.random(), clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const frame = (host, lw, lh) => { const s = Math.min(host.W / lw, host.H / lh); return { s, ox: (host.W - lw * s) / 2, oy: (host.H - lh * s) / 2 }; };
  const toL = (host, f, e) => { const r = host.ctx.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - f.ox) / f.s, y: (e.clientY - r.top - f.oy) / f.s }; };
  const onTap = (host, fn) => { const cv = host.ctx.canvas, h = (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; fn(e); }; cv.addEventListener('pointerdown', h); return () => cv.removeEventListener('pointerdown', h); };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const say = (c, text, x, y, size, col) => { c.save(); c.font = '800 ' + size + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(text, x, y); c.fillStyle = col || INK; c.fillText(text, x, y); c.restore(); };
  const emo = (c, e, x, y, size) => { c.font = size + 'px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, x, y); c.textBaseline = 'alphabetic'; };
  const goose = (c, x, y, s, f, t) => {
    c.save(); c.translate(x, y); c.scale(s * f, s); c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = INK; c.lineWidth = 9; c.beginPath(); c.moveTo(10, -8); c.quadraticCurveTo(24, -22, 18, -38); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.moveTo(10, -8); c.quadraticCurveTo(24, -22, 18, -38); c.stroke();
    c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 22, 14, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.arc(18, -40, 8, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#ff9b2f'; c.beginPath(); c.moveTo(24, -42); c.lineTo(36, -39); c.lineTo(24, -36); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(20, -42, 1.8, 0, 7); c.fill();
    c.strokeStyle = '#ff9b2f'; c.lineWidth = 3; const w = Math.sin((t || 0) * 14) * 4; c.beginPath(); c.moveTo(-5, 12); c.lineTo(-5 + w, 22); c.moveTo(7, 12); c.lineTo(7 - w, 22); c.stroke();
    c.restore();
  };
  const parts = [];
  const burst = (list, x, y, col, n) => { for (let i = 0; i < n; i++) { const a = R() * 6.28, v = 60 + R() * 200; list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + R() * 0.4, t: 0, col }); } };
  const stepP = (list, dt) => { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.t += dt; p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > p.life) list.splice(i, 1); } };
  const drawP = (c, list) => { for (const p of list) { c.globalAlpha = clamp(1 - p.t / p.life, 0, 1); c.fillStyle = p.col; c.fillRect(p.x - 3, p.y - 3, 6, 6); } c.globalAlpha = 1; };
  void parts;

  // ======================================================================= BUBBLE POP
  function createBubbles(host) {
    const c = host.ctx; let t = 0, time = 40, score = 0, over = false, spawn = 0, msgT = 0, msg = ''; const bs = [], P = [];
    const off = onTap(host, (e) => {
      if (over) return; const f = frame(host, 800, 480), p = toL(host, f, e);
      for (let i = bs.length - 1; i >= 0; i--) { const b = bs[i]; if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 8) {
        bs.splice(i, 1); burst(P, b.x, b.y, b.k === 'bomb' ? '#444' : b.k === 'gold' ? '#ffd23f' : '#9fe0ff', 14);
        if (b.k === 'bomb') { score = Math.max(0, score - 4); time -= 3; msg = '💥 −4 and −3s'; msgT = 0.9; host.snd.ouch(); } else { const v = b.k === 'gold' ? 5 : 1; score += v; host.tone('sine', 500 + R() * 400, 900, 0.08, 0.15); if (b.k === 'gold') { msg = '⭐ +5'; msgT = 0.6; } }
        return; } }
    });
    host.controls([]);
    return {
      destroy() { off(); },
      update(dt) {
        if (over) return; t += dt; time -= dt; msgT -= dt; stepP(P, dt); spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.16, 0.55 - t * 0.008); const k = R() < 0.1 ? 'gold' : R() < 0.13 + t * 0.002 ? 'bomb' : 'blue'; bs.push({ x: 60 + R() * 680, y: 520, r: 24 + R() * 22, v: 70 + R() * 70 + t * 2.5, k, p: R() * 6 }); }
        for (let i = bs.length - 1; i >= 0; i--) { const b = bs[i]; b.y -= b.v * dt; b.x += Math.sin(t * 2 + b.p) * 18 * dt; if (b.y < -60) bs.splice(i, 1); }
        host.hud({ title: 'Bubble Pop', text: 'Score ' + score + ' · ' + Math.max(0, Math.ceil(time)) + 's' });
        if (time <= 0) { over = true; host.end(score, 'You popped ' + score + ' points of bubbles'); }
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        for (const b of bs) {
          const g = c.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r); const cols = b.k === 'gold' ? ['rgba(255,245,170,.95)', 'rgba(255,190,40,.8)'] : b.k === 'bomb' ? ['rgba(120,120,120,.9)', 'rgba(30,30,30,.9)'] : ['rgba(255,255,255,.8)', 'rgba(110,190,255,.45)'];
          g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); c.fillStyle = g; c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); c.stroke();
          if (b.k === 'bomb') emo(c, '💣', b.x, b.y, b.r); else if (b.k === 'gold') emo(c, '⭐', b.x, b.y, b.r);
        }
        drawP(c, P); if (msgT > 0) say(c, msg, 400, 70, 34, '#e63946'); c.fillStyle = INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('Tap the bubbles. ⭐ = 5 points. Avoid 💣.', 400, 462); c.restore();
      },
    };
  }

  // ======================================================================= MEMORY MATCH
  function createMemory(host) {
    const c = host.ctx, E = ['🍞', '🪿', '🥚', '🐟', '🌽', '🍉', '🦊', '🍄'], deck = []; E.concat(E).forEach((e) => deck.push({ e, up: false, done: false, f: 0 }));
    for (let i = deck.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
    let t = 0, first = -1, second = -1, wait = 0, pairs = 0, tries = 0, over = false;
    const pos = (i) => ({ x: 190 + (i % 4) * 118, y: 70 + Math.floor(i / 4) * 94 });
    const off = onTap(host, (e) => {
      if (over || wait > 0) return; const f = frame(host, 800, 480), p = toL(host, f, e);
      for (let i = 0; i < 16; i++) { const q = pos(i); if (!deck[i].done && !deck[i].up && p.x > q.x && p.x < q.x + 104 && p.y > q.y && p.y < q.y + 82) {
        deck[i].up = true; host.tone('triangle', 400, 500, 0.08, 0.15);
        if (first < 0) first = i; else { second = i; tries++; if (deck[first].e === deck[second].e) { deck[first].done = deck[second].done = true; pairs++; host.tone('sine', 700, 1000, 0.2, 0.2); first = second = -1; if (pairs === 8) { over = true; const sc = Math.max(10, 200 - tries * 8 - Math.floor(t * 1.5)); host.end(sc, 'All pairs in ' + tries + ' tries and ' + Math.floor(t) + ' s'); } } else wait = 0.8; }
        return; } }
    });
    host.controls([]);
    return {
      destroy() { off(); },
      update(dt) {
        if (over) return; t += dt; if (wait > 0) { wait -= dt; if (wait <= 0) { deck[first].up = deck[second].up = false; first = second = -1; } }
        for (const d of deck) d.f += ((d.up || d.done ? 1 : 0) - d.f) * Math.min(1, dt * 14);
        host.hud({ title: 'Memory Match', text: pairs + '/8 pairs · ' + tries + ' tries · ' + Math.floor(t) + 's' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        for (let i = 0; i < 16; i++) {
          const d = deck[i], q = pos(i), sx = Math.abs(Math.cos(d.f * Math.PI)); c.save(); c.translate(q.x + 52, q.y + 41); c.scale(Math.max(0.06, sx), 1);
          c.fillStyle = d.f > 0.5 ? (d.done ? '#d9f7c8' : '#fff') : '#3a86ff'; c.strokeStyle = INK; c.lineWidth = 4; rr(c, -52, -41, 104, 82, 14); c.fill(); c.stroke();
          if (d.f > 0.5) emo(c, d.e, 0, 2, 46); else { c.fillStyle = 'rgba(255,255,255,.5)'; emo(c, '🪿', 0, 2, 34); }
          c.restore();
        }
        c.fillStyle = INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('Find all eight pairs in as few tries as you can.', 400, 462); c.restore();
      },
    };
  }

  // ======================================================================= COLOUR CLASH
  function createClash(host) {
    const c = host.ctx, N = [['RED', '#e63946'], ['BLUE', '#3a86ff'], ['GREEN', '#2fbf71'], ['YELLOW', '#f4b400']];
    let t = 0, time = 30, score = 0, streak = 0, over = false, word = 0, ink = 0, flash = 0, flashC = '';
    const next = () => { word = (R() * 4) | 0; ink = R() < 0.7 ? (word + 1 + ((R() * 3) | 0)) % 4 : word; };
    next();
    const pick = (i) => { if (over) return; if (i === ink) { streak++; score += 1 + Math.floor(streak / 5); flash = 0.2; flashC = '#2fbf71'; host.tone('sine', 600 + streak * 20, 900, 0.1, 0.15); } else { streak = 0; score = Math.max(0, score - 1); time -= 2; flash = 0.3; flashC = '#e63946'; host.snd.ouch(); } next(); };
    const off = onTap(host, (e) => { const f = frame(host, 800, 480), p = toL(host, f, e); for (let i = 0; i < 4; i++) { const x = 70 + i * 170; if (p.x > x && p.x < x + 150 && p.y > 330 && p.y < 420) { pick(i); return; } } });
    host.controls([]);
    return {
      key(code, down) { const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, KeyR: 0, KeyB: 1, KeyG: 2, KeyY: 3 }[code]; if (k != null) { if (down) pick(k); return true; } return false; },
      destroy() { off(); },
      update(dt) { if (over) return; t += dt; time -= dt; flash = Math.max(0, flash - dt); host.hud({ title: 'Colour Clash', text: 'Score ' + score + ' · streak ' + streak + ' · ' + Math.max(0, Math.ceil(time)) + 's' }); if (time <= 0) { over = true; host.end(score, 'You scored ' + score + ' in Colour Clash'); } },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.fillStyle = flash > 0 ? flashC : '#fff'; c.globalAlpha = flash > 0 ? 0.35 : 0.9; c.strokeStyle = INK; c.lineWidth = 5; rr(c, 120, 60, 560, 220, 26); c.fill(); c.globalAlpha = 1; c.stroke();
        c.font = '900 96px system-ui'; c.textAlign = 'center'; c.lineWidth = 8; c.strokeStyle = INK; c.strokeText(N[word][0], 400, 190); c.fillStyle = N[ink][1]; c.fillText(N[word][0], 400, 190);
        c.fillStyle = INK; c.font = '800 18px system-ui'; c.fillText('Tap the COLOUR OF THE INK, not what the word says!', 400, 250);
        for (let i = 0; i < 4; i++) { const x = 70 + i * 170; c.fillStyle = N[i][1]; c.strokeStyle = INK; c.lineWidth = 5; rr(c, x, 330, 150, 90, 18); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.font = '900 24px system-ui'; c.fillText(N[i][0], x + 75, 384); }
        c.restore();
      },
    };
  }

  // ======================================================================= GOOSE RACE (tap fast!)
  function createRace(host) {
    const c = host.ctx; let t = 0, over = false, go = 3, me = 0, lastSide = 0, boost = 0, fin = 0, place = 0, done = 0; const bots = [0, 1, 2].map((i) => ({ x: 0, sp: 0.78 + R() * 0.36, burst: R() * 6, fin: 0 }));
    const step = (side) => { if (over || go > 0) return; if (side !== lastSide) { me += 6.2 + boost; boost = Math.min(3, boost + 0.15); lastSide = side; host.tone('triangle', 300 + me * 0.4, 360, 0.05, 0.08); } };
    const off = onTap(host, (e) => { const r = host.ctx.canvas.getBoundingClientRect(); step(e.clientX - r.left < r.width / 2 ? -1 : 1); });
    host.controls([{ label: '🦶 L', side: 'L', big: true, down: () => step(-1) }, { label: 'R 🦶', side: 'R', big: true, down: () => step(1) }]);
    return {
      key(code, down) { if (code === 'ArrowLeft' || code === 'KeyA') { if (down) step(-1); return true; } if (code === 'ArrowRight' || code === 'KeyD') { if (down) step(1); return true; } return false; },
      destroy() { off(); },
      update(dt) {
        t += dt; host.hud({ title: 'Goose Race', text: 'Tap left and right, left and right!' }); if (go > 0) { go -= dt; return; } if (over) return; boost = Math.max(0, boost - dt * 1.2);
        for (const b of bots) { if (b.fin) continue; b.burst -= dt; const sp = b.sp * (b.burst < 0 ? (b.burst < -0.8 ? (b.burst = 2 + R() * 4, 1) : 1.5) : 1); b.x += sp * 9 * dt * 5; if (b.x >= 100 * 5.4) { b.fin = t; done++; } }
        if (me >= 100 * 5.4 && !fin) { fin = t; over = true; place = 1 + bots.filter((b) => b.fin && b.fin < t).length; const sc = [120, 80, 50, 25][place - 1]; host.end(sc, place === 1 ? 'You WON the goose race!' : 'You came ' + place + (place === 2 ? 'nd' : place === 3 ? 'rd' : 'th')); }
        host.hud({ title: 'Goose Race', text: 'Tap left and right, left and right!' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        const lanes = [bots[0], bots[1], bots[2], { x: me }];
        c.fillStyle = 'rgba(70,120,60,.55)'; c.fillRect(0, 90, 800, 340); c.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { c.fillRect(0, 100 + k * 84, 800, 3); }
        c.fillStyle = '#fff'; for (let y = 90; y < 430; y += 20) { c.fillRect(740, y, 10, 10); c.fillRect(750, y + 10, 10, 10); }
        lanes.forEach((l, k) => { const x = 40 + Math.min(l.x, 540) * 1.2; goose(c, x, 150 + k * 84, k === 3 ? 1.15 : 1, 1, t * (k === 3 ? 1.4 : 1)); if (k === 3) say(c, 'YOU', x, 150 + k * 84 + 40, 14, '#e63946'); });
        if (go > 0) say(c, String(Math.ceil(go)), 400, 250, 120, '#e63946'); c.restore();
      },
    };
  }

  // ======================================================================= PERFECT TOAST
  function createToast(host) {
    const c = host.ctx; let t = 0, round = 0, total = 0, state = 'run', pos = 0, dir = 1, spd = 1.1, over = false, timer = 0, msg = '', stopAt = 0;
    const zone = () => ({ a: 0.42, b: 0.58 });
    const tap = () => { if (over) return; if (state === 'run') { state = 'show'; stopAt = pos; const z = zone(), mid = (z.a + z.b) / 2, d = Math.abs(pos - mid), pts = d < 0.03 ? 40 : d < 0.08 ? 25 : d < 0.16 ? 10 : 0; total += pts; msg = pts >= 40 ? '🌟 PERFECT! +40' : pts ? (pts >= 25 ? '🍞 Golden! +25' : 'Nearly… +10') : (pos < mid ? '🥶 Raw! +0' : '🔥 Burnt! +0'); timer = 1.2; host.tone('triangle', pts ? 700 : 200, pts ? 1000 : 150, 0.2, 0.2); } };
    const off = onTap(host, tap); host.controls([{ label: 'POP!', side: 'R', big: true, down: tap }]);
    return {
      key(code, down) { if (code === 'Space' || code === 'Enter') { if (down) tap(); return true; } return false; },
      destroy() { off(); },
      update(dt) {
        if (over) return; t += dt;
        if (state === 'run') { pos += dir * spd * dt; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } }
        else { timer -= dt; if (timer <= 0) { round++; if (round >= 6) { over = true; host.end(total, 'You toasted ' + total + ' points of bread'); } else { state = 'run'; pos = R() * 0.3; dir = 1; spd = 1.1 + round * 0.35; } } }
        host.hud({ title: 'Perfect Toast', text: 'Slice ' + Math.min(6, round + 1) + '/6 · ' + total + ' pts' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        const p = state === 'run' ? pos : stopAt, br = Math.round(240 - p * 150), col = 'rgb(' + clamp(br + 10, 70, 245) + ',' + clamp(br - 30, 40, 215) + ',' + clamp(br - 100, 20, 150) + ')';
        c.fillStyle = '#c9c9d4'; c.strokeStyle = INK; c.lineWidth = 5; rr(c, 250, 140, 300, 150, 24); c.fill(); c.stroke();
        c.fillStyle = col; c.beginPath(); c.moveTo(320, 200); c.quadraticCurveTo(300, 120, 360, 130); c.quadraticCurveTo(400, 90, 440, 130); c.quadraticCurveTo(500, 120, 480, 200); c.lineTo(480, 250); c.lineTo(320, 250); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 4; rr(c, 100, 340, 600, 40, 20); c.fill(); c.stroke();
        const z = zone(); c.fillStyle = '#ffd23f'; c.fillRect(100 + 600 * z.a, 344, 600 * (z.b - z.a), 32); c.fillStyle = '#2fbf71'; c.fillRect(100 + 600 * (z.a + z.b) / 2 - 8, 344, 16, 32);
        c.fillStyle = '#e63946'; rr(c, 100 + 600 * p - 6, 330, 12, 60, 6); c.fill(); c.fillStyle = INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('raw', 120, 410); c.fillText('burnt', 680, 410);
        if (state === 'show') say(c, msg, 400, 90, 40, '#e63946'); else c.fillText('Pop the toast out when it is golden!', 400, 450);
        c.restore();
      },
    };
  }

  // ======================================================================= BALLOON PUMP (push your luck)
  function createBalloon(host) {
    const c = host.ctx; let t = 0, round = 0, total = 0, pumps = 0, limit = 6 + ((R() * 14) | 0), state = 'pump', timer = 0, msg = '', over = false, shake = 0;
    const pump = () => { if (over || state !== 'pump') return; pumps++; host.tone('triangle', 200 + pumps * 25, 220 + pumps * 25, 0.08, 0.12); if (pumps >= limit) { state = 'pop'; timer = 1.2; msg = '💥 POP! +0'; shake = 1; host.snd.ouch(); } };
    const cash = () => { if (over || state !== 'pump' || pumps === 0) return; const v = pumps * pumps; total += v; state = 'saved'; timer = 1; msg = '💰 Banked +' + v; host.tone('sine', 700, 1100, 0.2, 0.2); };
    const off = (() => { const cv = host.ctx.canvas, h = (e) => { const f = frame(host, 800, 480), p = toL(host, f, e); if (p.x < 400) pump(); else cash(); }; cv.addEventListener('pointerdown', h); return () => cv.removeEventListener('pointerdown', h); })();
    host.controls([{ label: '💨 PUMP', side: 'L', big: true, down: pump }, { label: '💰 BANK', side: 'R', big: true, down: cash }]);
    return {
      key(code, down) { if (code === 'Space' || code === 'KeyP') { if (down) pump(); return true; } if (code === 'Enter' || code === 'KeyB') { if (down) cash(); return true; } return false; },
      destroy() { off(); },
      update(dt) {
        if (over) return; t += dt; shake = Math.max(0, shake - dt * 3);
        if (state !== 'pump') { timer -= dt; if (timer <= 0) { round++; if (round >= 5) { over = true; host.end(total, 'You banked ' + total + ' points'); } else { state = 'pump'; pumps = 0; limit = 5 + ((R() * 15) | 0); } } }
        host.hud({ title: 'Balloon Pump', text: 'Balloon ' + Math.min(5, round + 1) + '/5 · bank ' + total + ' · pumps ' + pumps });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox + (shake ? (R() - 0.5) * 16 * shake : 0), f.oy); c.scale(f.s, f.s);
        const r = 30 + pumps * 9, hue = (pumps * 14) % 360; goose(c, 400, 430, 1.1, 1, t);
        if (state !== 'pop') { c.fillStyle = 'hsl(' + (350 - pumps * 6) + ',85%,58%)'; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.ellipse(400 + Math.sin(t * 5) * pumps * 0.4, 330 - r, r * 0.86, r, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(400 - r * 0.3, 330 - r * 1.3, r * 0.15, r * 0.3, 0.4, 0, 7); c.fill(); c.strokeStyle = INK; c.beginPath(); c.moveTo(400, 330); c.lineTo(400, 380); c.stroke(); void hue; }
        else emo(c, '💥', 400, 220, 140);
        if (state !== 'pump') say(c, msg, 400, 70, 40, state === 'pop' ? '#e63946' : '#2fbf71');
        c.fillStyle = INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('Tap LEFT to pump, RIGHT to bank. More pumps = way more points… but it might pop!', 400, 466); c.restore();
      },
    };
  }

  const add = (o) => MG.list.push(Object.assign({ theme: 'meadow', deco: 'farm' }, o));
  add({ id: 'bubbles', name: 'Bubble Pop', icon: '🫧', desc: 'Pop rising bubbles with your beak. Gold ones are worth 5, bombs cost you time.', theme: 'ocean', fmt: (s) => s + ' pts', reward: (s) => s * 2, create: createBubbles });
  add({ id: 'memory', name: 'Memory Match', icon: '🃏', desc: 'Flip the cards and find all eight pairs in as few tries as you can.', theme: 'candy', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 3), create: createMemory });
  add({ id: 'clash', name: 'Colour Clash', icon: '🎨', desc: 'The word says one colour, the ink is another. Tap the colour of the INK. Fast!', theme: 'night', fmt: (s) => s + ' pts', reward: (s) => s, create: createClash });
  add({ id: 'race', name: 'Goose Race', icon: '🏁', desc: 'Tap left, right, left, right as fast as you can and beat three racing geese.', theme: 'meadow', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 2), create: createRace });
  add({ id: 'toast', name: 'Perfect Toast', icon: '🍞', desc: 'Stop the meter and pop the toast out at exactly the right golden moment.', theme: 'candy', fmt: (s) => s + ' pts', reward: (s) => s, create: createToast });
  add({ id: 'balloon', name: 'Balloon Pump', icon: '🎈', desc: 'Pump the balloon for more points, but bank before it pops. Five balloons.', theme: 'sunset', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 2), create: createBalloon });
})(window);
