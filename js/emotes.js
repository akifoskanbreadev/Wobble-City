/*
 * Emotes: tap 😀 (or press E) in a level to pop an emote bubble over your goose. In multiplayer everyone sees it.
 * Free emotes come with the game, more are sold in the shop's 😀 Emotes tab.
 * Also here: the 📅 Daily Challenge button on the main menu.
 */
(function (root) {
  'use strict';
  const C = root.Clothes;
  const W = () => root.__wobble && root.__wobble.save;
  const LIST = [
    // id, emoji, name, price, motion
    ['wave', '👋', 'Wave', 0, 'shake'], ['laugh', '😂', 'Laugh', 0, 'bounce'], ['heart', '❤️', 'Love', 0, 'pop'], ['thumb', '👍', 'Thumbs Up', 0, 'pop'], ['cry', '😢', 'Cry', 0, 'shake'], ['honk', '🪿', 'Honk!', 0, 'bounce'],
    ['party', '🎉', 'Party', 25, 'bounce'], ['cool', '😎', 'Cool', 25, 'pop'], ['think', '🤔', 'Hmm', 20, 'shake'], ['angry', '😡', 'Angry', 20, 'shake'], ['sleep', '😴', 'Sleepy', 20, 'float'],
    ['clap', '👏', 'Clap', 30, 'bounce'], ['fire', '🔥', 'On Fire', 40, 'bounce'], ['skull', '💀', 'Dead', 35, 'spin'], ['mind', '🤯', 'Mind Blown', 45, 'shake'], ['scared', '😱', 'Scream', 35, 'shake'],
    ['pleading', '🥺', 'Please?', 30, 'pop'], ['bread', '🍞', 'Bread!', 30, 'bounce'], ['egg', '🥚', 'Egg', 30, 'spin'], ['music', '🎵', 'Jam', 40, 'float'], ['dance', '💃', 'Dance', 60, 'spin'],
    ['crown', '👑', 'Royal', 90, 'pop'], ['rainbow', '🌈', 'Rainbow', 70, 'float'], ['star', '⭐', 'Star', 50, 'spin'], ['gg', '🤝', 'Good Game', 40, 'pop'], ['ghost', '👻', 'Boo', 55, 'float'],
    ['alien', '👽', 'Alien', 80, 'spin'], ['rocket', '🚀', 'Zoom', 75, 'float'], ['diamond', '💎', 'Bling', 120, 'spin'], ['unicorn', '🦄', 'Magical', 100, 'bounce'], ['poop', '💩', 'Oops', 45, 'bounce'],
    ['sparkle', '✨', 'Sparkle', 50, 'spin'], ['pizza', '🍕', 'Pizza Time', 40, 'bounce'], ['trophy', '🏆', 'Champion', 110, 'pop'], ['wink', '😉', 'Wink', 25, 'pop'], ['hundred', '💯', 'Perfect', 60, 'bounce'], ['cat', '😺', 'Meow', 35, 'shake'], ['moon', '🌙', 'Goodnight', 45, 'float'], ['bomb', '💣', 'Boom', 65, 'shake'], ['eyes', '👀', 'Watching', 30, 'shake'], ['rich', '🤑', 'Rich', 85, 'bounce'], ['salute', '🫡', 'Salute', 35, 'pop'], ['melt', '🫠', 'Melting', 55, 'float'],
  ];
  const BY = {};
  if (C) {
    C.CATS.push({ id: 'emote', name: '😀 Emotes' });
    for (const [id, emoji, name, price, motion] of LIST) {
      const it = { id: 'em_' + id, cat: 'emote', name, price, emoji, motion, draw() { /* shown as an emoji, never worn */ } };
      C.ITEMS.push(it); C.BY_ID[it.id] = it; BY[id] = it;
    }
  }
  // ---- bubbles above geese. Keys: 'me' for you, 'p<id>' for other players.
  const live = {};
  const now = () => performance.now() / 1000;
  function show(key, id) { const it = BY[id]; if (!it) return; live[key] = { t0: now(), emoji: it.emoji, motion: it.motion }; }
  function drawOn(cx, g) {
    const k = g.key || 'me', e = live[k]; if (!e) return;
    const age = now() - e.t0, DUR = 2.8; if (age > DUR) { delete live[k]; return; }
    let top = Infinity, mx = 0; const n = g.neck || [];
    for (const p of n) { if (p.y < top) { top = p.y; mx = p.x; } }
    if (!isFinite(top)) { const c = g.center(); top = c.y - 60; mx = c.x; }
    const pop = age < 0.3 ? 1 + 0.35 * Math.sin((age / 0.3) * Math.PI) * (1 - age / 0.3 * 0.2) : 1, a = age > DUR - 0.5 ? (DUR - age) / 0.5 : 1;
    let ox = 0, oy = 0, rot = 0;
    if (e.motion === 'shake') ox = Math.sin(age * 28) * 5; else if (e.motion === 'bounce') oy = -Math.abs(Math.sin(age * 7)) * 12; else if (e.motion === 'spin') rot = age * 5; else if (e.motion === 'float') oy = -age * 10 + Math.sin(age * 4) * 3;
    cx.save(); cx.globalAlpha = a; cx.translate(mx + ox, top - 46 + oy - (age < 0.3 ? 0 : 0)); cx.scale(pop, pop);
    cx.fillStyle = '#fff'; cx.strokeStyle = '#1f2a36'; cx.lineWidth = 3; cx.beginPath(); cx.arc(0, 0, 26, 0, 7); cx.fill(); cx.stroke();
    cx.beginPath(); cx.moveTo(-6, 23); cx.lineTo(0, 36); cx.lineTo(7, 23); cx.fillStyle = '#fff'; cx.fill(); cx.stroke(); cx.fillRect(-8, 20, 16, 5);
    cx.rotate(rot); cx.font = '30px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = '#000'; cx.fillText(e.emoji, 0, 2);
    cx.restore();
  }
  const owned = (it) => it.price === 0 || !!(W() && W().owned && W().owned[it.id]);
  function send(id) {
    show('me', id);
    try { if (root.MP && root.MP.emote) root.MP.emote(id); } catch (e) { /* ignore */ }
  }
  // ---- the wheel
  let btn = null, panel = null;
  function closePanel() { if (panel) panel.style.display = 'none'; }
  function openPanel() {
    if (!panel) {
      panel = document.createElement('div'); panel.style.cssText = 'position:fixed;inset:0;z-index:830;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;padding:12px';
      panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });
      document.body.appendChild(panel);
    }
    panel.innerHTML = ''; panel.style.display = 'flex';
    const box = document.createElement('div'); box.style.cssText = 'background:#fff8e8;border:3px solid #1f2a36;border-radius:22px;padding:12px;width:min(420px,100%);max-height:80vh;overflow:auto;font-family:system-ui;color:#1f2a36;text-align:center';
    box.innerHTML = '<div style="font-weight:800;font-size:18px;margin-bottom:8px">😀 Emotes</div>';
    const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px';
    for (const [id, , , ] of LIST) {
      const it = BY[id]; if (!owned(it)) continue;
      const b = document.createElement('button'); b.style.cssText = 'font-size:30px;padding:8px 2px;border-radius:14px;border:2px solid #1f2a36;background:#fff;cursor:pointer;line-height:1.1';
      b.innerHTML = it.emoji + '<div style="font:700 11px system-ui">' + it.name + '</div>';
      b.addEventListener('click', () => { send(id); closePanel(); });
      grid.appendChild(b);
    }
    box.appendChild(grid);
    const more = document.createElement('button'); more.textContent = '🛍️ Get more emotes'; more.style.cssText = 'margin-top:10px;padding:8px 14px;border-radius:14px;border:2px solid #1f2a36;background:#ffd23f;font:800 14px system-ui;cursor:pointer';
    more.addEventListener('click', () => { closePanel(); try { root.__wobble.openEmoteShop(); } catch (e) { /* ignore */ } });
    box.appendChild(more); panel.appendChild(box);
  }
  function inLevel() { const w = root.__wobble; return !!(w && w.state === 'play'); }
  function initWheel() {
    btn = document.createElement('button'); btn.textContent = '😀'; btn.title = 'Emotes (E)';
    btn.style.cssText = 'position:fixed;right:10px;top:112px;z-index:120;width:44px;height:44px;border-radius:50%;border:3px solid #1f2a36;background:#fff8e8;font-size:22px;cursor:pointer;display:none;padding:0';
    btn.addEventListener('click', openPanel); document.body.appendChild(btn);
    setInterval(() => { btn.style.display = inLevel() ? 'block' : 'none'; }, 300);
    addEventListener('keydown', (e) => { if (e.code === 'KeyE' && inLevel() && !/input|textarea/i.test((e.target && e.target.tagName) || '')) { if (panel && panel.style.display === 'flex') closePanel(); else openPanel(); } });
  }
  // ---- daily challenge button
  function initDaily() {
    const code = document.getElementById('codeBtn'); if (!code || document.getElementById('dailyBtn')) return;
    const b = document.createElement('button'); b.className = 'sec'; b.id = 'dailyBtn'; code.parentNode.insertBefore(b, code);
    const label = () => { const s = W(), D = s && s.daily, k = root.__wobble && root.__wobble.dayKey(); const done = D && D.last === k; b.textContent = '📅 Daily Challenge' + (done ? ' ✅' : '') + (D && D.streak ? ' 🔥' + (done || D.last === new Date(Date.parse(k) - 864e5).toISOString().slice(0, 10) ? D.streak : 0) : ''); };
    b.addEventListener('click', () => root.__wobble.startDaily()); label(); setInterval(label, 2000);
  }
  function init() {
    const s = W(); if (s) { s.owned = s.owned || {}; for (const [id, , , price] of LIST) if (!price) s.owned['em_' + id] = true; }
    initWheel(); initDaily();
    // a few achievements for the new stuff
    const A = root.Achievements && root.Achievements.LIST;
    if (A) {
      const n = (o) => (o && typeof o === 'object' ? Object.keys(o).filter((k) => o[k]).length : 0);
      const add = (id, icon, name, desc, val, goal, reward) => { if (!A.some((a) => a.id === id)) A.push({ id, icon, name, desc, val, goal, reward }); };
      add('daily1', '📅', 'Daily Goose', 'Finish a daily challenge.', (s2) => (s2.daily && s2.daily.total) || 0, 1, 30);
      add('daily7', '🔥', 'Week of Wobble', 'Reach a 7 day daily streak.', (s2) => (s2.daily && s2.daily.streak) || 0, 7, 150);
      add('daily30', '🌋', 'Daily Legend', 'Finish 30 daily challenges.', (s2) => (s2.daily && s2.daily.total) || 0, 30, 300);
      add('emote5', '😀', 'Chatty Goose', 'Own 5 extra emotes.', (s2) => Object.keys(s2.owned || {}).filter((k) => /^em_/.test(k) && s2.owned[k]).length, 5, 40);
      add('emote20', '🎭', 'Drama Goose', 'Own 20 extra emotes.', (s2) => Object.keys(s2.owned || {}).filter((k) => /^em_/.test(k) && s2.owned[k]).length, 20, 150);
    }
  }
  root.Emotes = { show, drawOn, send, LIST, openPanel };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 50)); else setTimeout(init, 50);
})(window);
