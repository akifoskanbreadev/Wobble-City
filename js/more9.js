/*
 * More stuff, part 9: 16 skins, 14 clothes and 5 board / arcade minigames.
 *   ⭕ Tic-Tac-Toe · 🔴 Connect Four · 🔢 Bread 2048 · 🏓 Beak Pong · 🔡 Hangman
 */
(function (root) {
  'use strict';
  const INK = '#1f2a36';
  // ================================================================ skins
  const S = root.Skins;
  if (S) {
    const add = (o) => { S.LIST.push(Object.assign({ legC: '#ff9b2f' }, o)); S.BY_ID[o.id] = S.LIST[S.LIST.length - 1]; };
    const clip = (c, fn) => { c.save(); c.beginPath(); c.ellipse(0, 0, 36, 22, 0, 0, 7); c.clip(); fn(); c.restore(); };
    const P = {
      dots: (c, col) => { c.fillStyle = col; for (let x = -36; x < 40; x += 11) for (let y = -22; y < 26; y += 9) { c.beginPath(); c.arc(x + ((y / 9) & 1 ? 5.5 : 0), y, 2, 0, 7); c.fill(); } },
      rings: (c, col) => { c.strokeStyle = col; c.lineWidth = 2; for (const [x, y] of [[-18, -4], [4, 6], [20, -6], [-4, -12]]) for (const r of [4, 8]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); } },
      diag: (c, col) => { c.fillStyle = col; c.save(); c.rotate(0.6); for (let x = -60; x < 60; x += 14) c.fillRect(x, -40, 6, 80); c.restore(); },
      fade: (c, col) => { const g = c.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, col); c.fillStyle = g; c.fillRect(-40, -24, 80, 48); },
      grid: (c, col) => { c.strokeStyle = col; c.lineWidth = 1.6; for (let x = -36; x < 40; x += 10) { c.beginPath(); c.moveTo(x, -24); c.lineTo(x, 24); c.stroke(); } for (let y = -20; y < 24; y += 10) { c.beginPath(); c.moveTo(-40, y); c.lineTo(40, y); c.stroke(); } },
      none: () => {},
    };
    const T = [
      ['m9_tiger2', 'Snow Tiger Goose', 460, '#f4f4ff', '#dcdcf0', '#6a7ac8', 'diag', '#5a6ab8'], ['m9_leopard', 'Leopard Goose', 440, '#e8b04a', '#c88a2a', '#5a3a1a', 'rings', '#5a3a1a'],
      ['m9_giraffe', 'Giraffe Goose', 440, '#f0c860', '#d8a840', '#8a5a2a', 'dots', '#a86a2a'], ['m9_peach', 'Peach Goose', 360, '#ffcaa0', '#ffa878', '#e8704a', 'fade', '#ff9a78'],
      ['m9_grape', 'Grape Soda Goose', 380, '#9a5ae0', '#7a3ac0', '#ffd23f', 'dots', '#d8b8ff'], ['m9_lime', 'Lime Goose', 360, '#9ad43a', '#7ab41a', '#ffd23f', 'fade', '#4a8a1a'],
      ['m9_circuit', 'Circuit Goose', 540, '#1a2a3a', '#2a3a5a', '#19d6ff', 'grid', '#19d6ff'], ['m9_hacker', 'Matrix Goose', 520, '#041a0a', '#0a3a1a', '#3aff6a', 'grid', '#2aff5a'],
      ['m9_denim', 'Denim Goose', 360, '#4a6aa8', '#3a5a98', '#ffd23f', 'dots', '#8aa8e0'], ['m9_cocoa', 'Cocoa Goose', 360, '#8a5a3a', '#6a3a1a', '#4a2a10', 'fade', '#3a1a08'],
      ['m9_aurora', 'Aurora Goose', 600, '#1a3a5a', '#2a5a7a', '#6affc8', 'diag', '#6affc8'], ['m9_cherry', 'Cherry Goose', 400, '#d6283c', '#a81a2c', '#2a7a2a', 'dots', '#ff8a9a'],
      ['m9_cotton', 'Cotton Candy Goose', 440, '#ffc8f0', '#a8d8ff', '#ff8ac8', 'fade', '#a8d8ff'], ['m9_sand', 'Sandy Goose', 300, '#f0dca0', '#d8c080', '#b89850', 'dots', '#c8a860'],
      ['m9_ghosty2', 'Ghost Pepper Goose', 420, '#ff3a1a', '#d81a0a', '#ffe14a', 'diag', '#ffd23f'], ['m9_pearl', 'Pearl Goose', 560, '#fdf4ff', '#ecdcf4', '#d8b8e8', 'fade', '#e8c8f8'],
    ];
    for (const [id, name, price, body, wing, legC, pat, col] of T) add({ id, name, price, body, wing, neckC: body, headC: body, legC, bodyDeco(c) { clip(c, () => (P[pat] || P.none)(c, col)); } });
  }

  // ================================================================ clothes
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const poly = (c, pts, fill, lw) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); outline(c, fill, lw || 2.4); };
    add({ id: 'm9_crown', cat: 'hat', name: 'Royal Crown', price: 140, draw(c) { poly(c, [[-10, -7], [10, -7], [11, -20], [5, -14], [0, -22], [-5, -14], [-11, -20]], '#ffd23f', 2.4); c.fillStyle = '#e63946'; c.beginPath(); c.arc(0, -11, 1.8, 0, 7); c.fill(); } });
    add({ id: 'm9_viking2', cat: 'hat', name: 'Samurai Helmet', price: 120, draw(c) { c.beginPath(); c.arc(0, -4, 11, Math.PI, 0); c.closePath(); outline(c, '#7a1a1a', 2.4); poly(c, [[-12, -4], [12, -4], [14, 2], [-14, 2]], '#4a1010', 2); poly(c, [[-4, -14], [0, -24], [4, -14]], '#ffd23f', 1.8); } });
    add({ id: 'm9_mushroom', cat: 'hat', name: 'Mushroom Cap', price: 60, draw(c) { c.beginPath(); c.ellipse(0, -8, 14, 10, 0, Math.PI, 0); c.closePath(); outline(c, '#e63946', 2.4); c.fillStyle = '#fff'; for (const [x, y] of [[-6, -13], [3, -16], [8, -11]]) { c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill(); } } });
    add({ id: 'm9_pumpkin', cat: 'hat', name: 'Pumpkin Hat', price: 55, draw(c) { ell(c, 0, -11, 12, 9, '#ff8a1a', 2.4); c.strokeStyle = '#c85a0a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -19); c.lineTo(0, -3); c.stroke(); c.fillStyle = '#4a7a2a'; c.fillRect(-1.6, -24, 3.2, 5); } });
    add({ id: 'm9_sprout', cat: 'hat', name: 'Little Sprout', price: 35, draw(c) { c.strokeStyle = '#3a8a2a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -9); c.lineTo(0, -17); c.stroke(); ell(c, -4, -18, 4.4, 2.4, '#4cc04a', 1.6); ell(c, 4, -19, 4.4, 2.4, '#4cc04a', 1.6); } });
    add({ id: 'm9_dino', cat: 'hat', name: 'Dino Spikes', price: 70, draw(c) { for (let i = -2; i <= 2; i++) poly(c, [[i * 4 - 3, -9], [i * 4, -17 - (2 - Math.abs(i)) * 1.5], [i * 4 + 3, -9]], '#4cc04a', 1.8); } });
    add({ id: 'm9_tuxedo', cat: 'body', name: 'Dress Shirt', price: 70, draw(c) { c.save(); c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.clip(); c.fillStyle = '#fff'; c.fillRect(-40, -26, 80, 52); c.fillStyle = '#222'; for (const y of [-8, 0, 8]) { c.beginPath(); c.arc(4, y, 1.8, 0, 7); c.fill(); } c.restore(); c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); } });
    add({ id: 'm9_knit', cat: 'body', name: 'Knitted Jumper', price: 65, draw(c) { c.save(); c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.clip(); c.fillStyle = '#c8402a'; c.fillRect(-40, -26, 80, 52); c.fillStyle = '#f4e8d0'; for (let x = -34; x < 36; x += 12) { c.beginPath(); c.moveTo(x, -4); c.lineTo(x + 5, 2); c.lineTo(x, 8); c.lineTo(x - 5, 2); c.closePath(); c.fill(); } c.restore(); c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); } });
    add({ id: 'm9_space', cat: 'body', name: 'Space Suit', price: 150, draw(c) { c.save(); c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.clip(); c.fillStyle = '#e8ecf4'; c.fillRect(-40, -26, 80, 52); c.fillStyle = '#ff7a1a'; c.fillRect(-40, 8, 80, 5); c.fillStyle = '#3a86ff'; c.beginPath(); c.arc(-14, -4, 4, 0, 7); c.fill(); c.fillStyle = '#e63946'; c.fillRect(2, -6, 10, 6); c.restore(); c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); } });
    add({ id: 'm9_tiedye', cat: 'body', name: 'Tie-Dye Tee', price: 55, draw(c) { c.save(); c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.clip(); const g = c.createRadialGradient(0, 0, 2, 0, 0, 40); g.addColorStop(0, '#ffe14a'); g.addColorStop(0.35, '#ff4d8d'); g.addColorStop(0.7, '#6a5af0'); g.addColorStop(1, '#19d6ff'); c.fillStyle = g; c.fillRect(-40, -26, 80, 52); c.restore(); c.beginPath(); c.ellipse(0, 0, 38, 24, 0, 0, 7); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); } });
    add({ id: 'm9_bandana', cat: 'neck', name: 'Bandana', price: 35, draw(c) { poly(c, [[-6, -6], [6, -6], [0, 8]], '#e63946', 2.2); c.fillStyle = '#fff'; for (const [x, y] of [[-2, -3], [2, -3], [0, 1]]) { c.beginPath(); c.arc(x, y, 0.9, 0, 7); c.fill(); } } });
    add({ id: 'm9_collar', cat: 'neck', name: 'Spiked Collar', price: 50, draw(c) { c.fillStyle = '#222'; c.fillRect(-6, -4, 12, 5); for (const x of [-4, 0, 4]) poly(c, [[x - 1.6, -4], [x, -8], [x + 1.6, -4]], '#c9c9d4', 1.2); } });
    add({ id: 'm9_locket', cat: 'neck', name: 'Heart Locket', price: 70, draw(c) { c.strokeStyle = '#c9a227'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, -6); c.quadraticCurveTo(0, 8, 5, -6); c.stroke(); c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-8, 6, -4, 0, 0, 4); c.bezierCurveTo(4, 0, 8, 6, 0, 12); outline(c, '#ff4f8b', 1.8); } });
    add({ id: 'm9_slippers', cat: 'shoes', name: 'Fuzzy Slippers', price: 40, draw(c) { ell(c, 4, 1, 12, 5.5, '#b8a0f0', 2.2); c.strokeStyle = '#8a70c8'; c.lineWidth = 1.2; for (let x = -2; x < 12; x += 3) { c.beginPath(); c.moveTo(x, -3); c.lineTo(x + 1, -6); c.stroke(); } } });
    add({ id: 'm9_heels', cat: 'shoes', name: 'Red Heels', price: 55, draw(c) { poly(c, [[-4, -2], [12, 0], [12, 5], [-4, 6]], '#e63946', 2.2); c.fillStyle = '#e63946'; c.fillRect(-4, 6, 3, 6); } });
  }

  // ================================================================ minigames
  const MG = root.Minigames; if (!MG) return;
  const R = () => Math.random(), clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const frame = (host, lw, lh) => { const s = Math.min(host.W / lw, host.H / lh); return { s, ox: (host.W - lw * s) / 2, oy: (host.H - lh * s) / 2 }; };
  const toL = (host, f, e) => { const r = host.ctx.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - f.ox) / f.s, y: (e.clientY - r.top - f.oy) / f.s }; };
  const onPtr = (host, type, fn) => { const cv = host.ctx.canvas, h = (e) => { if (type === 'pointerdown' && e.pointerType === 'mouse' && e.button !== 0) return; fn(e); }; cv.addEventListener(type, h); return () => cv.removeEventListener(type, h); };
  const say = (c, text, x, y, size, col) => { c.save(); c.font = '800 ' + size + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(text, x, y); c.fillStyle = col || INK; c.fillText(text, x, y); c.restore(); };
  const emo = (c, e, x, y, size) => { c.font = size + 'px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, x, y); c.textBaseline = 'alphabetic'; };
  const note = (c, s, col) => { c.fillStyle = col || INK; c.font = '700 14px system-ui'; c.textAlign = 'center'; if (s.length < 52) { c.fillText(s, 400, 470); return; } let m = s.lastIndexOf(' ', s.length / 2 + 6); if (m < 0) m = s.indexOf(' '); c.fillText(s.slice(0, m), 400, 452); c.fillText(s.slice(m + 1), 400, 470); };
  const box = (c, x, y, w, h, fill) => { c.fillStyle = fill; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.rect(x, y, w, h); c.fill(); c.stroke(); };

  // ------------------------------------------------------------ ⭕ Tic-Tac-Toe vs the fox
  function createTTT(host) {
    const c = host.ctx, LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]; let b, turn, round = 0, score = 0, wins = 0, state = 'play', timer = 0, msg = '', over = false;
    const winner = (g) => { for (const [x, y, z] of LINES) if (g[x] && g[x] === g[y] && g[y] === g[z]) return g[x]; return g.every((v) => v) ? 'd' : null; };
    const mm = (g, me, depth) => { const w = winner(g); if (w === 2) return 10 - depth; if (w === 1) return depth - 10; if (w === 'd') return 0; let best = me === 2 ? -99 : 99, mv = -1; for (let i = 0; i < 9; i++) if (!g[i]) { g[i] = me; const s = mm(g, me === 2 ? 1 : 2, depth + 1); g[i] = 0; if (me === 2 ? s > best : s < best) { best = s; mv = i; } } return depth === 0 ? mv : best; };
    const fresh = () => { b = new Array(9).fill(0); turn = round % 2 ? 2 : 1; state = 'play'; if (turn === 2) setTimeout(foxMove, 500); };
    const foxMove = () => { if (over || state !== 'play') return; let mv; if (R() < 0.25) { const free = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0); mv = free[(R() * free.length) | 0]; } else mv = mm(b.slice(), 2, 0); b[mv] = 2; turn = 1; check(); };
    const check = () => { const w = winner(b); if (!w) return; state = 'show'; timer = 1.1; if (w === 1) { score += 20; wins++; msg = '🎉 You win! +20'; host.tone('sine', 700, 1200, 0.3, 0.2); } else if (w === 2) { msg = '🦊 Fox wins'; host.snd.ouch(); } else { score += 8; msg = '🤝 Draw +8'; } };
    fresh();
    const off = onPtr(host, 'pointerdown', (e) => { if (over || state !== 'play' || turn !== 1) return; const f = frame(host, 800, 480), p = toL(host, f, e), cx = Math.floor((p.x - 250) / 100), cy = Math.floor((p.y - 90) / 100); if (cx < 0 || cx > 2 || cy < 0 || cy > 2) return; const i = cy * 3 + cx; if (b[i]) return; b[i] = 1; turn = 2; host.tone('triangle', 500, 600, 0.06, 0.1); check(); if (state === 'play') setTimeout(foxMove, 450); });
    return {
      destroy() { off(); over = true; },
      update(dt) { if (over) return; if (state === 'show') { timer -= dt; if (timer <= 0) { round++; if (round >= 5) { over = true; host.end(score, 'You won ' + wins + ' of 5 against the fox'); } else fresh(); } } host.hud({ title: 'Tic-Tac-Toe', text: 'Game ' + Math.min(5, round + 1) + '/5 · ' + score + ' pts' }); },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        box(c, 240, 80, 320, 320, '#fff8e0'); c.strokeStyle = INK; c.lineWidth = 5; for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(250 + i * 100, 90); c.lineTo(250 + i * 100, 390); c.moveTo(250, 90 + i * 100); c.lineTo(550, 90 + i * 100); c.stroke(); }
        b.forEach((v, i) => { if (v) emo(c, v === 1 ? '🪿' : '🦊', 300 + (i % 3) * 100, 140 + ((i / 3) | 0) * 100, 64); });
        say(c, state === 'show' ? msg : turn === 1 ? 'Your turn 🪿' : 'Fox is thinking… 🦊', 400, 56, 28, INK); c.restore(); note(c, 'Get three in a row against the fox. Five games: win 20, draw 8.');
      },
    };
  }

  // ------------------------------------------------------------ 🔴 Connect Four vs the fox
  function createC4(host) {
    const c = host.ctx, W = 7, H = 6, S = 56; let g = Array.from({ length: H }, () => new Array(W).fill(0)), turn = 1, moves = 0, over = false, state = 'play', msg = '', timer = 0, hov = 3, drop = null;
    const win = (p) => { for (let r = 0; r < H; r++) for (let q = 0; q < W; q++) for (const [dr, dq] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { let k = 0; for (; k < 4; k++) { const rr = r + dr * k, qq = q + dq * k; if (rr < 0 || rr >= H || qq < 0 || qq >= W || g[rr][qq] !== p) break; } if (k === 4) return true; } return false; };
    const row = (q) => { for (let r = H - 1; r >= 0; r--) if (!g[r][q]) return r; return -1; };
    const place = (q, p) => { const r = row(q); if (r < 0) return false; g[r][q] = p; moves++; return true; };
    const fox = () => {
      if (over || state !== 'play') return; let pick = -1;
      for (const p of [2, 1]) for (let q = 0; q < W && pick < 0; q++) { const r = row(q); if (r < 0) continue; g[r][q] = p; const w = win(p); g[r][q] = 0; if (w) pick = q; }
      if (pick < 0) { const order = [3, 2, 4, 1, 5, 0, 6].filter((q) => row(q) >= 0); pick = R() < 0.6 ? order[0] : order[(R() * order.length) | 0]; }
      place(pick, 2); turn = 1; after();
    };
    const after = () => { if (win(1)) { state = 'show'; timer = 1.4; msg = '🎉 You win!'; host.tone('sine', 700, 1200, 0.3, 0.2); } else if (win(2)) { state = 'show'; timer = 1.4; msg = '🦊 The fox wins'; host.snd.ouch(); } else if (moves >= W * H) { state = 'show'; timer = 1.2; msg = '🤝 Draw'; } };
    const off = onPtr(host, 'pointerdown', (e) => { if (over || state !== 'play' || turn !== 1) return; const f = frame(host, 800, 480), p = toL(host, f, e), q = Math.floor((p.x - (400 - W * S / 2)) / S); if (q < 0 || q >= W || !place(q, 1)) return; host.tone('triangle', 400, 300, 0.1, 0.12); turn = 2; after(); if (state === 'play') setTimeout(fox, 500); });
    return {
      destroy() { off(); over = true; },
      update(dt) { if (over) return; if (state === 'show') { timer -= dt; if (timer <= 0) { over = true; const sc = win(1) ? 100 + (42 - moves) * 3 : win(2) ? moves : 30; host.end(sc, msg + ' after ' + moves + ' discs'); } } host.hud({ title: 'Connect Four', text: turn === 1 ? 'Your move' : 'Fox thinking' }); },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        const x0 = 400 - W * S / 2, y0 = 40; box(c, x0 - 8, y0 - 8, W * S + 16, H * S + 16, '#2a5ac8');
        for (let r = 0; r < H; r++) for (let q = 0; q < W; q++) { c.fillStyle = g[r][q] === 1 ? '#ffd23f' : g[r][q] === 2 ? '#e63946' : '#e8f0ff'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(x0 + q * S + S / 2, y0 + r * S + S / 2, S / 2 - 6, 0, 7); c.fill(); c.stroke(); if (g[r][q]) emo(c, g[r][q] === 1 ? '🪿' : '🦊', x0 + q * S + S / 2, y0 + r * S + S / 2, 30); }
        if (state === 'show') say(c, msg, 400, 450, 30, INK); c.restore(); if (state !== 'show') note(c, 'Tap a column to drop your disc. Connect four before the fox does!');
      },
    };
  }

  // ------------------------------------------------------------ 🔢 Bread 2048
  function createB2048(host) {
    const c = host.ctx; let g = Array.from({ length: 4 }, () => new Array(4).fill(0)), score = 0, over = false, sx = 0, sy = 0, t = 0, endT = 0;
    const add = () => { const free = []; for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) if (!g[r][q]) free.push([r, q]); if (!free.length) return; const [r, q] = free[(R() * free.length) | 0]; g[r][q] = R() < 0.9 ? 2 : 4; };
    add(); add();
    const slideRow = (a) => { const v = a.filter((x) => x), out = []; for (let i = 0; i < v.length; i++) { if (v[i] === v[i + 1]) { out.push(v[i] * 2); score += v[i] * 2; i++; } else out.push(v[i]); } while (out.length < 4) out.push(0); return out; };
    const move = (dir) => { // 0 left 1 right 2 up 3 down
      if (over) return; const before = JSON.stringify(g);
      for (let i = 0; i < 4; i++) { let line = dir < 2 ? g[i].slice() : g.map((r) => r[i]); if (dir === 1 || dir === 3) line.reverse(); line = slideRow(line); if (dir === 1 || dir === 3) line.reverse(); if (dir < 2) g[i] = line; else line.forEach((v, r) => (g[r][i] = v)); }
      if (JSON.stringify(g) !== before) { add(); host.tone('triangle', 300, 400, 0.05, 0.08); } if (!canMove()) { over = true; endT = 1.2; host.snd.ouch(); }
    };
    const canMove = () => { for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) { if (!g[r][q]) return true; if (q < 3 && g[r][q] === g[r][q + 1]) return true; if (r < 3 && g[r][q] === g[r + 1][q]) return true; } return false; };
    const o1 = onPtr(host, 'pointerdown', (e) => { sx = e.clientX; sy = e.clientY; }), o2 = onPtr(host, 'pointerup', (e) => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : 0); else move(dy > 0 ? 3 : 2); });
    host.controls([{ label: '◀', side: 'L', big: true, down: () => move(0) }, { label: '▶', side: 'L', big: true, down: () => move(1) }, { label: '▲', side: 'R', big: true, down: () => move(2) }, { label: '▼', side: 'R', big: true, down: () => move(3) }]);
    const COL = { 0: '#d8d0c0', 2: '#fdf2d0', 4: '#fde0a0', 8: '#ffc070', 16: '#ffa050', 32: '#ff8050', 64: '#ff6040', 128: '#ffd23f', 256: '#ffc81a', 512: '#ffb000', 1024: '#ff9000', 2048: '#ff6a00' };
    return {
      destroy() { o1(); o2(); },
      key(code, down) { const m = { ArrowLeft: 0, KeyA: 0, ArrowRight: 1, KeyD: 1, ArrowUp: 2, KeyW: 2, ArrowDown: 3, KeyS: 3 }[code]; if (m != null) { if (down) move(m); return true; } return false; },
      update(dt) { t += dt; host.hud({ title: 'Bread 2048', text: score + ' pts' }); if (over) { endT -= dt; if (endT <= 0 && !this.done) { this.done = true; host.end(score, 'Your best bread was ' + Math.max(...g.flat())); } } },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        box(c, 200, 30, 400, 400, '#a89880');
        for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) { const v = g[r][q], x = 210 + q * 96, y = 40 + r * 96; c.fillStyle = COL[v] || '#ff4a1a'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.rect(x, y, 90, 90); c.fill(); c.stroke(); if (v) { emo(c, v >= 128 ? '🥖' : v >= 16 ? '🥐' : '🍞', x + 45, y + 32, 34); say(c, String(v), x + 45, y + 78, 26, INK); } }
        c.restore(); note(c, 'Swipe or use the arrows to slide the bread. Matching loaves merge. How big can you go?');
      },
    };
  }

  // ------------------------------------------------------------ 🏓 Beak Pong
  function createPong(host) {
    const c = host.ctx; let px = 400, tx = 400, ax = 400, bx = 400, by = 240, vx = 200, vy = 280, ps = 0, as = 0, t = 0, over = false, k = 0, sv = 0, endT = 0;
    const serve = (dir) => { bx = 400; by = 240; vx = (R() - 0.5) * 300; vy = 280 * dir; sv = 0.6; };
    const move = (e) => { const f = frame(host, 800, 480); tx = clamp(toL(host, f, e).x, 60, 740); };
    const o1 = onPtr(host, 'pointermove', move), o2 = onPtr(host, 'pointerdown', move);
    return {
      destroy() { o1(); o2(); },
      key(code, down) { if (code === 'ArrowLeft' || code === 'KeyA') { k = down ? -1 : (k === -1 ? 0 : k); return true; } if (code === 'ArrowRight' || code === 'KeyD') { k = down ? 1 : (k === 1 ? 0 : k); return true; } return false; },
      update(dt) {
        if (over) { endT -= dt; if (endT <= 0 && !this.done) { this.done = true; const win = ps > as; host.end(Math.max(0, ps * 20 - as * 8 + (win ? 30 : 0)), (win ? 'You won ' : 'You lost ') + ps + ' to ' + as); } return; }
        t += dt; if (k) tx = clamp(tx + k * 520 * dt, 60, 740); px += (tx - px) * Math.min(1, dt * 14);
        if (sv > 0) { sv -= dt; } else { bx += vx * dt; by += vy * dt; }
        ax += clamp(bx - ax, -(230 + t * 1.5) * dt, (230 + t * 1.5) * dt);
        if (bx < 20) { bx = 20; vx = Math.abs(vx); } if (bx > 780) { bx = 780; vx = -Math.abs(vx); }
        if (by > 424 && vy > 0 && Math.abs(bx - px) < 64) { vy = -Math.abs(vy) * 1.06; vx += (bx - px) * 5; host.tone('triangle', 400, 500, 0.05, 0.1); }
        if (by < 56 && vy < 0 && Math.abs(bx - ax) < 64) { vy = Math.abs(vy) * 1.04; vx += (bx - ax) * 4; host.tone('triangle', 300, 400, 0.05, 0.1); }
        vx = clamp(vx, -520, 520); vy = clamp(vy, -620, 620);
        if (by > 500) { as++; host.snd.ouch(); serve(-1); } if (by < -20) { ps++; host.tone('sine', 700, 1100, 0.15, 0.2); serve(1); }
        host.hud({ title: 'Beak Pong', text: ps + ' – ' + as + ' (first to 5)' });
        if (ps >= 5 || as >= 5) { over = true; endT = 1; }
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.fillStyle = 'rgba(40,90,40,.55)'; c.fillRect(0, 0, 800, 480); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.setLineDash([14, 12]); c.beginPath(); c.moveTo(0, 240); c.lineTo(800, 240); c.stroke(); c.setLineDash([]);
        c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 3; for (const [x, y] of [[px, 436], [ax, 44]]) { c.beginPath(); c.rect(x - 60, y - 9, 120, 18); c.fill(); c.stroke(); }
        emo(c, '🪿', px, 424, 30); emo(c, '🦊', ax, 56, 30); emo(c, '🥚', bx, by, 28);
        say(c, ps + '  :  ' + as, 70, 250, 34, INK); c.restore(); note(c, 'Drag (or arrow keys) to move your paddle. Bounce the egg past the fox. First to 5!');
      },
    };
  }

  // ------------------------------------------------------------ 🔡 Hangman
  function createHang(host) {
    const c = host.ctx, WORDS = ['GOOSE', 'BREAD', 'FEATHER', 'POND', 'HONK', 'WOBBLE', 'MEADOW', 'GOSLING', 'NOODLE', 'TAVERN', 'JELLYFISH', 'CHAMELEON', 'BASKET', 'LANTERN', 'PUZZLE', 'MINIGAME', 'ACHIEVE', 'AVATAR']; let order = WORDS.slice().sort(() => R() - 0.5), wi = 0, word = '', got = new Set(), wrong = new Set(), score = 0, words = 0, over = false, state = 'play', timer = 0, left = 90;
    const next = () => { word = order[wi++ % order.length]; got = new Set(); wrong = new Set(); state = 'play'; }; next();
    const guess = (ch) => { if (over || state !== 'play' || got.has(ch) || wrong.has(ch)) return; if (word.includes(ch)) { got.add(ch); host.tone('triangle', 500, 600, 0.05, 0.1); if (word.split('').every((x) => got.has(x))) { score += 10 + (6 - wrong.size) * 3; words++; state = 'show'; timer = 0.9; host.tone('sine', 700, 1100, 0.2, 0.2); } } else { wrong.add(ch); host.snd.ouch(); if (wrong.size >= 6) { state = 'lost'; timer = 1.2; } } };
    const keyPos = (i) => { const row = i < 9 ? 0 : i < 18 ? 1 : 2, idx = i < 9 ? i : i < 18 ? i - 9 : i - 18, n = row < 2 ? 9 : 8; return { x: 400 - (n * 56) / 2 + idx * 56, y: 292 + row * 52 }; };
    const off = onPtr(host, 'pointerdown', (e) => { const f = frame(host, 800, 480), p = toL(host, f, e); for (let i = 0; i < 26; i++) { const k = keyPos(i); if (p.x > k.x && p.x < k.x + 50 && p.y > k.y && p.y < k.y + 46) guess(String.fromCharCode(65 + i)); } });
    return {
      destroy() { off(); },
      key(code, down) { if (code.startsWith('Key')) { if (down) guess(code.slice(3)); return true; } return false; },
      update(dt) { if (over) return; left -= dt; if (state === 'show' || state === 'lost') { timer -= dt; if (timer <= 0) next(); } host.hud({ title: 'Hangman', text: Math.ceil(left) + 's · ' + words + ' words' }); if (left <= 0) { over = true; host.end(score, 'You saved ' + words + ' words'); } },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.strokeStyle = '#6b4a2a'; c.lineWidth = 8; c.beginPath(); c.moveTo(80, 270); c.lineTo(220, 270); c.moveTo(150, 270); c.lineTo(150, 40); c.lineTo(250, 40); c.lineTo(250, 70); c.stroke();
        const n = wrong.size; c.strokeStyle = INK; c.lineWidth = 4; if (n > 0) { c.beginPath(); c.arc(250, 90, 20, 0, 7); c.stroke(); } if (n > 1) { c.beginPath(); c.moveTo(250, 110); c.lineTo(250, 180); c.stroke(); } if (n > 2) { c.beginPath(); c.moveTo(250, 130); c.lineTo(222, 160); c.stroke(); } if (n > 3) { c.beginPath(); c.moveTo(250, 130); c.lineTo(278, 160); c.stroke(); } if (n > 4) { c.beginPath(); c.moveTo(250, 180); c.lineTo(228, 220); c.stroke(); } if (n > 5) { c.beginPath(); c.moveTo(250, 180); c.lineTo(272, 220); c.stroke(); }
        const w = word.length, x0 = 560 - (w * 40) / 2; word.split('').forEach((ch, i) => { const show = got.has(ch) || state === 'lost'; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(x0 + i * 40, 150); c.lineTo(x0 + i * 40 + 32, 150); c.stroke(); if (show) say(c, ch, x0 + i * 40 + 16, 140, 32, state === 'lost' && !got.has(ch) ? '#e63946' : INK); });
        for (let i = 0; i < 26; i++) { const ch = String.fromCharCode(65 + i), k = keyPos(i), used = got.has(ch) || wrong.has(ch); box(c, k.x, k.y, 50, 46, got.has(ch) ? '#c8f0c8' : wrong.has(ch) ? '#f4c8c8' : '#fffbe8'); if (!used) say(c, ch, k.x + 25, k.y + 34, 26, INK); }
        c.restore(); note(c, 'Guess the word one letter at a time (tap or type). Six wrong guesses and it is gone.');
      },
    };
  }

  const add = (o) => MG.list.push(Object.assign({ theme: 'meadow', deco: 'farm' }, o));
  add({ id: 'm9ttt', name: 'Tic-Tac-Toe', icon: '⭕', desc: 'Play five games of noughts and crosses against a clever fox.', theme: 'meadow', fmt: (s) => s + ' pts', reward: (s) => s, create: createTTT });
  add({ id: 'm9c4', name: 'Connect Four', icon: '🔴', desc: 'Drop discs and connect four before the fox does.', theme: 'candy', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 2), create: createC4 });
  add({ id: 'm9b2048', name: 'Bread 2048', icon: '🔢', desc: 'Slide the bread to merge loaves into bigger and bigger bakes.', theme: 'sunset', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 20), create: createB2048 });
  add({ id: 'm9pong', name: 'Beak Pong', icon: '🏓', desc: 'Bounce the egg past the fox. First to five wins.', theme: 'night', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 2), create: createPong });
  add({ id: 'm9hang', name: 'Hangman', icon: '🔡', desc: 'Guess the word before the goose runs out of guesses. 90 seconds.', theme: 'desert', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 2), create: createHang });
})(window);
