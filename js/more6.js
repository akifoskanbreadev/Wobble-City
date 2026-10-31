/*
 * More stuff, part 6: 6 backpieces, 4 tails, 4 auras, 6 body clothes, 5 trails and 5 more minigames.
 *   Minigames: 🎯 Target Toss · 🚀 Asteroid Dodge · 🔢 Quick Maths · 🃏 Higher or Lower · ⚖ Wobble Balance
 */
(function (root) {
  'use strict';
  const INK = '#1f2a36', T = () => performance.now() / 1000;
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const dot = (c, x, y, r, f) => { c.beginPath(); c.arc(x, y, r, 0, 7); outline(c, f, 1.8); };
    // ---- backs (drawn on the body, -x is the tail end)
    add({ id: 'm6_jet', cat: 'back', name: 'Jetpack', price: 150, draw(c) { for (const y of [-6, 6]) { c.beginPath(); c.rect(-22, y - 6, 16, 12); outline(c, '#9aa5b5', 2.4); const f = 6 + Math.sin(T() * 40 + y) * 3; c.beginPath(); c.moveTo(-22, y - 4); c.lineTo(-30 - f, y); c.lineTo(-22, y + 4); c.closePath(); outline(c, '#ff8a1a', 1.6); } } });
    add({ id: 'm6_bat', cat: 'back', name: 'Bat Wings', price: 130, draw(c) { const w = Math.sin(T() * 4) * 4; c.beginPath(); c.moveTo(-4, -14); c.lineTo(-30, -34 + w); c.quadraticCurveTo(-26, -22, -34, -14 + w); c.quadraticCurveTo(-24, -12, -24, -2 + w); c.quadraticCurveTo(-14, -8, -4, -4); c.closePath(); outline(c, '#3a2a4a', 2.4); } });
    add({ id: 'm6_butterfly', cat: 'back', name: 'Butterfly Wings', price: 140, draw(c) { const s = 1 + Math.sin(T() * 6) * 0.08; c.save(); c.scale(1, s); ell(c, -14, -22, 14, 9, '#ff8ac8', 2); ell(c, -14, -6, 11, 7, '#8ad0ff', 2); dot(c, -14, -22, 3, '#fff'); c.restore(); } });
    add({ id: 'm6_shell', cat: 'back', name: 'Turtle Shell', price: 110, draw(c) { c.beginPath(); c.ellipse(-2, -10, 22, 14, 0, Math.PI, 0); c.closePath(); outline(c, '#4a9a4a', 2.6); c.strokeStyle = '#2e6a2e'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-14, -10); c.lineTo(-10, -22); c.moveTo(-2, -10); c.lineTo(-2, -24); c.moveTo(10, -10); c.lineTo(6, -22); c.stroke(); } });
    add({ id: 'm6_pack', cat: 'back', name: 'Hiking Backpack', price: 90, draw(c) { c.beginPath(); c.rect(-24, -22, 20, 26); outline(c, '#d9742a', 2.6); c.fillStyle = '#b05a1a'; c.fillRect(-22, -8, 16, 10); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(-22, -8, 16, 10); dot(c, -14, -26, 4, '#e8e8e8'); } });
    add({ id: 'm6_rbcape', cat: 'back', name: 'Rainbow Cape', price: 160, draw(c) { const w = Math.sin(T() * 5) * 3; ['#ff4d4d', '#ffa63a', '#ffe14a', '#4cd964', '#3a86ff', '#9b5de5'].forEach((col, i) => { c.beginPath(); c.moveTo(8, -18 + i * 5); c.quadraticCurveTo(-30, -26 + i * 5 + w, -54, -4 + i * 5 + w * 2); c.lineTo(-52, 2 + i * 5 + w * 2); c.quadraticCurveTo(-28, -18 + i * 5 + w, 8, -13 + i * 5); c.closePath(); c.fillStyle = col; c.fill(); }); } });
    // ---- tails
    add({ id: 'm6_dragon', cat: 'tail', name: 'Dragon Tail', price: 130, draw(c) { c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(-24, -8, -42, 4); c.quadraticCurveTo(-24, 6, 0, 5); c.closePath(); outline(c, '#3fb06a', 2.4); c.fillStyle = '#e8503a'; for (const x of [-10, -20, -30]) { c.beginPath(); c.moveTo(x, -4); c.lineTo(x - 4, -11); c.lineTo(x - 8, -4); c.fill(); } } });
    add({ id: 'm6_fin', cat: 'tail', name: 'Mermaid Fin', price: 120, draw(c) { const w = Math.sin(T() * 4) * 3; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-18, -6 + w, -34, -16 + w); c.quadraticCurveTo(-26, 0, -34, 16 - w); c.quadraticCurveTo(-18, 6 - w, 0, 0); c.closePath(); outline(c, '#3ad0c0', 2.4); } });
    add({ id: 'm6_bolt', cat: 'tail', name: 'Lightning Tail', price: 100, draw(c) { c.beginPath(); c.moveTo(0, -2); c.lineTo(-14, -10); c.lineTo(-12, -2); c.lineTo(-28, -8); c.lineTo(-22, 2); c.lineTo(-36, 6); c.lineTo(-10, 4); c.closePath(); outline(c, '#ffe14a', 2.2); } });
    add({ id: 'm6_feather', cat: 'tail', name: 'Feather Plume', price: 70, draw(c) { for (let i = -1; i <= 1; i++) { c.save(); c.translate(-2, 0); c.rotate(Math.PI + i * 0.3); ell(c, 16, 0, 16, 4, ['#ff6a8a', '#ffd23f', '#6ad0ff'][i + 1], 1.8); c.restore(); } } });
    // ---- auras (drawn around the goose)
    const heart = (c) => { c.beginPath(); c.moveTo(0, 3); c.bezierCurveTo(-6, -2, -3, -6, 0, -2); c.bezierCurveTo(3, -6, 6, -2, 0, 3); c.fill(); };
    add({ id: 'm6_snowfall', cat: 'aura', name: 'Snow Cloud', price: 140, draw(c) { ell(c, 0, -52, 26, 9, '#eef4ff', 2); for (let i = 0; i < 7; i++) { const t = (T() * 0.6 + i / 7) % 1; c.fillStyle = '#fff'; c.globalAlpha = 1 - t * 0.6; c.beginPath(); c.arc(Math.sin(i * 3.1) * 24, -44 + t * 80, 2.2, 0, 7); c.fill(); } c.globalAlpha = 1; } });
    add({ id: 'm6_notes', cat: 'aura', name: 'Music Notes', price: 120, draw(c) { c.fillStyle = '#7a4aff'; c.font = '700 16px system-ui'; for (let i = 0; i < 4; i++) { const t = (T() * 0.5 + i / 4) % 1; c.globalAlpha = 1 - t; c.fillText(i % 2 ? '♪' : '♫', Math.sin(i * 2) * 40 - 6, 14 - t * 60); } c.globalAlpha = 1; } });
    add({ id: 'm6_ring', cat: 'aura', name: 'Sparkle Ring', price: 150, draw(c) { for (let i = 0; i < 10; i++) { const a = T() * 1.5 + i * 0.628, x = Math.cos(a) * 50, y = Math.sin(a) * 26, r = 3 + Math.sin(T() * 6 + i) * 1.5; c.fillStyle = '#fff6b0'; c.fillRect(x - r / 4, y - r, r / 2, r * 2); c.fillRect(x - r, y - r / 4, r * 2, r / 2); } } });
    add({ id: 'm6_leaves', cat: 'aura', name: 'Falling Leaves', price: 110, draw(c) { for (let i = 0; i < 6; i++) { const t = (T() * 0.4 + i / 6) % 1; c.save(); c.translate(Math.sin(i * 2.3 + t * 4) * 36, -40 + t * 80); c.rotate(t * 8 + i); c.globalAlpha = 1 - t * 0.5; ell(c, 0, 0, 5, 2.6, ['#e8832a', '#c9402a', '#e8c02a'][i % 3], 1.2); c.restore(); } c.globalAlpha = 1; } });
    // ---- body
    const clipB = (c, fn) => { c.save(); c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.clip(); fn(); c.restore(); c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); };
    add({ id: 'm6_hoodie', cat: 'body', name: 'Hoodie', price: 70, draw(c) { clipB(c, () => { c.fillStyle = '#6a7ab8'; c.fillRect(-40, -26, 80, 52); c.fillStyle = '#566498'; c.fillRect(-12, 2, 24, 14); }); } });
    add({ id: 'm6_gold', cat: 'body', name: 'Golden Armour', price: 200, draw(c) { clipB(c, () => { c.fillStyle = '#e8b82a'; c.fillRect(-40, -26, 80, 52); c.strokeStyle = '#a8801a'; c.lineWidth = 2; for (let x = -30; x < 40; x += 14) { c.beginPath(); c.moveTo(x, -24); c.lineTo(x, 24); c.stroke(); } c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-30, -20, 18, 5); }); } });
    add({ id: 'm6_polka', cat: 'body', name: 'Polka Dress', price: 65, draw(c) { clipB(c, () => { c.fillStyle = '#e63a6a'; c.fillRect(-40, -26, 80, 52); c.fillStyle = '#fff'; for (const [x, y] of [[-24, -8], [-8, 8], [8, -10], [24, 6], [0, -2], [-28, 10]]) { c.beginPath(); c.arc(x, y, 3.4, 0, 7); c.fill(); } }); } });
    add({ id: 'm6_hawaii', cat: 'body', name: 'Hawaiian Shirt', price: 60, draw(c) { clipB(c, () => { c.fillStyle = '#19b8d6'; c.fillRect(-40, -26, 80, 52); for (const [x, y, col] of [[-22, -6, '#ff7aa8'], [0, 8, '#ffd23f'], [22, -8, '#ff7aa8'], [14, 10, '#fff']]) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); c.fillStyle = '#2fbf71'; c.fillRect(x - 1, y + 4, 2, 6); } }); } });
    add({ id: 'm6_lab', cat: 'body', name: 'Lab Coat', price: 75, draw(c) { clipB(c, () => { c.fillStyle = '#f6f8fb'; c.fillRect(-40, -26, 80, 52); c.fillStyle = '#c7d0dc'; c.fillRect(-1, -24, 2, 48); c.fillStyle = '#3a86ff'; c.fillRect(-18, 2, 9, 3); }); } });
    add({ id: 'm6_overalls', cat: 'body', name: 'Overalls', price: 60, draw(c) { clipB(c, () => { c.fillStyle = '#3a6ac8'; c.fillRect(-40, -4, 80, 30); c.fillRect(-6, -26, 5, 24); c.fillRect(12, -26, 5, 24); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(-3, -2, 2.4, 0, 7); c.arc(14, -2, 2.4, 0, 7); c.fill(); }); } });
    // ---- trails
    const tr = (id, name, price, kind, cols, em) => add({ id, cat: 'trail', name, price, trail: { kind, cols }, draw(c) { c.font = '16px system-ui'; c.textAlign = 'center'; c.fillText(em, 0, 5); } });
    tr('m6_t_autumn', 'Autumn Leaves', 80, 'leaf', ['#e8832a', '#c9402a', '#e8c02a'], '🍂');
    tr('m6_t_snow', 'Snowflakes', 80, 'snow', ['#ffffff', '#cfe6ff'], '❄️');
    tr('m6_t_neon', 'Neon Confetti', 90, 'confetti', ['#19d6ff', '#ff3ad8', '#b6ff3a'], '🎊');
    tr('m6_t_silver', 'Silver Coins', 100, 'coin', ['#e8edf4', '#b8c2d4'], '🪙');
    tr('m6_t_notes', 'Pastel Notes', 85, 'note', ['#ff8ac8', '#8ad0ff', '#b6ffb0'], '🎵');
  }

  // ================================================================ minigames
  const MG = root.Minigames; if (!MG) return;
  const R = () => Math.random(), clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const frame = (host, lw, lh) => { const s = Math.min(host.W / lw, host.H / lh); return { s, ox: (host.W - lw * s) / 2, oy: (host.H - lh * s) / 2 }; };
  const toL = (host, f, e) => { const r = host.ctx.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - f.ox) / f.s, y: (e.clientY - r.top - f.oy) / f.s }; };
  const onPtr = (host, type, fn) => { const cv = host.ctx.canvas, h = (e) => { if (type === 'pointerdown' && e.pointerType === 'mouse' && e.button !== 0) return; fn(e); }; cv.addEventListener(type, h); return () => cv.removeEventListener(type, h); };
  const say = (c, text, x, y, size, col) => { c.save(); c.font = '800 ' + size + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(text, x, y); c.fillStyle = col || INK; c.fillText(text, x, y); c.restore(); };
  const emo = (c, e, x, y, size) => { c.font = size + 'px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, x, y); c.textBaseline = 'alphabetic'; };
  const note = (c, s) => { c.fillStyle = INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText(s, 400, 468); };
  const btn = (c, x, y, w, h, label, col) => { c.fillStyle = col || '#fff'; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.rect(x, y, w, h); c.fill(); c.stroke(); c.fillStyle = INK; c.font = '800 30px system-ui'; c.textAlign = 'center'; c.fillText(label, x + w / 2, y + h / 2 + 11); };

  // ------------------------------------------------------------ 🎯 Target Toss
  function createTarget(host) {
    const c = host.ctx; let t = 0, left = 30, score = 0, tg = [], spawn = 0.3, over = false, pops = [];
    const off = onPtr(host, 'pointerdown', (e) => {
      if (over) return; const f = frame(host, 800, 480), p = toL(host, f, e); let hit = false;
      for (let i = tg.length - 1; i >= 0; i--) { const q = tg[i], d = Math.hypot(p.x - q.x, p.y - q.y); if (d < q.r) { const pts = d < q.r * 0.3 ? 5 : d < q.r * 0.65 ? 3 : 1; score += pts * (q.k === 'small' ? 2 : 1); pops.push({ x: q.x, y: q.y, t: 0, s: '+' + pts * (q.k === 'small' ? 2 : 1) }); tg.splice(i, 1); hit = true; host.tone('triangle', 500 + pts * 100, 800 + pts * 100, 0.1, 0.15); break; } }
      if (!hit) { score = Math.max(0, score - 1); host.tone('square', 150, 100, 0.1, 0.1); }
    });
    return {
      destroy() { off(); },
      update(dt) {
        if (over) return; t += dt; left -= dt; spawn -= dt;
        if (spawn <= 0) { spawn = 0.55; const small = R() < 0.25; tg.push({ x: R() < 0.5 ? -40 : 840, y: 90 + R() * 300, vx: 0, r: small ? 28 : 46, k: small ? 'small' : 'big', age: 0 }); const q = tg[tg.length - 1]; q.vx = (q.x < 0 ? 1 : -1) * (130 + R() * 140 + t * 4); }
        for (let i = tg.length - 1; i >= 0; i--) { const q = tg[i]; q.x += q.vx * dt; q.y += Math.sin(t * 2 + i) * 30 * dt; if (q.x < -80 || q.x > 880) tg.splice(i, 1); }
        for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 0.6) pops.splice(i, 1); }
        host.hud({ title: 'Target Toss', text: Math.ceil(left) + 's · ' + score + ' pts' });
        if (left <= 0) { over = true; host.end(score, 'Target score ' + score); }
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        for (const q of tg) { for (const [k, col] of [[1, '#e63946'], [0.65, '#fff'], [0.3, '#e63946']]) { c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(q.x, q.y, q.r * k, 0, 7); c.fill(); c.stroke(); } }
        for (const p of pops) say(c, p.s, p.x, p.y - p.t * 50, 28, '#2fbf71');
        note(c, 'Tap the targets! Bullseye = 5, small ones count double, missing costs 1.'); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🚀 Asteroid Dodge
  function createDodge(host) {
    const c = host.ctx; let t = 0, x = 400, tx = 400, rocks = [], spawn = 0.4, over = false, k = 0;
    const move = (e) => { const f = frame(host, 800, 480); tx = clamp(toL(host, f, e).x, 30, 770); };
    const o1 = onPtr(host, 'pointermove', move), o2 = onPtr(host, 'pointerdown', move);
    return {
      destroy() { o1(); o2(); },
      key(code, down) { if (code === 'ArrowLeft' || code === 'KeyA') { k = down ? -1 : (k === -1 ? 0 : k); return true; } if (code === 'ArrowRight' || code === 'KeyD') { k = down ? 1 : (k === 1 ? 0 : k); return true; } return false; },
      update(dt) {
        if (over) return; t += dt; if (k) tx = clamp(tx + k * 480 * dt, 30, 770); x += (tx - x) * Math.min(1, dt * 12);
        spawn -= dt; if (spawn <= 0) { spawn = Math.max(0.12, 0.5 - t * 0.012); rocks.push({ x: R() * 800, y: -30, vy: 180 + R() * 120 + t * 6, r: 14 + R() * 22, rot: R() * 6 }); }
        for (let i = rocks.length - 1; i >= 0; i--) { const q = rocks[i]; q.y += q.vy * dt; q.rot += dt; if (Math.hypot(q.x - x, q.y - 420) < q.r + 16) { over = true; host.snd.ouch(); host.end(Math.floor(t * 10), 'You survived ' + t.toFixed(1) + ' seconds'); return; } if (q.y > 520) rocks.splice(i, 1); }
        host.hud({ title: 'Asteroid Dodge', text: t.toFixed(1) + ' s' });
      },
      draw() {
        const f = frame(host, 800, 480); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.fillStyle = '#0c1030'; c.fillRect(-400, -400, 1600, 1300); c.fillStyle = '#fff'; for (let i = 0; i < 50; i++) c.fillRect((i * 97) % 800, ((i * 53 + t * 60 * (1 + i % 3)) % 480), 2, 2);
        for (const q of rocks) { c.save(); c.translate(q.x, q.y); c.rotate(q.rot); emo(c, '🪨', 0, 0, q.r * 2.2); c.restore(); }
        if (!over) { emo(c, '🪿', x, 420, 44); const fl = 8 + Math.sin(t * 40) * 3; emo(c, '🔥', x, 452 + fl * 0.2, 18); }
        c.fillStyle = '#fff'; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('Drag or use arrow keys to dodge. Survive as long as you can!', 400, 468); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🔢 Quick Maths
  function createMaths(host) {
    const c = host.ctx; let left = 30, score = 0, q = null, opts = [], over = false, flash = 0, good = true, streak = 0;
    const make = () => { const a = 2 + ((R() * (9 + Math.min(10, score))) | 0), b = 2 + ((R() * 9) | 0), op = R() < 0.6 ? '+' : R() < 0.5 ? '-' : '×', ans = op === '+' ? a + b : op === '-' ? a - b : a * b; q = { s: a + ' ' + op + ' ' + b, ans }; const set = new Set([ans]); while (set.size < 4) set.add(ans + ((R() * 9) | 0) - 4); opts = [...set].sort(() => R() - 0.5); };
    make();
    const pick = (i) => { if (over) return; if (opts[i] === q.ans) { score++; streak++; good = true; host.tone('triangle', 600, 900, 0.1, 0.15); } else { streak = 0; good = false; left -= 2; host.snd.ouch(); } flash = 0.25; make(); };
    const bx = (i) => ({ x: 120 + (i % 2) * 300, y: 220 + ((i / 2) | 0) * 100, w: 260, h: 80 });
    const off = onPtr(host, 'pointerdown', (e) => { const f = frame(host, 800, 480), p = toL(host, f, e); for (let i = 0; i < 4; i++) { const b = bx(i); if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) pick(i); } });
    return {
      destroy() { off(); },
      key(code, down) { const m = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }; if (code in m) { if (down) pick(m[code]); return true; } return false; },
      update(dt) { if (over) return; left -= dt; flash = Math.max(0, flash - dt); host.hud({ title: 'Quick Maths', text: Math.ceil(left) + 's · ' + score + ' right' }); if (left <= 0) { over = true; host.end(score * 5, 'You got ' + score + ' right'); } },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        if (flash > 0) { c.fillStyle = (good ? 'rgba(47,191,113,' : 'rgba(230,57,70,') + flash * 0.6 + ')'; c.fillRect(0, 0, 800, 480); }
        say(c, q.s + ' = ?', 400, 150, 72, INK);
        for (let i = 0; i < 4; i++) { const b = bx(i); btn(c, b.x, b.y, b.w, b.h, String(opts[i]), '#fffbe8'); }
        note(c, 'Tap the right answer (or keys 1 to 4). A wrong answer costs 2 seconds.'); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🃏 Higher or Lower
  function createHiLo(host) {
    const c = host.ctx; let cur = 1 + ((R() * 13) | 0), nxt = 0, streak = 0, best = 0, state = 'ask', timer = 0, over = false, lives = 3;
    const draw = () => { do { nxt = 1 + ((R() * 13) | 0); } while (nxt === cur && R() < 0.8); };
    draw();
    const guess = (up) => { if (over || state !== 'ask') return; const ok = nxt === cur ? true : up ? nxt > cur : nxt < cur; state = 'show'; timer = 0.9; if (ok) { streak++; best = Math.max(best, streak); host.tone('triangle', 600, 900, 0.1, 0.15); } else { streak = 0; lives--; host.snd.ouch(); } };
    const off = onPtr(host, 'pointerdown', (e) => { const f = frame(host, 800, 480), p = toL(host, f, e); if (p.y > 300) guess(p.x > 400 ? false : true); });
    host.controls([{ label: '⬆ HIGHER', side: 'L', big: true, down: () => guess(true) }, { label: '⬇ LOWER', side: 'R', big: true, down: () => guess(false) }]);
    const nm = (n) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[n] || String(n));
    const card = (x, y, n, hidden) => { c.fillStyle = hidden ? '#3a86ff' : '#fff'; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.rect(x - 60, y - 85, 120, 170); c.fill(); c.stroke(); if (hidden) emo(c, '🪿', x, y, 56); else say(c, nm(n), x, y + 24, 70, n === 1 || n > 10 ? '#e63946' : INK); };
    return {
      destroy() { off(); },
      key(code, down) { if (code === 'ArrowUp' || code === 'KeyW') { if (down) guess(true); return true; } if (code === 'ArrowDown' || code === 'KeyS') { if (down) guess(false); return true; } return false; },
      update(dt) {
        if (over) return;
        if (state === 'show') { timer -= dt; if (timer <= 0) { if (lives <= 0) { over = true; host.end(best * 10, 'Best streak: ' + best); return; } cur = nxt; draw(); state = 'ask'; } }
        host.hud({ title: 'Higher or Lower', text: 'streak ' + streak + ' · best ' + best + ' · ' + '❤'.repeat(Math.max(0, lives)) });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        card(300, 160, cur, false); card(500, 160, nxt, state === 'ask');
        if (state === 'ask') { btn(c, 120, 330, 260, 80, '⬆ Higher', '#d6f5dd'); btn(c, 420, 330, 260, 80, '⬇ Lower', '#ffd9d9'); } else say(c, '', 400, 380, 30);
        note(c, 'Will the next card be higher or lower? Three wrong guesses and it is over.'); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ ⚖ Wobble Balance
  function createBalance(host) {
    const c = host.ctx; let t = 0, ang = 0, av = 0, bx = 0, bv = 0, kL = 0, kR = 0, over = false, tilt = 0;
    const move = (e) => { const f = frame(host, 800, 480), p = toL(host, f, e); tilt = clamp((p.x - 400) / 300, -1, 1); };
    const o1 = onPtr(host, 'pointerdown', move), o2 = onPtr(host, 'pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') move(e); });
    return {
      destroy() { o1(); o2(); },
      key(code, down) { if (code === 'ArrowLeft' || code === 'KeyA') { kL = down ? 1 : 0; return true; } if (code === 'ArrowRight' || code === 'KeyD') { kR = down ? 1 : 0; return true; } return false; },
      update(dt) {
        if (over) return; t += dt; const input = (kR - kL) || tilt, push = Math.sin(t * 1.1) * 0.4 + Math.sin(t * 2.3 + 1) * 0.25;
        av += (input * 14 + push * (0.6 + Math.min(1.2, t * 0.012)) * 9 - ang * 6 - av * 5) * dt; ang = clamp(ang + av * dt, -0.5, 0.5);
        bv += Math.sin(ang) * 520 * dt - bv * 0.9 * dt; bx += bv * dt;
        if (Math.abs(bx) > 300) { over = true; host.snd.ouch(); host.end(Math.floor(t * 10), 'You balanced for ' + t.toFixed(1) + ' seconds'); return; }
        host.hud({ title: 'Wobble Balance', text: t.toFixed(1) + ' s' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.translate(400, 320); c.fillStyle = '#7a5230'; c.beginPath(); c.moveTo(-30, 120); c.lineTo(30, 120); c.lineTo(0, 10); c.closePath(); c.fill();
        c.save(); c.rotate(ang); c.fillStyle = '#c8a06a'; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.rect(-300, -8, 600, 16); c.fill(); c.stroke(); emo(c, '🥚', bx, -34, 52); c.restore();
        c.restore(); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s); note(c, 'Tilt the plank with the arrow keys (or press left / right of the screen) to keep the egg on it.'); c.restore();
      },
    };
  }

  const add = (o) => MG.list.push(Object.assign({ theme: 'meadow', deco: 'farm' }, o));
  add({ id: 'm6target', name: 'Target Toss', icon: '🎯', desc: 'Tap flying targets. Bullseyes and small ones score more.', theme: 'desert', fmt: (s) => s + ' pts', reward: (s) => s, create: createTarget });
  add({ id: 'm6dodge', name: 'Asteroid Dodge', icon: '🚀', desc: 'Fly the goose through a rain of rocks. How long can you last?', theme: 'space', fmt: (s) => (s / 10).toFixed(1) + ' s', reward: (s) => Math.floor(s / 4), create: createDodge });
  add({ id: 'm6maths', name: 'Quick Maths', icon: '🔢', desc: 'Answer sums before the 30 seconds run out.', theme: 'candy', fmt: (s) => s + ' pts', reward: (s) => s, create: createMaths });
  add({ id: 'm6hilo', name: 'Higher or Lower', icon: '🃏', desc: 'Guess if the next card is higher or lower and build a streak.', theme: 'night', fmt: (s) => s + ' pts', reward: (s) => s, create: createHiLo });
  add({ id: 'm6balance', name: 'Wobble Balance', icon: '⚖️', desc: 'Keep the egg on the wobbly plank for as long as you can.', theme: 'sunset', fmt: (s) => (s / 10).toFixed(1) + ' s', reward: (s) => Math.floor(s / 4), create: createBalance });
})(window);
