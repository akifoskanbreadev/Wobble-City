/*
 * Spin the Bottle (goose edition): a friendly party game for 3 to 8 geese, solo with bots or online (Room, host runs the rules).
 * The bottle spins and points at a goose. They pick Truth or Dare (all silly and clean), answer, and the others vote 👍 / 👎.
 * A 👍 majority earns a point; skipping earns a 🐔. Everyone spins in turn. Most points wins.
 *   Bottle.init({ save, award })   Bottle.open()   Bottle.close()
 */
(function (root) {
  'use strict';
  let opts = null, dom = null, G = null, room = null, raf = 0, last = 0, isOpen = false, actx = null, lastKey = '';
  const $ = (id) => document.getElementById(id);
  const rnd = (a) => a[(Math.random() * a.length) | 0];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NAMES = ['Honky', 'Waddle', 'Biscuit', 'Quackers', 'Pebble', 'Noodle', 'Gus', 'Mabel', 'Pip', 'Dumpling', 'Toast', 'Sprout'];
  const TRUTHS = [
    'What is the silliest thing you have ever done?', 'What is your favourite kind of bread, and why?', 'If you were a different animal, which one and why?',
    'What is the funniest thing you have seen in a game?', 'What would you do with a million bread?', 'What is your most useless talent?',
    'Which goose here would be the best pirate captain?', 'What is the weirdest food you have ever tried?', 'What is your best joke? (go on!)',
    'What superpower would you pick for a day?', 'Which game level is your favourite and why?', 'What is the worst haircut a goose could have?',
    'What would your goose be called if it had a fancy title?', 'What is the most embarrassing thing you have said in a game chat?',
    'If you could live anywhere, where would it be?', 'What is a tiny thing that makes your day better?', 'What would your theme song be?',
    'What is the best snack of all time?', 'Which wobbly-neck moment made you laugh most?', 'What would you invent to help geese?',
  ];
  const DARES = [
    'Describe your day using only emoji.', 'Write a two-line poem about bread.', 'Give a speech about why geese should rule the world (one sentence).',
    'Invent a new honk and describe it.', 'Type your best goose impression.', 'Compliment every other goose here in one message.',
    'Make up a new dance move and name it.', 'Tell a joke. The others judge!', 'Write a very dramatic weather forecast for Wobble City.',
    'Describe a goose in three words that rhyme.', 'Pitch a new game mode in one sentence.', 'Write a fortune cookie message for the goose on your left.',
    'Give your goose a new secret agent name.', 'Say the alphabet backwards (type as far as you can!).', 'Describe your perfect pond party.',
    'Make up a goose motto in five words.', 'Name five types of bread in ten seconds (type fast!).', 'Write a one-line review of the last level you played.',
    'Come up with a superhero name for the goose across the circle.', 'Act like a news reporter: breaking news about a missing loaf!',
  ];
  const BOT_SAY = ['Honk honk! 🪿', 'Bread. Always bread. 🍞', 'I plead the goose-fifth!', 'Quack... I mean HONK.', 'Once chased a butterfly for three hours.', '🌊🪿🍞✨', 'That is a secret between me and the pond.', 'Ten out of ten, would honk again.'];

  const CSS = `
  #sbt{position:fixed;inset:0;z-index:72;background:#2a1b3d;display:none;font-family:system-ui,sans-serif;color:#fff;touch-action:manipulation;user-select:none;-webkit-user-select:none}
  #sbt canvas{position:absolute;inset:0;width:100%;height:100%}
  #sbt .panel{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(15,10,30,.85);overflow:auto;padding:14px;z-index:3}
  #sbt .card{background:#fff;color:#1b1f33;border-radius:20px;padding:16px 18px;max-width:520px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.4);max-height:100%;overflow:auto}
  #sbt h2{margin:0 0 4px;font-size:24px}#sbt .sub{opacity:.7;font-size:14px;margin-bottom:8px}
  #sbt .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}
  #sbt .chip{border:3px solid #dfe3f1;border-radius:999px;padding:4px 12px;font-weight:700;cursor:pointer;background:#f7f8fd;font-size:14px}
  #sbt .chip.on{background:#ffd23f;border-color:#1b1b1b}
  #sbt button.go{font:800 16px system-ui;padding:10px 16px;border-radius:14px;border:3px solid #1b1b1b;background:#ffd23f;color:#1b1b1b;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.35)}
  #sbt button.go.alt{background:#fff}#sbt button.go.red{background:#ff7a7a}#sbt button.go.grn{background:#7be08a}
  #sbt #sbtop{position:absolute;left:0;right:0;top:max(8px,env(safe-area-inset-top));text-align:center;font:800 18px system-ui;text-shadow:0 2px 0 #000;pointer-events:none;z-index:2}
  #sbt #sbquit{position:absolute;right:max(10px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));width:44px;height:44px;border-radius:12px;border:3px solid #fff;background:rgba(30,30,40,.55);color:#fff;font-size:20px;z-index:4;cursor:pointer}
  #sbt #sbcard{position:absolute;left:50%;transform:translateX(-50%);bottom:max(12px,env(safe-area-inset-bottom));width:min(560px,94vw);background:rgba(255,255,255,.96);color:#1b1f33;border:3px solid #1b1b1b;border-radius:18px;padding:12px 14px;z-index:2;text-align:center;font-weight:700;box-shadow:0 6px 0 rgba(0,0,0,.35)}
  #sbt #sbcard .bt{font-size:20px;font-weight:900;margin:2px 0 6px}#sbt #sbcard .q{font-size:19px;margin:6px 0;line-height:1.25}#sbt #sbcard .ans{background:#fff4c9;border-radius:10px;padding:6px 10px;margin:6px 0;font-weight:700}
  #sbt #sbcard input{width:92%;font-size:16px;padding:9px 10px;border-radius:10px;border:3px solid #dfe3f1;margin:4px 0}
  #sbt #sbcard .row{justify-content:center;margin:6px 0 2px}`;

  // ------------------------------------------------------------------ sound
  function tone(f, d, t, v) { try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; if (!actx) actx = new AC(); const o = actx.createOscillator(), g = actx.createGain(); o.type = t || 'triangle'; o.frequency.value = f; g.gain.value = v || 0.05; o.connect(g); g.connect(actx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (d || 0.15)); o.stop(actx.currentTime + (d || 0.15) + 0.02); } catch (e) { /* ignore */ } }

  // ------------------------------------------------------------------ game state (the host owns it; guests mirror it from snapshots)
  const myLook = () => { try { return root.GooseArt ? root.GooseArt.myLook() : null; } catch (e) { return null; } };
  const cleanLook = (l) => { try { return root.GooseArt ? root.GooseArt.clean(l) : null; } catch (e) { return null; } };
  const randLook = () => { try { return root.GooseArt ? root.GooseArt.randomLook() : null; } catch (e) { return null; } };
  const myName = () => (root.Account && root.Account.name && root.Account.name()) || 'You';
  const clean = (t, n) => { t = String(t || '').replace(/[<>]/g, '').slice(0, n || 90); try { if (root.Moderation) t = root.Moderation.scan(t).clean; } catch (e) { /* ignore */ } return t; };

  function newGame(o) {
    const hum = o.humans || null, n = Math.max(3, Math.min(8, Math.max(o.n || 5, hum ? hum.length : 1)));
    const names = NAMES.slice().sort(() => Math.random() - 0.5), P = [];
    for (let i = 0; i < n; i++) {
      const h = hum && hum[i];
      P.push({ id: i, name: h ? h.name : i === 0 && !hum ? myName() : names[i], look: h ? (h.net === 0 ? myLook() : cleanLook(h.look)) : i === 0 ? myLook() : randLook(), bot: !h && !(i === 0 && !hum), net: h ? h.net : (i === 0 && !hum ? 0 : -1), pts: 0, chick: 0 });
    }
    G = { online: !!hum, host: true, me: 0, players: P, turn: (Math.random() * n) | 0, round: 1, rounds: n * 2, stage: 'idle', stT: 0, target: -1, a: 0, a1: 0, dur: 3.4, seq: 0, kind: '', prompt: '', ans: '', skipped: false, votes: {}, vd: {}, msg: '', t: 0 };
    lastKey = '';
  }
  const pub = () => ({ stage: G.stage, turn: G.turn, round: G.round, rounds: G.rounds, target: G.target, a1: G.a1, dur: G.dur, seq: G.seq, kind: G.kind, prompt: G.prompt, ans: G.ans, skipped: G.skipped, votes: G.votes, msg: G.msg, pts: G.players.map((p) => p.pts), chick: G.players.map((p) => p.chick), bots: G.players.map((p) => (p.bot ? 1 : 0)) });
  function snap() { if (G.online && room) room.toAll({ k: 'st', s: pub() }); lastKey = ''; }
  function apply(s) {       // guest: take the host's snapshot
    const was = G.seq; G.stage = s.stage; G.turn = s.turn; G.round = s.round; G.rounds = s.rounds; G.target = s.target; G.a1 = s.a1; G.dur = s.dur; G.kind = s.kind; G.prompt = s.prompt; G.ans = s.ans; G.skipped = s.skipped; G.votes = s.votes || {}; G.msg = s.msg;
    s.pts.forEach((v, i) => { if (G.players[i]) { G.players[i].pts = v; G.players[i].chick = s.chick[i]; G.players[i].bot = !!s.bots[i]; } });
    if (s.seq !== was) { G.seq = s.seq; G.spinFrom = G.a; G.spinT = 0; }
    G.stT = 0; lastKey = '';
  }

  // ------------------------------------------------------------------ the rules (host / solo)
  function doSpin() {
    if (G.stage !== 'idle') return;
    const n = G.players.length; let t; do { t = (Math.random() * n) | 0; } while (t === G.turn);
    const th = -Math.PI / 2 + (2 * Math.PI * t) / n, cur = ((G.a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let a1 = th + 2 * Math.PI * (4 + ((Math.random() * 3) | 0)) + (Math.random() - 0.5) * (Math.PI / n) * 0.7; a1 += Math.ceil((G.a - a1) / (2 * Math.PI)) * 2 * Math.PI;
    G.target = t; G.a1 = a1; G.seq++; G.spinFrom = G.a; G.spinT = 0; G.dur = 3.4; G.stage = 'spin'; G.stT = 0; G.kind = ''; G.prompt = ''; G.ans = ''; G.skipped = false; G.votes = {}; G.msg = '';
    tone(300, 0.2, 'sawtooth', 0.04); snap(); void cur;
  }
  function doPick(kind) {
    if (G.stage !== 'pick') return;
    G.kind = kind === 'dare' ? 'dare' : 'truth'; G.prompt = rnd(G.kind === 'dare' ? DARES : TRUTHS); G.stage = 'task'; G.stT = 0; tone(660, 0.12); snap();
  }
  function doDone(text, skip) {
    if (G.stage !== 'task') return;
    G.skipped = !!skip; G.ans = skip ? '' : clean(text, 90);
    if (skip) { G.players[G.target].chick++; G.msg = '🐔 ' + G.players[G.target].name + ' chickened out!'; G.stage = 'result'; G.stT = 0; tone(200, 0.3, 'sawtooth', 0.05); }
    else { G.stage = 'vote'; G.stT = 0; G.votes = {}; G.vd = {}; G.players.forEach((p, i) => { if (p.bot && i !== G.target) G.vd[i] = 1 + Math.random() * 3.5; }); tone(740, 0.12); }
    snap();
  }
  function doVote(i, v) {
    if (G.stage !== 'vote' || i === G.target || G.votes[i] != null || !G.players[i]) return;
    G.votes[i] = v ? 1 : 0; lastKey = '';
    const need = G.players.filter((p, k) => k !== G.target).length;
    if (Object.keys(G.votes).length >= need) tally(); else snap();
  }
  function tally() {
    const up = Object.values(G.votes).filter((v) => v === 1).length, dn = Object.values(G.votes).filter((v) => v === 0).length, t = G.players[G.target];
    if (up >= dn && up + dn > 0) { t.pts++; G.msg = '👍 ' + up + ' – ' + dn + ' 👎  ' + t.name + ' scores a point!'; tone(880, 0.2); tone(1100, 0.25); } else { G.msg = '👎 ' + up + ' – ' + dn + ' 👎  No point this time.'; tone(220, 0.3, 'sawtooth', 0.04); }
    G.stage = 'result'; G.stT = 0; snap();
  }
  function nextTurn() {
    G.round++;
    if (G.round > G.rounds) { G.stage = 'over'; G.stT = 0; snap(); finish(); return; }
    G.turn = (G.turn + 1) % G.players.length; G.stage = 'idle'; G.stT = 0; G.target = -1; G.msg = ''; snap();
  }
  function finish() {
    if (!opts || !opts.award) return; const me = G.players[G.me]; if (!me) return; const best = Math.max(...G.players.map((p) => p.pts));
    opts.award(me.pts === best && best > 0 ? 25 : 8);
  }
  function hostTick(dt) {
    const g = G; g.stT += dt; const sp = g.players[g.turn], t = g.players[g.target];
    if (g.stage === 'idle') { if (sp.bot && g.stT > 1.3) doSpin(); }
    else if (g.stage === 'spin') { if (g.stT >= g.dur) { g.stage = 'pick'; g.stT = 0; tone(520, 0.15); snap(); } }
    else if (g.stage === 'pick') { if (t.bot && g.stT > 1.4) doPick(Math.random() < 0.5 ? 'truth' : 'dare'); else if (g.stT > 30) doPick('truth'); }
    else if (g.stage === 'task') { if (t.bot && g.stT > 2.6) doDone(Math.random() < 0.88 ? rnd(BOT_SAY) : '', Math.random() >= 0.88); else if (g.stT > 70) doDone('', true); }
    else if (g.stage === 'vote') {
      for (const k of Object.keys(g.vd)) if (g.stT > g.vd[k] && g.votes[k] == null) { delete g.vd[k]; doVote(+k, Math.random() < 0.72); if (g.stage !== 'vote') return; }
      if (g.stT > 14) tally();
    } else if (g.stage === 'result') { if (g.stT > 2.4) nextTurn(); }
  }

  // ------------------------------------------------------------------ network (guests send intentions, the host decides)
  const PREFIX = 'wobble-bottle-v1-', osel = { n: 5 };
  const status = (t, bad) => { const e = $('sbstat'); if (e) { e.textContent = t; e.style.color = bad ? '#c62835' : ''; } };
  function setupRoom() {
    if (room || !root.Room) return;
    room = root.Room.create({
      prefix: PREFIX, max: 8, hello: () => ({ name: myName() === 'You' ? 'Goose' + (100 + ((Math.random() * 900) | 0)) : myName(), look: myLook() }),
      onRoster: renderRoster, onMsg: onNet, onStatus: status,
      onDrop: (id) => { if (!G || !G.online || !G.host) return; const p = G.players.find((q) => q.net === id); if (p) { p.bot = true; p.net = -1; snap(); } },
      onLost: (why) => { if (G && G.online) { G = null; showPanel('lobby'); } renderRoster([]); status(why, true); },
      canJoin: () => (G && G.online ? 'A game is already running in that room.' : null),
    });
  }
  function renderRoster(list) {
    if (!dom) return; const box = $('sbroster'); box.innerHTML = '';
    const host = room && room.isHost();
    (list || []).forEach((e) => { const s = document.createElement('span'); s.className = 'chip'; s.textContent = (e.id === 0 ? '👑 ' : '🪿 ') + (e.name || 'Goose') + (room && e.id === room.id() ? ' (you)' : ''); box.appendChild(s); });
    $('sbonl').style.display = list && list.length ? '' : 'none'; $('sbstartonl').style.display = host ? '' : 'none';
    $('sbwait').textContent = !list || !list.length ? '' : host ? (list.length < 2 ? 'Waiting for friends… (or start now: bots fill the circle)' : 'Ready when you are! Bots fill empty places.') : 'Waiting for the host to start…';
  }
  function startOnline() {
    if (!room || !room.isHost() || (G && G.online)) return;
    const hum = room.list().map((e) => ({ net: e.id, name: clean(e.name || 'Goose', 14) || 'Goose', look: e.look }));
    newGame({ humans: hum, n: Math.max(osel.n, hum.length) });
    G.players.forEach((p, i) => { if (p.net > 0) room.toOne(p.net, { k: 'start', i, ps: G.players.map((q) => ({ name: q.name, look: q.look })), s: pub() }); });
    showPanel(null); begin();
  }
  function onNet(from, m) {
    if (!m || !m.k) return;
    if (m.k === 'start' && !(room && room.isHost())) {
      G = { online: true, host: false, me: m.i, players: m.ps.map((p, i) => ({ id: i, name: clean(p.name, 14), look: cleanLook(p.look), bot: false, net: -1, pts: 0, chick: 0 })), turn: 0, round: 1, rounds: 10, stage: 'idle', stT: 0, target: -1, a: 0, a1: 0, dur: 3.4, seq: 0, votes: {}, vd: {}, msg: '' };
      apply(m.s); showPanel(null); begin(); return;
    }
    if (m.k === 'st' && G && !G.host) { apply(m.s); return; }
    if (!G || !G.host) return;
    const idx = G.players.findIndex((p) => p.net === from); if (idx < 0) return;
    if (m.k === 'spin' && G.stage === 'idle' && idx === G.turn) doSpin();
    else if (m.k === 'pick' && G.stage === 'pick' && idx === G.target) doPick(m.c);
    else if (m.k === 'done' && G.stage === 'task' && idx === G.target) doDone(m.text, !!m.skip);
    else if (m.k === 'vote') doVote(idx, !!m.v);
    else if (m.k === 'again' && G.stage === 'over') { /* host decides */ }
  }
  // what the local player does: the host applies it directly, a guest asks the host
  const act = {
    spin() { if (G.host) { if (G.turn === G.me) doSpin(); } else room.send({ k: 'spin' }); },
    pick(c) { if (G.host) { if (G.target === G.me) doPick(c); } else room.send({ k: 'pick', c }); },
    done(text, skip) { if (G.host) { if (G.target === G.me) doDone(text, skip); } else room.send({ k: 'done', text, skip }); },
    vote(v) { if (G.host) doVote(G.me, v); else { G.votes[G.me] = v ? 1 : 0; lastKey = ''; room.send({ k: 'vote', v: v ? 1 : 0 }); } },
  };

  // ------------------------------------------------------------------ drawing
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  function bottle(c, x, y, a, s) {
    c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s); c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = '#0d2e1a';
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(4, 6, 62, 18, 0, 0, 7); c.fill();
    c.fillStyle = '#3fbf6a'; c.beginPath(); c.moveTo(-50, -15); c.lineTo(14, -15); c.quadraticCurveTo(26, -15, 32, -6); c.lineTo(58, -5); c.lineTo(58, 5); c.lineTo(32, 6); c.quadraticCurveTo(26, 15, 14, 15); c.lineTo(-50, 15); c.quadraticCurveTo(-58, 15, -58, 8); c.lineTo(-58, -8); c.quadraticCurveTo(-58, -15, -50, -15); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-44, -10, 50, 4); c.fillStyle = '#e8d29a'; c.fillRect(-22, -15, 26, 30); c.strokeRect(-22, -15, 26, 30);
    c.fillStyle = '#c9972b'; c.fillRect(54, -6, 8, 12); c.strokeRect(54, -6, 8, 12);
    c.restore();
  }
  function draw() {
    const cv = dom.cv, dpr = Math.min(2, root.devicePixelRatio || 1), w = Math.max(2, Math.floor(cv.clientWidth * dpr)), h = Math.max(2, Math.floor(cv.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0);
    const bg = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7); bg.addColorStop(0, '#6b3f93'); bg.addColorStop(1, '#241338'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
    if (!G) return;
    const cx = w / 2, cy = h * 0.41, R = Math.min(w * 0.32, h * 0.22), n = G.players.length, gw = Math.max(26 * dpr, Math.min(54 * dpr, R * 0.36));
    c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.arc(cx, cy, R * 0.95, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 3 * dpr; c.stroke();
    // bottle angle (spin animation on every device, finishing on the host's chosen angle)
    if (G.stage === 'spin') { G.spinT = (G.spinT || 0); G.a = (G.spinFrom || 0) + (G.a1 - (G.spinFrom || 0)) * ease(G.spinT / G.dur); }
    else if (G.stage !== 'idle' || G.a === 0) { if (G.stage !== 'idle') G.a = G.a1; }
    if (G.stage === 'idle' && G.a1 && Math.abs(G.a - G.a1) > 0.001) G.a = G.a1;
    const t = G.time || 0;
    G.players.forEach((p, i) => {
      const th = -Math.PI / 2 + (2 * Math.PI * i) / n, px = cx + Math.cos(th) * R, py = cy + Math.sin(th) * R + gw * 0.6;
      const isSp = i === G.turn && G.stage !== 'over', isT = i === G.target && ['pick', 'task', 'vote', 'result'].includes(G.stage);
      if (isSp || isT) { c.fillStyle = isT ? 'rgba(255,90,90,' + (0.35 + 0.2 * Math.sin(t * 6)) + ')' : 'rgba(255,214,60,.3)'; c.beginPath(); c.ellipse(px, py, gw * 0.9, gw * 0.35, 0, 0, 7); c.fill(); }
      let ok = false;
      if (root.GooseArt && p.look) { try { root.GooseArt.draw(c, px, py, p.look, { w: gw * 0.62, face: Math.cos(th) > 0.2 ? -1 : 1, t, moving: isT && G.stage === 'result' && !G.skipped }); ok = true; } catch (e) { ok = false; } }
      if (!ok) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(px, py - gw * 0.3, gw * 0.4, gw * 0.3, 0, 0, 7); c.fill(); }
      c.font = '800 ' + Math.round(13 * dpr) + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 3 * dpr; c.strokeStyle = '#000'; c.fillStyle = i === G.me ? '#ffe27a' : '#fff';
      const lab = p.name + (i === G.me ? ' (you)' : ''); c.strokeText(lab, px, py + 16 * dpr); c.fillText(lab, px, py + 16 * dpr);
      c.font = '700 ' + Math.round(12 * dpr) + 'px system-ui'; const sc = '🍞 ' + p.pts + (p.chick ? '  🐔 ' + p.chick : ''); c.strokeText(sc, px, py + 30 * dpr); c.fillText(sc, px, py + 30 * dpr);
      if (isSp) { c.font = Math.round(16 * dpr) + 'px system-ui'; c.fillText('🍾', px + gw * 0.55, py - gw * 0.9); }
    });
    bottle(c, cx, cy, G.a, Math.max(0.5, R / 150) * dpr * 0.9 * (dpr > 1 ? 1 : 1));
    c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 5 * dpr, 0, 7); c.fill();
  }

  // ------------------------------------------------------------------ UI cards
  function card() {
    if (!G) return; const me = G.me, sp = G.players[G.turn], tg = G.players[G.target], key = [G.stage, G.turn, G.round, G.target, G.votes[me], G.kind, G.skipped, G.msg].join('|');
    $('sbtop').textContent = G.stage === 'over' ? '🏁 Game over!' : 'Round ' + Math.min(G.round, G.rounds) + ' / ' + G.rounds + ' · 🍾 ' + sp.name + '\'s spin';
    if (key === lastKey) return; lastKey = key;
    const c = $('sbcard'); let h = '';
    const bind = [];
    if (G.stage === 'idle') {
      if (G.turn === me) { h = '<div class="bt">Your turn!</div><div class="row"><button class="go" id="sbspin">🍾 SPIN THE BOTTLE</button></div>'; bind.push(['sbspin', () => act.spin()]); }
      else h = '<div class="bt">Waiting for ' + esc(sp.name) + ' to spin…</div>';
    } else if (G.stage === 'spin') h = '<div class="bt">🍾 Spinning…</div>';
    else if (G.stage === 'pick') {
      if (G.target === me) { h = '<div class="bt">It landed on YOU!</div><div class="row"><button class="go" id="sbtr">🤔 Truth</button><button class="go red" id="sbda">😈 Dare</button></div>'; bind.push(['sbtr', () => act.pick('truth')], ['sbda', () => act.pick('dare')]); }
      else h = '<div class="bt">It landed on ' + esc(tg.name) + '!</div><div>Choosing Truth or Dare…</div>';
    } else if (G.stage === 'task') {
      const head = (G.kind === 'dare' ? '😈 DARE' : '🤔 TRUTH') + ' for ' + esc(tg.name);
      if (G.target === me) { h = '<div class="bt">' + head + '</div><div class="q">' + esc(G.prompt) + '</div><input id="sbans" maxlength="90" placeholder="Type your answer…" autocomplete="off"><div class="row"><button class="go grn" id="sbdone">✅ Done!</button><button class="go alt" id="sbskip">🐔 Skip</button></div>'; bind.push(['sbdone', () => act.done($('sbans').value, false)], ['sbskip', () => act.done('', true)]); }
      else h = '<div class="bt">' + head + '</div><div class="q">' + esc(G.prompt) + '</div><div>' + esc(tg.name) + ' is on it…</div>';
    } else if (G.stage === 'vote') {
      const head = (G.kind === 'dare' ? '😈 ' : '🤔 ') + esc(G.prompt);
      h = '<div class="q">' + head + '</div><div class="ans">' + esc(tg.name) + ': ' + (G.ans ? esc(G.ans) : '✅ Did it!') + '</div>';
      if (G.target === me) h += '<div>The others are voting…</div>';
      else if (G.votes[me] != null) h += '<div>You voted ' + (G.votes[me] ? '👍' : '👎') + '. Waiting for the others…</div>';
      else { h += '<div class="row"><button class="go grn" id="sbup">👍 Nice!</button><button class="go red" id="sbdn">👎 Meh</button></div>'; bind.push(['sbup', () => act.vote(1)], ['sbdn', () => act.vote(0)]); }
    } else if (G.stage === 'result') h = '<div class="bt">' + esc(G.msg) + '</div>';
    else if (G.stage === 'over') {
      const order = G.players.map((p, i) => ({ p, i })).sort((a, b) => b.p.pts - a.p.pts); const best = order[0].p.pts;
      h = '<div class="bt">🏆 ' + (order.filter((o) => o.p.pts === best).map((o) => esc(o.p.name)).join(' & ')) + ' win' + (order.filter((o) => o.p.pts === best).length > 1 ? '' : 's') + '!</div>' + order.map((o) => '<div>' + esc(o.p.name) + ' — 🍞 ' + o.p.pts + (o.p.chick ? ' · 🐔 ' + o.p.chick : '') + '</div>').join('');
      h += '<div class="row">' + (G.host ? '<button class="go" id="sbagain">▶ Play again</button>' : '') + '<button class="go alt" id="sbmenu">Menu</button></div>';
      bind.push(['sbagain', () => again()], ['sbmenu', () => close()]);
    }
    c.innerHTML = h; for (const [id, fn] of bind) { const b = $(id); if (b) b.addEventListener('click', fn); }
    const ia = $('sbans'); if (ia) { ia.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('sbdone').click(); }); ia.addEventListener('keyup', (e) => e.stopPropagation()); setTimeout(() => ia.focus(), 50); }
  }
  function again() {
    if (!G || !G.host) return;
    if (G.online && room && room.isHost()) { const hum = G.players.filter((p) => p.net >= 0).map((p) => ({ net: p.net, name: p.name, look: p.look })); const n = G.players.length; newGame({ humans: hum, n });
      G.players.forEach((p, i) => { if (p.net > 0) room.toOne(p.net, { k: 'start', i, ps: G.players.map((q) => ({ name: q.name, look: q.look })), s: pub() }); }); begin(); }
    else { const n = G.players.length; newGame({ n }); begin(); }
  }

  // ------------------------------------------------------------------ shell
  function showPanel(id) { if (!dom) return; dom.lobby.style.display = id === 'lobby' ? 'flex' : 'none'; dom.cv.style.display = id === 'lobby' ? 'none' : ''; $('sbcard').style.display = id === 'lobby' ? 'none' : ''; $('sbtop').style.display = id === 'lobby' ? 'none' : ''; }
  function begin() { last = performance.now(); lastKey = ''; if (!raf) raf = requestAnimationFrame(frame); }
  function step(dt) {
    if (!G) return; G.time = (G.time || 0) + dt;
    if (G.stage === 'spin') G.spinT = (G.spinT || 0) + dt;
    if (G.host) hostTick(dt); else G.stT += dt;
    if (!G.host && G.stage === 'spin' && G.spinT > G.dur + 0.1) { /* the host will move us on */ }
  }
  function frame(now) {
    if (!isOpen) { raf = 0; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt); try { draw(); card(); } catch (e) { /* keep running */ }
    raf = requestAnimationFrame(frame);
  }
  function ensureDom() {
    if (dom) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'sbt';
    d.innerHTML = `<canvas id="sbcv"></canvas><div id="sbtop"></div><button id="sbquit" title="Leave">☰</button><div id="sbcard"></div>
      <div class="panel" id="sblobby"><div class="card"><h2>🍾 Spin the Bottle</h2><div class="sub">Spin, land on a goose, Truth or Dare (silly and clean!), then the others vote. Most 🍞 wins.</div>
        <div class="row"><b>Geese</b><span class="chip" data-n="4">4</span><span class="chip on" data-n="5">5</span><span class="chip" data-n="6">6</span><span class="chip" data-n="8">8</span><span style="font-size:12px;opacity:.7">(bots fill the circle)</span></div>
        <div class="row"><button class="go" id="sbstart">▶ Play with bots</button><button class="go alt" id="sbback">Back</button></div>
        <h4 style="margin:10px 0 2px">👥 Online with friends</h4>
        <div class="row"><input id="sbword" maxlength="24" placeholder="room word (same for everyone)" style="font-size:16px;padding:9px 12px;border-radius:10px;border:3px solid #dfe3f1;width:210px"><button class="go" id="sbjoin">Join / create</button><button class="go alt" id="sbquick">🎲 Random lobby</button></div>
        <div id="sbonl" style="display:none"><div class="row" id="sbroster"></div><div id="sbwait" class="sub"></div><div class="row"><button class="go" id="sbstartonl">▶ Start online game</button><button class="go alt" id="sbleave">Leave room</button></div></div>
        <div id="sbstat" style="font-size:13px;min-height:16px"></div></div></div>`;
    document.body.appendChild(d);
    dom = { root: d, cv: $('sbcv'), lobby: $('sblobby') };
    d.querySelectorAll('[data-n]').forEach((c) => c.addEventListener('click', () => { d.querySelectorAll('[data-n]').forEach((x) => x.classList.remove('on')); c.classList.add('on'); osel.n = +c.dataset.n; }));
    $('sbstart').addEventListener('click', () => { if (room) room.leave(); newGame({ n: osel.n }); showPanel(null); begin(); });
    $('sbback').addEventListener('click', () => close());
    $('sbquit').addEventListener('click', () => { if (G) { if (room) room.leave(); G = null; showPanel('lobby'); renderRoster([]); } else close(); });
    $('sbjoin').addEventListener('click', () => { setupRoom(); try { localStorage.setItem('wobbleBottleWord', $('sbword').value); } catch (e) { /* ignore */ } if (room) room.join($('sbword').value); else status('Online play is not available (could not load the matchmaking library).', true); });
    $('sbquick').addEventListener('click', () => { setupRoom(); if (room) room.quick('bottle'); else status('Online play is not available.', true); });
    $('sbword').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('sbjoin').click(); }); $('sbword').addEventListener('keyup', (e) => e.stopPropagation());
    $('sbstartonl').addEventListener('click', startOnline); $('sbleave').addEventListener('click', () => { if (room) room.leave(); renderRoster([]); status(''); });
    try { const w = localStorage.getItem('wobbleBottleWord'); if (w) $('sbword').value = w; } catch (e) { /* ignore */ }
    window.addEventListener('keydown', (e) => { if (isOpen && G && e.code === 'Space' && G.stage === 'idle' && G.turn === G.me && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) { e.preventDefault(); act.spin(); } });
  }
  function open() { ensureDom(); setupRoom(); isOpen = true; dom.root.style.display = 'block'; G = null; showPanel('lobby'); renderRoster(room ? room.list() : []); begin(); }
  function close() { if (room) room.leave(); isOpen = false; if (raf) cancelAnimationFrame(raf); raf = 0; G = null; if (dom) dom.root.style.display = 'none'; }
  function init(o) { opts = o || {}; }
  root.Bottle = { init, open, close, _state: () => G, _start: (o) => { ensureDom(); isOpen = true; dom.root.style.display = 'block'; newGame(o || {}); showPanel(null); begin(); }, _act: act, _step: step };
})(window);
