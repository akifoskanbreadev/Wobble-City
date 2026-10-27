/*
 * Chungas: a helper goose with a gold-and-purple skin and a HEAD ADMIN badge who plays beside you in platformer levels.
 * He is a real second goose in the same physics world, steered by a tiny autopilot. What he does is decided by commands:
 * the helper chat (real Cloudflare AI) turns your words into commands, and a keyword parser covers the basics offline.
 * Commands: follow, stay, come (teleport to you), go {dx} (walk that far), egg (run to the golden egg), jump, honk, dance, flap, stop.
 * He is a built-in character, not a server account, and his "head admin" is a badge only: he cannot ban, lock or prank anyone.
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
  const sayAbove = (t) => { C.say = String(t || '').slice(0, 40); C.sayT = 4; };
  root.Chungas = { onLevel, summon, dismiss, command, parse, tick, draw, sayAbove, active: () => C.on, inLevel: () => !!C.g, _state: C };
})(window);
