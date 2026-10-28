/*
 * Moderation and safety.
 *  - Moderation.scan(text): a word filter that stars out rude words and rates a message 0 (fine), 1 (rude) or 2 (severe).
 *  - Severe messages from other players are reported to the moderators automatically; any chat line has a ⚑ button to report it.
 *  - Moderators (a rank the owner hands out) get a 🛡 MOD button: open reports, kick, ban (up to 30 days), unban, and an AI triage
 *    that ranks the reports and suggests what to do. Moderators have no pranks, locks, codes or tools, and cannot act on staff.
 * The server (the worker) checks the moderator's account on every action; the word filter and auto reports run in the browser.
 */
(function (root) {
  'use strict';
  const SEVERE = /\b(n[i1]gg\w*|f[a4]gg?\w*|k[yi]s|kill yourself|rape\w*|cunt\w*|nazi\w*|hitler|porn\w*|nudes?|pedo\w*|slut\w*|whore\w*|retard\w*|tranny)\b/i;
  const RUDE = /\b(f+u+c+k+\w*|sh[i1]+t\w*|b[i1]tch\w*|d[i1]ck\w*|sex\w*|a+ss+h?o?l?e?|crap|stupid|idiot|dumb|hate you|loser|shut up)\b/gi;
  function scan(text) {
    const t = String(text || ''); let level = 0;
    if (SEVERE.test(t)) level = 2; else if (RUDE.test(t)) level = 1; RUDE.lastIndex = 0;
    const clean = t.replace(new RegExp(SEVERE.source, 'gi'), (w) => '*'.repeat(w.length)).replace(RUDE, (w) => '*'.repeat(w.length));
    return { clean, level };
  }
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const call = (b) => root.Owner.call(b);
  const cred = () => (root.Account && root.Account.cred ? root.Account.cred() : null);
  const sent = new Map();
  async function report(target, text, where, why, auto) {
    const c = cred(); target = String(target || '').trim(); if (!c || !target || target.toLowerCase() === c.name.toLowerCase()) return false;
    const key = target + '|' + text; if (sent.has(key)) return true; sent.set(key, 1);
    try { await call({ op: 'acct-report', name: c.name, ph: c.ph, target, text: String(text).slice(0, 200), where: where || '', why: why || 'chat', auto: !!auto }); return true; } catch (e) { sent.delete(key); return false; }
  }
  // call this for every chat line that arrives from another player
  function incoming(name, text, where) { const r = scan(text); if (r.level === 2 && name) report(name, text, where, 'severe', true); else if (watching && name && text) { buf.push({ name, text: String(text).slice(0, 120), where }); if (buf.length > 20) buf.shift(); } return r.clean; }

  // ---- Sentry (the security helper goose): AI that reads chat while he is summoned, and acts for moderators
  let watching = false, buf = [], wt = 0, digestAt = 0, digestTxt = '';
  function watch(on) {
    watching = !!on; clearInterval(wt); buf = [];
    if (!watching) return;
    wt = setInterval(async () => {
      if (!buf.length || !(root.Helpers && root.Helpers.raw)) return; const batch = buf.splice(0, 12);
      try {
        const t = await root.Helpers.raw({ system: 'You watch a kids-friendly game chat for safety. For each numbered line decide severity: 0 fine (jokes, banter and game talk are fine), 1 rude, 2 severe (slurs, sexual content, threats, bullying, hate, self-harm talk, asking for personal info like address/phone/passwords, scams or links to other sites). Reply ONLY JSON: {"flag":[{"i":number,"sev":1|2,"why":"max 8 words"}]} listing only lines with sev 1 or 2.', user: batch.map((b, i) => i + ': ' + b.text).join('\n'), model: 'big', temp: 0, max: 300 });
        const j = JSON.parse((String(t).match(/\{[\s\S]*\}/) || ['{}'])[0]);
        for (const f of j.flag || []) { const b = batch[f.i | 0]; if (b && f.sev === 2) { report(b.name, b.text, b.where, 'ai:' + String(f.why || '').slice(0, 14), true); if (root.Helpers && root.Helpers.sentryNote) root.Helpers.sentryNote('Flagged ' + b.name + ': ' + String(f.why || 'inappropriate')); } }
      } catch (e) { /* the filter still works without the AI */ }
    }, 6000);
  }
  async function digest() {                      // a short list of open reports for Sentry to reason about (moderators only)
    if (!isMod() || !cred()) return ''; if (Date.now() - digestAt < 20000) return digestTxt; digestAt = Date.now();
    try { const r = (await mod('acct-mod-reports')).reports || []; digestTxt = r.filter((x) => x.status === 'open').slice(0, 10).map((x) => x.id + ' | ' + x.target + ' | ' + x.text.slice(0, 90) + ' | ' + x.where + (x.auto ? ' | auto' : '')).join('\n') || 'none'; } catch (e) { digestTxt = ''; }
    return digestTxt;
  }
  const NAMEOK = /^[A-Za-z0-9_ .-]{3,16}$/;
  // an action decided by the Sentry AI; everything is re-checked here and again by the server
  async function agent(it, request) {
    const kind = String((it && it.do) || '').toLowerCase(), target = String(it.target || '').trim();
    if (!['reports', 'kick', 'ban', 'unban', 'dismiss', 'report', 'watch'].includes(kind)) return "I can't do that (no pranks, locks, resets or deleting things)";
    if (kind === 'watch') { watch(it.on !== false); return it.on === false ? 'stopped watching the chat' : 'watching the chat for trouble'; }
    if (kind === 'report') { if (!cred()) return 'sign in first'; if (!NAMEOK.test(target)) return 'which player?'; const ok = await report(target, String(it.text || it.reason || 'reported by player').slice(0, 200), 'sentry', 'player', false); return ok ? 'reported ' + target + ' to the moderators' : 'could not send the report'; }
    if (!isMod() || !cred()) return 'only moderators and the owner can ask me to do that';
    if (kind === 'reports') { await digest(); digestAt = 0; const d = await digest(); return d && d !== 'none' ? 'open reports:\n' + d : 'no open reports'; }
    if (kind === 'dismiss') { try { await mod('acct-mod-resolve', { rid: String(it.rid || ''), action: 'dismiss' }); return 'dismissed ' + it.rid; } catch (e) { return 'failed: ' + e.message; } }
    if (!NAMEOK.test(target)) return 'which player?';
    const g = root.Chungas && root.Chungas.guard ? await root.Chungas.guard({ act: 'mod', do: kind, target, hours: it.hours, reason: it.reason }, request) : { ok: false, why: 'the Guard is offline' };
    if (!g.ok) return '🛡 Guard said no: ' + g.why;
    try {
      if (kind === 'kick') { await mod('acct-mod-kick', { target }); return '🛡 Guard OK · kicked ' + target; }
      if (kind === 'unban') { await mod('acct-mod-unban', { target }); return '🛡 Guard OK · unbanned ' + target; }
      const h = Math.max(1, Math.min(720, Math.round(+it.hours || 24))); await mod('acct-mod-ban', { target, until: hours(h), reason: String(it.reason || 'Banned by a moderator').replace(/[<>]/g, '').slice(0, 100) }); return '🛡 Guard OK · banned ' + target + ' for ' + h + 'h';
    } catch (e) { return 'failed: ' + e.message; }
  }

  // ------------------------------------------------------------------ the moderator panel
  let btn = null, panel = null, tab = 'reports', data = { reports: [], users: [] }, msgEl = null;
  const isMod = () => !!(root.Owner && (root.Owner.rank() === 'mod' || (root.Owner.authed && root.Owner.authed())));
  function build() {
    if (btn) return;
    btn = document.createElement('button'); btn.textContent = '🛡 MOD'; btn.style.cssText = 'position:fixed;left:82px;top:calc(max(6px,env(safe-area-inset-top)) + 44px);z-index:2147482400;display:none;border:3px solid #1c3a63;border-radius:10px;background:#9cc7ff;font:800 10px system-ui;padding:4px 6px;cursor:pointer';
    btn.addEventListener('click', () => { if (panel) { close(); } else open(); }); document.body.appendChild(btn);
    setInterval(() => { btn.style.display = isMod() && cred() ? 'block' : 'none'; if (!isMod()) close(); }, 3000);
  }
  function close() { if (panel) { panel.remove(); panel = null; } }
  const mod = (op, extra) => { const c = cred(); return call(Object.assign({ op, name: c.name, ph: c.ph }, extra || {})); };
  const say = (t, bad) => { if (msgEl) { msgEl.textContent = t; msgEl.style.color = bad ? '#c62835' : '#1c6b2f'; } };
  async function open() {
    close(); panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;left:6px;top:calc(max(6px,env(safe-area-inset-top)) + 82px);z-index:2147482400;width:min(420px,94vw);max-height:70vh;overflow:auto;background:#f4f9ff;border:3px solid #1c3a63;border-radius:14px;padding:10px;font:600 13px system-ui;box-shadow:0 5px 0 rgba(0,0,0,.3)';
    document.body.appendChild(panel); for (const ev of ['pointerdown', 'keydown', 'keyup']) panel.addEventListener(ev, (e) => e.stopPropagation()); await refresh(); draw();
  }
  async function refresh() {
    try { data.reports = (await mod('acct-mod-reports')).reports || []; } catch (e) { data.reports = []; data.err = e.message; }
    try { data.users = (await mod('acct-mod-players')).users || []; } catch (e) { data.users = []; }
  }
  const hours = (h) => Date.now() + h * 3600000;
  function draw() {
    if (!panel) return;
    panel.innerHTML = '<div style="display:flex;gap:6px;align-items:center"><b style="flex:1">🛡 Moderation</b><button id="mdT1">Reports</button><button id="mdT2">Players</button><button id="mdX">✕</button></div><div id="mdMsg" style="min-height:18px;font-weight:700"></div><div id="mdBody"></div>';
    msgEl = $('mdMsg'); $('mdX').onclick = close; $('mdT1').onclick = () => { tab = 'reports'; draw(); }; $('mdT2').onclick = () => { tab = 'players'; draw(); };
    const body = $('mdBody'); if (data.err) say(data.err, true);
    if (tab === 'reports') {
      const open2 = data.reports.filter((r) => r.status === 'open');
      body.innerHTML = '<div style="margin:6px 0"><button id="mdAI">🤖 AI triage of open reports (' + open2.length + ')</button> <button id="mdRef">↻</button></div><div id="mdAIout" style="white-space:pre-wrap;background:#fff;border:2px solid #cfd8e8;border-radius:8px;padding:6px;display:none;margin-bottom:6px"></div>';
      $('mdRef').onclick = async () => { await refresh(); draw(); };
      $('mdAI').onclick = async () => {
        const out = $('mdAIout'); out.style.display = 'block'; out.textContent = '🤖 thinking…';
        try {
          const t = await root.Helpers.raw({ system: 'You are a calm, fair moderator assistant for a kids-friendly game. You get a list of chat reports (id, target, text, where). For each, rate severity 1-3 (3 = severe: slurs, sexual, threats, self-harm, hate; 2 = clearly rude or bullying; 1 = mild or not a problem), and suggest one action: dismiss, warn (kick), or ban 1h / 1d / 7d. Be fair: jokes and mild words are usually dismiss. Output one line per report: "<id>: <severity> <action> - <very short reason>". You only advise; a human decides.', user: open2.slice(0, 15).map((r) => r.id + ' | ' + r.target + ' | ' + r.text.slice(0, 120) + ' | ' + r.where + ' | ' + (r.auto ? 'auto' : 'player report')).join('\n') || 'no reports', model: 'big', temp: 0.2, max: 500 });
          out.textContent = String(t).slice(0, 1500);
        } catch (e) { out.textContent = 'The AI could not be reached (' + e.message + '). You can still decide yourself.'; }
      };
      if (!open2.length) body.insertAdjacentHTML('beforeend', '<div>No open reports. 🎉</div>');
      for (const r of open2) {
        const d = document.createElement('div'); d.style.cssText = 'border:2px solid #cfd8e8;border-radius:10px;padding:6px;margin:5px 0;background:#fff';
        d.innerHTML = '<div><b>' + esc(r.target) + '</b> <span style="opacity:.7">in ' + esc(r.where || '?') + ' · by ' + esc(r.by) + (r.auto ? ' · auto' : '') + ' · ' + new Date(r.at).toLocaleTimeString() + '</span></div><div style="margin:4px 0">“' + esc(r.text) + '”</div><div class="mdb"></div>';
        const row = d.querySelector('.mdb');
        const act = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'margin:2px;font:700 12px system-ui;padding:3px 7px'; b.onclick = async () => { try { await fn(); await mod('acct-mod-resolve', { rid: r.id, action: label === 'Dismiss' ? 'dismiss' : 'actioned' }); say('Done: ' + label + ' ' + r.target); await refresh(); draw(); } catch (e) { say('Failed: ' + e.message, true); } }; row.appendChild(b); };
        act('Dismiss', async () => {}); act('Kick', () => mod('acct-mod-kick', { target: r.target }));
        act('Ban 1h', () => mod('acct-mod-ban', { target: r.target, until: hours(1), reason: 'Rude or inappropriate chat' })); act('Ban 1d', () => mod('acct-mod-ban', { target: r.target, until: hours(24), reason: 'Rude or inappropriate chat' })); act('Ban 7d', () => mod('acct-mod-ban', { target: r.target, until: hours(168), reason: 'Rude or inappropriate chat' }));
        body.appendChild(d);
      }
    } else {
      body.innerHTML = '<input id="mdFind" placeholder="search player" style="width:100%;box-sizing:border-box;padding:6px;margin:6px 0;border:2px solid #1c3a63;border-radius:8px"><div id="mdList"></div>';
      const list = () => {
        const q = ($('mdFind').value || '').toLowerCase(), box = $('mdList'); box.innerHTML = '';
        for (const u of data.users.filter((x) => x.name.toLowerCase().includes(q)).slice(0, 40)) {
          const staff = ['owner', 'headadmin', 'mod'].includes(u.rank), d = document.createElement('div'); d.style.cssText = 'display:flex;gap:4px;align-items:center;margin:3px 0;flex-wrap:wrap';
          d.innerHTML = '<span style="flex:1;min-width:90px"><b>' + esc(u.name) + '</b> ' + (u.rank ? '<i>' + esc(u.rank) + '</i>' : '') + (u.ban ? ' ⛔' : '') + '</span>';
          if (!staff) {
            const b = (l, fn) => { const x = document.createElement('button'); x.textContent = l; x.style.cssText = 'font:700 11px system-ui;padding:2px 6px'; x.onclick = async () => { try { await fn(); say(l + ': ' + u.name); await refresh(); list(); } catch (e) { say('Failed: ' + e.message, true); } }; d.appendChild(x); };
            b('Kick', () => mod('acct-mod-kick', { target: u.name })); if (u.ban) b('Unban', () => mod('acct-mod-unban', { target: u.name })); else b('Ban 1d', () => mod('acct-mod-ban', { target: u.name, until: hours(24), reason: 'Banned by a moderator' }));
          }
          box.appendChild(d);
        }
      };
      $('mdFind').oninput = list; $('mdFind').onkeydown = (e) => e.stopPropagation(); list();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  root.Moderation = { agent, digest, watch, scan, report, incoming, open, isMod };
})(window);
