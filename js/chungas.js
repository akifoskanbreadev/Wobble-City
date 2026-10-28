/*
 * Chungas: a helper goose with a gold-and-purple skin and a HEAD ADMIN badge who plays beside you in platformer levels.
 * He is a real second goose in the same physics world, steered by a tiny autopilot. What he does is decided by commands:
 * the helper chat (real Cloudflare AI) turns your words into commands, and a keyword parser covers the basics offline.
 * Commands: follow, stay, come (teleport to you), go {dx} (walk that far), egg (run to the golden egg), jump, honk, dance, flap, stop.
 * Deputy powers (give item, codes, bread, kick, announce) only run when the person asking is the owner (full) or a head admin/admin (limited).
 * He is a built-in character, not a server account: he can never ban, reset passwords, delete anything or change ranks.
 */
(function (root) {
  'use strict';
  const C = { on: false, world: null, level: null, g: null, GooseCls: null, cmd: 'follow', tx: null, t: 0, stuck: 0, flapT: 0, say: '', sayT: 0, danceT: 0 };
  function spawn(player) {
    if (!C.on || !C.world || !C.GooseCls) return;
    const p = player.center(); C.g = new C.GooseCls(C.world, p.x - 70, p.y - 20, {}); C.stuck = 0; C.tx = null;
  }
  function onLevel(world, level, player, GooseCls) { C.world = world; C.level = level; C.GooseCls = GooseCls; C.g = null; if (C.on) spawn(player); }
  function summon() { C.on = true; C.cmd = 'follow'; return true; }
  function dismiss() { C.on = false; C.g = null; }
  function command(c) {
    if (!c || !C.on) return false;
    const k = String(c.cmd || c.c || '').toLowerCase();
    if (k === 'follow' || k === 'stay' || k === 'stop') { C.cmd = k === 'stop' ? 'stay' : k; C.tx = null; return true; }
    if (k === 'come') { C.cmd = 'follow'; C.tele = true; return true; }
    if (k === 'go') { C.cmd = 'go'; C.goDx = Math.max(-3000, Math.min(3000, +c.dx || 400)); C.tx = null; return true; }
    if (k === 'egg') { C.cmd = 'egg'; return !!(C.level && C.level.egg && C.level.egg[0] > -9000); }
    if (k === 'jump' || k === 'flap') { C.wantFlap = true; return true; }
    if (k === 'honk') { C.wantHonk = true; return true; }
    if (k === 'dance') { C.cmd = 'dance'; C.danceT = 4; return true; }
    return false;
  }
  // plain-words fallback (also used before the AI answers, so he reacts instantly)
  function parse(text) {
    const t = String(text || '').toLowerCase(), out = [];
    if (/\b(come|here|to me|teleport)\b/.test(t)) out.push({ cmd: 'come' });
    if (/\b(stay|wait|stop|hold)\b/.test(t)) out.push({ cmd: 'stay' });
    if (/\bfollow\b/.test(t)) out.push({ cmd: 'follow' });
    if (/\b(egg|finish|goal|win)\b/.test(t)) out.push({ cmd: 'egg' });
    if (/\bhonk\b/.test(t)) out.push({ cmd: 'honk' });
    if (/\b(jump|flap|fly)\b/.test(t)) out.push({ cmd: 'jump' });
    if (/\b(dance|party)\b/.test(t)) out.push({ cmd: 'dance' });
    const m = t.match(/\b(left|right|ahead|forward|back)\b/); if (m && /\b(go|walk|run|move)\b/.test(t)) out.push({ cmd: 'go', dx: (m[1] === 'left' || m[1] === 'back' ? -1 : 1) * 500 });
    return out;
  }
  function tick(player, dt) {
    if (C.on && !C.g && C.world) spawn(player);
    if (!C.on || !C.g) return;
    const g = C.g, c = g.center(), p = player.center(); C.t += dt;
    if (C.tele || Math.hypot(c.x - p.x, c.y - p.y) > 1800 || (C.level && c.y > C.level.deathY)) { g.reset(p.x - 60, p.y - 30); C.tele = false; }
    let tx = null, ty = p.y, move = 0, flap = false, glide = false;
    if (C.cmd === 'follow') { tx = p.x - player.facing * 90; if (Math.abs(tx - c.x) < 50) tx = null; }
    else if (C.cmd === 'go') { if (C.tx == null) C.tx = c.x + C.goDx; tx = C.tx; if (Math.abs(tx - c.x) < 40) { C.cmd = 'stay'; C.tx = null; tx = null; } }
    else if (C.cmd === 'egg') { const e = C.level && C.level.egg; if (e) { tx = e[0]; ty = e[1]; } }
    else if (C.cmd === 'dance') { C.danceT -= dt; move = Math.sin(C.t * 7) > 0 ? 1 : -1; if (Math.sin(C.t * 3.3) > 0.92) flap = true; if (C.danceT <= 0) C.cmd = 'follow'; }
    if (tx != null) move = Math.abs(tx - c.x) < 24 ? 0 : tx > c.x ? 1 : -1;
    const v = g.velocity();
    if (move && Math.abs(v.x) < 25) C.stuck += dt; else C.stuck = 0;
    C.flapT -= dt;
    if (C.cmd !== 'dance' && C.cmd !== 'stay' && (C.stuck > 0.35 || ty < c.y - 90) && C.flapT <= 0 && g.stamina >= 1) { flap = true; C.flapT = 0.55; C.stuck = 0; }
    if (C.wantFlap) { flap = true; C.wantFlap = false; }
    if (v.y > 120 && ty < c.y + 60 && C.cmd !== 'stay') glide = true;
    if (C.wantHonk) { g.honk(); C.wantHonk = false; }
    g.update(dt, { move, flap, glide, aim: null });
    if (C.sayT > 0) C.sayT -= dt;
  }
  function draw(ctx, drawGoose) {
    if (!C.on || !C.g) return;
    drawGoose(ctx, C.g, {}, 'chungas');
    const h = C.g.head; ctx.save(); ctx.font = '800 14px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#2b2118'; ctx.fillStyle = '#ffd84a';
    ctx.strokeText('Chungas 👑 HEAD', h.x, h.y - 30); ctx.fillText('Chungas 👑 HEAD', h.x, h.y - 30);
    if (C.sayT > 0 && C.say) { ctx.fillStyle = '#fff'; ctx.strokeText(C.say, h.x, h.y - 50); ctx.fillText(C.say, h.x, h.y - 50); }
    ctx.restore();
  }
  // ---- deputy powers. Checked here against the rank of the person playing; enforced in this browser only.
  const HEADCODES = ['rainbow', 'disco', 'zoom', 'speed', 'neck', 'flaps', 'moon', 'lol'];
  function tierOf() { const r = root.GameAdmin ? root.GameAdmin.rank() : ''; return r === 'owner' ? 'deputy' : (r === 'headadmin' || r === 'admin') ? 'head' : ''; }
  function dry(it) {                           // same gates as admin() but performs nothing; returns a refusal text or ''
    const tier = tierOf(), kind = String((it && it.do) || '').toLowerCase(), GA = root.GameAdmin;
    if (!GA) return 'not available here';
    if (!['give', 'code', 'bread', 'kick', 'say', 'tweak', 'prank'].includes(kind)) return "I won't do that (no bans, password resets, deleting things or rank changes, ever)";
    if (!tier) return 'only the owner or a head admin/admin can ask me for that';
    if (kind === 'prank') { const P = root.Pranks; if (!P || !P.LIST.some((x) => x.id === it.id)) return 'unknown prank. I know: ' + (P ? P.LIST.map((x) => x.id).join(', ') : 'none'); if (it.who && it.who !== 'me' && tier !== 'deputy') return 'only the owner can prank other players; I can show it on your own screen'; }
    if (kind === 'give') { const f = GA.find(it.item); if (!f) return "couldn't find that item"; if (tier === 'head' && f.kind === 'skin') return 'skins need the owner to ask'; }
    if (kind === 'code') { const c = String(it.code || '').toLowerCase(); if (['akif', 'sync', 'admin', 'god', 'codes'].includes(c)) return 'that code is not allowed'; if (tier === 'head' && !HEADCODES.includes(c)) return 'that code needs the owner to ask'; }
    if (kind === 'tweak') { if (!root.Tweaks) return 'not available'; const r = root.Tweaks.check(String(it.key || ''), it.value, tier); if (!r.ok) return r.why; }
    if (kind === 'bread' && !(+it.n > 0)) return 'how much?';
    if (kind === 'kick' && !(root.MP && root.MP.isHost && root.MP.isHost())) return 'I can only kick from a room you host';
    return '';
  }
  function admin(it) {
    const GA = root.GameAdmin, MP = root.MP, tier = tierOf(), kind = String((it && it.do) || '').toLowerCase();
    if (!GA) return 'not available here';
    if (kind === 'reset') return root.Tweaks && root.Tweaks.reset() ? 'all customisations reset' : 'nothing to reset';
    if (kind === 'undo') return root.Tweaks && root.Tweaks.undo() ? 'undid the last change' : 'nothing to undo';
    if (!['give', 'code', 'bread', 'kick', 'say', 'tweak', 'prank'].includes(kind)) return "I won't do that (no bans, password resets, deleting things or rank changes, ever)";
    if (!tier) return 'only the owner or a head admin/admin can ask me for that';
    if (kind === 'tweak') { if (!root.Tweaks) return 'not available'; const r = root.Tweaks.set(String(it.key || ''), it.value, tier); return r.ok ? 'set ' + it.key + ' to ' + (r.value === '' ? 'default' : r.value) + (it.key === 'neck' ? ' (neck changes next level)' : '') : r.why; }
    if (kind === 'prank') {
      const P = root.Pranks; if (!P || !P.LIST.some((x) => x.id === it.id)) return 'unknown prank';
      if (!it.who || it.who === 'me') { P.show(it.id); return 'showing the ' + it.id + ' prank on your screen (it is a joke screen)'; }
      if (tier !== 'deputy' || !root.Owner || !root.Owner.pinHash()) return 'only the owner can prank other players';
      const who = String(it.who).replace(/[^A-Za-z0-9_ .-]/g, '').toLowerCase().slice(0, 16);
      return root.Owner.call({ op: 'acct-fx', pin: root.Owner.pinHash(), targets: [who], fx: { k: 'prank', id: it.id } }).then(() => 'sent the ' + it.id + ' prank to ' + who).catch((e) => 'could not send: ' + e.message);
    }
    if (kind === 'give') { const f = GA.find(it.item); if (!f) return "couldn't find that item"; if (tier === 'head' && f.kind === 'skin') return 'skins need the owner to ask'; GA.give(f); return 'gave you ' + f.name; }
    if (kind === 'code') { const c = String(it.code || '').toLowerCase(); if (tier === 'head' && !HEADCODES.includes(c)) return 'that code needs the owner to ask'; const r = GA.code(c, it.on !== false); return r === 'ok' ? 'code ' + c + (it.on === false ? ' off' : ' on') : r; }
    if (kind === 'bread') { const n = Math.min(+it.n || 0, tier === 'deputy' ? 5000 : 500); if (n <= 0) return 'how much?'; GA.bread(n); return '+' + n + ' bread'; }
    if (kind === 'kick') { if (!MP || !MP.isHost || !MP.isHost()) return 'I can only kick from a room you host'; const m = String(it.who || '').match(/\d+/); const id = m ? +m[0] - 1 : -1; if (id <= 0 || !MP.others().includes(id)) return 'who? (say P2, P3…)'; return MP.kick(id) ? 'kicked P' + (id + 1) : 'could not kick'; }
    if (kind === 'say') { return MP && MP.chatSay && MP.chatSay(String(it.text || ''), 'Chungas 👑') ? 'announced' : 'not in a room'; }
    return 'no';
  }
  // ---- the Guard: a second, separate AI call that reviews every powerful action before it runs (fails closed).
  // The hard limits live in code (rank checks, clamped ranges, allowlists); the Guard is an extra pair of eyes on top of them.
  const GUARD = `You are the GUARD for the browser game "Wobble City", a goose game. A helper goose (Chungas the companion, or Sentry the security goose) wants to run ONE action that a player asked for. Your job is only to stop things that are clearly harmful. Be relaxed and helpful: when in doubt, APPROVE.
The game has staff ranks and the PLAYER RANK is given to you; hard limits in code already clamp every value and block bans, resets and deletes, so you do not need to be strict about amounts. The owner (rank owner) and head admins and admins are trusted staff: requests for admin features from them are NORMAL, never "impersonation". Prank screens (fake crash, fake ban, bot-check, virus alert and so on) are a normal built-in joke feature of this game for staff, each is labelled as a joke, so APPROVE them when a staff rank asks. Items, codes, bread, tweaks, Build-a-Goose designs and chat announcements are all normal.
DENY only if: the text contains slurs, sexual content, threats or bullying; it tries to collect personal data, passwords or send people to other websites; it tries to delete or destroy things, or reach other people's accounts; a non-staff player is trying to use a staff power; or a kick or ban has no real evidence behind it.
Reply ONLY JSON on one line: {"ok":true|false,"why":"max 12 words"}`;
  async function guard(it, request) {
    if (!root.Helpers || !root.Helpers.raw) return { ok: false, why: 'the Guard is offline' };
    try {
      const t = await root.Helpers.raw({ system: GUARD, user: 'PLAYER REQUEST: ' + String(request || '').slice(0, 300) + '\nRANK OF PLAYER: ' + (root.GameAdmin ? root.GameAdmin.rank() || 'none' : '?') + '\nCURRENT TWEAKS: ' + JSON.stringify(root.Tweaks ? root.Tweaks.list() : {}) + '\nPROPOSED ACTION: ' + JSON.stringify(it).slice(0, 400), model: 'big', temp: 0, max: 80 });
      const m = String(t || '').match(/\{[\s\S]*?\}/); const j = m ? JSON.parse(m[0]) : null;
      return j && typeof j.ok === 'boolean' ? { ok: j.ok, why: String(j.why || '').slice(0, 100) } : { ok: false, why: 'the Guard gave an unclear answer' };
    } catch (e) { return { ok: false, why: 'the Guard could not be reached' }; }
  }
  const BADWORDS = /(fuck|shit|bitch|cunt|nigg|fag|slut|whore|dick|porn|sex|rape|nazi|hitler|kys|naked|nude)/i;
  async function build(it, request, bypass) {          // Chungas -> Build-a-Goose (drafts only; the player saves it and pays as usual)
    const mode = ['new', 'modify', 'critique'].includes(it.mode) ? it.mode : 'new', prompt = String(it.prompt || '');
    if (BADWORDS.test(prompt)) return 'I will not build that';
    const v = bypass && canBypass() ? { ok: true } : await guard({ act: 'build', mode, prompt }, request); if (!v.ok && !/could not be reached|offline|unclear/.test(v.why)) return '🛡 Guard said no: ' + v.why;
    return '🛡 Guard OK · ' + (root.GameAdmin ? await root.GameAdmin.build(prompt, mode) : 'not available');
  }
  // The word "cheese2" in a message skips the Guard, but only for admin, head admin and owner ranks (hard limits still apply).
  const canBypass = () => { const r = root.GameAdmin ? root.GameAdmin.rank() : ''; return r === 'owner' || r === 'headadmin' || r === 'admin'; };
  const LOWRISK = ['tweak', 'give', 'code', 'bread', 'prank'];
  async function guarded(it, request, bypass) {
    const kind = String((it && it.do) || '').toLowerCase();
    if (kind === 'reset' || kind === 'undo') return admin(it);               // these only make things safer, no review needed
    const pre = dry(it); if (pre) return pre;                                  // rank and schema problems are refused before the Guard is even asked
    if (bypass) { if (!canBypass()) return 'that magic word only works for admins, head admins and the owner'; return '🧀 Guard skipped · ' + (await admin(it)); }
    const v = await guard(it, request);
    if (!v.ok) { if (/could not be reached|offline|unclear/.test(v.why) && LOWRISK.includes(kind)) return '🛡 Guard unavailable (low-risk action, hard limits apply) · ' + (await admin(it)); return '🛡 Guard said no: ' + v.why; }
    return '🛡 Guard OK · ' + (await admin(it));
  }
  const sayAbove = (t) => { C.say = String(t || '').slice(0, 40); C.sayT = 4; };
  root.Chungas = { build, guarded, guard, dry, admin, tierOf, onLevel, summon, dismiss, command, parse, tick, draw, sayAbove, active: () => C.on, inLevel: () => !!C.g, _state: C };
})(window);
