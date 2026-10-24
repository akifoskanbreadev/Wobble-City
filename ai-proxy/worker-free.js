// FREE AI helper for Build-a-Goose (Cloudflare Workers AI: free daily allowance, no API key, no credit card).
// Setup: paste this into your Worker, Deploy, then Settings -> Bindings -> Add -> Workers AI, variable name: AI
// The game sends the instructions itself, so improving the game never needs a new copy of this file.
const ALLOW_ORIGIN = 'https://akifoskanbreadev.github.io';
const BIG = '@cf/meta/llama-3.3-70b-instruct-fp8-fast', SMALL = '@cf/meta/llama-3.1-8b-instruct';
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    const { system, user, model } = await req.json().catch(() => ({}));
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
    return new Response(JSON.stringify({ text }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
