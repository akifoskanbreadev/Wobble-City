/*
 * Accounts: every player picks a NAME and a PASSWORD (kept only as a salted hash on the server). The name is how the owner
 * chooses who a prank, troll effect, lock or ban applies to. A heartbeat tells the server your avatar and where you are and brings
 * back bans, per-player locks and pending owner effects.
 * Account.init({ look(): {skin,equip,tint}, thumb(look, px): canvas, where(): string, onReady() })   Account.open()   Account.name()
 */
(function (root) {
  'use strict';
  const LS = 'wobbleAcct';
  let A = null, acct = null, gate = null, dlg = null, banEl = null, timer = 0, guest = false, lastErr = 0;
  const $ = (id) => document.getElementById(id);
  const get = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const set = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  async function sha(t) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join(''); }
  const hashPw = (name, pw) => sha('wobble-acct-v1:' + name.toLowerCase() + ':' + pw);
  const call = (b) => root.Owner.call(b);
  try { acct = JSON.parse(get(LS) || 'null'); } catch (e) { acct = null; }
  const look = () => (A ? A.look() : null);

  const BOX = 'position:fixed;inset:0;z-index:2147483000;background:linear-gradient(#8fd0ff,#dff3ff);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif';
  const CARD = 'background:#fff7e8;border:3px solid #2a2f3a;border-radius:18px;padding:18px 20px;width:min(380px,92vw);box-shadow:0 6px 0 #2a2f3a;text-align:center;color:#2a2f3a';
  const INP = 'width:100%;box-sizing:border-box;padding:10px;font-size:16px;border:2px solid #2a2f3a;border-radius:10px;margin:4px 0;background:#fff';
  const BTN = 'padding:10px 16px;font:800 15px system-ui;border:3px solid #2a2f3a;border-radius:12px;background:#ffd23f;cursor:pointer;color:#2a2f3a;margin:4px';

  function applyState(r) {
    if (!r) return;
    if (root.Owner) { root.Owner.setMyLocks(r.locks || []); root.Owner.setRank(r.rank || ''); }
    if (r.ban) showBan(r.ban); else hideBan();
    if (r.fx && r.fx.length && root.Owner) r.fx.forEach((f) => root.Owner.receive(f));
  }
  async function ping() {
    if (!acct || guest) return;
    try { applyState(await call({ op: 'acct-ping', name: acct.name, ph: acct.ph, avatar: look(), where: A && A.where ? A.where() : '', rank: A && A.rank ? A.rank() : '', opin: root.Owner && root.Owner.pinHash() })); }
    catch (e) { if (e.message === 'badpin') { signOut(true); } }
  }
  function startBeat() { clearInterval(timer); ping(); timer = setInterval(ping, 20000); }
  function signOut(forced) { acct = null; guest = false; set(LS, ''); clearInterval(timer); hideBan(); if (dlg) { dlg.remove(); dlg = null; } showGate(forced ? 'Your password changed or the account was removed. Sign in again.' : ''); }

  // ------------------------------------------------------------ ban screen (a real one: the server says so)
  function showBan(b) {
    if (banEl) banEl.remove();
    banEl = document.createElement('div'); banEl.style.cssText = BOX.replace('background:linear-gradient(#8fd0ff,#dff3ff)', 'background:#14090b;color:#ffd0d3') + ';z-index:2147483003;flex-direction:column;text-align:center;padding:24px';
    const left = b.until ? Math.max(0, b.until - Date.now()) : 0, mins = Math.ceil(left / 60000);
    const when = !b.until ? 'This ban is permanent.' : mins > 2880 ? 'Your ban ends in about ' + Math.ceil(mins / 1440) + ' days.' : mins > 120 ? 'Your ban ends in about ' + Math.ceil(mins / 60) + ' hours.' : 'Your ban ends in about ' + mins + ' minutes.';
    banEl.innerHTML = '<div style="font-size:64px">⛔</div><h2 style="margin:8px 0">You are banned</h2><p style="max-width:380px">' + String(b.reason || 'Banned by the owner').replace(/</g, '&lt;') + '</p><p style="opacity:.8">' + when + '</p><button style="' + BTN + '" id="banOut">Sign out</button>';
    document.body.appendChild(banEl);
    banEl.querySelector('#banOut').addEventListener('click', () => signOut());
  }
  function hideBan() { if (banEl) { banEl.remove(); banEl = null; } }

  // ------------------------------------------------------------ the sign-in gate
  function showGate(msg) {
    if (gate) gate.remove();
    gate = document.createElement('div'); gate.style.cssText = BOX;
    gate.innerHTML = '<div style="' + CARD + '"><div style="font-size:42px">🪿</div><h2 style="margin:4px 0">Wobble City</h2><div style="font-size:13px;margin-bottom:8px">Pick a name and a password to play. Your password is never stored as text.</div>' +
      '<input id="acN" maxlength="16" placeholder="name (3-16 letters/numbers)" autocomplete="username" style="' + INP + '"><input id="acP" type="password" maxlength="60" placeholder="password (4+ characters)" autocomplete="current-password" style="' + INP + '">' +
      '<div id="acM" style="min-height:20px;font-weight:700;font-size:13px;color:#c62835;white-space:pre-wrap">' + (msg || '') + '</div>' +
      '<div><button id="acIn" style="' + BTN + '">Sign in</button><button id="acNew" style="' + BTN + 'background:#9be37a">Create account</button></div>' +
      '<div id="acG" style="display:none"><button id="acGuest" style="' + BTN + 'background:#fff;font-size:12px">Play offline without an account</button></div></div>';
    document.body.appendChild(gate);
    const say = (t, bad) => { const m = gate.querySelector('#acM'); m.textContent = t; m.style.color = bad ? '#c62835' : '#2a6'; };
    const go = async (create) => {
      const name = gate.querySelector('#acN').value.trim(), pw = gate.querySelector('#acP').value;
      if (!/^[A-Za-z0-9_ .-]{3,16}$/.test(name)) return say('Name: 3-16 letters, numbers, space, _ . -', true);
      if (pw.length < 4) return say('Password needs at least 4 characters.', true);
      say('Please wait…');
      try {
        const ph = await hashPw(name, pw);
        const r = await call({ op: create ? 'acct-register' : 'acct-login', name, ph, avatar: look() });
        acct = { name, ph }; set(LS, JSON.stringify(acct)); guest = false;
        gate.remove(); gate = null; applyState(r); startBeat(); if (A && A.onReady) A.onReady(acct.name);
      } catch (e) {
        const m = e.message;
        say(m === 'badpin' ? 'Wrong name or password.' : m === 'http409' ? 'That name is taken. Pick another or sign in.' : m === 'nokv' ? 'The game server is not set up yet.' : 'Could not reach the game server.', true);
        if (m !== 'badpin' && m !== 'http409') gate.querySelector('#acG').style.display = '';
      }
    };
    gate.querySelector('#acIn').addEventListener('click', () => go(false));
    gate.querySelector('#acNew').addEventListener('click', () => go(true));
    gate.querySelector('#acP').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(false); });
    gate.querySelector('#acGuest').addEventListener('click', () => { guest = true; gate.remove(); gate = null; if (A && A.onReady) A.onReady('guest'); });
  }

  // ------------------------------------------------------------ menu dialog
  function open() {
    if (dlg) dlg.remove();
    dlg = document.createElement('div'); dlg.className = 'overlay'; dlg.style.zIndex = '2147483001';
    const who = acct ? acct.name : 'Guest (offline)';
    dlg.innerHTML = '<div class="card" style="max-width:380px;width:92%;text-align:center"><h2 style="margin:0">👤 Account</h2><div id="acAv" style="margin:6px auto;height:96px"></div><div style="font:800 20px system-ui">' + who.replace(/</g, '&lt;') + '</div>' +
      (acct ? '<h4 style="margin:12px 0 2px">Change password</h4><input id="acO" type="password" placeholder="current password" style="' + INP + '"><input id="acP2" type="password" placeholder="new password (4+ characters)" style="' + INP + '"><button class="big small-btn" id="acCh">Change password</button>' : '<div style="font-size:13px;margin:8px 0">You are playing without an account, so the owner cannot see you and your name is not saved.</div>') +
      '<div id="acM2" style="min-height:20px;font-weight:700;margin-top:6px"></div><div class="row" style="justify-content:center"><button class="big small-btn ghost" id="acOut">' + (acct ? 'Sign out / switch account' : 'Sign in') + '</button><button class="big small-btn ghost" id="acX">Close</button></div></div>';
    document.body.appendChild(dlg);
    try { const cv = A.thumb(look(), 96); dlg.querySelector('#acAv').appendChild(cv); } catch (e) { /* ignore */ }
    const say = (t, bad) => { const m = dlg.querySelector('#acM2'); m.textContent = t; m.style.color = bad ? '#c62835' : ''; };
    dlg.querySelector('#acX').addEventListener('click', () => { dlg.remove(); dlg = null; });
    dlg.querySelector('#acOut').addEventListener('click', () => { dlg.remove(); dlg = null; signOut(); });
    const ch = dlg.querySelector('#acCh');
    if (ch) ch.addEventListener('click', async () => {
      const o = dlg.querySelector('#acO').value, n = dlg.querySelector('#acP2').value;
      if (n.length < 4) return say('New password needs at least 4 characters.', true);
      try {
        const oh = await hashPw(acct.name, o), nh = await hashPw(acct.name, n);
        await call({ op: 'acct-pass', name: acct.name, ph: oh, nph: nh });
        acct.ph = nh; set(LS, JSON.stringify(acct)); say('✅ Password changed.');
      } catch (e) { say(e.message === 'badpin' ? 'Current password is wrong.' : 'Could not reach the server.', true); }
    });
  }
  async function friend(code) {   // a friend code makes you head admin (the server checks it)
    if (!acct || guest) return false;
    try { const h = await sha('wobble-friend-v1:' + String(code).trim().toLowerCase()); const r = await call({ op: 'acct-friend', name: acct.name, ph: acct.ph, h }); if (root.Owner) root.Owner.setRank(r.rank); return true; } catch (e) { return false; }
  }
  function init(a) { A = a; if (acct) { startBeat(); if (A.onReady) A.onReady(acct.name); } else showGate(); }
  const cred = () => (acct ? { name: acct.name, ph: acct.ph } : null);
  root.Account = { cred, friend, init, open, name: () => (acct ? acct.name : ''), signedIn: () => !!acct || guest, ping };
})(window);
