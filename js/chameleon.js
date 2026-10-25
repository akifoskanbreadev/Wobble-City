/*
 * Mecha Chameleon (2D): you are a robot chameleon goose in a room full of props.
 *   HIDER : SCAN a prop (E) and MORPH into it (Space). A seeker robot patrols with a sweeping spotlight and pokes props.
 *           A morphed prop is only safe if the room has enough REAL copies of it (a lone teapot with a twin is suspicious).
 *           Keep still in the light, or hold C on a matching wall patch to camouflage. Nibble bread crumbs between passes.
 *   SEEKER: you are the robot; one prop is the bot hider. SCAN props (E / tap) to find it. Wrong guesses cost time.
 * Chameleon.init({ save, Skins, award, isOwner })   Chameleon.open()   Chameleon.close()
 */
(function (root) {
  'use strict';
  const W = 960, H = 540, FL = 430, WW = 1800, INK = '#2a2f3a';
  let api = null, dom = null, cv = null, c = null, open = false, raf = 0, last = 0, G = null, paused = false, actx = null;
  const I = { l: false, r: false, camo: false, scanQ: false, morphQ: false };
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------------ tiny drawing helpers (origin = bottom centre of a prop)
  const fillStroke = (f) => { c.fillStyle = f; c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); };
  const rr = (x, y, w, h, r, f) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); fillStroke(f); };
  const el = (x, y, rx, ry, f) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); fillStroke(f); };
  const poly = (pts, f) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); fillStroke(f); };
  const line = (x1, y1, x2, y2, col, w) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col || INK; c.lineWidth = w || 3; c.lineCap = 'round'; c.stroke(); };
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => clamp(Math.round(v + (k > 0 ? (255 - v) * k : v * k)), 0, 255); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join(''); };

  // prop catalogue: id -> { n name, w width (for proximity), d draw(col) }
  const PD = {
    block: { n: 'Toy Block', w: 40, d(k) { rr(-18, -36, 36, 36, 4, k); c.fillStyle = '#fff'; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillText('A', 0, -10); } },
    teddy: { n: 'Teddy', w: 44, d(k) { el(-12, -58, 5, 5, k); el(12, -58, 5, 5, k); el(0, -20, 18, 20, k); el(0, -48, 14, 13, k); el(0, -45, 6, 5, '#f3d6b0'); el(-5, -50, 1.6, 1.6, INK); el(5, -50, 1.6, 1.6, INK); } },
    ball: { n: 'Beach Ball', w: 46, d(k) { el(0, -22, 22, 22, k); c.save(); c.beginPath(); c.ellipse(0, -22, 22, 22, 0, 0, 7); c.clip(); c.fillStyle = '#fff'; c.fillRect(-6, -48, 12, 50); c.restore(); el(0, -22, 22, 22, 'rgba(0,0,0,0)'); } },
    drum: { n: 'Drum', w: 50, d(k) { rr(-24, -34, 48, 34, 6, k); el(0, -34, 24, 7, '#fff'); line(-8, -52, 4, -36, '#c98a4b', 4); line(10, -52, 2, -36, '#c98a4b', 4); } },
    robot: { n: 'Toy Robot', w: 36, d(k) { rr(-9, -12, 7, 12, 2, '#9aa3b2'); rr(2, -12, 7, 12, 2, '#9aa3b2'); rr(-16, -44, 32, 34, 5, k); rr(-12, -66, 24, 20, 4, '#cdd3df'); el(-5, -57, 3, 3, '#e63946'); el(5, -57, 3, 3, '#e63946'); line(0, -66, 0, -74, INK, 3); el(0, -76, 3, 3, '#ffd23f'); } },
    rocket: { n: 'Toy Rocket', w: 32, d(k) { poly([[-12, -6], [-22, 0], [-12, -22]], '#e63946'); poly([[12, -6], [22, 0], [12, -22]], '#e63946'); rr(-12, -62, 24, 58, 10, k); poly([[-12, -56], [0, -76], [12, -56]], '#e63946'); el(0, -40, 6, 6, '#bfe8ff'); } },
    jar: { n: 'Jar', w: 36, d(k) { rr(-17, -44, 34, 44, 8, '#d6f3ff'); rr(-15, -26, 30, 24, 6, k); rr(-19, -54, 38, 11, 3, k); } },
    mug: { n: 'Mug', w: 38, d(k) { c.beginPath(); c.arc(17, -18, 10, -1.5, 1.5); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); rr(-17, -34, 34, 34, 6, k); rr(-14, -31, 28, 6, 3, shade(k, 0.5)); } },
    pot: { n: 'Cooking Pot', w: 52, d(k) { rr(-30, -26, 8, 8, 3, INK); rr(22, -26, 8, 8, 3, INK); rr(-24, -34, 48, 34, 8, k); el(0, -35, 24, 6, shade(k, 0.35)); el(0, -42, 4, 4, INK); } },
    toaster: { n: 'Toaster', w: 58, d(k) { rr(-28, -30, 56, 30, 8, k); rr(-18, -33, 14, 6, 2, INK); rr(4, -33, 14, 6, 2, INK); rr(28, -22, 8, 5, 2, INK); } },
    kettle: { n: 'Kettle', w: 52, d(k) { poly([[20, -18], [34, -34], [37, -30], [24, -12]], k); el(0, -22, 24, 22, k); rr(-9, -48, 18, 8, 3, INK); c.beginPath(); c.arc(0, -34, 16, 3.4, 6); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); } },
    bread: { n: 'Bread Loaf', w: 46, d(k) { rr(-23, -28, 46, 28, 12, '#e0a65a'); el(-8, -30, 12, 8, '#e8b66e'); el(8, -30, 12, 8, '#e8b66e'); rr(-23, -8, 46, 8, 4, shade(k, -0.1)); } },
    flowerpot: { n: 'Flower Pot', w: 36, d(k) { line(0, -30, 0, -54, '#3b8f3b', 4); for (let i = 0; i < 5; i++) { const a = i * 1.256; el(Math.cos(a) * 9, -58 + Math.sin(a) * 9, 6, 6, k); } el(0, -58, 5, 5, '#ffd23f'); poly([[-18, -34], [18, -34], [13, 0], [-13, 0]], '#c8663b'); rr(-20, -40, 40, 9, 3, '#d9774a'); } },
    gnome: { n: 'Garden Gnome', w: 34, d(k) { poly([[-14, 0], [14, 0], [10, -30], [-10, -30]], '#3a86ff'); el(0, -32, 11, 9, '#f3d6b0'); poly([[-12, -38], [12, -38], [0, -72]], k); poly([[-9, -30], [9, -30], [0, -10]], '#fff'); el(0, -35, 3, 3, '#e8887a'); } },
    bush: { n: 'Bush', w: 58, d(k) { el(-18, -18, 20, 18, k); el(18, -18, 20, 18, k); el(0, -28, 24, 22, shade(k, 0.12)); } },
    mushroom: { n: 'Mushroom', w: 36, d(k) { rr(-7, -26, 14, 26, 4, '#f6ead2'); c.beginPath(); c.ellipse(0, -28, 24, 20, 0, Math.PI, 0); c.closePath(); fillStroke(k); el(-9, -36, 4, 4, '#fff'); el(8, -40, 3.5, 3.5, '#fff'); } },
    can: { n: 'Watering Can', w: 54, d(k) { line(14, -22, 34, -42, INK, 6); line(14, -22, 34, -42, k, 3); rr(-20, -30, 38, 30, 6, k); c.beginPath(); c.arc(-4, -34, 14, 3.3, 6.1); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); } },
    rock: { n: 'Rock', w: 46, d(k) { poly([[-24, 0], [-18, -22], [0, -30], [20, -20], [26, 0]], k); line(-4, -26, -2, -12, shade(k, -0.3), 2); } },
    beaker: { n: 'Beaker', w: 36, d(k) { poly([[-15, -44], [15, -44], [18, 0], [-18, 0]], 'rgba(214,243,255,.9)'); poly([[-16.5, -22], [16.5, -22], [18, 0], [-18, 0]], k); line(-8, -34, 8, -34, INK, 2); } },
    flask: { n: 'Flask', w: 40, d(k) { rr(-6, -56, 12, 24, 3, '#d6f3ff'); poly([[-6, -34], [6, -34], [22, 0], [-22, 0]], '#d6f3ff'); poly([[-12, -14], [12, -14], [22, 0], [-22, 0]], k); } },
    pc: { n: 'Computer', w: 48, d(k) { rr(-8, -14, 16, 14, 2, '#9aa3b2'); rr(-26, -52, 52, 38, 5, '#cdd3df'); rr(-21, -47, 42, 28, 3, k); c.fillStyle = '#fff'; c.fillRect(-14, -38, 20, 3); c.fillRect(-14, -30, 12, 3); } },
    barrel: { n: 'Barrel', w: 40, d(k) { rr(-19, -44, 38, 44, 10, k); line(-19, -30, 19, -30, INK, 3); line(-19, -14, 19, -14, INK, 3); el(0, -22, 5, 5, '#ffd23f'); } },
    tube: { n: 'Test Tube', w: 20, d(k) { rr(-8, -70, 16, 70, 8, '#d6f3ff'); rr(-6.5, -38, 13, 36, 6, k); rr(-10, -72, 20, 6, 2, INK); } },
    crate: { n: 'Crate', w: 46, d(k) { rr(-22, -40, 44, 40, 3, k); line(-22, -40, 22, 0, INK, 3); line(22, -40, -22, 0, INK, 3); } },
    books: { n: 'Book Stack', w: 48, d(k) { rr(-24, -12, 48, 12, 2, k); rr(-20, -24, 42, 12, 2, shade(k, 0.4)); rr(-23, -36, 44, 12, 2, shade(k, -0.25)); line(-18, -6, 18, -6, '#fff', 2); } },
    globe: { n: 'Globe', w: 40, d(k) { rr(-14, -6, 28, 6, 2, '#8a5a32'); line(0, -8, 0, -22, INK, 4); el(0, -40, 20, 20, k); el(-5, -44, 7, 5, '#4cc35a'); el(8, -34, 5, 7, '#4cc35a'); } },
    lamp: { n: 'Lamp', w: 34, d(k) { rr(-14, -5, 28, 5, 2, INK); line(0, -5, 0, -58, INK, 4); poly([[-18, -48], [18, -48], [10, -76], [-10, -76]], k); } },
    chair: { n: 'Chair', w: 44, d(k) { rr(-18, -50, 8, 52, 2, k); rr(-18, -26, 38, 8, 2, k); rr(-18, -18, 6, 18, 2, shade(k, -0.25)); rr(14, -18, 6, 18, 2, shade(k, -0.25)); } },
    plant: { n: 'House Plant', w: 40, d(k) { for (let i = -2; i <= 2; i++) el(i * 9, -52 - Math.abs(i) * -4 + 4, 6, 18, k); poly([[-14, -30], [14, -30], [10, 0], [-10, 0]], '#c8663b'); } },
    clock: { n: 'Grandfather Clock', w: 38, d(k) { rr(-16, -84, 32, 84, 5, k); el(0, -62, 11, 11, '#fff'); line(0, -62, 0, -70, INK, 2); line(0, -62, 6, -58, INK, 2); rr(-8, -42, 16, 36, 3, shade(k, -0.3)); el(0, -24, 4, 4, '#ffd23f'); } },
  };
  const COLS = ['#e63946', '#ffd23f', '#4aa3ff', '#4cc35a', '#b57aff', '#ff8c42'];
  const ROOMS = [
    { name: 'Toy Shop', emoji: '🧸', wall: ['#ffe6a8', '#ffd27a'], floor: '#c98a4b', patch: ['#ff9b8a', '#8fd3ff', '#b6e88a'], types: ['block', 'teddy', 'ball', 'drum', 'robot', 'rocket'] },
    { name: 'Kitchen', emoji: '🍳', wall: ['#d9f1ff', '#b6e0f7'], floor: '#b7a38c', patch: ['#ffd9a0', '#c4f0c8', '#f7b5c5'], types: ['jar', 'mug', 'pot', 'toaster', 'kettle', 'bread'] },
    { name: 'Garden', emoji: '🌻', wall: ['#bfe8ff', '#e6f7d8'], floor: '#6fbf5c', patch: ['#7fcf6a', '#ffe58a', '#f3b0d0'], types: ['flowerpot', 'gnome', 'bush', 'mushroom', 'can', 'rock'] },
    { name: 'Mad Lab', emoji: '🧪', wall: ['#c9d3f2', '#aab8e6'], floor: '#8c93a8', patch: ['#9be8c8', '#f4a6a6', '#ffe08a'], types: ['beaker', 'flask', 'pc', 'barrel', 'tube', 'crate'] },
    { name: 'Library', emoji: '📚', wall: ['#e9d3b2', '#d9bd92'], floor: '#8a5a32', patch: ['#c9a0e8', '#a0d8e8', '#e8c0a0'], types: ['books', 'globe', 'lamp', 'chair', 'plant', 'clock'] },
  ];
  const THRESH = [2, 2, 3, 3, 4];   // real copies a prop type needs in the room for a fake to be believable

  // ------------------------------------------------------------------ audio
  function beep(f, d, type, v) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; if (!actx) actx = new AC();
      const o = actx.createOscillator(), g = actx.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.value = v || 0.05;
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d); o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
    } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------ DOM
  const CSS = `#ch{position:fixed;inset:0;z-index:70;background:#1b1f33;display:none;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,sans-serif;color:#fff}
  #ch canvas{position:absolute;inset:0;width:100%;height:100%}
  #ch .b{position:absolute;border-radius:50%;border:3px solid rgba(255,255,255,.85);background:rgba(30,30,40,.5);color:#fff;font-weight:800;display:none;align-items:center;justify-content:center;text-align:center;font-size:14px;touch-action:none;line-height:1.1}
  #ch #chL{left:max(16px,env(safe-area-inset-left));bottom:26px;width:84px;height:84px;font-size:30px}#ch #chR{left:calc(max(16px,env(safe-area-inset-left)) + 98px);bottom:26px;width:84px;height:84px;font-size:30px}
  #ch #chScan{right:max(14px,env(safe-area-inset-right));bottom:26px;width:92px;height:92px;background:rgba(255,155,47,.92);color:#1b1b1b}
  #ch #chMorph{right:calc(max(14px,env(safe-area-inset-right)) + 104px);bottom:26px;width:80px;height:80px;background:rgba(80,200,140,.92);color:#10261b}
  #ch #chCamo{right:calc(max(14px,env(safe-area-inset-right)) + 14px);bottom:128px;width:66px;height:66px}
  #ch #chExit{right:12px;top:12px;width:44px;height:44px;border-radius:12px;font-size:20px}
  #ch .panel{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,12,24,.82);padding:14px;overflow:auto}
  #ch .card{background:#fff;color:#1b1f33;border-radius:20px;padding:18px;max-width:520px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.4);max-height:100%;overflow:auto}
  #ch h2{margin:0 0 4px;font-size:24px}#ch .sub{opacity:.75;font-size:14px;margin-bottom:8px}#ch .tip{font-size:12.5px;opacity:.75;margin-top:6px}
  #ch .row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;align-items:center}
  #ch .chip{border:3px solid #dfe3f1;border-radius:999px;padding:6px 12px;font-weight:700;font-size:14px;background:#f7f8fd;cursor:pointer}#ch .chip.on{border-color:#2fbf71;background:#e6f9ee}
  #ch .go{background:#ff9b2f;color:#1b1b1b;border:0;border-radius:14px;padding:12px 20px;font-size:17px;font-weight:800;cursor:pointer}#ch .go.alt{background:#e6e9f5}`;
  function ensureDom() {
    if (dom) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'ch';
    d.innerHTML = `<canvas id="chcv"></canvas><div class="b" id="chL">◀</div><div class="b" id="chR">▶</div><div class="b" id="chCamo">CAMO<br>(C)</div><div class="b" id="chMorph">MORPH<br>(Space)</div><div class="b" id="chScan">SCAN<br>(E)</div><div class="b" id="chExit">☰</div>
      <div class="panel" id="chTitle"><div class="card"><h2>🦎 Mecha Chameleon</h2><div class="sub">You are a robot chameleon goose. Hide in plain sight in a room full of props!</div>
        <div class="row" style="flex-direction:column;gap:6px"><b>Start in</b><span id="chRooms" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center"></span></div>
        <div class="row"><button class="go" id="chHide">🫥 Play as Hider</button><button class="go" id="chSeek">🔦 Play as Seeker</button><button class="go alt" id="chBack">Back</button></div>
        <div class="tip"><b>Hider:</b> SCAN a prop (E) then MORPH (Space). The seeker pokes props: a fake is only safe if the room has several real copies of it (you get a ✅/⚠ when you scan). Stay still in the spotlight. Hold C on a wall patch to camouflage. Grab bread crumbs between passes. Survive the timer!</div>
        <div class="tip"><b>Seeker:</b> walk (A/D or arrows) and SCAN props (E or tap them). One prop is the hidden bot. Wrong guesses cost 8 seconds and a scan.</div></div></div>
      <div class="panel" id="chEnd"><div class="card"><h2 id="chEndT"></h2><pre id="chEndX" style="white-space:pre-wrap;font-family:inherit;margin:8px 0 12px;font-size:15px"></pre><div class="row"><button class="go" id="chNext">Next room</button><button class="go alt" id="chRetry">Again</button><button class="go alt" id="chMenu">Title</button></div></div></div>
      <div class="panel" id="chPause"><div class="card"><h2>⏸ Paused</h2><div class="row"><button class="go" id="chResume">Resume</button><button class="go alt" id="chQuit">Quit to title</button></div></div></div>`;
    document.body.appendChild(d);
    dom = { root: d, title: $('chTitle'), end: $('chEnd'), pause: $('chPause') };
    cv = $('chcv'); c = cv.getContext('2d');
    const rb = $('chRooms'); ROOMS.forEach((r, i) => { const s = document.createElement('span'); s.className = 'chip' + (i ? '' : ' on'); s.textContent = r.emoji + ' ' + r.name; s.addEventListener('click', () => { rb.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); s.classList.add('on'); sel.room = i; }); rb.appendChild(s); });
    $('chHide').addEventListener('click', () => start('hider', sel.room)); $('chSeek').addEventListener('click', () => start('seeker', sel.room));
    $('chBack').addEventListener('click', close);
    $('chNext').addEventListener('click', () => start(G.role, G.level + 1)); $('chRetry').addEventListener('click', () => start(G.role, G.level)); $('chMenu').addEventListener('click', toTitle);
    $('chResume').addEventListener('click', () => setPause(false)); $('chQuit').addEventListener('click', () => { setPause(false); toTitle(); });
    $('chExit').addEventListener('click', () => { if (G && !G.over) setPause(!paused); });
    const hold = (id, on, off) => { const e = $(id); e.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); on(); try { e.setPointerCapture(ev.pointerId); } catch (x) { /* ignore */ } }); const u = () => off && off(); e.addEventListener('pointerup', u); e.addEventListener('pointercancel', u); };
    hold('chL', () => { I.l = true; }, () => { I.l = false; }); hold('chR', () => { I.r = true; }, () => { I.r = false; }); hold('chCamo', () => { I.camo = true; }, () => { I.camo = false; });
    hold('chScan', () => { I.scanQ = true; }); hold('chMorph', () => { I.morphQ = true; });
    cv.addEventListener('pointerdown', (e) => { if (!G || G.over || paused || G.role !== 'seeker') return; const r = cv.getBoundingClientRect(), s = viewScale(); G.walkTo = clamp((e.clientX - r.left - s.ox) / s.k + G.cam, 40, WW - 40); G.tapScan = true; });
    window.addEventListener('keydown', (e) => {
      if (!open || !G || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
      const k = e.code;
      if (k === 'ArrowLeft' || k === 'KeyA') I.l = true; else if (k === 'ArrowRight' || k === 'KeyD') I.r = true; else if (k === 'KeyC') I.camo = true;
      else if (k === 'KeyE' || k === 'KeyF' || k === 'Enter') { if (!e.repeat) I.scanQ = true; } else if (k === 'Space') { if (!e.repeat) I.morphQ = true; } else if (k === 'Escape' || k === 'KeyP') { if (!e.repeat && !G.over) setPause(!paused); }
      if (/^(Key[ACDEFP]|Arrow.*|Space|Escape|Enter)$/.test(k)) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    window.addEventListener('keyup', (e) => { const k = e.code; if (k === 'ArrowLeft' || k === 'KeyA') I.l = false; else if (k === 'ArrowRight' || k === 'KeyD') I.r = false; else if (k === 'KeyC') I.camo = false; if (open && G && /^(Key[ACDEFP]|Arrow.*|Space)$/.test(k)) e.stopImmediatePropagation(); }, true);
  }
  const sel = { room: 0 };
  function layoutUI() {
    const play = !!G && !G.over, hider = play && G.role === 'hider';
    const sh = (id, on) => { $(id).style.display = on ? 'flex' : 'none'; };
    sh('chL', play); sh('chR', play); sh('chScan', play); sh('chExit', play); sh('chMorph', hider); sh('chCamo', hider);
    dom.title.style.display = G ? 'none' : 'flex'; dom.end.style.display = G && G.over ? 'flex' : 'none'; dom.pause.style.display = paused ? 'flex' : 'none';
  }
  function setPause(v) { paused = v; layoutUI(); }
  function toTitle() { G = null; paused = false; I.l = I.r = I.camo = false; layoutUI(); }
  function openUI() { ensureDom(); open = true; dom.root.style.display = 'block'; G = null; paused = false; layoutUI(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function close() { G = null; open = false; paused = false; cancelAnimationFrame(raf); raf = 0; if (dom) dom.root.style.display = 'none'; if (api && api.onClose) api.onClose(); }

  // ------------------------------------------------------------------ game setup
  function skinCols() {
    const s = api && api.save && api.save(), sk = (api && api.Skins && s && api.Skins.BY_ID[s.skin]) || {};
    const ok = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null);
    const body = ok(sk.body) || (sk.jellyC && ok(sk.jellyC[0])) || '#8fd3a6';
    return { body, head: ok(sk.headC) || (sk.jellyC && ok(sk.jellyC[1])) || shade(body, 0.1), beak: ok(sk.beakC) || '#ff9f1c' };
  }
  function makeRoom(idx) {
    const R = ROOMS[idx % ROOMS.length], types = R.types.slice().sort(() => Math.random() - 0.5), counts = [5, 4, 3, 2, 2, 1];
    const list = []; types.forEach((t, i) => { for (let k = 0; k < counts[i]; k++) list.push(t); });
    list.sort(() => Math.random() - 0.5);
    const props = list.map((t, i) => ({ type: t, x: 140 + i * (1520 / (list.length - 1)) + rnd(-14, 14), col: COLS[(R.types.indexOf(t) + idx) % COLS.length], poked: 0 }));
    const patches = [[260, 130], [880, 150], [1440, 130]].map((p, i) => ({ x: p[0], w: p[1], col: R.patch[i] }));
    return { R, props, patches, count: (t) => props.filter((p) => p.type === t).length };
  }
  function start(role, level) {
    ensureDom(); level = Math.max(0, level | 0); const room = makeRoom(level), lvl = Math.min(level, 8);
    const hiderChoices = Object.keys(room.props.reduce((o, p) => { o[p.type] = (o[p.type] || 0) + 1; return o; }, {})).filter((t) => room.count(t) >= 2);
    G = { role, level, lvl, room, over: null, time: 0, cam: 0, t: 0, toasts: [], puffs: [], crumbs: [], bubble: null, walkTo: null, tapScan: false, expose: 0, caught: null, got: 0, timeMax: role === 'hider' ? 60 + Math.min(30, lvl * 5) : 90 - Math.min(30, lvl * 4), shake: 0 };
    G.time = G.timeMax;
    if (role === 'hider') {
      G.p = { x: 120, v: 0, dir: 1, form: 'goose', scanned: null, camo: 0, morphT: 0, flick: 0 };
      G.bot = { x: WW - 160, dir: -1, mode: 'walk', target: null, t: 0, poked: 0, phase: 0, last: -1, speed: 80 + 16 * lvl, say: '' };
      for (let i = 0; i < 5; i++) G.crumbs.push({ x: rnd(220, WW - 200), got: false });
    } else {
      G.p = { x: 120, v: 0, dir: 1, scans: Math.max(3, 6 - (lvl >> 1)), phase: 0 };
      const t = pick(hiderChoices); const spots = room.props.filter((p) => p.type === t);
      const hx = pick(spots).x + pick([-1, 1]) * rnd(60, 90);
      G.hid = { x: clamp(hx, 150, WW - 150), type: t, col: spots[0].col, shimmer: 0, relocate: rnd(14, 22), move: 0 };
    }
    paused = false; layoutUI(); beep(520, 0.12, 'triangle');
    say(role === 'hider' ? 'Room ' + (level + 1) + ': ' + room.R.name + ' — scan a prop with plenty of copies!' : 'Find the hidden bot among the ' + room.R.name + ' props. ' + G.p.scans + ' scans!', 4.5);
  }
  const say = (t, s) => { if (G) G.toasts.push({ t, left: s || 2.6 }); };
  const puff = (x, n) => { for (let i = 0; i < (n || 8); i++) G.puffs.push({ x: x + rnd(-14, 14), y: FL - rnd(0, 36), vx: rnd(-40, 40), vy: rnd(-70, -20), l: 0.7, r: rnd(5, 11) }); };

  // ------------------------------------------------------------------ update
  const isOwner = () => !!(api && api.isOwner && api.isOwner());
  function nearestProp(x, maxd) { let b = null, bd = maxd; G.room.props.forEach((p) => { const d = Math.abs(p.x - x); if (d < bd) { bd = d; b = p; } }); return b; }
  const patchAt = (x) => G.room.patches.find((p) => Math.abs(x - p.x) < p.w / 2 - 8);
  function caught(why) { if (G.over) return; G.over = 'caught'; G.caught = why; beep(180, 0.5, 'sawtooth', 0.07); const bread = G.got; if (bread) api.award(bread); finish(); }
  function win() {
    if (G.over) return; G.over = 'win'; beep(660, 0.12, 'triangle'); setTimeout(() => beep(880, 0.2, 'triangle'), 120);
    G.reward = G.role === 'hider' ? Math.min(30, 5 + G.lvl * 2 + G.got * 2) : Math.min(30, 6 + Math.round(G.time / 6) + G.lvl * 2); api.award(G.reward); finish();
  }
  function finish() {
    layoutUI(); const w = G.over === 'win', hider = G.role === 'hider';
    $('chEndT').textContent = w ? (hider ? '🎉 You stayed hidden!' : '🎉 Found it!') : (hider ? '🔦 Caught!' : '⏰ Out of luck!');
    $('chEndX').textContent = (w ? '+' + G.reward + ' 🍞' : (G.got ? '+' + G.got + ' 🍞 for crumbs' : 'No bread this time')) + (G.caught ? '\n' + G.caught : '') + (hider ? '\nCrumbs: ' + G.got + '/5' : '') + '\nRoom ' + (G.level + 1) + ': ' + G.room.R.name;
    $('chNext').style.display = w ? '' : 'none';
  }

  function updateHider(dt) {
    const p = G.p, bot = G.bot, th = THRESH[Math.min(G.lvl, THRESH.length - 1)];
    const ax = (I.r ? 1 : 0) - (I.l ? 1 : 0), morphed = p.form === 'prop', busy = p.morphT > 0;
    if (p.morphT > 0) { p.morphT -= dt; if (p.morphT <= 0) { p.form = p.morphTo; p.morphT = 0; } }
    const sp = busy ? 0 : morphed ? 38 : 190; p.v = ax * sp; if (ax) p.dir = ax;
    p.x = clamp(p.x + p.v * dt, 40, WW - 40);
    const still = Math.abs(p.v) < 1;
    p.flick = morphed && !still ? p.flick + dt : 0;
    // scan / morph
    if (I.scanQ) { I.scanQ = false; if (!morphed && !busy) { const pr = nearestProp(p.x, 90); if (pr) { const n = G.room.count(pr.type), safe = n >= th; p.scanned = { type: pr.type, col: pr.col, n, safe }; beep(safe ? 880 : 300, 0.12, 'triangle'); say((safe ? '✅ ' : '⚠ ') + PD[pr.type].n + ': ' + n + ' real copies' + (safe ? ' — believable!' : ' — need ' + th + '+, risky!'), 3); } else say('Stand next to a prop to scan it.', 1.6); } }
    if (I.morphQ) { I.morphQ = false; if (!busy) { if (morphed) { p.morphTo = 'goose'; p.morphT = 0.3; puff(p.x, 6); beep(400, 0.1, 'triangle'); } else if (p.scanned) { p.morphTo = 'prop'; p.morphT = 0.45; puff(p.x, 12); beep(700, 0.12, 'triangle'); p.camo = 0; } else say('SCAN a prop first (E).', 1.6); } }
    // camouflage
    const patch = patchAt(p.x);
    if (I.camo && p.form === 'goose' && !busy && still && patch) p.camo = Math.min(1, p.camo + dt); else p.camo = Math.max(0, p.camo - dt * (still ? 0.8 : 3));
    // bread crumbs
    G.crumbs.forEach((cr) => { if (!cr.got && p.form === 'goose' && Math.abs(cr.x - p.x) < 30) { cr.got = true; G.got++; beep(990, 0.08, 'triangle'); say('🍞 crumb ' + G.got + '/5', 1); } });
    // seeker bot
    const lvl = G.lvl; bot.phase += dt * (1.4 + 0.15 * lvl);
    const spotX = bot.x + bot.dir * (120 + 100 * Math.sin(bot.phase)), R = 62;
    if (bot.mode === 'walk') {
      if (bot.target == null) {
        const near = (pr) => Math.abs(pr.x - p.x) < 380, ws = G.room.props.map((pr, i) => (i === bot.last ? 0 : 1 + (near(pr) ? 2.5 * (0.3 + 0.15 * lvl) : 0) + (p.form === 'prop' && p.scanned && pr.type === p.scanned.type ? 0.6 * lvl : 0)));
        let tot = ws.reduce((a, b) => a + b, 0), r = Math.random() * tot, i = 0; for (; i < ws.length - 1; i++) { r -= ws[i]; if (r <= 0) break; } bot.target = i;
      }
      const tx = G.room.props[bot.target].x;
      const dx = tx - bot.x; bot.dir = dx >= 0 ? 1 : -1;
      if (Math.abs(dx) < 8) { bot.mode = 'poke'; bot.t = 0; bot.poked = 0; } else bot.x += bot.dir * Math.min(Math.abs(dx), bot.speed * dt);
    } else {
      bot.t += dt; const dwell = Math.max(0.9, 1.5 - 0.1 * lvl), pr = G.room.props[bot.target];
      if (bot.poked < 2 && bot.t > (bot.poked ? 0.85 : 0.3) * dwell) {
        bot.poked++; pr.poked = 0.25; beep(240, 0.06, 'square', 0.04);
        if (Math.abs(p.x - pr.x) < 48) {
          if (p.form === 'prop' || p.morphT > 0) { const copies = G.room.count(p.scanned.type); if (copies < th) return caught('A lone ' + PD[p.scanned.type].n + ' with ' + copies + ' real cop' + (copies === 1 ? 'y' : 'ies') + '? Fishy!'); bot.say = 'Hmm... looks normal.'; say('😅 it believed you!', 1.2); }
          else return caught('Bonk! The seeker poked you.');
        }
      }
      if (bot.t > dwell) { bot.last = bot.target; bot.target = null; bot.mode = 'walk'; }
    }
    if (p.form === 'goose' && Math.abs(p.x - bot.x) < 26) return caught('The seeker bumped into you!');
    // exposure to the spotlight
    const lit = Math.abs(p.x - spotX) < R + 10;
    let rate = 0; if (lit) { if (p.form === 'goose' || busy) rate = p.camo >= 0.9 ? 0 : 3; else if (!still) rate = 2.2; }
    G.expose = clamp(G.expose + (rate ? rate * dt : -1.5 * dt), 0, 1);
    G.spotX = spotX; G.lit = lit;
    if (G.expose >= 1) return caught(p.form === 'prop' ? 'The beam caught a prop moving!' : 'You were lit up by the beam!');
    G.time -= dt; if (G.time <= 0) win();
  }

  function updateSeeker(dt) {
    const p = G.p, hid = G.hid, ax = (I.r ? 1 : 0) - (I.l ? 1 : 0);
    let v = ax * 200; if (!ax && G.walkTo != null) { const dx = G.walkTo - p.x; if (Math.abs(dx) > 6) v = Math.sign(dx) * 200; else { G.walkTo = null; } }
    if (ax) G.walkTo = null; if (v) p.dir = Math.sign(v); p.x = clamp(p.x + v * dt, 40, WW - 40); p.phase += dt * 3 * Math.abs(v) / 200;
    G.time -= dt; if (G.time <= 0) { G.over = 'lose'; G.caught = 'The hider fooled you.'; beep(180, 0.5, 'sawtooth'); finish(); return; }
    // hider shimmer clue + relocation
    hid.shimmer = Math.max(0, hid.shimmer - dt); hid.relocate -= dt; hid.cl = (hid.cl || rnd(3, 6)) - dt; if (hid.cl <= 0) { hid.shimmer = 0.35; hid.cl = rnd(4, 7); }
    if (hid.relocate <= 0 && Math.abs(hid.x - p.x) > 260) { puff(hid.x, 8); const spots = G.room.props.filter((q) => q.type === hid.type); hid.x = clamp(pick(spots).x + pick([-1, 1]) * rnd(55, 95), 150, WW - 150); puff(hid.x, 8); hid.relocate = rnd(14, 24); beep(300, 0.08, 'triangle', 0.03); }
    G.room.props.forEach((q) => { if (q.poked > 0) q.poked -= dt; });
    if (I.scanQ || G.tapScan) {
      const tap = G.tapScan && !I.scanQ; I.scanQ = false; G.tapScan = false;
      const cand = G.room.props.concat([{ x: hid.x, type: hid.type, hider: true }]); let b = null, bd = 100;
      cand.forEach((q) => { const d = Math.abs(q.x - p.x); if (d < bd && !q.checked) { bd = d; b = q; } });
      if (tap && (!G.walkTo || Math.abs(G.walkTo - p.x) > 12) && !(b && Math.abs(b.x - G.walkTo) < 40 && bd < 100)) b = null;
      if (b) {
        if (b.hider) { G.reward = 0; win(); } else { b.checked = true; p.scans--; G.time = Math.max(0, G.time - 8); beep(240, 0.15, 'sawtooth', 0.05); say('❌ Just a ' + PD[b.type].n + '. −8s', 1.6); if (p.scans <= 0 && !G.over) { G.over = 'lose'; G.caught = 'Out of scans! It was a ' + PD[hid.type].n + '.'; finish(); } }
      } else if (!tap) say('Stand next to a prop to scan it.', 1.4);
    }
    I.morphQ = false;
  }

  function update(dt) {
    if (!G) return; G.t += dt;
    G.puffs = G.puffs.filter((q) => { q.l -= dt; q.x += q.vx * dt; q.y += q.vy * dt; return q.l > 0; });
    G.toasts = G.toasts.filter((t) => (t.left -= dt) > 0);
    if (G.over) { G.cam = G.cam; return; }
    if (G.role === 'hider') updateHider(dt); else updateSeeker(dt);
    G.room.props.forEach((q) => { if (q.poked > 0) q.poked -= dt * (G.role === 'hider' ? 1 : 0); });
    const fx = G.p.x; G.cam += (clamp(fx - W / 2, 0, WW - W) - G.cam) * Math.min(1, dt * 5);
  }

  // ------------------------------------------------------------------ drawing
  function viewScale() { const w = cv.width, h = cv.height, k = Math.min(w / W, h / H); return { k, ox: (w - W * k) / 2, oy: (h - H * k) / 2 }; }
  function drawProp(type, x, col, alpha, dy) { c.save(); c.translate(x - G.cam, FL + (dy || 0)); c.globalAlpha = alpha == null ? 1 : alpha; PD[type].d(col); c.restore(); }
  function drawBot(b) {
    const x = b.x - G.cam; c.save(); c.translate(x, FL); c.scale(b.dir, 1);
    c.save(); c.beginPath(); c.moveTo(14, -86); const sx = ((b.spotX != null ? b.spotX : G.spotX) - b.x) * b.dir; c.lineTo(sx - 70 * 1, 0); c.lineTo(sx + 70, 0); c.closePath(); const g = c.createLinearGradient(14, -86, sx, 0); g.addColorStop(0, 'rgba(255,245,170,.55)'); g.addColorStop(1, 'rgba(255,245,170,.12)'); c.fillStyle = g; c.fill(); c.restore();
    el(0, -6, 22, 6, '#555'); rr(-18, -62, 36, 46, 8, '#e04a4a'); rr(-14, -56, 28, 18, 4, '#fff6d6'); el(-4, -47, 3.5, 3.5, INK); el(7, -47, 3.5, 3.5, INK);
    rr(-12, -88, 24, 26, 8, '#bfc6d6'); el(6, -76, 7, 7, '#ffd23f'); line(0, -88, 0, -98, INK, 3); el(0, -100, 3.5, 3.5, '#e63946');
    if (b.mode === 'poke') { const t = b.t % 0.5; line(18, -40, 30 + Math.sin(t * 12) * 8, -30, INK, 5); }
    c.restore();
  }
  function drawGoose(x, y, cols, o) {   // robot chameleon goose; o: { dir, alpha, camo, patch, step }
    c.save(); c.translate(x - G.cam, y); c.scale(o.dir || 1, 1); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const tintC = (k) => (o.camo ? blend(k, o.patch, o.camo) : k);
    const body = tintC(cols.body), head = tintC(cols.head), st = Math.sin(o.step || 0) * 5;
    line(-6, -16, -10 + st, 0, '#ff9f1c', 5); line(8, -16, 12 - st, 0, '#ff9f1c', 5);
    c.beginPath(); c.arc(-30, -36, 12, 3.9, 0.3); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.lineWidth = 2.5; c.strokeStyle = tintC('#6ad0a0'); c.stroke();
    el(0, -32, 26, 19, body); el(-4, -32, 14, 9, shade(body, -0.18)); rr(-10, -36, 4, 4, 1, '#ffd23f'); rr(2, -30, 4, 4, 1, '#ffd23f');
    c.beginPath(); c.moveTo(14, -42); c.quadraticCurveTo(26 + Math.sin(G.t * 3) * 3, -62, 22, -78); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = head; c.stroke();
    el(24, -82, 11, 9, head); poly([[31, -84], [44, -80], [31, -77]], tintC(cols.beak)); rr(20, -90, 9, 7, 3, '#bfeaff'); el(25, -86.5, 2, 2, '#1b1b1b');
    c.restore();
  }
  function blend(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), f = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k); return '#' + [f(16), f(8), f(0)].map((v) => v.toString(16).padStart(2, '0')).join(''); }

  function drawScene() {
    const R = G.room.R, cx = G.cam;
    let g = c.createLinearGradient(0, 0, 0, FL); g.addColorStop(0, R.wall[0]); g.addColorStop(1, R.wall[1]); c.fillStyle = g; c.fillRect(0, 0, W, FL);
    // wall decor: windows / stripes
    c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) { const x = ((i * 380 + 90) - cx * 0.9) % (W + 200); rr(x - 40, 60, 80, 90, 6, 'rgba(255,255,255,.45)'); }
    G.room.patches.forEach((p) => { const x = p.x - p.w / 2 - cx; rr(x, 150, p.w, FL - 150, 8, p.col); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 6, 158, p.w - 12, 8); if (G.role === 'hider') { c.fillStyle = 'rgba(0,0,0,.35)'; c.font = '12px system-ui'; c.textAlign = 'center'; c.fillText('camo', x + p.w / 2, 170); } });
    c.fillStyle = R.floor; c.fillRect(0, FL, W, H - FL); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, FL, W, 6); for (let x = -((cx) % 90); x < W; x += 90) { c.fillStyle = 'rgba(0,0,0,.07)'; c.fillRect(x, FL + 6, 3, H - FL); }
    // crumbs
    if (G.role === 'hider') G.crumbs.forEach((cr) => { if (cr.got) return; el(cr.x - cx, FL + 24 + Math.sin(G.t * 4 + cr.x) * 2, 9, 6, '#e0a65a'); el(cr.x - cx - 2, FL + 22, 3, 2, '#f7d79a'); });
    // props
    G.room.props.forEach((q) => { if (q.x - cx < -80 || q.x - cx > W + 80) return; drawProp(q.type, q.x, q.col, q.checked ? 0.45 : 1, q.poked > 0 ? -6 * Math.sin(q.poked * 12) : 0); if (q.checked) { c.fillStyle = '#e63946'; c.font = 'bold 28px system-ui'; c.textAlign = 'center'; c.fillText('✗', q.x - cx, FL - 30); } });
    const owner = isOwner();
    if (G.role === 'hider') {
      const p = G.p, cols = skinCols(); const goose = p.form === 'goose', t = p.morphT > 0 ? (p.morphTo === 'prop' ? 1 - p.morphT / 0.45 : p.morphT / 0.3) : (goose ? 0 : 1);
      if (p.scanned && t > 0 && t < 1) { drawProp(p.scanned.type, p.x, p.scanned.col, t); drawGoose(p.x, FL, cols, { dir: p.dir, alpha: 1 - t, step: G.t * 10 * (Math.abs(p.v) > 1 ? 1 : 0) }); }
      else if (p.form === 'prop') { const vis = p.flick > 0 ? (Math.sin(G.t * 40) > -0.2 ? 1 : 0.35) : 1; drawProp(p.scanned.type, p.x, p.scanned.col, vis); }
      else drawGoose(p.x, FL, cols, { dir: p.dir, alpha: 1 - p.camo * 0.7, camo: p.camo, patch: (patchAt(p.x) || { col: '#ffffff' }).col, step: G.t * 10 * (Math.abs(p.v) > 1 ? 1 : 0) });
      if (G.expose > 0.02) { c.fillStyle = 'rgba(230,57,70,' + (0.5 * G.expose) + ')'; c.beginPath(); c.arc(p.x - cx, FL - 40, 50 + 20 * G.expose, 0, 7); c.fill(); }
      drawBot(G.bot);
      // spotlight pool on the floor
      const sx = G.spotX - cx; c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = G.lit ? 'rgba(255,240,150,.35)' : 'rgba(255,240,150,.22)'; c.beginPath(); c.ellipse(sx, FL + 10, 70, 16, 0, 0, 7); c.fill(); c.restore();
    } else {
      const hid = G.hid; let a = hid.shimmer > 0 ? 0.55 : 1; if (hid.shimmer > 0) { c.save(); c.translate(hid.x - cx, FL); c.globalAlpha = 0.5; c.shadowColor = '#fff'; c.shadowBlur = 16; PD[hid.type].d(hid.col); c.restore(); } else drawProp(hid.type, hid.x, hid.col, 1);
      if (owner) { c.strokeStyle = '#ffd23f'; c.setLineDash([6, 4]); c.lineWidth = 2; c.strokeRect(hid.x - cx - 30, FL - 90, 60, 92); c.setLineDash([]); }
      drawBot({ x: G.p.x, dir: G.p.dir, mode: 'walk', t: 0, spotX: G.p.x + G.p.dir * 110 });
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,240,150,.22)'; c.beginPath(); c.ellipse(G.p.x + G.p.dir * 110 - cx, FL + 10, 70, 16, 0, 0, 7); c.fill(); c.restore();
    }
    G.puffs.forEach((q) => { c.fillStyle = 'rgba(255,255,255,' + clamp(q.l * 1.4, 0, 0.8) + ')'; c.beginPath(); c.arc(q.x - cx, q.y, q.r, 0, 7); c.fill(); });
    if (G.walkTo != null && G.role === 'seeker') { c.strokeStyle = '#ffd23f'; c.lineWidth = 2; c.beginPath(); c.arc(G.walkTo - cx, FL + 18, 8, 0, 7); c.stroke(); }
  }
  function drawHud() {
    c.textAlign = 'left'; c.font = 'bold 20px system-ui'; const tl = Math.max(0, G.time), f = tl / G.timeMax;
    rr(14, 12, 220, 26, 8, 'rgba(255,255,255,.85)'); c.fillStyle = f < 0.25 ? '#e63946' : '#2fbf71'; c.fillRect(18, 16, 212 * f, 18); c.fillStyle = INK; c.fillText(Math.ceil(tl) + 's', 244, 33);
    c.font = 'bold 15px system-ui'; c.fillStyle = INK; const pill = (x, t) => { c.font = 'bold 15px system-ui'; const w = c.measureText(t).width + 18; rr(x, 46, w, 26, 8, 'rgba(255,255,255,.85)'); c.fillStyle = INK; c.textAlign = 'left'; c.fillText(t, x + 9, 65); return w + 6; };
    let x = 14; x += pill(x, G.room.R.emoji + ' ' + G.room.R.name + ' · room ' + (G.level + 1));
    if (G.role === 'hider') {
      x += pill(x, '🍞 ' + G.got + '/5'); const p = G.p;
      if (p.scanned) pill(x, 'Scanned: ' + PD[p.scanned.type].n + (p.scanned.safe ? ' ✅' : ' ⚠'));
      if (G.expose > 0.02) { rr(14, 78, 120, 12, 6, 'rgba(255,255,255,.7)'); c.fillStyle = '#e63946'; c.fillRect(17, 81, 114 * G.expose, 6); }
      if (p.camo > 0.02) { rr(14, 94, 120, 12, 6, 'rgba(255,255,255,.7)'); c.fillStyle = '#8f6bff'; c.fillRect(17, 97, 114 * p.camo, 6); }
      if (G.bot.mode === 'poke') { c.font = '14px system-ui'; const bx = G.bot.x - G.cam; if (bx > 0 && bx < W) { c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(G.bot.say || '', bx, FL - 110); } }
    } else pill(x, '🔎 scans ' + G.p.scans);
    c.textAlign = 'center'; c.font = 'bold 18px system-ui'; G.toasts.slice(-3).forEach((t, i) => { const w = c.measureText(t.t).width + 24; c.globalAlpha = clamp(t.left * 2, 0, 1); rr(W / 2 - w / 2, 96 + i * 34, w, 28, 10, 'rgba(20,24,40,.85)'); c.fillStyle = '#fff'; c.fillText(t.t, W / 2, 116 + i * 34); c.globalAlpha = 1; });
  }
  function render() {
    const s = viewScale(), cw = cv.clientWidth, ch = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1b1f33'; c.fillRect(0, 0, cv.width, cv.height);
    const k = viewScale(); c.setTransform(k.k, 0, 0, k.k, k.ox, k.oy); c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
    if (G) { drawScene(); drawHud(); } else { c.fillStyle = '#2a3050'; c.fillRect(0, 0, W, H); }
    c.restore(); void s;
  }
  function frame(now) {
    raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!open || !cv) return; if (G && !paused && !G.over) update(dt); else if (G) update(G.over ? dt : 0); render();
  }

  root.Chameleon = {
    init(a) { api = a; }, open: openUI, close, start,
    _step(dt) { if (G) update(dt); }, _state: () => G, _input: I, _consts: { THRESH, PD, ROOMS },
  };
})(window);
