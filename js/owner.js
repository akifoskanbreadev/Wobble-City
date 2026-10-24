/*
 * Owner status. Type the code "akif": you become the OWNER on this device and get the Owner panel.
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
  const isOwner = () => !!(A && A.save().cheats && A.save().cheats.owner);

  async function refresh() {
    try {
      const r = await call({ op: 'cfg-get' });
      cfg.locked = (r.locked || []).filter((c) => LOCKABLE.includes(c)); cfg.pinSet = !!r.pinSet; set(LS.locked, JSON.stringify(cfg.locked));
      if (get(LS.pin) && A) { const bad = A.save().cheats && !A.save().cheats.owner; if (bad) set(LS.pin, ''); }
      if (A) A.applyCodes();
      return true;
    } catch (e) { return false; }
  }

  // ------------------------------------------------------------------ the panel
  const el = (id) => box && box.querySelector('#' + id);
  const say = (t, bad) => { const s = el('ownMsg'); if (s) { s.textContent = t; s.style.color = bad ? '#c62835' : ''; } };
  function close() { if (box) { box.remove(); box = null; } }
  function become() {
    const s = A.save(); s.cheats.owner = true;
    for (const k of ['money', 'levels', 'lol', 'flaps', 'admin']) if (!blocks(k)) s.cheats[k] = true;
    A.applyCodes(); open();
  }
  function resign() { const s = A.save(); for (const k of ['owner', 'god', 'money', 'levels', 'lol', 'flaps', 'admin']) delete s.cheats[k]; set(LS.pin, ''); A.applyCodes(); close(); }
  function open() {
    if (box) box.remove();
    const verified = authed(), s = A.save();
    box = document.createElement('div'); box.className = 'overlay'; box.id = 'ownerModal';
    box.innerHTML = '<div class="card" style="max-width:440px;width:94%;text-align:left;max-height:92vh;overflow:auto"><h2 style="text-align:center;margin:0">👑 Owner panel</h2>' +
      '<div style="text-align:center;font-size:13px;margin:2px 0 8px">' + (verified ? '✅ PIN-verified owner: locks do not apply to you' : 'Owner on this device. Set or enter the PIN to lock codes for everyone.') + '</div>' +
      '<h4 style="margin:6px 0 3px">Owner PIN</h4><div style="display:flex;gap:6px"><input id="ownPin" type="password" maxlength="40" placeholder="' + (cfg.pinSet === false ? 'choose a PIN (6+ characters)' : 'owner PIN') + '" style="flex:1;min-width:0"><button class="big small-btn" id="ownPinGo">' + (cfg.pinSet === false ? 'Set PIN' : 'Verify') + '</button></div>' +
      '<h4 style="margin:10px 0 3px">Tools</h4><div id="ownTools" style="display:flex;flex-wrap:wrap;gap:6px"></div>' +
      '<h4 style="margin:10px 0 3px">🔒 Lock codes for everybody' + (verified ? '' : ' (verify PIN first)') + '</h4><div id="ownLocks" style="display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;font-size:14px"></div>' +
      '<div class="row" style="margin-top:6px;justify-content:center"><button class="big small-btn" id="ownSave"' + (verified ? '' : ' disabled') + '>Save locks</button></div>' +
      '<div style="font-size:11px;opacity:.7;margin:4px 0">Never lockable: sync, codes, akif, rainbow, disco, zoom.</div>' +
      '<div id="ownMsg" style="text-align:center;font-weight:700;min-height:20px;margin-top:4px;white-space:pre-wrap"></div>' +
      '<div class="row" style="justify-content:center;margin-top:6px"><button class="big small-btn ghost" id="ownList">All codes</button><button class="big small-btn ghost" id="ownResign">Resign owner</button><button class="big small-btn ghost" id="ownClose">Close</button></div></div>';
    document.body.appendChild(box);
    const tools = el('ownTools');
    const tb = (label, fn) => { const b = document.createElement('button'); b.className = 'sec'; b.style.cssText = 'font-size:13px;padding:5px 9px'; b.textContent = label; b.addEventListener('click', () => { fn(); A.persist(); A.refreshMenu(); }); tools.appendChild(b); return b; };
    const need = (c) => { if (blocks(c)) { say('🔒 "' + c + '" is locked.', true); return false; } return true; };
    tb('+1000 🍞', () => { if (!need('bread')) return; s.bread += 1000; say('+1000 bread'); });
    tb('Unlock all levels', () => { if (!need('levels')) return; s.unlocked = A.levelCount(); s.allDone = true; say('All levels unlocked'); });
    tb('Own everything', () => { if (!need('skins') || !need('clothes')) return; A.ownAll(); say('You own every item and skin'); });
    tb((s.cheats.god ? '🛡 God mode: ON' : '🛡 God mode: off'), () => { if (!need('admin')) return; s.cheats.admin = true; s.cheats.god = !s.cheats.god; A.applyCodes(); open(); });
    tb('⚙ Admin console', () => { if (!need('admin')) return; s.cheats.admin = true; A.applyCodes(); say('Admin console is on: use the ⚙ button in the menu.'); });
    const locks = el('ownLocks');
    for (const c of LOCKABLE) { const l = document.createElement('label'); l.style.cssText = 'display:flex;gap:6px;align-items:center'; const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = isLocked(c); cb.disabled = !verified; cb.dataset.c = c; l.append(cb, document.createTextNode(c + (A.CHEATS[c] ? ' – ' + A.CHEATS[c].split(' ').slice(0, 2).join(' ') : ''))); locks.appendChild(l); }
    el('ownClose').addEventListener('click', close);
    el('ownResign').addEventListener('click', resign);
    el('ownList').addEventListener('click', () => say('All codes:\n' + Object.keys(A.CHEATS).map((k) => k + ' = ' + A.CHEATS[k]).concat(Object.keys(A.GIFTS).map((k) => k + ' = ' + A.GIFTS[k] + ' (one-time)'), ['codes = your active codes', 'sync = save sync + lock', 'akif = this panel']).join('\n')));
    el('ownPinGo').addEventListener('click', async () => {
      const p = el('ownPin').value; if (p.length < 6) return say('Use at least 6 characters.', true);
      say('Checking…');
      try {
        const h = await hashPin(p);
        if (cfg.pinSet === false) { await call({ op: 'cfg-pin', pin: h }); cfg.pinSet = true; set(LS.pin, h); say('✅ PIN set. You are the owner.'); }
        else { await call({ op: 'cfg-auth', pin: h }); set(LS.pin, h); say('✅ Verified.'); }
        setTimeout(open, 600);
      } catch (e) { say(e.message === 'badpin' ? 'Wrong PIN (or one is already set).' : e.message === 'nokv' ? 'The server storage is not set up yet (update the worker).' : 'Could not reach the server.', true); }
    });
    el('ownSave').addEventListener('click', async () => {
      const list = Array.from(box.querySelectorAll('#ownLocks input')).filter((i) => i.checked).map((i) => i.dataset.c);
      say('Saving…');
      try { await call({ op: 'cfg-set', pin: get(LS.pin), locked: list }); cfg.locked = list; set(LS.locked, JSON.stringify(list)); A.applyCodes(); say('🔒 Saved. ' + (list.length ? 'Locked for everybody: ' + list.join(', ') : 'Nothing is locked.')); }
      catch (e) { say(e.message === 'badpin' ? 'PIN no longer matches. Verify again.' : 'Could not save. Is the worker updated?', true); }
    });
    if (cfg.pinSet == null) refresh().then((ok) => { if (ok && box) open(); });
  }
  function init(a) { A = a; refresh(); setInterval(refresh, 600000); }
  root.Owner = { init, open, become, isLocked, blocks, isOwner, authed, refresh, LOCKABLE };
})(window);
