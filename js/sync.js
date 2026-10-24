/*
 * Sync: type the code "sync" in the code box. Pick a secret word; it is permanently linked to your saved game on the
 * server (a Cloudflare KV store behind your worker), so your devices never need to be on at the same time. Enter the same
 * word on any device to pull your game down and merge it with what is on that device. After linking, the game
 * pulls when it opens and pushes (debounced) when you play. Merge rules:
 *   bread, unlocked levels, minigame bests -> the higher one      done / perfect levels, owned items, skins, custom geese -> everything from both
 *   best level times -> the faster one                            outfit, skin, difficulty, sound, etc. -> from whichever device was used most recently
 * 🔒 Lock: set a PIN and the word can only be loaded or changed with it (Unlock removes it; a forgotten PIN means the word stays locked).
 * (Admin/cheat codes are never synced.) Only a SHA-256 hash of the word is sent as the storage key; the word is the password,
 * so pick something unusual: anyone who knows it can read and replace that save.
 */
(function (root) {
  'use strict';
  const PREFIX = 'wobblesync-v1-';
  const MAP_KEYS = ['owned', 'skins', 'done', 'perfect'];
  const NUM_KEYS = ['bread', 'unlocked', 'stomps', 'lvv'];
  const BOOL_KEYS = ['allDone', 'mg', 'enemies', 'sound', 'neckMode'];
  const STR_KEYS = ['diff', 'skin', 'lastDaily'];
  const OBJ_KEYS = ['equip', 'tint', 'best', 'bestTime'];
  const slug = (w) => String(w || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // keep only the fields we know, with the right types (a stranger's data must never be trusted)
  function sanitize(o) {
    if (!isObj(o)) return null;
    let n = 0; const big = JSON.stringify(o); if (big.length > 400000) return null;
    const out = {};
    for (const k of NUM_KEYS) if (typeof o[k] === 'number' && isFinite(o[k])) out[k] = Math.max(0, Math.min(1e9, o[k]));
    for (const k of BOOL_KEYS) if (typeof o[k] === 'boolean') out[k] = o[k];
    for (const k of STR_KEYS) if (typeof o[k] === 'string') out[k] = o[k].slice(0, 60);
    if (typeof o.updatedAt === 'number' && isFinite(o.updatedAt)) out.updatedAt = o.updatedAt;
    for (const k of MAP_KEYS.concat(OBJ_KEYS)) {
      if (!isObj(o[k])) continue; const m = {};
      for (const key of Object.keys(o[k]).slice(0, 3000)) { const v = o[k][key]; if (typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && v.length < 40)) m[String(key).slice(0, 60)] = v; n++; }
      out[k] = m;
    }
    if (Array.isArray(o.custom)) out.custom = o.custom.filter((c) => isObj(c) && typeof c.id === 'string' && /^custom_[a-z0-9]+$/.test(c.id) && JSON.stringify(c).length < 6000).slice(0, 40);
    return out;
  }

  // merge two saves into one; `a` is this device's, `b` the other's
  function merge(a, b) {
    const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b, older = newer === a ? b : a;
    const r = Object.assign({}, clone(older), clone(newer));
    for (const k of NUM_KEYS) r[k] = Math.max(a[k] || 0, b[k] || 0);
    for (const k of ['allDone', 'mg']) r[k] = !!(a[k] || b[k]);
    for (const k of MAP_KEYS) r[k] = Object.assign({}, a[k] || {}, b[k] || {});
    r.bestTime = {}; for (const src of [a.bestTime || {}, b.bestTime || {}]) for (const k of Object.keys(src)) r.bestTime[k] = r.bestTime[k] == null ? src[k] : Math.min(r.bestTime[k], src[k]);
    r.best = {}; for (const src of [a.best || {}, b.best || {}]) for (const k of Object.keys(src)) r.best[k] = typeof src[k] === 'number' && typeof r.best[k] === 'number' ? Math.max(r.best[k], src[k]) : (r.best[k] == null ? src[k] : r.best[k]);
    const seen = {}; r.custom = [];
    for (const list of [newer.custom || [], older.custom || []]) for (const c of list) if (!seen[c.id]) { seen[c.id] = 1; r.custom.push(c); }
    for (const c of r.custom) r.skins[c.id] = true;
    if (r.skin && !r.skins[r.skin] && r.skin !== 'goose') r.skin = 'goose';
    r.skins.goose = true;
    return r;
  }

  // ------------------------------------------------------------------ server link
  const DEFAULT_URL = 'https://workers-playground-rapid-brook-325c.akifoskanbread.workers.dev';
  const LS = { key: 'wobbleSyncKey', pin: 'wobbleSyncPin', locked: 'wobbleSyncLocked' };
  const lsGet = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const lsSet = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  const url = () => { try { return localStorage.wobbleAiUrl || DEFAULT_URL; } catch (e) { return DEFAULT_URL; } };
  async function sha(text) {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const hashWord = (word) => sha('wobble-sync-v2:' + word);
  const hashPin = (key, pin) => sha('wobble-pin-v1:' + key + ':' + pin);
  async function call(body) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch(url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      if (r.status === 501) throw new Error('nokv');
      if (r.status === 403) throw new Error('locked');
      if (!r.ok) throw new Error('http' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }
  async function fetchRemote(key, pin) {
    const got = await call({ op: 'sync-get', key, pin: pin || undefined });
    if (got && got.denied) throw new Error('locked');
    return { remote: got && got.save ? sanitize(got.save) : null, locked: !!(got && got.locked) };
  }
  // pull the server copy, merge it with `local`, push the result; resolves { res, changed, created }
  async function exchange(key, local, pin) {
    const { remote } = await fetchRemote(key, pin);
    const res = remote ? merge(local, remote) : clone(local);
    res.updatedAt = Math.max(local.updatedAt || 0, remote ? remote.updatedAt || 0 : 0, remote ? 0 : Date.now());
    const strip = (o) => { const c = clone(o); delete c.updatedAt; delete c.cheats; return JSON.stringify(c, Object.keys(c).sort()); };
    await call({ op: 'sync-put', key, pin: pin || undefined, save: sanitize(res) });
    return { res, changed: !!remote && strip(res) !== strip(local), created: !remote };
  }

  // ------------------------------------------------------------------ the panel
  let ctx = null, box = null, pushTimer = 0, busy = false;
  const el = (id) => box && box.querySelector('#' + id);
  const say = (t, bad) => { const s = el('syncMsg'); if (s) { s.textContent = t; s.style.color = bad ? '#c62835' : ''; } };
  function close() { if (box) { box.remove(); box = null; } }
  const errText = (e) => (e && e.message === 'nokv' ? 'The server has no storage yet (add the SYNC binding to your worker).' : e && e.message === 'locked' ? '🔒 This word is locked. Type its PIN in the PIN box.' : 'Could not reach the server. Are you online?');

  function build() {
    if (box) box.remove();
    const linked = !!lsGet(LS.key), locked = linked && !!lsGet(LS.locked);
    box = document.createElement('div'); box.className = 'overlay'; box.id = 'syncModal';
    box.innerHTML = '<div class="card" style="max-width:400px;text-align:left"><h2 style="text-align:center">🔄 Sync your game</h2>' +
      '<p style="margin:4px 0 8px;font-size:14px">' + (linked ? 'This device is <b>linked</b>' + (locked ? ' and 🔒 <b>locked</b>' : '') + '. Your game saves to the server automatically.' : 'Pick a <b>secret word</b>. It is permanently linked to your saved game. Use the same word on any other device, any time.') + '</p>' +
      '<input id="syncWord" type="text" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + (linked ? 'type a word to switch, or leave empty' : 'a secret word (6+ letters)') + '" style="width:100%;box-sizing:border-box">' +
      '<input id="syncPin" type="password" maxlength="40" autocomplete="off" placeholder="PIN (only for locked words / to lock)" style="width:100%;box-sizing:border-box;margin-top:6px">' +
      '<div class="row" style="margin:8px 0 2px;justify-content:center;flex-wrap:wrap;gap:6px"><button class="big small-btn" id="syncGo">' + (linked ? '⇅ Sync now' : '🔗 Link &amp; Sync') + '</button><button class="big small-btn" id="syncLoad">⬇ Load</button>' +
      (linked ? (locked ? '<button class="big small-btn" id="syncUnlock">🔓 Unlock</button>' : '<button class="big small-btn" id="syncLock">🔒 Lock</button>') + '<button class="big small-btn ghost" id="syncOff">Unlink</button>' : '') + '<button class="big small-btn ghost" id="syncClose">Close</button></div>' +
      '<div id="syncMsg" style="margin-top:8px;text-align:center;font-weight:700;min-height:20px"></div>' +
      '<div style="font-size:11px;opacity:.7;margin-top:6px;text-align:center"><b>Sync</b> merges this device with the saved game (the higher bread is kept). <b>Load</b> replaces this device with the saved game. <b>Lock</b> needs a PIN to load or change that word; if you forget the PIN it stays locked. Codes are not synced.</div></div>';
    document.body.appendChild(box);
    el('syncClose').addEventListener('click', close);
    el('syncGo').addEventListener('click', () => run('sync'));
    el('syncLoad').addEventListener('click', () => run('load'));
    if (el('syncLock')) el('syncLock').addEventListener('click', () => setLock(true));
    if (el('syncUnlock')) el('syncUnlock').addEventListener('click', () => setLock(false));
    if (el('syncOff')) el('syncOff').addEventListener('click', () => { lsSet(LS.key, ''); lsSet(LS.pin, ''); lsSet(LS.locked, ''); build(); say('Unlinked. Your game stays on this device.'); });
    el('syncWord').addEventListener('keydown', (e) => { if (e.key === 'Enter') run('sync'); else if (e.key === 'Escape') close(); });
    setTimeout(() => { try { el('syncWord').focus(); } catch (e) { /* ignore */ } }, 50);
  }
  function open(c) { ctx = c; build(); }

  // work out which word/PIN to use: typed ones win, otherwise the linked ones
  async function creds() {
    const w = String(el('syncWord').value || '').trim().toLowerCase().replace(/\s+/g, ' '), p = el('syncPin').value;
    if (w) {
      if (w.length < 6) { say('Use at least 6 characters, and make it unusual.', true); return null; }
      const key = await hashWord(w); return { key, pin: p ? await hashPin(key, p) : '', typed: true };
    }
    const key = lsGet(LS.key);
    if (!key) { say('Type your secret word first.', true); return null; }
    return { key, pin: p ? await hashPin(key, p) : lsGet(LS.pin), typed: false };
  }
  function remember(c, locked) { lsSet(LS.key, c.key); lsSet(LS.pin, c.pin && locked ? c.pin : ''); lsSet(LS.locked, locked ? '1' : ''); }

  async function run(mode) {
    if (busy) return; busy = true; const go = el('syncGo'), ld = el('syncLoad'); go.disabled = ld.disabled = true; say('Connecting…');
    try {
      const c = await creds(); if (!c) { busy = false; go.disabled = ld.disabled = false; return; }
      if (mode === 'load') {
        const { remote } = await fetchRemote(c.key, c.pin);
        if (!remote) { say('Nothing is saved under that word yet.', true); }
        else if (!confirm('Replace this device\'s game with the saved one?')) { say('Cancelled.'); }
        else { remember(c, !!c.pin); say('✅ Loaded your saved game!'); ctx.apply(remote); setTimeout(() => { if (ctx.done) ctx.done(); }, 900); }
      } else {
        const r = await exchange(c.key, clone(ctx.getSave()), c.pin);
        remember(c, !!c.pin);
        say(r.created ? '✅ Linked! Your game is saved to this word. Use it on your other devices.' : '✅ Synced! Your game is merged with the saved one.');
        if (r.changed || r.created) ctx.apply(r.res);
        setTimeout(() => { if (ctx.done) ctx.done(); }, 1100);
      }
    } catch (e) { say(errText(e), true); }
    busy = false; if (go) go.disabled = false; if (ld) ld.disabled = false;
  }

  async function setLock(on) {
    if (busy) return; busy = true;
    try {
      const key = lsGet(LS.key), p = el('syncPin').value;
      if (!key) say('Link a word first.', true);
      else if (on && p.length < 4) say('Type a PIN of 4+ characters in the PIN box, then tap Lock.', true);
      else {
        const pin = p ? await hashPin(key, p) : lsGet(LS.pin);
        await call({ op: on ? 'sync-lock' : 'sync-unlock', key, pin });
        lsSet(LS.pin, on ? pin : ''); lsSet(LS.locked, on ? '1' : '');
        build(); say(on ? '🔒 Locked. Loading or changing this word now needs your PIN. Remember it!' : '🔓 Unlocked.');
      }
    } catch (e) { say(e.message === 'locked' ? 'Wrong PIN.' : errText(e), true); }
    busy = false;
  }

  // ------------------------------------------------------------------ automatic sync once linked
  async function auto(c) {                         // call once at start-up
    ctx = c; const key = lsGet(LS.key); if (!key) return;
    try {
      const r = await exchange(key, clone(c.getSave()), lsGet(LS.pin));
      let again = false; try { again = sessionStorage.getItem('wobbleSyncPulled') === '1'; sessionStorage.setItem('wobbleSyncPulled', '1'); } catch (e) { /* ignore */ }
      if (r.changed && !again) { c.apply(r.res); if (c.done) c.done(); }
    } catch (e) { /* offline or locked: try again next time */ }
  }
  function touch() {                               // call after every save; pushes at most every 20 s
    const key = lsGet(LS.key); if (!key || !ctx || pushTimer) return;
    pushTimer = setTimeout(() => { pushTimer = 0; exchange(key, clone(ctx.getSave()), lsGet(LS.pin)).catch(() => {}); }, 20000);
  }

  const api = { open, close, auto, touch, merge, sanitize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sync = api;
})(typeof window !== 'undefined' ? window : globalThis);
