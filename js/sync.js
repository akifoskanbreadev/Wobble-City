/*
 * Sync: type the code "sync" in the code box to open this panel. Both devices type the SAME secret word; they find each
 * other through the PeerJS public broker (same as multiplayer rooms) and then talk directly. Nothing is stored online.
 * Both devices must be open at the same time. A 4-digit check code is shown on both so a stranger who guesses your word
 * can't quietly take your data. When you agree, the two saves are MERGED and both devices end up with the same data:
 *   bread, unlocked levels, minigame bests -> the higher one      done / perfect levels, owned items, skins, custom geese -> everything from both
 *   best level times -> the faster one                            outfit, skin, difficulty, sound, etc. -> from whichever device was used most recently
 * (Admin/cheat codes are never synced: each device keeps its own.)
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

  // ------------------------------------------------------------------ the panel
  let peer = null, conn = null, isHost = false, st = null, timer = 0, ctx = null, box = null;
  const el = (id) => box && box.querySelector('#' + id);
  const say = (t, bad) => { const s = el('syncMsg'); if (s) { s.textContent = t; s.style.color = bad ? '#c62835' : ''; } };
  function stop() { clearTimeout(timer); try { if (conn) conn.close(); } catch (e) { /* ignore */ } try { if (peer) peer.destroy(); } catch (e) { /* ignore */ } peer = conn = null; st = null; }
  function close() { stop(); if (box) { box.remove(); box = null; } }
  function show(step) { for (const id of ['syncStep1', 'syncStep2']) { const e = el(id); if (e) e.style.display = id === step ? '' : 'none'; } }

  function build() {
    if (box) box.remove();
    box = document.createElement('div'); box.className = 'overlay'; box.id = 'syncModal';
    box.innerHTML = '<div class="card" style="max-width:380px;text-align:left"><h2 style="text-align:center">🔄 Sync your game</h2>' +
      '<div id="syncStep1"><p style="margin:4px 0 8px;font-size:14px">Type the <b>same secret word</b> on both devices, with the game open on both at the same time. Your data is merged and both end up the same.</p>' +
      '<input id="syncWord" type="text" maxlength="32" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="a secret word (5+ letters)" style="width:100%;box-sizing:border-box">' +
      '<div class="row" style="margin:8px 0 2px;justify-content:center"><button class="big small-btn" id="syncGo">Connect</button><button class="big small-btn ghost" id="syncClose">Close</button></div></div>' +
      '<div id="syncStep2" style="display:none"><p style="margin:4px 0;font-size:14px;text-align:center">Both screens should show the same code:</p><div id="syncCode" style="font-size:44px;font-weight:900;letter-spacing:8px;text-align:center;margin:4px 0"></div>' +
      '<div id="syncSum" style="font-size:12px;opacity:.8;text-align:center;margin-bottom:6px"></div>' +
      '<div class="row" style="justify-content:center"><button class="big small-btn" id="syncOk">Same code · Sync!</button><button class="big small-btn ghost" id="syncNo">Cancel</button></div></div>' +
      '<div id="syncMsg" style="margin-top:8px;text-align:center;font-weight:700;min-height:20px"></div>' +
      '<div style="font-size:11px;opacity:.7;margin-top:6px;text-align:center">Sent straight between your two devices, nothing is stored online. Bread: the higher total is kept. Codes are not synced.</div></div>';
    document.body.appendChild(box);
    el('syncClose').addEventListener('click', close);
    el('syncGo').addEventListener('click', () => connect(el('syncWord').value));
    el('syncWord').addEventListener('keydown', (e) => { if (e.key === 'Enter') connect(el('syncWord').value); else if (e.key === 'Escape') close(); });
    el('syncNo').addEventListener('click', () => { stop(); show('syncStep1'); say(''); });
    el('syncOk').addEventListener('click', () => { st.me = true; el('syncOk').disabled = true; send({ t: 'ok' }); say('Waiting for the other device to confirm…'); progress(); });
    setTimeout(() => { try { el('syncWord').focus(); } catch (e) { /* ignore */ } }, 50);
  }
  function open(c) { ctx = c; build(); show('syncStep1'); }

  function send(o) { try { if (conn && conn.open) conn.send(o); } catch (e) { /* ignore */ } }
  function connect(w) {
    const word = slug(w);
    if (word.length < 5) return say('Use a word with at least 5 letters or digits, and make it unusual.', true);
    if (!root.Peer) return say('Could not load the connection library. Are you online?', true);
    stop(); st = { me: false, them: false, data: null, code: '' }; say('Looking for your other device…');
    timer = setTimeout(() => { stop(); show('syncStep1'); say('Nothing found. Open the game on your other device, enter sync and the same word, then try again.', true); }, 90000);
    tryHost(word, 0);
  }
  function tryHost(word, tries) {
    const p = new root.Peer(PREFIX + word, { debug: 0 }); peer = p;
    p.on('open', () => { isHost = true; say('Waiting for your other device to enter “' + word + '”…'); });
    p.on('connection', (c) => {
      if (conn) { try { c.close(); } catch (e) { /* ignore */ } return; }       // only one partner
      conn = c; hook(c);
      c.on('open', () => { st.code = String(1000 + Math.floor(Math.random() * 9000)); send({ t: 'code', code: st.code }); askCode(); });
      if (c.open) { st.code = String(1000 + Math.floor(Math.random() * 9000)); send({ t: 'code', code: st.code }); askCode(); }
    });
    p.on('error', (e) => {
      if (e.type === 'unavailable-id') { try { p.destroy(); } catch (x) { /* ignore */ } guest(word, tries); }
      else if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') { stop(); show('syncStep1'); say('Could not reach the connection server. Try again in a moment.', true); }
    });
  }
  function guest(word, tries) {
    const p = new root.Peer(undefined, { debug: 0 }); peer = p; isHost = false;
    p.on('open', () => { const c = p.connect(PREFIX + word, { reliable: true, serialization: 'json' }); conn = c; hook(c); c.on('open', () => send({ t: 'hello' })); });
    p.on('error', (e) => {
      if (e.type === 'peer-unavailable') { try { p.destroy(); } catch (x) { /* ignore */ } if (tries > 3) { stop(); show('syncStep1'); return say('Could not find the other device.', true); } setTimeout(() => tryHost(word, tries + 1), 1200); }
      else { stop(); show('syncStep1'); say('Connection problem: ' + (e.type || e), true); }
    });
  }
  function hook(c) {
    c.on('data', (m) => onMsg(m));
    c.on('close', () => { if (st && !st.done) { stop(); show('syncStep1'); say('The other device disconnected.', true); } });
    c.on('error', () => { if (st && !st.done) { stop(); show('syncStep1'); say('Connection problem. Try again.', true); } });
  }
  function askCode() { clearTimeout(timer); timer = setTimeout(() => { stop(); show('syncStep1'); say('Timed out.', true); }, 120000); el('syncCode').textContent = st.code; const s = ctx.getSave(); el('syncSum').textContent = 'This device: ' + (s.bread | 0) + ' 🍞 · ' + Object.keys(s.done || {}).length + ' levels done'; show('syncStep2'); el('syncOk').disabled = false; say(''); }
  function onMsg(m) {
    if (!st || !isObj(m)) return;
    if (m.t === 'code' && !isHost && typeof m.code === 'string' && /^\d{4}$/.test(m.code)) { st.code = m.code; askCode(); }
    else if (m.t === 'ok') { st.them = true; progress(); }
    else if (m.t === 'data' && isHost) { st.data = sanitize(m.save); if (!st.data) { say('The other device sent something unreadable.', true); stop(); return; } progress(); }
    else if (m.t === 'merged' && !isHost) { const r = sanitize(m.save); if (!r) { say('Got something unreadable.', true); stop(); return; } finish(r); }
  }
  function progress() {
    if (!st || !st.me || !st.them) return;
    if (isHost) { if (!st.data) return; const local = ctx.getSave(), res = merge(local, st.data); res.updatedAt = Date.now(); send({ t: 'merged', save: res }); finish(res); }
    else if (!st.sent) { st.sent = true; send({ t: 'data', save: clone(ctx.getSave()) }); }
  }
  function finish(res) {
    st.done = true; clearTimeout(timer); say('✅ Synced! Both devices now match.'); el('syncOk').disabled = true;
    ctx.apply(res);
    setTimeout(() => { try { if (conn) conn.close(); } catch (e) { /* ignore */ } try { if (peer) peer.destroy(); } catch (e) { /* ignore */ } if (ctx.done) ctx.done(); }, 900);
  }

  const api = { open, close, merge, sanitize, PREFIX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sync = api;
})(typeof window !== 'undefined' ? window : globalThis);
