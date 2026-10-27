/*
 * Tweaks: safe, reversible game customisation that Chungas can apply (and anyone can reset). Every value goes through a strict
 * schema with clamped ranges, so nothing a tweak does can break saves, accounts or the game's code. Stored per device in
 * localStorage ("wobbleTweaks"). Tweaks.v(key) gives a multiplier the game reads; visual ones are applied here.
 */
(function (root) {
  'use strict';
  const DEF = { gravity: 1, speed: 1, neck: 1, hue: 0, tint: '#ffffff', tintA: 0, title: '', rain: '' };
  const RAIN = ['', '🍞', '🪿', '⭐', '❄️', '🌸', '🎈'];
  // [min, max] for the owner, and the narrower range a head admin may use
  const LIM = { gravity: [[0.5, 1.6], [0.8, 1.2]], speed: [[0.6, 1.8], [0.9, 1.3]], neck: [[0.6, 1.8], [0.9, 1.3]], hue: [[0, 360], [0, 360]], tintA: [[0, 0.3], [0, 0.3]] };
  const BAD = /(fuck|shit|bitch|cunt|nigg|fag|slut|whore|dick|porn|sex|rape|nazi|hitler|kys)/i;
  let cur = Object.assign({}, DEF), stack = [];
  const lsGet = () => { try { return JSON.parse(root.localStorage.getItem('wobbleTweaks') || 'null'); } catch (e) { return null; } };
  const lsSet = () => { try { root.localStorage.setItem('wobbleTweaks', JSON.stringify(cur)); } catch (e) { /* ignore */ } };
  const num = (x) => (typeof x === 'number' && isFinite(x) ? x : NaN);
  // returns { ok, value } or { ok:false, why }
  function check(key, value, tier) {
    if (!(key in DEF)) return { ok: false, why: 'unknown tweak "' + key + '". I can change: ' + Object.keys(DEF).join(', ') };
    if (LIM[key]) { let v = num(typeof value === 'string' ? parseFloat(value) : value); if (isNaN(v)) return { ok: false, why: 'that needs a number' }; const L = LIM[key][tier === 'deputy' ? 0 : 1]; v = Math.max(L[0], Math.min(L[1], v)); return { ok: true, value: Math.round(v * 100) / 100 }; }
    if (key === 'tint') { const s = String(value || '').trim(); return /^#[0-9a-f]{6}$/i.test(s) ? { ok: true, value: s.toLowerCase() } : { ok: false, why: 'colour must look like #ff8800' }; }
    if (key === 'rain') return RAIN.includes(value) ? { ok: true, value } : { ok: false, why: 'rain can be ' + RAIN.filter(Boolean).join(' ') + ' or empty' };
    if (key === 'title') {
      const s = String(value || '').replace(/[^\p{L}\p{N} !?.'\-\u{1F300}-\u{1FAFF}☀-➿]/gu, '').trim().slice(0, 24);
      if (BAD.test(s)) return { ok: false, why: 'that title is not allowed' }; return { ok: true, value: s };
    }
    return { ok: false, why: 'no' };
  }
  function snapshot() { stack.push(JSON.stringify(cur)); if (stack.length > 10) stack.shift(); }
  function set(key, value, tier) { const c = check(key, value, tier); if (!c.ok) return c; snapshot(); cur[key] = c.value; lsSet(); apply(); return c; }
  function reset() { snapshot(); cur = Object.assign({}, DEF); lsSet(); apply(); return true; }
  function undo() { const s = stack.pop(); if (!s) return false; cur = Object.assign({}, DEF, JSON.parse(s)); lsSet(); apply(); return true; }
  const v = (k) => cur[k];
  let rainEl = null, tintEl = null, titleDef = null;
  function apply() {
    const d = root.document; if (!d || !d.body) return;
    const cv = d.getElementById('game'); if (cv) cv.style.filter = cur.hue ? 'hue-rotate(' + cur.hue + 'deg)' : '';
    if (!tintEl) { tintEl = d.createElement('div'); tintEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1'; d.body.appendChild(tintEl); }
    tintEl.style.background = cur.tint; tintEl.style.opacity = String(cur.tintA);
    const h = d.querySelector('#title h1'); if (h) { if (titleDef == null) titleDef = h.textContent; h.textContent = cur.title || titleDef; }
    if (!rainEl) { rainEl = d.createElement('div'); rainEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;overflow:hidden'; const st = d.createElement('style'); st.textContent = '@keyframes twFall{from{transform:translateY(-10vh)}to{transform:translateY(110vh)}}'; d.head.appendChild(st); d.body.appendChild(rainEl); }
    rainEl.innerHTML = '';
    if (cur.rain) for (let i = 0; i < 14; i++) { const e = d.createElement('div'); e.textContent = cur.rain; e.style.cssText = 'position:absolute;top:0;left:' + (i * 7.2 + (i % 3) * 2) + '%;font-size:' + (18 + (i % 4) * 6) + 'px;opacity:.75;animation:twFall ' + (6 + (i % 5) * 1.7) + 's linear ' + (-i * 0.9) + 's infinite'; rainEl.appendChild(e); }
    if (root.Tweaks && root.Tweaks.onChange) root.Tweaks.onChange();
  }
  function init() { const s = lsGet(); if (s && typeof s === 'object') for (const k of Object.keys(DEF)) { const c = check(k, s[k], 'deputy'); if (c.ok) cur[k] = c.value; } apply(); }
  root.Tweaks = { v, set, check, reset, undo, list: () => Object.assign({}, cur), init, DEF, onChange: null };
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init); else init();
})(window);
