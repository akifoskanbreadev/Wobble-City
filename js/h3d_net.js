/*
 * Online rooms for 3D Hide & Seek (PeerJS: matchmaking through the public broker, then direct WebRTC).
 * The first player to type a room word hosts. The host runs the rules and the bots; guests move their own goose
 * and ask the host to hide / search / tag. The host sends a snapshot of everyone ten times a second.
 * Up to 8 people; bots fill the rest of the 8 places.
 */
(function (root) {
  'use strict';
  const H = root.Hide3D, X = H._ctx, PREFIX = 'wobble3d-v1-', MAX = 8;
  let peer = null, hostConn = null, isHost = false, myNet = 0, word = '', connected = false, tries = 0;
  const conns = new Map();                 // host: net id -> connection
  const roster = {};                       // net id -> { skin }
  let sendT = 0, snapT = 0;
  const $ = (id) => document.getElementById(id);
  const slug = (w) => String(w || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  const r1 = (n) => Math.round(n * 10) / 10;
  const status = (t, bad) => { const e = $('h3ostat'); if (e) { e.textContent = t; e.style.color = bad ? '#c62835' : ''; } };
  const toAll = (o, except) => conns.forEach((c, id) => { if (id !== except && c.open) { try { c.send(o); } catch (e) { /* ignore */ } } });
  const toHost = (o) => { if (hostConn && hostConn.open) { try { hostConn.send(o); } catch (e) { /* ignore */ } } };

  function refresh() {
    const n = Object.keys(roster).length, row = $('h3orow');
    if (!connected) { if (row) row.style.display = 'none'; return; }
    status('Room “' + word + '”: ' + n + ' player' + (n === 1 ? '' : 's') + ' here' + (isHost ? (n < 2 ? '. Waiting for a friend…' : '. Ready when you are!') : '. Waiting for the host to start…'));
    if (row) row.style.display = isHost && n >= 2 ? '' : 'none';
  }
  function leave() {
    if (isHost) toAll({ t: 'stop' });
    try { if (peer) peer.destroy(); } catch (e) { /* ignore */ }
    peer = null; hostConn = null; conns.clear(); connected = false; isHost = false;
    for (const k of Object.keys(roster)) delete roster[k];
    const row = $('h3orow'); if (row) row.style.display = 'none';
  }
  function fail(m) { leave(); status(m, true); }
  const mySkin = () => X.api.save().skin;

  function join(w) {
    word = slug(w);
    if (!word) return status('Type a word first (any word you and your friends agree on).', true);
    if (!root.Peer) return status('Could not load the matchmaking library (are you offline?).', true);
    leave(); tries = 0; status('Looking for the room “' + word + '”…'); tryHost();
  }
  function tryHost() {
    const p = new root.Peer(PREFIX + word, { debug: 0 }); peer = p;
    p.on('open', () => { isHost = true; myNet = 0; connected = true; roster[0] = { skin: mySkin() }; p.on('connection', onGuest); refresh(); });
    p.on('error', (e) => {
      if (e.type === 'unavailable-id') { try { p.destroy(); } catch (x) { /* ignore */ } becomeGuest(); }
      else if (!connected) fail('Connection problem: ' + (e.type || e));
    });
  }
  function becomeGuest() {
    const p = new root.Peer(undefined, { debug: 0 }); peer = p;
    p.on('open', () => {
      const c = p.connect(PREFIX + word, { reliable: true, serialization: 'json' }); hostConn = c;
      c.on('open', () => toHost({ t: 'hi', skin: mySkin() }));
      c.on('data', (m) => onMsg(m, 0));
      c.on('close', lost); c.on('error', lost);
    });
    p.on('error', (e) => {
      if (e.type === 'peer-unavailable') { try { p.destroy(); } catch (x) { /* ignore */ } if (++tries > 4) return fail('Could not join that room. Try again.'); status('Room not ready yet… retrying'); setTimeout(tryHost, 1200); }
      else if (!connected) fail('Connection problem: ' + (e.type || e));
    });
  }
  function onGuest(c) {
    c.on('open', () => {
      if (X.G || conns.size >= MAX - 1) { try { c.send({ t: 'busy', why: X.G ? 'A game is already running in that room.' : 'That room is full (8 players).' }); } catch (e) { /* ignore */ } setTimeout(() => { try { c.close(); } catch (e) { /* ignore */ } }, 400); return; }
      let id = 1; while (conns.has(id)) id++;
      conns.set(id, c);
      c.on('data', (m) => onMsg(m, id));
      c.on('close', () => drop(id)); c.on('error', () => drop(id));
      c.send({ t: 'welcome', id });
    });
  }
  function drop(id) {
    if (!conns.has(id)) return;
    conns.delete(id); delete roster[id];
    if (X.G && X.G.online) { const idx = (X.G.online.map || {})[id]; const p = X.G.ps[idx]; if (p) { p.human = false; p.tgt = -1; X.toast(p.name + ' left — a bot takes over.', 3); } }
    sendRoster(); refresh();
  }
  function lost() {
    const was = !!X.G; leave();
    if (was) { X.dom().end.style.display = 'none'; H._stop(); X.dom().lobby.style.display = 'flex'; }
    else { X.dom().online.style.display = 'flex'; }
    status('Disconnected from the room.', true);
  }
  function sendRoster() { toAll({ t: 'roster', list: Object.keys(roster).map((id) => ({ id: +id, skin: roster[id].skin })) }); refresh(); }

  // ------------------------------------------------------------ host: starting a game
  function hostStart() {
    if (!isHost || X.G) return;
    const humans = Object.keys(roster).map(Number).sort((a, b) => a - b); if (humans.length < 2) return status('You need at least one friend in the room first.', true);
    const names = ['Honky', 'Waddle', 'Biscuit', 'Quackers', 'Pebble', 'Noodle', 'Gus', 'Mabel'].sort(() => Math.random() - 0.5);
    const n = MAX, mi = (Math.random() * X.MAPS.LIST.length) | 0, seed = (Math.random() * 1e9) | 0, map = X.MAPS.build(mi, seed);
    const players = [], idxOf = {};
    for (let i = 0; i < n; i++) {
      const hid = humans[i], human = hid != null;
      const cols = human ? X.colsOf(roster[hid].skin) : X.botCols(), sp = map.spawns[i % map.spawns.length];
      if (human) idxOf[hid] = i;
      players.push({ name: human ? (hid === 0 ? 'Host' : 'P' + (hid + 1)) : names[i % names.length], human, cols, role: 'hider', x: sp[0], z: sp[1], ry: X.rnd(0, 6.28) });
    }
    const pool = players.map((_, i) => i); const nSeek = 2; for (let k = 0; k < nSeek; k++) { const j = (Math.random() * pool.length) | 0; players[pool.splice(j, 1)[0]].role = 'seeker'; }
    const setup = { map: mi, seed, players };
    conns.forEach((c, id) => { try { c.send({ t: 'start', setup, my: idxOf[id] }); } catch (e) { /* ignore */ } });
    X.start({ map: mi, seed, setup, myId: idxOf[0], online: { host: true, map: idxOf } });
  }

  // ------------------------------------------------------------ messages
  function onMsg(m, from) {
    const G = X.G;
    switch (m.t) {
      case 'welcome': myNet = m.id; isHost = false; connected = true; break;
      case 'busy': status(m.why, true); leave(); break;
      case 'hi': if (isHost) { roster[from] = { skin: m.skin }; sendRoster(); } break;
      case 'roster': { for (const k of Object.keys(roster)) delete roster[k]; m.list.forEach((r) => { roster[r.id] = { skin: r.skin }; }); refresh(); break; }
      case 'start': if (!isHost) { X.dom().online.style.display = 'none'; X.start({ map: m.setup.map, seed: m.setup.seed, setup: m.setup, myId: m.my, online: { host: false, my: m.my } }); } break;
      case 'p': if (isHost && G) { const idx = G.online.map[from], p = G.ps[idx]; if (p && p.hidden < 0) { p.x = m.x; p.y = m.y; p.z = m.z; p.ry = m.ry; p.anim = m.a; p.mx = m.mx; p.mz = m.mz; p.ground = m.y < 0.05; } } break;
      case 'hide': case 'out': case 'search': case 'tag': if (isHost && G) action(from, m); break;
      case 's': if (!isHost && G) applySnap(m); break;
      case 'found': if (!isHost && G) { const a = G.ps[m.p], b = G.ps[m.by]; if (a) X.toast(a === G.me ? 'You were found by ' + (b ? b.name : 'a seeker') + '! You are a seeker now.' : a.name + ' was found by ' + (b ? b.name : 'a seeker') + '!', 3); } break;
      case 'end': if (!isHost && G && !G.over) { G.over = true; X.finish(m.w); } break;
      case 'stop': if (!isHost) { X.dom().end.style.display = 'none'; H._stop(); leave(); X.dom().online.style.display = 'flex'; status('The host left the room.', true); } break;
      default: break;
    }
  }
  function action(from, m) {
    const G = X.G, p = G.ps[G.online.map[from]]; if (!p) return;
    const sp = m.s != null ? G.spots[m.s] : null, d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    if (m.t === 'hide') { if (sp && p.role === 'hider' && p.hidden < 0 && d(p, sp) < 5.5) X.hideIn(p, sp); }
    else if (m.t === 'out') { X.comeOut(p); }
    else if (m.t === 'search') { if (sp && p.role === 'seeker' && G.phase === 'seek' && d(p, sp) < 5.5) X.searchSpot(p, sp); }
    else if (m.t === 'tag') { const q = G.ps[m.p]; if (q && p.role === 'seeker' && G.phase === 'seek' && q.role === 'hider' && q.hidden < 0 && d(p, q) < 4.5) X.becomeSeeker(q, p); }
  }

  // ------------------------------------------------------------ snapshots
  function hostStep(dt) {
    const G = X.G; if (!G) return;
    snapT += dt; if (snapT < 0.1) return; snapT = 0;
    const sr = []; for (const k in G.searched) if (G.clock - G.searched[k] < 70) sr.push(+k);
    toAll({ t: 's', ph: G.phase, tt: r1(G.t), ps: G.ps.map((p) => [p.id, r1(p.x), r1(p.y), r1(p.z), r1(p.ry), r1(p.anim), p.role === 'seeker' ? 1 : 0, p.hidden, p.found, Math.round(p.survived), r1(p.mx), r1(p.mz)]), sr });
  }
  function applySnap(m) {
    const G = X.G, me = G.me;
    G.phase = m.ph; G.t = m.tt;
    me.blind = m.ph === 'hide' && me.role === 'seeker';
    for (const s of G.spots) s.occ = -1;
    for (const e of m.ps) {
      const p = G.ps[e[0]]; if (!p) continue;
      const wasHidden = p.hidden;
      p.role = e[6] ? 'seeker' : 'hider'; p.hidden = e[7]; p.found = e[8]; p.survived = e[9];
      if (p.hidden >= 0) { G.spots[p.hidden].occ = p.id; if (wasHidden < 0) G.puffs.push({ x: G.spots[p.hidden].x, z: G.spots[p.hidden].z, t: 0 }); }
      if (p === me) { if (p.hidden >= 0) { p.x = G.spots[p.hidden].x; p.z = G.spots[p.hidden].z; p.y = 0; } else if (wasHidden >= 0 || Math.hypot(p.x - e[1], p.z - e[3]) > 5) { p.x = e[1]; p.z = e[3]; p.y = e[2]; } }
      else { p.tx = e[1]; p.ty = e[2]; p.tz = e[3]; p.try_ = e[4]; p.anim = e[5]; p.mx = e[10]; p.mz = e[11]; p.ground = e[2] < 0.05; if (p.hidden >= 0) { p.x = G.spots[p.hidden].x; p.z = G.spots[p.hidden].z; } }
    }
    G.searched = {}; for (const id of m.sr) G.searched[id] = G.clock;
  }
  function clientStep(dt) {
    const G = X.G, me = G.me;
    for (const p of G.ps) {
      if (p === me || p.tx == null || p.hidden >= 0) continue;
      const k = Math.min(1, dt * 12); p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.z += (p.tz - p.z) * k;
      let da = p.try_ - p.ry; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; p.ry += da * k;
    }
    G.t -= 0; sendT += dt;
    if (sendT > 0.066 && me.hidden < 0) { sendT = 0; toHost({ t: 'p', x: r1(me.x), y: r1(me.y), z: r1(me.z), ry: r1(me.ry), a: r1(me.anim), mx: r1(me.mx), mz: r1(me.mz) }); }
  }

  H.setNet({
    join, leave, hostStart, refresh,
    isHost: () => isHost, connected: () => connected,
    event: (o) => { if (isHost) toAll(o); }, send: (o) => toHost(o), hostStep, clientStep,
  });
})(window);
