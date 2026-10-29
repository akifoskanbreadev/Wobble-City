/*
 * Spin the Bottle (goose edition): a friendly party game for 3 to 8 geese, solo with bots or online (Room, host runs the rules).
 * The bottle spins and points at a goose. They pick Truth or Dare (all silly and clean), answer, and the others vote 👍 / 👎.
 * A 👍 majority earns a point; skipping earns a 🐔. Everyone spins in turn. Most points wins.
 * Three more modes use the same bottle: 🎯 Eliminator (the goose it lands on picks someone to blast out with the Bread Blaster, last goose standing wins),
 * 🌑 Lights Out (the blaster shot happens in the dark: the geese are shuffled and unnamed) and 🎲 Lucky Blaster (the blaster only works 50% of the time).
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

  const MODE_ICON = { tod: '🤔', elim: '🎯', lights: '🌑', luck: '🎲' };
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
      P.push({ alive: true, id: i, name: h ? h.name : i === 0 && !hum ? myName() : names[i], look: h ? (h.net === 0 ? myLook() : cleanLook(h.look)) : i === 0 ? myLook() : randLook(), bot: !h && !(i === 0 && !hum), net: h ? h.net : (i === 0 && !hum ? 0 : -1), pts: 0, chick: 0 });
    }
    G = { mode: ['tod', 'elim', 'lights', 'luck'].includes(o.mode) ? o.mode : 'tod', perm: [], shot: null, online: !!hum, host: true, me: 0, players: P, turn: (Math.random() * n) | 0, round: 1, rounds: (['elim', 'lights', 'luck'].includes(o.mode) ? 999 : n * 2), stage: 'idle', stT: 0, target: -1, a: 0, a1: 0, dur: 3.4, seq: 0, kind: '', prompt: '', ans: '', skipped: false, votes: {}, vd: {}, msg: '', t: 0 };
    lastKey = '';
  }
  const pub = () => ({ stage: G.stage, turn: G.turn, round: G.round, rounds: G.rounds, target: G.target, a1: G.a1, dur: G.dur, seq: G.seq, kind: G.kind, prompt: G.prompt, ans: G.ans, skipped: G.skipped, votes: G.votes, msg: G.msg, mode: G.mode, perm: G.perm, shot: G.shot, alive: G.players.map((p) => (p.alive ? 1 : 0)), pts: G.players.map((p) => p.pts), chick: G.players.map((p) => p.chick), bots: G.players.map((p) => (p.bot ? 1 : 0)) });
  function snap() { if (G.online && room) room.toAll({ k: 'st', s: pub() }); lastKey = ''; }
  function apply(s) {       // guest: take the host's snapshot
    const was = G.seq; G.stage = s.stage; G.turn = s.turn; G.round = s.round; G.rounds = s.rounds; G.target = s.target; G.a1 = s.a1; G.dur = s.dur; G.kind = s.kind; G.prompt = s.prompt; G.ans = s.ans; G.skipped = s.skipped; G.votes = s.votes || {}; G.msg = s.msg; G.mode = s.mode || 'tod'; G.perm = s.perm || []; G.shot = s.shot || null;
    s.pts.forEach((v, i) => { if (G.players[i]) { G.players[i].pts = v; G.players[i].chick = s.chick[i]; G.players[i].bot = !!s.bots[i]; G.players[i].alive = s.alive ? !!s.alive[i] : true; } });
    if (s.seq !== was) { G.seq = s.seq; G.spinFrom = G.a; G.spinT = 0; }
    G.stT = 0; lastKey = '';
  }

  // ------------------------------------------------------------------ the rules (host / solo)
  function doSpin() {
    if (G.stage !== 'idle') return;
    const n = G.players.length; let t, guard = 0; do { t = (Math.random() * n) | 0; } while ((t === G.turn || !G.players[t].alive) && ++guard < 200);
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
  const shuffled = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const aliveIdx = () => G.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
  function toShoot() {                        // the bottle has landed: in the shooting modes the goose it landed on blasts someone
    G.stage = 'shoot'; G.stT = 0; G.perm = G.mode === 'lights' ? shuffled(aliveIdx()) : []; G.shot = null; tone(180, 0.3, 'sawtooth', 0.04); snap();
  }
  function doShoot(v) {                       // v: a player index (a slot number in Lights Out, where nobody can see who is who)
    if (G.stage !== 'shoot') return; v = +v;
    const from = G.target, vic = G.mode === 'lights' ? G.perm[v] : v;
    if (vic == null || !G.players[vic] || !G.players[vic].alive || (vic === from && G.mode !== 'lights')) return;
    const hit = G.mode === 'luck' ? Math.random() < 0.5 : true, S = G.players, f = S[from], t = S[vic];
    G.shot = { from, to: vic, hit };
    if (hit) { t.alive = false; G.msg = vic === from ? '🍞 ' + f.name + ' blasted THEMSELVES in the dark!' : '🍞 ' + f.name + ' blasted ' + t.name + ' out!'; tone(140, 0.4, 'square', 0.06); tone(90, 0.5, 'sawtooth', 0.05); }
    else { G.msg = '💨 CLICK! ' + f.name + '\'s blaster jammed. ' + t.name + ' is safe!'; tone(500, 0.08); tone(420, 0.12); }
    G.stage = 'result'; G.stT = 0; snap();
  }
  function tally() {
    const up = Object.values(G.votes).filter((v) => v === 1).length, dn = Object.values(G.votes).filter((v) => v === 0).length, t = G.players[G.target];
    if (up >= dn && up + dn > 0) { t.pts++; G.msg = '👍 ' + up + ' – ' + dn + ' 👎  ' + t.name + ' scores a point!'; tone(880, 0.2); tone(1100, 0.25); } else { G.msg = '👎 ' + up + ' – ' + dn + ' 👎  No point this time.'; tone(220, 0.3, 'sawtooth', 0.04); }
    G.stage = 'result'; G.stT = 0; snap();
  }
  function nextTurn() {
    if (G.mode !== 'tod') {
      const left = aliveIdx(); G.round++;
      if (left.length <= 1) { G.stage = 'over'; G.stT = 0; G.target = left[0] != null ? left[0] : -1; snap(); finish(); return; }
      let k = G.turn; do { k = (k + 1) % G.players.length; } while (!G.players[k].alive);
      G.turn = k; G.stage = 'idle'; G.stT = 0; G.target = -1; G.msg = ''; G.shot = null; snap(); return;
    }
    G.round++;
    if (G.round > G.rounds) { G.stage = 'over'; G.stT = 0; snap(); finish(); return; }
    G.turn = (G.turn + 1) % G.players.length; G.stage = 'idle'; G.stT = 0; G.target = -1; G.msg = ''; snap();
  }
  function finish() {
    if (!opts || !opts.award) return; const me = G.players[G.me]; if (!me) return; const best = Math.max(...G.players.map((p) => p.pts));
    if (G.mode !== 'tod') { opts.award(me.alive ? 30 : 6); return; }
    opts.award(me.pts === best && best > 0 ? 25 : 8);
  }
  function hostTick(dt) {
    const g = G; g.stT += dt; const sp = g.players[g.turn], t = g.players[g.target];
    if (g.stage === 'idle') { if (sp.bot && g.stT > 1.3) doSpin(); }
    else if (g.stage === 'shoot') { if (t.bot && g.stT > 1.9) { if (g.mode === 'lights') doShoot((Math.random() * g.perm.length) | 0); else { const c = aliveIdx().filter((k) => k !== g.target); doShoot(c[(Math.random() * c.length) | 0]); } } else if (g.stT > 30) { if (g.mode === 'lights') doShoot((Math.random() * g.perm.length) | 0); else { const c = aliveIdx().filter((k) => k !== g.target); doShoot(c[(Math.random() * c.length) | 0]); } } }
    else if (g.stage === 'spin') { if (g.stT >= g.dur) { if (g.mode === 'tod') { g.stage = 'pick'; g.stT = 0; tone(520, 0.15); snap(); } else toShoot(); } }
    else if (g.stage === 'pick') { if (t.bot && g.stT > 1.4) doPick(Math.random() < 0.5 ? 'truth' : 'dare'); else if (g.stT > 30) doPick('truth'); }
    else if (g.stage === 'task') { if (t.bot && g.stT > 2.6) doDone(Math.random() < 0.88 ? rnd(BOT_SAY) : '', Math.random() >= 0.88); else if (g.stT > 70) doDone('', true); }
    else if (g.stage === 'vote') {
      for (const k of Object.keys(g.vd)) if (g.stT > g.vd[k] && g.votes[k] == null) { delete g.vd[k]; doVote(+k, Math.random() < 0.72); if (g.stage !== 'vote') return; }
      if (g.stT > 14) tally();
    } else if (g.stage === 'result') { if (g.stT > 2.4) nextTurn(); }
  }

  // ------------------------------------------------------------------ network (guests send intentions, the host decides)
  const PREFIX = 'wobble-bottle-v1-', osel = { n: 5, mode: 'tod' };
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
    newGame({ humans: hum, n: Math.max(osel.n, hum.length), mode: osel.mode });
    G.players.forEach((p, i) => { if (p.net > 0) room.toOne(p.net, { k: 'start', i, ps: G.players.map((q) => ({ name: q.name, look: q.look })), s: pub() }); });
    showPanel(null); begin();
  }
  function onNet(from, m) {
    if (!m || !m.k) return;
    if (m.k === 'start' && !(room && room.isHost())) {
      G = { online: true, host: false, me: m.i, players: m.ps.map((p, i) => ({ alive: true, id: i, name: clean(p.name, 14), look: cleanLook(p.look), bot: false, net: -1, pts: 0, chick: 0 })), turn: 0, round: 1, rounds: 10, stage: 'idle', stT: 0, target: -1, a: 0, a1: 0, dur: 3.4, seq: 0, votes: {}, vd: {}, msg: '' };
      apply(m.s); showPanel(null); begin(); return;
    }
    if (m.k === 'st' && G && !G.host) { apply(m.s); return; }
    if (!G || !G.host) return;
    const idx = G.players.findIndex((p) => p.net === from); if (idx < 0) return;
    if (m.k === 'spin' && G.stage === 'idle' && idx === G.turn) doSpin();
    else if (m.k === 'pick' && G.stage === 'pick' && idx === G.target) doPick(m.c);
    else if (m.k === 'shoot' && G.stage === 'shoot' && idx === G.target) doShoot(m.v);
    else if (m.k === 'done' && G.stage === 'task' && idx === G.target) doDone(m.text, !!m.skip);
    else if (m.k === 'vote') doVote(idx, !!m.v);
    else if (m.k === 'again' && G.stage === 'over') { /* host decides */ }
  }
  // what the local player does: the host applies it directly, a guest asks the host
  const act = {
    spin() { if (G.host) { if (G.turn === G.me) doSpin(); } else room.send({ k: 'spin' }); },
    shoot(v) { if (G.host) { if (G.target === G.me) doShoot(v); } else room.send({ k: 'shoot', v }); },
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
  // ------------------------------------------------------------------ the 3D room (the geese stay 2D sprites standing in it)
  let gl3 = null, glTried = false;
  const WR = 4.3, TR = 2.7, TY = 2.2, SY = 1.75, CAM = { eye: [0, 7.6, 11.4], at: [0, 1.5, 0.4], fov: 0.92 };   // seat ring radius, table radius, table height, seat height
  const STOOL = ['#3b2a6b', '#2a6b3a', '#1f3a6b', '#6b2a3a', '#6b5a1f', '#2a5a6b', '#5a2a6b', '#3a3a44'];
  const vrot = () => Math.PI - (2 * Math.PI * (G ? G.me : 0)) / (G ? G.players.length : 1);        // turn the circle so YOU sit on the near side of the table
  function buildRoom() {                                                       // a dark, cosy wooden tavern (a static mesh built once)
    const m = root.H3E.mesh(), B = (x, y, z, w, h, d, c, ry) => m.box(x, y, z, w, h, d, c, ry), O = (x, y, z, rx, ry, rz, c, seg, ring) => m.ball(x, y, z, rx, ry, rz, c, 0, seg, ring);
    B(0, -0.4, 0, 70, 0.4, 70, '#1f130a');
    for (let k = -30; k <= 30; k++) B(k * 1.1, 0, 0, 1.06, 0.06, 60, k % 3 === 0 ? '#3b2414' : k % 3 === 1 ? '#32200f' : '#402818');                    // floor planks
    O(0, 0.06, 0, 8, 0.03, 8, '#4a2e18', 36, 4);                                                                                                 // warm pool of lamp light
    B(0, 0, -23, 70, 13, 0.7, '#2a1d16'); B(-24, 0, 0, 0.7, 13, 70, '#251914'); B(24, 0, 0, 0.7, 13, 70, '#251914');                           // dark wooden walls
    for (const y of [1.2, 3.8, 6.4, 9]) { B(0, y, -22.6, 70, 0.28, 0.3, '#3d2a1c'); B(-23.6, y, 0, 0.3, 0.28, 70, '#382719'); B(23.6, y, 0, 0.3, 0.28, 70, '#382719'); }   // panelling rails
    B(0, 11.3, 0, 70, 0.5, 70, '#1a110b');                                                                                                       // ceiling
    for (let x = -22; x <= 22; x += 5.5) B(x, 10.4, 0, 0.8, 0.8, 70, '#3a2515'); for (const z of [-18, -8, 2, 12, 22]) B(0, 10.9, z, 70, 0.55, 0.7, '#44301c');   // wooden beams
    for (const z of [-12, 0, 12]) { B(-23.4, 4.6, z, 0.2, 4, 3, '#122240'); B(-23.2, 4.6, z, 0.25, 4.3, 0.22, '#5a3d22'); B(-23.2, 4.6, z - 1.6, 0.25, 4.3, 0.22, '#5a3d22'); B(-23.2, 4.6, z + 1.6, 0.25, 4.3, 0.22, '#5a3d22'); B(-23.2, 4.6, z, 0.25, 0.22, 3.4, '#5a3d22'); B(-23.2, 6.55, z, 0.25, 0.22, 3.4, '#5a3d22'); B(-23.2, 2.65, z, 0.25, 0.22, 3.4, '#5a3d22'); }   // moonlit windows on the left
    for (const z of [-8, 8]) { B(23.4, 4.6, z, 0.2, 4, 3, '#122240'); B(23.2, 4.6, z, 0.25, 4.3, 0.22, '#5a3d22'); B(23.2, 4.6, z - 1.6, 0.25, 4.3, 0.22, '#5a3d22'); B(23.2, 4.6, z + 1.6, 0.25, 4.3, 0.22, '#5a3d22'); }
    B(-6, 4.6, -22.4, 10, 5.2, 0.25, '#4a331f'); B(-6, 4.6, -22.25, 9.4, 4.7, 0.2, '#10141c');                                                  // the "update board"
    B(-6, 6.4, -22.1, 5.5, 0.28, 0.1, '#ffd23f'); for (let k = 0; k < 6; k++) B(-6 + (k % 2 ? 0.6 : -0.4), 5.5 - k * 0.55, -22.1, 3 + ((k * 37) % 5) * 0.9, 0.13, 0.1, '#78b8ff');
    B(8, 4.6, -22.4, 7, 4.4, 0.25, '#4a331f'); B(8, 4.6, -22.25, 6.4, 3.9, 0.2, '#14101c');                                                   // a second board with coloured icons
    for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) B(5.4 + b * 1.7, 5.9 - a * 1.2, -22.1, 0.8, 0.8, 0.1, ['#e63946', '#3a86ff', '#ffd23f', '#2fbf71', '#9b5de5', '#ff8c42'][(a * 4 + b) % 6]);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { B(-20 + b * 2.6, 3.4 + a * 1.8, -22.4, 2.2, 1.4, 0.2, '#0c0f14'); B(-20 + b * 2.6, 3.6 + a * 1.8, -22.25, 0.7, 0.5, 0.1, ['#e63946', '#19d6ff', '#ffd23f'][(a + b) % 3]); }   // a wall of little screens
    for (const sx of [-1, 1]) { B(sx * 15, 0, -18, 6, 0.9, 2.4, sx < 0 ? '#4a2a22' : '#2a3a4a'); B(sx * 15, 0.9, -19, 6, 1.4, 0.6, sx < 0 ? '#5a342a' : '#33475a'); }   // sofas along the back
    gl3.setStatic(m);
  }
  function render3D(w, h, t) {
    const m = root.H3E.mesh(), n = G.players.length, vr = vrot(), aw = G.a + vr, f = [Math.cos(aw), Math.sin(aw)], yaw = Math.PI / 2 - aw;
    const dark = G.mode === 'lights' && G.stage === 'shoot';
    const B = (x, y, z, ww, hh, dd, c, ry) => m.box(x, y, z, ww, hh, dd, c, ry), O = (x, y, z, rx, ry, rz, c, seg, ring) => m.ball(x, y, z, rx, ry, rz, c, 0, seg, ring);
    // the round (octagonal) table with its pedestal
    B(0, TY - 0.3, 0, TR * 2, 0.3, TR * 2 * 0.99, '#2c2420'); B(0, TY - 0.3, 0, TR * 2, 0.3, TR * 2 * 0.99, '#2c2420', Math.PI / 4); B(0, TY - 0.02, 0, TR * 1.7, 0.03, TR * 1.7, '#352b26', Math.PI / 8);
    B(0, 0.2, 0, 0.8, TY - 0.5, 0.8, '#1e1814'); O(0, 0.18, 0, 1.7, 0.18, 1.7, '#1e1814', 20, 6);
    // things lying on the table
    B(1.2, TY + 0.005, 1.1, 1.1, 0.02, 0.75, '#e9e4d6', 0.35); B(-1.5, TY + 0.005, -0.9, 0.9, 0.02, 0.65, '#ddd8c8', -0.5); B(-1.1, TY + 0.005, 1.4, 0.45, 0.03, 0.3, '#e63946', 0.8); B(-0.9, TY + 0.035, 1.35, 0.45, 0.03, 0.3, '#ffffff', 0.2);
    O(1.6, TY + 0.07, -1.1, 0.16, 0.07, 0.16, '#e63946', 10, 5); O(1.6, TY + 0.15, -1.1, 0.16, 0.07, 0.16, '#2fbf71', 10, 5); O(1.9, TY + 0.07, -0.8, 0.16, 0.07, 0.16, '#ffd23f', 10, 5); O(-0.4, TY + 0.1, -1.7, 0.2, 0.1, 0.2, '#8a6a3a', 10, 5);
    // bottle on the table
    const k = 0.78, P = (d, y) => [f[0] * d * k, TY + y * k, f[1] * d * k], ball = (d, y, rx, ry, rz, c) => { const p = P(d, y); m.ball(p[0], p[1], p[2], rx * k, ry * k, rz * k, c, yaw, 14, 9); };
    ball(-0.15, 0.36, 0.38, 0.36, 0.95, '#38b862'); ball(-0.15, 0.37, 0.385, 0.37, 0.34, '#efdca6'); ball(0.62, 0.34, 0.3, 0.3, 0.38, '#38b862'); ball(1.05, 0.33, 0.15, 0.15, 0.42, '#3fc46c'); ball(1.38, 0.33, 0.12, 0.12, 0.3, '#3fc46c'); ball(1.58, 0.33, 0.17, 0.16, 0.1, '#c9972b'); ball(-0.1, 0.62, 0.1, 0.06, 0.6, '#d8ffe4');
    // a bar stool for every goose
    for (let i = 0; i < n; i++) {
      const th = -Math.PI / 2 + (2 * Math.PI * i) / n + vr, x = Math.cos(th) * WR, z = Math.sin(th) * WR, c = STOOL[i % 8];
      O(x, SY - 0.1, z, 0.85, 0.22, 0.85, c, 16, 6); O(x, SY - 0.3, z, 0.62, 0.1, 0.62, '#a8aeb8', 14, 4);
      for (const [dx, dz] of [[0.42, 0.42], [-0.42, 0.42], [0.42, -0.42], [-0.42, -0.42]]) B(x + dx, 0, z + dz, 0.09, SY - 0.3, 0.09, '#8d939d');
      O(x, 0.75, z, 0.78, 0.05, 0.78, '#8d939d', 14, 3);
    }
    // ceiling fan with warm lights, turning slowly
    B(0, 8.6, 0, 0.12, 2.6, 0.12, '#6a4a22'); O(0, 8.4, 0, 0.55, 0.3, 0.55, '#c9972b', 14, 8);
    for (let q = 0; q < 4; q++) { const a = t * 1.1 + q * Math.PI / 2; B(Math.cos(a) * 1.9, 8.55, Math.sin(a) * 1.9, 3.2, 0.07, 0.6, '#7a5028', -a); }
    for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + 0.78; O(Math.cos(a) * 0.55, 8.05, Math.sin(a) * 0.55, 0.2, 0.2, 0.2, '#fff0b0', 8, 6); }
    gl3.sky = dark ? [0.01, 0.01, 0.02] : [0.1, 0.07, 0.05]; gl3.fogNear = 40; gl3.fogFar = 90;
    gl3.drawFrame({ eye: [CAM.eye[0] + Math.sin(t * 0.3) * 0.5, CAM.eye[1], CAM.eye[2]], at: CAM.at, fov: CAM.fov }, m);
  }
  function draw() {
    const cv = dom.cv, dpr = Math.min(2, root.devicePixelRatio || 1), w = Math.max(2, Math.floor(cv.clientWidth * dpr)), h = Math.max(2, Math.floor(cv.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0);
    if (!glTried) { glTried = true; try { gl3 = root.H3E && dom.gl ? root.H3E.create(dom.gl) : null; if (gl3) buildRoom(); } catch (e) { gl3 = null; } }
    const use3 = !!(gl3 && G);
    dom.gl.style.display = gl3 ? '' : 'none';
    if (G) { if (G.stage === 'spin') G.a = (G.spinFrom || 0) + (G.a1 - (G.spinFrom || 0)) * ease((G.spinT || 0) / G.dur); else if (G.stage !== 'idle') G.a = G.a1; else if (G.a1 && Math.abs(G.a - G.a1) > 0.001) G.a = G.a1; }
    if (use3) { c.clearRect(0, 0, w, h); render3D(w, h, G.time || 0); }
    else { const bg = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7); bg.addColorStop(0, '#6b3f93'); bg.addColorStop(1, '#241338'); c.fillStyle = bg; c.fillRect(0, 0, w, h); }
    if (!G) return;
    const cx = w / 2, cy = h * 0.41, R = Math.min(w * 0.32, h * 0.22), n = G.players.length; let gw = Math.max(26 * dpr, Math.min(54 * dpr, R * 0.36));
    const gw0 = gw;
    if (!use3) { c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.arc(cx, cy, R * 0.95, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 3 * dpr; c.stroke(); }
    const t = G.time || 0;
    const dark = G.mode === 'lights' && G.stage === 'shoot', posOf = (k, m, seat) => {
      const th = -Math.PI / 2 + (2 * Math.PI * k) / m;
      if (use3) {                                            // sit the flat 2D goose on its bar stool in the 3D room and size it by distance
        const tw = -Math.PI / 2 + (2 * Math.PI * (seat != null ? seat : k)) / n + vrot(), q = gl3.project([Math.cos(tw) * WR, SY + 0.05, Math.sin(tw) * WR]);
        if (q) { const s = (cv.clientHeight / 2) / (Math.tan(CAM.fov / 2) * q[2]); gw = Math.max(18, 0.82 * s * dpr / 0.62); return [q[0] * dpr, q[1] * dpr, th, true]; }
      }
      gw = gw0; return [cx + Math.cos(th) * R, cy + Math.sin(th) * R + gw * 0.6, th];
    };
    const drawOne = (p, i, px, py, th, named, t3) => {
      const isSp = i === G.turn && G.stage !== 'over' && !dark, isT = i === G.target && ['pick', 'task', 'vote', 'result', 'shoot'].includes(G.stage) && !dark;
      if (!p.alive && !dark) {                                  // blasted out: just a slice of toast left
        c.globalAlpha = 0.6; c.font = Math.round(34 * dpr) + 'px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('🍞', px, py); c.globalAlpha = 1;
        c.font = '800 ' + Math.round(12 * dpr) + 'px system-ui'; c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(p.name + ' (out)', px, py + 18 * dpr); return;
      }
      if (isSp || isT) { c.fillStyle = isT ? 'rgba(255,90,90,' + (0.35 + 0.2 * Math.sin(t * 6)) + ')' : 'rgba(255,214,60,.3)'; c.beginPath(); c.ellipse(px, py, gw * 0.9, gw * 0.35, 0, 0, 7); c.fill(); }
      let ok = false, head = null;
      if (t3) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(px, py + gw * 0.05, gw * 0.55, gw * 0.16, 0, 0, 7); c.fill(); }
      if (root.GooseArt && p.look) { try { head = root.GooseArt.draw(c, px, py, p.look, { w: gw * 0.62, face: Math.cos(th) > 0.2 ? -1 : 1, t, moving: isT && G.stage === 'result' && !G.skipped && G.mode === 'tod' }); ok = true; } catch (e) { ok = false; } }
      if (!ok) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(px, py - gw * 0.3, gw * 0.4, gw * 0.3, 0, 0, 7); c.fill(); }
      if (!named) return;
      if (t3) {                                               // a floating name plate like in Rec Room: number badge + name
        const hx = head ? head.x : px, hy = Math.max(30 * dpr, (head ? head.y : py - gw) - 26 * dpr), lab = p.name + (i === G.me ? ' (you)' : ''), fs = Math.round(15 * dpr);
        c.font = '800 ' + fs + 'px system-ui'; const tw2 = c.measureText(lab).width, bw = fs * 1.5, pw = bw + tw2 + fs * 1.1, ph = fs * 1.7;
        c.fillStyle = 'rgba(12,12,16,.78)'; c.beginPath(); if (c.roundRect) c.roundRect(hx - pw / 2, hy - ph / 2, pw, ph, ph / 2); else c.rect(hx - pw / 2, hy - ph / 2, pw, ph); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); if (c.roundRect) c.roundRect(hx - pw / 2 + fs * 0.25, hy - bw / 2 + 0, bw, bw, fs * 0.3); else c.rect(hx - pw / 2 + fs * 0.25, hy - bw / 2, bw, bw); c.fill();
        c.fillStyle = '#111'; c.textAlign = 'center'; c.fillText(String(i + 1), hx - pw / 2 + fs * 0.25 + bw / 2, hy + fs * 0.35);
        c.fillStyle = i === G.me ? '#ffe27a' : '#fff'; c.textAlign = 'left'; c.fillText(lab, hx - pw / 2 + fs * 0.25 + bw + fs * 0.4, hy + fs * 0.35);
        if (G.mode === 'tod') { c.font = '700 ' + Math.round(12 * dpr) + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 3 * dpr; c.strokeStyle = '#000'; c.fillStyle = '#fff'; const sc = '🍞 ' + p.pts + (p.chick ? '  🐔 ' + p.chick : ''); c.strokeText(sc, hx, hy + ph * 0.95); c.fillText(sc, hx, hy + ph * 0.95); }
        return;
      }
      c.font = '800 ' + Math.round(13 * dpr) + 'px system-ui'; c.textAlign = 'center'; c.lineWidth = 3 * dpr; c.strokeStyle = '#000'; c.fillStyle = i === G.me ? '#ffe27a' : '#fff';
      const lab = p.name + (i === G.me ? ' (you)' : ''); c.strokeText(lab, px, py + 16 * dpr); c.fillText(lab, px, py + 16 * dpr);
      if (G.mode === 'tod') { c.font = '700 ' + Math.round(12 * dpr) + 'px system-ui'; const sc = '🍞 ' + p.pts + (p.chick ? '  🐔 ' + p.chick : ''); c.strokeText(sc, px, py + 30 * dpr); c.fillText(sc, px, py + 30 * dpr); }
      if (isSp) { c.font = Math.round(16 * dpr) + 'px system-ui'; c.fillText('🍾', px + gw * 0.55, py - gw * 0.9); }
    };
    if (dark) {
      const m = G.perm.length, seats = aliveIdx(); G.perm.forEach((pi, k) => { const [px, py, th] = posOf(k, m, seats[k]); drawOne(G.players[pi], pi, px, py, th, false); });
      c.fillStyle = 'rgba(4,2,12,.93)'; c.fillRect(0, 0, w, h);
      G.perm.forEach((pi, k) => { const [px, py] = posOf(k, m, seats[k]); c.font = '900 ' + Math.round(20 * dpr) + 'px system-ui'; c.textAlign = 'center'; c.fillStyle = '#ffe27a'; c.fillText(String(k + 1), px, py - gw * 0.5); });
    } else G.players.forEach((p, i) => { const [px, py, th, t3] = posOf(i, n); drawOne(p, i, px, py, th, true, t3); });
    // the Bread Blaster shot: a slice of bread flies from the shooter to the target
    if (G.shot && G.stage === 'result' && G.mode !== 'tod') {
      const a = posOf(G.shot.from, n), b = posOf(G.shot.to, n), k = Math.min(1, G.stT / 0.7);
      c.font = Math.round(30 * dpr) + 'px system-ui'; c.textAlign = 'center';
      if (G.shot.hit) { c.fillText('🍞', a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - gw * 0.4); if (k >= 1) { c.globalAlpha = Math.max(0, 1 - (G.stT - 0.7) * 1.4); c.fillText('💥', b[0], b[1] - gw * 0.5); c.globalAlpha = 1; } }
      else { c.globalAlpha = Math.max(0, 1 - G.stT * 0.7); c.fillText('💨', a[0], a[1] - gw * 0.5); c.globalAlpha = 1; }
    }
    if (!use3) { bottle(c, cx, cy, G.a, Math.max(0.5, R / 150) * dpr * 0.9); c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 5 * dpr, 0, 7); c.fill(); }
  }

  // ------------------------------------------------------------------ UI cards
  function card() {
    if (!G) return; const me = G.me, sp = G.players[G.turn], tg = G.players[G.target], key = [G.stage, G.turn, G.round, G.target, G.votes[me], G.kind, G.skipped, G.msg, G.players.map((p) => (p.alive ? 1 : 0)).join('')].join('|');
    const left = G.players.filter((p) => p.alive).length;
    $('sbtop').textContent = G.stage === 'over' ? '🏁 Game over!' : G.mode === 'tod' ? 'Round ' + Math.min(G.round, G.rounds) + ' / ' + G.rounds + ' · 🍾 ' + sp.name + '\'s spin' : MODE_ICON[G.mode] + ' ' + left + ' geese left · 🍾 ' + sp.name + '\'s spin';
    if (key === lastKey) return; lastKey = key;
    const c = $('sbcard'); let h = '';
    const bind = [];
    if (G.stage === 'idle') {
      if (G.turn === me) { h = '<div class="bt">Your turn!</div><div class="row"><button class="go" id="sbspin">🍾 SPIN THE BOTTLE</button></div>'; bind.push(['sbspin', () => act.spin()]); }
      else h = '<div class="bt">Waiting for ' + esc(sp.name) + ' to spin…</div>';
    } else if (G.stage === 'spin') h = '<div class="bt">🍾 Spinning…</div>';
    else if (G.stage === 'shoot') {
      const dark = G.mode === 'lights';
      if (G.target === me) {
        h = '<div class="bt">It landed on YOU!</div><div>' + (dark ? '🌑 The lights went out! Pick a shape in the dark… you might even hit yourself!' : G.mode === 'luck' ? '🎲 Pick a goose. The Bread Blaster only works half the time!' : '🍞 Pick a goose to blast out of the game!') + '</div><div class="row">';
        if (dark) G.perm.forEach((pi, k) => { h += '<button class="go red" data-v="' + k + '">🌑 ' + (k + 1) + '</button>'; });
        else G.players.forEach((p, k) => { if (p.alive && k !== me) h += '<button class="go red" data-v="' + k + '">🎯 ' + esc(p.name) + '</button>'; });
        h += '</div>';
      } else h = '<div class="bt">It landed on ' + esc(tg.name) + '!</div><div>' + (dark ? '🌑 Lights out… ' : '') + esc(tg.name) + ' is picking who to blast…</div>';
    }
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
    } else if (G.stage === 'result' && G.mode !== 'tod') h = '<div class="bt">' + esc(G.msg) + '</div>';
    else if (G.stage === 'result') h = '<div class="bt">' + esc(G.msg) + '</div>';
    else if (G.stage === 'over') {
      if (G.mode !== 'tod') { const w = G.players.find((p) => p.alive); h = '<div class="bt">🏆 ' + (w ? esc(w.name) + ' is the last goose standing!' : 'Nobody survived!') + '</div>' + (G.mode === 'luck' ? '<div>The Bread Blaster has spoken.</div>' : '') + '<div class="row">' + (G.host ? '<button class="go" id="sbagain">▶ Play again</button>' : '') + '<button class="go alt" id="sbmenu">Menu</button></div>'; bind.push(['sbagain', () => again()], ['sbmenu', () => close()]); c.innerHTML = h; for (const [id, fn] of bind) { const b = $(id); if (b) b.addEventListener('click', fn); } return; }
      const order = G.players.map((p, i) => ({ p, i })).sort((a, b) => b.p.pts - a.p.pts); const best = order[0].p.pts;
      h = '<div class="bt">🏆 ' + (order.filter((o) => o.p.pts === best).map((o) => esc(o.p.name)).join(' & ')) + ' win' + (order.filter((o) => o.p.pts === best).length > 1 ? '' : 's') + '!</div>' + order.map((o) => '<div>' + esc(o.p.name) + ' — 🍞 ' + o.p.pts + (o.p.chick ? ' · 🐔 ' + o.p.chick : '') + '</div>').join('');
      h += '<div class="row">' + (G.host ? '<button class="go" id="sbagain">▶ Play again</button>' : '') + '<button class="go alt" id="sbmenu">Menu</button></div>';
      bind.push(['sbagain', () => again()], ['sbmenu', () => close()]);
    }
    c.innerHTML = h; for (const [id, fn] of bind) { const b = $(id); if (b) b.addEventListener('click', fn); }
    c.querySelectorAll('button[data-v]').forEach((b) => b.addEventListener('click', () => act.shoot(+b.dataset.v)));
    const ia = $('sbans'); if (ia) { ia.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('sbdone').click(); }); ia.addEventListener('keyup', (e) => e.stopPropagation()); setTimeout(() => ia.focus(), 50); }
  }
  function again() {
    if (!G || !G.host) return;
    if (G.online && room && room.isHost()) { const hum = G.players.filter((p) => p.net >= 0).map((p) => ({ net: p.net, name: p.name, look: p.look })); const n = G.players.length; newGame({ humans: hum, n, mode: G.mode });
      G.players.forEach((p, i) => { if (p.net > 0) room.toOne(p.net, { k: 'start', i, ps: G.players.map((q) => ({ name: q.name, look: q.look })), s: pub() }); }); begin(); }
    else { const n = G.players.length; newGame({ n, mode: G.mode }); begin(); }
  }

  // ------------------------------------------------------------------ shell
  function showPanel(id) { if (!dom) return; dom.lobby.style.display = id === 'lobby' ? 'flex' : 'none'; dom.cv.style.display = id === 'lobby' ? 'none' : ''; dom.gl.style.visibility = id === 'lobby' ? 'hidden' : ''; $('sbcard').style.display = id === 'lobby' ? 'none' : ''; $('sbtop').style.display = id === 'lobby' ? 'none' : ''; }
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
    d.innerHTML = `<canvas id="sbgl"></canvas><canvas id="sbcv"></canvas><div id="sbtop"></div><button id="sbquit" title="Leave">☰</button><div id="sbcard"></div>
      <div class="panel" id="sblobby"><div class="card"><h2>🍾 Spin the Bottle</h2><div class="sub">A party game for 3 to 8 geese, with bots or online. All cartoon fun: the Bread Blaster only fires toast.</div>
        <div class="row"><b>Mode</b><span class="chip on" data-mode="tod">🤔 Truth or Dare</span><span class="chip" data-mode="elim">🎯 Eliminator</span><span class="chip" data-mode="lights">🌑 Lights Out</span><span class="chip" data-mode="luck">🎲 Lucky Blaster</span></div>
        <div id="sbmdesc" style="font-size:13px;opacity:.8;margin:-2px 0 4px"></div>
        <div class="row"><b>Geese</b><span class="chip" data-n="4">4</span><span class="chip on" data-n="5">5</span><span class="chip" data-n="6">6</span><span class="chip" data-n="8">8</span><span style="font-size:12px;opacity:.7">(bots fill the circle)</span></div>
        <div class="row"><button class="go" id="sbstart">▶ Play with bots</button><button class="go alt" id="sbback">Back</button></div>
        <h4 style="margin:10px 0 2px">👥 Online with friends</h4>
        <div class="row"><input id="sbword" maxlength="24" placeholder="room word (same for everyone)" style="font-size:16px;padding:9px 12px;border-radius:10px;border:3px solid #dfe3f1;width:210px"><button class="go" id="sbjoin">Join / create</button><button class="go alt" id="sbquick">🎲 Random lobby</button></div>
        <div id="sbonl" style="display:none"><div class="row" id="sbroster"></div><div id="sbwait" class="sub"></div><div class="row"><button class="go" id="sbstartonl">▶ Start online game</button><button class="go alt" id="sbleave">Leave room</button></div></div>
        <div id="sbstat" style="font-size:13px;min-height:16px"></div></div></div>`;
    document.body.appendChild(d);
    dom = { root: d, cv: $('sbcv'), gl: $('sbgl'), lobby: $('sblobby') };
    d.querySelectorAll('[data-n]').forEach((c) => c.addEventListener('click', () => { d.querySelectorAll('[data-n]').forEach((x) => x.classList.remove('on')); c.classList.add('on'); osel.n = +c.dataset.n; }));
    const MDESC = { tod: 'Spin, Truth or Dare, the others vote. Most 🍞 wins.', elim: 'When the bottle lands on you, pick a goose to blast out with the Bread Blaster. Last goose standing wins!', lights: 'The lights go out when the bottle lands. The geese are shuffled and unnamed: pick a shape in the dark (you might hit yourself!).', luck: 'Like Eliminator, but the Bread Blaster only works 50% of the time. Click… or BOOM?' };
    const setMode = (m) => { osel.mode = m; d.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x.dataset.mode === m)); $('sbmdesc').textContent = MDESC[m]; };
    d.querySelectorAll('[data-mode]').forEach((c) => c.addEventListener('click', () => setMode(c.dataset.mode))); setMode(osel.mode);
    $('sbstart').addEventListener('click', () => { if (room) room.leave(); newGame({ n: osel.n, mode: osel.mode }); showPanel(null); begin(); });
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
