/*
 * Wobble City minigames. Each entry: { id, name, icon, desc, fmt(score), reward(score), create(host) -> instance }
 * instance: { update(dt), draw(), key?(code, down, ev), destroy?(), goose?, cam?() }
 * `host` is provided by game.js (canvas context, input, sounds, goose drawing, HUD and controls).
 */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const INK = '#1f2a36';

  function mulberry(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function makeWorld(host, x, y) {
    const P = host.Physics;
    const world = new P.World();
    const goose = new P.Goose(world, x, y, host.gooseOpts());
    const box = (bx, by, w, h, o) => { const s = { x: bx, y: by, w, h, vx: 0, vy: 0 }; if (o) Object.assign(s, o); world.solids.push(s); return s; };
    return { world, goose, box };
  }

  // drive the goose from the shared input; returns what happened
  function steer(host, goose, world, dt) {
    const inp = host.readInput();
    if (inp.flap && goose.stamina >= 1 && goose.flapCd <= 0) host.snd.flap();
    if (inp.honk) { goose.honk(); host.snd.honk(); }
    goose.update(dt, { move: inp.move, flap: inp.flap, glide: inp.glide, aim: inp.aim });
    world.step(dt);
    return inp;
  }

  const fmtPts = (s) => s + ' pts';

  // ======================================================================== GOOSE TETRIS
  const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  };
  const COLORS = { I: '#4aa3ff', O: '#ffd23f', T: '#b57aff', S: '#7ad862', Z: '#ff5c6c', J: '#3a78ff', L: '#ff9b2f' };
  const rotCW = (m) => { const n = m.length; return m.map((_, i) => m.map((__, j) => m[n - 1 - j][i])); };

  function createTetris(host) {
    const COLS = 10, ROWS = 20;
    const ctx = host.ctx;
    const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    let bag = [], cur = null, next = null, score = 0, lines = 0, level = 0, over = false;
    let dropT = 0, honkT = 0, lockT = 0;
    const held = { left: 0, right: 0, down: 0 };       // seconds held, 0 = not held
    const rep = { left: 0, right: 0 };

    function draw7() { if (!bag.length) { bag = Object.keys(SHAPES); for (let i = bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [bag[i], bag[j]] = [bag[j], bag[i]]; } } return bag.pop(); }
    function spawn() {
      const type = next || draw7();
      next = draw7();
      cur = { type, m: SHAPES[type].map((r) => r.slice()), x: Math.floor((COLS - SHAPES[type][0].length) / 2), y: type === 'I' ? -1 : 0 };
      if (hit(cur.m, cur.x, cur.y)) { over = true; host.end(score, 'Score ' + score + ' · Lines ' + lines); }
    }
    function hit(m, x, y) {
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const gx = x + c, gy = y + r;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && grid[gy][gx]) return true;
      }
      return false;
    }
    function move(dx) { if (!cur || over) return false; if (!hit(cur.m, cur.x + dx, cur.y)) { cur.x += dx; return true; } return false; }
    function rotate() {
      if (!cur || over) return;
      const m = rotCW(cur.m);
      for (const k of [0, -1, 1, -2, 2]) if (!hit(m, cur.x + k, cur.y)) { cur.m = m; cur.x += k; host.snd.tick(); return; }
    }
    function lock() {
      for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m[r].length; c++) {
        if (cur.m[r][c] && cur.y + r >= 0) grid[cur.y + r][cur.x + c] = cur.type;
      }
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r].every((v) => v)) { grid.splice(r, 1); grid.unshift(new Array(COLS).fill(null)); cleared++; r++; }
      }
      if (cleared) {
        lines += cleared; score += [0, 100, 300, 500, 800][cleared] * (level + 1);
        level = Math.floor(lines / 10);
        honkT = 0.8; host.snd.honk();
      } else host.snd.tick();
      spawn();
    }
    function softStep() { if (!move2(0, 1)) { lock(); return false; } return true; }
    function move2(dx, dy) { if (!hit(cur.m, cur.x + dx, cur.y + dy)) { cur.x += dx; cur.y += dy; return true; } return false; }
    function hardDrop() { if (!cur || over) return; let n = 0; while (move2(0, 1)) n++; score += n * 2; lock(); dropT = 0; }
    const interval = () => Math.max(0.07, 0.85 * Math.pow(0.84, level));

    spawn();
    host.controls([
      { label: '◀', side: 'L', down: () => { held.left = 0.0001; move(-1); rep.left = 0; }, up: () => { held.left = 0; } },
      { label: '▶', side: 'L', down: () => { held.right = 0.0001; move(1); rep.right = 0; }, up: () => { held.right = 0; } },
      { label: '▼', side: 'R', down: () => { held.down = 0.0001; }, up: () => { held.down = 0; } },
      { label: '⟳', side: 'R', down: () => rotate() },
      { label: 'DROP', side: 'R', big: true, down: () => hardDrop() },
    ]);

    return {
      key(code, down) {
        if (code === 'ArrowLeft' || code === 'KeyA') { if (down) { if (!held.left) { move(-1); rep.left = 0; } held.left = held.left || 0.0001; } else held.left = 0; return true; }
        if (code === 'ArrowRight' || code === 'KeyD') { if (down) { if (!held.right) { move(1); rep.right = 0; } held.right = held.right || 0.0001; } else held.right = 0; return true; }
        if (code === 'ArrowDown' || code === 'KeyS') { held.down = down ? (held.down || 0.0001) : 0; return true; }
        if (code === 'ArrowUp' || code === 'KeyW' || code === 'KeyX') { if (down) rotate(); return true; }
        if (code === 'Space') { if (down) hardDrop(); return true; }
        return false;
      },
      update(dt) {
        if (over) return;
        honkT = Math.max(0, honkT - dt);
        for (const k of ['left', 'right']) {
          if (held[k]) { held[k] += dt; if (held[k] > 0.17) { rep[k] += dt; while (rep[k] > 0.055) { rep[k] -= 0.055; move(k === 'left' ? -1 : 1); } } }
        }
        dropT += dt;
        const iv = held.down ? 0.045 : interval();
        while (dropT >= iv && !over) { dropT -= iv; if (held.down) score += 1; softStep(); }
        host.hud({ title: 'Goose Tetris', text: 'Score ' + score + ' · Lines ' + lines + ' · Lv ' + (level + 1) });
      },
      draw() {
        const W = host.W, H = host.H;
        host.drawSky(0, 0);
        const cell = Math.max(10, Math.min(Math.floor((H - 70) / ROWS), Math.floor(W / 15)));
        const bw = cell * COLS, bh = cell * ROWS;
        const bx = Math.round((W - bw) / 2), by = H - bh - 10;
        ctx.fillStyle = 'rgba(255,248,234,.92)'; ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = 'rgba(31,42,54,.12)'; ctx.lineWidth = 1;
        for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(bx + i * cell, by); ctx.lineTo(bx + i * cell, by + bh); ctx.stroke(); }
        for (let i = 1; i < ROWS; i++) { ctx.beginPath(); ctx.moveTo(bx, by + i * cell); ctx.lineTo(bx + bw, by + i * cell); ctx.stroke(); }
        const block = (x, y, type, a) => {
          const px = bx + x * cell, py = by + y * cell;
          ctx.globalAlpha = a == null ? 1 : a;
          ctx.fillStyle = COLORS[type]; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, cell / 10);
          host.roundRect(px + 1, py + 1, cell - 2, cell - 2, cell * 0.22); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(px + cell * 0.36, py + cell * 0.34, cell * 0.2, cell * 0.1, -0.5, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
        };
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) block(c, r, grid[r][c]);
        if (cur && !over) {
          let gy = cur.y; while (!hit(cur.m, cur.x, gy + 1)) gy++;
          for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m[r].length; c++) if (cur.m[r][c] && gy + r >= 0) block(cur.x + c, gy + r, cur.type, 0.22);
          for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m[r].length; c++) if (cur.m[r][c] && cur.y + r >= 0) block(cur.x + c, cur.y + r, cur.type);
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
        // next piece
        const nx = bx + bw + 16;
        ctx.fillStyle = 'rgba(255,255,255,.85)'; host.roundRect(nx, by, cell * 4.6, cell * 3.6, 10); ctx.fill();
        ctx.fillStyle = INK; ctx.font = '800 ' + Math.max(11, cell * 0.7) + 'px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('NEXT', nx + 8, by + cell * 0.9);
        if (next) {
          const m = SHAPES[next], off = (4 - m[0].length) / 2;
          for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) {
            ctx.fillStyle = COLORS[next]; ctx.strokeStyle = INK; ctx.lineWidth = 2;
            host.roundRect(nx + cell * (0.3 + off + c), by + cell * (1.2 + r * 1), cell - 3, cell - 3, 4); ctx.fill(); ctx.stroke();
          }
        }
        // the goose cheering from the left
        const gx = bx - cell * 3.2, gyy = by + bh - cell * 1.2;
        ctx.save(); ctx.translate(gx, gyy - (honkT > 0 ? Math.abs(Math.sin(honkT * 14)) * 14 : 0));
        ctx.font = Math.floor(cell * 2.6) + 'px serif'; ctx.textAlign = 'center'; ctx.fillText('🪿', 0, 0);
        ctx.restore();
        if (honkT > 0) {
          ctx.save(); ctx.globalAlpha = Math.min(1, honkT * 2); ctx.fillStyle = '#e63946'; ctx.font = '800 ' + Math.floor(cell * 1.3) + 'px system-ui, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('HONK!', gx, gyy - cell * 3 - (0.8 - honkT) * 30); ctx.restore();
        }
      },
    };
  }

  // ======================================================================== GOOSE UP
  function createUp(host) {
    const ctx = host.ctx;
    const { world, goose, box } = makeWorld(host, 400, 470);
    box(-300, 520, 1500, 900);
    box(-300, -1e6, 300, 1e6 + 900);
    box(800, -1e6, 300, 1e6 + 900);
    const plats = [];
    const rnd = mulberry((Math.random() * 1e9) | 0);
    let topY = 520, lastX = 400, n = 0, time = 300, maxH = 0, popT = 0, breadGot = 0, over = false;
    const bread = [];
    let camX = 400, camY = 300;

    function gen() {
      const cy = goose.center().y;
      while (topY > cy - 1500) {
        n++;
        const h = (520 - topY) / 100;
        const gap = Math.min(135, 88 + h * 0.8) + rnd() * 26;
        topY -= gap;
        const w = Math.max(84, 190 - h * 1.1 - rnd() * 40);
        const x = clamp(lastX + (rnd() - 0.5) * 540 - w / 2, 30, 770 - w);
        const s = box(x, topY, w, 22);
        const p = { s, y: topY };
        if (n % 9 === 0) p.pad = box(x + w / 2 - 32, topY - 14, 64, 14, { pad: true });
        plats.push(p);
        if (rnd() < 0.4) bread.push({ x: x + w / 2, y: topY - 62, got: false });
        lastX = x + w / 2;
      }
      const lim = cy + 1800;
      for (let i = plats.length - 1; i >= 0; i--) {
        if (plats[i].y > lim) {
          const k = world.solids.indexOf(plats[i].s); if (k >= 0) world.solids.splice(k, 1);
          if (plats[i].pad) { const j = world.solids.indexOf(plats[i].pad); if (j >= 0) world.solids.splice(j, 1); }
          plats.splice(i, 1);
        }
      }
      while (bread.length && bread[0].y > lim) bread.shift();
    }
    gen();
    host.controls('std');

    return {
      goose, plats, cam: () => ({ x: camX, y: camY, s: host.S }),
      update(dt) {
        if (over) return;
        steer(host, goose, world, dt);
        if (goose.bounced) { goose.bounced = false; host.snd.boing(); }
        gen();
        const c = goose.center(), hd = goose.head;
        maxH = Math.max(maxH, (470 - Math.min(c.y, hd.y + 70)) / 100);
        for (const b of bread) if (!b.got && (Math.hypot(hd.x - b.x, hd.y - b.y) < 26 || Math.hypot(c.x - b.x, c.y - b.y) < 40)) { b.got = true; breadGot++; host.award(1); host.snd.bread(); popT = 0.8; }
        time -= dt;
        const t = Math.max(0, Math.ceil(time));
        host.hud({ title: 'Goose Up', text: maxH.toFixed(1) + ' m · ' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') });
        if (time <= 0) { over = true; host.end(Math.round(maxH * 10) / 10, 'You climbed ' + maxH.toFixed(1) + ' m'); }
        const S = host.S, VW = host.W / S, VH = host.H / S;
        camX = 400 - VW / 2;
        camY += (c.y - VH * 0.56 - camY) * (1 - Math.pow(0.002, 1 / 60));
      },
      draw() {
        const W = host.W, H = host.H, S = host.S;
        const h = Math.max(0, (520 - (camY + H / S / 2)) / 100);
        const k = clamp(h / 140, 0, 1);
        const mix = (a, b) => Math.round(a + (b - a) * k);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgb(' + mix(143, 8) + ',' + mix(208, 12) + ',' + mix(255, 40) + ')');
        g.addColorStop(1, 'rgb(' + mix(234, 40) + ',' + mix(248, 60) + ',' + mix(255, 110) + ')');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 9; i++) {                       // parallax clouds that thin out with altitude
          const par = 0.12 + (i % 3) * 0.08, yy = (((i * 173 + 60) - camY * par * S) % (H + 160) + H + 160) % (H + 160) - 80, xx = (i * 233 + host.clock() * (6 + i)) % (W + 240) - 120, sz = 0.8 + (i % 4) * 0.3;
          window.Clouds.one(ctx, xx, yy, 200 * sz * S, 0.95 * (1 - k * 0.85), 'day', i);
        }
        if (k > 0.25) { ctx.fillStyle = 'rgba(255,255,255,' + (k - 0.2) + ')'; for (let i = 0; i < 40; i++) ctx.fillRect(((i * 211) % W), ((i * 97 + camY * 0.03) % H + H) % H, 2, 2); }
        ctx.save();
        ctx.scale(S, S); ctx.translate(-camX, -camY);
        // walls
        ctx.fillStyle = 'rgba(31,42,54,.2)'; ctx.fillRect(-300, camY - 50, 300, H / S + 100); ctx.fillRect(800, camY - 50, 300, H / S + 100);
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, camY - 50); ctx.lineTo(0, camY + H / S + 50); ctx.moveTo(800, camY - 50); ctx.lineTo(800, camY + H / S + 50); ctx.stroke();
        // ground
        if (520 < camY + H / S + 40) { ctx.fillStyle = '#7a5230'; ctx.fillRect(0, 520, 800, 900); ctx.fillStyle = '#5fc24c'; ctx.fillRect(0, 520, 800, 12); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(0, 520, 800, 40); }
        // height marks every 10 m
        ctx.font = '800 14px system-ui, sans-serif'; ctx.textAlign = 'left';
        for (let m = 10; m < 1000; m += 10) {
          const y = 470 - m * 100;
          if (y > camY + H / S + 40) continue; if (y < camY - 40) break;
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(m + ' m', 8, y - 6);
        }
        for (const p of plats) {
          const s = p.s;
          if (s.y > camY + H / S + 40 || s.y < camY - 40) continue;
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
          host.roundRect(s.x, s.y, s.w, s.h, 11); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#dcecf7'; host.roundRect(s.x + 6, s.y + 11, s.w - 12, 7, 3); ctx.fill();
          if (p.pad) { const q = p.pad; ctx.fillStyle = '#e63946'; ctx.strokeStyle = INK; host.roundRect(q.x, q.y, q.w, q.h, 5); ctx.fill(); ctx.stroke(); }
        }
        for (const b of bread) {
          if (b.got || b.y > camY + H / S + 40 || b.y < camY - 40) continue;
          ctx.save(); ctx.translate(b.x, b.y + Math.sin(host.clock() * 3 + b.x) * 4);
          ctx.fillStyle = '#d9993f'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; host.roundRect(-11, -10, 22, 20, 6); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#f7d79a'; host.roundRect(-7, -6, 14, 12, 4); ctx.fill(); ctx.restore();
        }
        host.drawGoose(goose);
        ctx.restore();
        if (popT > 0) { popT -= 1 / 60; ctx.save(); ctx.globalAlpha = Math.min(1, popT * 2); ctx.fillStyle = '#fff'; ctx.font = '800 20px system-ui'; ctx.textAlign = 'center'; ctx.fillText('+1 🍞', W / 2, 90); ctx.restore(); }
      },
    };
  }

  // ======================================================================== BREAD RUSH
  function createBread(host) {
    const ctx = host.ctx;
    const { world, goose, box } = makeWorld(host, 450, 475);
    box(-300, 520, 1500, 600);
    box(-300, -3000, 300, 4000);
    box(900, -3000, 300, 4000);
    const items = [];
    let time = 60, score = 0, combo = 0, spawnT = 0.6, msgT = 0, msg = '', over = false, elapsed = 0;
    let sc = 1, camX = 0, camY = 0;
    const rnd = Math.random;
    host.controls('std');

    function say(t) { msg = t; msgT = 0.8; }
    return {
      goose, cam: () => ({ x: camX, y: camY, s: sc }),
      update(dt) {
        if (over) return;
        steer(host, goose, world, dt);
        elapsed += dt; time -= dt;
        spawnT -= dt;
        if (spawnT <= 0) {
          const r = rnd();
          const type = r < 0.12 ? 'gold' : r < 0.32 ? 'bad' : 'bread';
          items.push({ x: 40 + rnd() * 820, y: -60, vy: 130 + rnd() * 120 + elapsed * 1.6, type, rot: rnd() * 6 });
          spawnT = Math.max(0.32, 0.85 - elapsed * 0.01);
        }
        const c = goose.center(), hd = goose.head;
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.y += it.vy * dt; it.rot += dt * 2;
          if (Math.hypot(hd.x - it.x, hd.y - it.y) < 28 || Math.hypot(c.x - it.x, c.y - it.y) < 44) {
            if (it.type === 'bad') { score = Math.max(0, score - 3); combo = 0; host.snd.ouch(); say('Ew! -3'); }
            else {
              const v = it.type === 'gold' ? 5 : 1;
              combo++; const bonus = combo % 5 === 0 ? 2 : 0;
              score += v + bonus; host.snd.bread(); say(bonus ? 'Combo x' + combo + '! +' + (v + bonus) : '+' + v);
            }
            items.splice(i, 1); continue;
          }
          if (it.y > 505) { if (it.type !== 'bad') combo = 0; items.splice(i, 1); }
        }
        msgT = Math.max(0, msgT - dt);
        const t = Math.max(0, Math.ceil(time));
        host.hud({ title: 'Bread Rush', text: 'Score ' + score + (combo > 1 ? ' · x' + combo : '') + ' · ' + t + 's' });
        if (time <= 0) { over = true; host.end(score, 'You caught ' + score + ' points of bread'); }
      },
      draw() {
        const W = host.W, H = host.H;
        sc = Math.min(W / 940, H / 560);
        camX = 450 - W / (2 * sc); camY = 285 - H / (2 * sc);
        host.drawSky(0, 0);
        ctx.save();
        ctx.scale(sc, sc); ctx.translate(-camX, -camY);
        ctx.fillStyle = '#7a5230'; ctx.fillRect(-300, 520, 1500, 600); ctx.fillStyle = '#5fc24c'; ctx.fillRect(-300, 520, 1500, 12);
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-300, 520); ctx.lineTo(1200, 520); ctx.stroke();
        ctx.fillStyle = 'rgba(31,42,54,.25)'; ctx.fillRect(-300, -300, 300, 820); ctx.fillRect(900, -300, 300, 820);
        for (const it of items) {
          ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(Math.sin(it.rot) * 0.4);
          const col = it.type === 'gold' ? ['#ffd23f', '#fff1a8'] : it.type === 'bad' ? ['#7d8f3a', '#a9b866'] : ['#d9993f', '#f7d79a'];
          if (it.type === 'gold') { const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, 34); gl.addColorStop(0, 'rgba(255,230,120,.8)'); gl.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill(); }
          ctx.fillStyle = col[0]; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; host.roundRect(-13, -12, 26, 24, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = col[1]; host.roundRect(-8, -7, 16, 14, 4); ctx.fill();
          if (it.type === 'bad') { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-4, -2, 2, 0, 7); ctx.arc(4, -2, 2, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(4, 5); ctx.stroke(); }
          ctx.restore();
        }
        host.drawGoose(goose);
        if (msgT > 0) { const h = goose.head; ctx.save(); ctx.globalAlpha = Math.min(1, msgT * 3); ctx.fillStyle = INK; ctx.font = '800 22px system-ui'; ctx.textAlign = 'center'; ctx.fillText(msg, h.x, h.y - 28 - (0.8 - msgT) * 30); ctx.restore(); }
        ctx.restore();
      },
    };
  }

  // ======================================================================== FLAPPY GOOSE
  function createFlappy(host) {
    const ctx = host.ctx;
    const { world, goose } = makeWorld(host, 200, 300);
    const pipes = [];
    let started = false, over = false, score = 0, flapQ = false, lastX = 600, sc = 1, camX = 0, camY = 0, flash = 0;
    const rnd = Math.random;
    const pw = 64;
    host.controls([{ label: 'FLAP', side: 'R', big: true, down: () => { flapQ = true; } }]);
    const cv = ctx.canvas;
    const tap = (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; flapQ = true; };
    cv.addEventListener('pointerdown', tap);

    function spawnPipes() {
      while (lastX < goose.center().x + 1000) {
        const gap = Math.max(190, 240 - score * 2.2);
        pipes.push({ x: lastX, gapY: 150 + rnd() * 250, gap, passed: false });
        lastX += 380;
      }
      while (pipes.length && pipes[0].x < goose.center().x - 600) pipes.shift();
    }
    function circleRect(px, py, r, rx, ry, rw, rh) {
      const cx = clamp(px, rx, rx + rw), cy = clamp(py, ry, ry + rh);
      return (px - cx) * (px - cx) + (py - cy) * (py - cy) < r * r;
    }
    function dead() {
      const pts = goose.body.concat(goose.feet);   // the neck is a ghost: it passes through reeds
      for (const p of pts) {
        const r = 8;
        if (p.y > 520 - r) return true;
        for (const q of pipes) {
          if (p.x < q.x - 20 || p.x > q.x + pw + 20) continue;
          if (circleRect(p.x, p.y, r, q.x, -2000, pw, q.gapY - q.gap / 2 + 2000) || circleRect(p.x, p.y, r, q.x, q.gapY + q.gap / 2, pw, 2000)) return true;
        }
      }
      return goose.center().y < -200;
    }
    return {
      goose, pipes, cam: () => ({ x: camX, y: camY, s: sc }),
      key(code, down) { if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') { if (down) flapQ = true; return true; } return false; },
      destroy() { cv.removeEventListener('pointerdown', tap); },
      update(dt) {
        if (over) return;
        spawnPipes();
        if (!started) { if (flapQ) started = true; else { host.hud({ title: 'Flappy Goose', text: 'Tap to flap!' }); return; } }
        const f = flapQ; flapQ = false;
        if (f) host.snd.flap();
        goose.stamina = 5; goose.flapCd = Math.min(goose.flapCd, 0.0);
        goose.update(dt, { move: 1, flap: f, glide: false, aim: null });
        goose.stamina = 5;
        world.step(dt);
        const c = goose.center();
        for (const q of pipes) if (!q.passed && q.x + pw < c.x - 10) { q.passed = true; score++; host.snd.bread(); flash = 0.4; }
        flash = Math.max(0, flash - dt);
        host.hud({ title: 'Flappy Goose', text: 'Reeds: ' + score });
        if (dead()) { over = true; host.snd.ouch(); host.end(score, 'You passed ' + score + ' reeds'); }
      },
      draw() {
        const W = host.W, H = host.H;
        sc = Math.min(W / 700, H / 560);
        const c = goose.center();
        camX = c.x - (W / sc) * 0.3; camY = 290 - H / (2 * sc);
        host.drawSky(camX * 0.5, 0);
        ctx.save();
        ctx.scale(sc, sc); ctx.translate(-camX, -camY);
        for (const q of pipes) {
          const draw = (y, h, cap) => {
            ctx.fillStyle = '#4fae3f'; ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
            ctx.fillRect(q.x, y, pw, h); ctx.strokeRect(q.x, y, pw, h);
            ctx.fillStyle = '#7ad862'; ctx.fillRect(q.x + 8, y, 10, h);
            const cy = cap === 'bottom' ? y + h - 26 : y;
            ctx.fillStyle = '#5fc24c'; host.roundRect(q.x - 6, cy, pw + 12, 26, 6); ctx.fill(); ctx.stroke();
          };
          draw(-1500, q.gapY - q.gap / 2 + 1500, 'bottom');
          draw(q.gapY + q.gap / 2, 1500, 'top');
        }
        ctx.fillStyle = '#7a5230'; ctx.fillRect(camX - 40, 520, W / sc + 80, 400); ctx.fillStyle = '#5fc24c'; ctx.fillRect(camX - 40, 520, W / sc + 80, 12);
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(camX - 40, 520); ctx.lineTo(camX + W / sc + 40, 520); ctx.stroke();
        host.drawGoose(goose);
        ctx.restore();
        if (!started) { ctx.fillStyle = INK; ctx.font = '800 26px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Tap or press Space to flap', W / 2, H * 0.3); }
        else { ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.font = '800 ' + (46 + flash * 30) + 'px system-ui'; ctx.textAlign = 'center'; ctx.strokeText(score, W / 2, H * 0.22); ctx.fillText(score, W / 2, H * 0.22); ctx.restore(); }
      },
    };
  }

  // ======================================================================== HONK HERO
  function createHonk(host) {
    const ctx = host.ctx;
    const { world, goose, box } = makeWorld(host, 300, 475);
    box(-500, 520, 2000, 600);
    const rings = [], pops = [];
    let score = 0, combo = 0, lives = 3, spawnT = 1.2, interval = 1.5, elapsed = 0, over = false, honkQ = false, sc = 1;
    const R0 = 130, RT = 24;
    host.controls([{ label: 'HONK', side: 'R', big: true, down: () => { honkQ = true; } }]);
    const cv = ctx.canvas;
    const tap = (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; honkQ = true; };
    cv.addEventListener('pointerdown', tap);
    const pop = (t, c) => pops.push({ t, c, life: 0.8 });
    function miss(t) { lives--; combo = 0; host.snd.low(); pop(t, '#e63946'); if (lives <= 0) { over = true; host.end(score, 'Score ' + score); } }
    return {
      goose,
      key(code, down) { if (code === 'Space' || code === 'KeyH' || code === 'KeyE' || code === 'Enter') { if (down) honkQ = true; return true; } return false; },
      destroy() { cv.removeEventListener('pointerdown', tap); },
      update(dt) {
        if (over) return;
        elapsed += dt;
        goose.update(dt, { move: 0, aim: null });
        world.step(dt);
        spawnT -= dt;
        if (spawnT <= 0) { rings.push({ r: R0, dur: Math.max(0.7, 1.15 - elapsed * 0.004) }); spawnT = interval; interval = Math.max(0.7, interval - 0.025); }
        for (let i = rings.length - 1; i >= 0; i--) {
          const q = rings[i];
          q.r -= ((R0 - RT) / q.dur) * dt;
          if (q.r < RT - 14) { rings.splice(i, 1); miss('Miss!'); if (over) return; }
        }
        if (honkQ) {
          honkQ = false;
          goose.honk(); host.snd.honk();
          const q = rings[0];
          if (q) {
            const err = Math.abs(q.r - RT);
            if (err <= 6) { combo++; const v = 3 + Math.min(5, combo >> 2); score += v; pop('PERFECT +' + v, '#ffd23f'); rings.shift(); }
            else if (err <= 14) { combo++; score += 1; pop('Good +1', '#fff'); rings.shift(); }
            else if (q.r > RT) { rings.shift(); miss('Too early!'); if (over) return; }
          } else { combo = 0; pop('No ring!', '#e63946'); }
        }
        for (let i = pops.length - 1; i >= 0; i--) { pops[i].life -= dt; if (pops[i].life <= 0) pops.splice(i, 1); }
        host.hud({ title: 'Honk Hero', text: 'Score ' + score + (combo > 1 ? ' · x' + combo : '') + ' · ' + '❤'.repeat(Math.max(0, lives)) });
      },
      draw() {
        const W = host.W, H = host.H;
        sc = Math.min(W / 560, H / 400);
        const camX = 320 - W / (2 * sc), camY = 390 - H / (2 * sc);
        host.drawSky(0, 0);
        ctx.save();
        ctx.scale(sc, sc); ctx.translate(-camX, -camY);
        ctx.fillStyle = '#7a5230'; ctx.fillRect(-500, 520, 2000, 600); ctx.fillStyle = '#5fc24c'; ctx.fillRect(-500, 520, 2000, 12);
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-500, 520); ctx.lineTo(1500, 520); ctx.stroke();
        host.drawGoose(goose);
        const h = goose.head;
        // target and shrinking rings, centred on the (wobbling) head
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.arc(h.x, h.y, RT, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        rings.forEach((q, i) => {
          ctx.strokeStyle = i === 0 ? '#ff9b2f' : 'rgba(255,155,47,.5)'; ctx.lineWidth = i === 0 ? 6 : 4;
          ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(2, q.r), 0, 7); ctx.stroke();
        });
        for (const p of pops) {
          ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2.5); ctx.fillStyle = p.c; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.font = '800 20px system-ui'; ctx.textAlign = 'center';
          const y = h.y - 60 - (0.8 - p.life) * 40; ctx.strokeText(p.t, h.x, y); ctx.fillText(p.t, h.x, y); ctx.restore();
        }
        ctx.restore();
      },
    };
  }

  const list = [
    { id: 'tetris', name: 'Goose Tetris', icon: '🧱', desc: 'Stack the blocks. Clear lines. Make the goose honk.', fmt: fmtPts, reward: (s) => Math.floor(s / 120), create: createTetris },
    { id: 'up', name: 'Goose Up', icon: '☁️', desc: '5 minutes to climb the clouds as high as you can.', fmt: (s) => s.toFixed(1) + ' m', reward: (s) => Math.floor(s * 1.5), create: createUp },
    { id: 'bread', name: 'Bread Rush', icon: '🍞', desc: 'Catch falling bread with your head. Dodge the rotten ones.', fmt: fmtPts, reward: (s) => Math.floor(s / 3), create: createBread },
    { id: 'flappy', name: 'Flappy Goose', icon: '🌾', desc: 'Tap to flap through the reeds. Your neck is a ghost.', fmt: (s) => s + ' reeds', reward: (s) => s * 2, create: createFlappy },
    { id: 'honk', name: 'Honk Hero', icon: '📣', desc: 'Honk exactly when the ring hits your wobbly head.', fmt: fmtPts, reward: (s) => Math.floor(s / 5), create: createHonk },
  ];

  root.Minigames = { list };
})(typeof window !== 'undefined' ? window : globalThis);
