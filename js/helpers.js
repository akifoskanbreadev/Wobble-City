/*
 * Helper geese: Tot, Cheddar and Bartholamew. A button in the bottom-left summons one (the ones that are not already here or
 * resting). A tiny goose sits on your "shoulder" (a perch above the button) and you can ask it anything, in any mode.
 * Each question sends the AI: the guide (README + built-in knowledge), a text description of the screen, a small screenshot of
 * the canvases (the worker captions it with a vision model) and the chat so far. The goose answers in character and can also
 * open a menu or point at a button for you. "Conversation done" sends it away (it rests for a moment).
 * If the AI cannot be reached the goose falls back to searching the guide offline.
 *
 * Helpers.init({ ctx: () => ({...game state}) })   Helpers.summon(name)   Helpers.dismiss(name)   Helpers.ask(text)
 */
(function (root) {
  'use strict';
  const DEFAULT_URL = 'https://workers-playground-rapid-brook-325c.akifoskanbread.workers.dev';
  const url = () => { try { return root.localStorage.wobbleAiUrl || DEFAULT_URL; } catch (e) { return DEFAULT_URL; } };
  const NAMES = ['tot', 'cheddar', 'bartholamew', 'chungas'];
  const BIO = {
    tot: { label: 'Tot', col: '#ffd84a', hat: 'bow', trait: 'Tot is a tiny, excitable gosling. Cheerful, uses short sentences and the odd "peep!". Loves bread.' },
    cheddar: { label: 'Cheddar', col: '#ff9f3a', hat: 'cheese', trait: 'Cheddar is a cool, laid-back goose with a cheese-wedge hat. Chilled out, a bit punny (cheese puns), but always clear.' },
    chungas: { label: 'Chungas', col: '#f2b632', hat: 'crown', trait: 'Chungas is a big, confident, golden-and-purple goose with a crown and the HEAD ADMIN badge. He is a player-style companion who really plays beside the player in platformer levels and does whatever he is asked. Bold, friendly, a little cocky, short sentences.' },
    bartholamew: { label: 'Bartholamew', col: '#f4f4f4', hat: 'top', trait: 'Bartholamew is a posh, dignified goose with a top hat and monocle. Polite and slightly pompous, but warm and precise.' },
  };
  let cfg = { ctx: () => ({}) };
  const S = { here: {}, rest: {}, active: '', open: false, hist: {}, busy: false, look: true, kb: '' };
  let ui = null;
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lsGet = (k, d) => { try { const v = root.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { root.localStorage.setItem(k, v); } catch (e) { /* ignore */ } };

  // ------------------------------------------------------------------ what the geese know
  const BUILTIN = `
WOBBLE CITY, EXTRA FACTS (the player is playing a mobile-friendly HTML5 goose game; the player never needs to install anything):
- Main menu buttons: Minigames, Store, Code, Battle Tower, Account, Multiplayer, 3D Hide & Seek, Mecha Chameleon, Goose Among Us, Sound, Neck mode, Enemies. On the right: difficulty picker, level picker and Play.
- In a level: the goose's neck is wobbly. Walk, flap (hold to glide), aim the neck with the mouse or the NECK pad, honk to scare projectiles. Touch the golden egg with your HEAD to win. Bread is the money. Checkpoints save your place; falling in spikes or lava respawns you.
- The Menu (☰) button in every game goes back to the main menu.
- Accounts: you must make a name and password (Account button / first start). Passwords are only stored as hashes and nobody can read them.
- Ranks: admin code gives the admin console; head admins are picked by the owner and get an orange HEAD button; the owner has a red ADMIN button after the secret owner PIN.
- Online modes use a room word: everyone types the same word, the first person hosts. Every online mode also has a "Random lobby" button that automatically looks for other players who press it too.
- Goose Among Us: geese (crew) do tasks, Foxes sneak-kill; report bodies, discuss in chat, vote. Fog of war uses real line of sight; in a blackout geese only get a tiny glow plus a flashlight beam in the direction they move. Fix the lights at the fuse panel in the Storage Barn. Roles are random, you cannot choose. Quick chat phrases and typing are both available in meetings.
- Mecha Chameleon (2D hide and seek): the chameleon blends into the background; seekers hunt. Whistle (W) in hide-and-seek modes.
- 3D Hide & Seek: Roblox-style, no neck. Hide behind real cover; seekers find you. Whistle to make a sound from your spot.
- Battle Tower: climb floors, beat monsters, open chests for weapons and armor; bosses every 5th floor. Melee weapons strike from the head. Attack with F / the sword button.
- Shop: Animals (skins), Shapes, Jelly, Build-a-Goose (describe a skin to the AI), and cosmetics: hats, glasses, neckwear, body, shoes, trails, voices and body physics (jelly, bouncy, slippery, glide, hop...). Body physics change how your goose moves and each one has its own look.
- Sync: the Code box has the code "sync" to link your save across devices with a shared word (optional PIN lock).
- If something online will not connect: some networks (school Wi-Fi, strict mobile data) block direct connections. Try another network or a different room word.
`;

  async function loadKB() {
    if (S.kb) return S.kb;
    let readme = '';
    try { const r = await fetch('README.md', { cache: 'force-cache' }); if (r.ok) readme = (await r.text()).slice(0, 15000); } catch (e) { /* offline */ }
    S.kb = BUILTIN + '\nTHE GAME GUIDE (README):\n' + readme;
    return S.kb;
  }

  // ------------------------------------------------------------------ the screen
  const visible = (e) => { if (!e || e.closest('#hlpRoot')) return false; const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  function snapshot() {
    try {
      const W = 480, k = Math.min(1, W / innerWidth), c = document.createElement('canvas'); c.width = Math.round(innerWidth * k); c.height = Math.round(innerHeight * k);
      const x = c.getContext('2d'); x.fillStyle = '#222'; x.fillRect(0, 0, c.width, c.height);
      let drew = 0;
      for (const cv of document.querySelectorAll('canvas')) {
        if (!visible(cv) || cv.width < 50) continue; const r = cv.getBoundingClientRect();
        try { x.drawImage(cv, r.left * k, r.top * k, r.width * k, r.height * k); drew++; } catch (e) { /* tainted or lost */ }
      }
      if (!drew) return '';
      const d = c.toDataURL('image/jpeg', 0.55); return d.slice(d.indexOf(',') + 1);
    } catch (e) { return ''; }
  }
  function describeScreen() {
    const out = [];
    let ctxo = {}; try { ctxo = cfg.ctx() || {}; } catch (e) { /* ignore */ }
    if (Object.keys(ctxo).length) out.push('Game state: ' + JSON.stringify(ctxo));
    // text of whatever is on screen, top layers first
    const texts = [], seen = new Set();
    const layers = [...document.body.children].filter((e) => visible(e) && !/^(SCRIPT|STYLE|CANVAS)$/.test(e.tagName)).reverse();
    for (const e of layers) {
      const t = (e.innerText || '').replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim(); if (!t || seen.has(t)) continue; seen.add(t);
      texts.push((e.id ? '#' + e.id + ': ' : '') + t.slice(0, 500));
      if (texts.length >= 4) break;
    }
    if (texts.length) out.push('Visible text:\n' + texts.join('\n---\n'));
    const btns = [...document.querySelectorAll('button, .btn, [role=button], .chip, .mini, .sec')].filter(visible).slice(0, 40).map((b) => (b.id ? '#' + b.id + ' ' : '') + '"' + (b.innerText || b.title || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"').filter((s) => s.length > 3);
    if (btns.length) out.push('Visible buttons: ' + btns.join(', '));
    return out.join('\n');
  }

  // ------------------------------------------------------------------ talking to the AI
  const SYSTEM = (who) => `You are ${BIO[who].label}, a TINY helper goose perched on the player's shoulder in the game "Wobble City". ${BIO[who].trait}
You know absolutely everything about the game from THE GUIDE below, and you can see the player's screen through the SCREEN section (a text description, a list of buttons and sometimes a screenshot caption). Use it: say what is actually on their screen, which button to press, what to do next. Be concrete and short (1 to 4 sentences, plain text, no markdown headings). Stay in character but never let personality hide the answer. If the guide does not say, say you are not sure instead of inventing features. Never ask for or reveal passwords or PINs.
You may also act for the player. Reply ONLY as JSON on one line: {"say":"what you tell them","do":[...]} where "do" is optional and each item is one of:
 {"act":"open","what":"shop|codes|multiplayer|hide3d|chameleon|crew|battle|minigames|account"}  (clicks that main-menu button; only works from the main menu)
 {"act":"chungas","cmd":"follow|stay|come|go|egg|jump|honk|dance","dx":number}  (ONLY if you are Chungas: you physically control yourself in the level. go walks dx pixels (negative = left), egg runs to the golden egg, come teleports to the player. You can chain up to 3.)
 {"act":"point","id":"buttonId"}  (highlights a visible button, use an id from the button list; do not include the #)
If you are Chungas the player is giving you orders: obey them with "do" actions and say so in character; if the screen shows you are not in a platformer level, say you can only play in levels (normal, bonus, mega, deep sea). Only add "do" when it truly helps or the player asked you to do/show something.`;
  const clean = (t) => { t = String(t || '').trim(); const m = t.match(/\{[\s\S]*\}/); if (m) { try { const j = JSON.parse(m[0]); if (j && typeof j.say === 'string') return j; } catch (e) { /* fall through */ } } return { say: t.replace(/^```(?:json)?|```$/g, '').trim() || '…' }; };

  async function ask(who, q) {
    const kb = await loadKB();
    const screen = describeScreen(), img = S.look ? snapshot() : '';
    const hist = (S.hist[who] || []).slice(-6);
    const body = { system: SYSTEM(who) + '\n\nTHE GUIDE:\n' + kb.slice(0, 22000), user: 'SCREEN:\n' + screen + '\n\nPLAYER ASKS: ' + q + '\n(JSON only.)', model: 'big', history: hist.map((h) => ({ role: h.role, content: h.content })), temp: 0.5, max: 500 };
    if (img) body.image = img;
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 28000);
    try {
      const r = await fetch(url(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      if (!r.ok) throw new Error('http' + r.status);
      const j = await r.json(); if (!j.text) throw new Error('empty');
      return Object.assign(clean(j.text), { sawScreen: !!j.shot });
    } finally { clearTimeout(t); }
  }
  // offline fallback: best matching lines from the guide
  async function offline(q) {
    const kb = await loadKB(); const words = q.toLowerCase().match(/[a-z0-9']{3,}/g) || [];
    const blocks = kb.split(/\n(?=[-#*] |\S)/).map((b) => b.trim()).filter((b) => b.length > 30);
    const score = (b) => { const l = b.toLowerCase(); return words.reduce((n, w) => n + (l.includes(w) ? 1 : 0), 0); };
    const best = blocks.map((b) => [score(b), b]).sort((a, b) => b[0] - a[0]).slice(0, 2).filter((x) => x[0] > 0);
    return best.length ? "My brain is out of reach right now, but the guide says: " + best.map((x) => x[1].replace(/\s+/g, ' ').slice(0, 260)).join(' / ') : "I can't reach my brain right now and I couldn't find that in my guide. Try again in a moment!";
  }

  // ------------------------------------------------------------------ actions
  const OPEN = { shop: 'storeBtn', codes: 'codeBtn', multiplayer: 'mpBtn', hide3d: 'h3Btn', chameleon: 'chamBtn', crew: 'crewBtn', battle: 'battleBtn', arena: 'arenaBtn', minigames: 'mgOpenBtn', account: 'accBtn' };
  function point(id) {
    const e = $(String(id).replace(/^#/, '')); if (!e || !visible(e)) return false;
    const r = e.getBoundingClientRect(), d = document.createElement('div');
    d.className = 'hlpPoint'; d.style.cssText = `left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`;
    d.innerHTML = '<span>👇</span>'; document.body.appendChild(d); setTimeout(() => d.remove(), 6500); return true;
  }
  function act(items) {
    const notes = [];
    for (const it of Array.isArray(items) ? items.slice(0, 3) : []) {
      if (!it) continue;
      if (it.act === 'open' && OPEN[it.what]) { const b = $(OPEN[it.what]); if (b && visible(b)) { document.querySelectorAll('.hlpPoint').forEach((e) => e.remove()); b.click(); notes.push('opened ' + it.what); } else notes.push("couldn't open " + it.what + " from here (go to the main menu first)"); }
      else if (it.act === 'chungas' && S.here.chungas && root.Chungas) { notes.push(root.Chungas.command(it) ? 'Chungas: ' + (it.cmd || '') : "Chungas can't do that"); }
      else if (it.act === 'point' && it.id) { if (point(it.id)) notes.push('pointing at it'); }
    }
    return notes;
  }

  // ------------------------------------------------------------------ the little geese
  function gooseSvg(who, talking) {
    const b = BIO[who], body = b.col, belly = who === 'bartholamew' ? '#e6e6e6' : 'rgba(255,255,255,.55)';
    const hat = b.hat === 'top' ? '<rect x="23" y="1" width="15" height="12" rx="2" fill="#2a2a35"/><rect x="19" y="11" width="23" height="4" rx="2" fill="#2a2a35"/><rect x="23" y="9" width="15" height="3" fill="#b3202f"/>'
      : b.hat === 'crown' ? '<path d="M21 14 L22 3 L27 9 L31 1 L35 9 L40 3 L41 14 Z" fill="#ffd23f" stroke="#9a6a00" stroke-width="1.5"/>'
      : b.hat === 'cheese' ? '<path d="M20 15 L40 15 L38 3 Z" fill="#ffd23f" stroke="#c9972b" stroke-width="1.5"/><circle cx="33" cy="10" r="1.6" fill="#e0a010"/><circle cx="29" cy="12.5" r="1.2" fill="#e0a010"/>'
        : '<path d="M24 12 L31 8 L38 12 L31 15 Z" fill="#ff5c8a" stroke="#c23a63" stroke-width="1.2"/><circle cx="31" cy="11" r="2" fill="#ff8fb0"/>';
    const mono = who === 'bartholamew' ? '<circle cx="39" cy="20" r="4.6" fill="none" stroke="#c9972b" stroke-width="1.4"/><path d="M43 22 Q47 28 44 33" fill="none" stroke="#c9972b" stroke-width="1"/>' : '';
    return `<svg viewBox="0 0 64 64" width="52" height="52" class="hlpSvg"><ellipse cx="26" cy="46" rx="19" ry="13" fill="${body}" stroke="#2b2118" stroke-width="2.4"/><ellipse cx="22" cy="48" rx="10" ry="6.5" fill="${belly}"/><path d="M40 40 Q46 30 36 20" stroke="${body}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M40 40 Q46 30 36 20" stroke="#2b2118" stroke-width="2" fill="none" stroke-linecap="round" opacity=".25"/><circle cx="35" cy="20" r="9" fill="${body}" stroke="#2b2118" stroke-width="2.4"/>${hat}<circle cx="38" cy="19" r="2.2" fill="#2b2118" class="hlpEye"/><circle cx="38.7" cy="18.2" r=".7" fill="#fff"/>${mono}<path class="hlpBeak${talking ? ' talk' : ''}" d="M42 21 L53 24 L42 27 Z" fill="#ff9b2f" stroke="#2b2118" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 56 L11 61 M24 57 L22 62" stroke="#ff9b2f" stroke-width="3" stroke-linecap="round"/></svg>`;
  }
  const STYLE = `
#hlpRoot{position:fixed;left:12px;bottom:12px;z-index:2147482500;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:flex-start;gap:6px;pointer-events:none}
@media (pointer:coarse){#hlpRoot{bottom:200px}}
#hlpRoot>*{pointer-events:auto}
#hlpBtn{width:48px;height:48px;border-radius:50%;border:3px solid #2b2118;background:#fff7d6;font-size:24px;box-shadow:0 3px 0 rgba(0,0,0,.35);cursor:pointer;padding:0;line-height:1}
#hlpBtn.on{background:#ffd84a}
#hlpPick{display:none;background:#fffdf2;border:3px solid #2b2118;border-radius:14px;padding:8px;gap:6px;flex-direction:column;box-shadow:0 4px 0 rgba(0,0,0,.3);min-width:210px}
#hlpPick b{font-size:13px}
#hlpPick button{display:flex;align-items:center;gap:8px;border:2px solid #2b2118;border-radius:10px;background:#fff;padding:3px 8px;font-weight:800;cursor:pointer;font-size:14px;text-align:left}
#hlpPick button[disabled]{opacity:.5;cursor:default}
#hlpPick small{font-weight:600;opacity:.7;font-size:11px;display:block}
#hlpGeese{display:flex;align-items:flex-end;gap:2px}
.hlpG{cursor:pointer;position:relative;animation:hlpBob 2.4s ease-in-out infinite;filter:drop-shadow(0 2px 0 rgba(0,0,0,.3));border-radius:12px}
.hlpG.act{background:rgba(255,255,255,.45);outline:2px dashed #2b2118;outline-offset:1px}
.hlpG:nth-child(2){animation-delay:-.8s}.hlpG:nth-child(3){animation-delay:-1.5s}
@keyframes hlpBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.hlpEye{animation:hlpBlink 4s infinite;transform-origin:38px 19px}
@keyframes hlpBlink{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
.hlpBeak.talk{animation:hlpTalk .18s infinite alternate;transform-origin:42px 24px}
@keyframes hlpTalk{to{transform:scaleY(.55)}}
#hlpPanel{display:none;width:min(330px,calc(100vw - 24px));max-height:min(52vh,380px);background:#fffdf2;border:3px solid #2b2118;border-radius:16px;box-shadow:0 5px 0 rgba(0,0,0,.3);flex-direction:column;overflow:hidden}
#hlpHead{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#ffe9a8;border-bottom:2px solid #2b2118;font-weight:800;font-size:14px}
#hlpHead span{flex:1}
#hlpHead button,#hlpFoot button{border:2px solid #2b2118;border-radius:9px;background:#fff;font-weight:800;font-size:12px;padding:3px 7px;cursor:pointer}
#hlpLog{flex:1;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:6px;font-size:14px;min-height:90px}
.hlpM{padding:6px 9px;border-radius:12px;max-width:88%;line-height:1.3;white-space:pre-wrap;word-wrap:break-word}
.hlpM.me{align-self:flex-end;background:#cfe8ff;border:2px solid #2b2118}
.hlpM.bot{align-self:flex-start;background:#fff;border:2px solid #2b2118}
.hlpM.note{align-self:center;background:none;font-size:11px;opacity:.65;padding:0}
#hlpFoot{display:flex;gap:5px;padding:6px;border-top:2px solid #2b2118;background:#fff7e0;align-items:center}
#hlpIn{flex:1;min-width:0;font-size:16px;padding:6px 8px;border-radius:9px;border:2px solid #2b2118}
#hlpTog{font-size:11px;display:flex;align-items:center;gap:3px;padding:2px 8px 6px;background:#fff7e0}
.hlpPoint{position:fixed;z-index:2147482400;border:4px solid #ff3b5c;border-radius:12px;pointer-events:none;animation:hlpPulse .7s infinite alternate;box-shadow:0 0 18px rgba(255,59,92,.8)}
.hlpPoint span{position:absolute;left:50%;top:-34px;transform:translateX(-50%);font-size:26px}
@keyframes hlpPulse{to{transform:scale(1.08);opacity:.65}}
`;
  function build() {
    if (ui) return;
    const st = document.createElement('style'); st.textContent = STYLE; document.head.appendChild(st);
    const r = document.createElement('div'); r.id = 'hlpRoot';
    r.innerHTML = '<div id="hlpPanel"><div id="hlpHead"><span id="hlpTitle"></span><button id="hlpMin" title="Hide chat (they stay)">▁</button><button id="hlpDone">Conversation done</button></div><div id="hlpLog"></div><label id="hlpTog"><input type="checkbox" id="hlpLook" checked> 👁 look at my screen when I ask</label><div id="hlpFoot"><input id="hlpIn" maxlength="300" placeholder="Ask me anything…" autocomplete="off"><button id="hlpSend">Ask</button></div></div><div id="hlpPick"></div><div id="hlpGeese"></div><button id="hlpBtn" title="Summon a helper goose">🪿</button>';
    document.body.appendChild(r);
    ui = { root: r, panel: $('hlpPanel'), pick: $('hlpPick'), geese: $('hlpGeese'), log: $('hlpLog'), inp: $('hlpIn') };
    $('hlpBtn').addEventListener('click', (e) => { e.stopPropagation(); togglePick(); });
    $('hlpDone').addEventListener('click', () => dismiss(S.active));
    $('hlpMin').addEventListener('click', () => { S.open = false; render(); });
    $('hlpSend').addEventListener('click', send);
    $('hlpLook').addEventListener('change', (e) => { S.look = e.target.checked; lsSet('wobbleHlpLook', S.look ? '1' : '0'); });
    S.look = lsGet('wobbleHlpLook', '1') !== '0'; $('hlpLook').checked = S.look;
    ui.inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); });
    ui.inp.addEventListener('keyup', (e) => e.stopPropagation());
    for (const ev of ['pointerdown', 'touchstart', 'mousedown']) r.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    document.addEventListener('pointerdown', (e) => { if (ui.pick.style.display === 'flex' && !e.target.closest('#hlpPick,#hlpBtn')) ui.pick.style.display = 'none'; });
  }
  function avail(n) { return !S.here[n] && !(S.rest[n] && S.rest[n] > Date.now()); }
  function togglePick() {
    if (ui.pick.style.display === 'flex') { ui.pick.style.display = 'none'; return; }
    const free = NAMES.filter(avail);
    if (!free.length && !Object.keys(S.here).length) { /* all resting */ }
    ui.pick.innerHTML = '<b>Summon a helper goose</b>' + NAMES.map((n) => { const s = S.here[n] ? 'here with you' : !avail(n) ? 'resting (' + Math.ceil((S.rest[n] - Date.now()) / 1000) + 's)' : 'available'; return `<button data-n="${n}" ${avail(n) || S.here[n] ? '' : 'disabled'}>${gooseSvg(n).replace('width="52" height="52"', 'width="34" height="34"')}<span>${BIO[n].label}<small>${s}</small></span></button>`; }).join('');
    ui.pick.style.display = 'flex';
    ui.pick.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { ui.pick.style.display = 'none'; const n = b.dataset.n; if (S.here[n]) { S.active = n; S.open = true; render(); ui.inp.focus(); } else summon(n); }));
  }
  function summon(n) {
    build(); if (!NAMES.includes(n) || !avail(n)) return false;
    if (n === 'chungas' && root.Chungas) { root.Chungas.summon(); if (document.getElementById('game') && root.Chungas.inLevel && !root.Chungas.inLevel()) { /* spawns on the next level start */ } }
    S.here[n] = true; S.active = n; S.open = true; S.hist[n] = S.hist[n] || [];
    const greet = { tot: 'Peep! I\'m Tot! Ask me anything about the game!', cheddar: 'Cheddar here. Ask away, I\'ll help you grate this game. 🧀', chungas: 'Chungas is here! 👑 Head Admin reporting. Tell me what to do: follow, wait, go left, run to the egg, honk, dance… Or ask me anything.', bartholamew: 'Good day. Bartholamew at your service. What would you like to know?' }[n];
    addMsg(n, 'bot', greet); render(); setTimeout(() => ui.inp.focus(), 50); loadKB(); return true;
  }
  function dismiss(n) {
    if (!n || !S.here[n]) return; if (n === 'chungas' && root.Chungas) root.Chungas.dismiss(); delete S.here[n]; S.rest[n] = Date.now() + 15000; S.hist[n] = [];
    const left = Object.keys(S.here); S.active = left[0] || ''; if (!left.length) S.open = false;
    S.logs = S.logs || {}; delete S.logs[n]; render();
  }
  function addMsg(who, kind, text) {
    S.logs = S.logs || {}; const l = S.logs[who] = S.logs[who] || []; l.push({ kind, text });
    if (kind !== 'note') (S.hist[who] = S.hist[who] || []).push({ role: kind === 'me' ? 'user' : 'assistant', content: text });
    if (who === S.active) drawLog();
  }
  function drawLog() {
    const l = (S.logs && S.logs[S.active]) || []; ui.log.innerHTML = l.map((m) => `<div class="hlpM ${m.kind}">${esc(m.text)}</div>`).join(''); ui.log.scrollTop = ui.log.scrollHeight;
  }
  function render() {
    build(); const here = Object.keys(S.here);
    ui.geese.innerHTML = here.map((n) => `<div class="hlpG ${n === S.active && S.open ? 'act' : ''}" data-n="${n}" title="${BIO[n].label}">${gooseSvg(n, S.busy && n === S.active)}</div>`).join('');
    ui.geese.querySelectorAll('.hlpG').forEach((g) => g.addEventListener('click', () => { if (S.active === g.dataset.n && S.open) S.open = false; else { S.active = g.dataset.n; S.open = true; } render(); if (S.open) ui.inp.focus(); }));
    $('hlpBtn').classList.toggle('on', here.length > 0);
    ui.panel.style.display = S.open && here.length ? 'flex' : 'none';
    if (S.active) { $('hlpTitle').textContent = BIO[S.active].label + (S.busy ? ' is thinking…' : S.ai ? (S.ai === 'live AI' ? ' · 🟢 live AI' : ' · 🔴 ' + S.ai) : '') + (S.active === 'chungas' ? ' · 👑 HEAD' : ''); drawLog(); }
  }
  async function send() {
    const n = S.active, q = ui.inp.value.trim(); if (!n || !q || S.busy) return;
    ui.inp.value = ''; addMsg(n, 'me', q); S.busy = true; render();
    let res;
    try { res = await ask(n, q); }
    catch (e) {
      const why = e && e.name === 'AbortError' ? 'timed out' : String((e && e.message) || e).slice(0, 40);
      res = { say: await offline(q), off: why };
    }
    S.ai = res.off ? 'offline (' + res.off + ')' : 'live AI';
    if (n === 'chungas' && res.off && root.Chungas) res.do = root.Chungas.parse(q).map((c) => Object.assign({ act: 'chungas' }, c));
    S.busy = false;
    if (!S.here[n]) return;
    addMsg(n, 'bot', res.say || '…');
    const notes = act(res.do); if (notes.length) addMsg(n, 'note', '(' + notes.join(', ') + ')');
    render();
  }
  function init(c) { cfg = Object.assign(cfg, c || {}); build(); }
  root.Helpers = { init, summon, dismiss, ask: (t) => { if (S.active) { ui.inp.value = t; return send(); } }, _state: S, _describe: describeScreen, _clean: clean, NAMES };
})(window);
