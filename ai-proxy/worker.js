// Cloudflare Worker: lets Build-a-Goose use a real Claude model without exposing your API key.
// Deploy: wrangler deploy; wrangler secret put ANTHROPIC_API_KEY; set ALLOW_ORIGIN below.
// Then in the game's browser console: localStorage.wobbleAiUrl = 'https://YOUR-WORKER.workers.dev'
const ALLOW_ORIGIN = 'https://akifoskanbreadev.github.io';
const SYSTEM = `You design cartoon geese for a game. Reply with ONLY a JSON object (no prose) with keys:
col (hex body colour), pattern (none|stripes|dots|patches), patCol (hex), jelly (bool),
shape {w,h,leg,neck,nx,ny,ang,bend,hip,rect,stiff} (numbers; w,h,leg,neck are scale factors 0.5-3),
headKind, headSize, ears, tail, tailLen, foot, extras (array of strings), name (max 20 chars).
If the user supplies an existing "spec", return a modified copy. Never depict existing copyrighted characters.`;
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    const { prompt, spec } = await req.json().catch(() => ({}));
    if (typeof prompt !== 'string' || prompt.length > 200) return new Response('bad prompt', { status: 400, headers: cors });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 700, system: SYSTEM,
        messages: [{ role: 'user', content: (spec ? 'Current spec: ' + JSON.stringify(spec) + '\nChange: ' : 'Design: ') + prompt }] }),
    });
    const j = await r.json();
    let out = null; try { out = JSON.parse((j.content?.[0]?.text || '').replace(/^[^{]*|[^}]*$/g, '')); } catch (e) {}
    return new Response(JSON.stringify({ spec: out }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
