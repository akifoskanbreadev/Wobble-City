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

FIRST write a "plan" field (one string, max 300 characters) in which you think about the creature: how many legs, where the head and neck go, what size, which colours, which parts you will add. Then fill in the rest to match your plan. Put "plan" first in the JSON.

DESIGN RECIPES (body frame, +y is down; the body ellipse spans x -38..38, y -24..24):
- Four-legged animal (dog, cat, horse, cow): the goose still stands on 2 real legs; add 2 more legs as "back" rect parts at x -22 and x 22, y 36, w 7, h 26 (a bit longer for tall animals), body wider with shape.w 1.5-2.3, a tail, and ears. Fur colours go on body, wing, neck, head together.
- Snake / worm / eel: shape.w 2.2-2.7, shape.h 0.4-0.6, shape.leg 0.3, foot "none", a long neck (2), tail "long", tailLen 2; add a chain of "ellipse" parts along the body for segments.
- Fish / dolphin / shark: horizontal body (w 1.8, h 0.8), tail "point", parts: a tri tail fin at x -60, a tri dorsal fin on top at y -34, belly lighter than body, foot "none", leg 0.4.
- Jellyfish / squid / octopus: jelly true, jellyK 900-1400, big dome body (h 1.4), shape.leg 0.4, many "line" tentacle parts hanging at y 30..60 (z back, r about 90 +/- 15, w 40, h 5), glowing pastel colours, pattern "spots" or "stars".
- Bird (parrot, owl, eagle): headKind "goose" or "duck", big wings as "ellipse" back parts at x -14, y -10, w 56, h 22, r -25, tail "long" or "fluff", claws.
- Dragon / dinosaur: shape.w 1.8, neck 1.2, horns/spikes extras, a row of "tri" spikes along the back (y -30, z front), tail "long", a big "ellipse" back wing pair, green/red palette.
- Robot / machine: shape.rect true, "rect" parts for armour plates and antennas, grey and blue metals, headKind "box", extras "antenna", foot "box".
- Insect / spider: shape.h 0.7, shape.leg 0.5, 4-6 thin "rect" legs (w 4, h 24) at y 34 with different r, extras "antenna", round head, big eyes ("circle" parts on the head).
- Plant / flower / cactus: green body, parts for petals (ellipses in a ring on the head) or arms (rects), foot "none".
- Food / objects: pick the real colours of the object, make the body the main shape (w/h), add details as parts (a cherry on top, sprinkles with pattern "spots").
- Person / human / king / wizard: extras like "crown","glasses","moustache","scarf", a robe as a big "front" ellipse part, headKind "round".
Heads: look at the head frame (x toward the beak). Eyes are drawn for you. Put ears/horns/hats/hair on the head with a="head" parts, y negative (up).
Quality rules: keep proportions believable; use 3-6 harmonious colours (a darker shade for limbs and a lighter one for the belly); do not leave the default white unless asked; parts must stay inside the allowed ranges; always give legs a visible colour that contrasts the ground; speed/flap fit the creature (heavy 0.7-0.9, light 1.2-1.5); never return an empty object.

Be creative and make it look like what was asked. Use several parts, sensible proportions and a nice matching colour palette. Match the physics to the idea: a tall giraffe has long legs and neck; a dachshund is long, low, with short legs.

