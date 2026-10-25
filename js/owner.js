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

  const authed = () => !!get(LS.pin) && !!(A && A.save().cheats && A.save().cheats.owner);
  const isLocked = (c) => cfg.locked.includes(c);
  const blocks = (c) => isLocked(c) && !authed();       // a locked code is dead for everybody except the PIN-verified owner
  const isOwner = () => authed();

  // ------------------------------------------------------------------ troll / power effects (local to this device)
  const fx = { time: 1, speed: 1, flap: 1, grav: 1, bounce: 0, reverse: false, fly: false, autohonk: false, breadrain: false, god: false, on: {} };
  const FXD = [   // id, label, group (radio inside a group)
    ['flip', '🙃 Upside-down screen'], ['mirror', '🪞 Mirror screen'], ['spin', '🌀 Spinning screen'], ['drunk', '🍺 Drunk screen'], ['invert', '🌗 Invert colours'],
    ['gray', '⚫ Black & white'], ['hue', '🌈 Colour party'], ['blur', '😵 Blurry'], ['shake', '📳 Earthquake'], ['zoomin', '🔍 Zoomed way in'],
    ['reverse', '↔️ Reverse controls'], ['fly', '🕊 Jetpack (hold flap)'], ['autohonk', '📣 Auto-honk'], ['breadrain', '🍞 Bread rain'], ['bounce', '🏀 Super bouncy'],
    ['slow', '🐢 Slow motion', 'time'], ['fast', '⏩ Fast forward', 'time'],
    ['superflap', '🚀 Mega flaps', 'power'], ['megaspeed', '💨 Mega speed', 'power'],
    ['invgrav', '🙃 Gravity up!', 'grav'], ['lowgrav', '🌙 Tiny gravity', 'grav'], ['heavy', '⚓ Crushing gravity', 'grav']
  ];
  function recalc() {
    const o = fx.on;
    fx.time = o.slow ? 0.35 : o.fast ? 2 : 1; fx.speed = o.megaspeed ? 3 : 1; fx.flap = o.superflap ? 3 : 1;
    fx.grav = o.invgrav ? -0.5 : o.lowgrav ? 0.12 : o.heavy ? 3 : 1; fx.bounce = o.bounce ? 1.1 : 0;
    fx.reverse = !!o.reverse; fx.fly = !!o.fly; fx.autohonk = !!o.autohonk; fx.breadrain = !!o.breadrain;
    const h = document.documentElement; for (const d of FXD) h.classList.toggle('ofx-' + d[0], !!o[d[0]] && authed());
    if (A && A.ctl) A.ctl.applyFx();
  }
  function clearFx() { fx.on = {}; recalc(); }
  const css = document.createElement('style');
  css.textContent = `
  #ownBtn{position:fixed;top:max(6px,env(safe-area-inset-top));right:6px;z-index:2147483000;width:38px;height:38px;border-radius:50%;border:2px solid #fff;background:#d6192b;color:#fff;font:800 11px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.45);cursor:pointer;padding:0;display:none;line-height:1}
  #ownBtn:active{transform:scale(.93)}
  #ownerModal{z-index:2147483001}
  .ofx-flip canvas,.ofx-flip #h3,.ofx-flip #ch,.ofx-flip #crew{transform:rotate(180deg)}
  .ofx-mirror canvas,.ofx-mirror #h3,.ofx-mirror #ch,.ofx-mirror #crew{transform:scaleX(-1)}
  .ofx-spin canvas,.ofx-spin #h3,.ofx-spin #ch,.ofx-spin #crew{animation:ofxspin 9s linear infinite}
  .ofx-drunk canvas,.ofx-drunk #h3,.ofx-drunk #ch,.ofx-drunk #crew{animation:ofxdrunk 3.2s ease-in-out infinite}
  .ofx-shake canvas,.ofx-shake #h3,.ofx-shake #ch,.ofx-shake #crew{animation:ofxshake .12s linear infinite}
  .ofx-zoomin canvas,.ofx-zoomin #h3,.ofx-zoomin #ch,.ofx-zoomin #crew{transform:scale(1.8)}
  .ofx-invert canvas,.ofx-invert #h3,.ofx-invert #ch,.ofx-invert #crew{filter:invert(1)}
  .ofx-gray canvas,.ofx-gray #h3,.ofx-gray #ch,.ofx-gray #crew{filter:grayscale(1) contrast(1.2)}
  .ofx-hue canvas,.ofx-hue #h3,.ofx-hue #ch,.ofx-hue #crew{animation:ofxhue 2.5s linear infinite}
  .ofx-blur canvas,.ofx-blur #h3,.ofx-blur #ch,.ofx-blur #crew{filter:blur(3px)}
  @keyframes ofxspin{to{transform:rotate(360deg)}}
  @keyframes ofxdrunk{0%,100%{transform:rotate(-3deg) scale(1.06) translateX(-12px);filter:blur(1px)}50%{transform:rotate(3deg) scale(1.06) translateX(12px);filter:blur(2.5px)}}
  @keyframes ofxshake{0%{transform:translate(4px,3px)}25%{transform:translate(-5px,2px)}50%{transform:translate(3px,-4px)}75%{transform:translate(-3px,-3px)}100%{transform:translate(4px,3px)}}
  @keyframes ofxhue{to{filter:hue-rotate(360deg) saturate(2)}}
  .oprank{position:fixed;inset:0;z-index:2147483002;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:system-ui,sans-serif;cursor:pointer}`;
  document.head.appendChild(css);
  const ob = document.createElement('button'); ob.id = 'ownBtn'; ob.textContent = 'ADMIN'; ob.title = 'Owner panel'; ob.setAttribute('aria-label', 'Owner panel');
  ob.addEventListener('click', () => open()); document.body.appendChild(ob);
  const syncBtn = () => { ob.style.display = authed() ? 'block' : 'none'; };
  setInterval(() => { if (fx.autohonk && authed() && A && A.ctl) A.ctl.honk(); if (fx.breadrain && authed() && A) { A.save().bread += 7; A.refreshMenu(); } }, 900);

  function prank(kind) {
    const d = document.createElement('div'); d.className = 'oprank'; let n = 0, need = 3;
    const T = {
      crash: ['#0a4fb3', '#fff', '<div style="font-size:90px">:(</div><h2 style="margin:8px">Your goose ran into a problem</h2><p>We are collecting some error info and then we will honk again.<br>0% complete</p><p style="opacity:.6;font-size:12px">Stop code: TOO_MUCH_WOBBLE</p>'],
      banned: ['#1b0000', '#ff4d4d', '<div style="font-size:70px">🚫</div><h2 style="margin:8px">ACCOUNT SUSPENDED</h2><p>Your goose has been banned for<br>"excessive honking".</p><p style="opacity:.7;font-size:13px">Appeal in 99 years.</p>'],
      update: ['#101a3a', '#cfe0ff', '<div style="font-size:60px">⚙️</div><h2 style="margin:8px">Installing goose update 1 of 4,096</h2><p>Please do not close this tab.<br>Working on it… 3%</p>'],
      virus: ['#000', '#33ff66', '<pre style="text-align:left;font-size:13px;line-height:1.3">> GOOSE.EXE has detected 9,999 bread viruses\n> deleting all bread............\n> deleting neck..................\n> uploading honks to the cloud...\n> just kidding. Tap to continue.</pre>'],
      tax: ['#fff7d6', '#6b4a00', '<div style="font-size:60px">🍞</div><h2 style="margin:8px">BREAD TAX</h2><p>You owe the Goose Revenue Service<br>4,000,000 bread. (Just joking!)</p>']
    }[kind];
    d.style.background = T[0]; d.style.color = T[1]; d.innerHTML = T[2] + '<p style="opacity:.55;font-size:12px;margin-top:22px">(tap 3 times to close)</p>';
    d.addEventListener('click', () => { if (++n >= need) d.remove(); });
    document.body.appendChild(d);
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
  const CARD = '<div class="card" style="max-width:460px;width:94%;text-align:left;max-height:92vh;overflow:auto">';
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
  let tab = 'tools';
  function open() {
    if (box) box.remove();
    if (!authed()) return gate();
    const s = A.save();
    box = document.createElement('div'); box.className = 'overlay'; box.id = 'ownerModal';
    box.innerHTML = CARD + '<h2 style="text-align:center;margin:0">👑 Owner panel</h2>' +
      '<div style="text-align:center;font-size:12px;margin:2px 0 6px">PIN-verified owner: locks never apply to you.</div>' +
      '<div class="row" style="justify-content:center;gap:4px;margin-bottom:6px" id="ownTabs"></div><div id="ownBody"></div>' +
      '<div id="ownMsg" style="text-align:center;font-weight:700;min-height:20px;margin-top:6px;white-space:pre-wrap"></div>' +
      '<div class="row" style="margin-top:6px;justify-content:center"><button class="big small-btn ghost" id="ownList">All codes</button><button class="big small-btn ghost" id="ownResign">Lock &amp; sign out</button><button class="big small-btn ghost" id="ownClose">Close</button></div></div>';
    document.body.appendChild(box);
    const tabs = [['tools', '🛠 Tools'], ['troll', '😈 Troll'], ['pranks', '🎭 Pranks'], ['locks', '🔒 Locks']];
    for (const [id, l] of tabs) { const b = document.createElement('button'); b.className = tab === id ? 'big small-btn' : 'sec'; b.style.cssText = 'font-size:13px;padding:5px 9px'; b.textContent = l; b.addEventListener('click', () => { tab = id; open(); }); el('ownTabs').appendChild(b); }
    const body = el('ownBody'), grid = () => { const g = document.createElement('div'); g.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px'; body.appendChild(g); return g; };
    const tb = (g, label, fn, on) => { const b = document.createElement('button'); b.className = on ? 'big small-btn' : 'sec'; b.style.cssText = 'font-size:13px;padding:5px 9px'; b.textContent = label; b.addEventListener('click', () => { fn(); A.persist(); A.refreshMenu(); }); g.appendChild(b); return b; };
    const need = (c) => { if (blocks(c)) { say('🔒 "' + c + '" is locked.', true); return false; } return true; };
    const ctl = A.ctl || {};
    if (tab === 'tools') {
      const g = grid();
      tb(g, '+1,000 🍞', () => { s.bread += 1000; say('+1,000 bread'); });
      tb(g, '+1,000,000 🍞', () => { s.bread += 1000000; say('+1,000,000 bread'); });
      tb(g, 'Unlock all levels', () => { s.unlocked = A.levelCount(); s.allDone = true; say('All levels unlocked'); });
      tb(g, 'Own everything', () => { A.ownAll(); say('You own every item and skin'); });
      tb(g, '🛡 God mode: ' + (s.cheats.god ? 'ON' : 'off'), () => { s.cheats.admin = true; s.cheats.god = !s.cheats.god; A.applyCodes(); open(); }, s.cheats.god);
      tb(g, '⚙ Admin console', () => { s.cheats.admin = true; A.applyCodes(); say('Admin console is on: use the ⚙ button in the menu.'); });
      tb(g, '🏁 Win this level', () => { ctl.win && ctl.win(); close(); });
      tb(g, '🥚 Teleport to egg', () => { ctl.toEgg && ctl.toEgg(); close(); });
      tb(g, '💥 Kill all enemies', () => { ctl.killEnemies && ctl.killEnemies(); say('Enemies gone'); });
      tb(g, '⚡ Refill flaps', () => { ctl.refill && ctl.refill(); say('Flaps refilled'); });
      tb(g, '🔁 Respawn', () => { ctl.respawn && ctl.respawn(); close(); });
      tb(g, '🎲 Random teleport', () => { ctl.randTp && ctl.randTp(); close(); });
      tb(g, '📣 Honk storm', () => { let i = 0; const t = setInterval(() => { ctl.honk && ctl.honk(); if (++i > 14) clearInterval(t); }, 110); say('HONK'); });
      const n = document.createElement('div'); n.style.cssText = 'font-size:12px;opacity:.75;margin-top:8px'; n.textContent = 'Inside Hide & Seek 3D, Mecha Chameleon and Goose Among Us the owner also gets x-ray vision.'; body.appendChild(n);
    } else if (tab === 'troll') {
      const g = grid();
      for (const d of FXD) tb(g, d[1], () => { if (d[2]) { for (const o of FXD) if (o[2] === d[2] && o[0] !== d[0]) delete fx.on[o[0]]; } fx.on[d[0]] = !fx.on[d[0]]; recalc(); open(); }, fx.on[d[0]]);
      tb(g, '🧹 Reset all effects', () => { clearFx(); open(); });
      const n = document.createElement('div'); n.style.cssText = 'font-size:12px;opacity:.75;margin-top:8px'; n.textContent = 'These only change your own screen and goose on this device.'; body.appendChild(n);
    } else if (tab === 'pranks') {
      const g = grid();
      for (const [k, l] of [['crash', '💻 Fake crash'], ['banned', '🚫 Fake ban'], ['update', '⚙️ Fake update'], ['virus', '🦠 Fake virus'], ['tax', '🍞 Bread tax']]) tb(g, l, () => { close(); setTimeout(() => prank(k), 60); });
      const n = document.createElement('div'); n.style.cssText = 'font-size:12px;opacity:.75;margin-top:8px'; n.textContent = 'Hand someone your phone, close this, and press one. Tap the screen 3 times to dismiss. (Showing a prank to a friend is the only way, nothing is sent over the internet.)'; body.appendChild(n);
    } else {
      body.innerHTML = '<div style="font-size:13px;margin:4px 0">🔒 Lock codes for everybody. A locked code is dead for all other players until you unlock it.</div><div id="ownLocks" style="display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;font-size:14px"></div>' +
        '<div class="row" style="margin-top:6px;justify-content:center"><button class="big small-btn" id="ownSave">Save locks</button></div><div style="font-size:11px;opacity:.7;margin:4px 0">Never lockable: sync, codes, akif, rainbow, disco, zoom.</div>';
      const locks = el('ownLocks');
      for (const c of LOCKABLE) { const l = document.createElement('label'); l.style.cssText = 'display:flex;gap:6px;align-items:center'; const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = isLocked(c); cb.dataset.c = c; l.append(cb, document.createTextNode(c)); locks.appendChild(l); }
      el('ownSave').addEventListener('click', async () => {
        const list = Array.from(box.querySelectorAll('#ownLocks input')).filter((i) => i.checked).map((i) => i.dataset.c);
        say('Saving…');
        try { await call({ op: 'cfg-set', pin: get(LS.pin), locked: list }); cfg.locked = list; set(LS.locked, JSON.stringify(list)); A.applyCodes(); say('🔒 Saved. ' + (list.length ? 'Locked for everybody: ' + list.join(', ') : 'Nothing is locked.')); }
        catch (e) { say(e.message === 'badpin' ? 'PIN no longer matches. Sign in again.' : 'Could not save. Is the worker updated?', true); }
      });
    }
    el('ownClose').addEventListener('click', close);
    el('ownResign').addEventListener('click', resign);
    el('ownList').addEventListener('click', () => say('All codes:\n' + Object.keys(A.CHEATS).map((k) => k + ' = ' + A.CHEATS[k]).concat(Object.keys(A.GIFTS).map((k) => k + ' = ' + A.GIFTS[k] + ' (one-time)'), ['codes = your active codes', 'sync = save sync + lock', 'akif = this panel']).join('\n')));
  }
  function init(a) { A = a; refresh(); verifyStored(); setInterval(refresh, 600000); syncBtn(); recalc(); }
  root.Owner = { init, open, become, isLocked, blocks, isOwner, authed, refresh, LOCKABLE, fx };
})(window);
