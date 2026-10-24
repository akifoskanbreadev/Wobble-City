// Wobble City helper worker (free Cloudflare plan). Does two jobs:
//  1) Build-a-Goose AI: Workers AI binding named  AI   (Settings -> Bindings -> Add -> Workers AI)
//  2) Game sync:        KV namespace binding named SYNC (Settings -> Bindings -> Add -> KV namespace)
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

    if (body.op === 'sync-get' || body.op === 'sync-put') {
      if (!env.SYNC) return json({ error: 'no SYNC binding' }, 501);
      if (typeof body.key !== 'string' || !/^[0-9a-f]{64}$/.test(body.key)) return json({ error: 'bad key' }, 400);
      if (body.op === 'sync-get') return json({ save: await env.SYNC.get('s:' + body.key, 'json') });
      const text = JSON.stringify(body.save || null);
      if (!body.save || typeof body.save !== 'object' || text.length > 400000) return json({ error: 'bad save' }, 400);
      await env.SYNC.put('s:' + body.key, text);
      return json({ ok: true });
    }

    const { system, user, model } = body;
    if (typeof system !== 'string' || typeof user !== 'string' || system.length > 8000 || user.length > 4000) return new Response('bad request', { status: 400, headers: cors });
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    let text = null;
    for (const m of model === 'big' ? [BIG, SMALL] : [SMALL]) {
      try {
        const r = await env.AI.run(m, { messages, max_tokens: 1400, temperature: 0.8 });
        text = typeof r.response === 'string' ? r.response : JSON.stringify(r.response);
        if (text) break;
      } catch (e) { text = null; }
    }
    return json({ text });
  },
};
