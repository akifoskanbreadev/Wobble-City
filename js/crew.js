/*
 * Goose Among Us (🚀 in the menu): an original social-deduction game on a flying barn-ship. Offline against bots, or ONLINE with friends (room word, up to 10 players, host-authoritative, bots fill the rest).
 * One or two sneaky Foxes hide among the goose crew. Crew finish tasks or vote the Foxes out; Foxes sneak-kill until they match the crew.
 *   Keys: WASD / arrows move · E use / task · Q kill · R report · F vent · X lights out · Z overload      Touch: stick + buttons
 * Test hooks: Crew._start({n, role, auto}), Crew._step(dt), Crew._state(), Crew._sim({n, role}) (bots play every seat).
 */
(function (root) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let opts = null, dom = null, raf = 0, last = 0, G = null, isOpen = false, actx = null, room = null, ownS = { xray: true, invis: false, speed: false, noclip: false, nocd: false };
  const owner = () => !!(opts && opts.isOwner && opts.isOwner());
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ------------------------------------------------------------------ the ship: 8 rooms around a central hub, joined by corridors
  const RW = 420, RH = 300, GX = [60, 640, 1220], GY = [60, 520, 980], CHW = 60, WW = 1700, WH = 1340, CELL = 30, R = 13;
  const ROOMS = ['Bridge', 'Nest Quarters', 'Egg Nursery', 'Bread Kitchen', 'Hub', 'Pond Lab', 'Engine Room', 'Storage Barn', 'Reactor Coop'];
  const ROOM_COL = ['#2f3f6b', '#4a3a66', '#6b5a2f', '#6b4a2f', '#2f5a5a', '#2f5f6b', '#5a3a3a', '#4a5a3a', '#4a3a5a'];
  const rx = (i) => GX[i % 3], ry = (i) => GY[(i / 3) | 0];
  const walk = [], blocks = [];
  ROOMS.forEach((n, i) => walk.push({ x: rx(i), y: ry(i), w: RW, h: RH, room: i }));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (c < 2) walk.push({ x: GX[c] + RW - 2, y: GY[r] + RH / 2 - CHW, w: GX[c + 1] - GX[c] - RW + 4, h: CHW * 2, room: -1 });
    if (r < 2) walk.push({ x: GX[c] + RW / 2 - CHW, y: GY[r] + RH - 2, w: CHW * 2, h: GY[r + 1] - GY[r] - RH + 4, room: -1 });
  }
  ROOMS.forEach((n, i) => { if (i !== 4) blocks.push({ x: rx(i) + 25, y: ry(i) + RH - 85, w: 70, h: 60 }); });
  const HUB = { x: rx(4) + RW / 2, y: ry(4) + RH / 2 };
  blocks.push({ x: HUB.x - 70, y: HUB.y - 30, w: 140, h: 60 });
  const TASK_TYPES = { card: ['💳', 'Swipe the card'], simon: ['📣', 'Honk the pattern'], wires: ['🔌', 'Fix the wires'], bread: ['🍞', 'Sort the bread'], download: ['📥', 'Download the map'], engine: ['⚙️', 'Align the engine'] };
  const STATIONS = [[0, 'card'], [1, 'simon'], [2, 'wires'], [3, 'bread'], [5, 'download'], [6, 'engine'], [7, 'wires'], [8, 'simon']].map((s, id) => ({ id, room: s[0], type: s[1], x: rx(s[0]) + 85, y: ry(s[0]) + 75 }));
  const VENTS = [0, 2, 5, 8, 6, 3].map((room, id) => ({ id, room, x: rx(room) + RW - 55, y: ry(room) + RH - 45 }));
  const FUSE = { x: rx(7) + RW - 85, y: ry(7) + 75 }, FIX = [{ x: rx(8) + RW - 85, y: ry(8) + 75 }, { x: rx(6) + RW - 85, y: ry(6) + 75 }];
  const COLS = ['#f5f5f5', '#ff5d5d', '#4da3ff', '#ffd23f', '#4cd964', '#b57aff', '#ff9b2f', '#ff8bd0', '#45d6c8'];
  const NAMES = ['Honk', 'Waddles', 'Pecky', 'Biscuit', 'Gizmo', 'Nugget', 'Quackers', 'Puddle', 'Feathers', 'Duckles'];
  const KILL_CD = 22, KILL_RANGE = 72, REPORT_RANGE = 95, USE_RANGE = 80, VIS = 270, VIS_DARK = 95, GAME_LIMIT = 840;

  const pointOK = (x, y) => {
    let ok = false;
    for (const r of walk) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { ok = true; break; }
    if (!ok) return false;
    for (const b of blocks) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return false;
    return true;
  };
  const OFFS = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  const free = (x, y, r) => { if (!pointOK(x, y)) return false; for (const o of OFFS) if (!pointOK(x + o[0] * r, y + o[1] * r)) return false; return true; };
  function segFree(ax, ay, bx, by, r) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 12));
    for (let i = 1; i <= n; i++) { const t = i / n; if (!(r ? free(ax + (bx - ax) * t, ay + (by - ay) * t, r) : pointOK(ax + (bx - ax) * t, ay + (by - ay) * t))) return false; }
    return true;
  }
  function roomAt(x, y) { for (let i = 0; i < 9; i++) if (x >= rx(i) && x <= rx(i) + RW && y >= ry(i) && y <= ry(i) + RH) return i; return -1; }
  const roomName = (x, y) => { const i = roomAt(x, y); return i < 0 ? 'the corridor' : (i === 4 ? 'the Hub' : 'the ' + ROOMS[i]); };

  // ------------------------------------------------------------------ path finding (A* on a 30px grid)
  const NC = Math.ceil(WW / CELL), NR = Math.ceil(WH / CELL), navOK = new Uint8Array(NC * NR);
  for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) navOK[j * NC + i] = free(i * CELL + CELL / 2, j * CELL + CELL / 2, R + 1) ? 1 : 0;
  const cellOf = (x, y) => [Math.max(0, Math.min(NC - 1, (x / CELL) | 0)), Math.max(0, Math.min(NR - 1, (y / CELL) | 0))];
  function nearestNav(x, y) {
    const [ci, cj] = cellOf(x, y);
    for (let d = 0; d < 8; d++) for (let j = cj - d; j <= cj + d; j++) for (let i = ci - d; i <= ci + d; i++) if (i >= 0 && j >= 0 && i < NC && j < NR && navOK[j * NC + i]) return [i, j];
    return [ci, cj];
  }
  function findPath(ax, ay, bx, by) {
    const s = nearestNav(ax, ay), g = nearestNav(bx, by), key = (i, j) => j * NC + i;
    const gs = new Map(), came = new Map(), open = [[0, s[0], s[1]]]; gs.set(key(s[0], s[1]), 0);
    const h = (i, j) => { const dx = Math.abs(i - g[0]), dy = Math.abs(j - g[1]); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
    const push = (n) => { open.push(n); let i = open.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (open[p][0] <= open[i][0]) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
    const pop = () => { const top = open[0], end = open.pop(); if (open.length) { open[0] = end; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === i) break; [open[m], open[i]] = [open[i], open[m]]; i = m; } } return top; };
    let found = false;
    while (open.length) {
      const [, ci, cj] = pop();
      if (ci === g[0] && cj === g[1]) { found = true; break; }
      const cg = gs.get(key(ci, cj));
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= NC || nj >= NR || !navOK[key(ni, nj)]) continue;
        if (di && dj && (!navOK[key(ci + di, cj)] || !navOK[key(ci, cj + dj)])) continue;
        const ng = cg + (di && dj ? 1.41 : 1);
        if (!gs.has(key(ni, nj)) || ng < gs.get(key(ni, nj))) { gs.set(key(ni, nj), ng); came.set(key(ni, nj), key(ci, cj)); push([ng + h(ni, nj), ni, nj]); }
      }
    }
    if (!found) return [{ x: bx, y: by }];
    const pts = []; let k = key(g[0], g[1]);
    while (k !== undefined && k !== key(s[0], s[1])) { pts.push({ x: (k % NC) * CELL + CELL / 2, y: ((k / NC) | 0) * CELL + CELL / 2 }); k = came.get(k); }
    pts.reverse(); pts.push({ x: bx, y: by });
    const out = []; let cx = ax, cy = ay, i = 0;            // smooth: skip waypoints we can walk straight past
    while (i < pts.length) { let j = pts.length - 1; while (j > i && !segFree(cx, cy, pts[j].x, pts[j].y, R)) j--; out.push(pts[j]); cx = pts[j].x; cy = pts[j].y; i = j + 1; }
    return out;
  }

  // ------------------------------------------------------------------ sound (tiny beeps)
  function tone(f, d, type, vol) {
    try {
      if (opts && opts.save && opts.save().sound === false) return;
      const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return; if (!actx) actx = new AC();
      const o = actx.createOscillator(), g = actx.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.value = vol || 0.05;
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d); o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
    } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------ game setup
  function newGame(o) {
    const hum = o.humans || null, n = hum ? Math.max(5, Math.min(10, o.n || 8), hum.length) : Math.max(5, Math.min(9, o.n || 7)), nImp = o.nImp ? Math.min(o.nImp, Math.max(1, Math.floor((n - 1) / 3) + (n >= 7 ? 0 : 0))) : (n >= 7 ? 2 : 1);
    const sk = opts && opts.Skins && opts.save ? opts.Skins.BY_ID[opts.save().skin] : null;
    const names = shuffle(NAMES).slice(0, n), cols = shuffle(COLS.slice(1));
    const meCol = sk && /^#[0-9a-f]{6}$/i.test(sk.body || '') ? sk.body : COLS[0];
    const P = [];
    for (let i = 0; i < n; i++) P.push({ id: i, name: hum && hum[i] ? hum[i].name : (hum ? names[i] : (i ? names[i - 1] : 'You')), col: i ? cols[(i - 1) % cols.length] : meCol, net: hum && hum[i] ? hum[i].net : -1, remote: !!(hum && hum[i] && hum[i].net > 0), x: 0, y: 0, face: 1, alive: true, role: 'crew', bot: hum ? !(hum[i]) : !!(i || o.auto), tasks: [], cd: 12, seen: {}, susp: {}, vent: null, path: null, pt: null, mode: 'idle', timer: rnd(0.2, 2), walked: 0, stuck: 0, emerg: false, anim: Math.random() * 6, moving: false });
    if (hum) { const used = new Set([meCol]); hum.forEach((h, i) => { if (i && h.col && /^#[0-9a-f]{6}$/i.test(h.col) && !used.has(h.col)) P[i].col = h.col; used.add(P[i].col); }); }
    let role = o.role === 'imp' || (o.role === 'random' || !o.role ? Math.random() < nImp / n : false) ? 'imp' : 'crew';
    const impIds = []; if (hum) { shuffle(P.map((q, i) => i)).slice(0, nImp).forEach((k) => impIds.push(k)); role = impIds.includes(0) ? 'imp' : 'crew'; } else if (role === 'imp') impIds.push(0);
    while (impIds.length < nImp) { const k = 1 + ((Math.random() * (n - 1)) | 0); if (!impIds.includes(k)) impIds.push(k); }
    impIds.forEach((k) => { P[k].role = 'imp'; });
    P.forEach((p, i) => {
      const a = (i / n) * Math.PI * 2; p.x = HUB.x + Math.cos(a) * 150; p.y = HUB.y + Math.sin(a) * 95;
      p.tasks = shuffle(STATIONS.map((s) => s.id)).slice(0, 4).map((id) => ({ id, done: false }));
    });
    const crew = P.filter((p) => p.role === 'crew');
    G = { online: !!hum, host: true, nImp, phase: 'intro', t: 0, introT: 3.2, players: P, me: P[0], bodies: [], chat: [], m: null, task: null, lights: 0, overload: null, sabCd: 40, tasksTotal: crew.length * 4, tasksDone: 0, result: null, meetings: 0, kills: 0, auto: !!o.auto, intel: 0, toasts: [], emergLeft: 1, sabMenu: false };
    return G;
  }
  const alive = (p) => p.alive, living = () => G.players.filter(alive), imps = () => living().filter((p) => p.role === 'imp'), crewAlive = () => living().filter((p) => p.role === 'crew');
  const visR = (p) => (!p.alive ? 9999 : G.lights > 0 && p.role === 'crew' ? VIS_DARK : VIS);
  const canSee = (p, x, y) => Math.hypot(p.x - x, p.y - y) < visR(p) && segFree(p.x, p.y, x, y, 0);
  const toast = (t, s) => { G.toasts.push({ t, left: s || 2.5 }); };
  const toGuests = (m, only) => { if (room && G && G.online && G.host) { if (only) room.toOne(only.net, m); else room.toAll(m); } };
  const announce = (role, t, secs) => { if (G.me.role === role) toast(t, secs); if (G.online) for (const q of G.players) if (q.remote && q.role === role) toGuests({ k: 'toast', t, s: secs }, q); };

  // ------------------------------------------------------------------ movement
  function moveEnt(p, dx, dy) {
    if (free(p.x + dx, p.y, R)) p.x += dx; if (free(p.x, p.y + dy, R)) p.y += dy;
    if (!free(p.x, p.y, R)) { const c = nearestNav(p.x, p.y); p.x = c[0] * CELL + CELL / 2; p.y = c[1] * CELL + CELL / 2; }
    if (dx > 0.01) p.face = 1; else if (dx < -0.01) p.face = -1;
  }
  const SPEED = 150;
  function goTo(p, tx, ty, dt, arrive) {          // bot walking; returns true when there
    const dd = Math.hypot(tx - p.x, ty - p.y); if (dd < (arrive || 10)) { p.moving = false; return true; }
    if (!p.path || !p.pt || Math.hypot(p.pt.x - tx, p.pt.y - ty) > 24) { p.path = findPath(p.x, p.y, tx, ty); p.pt = { x: tx, y: ty }; p.pi = 0; }
    let w = p.path[p.pi]; while (w && Math.hypot(w.x - p.x, w.y - p.y) < 9 && p.pi < p.path.length - 1) { p.pi++; w = p.path[p.pi]; }
    if (!w) return true;
    const d = Math.hypot(w.x - p.x, w.y - p.y) || 1, sp = SPEED * 0.93 * dt, bx = p.x, by = p.y;
    moveEnt(p, (w.x - p.x) / d * Math.min(sp, d), (w.y - p.y) / d * Math.min(sp, d)); p.moving = true;
    p.stuck = Math.hypot(p.x - bx, p.y - by) < sp * 0.2 ? p.stuck + dt : 0;
    if (p.stuck > 1) { p.path = null; p.stuck = 0; p.x += rnd(-6, 6); p.y += rnd(-6, 6); }
    return false;
  }

  // ------------------------------------------------------------------ actions: kill, vent, report, sabotage
  function witnessAt(x, y, who, amount, why) {
    for (const w of G.players) if (w.alive && w !== who && w.role === 'crew' && w.bot && canSee(w, x, y)) { w.susp[who.id] = (w.susp[who.id] || 0) + amount; w.saw = w.saw || {}; w.saw[who.id] = why; }
  }
  function kill(k, v) {
    G.bodies.push({ id: v.id, x: v.x, y: v.y, col: v.col, name: v.name, rep: false, t: G.t });
    v.alive = false; v.vent = null; k.x = v.x; k.y = v.y; k.cd = KILL_CD; G.kills++;
    witnessAt(k.x, k.y, k, 100, 'kill'); tone(140, 0.25, 'sawtooth', 0.08);
    if (v === G.me) { toast('You were caught by a Fox! You are a ghost now.', 4); closeTask(); }
    else if (v.remote) toGuests({ k: 'dead' }, v);
    checkWin();
  }
  const nearestVent = (p, d) => VENTS.map((v) => [Math.hypot(v.x - p.x, v.y - p.y), v]).filter((a) => a[0] < d).sort((a, b) => a[0] - b[0]).map((a) => a[1])[0];
  function enterVent(p, v) { witnessAt(p.x, p.y, p, 100, 'vent'); p.vent = v.id; p.x = v.x; p.y = v.y; tone(300, 0.1, 'triangle'); }
  function exitVent(p) { p.vent = null; witnessAt(p.x, p.y, p, 100, 'vent'); }
  function startLights() { if (G.lights > 0 || G.overload || G.sabCd > 0) return false; G.lights = 40; G.sabCd = 35; tone(90, 0.5, 'sawtooth', 0.08); announce('crew', 'Lights out! Fix the fuse panel in the Storage Barn.', 4); return true; }
  function startOverload() { if (G.lights > 0 || G.overload || G.sabCd > 0) return false; G.overload = { t: 45, fixed: [false, false] }; G.sabCd = 35; tone(70, 0.6, 'sawtooth', 0.08); announce('crew', 'REACTOR OVERLOAD! Fix both panels (Reactor Coop + Engine Room)!', 5); return true; }
  function reportBody(p) {
    const b = G.bodies.find((x) => !x.rep && Math.hypot(x.x - p.x, x.y - p.y) < REPORT_RANGE * 1.3 && segFree(p.x, p.y, x.x, x.y, 0)); if (!b || G.phase !== 'play') return false;
    startMeeting(p, b); return true;
  }

  // ------------------------------------------------------------------ meetings
  function startMeeting(by, body) {
    G.phase = 'meeting'; G.meetings++; G.task = null; closeTask(); G.sabMenu = false;
    G.m = { by, body, stage: 'discuss', t: 0, dur: 14, vdur: 18, votes: {}, lines: [], vAt: {}, res: null, rt: 0, emerg: !body };
    G.chat = []; if (body) body.rep = true;
    G.players.forEach((p, i) => { if (p.alive) { const a = (i / G.players.length) * Math.PI * 2; p.x = HUB.x + Math.cos(a) * 150; p.y = HUB.y + Math.sin(a) * 95; p.vent = null; p.path = null; } });
    sayNow(by, body ? 'I found ' + body.name + ' in ' + roomName(body.x, body.y) + '!' : 'Emergency meeting! We need to talk.');
    // schedule what every bot will say and when it will vote
    const liv = G.players.filter((p) => p.alive && p.bot);
    for (const p of liv) {
      const lines = [];
      if (p.role === 'crew') {
        const culprit = Object.keys(p.saw || {}).map(Number).find((id) => G.players[id]);
        if (culprit != null) lines.push([rnd(1, 4), 'I saw ' + G.players[culprit].name + ' ' + (p.saw[culprit] === 'vent' ? 'jump into a vent' : 'attack someone') + '!', culprit, 60]);
        else {
          const nearBody = body ? G.players.filter((q) => q !== p && q.id !== body.id && p.seen[q.id] && G.t - p.seen[q.id].t < 40 && Math.hypot(p.seen[q.id].x - body.x, p.seen[q.id].y - body.y) < 420).sort((a, b) => p.seen[b.id].t - p.seen[a.id].t) : [];
          if (nearBody.length) lines.push([rnd(2, 7), nearBody[0].name + ' was close to ' + roomName(p.seen[nearBody[0].id].x, p.seen[nearBody[0].id].y) + ' a moment ago...', nearBody[0].id, 22]);
          else lines.push([rnd(2, 8), pick(['I was busy with tasks, I saw nothing.', 'No idea. I was in ' + roomName(p.x, p.y).replace('the ', '') + '.', 'I did not see anyone suspicious.']), -1, 0]);
        }
      } else {
        const t = pick(G.players.filter((q) => q.alive && q.role === 'crew'));
        if (t && Math.random() < 0.75) lines.push([rnd(2, 8), pick([t.name + ' looks sus to me.', 'I think it was ' + t.name + '!', 'Where was ' + t.name + '? Nobody saw them.']), t.id, 16]);
        else lines.push([rnd(2, 8), 'I was doing tasks near ' + roomName(p.x, p.y).replace('the ', '') + '.', -1, 0]);
      }
      lines.forEach((l) => G.m.lines.push({ at: l[0], p, text: l[1], target: l[2], amt: l[3], said: false }));
      G.m.vAt[p.id] = rnd(1.5, 13);
    }
  }
  function sayNow(p, text) { G.chat.push({ name: p.name, col: p.col, text }); tone(520, 0.05, 'triangle', 0.03); renderChat(); if (G.online && G.host) toGuests({ k: 'chat', name: p.name, col: p.col, text }); }
  function botVote(p) {
    const cand = G.players.filter((q) => q.alive && q !== p);
    if (p.role === 'crew') {
      const top = cand.map((q) => [q, p.susp[q.id] || 0]).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 20) return top[0].id;
      return Math.random() < 0.75 ? 'skip' : pick(cand).id;
    }
    const heat = {}; G.players.forEach((q) => { if (q.role === 'crew' && q.alive && q.bot) for (const id in q.susp) heat[id] = (heat[id] || 0) + q.susp[id]; });
    const crewT = cand.filter((q) => q.role === 'crew').map((q) => [q, heat[q.id] || 0]).sort((a, b) => b[1] - a[1]);
    if (Math.random() < 0.2 || !crewT.length) return 'skip';
    return crewT[0][1] > 10 && Math.random() < 0.7 ? crewT[0][0].id : pick(crewT)[0].id;
  }
  function castVote(p, who) { if (G.online && !G.host && p === G.me) { if (G.m.stage === 'vote' && G.me.alive && G.m.mine === undefined) { G.m.mine = who; room.send({ k: 'vote', who }); renderMeeting(); } return; } if (G.m.stage !== 'vote' || G.m.votes[p.id] !== undefined || !p.alive) return; G.m.votes[p.id] = who; tone(660, 0.06, 'triangle', 0.04); renderMeeting(); }
  function stepMeeting(dt) {
    const m = G.m; m.t += dt;
    if (m.stage === 'discuss') {
      for (const l of m.lines) if (!l.said && m.t >= l.at && l.p.alive) {
        l.said = true; sayNow(l.p, l.text);
        if (l.target >= 0 && l.amt) G.players.forEach((q) => { if (q.bot && q.alive && q !== l.p && q.role === 'crew') q.susp[l.target] = (q.susp[l.target] || 0) + l.amt * 0.4; });
      }
      if (m.t >= m.dur) { m.stage = 'vote'; m.t = 0; sayNow({ name: '📢', col: '#fff' }, 'Time to vote!'); renderMeeting(); }
    } else if (m.stage === 'vote') {
      for (const p of G.players) if (p.alive && p.bot && m.votes[p.id] === undefined && m.t >= (m.vAt[p.id] || 5)) castVote(p, botVote(p));
      if (m.t >= m.vdur) for (const p of G.players) if (p.alive && m.votes[p.id] === undefined) castVote(p, 'skip');
      if (G.players.every((p) => !p.alive || m.votes[p.id] !== undefined)) resolveVotes();
    } else if (m.stage === 'result') { m.rt += dt; if (m.rt > 4.8) endMeeting(); }
  }
  function resolveVotes() {
    const m = G.m, tally = {}; for (const k in m.votes) { const v = m.votes[k]; tally[v] = (tally[v] || 0) + 1; }
    const order = Object.keys(tally).sort((a, b) => tally[b] - tally[a]); let ej = null;
    if (order.length && order[0] !== 'skip' && (order.length === 1 || tally[order[0]] > tally[order[1]])) ej = G.players[+order[0]];
    if (ej) { ej.alive = false; ej.ejected = true; }
    m.res = { ej, tally }; m.stage = 'result'; m.rt = 0; renderMeeting(); tone(200, 0.4, 'sawtooth', 0.06);
  }
  function endMeeting() {
    G.bodies = []; G.phase = 'play'; G.m = null; G.players.forEach((p, i) => { p.mode = 'idle'; p.path = null; p.timer = rnd(0.3, 2.5); p.cd = Math.max(p.cd, 14); const a = (i / G.players.length) * Math.PI * 2; if (p.alive) { p.x = HUB.x + Math.cos(a) * 150; p.y = HUB.y + Math.sin(a) * 95; } p.saw = {}; });
    G.lights = 0; G.overload = null; G.sabCd = Math.max(G.sabCd, 25); showPanel(null); checkWin();
  }

  // ------------------------------------------------------------------ win / lose
  function checkWin() {
    if (!G || G.phase === 'end') return;
    let w = null, why = '';
    if (G.tasksDone >= G.tasksTotal) { w = 'crew'; why = 'Every task is done!'; }
    else if (!imps().length) { w = 'crew'; why = 'All Foxes were found!'; }
    else if (imps().length >= crewAlive().length) { w = 'imp'; why = 'The Foxes outnumber the crew!'; }
    else if (G.overload && G.overload.t <= 0) { w = 'imp'; why = 'The reactor blew up!'; }
    else if (G.t > GAME_LIMIT) { w = 'imp'; why = 'The ship ran out of bread!'; }
    if (G.forceW) { w = G.forceW; why = 'The owner decided it.'; }
    if (!w) return;
    G.phase = 'end'; G.result = { winner: w, reason: why }; closeTask();
    const meImp = G.me.role === 'imp', won = (w === 'imp') === meImp, gain = won ? (meImp ? 35 : 25) : 6;
    if (G.online) toGuests({ k: 'end', winner: w, reason: why, roles: G.players.map((q) => q.role), alive: G.players.map((q) => (q.alive ? 1 : q.ejected ? 2 : 0)), td: G.tasksDone, tt: G.tasksTotal, mt: G.meetings, kl: G.kills });
    if (!G.auto && opts && opts.award) opts.award(gain); G.result.gain = gain; G.result.won = won;
    showEnd();
  }

  // ------------------------------------------------------------------ bots
  function stationOf(t) { return STATIONS[t.id]; }
  function botSee(p) {                              // remember who we saw, and react to bodies
    for (const q of G.players) if (q !== p && q.alive && q.vent == null && !q.invis && canSee(p, q.x, q.y)) p.seen[q.id] = { t: G.t, x: q.x, y: q.y };
  }
  function botBody(p) {
    if (!p.alive) return false;
    const b = G.bodies.find((x) => !x.rep && canSee(p, x.x, x.y)); if (!b) return false;
    if (p.role === 'imp' && Math.random() > 0.004) return false;           // Foxes mostly walk away (and sometimes self-report)
    p.mode = 'report'; p.rb = b; return true;
  }
  function botStep(p, dt) {
    p.timer -= dt; p.cd -= dt; p.anim += dt;
    if (G.phase !== 'play') return;
    if (!p.alive) { ghostStep(p, dt); return; }
    p.seenT = (p.seenT || 0) - dt; if (p.seenT <= 0) { p.seenT = 0.25; botSee(p); }
    if (p.vent != null) { p.timer = p.timer; if (p.timer <= 0) { const v = VENTS[p.vent], nx = VENTS[(p.vent + (Math.random() < 0.5 ? 1 : VENTS.length - 1)) % VENTS.length]; p.vent = nx.id; p.x = nx.x; p.y = nx.y; if (Math.random() < 0.6) { exitVent(p); p.mode = 'idle'; } else p.timer = rnd(0.8, 2); } return; }
    if (p.mode !== 'report' && botBody(p)) p.path = null;
    if (p.mode === 'report') {
      const b = p.rb; if (!b || b.rep) { p.mode = 'idle'; return; }
      if (goTo(p, b.x, b.y, dt, REPORT_RANGE * 0.6)) { reportBody(p); p.mode = 'idle'; } return;
    }
    // sabotage reactions
    if (p.role === 'crew' && G.overload && p.fixIdx != null && !G.overload.fixed[p.fixIdx]) {
      if (goTo(p, FIX[p.fixIdx].x, FIX[p.fixIdx].y, dt, 30)) { p.fixT = (p.fixT || 0) + dt; if (p.fixT > 1.5) { G.overload.fixed[p.fixIdx] = true; p.fixIdx = null; p.fixT = 0; tone(700, 0.1, 'triangle'); } } return;
    }
    if (p.role === 'crew' && G.lights > 0 && p.fuse) { if (goTo(p, FUSE.x, FUSE.y, dt, 30)) { p.fixT = (p.fixT || 0) + dt; if (p.fixT > 1.8) { G.lights = 0; p.fuse = false; p.fixT = 0; } } return; }
    if (p.role === 'imp') impStep(p, dt); else crewStep(p, dt);
  }
  function crewStep(p, dt) {
    if (p.mode === 'work') {
      p.moving = false; if (p.timer <= 0) { const t = p.tasks.find((x) => !x.done && p.cur === x); if (t) { t.done = true; G.tasksDone++; tone(880, 0.08, 'triangle', 0.03); checkWin(); } p.mode = 'idle'; p.cur = null; } return;
    }
    if (p.mode === 'idle') {
      const t = p.tasks.find((x) => !x.done); p.cur = t || null;
      if (t) { p.mode = 'walk'; } else { p.mode = 'roam'; p.rt = HUB_POINTS(); p.timer = rnd(4, 8); }
    }
    if (p.mode === 'walk') { const s = stationOf(p.cur); if (goTo(p, s.x, s.y, dt, 24)) { p.mode = 'work'; p.timer = rnd(3, 5.5); p.moving = false; } }
    else if (p.mode === 'roam') { if (goTo(p, p.rt.x, p.rt.y, dt, 20) || p.timer <= 0) { p.mode = 'idle'; } }
  }
  function HUB_POINTS() { const r = (Math.random() * 9) | 0; return { x: rx(r) + RW / 2 + rnd(-60, 60), y: ry(r) + RH / 2 + rnd(-30, 30) + (r === 4 ? 100 : 0) }; }
  function ghostStep(p, dt) {                       // dead crew bots keep finishing tasks (invisible)
    if (p.role !== 'crew' || p.bot === false) return;
    const t = p.tasks.find((x) => !x.done); if (!t) return;
    p.ghostT = (p.ghostT || rnd(8, 18)) - dt; if (p.ghostT <= 0) { t.done = true; G.tasksDone++; p.ghostT = rnd(10, 22); checkWin(); }
  }
  function impStep(p, dt) {
    G.sabCd = G.sabCd; const crew = crewAlive();
    // sneaky sabotage now and then
    if (G.t > 80 && G.sabCd <= 0 && !G.lights && !G.overload && crew.length >= 3 && Math.random() < dt * 0.025 && imps().indexOf(p) === 0) {
      if (Math.random() < 0.65) startLights(); else if (startOverload()) for (let i = 0; i < 2; i++) { const b = crew.filter((c) => c.bot && c.fixIdx == null).sort((a, c) => Math.hypot(a.x - FIX[i].x, a.y - FIX[i].y) - Math.hypot(c.x - FIX[i].x, c.y - FIX[i].y))[0]; if (b) { b.fixIdx = i; b.fixT = 0; } }
    }
    if (G.lights > 0) for (const c of crew) if (c.bot && !c.fuse && Math.random() < dt * 0.3 && !crew.some((q) => q.fuse)) c.fuse = true;
    const vis = crew.filter((c) => c.alive && c.vent == null && !c.invis && canSee(p, c.x, c.y));
    if (p.mode === 'flee') { if (goTo(p, p.fl.x, p.fl.y, dt, 22)) { if (p.fl.vent && Math.random() < 0.7) { enterVent(p, p.fl.vent); p.timer = rnd(1, 2.5); } p.mode = 'idle'; } return; }
    if (p.mode === 'fake') { if (p.timer > 0) { if (p.fst) { if (goTo(p, p.fst.x, p.fst.y, dt, 24)) p.moving = false; } } else p.mode = 'idle'; if (!vis.length || p.cd > 0 || p.mode === 'fake') { if (p.mode === 'fake' && vis.length && p.cd <= 0 && vis.length === 1) p.mode = 'idle'; else return; } }
    if (vis.length && p.cd <= 0) {
      const tgt = vis.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      const others = G.players.filter((q) => q.alive && q !== p && q !== tgt && q.role === 'crew' && q.vent == null && canSee(p, q.x, q.y));
      if (others.length && Math.hypot(tgt.x - p.x, tgt.y - p.y) < 160) { p.mode = 'fake'; p.fst = pick(STATIONS); p.timer = rnd(5, 9); return; }
      if (!others.length) {
        if (goTo(p, tgt.x, tgt.y, dt, KILL_RANGE * 0.7)) {
          kill(p, tgt);
          const v = nearestVent(p, 170); p.mode = 'idle';
          if (v && Math.random() < 0.4) { p.mode = 'flee'; p.fl = { x: v.x, y: v.y, vent: v }; }
          else if (Math.random() < 0.15) { /* stay and maybe self-report: handled by botBody */ }
          else { p.mode = 'fake'; p.fst = pick(STATIONS); p.timer = rnd(4, 8); }
        } return;
      }
    }
    if (p.mode === 'idle') { p.mode = Math.random() < 0.6 ? 'hunt' : 'fake'; p.fst = pick(STATIONS); p.timer = rnd(6, 11); p.huntT = rnd(5, 9); p.rt = null; }
    if (p.mode === 'hunt') {
      if (!p.rt || p.timer <= 0) { p.rt = HUB_POINTS(); p.timer = rnd(5, 9); }
      if (vis.length && p.cd > 0) { const c = vis[0]; if (Math.hypot(c.x - p.x, c.y - p.y) > 220) goTo(p, c.x, c.y, dt, 160); else p.moving = false; if (Math.random() < dt * 0.1) p.mode = 'fake'; }
      else if (goTo(p, p.rt.x, p.rt.y, dt, 20)) p.rt = null;
    }
    if (p.mode === 'fake' && !p.fst) p.fst = pick(STATIONS);
  }

  // ------------------------------------------------------------------ player input
  const keys = {}, joy = { x: 0, y: 0, id: null };
  function useTarget(p) {
    if (p.role === 'crew' && G.overload) for (let i = 0; i < 2; i++) if (!G.overload.fixed[i] && Math.hypot(FIX[i].x - p.x, FIX[i].y - p.y) < USE_RANGE) return { k: 'fix', i };
    if (p.role === 'crew' && G.lights > 0 && Math.hypot(FUSE.x - p.x, FUSE.y - p.y) < USE_RANGE) return { k: 'fuse' };
    for (const t of p.tasks) { const s = STATIONS[t.id]; if (Math.hypot(s.x - p.x, s.y - p.y) < USE_RANGE && (p.role === 'imp' || !t.done)) return { k: 'task', t, s }; }
    if (G.emergLeft > 0 && Math.hypot(HUB.x - p.x, HUB.y - p.y) < 110) return { k: 'table' };
    return null;
  }
  function doUse() {
    const p = G.me; if (G.phase !== 'play' || !p.alive && p.role === 'imp' || G.task) return;
    const u = useTarget(p); if (!u) return;
    if (G.online && !G.host) {                      // guests ask the host for everything except the task mini-game itself
      if (u.k === 'task') openTask(u.t, u.s); else if (u.k === 'fix') room.send({ k: 'fix', i: u.i }); else if (u.k === 'fuse') room.send({ k: 'fuse' }); else if (u.k === 'table' && p.alive) room.send({ k: 'table' });
      return;
    }
    if (u.k === 'fix') { G.overload.fixed[u.i] = true; toast('Panel fixed!', 1.5); tone(700, 0.1, 'triangle'); }
    else if (u.k === 'fuse') { G.lights = 0; toast('Lights are back!', 1.5); tone(700, 0.1, 'triangle'); }
    else if (u.k === 'table' && p.alive) { G.emergLeft--; startMeeting(p, null); }
    else if (u.k === 'task') openTask(u.t, u.s);
  }
  function doKill(who) { const p = who || G.me; if (G.online && !G.host && !who) { if (G.me.role === 'imp' && G.me.alive && G.me.cd <= 0) room.send({ k: 'kill' }); return; } if (G.phase !== 'play' || p.role !== 'imp' || !p.alive || (p.cd > 0 && !(p === G.me && owner() && ownS.nocd)) || p.vent != null || G.task) return; const v = crewAlive().filter((c) => Math.hypot(c.x - p.x, c.y - p.y) < KILL_RANGE).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (v) kill(p, v); }
  function doVent(who) {
    const p = who || G.me; if (G.online && !G.host && !who) { if (p.role === 'imp' && p.alive) room.send({ k: 'vent' }); return; }
    if (G.phase !== 'play' || p.role !== 'imp' || !p.alive || (G.task && p === G.me)) return;
    if (p.vent == null) { const v = nearestVent(p, 70); if (v) enterVent(p, v); }
    else { const nx = VENTS[(p.vent + 1) % VENTS.length]; p.vent = nx.id; p.x = nx.x; p.y = nx.y; tone(300, 0.08, 'triangle'); }
  }
  function doExitVent(who) { const p = who || G.me; if (G.online && !G.host && !who) { room.send({ k: 'exitvent' }); return; } if (p.vent != null) exitVent(p); }
  function doReport(who) { const p = who || G.me; if (G.online && !G.host && !who) { room.send({ k: 'report' }); return; } if (G.phase === 'play' && p.alive && (!G.task || p !== G.me)) reportBody(p); }
  function humanStep(dt) {
    const p = G.me; p.cd -= dt; p.anim += dt;
    let ax = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, ay = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0) + joy.y;
    const m = Math.hypot(ax, ay); if (m > 1) { ax /= m; ay /= m; }
    p.moving = false;
    if (G.phase === 'play' && !G.task && p.vent == null && m > 0.05) { const sp = SPEED * (owner() && ownS.speed ? 2 : 1); if (owner() && ownS.noclip) { p.x += ax * sp * dt; p.y += ay * sp * dt; if (ax) p.face = ax > 0 ? 1 : -1; } else moveEnt(p, ax * sp * dt, ay * sp * dt); p.moving = true; }
    p.invis = owner() && ownS.invis; if (owner() && ownS.nocd && p.cd > 0) p.cd = 0;
    if (p.alive || p.role === 'crew') for (const q of G.players) if (q.alive && q !== p && q.vent == null && canSee(p, q.x, q.y)) q.seenByMe = G.t;
  }

  // ------------------------------------------------------------------ the main step
  function step(dt) {
    if (!G) return;
    G.t += dt; G.toasts = G.toasts.filter((x) => (x.left -= dt) > 0);
    if (G.online && !G.host) return guestStep(dt);
    if (G.phase === 'intro') { G.introT -= dt; if (G.introT <= 0) G.phase = 'play'; for (const p of G.players) p.anim += dt; return; }
    if (G.phase === 'end') return;
    if (G.phase === 'meeting') { stepMeeting(dt); return; }
    if (G.task) { G.task.t.t += dt; G.task.t.update && G.task.t.update(dt); if (G.task.t.done) { G.task.fin = (G.task.fin || 0) + dt; if (G.task.fin > 0.6) finishTask(); } }
    for (const p of G.players) { if (p === G.me && !G.auto) humanStep(dt); else if (p.remote) remoteStep(p, dt); else if (!p.frz || (p.frz -= dt) <= 0) botStep(p, dt); }
    if (G.lights > 0) G.lights -= dt; if (G.sabCd > 0 && !G.lights && !G.overload) G.sabCd -= dt;
    if (G.overload) { G.overload.t -= dt; if (G.overload.fixed[0] && G.overload.fixed[1]) { G.overload = null; toast('Reactor saved!', 2); G.sabCd = 35; } else if (G.overload.t <= 0) checkWin(); }
    if (G.t > GAME_LIMIT) checkWin();
  }

  // ------------------------------------------------------------------ task mini-games (400x300 logical canvas)
  function mkTask(type) {
    const T = { type, done: false, t: 0, msg: '', title: TASK_TYPES[type][1] }, hit = (x, y, bx, by, bw, bh) => x >= bx && x <= bx + bw && y >= by && y <= by + bh;
    const btn = (c, x, y, w, h, label, col) => { c.fillStyle = col || '#ffd23f'; c.strokeStyle = '#222'; c.lineWidth = 3; c.beginPath(); c.roundRect(x, y, w, h, 12); c.fill(); c.stroke(); c.fillStyle = '#222'; c.font = '800 20px system-ui'; c.textAlign = 'center'; c.fillText(label, x + w / 2, y + h / 2 + 7); };
    if (type === 'wires') {
      const cols = ['#ff4d4d', '#4da3ff', '#ffd23f', '#4cd964'], R2 = shuffle([0, 1, 2, 3]), ly = (i) => 55 + i * 62; T.con = [null, null, null, null]; T.drag = null;
      T.down = (x, y) => { for (let i = 0; i < 4; i++) if (Math.hypot(x - 50, y - ly(i)) < 24) T.drag = { i, x, y }; };
      T.move = (x, y) => { if (T.drag) { T.drag.x = x; T.drag.y = y; } };
      T.up = (x, y) => { if (!T.drag) return; for (let j = 0; j < 4; j++) if (Math.hypot(x - 350, y - ly(j)) < 28 && R2[j] === T.drag.i) { T.con[T.drag.i] = j; tone(600 + j * 80, 0.06, 'triangle', 0.04); } T.drag = null; T.done = T.con.every((v) => v != null); };
      T.draw = (c) => { c.lineWidth = 8; c.lineCap = 'round'; for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; c.strokeStyle = cols[i]; c.beginPath(); c.arc(50, ly(i), 14, 0, 7); c.fill(); if (T.con[i] != null) { c.beginPath(); c.moveTo(50, ly(i)); c.bezierCurveTo(150, ly(i), 250, ly(T.con[i]), 350, ly(T.con[i])); c.stroke(); } c.fillStyle = cols[R2[i]]; c.beginPath(); c.arc(350, ly(i), 14, 0, 7); c.fill(); } if (T.drag) { c.strokeStyle = cols[T.drag.i]; c.beginPath(); c.moveTo(50, ly(T.drag.i)); c.lineTo(T.drag.x, T.drag.y); c.stroke(); } };
    } else if (type === 'bread') {
      T.n = 0; T.cur = { rot: Math.random() < 0.5 }; T.flash = 0;
      const ans = (rot) => { if (T.done) return; if (rot === T.cur.rot) { T.n++; tone(700, 0.05, 'triangle', 0.04); if (T.n >= 6) T.done = true; } else { T.n = Math.max(0, T.n - 1); T.flash = 0.4; tone(150, 0.15, 'sawtooth', 0.05); } T.cur = { rot: Math.random() < 0.5 }; };
      T.down = (x, y) => { if (hit(x, y, 20, 220, 160, 60)) ans(true); else if (hit(x, y, 220, 220, 160, 60)) ans(false); };
      T.update = (dt) => { T.flash = Math.max(0, T.flash - dt); };
      T.draw = (c) => { c.fillStyle = '#fff'; c.font = '700 16px system-ui'; c.textAlign = 'center'; c.fillText('Mouldy → bin · Fresh → basket   (' + T.n + '/6)', 200, 36); c.fillStyle = T.cur.rot ? '#9bb36b' : '#e0a458'; c.strokeStyle = '#222'; c.lineWidth = 4; c.beginPath(); c.roundRect(120, 70, 160, 110, 40); c.fill(); c.stroke(); if (T.cur.rot) { c.fillStyle = '#4f7a2a'; [[160, 110, 14], [215, 130, 18], [245, 95, 11], [180, 150, 10]].forEach((d) => { c.beginPath(); c.arc(d[0], d[1], d[2], 0, 7); c.fill(); }); } else { c.strokeStyle = '#a8742a'; c.lineWidth = 3; c.beginPath(); c.moveTo(170, 95); c.lineTo(190, 150); c.moveTo(220, 90); c.lineTo(240, 150); c.stroke(); } btn(c, 20, 220, 160, 60, '🗑 Mouldy', T.flash ? '#ff7b7b' : '#c9d3e6'); btn(c, 220, 220, 160, 60, '🧺 Fresh', '#ffd23f'); };
    } else if (type === 'card') {
      T.cx = 60; T.drag = null; T.res = '';
      T.down = (x, y) => { if (hit(x, y, T.cx - 50, 120, 100, 64)) T.drag = { t0: T.t, x0: x }; };
      T.move = (x) => { if (T.drag) T.cx = Math.max(60, Math.min(340, x)); };
      T.up = (x) => { if (!T.drag) return; const dt = T.t - T.drag.t0; if (T.cx > 320) { if (dt < 0.35) T.res = 'Too fast. Try again.'; else if (dt > 1.1) T.res = 'Too slow. Try again.'; else { T.done = true; T.res = 'Accepted!'; tone(900, 0.12, 'triangle', 0.05); } } else T.res = 'Bad swipe. Swipe all the way.'; T.drag = null; if (!T.done) T.cx = 60; };
      T.draw = (c) => { c.fillStyle = '#39455c'; c.strokeStyle = '#111'; c.lineWidth = 4; c.beginPath(); c.roundRect(20, 170, 360, 40, 10); c.fill(); c.stroke(); c.fillStyle = T.done ? '#4cd964' : '#ff4d4d'; c.fillRect(340, 150, 28, 14); c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.beginPath(); c.roundRect(T.cx - 50, 110, 100, 64, 8); c.fill(); c.stroke(); c.fillStyle = '#4da3ff'; c.fillRect(T.cx - 42, 122, 28, 20); c.fillStyle = '#222'; c.font = '700 16px system-ui'; c.textAlign = 'center'; c.fillText(T.res || 'Drag the card through the reader', 200, 255); };
    } else if (type === 'engine') {
      T.s = [0, 1, 2].map(() => ({ y: rnd(30, 250), target: rnd(70, 210) })); T.grab = -1;
      T.down = (x, y) => { T.s.forEach((s, i) => { if (Math.abs(x - (90 + i * 110)) < 36 && Math.abs(y - s.y) < 30) T.grab = i; }); };
      T.move = (x, y) => { if (T.grab >= 0) T.s[T.grab].y = Math.max(30, Math.min(260, y)); };
      T.up = () => { T.grab = -1; T.done = T.s.every((s) => Math.abs(s.y - s.target) < 11); };
      T.draw = (c) => { T.s.forEach((s, i) => { const x = 90 + i * 110, ok = Math.abs(s.y - s.target) < 11; c.fillStyle = '#39455c'; c.fillRect(x - 8, 20, 16, 250); c.fillStyle = 'rgba(76,217,100,.5)'; c.fillRect(x - 22, s.target - 11, 44, 22); c.fillStyle = ok ? '#4cd964' : '#ffd23f'; c.strokeStyle = '#222'; c.lineWidth = 3; c.beginPath(); c.roundRect(x - 26, s.y - 14, 52, 28, 8); c.fill(); c.stroke(); }); c.fillStyle = '#fff'; c.font = '700 14px system-ui'; c.textAlign = 'center'; c.fillText('Drag each knob into its green band', 200, 288); };
    } else if (type === 'download') {
      T.p = 0; T.hold = false;
      T.down = (x, y) => { if (hit(x, y, 100, 170, 200, 80)) T.hold = true; }; T.up = () => { T.hold = false; };
      T.update = (dt) => { if (T.done) return; T.p = T.hold ? Math.min(1, T.p + dt / 3.2) : Math.max(0, T.p - dt * 0.5); if (T.p >= 1) { T.done = true; tone(900, 0.15, 'triangle', 0.05); } };
      T.draw = (c) => { c.fillStyle = '#222'; c.fillRect(40, 60, 320, 36); c.fillStyle = '#4cd964'; c.fillRect(44, 64, 312 * T.p, 28); c.fillStyle = '#fff'; c.font = '700 16px system-ui'; c.textAlign = 'center'; c.fillText(Math.floor(T.p * 100) + '%  downloading the star map', 200, 130); btn(c, 100, 170, 200, 80, T.done ? 'Done!' : T.hold ? 'Downloading…' : 'HOLD ME', T.hold ? '#8be9a0' : '#ffd23f'); };
    } else {                                               // simon
      const pc = ['#ff4d4d', '#4da3ff', '#ffd23f', '#4cd964']; T.seq = [0, 1, 2, 3].map(() => (Math.random() * 4) | 0); T.stage = 'show'; T.i = 0; T.tt = 0.8; T.lit = -1; T.in = 0;
      const padRect = (i) => [60 + (i % 2) * 150, 40 + ((i / 2) | 0) * 120, 130, 100];
      T.update = (dt) => { if (T.stage !== 'show') { T.lit = T.lit >= 0 && (T.litT -= dt) <= 0 ? -1 : T.lit; return; } T.tt -= dt; if (T.tt <= 0) { if (T.lit >= 0) { T.lit = -1; T.tt = 0.25; T.i++; } else if (T.i >= T.seq.length) { T.stage = 'input'; T.in = 0; } else { T.lit = T.seq[T.i]; T.tt = 0.5; tone(300 + T.lit * 120, 0.3, 'triangle', 0.05); } } };
      T.down = (x, y) => { if (T.stage !== 'input') return; for (let i = 0; i < 4; i++) { const r = padRect(i); if (hit(x, y, r[0], r[1], r[2], r[3])) { T.lit = i; T.litT = 0.2; tone(300 + i * 120, 0.25, 'triangle', 0.05); if (i === T.seq[T.in]) { T.in++; if (T.in >= T.seq.length) T.done = true; } else { T.stage = 'show'; T.i = 0; T.tt = 0.8; T.seq = T.seq.map(() => (Math.random() * 4) | 0); } } } };
      T.draw = (c) => { for (let i = 0; i < 4; i++) { const r = padRect(i); c.globalAlpha = T.lit === i ? 1 : 0.45; c.fillStyle = pc[i]; c.strokeStyle = '#222'; c.lineWidth = 4; c.beginPath(); c.roundRect(r[0], r[1], r[2], r[3], 16); c.fill(); c.stroke(); } c.globalAlpha = 1; c.fillStyle = '#fff'; c.font = '700 15px system-ui'; c.textAlign = 'center'; c.fillText(T.stage === 'show' ? 'Watch…' : 'Your turn! (' + T.in + '/' + T.seq.length + ')', 200, 285); };
    }
    return T;
  }
  function openTask(t, s) { G.task = { st: t, s, t: mkTask(s.type), fin: 0 }; dom.task.style.display = 'flex'; dom.ttl.textContent = TASK_TYPES[s.type][0] + ' ' + TASK_TYPES[s.type][1] + (G.me.role === 'imp' ? ' (just pretending)' : ''); }
  function closeTask() { G && (G.task = null); if (dom) dom.task.style.display = 'none'; }
  function finishTask() {
    const k = G.task; closeTask(); if (!k) return;
    if (G.online && !G.host) { if (G.me.role === 'crew' && !k.st.done) { k.st.done = true; room.send({ k: 'task', id: k.s.id }); tone(880, 0.1, 'triangle', 0.05); } else if (G.me.role === 'imp') toast('Nice fake. Nobody suspects a thing.', 1.8); return; }
    if (G.me.role === 'crew' && !k.st.done) { k.st.done = true; G.tasksDone++; tone(880, 0.1, 'triangle', 0.05); checkWin(); }
    else if (G.me.role === 'imp') toast('Nice fake. Nobody suspects a thing.', 1.8);
  }

  // ------------------------------------------------------------------ drawing
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; };
  function goose(c, x, y, col, face, t, moving, ghost, dead, fox) {
    c.save(); c.translate(x, y); c.scale(face, 1); if (ghost) c.globalAlpha = 0.45;
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, 15, 15, 5, 0, 0, 7); c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 2.4;
    if (dead) {
      c.rotate(0.15); c.fillStyle = col; c.beginPath(); c.ellipse(0, 6, 17, 10, 0, 0, 7); c.fill(); c.stroke(); c.strokeStyle = '#ff9b2f'; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, -4); c.lineTo(-8, -14); c.moveTo(3, -4); c.lineTo(4, -14); c.stroke();
      c.strokeStyle = '#222'; c.lineWidth = 2; c.beginPath(); c.moveTo(12, 0); c.lineTo(18, 6); c.moveTo(18, 0); c.lineTo(12, 6); c.stroke(); c.restore(); return;
    }
    const bob = moving ? Math.sin(t * 14) * 2.5 : 0;
    c.strokeStyle = '#ff9b2f'; c.lineWidth = 3; c.beginPath(); c.moveTo(-4, 8); c.lineTo(-4 + bob, 17); c.moveTo(5, 8); c.lineTo(5 - bob, 17); c.stroke();
    c.strokeStyle = '#222'; c.lineWidth = 2.4;
    c.fillStyle = col; c.beginPath(); c.ellipse(0, 2, 15, 11, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = shade(col, 0.78); c.beginPath(); c.ellipse(-3, 3, 8, 5.5, -0.2, 0, 7); c.fill(); c.stroke();
    c.strokeStyle = col; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(9, -4); c.quadraticCurveTo(14, -12, 11, -19); c.stroke();
    c.fillStyle = col; c.strokeStyle = '#222'; c.lineWidth = 2.2; c.beginPath(); c.arc(11, -20, 6.5, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#ff9b2f'; c.beginPath(); c.moveTo(16, -22); c.lineTo(23, -19); c.lineTo(16, -17); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#222'; c.beginPath(); c.arc(12, -22, 1.6, 0, 7); c.fill();
    if (fox) { c.fillStyle = '#e8541f'; c.strokeStyle = '#222'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(6, -24); c.lineTo(8, -33); c.lineTo(12, -26); c.fill(); c.stroke(); c.beginPath(); c.moveTo(13, -26); c.lineTo(17, -33); c.lineTo(17, -24); c.fill(); c.stroke(); }
    c.restore();
  }
  function drawWorld(c, cw, ch, sc) {
    const me = G.me, cam = { x: me.x, y: me.y };
    c.save(); c.translate(cw / 2 - cam.x * sc, ch / 2 - cam.y * sc); c.scale(sc, sc);
    c.fillStyle = '#10141f'; c.fillRect(-200, -200, WW + 400, WH + 400);
    c.fillStyle = '#05070d'; for (const r of walk) c.fillRect(r.x - 9, r.y - 9, r.w + 18, r.h + 18);                    // walls
    for (const r of walk) { c.fillStyle = r.room >= 0 ? ROOM_COL[r.room] : '#39425a'; c.fillRect(r.x, r.y, r.w, r.h); }
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; c.beginPath(); for (const r of walk) { for (let x = r.x; x <= r.x + r.w; x += 40) { c.moveTo(x, r.y); c.lineTo(x, r.y + r.h); } for (let y = r.y; y <= r.y + r.h; y += 40) { c.moveTo(r.x, y); c.lineTo(r.x + r.w, y); } } c.stroke();
    c.fillStyle = 'rgba(255,255,255,.28)'; c.font = '800 26px system-ui'; c.textAlign = 'center'; ROOMS.forEach((n, i) => c.fillText(n, rx(i) + RW / 2, ry(i) + 38));
    for (const b of blocks) { c.fillStyle = b.w > 100 ? '#8a6a3a' : '#6a5a3a'; c.strokeStyle = '#1a140a'; c.lineWidth = 4; c.beginPath(); c.roundRect(b.x, b.y, b.w, b.h, b.w > 100 ? 30 : 8); c.fill(); c.stroke(); if (b.w > 100) { c.fillStyle = '#fff'; c.font = '28px system-ui'; c.fillText('📢', HUB.x, HUB.y + 10); } }
    const pulse = 0.5 + 0.5 * Math.sin(G.t * 5);
    for (const t of me.tasks) { const s = STATIONS[t.id]; c.fillStyle = t.done ? 'rgba(76,217,100,.25)' : 'rgba(255,210,63,' + (0.2 + pulse * 0.25) + ')'; c.beginPath(); c.arc(s.x, s.y, 34, 0, 7); c.fill(); }
    for (const s of STATIONS) { c.fillStyle = '#222'; c.beginPath(); c.arc(s.x, s.y, 22, 0, 7); c.fill(); c.font = '24px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(TASK_TYPES[s.type][0], s.x, s.y + 8); const mt = me.tasks.find((t) => t.id === s.id); if (mt && !mt.done) { c.fillStyle = '#ffd23f'; c.font = '800 22px system-ui'; c.fillText('!', s.x + 20, s.y - 16); } else if (mt) { c.fillStyle = '#4cd964'; c.font = '800 20px system-ui'; c.fillText('✓', s.x + 20, s.y - 16); } }
    c.font = '26px system-ui'; c.textAlign = 'center'; c.fillStyle = G.lights > 0 ? '#ff4d4d' : '#ffd23f'; c.fillText('🔌', FUSE.x, FUSE.y + 8);
    if (G.overload) FIX.forEach((f, i) => { c.fillStyle = G.overload.fixed[i] ? '#4cd964' : (pulse > 0.5 ? '#ff4d4d' : '#ffd23f'); c.beginPath(); c.arc(f.x, f.y, 26, 0, 7); c.fill(); c.fillStyle = '#222'; c.font = '26px system-ui'; c.fillText('☢', f.x, f.y + 9); });
    for (const v of VENTS) { c.fillStyle = '#222'; c.strokeStyle = '#555'; c.lineWidth = 3; c.beginPath(); c.roundRect(v.x - 26, v.y - 16, 52, 32, 6); c.fill(); c.stroke(); c.strokeStyle = '#666'; c.beginPath(); for (let i = -16; i <= 16; i += 8) { c.moveTo(v.x + i, v.y - 10); c.lineTo(v.x + i, v.y + 10); } c.stroke(); }
    const meGhost = !me.alive;
    for (const b of G.bodies) if (meGhost || canSee(me, b.x, b.y)) goose(c, b.x, b.y, b.col, 1, 0, false, false, true);
    const draw = G.players.filter((p) => p.alive || meGhost && p.ghostShow).filter((p) => p === me || p.vent == null && !(p.invis && !(owner() && ownS.xray)) && (me.alive ? canSee(me, p.x, p.y) : true)).sort((a, b) => a.y - b.y);
    for (const p of draw) {
      goose(c, p.x, p.y, p.col, p.face, p.anim, p.moving, !p.alive, false, p.role === 'imp' && (p === me || (me.role === 'imp') || owner() && ownS.xray));
      c.font = '800 13px system-ui'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#000'; c.fillStyle = p.role === 'imp' && (me.role === 'imp' || (owner() && ownS.xray)) ? '#ff6a4a' : '#fff'; c.strokeText(p.name, p.x, p.y - 40); c.fillText(p.name, p.x, p.y - 40);
    }
    if (meGhost) for (const p of G.players) if (!p.alive && !p.ejected && p !== me) { /* other ghosts stay hidden */ }
    c.restore();
    if (me.alive && me.vent == null || !me.alive) {
      const rad = (me.alive ? visR(me) : 9999) * sc;
      if (rad < 3000) {                                                    // fog of war
        c.save(); const g = c.createRadialGradient(cw / 2, ch / 2, rad * 0.55, cw / 2, ch / 2, rad); g.addColorStop(0, 'rgba(3,5,12,0)'); g.addColorStop(1, 'rgba(3,5,12,.97)');
        c.fillStyle = g; c.beginPath(); c.arc(cw / 2, ch / 2, rad, 0, 7); c.fill(); c.fillStyle = 'rgba(3,5,12,.97)'; c.beginPath(); c.rect(0, 0, cw, ch); c.arc(cw / 2, ch / 2, rad, 0, 7, true); c.fill('evenodd'); c.restore();
      }
    } else { c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(0, 0, cw, ch); }
  }
  function drawHud(c, cw, ch) {
    const me = G.me, f = Math.max(0.8, Math.min(1.3, cw / 900));
    c.save(); c.scale(1, 1);
    const w = Math.min(360, cw * 0.5), x = (cw - w) / 2; c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.roundRect(x, 10, w, 26, 13); c.fill();
    c.fillStyle = '#4cd964'; c.beginPath(); c.roundRect(x + 3, 13, Math.max(0, (w - 6) * G.tasksDone / Math.max(1, G.tasksTotal)), 20, 10); c.fill(); c.fillStyle = '#fff'; c.font = '800 13px system-ui'; c.textAlign = 'center'; c.fillText('TASKS ' + G.tasksDone + '/' + G.tasksTotal + (me.role === 'imp' ? '  (crew)' : ''), cw / 2, 28);
    // minimap
    const mw = 130 * f, mh = mw * WH / WW, mx = 10, my = 10; c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(mx - 4, my - 4, mw + 8, mh + 8); const k = mw / WW;
    for (const r of walk) { c.fillStyle = r.room >= 0 ? ROOM_COL[r.room] : '#4a546a'; c.fillRect(mx + r.x * k, my + r.y * k, r.w * k, r.h * k); }
    for (const t of me.tasks) if (!t.done) { const s = STATIONS[t.id]; c.fillStyle = '#ffd23f'; c.fillRect(mx + s.x * k - 2, my + s.y * k - 2, 4, 4); }
    if (G.overload) FIX.forEach((fx, i) => { if (!G.overload.fixed[i]) { c.fillStyle = '#ff4d4d'; c.beginPath(); c.arc(mx + fx.x * k, my + fx.y * k, 4, 0, 7); c.fill(); } });
    if (G.lights > 0) { c.fillStyle = '#ff4d4d'; c.beginPath(); c.arc(mx + FUSE.x * k, my + FUSE.y * k, 4, 0, 7); c.fill(); }
    c.fillStyle = me.col; c.strokeStyle = '#000'; c.beginPath(); c.arc(mx + me.x * k, my + me.y * k, 4, 0, 7); c.fill(); c.stroke();
    if (G.overload) { c.fillStyle = '#ff4d4d'; c.font = '900 22px system-ui'; c.textAlign = 'center'; c.fillText('☢ OVERLOAD ' + Math.max(0, Math.ceil(G.overload.t)) + 's', cw / 2, 62); }
    else if (G.lights > 0 && me.role === 'crew') { c.fillStyle = '#ffd23f'; c.font = '800 18px system-ui'; c.textAlign = 'center'; c.fillText('💡 Lights out! Fix the fuse panel in the Storage Barn', cw / 2, 62); }
    c.textAlign = 'center'; c.font = '800 15px system-ui'; let ty = ch - 14 - 130; for (const t of G.toasts) { c.fillStyle = 'rgba(0,0,0,.7)'; const tw = c.measureText(t.t).width + 24; c.beginPath(); c.roundRect(cw / 2 - tw / 2, ty - 18, tw, 28, 14); c.fill(); c.fillStyle = '#fff'; c.fillText(t.t, cw / 2, ty); ty -= 34; }
    if (G.phase === 'intro') {
      c.fillStyle = 'rgba(0,0,0,.78)'; c.fillRect(0, 0, cw, ch); const imp = me.role === 'imp'; c.fillStyle = imp ? '#ff6a4a' : '#8be9a0'; c.font = '900 ' + Math.round(48 * f) + 'px system-ui'; c.textAlign = 'center'; c.fillText(imp ? 'YOU ARE A FOX' : 'YOU ARE A GOOSE', cw / 2, ch / 2 - 30);
      c.fillStyle = '#fff'; c.font = '700 ' + Math.round(18 * f) + 'px system-ui'; c.fillText(imp ? 'Sneak-kill the crew. Teammates: ' + (imps().filter((p) => p !== me).map((p) => p.name).join(', ') || 'none (you are alone!)') : ((G.nImp || imps().length) + ' Fox' + ((G.nImp || imps().length) > 1 ? 'es are' : ' is') + ' hiding among ' + G.players.length + ' geese. Finish tasks, find the Fox!'), cw / 2, ch / 2 + 12);
    }
    if (G.phase === 'meeting' && G.m.stage === 'result') {
      const m = G.m, e = m.res.ej; c.fillStyle = '#05070d'; c.fillRect(0, 0, cw, ch);
      const px = ((m.rt / 3.5) % 1.4) * cw * 0.9 - cw * 0.1; if (e) { c.save(); c.translate(px, ch / 2 - 30 + Math.sin(m.rt * 4) * 14); c.rotate(m.rt * 3); c.scale(2.6, 2.6); goose(c, 0, 0, e.col, 1, m.rt, false, false, false); c.restore(); }
      c.fillStyle = '#fff'; c.font = '800 ' + Math.round(26 * f) + 'px system-ui'; c.textAlign = 'center';
      c.fillText(e ? e.name + (e.role === 'imp' ? ' WAS a Fox.' : ' was not a Fox.') : 'Nobody was ejected. (Skipped or tied.)', cw / 2, ch / 2 + 100);
      if (e) { c.font = '700 16px system-ui'; c.fillStyle = '#aab'; c.fillText(imps().length + ' Fox' + (imps().length === 1 ? '' : 'es') + ' remain', cw / 2, ch / 2 + 128); }
    }
    c.restore();
  }
  function render() {
    if (!G || !dom) return; const cv = dom.cv, dpr = Math.min(2, root.devicePixelRatio || 1), cw = cv.clientWidth, ch = cv.clientHeight;
    if (cv.width !== Math.floor(cw * dpr) || cv.height !== Math.floor(ch * dpr)) { cv.width = Math.floor(cw * dpr); cv.height = Math.floor(ch * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cw, ch);
    drawWorld(c, cw, ch, Math.min(cw / 760, ch / 520) * 1.0); drawHud(c, cw, ch);
    if (G.task) { const tc = dom.tcv.getContext('2d'); tc.setTransform(dom.tcv.width / 400, 0, 0, dom.tcv.height / 300, 0, 0); tc.fillStyle = '#1b2236'; tc.fillRect(0, 0, 400, 300); tc.lineCap = 'butt'; G.task.t.draw(tc); if (G.task.t.done) { tc.fillStyle = 'rgba(76,217,100,.35)'; tc.fillRect(0, 0, 400, 300); tc.fillStyle = '#fff'; tc.font = '900 34px system-ui'; tc.textAlign = 'center'; tc.fillText('✓ DONE', 200, 160); } }
    updateButtons();
  }
  function updateButtons() {
    const me = G.me, play = G.phase === 'play' && !G.task, imp = me.role === 'imp' && me.alive, u = play ? useTarget(me) : null;
    const show = (b, on, dim) => { b.style.display = on ? 'flex' : 'none'; b.style.opacity = dim ? 0.45 : 1; };
    show(dom.use, G.phase === 'play' && !G.task && me.vent == null, !u); show(dom.rep, play && me.alive && G.bodies.some((b) => !b.rep && Math.hypot(b.x - me.x, b.y - me.y) < REPORT_RANGE), false);
    show(dom.kill, play && imp && me.vent == null, me.cd > 0 || !crewAlive().some((q) => Math.hypot(q.x - me.x, q.y - me.y) < KILL_RANGE)); dom.kill.querySelector('small').textContent = me.cd > 0 ? Math.ceil(me.cd) + 's' : '';
    show(dom.vent, play && imp && (me.vent != null || !!nearestVent(me, 70)), false); dom.vent.firstChild.textContent = me.vent != null ? 'NEXT' : 'VENT';
    show(dom.sab, play && imp && me.vent == null, G.sabCd > 0 || !!G.lights || !!G.overload); dom.sabm.style.display = G.sabMenu && play ? 'flex' : 'none';
    dom.stick.style.display = G.phase === 'play' || G.phase === 'intro' ? 'block' : 'none';
    dom.exitv.style.display = play && me.vent != null ? 'flex' : 'none';
    buildOwn();
  }

  // ------------------------------------------------------------------ DOM
  const CSS = `
  #crew{position:fixed;inset:0;z-index:70;background:#05070d;display:none;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,sans-serif;color:#fff}
  #crew canvas#crcv{position:absolute;inset:0;width:100%;height:100%}
  #crew .b{position:absolute;border-radius:50%;border:3px solid rgba(255,255,255,.85);background:rgba(30,30,40,.55);color:#fff;font-weight:800;display:none;align-items:center;justify-content:center;flex-direction:column;text-align:center;font-size:15px;touch-action:none;width:84px;height:84px;line-height:1.1;cursor:pointer}
  #crew #cruse{right:max(16px,env(safe-area-inset-right));bottom:max(24px,env(safe-area-inset-bottom));width:104px;height:104px;background:rgba(255,155,47,.92);color:#1b1b1b}
  #crew #crrep{right:calc(max(16px,env(safe-area-inset-right)) + 118px);bottom:max(30px,env(safe-area-inset-bottom));background:rgba(230,57,70,.92)}
  #crew #crkill{right:max(16px,env(safe-area-inset-right));bottom:calc(max(24px,env(safe-area-inset-bottom)) + 116px);background:rgba(200,30,30,.92)}
  #crew #crvent{right:calc(max(16px,env(safe-area-inset-right)) + 96px);bottom:calc(max(24px,env(safe-area-inset-bottom)) + 116px);background:rgba(90,90,110,.95)}
  #crew #crsab{right:calc(max(16px,env(safe-area-inset-right)) + 192px);bottom:calc(max(24px,env(safe-area-inset-bottom)) + 40px);background:rgba(120,60,160,.92)}
  #crew #crsabm{position:absolute;right:calc(max(16px,env(safe-area-inset-right)) + 150px);bottom:calc(max(24px,env(safe-area-inset-bottom)) + 130px);display:none;gap:8px;flex-direction:column}
  #crew #crexitv{right:calc(max(16px,env(safe-area-inset-right)) + 190px);bottom:calc(max(24px,env(safe-area-inset-bottom)) + 116px);background:rgba(90,90,110,.95);width:70px;height:70px}
  #crew #crown{position:absolute;left:10px;top:150px;display:none;flex-direction:column;gap:5px;z-index:3}#crew #crown button{font:700 12px system-ui;padding:5px 8px;border-radius:9px;border:2px solid rgba(255,255,255,.7);background:rgba(30,30,40,.6);color:#fff;text-align:left}#crew #crown button.on{background:#d6192b}
  #crew #crquit{right:12px;top:12px;width:44px;height:44px;font-size:20px;display:flex;border-radius:12px}
  #crew #crstick{left:max(22px,env(safe-area-inset-left));bottom:max(28px,env(safe-area-inset-bottom));width:128px;height:128px;background:rgba(30,30,40,.3)}
  #crew #crknob{position:absolute;left:36px;top:36px;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.6);pointer-events:none}
  #crew .panel{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,12,24,.84);overflow:auto;padding:12px}
  #crew .card{background:#fff;color:#1b1f33;border-radius:20px;padding:16px;max-width:560px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.4);max-height:100%;overflow:auto}
  #crew h2{margin:0 0 4px;font-size:24px}#crew .sub{opacity:.7;font-size:14px;margin-bottom:8px}
  #crew .row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;align-items:center}#crew .row b{font-size:14px;min-width:64px}
  #crew .chip{border:3px solid #dfe3f1;border-radius:999px;padding:7px 14px;font-weight:700;font-size:14px;background:#f7f8fd;cursor:pointer}#crew .chip.on{border-color:#ff9b2f;background:#fff3e3}
  #crew .go{background:#ff9b2f;color:#1b1b1b;border:0;border-radius:14px;padding:12px 22px;font-size:18px;font-weight:800;cursor:pointer}#crew .go.alt{background:#e6e9f5}
  #crew #crtask{background:rgba(5,7,13,.8)}#crew #crtask .card{width:min(440px,96vw);text-align:center;background:#2a3350;color:#fff}#crew #crtcv{width:100%;aspect-ratio:4/3;border-radius:12px;touch-action:none;background:#1b2236}
  #crew #crmeet .card{max-width:760px;background:#1d2440;color:#fff}#crew #crchat{height:170px;overflow:auto;background:#111731;border-radius:12px;padding:8px;font-size:14px;margin:8px 0}
  #crew .msg{margin:3px 0}#crew .msg i{font-style:normal;font-weight:800}
  #crew #crcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
  #crew .pc{display:flex;align-items:center;gap:8px;border:3px solid #39456f;border-radius:12px;padding:8px;font-weight:700;font-size:14px;background:#252e52;cursor:pointer}
  #crew .pc.dead{opacity:.35;cursor:default}#crew .pc.sel{border-color:#ff9b2f}#crew .dot{width:22px;height:22px;border-radius:50%;border:2px solid #000;flex:none}#crew .pc small{margin-left:auto;font-size:11px;opacity:.8}
  `;
  function ensureDom() {
    if (dom) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'crew';
    d.innerHTML = `<canvas id="crcv"></canvas>
      <div class="b" id="crstick"><div id="crknob"></div></div>
      <div class="b" id="cruse"><span>USE</span><small>(E)</small></div><div class="b" id="crrep"><span>REPORT</span><small>(R)</small></div>
      <div class="b" id="crkill"><span>KILL</span><small></small></div><div class="b" id="crvent"><span>VENT</span><small>(F)</small></div><div class="b" id="crsab"><span>SABO</span><small>(X/Z)</small></div>
      <div id="crsabm"><button class="go" id="crlights">💡 Lights out</button><button class="go" id="crover">☢ Overload</button></div>
      <div id="crown"></div><div class="b" id="crexitv"><span>EXIT</span></div><div class="b" id="crquit">☰</div>
      <div class="panel" id="crlobby"><div class="card"><h2>🚀 Goose Among Us</h2><div class="sub">A Fox sneaked aboard the flying barn-ship! Geese do tasks and vote the Fox out; Foxes sneak-kill. Offline, with bots.</div>
        <div class="row"><b>You are</b><span class="chip on" data-role="crew">🪿 Goose</span><span class="chip" data-role="imp">🦊 Fox</span><span class="chip" data-role="random">🎲 Random</span></div>
        <div class="row"><b>Players</b><span class="chip" data-n="5">5</span><span class="chip on" data-n="7">7</span><span class="chip" data-n="9">9</span><span style="font-size:12px;opacity:.7">(7+ players: two Foxes)</span></div>
        <div class="row"><button class="go" id="crstart">Play</button><button class="go alt" id="crback">Back</button></div>
        <h4 style="margin:10px 0 2px">👥 Online with friends</h4>
        <div class="row"><input id="crword" maxlength="24" placeholder="room word (same for everyone)" style="font-size:16px;padding:9px 12px;border-radius:10px;border:3px solid #dfe3f1;width:210px"><button class="go" id="crjoin">Join / create</button></div>
        <div id="cronl" style="display:none"><div class="row" id="crroster"></div><div id="crwait" class="sub"></div>
          <div class="row" id="crhostopts"><span class="chip" id="crOn">Players: 8</span><span class="chip" id="crOi">Foxes: 1</span></div>
          <div class="row"><button class="go" id="crstartonl">▶ Start online game</button><button class="go alt" id="crleave">Leave room</button></div></div>
        <div id="crstat" style="font-size:13px;min-height:16px"></div>
        <div style="font-size:12.5px;opacity:.75">Move: WASD / arrows or the stick · E use · Q kill · R report · F vent · X lights out · Z overload</div></div></div>
      <div class="panel" id="crtask"><div class="card"><div id="crttl" style="font-weight:800;margin-bottom:8px"></div><canvas id="crtcv" width="800" height="600"></canvas><div class="row" style="justify-content:center"><button class="go alt" id="crtclose">Close</button></div></div></div>
      <div class="panel" id="crmeet"><div class="card"><h2 id="crmt">Meeting</h2><div id="crmsub" class="sub" style="color:#aab"></div><div id="crchat"></div><div id="crcards"></div><div class="row" id="crqc" style="justify-content:center"></div><div class="row" style="justify-content:center"><button class="go" id="crskip">Skip vote</button></div></div></div>
      <div class="panel" id="crend"><div class="card"><h2 id="crendt"></h2><pre id="crendx" style="white-space:pre-wrap;font-family:inherit;font-size:15px"></pre><div class="row"><button class="go" id="cragain">Play again</button><button class="go alt" id="crmenu">Menu</button></div></div></div>`;
    document.body.appendChild(d);
    dom = { root: d, cv: $('crcv'), stick: $('crstick'), knob: $('crknob'), use: $('cruse'), rep: $('crrep'), kill: $('crkill'), vent: $('crvent'), sab: $('crsab'), sabm: $('crsabm'), exitv: $('crexitv'), lobby: $('crlobby'), task: $('crtask'), tcv: $('crtcv'), ttl: $('crttl'), meet: $('crmeet'), end: $('crend') };
    const sel = { role: 'crew', n: 7 }; dom.sel = sel;
    d.querySelectorAll('[data-role]').forEach((c) => c.addEventListener('click', () => { d.querySelectorAll('[data-role]').forEach((x) => x.classList.remove('on')); c.classList.add('on'); sel.role = c.dataset.role; }));
    d.querySelectorAll('[data-n]').forEach((c) => c.addEventListener('click', () => { d.querySelectorAll('[data-n]').forEach((x) => x.classList.remove('on')); c.classList.add('on'); sel.n = +c.dataset.n; }));
    const cyc = (id, key, vals, fmt) => $(id).addEventListener('click', () => { osel[key] = vals[(vals.indexOf(osel[key]) + 1) % vals.length]; $(id).textContent = fmt(osel[key]); });
    cyc('crOn', 'n', [6, 8, 10], (v) => 'Players: ' + v); cyc('crOi', 'imp', [1, 2], (v) => 'Foxes: ' + v);
    $('crjoin').addEventListener('click', () => { setupRoom(); try { localStorage.setItem('wobbleCrewWord', $('crword').value); } catch (e) { /* ignore */ } if (room) room.join($('crword').value); else status('Online play is not available (could not load the matchmaking library).', true); });
    $('crword').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('crjoin').click(); }); $('crword').addEventListener('keyup', (e) => e.stopPropagation());
    $('crstartonl').addEventListener('click', startOnline); $('crleave').addEventListener('click', () => { if (room) room.leave(); renderRoster([]); status(''); });
    try { const w = localStorage.getItem('wobbleCrewWord'); if (w) $('crword').value = w; } catch (e) { /* ignore */ }
    $('crstart').addEventListener('click', () => start(sel)); $('cragain').addEventListener('click', () => start(sel));
    $('crback').addEventListener('click', close); $('crmenu').addEventListener('click', close); $('crquit').addEventListener('click', () => { if (G && G.phase !== 'end') { if (G.online && room) room.leave(); showPanel('lobby'); G = null; closeTask(); } else close(); });
    $('crtclose').addEventListener('click', closeTask); $('crskip').addEventListener('click', () => { if (G && G.m && G.m.stage === 'vote') castVote(G.me, 'skip'); });
    const press = (b, fn) => { b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (G) fn(); }); };
    press(dom.use, doUse); press(dom.rep, doReport); press(dom.kill, doKill); press(dom.vent, doVent); press(dom.exitv, doExitVent); press(dom.sab, () => { G.sabMenu = !G.sabMenu; });
    $('crlights').addEventListener('click', () => { G.sabMenu = false; if (G.online && !G.host) room.send({ k: 'sab', w: 'l' }); else startLights(); }); $('crover').addEventListener('click', () => { G.sabMenu = false; if (G.online && !G.host) room.send({ k: 'sab', w: 'o' }); else startOverload(); });
    // joystick
    const stick = dom.stick, setJoy = (e) => { const r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), m = Math.hypot(dx, dy) || 1, k = Math.min(1, m / 50); joy.x = dx / m * k; joy.y = dy / m * k; dom.knob.style.transform = 'translate(' + joy.x * 34 + 'px,' + joy.y * 34 + 'px)'; };
    stick.addEventListener('pointerdown', (e) => { e.preventDefault(); joy.id = e.pointerId; stick.setPointerCapture(e.pointerId); setJoy(e); });
    stick.addEventListener('pointermove', (e) => { if (joy.id === e.pointerId) setJoy(e); });
    const endJoy = (e) => { if (joy.id === e.pointerId) { joy.id = null; joy.x = joy.y = 0; dom.knob.style.transform = ''; } }; stick.addEventListener('pointerup', endJoy); stick.addEventListener('pointercancel', endJoy);
    // task canvas pointer
    const tcv = dom.tcv, tp = (e) => { const r = tcv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 400, (e.clientY - r.top) / r.height * 300]; };
    tcv.addEventListener('pointerdown', (e) => { e.preventDefault(); tcv.setPointerCapture(e.pointerId); if (G && G.task && G.task.t.down) { const p = tp(e); G.task.t.down(p[0], p[1]); } });
    tcv.addEventListener('pointermove', (e) => { if (G && G.task && G.task.t.move) { const p = tp(e); G.task.t.move(p[0], p[1]); } });
    const tup = (e) => { if (G && G.task && G.task.t.up) { const p = tp(e); G.task.t.up(p[0], p[1]); } }; tcv.addEventListener('pointerup', tup); tcv.addEventListener('pointercancel', tup);
    const kd = (e) => {
      if (!isOpen) return; const k = e.key.toLowerCase(); e.stopImmediatePropagation(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (e.type === 'keyup') { keys[k] = false; return; } keys[k] = true; if (e.repeat || !G) return;
      if (k === 'e') doUse(); else if (k === 'q') doKill(); else if (k === 'r') doReport(); else if (k === 'f') doVent(); else if (k === 'x') { if (G.me.role === 'imp' && G.me.alive) { if (G.online && !G.host) room.send({ k: 'sab', w: 'l' }); else startLights(); } } else if (k === 'z') { if (G.me.role === 'imp' && G.me.alive) { if (G.online && !G.host) room.send({ k: 'sab', w: 'o' }); else startOverload(); } } else if (k === 'escape') { if (G.task) closeTask(); }
    };
    root.addEventListener('keydown', kd, true); root.addEventListener('keyup', kd, true);
    d.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  function showPanel(name) { ['lobby', 'meet', 'end'].forEach((p) => { dom[p].style.display = p === name ? 'flex' : 'none'; }); if (name === 'lobby' && dom.root) { /* keep canvas */ } }
  function renderChat() {
    if (!dom || !G) return; const el = $('crchat'); el.innerHTML = '';
    G.chat.forEach((m) => { const d = document.createElement('div'); d.className = 'msg'; const i = document.createElement('i'); i.style.color = m.col; i.textContent = m.name + ': '; d.appendChild(i); d.appendChild(document.createTextNode(m.text)); el.appendChild(d); }); el.scrollTop = el.scrollHeight;
  }
  function renderMeeting() {
    if (!dom || !G || !G.m) return; const m = G.m;
    dom.meet.style.display = m.stage === 'result' ? 'none' : 'flex';
    $('crmt').textContent = m.body ? '🚨 Body reported!' : '📢 Emergency meeting'; $('crmsub').textContent = m.stage === 'discuss' ? 'Discuss… (who looks suspicious?)' : 'Vote for the Fox, or skip. Tap a goose.';
    const cards = $('crcards'); cards.innerHTML = '';
    G.players.forEach((p) => {
      const d = document.createElement('div'); d.className = 'pc' + (p.alive ? '' : ' dead') + (m.votes[G.me.id] === p.id ? ' sel' : '');
      const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = p.col; const nm = document.createElement('span'); nm.textContent = p.name + (p.alive ? '' : ' 💀') + (p === G.me ? ' (you)' : '');
      const sm = document.createElement('small'); sm.textContent = m.votes[p.id] !== undefined ? '✔ voted' : ''; d.append(dot, nm, sm);
      d.addEventListener('click', () => { if (m.stage === 'vote' && p.alive && G.me.alive) castVote(G.me, p.id); }); cards.appendChild(d);
    });
    const qc = $('crqc'); if (qc && !qc.dataset.k + '' !== 'x') { /* built below */ }
    if (qc) { const key = m.stage + (G.me.alive ? 1 : 0); if (qc.dataset.k !== key) { qc.dataset.k = key; qc.innerHTML = '';
      if (G.online && G.me.alive && m.stage !== 'result') {
        const say = (t) => { if (G.host) sayNow(G.me, t); else room.send({ k: 'say', text: t }); };
        ['I saw nothing.', 'I was doing tasks.', 'Where was the body?', 'Let us skip.'].forEach((t) => { const b = document.createElement('button'); b.className = 'go alt'; b.style.cssText = 'font-size:13px;padding:6px 10px'; b.textContent = t; b.addEventListener('click', () => say(t)); qc.appendChild(b); });
        const sel2 = document.createElement('select'); sel2.id = 'crsus'; sel2.style.cssText = 'padding:6px;border-radius:8px'; G.players.forEach((q) => { if (q.alive && q !== G.me) { const o = document.createElement('option'); o.value = q.name; o.textContent = q.name; sel2.appendChild(o); } });
        const sb = document.createElement('button'); sb.className = 'go alt'; sb.style.cssText = 'font-size:13px;padding:6px 10px'; sb.textContent = '🤨 Accuse'; sb.addEventListener('click', () => { if (sel2.value) say('I think ' + sel2.value + ' is the Fox!'); });
        qc.append(sel2, sb);
      } } }
    $('crskip').style.display = m.stage === 'vote' && G.me.alive && m.votes[G.me.id] === undefined ? '' : 'none';
  }
  function showEnd() {
    const r = G.result, me = G.me; showPanel('end'); dom.task.style.display = 'none';
    $('crendt').textContent = (r.won ? '🏆 You win! ' : '😵 You lose. ') + (r.winner === 'crew' ? 'The Geese win!' : 'The Foxes win!');
    $('crendx').textContent = r.reason + '\n\n' + G.players.map((p) => (p.role === 'imp' ? '🦊' : '🪿') + ' ' + p.name + (p.alive ? '' : (p.ejected ? ' (ejected)' : ' (caught)'))).join('\n') + '\n\nTasks ' + G.tasksDone + '/' + G.tasksTotal + ' · meetings ' + G.meetings + ' · kills ' + G.kills + (r.gain && !G.auto ? '\n+' + r.gain + ' 🍞' : '');
  }


  // ------------------------------------------------------------------ online play (Room: host runs the rules and the bots, guests move themselves and ask)
  const PREFIX = 'wobble-crew-v1-', r1 = (n) => Math.round(n * 10) / 10;
  const osel = { n: 8, imp: 1 };
  const status = (t, bad) => { const e = $('crstat'); if (e) { e.textContent = t; e.style.color = bad ? '#c62835' : ''; } };
  const myColor = () => { const sk = opts && opts.Skins && opts.save ? opts.Skins.BY_ID[opts.save().skin] : null; return sk && /^#[0-9a-f]{6}$/i.test(sk.body || '') ? sk.body : null; };
  function setupRoom() {
    if (room || !root.Room) return;
    room = root.Room.create({
      prefix: PREFIX, max: 10, hello: () => ({ name: (root.Account && root.Account.name()) || 'Goose' + (100 + ((Math.random() * 900) | 0)), col: myColor() }),
      onRoster: renderRoster, onMsg: onNet, onStatus: status, onDrop,
      onLost: (why) => { if (G && G.online) { G = null; closeTask(); showPanel('lobby'); } renderRoster([]); status(why, true); },
      canJoin: () => (G && G.online ? 'A game is already running in that room.' : null)
    });
  }
  function renderRoster(list) {
    if (!dom) return; const box = $('crroster'); if (!box) return; box.innerHTML = '';
    const host = room && room.isHost();
    (list || []).forEach((e) => { const sp = document.createElement('span'); sp.className = 'chip'; sp.textContent = (e.id === 0 ? '👑 ' : '🪿 ') + (e.name || 'Goose') + (room && e.id === room.id() ? ' (you)' : ''); box.appendChild(sp); });
    $('cronl').style.display = list && list.length ? '' : 'none';
    $('crhostopts').style.display = host ? '' : 'none';
    $('crstartonl').style.display = host ? '' : 'none';
    $('crwait').textContent = !list || !list.length ? '' : host ? (list.length < 2 ? 'Waiting for friends… (you can also start now with bots)' : 'Ready when you are! Bots fill the empty places.') : 'Waiting for the host to start…';
  }
  function onDrop(id) {
    if (!G || !G.online || !G.host) return; const p = G.players.find((q) => q.net === id); if (!p) return;
    p.remote = false; p.bot = true; p.net = -1; p.mode = 'idle'; p.timer = 1; p.path = null; toast(p.name + ' left: a bot takes over.', 3);
  }
  function startOnline() {
    if (!room || !room.isHost() || (G && G.online)) return;
    ensureDom();
    const list = room.list(); const hum = list.map((e) => ({ net: e.id, name: String(e.name || 'Goose').slice(0, 14), col: e.col }));
    const n = Math.max(osel.n, hum.length);
    newGame({ humans: hum, n, nImp: osel.imp });
    showPanel(null); closeTask(); renderChat(); G.players.forEach((q) => { if (q.role === 'imp') q.cd = 10; });
    G.netT = 0;
    for (const q of G.players) if (q.remote) toGuests(startMsg(q), q);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function startMsg(q) {
    return { k: 'start', i: q.id, ps: G.players.map((x) => ({ name: x.name, col: x.col })), role: q.role, mates: q.role === 'imp' ? G.players.filter((x) => x.role === 'imp' && x !== q).map((x) => x.id) : [], tasks: q.tasks.map((t) => t.id), tt: G.tasksTotal, ni: G.nImp, pos: G.players.map((x) => [Math.round(x.x), Math.round(x.y)]) };
  }
  function remoteStep(p, dt) {
    p.cd -= dt; p.anim += dt;
    if (G.phase !== 'play' || G.t - (p.lastPos || 0) > 0.8) p.moving = false;
  }
  const near = (p, o, r) => Math.hypot(o.x - p.x, o.y - p.y) < r;
  function onNet(from, m) {
    if (!m) return;
    if (!room.isHost()) return fromHost(m);
    if (!G || !G.online) return;
    const p = G.players.find((q) => q.net === from); if (!p) return;
    switch (m.k) {
      case 'pos': if (G.phase === 'play' && p.vent == null && isFinite(m.x) && isFinite(m.y)) {
        const ok = m.nc ? true : free(m.x, m.y, R) && Math.hypot(m.x - p.x, m.y - p.y) < 110;
        if (ok) { p.x = +m.x; p.y = +m.y; } p.face = m.f < 0 ? -1 : 1; p.moving = !!m.mv; p.lastPos = G.t; p.invis = !!m.iv;
      } break;
      case 'task': { if (G.phase !== 'play' || p.role !== 'crew') break; const t = p.tasks.find((x) => x.id === m.id && !x.done); if (t && (m.force || near(p, STATIONS[t.id], USE_RANGE + 70))) { t.done = true; G.tasksDone++; checkWin(); } break; }
      case 'fix': if (G.phase === 'play' && p.role === 'crew' && G.overload && !G.overload.fixed[m.i] && FIX[m.i] && near(p, FIX[m.i], USE_RANGE + 40)) G.overload.fixed[m.i] = true; break;
      case 'fuse': if (G.phase === 'play' && p.role === 'crew' && G.lights > 0 && near(p, FUSE, USE_RANGE + 40)) G.lights = 0; break;
      case 'table': if (G.phase === 'play' && p.alive && G.emergLeft > 0 && near(p, HUB, 150)) { G.emergLeft--; startMeeting(p, null); } break;
      case 'kill': doKill(p); break;
      case 'vent': doVent(p); break;
      case 'exitvent': doExitVent(p); break;
      case 'report': doReport(p); break;
      case 'sab': if (G.phase === 'play' && p.role === 'imp' && p.alive) { if (m.w === 'l') startLights(); else startOverload(); } break;
      case 'vote': if (G.phase === 'meeting' && G.m && p.alive) { const w = m.who === 'skip' ? 'skip' : +m.who; if (w === 'skip' || (G.players[w] && G.players[w].alive && w !== p.id)) castVote(p, w); } break;
      case 'say': if (G.phase === 'meeting' && p.alive && typeof m.text === 'string') sayNow(p, m.text.slice(0, 70)); break;
      case 'noise': makeNoise(); break;
      default: break;
    }
  }
  function makeNoise() { const r = (Math.random() * 9) | 0; G.noise = { x: rx(r) + RW / 2 + rnd(-90, 90), y: ry(r) + RH / 2 + rnd(-50, 50), t: 0 }; tone(700, 0.25, 'sine', 0.05); }
  // host: one snapshot for everybody, plus a small private message per guest
  function hostNetStep(dt) {
    G.netT -= dt; if (G.netT > 0) return; G.netT = 0.1;
    const m = G.m, snap = {
      k: 's', ph: G.phase, it: r1(G.introT || 0), li: r1(G.lights > 0 ? G.lights : 0), ov: G.overload ? [r1(G.overload.t), G.overload.fixed[0] ? 1 : 0, G.overload.fixed[1] ? 1 : 0] : null, td: G.tasksDone, sc: Math.round(G.sabCd), mt: G.meetings, kl: G.kills,
      pl: G.players.map((q) => [Math.round(q.x), Math.round(q.y), q.face, q.alive ? 1 : 0, q.vent == null ? -1 : q.vent, q.moving ? 1 : 0, q.ejected ? 1 : 0, q.invis ? 1 : 0]),
      b: G.bodies.map((b) => [b.id, Math.round(b.x), Math.round(b.y), b.rep ? 1 : 0]), nz: G.noise ? [Math.round(G.noise.x), Math.round(G.noise.y)] : null
    };
    if (G.noise && (G.noise.t += 0.1) > 4) G.noise = null;
    if (m) snap.m = { s: m.stage, t: r1(m.t), by: m.by.id, bd: m.body ? m.body.id : -1, em: m.emerg ? 1 : 0, v: Object.keys(m.votes).map(Number), rt: r1(m.rt || 0), dur: m.dur, vd: m.vdur, res: m.res ? { ej: m.res.ej ? m.res.ej.id : -1, tally: m.res.tally, votes: m.votes } : null };
    toGuests(snap);
    for (const q of G.players) if (q.remote) toGuests({ k: 'me', cd: r1(Math.max(0, q.cd)), td: q.tasks.map((t) => (t.done ? 1 : 0)), em: G.emergLeft }, q);
  }
  // ---- guest side
  function fromHost(m) {
    switch (m.k) {
      case 'start': {
        ensureDom();
        const ps = m.ps.map((x, i) => ({ id: i, name: x.name, col: x.col, x: m.pos[i][0], y: m.pos[i][1], tx: m.pos[i][0], ty: m.pos[i][1], face: 1, alive: true, role: 'crew', bot: false, tasks: [], cd: 10, seen: {}, susp: {}, vent: null, anim: Math.random() * 6, moving: false }));
        const me0 = ps[m.i]; me0.role = m.role; me0.tasks = m.tasks.map((id) => ({ id, done: false })); m.mates.forEach((k) => { ps[k].role = 'imp'; });
        G = { online: true, host: false, nImp: m.ni, phase: 'intro', t: 0, introT: 3.2, players: ps, me: me0, bodies: [], chat: [], m: null, task: null, lights: 0, overload: null, sabCd: 40, tasksTotal: m.tt, tasksDone: 0, result: null, meetings: 0, kills: 0, auto: false, intel: 0, toasts: [], emergLeft: 1, sabMenu: false, posT: 0 };
        showPanel(null); closeTask(); renderChat(); break;
      }
      case 's': if (G && G.online && !G.host) applySnap(m); break;
      case 'me': if (G && G.online && !G.host) { const me0 = G.me; me0.cd = m.cd; m.td.forEach((d, i) => { if (me0.tasks[i]) me0.tasks[i].done = !!d || me0.tasks[i].done; }); G.emergLeft = m.em; } break;
      case 'chat': if (G) { G.chat.push({ name: m.name, col: m.col, text: m.text }); tone(520, 0.05, 'triangle', 0.03); renderChat(); } break;
      case 'toast': if (G) toast(m.t, m.s); break;
      case 'dead': if (G) { toast('You were caught by a Fox! You are a ghost now.', 4); closeTask(); } break;
      case 'end': if (G && G.phase !== 'end') {
        G.phase = 'end'; closeTask(); m.roles.forEach((r, i) => { G.players[i].role = r; G.players[i].alive = m.alive[i] === 1; G.players[i].ejected = m.alive[i] === 2; });
        G.tasksDone = m.td; G.meetings = m.mt; G.kills = m.kl;
        const meImp = G.me.role === 'imp', won = (m.winner === 'imp') === meImp, gain = won ? (meImp ? 35 : 25) : 6;
        G.result = { winner: m.winner, reason: m.reason, gain, won }; if (opts && opts.award) opts.award(gain); showEnd();
      } break;
      default: break;
    }
  }
  function applySnap(m) {
    const me0 = G.me, was = me0.alive, prevPh = G.phase;
    G.phase = m.ph; G.introT = m.it; G.lights = m.li; G.overload = m.ov ? { t: m.ov[0], fixed: [!!m.ov[1], !!m.ov[2]] } : null; G.tasksDone = m.td; G.sabCd = m.sc; G.meetings = m.mt; G.kills = m.kl;
    G.noise = m.nz ? { x: m.nz[0], y: m.nz[1] } : null;
    m.pl.forEach((a, i) => {
      const q = G.players[i]; if (!q) return;
      q.alive = !!a[3]; q.vent = a[4] < 0 ? null : a[4]; q.ejected = !!a[6]; q.invis = !!a[7];
      if (q === me0) {
        const far = Math.hypot(a[0] - q.x, a[1] - q.y);
        if (G.phase !== 'play' || q.vent != null || far > 160 || prevPh !== G.phase) { q.x = a[0]; q.y = a[1]; }
      } else { q.tx = a[0]; q.ty = a[1]; q.face = a[2]; q.moving = !!a[5]; if (Math.hypot(a[0] - q.x, a[1] - q.y) > 300 || prevPh !== G.phase) { q.x = a[0]; q.y = a[1]; } }
    });
    if (was && !me0.alive) closeTask();
    G.bodies = m.b.map((b) => ({ id: b[0], x: b[1], y: b[2], rep: !!b[3], col: G.players[b[0]] ? G.players[b[0]].col : '#fff', name: G.players[b[0]] ? G.players[b[0]].name : '' }));
    if (m.m) {
      const first = !G.m;
      if (first) { G.task = null; closeTask(); G.sabMenu = false; G.chat = []; G.m = { by: G.players[m.m.by], body: m.m.bd >= 0 ? { id: m.m.bd } : null, stage: 'discuss', t: 0, dur: m.m.dur, vdur: m.m.vd, votes: {}, lines: [], vAt: {}, res: null, rt: 0, emerg: !!m.m.em, mine: undefined }; renderChat(); }
      const g = G.m, stageChanged = g.stage !== m.m.s, nv = m.m.v.length;
      g.stage = m.m.s; g.t = m.m.t; g.rt = m.m.rt;
      const votes = {}; m.m.v.forEach((id) => { votes[id] = true; }); if (g.mine !== undefined) votes[me0.id] = g.mine;
      if (m.m.res) { g.res = { ej: m.m.res.ej >= 0 ? G.players[m.m.res.ej] : null, tally: m.m.res.tally }; }
      const changed = first || stageChanged || nv !== g.nv; g.votes = votes; g.nv = nv;
      if (changed) renderMeeting();
    } else if (G.m) { G.m = null; showPanel(null); }
  }
  function guestStep(dt) {
    const g = G, me0 = g.me;
    if (g.phase === 'intro') g.introT -= dt;
    for (const q of g.players) { q.anim += dt; if (q !== me0 && q.tx != null) { const k = Math.min(1, dt * 12); q.x += (q.tx - q.x) * k; q.y += (q.ty - q.y) * k; } }
    me0.cd -= dt; me0.moving = false;
    if (g.phase === 'meeting' && g.m) g.m.t += dt;
    let ax = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, ay = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0) + joy.y;
    const mm = Math.hypot(ax, ay); if (mm > 1) { ax /= mm; ay /= mm; }
    if (g.phase === 'play' && !g.task && me0.vent == null && mm > 0.05) {
      const sp = SPEED * (owner() && ownS.speed ? 2 : 1);
      if (owner() && ownS.noclip) { me0.x += ax * sp * dt; me0.y += ay * sp * dt; if (ax) me0.face = ax > 0 ? 1 : -1; } else moveEnt(me0, ax * sp * dt, ay * sp * dt);
      me0.moving = true;
    }
    me0.invis = owner() && ownS.invis;
    g.posT -= dt; if (g.posT <= 0 && g.phase === 'play') { g.posT = 0.066; room.send({ k: 'pos', x: Math.round(me0.x), y: Math.round(me0.y), f: me0.face, mv: me0.moving ? 1 : 0, iv: me0.invis ? 1 : 0, nc: owner() && ownS.noclip ? 1 : 0 }); }
  }
  // ---- owner tray
  function buildOwn() {
    const box = dom && $('crown'); if (!box) return; const show = !!G && G.phase !== 'end' && owner(); box.style.display = show ? 'flex' : 'none'; if (!show || box.dataset.on) return; box.dataset.on = '1';
    box.innerHTML = '<div style="font:800 11px system-ui;opacity:.85">OWNER</div>';
    const host = () => !G.online || G.host;
    const defs = [['xray', '👁 X-ray (see Foxes)'], ['invis', '🫥 Invisible'], ['speed', '💨 Speed x2'], ['noclip', '👻 Walk through walls'], ['nocd', '🔪 No kill cooldown'], ['tasks', '✅ Finish my tasks', 1], ['noise', '📣 Noise from elsewhere', 1], ['meet', '🚨 Force a meeting', 1, 1], ['body', '💀 Drop a fake body', 1, 1], ['freeze', '🧊 Freeze bots 5s', 1, 1], ['win', '🏆 Win the game', 1, 1]];
    for (const [k, l, one, hostOnly] of defs) {
      const b = document.createElement('button'); b.textContent = l; if (!one && ownS[k]) b.className = 'on';
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
      b.addEventListener('click', (e) => {
        e.stopPropagation(); if (!G) return; const me0 = G.me;
        if (!one) { ownS[k] = !ownS[k]; b.className = ownS[k] ? 'on' : ''; return; }
        if (hostOnly && !host()) { toast('Only works when you are the host (or offline).', 2); return; }
        if (k === 'tasks') { if (me0.role !== 'crew') return toast('Foxes only pretend to do tasks.', 2); for (const t of me0.tasks) if (!t.done) { t.done = true; if (host()) G.tasksDone++; else room.send({ k: 'task', id: t.id, force: 1 }); } if (host()) checkWin(); }
        else if (k === 'noise') { if (host()) makeNoise(); else room.send({ k: 'noise' }); }
        else if (k === 'meet') { if (G.phase === 'play') startMeeting(me0, null); }
        else if (k === 'body') { G.bodies.push({ id: me0.id, x: me0.x + 20, y: me0.y, col: me0.col, name: 'Fake', rep: false, t: G.t }); }
        else if (k === 'freeze') { for (const q of G.players) if (q.bot) q.frz = 5; toast('Bots frozen for 5 seconds', 2); }
        else if (k === 'win') { G.forceW = me0.role === 'imp' ? 'imp' : 'crew'; checkWin(); }
      });
      box.appendChild(b);
    }
  }

  // ------------------------------------------------------------------ lifecycle
  function start(o) {
    ensureDom(); newGame(o); showPanel(null); closeTask(); renderChat(); G.me.role === 'imp' && (G.me.cd = 10);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function frame(now) {
    raf = 0; if (!isOpen) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (G) { if (G.phase === 'meeting' && G.m && G.m.stage !== 'result' && Math.floor(G.m.t * 2) !== Math.floor((G.m.t - dt) * 2)) renderMeeting(); step(dt); if (G.online && G.host) hostNetStep(dt); render(); }
    raf = requestAnimationFrame(frame);
  }
  function open() {
    ensureDom(); setupRoom(); isOpen = true; dom.root.style.display = 'block'; G = null; showPanel('lobby'); if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function close() { if (room) room.leave(); isOpen = false; if (raf) cancelAnimationFrame(raf); raf = 0; G = null; if (dom) dom.root.style.display = 'none'; if (opts && opts.onClose) opts.onClose(); }
  function init(o) { opts = o || {}; }

  // headless-ish simulation: every seat (including yours) is a bot; the meeting UI is bypassed by the bots' own votes
  function sim(o) {
    ensureDom(); isOpen = true; dom.root.style.display = 'block'; newGame(Object.assign({}, o, { auto: true })); showPanel(null);
    let n = 0; const dt = 0.05; while (G.phase !== 'end' && n++ < 40000) step(dt);
    const r = { ended: G.phase === 'end', winner: G.result && G.result.winner, reason: G.result && G.result.reason, t: Math.round(G.t), meetings: G.meetings, kills: G.kills, tasks: G.tasksDone + '/' + G.tasksTotal, steps: n, alive: living().length, imps: imps().length };
    isOpen = false; dom.root.style.display = 'none'; return r;
  }
  root.Crew = { init, open, close, _start: (o) => { ensureDom(); isOpen = true; dom.root.style.display = 'block'; start(o || {}); }, _step: (dt) => step(dt), _state: () => G, _sim: sim, _use: doUse, _kill: doKill, _report: doReport, _vent: doVent, _STATIONS: STATIONS, _VENTS: VENTS };
})(window);
