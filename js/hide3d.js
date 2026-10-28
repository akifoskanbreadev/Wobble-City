/*
 * 3D Hide & Seek: a rounded goose with a short wobbly neck (and your real clothes) in big 3D towns with 100+ hiding places each.
 * Hiders walk up to a hiding place and tuck themselves in; seekers walk up to places and search them.
 * A found hider joins the seekers. Solo (against bots) here; the room code part lives at the bottom (online rooms via PeerJS).
 *   Hide3D.init({ save, award, toast, Skins })   Hide3D.open()   Hide3D.close()
 */
(function (root) {
  'use strict';
  const E = root.H3E, MAPS = root.H3Maps;
  let api = null, dom = null, R = null, G = null, raf = 0, open = false, last = 0, hudCtx = null;
  const keys = {};
  const cam = { yaw: 0, pitch: 0.55, dist: 9 };
  const joy = { x: 0, z: 0, id: null, ox: 0, oy: 0 };
  let lookId = null, lookX = 0, lookY = 0, actQ = false, jumpQ = false, exitQ = false, whQ = false;
  const own = { xray: true, invis: false, speed: false, jump: false };
  const isOwn = () => !!(api && api.isOwner && api.isOwner());
  const NAMES = ['Honky', 'Waddle', 'Biscuit', 'Quackers', 'Pebble', 'Noodle', 'Gus', 'Mabel', 'Pip', 'Dumpling', 'Toast', 'Sprout', 'Beans', 'Clover', 'Mochi', 'Ziggy'];
  const PAL = [['#ffffff', '#ffffff'], ['#ffd23f', '#ffe27a'], ['#8a5a32', '#b5733a'], ['#3a86ff', '#7ab0ff'], ['#e63946', '#ff7b86'], ['#2fbf71', '#7fe0a8'], ['#9b5de5', '#c8a2f5'], ['#ff8c42', '#ffb37a'], ['#2b2b2e', '#59595f'], ['#ff70a6', '#ffb3d1']];
  const SEEK_T = 240, HIDE_T = 25, SPEED = 7, SPEED_S = 6.7, RAD = 0.55;
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------------ DOM
  const CSS = `
  #h3{position:fixed;inset:0;z-index:70;background:#111;display:none;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,sans-serif;color:#fff}
  #h3 canvas{position:absolute;inset:0;width:100%;height:100%}#h3 #h3hud{pointer-events:none}
  #h3 .b{position:absolute;border-radius:50%;border:3px solid rgba(255,255,255,.85);background:rgba(30,30,40,.45);color:#fff;font-weight:800;display:none;align-items:center;justify-content:center;text-align:center;font-size:15px;touch-action:none}
  #h3 #h3act{right:max(18px,env(safe-area-inset-right));bottom:max(30px,env(safe-area-inset-bottom));width:104px;height:104px;background:rgba(255,155,47,.9);color:#1b1b1b;flex-direction:column;line-height:1.1}
  #h3 #h3jump{right:calc(max(18px,env(safe-area-inset-right)) + 118px);bottom:max(30px,env(safe-area-inset-bottom));width:70px;height:70px}
  #h3 #h3whis{right:calc(max(18px,env(safe-area-inset-right)) + 118px);bottom:calc(max(30px,env(safe-area-inset-bottom)) + 84px);width:62px;height:62px;font-size:26px}
  #h3 #h3own{position:absolute;left:10px;top:176px;display:none;flex-direction:column;gap:5px;z-index:3}#h3 #h3own button{font:700 12px system-ui;padding:5px 8px;border-radius:9px;border:2px solid rgba(255,255,255,.7);background:rgba(30,30,40,.6);color:#fff}#h3 #h3own button.on{background:#d6192b}
  #h3 #h3exit{right:12px;top:12px;width:46px;height:46px;font-size:20px;display:flex;border-radius:12px}
  #h3 #h3stick{left:max(24px,env(safe-area-inset-left));bottom:max(30px,env(safe-area-inset-bottom));width:128px;height:128px;display:none;background:rgba(30,30,40,.3)}
  #h3 #h3knob{position:absolute;left:36px;top:36px;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.6)}
  #h3 .panel{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,12,24,.82);overflow:auto;padding:14px}
  #h3 .card{background:#fff;color:#1b1f33;border-radius:20px;padding:18px 18px 16px;max-width:560px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.4);max-height:100%;overflow:auto}
  #h3 h2{margin:0 0 4px;font-size:24px}#h3 .sub{opacity:.7;font-size:14px;margin-bottom:10px}
  #h3 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px;margin:8px 0}
  #h3 .mp{border:3px solid #dfe3f1;border-radius:14px;padding:8px 6px;text-align:center;font-size:13px;font-weight:700;background:#f7f8fd;cursor:pointer}
  #h3 .mp.on{border-color:#ff9b2f;background:#fff3e3}#h3 .mp span{display:block;font-size:26px}
  #h3 .row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;align-items:center}#h3 .row b{font-size:14px;min-width:64px}
  #h3 .chip{border:3px solid #dfe3f1;border-radius:999px;padding:7px 14px;font-weight:700;font-size:14px;background:#f7f8fd;cursor:pointer}#h3 .chip.on{border-color:#ff9b2f;background:#fff3e3}
  #h3 .go{background:#ff9b2f;color:#1b1b1b;border:0;border-radius:14px;padding:12px 22px;font-size:18px;font-weight:800;cursor:pointer}#h3 .go.alt{background:#e6e9f5}
  #h3 input{font-size:16px;padding:9px 12px;border-radius:10px;border:3px solid #dfe3f1;width:180px}
  #h3 pre{white-space:pre-wrap;font-family:inherit;margin:8px 0 12px;font-size:15px}
  #h3 .tip{font-size:12.5px;opacity:.75;margin-top:6px}
  `;
  function ensureDom() {
    if (dom) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'h3';
    d.innerHTML = `<canvas id="h3gl"></canvas><canvas id="h3hud"></canvas>
      <div class="b" id="h3stick"><div id="h3knob"></div></div><div class="b" id="h3jump">JUMP</div><div class="b" id="h3act"><span id="h3actt">HIDE</span><small id="h3acts">(E)</small></div><div class="b" id="h3exit">☰</div><div class="b" id="h3whis">🎵</div><div id="h3own"></div>
      <div class="panel" id="h3lobby"><div class="card">
        <h2>🫣 3D Hide &amp; Seek</h2><div class="sub">Blocky geese, huge towns, 100+ places to hide. Hiders tuck into hiding places; seekers search them. Found hiders turn into seekers!</div>
        <div class="row"><b>Map</b></div><div class="grid" id="h3maps"></div>
        <div class="row"><b>You are</b><span class="chip on" data-role="hider">🫣 Hider</span><span class="chip" data-role="seeker">🔍 Seeker</span><span class="chip" data-role="random">🎲 Random</span></div>
        <div class="row"><b>Players</b><span class="chip" data-n="6">6</span><span class="chip on" data-n="8">8</span><span class="chip" data-n="12">12</span><span class="tip">(the rest are bots)</span></div>
        <div class="row"><button class="go" id="h3start">Play vs bots</button><button class="go alt" id="h3online">👥 Online room</button><button class="go alt" id="h3back">Back</button></div>
        <div class="tip">Move: WASD / arrows or the stick · Look: drag · Jump: Space · Hide / Search: E or F or the orange button</div>
        <div class="tip" id="h3gl-warn" style="color:#c62835"></div>
      </div></div>
      <div class="panel" id="h3end"><div class="card"><h2 id="h3endt"></h2><pre id="h3endx"></pre><div class="row"><button class="go" id="h3again">Play again</button><button class="go alt" id="h3menu">Menu</button></div></div></div>
      <div class="panel" id="h3online-p"><div class="card"><h2>👥 Online room</h2><div class="sub">Everyone types the same word. Up to 8 friends play together; bots fill the empty places.</div>
        <div class="row"><input id="h3word" maxlength="24" placeholder="room word" autocomplete="off" autocapitalize="off"><button class="go" id="h3join">Join</button><button class="go alt" id="h3quick">🎲 Random lobby</button></div>
        <div class="tip" id="h3ostat"></div><div class="row" id="h3orow" style="display:none"><button class="go" id="h3ostart">Start game</button></div><div class="row"><button class="go alt" id="h3oback">Back</button></div></div></div>`;
    document.body.appendChild(d);
    dom = { root: d, gl: $('h3gl'), hud: $('h3hud'), stick: $('h3stick'), knob: $('h3knob'), act: $('h3act'), actt: $('h3actt'), acts: $('h3acts'), jump: $('h3jump'), exit: $('h3exit'), whis: $('h3whis'), own: $('h3own'), lobby: $('h3lobby'), end: $('h3end'), online: $('h3online-p') };
    hudCtx = dom.hud.getContext('2d');
    // map picker
    const g = $('h3maps'); g.innerHTML = '<div class="mp on" data-m="-1"><span>🎲</span>Random</div>' + MAPS.LIST.map((m) => `<div class="mp" data-m="${m.index}" title="${m.blurb}"><span>${m.emoji}</span>${m.name}</div>`).join('');
    g.addEventListener('click', (e) => { const t = e.target.closest('.mp'); if (!t) return; g.querySelectorAll('.mp').forEach((x) => x.classList.remove('on')); t.classList.add('on'); sel.map = +t.dataset.m; });
    d.querySelectorAll('[data-role]').forEach((c) => c.addEventListener('click', () => { d.querySelectorAll('[data-role]').forEach((x) => x.classList.remove('on')); c.classList.add('on'); sel.role = c.dataset.role; }));
    d.querySelectorAll('[data-n]').forEach((c) => c.addEventListener('click', () => { d.querySelectorAll('[data-n]').forEach((x) => x.classList.remove('on')); c.classList.add('on'); sel.n = +c.dataset.n; }));
    $('h3start').addEventListener('click', () => start());
    $('h3back').addEventListener('click', close);
    $('h3again').addEventListener('click', () => start());
    $('h3menu').addEventListener('click', () => { stopGame(); dom.end.style.display = 'none'; if (net.connected && net.connected()) { dom.online.style.display = 'flex'; net.refresh(); } else dom.lobby.style.display = 'flex'; });
    $('h3online').addEventListener('click', () => { dom.lobby.style.display = 'none'; dom.online.style.display = 'flex'; });
    $('h3oback').addEventListener('click', () => { net.leave(); dom.online.style.display = 'none'; dom.lobby.style.display = 'flex'; });
    $('h3join').addEventListener('click', () => net.join($('h3word').value));
    $('h3quick').addEventListener('click', () => net.joinQuick && net.joinQuick());
    $('h3ostart').addEventListener('click', () => net.hostStart());
    $('h3word').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') net.join($('h3word').value); });
    $('h3word').addEventListener('keyup', (e) => e.stopPropagation());
    $('h3exit').addEventListener('click', () => { if (G) { net.leave(); stopGame(); dom.lobby.style.display = 'flex'; } });
    const hold = (el, on) => { el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); on(); }); };
    hold(dom.whis, () => { whQ = true; }); hold(dom.act, () => { actQ = true; }); hold(dom.jump, () => { jumpQ = true; });
    // touch: left stick, anywhere else drags the camera
    dom.root.addEventListener('pointerdown', (e) => {
      if (!G || e.target.closest('.b') || e.target.closest('.panel')) return;
      if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.42 && e.clientY > innerHeight * 0.35 && joy.id === null) {
        joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; dom.stick.style.display = 'flex'; dom.stick.style.left = (e.clientX - 64) + 'px'; dom.stick.style.bottom = 'auto'; dom.stick.style.top = (e.clientY - 64) + 'px';
      } else if (lookId === null) { lookId = e.pointerId; lookX = e.clientX; lookY = e.clientY; }
      try { dom.root.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    });
    dom.root.addEventListener('pointermove', (e) => {
      if (e.pointerId === joy.id) { let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const l = Math.hypot(dx, dy), m = 52; if (l > m) { dx = dx / l * m; dy = dy / l * m; } joy.x = dx / m; joy.z = -dy / m; dom.knob.style.transform = `translate(${dx}px,${dy}px)`; }
      else if (e.pointerId === lookId) { cam.yaw -= (e.clientX - lookX) * 0.0075; cam.pitch = Math.max(0.12, Math.min(1.35, cam.pitch + (e.clientY - lookY) * 0.0055)); lookX = e.clientX; lookY = e.clientY; }
    });
    const up = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.z = 0; dom.knob.style.transform = ''; if (G) dom.stick.style.display = 'none'; } if (e.pointerId === lookId) lookId = null; };
    dom.root.addEventListener('pointerup', up); dom.root.addEventListener('pointercancel', up);
    dom.root.addEventListener('wheel', (e) => { cam.dist = Math.max(4, Math.min(16, cam.dist + e.deltaY * 0.01)); });
    dom.root.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (!open || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) return;
      if (!G) return;
      const c = e.code; keys[c] = true;
      if (c === 'KeyE' || c === 'KeyF' || c === 'Enter') { if (!e.repeat) actQ = true; }
      else if (c === 'KeyQ') { if (!e.repeat) whQ = true; }
      else if (c === 'Space') { if (!e.repeat) jumpQ = true; }
      else if (c === 'Escape') { exitQ = true; }
      if (/^(Key[WASDEFQ]|Arrow.*|Space|Escape|Enter)$/.test(c)) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    window.addEventListener('keyup', (e) => { keys[e.code] = false; if (open && G && /^(Key[WASDEF]|Arrow.*|Space)$/.test(e.code)) e.stopImmediatePropagation(); }, true);
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    window.addEventListener('resize', () => { if (open) layout(); });
  }
  const sel = { map: -1, role: 'hider', n: 8 };
  function layout() { const touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window; dom.jump.style.display = G && touch ? 'flex' : 'none'; dom.act.style.display = G ? 'flex' : 'none'; dom.whis.style.display = G ? 'flex' : 'none'; buildOwn(); dom.exit.style.display = G ? 'flex' : 'none'; dom.acts.style.display = touch ? 'none' : ''; }

  // ------------------------------------------------------------------ game setup
  function colsOf(skinId) {
    const sk = (api.Skins && api.Skins.BY_ID[skinId]) || {};
    const body = (sk.jellyC && sk.jellyC[0]) || sk.body || '#ffffff', head = (sk.jellyC && sk.jellyC[1]) || sk.headC || body;
    return { body, head: head, wing: sk.wing || body, leg: sk.legC || '#ff9f1c', beak: sk.beakC || '#ff9f1c' };
  }
  function botCols() {
    if (api.Skins && Math.random() < 0.55) { const l = api.Skins.LIST.filter((s) => s.body && typeof s.body === 'string' && !s.shape); if (l.length) return colsOf(pick(l).id); }
    const p = pick(PAL); return { body: p[0], head: p[1], wing: p[0], leg: '#ff9f1c', beak: '#ff9f1c' };
  }
  const HATS = ['top', 'cap', 'crown', 'party', 'prop', 'cone', 'flower'];
  const HAT_COLS = ['#e63946', '#3a86ff', '#ffd23f', '#2fbf71', '#9b5de5', '#ff8c42', '#ff70a6', '#2b2b2e'];
  function hatOf(id) { let h = 0; const t = String(id); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return { k: HATS[h % HATS.length], c: HAT_COLS[(h >> 3) % HAT_COLS.length] }; }
  const itemCol = (id) => { try { return id && root.GooseArt ? root.GooseArt.itemColor(id) : null; } catch (e) { return null; } };
  const myHat = () => {                       // your outfit: the hat's look plus the real colours of your glasses, scarf, clothes and shoes
    const e = api.save().equip || {}; if (!(e.hat || e.eyes || e.neck || e.body || e.shoes)) return null;
    const h = e.hat ? hatOf(e.hat) : { k: null, c: '#e63946' }; if (e.hat) h.c = itemCol(e.hat) || h.c;
    if (e.eyes) h.gl = itemCol(e.eyes) || '#222222'; if (e.neck) h.sc = itemCol(e.neck) || '#e63946'; if (e.body) h.vs = itemCol(e.body) || '#3a86ff'; if (e.shoes) h.sh = itemCol(e.shoes) || '#e63946';
    return h;
  };
  const randHat = () => { const h = Math.random() < 0.45 ? { k: pick(HATS), c: pick(HAT_COLS) } : { k: null, c: '#e63946' }; if (Math.random() < 0.2) h.gl = '#222222'; if (Math.random() < 0.25) h.sc = pick(HAT_COLS); if (Math.random() < 0.2) h.vs = pick(HAT_COLS); return h.k || h.gl || h.sc || h.vs ? h : null; };
  function newPlayer(id, name, human, cols, hat) { return { hat: hat || null, id, name, human, cols, x: 0, y: 0, z: 0, vy: 0, vx: 0, vz: 0, ry: 0, ground: true, role: 'hider', hidden: -1, anim: 0, mx: 0, mz: 0, tgt: -1, path: null, pi: 0, pkey: '', replan: 0, stuck: 0, stuckT: 0, lx: 0, lz: 0, wait: 0, cd: 0, skip: Math.random() * 0.3, found: 0, survived: 0, blind: false }; }

  function start(opts) {
    opts = opts || {};
    ensureDom();
    stopGame(true);
    const mi = opts.map != null ? opts.map : sel.map < 0 ? (Math.random() * MAPS.LIST.length) | 0 : sel.map;
    const seed = opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0;
    const map = MAPS.build(mi, seed);
    R = R || E.create(dom.gl);
    if (!R) { $('h3gl-warn').textContent = 'Your device does not support WebGL, so the 3D mode cannot start.'; return; }
    R.sky = E.rgb(map.sky); R.fogNear = map.night ? 30 : 45; R.fogFar = map.night ? 95 : 135; R.setStatic(map.mesh);
    const sv = api.save();
    let ps = [], me, n, seekers;
    if (opts.setup) {                                   // an online game: everybody builds the same cast from the host's setup
      ps = opts.setup.players.map((q, i) => { const p = newPlayer(i, q.name, !!q.human, q.cols, q.hat); p.role = q.role; p.x = q.x; p.z = q.z; p.ry = q.ry; return p; });
      me = ps[opts.myId]; n = ps.length;
    } else {
      n = opts.n || sel.n;
      const nm = NAMES.slice().sort(() => Math.random() - 0.5);
      me = newPlayer(0, 'You', true, colsOf(sv.skin), myHat()); ps.push(me);
      for (let i = 1; i < n; i++) ps.push(newPlayer(i, nm[i % nm.length], false, botCols(), randHat()));
      let role = opts.role || sel.role; if (role === 'random') role = Math.random() < 0.5 ? 'hider' : 'seeker';
      seekers = role === 'seeker' ? [me] : [pick(ps.slice(1))];
      if (n >= 8 && role === 'hider') seekers.push(pick(ps.slice(1).filter((p) => !seekers.includes(p))));
    }
    if (!opts.setup) ps.forEach((p, i) => { const sp = map.spawns[i % map.spawns.length]; p.x = sp[0]; p.z = sp[1]; p.role = seekers.includes(p) ? 'seeker' : 'hider'; p.ry = rnd(0, 6.28); });
    me.startRole = me.role;
    G = { map, mi, seed, ps, me, phase: 'hide', t: HIDE_T, clock: 0, toasts: [], puffs: [], over: false, searchRing: null, startRole: me.role, nFound: 0, online: opts.online || null, names: ps.map((p) => p.name), searched: {}, rings: [] };
    if (!map.nav) buildNav(map);
    G.spots = map.spots; G.spots.forEach((s) => { s.occ = -1; });
    // hiders: the bots pick a spot at once
    ps.forEach((p) => { if (!p.human && p.role === 'hider') botPickSpot(p); });
    cam.yaw = me.ry + Math.PI; cam.pitch = 0.55; cam.dist = 9;
    dom.lobby.style.display = 'none'; dom.end.style.display = 'none'; dom.online.style.display = 'none';
    layout();
    toast(me.role === 'hider' ? 'Hide for real: stand still inside a bush or haystack, or walk into an orange cupboard door pad.' : 'The hiders are hiding… then go find them!', 5);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function stopGame(keepRaf) { G = null; if (!keepRaf) { cancelAnimationFrame(raf); raf = 0; } joy.id = null; joy.x = joy.z = 0; lookId = null; if (dom) { dom.stick.style.display = 'none'; layout(); } }

  function openUI() {
    ensureDom();
    if (!MAPS || !E) return;
    open = true; dom.root.style.display = 'block'; dom.lobby.style.display = 'flex'; dom.end.style.display = 'none'; dom.online.style.display = 'none'; layout();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function close() { net.leave(); stopGame(); open = false; if (dom) dom.root.style.display = 'none'; if (api && api.onClose) api.onClose(); }
  const toast = (t, s) => { if (G) G.toasts.push({ t, left: s || 3 }); };

  // ------------------------------------------------------------------ world helpers
  const B = () => G.map.buildings;
  function bAt(x, z) { const b = B(); for (let i = 0; i < b.length; i++) { const q = b[i]; if (x > q.x0 + 0.2 && x < q.x1 - 0.2 && z > q.z0 + 0.2 && z < q.z1 - 0.2) return i; } return null; }
  function collide(p) {
    const sols = G.map.solids;
    for (let i = 0; i < sols.length; i++) {
      const s = sols[i];
      if (p.x < s[0] - RAD || p.x > s[2] + RAD || p.z < s[1] - RAD || p.z > s[3] + RAD || p.y >= s[4] - 0.08) continue;
      const cx = Math.max(s[0], Math.min(p.x, s[2])), cz = Math.max(s[1], Math.min(p.z, s[3])), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d < RAD) {
        if (d > 1e-4) { p.x = cx + dx / d * RAD; p.z = cz + dz / d * RAD; }
        else { const l = p.x - s[0], r = s[2] - p.x, t = p.z - s[1], b = s[3] - p.z, m = Math.min(l, r, t, b); if (m === l) p.x = s[0] - RAD; else if (m === r) p.x = s[2] + RAD; else if (m === t) p.z = s[1] - RAD; else p.z = s[3] + RAD; }
      }
    }
  }
  function groundAt(p) { let g = 0; const sols = G.map.solids; for (let i = 0; i < sols.length; i++) { const s = sols[i]; if (s[4] < 9 && s[4] > g && s[4] <= p.y + 0.6 && p.x > s[0] - 0.2 && p.x < s[2] + 0.2 && p.z > s[1] - 0.2 && p.z < s[3] + 0.2) g = s[4]; } return g; }
  function freeAt(x, z, r) { if (Math.abs(x) > 58 || Math.abs(z) > 58) return false; const sols = G.map.solids; for (let i = 0; i < sols.length; i++) { const s = sols[i]; if (s[4] > 0.9 && x > s[0] - r && x < s[2] + r && z > s[1] - r && z < s[3] + r) return false; } return true; }
  function los(ax, az, bx, bz) {   // true when no wall (taller than a goose) is in the way
    const d = dist2(ax, az, bx, bz), n = Math.ceil(d / 1.2), sols = G.map.solids;
    for (let k = 1; k < n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; for (let i = 0; i < sols.length; i++) { const s = sols[i]; if (s[4] >= 3 && s[4] < 9 && x > s[0] && x < s[2] && z > s[1] && z < s[3]) return false; } }
    return true;
  }
  function stepMove(p, dx, dz, spd, dt) {
    const l = Math.hypot(dx, dz);
    if (l > 0.01) { const k = Math.min(1, l); p.mx = dx / l * spd * k; p.mz = dz / l * spd * k; p.ry = Math.atan2(dx, dz); p.anim += dt * (7 + spd * 0.4) * k; }
    else { p.mx = p.mz = 0; }
    const sub = Math.max(1, Math.ceil(spd * dt / 0.3)); for (let i = 0; i < sub; i++) { p.x += p.mx * dt / sub; p.z += p.mz * dt / sub; collide(p); }
    const g = groundAt(p);
    p.vy -= 28 * dt; p.y += p.vy * dt;
    if (p.y <= g) { p.y = g; p.vy = 0; p.ground = true; } else p.ground = false;
    p.x = Math.max(-58.5, Math.min(58.5, p.x)); p.z = Math.max(-58.5, Math.min(58.5, p.z));
  }
  function nearestSpot(p, r) { let best = null, bd = r; for (const s of G.spots) { const d = dist2(p.x, p.z, s.x, s.z); if (d < bd) { bd = d; best = s; } } return best; }

  // ------------------------------------------------------------------ hide / search / found
  function hideIn(p, s) { if (s.occ >= 0 || p.role !== 'hider' || p.hidden >= 0) return false; p.hidden = s.id; s.occ = p.id; if (s.cover) { p.mx = p.mz = 0; } else { p.x = s.x; p.z = s.z; p.y = 0; } G.puffs.push({ x: s.x, z: s.z, t: 0 }); return true; }
  function comeOut(p) {
    if (p.hidden < 0) return;
    const s = G.spots[p.hidden]; s.occ = -1; p.hidden = -1; p.sit = 0; if (s.cover) return; p.noEnter = G.clock + 1.2;
    for (let k = 0; k < 16; k++) { const a = s.ry + k * Math.PI / 8, x = s.x + Math.sin(a) * 2.4, z = s.z + Math.cos(a) * 2.4; if (freeAt(x, z, 0.6)) { p.x = x; p.z = z; return; } }
    p.x = s.x + 2.4; p.z = s.z;
  }
  // proper hiding: no hide button. Cover (bush, haystack...) hides you while you stand still inside it; cupboards (lockers, crates...) open when you walk into their door pad.
  // Seekers open cupboards and walk through cover the same way. Runs for every person on the host (or offline).
  function autoHide(p, dt) {
    if (G.over || p.blind) return;
    if (p.role === 'hider' && p.hidden < 0) {
      const v = Math.hypot(p.mx, p.mz); let enter = null, near = null;
      for (const s of G.spots) {
        if (s.occ >= 0) continue;
        if (s.cover) { if (p.y < 0.7 && dist2(p.x, p.z, s.x, s.z) < 1.3) near = s; }
        else if (p.y < 0.7 && v > 0.4 && G.clock > (p.noEnter || 0) && dist2(p.x, p.z, s.dx, s.dz) < 0.95) { enter = s; break; }
      }
      if (enter) { if (hideIn(p, enter) && p.human) toast('Inside the ' + enter.name.toLowerCase() + '. Stay quiet! Push the stick or tap the button to come out.', 3); }
      else if (near && v < 0.5) { p.sit = (p.sit || 0) + dt; if (p.sit > 0.65) { if (hideIn(p, near) && p.human) toast('Hidden in the ' + near.name.toLowerCase() + '. Stay still! Moving gives you away.', 3); p.sit = 0; } }
      else p.sit = 0;
    } else if (p.hidden >= 0 && G.spots[p.hidden].cover && Math.hypot(p.mx, p.mz) > 0.9) comeOut(p);
    if (p.role === 'seeker' && p.human && G.phase === 'seek' && G.clock - (p.lastOpen || 0) > 0.8) {
      for (const s of G.spots) {
        const tx = s.cover ? s.x : s.dx, tz = s.cover ? s.z : s.dz;
        if (dist2(p.x, p.z, tx, tz) < (s.cover ? 0.95 : 0.9) && (G.clock - (G.searched[s.id] || -999)) > 1.2) { p.lastOpen = G.clock; if (!searchSpot(p, s)) toast('Nobody in the ' + s.name.toLowerCase() + '.', 1.1); break; }
      }
    }
  }
  function becomeSeeker(p, by) {
    comeOut(p); p.role = 'seeker'; p.tgt = -1; p.wait = 0.8; G.nFound++;
    if (by) by.found++;
    toast(p.human ? 'You were found by ' + (by ? by.name : 'a seeker') + '! You are a seeker now.' : p.name + ' was found!', 3);
    if (G.online && G.online.host) net.event({ t: 'found', p: p.id, by: by ? by.id : -1 });
    if (!G.ps.some((q) => q.role === 'hider')) finish('seekers');
  }
  function searchSpot(p, s) {
    G.searched[s.id] = G.clock; G.rings.push({ x: s.x, z: s.z, t: 0 });
    if (s.occ >= 0) { const h = G.ps[s.occ]; if (h && h.role === 'hider') { becomeSeeker(h, p); return true; } }
    return false;
  }
  function finish(winner) {
    if (G.over) return; G.over = true; G.phase = 'over'; G.winner = winner;
    const me = G.me, hiderWin = winner === 'hiders';
    const surv = me.startRole === 'hider' && me.role === 'hider', reward = surv ? 30 : (me.startRole === 'seeker' ? (hiderWin ? 4 * me.found : 20 + 4 * me.found) : 5);
    let txt = hiderWin ? 'Time is up. At least one hider stayed hidden.' : 'Every hider was found!';
    txt += '\n\nYou: ' + (me.startRole === 'hider' ? (surv ? 'stayed hidden the whole time! 🏆' : 'found after ' + Math.round(me.survived) + 's') : 'found ' + me.found + ' hider' + (me.found === 1 ? '' : 's'));
    const left = G.ps.filter((q) => q.role === 'hider'); if (left.length) txt += '\nStill hidden: ' + left.map((q) => q.name).join(', ');
    txt += '\n\n+' + reward + ' 🍞';
    if (api.award) api.award(reward);
    setTimeout(() => { if (G && G.over) { $('h3endt').textContent = (hiderWin ? (me.startRole === 'hider' && surv ? 'Hiders win! 🏆' : 'Hiders win') : (me.startRole === 'seeker' ? 'Seekers win! 🏆' : 'Seekers win')); $('h3endx').textContent = txt; dom.end.style.display = 'flex'; $('h3again').style.display = G.online ? 'none' : ''; } }, 900);
    if (G.online && G.online.host) net.event({ t: 'end', w: winner });
  }

  // ------------------------------------------------------------------ bots
  function botPickSpot(p) {
    const taken = new Set(G.ps.map((q) => q.tgt)); let best = null, tries = 0;
    while (tries++ < 25) { const s = pick(G.spots); if (s.occ >= 0 || taken.has(s.id)) continue; best = s; if (Math.random() < 0.9) break; }
    p.tgt = best ? best.id : -1;
  }
  // ---- path finding on a coarse grid (1.5 unit cells; cells near walls and props are blocked)
  const NAV = { N: 80, C: 1.5, O: -60 };
  function buildNav(map) {
    const N = NAV.N, C = NAV.C, O = NAV.O, bl = new Uint8Array(N * N);
    for (const s of map.solids) {
      if (s[4] <= 0.9) continue;
      const i0 = Math.max(0, Math.floor((s[0] - 0.8 - O) / C)), i1 = Math.min(N - 1, Math.floor((s[2] + 0.8 - O) / C)), j0 = Math.max(0, Math.floor((s[1] - 0.8 - O) / C)), j1 = Math.min(N - 1, Math.floor((s[3] + 0.8 - O) / C));
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) bl[j * N + i] = 1;
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i < 2 || j < 2 || i > N - 3 || j > N - 3) bl[j * N + i] = 1;
    map.nav = bl;
  }
  function findPath(sx, sz, gx, gz) {
    const N = NAV.N, C = NAV.C, O = NAV.O, bl = G.map.nav, ci = (x) => Math.max(0, Math.min(N - 1, Math.floor((x - O) / C))), cx = (i) => O + (i + 0.5) * C;
    const si = ci(sx), sj = ci(sz), gi = ci(gx), gj = ci(gz), start = sj * N + si, goal = gj * N + gi;
    const g = new Float32Array(N * N).fill(1e9), from = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
    const heap = []; const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (heap[q][0] <= heap[i][0]) break; const t = heap[q]; heap[q] = heap[i]; heap[i] = t; i = q; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; const t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } } return top[1]; };
    const h = (i, j) => { const dx = Math.abs(i - gi), dz = Math.abs(j - gj); return (dx + dz + (1.414 - 2) * Math.min(dx, dz)) ; };
    const ok = (i, j) => { if (i < 0 || j < 0 || i >= N || j >= N) return false; if (!bl[j * N + i]) return true; return Math.hypot(cx(i) - gx, cx(j) - gz) < 3.6 || Math.hypot(cx(i) - sx, cx(j) - sz) < 1.9; };
    g[start] = 0; push(start, h(si, sj)); let found = false, it = 0;
    while (heap.length && it++ < 9000) {
      const n = pop(); if (closed[n]) continue; closed[n] = 1;
      if (n === goal) { found = true; break; }
      const i = n % N, j = (n / N) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (!ok(ni, nj)) continue;
        if (di && dj && (!ok(i + di, j) || !ok(i, j + dj))) continue;
        const m = nj * N + ni, c = g[n] + (di && dj ? 1.414 : 1); if (c < g[m]) { g[m] = c; from[m] = n; push(m, c + h(ni, nj)); }
      }
    }
    if (!found) return null;
    const path = []; for (let n = goal; n !== start && n >= 0; n = from[n]) path.push([cx(n % N), cx((n / N) | 0)]);
    path.reverse(); if (path.length) path[path.length - 1] = [gx, gz];
    // thin it out: keep only corners
    const out = []; for (let k = 0; k < path.length; k++) { if (k === path.length - 1 || k % 2 === 1) out.push(path[k]); }
    return out;
  }
  function botGo(p, tx, tz, key, spd, dt) {
    p.replan -= dt; if (p.pkey !== key) p.giveUp = 0;
    if (!p.path || p.pkey !== key || p.replan <= 0) { const fp = findPath(p.x, p.z, tx, tz); p.path = fp && fp.length ? fp : [[tx, tz]]; p.pi = 0; p.pkey = key; p.replan = key === 'chase' ? 0.45 : 3; }
    while (p.pi < p.path.length - 1 && dist2(p.x, p.z, p.path[p.pi][0], p.path[p.pi][1]) < 1.0) p.pi++;
    const w = p.path[p.pi]; let dx = w[0] - p.x, dz = w[1] - p.z; const l = Math.hypot(dx, dz) || 1;
    stepMove(p, dx / l, dz / l, spd, dt);
    p.stuckT += dt;
    if (p.stuckT > 0.8) {
      const moved = dist2(p.x, p.z, p.lx, p.lz); p.lx = p.x; p.lz = p.z; p.stuckT = 0;
      if (moved < 0.8) { p.stuck++; p.giveUp = (p.giveUp || 0) + 1; p.replan = 0; if (p.ground && Math.random() < 0.5) p.vy = 9.5; if (p.stuck >= 3) { p.stuck = 0; const nx = p.x + dx / l * 2.5, nz = p.z + dz / l * 2.5; if (freeAt(nx, nz, 0.6)) { p.x = nx; p.z = nz; } } }
      else { p.stuck = 0; if (p.giveUp > 0) p.giveUp -= 0.5; }
    }
    return p.giveUp >= 5 && key !== 'chase';
  }
  function botThink(p, dt) {
    if (p.blind) return;
    if (p.frz > 0) { p.frz -= dt; p.mx = p.mz = 0; return; }
    if (p.role === 'hider') {
      if (p.hidden >= 0) return;
      if (p.tgt < 0 || G.spots[p.tgt].occ >= 0) { botPickSpot(p); if (p.tgt < 0) return; }
      const s = G.spots[p.tgt], tx = s.cover ? s.x : s.dx, tz = s.cover ? s.z : s.dz;
      if (dist2(p.x, p.z, tx, tz) < (s.cover ? 0.7 : 0.8)) { if (s.cover) { p.mx = p.mz = 0; if (s.occ >= 0) botPickSpot(p); } else if (!hideIn(p, s)) botPickSpot(p); return; }
      if (botGo(p, tx, tz, 's' + s.id, SPEED * 0.92, dt)) botPickSpot(p);
      return;
    }
    // seeker
    if (G.phase !== 'seek') return;
    p.cd -= dt; p.wait -= dt;
    // a hider in plain view: chase it
    let vis = null, vd = 20;
    for (const q of G.ps) if (q.role === 'hider' && q.hidden < 0 && !q.invis) { const d = dist2(p.x, p.z, q.x, q.z); if (d < vd && los(p.x, p.z, q.x, q.z)) { vd = d; vis = q; } }
    if (vis) {
      if (vd < 1.7 && p.cd <= 0) { p.cd = 0.6; becomeSeeker(vis, p); return; }
      botGo(p, vis.x, vis.z, 'chase', SPEED_S * 1.04, dt); return;
    }
    if (p.wait > 0) { p.mx = p.mz = 0; return; }
    if (p.tgt < 0) {      // pick the next place to search: near ones first, with some randomness
      let best = null, bs = 1e9;
      for (const s of G.spots) { const age = G.clock - (G.searched[s.id] || -999); if (age < 70) continue; const sc = dist2(p.x, p.z, s.x, s.z) * (0.55 + Math.random() * 0.9) + (s.indoor ? 6 : 0); if (sc < bs) { bs = sc; best = s; } }
      p.tgt = best ? best.id : -1; if (!best) { p.wait = 1; return; }
    }
    const s = G.spots[p.tgt], tx = s.cover ? s.x : s.dx, tz = s.cover ? s.z : s.dz;
    if (dist2(p.x, p.z, tx, tz) < 0.85) { p.wait = rnd(0.4, 0.9) + p.skip * 0.5; if (Math.random() > p.skip * 0.9) searchSpot(p, s); else G.searched[s.id] = G.clock; p.tgt = -1; return; }
    if (botGo(p, tx, tz, 's' + s.id, SPEED_S * 1.04, dt)) { G.searched[s.id] = G.clock; p.tgt = -1; }
  }

  // ------------------------------------------------------------------ whistling (hiders lure, seekers warn) and owner perks
  let wac = null;
  function whistleSound(vol) {
    try {
      wac = wac || new (root.AudioContext || root.webkitAudioContext)(); if (wac.state === 'suspended') wac.resume();
      const t = wac.currentTime, o = wac.createOscillator(), g = wac.createGain(), o2 = wac.createOscillator();
      o.type = 'sine'; o2.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.linearRampToValueAtTime(2300, t + 0.28); o.frequency.linearRampToValueAtTime(1800, t + 0.55);
      o2.frequency.setValueAtTime(1510, t); o2.frequency.linearRampToValueAtTime(2310, t + 0.28); o2.frequency.linearRampToValueAtTime(1810, t + 0.55);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 * vol, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); o2.connect(g); g.connect(wac.destination); o.start(t); o2.start(t); o.stop(t + 0.65); o2.stop(t + 0.65);
    } catch (e) { /* ignore */ }
  }
  // everybody in earshot hears it; seeker bots go and look where a hider whistled
  function whistleAt(x, z, role, byId) {
    const g = G; if (!g) return; (g.whistles || (g.whistles = [])).push({ x, z, t: g.clock, role, by: byId }); g.rings.push({ x, z, t: 0 });
    const d = dist2(g.me.x, g.me.z, x, z); whistleSound(Math.max(0.08, 1 - d / 70));
    if (byId !== g.me.id) { const dir = Math.abs(x - g.me.x) > Math.abs(z - g.me.z) ? (x > g.me.x ? 'east' : 'west') : (z > g.me.z ? 'north' : 'south'); if (d < 70) toast('🎵 You hear a whistle to the ' + dir + '…', 2.2); }
    if (role === 'hider' && (!g.online || g.online.host)) for (const q of g.ps) if (!q.human && q.role === 'seeker' && g.phase === 'seek' && dist2(q.x, q.z, x, z) < 60 && Math.random() > q.skip * 0.5) {
      let best = -1, bd = 1e9; for (const s of g.spots) { const dd = dist2(s.x, s.z, x, z); if (dd < bd && g.clock - (g.searched[s.id] || -999) > 20) { bd = dd; best = s.id; } }
      if (best >= 0) { q.tgt = best; q.wait = 0; }
    }
  }
  function tryWhistle(p, fakeAt) {
    if (G.clock - (p.wcd || -99) < 5) { toast('Your whistle needs a moment…', 1); return; }
    p.wcd = G.clock; const x = fakeAt ? fakeAt[0] : p.x, z = fakeAt ? fakeAt[1] : p.z;
    if (G.online && !G.online.host) { whistleSound(0.5); net.send({ t: 'whistle', x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 }); }
    else { whistleAt(x, z, p.role, p.id); if (G.online) net.event({ t: 'wh', x, z, role: p.role, by: p.id }); }
  }
  function randomPlace() { const s = pick(G.spots); return [s.x + rnd(-6, 6), s.z + rnd(-6, 6)]; }
  function buildOwn() {
    if (!dom || !dom.own) return;
    const show = !!G && isOwn(); dom.own.style.display = show ? 'flex' : 'none'; if (!show) return;
    const defs = [['xray', '👁 X-ray'], ['invis', '🫥 Invisible'], ['speed', '💨 Speed x2'], ['jump', '🦘 Super jump'], ['tp', '🎲 Random teleport', 1], ['decoy', '🎵 Whistle from elsewhere', 1], ['freeze', '🧊 Freeze seekers 5s', 1], ['reveal', '📍 Ping everyone', 1]];
    dom.own.innerHTML = ''; dom.own.insertAdjacentHTML('beforeend', '<div style="font:800 11px system-ui;opacity:.85">OWNER</div>');
    for (const [k, l, one] of defs) {
      const b = document.createElement('button'); b.textContent = l; if (!one && own[k]) b.className = 'on';
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
      b.addEventListener('click', (e) => {
        e.stopPropagation(); if (!G) return; const me = G.me;
        if (!one) { own[k] = !own[k]; b.className = own[k] ? 'on' : ''; return; }
        if (k === 'tp') { const s = pick(G.spots); me.x = s.x + 2.5; me.z = s.z; me.y = 0; me.vy = 0; }
        else if (k === 'decoy') { me.wcd = -99; tryWhistle(me, randomPlace()); }
        else if (k === 'freeze') { for (const q of G.ps) if (q.role === 'seeker' && q !== me) q.frz = 5; toast('Seekers frozen for 5 seconds', 2); }
        else if (k === 'reveal') { for (const q of G.ps) if (q !== me) G.rings.push({ x: q.x, z: q.z, t: 0 }); }
      });
      dom.own.appendChild(b);
    }
  }

  // ------------------------------------------------------------------ the human player
  function humanThink(p, dt) {
    if (p.blind) { p.mx = p.mz = 0; actQ = false; jumpQ = false; whQ = false; return; }
    p.invis = isOwn() && own.invis;
    if (whQ) { whQ = false; if (G.phase !== 'over') tryWhistle(p); }
    const hiddenNow = p.hidden >= 0;
    if (actQ && G.online && !G.online.host) {            // guests ask the host; the host decides
      actQ = false;
      if (hiddenNow) net.send({ t: 'out' });
      else if (p.role === 'hider') { toast('No button needed: stand still in a bush, or walk into a cupboard door.', 2.5); }
      else if (G.phase === 'seek' && p.cd <= 0) {
        p.cd = 0.45; let tag = null, td = 2.5; for (const q of G.ps) if (q.role === 'hider' && q.hidden < 0) { const d = dist2(p.x, p.z, q.x, q.z); if (d < td) { td = d; tag = q; } }
        if (tag) net.send({ t: 'tag', p: tag.id });
        else { const s = nearestSpot(p, 3.4); if (s) { G.rings.push({ x: s.x, z: s.z, t: 0 }); net.send({ t: 'search', s: s.id }); } }
      }
    }
    if (actQ) {
      actQ = false;
      if (hiddenNow) { comeOut(p); }
      else if (p.role === 'hider') { toast('No button needed: stand still in a bush, or walk into a cupboard door (orange pad).', 2.5); }
      else if (G.phase === 'seek' && p.cd <= 0) {
        p.cd = 0.45;
        let tag = null, td = 2.5; for (const q of G.ps) if (q.role === 'hider' && q.hidden < 0) { const d = dist2(p.x, p.z, q.x, q.z); if (d < td) { td = d; tag = q; } }
        if (tag) becomeSeeker(tag, p);
        else { const s = nearestSpot(p, 3.4); if (s) { if (!searchSpot(p, s)) toast('Nobody in the ' + s.name.toLowerCase() + '.', 1.2); } else G.rings.push({ x: p.x + Math.sin(p.ry) * 1.5, z: p.z + Math.cos(p.ry) * 1.5, t: 0 }); }
      }
    }
    let ix = joy.x, iz = joy.z;
    if (hiddenNow && !G.spots[p.hidden].cover) {         // inside a cupboard: push the stick (or tap the button) to open the door and step out
      p.mx = p.mz = 0; jumpQ = false;
      const px = joy.x + ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0), pz = joy.z + ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0);
      p.push = Math.hypot(px, pz) > 0.5 ? (p.push || 0) + dt : 0;
      if (p.push > 0.35) { p.push = 0; if (G.online && !G.online.host) net.send({ t: 'out' }); else comeOut(p); }
      return;
    }
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1;
    const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw), fx = -sy, fz = -cy, rx = cy, rz = -sy;
    let dx = rx * ix + fx * iz, dz = rz * ix + fz * iz; const l = Math.hypot(dx, dz); if (l > 1) { dx /= l; dz /= l; }
    if (jumpQ && p.ground) { p.vy = isOwn() && own.jump ? 19 : 10.5; p.ground = false; } jumpQ = false;
    stepMove(p, dx, dz, (p.role === 'seeker' ? SPEED_S : SPEED) * (isOwn() && own.speed ? 2 : 1), dt);
    p.cd -= dt;
  }

  // ------------------------------------------------------------------ the frame
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!open) return;
    if (exitQ) { exitQ = false; if (G) { net.leave(); stopGame(); dom.lobby.style.display = 'flex'; } else close(); return; }
    if (!G) { drawBackdrop(now); return; }
    update(dt); render(dt);
  }
  function drawBackdrop(now) { if (!R) return; const a = now / 6000; R.drawFrame({ eye: [Math.cos(a) * 75, 38, Math.sin(a) * 75], at: [0, 0, 0], fov: 1 }, null); }

  function update(dt) {
    const g = G; g.clock += dt;
    const me = g.me;
    if (g.online && !g.online.host) { humanThink(me, dt); net.clientStep(dt); return; }
    if (!g.over) {
      g.t -= dt;
      if (g.phase === 'hide') { if (g.t <= 0) { g.phase = 'seek'; g.t = SEEK_T; g.ps.forEach((p) => { p.blind = false; }); toast('Ready or not — here come the seekers!', 3); } else g.ps.forEach((p) => { if (p.role === 'seeker') p.blind = true; }); }
      else if (g.phase === 'seek') { if (g.t <= 0) finish('hiders'); else g.ps.forEach((p) => { if (p.role === 'hider') p.survived += dt; }); }
    }
    for (const p of g.ps) {
      if (p.human && p.id === me.id) humanThink(p, dt);
      else if (!p.human) botThink(p, dt);
    }
    for (const p of g.ps) autoHide(p, dt);
    if (g.online) net.hostStep(dt);
  }

  const HEXOK = /^#[0-9a-f]{6}$/i, col = (c, d) => (typeof c === 'string' && HEXOK.test(c) ? c : d);
  function modelBoxes(m, p) {
    const c = p.cols, x = p.x, z = p.z, y = p.y, ry = p.ry, mv = Math.hypot(p.mx, p.mz) > 0.3 ? 1 : 0, s = Math.sin(p.anim) * (p.ground ? 0.35 : 0.1) * mv, air = p.ground ? 0 : 0.3;
    const h0 = p.hat && typeof p.hat === 'object' ? p.hat : null, X = h0 || {};
    const co = Math.cos(ry), si = Math.sin(ry), put = (dx, y0, dz, w, h, d, cl, tw) => m.box(x + dx * co + dz * si, y + y0, z - dx * si + dz * co, w, h, d, cl, ry + (tw || 0));
    // a rounded blob: stacked slices that narrow like an egg, each drawn twice (one turned 45 degrees) so it reads as round, not blocky
    const blob = (cx, cy, cz, rx, rY, rz, cl, n, a, b) => {
      n = n || 5; a = a == null ? 0 : a; b = b == null ? n : b;
      for (let k = a; k < b; k++) { const t = ((k + 0.5) / n) * 2 - 1, sc = Math.sqrt(Math.max(0.05, 1 - t * t)), hh = (2 * rY) / n + 0.02, yy = cy - rY + (k * 2 * rY) / n;
        put(cx, yy, cz, 2 * rx * sc, hh, 2 * rz * sc, cl); put(cx, yy + 0.006, cz, 2 * rx * sc, hh - 0.012, 2 * rz * sc, cl, 0.785); }
    };
    const sh = col(X.sh, c.leg);
    put(0.3, 0, s * 0.8, 0.2, 0.5, 0.2, c.leg); put(-0.3, 0, -s * 0.8, 0.2, 0.5, 0.2, c.leg);                    // legs
    blob(0.3, 0.07, s * 0.8 + 0.2, 0.28, 0.08, 0.4, sh, 2); blob(-0.3, 0.07, -s * 0.8 + 0.2, 0.28, 0.08, 0.4, sh, 2);   // webbed feet
    const bob = mv ? Math.abs(Math.sin(p.anim)) * 0.06 : 0, by = 1.0 + bob;
    blob(0, by, 0, 0.78, 0.58, 0.98, c.body, 5);                                                                  // round body
    if (X.vs) blob(0, by, 0, 0.82, 0.6, 0.82, col(X.vs, '#3a86ff'), 5, 1, 4);                                      // clothes: a belly band in the outfit colour
    blob(0.76, by + 0.08 + air, 0, 0.13, 0.34, 0.6, c.wing, 3); blob(-0.76, by + 0.08 + air, 0, 0.13, 0.34, 0.6, c.wing, 3);   // rounded wings
    blob(0, by + 0.12, -0.95, 0.3, 0.26, 0.34, c.body, 3);                                                        // tail
    // short, wobbly neck: three little segments that sway with the walk cycle and a slow idle wobble
    const t2 = p.anim * (mv ? 1 : 0.35), amp = mv ? 0.1 : 0.05;
    let nx = 0, nz = 0.52; const NS = 3;
    for (let k = 0; k < NS; k++) {
      nx = Math.sin(t2 * 1.3 + k * 1.1) * amp * (k + 1) / NS; nz = 0.52 + k * 0.05 + Math.cos(t2 * 1.1 + k) * 0.03 * (k + 1);
      blob(nx, by + 0.4 + k * 0.24 + 0.14, nz, 0.2, 0.16, 0.2, c.head, 2);
    }
    const hx = nx, hz = nz + 0.12, hy = by + 0.4 + NS * 0.24 + 0.34;                                                  // head centre
    if (X.sc) blob(nx * 0.4, by + 0.62, 0.55, 0.32, 0.1, 0.32, col(X.sc, '#e63946'), 2);                              // scarf
    blob(hx, hy, hz, 0.46, 0.42, 0.46, c.head, 5);                                                                // round head
    put(hx, hy - 0.1, hz + 0.5, 0.36, 0.14, 0.34, c.beak); put(hx, hy - 0.2, hz + 0.54, 0.34, 0.07, 0.3, c.beak);     // beak
    put(hx + 0.2, hy + 0.1, hz + 0.38, 0.12, 0.16, 0.06, '#111111'); put(hx - 0.2, hy + 0.1, hz + 0.38, 0.12, 0.16, 0.06, '#111111');   // eyes
    if (X.gl) { const gc = col(X.gl, '#222222'); put(hx + 0.2, hy + 0.04, hz + 0.43, 0.28, 0.26, 0.05, gc); put(hx - 0.2, hy + 0.04, hz + 0.43, 0.28, 0.26, 0.05, gc); put(hx, hy + 0.1, hz + 0.43, 0.14, 0.05, 0.05, gc); put(hx + 0.2, hy + 0.1, hz + 0.46, 0.12, 0.16, 0.05, '#111111'); put(hx - 0.2, hy + 0.1, hz + 0.46, 0.12, 0.16, 0.05, '#111111'); }
    const putH = (dx, y0, dz, w, h, d, cl) => put(hx + dx, y0 - 2.75 + hy + 0.45, hz + dz - 0.05, w, h, d, cl);    // hats were built for the old head: follow the new one
    if (h0 && h0.k && p.role !== 'seeker') {
      const h = h0, hc = col(h0.c, '#e63946');
      if (h.k === 'top') { putH(0, 2.75, 0.05, 1.3, 0.15, 1.3, hc); putH(0, 2.9, 0.05, 0.8, 0.9, 0.8, hc); putH(0, 2.95, 0.05, 0.84, 0.18, 0.84, '#ffffff'); }
      else if (h.k === 'cap') { putH(0, 2.75, 0.05, 1.05, 0.3, 1.05, hc); putH(0, 2.75, 0.7, 0.9, 0.08, 0.45, hc); }
      else if (h.k === 'crown') { putH(0, 2.75, 0.05, 1.0, 0.25, 1.0, '#ffd23f'); for (const dx of [-0.35, 0, 0.35]) putH(dx, 3.0, 0.05, 0.22, 0.28, 0.22, '#ffd23f'); }
      else if (h.k === 'party') { putH(0, 2.75, 0.05, 0.8, 0.3, 0.8, hc); putH(0, 3.05, 0.05, 0.55, 0.3, 0.55, '#ffffff'); putH(0, 3.35, 0.05, 0.3, 0.3, 0.3, hc); }
      else if (h.k === 'prop') { putH(0, 2.75, 0.05, 0.95, 0.25, 0.95, hc); putH(0, 3.0, 0.05, 0.12, 0.3, 0.12, '#444'); putH(Math.sin(p.anim * 3) * 0.5, 3.3, Math.cos(p.anim * 3) * 0.5, 1.1, 0.06, 0.2, '#ffffff'); }
      else if (h.k === 'cone') { putH(0, 2.75, 0.05, 0.9, 0.35, 0.9, '#ff8c42'); putH(0, 3.1, 0.05, 0.55, 0.35, 0.55, '#ffffff'); putH(0, 3.45, 0.05, 0.25, 0.3, 0.25, '#ff8c42'); }
      else { putH(0, 2.75, 0.05, 0.3, 0.45, 0.3, '#2fbf71'); for (let i = 0; i < 5; i++) putH(Math.cos(i * 1.256) * 0.4, 3.1, Math.sin(i * 1.256) * 0.4, 0.3, 0.3, 0.3, hc); }
    }
    if (p.role === 'seeker') { putH(0, 2.75, 0.05, 1.12, 0.22, 1.12, '#e63946'); putH(0, 2.95, 0.05, 0.7, 0.2, 0.7, '#e63946'); putH(0, 2.75, 0.7, 0.9, 0.1, 0.4, '#b3202c'); }   // red cap
    m.box(x, y + 0.01, z, 1.5, 0.02, 1.5, [0.2, 0.28, 0.16]);                                 // blob shadow
    m.box(x, y + 0.01, z, 1.5, 0.02, 1.5, [0.2, 0.28, 0.16]);                                 // blob shadow
  }
  const dynm = E ? E.mesh() : null;

  function render(dt) {
    const g = G, me = g.me, m = dynm; m.clear();
    // camera
    const hid = me.hidden >= 0 ? g.spots[me.hidden] : null, tx = hid && !hid.cover ? hid.x : me.x, tz = hid && !hid.cover ? hid.z : me.z, ty = (hid ? 0 : me.y) + 2.1;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    let d = cam.dist;
    const sols = g.map.solids;
    for (let k = 0.5; k <= d; k += 0.5) {      // pull the camera in front of walls
      const ex = tx + Math.sin(cam.yaw) * cp * k, ez = tz + Math.cos(cam.yaw) * cp * k, ey = ty + sp * k; let hit = false;
      for (let i = 0; i < sols.length; i++) { const s = sols[i]; if (s[5] || s[4] > 8 || ey > s[4] || ex < s[0] - 0.4 || ex > s[2] + 0.4 || ez < s[1] - 0.4 || ez > s[3] + 0.4) continue; hit = true; break; }
      if (hit) { d = Math.max(1.6, k - 0.5); break; }
    }
    d = d + (cam._d == null ? 0 : 0); cam._d = d;
    const eye = [tx + Math.sin(cam.yaw) * cp * d, Math.max(0.6, ty + sp * d), tz + Math.cos(cam.yaw) * cp * d];
    // roofs (the one you are under is lifted off)
    const inB = bAt(me.x, me.z);
    g.map.roofs.forEach((r, i) => { if (inB === i && !hid) return; m.box(r.x, r.y, r.z, r.w, r.h, r.d, r.c); });
    for (const p of g.ps) if (p.hidden < 0 && !(p.id !== me.id && g.online && p.away) && !(p.invis && p.id !== me.id)) modelBoxes(m, p);
    if (me.role === 'hider' && me.hidden < 0) for (const s of g.spots) if (!s.cover && s.occ < 0 && dist2(me.x, me.z, s.dx, s.dz) < 18) { const k = 1 + Math.sin(g.clock * 4) * 0.08; m.box(s.dx, 0.02, s.dz, 1.5 * k, 0.06, 1.5 * k, '#ff9a2f'); m.box(s.dx, 0.08, s.dz, 0.9, 0.06, 0.9, '#ffd27a'); }
    // puffs (a leafy "rustle" where someone just hid) and search rings
    for (const f of g.puffs) { f.t += dt; for (let i = 0; i < 4; i++) { const a = i * 1.57 + f.t * 3; m.box(f.x + Math.cos(a) * (0.6 + f.t), 2.4 + f.t * 1.5 + i * 0.1, f.z + Math.sin(a) * (0.6 + f.t), 0.25, 0.25, 0.25, '#ffffff'); } }
    g.puffs = g.puffs.filter((f) => f.t < 0.8);
    for (const r of g.rings) { r.t += dt; const rad = 0.6 + r.t * 4; for (let i = 0; i < 10; i++) { const a = i * 0.628; m.box(r.x + Math.cos(a) * rad, 0.3, r.z + Math.sin(a) * rad, 0.3, 0.3, 0.3, '#ffe066'); } }
    g.rings = g.rings.filter((r) => r.t < 0.5);
    R.drawFrame({ eye, at: [tx, ty - 0.3, tz], fov: 1.0 }, m);
    drawHud(dt, eye);
  }

  // ------------------------------------------------------------------ HUD
  function drawHud(dt) {
    const c = hudCtx, w = dom.hud.clientWidth, h = dom.hud.clientHeight, dpr = Math.min(2, root.devicePixelRatio || 1);
    if (dom.hud.width !== Math.floor(w * dpr)) { dom.hud.width = Math.floor(w * dpr); dom.hud.height = Math.floor(h * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const g = G, me = g.me;
    c.textAlign = 'center'; c.lineJoin = 'round';
    const label = (t, x, y, col, sz) => { c.font = '800 ' + (sz || 15) + 'px system-ui,sans-serif'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(t, x, y); c.fillStyle = col || '#fff'; c.fillText(t, x, y); };
    // name tags
    for (const p of g.ps) {
      if (p.id === me.id || p.hidden >= 0 || p.invis) continue;
      const q = R.project([p.x, p.y + 3.5, p.z]); if (!q || q[2] > 40) continue;
      label((p.role === 'seeker' ? '🔍 ' : '') + p.name, q[0], q[1], p.role === 'seeker' ? '#ff8a8a' : '#fff', 14);
    }
    // timer / phase
    const mm = Math.max(0, Math.floor(g.t / 60)), ss = Math.max(0, Math.floor(g.t % 60));
    const hidersLeft = g.ps.filter((p) => p.role === 'hider').length;
    label(g.phase === 'hide' ? '🫣 Hiding time: ' + Math.ceil(g.t) : '⏱ ' + mm + ':' + String(ss).padStart(2, '0') + '   ·   🫣 ' + hidersLeft + ' hiding', w / 2, 30, '#fff', 20);
    label(me.hidden >= 0 ? 'You are hiding in the ' + g.spots[me.hidden].name.toLowerCase() + (g.spots[me.hidden].cover ? ' · stay still!' : '') : me.role === 'seeker' ? 'You are a SEEKER 🔍' : 'You are a HIDER 🫣', w / 2, 54, me.role === 'seeker' ? '#ff9a9a' : '#9aff9a', 15);
    // toasts
    g.toasts.forEach((t, i) => { t.left -= dt; }); g.toasts = g.toasts.filter((t) => t.left > 0).slice(-4);
    g.toasts.forEach((t, i) => label(t.t, w / 2, h * 0.2 + i * 24, '#fff', 16));
    // minimap
    const ms = Math.min(150, w * 0.28), mx = 10, my = 10, sc = ms / g.map.size, cx = (x) => mx + (x + 60) * sc, cz = (z) => my + (z + 60) * sc;
    c.save(); c.globalAlpha = 0.85; c.fillStyle = 'rgba(20,30,40,.7)'; c.fillRect(mx, my, ms, ms);
    c.fillStyle = 'rgba(190,200,215,.7)'; for (const r of g.map.rects) c.fillRect(cx(r[0]), cz(r[1]), (r[2] - r[0]) * sc, (r[3] - r[1]) * sc);
    if (me.role === 'seeker') for (const s of g.spots) { const done = g.clock - (g.searched[s.id] || -999) < 70; c.fillStyle = done ? '#4cd964' : '#ffcf40'; c.fillRect(cx(s.x) - 1, cz(s.z) - 1, 2.5, 2.5); }
    if (isOwn() && own.xray) { for (const p of g.ps) if (p.role === 'hider' && p.id !== me.id) { const q = p.hidden >= 0 && !g.spots[p.hidden].cover ? g.spots[p.hidden] : p; c.fillStyle = '#58f08a'; c.beginPath(); c.arc(cx(q.x), cz(q.z), 2.8, 0, 7); c.fill(); } c.font = '700 9px system-ui'; c.fillStyle = '#ffd23f'; c.fillText('👑 owner x-ray', 14, 154); }
    for (const p of g.ps) if (p.role === 'seeker') { c.fillStyle = '#ff4d4d'; c.beginPath(); c.arc(cx(p.x), cz(p.z), 2.6, 0, 7); c.fill(); }
    for (const w of g.whistles || []) { const age = g.clock - w.t; if (age > 6 || (w.role === me.role && w.by !== me.id)) continue; c.strokeStyle = w.role === 'hider' ? 'rgba(255,230,90,' + (1 - age / 6) + ')' : 'rgba(255,110,110,' + (1 - age / 6) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(cx(w.x), cz(w.z), 3 + age * 5, 0, 7); c.stroke(); }
    const mp = me.hidden >= 0 ? g.spots[me.hidden] : me; c.fillStyle = '#fff'; c.beginPath(); c.arc(cx(mp.x), cz(mp.z), 3.4, 0, 7); c.fill();
    c.restore();
    // the action button + prompt
    let t = 'HIDE', sub = '(E)', show = true;
    if (me.hidden >= 0) { t = 'COME OUT'; }
    else if (me.role === 'hider') { t = '—'; show = false; const s = nearestSpot(me, 4.5); if (s && s.occ < 0) label(s.cover ? 'Step into the ' + s.name.toLowerCase() + ' and stand still' : 'Walk into the orange pad to get in the ' + s.name.toLowerCase(), w / 2, h * 0.72, '#ffe27a', 15); }
    else { t = 'SEARCH'; show = g.phase === 'seek'; const s = nearestSpot(me, 3.4); if (s && show) label('Search the ' + s.name.toLowerCase(), w / 2, h * 0.72, '#ffe27a', 15); }
    dom.actt.textContent = t; dom.act.style.opacity = show ? 1 : 0.35;
    if (me.blind) { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.font = '800 34px system-ui,sans-serif'; c.fillStyle = '#fff'; c.fillText('Eyes closed… counting', w / 2, h / 2 - 10); c.font = '800 60px system-ui,sans-serif'; c.fillText(String(Math.ceil(g.t)), w / 2, h / 2 + 60); }
    if (g.phase === 'over') { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, 0, w, h); }
  }

  // ------------------------------------------------------------------ online rooms: filled in by h3d_net.js
  let net = { join() {}, leave() {}, hostStart() {}, isHost: () => true, event() {}, hostStep() {}, clientStep() {}, send() {}, connected: () => false, refresh() {} };
  root.Hide3D = {
    init(a) { api = a; }, open: openUI, close, start,
    setNet(n) { net = n; },
    _step(dt) { if (G) update(dt); },
    _stop() { stopGame(); },
    _ctx: { whistleAt, whistleSound, get G() { return G; }, get api() { return api; }, MAPS, E, rnd, pick, myHat, randHat, dom: () => dom, newPlayer, botCols, colsOf, start, finish, becomeSeeker, hideIn, comeOut, searchSpot, modelBoxes, toast, $, cam },
  };
})(window);
