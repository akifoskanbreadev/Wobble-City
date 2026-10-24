// Wobble City helper worker (free Cloudflare plan). Does two jobs:
//  1) Build-a-Goose AI: Workers AI binding named  AI   (Settings -> Bindings -> Add -> Workers AI)
//  2) Game sync + lock:  KV namespace binding named SYNC (Settings -> Bindings -> Add -> KV namespace)
// The game sends everything it needs, so improving the game never needs a new copy of this file.
const ALLOW_ORIGIN = 'https://akifoskanbreadev.github.io';
const BIG = '@cf/meta/llama-3.3-70b-instruct-fp8-fast', SMALL = '@cf/meta/llama-3.1-8b-instruct';
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type' };
    const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    const body = await req.json().catch(() => ({}));

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
      if (!cur || cur !== pin) return json({ error: 'bad pin' }, 403);
      if (body.op === 'cfg-auth') return json({ ok: true });
      if (body.op === 'cfg-set') {
        const list = (Array.isArray(body.locked) ? body.locked : []).filter((c) => typeof c === 'string' && /^[a-z]{2,10}$/.test(c) && !['sync', 'codes', 'akif', 'rainbow', 'disco', 'zoom'].includes(c)).slice(0, 30);
        await env.SYNC.put('cfg:locked', JSON.stringify(list)); return json({ ok: true });
      }
      return json({ error: 'bad op' }, 400);
    }

    const { system, user, model } = body;
    if (typeof system !== 'string' || typeof user !== 'string' || system.length > 30000 || user.length > 8000) return new Response('bad request', { status: 400, headers: cors });
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    let text = null;
    for (const m of model === 'big' ? [BIG, SMALL] : [SMALL]) {
      try {
        const r = await env.AI.run(m, { messages, max_tokens: 2200, temperature: 0.8 });
        text = typeof r.response === 'string' ? r.response : JSON.stringify(r.response);
        if (text) break;
      } catch (e) { text = null; }
    }
    return json({ text });
  },
};
