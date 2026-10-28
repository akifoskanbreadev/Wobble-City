// Wobble City helper worker (free Cloudflare plan). Does two jobs:
//  1) Build-a-Goose AI: Workers AI binding named  AI   (Settings -> Bindings -> Add -> Workers AI)
//  2) Game sync + lock:  KV namespace binding named SYNC (Settings -> Bindings -> Add -> KV namespace)
//  3) Accounts: name + password (stored only as a hash), bans, per-player locks and owner pranks. Uses the same SYNC binding.
// The game sends everything it needs, so improving the game never needs a new copy of this file.
// VERSION goes up whenever the game needs new worker features; the owner/head admin panel warns when this copy is older.
const VERSION = 8;
const ALLOW_ORIGIN = 'https://akifoskanbreadev.github.io';
const BIG = '@cf/meta/llama-3.3-70b-instruct-fp8-fast', SMALL = '@cf/meta/llama-3.1-8b-instruct';
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type' };
    const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    const body = await req.json().catch(() => ({}));
    if (body.op === 'ver') return json({ ver: VERSION, ai: !!env.AI, kv: !!env.SYNC });     // lets the game tell whether this worker is up to date and fully set up

    if (typeof body.op === 'string' && body.op.startsWith('sync-')) {
      if (!env.SYNC) return json({ error: 'no SYNC binding' }, 501);
      const hex = (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
      if (!hex(body.key)) return json({ error: 'bad key' }, 400);
      const lock = await env.SYNC.get('l:' + body.key), pin = hex(body.pin) ? body.pin : '';
      const ok = !lock || lock === pin;             // a locked word needs its PIN hash
      if (body.op === 'sync-get') return json(ok ? { save: await env.SYNC.get('s:' + body.key, 'json'), locked: !!lock } : { save: null, locked: true, denied: true });
      if (!ok) return json({ error: 'locked' }, 403);
      if (body.op === 'sync-lock') { if (!hex(body.pin)) return json({ error: 'bad pin' }, 400); await env.SYNC.put('l:' + body.key, body.pin); return json({ ok: true }); }
      if (body.op === 'sync-unlock') { await env.SYNC.delete('l:' + body.key); return json({ ok: true }); }
      const text = JSON.stringify(body.save || null);
      if (body.op !== 'sync-put' || !body.save || typeof body.save !== 'object' || text.length > 400000) return json({ error: 'bad save' }, 400);
      await env.SYNC.put('s:' + body.key, text);
      return json({ ok: true });
    }

    if (typeof body.op === 'string' && body.op.startsWith('cfg-')) {          // owner settings: which codes are locked, behind an owner PIN (hash)
      if (!env.SYNC) return json({ error: 'no SYNC binding' }, 501);
      const hex = (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
      const cur = await env.SYNC.get('cfg:pin'), pin = hex(body.pin) ? body.pin : '';
      if (body.op === 'cfg-get') return json({ locked: JSON.parse((await env.SYNC.get('cfg:locked')) || '[]'), pinSet: !!cur });
      if (body.op === 'cfg-pin') { if (cur || !pin) return json({ error: 'pin' }, 403); await env.SYNC.put('cfg:pin', pin); return json({ ok: true }); }
      let okHead = false;
      if (cur && cur !== pin && body.op === 'cfg-set' && typeof body.hname === 'string' && hex(body.hph)) { const nid = body.hname.trim().toLowerCase(), me = nid ? JSON.parse((await env.SYNC.get('u:' + nid)) || 'null') : null; okHead = !!me && me.ph === body.hph && me.rank === 'headadmin'; }   // head admins may lock/unlock codes
      if (!okHead && (!cur || cur !== pin)) return json({ error: 'bad pin' }, 403);
      if (body.op === 'cfg-auth') return json({ ok: true });
      if (body.op === 'cfg-friend') { if (body.h === '') { await env.SYNC.delete('cfg:friend'); return json({ ok: true }); } if (!hex(body.h)) return json({ error: 'bad hash' }, 400); await env.SYNC.put('cfg:friend', body.h); return json({ ok: true }); }
      if (body.op === 'cfg-get-friend') return json({ set: !!(await env.SYNC.get('cfg:friend')) });
      if (body.op === 'cfg-set') {
        const list = (Array.isArray(body.locked) ? body.locked : []).filter((c) => typeof c === 'string' && /^[a-z]{2,10}$/.test(c) && !['sync', 'codes', 'akif', 'rainbow', 'disco', 'zoom'].includes(c)).slice(0, 30);
        await env.SYNC.put('cfg:locked', JSON.stringify(list)); return json({ ok: true });
      }
      return json({ error: 'bad op' }, 400);
    }


    if (typeof body.op === 'string' && body.op.startsWith('acct-')) {          // accounts: name + password hash, bans, pending owner effects
      if (!env.SYNC) return json({ error: 'no SYNC binding' }, 501);
      const hex = (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
      const nm = (v) => (typeof v === 'string' && /^[A-Za-z0-9_ .-]{3,16}$/.test(v.trim()) ? v.trim() : '');
      const name = nm(body.name), id = name.toLowerCase(), now = Date.now();
      const get = async (n) => JSON.parse((await env.SYNC.get('u:' + n)) || 'null');
      const put = (n, u) => env.SYNC.put('u:' + n, JSON.stringify(u));
      const index = async () => JSON.parse((await env.SYNC.get('idx:users')) || '[]');
      const small = (a) => { const t = JSON.stringify(a || null); return t && t.length < 6000 ? a : null; };
      const view = (u) => ({ rank: u.rank || '', ban: u.ban && (!u.ban.until || u.ban.until > now) ? u.ban : null, locks: u.locks || [], note: u.note || '' });
      // ---- owner operations (need the owner PIN hash)
      const ownerOps = ['acct-list', 'acct-fx', 'acct-ban', 'acct-unban', 'acct-locks', 'acct-reset', 'acct-delete', 'acct-setrank', 'acct-log'];
      if (ownerOps.includes(body.op)) {
        // the owner (PIN) can do everything; a head admin (signed-in account with that rank) can do everything except bans and unbans
        const cur = await env.SYNC.get('cfg:pin'); let level = '', actor = 'owner', headId = '';
        if (cur && hex(body.pin) && cur === body.pin) level = 'owner';
        else if (nm(body.hname) && hex(body.hph)) { const hid = nm(body.hname).toLowerCase(), me = await get(hid); if (me && me.ph === body.hph && me.rank === 'headadmin') { level = 'head'; actor = me.name; headId = hid; } }
        if (!level) return json({ error: 'bad pin' }, 403);
        if (level === 'head' && (body.op === 'acct-ban' || body.op === 'acct-unban')) return json({ error: 'only the owner can ban' }, 403);
        const names = await index();
        const staff = async (n) => { const u2 = await get(n); return !!u2 && (u2.rank === 'owner' || u2.rank === 'headadmin'); };
        if (body.op === 'acct-log') return json({ log: JSON.parse((await env.SYNC.get('log:list')) || '[]').slice(-100).reverse() });
        if (body.op !== 'acct-list') {                                          // keep an audit log of staff actions
          const lg = JSON.parse((await env.SYNC.get('log:list')) || '[]');
          lg.push({ at: now, by: actor, lvl: level, op: body.op.replace('acct-', ''), to: body.targets === '*' ? 'everyone' : (Array.isArray(body.targets) ? body.targets.slice(0, 4).join(', ') + (body.targets.length > 4 ? ' +' + (body.targets.length - 4) : '') : ''), what: String((body.fx && (body.fx.id || body.fx.k)) || body.rank || '').slice(0, 24) });
          if (lg.length > 200) lg.splice(0, lg.length - 200);
          await env.SYNC.put('log:list', JSON.stringify(lg));
        }
        if (body.op === 'acct-list') {
          const out = [];
          for (const n of names.slice(0, 300)) { const u = await get(n); if (u) out.push({ name: u.name, avatar: u.avatar || null, seen: u.seen || 0, where: u.where || '', created: u.created || 0, rank: u.rank || '', ban: u.ban || null, locks: u.locks || [] }); }
          return json({ users: out });
        }
        let targets = body.targets === '*' ? names : (Array.isArray(body.targets) ? body.targets : []).map((t) => String(t).toLowerCase()).filter((t) => names.includes(t));
        if (level === 'head') { const ok = []; for (const t of targets) { if (t === headId || !(await staff(t))) ok.push(t); } targets = ok; }   // a head admin cannot touch the owner or other head admins
        if (body.op === 'acct-fx') {
          const fx = small(body.fx); if (!fx || !fx.k) return json({ error: 'bad fx' }, 400);
          for (const t of targets.slice(0, 120)) { const u = await get(t); if (!u) continue; u.fx = (u.fx || []).concat([{ ...fx, at: now }]).slice(-12); await put(t, u); }
          return json({ ok: true, n: targets.length });
        }
        if (body.op === 'acct-setrank') { const r = ['', 'admin', 'headadmin', 'mod'].includes(body.rank) ? body.rank : null; if (r === null) return json({ error: 'bad rank' }, 400); for (const t of targets) { const u = await get(t); if (!u) continue; u.rank = r; await put(t, u); } return json({ ok: true }); }
        if (body.op === 'acct-ban') { const until = Number(body.until) || 0; for (const t of targets) { const u = await get(t); if (!u) continue; u.ban = { until, reason: String(body.reason || 'Banned').slice(0, 120), at: now }; await put(t, u); } return json({ ok: true }); }
        if (body.op === 'acct-unban') { for (const t of targets) { const u = await get(t); if (!u) continue; u.ban = null; await put(t, u); } return json({ ok: true }); }
        if (body.op === 'acct-locks') { const list = (Array.isArray(body.locked) ? body.locked : []).filter((c) => typeof c === 'string' && /^[a-z]{2,10}$/.test(c) && !['sync', 'codes', 'akif', 'rainbow', 'disco', 'zoom'].includes(c)).slice(0, 30); for (const t of targets) { const u = await get(t); if (!u) continue; u.locks = list; await put(t, u); } return json({ ok: true }); }
        if (body.op === 'acct-reset') { if (!hex(body.ph)) return json({ error: 'bad hash' }, 400); for (const t of targets) { const u = await get(t); if (!u) continue; u.ph = body.ph; await put(t, u); } return json({ ok: true }); }
        if (body.op === 'acct-delete') { const keep = names.filter((n) => !targets.includes(n)); for (const t of targets) await env.SYNC.delete('u:' + t); await env.SYNC.put('idx:users', JSON.stringify(keep)); return json({ ok: true }); }
      }
      // ---- moderator operations: a signed-in account with rank mod (or the owner). Reports, bans up to 30 days, kicks. No pranks, no locks, no resets.
      const modOps = ['acct-mod-reports', 'acct-mod-resolve', 'acct-mod-ban', 'acct-mod-unban', 'acct-mod-kick', 'acct-mod-players'];
      const reps = async () => JSON.parse((await env.SYNC.get('rep:list')) || '[]');
      if (modOps.includes(body.op)) {
        if (!name || !hex(body.ph)) return json({ error: 'bad name or password' }, 400);
        const me = await get(id);
        if (!me || me.ph !== body.ph || !['mod', 'owner'].includes(me.rank)) return json({ error: 'not a moderator' }, 403);
        if (body.op === 'acct-mod-reports') return json({ reports: (await reps()).slice(-80).reverse() });
        if (body.op === 'acct-mod-resolve') { const list = await reps(), r = list.find((x) => x.id === body.rid); if (r) { r.status = body.action === 'actioned' ? 'actioned' : 'dismissed'; r.by = me.name; await env.SYNC.put('rep:list', JSON.stringify(list)); } return json({ ok: true }); }
        const names = await index();
        if (body.op === 'acct-mod-players') {
          const out = []; for (const n of names.slice(0, 300)) { const u2 = await get(n); if (u2) out.push({ name: u2.name, rank: u2.rank || '', seen: u2.seen || 0, where: u2.where || '', ban: u2.ban || null }); }
          return json({ users: out });
        }
        const tid = String(body.target || '').toLowerCase(), t = names.includes(tid) ? await get(tid) : null;
        if (!t) return json({ error: 'no such player' }, 404);
        if (['owner', 'headadmin', 'mod'].includes(t.rank)) return json({ error: 'cannot act on staff' }, 403);
        if (body.op === 'acct-mod-ban') {
          let until = Number(body.until) || 0; const cap = now + 30 * 86400000;
          if (me.rank !== 'owner') until = Math.max(now + 60000, Math.min(until || now + 86400000, cap));
          t.ban = { until, reason: String(body.reason || 'Banned by a moderator').slice(0, 120), at: now, by: me.name }; await put(tid, t); return json({ ok: true });
        }
        if (body.op === 'acct-mod-unban') { t.ban = null; await put(tid, t); return json({ ok: true }); }
        if (body.op === 'acct-mod-kick') { t.fx = (t.fx || []).concat([{ k: 'kick', text: 'A moderator removed you from the game.', at: now }]).slice(-12); await put(tid, t); return json({ ok: true }); }
      }
      // ---- player operations
      if (!name || !hex(body.ph)) return json({ error: 'bad name or password' }, 400);
      if (body.op === 'acct-register') {
        if (await get(id)) return json({ error: 'taken' }, 409);
        const names = await index(); if (names.length >= 1000) return json({ error: 'full' }, 507);
        const u = { name, ph: body.ph, avatar: small(body.avatar), created: now, seen: now, where: '', ban: null, locks: [], fx: [] };
        await put(id, u); names.push(id); await env.SYNC.put('idx:users', JSON.stringify(names));
        return json({ ok: true, ...view(u) });
      }
      const u = await get(id);
      if (!u || u.ph !== body.ph) return json({ error: 'wrong' }, 403);
      if (body.op === 'acct-friend') return json({ error: 'gone' }, 410);
      if (body.op === 'acct-report') {                                           // any signed-in player (or the client's auto filter) reports bad behaviour
        const tn = nm(body.target), text = String(body.text || '').replace(/[<>]/g, '').slice(0, 200);
        if (!tn || !text) return json({ error: 'bad report' }, 400);
        if (now - (u.lastRep || 0) < 4000) return json({ error: 'slow down' }, 429);
        u.lastRep = now; await put(id, u);
        const list = await reps();
        if (!list.find((x) => x.target.toLowerCase() === tn.toLowerCase() && x.text === text && now - x.at < 120000)) {
          list.push({ id: now.toString(36) + Math.random().toString(36).slice(2, 5), at: now, by: u.name, target: tn, text, where: String(body.where || '').slice(0, 20), why: String(body.why || 'chat').slice(0, 20), auto: !!body.auto, status: 'open' });
          if (list.length > 150) list.splice(0, list.length - 150);
          await env.SYNC.put('rep:list', JSON.stringify(list));
        }
        return json({ ok: true });
      }
      if (body.op === 'acct-login' || body.op === 'acct-ping') {
        let dirty = false;
        const cp = await env.SYNC.get('cfg:pin');
        if (cp && hex(body.opin) && body.opin === cp && u.rank !== 'owner') { u.rank = 'owner'; dirty = true; }
        else if (body.rank === 'admin' && !u.rank) { u.rank = 'admin'; dirty = true; }
        const v = view(u);
        if (u.ban && !v.ban) { u.ban = null; dirty = true; }
        const av = small(body.avatar);
        if (body.op === 'acct-login' || (av && JSON.stringify(av) !== JSON.stringify(u.avatar))) { u.avatar = av || u.avatar; dirty = true; }
        if (!u.seen || now - u.seen > 240000 || (typeof body.where === 'string' && body.where.slice(0, 20) !== u.where)) { u.seen = now; u.where = String(body.where || '').slice(0, 20); dirty = true; }
        let fx = [];
        if (!v.ban && u.fx && u.fx.length) { fx = u.fx; u.fx = []; dirty = true; }
        if (dirty) await put(id, u);
        return json({ ok: true, ...v, fx, name: u.name });
      }
      if (body.op === 'acct-pass') { if (!hex(body.nph)) return json({ error: 'bad hash' }, 400); u.ph = body.nph; await put(id, u); return json({ ok: true }); }
      return json({ error: 'bad op' }, 400);
    }

    const { system, user, model } = body;
    if (typeof system !== 'string' || typeof user !== 'string' || system.length > 30000 || user.length > 12000) return new Response('bad request', { status: 400, headers: cors });
    const messages = [{ role: 'system', content: system }];
    if (Array.isArray(body.history)) for (const h of body.history.slice(-8)) if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') messages.push({ role: h.role, content: h.content.slice(0, 1500) });
    // optional screenshot (helper geese): a vision model writes a short caption that is added to the question
    let shot = '';
    if (typeof body.image === 'string' && body.image.length > 200 && body.image.length < 450000) {
      try {
        const bin = atob(body.image), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const r = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', { image: Array.from(bytes), prompt: 'This is a screenshot of a cartoon goose video game. Describe what is on screen: menus, buttons, text, characters, obstacles, and where things are.', max_tokens: 280 });
        shot = String(r.description || r.response || '').slice(0, 1200);
      } catch (e) { shot = ''; }
    }
    messages.push({ role: 'user', content: shot ? user + '\n\n[Screenshot description from a vision model, may be imperfect]\n' + shot : user });
    let text = null;
    for (const m of model === 'big' ? [BIG, SMALL] : [SMALL]) {
      try {
        const r = await env.AI.run(m, { messages, max_tokens: body.max || 2200, temperature: typeof body.temp === 'number' ? Math.max(0, Math.min(1.2, body.temp)) : 0.8 });
        text = typeof r.response === 'string' ? r.response : JSON.stringify(r.response);
        if (text) break;
      } catch (e) { text = null; }
    }
    return json({ text, shot: shot ? 1 : 0 });
  },
};
