/*
 * Online multiplayer for two players (no server: you swap two pairing codes by hand, then WebRTC connects the browsers).
 * Modes: Race, Tag, Hide & Seek, Minigame duel.  Every player simulates their own goose; the other player is a
 * smoothed "ghost" drawn from pose messages. The host decides results.
 */
(function (root) {
  'use strict';
  let api = null, pc = null, dc = null, isHost = false, connected = false;
  const M = { mode: null, over: false, countdown: 0, phase: '', seeker: 0, seed: 0, arg: null, left: 0, it: 0, tIt: [0, 0], tagCd: 0, t: 0,
              myScore: null, peerScore: null, ghost: null, peer: { skin: 'goose', equip: {} }, sendT: 0, uiT: 0, lastEnd: null, diff: null, saveRandom: null };
  const me = () => (isHost ? 0 : 1);
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------ pairing codes
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64 = (t) => { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; const s = atob(t), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  async function pipe(u8, stream) { const w = stream.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(stream.readable).arrayBuffer()); }
  async function pack(obj) {
    const u = new TextEncoder().encode(JSON.stringify(obj));
    if (root.CompressionStream) return 'Z' + b64(await pipe(u, new CompressionStream('deflate-raw')));
    return 'R' + b64(u);
  }
  async function unpack(code) {
    code = (code || '').replace(/\s+/g, '');
    if (!code) throw new Error('empty');
    let u = unb64(code.slice(1));
    if (code[0] === 'Z') u = await pipe(u, new DecompressionStream('deflate-raw'));
    return JSON.parse(new TextDecoder().decode(u));
  }

  function newPC() {
    if (pc) try { pc.close(); } catch (e) { /* ignore */ }
    pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
    pc.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) lost(); };
  }
  function gathered() {
    return new Promise((res) => {
      if (pc.iceGatheringState === 'complete') return res();
      const t = setTimeout(res, 6000);
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
    });
  }
  async function hostStart() { isHost = true; newPC(); dc = pc.createDataChannel('g'); wire(); await pc.setLocalDescription(await pc.createOffer()); await gathered(); return pack(pc.localDescription.toJSON()); }
  async function guestJoin(code) {
    isHost = false; newPC(); pc.ondatachannel = (e) => { dc = e.channel; wire(); };
    await pc.setRemoteDescription(await unpack(code)); await pc.setLocalDescription(await pc.createAnswer()); await gathered();
    return pack(pc.localDescription.toJSON());
  }
  async function hostFinish(code) { await pc.setRemoteDescription(await unpack(code)); }
  function wire() {
    dc.onopen = () => { connected = true; send({ t: 'hi', skin: api.save().skin, equip: api.save().equip }); ui(); };
    dc.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch (err) { /* ignore bad packet */ } };
    dc.onclose = lost;
  }
  function send(o) { if (dc && dc.readyState === 'open') dc.send(JSON.stringify(o)); }
  function lost() {
    if (!connected) return;
    connected = false; M.ghost = null;
    if (M.mode) { stopMode(); api.showMenu(); api.toast('Connection lost.', 3); }
    ui();
  }

  // ------------------------------------------------------------ arenas
  const G = 520;
  function arenaLevel(kind, id) {
    const W = kind === 'hide' ? 3200 : 2400;
    const plats = kind === 'hide'
      ? [[300, 400, 200], [760, 310, 200], [1250, 390, 240], [1700, 290, 200], [2150, 380, 220], [2600, 300, 200], [1350, 170, 260], [550, 190, 160]]
      : [[300, 400, 200], [700, 300, 200], [1100, 380, 220], [1500, 280, 200], [1900, 400, 200], [1000, 170, 240]];
    const lv = {
      name: kind === 'hide' ? 'Hide & Seek Yard' : 'Goose Arena', hint: '', theme: kind === 'hide' ? 'sunset' : 'meadow',
      spawn: [300 + id * (W - 700), G - 45], deathY: 1500,
      terrain: [{ pts: [[-120, G], [W + 120, G]] }],
      solids: [[-120, -600, 120, 1500], [W, -600, 120, 1500]].concat(plats.map((p) => [p[0], p[1], p[2], 18])),
      water: [], hazards: [], pads: kind === 'hide' ? [[900, G, 70], [2300, G, 70]] : [[600, G, 70], [1750, G, 70]], movers: [], checkpoints: [], bread: [], egg: [-9999, -9999],
    };
    if (kind === 'hide') lv.bushes = [[520, G - 110, 150, 110], [1000, G - 110, 150, 110], [1500, G - 110, 150, 110], [1950, G - 110, 150, 110], [2450, G - 110, 150, 110], [2850, G - 110, 150, 110]];
    return lv;
  }

  // ------------------------------------------------------------ messages
  function onMsg(m) {
    if (m.t === 'hi') { M.peer = { skin: m.skin, equip: m.equip || {} }; ui(); }
    else if (m.t === 'p') pose(m);
    else if (m.t === 'start') begin(m);
    else if (m.t === 'stop') { if (M.mode) { stopMode(); api.showMenu(); api.toast('Your friend left the game.', 3); } }
    else if (m.t === 'ts') { M.it = m.it; M.tIt = m.tIt; M.left = m.left; }
    else if (m.t === 'egg') { if (isHost && M.mode === 'race' && !M.over) declare(1, 'Your friend grabbed the egg first.', 'You grabbed the egg first!'); }
    else if (m.t === 'catch') { /* host-only decision, unused */ }
    else if (m.t === 'end') endShow(m.title, m.text, m.win);
    else if (m.t === 'mg') { M.peerScore = m.score; duelCheck(); }
    else if (m.t === 'rematch') { /* host drives rematch via 'start' */ }
  }
  function pose(m) {
    const T = { c: m.c, n: m.n, hp: m.hp, ft: m.ft, f: m.f, fl: m.fl, ho: m.ho, a: m.a };
    if (!M.ghost) M.ghost = JSON.parse(JSON.stringify(T)); M.gt = T;
  }
  const lerpPts = (a, b, k) => { for (let i = 0; i < a.length && i < b.length; i++) { a[i][0] += (b[i][0] - a[i][0]) * k; a[i][1] += (b[i][1] - a[i][1]) * k; } };

  // ------------------------------------------------------------ mode control
  function hostStartMode(mode, arg) {
    if (!isHost || !connected) return;
    const o = { t: 'start', mode, arg, seed: (Math.random() * 1e9) | 0, diff: api.save().diff, seeker: mode === 'hide' ? (M.seeker === 0 && M.mode === 'hide' ? 1 : (Math.random() < 0.5 ? 0 : 1)) : 0 };
    send(o); begin(o);
  }
  function mulberry(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function begin(m) {
    stopMode(true);
    Object.assign(M, { mode: m.mode, arg: m.arg, seed: m.seed, seeker: m.seeker, over: false, t: 0, tagCd: 0, tIt: [0, 0], it: m.mode === 'tag' ? (m.seed % 2) : 0, myScore: null, peerScore: null, diff: m.diff });
    $('mpMenu').classList.add('hidden'); $('mpDone').classList.add('hidden');
    api.setDiff(m.diff);
    if (m.mode === 'race') { M.countdown = 3; api.startLevel(m.arg); }
    else if (m.mode === 'tag') { M.countdown = 3; M.left = 60; api.startCustom(arenaLevel('tag', me())); }
    else if (m.mode === 'hide') { M.countdown = 3; M.phase = 'hide'; M.left = 15; api.startCustom(arenaLevel('hide', me())); }
    else if (m.mode === 'duel') { M.countdown = 0; M.saveRandom = Math.random; Math.random = mulberry(m.seed); api.startMinigame(m.arg); }
    ui();
  }
  function stopMode(silent) {
    if (M.saveRandom) { Math.random = M.saveRandom; M.saveRandom = null; }
    if (M.mode && !silent) { api.setDiff(null); }
    M.mode = null; M.over = false; M.countdown = 0; M.phase = ''; $('mpBanner').classList.add('hidden'); $('mpDone').classList.add('hidden');
  }
  function leave() { send({ t: 'stop' }); stopMode(); api.showMenu(); }
  function declare(win, textHost, textGuest) {            // host only: decide the result and tell both sides
    if (M.over) return;
    const title = (side) => (side === win ? 'You win! 🏆' : 'You lose 😢');
    send({ t: 'end', title: title(1), text: textGuest, win });
    endShow(title(0), textHost, win);
  }
  function endShow(title, text, win) {
    if (!M.mode || M.over) return;
    M.over = true;
    if (win === me()) api.award(20);
    $('mpDoneTitle').textContent = title; $('mpDoneText').textContent = text + (win === me() ? '\n+20 🍞' : '');
    $('mpRematch').style.display = isHost ? '' : 'none';
    $('mpDone').classList.remove('hidden');
  }
  function duelCheck() {
    if (M.mode !== 'duel' || M.myScore == null || M.peerScore == null) return;
    const w = M.myScore > M.peerScore ? '🏆 You win the duel!' : M.myScore < M.peerScore ? 'Your friend wins the duel.' : 'A tie!';
    api.appendMgText('\nDuel: you ' + M.myScore + ' vs friend ' + M.peerScore + '  →  ' + w);
  }

  // ------------------------------------------------------------ per-frame hooks (called by game.js)
  function frozen() {
    if (!M.mode) return false;
    return M.countdown > 0 || M.over || (M.mode === 'hide' && M.phase === 'hide' && M.seeker === me());
  }
  function tick(goose, dt) {
    if (!connected) return;
    M.sendT += dt;
    if (M.sendT >= 0.05) {
      M.sendT = 0;
      const c = goose.center(), A = goose.axes(), r = (n) => Math.round(n * 10) / 10, pts = (a) => a.map((p) => [r(p.x), r(p.y)]);
      send({ t: 'p', c: [r(c.x), r(c.y)], n: pts(goose.neck), hp: pts(goose.hips), ft: pts(goose.feet), f: goose.facing, fl: r(goose.flapT), ho: r(goose.honkT), a: [A.ux, A.uy, A.vx, A.vy].map((v) => Math.round(v * 100) / 100) });
    }
    if (!M.mode || M.mode === 'duel') return;
    M.t += dt;
    if (M.countdown > 0) { M.countdown -= dt; return; }
    if (M.over) return;
    const gc = M.gt ? M.gt.c : null, c = goose.center();
    const dist = gc ? Math.hypot(gc[0] - c.x, gc[1] - c.y) : 9999;
    if (M.mode === 'tag') {
      M.left -= dt; M.tagCd = Math.max(0, M.tagCd - dt);
      if (isHost) {
        M.tIt[M.it] += dt;
        if (dist < 62 && M.tagCd <= 0) { M.it = 1 - M.it; M.tagCd = 2; }
        M.uiT += dt; if (M.uiT > 0.2) { M.uiT = 0; send({ t: 'ts', it: M.it, tIt: M.tIt, left: M.left }); }
        if (M.left <= 0) {
          const w = M.tIt[0] < M.tIt[1] ? 0 : 1, a = M.tIt[0].toFixed(1), b = M.tIt[1].toFixed(1);
          const txt = 'Time spent as "it": Host ' + a + 's · Guest ' + b + 's (lower is better)';
          declare(w, txt, txt);
        }
      }
    } else if (M.mode === 'hide') {
      M.left -= dt;
      if (M.phase === 'hide' && M.left <= 0) { M.phase = 'seek'; M.left = 75; api.toast(M.seeker === me() ? 'Ready or not — go find them!' : 'The seeker is coming!', 2.5); }
      else if (M.phase === 'seek' && isHost) {
        if (dist < 58) { const w = M.seeker, txt = 'Caught after ' + (75 - M.left).toFixed(1) + 's of seeking.'; declare(w, w === 0 ? 'You found the hider! ' + txt : 'You were found. ' + txt, w === 1 ? 'You found the hider! ' + txt : 'You were found. ' + txt); }
        else if (M.left <= 0) { const w = 1 - M.seeker; declare(w, w === 0 ? 'You stayed hidden for the full 75 seconds!' : 'You could not find the hider in time.', w === 1 ? 'You stayed hidden for the full 75 seconds!' : 'You could not find the hider in time.'); }
      }
    }
    // guest also learns that a hide round is over via 'end'
    banner();
  }
  function banner() {
    const b = $('mpBanner'); b.classList.remove('hidden');
    let t = '';
    if (M.countdown > 0) t = 'Get ready… ' + Math.ceil(M.countdown);
    else if (M.mode === 'race') t = '🏁 Race to the egg!';
    else if (M.mode === 'tag') t = (M.it === me() ? '🔴 YOU are IT! Tag your friend' : '🟢 Run! Your friend is IT') + ' · ' + Math.max(0, M.left).toFixed(0) + 's';
    else if (M.mode === 'hide') t = (M.seeker === me() ? '🔍 Seeker' : '🫣 Hider') + ' · ' + (M.phase === 'hide' ? 'hiding ' : 'seeking ') + Math.max(0, M.left).toFixed(0) + 's';
    b.textContent = t;
  }
  function onEgg() {                                    // game.js: you touched the egg in a multiplayer race
    if (M.mode !== 'race') return false;
    if (M.over || M.countdown > 0) return true;
    if (isHost) declare(0, 'You grabbed the egg first!', 'Your friend grabbed the egg first.'); else send({ t: 'egg' });
    return true;
  }
  function onMgEnd(score) { if (M.mode !== 'duel') return; M.myScore = score; send({ t: 'mg', score }); duelCheck(); }

  const inBush = (lv, x, y) => (lv.bushes || []).some((b) => x > b[0] && x < b[0] + b[2] && y > b[1] - 25 && y < b[1] + b[3] + 40);
  function drawWorld(ctx, lv, clock) {
    if (M.gt && M.ghost && M.mode !== 'duel') {
      const k = 0.35, g = M.ghost, t = M.gt;
      g.c[0] += (t.c[0] - g.c[0]) * k; g.c[1] += (t.c[1] - g.c[1]) * k; lerpPts(g.n, t.n, k); lerpPts(g.hp, t.hp, k); lerpPts(g.ft, t.ft, k);
      g.f = t.f; g.fl = t.fl; g.ho = t.ho; g.a = t.a;
      let show = true;
      if (M.mode === 'hide' && M.seeker === me()) show = M.phase !== 'hide' && !inBush(lv, g.c[0], g.c[1]);
      if (show) {
        const o = (p) => ({ x: p[0], y: p[1] }), neck = g.n.map(o);
        const fake = { facing: g.f, flapT: g.fl, honkT: g.ho, neck, head: neck[neck.length - 1], hips: g.hp.map(o), feet: g.ft.map(o), center: () => ({ x: g.c[0], y: g.c[1] }), axes: () => ({ ux: g.a[0], uy: g.a[1], vx: g.a[2], vy: g.a[3] }) };
        ctx.save(); ctx.globalAlpha = M.mode === 'race' ? 0.8 : 1;
        api.drawGoose(ctx, fake, M.peer.equip, M.peer.skin);
        ctx.restore();
        ctx.save(); ctx.font = '800 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 4;
        const label = (M.mode === 'tag' && M.it === 1 - me()) ? 'IT!' : 'Friend'; const y = neck[neck.length - 1].y - 26;
        ctx.strokeText(label, neck[neck.length - 1].x, y); ctx.fillText(label, neck[neck.length - 1].x, y); ctx.restore();
      }
    }
    if (M.mode === 'tag' && M.it === me() && api.goose()) { const c = api.goose().center(); ctx.save(); ctx.strokeStyle = 'rgba(230,57,70,.9)'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(c.x, c.y, 54 + Math.sin(clock * 6) * 3, 0, 7); ctx.stroke(); ctx.restore(); }
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
    if (M.mode === 'hide' && M.phase === 'hide' && M.seeker === me()) {
      cx.fillStyle = '#10131c'; cx.fillRect(0, 0, W, H); cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = '800 ' + 26 * px + 'px system-ui, sans-serif';
      cx.fillText('Eyes closed… the hider is hiding', W / 2, H / 2 - 10 * px); cx.font = '800 ' + 60 * px + 'px system-ui, sans-serif'; cx.fillText(String(Math.max(0, Math.ceil(M.left))), W / 2, H / 2 + 60 * px);
    } else if (M.countdown > 0) {
      cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(0, 0, W, H); cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = '900 ' + 96 * px + 'px system-ui, sans-serif'; cx.fillText(String(Math.ceil(M.countdown)), W / 2, H / 2 + 30 * px);
    }
  }

  // ------------------------------------------------------------ UI
  function ui() {
    const el = $('mpMenu'); if (!el) return;
    $('mpStatus').textContent = connected ? '✅ Connected! ' + (isHost ? 'Pick a game below.' : 'Waiting for the host to pick a game…') : 'Not connected.';
    $('mpPair').style.display = connected ? 'none' : '';
    $('mpModes').style.display = connected && isHost ? '' : 'none';
  }
  function build() {
    const css = document.createElement('style');
    css.textContent = '#mpBanner{position:fixed;top:56px;left:50%;transform:translateX(-50%);z-index:4;background:rgba(255,255,255,.92);border:3px solid #2b2118;border-radius:999px;padding:6px 16px;font-weight:800;pointer-events:none}#mpBanner.hidden{display:none}#mpMenu textarea{width:100%;height:64px;font:11px monospace;border:2px solid #2b2118;border-radius:10px;margin:4px 0;box-sizing:border-box}#mpMenu .step{text-align:left;margin:8px 0;font-size:14px}#mpMenu select{font:inherit;font-weight:700;border:2px solid #2b2118;border-radius:10px;padding:4px 8px}';
    document.head.appendChild(css);
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="mpBanner" class="hidden"></div>' +
      '<div class="overlay hidden" id="mpMenu"><div class="card wide" style="max-width:560px"><h2>👥 Multiplayer (2 players)</h2>' +
      '<div id="mpStatus" class="small">Not connected.</div>' +
      '<div id="mpPair"><div class="row"><button class="big small-btn" id="mpHost">Host a game</button><button class="big small-btn ghost" id="mpJoin">Join a game</button></div>' +
      '<div id="mpHostBox" class="step hidden"><b>1.</b> Send this code to your friend:<textarea id="mpOffer" readonly></textarea><button class="sec" id="mpCopyOffer">Copy</button><br><b>2.</b> Paste the code they send back:<textarea id="mpAnswerIn" placeholder="paste answer code"></textarea><button class="sec" id="mpConnect">Connect</button></div>' +
      '<div id="mpJoinBox" class="step hidden"><b>1.</b> Paste the host\'s code:<textarea id="mpOfferIn" placeholder="paste host code"></textarea><button class="sec" id="mpMakeAnswer">Make my code</button><br><b>2.</b> Send this code back to the host:<textarea id="mpAnswer" readonly></textarea><button class="sec" id="mpCopyAnswer">Copy</button></div>' +
      '<div class="small" id="mpErr" style="color:#c62835;min-height:18px"></div>' +
      '<div class="small">No server needed. If it never connects, one of you is probably on a network (some phone data / school Wi‑Fi) that blocks direct connections — try another network.</div></div>' +
      '<div id="mpModes" style="display:none"><h3>Pick a game</h3><div class="row"><select id="mpLevel"></select><button class="sec" id="mpRace">🏁 Race</button></div>' +
      '<div class="row" style="margin-top:6px"><button class="sec" id="mpTag">🏃 Tag</button><button class="sec" id="mpHide">🫣 Hide &amp; Seek</button></div>' +
      '<div class="row" style="margin-top:6px"><select id="mpMg"></select><button class="sec" id="mpDuel">⚔️ Minigame duel</button></div></div>' +
      '<div class="row" style="margin-top:12px"><button class="big small-btn ghost" id="mpClose">Back</button><button class="big small-btn ghost" id="mpDisc">Disconnect</button></div></div></div>' +
      '<div class="overlay clear hidden" id="mpDone"><div class="card"><h2 id="mpDoneTitle"></h2><p id="mpDoneText" style="white-space:pre-line"></p><div class="row"><button class="big small-btn" id="mpRematch">Rematch</button><button class="big small-btn ghost" id="mpLeave">Leave</button></div></div></div>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
    const copy = (id) => { const t = $(id); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } };
    const err = (e) => { $('mpErr').textContent = 'Something went wrong: ' + (e && e.message || e); };
    $('mpHost').onclick = async () => { $('mpErr').textContent = ''; $('mpJoinBox').classList.add('hidden'); $('mpHostBox').classList.remove('hidden'); $('mpOffer').value = 'making code…'; try { $('mpOffer').value = await hostStart(); } catch (e) { err(e); } };
    $('mpJoin').onclick = () => { $('mpErr').textContent = ''; $('mpHostBox').classList.add('hidden'); $('mpJoinBox').classList.remove('hidden'); };
    $('mpConnect').onclick = async () => { try { $('mpErr').textContent = 'Connecting…'; await hostFinish($('mpAnswerIn').value); } catch (e) { err(e); } };
    $('mpMakeAnswer').onclick = async () => { try { $('mpAnswer').value = 'making code…'; $('mpAnswer').value = await guestJoin($('mpOfferIn').value); $('mpErr').textContent = ''; } catch (e) { $('mpAnswer').value = ''; err(e); } };
    $('mpCopyOffer').onclick = () => copy('mpOffer'); $('mpCopyAnswer').onclick = () => copy('mpAnswer');
    $('mpClose').onclick = () => $('mpMenu').classList.add('hidden');
    $('mpDisc').onclick = () => { send({ t: 'stop' }); connected = false; M.ghost = null; try { pc && pc.close(); } catch (e) { /* ignore */ } $('mpHostBox').classList.add('hidden'); $('mpJoinBox').classList.add('hidden'); ui(); };
    $('mpRace').onclick = () => hostStartMode('race', +$('mpLevel').value);
    $('mpTag').onclick = () => hostStartMode('tag');
    $('mpHide').onclick = () => hostStartMode('hide');
    $('mpDuel').onclick = () => hostStartMode('duel', $('mpMg').value);
    $('mpRematch').onclick = () => { if (isHost) hostStartMode(M.mode, M.arg); };
    $('mpLeave').onclick = leave;
    ui();
  }
  function open() {
    $('mpLevel').innerHTML = ''; api.levels.forEach((l, i) => { const o = document.createElement('option'); o.value = i; o.textContent = (i + 1) + '. ' + l.name; $('mpLevel').appendChild(o); });
    $('mpMg').innerHTML = ''; (root.Minigames ? root.Minigames.list : []).forEach((m) => { const o = document.createElement('option'); o.value = m.id; o.textContent = m.icon + ' ' + m.name; $('mpMg').appendChild(o); });
    ui(); $('mpMenu').classList.remove('hidden');
  }
  function init(a) { api = a; build(); }

  root.MP = { init, open, active: () => !!M.mode, connected: () => connected, frozen, tick, drawWorld, drawOverlay, onEgg, onMgEnd, stopMode: () => { if (M.mode) { send({ t: 'stop' }); stopMode(); } },
              _hostStart: hostStart, _guestJoin: guestJoin, _hostFinish: hostFinish, _start: hostStartMode, _state: M };
})(window);