Example request "a sausage dog with a crown": {"name":"Crowned Sausage","col":{"body":"#b5733a","wing":"#8f5a2a","neck":"#b5733a","head":"#b5733a","leg":"#8a5a32","beak":"#b5733a"},"shape":{"w":2.5,"h":0.62,"leg":0.5,"neck":0.8,"nx":32,"ny":-3,"ang":-24,"bend":1.2,"hip":[-0.82,0.8]},"headKind":"snout","ears":"droop","tail":"point","foot":"paw","extras":["crown"],"phys":{"speed":1.1,"flap":0.9}}
Example request "a six legged beetle": {"name":"Six-Leg Beetle","col":{"body":"#2e7d32","wing":"#1b5e20","neck":"#2e7d32","head":"#2e7d32","leg":"#1b5e20","beak":"#a5d6a7"},"shape":{"w":1.6,"h":0.9,"leg":0.6,"neck":0.6,"nx":30,"ny":-6,"ang":-30,"bend":1,"hip":[-0.8,0.8]},"headKind":"round","foot":"none","extras":["antenna"],"parts":[{"a":"body","z":"back","k":"rect","x":-20,"y":34,"w":5,"h":22,"r":10,"c":"#1b5e20"},{"a":"body","z":"back","k":"rect","x":0,"y":34,"w":5,"h":24,"r":0,"c":"#1b5e20"},{"a":"body","z":"back","k":"rect","x":20,"y":34,"w":5,"h":22,"r":-10,"c":"#1b5e20"},{"a":"body","z":"front","k":"ellipse","x":-4,"y":-10,"w":50,"h":22,"r":0,"c":"#43a047"}],"phys":{"speed":0.9,"flap":0.8}}
Example request "a glowing jellyfish": {"plan":"dome body, jelly soft, 5 tentacles hanging, pastel pink and cyan glow, short legs hidden, slow floaty","name":"Glow Jelly","col":{"body":"#ff9de2","wing":"#c77dff","neck":"#ff9de2","head":"#ffc2f0","leg":"#8be9ff","beak":"#8be9ff","belly":"#ffe0f7"},"jelly":true,"jellyK":1000,"pattern":"spots","patCol":"#fff0fb","shape":{"w":1.2,"h":1.5,"leg":0.4,"neck":0.9,"nx":28,"ny":-10,"ang":-50,"bend":1},"headKind":"round","foot":"none","tail":"none","parts":[{"a":"body","z":"back","k":"line","x":-20,"y":40,"w":40,"h":5,"r":95,"c":"#8be9ff"},{"a":"body","z":"back","k":"line","x":-6,"y":42,"w":44,"h":5,"r":88,"c":"#c77dff"},{"a":"body","z":"back","k":"line","x":8,"y":42,"w":44,"h":5,"r":92,"c":"#8be9ff"},{"a":"body","z":"back","k":"line","x":22,"y":40,"w":38,"h":5,"r":85,"c":"#c77dff"}],"phys":{"speed":0.8,"flap":1.3}}
Example request "a small dragon": {"plan":"green reptile, longer neck, horns, back spikes, wings, long tail","name":"Pocket Dragon","col":{"body":"#3fa34d","wing":"#2b7a36","neck":"#3fa34d","head":"#4fbf5d","leg":"#2b7a36","beak":"#ffcf5c","belly":"#d9f2a5"},"shape":{"w":1.5,"h":1.05,"leg":0.9,"neck":1.3,"nx":30,"ny":-8,"ang":-55,"bend":1},"headKind":"snout","tail":"long","tailLen":1.6,"foot":"claw","extras":["horns","spikes"],"parts":[{"a":"body","z":"back","k":"ellipse","x":-16,"y":-30,"w":56,"h":22,"r":-35,"c":"#e8613c"},{"a":"body","z":"front","k":"tri","x":-10,"y":-30,"w":14,"h":14,"r":0,"c":"#e8613c"},{"a":"body","z":"front","k":"tri","x":8,"y":-30,"w":14,"h":14,"r":0,"c":"#e8613c"}],"phys":{"speed":1.0,"flap":1.3}}`;

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
  // the older worker only accepts a short prompt: if it says no, retry with the compact version
  const SMALL = () => SYSTEM.replace(/FIRST write a "plan"[\s\S]*?(?=Be creative)/, '').replace(/\nExample request "a glowing jellyfish"[\s\S]*$/, '');
  function ask(prompt, spec, tries, small, image) {
    if (!enabled() || !url()) return Promise.resolve(null);
    const user = spec ? 'Here is the current goose JSON:\n' + JSON.stringify(trim(spec)) + '\nChange it like this (return the FULL updated JSON): ' + prompt : 'Design a goose: ' + prompt;
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, tm = setTimeout(() => { if (ctl) ctl.abort(); }, 45000);
    return fetch(url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(image ? { system: small ? SMALL() : SYSTEM, user, model: 'big', image } : { system: small ? SMALL() : SYSTEM, user, model: 'big' }), signal: ctl ? ctl.signal : undefined })
      .then((r) => (r.ok ? r.json() : r.status === 400 && !small ? { retrySmall: true } : null))
      .then((j) => { clearTimeout(tm); if (j && j.retrySmall) return ask(prompt, spec, tries, true); const raw = j && (j.spec || extractJson(j.text)); const out = raw ? B.sanitize(raw, spec || null) : null; return out || ((tries || 0) < 1 && j ? ask(prompt, spec, 1, small) : null); })
      .catch(() => { clearTimeout(tm); return null; });
  }
  // keep the request small: drop the bookkeeping fields
  function trim(sp) { const o = JSON.parse(JSON.stringify(sp)); delete o.prompt; delete o.seed; delete o.basePrompt; delete o.id; delete o.v; return o; }

  // the AI looks at a picture of the current goose (the worker captions it with a vision model) and improves what looks off
  function review(spec, image, wish) { return ask('You can see a picture of this goose (described below). Fix anything that looks wrong or ugly: proportions, parts that float or overlap oddly, clashing colours, missing details. Keep the idea of the creature. ' + (wish ? 'Also: ' + wish : ''), spec, 0, false, image); }
  // n different takes on the same idea, in parallel
  function variants(prompt, n) { const tasks = []; for (let i = 0; i < n; i++) tasks.push(ask(prompt + ' (variation ' + (i + 1) + ' of ' + n + ': make it clearly different from the others in colours, shape and parts)', null)); return Promise.all(tasks); }
  B.ai = { review, variants, ask, enabled, setEnabled, url, DEFAULT_URL, SYSTEM };
})(window);
