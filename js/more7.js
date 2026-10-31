/*
 * More stuff, part 7: 20 skins, 15 clothes and 5 minigames.
 *   Minigames: 🐍 Goose Snake · 🧩 Slide Puzzle · 🎣 Fish Drop · 🥚 Egg Toss · 🔍 Odd One Out
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
      dots: (c, col) => { c.fillStyle = col; for (let x = -36; x < 40; x += 12) for (let y = -22; y < 26; y += 10) { c.beginPath(); c.arc(x + ((y / 10) & 1 ? 6 : 0), y, 2.2, 0, 7); c.fill(); } },
      stripes: (c, col) => { c.fillStyle = col; for (let x = -40; x < 40; x += 13) c.fillRect(x, -30, 5, 60); },
      hstripes: (c, col) => { c.fillStyle = col; for (let y = -24; y < 26; y += 10) c.fillRect(-40, y, 80, 4.5); },
      check: (c, col) => { c.fillStyle = col; for (let x = -40; x < 40; x += 9) for (let y = -24; y < 26; y += 9) if (((x / 9 + y / 9) & 1) === 0) c.fillRect(x, y, 9, 9); },
      half: (c, col) => { c.fillStyle = col; c.fillRect(-40, 0, 80, 30); },
      zig: (c, col) => { c.strokeStyle = col; c.lineWidth = 2.2; for (let y = -16; y < 24; y += 10) { c.beginPath(); for (let x = -40; x <= 40; x += 8) { const yy = y + ((x / 8) & 1 ? 4 : -4); x === -40 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); } },
      none: () => {},
    };
    const T = [
      ['m7_pizza', 'Pizza Goose', 420, '#f4c26a', '#e0a040', '#c8402a', 'dots', '#d6342a'], ['m7_donut', 'Donut Goose', 440, '#e8a8d0', '#c870a8', '#7a4a2a', 'dots', '#fff'],
      ['m7_watermelon', 'Watermelon Goose', 420, '#e8505a', '#2fa04a', '#2fa04a', 'half', '#2fa04a'], ['m7_blueberry', 'Blueberry Goose', 380, '#4a5ac8', '#3a4aa8', '#2a3a88', 'dots', '#8a9aff'],
      ['m7_lemonade', 'Lemonade Goose', 380, '#fff3a0', '#ffe14a', '#ffb02a', 'hstripes', '#fff'], ['m7_cookie', 'Cookie Goose', 400, '#d9a45a', '#b8803a', '#7a4a1a', 'dots', '#5a3010'],
      ['m7_zebrapink', 'Pink Zebra Goose', 420, '#ffd0e8', '#ffb0d6', '#e8508a', 'stripes', '#e8508a'], ['m7_navy', 'Sailor Goose', 400, '#ffffff', '#3a5a9a', '#e8503a', 'hstripes', '#2a4a8a'],
      ['m7_argyle', 'Argyle Goose', 420, '#5a8a6a', '#3a6a4a', '#c8a02a', 'check', 'rgba(255,255,255,.25)'], ['m7_zigzag', 'Zigzag Goose', 400, '#ffe14a', '#ffc81a', '#222', 'zig', '#e8503a'],
      ['m7_ink', 'Inky Goose', 340, '#1a1a22', '#2a2a36', '#e8e8f0', 'none', ''], ['m7_cream', 'Cream Goose', 300, '#fff4dc', '#f2e0b8', '#d99a3a', 'none', ''],
      ['m7_teal', 'Teal Goose', 300, '#2ab8b0', '#1a9890', '#ffd23f', 'none', ''], ['m7_coral', 'Coral Goose', 300, '#ff7a6a', '#e85a4a', '#ffd23f', 'none', ''],
      ['m7_lilac', 'Lilac Goose', 300, '#c8a8f0', '#a888d8', '#ff9b2f', 'none', ''], ['m7_olive', 'Olive Goose', 300, '#8a9a3a', '#6a7a2a', '#c8a02a', 'none', ''],
      ['m7_dalmatian', 'Dalmatian Goose', 440, '#ffffff', '#eeeeee', '#222', 'dots', '#1a1a1a'], ['m7_fire', 'Ember Goose', 520, '#ff5a1a', '#d93a0a', '#ffd23f', 'zig', '#ffd23f'],
      ['m7_frost', 'Frost Goose', 520, '#d8f0ff', '#a8d8f5', '#5aa8e0', 'zig', '#ffffff'], ['m7_disco', 'Disco Goose', 620, '#b8b8c8', '#9898a8', '#ffd23f', 'check', 'rgba(255,255,255,.7)'],
    ];
    for (const [id, name, price, body, wing, legC, pat, col] of T) add({ id, name, price, body, wing, neckC: body, headC: body, legC, bodyDeco(c) { clip(c, () => (P[pat] || P.none)(c, col)); } });
  }

  // ================================================================ clothes
  const C = root.Clothes;
  if (C) {
    const { outline, ell } = C.H;
    const add = (o) => { C.ITEMS.push(o); C.BY_ID[o.id] = o; };
    const poly = (c, pts, fill, lw) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); outline(c, fill, lw || 2.4); };
    add({ id: 'm7_tophat', cat: 'hat', name: 'Top Hat', price: 85, draw(c) { ell(c, 0, -7, 15, 3.4, '#222', 2.2); c.beginPath(); c.rect(-9, -26, 18, 19); outline(c, '#2a2a32', 2.4); c.fillStyle = '#c9a227'; c.fillRect(-9, -12, 18, 3.4); } });
    add({ id: 'm7_beanie', cat: 'hat', name: 'Beanie', price: 40, draw(c) { c.beginPath(); c.arc(0, -4, 10.5, Math.PI, 0); c.closePath(); outline(c, '#e8503a'); c.fillStyle = '#fff'; c.fillRect(-10.5, -6, 21, 4); c.beginPath(); c.arc(0, -16, 3.4, 0, 7); outline(c, '#fff', 2); } });
    add({ id: 'm7_santa', cat: 'hat', name: 'Santa Hat', price: 60, draw(c) { poly(c, [[-10, -6], [10, -6], [4, -26], [-6, -20]], '#d6192b'); ell(c, 0, -6, 12, 3.4, '#fff', 2); c.beginPath(); c.arc(-5, -22, 3.4, 0, 7); outline(c, '#fff', 2); } });
    add({ id: 'm7_witch', cat: 'hat', name: 'Witch Hat', price: 75, draw(c) { ell(c, 0, -6, 16, 3.4, '#3a2a5a', 2.2); poly(c, [[-9, -7], [9, -7], [2, -34], [-3, -27]], '#4a3a6a'); c.fillStyle = '#ffd23f'; c.fillRect(-9, -12, 18, 3); } });
    add({ id: 'm7_catears', cat: 'hat', name: 'Cat Ears', price: 50, draw(c) { for (const s of [-1, 1]) poly(c, [[s * 3, -8], [s * 9, -8], [s * 8, -19]], '#444', 2.2); } });
    add({ id: 'm7_pizzahat', cat: 'hat', name: 'Pizza Slice Hat', price: 55, draw(c) { poly(c, [[-11, -8], [11, -8], [0, -28]], '#f4c26a', 2.4); c.fillStyle = '#d6342a'; for (const [x, y] of [[-3, -14], [3, -19], [1, -11]]) { c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill(); } } });
    add({ id: 'm7_cone', cat: 'hat', name: 'Traffic Cone', price: 45, draw(c) { poly(c, [[-9, -7], [9, -7], [3, -27], [-3, -27]], '#ff7a1a', 2.4); c.fillStyle = '#fff'; c.fillRect(-6, -17, 12, 4); } });
    add({ id: 'm7_phones', cat: 'hat', name: 'Headphones', price: 65, draw(c) { c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.arc(0, -4, 12, Math.PI, 0); c.stroke(); c.strokeStyle = '#ff4d8d'; c.lineWidth = 2; c.beginPath(); c.arc(0, -4, 12, Math.PI, 0); c.stroke(); for (const s of [-1, 1]) ell(c, s * 12, -3, 3.6, 5.5, '#ff4d8d', 2); } });
    add({ id: 'm7_goggles', cat: 'eyes', name: 'Pilot Goggles', price: 55, draw(c) { c.beginPath(); c.arc(0, 0, 6.5, 0, 7); c.fillStyle = 'rgba(160,220,255,.45)'; c.fill(); c.strokeStyle = '#8a5a2a'; c.lineWidth = 3; c.stroke(); } });
    add({ id: 'm7_patch', cat: 'eyes', name: 'Eye Patch', price: 35, draw(c) { ell(c, 0, 0, 6, 5.5, '#1a1a22', 2); c.strokeStyle = '#1a1a22'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -2); c.lineTo(-14, -8); c.stroke(); } });
    add({ id: 'm7_nerd', cat: 'eyes', name: 'Nerd Glasses', price: 40, draw(c) { c.beginPath(); c.rect(-7, -5, 14, 10); c.fillStyle = 'rgba(255,255,255,.4)'; c.fill(); c.strokeStyle = '#1a1a22'; c.lineWidth = 2.6; c.stroke(); } });
    add({ id: 'm7_pearls', cat: 'neck', name: 'Pearl Necklace', price: 85, draw(c) { for (let i = 0; i < 7; i++) { const a = i / 6; c.beginPath(); c.arc(-6 + a * 12, -4 + Math.sin(a * Math.PI) * 9, 2.4, 0, 7); outline(c, '#fff', 1.6); } } });
    add({ id: 'm7_tie', cat: 'neck', name: 'Necktie', price: 40, draw(c) { poly(c, [[-3, -5], [3, -5], [2, -1]], '#2a4a9a', 1.8); poly(c, [[-2, -1], [2, -1], [4, 12], [0, 15], [-4, 12]], '#2a4a9a', 2); } });
    add({ id: 'm7_ballet', cat: 'shoes', name: 'Ballet Shoes', price: 45, draw(c) { ell(c, 4, 1, 11, 4.4, '#ffc8dc', 2.2); } });
    add({ id: 'm7_flipflop', cat: 'shoes', name: 'Flip-Flops', price: 30, draw(c) { ell(c, 4, 3, 12, 3, '#19b8d6', 2); c.strokeStyle = '#ffd23f'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(4, 0); c.lineTo(0, -4); c.moveTo(4, 0); c.lineTo(9, -4); c.stroke(); } });
  }

  // ================================================================ minigames
  const MG = root.Minigames; if (!MG) return;
  const R = () => Math.random(), clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const frame = (host, lw, lh) => { const s = Math.min(host.W / lw, host.H / lh); return { s, ox: (host.W - lw * s) / 2, oy: (host.H - lh * s) / 2 }; };
  const toL = (host, f, e) => { const r = host.ctx.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - f.ox) / f.s, y: (e.clientY - r.top - f.oy) / f.s }; };
  const onPtr = (host, type, fn) => { const cv = host.ctx.canvas, h = (e) => { if (type === 'pointerdown' && e.pointerType === 'mouse' && e.button !== 0) return; fn(e); }; cv.addEventListener(type, h); return () => cv.removeEventListener(type, h); };
  const say = (c, text, x, y, size, col) => { c.save(); c.font = '800 ' + size + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(text, x, y); c.fillStyle = col || INK; c.fillText(text, x, y); c.restore(); };
  const emo = (c, e, x, y, size) => { c.font = size + 'px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, x, y); c.textBaseline = 'alphabetic'; };
  const note = (c, s) => { c.fillStyle = INK; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText(s, 400, 470); };

  // ------------------------------------------------------------ 🐍 Goose Snake
  function createSnake(host) {
    const c = host.ctx, CW = 20, CH = 11, S = 40; let body = [[5, 5], [4, 5], [3, 5]], dir = [1, 0], q = [], food = null, t = 0, step = 0.2, acc = 0, score = 0, over = false, sx = 0, sy = 0;
    const place = () => { do { food = [(R() * CW) | 0, (R() * CH) | 0]; } while (body.some((b) => b[0] === food[0] && b[1] === food[1])); }; place();
    const turn = (d) => { const last = q.length ? q[q.length - 1] : dir; if (d[0] === -last[0] && d[1] === -last[1]) return; if (d[0] === last[0] && d[1] === last[1]) return; if (q.length < 3) q.push(d); };
    const o1 = onPtr(host, 'pointerdown', (e) => { sx = e.clientX; sy = e.clientY; const f = frame(host, 800, 480), p = toL(host, f, e), h = body[0]; const dx = p.x - (h[0] * S + S / 2), dy = p.y - 20 - (h[1] * S + S / 2); if (Math.abs(dx) > Math.abs(dy)) turn([dx > 0 ? 1 : -1, 0]); else turn([0, dy > 0 ? 1 : -1]); });
    return {
      destroy() { o1(); },
      key(code, down) { const m = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] }; if (m[code]) { if (down) turn(m[code]); return true; } return false; },
      update(dt) {
        if (over) return; t += dt; acc += dt;
        while (acc >= step && !over) {
          acc -= step; if (q.length) dir = q.shift(); const h = [body[0][0] + dir[0], body[0][1] + dir[1]];
          if (h[0] < 0 || h[1] < 0 || h[0] >= CW || h[1] >= CH || body.some((b, i) => i < body.length - 1 && b[0] === h[0] && b[1] === h[1])) { over = true; host.snd.ouch(); host.end(score, 'Your snake got ' + score + ' bread'); break; }
          body.unshift(h); if (h[0] === food[0] && h[1] === food[1]) { score++; step = Math.max(0.08, step - 0.005); place(); host.tone('triangle', 500, 800, 0.08, 0.12); } else body.pop();
        }
        host.hud({ title: 'Goose Snake', text: score + ' bread' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy + 20); c.scale(f.s, f.s);
        c.fillStyle = 'rgba(60,120,50,.55)'; c.fillRect(0, 0, 800, 440); for (let x = 0; x < CW; x++) for (let y = 0; y < CH; y++) if ((x + y) & 1) { c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x * S, y * S, S, S); }
        emo(c, '🍞', food[0] * S + S / 2, food[1] * S + S / 2, 32);
        body.forEach((b, i) => { c.fillStyle = i === 0 ? '#fff' : i % 2 ? '#f1f1f1' : '#e0e0e0'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(b[0] * S + S / 2, b[1] * S + S / 2, i === 0 ? 18 : 15, 0, 7); c.fill(); c.stroke(); });
        const h = body[0]; c.fillStyle = '#ff9b2f'; c.beginPath(); c.arc(h[0] * S + S / 2 + dir[0] * 14, h[1] * S + S / 2 + dir[1] * 14, 6, 0, 7); c.fill(); c.fillStyle = INK; c.beginPath(); c.arc(h[0] * S + S / 2 + dir[1] * 6 - dir[0] * 2, h[1] * S + S / 2 - dir[0] * 6 - dir[1] * 2, 2.4, 0, 7); c.fill();
        c.restore(); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s); note(c, 'Tap the side you want to turn to (or arrow keys). Eat bread, avoid walls and yourself.'); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🧩 Slide Puzzle
  function createSlide(host) {
    const c = host.ctx; let tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0], t = 0, moves = 0, over = false, done = 0;
    const blank = () => tiles.indexOf(0), nb = (i) => { const r = (i / 3) | 0, k = i % 3, o = []; if (r > 0) o.push(i - 3); if (r < 2) o.push(i + 3); if (k > 0) o.push(i - 1); if (k < 2) o.push(i + 1); return o; };
    let prev = -1; for (let i = 0; i < 80; i++) { const b = blank(), o = nb(b).filter((x) => x !== prev), m = o[(R() * o.length) | 0]; tiles[b] = tiles[m]; tiles[m] = 0; prev = b; }
    const solved = () => tiles.every((v, i) => v === (i === 8 ? 0 : i + 1));
    const slide = (i) => { if (over || done) return; const b = blank(); if (!nb(b).includes(i)) return; tiles[b] = tiles[i]; tiles[i] = 0; moves++; host.tone('triangle', 400, 500, 0.06, 0.1); if (solved()) { done = 1.2; host.tone('sine', 700, 1200, 0.3, 0.2); } };
    const pos = (i) => ({ x: 250 + (i % 3) * 100, y: 100 + ((i / 3) | 0) * 100 });
    const o1 = onPtr(host, 'pointerdown', (e) => { const f = frame(host, 800, 480), p = toL(host, f, e); for (let i = 0; i < 9; i++) { const q = pos(i); if (p.x > q.x && p.x < q.x + 96 && p.y > q.y && p.y < q.y + 96) slide(i); } });
    return {
      destroy() { o1(); },
      update(dt) {
        if (over) return; if (done) { done -= dt; if (done <= 0) { over = true; const sc = Math.max(10, Math.round(400 - t * 3 - moves * 2)); host.end(sc, 'Solved in ' + moves + ' moves and ' + Math.round(t) + ' s'); } return; }
        t += dt; host.hud({ title: 'Slide Puzzle', text: Math.round(t) + ' s · ' + moves + ' moves' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.fillStyle = '#7a5230'; c.fillRect(240, 90, 320, 320);
        tiles.forEach((v, i) => { if (!v) return; const p = pos(i); c.fillStyle = '#ffe9a8'; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.rect(p.x, p.y, 96, 96); c.fill(); c.stroke(); emo(c, ['', '🍞', '🥚', '🪿', '🌽', '🍎', '🥕', '🧀', '🍇'][v], p.x + 48, p.y + 36, 36); say(c, String(v), p.x + 48, p.y + 84, 24, INK); });
        say(c, done ? '🎉 Solved!' : 'Put them in order 1 to 8', 400, 60, 30, INK); note(c, 'Tap a tile next to the gap to slide it. Fewer moves and less time = more points.'); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🎣 Fish Drop
  function createFish(host) {
    const c = host.ctx; let t = 0, hx = 400, hv = 220, drop = null, fish = [], spawn = 0, casts = 8, score = 0, over = false, msg = '', msgT = 0;
    const FY = [210, 280, 350, 410], PTS = [1, 2, 4, 8];
    const go = () => { if (over || drop || casts <= 0) return; drop = { x: hx, y: 90, v: 0, up: false, got: null }; casts--; host.tone('triangle', 300, 200, 0.12, 0.12); };
    const o1 = onPtr(host, 'pointerdown', go); host.controls([{ label: '🎣 DROP', side: 'R', big: true, down: go }]);
    return {
      destroy() { o1(); },
      key(code, down) { if (code === 'Space' || code === 'Enter') { if (down) go(); return true; } return false; },
      update(dt) {
        if (over) return; t += dt; msgT = Math.max(0, msgT - dt);
        if (!drop) { hx += hv * dt; if (hx > 760) { hx = 760; hv = -Math.abs(hv); } if (hx < 40) { hx = 40; hv = Math.abs(hv); } }
        spawn -= dt; if (spawn <= 0) { spawn = 0.5; const lane = (R() * 4) | 0, dir = R() < 0.5 ? 1 : -1; fish.push({ x: dir > 0 ? -40 : 840, y: FY[lane], lane, vx: dir * (90 + R() * 90 + lane * 20), em: ['🐟', '🐠', '🐡', '🦈'][lane] }); }
        for (let i = fish.length - 1; i >= 0; i--) { const q = fish[i]; q.x += q.vx * dt; if (q.x < -80 || q.x > 880) fish.splice(i, 1); }
        if (drop) {
          if (!drop.up) { drop.y += 380 * dt; for (let i = 0; i < fish.length; i++) { const q = fish[i]; if (Math.abs(q.x - drop.x) < 34 && Math.abs(q.y - drop.y) < 26) { drop.got = q; drop.up = true; fish.splice(i, 1); break; } } if (drop.y > 450) drop.up = true; }
          else { drop.y -= 520 * dt; if (drop.y <= 90) { if (drop.got) { const p = PTS[drop.got.lane]; score += p; msg = '+' + p + ' ' + drop.got.em; msgT = 1; host.tone('sine', 700, 1100, 0.15, 0.2); } else { msg = 'Missed!'; msgT = 0.6; } drop = null; if (casts <= 0) { over = true; host.end(score, 'You caught ' + score + ' points of fish'); } } }
        }
        host.hud({ title: 'Fish Drop', text: casts + ' casts left · ' + score + ' pts' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        const g = c.createLinearGradient(0, 120, 0, 480); g.addColorStop(0, '#6ad0ff'); g.addColorStop(1, '#1a5a9a'); c.fillStyle = g; c.fillRect(-400, 130, 1600, 400);
        for (const q of fish) { c.save(); c.translate(q.x, q.y); c.scale(q.vx > 0 ? -1 : 1, 1); emo(c, q.em, 0, 0, 40); c.restore(); }
        emo(c, '🪿', drop ? drop.x : hx, 70, 44); const lx = drop ? drop.x : hx, ly = drop ? drop.y : 100; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, 90); c.lineTo(lx, ly); c.stroke(); emo(c, drop && drop.got ? drop.got.em : '🪝', lx, ly + 8, 28);
        if (msgT > 0) say(c, msg, 400, 140, 40, '#fff');
        note(c, 'Tap to drop the hook. Deeper fish are worth more (1, 2, 4, 8). Eight casts.'); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🥚 Egg Toss
  function createToss(host) {
    const c = host.ctx; let t = 0, stage = 'power', pw = 0, pdir = 1, throws = 6, score = 0, egg = null, target = 400 + R() * 300, msg = '', msgT = 0, over = false, wind = (R() - 0.5) * 120;
    const act = () => { if (over || egg) return; if (stage === 'power') { egg = { x: 90, y: 360, vx: 140 + pw * 640, vy: -(260 + pw * 380), done: false }; throws--; stage = 'fly'; host.tone('triangle', 300, 600, 0.15, 0.15); } };
    const o1 = onPtr(host, 'pointerdown', act); host.controls([{ label: '🥚 THROW', side: 'R', big: true, down: act }]);
    return {
      destroy() { o1(); },
      key(code, down) { if (code === 'Space' || code === 'Enter') { if (down) act(); return true; } return false; },
      update(dt) {
        if (over) return; t += dt; msgT = Math.max(0, msgT - dt);
        if (stage === 'power') { pw += pdir * dt * 1.1; if (pw > 1) { pw = 1; pdir = -1; } if (pw < 0) { pw = 0; pdir = 1; } }
        if (egg && !egg.done) { egg.vy += 700 * dt; egg.vx += wind * dt * 0.3; egg.x += egg.vx * dt; egg.y += egg.vy * dt; if (egg.y >= 400 && egg.vy > 0) { egg.done = true; const d = Math.abs(egg.x - target), pts = d < 25 ? 10 : d < 60 ? 6 : d < 110 ? 3 : d < 180 ? 1 : 0; score += pts; msg = pts ? '+' + pts : 'Splat!'; msgT = 1.2; host.tone(pts ? 'sine' : 'square', pts ? 800 : 150, pts ? 1200 : 100, 0.2, 0.18); setTimeout(() => { if (throws <= 0) { over = true; host.end(score, 'Egg toss score ' + score); } else { egg = null; stage = 'power'; target = 380 + R() * 340; wind = (R() - 0.5) * 120; } }, 900); } }
        host.hud({ title: 'Egg Toss', text: throws + ' throws left · ' + score + ' pts' });
      },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        c.fillStyle = '#6aa84a'; c.fillRect(-400, 400, 1600, 200); emo(c, '🪿', 70, 372, 56);
        emo(c, '🧺', target, 384, 70); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(target - 25, 398, 50, 6);
        if (egg) emo(c, '🥚', egg.x, egg.y, 28);
        if (stage === 'power') { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(250, 440, 300, 16); c.fillStyle = 'hsl(' + (120 - pw * 120) + ',80%,50%)'; c.fillRect(250, 440, 300 * pw, 16); c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(250, 440, 300, 16); }
        say(c, 'Wind ' + (wind > 0 ? '→' : '←') + ' ' + Math.abs(Math.round(wind / 10)), 700, 50, 22, INK);
        if (msgT > 0) say(c, msg, 400, 150, 54, '#e63946');
        note(c, 'Tap to throw: the power bar decides how far. Land in the basket. Wind pushes the egg!'); c.restore();
      },
    };
  }

  // ------------------------------------------------------------ 🔍 Odd One Out
  function createOdd(host) {
    const c = host.ctx, SETS = [['🍎', '🍅'], ['😀', '🙂'], ['🐶', '🐕'], ['🍞', '🥖'], ['🌕', '🌝'], ['⭐', '🌟'], ['🔴', '🟠'], ['🦆', '🐤']]; let left = 30, score = 0, n = 3, set = SETS[0], odd = 0, over = false, flash = 0, good = true;
    const make = () => { n = Math.min(7, 3 + ((score / 4) | 0)); set = SETS[(R() * SETS.length) | 0]; if (R() < 0.5) set = [set[1], set[0]]; odd = (R() * n * n) | 0; };
    make();
    const cell = () => Math.min(80, 360 / n);
    const o1 = onPtr(host, 'pointerdown', (e) => { if (over) return; const f = frame(host, 800, 480), p = toL(host, f, e), s = cell(), x0 = 400 - (n * s) / 2, y0 = 80, cx = Math.floor((p.x - x0) / s), cy = Math.floor((p.y - y0) / s); if (cx < 0 || cy < 0 || cx >= n || cy >= n) return; if (cy * n + cx === odd) { score++; good = true; host.tone('triangle', 600, 900, 0.1, 0.15); make(); } else { good = false; left -= 3; host.snd.ouch(); } flash = 0.25; });
    return {
      destroy() { o1(); },
      update(dt) { if (over) return; left -= dt; flash = Math.max(0, flash - dt); host.hud({ title: 'Odd One Out', text: Math.ceil(left) + 's · ' + score + ' found' }); if (left <= 0) { over = true; host.end(score * 5, 'You spotted ' + score); } },
      draw() {
        const f = frame(host, 800, 480); host.drawSky(0, 0); c.save(); c.translate(f.ox, f.oy); c.scale(f.s, f.s);
        if (flash > 0) { c.fillStyle = (good ? 'rgba(47,191,113,' : 'rgba(230,57,70,') + flash * 0.6 + ')'; c.fillRect(0, 0, 800, 480); }
        const s = cell(), x0 = 400 - (n * s) / 2; c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(x0 - 8, 72, n * s + 16, n * s + 16);
        for (let i = 0; i < n * n; i++) emo(c, i === odd ? set[1] : set[0], x0 + (i % n) * s + s / 2, 80 + ((i / n) | 0) * s + s / 2, s * 0.7);
        note(c, 'One of them is different. Tap it! Wrong taps cost 3 seconds.'); c.restore();
      },
    };
  }

  const add = (o) => MG.list.push(Object.assign({ theme: 'meadow', deco: 'farm' }, o));
  add({ id: 'm7slide', name: 'Slide Puzzle', icon: '🧩', desc: 'Slide the tiles into order using as few moves as you can.', theme: 'candy', fmt: (s) => s + ' pts', reward: (s) => Math.floor(s / 4), create: createSlide });
  add({ id: 'm7fish', name: 'Fish Drop', icon: '🎣', desc: 'Time your hook to catch fish. The deep ones are worth the most.', theme: 'ocean', fmt: (s) => s + ' pts', reward: (s) => s * 2, create: createFish });
  add({ id: 'm7toss', name: 'Egg Toss', icon: '🥚', desc: 'Throw eggs into the basket. Mind the wind.', theme: 'sky', fmt: (s) => s + ' pts', reward: (s) => s * 2, create: createToss });
  add({ id: 'm7odd', name: 'Odd One Out', icon: '🔍', desc: 'Spot the one that is different before time runs out.', theme: 'night', fmt: (s) => s + ' pts', reward: (s) => s, create: createOdd });
})(window);
