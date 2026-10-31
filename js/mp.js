/*
 * Online multiplayer for up to 4 players. Everyone types the same room word. The first person to use a word
 * becomes the host; everybody else who types it connects to them (PeerJS public broker for matchmaking, then a direct
 * WebRTC data channel). Every player simulates their own goose; other players are smoothed "ghosts" built from
 * pose messages. The host runs the rules (tag, hide & seek, results) and relays poses between guests.
 * Modes: Race, Tag, Hide & Seek, Minigame duel.
 */
(function (root) {
  'use strict';
  const MAX = 4, PREFIX = 'wobblecity-v1-';
  let qSlot = 0, sel = { mode: 'race', arg: 'r:0' }, api = null, peer = null, hostConn = null, isHost = false, myId = 0, connected = false, word = '', tries = 0, busyMsg = '';
  const conns = new Map();                 // host only: guest id -> connection
  const roster = {};                       // id -> { skin, equip }
  const ghosts = {};                       // id -> { cur, tgt }
  const M = { mode: null, over: false, countdown: 0, phase: '', seekers: [], seeker0: -1, found: [], it: -1, tIt: {}, left: 0, tagCd: 0, ids: [], arg: null, seed: 0,
              scores: {}, myScore: null, sendT: 0, uiT: 0, saveRandom: null, diff: null };
  const $ = (id) => document.getElementById(id);
  const nm = (id) => (id === myId ? 'You' : 'P' + (id + 1));
  const T = (s) => s.replace(/@(\d)/g, (m, d) => nm(+d));      // "@2 won" -> "P3 won" / "You won"
  const slug = (w) => String(w || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);

  // ------------------------------------------------------------ networking
  function status(t, bad) { const s = $('mpStatus'); if (s) { s.textContent = t; s.style.color = bad ? '#c62835' : ''; } }
  function toAll(o, except) { conns.forEach((c, id) => { if (id !== except && c.open) { try { c.send(o); } catch (e) { /* ignore */ } } }); }
  function toHost(o) { if (hostConn && hostConn.open) { try { hostConn.send(o); } catch (e) { /* ignore */ } } }
  const broadcast = (o) => (isHost ? toAll(o) : toHost(o));

  function disconnect() {
    arenaAuto = false; if (autoTm) { clearInterval(autoTm); autoTm = null; }
    if (M.mode) stopMode();
    try { if (peer) peer.destroy(); } catch (e) { /* ignore */ }
    peer = null; hostConn = null; conns.clear(); connected = false; isHost = false;
    for (const k of Object.keys(roster)) delete roster[k]; for (const k of Object.keys(ghosts)) delete ghosts[k];
    ui();
  }
  function fail(msg) { disconnect(); status(msg, true); }

  let qPre = 'q-play-', arenaAuto = false, autoTm = null;
  function joinQuick(pre) { qPre = typeof pre === 'string' ? pre : 'q-play-'; qSlot = 1; join(qPre + '1', true); }
  function arenaQuick() {                    // find real players for the Battle Arena: the host starts it a few seconds after someone joins
    open(); arenaAuto = true; joinQuick('q-arena-'); sel = { mode: 'brawl', arg: null }; fillMaps(); ui();
  }
  function join(w, quick) {
    if (!quick) qSlot = 0;
    word = slug(w);
    if (!word) return status('Type a word first (any word you and your friends agree on).', true);
    if (!root.Peer) return status('Could not load the matchmaking library (are you offline?).', true);
    if (connected) disconnect();
    try { localStorage.setItem('wobble.lastRoom', word); } catch (e) { /* ignore */ }
    tries = 0; status('Looking for the room “' + word + '”…'); tryHost();
  }
  function tryHost() {
    const p = new root.Peer(PREFIX + word, { debug: 0 }); peer = p;
    p.on('open', () => {
      isHost = true; myId = 0; connected = true; roster[0] = mine();
      p.on('connection', onGuest);
      ui();
    });
    p.on('error', (e) => {
      if (e.type === 'unavailable-id') { try { p.destroy(); } catch (x) { /* ignore */ } becomeGuest(); }
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed') fail('Could not reach the matchmaking server. Try again in a moment.');
      else if (!connected) fail('Connection problem: ' + (e.type || e));
    });
    p.on('disconnected', () => { if (connected && isHost) { try { p.reconnect(); } catch (e) { /* ignore */ } } });
  }
  function becomeGuest() {
    const p = new root.Peer(undefined, { debug: 0 }); peer = p;
    p.on('open', () => {
      const c = p.connect(PREFIX + word, { reliable: true, serialization: 'json' }); hostConn = c;
      c.on('open', () => { send0({ t: 'hi', skin: api.save().skin, equip: mine().equip }); });
      c.on('data', (m) => onMsg(m, 0));
      c.on('close', lost);
      c.on('error', () => lost());
    });
    p.on('error', (e) => {
      if (e.type === 'peer-unavailable') {            // the room vanished (or the host id is still being released): try to host it ourselves
        try { p.destroy(); } catch (x) { /* ignore */ }
        if (++tries > 4) return fail('Could not join that room. Try again.');
        status('Room not ready yet… retrying'); setTimeout(tryHost, 1200);
      } else if (!connected) fail('Connection problem: ' + (e.type || e));
    });
  }
  const send0 = toHost;
  function onGuest(conn) {
    conn.on('open', () => {
      if (M.mode || conns.size >= MAX - 1) { try { conn.send({ t: 'busy', why: M.mode ? 'A game is already running in that room. Try again when it ends.' : 'That room is full (4 players).' }); } catch (e) { /* ignore */ } setTimeout(() => conn.close(), 400); return; }
      let id = 1; while (conns.has(id)) id++;
      conns.set(id, conn);
      conn.on('data', (m) => onMsg(m, id));
      conn.on('close', () => dropPlayer(id));
      conn.on('error', () => dropPlayer(id));
      conn.send({ t: 'welcome', id });
    });
  }
  function lost() {
    if (!connected && !hostConn) return;
    const wasGame = !!M.mode; const msg = busyMsg; busyMsg = '';
    if (msg && qSlot && qSlot < 10) { const keepA = arenaAuto; disconnect(); arenaAuto = keepA; qSlot++; join(qPre + qSlot, true); return; }
    disconnect();
    if (msg) { status(msg, true); return; }
    if (wasGame) api.showMenu();
    api.toast('Lost connection to the room.', 3); status('Disconnected.', true);
  }
  function dropPlayer(id) {
    if (!conns.has(id)) return;
    conns.delete(id); delete roster[id]; delete ghosts[id];
    sendRoster();
    if (M.mode) {
      M.ids = M.ids.filter((x) => x !== id);
      if (M.ids.length < 2) { declare([], 'Everyone else left the room.'); }
      else {
        if (M.it === id) M.it = M.ids[(Math.random() * M.ids.length) | 0];
        M.seekers = M.seekers.filter((x) => x !== id);
        if (M.mode === 'hide' && !M.seekers.length) declare([], 'The seeker left, so the round is over.');
        duelCheck();
      }
    }
    ui();
  }
  const mine = () => { const sv = api.save(); return { skin: sv.skin, equip: Object.assign({}, sv.equip, { _tint: sv.tint || {} }) }; };
  function sendRoster() { toAll({ t: 'roster', sel, list: Object.keys(roster).map((id) => ({ id: +id, skin: roster[id].skin, equip: roster[id].equip, ready: !!roster[id].ready })) }); ui(); }

  function onMsg(m, from) {
    switch (m.t) {
      case 'welcome': myId = m.id; isHost = false; connected = true; ui(); break;
      case 'busy': busyMsg = m.why; break;
      case 'hi': if (isHost) { roster[from] = { skin: m.skin, equip: m.equip || {}, ready: false }; sendRoster(); } break;
      case 'look': if (isHost && roster[from]) { roster[from].skin = m.skin; roster[from].equip = m.equip || {}; sendRoster(); } break;
      case 'hk': { if (isHost) { m.id = from; toAll(m, from); } const r = roster[m.id]; if (m.id !== myId && api && api.honk) api.honk(r && r.skin, r && r.equip ? r.equip.voice || null : null); break; }
      case 'ready': if (isHost && roster[from]) { roster[from].ready = !!m.v; sendRoster(); } break;
      case 'roster': for (const k of Object.keys(roster)) delete roster[k]; m.list.forEach((r) => { roster[r.id] = { skin: r.skin, equip: r.equip || {}, ready: !!r.ready }; }); if (m.sel) sel = m.sel; for (const k of Object.keys(ghosts)) if (!roster[k]) delete ghosts[k]; ui(); break;
      case 'chat': if (isHost) { m.id = from; toAll(m, from); } chatIn(m); break;
      case 'kicked': if (!isHost) { api.toast('You were kicked from the room.', 3); disconnect(); } break;
      case 'b': if (root.Battle) root.Battle.onNet(from, m.d); break;
      case 'p': if (isHost) { m.id = from; toAll(m, from); } setPose(m); break;
      case 'start': begin(m); break;
      case 'stop': if (M.mode) { stopMode(); api.showMenu(); api.toast('The host ended the game.', 3); } break;
      case 'ts': M.it = m.it; M.tIt = m.tIt; M.left = m.left; break;
      case 'hs': if (M.phase !== m.phase && m.phase === 'seek') api.toast(M.seekers.includes(myId) ? 'Ready or not — go find them!' : 'The seekers are coming!', 2.5); M.phase = m.phase; M.left = m.left; M.seekers = m.seekers; M.found = m.found; break;
      case 'found': api.toast(T('@' + m.id + ' was found!'), 2); break;
      case 'egg': if (isHost && M.mode === 'race' && !M.over) declare([from], '@' + from + ' grabbed the egg first!'); break;
      case 'end': endShow(m.winners, m.text); break;
      case 'mg': if (isHost) { M.scores[from] = m.score; duelCheck(); } break;
      case 'duelres': duelShow(m.scores); break;
      default: break;
    }
  }
  function relook() {   // I changed avatar: tell everyone, so they see and hear the new one at once
    if (!connected || !api) return;
    if (isHost) { roster[0] = Object.assign(roster[0] || {}, mine()); sendRoster(); } else toHost({ t: 'look', skin: api.save().skin, equip: mine().equip });
  }
  function honked() { if (connected) broadcast({ t: 'hk' }); }
  function setPose(m) {
    if (m.id === myId) return;
    const t = { c: m.c, n: m.n, hp: m.hp, ft: m.ft, f: m.f, fl: m.fl, ho: m.ho, a: m.a };
    const g = ghosts[m.id] || (ghosts[m.id] = { cur: JSON.parse(JSON.stringify(t)), tgt: t });
    g.tgt = t;
  }

  // ------------------------------------------------------------ arenas
  const G = 520;
  // Specialised maps. plats: [x, topY, width]; pads: [x, topY, width]; bushes: [x, y, w, h]; dip: a pond in the floor
  const MAPS = {
    tag: [
      { name: 'Goose Arena', theme: 'meadow', W: 2400, plats: [[300, 400, 200], [700, 300, 200], [1100, 380, 220], [1500, 280, 200], [1900, 400, 200], [1000, 170, 240]], pads: [[600, G, 70], [1750, G, 70]] },
      { name: 'Skyline', theme: 'night', W: 2000, plats: [[200, 420, 180], [560, 340, 180], [920, 260, 180], [1280, 340, 180], [1640, 420, 180], [760, 150, 200], [1100, 150, 200], [400, 190, 140], [1450, 190, 140], [900, 40, 200]], pads: [[100, G, 70], [950, G, 70], [1850, G, 70], [920, 260, 60]] },
      { name: 'Pond Party', theme: 'desert', W: 2600, dip: [900, 1700], plats: [[300, 400, 200], [1050, 380, 160], [1450, 380, 160], [2000, 400, 220], [1250, 250, 200], [650, 290, 160]], pads: [[550, G, 70], [2250, G, 70]] },
      { name: 'Ice Rink', theme: 'snow', W: 2200, mu: 0.12, plats: [[250, 380, 220], [900, 300, 240], [1600, 380, 220]], pads: [] },
      { name: 'Pillar Park', theme: 'candy', W: 2600, pillars: [[500, 200], [900, 260], [1300, 200], [1700, 260], [2100, 200]], plats: [[250, 400, 160], [1100, 190, 200], [1950, 400, 160]], pads: [[100, G, 70], [2400, G, 70]] },
    ],
    brawl: [
      { name: 'Colosseum', theme: 'desert', W: 2400, plats: [[300, 400, 200], [1000, 330, 400], [1900, 400, 200], [700, 210, 200], [1500, 210, 200]], pads: [[1200, G, 70]] },
      { name: 'Skybridge', theme: 'sunset', W: 2800, plats: [[250, 400, 220], [750, 320, 220], [1250, 240, 300], [1850, 320, 220], [2350, 400, 220], [1250, 120, 300]], pads: [[100, G, 70], [2600, G, 70]] },
      { name: 'Pond Pit', theme: 'meadow', W: 2600, dip: [1000, 1600], plats: [[300, 400, 200], [1100, 360, 160], [1400, 360, 160], [2200, 400, 220], [1250, 230, 200]], pads: [[600, G, 70], [2000, G, 70]] },
      { name: 'Frozen Ring', theme: 'snow', W: 2200, mu: 0.15, plats: [[250, 380, 220], [900, 290, 240], [1600, 380, 220], [1200, 170, 200]], pads: [] },
      { name: 'Lava Bridge', theme: 'lava', W: 2600, plats: [[300, 390, 160], [700, 300, 160], [1100, 220, 160], [1500, 300, 160], [1900, 390, 160], [1300, 110, 200]], pads: [[1300, G, 70]] },
      { name: 'Night Market', theme: 'night', W: 2500, plats: [[250, 400, 180], [650, 330, 180], [1050, 400, 180], [1450, 330, 180], [1850, 400, 180], [2200, 320, 180], [1250, 200, 260]], pads: [[900, G, 70], [1700, G, 70]] },
      { name: 'Broken Ruins', theme: 'desert', W: 2300, pillars: [[600, 150], [1100, 220], [1700, 150]], plats: [[250, 380, 200], [850, 300, 180], [1350, 260, 200], [1950, 380, 200]], pads: [[1150, G, 70]] },
    ],
    hide: [
      { name: 'Hide & Seek Yard', theme: 'sunset', W: 3200, plats: [[300, 400, 200], [760, 310, 200], [1250, 390, 240], [1700, 290, 200], [2150, 380, 220], [2600, 300, 200], [1350, 170, 260], [550, 190, 160]], pads: [[900, G, 70], [2300, G, 70]],
        bushes: [[520, G - 110, 150, 110], [1000, G - 110, 150, 110], [1500, G - 110, 150, 110], [1950, G - 110, 150, 110], [2450, G - 110, 150, 110], [2850, G - 110, 150, 110]] },
      { name: 'Bush Village', theme: 'meadow', W: 3400, plats: [[400, 380, 160], [900, 300, 160], [1500, 380, 200], [2100, 300, 160], [2700, 380, 160]], pads: [[1200, G, 70], [2400, G, 70]],
        bushes: [[300, G - 100, 130, 100], [650, G - 120, 150, 120], [1000, G - 100, 130, 100], [1350, G - 120, 150, 120], [1750, G - 100, 130, 100], [2050, G - 120, 150, 120], [2400, G - 100, 130, 100], [2750, G - 120, 150, 120], [3050, G - 100, 130, 100], [1600, 380 - 90, 120, 90]] },
      { name: 'Frozen Forest', theme: 'snow', W: 3000, mu: 0.35, plats: [[350, 400, 200], [900, 300, 220], [1500, 380, 200], [2100, 300, 220], [2600, 400, 200]], pads: [[1250, G, 70]],
        bushes: [[550, G - 110, 150, 110], [1100, G - 110, 150, 110], [1650, G - 110, 150, 110], [2200, G - 110, 150, 110], [2700, G - 110, 150, 110], [950, 300 - 100, 120, 100], [2150, 300 - 100, 120, 100]] },
      { name: 'Night Garden', theme: 'night', W: 3200, plats: [[300, 420, 180], [700, 330, 180], [1100, 240, 180], [1500, 330, 180], [1900, 240, 180], [2300, 330, 180], [2700, 420, 180], [1500, 130, 220]], pads: [[100, G, 70], [1400, G, 70], [3000, G, 70]],
        bushes: [[450, G - 110, 150, 110], [900, G - 110, 150, 110], [1300, G - 110, 150, 110], [1800, G - 110, 150, 110], [2200, G - 110, 150, 110], [2600, G - 110, 150, 110], [3000, G - 110, 150, 110], [1100, 240 - 90, 120, 90], [1900, 240 - 90, 120, 90]] },
    ],
  };
  function arenaLevel(kind, map, idx, n) {
    const d = (MAPS[kind][map] || MAPS[kind][0]), W = d.W;
    const pts = d.dip ? [[-120, G], [d.dip[0], G], [d.dip[0] + 60, G + 130], [d.dip[1] - 60, G + 130], [d.dip[1], G], [W + 120, G]] : [[-120, G], [W + 120, G]];
    const lv = {
      name: d.name, W, hint: '', theme: d.theme, spawn: [300 + (n > 1 ? (idx * (W - 700)) / (n - 1) : 0), G - 45], deathY: 1500,
      terrain: [{ pts, mu: d.mu }],
      solids: [[-120, -600, 120, 1500], [W, -600, 120, 1500]].concat(d.plats.map((p) => [p[0], p[1], p[2], 18]), (d.pillars || []).map((p) => [p[0], G - p[1], 60, p[1]])),
      water: d.dip ? [[d.dip[0] + 20, G + 10, d.dip[1] - d.dip[0] - 40, 200]] : [], hazards: [], pads: d.pads || [], movers: [], checkpoints: [], bread: [], egg: [-9999, -9999],
    };
    if (d.mu == null) delete lv.terrain[0].mu;
    if (d.bushes) lv.bushes = d.bushes;
    return lv;
  }

  // ------------------------------------------------------------ mode control
  function mulberry(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hostStartMode(mode, arg) {
    if (!isHost || !connected) return;
    const ids = [0].concat(Array.from(conns.keys())).sort((a, b) => a - b);
    if (ids.length < 2) return status('You need at least one friend in the room first.', true);
    if ((mode === 'tag' || mode === 'hide' || mode === 'brawl') && (arg == null || arg < 0)) arg = (Math.random() * MAPS[mode].length) | 0;
    const pickId = () => ids[(Math.random() * ids.length) | 0];
    const o = { t: 'start', mode, arg, seed: (Math.random() * 1e9) | 0, diff: api.save().diff, ids, it: mode === 'tag' ? pickId() : -1, seekers: mode === 'hide' ? [pickId()] : [] };
    Object.keys(roster).forEach((k) => { if (+k) roster[k].ready = false; });
    toAll(o); begin(o); sendRoster();
  }
  function begin(m) {
    stopMode(true);
    Object.assign(M, { mode: m.mode, arg: m.arg, seed: m.seed, ids: m.ids.slice(), over: false, tagCd: 0, tIt: {}, it: m.it, seekers: m.seekers.slice(), seeker0: m.seekers[0], found: [], scores: {}, myScore: null, diff: m.diff, phase: '', uiT: 0, dueled: false });
    M.ids.forEach((id) => { M.tIt[id] = 0; });
    $('mpMenu').classList.add('hidden'); $('mpDone').classList.add('hidden');
    api.setDiff(m.diff);
    const idx = Math.max(0, M.ids.indexOf(myId)), n = M.ids.length;
    if (m.mode === 'race') { M.countdown = 3; if (typeof m.arg === 'string') api.startCustom(root.Levels.race[+m.arg.slice(2)]); else api.startLevel(m.arg); }
    else if (m.mode === 'tag') { M.countdown = 3; M.left = 60; api.startCustom(arenaLevel('tag', m.arg | 0, idx, n)); }
    else if (m.mode === 'hide') { M.countdown = 3; M.phase = 'hide'; M.left = 15; api.startCustom(arenaLevel('hide', m.arg | 0, idx, n)); }
    else if (m.mode === 'brawl') { M.countdown = 3; const lv = arenaLevel('brawl', m.arg | 0, idx, n); api.startCustom(lv); if (root.Battle) root.Battle.startNet({ kind: 'brawl', ids: M.ids, myId, host: isHost, seed: m.seed, lv }); }
    else if (m.mode === 'coop') { M.countdown = 3; api.startCustom(arenaLevel('brawl', 0, idx, n)); if (root.Battle) root.Battle.startNet({ kind: 'coop', ids: M.ids, myId, host: isHost, seed: m.seed }); }
    else if (m.mode === 'free') { M.countdown = 0; api.startLevel(m.arg | 0); }
    else if (m.mode === 'duel') { M.countdown = 0; M.saveRandom = Math.random; Math.random = mulberry(m.seed); api.startMinigame(m.arg); }
    ui();
  }
  function stopMode(silent) {
    if ((M.mode === 'brawl' || M.mode === 'coop') && root.Battle && root.Battle.active()) root.Battle.stop();
    if (M.saveRandom) { Math.random = M.saveRandom; M.saveRandom = null; }
    if (M.mode && !silent) api.setDiff(null);
    M.mode = null; M.over = false; M.countdown = 0; M.phase = '';
    const b = $('mpBanner'); if (b) b.classList.add('hidden'); const d = $('mpDone'); if (d) d.classList.add('hidden');
  }
  // the game was left from the in-game menu: the host ends it for everybody, a guest simply leaves the room
  function leaveGame() { if (!M.mode) return; if (isHost) { toAll({ t: 'stop' }); stopMode(); } else disconnect(); }
  function declare(winners, text) {                         // host only
    if (M.over) return;
    toAll({ t: 'end', winners, text }); endShow(winners, text);
  }
  function endShow(winners, text) {
    if (!M.mode || M.over) return;
    M.over = true;
    const win = winners.includes(myId);
    if (win) api.award(20);
    $('mpDoneTitle').textContent = !winners.length ? 'Game over' : win ? 'You win! 🏆' : 'You lose 😢';
    $('mpDoneText').textContent = T(text) + (win ? '\n+20 🍞' : '');
    $('mpRematch').style.display = isHost ? '' : 'none';
    $('mpDone').classList.remove('hidden');
  }
  function duelShow(scores) {
    const ids = Object.keys(scores).map(Number).sort((a, b) => scores[b] - scores[a]);
    api.appendMgText('\nDuel results:\n' + ids.map((id, i) => (i + 1) + '. ' + nm(id) + ' — ' + scores[id]).join('\n') + (ids.length && ids[0] === myId && scores[ids[0]] !== scores[ids[1]] ? '\n🏆 You win!' : ''));
  }
  function duelCheck() {
    if (!isHost || M.mode !== 'duel' || M.dueled) return;
    if (!M.ids.every((id) => M.scores[id] != null)) return;
    M.dueled = true; toAll({ t: 'duelres', scores: M.scores }); duelShow(M.scores);
  }

  // ------------------------------------------------------------ per-frame hooks (called by game.js)
  const frozen = () => !!M.mode && (M.countdown > 0 || M.over || (M.mode === 'hide' && M.phase === 'hide' && M.seekers.includes(myId)));
  function posOf(id, goose) { if (id === myId) { const c = goose.center(); return [c.x, c.y]; } const g = ghosts[id]; return g ? g.tgt.c : null; }
  function tick(goose, dt) {
    if (!connected) return;
    M.sendT += dt;
    if (M.sendT >= 0.05 && (conns.size || hostConn)) {
      M.sendT = 0;
      const c = goose.center(), A = goose.axes(), r = (n) => Math.round(n * 10) / 10, pts = (a) => a.map((p) => [r(p.x), r(p.y)]);
      const o = { t: 'p', id: myId, c: [r(c.x), r(c.y)], n: pts(goose.neck), hp: pts(goose.hips), ft: pts(goose.feet), f: goose.facing, fl: r(goose.flapT), ho: r(goose.honkT), a: [A.ux, A.uy, A.vx, A.vy].map((v) => Math.round(v * 100) / 100) };
      broadcast(o);
    }
    if ((M.uiChat = (M.uiChat || 0) + dt) > 0.5) { M.uiChat = 0; chatShow(); }
    if (!M.mode || M.mode === 'duel') return;
    if (M.countdown > 0) { M.countdown -= dt; banner(); return; }
    if (M.over) return;
    if (M.mode === 'tag') {
      M.left -= dt; M.tagCd = Math.max(0, M.tagCd - dt);
      if (isHost) {
        M.tIt[M.it] = (M.tIt[M.it] || 0) + dt;
        const ip = posOf(M.it, goose);
        if (ip && M.tagCd <= 0) for (const id of M.ids) { if (id === M.it) continue; const p = posOf(id, goose); if (p && Math.hypot(p[0] - ip[0], p[1] - ip[1]) < 62) { M.it = id; M.tagCd = 2; break; } }
        M.uiT += dt; if (M.uiT > 0.2) { M.uiT = 0; toAll({ t: 'ts', it: M.it, tIt: M.tIt, left: M.left }); }
        if (M.left <= 0) {
          const best = Math.min.apply(null, M.ids.map((id) => M.tIt[id] || 0));
          const winners = M.ids.filter((id) => (M.tIt[id] || 0) <= best + 0.001);
          declare(winners, 'Time spent as "it" (lower wins):\n' + M.ids.map((id) => '@' + id + ': ' + (M.tIt[id] || 0).toFixed(1) + 's').join('  ·  '));
        }
      } else M.left -= 0;   // the host sends the clock
    } else if (M.mode === 'hide') {
      if (isHost) {
        M.left -= dt;
        if (M.phase === 'hide' && M.left <= 0) { M.phase = 'seek'; M.left = 75; api.toast(M.seekers.includes(myId) ? 'Ready or not — go find them!' : 'The seekers are coming!', 2.5); }
        else if (M.phase === 'seek') {
          for (const id of M.ids) {
            if (M.seekers.includes(id)) continue;
            const p = posOf(id, goose); if (!p) continue;
            if (M.seekers.some((s) => { const q = posOf(s, goose); return q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 58; })) { M.seekers.push(id); M.found.push(id); toAll({ t: 'found', id }); api.toast(T('@' + id + ' was found!'), 2); }
          }
          const hidersLeft = M.ids.filter((id) => !M.seekers.includes(id));
          if (!hidersLeft.length) declare([M.seeker0], '@' + M.seeker0 + ' found everyone with ' + Math.max(0, M.left).toFixed(0) + 's to spare!');
          else if (M.left <= 0) declare(hidersLeft, 'Time is up! Hiders who stayed hidden: ' + hidersLeft.map((id) => '@' + id).join(', '));
        }
        M.uiT += dt; if (M.uiT > 0.2) { M.uiT = 0; toAll({ t: 'hs', phase: M.phase, left: M.left, seekers: M.seekers, found: M.found }); }
      } else M.left -= dt;
    }
    banner();
  }
  function banner() {
    const b = $('mpBanner'); b.classList.remove('hidden');
    let t = '';
    if (M.countdown > 0) t = 'Get ready… ' + Math.ceil(M.countdown);
    else if (M.mode === 'race') t = '🏁 Race to the egg!';
    else if (M.mode === 'tag') t = (M.it === myId ? '🔴 YOU are IT! Tag someone' : '🟢 Run! ' + nm(M.it) + ' is IT') + ' · ' + Math.max(0, M.left).toFixed(0) + 's';
    else if ((M.mode === 'brawl' || M.mode === 'coop') && root.Battle) t = root.Battle.banner();
    else if (M.mode === 'free') t = '🌍 Free play · ' + M.ids.length + ' geese · press Enter to chat';
    else if (M.mode === 'hide') t = (M.seekers.includes(myId) ? '🔍 Seeker' : '🫣 Hider') + ' · ' + (M.phase === 'hide' ? 'hiding ' : 'seeking ') + Math.max(0, M.left).toFixed(0) + 's';
    b.textContent = t;
  }
  function onEgg() {                                    // game.js: you touched the egg in a multiplayer race
    if (M.mode !== 'race') return false;
    if (M.over || M.countdown > 0) return true;
    if (isHost) declare([myId], '@' + myId + ' grabbed the egg first!'); else toHost({ t: 'egg' });
    return true;
  }
  function onMgEnd(score) {
    if (M.mode !== 'duel') return;
    M.myScore = score;
    if (isHost) { M.scores[0] = score; duelCheck(); } else toHost({ t: 'mg', score });
  }

  // ------------------------------------------------------------ in-game chat (every platformer mode) and kicks
  const BAD = /\b(f+u+c+k+\w*|sh[i1]+t\w*|b[i1]tch\w*|cunt\w*|n[i1]gg\w*|fag\w*|slut\w*|whore\w*|dick\w*|porn\w*|sex\w*|rape\w*|nazi\w*|kys)\b/gi;
  const cleanText = (t) => String(t || '').replace(/[<>]/g, '').replace(BAD, (w) => '*'.repeat(w.length)).slice(0, 80);
  const chatLog = []; let chatLast = 0;
  const CHAT_PH = ['Hi! 👋', 'Nice one!', 'Follow me!', 'Wait for me!', 'Honk! 🦆', 'GG!', 'Help!', 'This way!'];
  function chatBox() {
    let b = $('mpChat'); if (b) return b;
    const css = document.createElement('style'); css.textContent = '#mpChat{position:fixed;left:50%;transform:translateX(-50%);bottom:84px;z-index:6;width:min(92vw,420px);font:700 13px system-ui,sans-serif;display:none;pointer-events:none}#mpChatLog div{background:rgba(0,0,0,.55);color:#fff;border-radius:10px;padding:3px 9px;margin-top:3px;transition:opacity .6s}#mpChatRow{display:none;gap:4px;margin-top:6px;pointer-events:auto;flex-wrap:wrap}#mpChatRow input{flex:1;min-width:140px;border:3px solid #2b2118;border-radius:12px;padding:6px 10px;font:700 14px system-ui}#mpChatRow button{border:2px solid #2b2118;border-radius:10px;background:#fff7d6;font:700 12px system-ui;padding:4px 8px}#mpChatBtn{position:fixed;left:12px;bottom:70px;z-index:6;width:44px;height:44px;border-radius:50%;border:3px solid #2b2118;background:#fff;font-size:20px;display:none}@media (pointer:coarse){#mpChatBtn{bottom:250px}}';
    document.head.appendChild(css);
    b = document.createElement('div'); b.id = 'mpChat'; b.innerHTML = '<div id="mpChatLog"></div><div id="mpChatRow"><input id="mpChatIn" maxlength="80" placeholder="Say something nice…" autocomplete="off"><button id="mpChatGo">Send</button>' + CHAT_PH.map((p) => '<button class="ph">' + p + '</button>').join('') + '</div>';
    document.body.appendChild(b);
    const btn = document.createElement('button'); btn.id = 'mpChatBtn'; btn.textContent = '💬'; document.body.appendChild(btn);
    const inp = $('mpChatIn');
    const go = (t) => { chatSay(t); inp.value = ''; };
    $('mpChatGo').onclick = () => go(inp.value);
    b.querySelectorAll('.ph').forEach((x) => { x.onclick = () => go(x.textContent); });
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { go(inp.value); } if (e.key === 'Escape') { $('mpChatRow').style.display = 'none'; inp.blur(); } });
    inp.addEventListener('keyup', (e) => e.stopPropagation());
    btn.onclick = () => { const r = $('mpChatRow'); r.style.display = r.style.display === 'flex' ? 'none' : 'flex'; if (r.style.display === 'flex') inp.focus(); };
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && M.mode && connected && !/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) { $('mpChatRow').style.display = 'flex'; $('mpChatIn').focus(); e.preventDefault(); } });
    return b;
  }
  function chatShow() { const b = chatBox(), on = !!(connected && M.mode && M.mode !== 'duel'); b.style.display = on ? 'block' : 'none'; $('mpChatBtn').style.display = on ? 'block' : 'none'; if (!on) $('mpChatRow').style.display = 'none'; }
  function chatIn(m) {
    const line = document.createElement('div'); const who = m.id === myId ? 'You' : (cleanText(m.n) || 'P' + (m.id + 1));
    const shown = m.id !== myId && root.Moderation ? root.Moderation.incoming(m.n, m.text, 'mp-chat') : cleanText(m.text);
    line.textContent = who + ': ' + cleanText(shown) + ' ';
    if (m.id !== myId && m.n && root.Moderation) { const fl = document.createElement('span'); fl.textContent = '⚑'; fl.title = 'Report this message'; fl.style.cssText = 'cursor:pointer;opacity:.7;pointer-events:auto'; fl.onclick = () => { root.Moderation.report(m.n, m.text, 'mp-chat', 'player', false); fl.textContent = '✓ reported'; fl.onclick = null; }; line.style.pointerEvents = 'auto'; line.appendChild(fl); }
    chatBox(); const log = $('mpChatLog'); log.appendChild(line); while (log.children.length > 6) log.firstChild.remove();
    setTimeout(() => { line.style.opacity = '0'; setTimeout(() => line.remove(), 700); }, 9000);
  }
  function chatSay(text, asName) {
    text = cleanText(text).trim(); if (!text || !connected || Date.now() - chatLast < 800) return false; chatLast = Date.now();
    const m = { t: 'chat', id: myId, n: asName || (root.Account && root.Account.name ? root.Account.name() : ''), text };
    chatIn(m); if (isHost) toAll(m); else toHost(m); return true;
  }
  function kick(id) {
    if (!isHost || !conns.has(id)) return false;
    const c = conns.get(id); try { c.send({ t: 'kicked' }); } catch (e) { /* ignore */ }
    setTimeout(() => { try { c.close(); } catch (e) { /* ignore */ } dropPlayer(id); }, 250); return true;
  }
  const inBush = (lv, x, y) => (lv.bushes || []).some((b) => x > b[0] && x < b[0] + b[2] && y > b[1] - 25 && y < b[1] + b[3] + 40);
  const lerpPts = (a, b, k) => { for (let i = 0; i < a.length && i < b.length; i++) { a[i][0] += (b[i][0] - a[i][0]) * k; a[i][1] += (b[i][1] - a[i][1]) * k; } };
  function drawWorld(ctx, lv, clock) {
    if (connected && M.mode !== 'duel') {
      const iSeek = M.seekers.includes(myId);
      for (const id of Object.keys(ghosts).map(Number)) {
        if (id === myId) continue;
        const gh = ghosts[id], g = gh.cur, t = gh.tgt, k = 0.35;
        g.c[0] += (t.c[0] - g.c[0]) * k; g.c[1] += (t.c[1] - g.c[1]) * k; lerpPts(g.n, t.n, k); lerpPts(g.hp, t.hp, k); lerpPts(g.ft, t.ft, k);
        g.f = t.f; g.fl = t.fl; g.ho = t.ho; g.a = t.a;
        if (!M.mode) continue;                                   // lobby: nobody is playing
        let show = true;
        if (M.mode === 'hide' && iSeek && !M.seekers.includes(id)) show = M.phase !== 'hide' && !inBush(lv, g.c[0], g.c[1]) && Math.hypot(g.c[0] - (api.goose().center().x), g.c[1] - (api.goose().center().y)) < 420;
        if (!show) continue;
        const o = (p) => ({ x: p[0], y: p[1] }), neck = g.n.map(o), r = roster[id] || { skin: 'goose', equip: {} };
        const fake = { key: 'p' + id, facing: g.f, flapT: g.fl, honkT: g.ho, neck, head: neck[neck.length - 1], hips: g.hp.map(o), feet: g.ft.map(o), center: () => ({ x: g.c[0], y: g.c[1] }), axes: () => ({ ux: g.a[0], uy: g.a[1], vx: g.a[2], vy: g.a[3] }) };
        ctx.save(); ctx.globalAlpha = M.mode === 'race' ? 0.8 : 1; api.drawGoose(ctx, fake, r.equip, r.skin); ctx.restore();
        ctx.save(); ctx.font = '800 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 4;
        const label = 'P' + (id + 1) + (M.mode === 'tag' && M.it === id ? ' · IT!' : M.mode === 'hide' && M.seekers.includes(id) ? ' · 🔍' : ''); const y = neck[neck.length - 1].y - 26;
        ctx.strokeText(label, neck[neck.length - 1].x, y); ctx.fillText(label, neck[neck.length - 1].x, y); ctx.restore();
      }
    }
    if (M.mode === 'tag' && M.it === myId && api.goose()) { const c = api.goose().center(); ctx.save(); ctx.strokeStyle = 'rgba(230,57,70,.9)'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(c.x, c.y, 54 + Math.sin(clock * 6) * 3, 0, 7); ctx.stroke(); ctx.restore(); }
    for (const b of lv.bushes || []) {   // bushes hide whoever is behind them
      ctx.save(); ctx.fillStyle = '#2f7d3a'; ctx.strokeStyle = '#1e4f25'; ctx.lineWidth = 4;
      const cs = [[0.2, 0.62, 0.3], [0.5, 0.42, 0.36], [0.8, 0.62, 0.3], [0.5, 0.72, 0.34]];
      for (const [fx, fy, fr] of cs) { ctx.beginPath(); ctx.arc(b[0] + b[2] * fx, b[1] + b[3] * fy, b[2] * fr * 0.62, 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#4caf50'; for (const [fx, fy] of [[0.3, 0.55], [0.55, 0.38], [0.72, 0.6]]) { ctx.beginPath(); ctx.arc(b[0] + b[2] * fx, b[1] + b[3] * fy, 9, 0, 7); ctx.fill(); }
      ctx.restore();
    }
  }
  function drawOverlay(cx, W, H) {
    if (!M.mode) return;
    const px = Math.max(1, W / window.innerWidth);
    if (M.mode === 'hide' && M.phase === 'hide' && M.seekers.includes(myId)) {
      cx.fillStyle = '#10131c'; cx.fillRect(0, 0, W, H); cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = '800 ' + 26 * px + 'px system-ui, sans-serif';
      cx.fillText('Eyes closed… the hiders are hiding', W / 2, H / 2 - 10 * px); cx.font = '800 ' + 60 * px + 'px system-ui, sans-serif'; cx.fillText(String(Math.max(0, Math.ceil(M.left))), W / 2, H / 2 + 60 * px);
    } else if (M.countdown > 0) {
      cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(0, 0, W, H); cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = '900 ' + 96 * px + 'px system-ui, sans-serif'; cx.fillText(String(Math.ceil(M.countdown)), W / 2, H / 2 + 30 * px);
    }
  }

  // ------------------------------------------------------------ UI
  const MODES = [['race', '🏁', 'Race'], ['tag', '🏃', 'Tag'], ['hide', '🫣', 'Hide & Seek'], ['duel', '⚔️', 'Minigame duel'], ['brawl', '🥊', 'Battle Arena (players + bots)'], ['coop', '🗼', 'Co-op Battle Tower'], ['free', '🌍', 'Free play (any normal level, together)']];
  function mapsFor(mode) {
    if (mode === 'race') return (root.Levels.race || []).map((l, i) => ['r:' + i, '🏁 ' + l.name]).concat(api.levels.map((l, i) => [String(i), (i + 1) + '. ' + l.name]));
    if (mode === 'free') return api.levels.map((l, i) => [String(i), (i + 1) + '. ' + l.name]);
    if (mode === 'duel') return (root.Minigames ? root.Minigames.list : []).map((m) => [m.id, m.icon + ' ' + m.name]);
    if (mode === 'coop') return [['0', '🗼 Floor 1 and up']];
    return [['-1', '🎲 Random map']].concat(MAPS[mode].map((m, i) => [String(i), m.name]));
  }
  function selLabel() {
    const mo = MODES.find((x) => x[0] === sel.mode) || MODES[0];
    const mp = mapsFor(sel.mode).find((x) => String(x[0]) === String(sel.arg));
    return mo[1] + ' ' + mo[2] + (mp ? ' — ' + mp[1] : '');
  }
  function fillMaps() {
    const el = $('mpMap'); el.innerHTML = '';
    mapsFor(sel.mode).forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; el.appendChild(o); });
    if (![...el.options].some((o) => o.value === String(sel.arg))) sel.arg = el.options[0].value;
    el.value = String(sel.arg);
  }
  function inviteUrl() { return location.origin + location.pathname + '?room=' + encodeURIComponent(word); }
  function ui() {
    if (!$('mpMenu')) return;
    $('mpJoinBox').style.display = connected ? 'none' : '';
    $('mpRoom').style.display = connected ? '' : 'none';
    if (connected) {
      const ids = Object.keys(roster).map(Number).sort((a, b) => a - b);
      $('mpRoomName').textContent = 'Room “' + word + '”';
      const SK = root.Skins ? root.Skins.BY_ID : {};
      let html = '';
      for (let i = 0; i < MAX; i++) {
        const r = roster[i];
        if (r) html += '<div class="mpSlot full c' + i + '"><div class="mpAv">🪿</div><b>P' + (i + 1) + (i === 0 ? ' 👑' : '') + (i === myId ? ' (you)' : '') + '</b><span>' + ((SK[r.skin] && SK[r.skin].name) || r.skin) + '</span><span class="rd">' + (i === 0 || r.ready ? '✅ Ready' : '⏳ Not ready') + '</span></div>';
        else html += '<div class="mpSlot"><div class="mpAv">·</div><span>Waiting for a player…</span></div>';
      }
      $('mpRoster').innerHTML = html;
      const guests = ids.filter((i) => i), allReady = guests.length > 0 && guests.every((i) => roster[i].ready);
      $('mpSel').textContent = 'Next game: ' + selLabel();
      status(ids.length + '/' + MAX + ' players' + (isHost ? (ids.length < 2 ? ' · share the invite link or word with friends' : allReady ? ' · everyone is ready!' : ' · waiting for everyone to press Ready') : ' · the host picks the game'));
      $('mpModes').style.display = isHost ? '' : 'none';
      if (isHost && arenaAuto && !M.mode) { if (ids.length >= 2) { if (!autoTm) { let n = 8; status('Arena starts in ' + n + '…'); autoTm = setInterval(() => { n--; if (!isHost || !connected || M.mode || Object.keys(roster).length < 2) { clearInterval(autoTm); autoTm = null; return; } if (n <= 0) { clearInterval(autoTm); autoTm = null; hostStartMode('brawl', -1); } else status('Arena starts in ' + n + '…'); }, 1000); } } else if (autoTm) { clearInterval(autoTm); autoTm = null; } }
      $('mpBots').style.display = isHost && arenaAuto && ids.length < 2 ? '' : 'none';
      $('mpReady').style.display = isHost ? 'none' : '';
      if (!isHost && roster[myId]) $('mpReady').textContent = roster[myId].ready ? '✅ Ready (tap to undo)' : '👍 I’m ready';
      $('mpStart').disabled = ids.length < 2;
      $('mpStart').textContent = ids.length < 2 ? 'Waiting for players…' : allReady ? '▶ Start game' : '▶ Start anyway';
      if (isHost) { document.querySelectorAll('#mpModeChips button').forEach((b) => b.classList.toggle('on', b.dataset.m === sel.mode)); }
    } else $('mpModes').style.display = 'none';
  }
  function hostSel(mode, arg) {
    if (!isHost) return;
    if (mode) { if (mode !== sel.mode) { sel = { mode, arg: null }; fillMaps(); } }
    if (arg != null) sel.arg = arg;
    sendRoster();
  }
  function build() {
    const css = document.createElement('style');
    css.textContent = '#mpBanner{position:fixed;top:56px;left:50%;transform:translateX(-50%);z-index:4;background:rgba(255,255,255,.92);border:3px solid #2b2118;border-radius:999px;padding:6px 16px;font-weight:800;pointer-events:none;white-space:nowrap}#mpBanner.hidden{display:none}#mpMenu input[type=text]{font:inherit;font-weight:700;border:3px solid #2b2118;border-radius:12px;padding:8px 12px;width:60%;text-align:center}#mpMenu select{font:inherit;font-weight:700;border:2px solid #2b2118;border-radius:10px;padding:4px 8px;max-width:100%}' +
      '#mpRoster{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.mpSlot{border:3px dashed rgba(43,33,24,.3);border-radius:14px;padding:6px;display:flex;flex-direction:column;align-items:center;gap:1px;font-size:13px;min-height:78px;justify-content:center;opacity:.6}.mpSlot.full{border-style:solid;border-color:#2b2118;opacity:1;background:#fff}.mpAv{font-size:26px;line-height:1}.mpSlot.c0 .mpAv{filter:none}.mpSlot.c1 .mpAv{filter:hue-rotate(90deg)}.mpSlot.c2 .mpAv{filter:hue-rotate(200deg)}.mpSlot.c3 .mpAv{filter:hue-rotate(290deg)}' +
      '#mpSel{font-weight:800;background:#fff;border:3px solid #2b2118;border-radius:12px;padding:6px 10px;margin:6px 0}#mpModeChips{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:6px 0}#mpModeChips button.on{background:#2b2118;color:#fff}#mpModes .row select{flex:1}#mpStart:disabled{opacity:.5}';
    document.head.appendChild(css);
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="mpBanner" class="hidden"></div>' +
      '<div class="overlay hidden" id="mpMenu"><div class="card wide" style="max-width:560px"><h2>👥 Multiplayer lobby</h2>' +
      '<div id="mpStatus" class="small">Pick a word. Everyone who types the same word joins the same room.</div>' +
      '<div id="mpJoinBox"><div class="row" style="margin:8px 0"><input type="text" id="mpWord" maxlength="32" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="room word"><button class="big small-btn" id="mpJoinBtn">Join</button></div>' +
      '<div class="row"><button class="big small-btn" id="mpQuick">🎲 Random lobby (find players)</button><button class="sec" id="mpQuickOld" style="display:none">x</button></div>' +
      '<div class="small" style="margin-top:6px">The first person to use a word hosts the room. The room disappears when the host leaves. Some networks (strict NATs, some mobile data / school Wi-Fi) block direct connections.</div></div>' +
      '<div id="mpRoom" style="display:none"><b id="mpRoomName"></b> <button class="sec" id="mpInvite">🔗 Copy invite link</button><div id="mpRoster"></div><div id="mpSel"></div>' +
      '<button class="big small-btn" id="mpReady" style="display:none">👍 I’m ready</button></div>' +
      '<div id="mpModes" style="display:none"><div id="mpModeChips"></div><div class="row"><select id="mpMap"></select></div>' +
      '<div class="row" style="margin-top:8px"><button class="sec" id="mpBots" style="display:none">🤖 Nobody yet? Play vs bots</button><button class="big small-btn" id="mpStart">▶ Start game</button></div></div>' +
      '<div class="row" style="margin-top:12px"><button class="big small-btn ghost" id="mpClose">Back</button><button class="big small-btn ghost" id="mpDisc">Leave room</button></div></div></div>' +
      '<div class="overlay clear hidden" id="mpDone"><div class="card"><h2 id="mpDoneTitle"></h2><p id="mpDoneText" style="white-space:pre-line"></p><div class="row"><button class="big small-btn" id="mpRematch">Rematch</button><button class="big small-btn ghost" id="mpLobby">Back to lobby</button></div></div></div>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
    MODES.forEach(([m, ic, t]) => { const b = document.createElement('button'); b.className = 'sec'; b.dataset.m = m; b.textContent = ic + ' ' + t; b.onclick = () => hostSel(m); $('mpModeChips').appendChild(b); });
    $('mpMap').onchange = () => hostSel(null, $('mpMap').value);
    $('mpStart').onclick = () => { const v = String(sel.arg); hostStartMode(sel.mode, sel.mode === 'race' ? (v.startsWith('r:') ? v : +v) : sel.mode === 'duel' ? v : +v); };
    $('mpReady').onclick = () => { const r = roster[myId]; if (r) { r.ready = !r.ready; toHost({ t: 'ready', v: r.ready }); ui(); } };
    $('mpQuick').onclick = () => { joinQuick(); return; };
    $('mpQuickOld').onclick = () => { const w = ['honk', 'goose', 'bread', 'pond', 'wobble', 'feather', 'noodle', 'quack'][(Math.random() * 8) | 0] + (10 + ((Math.random() * 90) | 0)); $('mpWord').value = w; join(w); };
    $('mpInvite').onclick = async () => {
      const u = inviteUrl();
      try { if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) { await navigator.share({ title: 'Wobble City', text: 'Join my goose room!', url: u }); return; } } catch (e) { /* fall through */ }
      try { await navigator.clipboard.writeText(u); api.toast('Invite link copied!', 2); } catch (e) { window.prompt('Copy this invite link:', u); }
    };
    $('mpJoinBtn').onclick = () => join($('mpWord').value);
    $('mpWord').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') join($('mpWord').value); });
    $('mpBots').onclick = () => { $('mpMenu').classList.add('hidden'); disconnect(); if (root.Battle) root.Battle.startBrawl(); };
    $('mpClose').onclick = () => $('mpMenu').classList.add('hidden');
    $('mpDisc').onclick = () => { disconnect(); status('Left the room.'); };
    $('mpRematch').onclick = () => { if (isHost) hostStartMode(M.mode, M.arg); };
    $('mpLobby').onclick = () => { $('mpDone').classList.add('hidden'); if (isHost) { toAll({ t: 'stop' }); } stopMode(); api.showMenu(); open(); };
    ui();
  }
  function open() {
    fillMaps();
    try { const w = localStorage.getItem('wobble.lastRoom'); if (w && !$('mpWord').value) $('mpWord').value = w; } catch (e) { /* ignore */ }
    ui(); $('mpMenu').classList.remove('hidden');
  }
  function init(a) {
    api = a; build();
    try {
      const r = new URLSearchParams(location.search).get('room');
      if (r) setTimeout(() => { open(); $('mpWord').value = r; join(r); }, 600);
    } catch (e) { /* ignore */ }
  }

  const peersList = () => Object.keys(ghosts).map(Number).filter((id) => id !== myId && M.ids.includes(id)).map((id) => { const t = ghosts[id].cur || ghosts[id].tgt, n = t.n || []; return { id, c: t.c, hd: n.length ? n[n.length - 1] : t.c, f: t.f }; });
  root.MP = { relook, honked, chatSay, kick, isHost: () => isHost, others: () => Object.keys(roster).map(Number).filter((i) => i !== myId), bsend: (d) => { if (isHost) { if (root.Battle) root.Battle.onNet(0, d); } else toHost({ t: 'b', d }); }, ball: (d) => { if (isHost) toAll({ t: 'b', d }); },
              bto: (id, d) => { if (!isHost) return; if (id === 0) { if (root.Battle) root.Battle.onNet(0, d); } else { const c = conns.get(id); if (c && c.open) { try { c.send({ t: 'b', d }); } catch (e) { /* ignore */ } } } },
              peers: peersList, finish: (w, t) => { if (isHost) declare(w, t); }, arenaLevel, myId: () => myId, init, open, active: () => !!M.mode, connected: () => connected, frozen, tick, drawWorld, drawOverlay, onEgg, onMgEnd, stopMode: leaveGame,
              _join: join, arenaQuick, _start: hostStartMode, _maps: MAPS, _state: M, _me: () => myId, _roster: roster };
})(window);
