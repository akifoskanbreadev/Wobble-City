/*
 * Owner status. Type the code "akif": a locked gate opens that asks for the OWNER PIN. Nothing is reachable (no tools, no cheats,
 * no admin button) until the server confirms the PIN. After that a red admin button sits in the top right of every screen and mode.
 *  - Owner tools: bread, unlock everything, god mode, admin console, the list of every code.
 *  - Owner PIN (kept on the server, only its hash): the first person to set it is the real owner. A PIN-verified owner can LOCK
 *    cheat codes for everybody (the lock list lives on the server and every copy of the game reads it), is not affected by locks,
 *    and gets owner perks inside the game modes (for example the 3D Hide & Seek x-ray minimap).
 *  - Never lockable: sync, codes, akif and the harmless looks (rainbow, disco, zoom).
 * Honest limit: this is a browser game, so a determined person can still edit their own copy. The lock stops normal players.
 */
(function (root) {
  'use strict';
  const DEFAULT_URL = 'https://workers-playground-rapid-brook-325c.akifoskanbread.workers.dev';
  const LOCKABLE = ['lol', 'levels', 'speed', 'neck', 'money', 'flaps', 'moon', 'shield', 'admin', 'skins', 'clothes', 'bread'];
  const LS = { locked: 'wobbleLockedCodes', pin: 'wobbleOwnerPin' };
  let A = null, box = null, cfg = { locked: [], pinSet: null };
  const get = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const set = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  const url = () => get('wobbleAiUrl') || DEFAULT_URL;
  async function sha(t) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join(''); }
  const hashPin = (p) => sha('wobble-owner-v1:' + p);
  async function call(body) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      if (r.status === 403) throw new Error('badpin');
      if (r.status === 501) throw new Error('nokv');
      if (!r.ok) throw new Error('http' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }
  try { cfg.locked = JSON.parse(get(LS.locked) || '[]').filter((c) => LOCKABLE.includes(c)); } catch (e) { cfg.locked = []; }

  let myLocks = [], myRank = '';
  const authed = () => !!get(LS.pin) && !!(A && A.save().cheats && A.save().cheats.owner);
  const isLocked = (c) => cfg.locked.includes(c);
  const blocks = (c) => (isLocked(c) || myLocks.includes(c)) && !authed();   // a locked code is dead for everybody except the PIN-verified owner
  const isOwner = () => authed();
  const setRank = (r) => { myRank = r || ''; syncBtn(); };
  const rankName = (r) => (r === 'owner' ? 'OWNER' : r === 'headadmin' ? 'HEADADMIN' : r === 'admin' ? 'ADMIN' : '');
  const setMyLocks = (l) => { myLocks = (l || []).filter((c) => LOCKABLE.includes(c)); if (A) A.applyCodes(); };

  // ------------------------------------------------------------------ troll / power effects (on this device; the owner can aim them at other players)
  const fx = { time: 1, speed: 1, flap: 1, grav: 1, bounce: 0, reverse: false, fly: false, autohonk: false, breadrain: false, on: {}, until: {} };
  const FXD = [   // id, label, group (radio inside a group)
    ['flip', '🙃 Upside-down screen'], ['mirror', '🪞 Mirror screen'], ['spin', '🌀 Spinning screen'], ['drunk', '🍺 Drunk screen'], ['invert', '🌗 Invert colours'],
    ['gray', '⚫ Black & white'], ['hue', '🌈 Colour party'], ['blur', '😵 Blurry'], ['shake', '📳 Earthquake'], ['zoomin', '🔍 Zoomed way in'], ['tiny', '🔬 Tiny screen'], ['dark', '🕶 Lights out'], ['pixel', '🟦 Pixelated'], ['sepia', '📜 Old photo'],
    ['reverse', '↔️ Reverse controls'], ['fly', '🕊 Jetpack (hold flap)'], ['autohonk', '📣 Auto-honk'], ['breadrain', '🍞 Bread rain'], ['bounce', '🏀 Super bouncy'],
    ['slow', '🐢 Slow motion', 'time'], ['fast', '⏩ Fast forward', 'time'],
    ['superflap', '🚀 Mega flaps', 'power'], ['megaspeed', '💨 Mega speed', 'power'], ['nospeed', '🧊 Frozen feet', 'power'],
    ['invgrav', '🙃 Gravity up!', 'grav'], ['lowgrav', '🌙 Tiny gravity', 'grav'], ['heavy', '⚓ Crushing gravity', 'grav']
  ];
  function recalc() {
    const o = fx.on;
    fx.time = o.slow ? 0.35 : o.fast ? 2 : 1; fx.speed = o.megaspeed ? 3 : o.nospeed ? 0.08 : 1; fx.flap = o.superflap ? 3 : 1;
    fx.grav = o.invgrav ? -0.5 : o.lowgrav ? 0.12 : o.heavy ? 3 : 1; fx.bounce = o.bounce ? 1.1 : 0;
    fx.reverse = !!o.reverse; fx.fly = !!o.fly; fx.autohonk = !!o.autohonk; fx.breadrain = !!o.breadrain;
    const h = document.documentElement; for (const d of FXD) h.classList.toggle('ofx-' + d[0], !!o[d[0]]);
    if (A && A.ctl) A.ctl.applyFx();
  }
  function setFx(id, on, dur) {
    const d = FXD.find((x) => x[0] === id); if (!d) return;
    if (on && d[2]) for (const o of FXD) if (o[2] === d[2] && o[0] !== id) { delete fx.on[o[0]]; delete fx.until[o[0]]; }
    if (on) { fx.on[id] = true; if (dur > 0) fx.until[id] = Date.now() + dur * 1000; else delete fx.until[id]; } else { delete fx.on[id]; delete fx.until[id]; }
    recalc();
  }
  function clearFx() { fx.on = {}; fx.until = {}; recalc(); }
  const css = document.createElement('style');
  css.textContent = `
  #ownBtn{position:fixed;top:max(6px,env(safe-area-inset-top));right:6px;z-index:2147483000;width:38px;height:38px;border-radius:50%;border:2px solid #fff;background:#d6192b;color:#fff;font:800 9px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.45);cursor:pointer;padding:0;display:none;line-height:1}
  #headBtn{position:fixed;top:max(6px,env(safe-area-inset-top));right:6px;z-index:2147483000;width:38px;height:38px;border-radius:50%;border:2px solid #fff;background:#e8780a;color:#fff;font:800 9px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.45);cursor:pointer;padding:0;display:none;line-height:1}
  #ownBtn:active{transform:scale(.93)}
  #ownerModal{z-index:2147483001}
  .ofx-flip canvas,.ofx-flip #h3,.ofx-flip #ch,.ofx-flip #crew{transform:rotate(180deg)}
  .ofx-mirror canvas,.ofx-mirror #h3,.ofx-mirror #ch,.ofx-mirror #crew{transform:scaleX(-1)}
  .ofx-spin canvas,.ofx-spin #h3,.ofx-spin #ch,.ofx-spin #crew{animation:ofxspin 9s linear infinite}
  .ofx-drunk canvas,.ofx-drunk #h3,.ofx-drunk #ch,.ofx-drunk #crew{animation:ofxdrunk 3.2s ease-in-out infinite}
  .ofx-shake canvas,.ofx-shake #h3,.ofx-shake #ch,.ofx-shake #crew{animation:ofxshake .12s linear infinite}
  .ofx-zoomin canvas,.ofx-zoomin #h3,.ofx-zoomin #ch,.ofx-zoomin #crew{transform:scale(1.8)}
  .ofx-tiny canvas,.ofx-tiny #h3,.ofx-tiny #ch,.ofx-tiny #crew{transform:scale(.4)}
  .ofx-invert canvas,.ofx-invert #h3,.ofx-invert #ch,.ofx-invert #crew{filter:invert(1)}
  .ofx-gray canvas,.ofx-gray #h3,.ofx-gray #ch,.ofx-gray #crew{filter:grayscale(1) contrast(1.2)}
  .ofx-sepia canvas,.ofx-sepia #h3,.ofx-sepia #ch,.ofx-sepia #crew{filter:sepia(1) contrast(1.1)}
  .ofx-dark canvas,.ofx-dark #h3,.ofx-dark #ch,.ofx-dark #crew{filter:brightness(.18) contrast(1.4)}
  .ofx-pixel canvas,.ofx-pixel #h3,.ofx-pixel #ch,.ofx-pixel #crew{image-rendering:pixelated;filter:contrast(1.6) saturate(1.8)}
  .ofx-hue canvas,.ofx-hue #h3,.ofx-hue #ch,.ofx-hue #crew{animation:ofxhue 2.5s linear infinite}
  .ofx-blur canvas,.ofx-blur #h3,.ofx-blur #ch,.ofx-blur #crew{filter:blur(3px)}
  @keyframes ofxspin{to{transform:rotate(360deg)}}
  @keyframes ofxdrunk{0%,100%{transform:rotate(-3deg) scale(1.06) translateX(-12px);filter:blur(1px)}50%{transform:rotate(3deg) scale(1.06) translateX(12px);filter:blur(2.5px)}}
  @keyframes ofxshake{0%{transform:translate(4px,3px)}25%{transform:translate(-5px,2px)}50%{transform:translate(3px,-4px)}75%{transform:translate(-3px,-3px)}100%{transform:translate(4px,3px)}}
  @keyframes ofxhue{to{filter:hue-rotate(360deg) saturate(2)}}
  .oplayer{display:flex;align-items:center;gap:8px;padding:4px 6px;border-bottom:1px solid rgba(0,0,0,.1);font-size:14px}
  .oplayer canvas{width:44px;height:44px;flex:none}`;
  document.head.appendChild(css);
  const ob = document.createElement('button'); ob.id = 'ownBtn'; ob.textContent = 'ADMIN'; ob.title = 'Owner panel'; ob.setAttribute('aria-label', 'Owner panel');
  ob.addEventListener('click', () => open()); document.body.appendChild(ob);
  const hb = document.createElement('button'); hb.id = 'headBtn'; hb.textContent = 'HEAD'; hb.title = 'Head admin panel'; hb.addEventListener('click', () => open('head')); document.body.appendChild(hb);
  const syncBtn = () => { ob.style.display = authed() ? 'block' : 'none'; hb.style.display = !authed() && myRank === 'headadmin' ? 'block' : 'none'; };
  setInterval(() => {
    const now = Date.now(); let ch = false; for (const k of Object.keys(fx.until)) if (fx.until[k] < now) { delete fx.on[k]; delete fx.until[k]; ch = true; } if (ch) recalc();
    if (fx.autohonk && A && A.ctl) A.ctl.honk(); if (fx.breadrain && A) { A.save().bread += 7; A.refreshMenu(); }
  }, 900);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function note(text) {   // a plain message from the owner
    const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:2147483002;background:#fff;color:#222;border:3px solid #2a2f3a;border-radius:14px;padding:14px 18px;max-width:86vw;font:700 16px system-ui;text-align:center;box-shadow:0 6px 0 #2a2f3a';
    d.textContent = text; d.addEventListener('click', () => d.remove()); document.body.appendChild(d); setTimeout(() => d.remove(), 9000);
  }
  // something the owner sent to this device (or applied to themselves)
  function receive(f) {
    if (!f || !f.k) return;
    if (f.k === 'toggle') setFx(f.id, f.on !== false, f.dur || 0);
    else if (f.k === 'prank' && root.Pranks) root.Pranks.show(f.id);
    else if (f.k === 'honk' && A && A.ctl) { let i = 0; const t = setInterval(() => { A.ctl.honk(); if (++i > (f.n || 12)) clearInterval(t); }, 110); }
    else if (f.k === 'bread' && A) { A.save().bread += Math.max(-1e9, Math.min(1e9, +f.n || 0)); if (A.save().bread < 0) A.save().bread = 0; A.persist(); A.refreshMenu(); }
    else if (f.k === 'tp' && A && A.ctl) A.ctl.randTp();
    else if (f.k === 'win' && A && A.ctl) A.ctl.win();
    else if (f.k === 'respawn' && A && A.ctl) A.ctl.respawn();
    else if (f.k === 'msg') note(String(f.text || '').slice(0, 200));
    else if (f.k === 'resetfx') { clearFx(); if (root.Pranks) root.Pranks.close(); }
    else if (f.k === 'menu' && A && A.ctl && A.ctl.toMenu) A.ctl.toMenu();
  }

  async function verifyStored() {
    const h = get(LS.pin); if (!h) return syncBtn();
    try { await call({ op: 'cfg-auth', pin: h }); } catch (e) { if (e.message === 'badpin') { set(LS.pin, ''); if (A) { delete A.save().cheats.owner; A.applyCodes(); } clearFx(); } }
    syncBtn();
  }
  async function refresh() {
    try {
      const r = await call({ op: 'cfg-get' });
      cfg.locked = (r.locked || []).filter((c) => LOCKABLE.includes(c)); cfg.pinSet = !!r.pinSet; set(LS.locked, JSON.stringify(cfg.locked));
      if (A) A.applyCodes();
      return true;
    } catch (e) { return false; }
  }

  // ------------------------------------------------------------------ the panel
  const el = (id) => box && box.querySelector('#' + id);
  const say = (t, bad) => { const s = el('ownMsg'); if (s) { s.textContent = t; s.style.color = bad ? '#c62835' : ''; } };
  function close() { if (box) { box.remove(); box = null; } }
  function become() {   // called after the server accepted the PIN
    const s = A.save(); s.cheats.owner = true;
    for (const k of ['money', 'levels', 'lol', 'flaps', 'admin']) if (!blocks(k)) s.cheats[k] = true;
    A.applyCodes(); syncBtn();
  }
  function resign() { const s = A.save(); for (const k of ['owner', 'god', 'money', 'levels', 'lol', 'flaps', 'admin']) delete s.cheats[k]; set(LS.pin, ''); clearFx(); A.applyCodes(); syncBtn(); close(); }
  const CARD = '<div class="card" style="max-width:480px;width:94%;text-align:left;max-height:92vh;overflow:auto">';
  function gate() {
    box = document.createElement('div'); box.className = 'overlay'; box.id = 'ownerModal';
    box.innerHTML = CARD + '<h2 style="text-align:center;margin:0">🔒 Owner access</h2>' +
      '<div style="text-align:center;font-size:13px;margin:4px 0 10px">Everything in here is locked. Enter the owner PIN to continue.</div>' +
      '<div style="display:flex;gap:6px"><input id="ownPin" type="password" maxlength="40" autocomplete="off" placeholder="' + (cfg.pinSet === false ? 'no owner yet: choose a PIN (6+ characters)' : 'owner PIN') + '" style="flex:1;padding:8px;border-radius:8px;border:2px solid #2a2f3a;font-size:16px"><button class="big small-btn" id="ownPinGo">' + (cfg.pinSet === false ? 'Set PIN' : 'Unlock') + '</button></div>' +
      '<div id="ownMsg" style="text-align:center;font-weight:700;min-height:20px;margin-top:8px;white-space:pre-wrap"></div>' +
      '<div class="row" style="justify-content:center;margin-top:6px"><button class="big small-btn ghost" id="ownClose">Close</button></div></div>';
    document.body.appendChild(box);
    el('ownClose').addEventListener('click', close);
    const go = async () => {
      const p = el('ownPin').value; if (p.length < 6) return say('Use at least 6 characters.', true);
      say('Checking…');
      try {
        const h = await hashPin(p);
        if (cfg.pinSet === false) { await call({ op: 'cfg-pin', pin: h }); cfg.pinSet = true; }
        else await call({ op: 'cfg-auth', pin: h });
        set(LS.pin, h); become(); close(); open();
      } catch (e) { say(e.message === 'badpin' ? 'Wrong PIN.' : e.message === 'nokv' ? 'The server storage is not set up yet (update the worker).' : 'Could not reach the server, so nothing can be unlocked.', true); }
    };
    el('ownPinGo').addEventListener('click', go);
    el('ownPin').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    setTimeout(() => { try { el('ownPin').focus(); } catch (e) { /* ignore */ } }, 50);
    if (cfg.pinSet == null) refresh().then((ok) => { if (ok && box && !authed() && cfg.pinSet === false) { close(); gate(); } });
  }

  // ---- who the commands apply to
  let tab = 'tools', who = 'me', sel = new Set(), users = null, dur = 60, usersErr = '';
  const own = (op, extra) => call(Object.assign({ op, pin: get(LS.pin) }, extra || {}));
  async function loadUsers() { try { const r = await own('acct-list'); users = r.users || []; usersErr = ''; } catch (e) { users = users || []; usersErr = e.message === 'nokv' ? 'Server storage not set up.' : e.message === 'http400' || e.message === 'http404' ? 'The worker has no accounts yet. Paste the new worker code.' : 'Could not load players.'; } }
  async function send(f) {   // apply an effect to the chosen target
    if (who === 'me') { receive(f); return 'Applied to you.'; }
    if (who === 'sel' && !sel.size) throw new Error('Pick players on the Players tab first.');
    const r = await own('acct-fx', { targets: who === 'all' ? '*' : [...sel], fx: f });
    return 'Sent to ' + (who === 'all' ? 'everyone' : r.n + ' player' + (r.n === 1 ? '' : 's')) + '. They get it within ~20 seconds.';
  }
  const ago = (t) => { if (!t) return 'never'; const m = Math.round((Date.now() - t) / 60000); return m < 5 ? 'online' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  function open(mode) {
    if (box) box.remove();
    const head = !authed() && mode === 'head' && myRank === 'headadmin';
    if (!authed() && !head) return gate();
    if (head) { who = 'me'; if (['players', 'ban', 'locks', 'friend'].includes(tab)) tab = 'tools'; }
    const s = A.save();
    box = document.createElement('div'); box.className = 'overlay'; box.id = 'ownerModal';
    const tgtTxt = who === 'me' ? 'just me' : who === 'all' ? 'EVERYONE' : sel.size + ' selected';
    box.innerHTML = CARD + '<h2 style="text-align:center;margin:0">' + (head ? '🧡 Head admin panel' : '👑 Owner panel') + '</h2>' +
      '<div style="text-align:center;font-size:12px;margin:2px 0 6px">' + (head ? 'Head admin: stronger than admin, these tools only affect you.' : 'PIN-verified owner. Commands apply to: <b id="ownTgt">' + tgtTxt + '</b>') + '</div>' +
      '<div class="row" style="justify-content:center;gap:4px;margin-bottom:4px" id="ownTabs"></div>' +
      '<div id="ownWho" style="display:flex;gap:10px;justify-content:center;font-size:13px;margin:2px 0 6px"></div><div id="ownBody"></div>' +
      '<div id="ownMsg" style="text-align:center;font-weight:700;min-height:20px;margin-top:6px;white-space:pre-wrap"></div>' +
      '<div class="row" style="margin-top:6px;justify-content:center"><button class="big small-btn ghost" id="ownList">All codes</button><button class="big small-btn ghost" id="ownResign">Lock &amp; sign out</button><button class="big small-btn ghost" id="ownClose">Close</button></div></div>';
    document.body.appendChild(box);
    const tabs = head ? [['tools', '🛠 Tools'], ['troll', '😈 Troll'], ['pranks', '🎭 Pranks']] : [['tools', '🛠 Tools'], ['troll', '😈 Troll'], ['pranks', '🎭 Pranks'], ['players', '👥 Players'], ['ban', '⛔ Bans'], ['locks', '🔒 Locks'], ['friend', '🤝 Friend code']];
    for (const [id, l] of tabs) { const b = document.createElement('button'); b.className = tab === id ? 'big small-btn' : 'sec'; b.style.cssText = 'font-size:13px;padding:5px 9px'; b.textContent = l; b.addEventListener('click', () => { tab = id; open(mode); }); el('ownTabs').appendChild(b); }
    if (!head && ['tools', 'troll', 'pranks'].includes(tab)) {
      for (const [v, l] of [['me', 'Just me'], ['sel', 'Selected players (' + sel.size + ')'], ['all', 'Everyone']]) { const lb = document.createElement('label'); lb.style.cssText = 'display:flex;gap:4px;align-items:center'; const r = document.createElement('input'); r.type = 'radio'; r.name = 'ownwho'; r.checked = who === v; r.addEventListener('change', () => { who = v; el('ownTgt').textContent = v === 'me' ? 'just me' : v === 'all' ? 'EVERYONE' : sel.size + ' selected'; }); lb.append(r, document.createTextNode(l)); el('ownWho').appendChild(lb); }
    }
    const body = el('ownBody'), grid = () => { const g = document.createElement('div'); g.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px'; body.appendChild(g); return g; };
    const tb = (g, label, fn, on) => { const b = document.createElement('button'); b.className = on ? 'big small-btn' : 'sec'; b.style.cssText = 'font-size:13px;padding:5px 9px'; b.textContent = label; b.addEventListener('click', async () => { try { await fn(); } catch (e) { say(e.message && !/^(http|bad|no)/.test(e.message) ? e.message : e.message === 'badpin' ? 'PIN no longer matches. Sign in again.' : e.message === 'http400' ? 'The worker needs updating (accounts).' : 'Could not reach the server.', true); } A.persist(); A.refreshMenu(); }); g.appendChild(b); return b; };
    const sendSay = async (f) => say(await send(f));
    const ctl = A.ctl || {};
    const h4 = (t) => { const h = document.createElement('h4'); h.style.margin = '8px 0 3px'; h.textContent = t; body.appendChild(h); };
    const hint = (t) => { const n = document.createElement('div'); n.style.cssText = 'font-size:12px;opacity:.75;margin-top:8px'; n.textContent = t; body.appendChild(n); };
    if (tab === 'tools') {
      let g = grid();
      tb(g, '+1,000 🍞', () => sendSay({ k: 'bread', n: 1000 }));
      tb(g, '+1,000,000 🍞', () => sendSay({ k: 'bread', n: 1000000 }));
      tb(g, '−all their 🍞', () => sendSay({ k: 'bread', n: -1e9 }));
      tb(g, '🏁 Win level', () => sendSay({ k: 'win' }));
      tb(g, '🔁 Respawn', () => sendSay({ k: 'respawn' }));
      tb(g, '🎲 Random teleport', () => sendSay({ k: 'tp' }));
      tb(g, '📣 Honk storm', () => sendSay({ k: 'honk', n: 14 }));
      tb(g, '🏠 Send to menu', () => sendSay({ k: 'menu' }));
      tb(g, '🧹 Clear their effects', () => sendSay({ k: 'resetfx' }));
      h4('Send a message'); g = document.createElement('div'); g.style.cssText = 'display:flex;gap:6px'; body.appendChild(g);
      const mi = document.createElement('input'); mi.placeholder = 'message…'; mi.maxLength = 120; mi.style.cssText = 'flex:1;padding:6px;border-radius:8px;border:2px solid #2a2f3a;font-size:14px'; g.appendChild(mi); tb(g, 'Send', () => sendSay({ k: 'msg', text: mi.value }));
      h4('Only for me'); g = grid();
      tb(g, 'Unlock all levels', () => { s.unlocked = A.levelCount(); s.allDone = true; say('All levels unlocked'); });
      tb(g, 'Own everything', () => { A.ownAll(); say('You own every item and skin'); });
      tb(g, '🛡 God mode: ' + (s.cheats.god ? 'ON' : 'off'), () => { s.cheats.admin = true; s.cheats.god = !s.cheats.god; A.applyCodes(); open(mode); }, s.cheats.god);
      tb(g, '⚙ Admin console', () => { s.cheats.admin = true; A.applyCodes(); say('Admin console is on: use the ⚙ button in the menu.'); });
      tb(g, '🥚 Teleport to egg', () => { ctl.toEgg && ctl.toEgg(); close(); });
      tb(g, '💥 Kill all enemies', () => { ctl.killEnemies && ctl.killEnemies(); say('Enemies gone'); });
      tb(g, '⚡ Refill flaps', () => { ctl.refill && ctl.refill(); say('Flaps refilled'); });
      hint('Inside Hide & Seek 3D, Mecha Chameleon and Goose Among Us you also get an owner tray: x-ray, invisible, autopaint, whistle from a random place and more.');
    } else if (tab === 'troll') {
      h4('How long?'); let g = document.createElement('div'); g.style.cssText = 'display:flex;gap:10px;font-size:13px;flex-wrap:wrap'; body.appendChild(g);
      for (const [v, l] of [[30, '30 s'], [120, '2 min'], [600, '10 min'], [0, 'until cleared']]) { const lb = document.createElement('label'); lb.style.cssText = 'display:flex;gap:4px;align-items:center'; const r = document.createElement('input'); r.type = 'radio'; r.name = 'ownDur'; r.checked = dur === v; r.addEventListener('change', () => { dur = v; }); lb.append(r, document.createTextNode(l)); g.appendChild(lb); }
      h4('Effects'); g = grid();
      for (const d of FXD) tb(g, d[1], () => sendSay({ k: 'toggle', id: d[0], on: who !== 'me' || !fx.on[d[0]], dur }).then(() => { if (who === 'me') open(mode); }), who === 'me' && fx.on[d[0]]);
      tb(g, '🧹 Reset all effects', () => sendSay({ k: 'resetfx' }).then(() => { if (who === 'me') open(mode); }));
    } else if (tab === 'pranks') {
      const grp = {}; for (const p of root.Pranks.LIST) (grp[p.group] = grp[p.group] || []).push(p);
      for (const gname of Object.keys(grp)) { h4(gname); const g = grid(); for (const p of grp[gname]) tb(g, p.label, async () => { if (who === 'me') close(); await sendSay({ k: 'prank', id: p.id }); }); }
      hint('Pranks never ask for passwords or send anything. Each closes by itself after a while (bot checks close once solved). A tiny faint line at the bottom says it is a prank.');
    } else if (tab === 'players') {
      body.innerHTML = '<div id="ownUsers" style="font-size:14px">Loading players…</div><div style="font-size:11px;opacity:.7;margin-top:6px">Passwords are stored only as hashes, so nobody can read them (not even you). Use "Reset password" to give someone a new one.</div>';
      const draw = () => {
        const box2 = el('ownUsers'); if (!box2) return; box2.innerHTML = '';
        if (usersErr) { const e = document.createElement('div'); e.style.color = '#c62835'; e.textContent = usersErr; box2.appendChild(e); }
        if (users && !users.length && !usersErr) box2.textContent = 'Nobody has made an account yet.';
        for (const u of users || []) {
          const row = document.createElement('div'); row.className = 'oplayer';
          const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = sel.has(u.name.toLowerCase()); cb.addEventListener('change', () => { const k = u.name.toLowerCase(); if (cb.checked) sel.add(k); else sel.delete(k); who = sel.size ? 'sel' : who; el('ownTgt').textContent = sel.size + ' selected'; });
          row.appendChild(cb);
          let thumb = null; try { thumb = A.thumb(u.avatar, 44); } catch (e) { /* ignore */ } if (thumb) row.appendChild(thumb);
          const t = document.createElement('div'); t.style.cssText = 'flex:1;min-width:0'; const online = Date.now() - u.seen < 300000;
          t.innerHTML = '<b>' + esc(u.name) + '</b> ' + (rankName(u.rank) ? '<span style="background:' + (u.rank === 'owner' ? '#c9162b' : u.rank === 'headadmin' ? '#e8780a' : '#3a86ff') + ';color:#fff;border-radius:6px;padding:0 5px;font-size:10px;font-weight:800">' + rankName(u.rank) + '</span> ' : '') + '<span style="color:' + (online ? '#1a9d3a' : '#888') + '">● ' + ago(u.seen) + (online && u.where ? ' · ' + esc(u.where) : '') + '</span>' + (u.ban && (!u.ban.until || u.ban.until > Date.now()) ? ' <span style="color:#c62835;font-weight:800">BANNED</span>' : '') + (u.locks && u.locks.length ? '<br><span style="font-size:11px;opacity:.7">locked: ' + esc(u.locks.join(', ')) + '</span>' : '');
          row.appendChild(t);
          const mb = (lab, fn) => { const b = document.createElement('button'); b.className = 'sec'; b.style.cssText = 'font-size:11px;padding:3px 6px'; b.textContent = lab; b.addEventListener('click', async () => { try { await fn(); } catch (e) { say('Failed: ' + e.message, true); } }); row.appendChild(b); };
          if (u.rank !== 'owner') { const sl = document.createElement('select'); sl.style.cssText = 'font-size:11px;padding:2px'; [['', 'no rank'], ['admin', 'admin'], ['headadmin', 'headadmin']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; if ((u.rank || '') === v) o.selected = true; sl.appendChild(o); }); sl.addEventListener('change', async () => { try { await own('acct-setrank', { targets: [u.name.toLowerCase()], rank: sl.value }); u.rank = sl.value; say(u.name + ' is now ' + (sl.value || 'unranked') + '.'); draw(); } catch (e) { say('Failed: ' + e.message, true); } }); row.appendChild(sl); }
          mb('🔑 reset', async () => { const np = root.prompt('New password for ' + u.name + ' (4+ characters):'); if (!np || np.length < 4) return; await own('acct-reset', { targets: [u.name.toLowerCase()], ph: await sha('wobble-acct-v1:' + u.name.toLowerCase() + ':' + np) }); say('Password for ' + u.name + ' reset.'); });
          mb('🗑', async () => { if (!root.confirm('Delete the account "' + u.name + '"?')) return; await own('acct-delete', { targets: [u.name.toLowerCase()] }); sel.delete(u.name.toLowerCase()); await loadUsers(); draw(); });
          box2.appendChild(row);
        }
      };
      loadUsers().then(draw);
    } else if (tab === 'friend') {
      body.innerHTML = '<div style="font-size:13px;margin:4px 0">🤝 The <b>friend code</b> makes whoever types it in the Code box a <b>head admin</b>: stronger than the admin code, weaker than akif (only their own screen and goose, no bans, locks or targeting). Only a hash of the code is stored on the server.</div>' +
        '<div style="display:flex;gap:6px"><input id="frCode" maxlength="40" placeholder="choose the friend code" autocomplete="off" style="flex:1;padding:8px;border-radius:8px;border:2px solid #2a2f3a;font-size:16px"><button class="big small-btn" id="frSave">Set</button></div><div class="row" style="margin-top:6px"><button class="big small-btn ghost" id="frClear">Turn the friend code off</button></div>';
      el('frSave').addEventListener('click', async () => { const v = el('frCode').value.trim().toLowerCase(); if (v.length < 4) return say('Use at least 4 characters.', true); try { await own('cfg-friend', { h: await sha('wobble-friend-v1:' + v) }); say('🤝 Friend code saved. Give it to your friends: "' + v + '"'); } catch (e) { say('Could not save (is the worker updated?).', true); } });
      el('frClear').addEventListener('click', async () => { try { await own('cfg-friend', { h: '' }); say('Friend code is off.'); } catch (e) { say('Could not reach the server.', true); } });
    } else if (tab === 'ban') {
      const names = () => [...sel];
      body.innerHTML = '<div style="font-size:13px;margin-bottom:6px">Ban the players you ticked on the Players tab (' + sel.size + ' selected).</div>' +
        '<input id="banWhy" maxlength="100" placeholder="reason (they will see it)" style="width:100%;box-sizing:border-box;padding:7px;border-radius:8px;border:2px solid #2a2f3a;margin-bottom:6px"><div style="font-size:13px;margin-bottom:3px">The ban is removed automatically at:</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap"><select id="banPre" style="padding:6px"><option value="10">in 10 minutes</option><option value="60">in 1 hour</option><option value="1440">in 1 day</option><option value="10080">in 7 days</option><option value="43200">in 30 days</option><option value="0">never (permanent)</option><option value="custom">the date and time I choose…</option></select><input id="banAt" type="datetime-local" style="padding:5px;display:none"></div>' +
        '<div class="row" style="margin-top:8px;gap:6px"><button class="big small-btn" id="banGo">⛔ Ban</button><button class="big small-btn ghost" id="banOff">✅ Unban selected</button></div>';
      el('banPre').addEventListener('change', () => { el('banAt').style.display = el('banPre').value === 'custom' ? '' : 'none'; });
      el('banGo').addEventListener('click', async () => {
        if (!names().length) return say('Tick players on the Players tab first.', true);
        const v = el('banPre').value; let until = 0;
        if (v === 'custom') { until = new Date(el('banAt').value).getTime(); if (!until || until < Date.now()) return say('Pick a date and time in the future.', true); } else if (v !== '0') until = Date.now() + (+v) * 60000;
        try { await own('acct-ban', { targets: names(), until, reason: el('banWhy').value || 'Banned by the owner' }); say('⛔ Banned ' + names().join(', ') + (until ? ' until ' + new Date(until).toLocaleString() : ' permanently') + '.'); } catch (e) { say(e.message === 'http400' ? 'The worker needs updating (accounts).' : 'Could not reach the server.', true); }
      });
      el('banOff').addEventListener('click', async () => { if (!names().length) return say('Tick players on the Players tab first.', true); try { await own('acct-unban', { targets: names() }); say('✅ Unbanned ' + names().join(', ')); } catch (e) { say('Could not reach the server.', true); } });
    } else {
      const one = who === 'sel' && sel.size ? users && users.find((u) => sel.has(u.name.toLowerCase())) : null;
      body.innerHTML = '<div style="font-size:13px;margin:4px 0">🔒 A locked code is dead for the players it is locked for.</div>' +
        '<div style="display:flex;gap:10px;font-size:13px;margin:4px 0"><label><input type="radio" name="lkw" value="all" ' + (who !== 'sel' ? 'checked' : '') + '> Everyone</label><label><input type="radio" name="lkw" value="sel" ' + (who === 'sel' ? 'checked' : '') + '> Selected players (' + sel.size + ')</label></div>' +
        '<div id="ownLocks" style="display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;font-size:14px"></div>' +
        '<div class="row" style="margin-top:6px;justify-content:center"><button class="big small-btn" id="ownSave">Save locks</button></div><div style="font-size:11px;opacity:.7;margin:4px 0">Never lockable: sync, codes, akif, rainbow, disco, zoom.</div>';
      body.querySelectorAll('input[name=lkw]').forEach((r) => r.addEventListener('change', () => { who = r.value; open(); }));
      if (who === 'sel' && !users) loadUsers().then(open);
      const base = who === 'sel' ? (one ? one.locks || [] : []) : cfg.locked;
      const locks = el('ownLocks');
      for (const c of LOCKABLE) { const l = document.createElement('label'); l.style.cssText = 'display:flex;gap:6px;align-items:center'; const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = base.includes(c); cb.dataset.c = c; l.append(cb, document.createTextNode(c)); locks.appendChild(l); }
      el('ownSave').addEventListener('click', async () => {
        const list = Array.from(box.querySelectorAll('#ownLocks input')).filter((i) => i.checked).map((i) => i.dataset.c);
        say('Saving…');
        try {
          if (who === 'sel') { if (!sel.size) return say('Tick players on the Players tab first.', true); await own('acct-locks', { targets: [...sel], locked: list }); say('🔒 Saved for ' + [...sel].join(', ') + ': ' + (list.length ? list.join(', ') : 'nothing locked.')); await loadUsers(); }
          else { await call({ op: 'cfg-set', pin: get(LS.pin), locked: list }); cfg.locked = list; set(LS.locked, JSON.stringify(list)); A.applyCodes(); say('🔒 Saved. ' + (list.length ? 'Locked for everybody: ' + list.join(', ') : 'Nothing is locked.')); }
        } catch (e) { say(e.message === 'badpin' ? 'PIN no longer matches. Sign in again.' : 'Could not save. Is the worker updated?', true); }
      });
    }
    el('ownClose').addEventListener('click', close);
    el('ownResign').addEventListener('click', resign);
    el('ownList').addEventListener('click', () => say('All codes:\n' + Object.keys(A.CHEATS).map((k) => k + ' = ' + A.CHEATS[k]).concat(Object.keys(A.GIFTS).map((k) => k + ' = ' + A.GIFTS[k] + ' (one-time)'), ['codes = your active codes', 'sync = save sync + lock', 'akif = this panel']).join('\n')));
  }
  function init(a) { A = a; refresh(); verifyStored(); setInterval(refresh, 600000); syncBtn(); recalc(); }
  root.Owner = { setRank, pinHash: () => get(LS.pin), init, open, become, isLocked, blocks, isOwner, authed, refresh, LOCKABLE, fx, call, setMyLocks, receive, hashPin };
})(window);
