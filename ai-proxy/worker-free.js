// FREE version: uses Cloudflare's built-in Workers AI (free daily allowance, no API key, no credit card).
// Setup: paste this into a Cloudflare Worker, then Settings -> Bindings -> Add -> Workers AI, variable name: AI
const ALLOW_ORIGIN = 'https://akifoskanbreadev.github.io';
const SYSTEM = `You design cartoon geese for a game. Reply with ONLY a JSON object, no other words, with keys:
col (hex body colour like "#ff8800"), pattern ("none","stripes","dots" or "patches"), patCol (hex), jelly (true/false),
shape {w,h,leg,neck,nx,ny,ang,bend,hip,rect,stiff} (w,h,leg,neck are numbers between 0.5 and 3), headKind, headSize, ears, tail, tailLen, foot,
extras (array of strings), name (max 20 characters). If an existing "spec" is given, return a changed copy of it. Never copy existing copyrighted characters.`;
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    const { prompt, spec } = await req.json().catch(() => ({}));
    if (typeof prompt !== 'string' || prompt.length > 200) return new Response('bad prompt', { status: 400, headers: cors });
    let out = null;
    try {
      const r = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { max_tokens: 500, messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: (spec ? 'Current spec: ' + JSON.stringify(spec) + '\nChange: ' : 'Design: ') + prompt }] });
      const t = typeof r.response === 'string' ? r.response : JSON.stringify(r.response);
      out = JSON.parse(t.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
    } catch (e) { out = null; }
    return new Response(JSON.stringify({ spec: out }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
