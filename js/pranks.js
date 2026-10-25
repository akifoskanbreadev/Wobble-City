/*
 * Pranks: full-screen fake system screens the owner can show on a chosen player's screen (or their own).
 * They never ask for passwords or send anything anywhere. Each one closes by itself after a while, and the bot-check
 * puzzles close once they are solved. A small faint line at the bottom says it is a game prank.
 * Pranks.show(id)    Pranks.LIST = [{ id, label, group }]
 */
(function (root) {
  'use strict';
  const LIST = [
    { id: 'crash', label: '💻 Crash screen', group: 'System' }, { id: 'ban', label: '🚫 Ban screen', group: 'System' },
    { id: 'update', label: '⚙️ Stuck update', group: 'System' }, { id: 'virus', label: '🦠 Virus alert', group: 'System' },
    { id: 'tax', label: '🍞 Bread tax', group: 'System' }, { id: 'offline', label: '📡 Connection lost', group: 'System' },
    { id: 'maint', label: '🛠 Server maintenance', group: 'System' }, { id: 'battery', label: '🔋 Battery critical', group: 'System' },
    { id: 'storage', label: '💾 Storage full', group: 'System' }, { id: 'deleted', label: '🗑 Save deleted', group: 'System' },
    { id: 'cap_grid', label: '🧩 Bot check: pick the geese', group: 'Bot checks' }, { id: 'cap_slide', label: '🧩 Bot check: slide the piece', group: 'Bot checks' },
    { id: 'cap_text', label: '🧩 Bot check: type the letters', group: 'Bot checks' }, { id: 'cap_math', label: '🧩 Bot check: sum', group: 'Bot checks' },
    { id: 'cap_box', label: '🧩 Bot check: runaway tick box', group: 'Bot checks' }, { id: 'cap_rotate', label: '🧩 Bot check: rotate the goose', group: 'Bot checks' },
    { id: 'cap_hold', label: '🧩 Bot check: hold the button', group: 'Bot checks' }, { id: 'cap_order', label: '🧩 Bot check: tap in order', group: 'Bot checks' },
    { id: 'cap_all', label: '🧩 Bot check: 3 puzzles in a row', group: 'Bot checks' }
  ];
  const R = (n) => (Math.random() * n) | 0, pick = (a) => a[R(a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let layer = null;
  function close() { if (layer) { layer.remove(); layer = null; } }
  function mk(bg, fg, html, opts) {
    close();
    const d = document.createElement('div'); layer = d;
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483002;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:22px;font-family:system-ui,Segoe UI,sans-serif;user-select:none;-webkit-user-select:none;touch-action:manipulation;overflow:auto;background:' + bg + ';color:' + fg;
    d.innerHTML = html + '<div style="position:absolute;left:0;right:0;bottom:10px;font-size:9px;opacity:.22;letter-spacing:.02em">just a prank inside the game</div>';
    document.body.appendChild(d);
    const life = (opts && opts.life) || 25000;
    if (life > 0) setTimeout(() => { if (layer === d) close(); }, life);
    return d;
  }
  const btn = (t, bg, fg) => '<button class="pk" style="margin-top:14px;padding:10px 22px;border-radius:6px;border:0;font:600 15px system-ui;background:' + (bg || '#0b5cff') + ';color:' + (fg || '#fff') + ';cursor:pointer">' + t + '</button>';
  const onclick = (d, sel, fn) => { const e = d.querySelector(sel); if (e) e.addEventListener('click', fn); };

  // ---- system screens
  function sys(id) {
    let d;
    if (id === 'crash') { d = mk('#0a4fb3', '#fff', '<div style="font-size:92px;line-height:1">:(</div><h2 style="margin:10px 0 4px">Your game ran into a problem and needs to restart.</h2><p style="max-width:420px;opacity:.9">We are just collecting some error info, and then we will restart for you.</p><p id="pkp" style="font-size:22px">0% complete</p><p style="font-size:11px;opacity:.6">Stop code: CRITICAL_PROCESS_DIED</p>'); let n = 0; const t = setInterval(() => { if (!layer || layer !== d) return clearInterval(t); n = Math.min(100, n + 1 + R(4)); const e = d.querySelector('#pkp'); if (e) e.textContent = n + '% complete'; if (n >= 100) { clearInterval(t); setTimeout(close, 900); } }, 380); }
    else if (id === 'ban') { d = mk('#14090b', '#ff5961', '<div style="font-size:64px">⛔</div><h2 style="margin:8px 0 4px;font-size:26px">You have been banned</h2><p style="max-width:420px;color:#e8c9cc">Your account was suspended for violating the community rules. Reference: <b>#BN-' + (100000 + R(899999)) + '</b></p><p style="color:#b08;opacity:.9;font-size:13px">Ban length: 30 days</p>' + btn('Appeal', '#2a2f3a')); onclick(d, '.pk', () => { d.querySelector('.pk').textContent = 'Appeal failed. Try again later.'; }); }
    else if (id === 'update') { d = mk('#0d1530', '#cfe0ff', '<div style="width:56px;height:56px;border:6px solid #3a5bd9;border-top-color:#fff;border-radius:50%;animation:pks 1s linear infinite"></div><style>@keyframes pks{to{transform:rotate(360deg)}}</style><h2 style="margin:16px 0 4px;font-weight:500">Working on updates</h2><p id="pkp" style="font-size:20px">27% complete</p><p style="opacity:.8">Don\'t turn off your device. This will take a while.</p>'); let n = 27; const t = setInterval(() => { if (layer !== d) return clearInterval(t); n = Math.min(99, n + (Math.random() < 0.5 ? 1 : 0)); const e = d.querySelector('#pkp'); if (e) e.textContent = n + '% complete'; }, 900); }
    else if (id === 'virus') { d = mk('#000', '#37ff6b', '<pre style="text-align:left;font:13px/1.35 ui-monospace,Menlo,monospace;white-space:pre-wrap;max-width:460px">WARNING: threat detected\n> 9,999 bread viruses found\n> removing bread............ failed\n> the goose cannot be stopped\n> contacting the goose authorities...</pre>' + btn('Clean now', '#c00')); onclick(d, '.pk', () => { d.querySelector('pre').textContent += '\n> error 0xHONK: cleaning failed'; }); }
    else if (id === 'tax') { d = mk('#fff7d6', '#5b3d00', '<div style="font-size:60px">🍞</div><h2 style="margin:8px 0">Bread tax due</h2><p>You owe the Goose Revenue Service<br><b>4,000,000 bread</b></p>' + btn('Pay now', '#d98a00')); onclick(d, '.pk', () => { d.querySelector('.pk').textContent = 'Payment declined'; }); }
    else if (id === 'offline') { d = mk('#1c1f26', '#e6e9ef', '<div style="font-size:60px">📡</div><h2 style="margin:8px 0 4px">Connection lost</h2><p style="opacity:.8">Trying to reconnect…</p>' + btn('Retry', '#3a4150')); onclick(d, '.pk', () => { d.querySelector('p').textContent = 'Still no connection…'; }); }
    else if (id === 'maint') { d = mk('#fdfdfd', '#222', '<div style="font-size:54px">🛠️</div><h2 style="margin:8px 0">Down for maintenance</h2><p style="max-width:380px;color:#555">We are making things better and will be back shortly. Thank you for your patience.</p>'); }
    else if (id === 'battery') { d = mk('#111', '#ff4040', '<div style="font-size:70px">🪫</div><h2 style="margin:8px 0">Battery critically low: 1%</h2><p style="color:#bbb">Plug in your charger now. Your device will shut down.</p>', { life: 14000 }); setTimeout(() => { if (layer === d) d.style.background = '#000', d.innerHTML = ''; }, 9000); }
    else if (id === 'storage') { d = mk('#f2f2f7', '#111', '<div style="font-size:50px">💾</div><h2 style="margin:8px 0">Storage almost full</h2><p style="color:#555;max-width:340px">Wobble City cannot save your progress. Free up space to continue.</p>' + btn('Manage storage')); onclick(d, '.pk', close); }
    else if (id === 'deleted') { d = mk('#1b1030', '#f0e6ff', '<div style="font-size:56px">🗑️</div><h2 style="margin:8px 0">Save data not found</h2><p style="opacity:.8;max-width:360px">Your progress could not be read and has been reset.</p>' + btn('Restore', '#6a3df0')); onclick(d, '.pk', () => { d.querySelector('p').textContent = 'Restore failed (error 404).'; setTimeout(close, 1800); }); }
    return d;
  }

  // ---- bot-check puzzles
  const card = (inner, title) => '<div style="background:#fff;color:#202124;border:1px solid #d3d3d3;border-radius:6px;box-shadow:0 4px 18px rgba(0,0,0,.25);width:min(340px,92vw);text-align:left;overflow:hidden"><div style="background:#4a90e2;color:#fff;padding:12px 14px;font-size:14px">' + (title || 'Verify you are human') + '</div><div style="padding:14px" id="pkc">' + inner + '</div></div>';
  function finish(d, next) { const c = d.querySelector('#pkc'); if (c) c.innerHTML = '<div style="text-align:center;padding:20px;font-size:18px">✅ Verified</div>'; setTimeout(() => { if (layer === d) { close(); if (next) next(); } }, 700); }
  function fail(d, msg) { const m = d.querySelector('#pkm'); if (m) { m.textContent = msg || 'Incorrect. Try again.'; m.style.color = '#d93025'; } }
  const bgc = '#e9edf3';
  function capGrid(next) {
    const geese = new Set(); const cells = []; const pool = ['🦆', '🐔', '🦢', '🐧', '🦉', '🐓', '🕊️', '🦜'];
    for (let i = 0; i < 9; i++) { const g = Math.random() < 0.38; if (g) geese.add(i); cells.push(g ? '🪿' : pick(pool)); } if (!geese.size) { geese.add(4); cells[4] = '🪿'; }
    const sel = new Set();
    const d = mk(bgc, '#222', card('<div style="font-size:13px;margin-bottom:8px">Select all squares with a <b>goose</b> (🪿).</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px" id="pkg">' + cells.map((c, i) => '<div data-i="' + i + '" style="font-size:40px;text-align:center;padding:10px 0;background:#f3f4f6;border:3px solid transparent;cursor:pointer">' + c + '</div>').join('') + '</div><div id="pkm" style="font-size:12px;min-height:16px;margin-top:6px"></div><button class="pk" style="width:100%;padding:10px;border:0;background:#4a90e2;color:#fff;font:600 14px system-ui;cursor:pointer">VERIFY</button>', 'Select all geese'), { life: 0 });
    d.querySelectorAll('#pkg div').forEach((e) => e.addEventListener('click', () => { const i = +e.dataset.i; if (sel.has(i)) { sel.delete(i); e.style.borderColor = 'transparent'; } else { sel.add(i); e.style.borderColor = '#4a90e2'; } }));
    onclick(d, '.pk', () => { if (sel.size === geese.size && [...sel].every((i) => geese.has(i))) finish(d, next); else { fail(d, 'Please try again.'); sel.clear(); d.querySelectorAll('#pkg div').forEach((e) => { e.style.borderColor = 'transparent'; }); } });
  }
  function capSlide(next) {
    const tx = 90 + R(130);
    const d = mk(bgc, '#222', card('<div style="font-size:13px;margin-bottom:8px">Drag the slider to fit the piece into the gap.</div><div style="position:relative;height:110px;background:linear-gradient(135deg,#7cc5ff,#ffe27a);border-radius:4px;overflow:hidden"><div style="position:absolute;left:' + tx + 'px;top:40px;width:34px;height:34px;background:rgba(0,0,0,.45);border-radius:6px"></div><div id="pkpc" style="position:absolute;left:0;top:40px;width:34px;height:34px;background:#fff;border:2px solid #fff;border-radius:6px;box-shadow:0 0 6px rgba(0,0,0,.5);font-size:22px;text-align:center;line-height:34px">🪿</div></div><input id="pksl" type="range" min="0" max="260" value="0" style="width:100%;margin-top:12px"><div id="pkm" style="font-size:12px;min-height:16px"></div>', 'Slide to verify'), { life: 0 });
    const sl = d.querySelector('#pksl'), pc = d.querySelector('#pkpc');
    sl.addEventListener('input', () => { pc.style.left = sl.value + 'px'; });
    const end = () => { if (Math.abs(+sl.value - tx) < 9) finish(d, next); else { fail(d, 'Not quite. Try again.'); sl.value = 0; pc.style.left = '0px'; } };
    sl.addEventListener('change', end);
  }
  function capText(next) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let word = ''; for (let i = 0; i < 6; i++) word += chars[R(chars.length)];
    const sp = word.split('').map((c) => '<span style="display:inline-block;transform:rotate(' + (R(40) - 20) + 'deg) translateY(' + (R(10) - 5) + 'px);font:700 ' + (26 + R(10)) + 'px serif;color:hsl(' + R(360) + ',45%,35%);margin:0 2px">' + c + '</span>').join('');
    const d = mk(bgc, '#222', card('<div style="font-size:13px;margin-bottom:6px">Type the characters you see.</div><div style="background:repeating-linear-gradient(45deg,#f1f1f1,#f1f1f1 6px,#e3e3e3 6px,#e3e3e3 12px);padding:14px;text-align:center;border-radius:4px">' + sp + '</div><input id="pkt" autocomplete="off" autocapitalize="characters" style="width:100%;box-sizing:border-box;margin-top:10px;padding:10px;font-size:16px;border:1px solid #bbb;border-radius:4px"><div id="pkm" style="font-size:12px;min-height:16px"></div><button class="pk" style="width:100%;padding:10px;border:0;background:#4a90e2;color:#fff;font:600 14px system-ui;cursor:pointer">VERIFY</button>', 'Type what you see'), { life: 0 });
    onclick(d, '.pk', () => { if (d.querySelector('#pkt').value.trim().toUpperCase() === word) finish(d, next); else fail(d, 'Wrong. A new code is shown below.'), setTimeout(() => capText(next), 600); });
  }
  function capMath(next) {
    const a = 3 + R(9), b = 3 + R(9), c = 2 + R(7); const ans = a * b + c;
    const d = mk(bgc, '#222', card('<div style="font-size:13px;margin-bottom:6px">Solve to prove you are not a robot.</div><div style="font:700 28px system-ui;text-align:center;margin:10px 0">' + a + ' × ' + b + ' + ' + c + ' = ?</div><input id="pkt" inputmode="numeric" style="width:100%;box-sizing:border-box;padding:10px;font-size:18px;border:1px solid #bbb;border-radius:4px"><div id="pkm" style="font-size:12px;min-height:16px"></div><button class="pk" style="width:100%;padding:10px;border:0;background:#4a90e2;color:#fff;font:600 14px system-ui;cursor:pointer">VERIFY</button>', 'Quick check'), { life: 0 });
    onclick(d, '.pk', () => { if (+d.querySelector('#pkt').value === ans) finish(d, next); else fail(d, 'Wrong answer.'); });
  }
  function capBox(next) {
    const d = mk(bgc, '#222', '<div style="position:relative;width:min(340px,92vw);height:220px"><div id="pkb" style="position:absolute;left:0;top:70px;background:#fff;border:1px solid #d3d3d3;border-radius:4px;padding:14px 16px;display:flex;gap:12px;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer;width:260px;font-size:15px"><div id="pkx" style="width:26px;height:26px;border:2px solid #777;border-radius:3px;background:#fff"></div>I am not a robot</div></div>', { life: 0 });
    const b = d.querySelector('#pkb'), W = Math.min(340, innerWidth * 0.92) - 270; let dodges = 0;
    const flee = (e) => { if (dodges < 6) { dodges++; b.style.transition = 'left .15s,top .15s'; b.style.left = R(W) + 'px'; b.style.top = R(150) + 'px'; if (e && e.preventDefault) e.preventDefault(); } };
    b.addEventListener('pointerenter', flee); b.addEventListener('pointerdown', (e) => { if (dodges < 6) flee(e); else { d.querySelector('#pkx').textContent = '✓'; d.querySelector('#pkx').style.cssText += ';text-align:center;line-height:24px;color:#0a8f3c;font-weight:900'; setTimeout(() => finish2(d, next), 400); } });
  }
  function finish2(d, next) { if (layer === d) { close(); if (next) next(); } }
  function capRotate(next) {
    let a = (1 + R(3)) * 90 + R(2) * 0; a = a % 360 || 90;
    const d = mk(bgc, '#222', card('<div style="font-size:13px;margin-bottom:8px">Rotate the goose until it is standing upright.</div><div style="text-align:center"><div id="pkg" style="font-size:90px;display:inline-block;transition:transform .2s;transform:rotate(' + a + 'deg)">🪿</div></div><div style="display:flex;gap:8px;margin-top:8px"><button class="pk" id="pkl" style="flex:1;padding:10px;border:1px solid #bbb;background:#fafafa;cursor:pointer">⟲ Left</button><button class="pk" id="pkr" style="flex:1;padding:10px;border:1px solid #bbb;background:#fafafa;cursor:pointer">⟳ Right</button></div><div id="pkm" style="font-size:12px;min-height:16px"></div><button class="pk" id="pkok" style="width:100%;padding:10px;border:0;background:#4a90e2;color:#fff;font:600 14px system-ui;cursor:pointer">VERIFY</button>', 'Rotate to verify'), { life: 0 });
    const g = d.querySelector('#pkg'); const set = () => { g.style.transform = 'rotate(' + a + 'deg)'; };
    d.querySelector('#pkl').addEventListener('click', () => { a = (a + 270) % 360; set(); }); d.querySelector('#pkr').addEventListener('click', () => { a = (a + 90) % 360; set(); });
    d.querySelector('#pkok').addEventListener('click', () => { if (a % 360 === 0) finish(d, next); else fail(d, 'Not upright yet.'); });
  }
  function capHold(next) {
    const d = mk(bgc, '#222', card('<div style="font-size:13px;margin-bottom:10px">Press and hold the button until the bar is full.</div><div style="height:12px;background:#ddd;border-radius:6px;overflow:hidden"><div id="pkbar" style="height:100%;width:0;background:#4a90e2"></div></div><button id="pkh" style="width:100%;margin-top:14px;padding:16px;border:0;background:#4a90e2;color:#fff;font:700 16px system-ui;border-radius:4px;touch-action:none">HOLD</button><div id="pkm" style="font-size:12px;min-height:16px;margin-top:6px"></div>', 'Hold to verify'), { life: 0 });
    let t0 = 0, raf = 0; const need = 4500, bar = d.querySelector('#pkbar');
    const loop = () => { const p = Math.min(1, (performance.now() - t0) / need); bar.style.width = p * 100 + '%'; if (p >= 1) return finish(d, next); raf = requestAnimationFrame(loop); };
    const h = d.querySelector('#pkh');
    h.addEventListener('pointerdown', () => { t0 = performance.now(); cancelAnimationFrame(raf); loop(); });
    const up = () => { cancelAnimationFrame(raf); if (layer === d && bar.style.width !== '100%') { bar.style.width = '0'; fail(d, 'You let go too early.'); } };
    h.addEventListener('pointerup', up); h.addEventListener('pointerleave', up); h.addEventListener('pointercancel', up);
  }
  function capOrder(next) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]); let want = 1;
    const d = mk(bgc, '#222', card('<div style="font-size:13px;margin-bottom:8px">Tap the numbers in order, from 1 to 9.</div><div style="position:relative;height:200px;background:#f3f4f6;border-radius:4px" id="pko"></div><div id="pkm" style="font-size:12px;min-height:16px;margin-top:6px"></div>', 'Tap in order'), { life: 0 });
    const box = d.querySelector('#pko');
    nums.forEach((n) => { const b = document.createElement('button'); b.textContent = n; b.style.cssText = 'position:absolute;width:42px;height:42px;border-radius:50%;border:2px solid #4a90e2;background:#fff;font:700 18px system-ui;left:' + (6 + R(250)) + 'px;top:' + (6 + R(150)) + 'px;cursor:pointer'; b.addEventListener('click', () => { if (n === want) { want++; b.style.visibility = 'hidden'; if (want > 9) finish(d, next); } else { want = 1; box.querySelectorAll('button').forEach((x) => { x.style.visibility = 'visible'; }); fail(d, 'Wrong order. Start again from 1.'); } }); box.appendChild(b); });
  }
  const CAPS = { cap_grid: capGrid, cap_slide: capSlide, cap_text: capText, cap_math: capMath, cap_box: capBox, cap_rotate: capRotate, cap_hold: capHold, cap_order: capOrder };
  function show(id) {
    if (CAPS[id]) return CAPS[id]();
    if (id === 'cap_all') { const f = shuffle(Object.values(CAPS)).slice(0, 3); const run = (i) => { if (i < f.length) f[i](() => run(i + 1)); }; return run(0); }
    return sys(id);
  }
  root.Pranks = { show, close, LIST };
})(window);
