/*
 * More stuff, part 8: 8 pets, 8 held items, 6 face items and 6 brand new minigames.
 *   🐔 Lane Crosser · 🔤 Word Scramble · 🥁 Beat Goose · 🔃 Gravity Flip · 💡 Lights Out · 🍞 Bread Sweeper
 */
(function (root) {
  'use strict';
  const INK = '#1f2a36', T = () => performance.now() / 1000;
  // ================================================================ clothes
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const dot = (c, x, y, r, f) => { c.beginPath(); c.arc(x, y, r, 0, 7); outline(c, f, 1.6); };
    const Pt = (id, name, price, draw) => add({ id, cat: 'pet', name, price, draw(c) { c.save(); c.translate(0, Math.sin(T() * 3 + id.length) * 1.4); draw(c); c.restore(); } });
    Pt('m8_frog', 'Tiny Frog', 80, (c) => { ell(c, 0, -5, 8, 5.5, '#4cc04a', 1.8); dot(c, -3, -11, 2.6, '#4cc04a'); dot(c, 3, -11, 2.6, '#4cc04a'); dot(c, -3, -11, 1, INK); dot(c, 3, -11, 1, INK); });
    Pt('m8_cat', 'Kitten', 95, (c) => { ell(c, 0, -5, 8, 6, '#ff9a4a', 1.8); dot(c, 5, -11, 4.6, '#ff9a4a'); c.fillStyle = '#ff9a4a'; c.strokeStyle = INK; c.lineWidth = 1.4; for (const x of [3, 7.4]) { c.beginPath(); c.moveTo(x - 1.6, -14); c.lineTo(x, -18.5); c.lineTo(x + 1.6, -14); c.closePath(); c.fill(); c.stroke(); } dot(c, 6.4, -11, 0.8, INK); });
    Pt('m8_duckling', 'Rubber Duckie', 70, (c) => { ell(c, 0, -5, 8, 5.5, '#ffd23f', 1.8); dot(c, 5, -11, 4, '#ffd23f'); ell(c, 9.4, -10.4, 2.6, 1.4, '#ff8a1a', 1); dot(c, 6, -12, 0.8, INK); });
    Pt('m8_snail', 'Snail', 75, (c) => { ell(c, 0, -2.4, 9, 2.6, '#c8b090', 1.6); dot(c, -1, -7, 5.6, '#b0703a'); c.strokeStyle = '#7a4a1a'; c.lineWidth = 1; c.beginPath(); c.arc(-1, -7, 2.6, 0, 5); c.stroke(); c.strokeStyle = '#c8b090'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(8, -3); c.lineTo(10, -8); c.moveTo(6, -3); c.lineTo(7, -8); c.stroke(); });
    Pt('m8_mouse', 'Little Mouse', 70, (c) => { ell(c, 0, -5, 7, 5, '#b8b8c0', 1.8); dot(c, -4, -10, 3, '#ffb0c0'); dot(c, 1, -10, 3, '#ffb0c0'); dot(c, 6, -6, 2.4, '#b8b8c0'); dot(c, 7.6, -6.6, 0.7, INK); });
    Pt('m8_robot', 'Mini Robot', 130, (c) => { c.beginPath(); c.rect(-6, -14, 12, 10); outline(c, '#b8c2d4', 2); dot(c, -2.4, -10, 1.6, '#19d6ff'); dot(c, 2.4, -10, 1.6, '#19d6ff'); c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -14); c.lineTo(0, -18); c.stroke(); dot(c, 0, -19, 1.4, '#ff4d4d'); });
    Pt('m8_star', 'Star Buddy', 100, (c) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9; c.lineTo(Math.cos(a) * r, -11 + Math.sin(a) * r); } c.closePath(); outline(c, '#ffd23f', 1.8); dot(c, -1.6, -11, 0.8, INK); dot(c, 1.6, -11, 0.8, INK); });
    Pt('m8_cloud', 'Pocket Cloud', 85, (c) => { ell(c, -3, -9, 6, 4.5, '#f4f8ff', 1.8); ell(c, 3, -10, 6, 5, '#f4f8ff', 1.8); ell(c, 0, -7, 8, 3.6, '#f4f8ff', 1.8); });
    const Hd = (id, name, price, draw) => add({ id, cat: 'held', name, price, draw });
    Hd('m8_wand', 'Magic Wand', 90, (c) => { c.save(); c.rotate(-0.5); c.strokeStyle = '#3a2a5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -26); c.stroke(); c.fillStyle = '#ffd23f'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7; c.lineTo(Math.cos(a) * r, -30 + Math.sin(a) * r); } c.fill(); c.restore(); });
    Hd('m8_ice', 'Ice Cream', 60, (c) => { c.beginPath(); c.moveTo(-5, -10); c.lineTo(5, -10); c.lineTo(0, 4); c.closePath(); outline(c, '#e8b060', 1.8); dot(c, 0, -14, 6.4, '#ff9ac8'); dot(c, 0, -21, 4.6, '#fff'); });
    Hd('m8_lolly', 'Lollipop', 45, (c) => { c.strokeStyle = '#fff'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -16); c.stroke(); dot(c, 0, -22, 8, '#ff4d8d'); c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, -22, 4.4, 0, 5); c.stroke(); });
    Hd('m8_torch', 'Torch', 70, (c) => { c.fillStyle = '#7a4b2a'; c.fillRect(-2, -14, 4, 18); const f = Math.sin(T() * 12) * 1.5; c.beginPath(); c.moveTo(-5, -14); c.quadraticCurveTo(-6, -24 + f, 0, -30 + f); c.quadraticCurveTo(6, -24 - f, 5, -14); c.closePath(); outline(c, '#ff9a1a', 1.8); });
    Hd('m8_guitar', 'Guitar', 100, (c) => { c.save(); c.rotate(-0.5); ell(c, 0, -6, 8, 10, '#c8742a', 2); c.fillStyle = '#4a2a10'; c.fillRect(-1.6, -34, 3.2, 22); dot(c, 0, -6, 2.4, '#2a1608'); c.restore(); });
    Hd('m8_book', 'Book', 40, (c) => { c.beginPath(); c.rect(-8, -16, 16, 20); outline(c, '#3a78ff', 2); c.fillStyle = '#fff'; c.fillRect(-6, -14, 11, 3); });
    Hd('m8_net', 'Bug Net', 60, (c) => { c.strokeStyle = '#7a5230'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, 4); c.lineTo(2, -28); c.stroke(); c.beginPath(); c.arc(3, -34, 8, 0, 7); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill(); c.strokeStyle = '#444'; c.lineWidth = 1.8; c.stroke(); });
    Hd('m8_trophy', 'Trophy', 120, (c) => { c.beginPath(); c.moveTo(-8, -26); c.lineTo(8, -26); c.quadraticCurveTo(7, -12, 0, -10); c.quadraticCurveTo(-7, -12, -8, -26); outline(c, '#ffd23f', 2); c.fillStyle = '#c9a227'; c.fillRect(-1.6, -10, 3.2, 8); c.fillRect(-6, -3, 12, 4); });
    const F = (id, name, price, draw) => add({ id, cat: 'face', name, price, draw });
    F('m8_blush', 'Rosy Cheeks', 25, (c) => { ell(c, 0, 3, 3.6, 2.2, 'rgba(255,110,140,.7)', 0.1); });
    F('m8_freckles', 'Freckles', 25, (c) => { c.fillStyle = '#9a5a2a'; for (const [x, y] of [[-3, 3], [0, 4.4], [3, 3], [-1, 6.4], [2, 6]]) { c.beginPath(); c.arc(x, y, 0.8, 0, 7); c.fill(); } });
    F('m8_stache', 'Moustache', 40, (c) => { c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(-6, 0, -9, 5); c.quadraticCurveTo(-4, 6.4, 0, 5.6); c.quadraticCurveTo(4, 6.4, 9, 5); c.quadraticCurveTo(6, 0, 0, 4); outline(c, '#3a2410', 1.6); });
    F('m8_whisk', 'Whiskers', 30, (c) => { c.strokeStyle = '#222'; c.lineWidth = 1.2; for (const s of [-1, 1]) for (const a of [-0.25, 0.1, 0.45]) { c.beginPath(); c.moveTo(s * 3, 5); c.lineTo(s * 12, 5 + a * 14); c.stroke(); } });
    F('m8_paint', 'War Paint', 35, (c) => { c.strokeStyle = '#e63946'; c.lineWidth = 2.4; c.lineCap = 'round'; for (const y of [2, 5]) { c.beginPath(); c.moveTo(-4, y); c.lineTo(4, y); c.stroke(); } });
    F('m8_beard', 'Wizard Beard', 60, (c) => { c.beginPath(); c.moveTo(-6, 4); c.quadraticCurveTo(0, 26, 6, 4); c.quadraticCurveTo(0, 8, -6, 4); outline(c, '#e8e8f0', 1.8); });
  }

  // ================================================================ minigames
  const MG = root.Minigames; if (!MG) return;
  const R = () => Math.random(), clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const frame = (host, lw, lh) => { const s = Math.min(host.W / lw, host.H / lh); return { s, ox: (host.W - lw * s) / 2, oy: (host.H - lh * s) / 2 }; };
  const toL = (host, f, e) => { const r = host.ctx.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - f.ox) / f.s, y: (e.clientY - r.top - f.oy) / f.s }; };
  const onPtr = (host, type, fn) => { const cv = host.ctx.canvas, h = (e) => { if (type === 'pointerdown' && e.pointerType === 'mouse' && e.button !== 0) return; fn(e); }; cv.addEventListener(type, h); return () => cv.removeEventListener(type, h); };
  const say = (c, text, x, y, size, col) => { c.save(); c.font = '800 ' + size + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(text, x, y); c.fillStyle = col || INK; c.fillText(text, x, y); c.restore(); };
  const emo = (c, e, x, y, size) => { c.font = size + 'px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, x, y); c.textBaseline = 'alphabetic'; };
  const note = (c, s, col) => { c.fillStyle = col || INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText(s, 400, 472); };
  const box = (c, x, y, w, h, fill) => { c.fillStyle = fill; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.rect(x, y, w, h); c.fill(); c.stroke(); };

  // ------------------------------------------------------------ 🐔 Lane Crosser
  function createCross(host) {
    const c = host.ctx, S = 60, COLS = 13, ROWS = 8; let gc = 6, gr = 0, lives = 3, score = 0, left = 45, t = 0, over = false, hit = 0;
    const lanes = []; for (let r = 1; r <= 6; r++) { const dir = r % 2 ? 1 : -1, v = (70 + R() * 130) * dir, gap = 230 + R() * 200, cars = []; for (let x = R() * 200; x < COLS * S + 200; x += gap) cars.push({ x, w: 70 + R() * 40, em: ['🚗', '🚕', '🚌', '🚙', '🚚'][(R() * 5) | 0] }); lanes.push({ r, v, cars }); }
    const go = (dx, dy) => { if (over || hit > 0) return; gc = clamp(gc + dx, 0, COLS - 1); gr = clamp(gr + dy, 0, ROWS - 1); host.tone('triangle', 300, 400, 0.05, 0.08); if (gr === ROWS - 1) { score++; gr = 0; gc = 6; host.tone('sine', 700, 1100, 0.15, 0.2); } };
    const o1 = onPtr(host, 'pointerdown', (e) => { const f = frame(host, 780, 480), p = toL(host, f, e), dx = p.x - (gc * S + S / 2), dy = p.y - (480 - gr * S - S / 2); if (Math.abs(dx) > Math.abs(dy) * 1.4) go(dx > 0 ? 1 : -1, 0); else go(0, dy < 0 ? 1 : -1); });
    host.controls([{ label: '◀', side: 'L', big: true, down: () => go(-1, 0) }, { label: '▶', side: 'L', big: true, down: () => go(1, 0) }, { label: '▲', side: 'R', big: true, down: () => go(0, 1) }, { label: '▼', side: 'R', big: true, down: () => go(0, -1) }]);
    return {
      destroy() { o1(); },
      key(code, down) { const m = { ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] }[code]; if (m) { if (down) go(m[0], m[1]); return true; } return false; },
      update(dt) {
        if (over) return; t += dt; left -= dt; hit = Math.max(0, hit - dt);
        for (const l of lanes) { for (const cr of l.cars) { cr.x += l.v * dt; if (l.v > 0 && cr.x > COLS * S + 100) cr.x = -150; if (l.v < 0 && cr.x < -150) cr.x = COLS * S + 100; } }
        if (!hit && gr >= 1 && gr <= 6) { const l = lanes[gr - 1], gx = gc * S + S / 2; for (const cr of l.cars) if (Math.abs(cr.x + cr.w / 2 - gx) < cr.w / 2 + 18) { lives--; hit = 0.8; host.snd.ouch(); gr = 0; gc = 6; break; } }
        host.hud({ title: 'Lane Crosser', text: Math.ceil(left) + 's · ' + score + ' crossed · ' + '❤'.repeat(Math.max(0, lives)) });
        if (lives <= 0 || left <= 0) { over = true; host.end(score * 10, 'You crossed ' + score + ' times'); }
      },
      draw() {
        const f = frame(host, 780, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        for (let r = 0; r < ROWS; r++) { const y = 480 - (r + 1) * S; c.fillStyle = r === 0 || r === ROWS - 1 ? '#7ec850' : '#555a66'; c.fillRect(0, y, COLS * S, S); if (r > 0 && r < ROWS - 1) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.setLineDash([22, 18]); c.beginPath(); c.moveTo(0, y); c.lineTo(COLS * S, y); c.stroke(); c.setLineDash([]); } }
        emo(c, '🏁', 6 * S + S / 2, 480 - ROWS * S + S / 2, 36);
        for (const l of lanes) for (const cr of l.cars) { c.save(); c.translate(cr.x + cr.w / 2, 480 - l.r * S - S / 2); c.scale(l.v > 0 ? -1 : 1, 1); emo(c, cr.em, 0, 0, 46); c.restore(); }
        emo(c, hit > 0 ? '💥' : '🐔', gc * S + S / 2, 480 - gr * S - S / 2, 44);
        c.restore(); note(c, 'Hop across the roads to the flag! Tap the direction you want to hop, or use the arrows.');
      },
    };
  }

  // ------------------------------------------------------------ 🔤 Word Scramble
  function createWord(host) {
    const c = host.ctx, WORDS = ['GOOSE', 'BREAD', 'HONK', 'WOBBLE', 'FEATHER', 'POND', 'NECK', 'EGG', 'GOSLING', 'WINGS', 'MEADOW', 'NOODLE', 'FLAP', 'SWIM', 'TOAST', 'CRUMB', 'BEAK', 'LAKE', 'SPLASH', 'CLOUD', 'BASKET', 'GOLDEN', 'JELLY', 'TAVERN'];
    let left = 50, score = 0, word = '', tiles = [], ans = [], over = false, shake = 0, flash = 0, order = WORDS.slice().sort(() => R() - 0.5), wi = 0;
    const next = () => { word = order[wi++ % order.length]; let s; do { s = word.split('').sort(() => R() - 0.5); } while (s.join('') === word); tiles = s.map((ch, i) => ({ ch, used: false, i })); ans = []; };
    next();
    const tp = (i) => ({ x: 400 - (tiles.length * 70) / 2 + i * 70, y: 300, w: 62, h: 62 });
    const pick = (i) => { if (over || tiles[i].used) return; tiles[i].used = true; ans.push(i); host.tone('triangle', 500, 600, 0.05, 0.08); if (ans.length === word.length) { if (ans.map((k) => tiles[k].ch).join('') === word) { score += 10 + word.length; flash = 0.3; host.tone('sine', 700, 1100, 0.15, 0.2); next(); } else { shake = 0.4; left -= 2; host.snd.ouch(); tiles.forEach((t) => (t.used = false)); ans = []; } } };
    const back = () => { if (ans.length) tiles[ans.pop()].used = false; };
    const off = onPtr(host, 'pointerdown', (e) => { if (over) return; const f = frame(host, 800, 480), p = toL(host, f, e); for (let i = 0; i < tiles.length; i++) { const q = tp(i); if (p.x > q.x && p.x < q.x + q.w && p.y > q.y && p.y < q.y + q.h) { pick(i); return; } } if (p.y > 380 && p.y < 440) { if (p.x > 480) { left -= 5; next(); } else back(); } });
    return {
      destroy() { off(); },
      key(code, down) { if (!down) return false; if (code === 'Backspace') { back(); return true; } if (code.startsWith('Key')) { const ch = code.slice(3); const i = tiles.findIndex((t) => !t.used && t.ch === ch); if (i >= 0) pick(i); return true; } return false; },
      update(dt) { if (over) return; left -= dt; shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt); host.hud({ title: 'Word Scramble', text: Math.ceil(left) + 's · ' + Math.floor(score / 10) + ' words' }); if (left <= 0) { over = true; host.end(score, 'You unscrambled ' + score + ' points of words'); } },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        if (flash > 0) { c.fillStyle = 'rgba(47,191,113,' + flash + ')'; c.fillRect(0, 0, 800, 480); }
        say(c, 'Unscramble the word', 400, 70, 30, INK);
        const sx = shake ? Math.sin(shake * 60) * 8 : 0;
        for (let i = 0; i < word.length; i++) { const x = 400 - (word.length * 70) / 2 + i * 70 + sx; box(c, x, 150, 62, 62, '#fffbe8'); if (ans[i] != null) say(c, tiles[ans[i]].ch, x + 31, 196, 38, INK); }
        tiles.forEach((t, i) => { const q = tp(i); box(c, q.x, q.y, q.w, q.h, t.used ? 'rgba(0,0,0,.12)' : '#ffe9a8'); if (!t.used) say(c, t.ch, q.x + 31, q.y + 46, 38, INK); });
        box(c, 280, 390, 200, 48, '#ffd9d9'); say(c, '⌫ Undo', 380, 424, 24, INK); box(c, 500, 390, 200, 48, '#e8e8e8'); say(c, 'Skip (-5s)', 600, 424, 22, INK);
        c.restore(); note(c, 'Tap the letters (or type them) in the right order. Wrong guess costs 2 seconds.');
      },
    };
  }

  // ------------------------------------------------------------ 🥁 Beat Goose
  function createBeat(host) {
    const c = host.ctx, LX = [260, 360, 460, 560], COL = ['#e63946', '#2fbf71', '#3a86ff', '#ffd23f'], HIT = 390, SP = 300; let t = 0, notes = [], score = 0, combo = 0, best = 0, over = false, msg = '', msgT = 0, glow = [0, 0, 0, 0];
    for (let i = 0, tm = 1.5; i < 80; i++, tm += 0.4 + (R() < 0.3 ? 0.2 : 0)) { notes.push({ t: tm, l: (R() * 4) | 0, hit: false }); if (R() < 0.15) notes.push({ t: tm, l: (R() * 4) | 0, hit: false }); }
    const end = notes[notes.length - 1].t + 2;
    const press = (l) => {
      if (over) return; glow[l] = 0.15; host.tone('sine', 330 + l * 110, 330 + l * 110, 0.08, 0.12);
      let b = null, bd = 1e9; for (const n of notes) if (!n.hit && n.l === l) { const d = Math.abs(n.t - t) * SP; if (d < bd) { bd = d; b = n; } }
      if (b && bd < 70) { b.hit = true; const pf = bd < 28; score += (pf ? 3 : 1) * (1 + Math.floor(combo / 10)); combo++; best = Math.max(best, combo); msg = pf ? 'PERFECT' : 'Good'; msgT = 0.4; } else { combo = 0; msg = 'Miss'; msgT = 0.3; }
    };
    const o1 = onPtr(host, 'pointerdown', (e) => { const f = frame(host, 800, 480), p = toL(host, f, e); press(clamp(Math.floor((p.x - 210) / 100), 0, 3)); });
    return {
      destroy() { o1(); },
      key(code, down) { const m = { KeyD: 0, ArrowLeft: 0, KeyF: 1, ArrowDown: 1, KeyJ: 2, ArrowUp: 2, KeyK: 3, ArrowRight: 3 }[code]; if (m != null) { if (down) press(m); return true; } return false; },
      update(dt) {
        if (over) return; t += dt; msgT = Math.max(0, msgT - dt); glow = glow.map((g) => Math.max(0, g - dt));
        for (const n of notes) if (!n.hit && !n.gone && (t - n.t) * SP > 80) { n.gone = true; combo = 0; }
        host.hud({ title: 'Beat Goose', text: score + ' pts · combo ' + combo });
        if (t > end) { over = true; host.end(score, 'Score ' + score + ' · best combo ' + best); }
      },
      draw() {
        const f = frame(host, 800, 480); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.fillStyle = '#14142a'; c.fillRect(-400, -400, 1600, 1300);
        for (let l = 0; l < 4; l++) { c.fillStyle = 'rgba(255,255,255,' + (0.05 + glow[l] * 3) + ')'; c.fillRect(LX[l] - 48, 0, 96, 480); c.strokeStyle = COL[l]; c.lineWidth = 4; c.beginPath(); c.arc(LX[l], HIT, 30, 0, 7); c.stroke(); }
        for (const n of notes) { if (n.hit) continue; const y = HIT - (n.t - t) * SP; if (y < -40 || y > 520) continue; c.fillStyle = COL[n.l]; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(LX[n.l], y, 26, 0, 7); c.fill(); c.stroke(); emo(c, '🪿', LX[n.l], y, 26); }
        if (msgT > 0) say(c, msg, 400, 120, 40, msg === 'Miss' ? '#e63946' : '#ffd23f');
        if (t < 1.4) say(c, 'Get ready…', 400, 230, 40, '#fff');
        c.fillStyle = '#fff'; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText('Tap a lane (or keys D F J K / arrows) when a goose hits the ring.', 400, 470); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🔃 Gravity Flip
  function createFlip(host) {
    const c = host.ctx; let t = 0, side = 1, y = 400, obs = [], spawn = 1, over = false;
    const flip = () => { if (over) return; side = -side; host.tone('triangle', 300, 600, 0.08, 0.12); };
    const o1 = onPtr(host, 'pointerdown', flip); host.controls([{ label: '🔃 FLIP', side: 'R', big: true, down: flip }]);
    return {
      destroy() { o1(); },
      key(code, down) { if (code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown') { if (down) flip(); return true; } return false; },
      update(dt) {
        if (over) return; t += dt; const target = side > 0 ? 400 : 80; y += (target - y) * Math.min(1, dt * 14);
        spawn -= dt; if (spawn <= 0) { spawn = clamp(1.3 - t * 0.012, 0.55, 1.3) + R() * 0.5; obs.push({ x: 880, s: R() < 0.5 ? 1 : -1, w: 50 + R() * 40 }); if (R() < 0.25) obs.push({ x: 880 + 140, s: -1, w: 50 }); }
        const v = 320 + t * 7;
        for (let i = obs.length - 1; i >= 0; i--) { const o = obs[i]; o.x -= v * dt; if (o.x < -120) { obs.splice(i, 1); continue; } if (o.s === side && o.x < 170 + 20 && o.x + o.w > 150 - 20 && Math.abs(y - target) < 40) { over = true; host.snd.ouch(); host.end(Math.floor(t * 10), 'You lasted ' + t.toFixed(1) + ' seconds'); return; } }
        host.hud({ title: 'Gravity Flip', text: t.toFixed(1) + ' s' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.fillStyle = '#3a3a52'; c.fillRect(-400, 430, 1600, 100); c.fillRect(-400, -60, 1600, 130);
        for (const o of obs) { c.fillStyle = '#e63946'; c.strokeStyle = INK; c.lineWidth = 3; const by = o.s > 0 ? 430 : 70, dir = o.s > 0 ? -1 : 1, n = Math.max(2, Math.round(o.w / 25)); for (let i = 0; i < n; i++) { c.beginPath(); c.moveTo(o.x + i * (o.w / n), by); c.lineTo(o.x + (i + 0.5) * (o.w / n), by + dir * 42); c.lineTo(o.x + (i + 1) * (o.w / n), by); c.closePath(); c.fill(); c.stroke(); } }
        c.save(); c.translate(160, y - side * 6); c.scale(1, side); emo(c, '🪿', 0, 0, 52); c.restore();
        c.restore(); note(c, 'Tap to flip between floor and ceiling. Dodge the spikes!', '#fff');
      },
    };
  }

  // ------------------------------------------------------------ 💡 Lights Out
  function createLights(host) {
    const c = host.ctx, N = 5, S = 80; let g = new Array(25).fill(0), t = 0, moves = 0, over = false, done = 0;
    const tog = (i) => { const r = (i / N) | 0, k = i % N; for (const [dr, dk] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, kk = k + dk; if (rr >= 0 && rr < N && kk >= 0 && kk < N) g[rr * N + kk] ^= 1; } };
    do { g.fill(0); for (let i = 0; i < 12; i++) tog((R() * 25) | 0); } while (g.every((v) => !v));
    const off = onPtr(host, 'pointerdown', (e) => { if (over || done) return; const f = frame(host, 800, 480), p = toL(host, f, e), cx = Math.floor((p.x - 200) / S), cy = Math.floor((p.y - 30) / S); if (cx < 0 || cy < 0 || cx >= N || cy >= N) return; tog(cy * N + cx); moves++; host.tone('triangle', 400, 500, 0.05, 0.1); if (g.every((v) => !v)) { done = 1.2; host.tone('sine', 700, 1200, 0.3, 0.2); } });
    return {
      destroy() { off(); },
      update(dt) { if (over) return; if (done) { done -= dt; if (done <= 0) { over = true; host.end(Math.max(10, Math.round(400 - moves * 8 - t * 2)), 'Solved in ' + moves + ' moves and ' + Math.round(t) + ' s'); } return; } t += dt; host.hud({ title: 'Lights Out', text: Math.round(t) + ' s · ' + moves + ' moves' }); },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        box(c, 190, 20, N * S + 20, N * S + 20, '#2a2a3a');
        for (let i = 0; i < 25; i++) { const x = 200 + (i % N) * S, y = 30 + ((i / N) | 0) * S; c.fillStyle = g[i] ? '#ffe14a' : '#44445a'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.rect(x + 4, y + 4, S - 8, S - 8); c.fill(); c.stroke(); if (g[i]) emo(c, '💡', x + S / 2, y + S / 2, 38); }
        c.restore(); note(c, 'Tap a light to flip it and its neighbours. Turn every light off!');
      },
    };
  }

  // ------------------------------------------------------------ 🍞 Bread Sweeper
  function createSweep(host) {
    const c = host.ctx, N = 8, S = 52, MINES = 10; let mine = new Array(N * N).fill(0), seen = new Array(N * N).fill(0), flag = new Array(N * N).fill(0), placed = false, mode = 'dig', t = 0, over = false, boom = false, endT = 0;
    const nbs = (i) => { const r = (i / N) | 0, k = i % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dk = -1; dk <= 1; dk++) { if (!dr && !dk) continue; const rr = r + dr, kk = k + dk; if (rr >= 0 && rr < N && kk >= 0 && kk < N) o.push(rr * N + kk); } return o; };
    const cnt = (i) => nbs(i).reduce((a, j) => a + mine[j], 0);
    const place = (safe) => { const bad = new Set([safe, ...nbs(safe)]); let k = 0; while (k < MINES) { const i = (R() * N * N) | 0; if (!mine[i] && !bad.has(i)) { mine[i] = 1; k++; } } placed = true; };
    const reveal = (i) => { const st = [i]; while (st.length) { const j = st.pop(); if (seen[j] || flag[j]) continue; seen[j] = 1; if (!cnt(j)) for (const q of nbs(j)) if (!seen[q] && !mine[q]) st.push(q); } };
    const tap = (i) => {
      if (over) return; if (mode === 'flag') { if (!seen[i]) flag[i] ^= 1; return; } if (flag[i] || seen[i]) return; if (!placed) place(i);
      if (mine[i]) { boom = true; over = true; endT = 1.4; host.snd.ouch(); seen = seen.map((v, k) => (mine[k] ? 1 : v)); return; }
      reveal(i); host.tone('triangle', 400, 500, 0.05, 0.1); if (seen.filter((v) => v).length === N * N - MINES) { over = true; endT = 1.2; host.tone('sine', 700, 1200, 0.3, 0.2); }
    };
    const off = onPtr(host, 'pointerdown', (e) => { const f = frame(host, 800, 480), p = toL(host, f, e), cx = Math.floor((p.x - 192) / S), cy = Math.floor((p.y - 28) / S); if (cx < 0 || cy < 0 || cx >= N || cy >= N) return; tap(cy * N + cx); });
    host.controls([{ label: '⛏ DIG', side: 'L', big: true, down: () => { mode = 'dig'; } }, { label: '🚩 FLAG', side: 'R', big: true, down: () => { mode = 'flag'; } }]);
    const COLS = ['', '#2a6ad8', '#2a9a4a', '#d63a3a', '#6a2ab8', '#b8602a', '#2ab8b8', '#222', '#777'];
    return {
      destroy() { off(); },
      key(code, down) { if (code === 'KeyF' && down) { mode = mode === 'dig' ? 'flag' : 'dig'; return true; } return false; },
      update(dt) {
        if (!over) { t += dt; host.hud({ title: 'Bread Sweeper', text: Math.round(t) + ' s · ' + (mode === 'dig' ? '⛏ dig' : '🚩 flag') }); return; }
        endT -= dt; if (endT <= 0 && !this.done) { this.done = true; const won = !boom; host.end(won ? Math.max(20, Math.round(400 - t * 3)) : seen.filter((v, k) => v && !mine[k]).length * 3, won ? 'Cleared in ' + Math.round(t) + ' s!' : 'Boom! You hit burnt toast'); }
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        box(c, 184, 20, N * S + 16, N * S + 16, '#6a5a3a');
        for (let i = 0; i < N * N; i++) { const x = 192 + (i % N) * S, y = 28 + ((i / N) | 0) * S; c.fillStyle = seen[i] ? '#f6ead0' : '#a8b8a0'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.rect(x + 1, y + 1, S - 2, S - 2); c.fill(); c.stroke();
          if (seen[i]) { if (mine[i]) emo(c, '🔥', x + S / 2, y + S / 2, 32); else { const n = cnt(i); if (n) say(c, String(n), x + S / 2, y + S / 2 + 10, 28, COLS[n]); } } else if (flag[i]) emo(c, '🚩', x + S / 2, y + S / 2, 28); }
        say(c, 'Mode: ' + (mode === 'dig' ? '⛏ Dig' : '🚩 Flag'), 700, 60, 22, INK); say(c, MINES + ' burnt toasts', 700, 100, 18, INK);
        c.restore(); note(c, 'Dig up every safe square. Numbers count the burnt toast 🔥 next to them. Use FLAG to mark them.');
      },
    };
  }

  const add = (o) => MG.list.push(Object.assign({ theme: 'meadow', deco: 'farm' }, o));
  add({ id: 'm8cross', name: 'Lane Crosser', icon: '🐔', desc: 'Hop across busy roads to the flag. Three lives, 45 seconds.', theme: 'meadow', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 2), create: createCross });
  add({ id: 'm8word', name: 'Word Scramble', icon: '🔤', desc: 'Unscramble goose-y words before time runs out.', theme: 'candy', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 2), create: createWord });
  add({ id: 'm8beat', name: 'Beat Goose', icon: '🥁', desc: 'A rhythm game: tap the lane when the goose reaches the ring.', theme: 'night', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 2), create: createBeat });
  add({ id: 'm8flip', name: 'Gravity Flip', icon: '🔃', desc: 'Flip between floor and ceiling to dodge the spikes.', theme: 'space', fmt: (s) => (s / 10).toFixed(1) + ' s', reward: (s) => Math.floor(s / 4), create: createFlip });
  add({ id: 'm8lights', name: 'Lights Out', icon: '💡', desc: 'Turn off every light. Each tap flips its neighbours too.', theme: 'night', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 4), create: createLights });
  add({ id: 'm8sweep', name: 'Bread Sweeper', icon: '🍞', desc: 'Minesweeper with burnt toast. Clear the board without digging one up.', theme: 'sunset', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 4), create: createSweep });
})(window);
