/*
 * Real AI for Build-a-Goose (optional, off unless ticked). The page sends the design request to the owner's own tiny worker
 * (see ai-proxy/), which runs a free Cloudflare Workers AI model, and gets back a goose spec as JSON.
 * Everything the AI returns goes through BuildAGoose.sanitize, so bad or odd answers can never break the game.
 */
(function (root) {
  'use strict';
  const B = root.BuildAGoose;
  const DEFAULT_URL = 'https://workers-playground-rapid-brook-325c.akifoskanbread.workers.dev';
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignore */ } };

  const SYSTEM = `You are the character designer for a physics game about a goose with a very wobbly neck. You design a goose "skin" as ONE JSON object. Reply with ONLY the JSON, no words before or after, no markdown.

The goose is drawn side-on facing right. Coordinates are in pixels. In the BODY frame the body is an ellipse 76 wide and 48 tall centred on (0,0); +x is toward the front, +y is DOWN, so negative y is up. In the HEAD frame the head is a circle of radius 10 centred on (0,0), +x is the beak direction.

Fields (all optional, leave out what you do not want to change):
- name: string, max 20 characters.
- col: {body, wing, neck, head, leg, beak, belly, eye}: hex colours like "#ff8800". belly and eye may be null.
- pattern: "none"|"stripes"|"spots"|"checks"|"stars"|"hearts"|"rainbow"|"swirl", patCol: hex colour of the pattern.
- jelly: true makes a squishy soft body (jellyK 700 soft ... 3500 firm, default 1500).
- shape: the real physical body. w = body length multiplier 0.5-2.7. h = body height multiplier 0.4-2.2. leg = leg length multiplier 0.3-2.1. neck = neck length multiplier 0.4-2.5. nx, ny = where the neck is attached on the body in pixels (nx -34..40, ny -40..8; nx 24 is the front, nx -24 the back, ny -17 the top). ang = the neck's resting direction in degrees (-90 straight up, -140 leaning back, 0 straight forward, -20 nearly horizontal). bend = how much the neck curves, -2..8 (0 straight, 6 swan curve). hip = [back, front] where the two legs attach as fractions of the body half-length, each between -1 and 1 (default [-0.46, 0.46]; wide stance [-0.9, 0.9]). rect = true makes a boxy body.
- stiffMul: 0.5 floppy neck .. 1.8 stiff neck.
- phys: {speed 0.7-1.6 walking speed, flap 0.75-1.5 flap power}. Use this for the personality: heavy animals slower, light or fast ones faster.
- headKind: "goose"|"duck"|"snout"|"pig"|"cat"|"round"|"box", headSize 0.6-2, ears: "bunny"|"cat"|"droop"|"big"|null, tail: "default"|"long"|"fluff"|"point"|"none", tailLen 0.3-2.5, foot: "claw"|"paw"|"box"|"hoof"|"none", legW 0.5-2.5 (leg thickness), neckW 0.5-2.5.
- extras: any of "crown","bow","glasses","shades","horns","antlers","mohawk","halo","antenna","moustache","shell","spikes","blush","tusks","scarf","freckles","bigwings","cat","froggy".
- parts: up to 14 EXTRA BODY PARTS you invent, each {a:"body"|"head", z:"back"|"front", k:"ellipse"|"rect"|"tri"|"circle"|"line"|"star", x, y, w, h, r, c}. x,y = centre, w,h = size, r = rotation in degrees, c = hex colour. z "back" draws behind the body (extra legs, tails, fins, tentacles, back wings), "front" draws on top (spikes, saddle, armour plates, a second row of eyes). For a="body": x -75..75, y -65..75, w,h up to 90. For a="head": x -30..40, y -35..35, w,h up to 34. Use parts to give extra legs (tall thin "rect"s at y 30..60), tentacles ("line"s), big wings ("ellipse"s), fins ("tri"s), flowers, hats, horns, anything.

Be creative and make it look like what was asked. Use several parts, sensible proportions and a nice matching colour palette. Match the physics to the idea: a tall giraffe has long legs and neck; a dachshund is long, low, with short legs.

Example request "a sausage dog with a crown": {"name":"Crowned Sausage","col":{"body":"#b5733a","wing":"#8f5a2a","neck":"#b5733a","head":"#b5733a","leg":"#8a5a32","beak":"#b5733a"},"shape":{"w":2.5,"h":0.62,"leg":0.5,"neck":0.8,"nx":32,"ny":-3,"ang":-24,"bend":1.2,"hip":[-0.82,0.8]},"headKind":"snout","ears":"droop","tail":"point","foot":"paw","extras":["crown"],"phys":{"speed":1.1,"flap":0.9}}
Example request "a six legged beetle": {"name":"Six-Leg Beetle","col":{"body":"#2e7d32","wing":"#1b5e20","neck":"#2e7d32","head":"#2e7d32","leg":"#1b5e20","beak":"#a5d6a7"},"shape":{"w":1.6,"h":0.9,"leg":0.6,"neck":0.6,"nx":30,"ny":-6,"ang":-30,"bend":1,"hip":[-0.8,0.8]},"headKind":"round","foot":"none","extras":["antenna"],"parts":[{"a":"body","z":"back","k":"rect","x":-20,"y":34,"w":5,"h":22,"r":10,"c":"#1b5e20"},{"a":"body","z":"back","k":"rect","x":0,"y":34,"w":5,"h":24,"r":0,"c":"#1b5e20"},{"a":"body","z":"back","k":"rect","x":20,"y":34,"w":5,"h":22,"r":-10,"c":"#1b5e20"},{"a":"body","z":"front","k":"ellipse","x":-4,"y":-10,"w":50,"h":22,"r":0,"c":"#43a047"}],"phys":{"speed":0.9,"flap":0.8}}`;

  function enabled() { return get('wobbleAiOn') !== '0'; }
  function setEnabled(v) { set('wobbleAiOn', v ? '1' : '0'); }
  const url = () => get('wobbleAiUrl') || DEFAULT_URL;

  function extractJson(t) {
    if (typeof t !== 'string') return null;
    const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b <= a) return null;
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* try to repair a trailing comma */ }
    try { return JSON.parse(t.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')); } catch (e) { return null; }
  }
  // ask(prompt, currentSpec?) -> Promise<spec | null>   (null = AI unavailable, use the built-in generator)
  function ask(prompt, spec) {
    if (!enabled() || !url()) return Promise.resolve(null);
    const user = spec ? 'Here is the current goose JSON:\n' + JSON.stringify(trim(spec)) + '\nChange it like this (return the FULL updated JSON): ' + prompt : 'Design a goose: ' + prompt;
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, tm = setTimeout(() => { if (ctl) ctl.abort(); }, 45000);
    return fetch(url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: SYSTEM, user, model: 'big' }), signal: ctl ? ctl.signal : undefined })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { clearTimeout(tm); const raw = j && (j.spec || extractJson(j.text)); return raw ? B.sanitize(raw, spec || null) : null; })
      .catch(() => { clearTimeout(tm); return null; });
  }
  // keep the request small: drop the bookkeeping fields
  function trim(sp) { const o = JSON.parse(JSON.stringify(sp)); delete o.prompt; delete o.seed; delete o.basePrompt; delete o.id; delete o.v; return o; }

  B.ai = { ask, enabled, setEnabled, url, DEFAULT_URL, SYSTEM };
})(window);
