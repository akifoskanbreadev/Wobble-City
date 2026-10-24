/*
 * Sync: type the code "sync" in the code box. Pick a secret word; it is permanently linked to your saved game on the
 * server (a Cloudflare KV store behind your worker), so your devices never need to be on at the same time. Enter the same
 * word on any device to pull your game down and merge it with what is on that device. After linking, the game
 * pulls when it opens and pushes (debounced) when you play. Merge rules:
 *   bread, unlocked levels, minigame bests -> the higher one      done / perfect levels, owned items, skins, custom geese -> everything from both
 *   best level times -> the faster one                            outfit, skin, difficulty, sound, etc. -> from whichever device was used most recently
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
  const LS = { key: 'wobbleSyncKey' };
  const url = () => { try { return localStorage.wobbleAiUrl || DEFAULT_URL; } catch (e) { return DEFAULT_URL; } };
  async function hashWord(word) {
    const buf = new TextEncoder().encode('wobble-sync-v2:' + word);
    const h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  async function call(body) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch(url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      if (r.status === 501) throw new Error('nokv');
      if (!r.ok) throw new Error('http' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }
  // pull the server copy, merge it with `local`, push the result; resolves { res, changed, created }
  async function exchange(key, local) {
    const got = await call({ op: 'sync-get', key });
    const remote = got && got.save ? sanitize(got.save) : null;
    const res = remote ? merge(local, remote) : clone(local);
    res.updatedAt = Math.max(local.updatedAt || 0, remote ? remote.updatedAt || 0 : 0, remote ? 0 : Date.now());
    const strip = (o) => { const c = clone(o); delete c.updatedAt; delete c.cheats; return JSON.stringify(c, Object.keys(c).sort()); };
    await call({ op: 'sync-put', key, save: sanitize(res) });
    return { res, changed: !!remote && strip(res) !== strip(local), created: !remote };
  }

  // ------------------------------------------------------------------ the panel
  let ctx = null, box = null, pushTimer = 0, busy = false;
  const el = (id) => box && box.querySelector('#' + id);
  const say = (t, bad) => { const s = el('syncMsg'); if (s) { s.textContent = t; s.style.color = bad ? '#c62835' : ''; } };
  const getKey = () => { try { return localStorage.getItem(LS.key) || ''; } catch (e) { return ''; } };
  function close() { if (box) { box.remove(); box = null; } }
  const errText = (e) => (e && e.message === 'nokv' ? 'The server has no storage yet (add the SYNC binding to your worker, see the README).' : 'Could not reach the server. Are you online?');

  function build() {
    if (box) box.remove();
    const linked = !!getKey();
    box = document.createElement('div'); box.className = 'overlay'; box.id = 'syncModal';
    box.innerHTML = '<div class="card" style="max-width:380px;text-align:left"><h2 style="text-align:center">🔄 Sync your game</h2>' +
      '<p style="margin:4px 0 8px;font-size:14px">' + (linked ? 'This device is <b>linked</b>. Your game saves to the server automatically. Enter another word to switch.' : 'Pick a <b>secret word</b>. It is permanently linked to your saved game. Enter the same word on any other device, any time (they never need to be on together).') + '</p>' +
      '<input id="syncWord" type="text" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="a secret word (6+ letters)" style="width:100%;box-sizing:border-box">' +
      '<div class="row" style="margin:8px 0 2px;justify-content:center"><button class="big small-btn" id="syncGo">' + (linked ? 'Link / Sync now' : 'Link &amp; Sync') + '</button>' + (linked ? '<button class="big small-btn ghost" id="syncOff">Unlink</button>' : '') + '<button class="big small-btn ghost" id="syncClose">Close</button></div>' +
      '<div id="syncMsg" style="margin-top:8px;text-align:center;font-weight:700;min-height:20px"></div>' +
      '<div style="font-size:11px;opacity:.7;margin-top:6px;text-align:center">Anyone who knows your word can load or replace that game, so make it unusual. Bread: the higher total is kept. Codes are not synced.</div></div>';
    document.body.appendChild(box);
    el('syncClose').addEventListener('click', close);
    el('syncGo').addEventListener('click', () => link(el('syncWord').value));
    if (el('syncOff')) el('syncOff').addEventListener('click', () => { try { localStorage.removeItem(LS.key); } catch (e) { /* ignore */ } build(); say('Unlinked. Your game stays on this device.'); });
    el('syncWord').addEventListener('keydown', (e) => { if (e.key === 'Enter') link(el('syncWord').value); else if (e.key === 'Escape') close(); });
    setTimeout(() => { try { el('syncWord').focus(); } catch (e) { /* ignore */ } }, 50);
  }
  function open(c) { ctx = c; build(); }

  async function link(w) {
    const word = String(w || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (word.length < 6) return say('Use at least 6 characters, and make it unusual.', true);
    if (busy) return; busy = true; el('syncGo').disabled = true; say('Connecting…');
    try {
      const key = await hashWord(word);
      const r = await exchange(key, clone(ctx.getSave()));
      try { localStorage.setItem(LS.key, key); } catch (e) { /* ignore */ }
      say(r.created ? '✅ Linked! Your game is saved to this word. Use it on your other devices.' : '✅ Synced! Your game is merged with the saved one.');
      if (r.changed || r.created) ctx.apply(r.res);
      setTimeout(() => { if (ctx.done) ctx.done(); }, 1100);
    } catch (e) { say(errText(e), true); el('syncGo').disabled = false; }
    busy = false;
  }

  // ------------------------------------------------------------------ automatic sync once linked
  async function auto(c) {                         // call once at start-up
    ctx = c; const key = getKey(); if (!key) return;
    try {
      const r = await exchange(key, clone(c.getSave()));
      let again = false; try { again = sessionStorage.getItem('wobbleSyncPulled') === '1'; sessionStorage.setItem('wobbleSyncPulled', '1'); } catch (e) { /* ignore */ }
      if (r.changed && !again) { c.apply(r.res); if (c.done) c.done(); }
    } catch (e) { /* offline: try again next time */ }
  }
  function touch() {                               // call after every save; pushes at most every 20 s
    const key = getKey(); if (!key || !ctx || pushTimer) return;
    pushTimer = setTimeout(() => { pushTimer = 0; exchange(key, clone(ctx.getSave())).catch(() => {}); }, 20000);
  }

  const api = { open, close, auto, touch, merge, sanitize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sync = api;
})(typeof window !== 'undefined' ? window : globalThis);
