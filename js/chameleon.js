/*
 * Meccha Chameleon (2D, online): a hide-and-seek where the HIDERS PAINT THEIR WHITE GOOSE BODY to blend into the stage.
 *   HIDERS : you start pure white. During the paint phase use brush / spray / bucket / eyedroppers (the eyedropper can pick colours straight
 *            off the stage) to paint your goose so it matches the wall behind your hiding spot. Walk to a spot, pick a pose
 *            (stand / crouch / flat), press READY. The "blend meter" is the real colour match between your paint and what is behind you.
 *   SEEKERS: wait blindfolded while the hiders paint, then search the stage. TAG a hider (button, key or tap on it). A miss costs time.
 *            The better a hider blends, the closer you must be to notice it. A moving hider is always easy to spot.
 *   Seekers win by finding everyone before the time runs out, hiders win if anyone survives. Roles swap every round.
 *   2-10 players online (window.Room, host-authoritative), bots fill the empty places. Offline vs bots works too.
 * Chameleon.init({ save, Skins, award, isOwner })   Chameleon.open()   Chameleon.close()   Chameleon.start(opts)
 */
(function (root) {
  'use strict';
  const W = 960, H = 540, WW = 2400, FL = 470, FLY = 486, PW = 96, PH = 120, GW = 72, GH = 90, TW = 32, TH = 40;
  const PREP = 45, SEEKT = 100, PREFIX = 'wobble-cham-v1-';
  const POSES = ['stand', 'crouch', 'flat'], PSH = { stand: { sx: 1, sy: 1, n: 'Stand' }, crouch: { sx: 1.1, sy: 0.72, n: 'Crouch' }, flat: { sx: 1.35, sy: 0.46, n: 'Flat' } };
  const COLS = ['#4aa3ff', '#ff6b6b', '#ffd23f', '#4cc35a', '#b57aff', '#ff8c42', '#2ec4b6', '#ff7eb6', '#9aa3b2', '#7a5230'];
  const NAMES = ['Honky', 'Waddle', 'Biscuit', 'Quackers', 'Pebble', 'Noodle', 'Gus', 'Mabel', 'Pip', 'Dotty'];
  let api = null, dom = null, cv = null, c = null, opened = false, raf = 0, last = 0, G = null, room = null, actx = null, myName = '';
  const I = { l: false, r: false };
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  const mk = (w, h) => { const e = document.createElement('canvas'); e.width = w; e.height = h; return e; };
  const ctx2 = (e, ro) => e.getContext('2d', ro ? { willReadFrequently: true } : undefined);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function beep(f, d, type, v) {
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; if (!actx) actx = new AC(); const o = actx.createOscillator(), g = actx.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.value = v || 0.04; g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d); o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d); } catch (e) { /* ignore */ }
  }

  // ================================================================== the goose (one outline used for art, paint mask and scoring)
  function gpath(g, w, h, col) {   // col: null = mask (black), else { body, beak, neck }
    const f = (c0) => (col ? col[c0] : '#000'), S = (v) => v * w, T = (v) => v * h;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = f('body'); g.strokeStyle = f('neck');
    g.beginPath(); g.moveTo(S(0.06), T(0.56)); g.lineTo(S(0.27), T(0.54)); g.lineTo(S(0.27), T(0.76)); g.lineTo(S(0.05), T(0.66)); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(S(0.45), T(0.66), S(0.3), T(0.17), 0, 0, 7); g.fill();
    g.lineWidth = S(0.13); g.beginPath(); g.moveTo(S(0.62), T(0.6)); g.quadraticCurveTo(S(0.78), T(0.45), S(0.7), T(0.22)); g.stroke();
    g.beginPath(); g.ellipse(S(0.72), T(0.19), S(0.105), T(0.075), 0, 0, 7); g.fill();
    g.strokeStyle = f('beak'); g.lineWidth = S(0.045); g.beginPath(); g.moveTo(S(0.4), T(0.8)); g.lineTo(S(0.4), T(0.96)); g.moveTo(S(0.56), T(0.8)); g.lineTo(S(0.56), T(0.96)); g.stroke();
    g.fillStyle = f('beak'); g.beginPath(); g.moveTo(S(0.4), T(0.95)); g.lineTo(S(0.5), T(0.995)); g.lineTo(S(0.36), T(0.995)); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(S(0.56), T(0.95)); g.lineTo(S(0.66), T(0.995)); g.lineTo(S(0.52), T(0.995)); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(S(0.8), T(0.15)); g.lineTo(S(0.985), T(0.215)); g.lineTo(S(0.8), T(0.25)); g.closePath(); g.fill();
  }
  const maskCv = mk(PW, PH), whiteCv = mk(PW, PH), maskData = (() => { gpath(ctx2(maskCv), PW, PH, null); return ctx2(maskCv, 1).getImageData(0, 0, PW, PH).data; })();
  (() => { const g = ctx2(whiteCv); gpath(g, PW, PH, { body: '#fff', beak: '#fff', neck: '#fff' }); g.globalCompositeOperation = 'source-atop'; const gr = g.createLinearGradient(0, 0, 0, PH); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.07)'); g.fillStyle = gr; g.fillRect(0, 0, PW, PH); })();
  function gooseArt(g, x, y, w, h, body, face, seeker) {   // coloured goose (seekers, tagged hiders); (x,y) = feet centre
    g.save(); g.translate(x, y - h); if (face < 0) { g.translate(w / 2, 0); g.scale(-1, 1); g.translate(-w / 2, 0); }
    gpath(g, w, h, { body, beak: '#ff9b2f', neck: body });
    g.fillStyle = '#1b1f33'; g.beginPath(); g.arc(w * 0.74, h * 0.17, w * 0.018, 0, 7); g.fill();
    if (seeker) { g.strokeStyle = '#2a2f3a'; g.lineWidth = 2.2; g.beginPath(); g.arc(w * 0.93, h * 0.34, w * 0.07, 0, 7); g.moveTo(w * 0.88, h * 0.39); g.lineTo(w * 0.8, h * 0.5); g.stroke(); g.fillStyle = 'rgba(160,220,255,.5)'; g.beginPath(); g.arc(w * 0.93, h * 0.34, w * 0.07, 0, 7); g.fill(); }
    g.restore();
  }
  const bboxOf = (x, pose) => { const s = PSH[pose] || PSH.stand, w = GW * s.sx, h = GH * s.sy; return { x0: x - w / 2, y0: FLY - h, w, h }; };
  function buildSpr(p) { const s = mk(PW, PH), g = ctx2(s); g.drawImage(whiteCv, 0, 0); if (p.P) g.drawImage(p.P, 0, 0); p.spr = s; p.sprDirty = false; return s; }
  function drawSpr(g, spr, x, pose, face, alpha) {
    const b = bboxOf(x, pose); g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.shadowColor = 'rgba(0,0,0,.2)'; g.shadowBlur = 2;
    if (face < 0) { g.translate(b.x0 + b.w, b.y0); g.scale(-1, 1); g.drawImage(spr, 0, 0, b.w, b.h); } else g.drawImage(spr, b.x0, b.y0, b.w, b.h); g.restore();
  }

  // ================================================================== stages: painted backdrops with real patterns (identical on every device)
  function pat(g, kind, x0, y0, w, h, c1, c2, R) {
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); g.fillStyle = c1; g.fillRect(x0, y0, w, h); g.fillStyle = c2; g.strokeStyle = c2;
    if (kind === 'dots') { for (let y = y0 + 14; y < y0 + h + 28; y += 38) for (let x = x0 + ((((y - y0) / 38) | 0) % 2 ? 33 : 14); x < x0 + w + 20; x += 38) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); } }
    else if (kind === 'stripes') { for (let x = x0; x < x0 + w; x += 44) g.fillRect(x, y0, 22, h); }
    else if (kind === 'hstripes') { for (let y = y0; y < y0 + h; y += 40) g.fillRect(x0, y, w, 20); }
    else if (kind === 'checker') { for (let y = y0; y < y0 + h; y += 36) for (let x = x0; x < x0 + w; x += 36) if ((((x - x0) / 36 | 0) + ((y - y0) / 36 | 0)) % 2) g.fillRect(x, y, 36, 36); }
    else if (kind === 'zigzag') { g.lineWidth = 7; for (let y = y0 + 12; y < y0 + h; y += 30) { g.beginPath(); for (let x = x0 - 20; x < x0 + w + 20; x += 20) g.lineTo(x, y + (((x - x0) / 20 | 0) % 2 ? 12 : -2)); g.stroke(); } }
    else if (kind === 'stars') { for (let y = y0 + 18; y < y0 + h + 30; y += 48) for (let x = x0 + ((((y - y0) / 48) | 0) % 2 ? 36 : 12); x < x0 + w + 30; x += 48) { g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 5 : 12, a = k * Math.PI / 5 - Math.PI / 2; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); } }
    else if (kind === 'diamonds') { for (let y = y0 - 10; y < y0 + h + 30; y += 36) for (let x = x0 + ((((y - y0) / 36) | 0) % 2 ? 24 : 0); x < x0 + w + 30; x += 48) { g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x + 14, y); g.lineTo(x, y + 16); g.lineTo(x - 14, y); g.closePath(); g.fill(); } }
    else if (kind === 'bricks') { g.lineWidth = 3; for (let y = y0, r = 0; y < y0 + h; y += 30, r++) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke(); for (let x = x0 + (r % 2 ? 30 : 0); x < x0 + w; x += 60) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 30); g.stroke(); } } }
    else if (kind === 'leaves') { for (let i = 0; i < w * h / 260; i++) { g.fillStyle = R() < 0.5 ? c2 : shade(c2, R() < 0.5 ? 0.25 : -0.25); g.beginPath(); g.ellipse(x0 + R() * w, y0 + R() * h, 8 + R() * 8, 5 + R() * 5, R() * 3, 0, 7); g.fill(); } }
    else if (kind === 'splat') { for (let i = 0; i < w * h / 9000; i++) { g.fillStyle = pick(['#ff5c7a', '#ffd23f', '#4aa3ff', '#4cc35a', '#b57aff', '#ff8c42']); const x = x0 + R() * w, y = y0 + R() * h, r = 8 + R() * 26; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + (R() - 0.5) * r * 3, y + (R() - 0.5) * r * 3, 2 + R() * 5, 0, 7); g.fill(); } } }
    g.restore();
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = (v) => clamp(Math.round(v + (k > 0 ? (255 - v) * k : v * k)), 0, 255); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join(''); }
  const box = (g, x, y, w, h, f, s, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r || 0); else g.rect(x, y, w, h); g.fillStyle = f; g.fill(); if (s) { g.lineWidth = 3; g.strokeStyle = s; g.stroke(); } };
  const STAGES = [
    { name: 'Toy Room', emoji: '🧸', draw(g, R) {
      const bands = [['dots', '#ffe9b0', '#ff8f7a'], ['stripes', '#bfe6ff', '#ffffff'], ['stars', '#7a5bd6', '#ffd23f'], ['zigzag', '#bff0c4', '#4cb86a'], ['checker', '#ffd7e8', '#ffb3d1'], ['dots', '#bfe6ff', '#4aa3ff']];
      bands.forEach((b, i) => pat(g, b[0], i * 400, 0, 400, FL, b[1], b[2], R));
      for (let k = 0; k < 5; k++) { const x = 60 + k * 460 + R() * 60; box(g, x, 200, 320, 12, '#a86a35', '#6e4521'); for (let i = 0; i < 8; i++) { const bw = 30 + R() * 22, cx = x + 10 + i * 38; box(g, cx, 200 - bw, bw, bw, pick(['#e63946', '#ffd23f', '#4aa3ff', '#4cc35a', '#b57aff', '#ff8c42']), '#2a2f3a', 3); } box(g, x, 330, 320, 12, '#a86a35', '#6e4521'); for (let i = 0; i < 6; i++) { g.fillStyle = pick(['#e63946', '#ffd23f', '#4aa3ff', '#4cc35a']); g.beginPath(); g.arc(x + 30 + i * 52, 314, 16 + R() * 6, 0, 7); g.fill(); } }
      for (let i = 0; i < 6; i++) { g.lineWidth = 14; g.strokeStyle = ['#ff5c7a', '#ff9b2f', '#ffd23f', '#4cc35a', '#4aa3ff', '#b57aff'][i]; g.beginPath(); g.arc(1220, FL, 190 - i * 14, Math.PI, 0); g.stroke(); }
      pat(g, 'hstripes', 0, FL, WW, H - FL, '#c98a4b', '#b8793b', R); g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < WW; x += 90) g.fillRect(x, FL, 3, H - FL);
      g.fillStyle = '#d6384f'; g.beginPath(); g.ellipse(560, 500, 230, 26, 0, 0, 7); g.fill(); pat(g, 'dots', 380, 485, 360, 30, '#d6384f', '#ffd23f', R); g.fillStyle = '#4a7bd6'; g.beginPath(); g.ellipse(1780, 502, 190, 22, 0, 0, 7); g.fill();
    } },
    { name: 'Kitchen', emoji: '🍳', draw(g, R) {
      const bands = [['checker', '#e8f6ff', '#9fd0ea'], ['bricks', '#f3d9c7', '#c98d6e'], ['stripes', '#fff4c8', '#ffd86b'], ['checker', '#d9f5e0', '#8fd3a0'], ['hstripes', '#e8f6ff', '#b6e0f7'], ['bricks', '#f3d9c7', '#c98d6e']];
      bands.forEach((b, i) => pat(g, b[0], i * 400, 0, 400, FL, b[1], b[2], R));
      for (let k = 0; k < 5; k++) { const x = 40 + k * 470; box(g, x, 40, 190, 130, '#c98d5a', '#7a4a22', 6); box(g, x + 196, 40, 190, 130, '#b9814f', '#7a4a22', 6); g.fillStyle = '#ffd23f'; g.fillRect(x + 160, 100, 8, 26); g.fillRect(x + 214, 100, 8, 26); box(g, x, 300, 386, 170, '#c98d5a', '#7a4a22', 6); box(g, x + 14, 316, 170, 138, '#b9814f', '#7a4a22', 6); box(g, x + 202, 316, 170, 138, '#b9814f', '#7a4a22', 6); box(g, x - 10, 288, 406, 18, '#e8e2d6', '#9a9486', 4); }
      for (let k = 0; k < 3; k++) { const x = 330 + k * 760; box(g, x, 120, 160, 150, '#bfe6ff', '#fff', 6); pat(g, 'stripes', x - 20, 100, 36, 190, '#e63946', '#fff', R); pat(g, 'stripes', x + 144, 100, 36, 190, '#e63946', '#fff', R); g.fillStyle = '#6fbf5c'; g.beginPath(); g.arc(x + 80, 200, 28, 0, 7); g.fill(); }
      for (let i = 0; i < 9; i++) { const x = 120 + i * 260; g.strokeStyle = '#555'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 70); g.stroke(); g.fillStyle = pick(['#bbb', '#e63946', '#4aa3ff', '#ffd23f']); g.beginPath(); g.arc(x, 90, 22, 0, 7); g.fill(); }
      pat(g, 'checker', 0, FL, WW, H - FL, '#f1f1f1', '#7b8794', R);
    } },
    { name: 'Garden', emoji: '🌻', draw(g, R) {
      const sk = g.createLinearGradient(0, 0, 0, 260); sk.addColorStop(0, '#78c8ff'); sk.addColorStop(1, '#d9f3ff'); g.fillStyle = sk; g.fillRect(0, 0, WW, FL);
      for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(255,255,255,.9)'; const x = 100 + i * 350, y = 60 + R() * 70; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + k * 30, y + (k % 2) * 8, 30 - k * 3, 0, 7); g.fill(); } }
      pat(g, 'stripes', 0, 190, WW, 190, '#f1e3c4', '#b99d6c', R); g.fillStyle = '#9b7d4c'; g.fillRect(0, 200, WW, 10); g.fillRect(0, 330, WW, 10);
      for (let k = 0; k < 6; k++) { pat(g, 'leaves', k * 400, 250, 400, 230, '#3f9b45', '#2c7a3a', R); }
      for (let k = 0; k < 7; k++) { const x = 100 + k * 330; g.fillStyle = '#ffd23f'; g.strokeStyle = '#2a7a2a'; g.lineWidth = 7; g.beginPath(); g.moveTo(x, FL); g.lineTo(x, 340); g.stroke(); for (let q = 0; q < 10; q++) { g.fillStyle = pick(['#ffd23f', '#ff8c42']); g.beginPath(); g.ellipse(x + Math.cos(q * 0.63) * 24, 330 + Math.sin(q * 0.63) * 24, 14, 8, q * 0.63, 0, 7); g.fill(); } g.fillStyle = '#7a4a22'; g.beginPath(); g.arc(x, 330, 14, 0, 7); g.fill(); }
      pat(g, 'dots', 0, 420, WW, 50, '#4a8a3a', '#ff5c9a', R); pat(g, 'leaves', 0, FL, WW, H - FL, '#6fbf5c', '#58a84a', R);
      g.fillStyle = '#c9b48f'; for (let x = 100; x < WW; x += 240) { g.beginPath(); g.ellipse(x, 510, 70, 14, 0, 0, 7); g.fill(); }
    } },
    { name: 'Library', emoji: '📚', draw(g, R) {
      pat(g, 'diamonds', 0, 0, WW, FL, '#7d2335', '#a8435a', R);
      for (let k = 0; k < 6; k++) {
        const x = 20 + k * 395; box(g, x, 30, 330, 410, '#5a3a1e', '#2e1c0a', 6);
        for (let row = 0; row < 4; row++) { const y = 44 + row * 100; g.fillStyle = '#3c2610'; g.fillRect(x + 8, y + 86, 314, 8); let bx = x + 12; while (bx < x + 316) { const bw = 14 + R() * 20, bh = 56 + R() * 28; g.fillStyle = pick(['#c0392b', '#2e86c1', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#16a085', '#ecf0f1', '#d35400', '#34495e']); g.fillRect(bx, y + 86 - bh, bw, bh); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bx + 3, y + 86 - bh + 8, bw - 6, 3); g.fillRect(bx + 3, y + 86 - 14, bw - 6, 3); bx += bw + 1; } }
      }
      for (let k = 0; k < 3; k++) { const x = 360 + k * 740; box(g, x, 60, 130, 100, '#c9a35a', '#6a4a14', 4); box(g, x + 10, 70, 110, 80, pick(['#2e86c1', '#27ae60', '#e67e22']), null, 2); }
      pat(g, 'diamonds', 0, FL, WW, H - FL, '#1c4a6e', '#d9b24a', R); pat(g, 'stripes', 700, FL, 300, H - FL, '#7d2335', '#d9b24a', R);
    } },
    { name: 'Art Studio', emoji: '🎨', draw(g, R) {
      g.fillStyle = '#f7f4ee'; g.fillRect(0, 0, WW, FL); pat(g, 'splat', 0, 0, WW, FL, 'rgba(0,0,0,0)', '#000', R);
      for (let k = 0; k < 5; k++) { const x = 140 + k * 470; g.strokeStyle = '#7a5230'; g.lineWidth = 8; g.beginPath(); g.moveTo(x - 60, FLY); g.lineTo(x, 230); g.lineTo(x + 60, FLY); g.moveTo(x, 230); g.lineTo(x, 130); g.stroke(); box(g, x - 90, 130, 180, 230, '#fff', '#2a2f3a', 4); const gr = g.createLinearGradient(x - 80, 140, x + 80, 350); gr.addColorStop(0, pick(['#ff5c7a', '#4aa3ff', '#ffd23f'])); gr.addColorStop(1, pick(['#4cc35a', '#b57aff', '#ff8c42'])); g.fillStyle = gr; g.fillRect(x - 78, 142, 156, 206); pat(g, pick(['stripes', 'dots', 'checker', 'zigzag']), x - 60, 170, 120, 120, 'rgba(255,255,255,0)', 'rgba(255,255,255,.5)', R); }
      pat(g, 'checker', 0, FL, WW, H - FL, '#eae6dc', '#d3cdbd', R); pat(g, 'splat', 0, FL, WW, H - FL, 'rgba(0,0,0,0)', '#000', R);
    } }
  ];
  const stageCache = {};
  function stageOf(i) {
    if (stageCache[i]) return stageCache[i];
    const s = mk(WW, H), g = ctx2(s, 1), R = rng(9301 + i * 7919); STAGES[i].draw(g, R);
    const sh = g.createLinearGradient(0, FL - 4, 0, FL + 22); sh.addColorStop(0, 'rgba(0,0,0,.22)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, FL - 4, WW, 26);
    const vg = g.createLinearGradient(0, 0, 0, 60); vg.addColorStop(0, 'rgba(0,0,0,.18)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(0, 0, WW, 60);
    return (stageCache[i] = s);
  }

  // ================================================================== blend: how well does the paint match what is behind the goose?
  const tA = mk(TW, TH), tB = mk(TW, TH), gA = ctx2(tA, 1), gB = ctx2(tB, 1);
  function blendOf(spr, stage, x, pose, face) {
    const b = bboxOf(x, pose); gA.clearRect(0, 0, TW, TH); gB.clearRect(0, 0, TW, TH);
    gA.drawImage(stageOf(stage), clamp(b.x0, 0, WW - b.w), b.y0, b.w, b.h, 0, 0, TW, TH);
    gB.save(); if (face < 0) { gB.translate(TW, 0); gB.scale(-1, 1); } gB.drawImage(spr, 0, 0, TW, TH); gB.restore();
    const a = gA.getImageData(0, 0, TW, TH).data, d = gB.getImageData(0, 0, TW, TH).data; let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { const dr = a[i] - d[i], dg = a[i + 1] - d[i + 1], db = a[i + 2] - d[i + 2]; sum += Math.sqrt(dr * dr + dg * dg + db * db) / 441.7; n++; }
    return n ? clamp(1 - (sum / n) / 0.27, 0, 1) : 0;
  }
  function stageSamples(stage, x, pose, n) {   // dominant-ish colours behind the goose, for the palette helper
    const b = bboxOf(x, pose), g = ctx2(stageOf(stage), 1), out = [], seen = {};
    const d = g.getImageData(clamp(b.x0, 0, WW - b.w) | 0, b.y0 | 0, Math.max(1, b.w | 0), Math.max(1, b.h | 0)).data; const bins = {};
    for (let i = 0; i < d.length; i += 4 * 3) { const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4); (bins[k] = bins[k] || [0, 0, 0, 0]); const e = bins[k]; e[0]++; e[1] += d[i]; e[2] += d[i + 1]; e[3] += d[i + 2]; }
    Object.values(bins).sort((p, q) => q[0] - p[0]).slice(0, n * 2).forEach((e) => { const col = '#' + [e[1], e[2], e[3]].map((v) => Math.round(v / e[0]).toString(16).padStart(2, '0')).join(''); if (!seen[col] && out.length < n) { seen[col] = 1; out.push(col); } });
    return out;
  }
  function autoPaint(p, stage, skill) {   // bots (and the "auto" test mode) paint by sampling the wall behind them, then make it a bit sloppy
    const b = bboxOf(p.x, p.pose), P = mk(PW, PH), g = ctx2(P);
    g.save(); if (skill < 0.95) g.filter = 'blur(' + ((1 - skill) * 5 + 0.3).toFixed(1) + 'px)';
    const jx = (1 - skill) * 7 * (Math.random() - 0.5), jy = (1 - skill) * 7 * (Math.random() - 0.5);
    if (p.face < 0) { g.translate(PW, 0); g.scale(-1, 1); }
    g.drawImage(stageOf(stage), clamp(b.x0, 0, WW - b.w) + jx, b.y0 + jy, b.w, b.h, -6, -6, PW + 12, PH + 12); g.restore();
    g.filter = 'none'; if (skill < 0.8) { g.globalAlpha = 0.18 * (1 - skill) * 3; g.fillStyle = pick(['#fff', '#000', '#f88', '#8af']); g.fillRect(0, 0, PW, PH); g.globalAlpha = 1; }
    g.globalCompositeOperation = 'destination-in'; g.drawImage(maskCv, 0, 0); p.P = P; p.sprDirty = true;
  }

  // ================================================================== game state
  function newPlayer(i, d) {
    return { i, net: d.net == null ? -1 : d.net, name: d.name, col: COLS[i % COLS.length], bot: !!d.bot, role: d.role || 'hider', x: d.x || 200, face: 1, pose: 'stand', mv: false, tagged: false, ready: false,
      P: null, spr: null, sprDirty: true, blend: 0, bsum: 0, bt: 0, tot: d.tot || 0, pts: 0, tags: 0, misses: 0, skill: rnd(0.55, 0.97), tagCd: 0, pings: 3, ai: null, rdyAt: rnd(10, 30), tagT: 0, caught: 0, vis: 0 };
  }
  function isMe(p) { return G && p.i === G.me; }
  const me = () => G && G.ps[G.me];
  const owner = () => !!(api && api.isOwner && api.isOwner());
  const toast = (t) => { if (G) G.toasts.push({ t, left: 3 }); };

  function descOf(p) { return { n: p.name, net: p.net, bot: p.bot ? 1 : 0, role: p.role, x: Math.round(p.x), tot: p.tot }; }
  function start(opts) {   // offline game vs bots (or test games)
    opts = opts || {};
    const total = clamp(opts.total || 6, 3, 10), rounds = opts.rounds || 2, st = opts.stage == null ? (Math.random() * STAGES.length) | 0 : opts.stage;
    const names = NAMES.slice().sort(() => Math.random() - 0.5), ps = [];
    for (let i = 0; i < total; i++) ps.push(newPlayer(i, { name: i ? names[i] : (myName || 'You'), net: i ? -1 : 0, bot: i > 0 || !!opts.auto }));
    G = { online: false, host: true, ps, me: 0, stage: st, round: 0, rounds, ph: 'prep', t: PREP, el: 0, toasts: [], cam: 0, ui: 'walk', walkTo: null, ns: Math.ceil(total / 4), auto: !!opts.auto, firstSeeker: opts.role === 'seeker', over: false, res: null, sk0: opts.role === 'seeker' ? 0 : 1, snapT: 0, total, tagFx: [], pingFx: [], blendT: 0, ev: [] };
    beginRound(0); layoutUI();
  }
  function beginRound(r) {
    const g = G, n = g.ps.length; g.round = r; g.ph = 'prep'; g.t = PREP; g.el = 0; g.res = null; g.over = false; g.ui = 'walk'; g.walkTo = null; g.tagFx = []; g.pingFx = []; g.ev = [];
    const s0 = g.online ? g.sk0 : g.sk0;
    for (const p of g.ps) { p.role = 'hider'; }
    for (let k = 0; k < g.ns; k++) g.ps[(s0 + r * g.ns + k) % n].role = 'seeker';
    for (const p of g.ps) {
      Object.assign(p, { tagged: false, ready: false, P: null, spr: null, sprDirty: true, pose: 'stand', mv: false, blend: 0, bsum: 0, bt: 0, pts: 0, tags: 0, misses: 0, tagCd: 0, pings: 3, ai: null, tagT: 0, caught: 0, rdyAt: rnd(10, 30), face: 1, x: p.role === 'seeker' ? 100 + (p.i % 3) * 30 : rnd(260, WW - 200) });
    }
    for (const p of g.ps) if (p.role === 'hider' && p.bot) { p.pose = pick(['stand', 'stand', 'crouch', 'flat']); p.x = pickSpot(p); p.face = Math.random() < 0.5 ? 1 : -1; autoPaint(p, g.stage, p.skill); }
    if (g.online) toNet({ k: 'start', stage: g.stage, round: r, rounds: g.rounds, ns: g.ns, sk0: g.sk0, ps: g.ps.map(descOf) }, true);
    const m = me(); if (m) { g.cam = clamp(m.x - W / 2, 0, WW - W); if (m.role === 'hider') g.ui = 'paint'; }
    layoutUI(); sync();
  }
  function pickSpot(p) {   // bots like calm backdrops: the lowest colour variance among a few random spots
    let best = 600, bv = 1e9;
    for (let k = 0; k < 7; k++) { const x = rnd(220, WW - 200), b = bboxOf(x, p.pose), g = ctx2(stageOf(G.stage), 1), d = g.getImageData(clamp(b.x0, 0, WW - b.w) | 0, b.y0 | 0, Math.max(1, b.w | 0), Math.max(1, b.h | 0)).data; let m = [0, 0, 0], n = 0; for (let i = 0; i < d.length; i += 16) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2]; n++; } m = m.map((v) => v / n); let v = 0; for (let i = 0; i < d.length; i += 16) v += Math.abs(d[i] - m[0]) + Math.abs(d[i + 1] - m[1]) + Math.abs(d[i + 2] - m[2]); v = v / n + Math.random() * 40; if (v < bv) { bv = v; best = x; } }
    return best;
  }

  // ================================================================== network (host-authoritative, via Room)
  function setupRoom() {
    if (room || !root.Room) return;
    room = root.Room.create({ prefix: PREFIX, max: 10,
      hello: () => ({ name: myName, sk: api && api.save ? api.save().skin : 'goose' }),
      onRoster: renderRoster, onMsg: onNet, onStatus: (t, bad) => { const e = $('chStat'); if (e) { e.textContent = t; e.style.color = bad ? '#c62835' : ''; } },
      canJoin: () => (G ? 'A round is already running in that room. Try again in a minute.' : null),
      onDrop: (id) => { if (!G) return; const p = G.ps.find((q) => q.net === id); if (p) { p.bot = true; p.net = -1; toast(p.name + ' left: a bot takes over.'); if (p.role === 'hider' && !p.P) autoPaint(p, G.stage, 0.7); } },
      onLost: (why, was) => { if (was && G) { G = null; layoutUI(); } const e = $('chStat'); if (e) { e.textContent = why; e.style.color = '#c62835'; } renderRoster([]); } });
  }
  function toNet(m, all, id) { if (!room || !G || !G.online) return; if (id != null) room.toOne(id, m); else room.toAll(m); void all; }
  function renderRoster(list) {
    const box = $('chRoster'); if (!box) return; box.innerHTML = '';
    list.forEach((e) => { const s = document.createElement('span'); s.className = 'chip'; s.textContent = (e.id === 0 ? '👑 ' : '🦆 ') + e.name + (room && e.id === room.id() ? ' (you)' : ''); box.appendChild(s); });
    const host = room && room.isHost(), conn = room && room.connected();
    $('chOnl').style.display = conn ? 'block' : 'none'; $('chJoinRow').style.display = conn ? 'none' : 'flex';
    $('chStartOnl').style.display = host ? '' : 'none'; $('chHostOpts').style.display = host ? 'flex' : 'none';
    $('chWaitMsg').textContent = conn ? (host ? list.length + ' of 10 here. Bots fill the rest. Press Start when everyone is in!' : 'Waiting for the host to start…') : '';
  }
  function startOnline() {
    if (!room || !room.isHost() || G) return;
    const list = room.list(), total = clamp(Math.max(sel.total, list.length), 3, 10), names = NAMES.slice().sort(() => Math.random() - 0.5), ps = [];
    list.forEach((e, i) => ps.push(newPlayer(i, { name: e.name || 'Goose', net: e.id })));
    for (let i = list.length; i < total; i++) ps.push(newPlayer(i, { name: names[i % names.length], bot: true }));
    const st = sel.stage < 0 ? (Math.random() * STAGES.length) | 0 : sel.stage;
    G = { online: true, host: true, ps, me: 0, stage: st, round: 0, rounds: sel.rounds, ph: 'prep', t: PREP, el: 0, toasts: [], cam: 0, ui: 'walk', walkTo: null, ns: Math.ceil(total / 4), auto: false, sk0: list.length > 1 ? 1 : (Math.random() * total) | 0, over: false, res: null, snapT: 0, total, tagFx: [], pingFx: [], blendT: 0, ev: [] };
    beginRound(0);
  }
  const pByNet = (id) => G && G.ps.find((p) => p.net === id);
  function loadPaint(p, url) { if (!url) return; const im = new Image(); im.onload = () => { const P = mk(PW, PH); ctx2(P).drawImage(im, 0, 0); p.P = P; p.sprDirty = true; }; im.src = url; }
  function onNet(from, m) {
    if (!m) return;
    if (!room.isHost()) return fromHost(m);
    const p = pByNet(from); if (!G || !p) return;
    switch (m.k) {
      case 'pos': if (p.role === 'hider' && !p.tagged && (G.ph === 'prep' || G.ph === 'seek') || p.role === 'seeker' && G.ph === 'seek') { p.x = clamp(+m.x || p.x, 40, WW - 40); p.face = m.f < 0 ? -1 : 1; if (POSES.includes(m.pose)) p.pose = m.pose; p.mv = !!m.mv; p.invis = !!m.iv; } break;
      case 'paint': if (G.ph === 'prep' && p.role === 'hider') { loadPaint(p, m.img); } break;
      case 'ready': if (p.role === 'hider') p.ready = true; break;
      case 'tag': hostTag(p, +m.wx); break;
      case 'ping': hostPing(p); break;
      case 'wh': if (!(p.wcd > 0) && !p.tagged) hostWhistle(p, m.fx != null && isFinite(m.fx) ? clamp(+m.fx, 40, WW - 40) : null); break;
      default: break;
    }
  }
  function fromHost(m) {
    switch (m.k) {
      case 'start': {
        const first = !G || G.round !== m.round || !G.online; const keep = G && G.online ? G : null;
        const ps = m.ps.map((d, i) => { const p = newPlayer(i, { name: d.n, net: d.net, bot: !!d.bot, role: d.role, x: d.x, tot: d.tot }); return p; });
        const mi = ps.findIndex((p) => p.net === room.id());
        G = { online: true, host: false, ps, me: Math.max(0, mi), stage: m.stage, round: m.round, rounds: m.rounds, ph: 'prep', t: PREP, el: 0, toasts: keep ? keep.toasts : [], cam: 0, ui: 'walk', walkTo: null, ns: m.ns, auto: false, over: false, res: null, snapT: 0, total: ps.length, tagFx: [], pingFx: [], sk0: m.sk0, ev: [] };
        void first; const mm = me(); G.cam = clamp(mm.x - W / 2, 0, WW - W); if (mm.role === 'hider') G.ui = 'paint'; layoutUI(); sync(); break;
      }
      case 'snap': if (G) {
        G.ph = m.ph; G.t = m.t; m.pl.forEach((a, i) => { const p = G.ps[i]; if (!p) return; if (!isMe(p)) { p.tx = a[0]; p.face = a[1]; p.pose = POSES[a[2]] || 'stand'; p.mv = !!a[3]; } p.tagged = !!a[4]; p.ready = !!a[5]; p.blend = a[6] / 100; p.bot = !!a[7]; if (!isMe(p)) p.invis = !!a[8]; });
        if (G.ph === 'seek' && G.ui !== 'walk' && G.ui !== 'pick') { G.ui = 'walk'; layoutUI(); } break; }
      case 'seek': if (G) { G.ph = 'seek'; G.t = SEEKT; G.ui = 'walk'; for (const k of Object.keys(m.paints)) loadPaint(G.ps[+k], m.paints[k]); me().ready = true; toast(me().role === 'seeker' ? 'GO! Find them all!' : 'Seekers are coming. Stay still!'); beep(660, 0.2); layoutUI(); } break;
      case 'ev': if (G) applyEv(m); break;
      case 'end': if (G) { G.ph = 'end'; G.res = m; for (const p of G.ps) { p.pts = m.pts[p.i]; p.tot = m.tot[p.i]; p.blend = m.avg[p.i] / 100; p.tags = m.tg[p.i]; } showEnd(); } break;
      default: break;
    }
  }
  function applyEv(m) {
    if (m.e === 'tag') { const w = G.ps[m.who], b = G.ps[m.by]; if (w) { w.tagged = true; G.tagFx.push({ x: w.x, t: 0, name: w.name }); } toast('🔎 ' + (b ? b.name : '?') + ' found ' + (w ? w.name : '?') + '!'); beep(520, 0.15, 'triangle'); beep(780, 0.2, 'triangle'); }
    else if (m.e === 'miss') { if (m.by === G.me) toast('Missed! Nothing there.'); beep(160, 0.15, 'sawtooth'); }
    else if (m.e === 'wh') { const me0 = G.ps[G.me], by = G.ps[m.by], d = me0 ? Math.abs(me0.x - m.x) : 0; const gx = m.role === 'hider' && me0 && me0.role === 'seeker' && !owner() ? m.x + (Math.random() - 0.5) * 160 : m.x; (G.whFx || (G.whFx = [])).push({ x: gx, t: 0, role: m.role }); whSound(Math.max(0.08, 1 - d / 1400), m.role); if (m.by !== G.me) toast('🎵 ' + (by ? by.name : 'Someone') + ' whistled' + (me0 && gx !== m.x ? '…' : ' (' + (m.x < (me0 ? me0.x : 0) ? 'to the left' : 'to the right') + ')')); }
    else if (m.e === 'ping' && m.by === G.me) { G.pingFx = m.xs.map((x) => ({ x, t: 0 })); beep(900, 0.3, 'sine'); }
  }
  function sync() { if (!G) return; const m = me(); void m; }

  // ================================================================== host rules
  function startSeek() {
    const g = G; g.ph = 'seek'; g.t = SEEKT; g.el = 0; g.ui = g.ui === 'pick' ? 'walk' : g.ui;
    for (const p of g.ps) { if (p.role === 'hider') { if (!p.P && p.bot) autoPaint(p, g.stage, 0.6); p.ready = true; p.ai = null; } else p.ai = { mode: 'sweep', tx: rnd(400, WW - 200), wait: 0, target: null, react: 0, look: 0 }; }
    const paints = {}; if (g.online) for (const p of g.ps) if (p.role === 'hider') paints[p.i] = p.P ? p.P.toDataURL('image/png') : null;
    if (g.online) toNet({ k: 'seek', paints }, true);
    const m = me(); if (m.role === 'seeker') g.cam = clamp(m.x - W / 2, 0, WW - W);
    toast(m.role === 'seeker' ? 'GO! Find them all!' : 'Seekers are coming. Stay still!'); beep(660, 0.2); layoutUI();
  }
  function hostTag(s, wx) {
    const g = G; if (g.ph !== 'seek' || s.role !== 'seeker' || s.tagCd > 0 || !isFinite(wx)) return;
    s.tagCd = 0.9; let hit = null;
    for (const h of g.ps) if (h.role === 'hider' && !h.tagged) { const b = bboxOf(h.x, h.pose); if (wx > b.x0 - 14 && wx < b.x0 + b.w + 14 && Math.abs(s.x - h.x) < 150) { hit = h; break; } }
    if (hit) { hit.tagged = true; hit.tagT = g.el; s.tags++; const ev = { k: 'ev', e: 'tag', by: s.i, who: hit.i }; applyEv(ev); if (g.online) toNet(ev); }
    else { s.misses++; s.tagCd = 1.6; const ev = { k: 'ev', e: 'miss', by: s.i }; applyEv(ev); if (g.online) toNet(ev); }
  }
  function hostPing(s) {
    const g = G; if (g.ph !== 'seek' || s.role !== 'seeker' || s.pings <= 0) return; s.pings--;
    const xs = g.ps.filter((h) => h.role === 'hider' && !h.tagged && Math.abs(h.x - s.x) < 330).map((h) => Math.round(h.x)); const ev = { k: 'ev', e: 'ping', by: s.i, xs };
    applyEv(ev); if (g.online) toNet(ev);
  }
  function moveToward(p, tx, sp, dt) { const dx = tx - p.x; if (Math.abs(dx) < 4) { p.mv = false; return true; } p.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt); p.face = Math.sign(dx); p.mv = true; return false; }
  function botSeeker(s, dt) {
    const g = G, a = s.ai; s.tagCd -= dt; if (!a) return;
    if (s.frz > 0) { s.frz -= dt; s.mv = false; return; }
    a.look -= dt;
    if (a.look <= 0) { a.look = 0.4; if (a.mode !== 'chase') { let best = null, bd = 1e9; for (const h of g.ps) if (h.role === 'hider' && !h.tagged && !h.invis) { const dx = Math.abs(h.x - s.x), v = h.mv ? 1 : Math.pow(1 - h.blend, 1.5), R = 16 + 330 * v * (0.55 + 0.45 * s.skill); if (dx < R && dx < bd) { bd = dx; best = h; } } if (best) { a.mode = 'chase'; a.target = best; a.react = rnd(0.35, 0.9); } } }
    if (a.mode === 'chase') {
      const h = a.target; if (!h || h.tagged) { a.mode = 'sweep'; a.tx = s.x + rnd(-300, 300); return; }
      a.react -= dt; if (a.react > 0) { s.mv = false; return; }
      if (moveToward(s, h.x - Math.sign(h.x - s.x) * 24, 190, dt) || Math.abs(h.x - s.x) < 46) { s.mv = false; if (s.tagCd <= 0) hostTag(s, h.x); if (h.tagged) a.mode = 'sweep'; else if (s.tagCd > 0.5) { a.mode = 'sweep'; a.tx = s.x + rnd(-500, 500); } }
    } else {
      if (a.wait > 0) { a.wait -= dt; s.mv = false; } else if (moveToward(s, a.tx, 165, dt)) { a.wait = rnd(0.5, 1.8); a.tx = clamp(s.x + rnd(-700, 700), 80, WW - 80); }
    }
    if (s.pings > 0 && Math.random() < dt * 0.04) hostPing(s);
    s.x = clamp(s.x, 40, WW - 40);
  }
  function hostUpdate(dt) {
    const g = G;
    for (const p of g.ps) { p.tagCd = Math.max(0, p.tagCd - dt); p.wcd = Math.max(0, (p.wcd || 0) - dt); }
    if (g.ph === 'prep') {
      g.t -= dt; g.el += dt;
      for (const p of g.ps) if (p.role === 'hider' && p.bot && !p.ready && g.el > p.rdyAt) p.ready = true;
      const hs = g.ps.filter((p) => p.role === 'hider');
      if (g.t <= 0 || (g.el > 4 && hs.every((p) => p.ready))) startSeek();
    } else if (g.ph === 'seek') {
      g.t -= dt; g.el += dt;
      for (const p of g.ps) if (p.role === 'seeker' && (p.bot)) botSeeker(p, dt);
      g.blendT -= dt; const doBlend = g.blendT <= 0; if (doBlend) g.blendT = 0.5;
      for (const h of g.ps) if (h.role === 'hider' && !h.tagged) {
        if (h.bot && Math.random() < dt * 0.02) { h.pose = pick(['stand', 'crouch']); }
        if (doBlend) { if (h.sprDirty || !h.spr) buildSpr(h); h.blend = blendOf(h.spr, g.stage, h.x, h.pose, h.face); h.bsum += (h.mv ? 0 : h.blend) * 0.5; h.bt += 0.5; }
      }
      const left = g.ps.filter((p) => p.role === 'hider' && !p.tagged).length;
      if (left === 0) endRound('seekers'); else if (g.t <= 0) endRound('hiders');
    }
    if (g.online) { g.snapT -= dt; if (g.snapT <= 0) { g.snapT = 0.1; toNet({ k: 'snap', ph: g.ph, t: Math.round(g.t * 10) / 10, pl: g.ps.map((p) => [Math.round(p.x), p.face, POSES.indexOf(p.pose), p.mv ? 1 : 0, p.tagged ? 1 : 0, p.ready ? 1 : 0, Math.round(p.blend * 100), p.bot ? 1 : 0, p.invis ? 1 : 0]) }); } }
  }
  function endRound(win) {
    const g = G; g.ph = 'end'; const n = g.ps.length, tot = [], avg = [], tg = [];
    const allFound = win === 'seekers', frac = (g.el > 0 ? 1 : 1);
    void frac;
    for (const p of g.ps) {
      const av = p.bt > 0 ? p.bsum / p.bt : p.blend;
      if (p.role === 'hider') { const surv = p.tagged ? Math.min(1, p.tagT / SEEKT) : 1; p.pts = Math.round(surv * 35 + av * 55 + (p.tagged ? 0 : 15) + (win === 'hiders' ? 10 : 0)); }
      else p.pts = p.tags * 30 + (allFound ? Math.round(clamp(g.t / SEEKT, 0, 1) * 25) + 10 : 0) - Math.min(10, p.misses * 2);
      p.pts = Math.max(0, p.pts - (p.whistles || 0) * 5); p.tot += p.pts; p.avg = av; tot.push(p.tot); avg.push(Math.round(av * 100)); tg.push(p.tags);
    }
    g.res = { k: 'end', win, pts: g.ps.map((p) => p.pts), tot, avg, tg, last: g.round + 1 >= g.rounds }; void n;
    if (g.online) toNet(g.res);
    showEnd();
  }
  function showEnd() {
    const g = G, m = me(), r = g.res; if (!m || !r) return; g.ph = 'end'; g.over = true;
    const mine = m.pts || 0, won = (r.win === 'hiders') === (m.role === 'hider');
    if (api && api.award && !g.auto) { const b = Math.max(1, Math.round(mine / 5)); api.award(b); g.bread = b; }
    if (!dom) return;
    $('chEndT').textContent = (won ? '🏆 ' : '😅 ') + (r.win === 'hiders' ? 'Hiders win!' : 'Seekers win!') + '  (round ' + (g.round + 1) + '/' + g.rounds + ')';
    const rows = g.ps.slice().sort((a, b) => b.tot - a.tot).map((p, k) => (k + 1) + '. ' + (p.i === g.me ? '➡ ' : '') + p.name + (p.role === 'seeker' ? ' 🔎' : ' 🎨') + '  +' + p.pts + '  =  ' + p.tot + (p.role === 'hider' ? '   blend ' + Math.round((p.blend || 0) * 100) + '%' + (p.tagged ? ' (found)' : ' (SURVIVED)') : '   found ' + p.tags));
    $('chEndX').textContent = rows.join('\n') + '\n\nYou earned 🍞 ' + (g.bread || 0);
    const canNext = g.host && !r.last; $('chNext').style.display = canNext ? '' : 'none'; $('chFinal').textContent = r.last ? '🏁 That was the last round!' : (g.host ? '' : 'Waiting for the host for the next round…');
    layoutUI();
  }
  function nextRound() { if (G && G.host && G.ph === 'end' && !G.res.last) beginRound(G.round + 1); }

  // ================================================================== local update (movement for me, interpolation for the rest)
  function update(dt) {
    const g = G; if (!g) return;
    g.toasts.forEach((t) => { t.left -= dt; }); g.toasts = g.toasts.filter((t) => t.left > 0);
    g.tagFx.forEach((f) => { f.t += dt; }); g.tagFx = g.tagFx.filter((f) => f.t < 2.2); g.pingFx.forEach((f) => { f.t += dt; }); g.pingFx = g.pingFx.filter((f) => f.t < 2.5); g.whFx = (g.whFx || []).filter((f) => (f.t += dt) < 2);
    if (g.host) hostUpdate(dt); else if (g.ph === 'prep' || g.ph === 'seek') g.t -= dt;
    const m = me(); if (!m) return;
    if (!g.host) for (const p of g.ps) if (!isMe(p) && p.tx != null) p.x += (p.tx - p.x) * Math.min(1, dt * 10);
    // me: manual control unless I'm a bot (auto test mode)
    const canMove = !m.bot && !m.tagged && ((m.role === 'hider' && (g.ph === 'prep' || g.ph === 'seek') && g.ui !== 'paint') || (m.role === 'seeker' && g.ph === 'seek')) && !g.over;
    m.tagCd = Math.max(0, m.tagCd - dt); m.wcd = Math.max(0, (m.wcd || 0) - dt); m.invis = owner() && ownS.invis;
    if (canMove) {
      const dir = (I.r ? 1 : 0) - (I.l ? 1 : 0); const sp = (m.role === 'seeker' ? 175 : (g.ph === 'prep' ? 150 : 95)) * (owner() && ownS.speed ? 2 : 1);
      if (dir) { g.walkTo = null; m.x += dir * sp * dt; m.face = dir; m.mv = true; }
      else if (g.walkTo != null) { if (moveToward(m, g.walkTo, sp, dt)) g.walkTo = null; } else m.mv = false;
      m.x = clamp(m.x, 40, WW - 40);
      if (!g.host) { g.posT = (g.posT || 0) - dt; if (g.posT <= 0) { g.posT = 0.066; room.send({ k: 'pos', x: Math.round(m.x), f: m.face, pose: m.pose, mv: m.mv ? 1 : 0, iv: m.invis ? 1 : 0 }); } }
      if (m.role === 'hider' && g.ph === 'prep') m.sprDirty = m.sprDirty;
    } else if (!m.bot) m.mv = false;
    if (m.bot && !g.host) m.mv = false;
    const tcam = clamp(m.x - W / 2 + m.face * 90, 0, WW - W); g.cam += (tcam - g.cam) * Math.min(1, dt * 5);
    if (g.ph === 'prep' && g.t <= 0 && !g.host && !m.sent && m.role === 'hider') sendPaint(true);
    if (g.ph === 'prep' && !g.host && g.t < 1.2 && m.role === 'hider' && !m.sent) sendPaint(true);
    if (g.ui === 'paint' && m.role === 'hider' && g.ph !== 'prep') { g.ui = 'walk'; layoutUI(); }
    if (m.role === 'hider' && (g.ph === 'prep' || g.ph === 'seek')) { g.myBT = (g.myBT || 0) - dt; if (g.myBT <= 0) { g.myBT = 0.5; if (m.sprDirty || !m.spr) buildSpr(m); if (!g.host || true) m.blend = blendOf(m.spr, g.stage, m.x, m.pose, m.face); } }
  }
  function sendPaint(final) { const m = me(); if (!G || G.host || !room) return; room.send({ k: 'paint', img: m.P ? m.P.toDataURL('image/png') : null }); if (final) { m.sent = true; room.send({ k: 'ready' }); } }

  // ================================================================== paint editor
  const paintSt = { tool: 'brush', size: 4, col: '#4aa3ff', undo: [], drawing: false, lx: 0, ly: 0, pg: null, sample: [] };
  function ensureP(m) { if (!m.P) { m.P = mk(PW, PH); } return m.P; }
  function redrawEditor() {
    const m = me(), e = $('chPcv'); if (!e || !m) return; const g = e.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.width, e.height);
    const bg = g.createLinearGradient(0, 0, 0, e.height); bg.addColorStop(0, '#dfe5f5'); bg.addColorStop(1, '#c9d2ea'); g.fillStyle = bg; g.fillRect(0, 0, e.width, e.height);
    g.globalAlpha = 0.55; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { g.drawImage(maskCv, dx * 1.5, dy * 1.5, e.width, e.height); } g.globalAlpha = 1;
    g.save(); g.globalCompositeOperation = 'source-over'; g.drawImage(whiteCv, 0, 0, e.width, e.height); if (m.P) g.drawImage(m.P, 0, 0, e.width, e.height); g.restore();
  }
  function pushUndo(m) { const P = ensureP(m); paintSt.undo.push(ctx2(P, 1).getImageData(0, 0, PW, PH)); if (paintSt.undo.length > 25) paintSt.undo.shift(); }
  function clipMask(P) { const g = ctx2(P); g.save(); g.globalCompositeOperation = 'destination-in'; g.drawImage(maskCv, 0, 0); g.restore(); }
  function paintAt(x, y, dx, dy) {
    const m = me(), P = ensureP(m), g = ctx2(P); g.fillStyle = g.strokeStyle = paintSt.col;
    if (paintSt.tool === 'brush') { g.lineCap = 'round'; g.lineWidth = paintSt.size * 2; g.beginPath(); g.moveTo(dx, dy); g.lineTo(x, y); g.stroke(); g.beginPath(); g.arc(x, y, paintSt.size, 0, 7); g.fill(); }
    else if (paintSt.tool === 'spray') { for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, r = Math.random() * paintSt.size * 2.2; g.globalAlpha = 0.55; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.4, 0, 7); g.fill(); } g.globalAlpha = 1; }
    else if (paintSt.tool === 'erase') { g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x, y, paintSt.size * 1.3, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over'; }
    clipMask(P); m.sprDirty = true; redrawEditor();
  }
  function bucket(px, py) {
    const m = me(), P = ensureP(m), g = ctx2(P, 1), d = g.getImageData(0, 0, PW, PH), a = d.data, x0 = clamp(px | 0, 0, PW - 1), y0 = clamp(py | 0, 0, PH - 1);
    if (maskData[(y0 * PW + x0) * 4 + 3] < 40) return; pushUndo(m);
    const key = (i) => (a[i + 3] < 30 ? -1 : (a[i] << 16) | (a[i + 1] << 8) | a[i + 2]), tk = key((y0 * PW + x0) * 4);
    const n = parseInt(paintSt.col.slice(1), 16), nr = n >> 16, ng = (n >> 8) & 255, nb = n & 255, seen = new Uint8Array(PW * PH), st = [x0 + y0 * PW];
    while (st.length) { const q = st.pop(); if (seen[q]) continue; seen[q] = 1; const i = q * 4; if (maskData[i + 3] < 40 || key(i) !== tk) continue; a[i] = nr; a[i + 1] = ng; a[i + 2] = nb; a[i + 3] = 255; const x = q % PW, y = (q / PW) | 0; if (x > 0) st.push(q - 1); if (x < PW - 1) st.push(q + 1); if (y > 0) st.push(q - PW); if (y < PH - 1) st.push(q + PW); }
    g.putImageData(d, 0, 0); m.sprDirty = true; redrawEditor();
  }
  function dropper(px, py) {
    const m = me(); const x = clamp(px | 0, 0, PW - 1), y = clamp(py | 0, 0, PH - 1); const d = ctx2(ensureP(m), 1).getImageData(x, y, 1, 1).data; if (d[3] > 30) setCol('#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join(''));
  }
  function setCol(h) { paintSt.col = h; const e = $('chColor'); if (e) e.value = h; const s = $('chCur'); if (s) s.style.background = h; }
  function refreshAround() {
    const m = me(), box = $('chAround'); if (!box || !m) return; box.innerHTML = '';
    stageSamples(G.stage, m.x, m.pose, 10).forEach((col) => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = col; b.addEventListener('click', () => setCol(col)); box.appendChild(b); });
  }
  function updateMeter() { const m = me(); if (!m || !G) return; const v = Math.round((m.blend || 0) * 100); const f = $('chMeterF'); if (f) { f.style.width = v + '%'; f.style.background = v > 75 ? '#2fbf71' : v > 45 ? '#ffb02f' : '#e63946'; } const t = $('chMeterT'); if (t) t.textContent = 'Blend at your spot: ' + v + '%'; }
  function bindPaint() {
    const e = $('chPcv'), pos = (ev) => { const r = e.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * PW, (ev.clientY - r.top) / r.height * PH]; };
    e.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); const m = me(); if (!m || m.role !== 'hider' || G.ph !== 'prep') return; const [x, y] = pos(ev);
      if (paintSt.tool === 'bucket') return bucket(x, y); if (paintSt.tool === 'dropper') { dropper(x, y); return; }
      pushUndo(m); paintSt.drawing = true; paintSt.lx = x; paintSt.ly = y; try { e.setPointerCapture(ev.pointerId); } catch (x2) { /* ignore */ } paintAt(x, y, x, y);
    });
    e.addEventListener('pointermove', (ev) => { if (!paintSt.drawing) return; ev.preventDefault(); const [x, y] = pos(ev); paintAt(x, y, paintSt.lx, paintSt.ly); paintSt.lx = x; paintSt.ly = y; });
    const up = () => { if (paintSt.drawing) { paintSt.drawing = false; updateMeterSoon(); } }; e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up);
    const pal = $('chPal'); const cols = []; for (const l of [82, 68, 52, 36, 22]) for (let h = 0; h < 360; h += 30) cols.push('hsl(' + h + ',' + (l > 70 ? 75 : 70) + '%,' + l + '%)');
    ['#ffffff', '#d9d9d9', '#a0a0a0', '#666666', '#2a2a2a', '#000000', '#f3d6b0', '#c9a06c', '#8a5a32', '#5a3a1e', '#e8e2d6', '#bfe6ff'].forEach((h) => cols.push(h));
    const tmp = document.createElement('canvas').getContext('2d');
    cols.forEach((col) => { tmp.fillStyle = col; const hx = tmp.fillStyle; const b = document.createElement('button'); b.className = 'sw'; b.style.background = hx; b.addEventListener('click', () => setCol(hx)); pal.appendChild(b); });
    $('chColor').addEventListener('input', (ev) => setCol(ev.target.value));
    document.querySelectorAll('#chPaint [data-tool]').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.tool; if (t === 'stage') { G.ui = 'pick'; layoutUI(); toast('Tap the stage to copy a colour'); return; }
      paintSt.tool = t; document.querySelectorAll('#chPaint [data-tool]').forEach((x) => x.classList.toggle('on', x.dataset.tool === t)); }));
    $('chSize').addEventListener('input', (ev) => { paintSt.size = +ev.target.value; });
    $('chUndo').addEventListener('click', () => { const m = me(); const d = paintSt.undo.pop(); if (d && m.P) { ctx2(m.P, 1).putImageData(d, 0, 0); m.sprDirty = true; redrawEditor(); updateMeterSoon(); } });
    $('chClear').addEventListener('click', () => { const m = me(); if (m.P) { pushUndo(m); ctx2(m.P).clearRect(0, 0, PW, PH); m.sprDirty = true; redrawEditor(); updateMeterSoon(); } });
    $('chToStage').addEventListener('click', () => { G.ui = 'walk'; layoutUI(); sendPaintSoon(); });
    $('chPoseP').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { const m = me(); m.pose = b.dataset.pose; layoutUI(); updateMeterSoon(); }));
    $('chPReady').addEventListener('click', () => doReady());
  }
  let meterT = 0, sendT = 0;
  const updateMeterSoon = () => { clearTimeout(meterT); meterT = setTimeout(() => { const m = me(); if (!m || !G) return; if (m.sprDirty || !m.spr) buildSpr(m); m.blend = blendOf(m.spr, G.stage, m.x, m.pose, m.face); updateMeter(); }, 60); sendPaintSoon(); };
  const sendPaintSoon = () => { clearTimeout(sendT); sendT = setTimeout(() => { if (G && !G.host && room && G.ph === 'prep') sendPaint(false); }, 900); };
  function doReady() {
    const m = me(); if (!G || !m || m.role !== 'hider' || G.ph !== 'prep') return; ensureP(m); m.ready = true; G.ui = 'walk';
    if (!G.host) { sendPaint(true); } toast('Ready! Waiting for the others…'); layoutUI();
  }

  // ================================================================== DOM
  const sel = { stage: -1, total: 6, rounds: 3, offRole: 'hider' };
  const CSS = `#ch{position:fixed;inset:0;z-index:70;background:#1b1f33;display:none;touch-action:none;user-select:none;-webkit-user-select:none;font-family:system-ui,sans-serif;color:#fff}
  #ch canvas#chcv{position:absolute;inset:0;width:100%;height:100%}
  #ch .b{position:absolute;border-radius:50%;border:3px solid rgba(255,255,255,.85);background:rgba(30,30,40,.55);color:#fff;font-weight:800;display:none;align-items:center;justify-content:center;text-align:center;font-size:13px;touch-action:none;line-height:1.1;cursor:pointer}
  #ch #chL{left:max(14px,env(safe-area-inset-left));bottom:22px;width:80px;height:80px;font-size:30px}#ch #chR{left:calc(max(14px,env(safe-area-inset-left)) + 92px);bottom:22px;width:80px;height:80px;font-size:30px}
  #ch #chA1{right:max(14px,env(safe-area-inset-right));bottom:22px;width:92px;height:92px;background:rgba(255,155,47,.94);color:#1b1b1b;font-size:15px}
  #ch #chA2{right:calc(max(14px,env(safe-area-inset-right)) + 104px);bottom:22px;width:74px;height:74px;background:rgba(80,200,140,.94);color:#10261b}
  #ch #chA3{right:calc(max(14px,env(safe-area-inset-right)) + 12px);bottom:126px;width:66px;height:66px;background:rgba(120,110,255,.94)}
  #ch #chA5{right:calc(max(14px,env(safe-area-inset-right)) + 12px);bottom:126px;width:62px;height:62px;background:rgba(255,220,90,.95);color:#222;font-size:12px}
  #ch #chOwn{position:absolute;left:10px;top:92px;display:none;flex-direction:column;gap:5px;z-index:3}#ch #chOwn button{font:700 12px system-ui;padding:5px 8px;border-radius:9px;border:2px solid rgba(255,255,255,.7);background:rgba(30,30,40,.6);color:#fff}#ch #chOwn button.on{background:#d6192b}
  #ch #chA4{right:calc(max(14px,env(safe-area-inset-right)) + 190px);bottom:22px;width:66px;height:66px}
  #ch #chExit{left:max(10px,env(safe-area-inset-left));top:10px;width:42px;height:42px;border-radius:12px;font-size:20px}
  #ch .panel{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,12,24,.82);padding:12px;overflow:auto}
  #ch .card{background:#fff;color:#1b1f33;border-radius:20px;padding:16px;max-width:560px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.4);max-height:100%;overflow:auto}
  #ch h2{margin:0 0 4px;font-size:23px}#ch h4{margin:8px 0 2px}#ch .sub{opacity:.75;font-size:14px;margin-bottom:6px}#ch .tip{font-size:12.5px;opacity:.75;margin-top:6px}
  #ch .row{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0;align-items:center}
  #ch .chip{border:3px solid #dfe3f1;border-radius:999px;padding:5px 11px;font-weight:700;font-size:13.5px;background:#f7f8fd;cursor:pointer;color:#1b1f33}#ch .chip.on{border-color:#2fbf71;background:#e6f9ee}
  #ch .go{background:#ff9b2f;color:#1b1b1b;border:0;border-radius:14px;padding:11px 18px;font-size:16px;font-weight:800;cursor:pointer}#ch .go.alt{background:#e6e9f5}
  #ch input[type=text]{flex:1;min-width:120px;padding:9px;border-radius:10px;border:2px solid #2a2f3a;font-size:16px}
  #chPaint{background:#1d2340;padding:6px}#chPaint .pw{display:flex;gap:10px;align-items:stretch;justify-content:center;max-width:980px;width:100%;max-height:100%}
  #chPcv{height:min(calc(100vh - 20px),560px);aspect-ratio:96/120;border-radius:14px;touch-action:none;cursor:crosshair;background:#dfe5f5;box-shadow:0 4px 20px rgba(0,0,0,.4)}
  #chPaint .tools{flex:1;max-width:440px;overflow:auto;display:flex;flex-direction:column;gap:5px}
  #chPaint .pal{display:grid;grid-template-columns:repeat(12,1fr);gap:3px}#chPaint .sw{aspect-ratio:1;border:2px solid rgba(0,0,0,.35);border-radius:6px;padding:0;cursor:pointer;min-height:18px}
  #chPaint .tb{display:flex;gap:5px;flex-wrap:wrap}#chPaint .tb button,#chPaint .tb label{background:#eef0fa;color:#1b1f33;border:3px solid #cfd5ec;border-radius:10px;padding:5px 9px;font-weight:800;font-size:13px;cursor:pointer}#chPaint .tb button.on{border-color:#2fbf71;background:#e6f9ee}
  #chMeter{height:16px;background:rgba(255,255,255,.2);border-radius:8px;overflow:hidden}#chMeterF{height:100%;width:0;background:#e63946;transition:width .2s}
  #chPaint .lab{font-size:12px;opacity:.85;font-weight:700}`;
  function ensureDom() {
    if (dom) return;
    myName = (() => { try { return localStorage.getItem('wobbleChamName') || ''; } catch (e) { return ''; } })() || 'Goose' + (100 + ((Math.random() * 900) | 0));
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'ch';
    d.innerHTML = `<canvas id="chcv"></canvas><div class="b" id="chL">◀</div><div class="b" id="chR">▶</div><div class="b" id="chA1"></div><div class="b" id="chA2"></div><div class="b" id="chA3"></div><div class="b" id="chA4"></div><div class="b" id="chA5"></div><div id="chOwn"></div><div class="b" id="chExit">☰</div>
      <div class="panel" id="chTitle"><div class="card"><h2>🦎 Meccha Chameleon</h2><div class="sub">Hiders paint their white goose to blend into the stage. Seekers hunt them down. Online up to 10 players, bots fill the rest.</div>
        <h4>Stage</h4><div class="row" id="chStages"></div>
        <h4>Offline vs bots</h4><div class="row"><span class="chip" id="chTot">6 players</span><button class="go" id="chHide">🎨 Hide first</button><button class="go" id="chSeek">🔎 Seek first</button></div>
        <h4>Online with friends</h4>
        <div class="row" id="chJoinRow"><input type="text" id="chWord" maxlength="24" placeholder="room word (same for everyone)"><button class="go" id="chJoin">Join / create</button><button class="go alt" id="chQuick">🎲 Random lobby</button></div>
        <div id="chOnl" style="display:none"><div class="row" id="chRoster"></div><div id="chWaitMsg" class="sub"></div>
          <div class="row" id="chHostOpts"><span class="chip" id="chOTot">Players: 6</span><span class="chip" id="chORounds">Rounds: 3</span></div>
          <div class="row"><button class="go" id="chStartOnl">▶ Start</button><button class="go alt" id="chLeave">Leave room</button></div></div>
        <div id="chStat" class="tip"></div>
        <div class="row"><button class="go alt" id="chBack">Back</button></div>
        <div class="tip"><b>Hider:</b> paint your goose so it matches the wall behind your spot (the 🎯 colours are sampled from the stage, or pick with the stage eyedropper), choose a pose, press READY. Don't move once the seekers come!<br><b>Seeker:</b> walk, tap hiders or press TAG. Blended hiders are only noticed from very close. Misses cost time. 🔔 PING shows hiders nearby (3 per round).</div></div></div>
      <div class="panel" id="chPaint"><div class="pw"><canvas id="chPcv" width="${PW * 3}" height="${PH * 3}"></canvas><div class="tools">
        <div class="lab" id="chPT">🎨 Paint your goose! Time left: 45s</div><div id="chMeter"><div id="chMeterF"></div></div><div class="lab" id="chMeterT"></div>
        <div class="tb"><button data-tool="brush" class="on">🖌 Brush</button><button data-tool="spray">💨 Spray</button><button data-tool="bucket">🪣 Fill</button><button data-tool="dropper">💧 Pick (goose)</button><button data-tool="stage">🎯 Pick (stage)</button><button data-tool="erase">🧽 Erase</button></div>
        <div class="tb"><span class="lab" style="align-self:center">Size</span><input type="range" id="chSize" min="1" max="12" value="4" style="flex:1"><span class="sw" id="chCur" style="width:30px;height:30px;display:inline-block;background:#4aa3ff"></span><label>🎨<input type="color" id="chColor" value="#4aa3ff" style="width:34px;height:24px;border:0;padding:0;vertical-align:middle"></label></div>
        <div class="lab">Colours at your hiding spot</div><div class="pal" id="chAround" style="grid-template-columns:repeat(10,1fr)"></div>
        <div class="lab">Palette</div><div class="pal" id="chPal"></div>
        <div class="tb"><button id="chUndo">↩ Undo</button><button id="chClear">🗑 Clear</button></div>
        <div class="lab">Pose</div><div class="tb" id="chPoseP"><button data-pose="stand">🧍 Stand</button><button data-pose="crouch">🧎 Crouch</button><button data-pose="flat">🛌 Flat</button></div>
        <div class="tb"><button id="chToStage">🚶 Pick my spot</button><button id="chPReady" style="background:#2fbf71;color:#fff;border-color:#1f8a52">✔ READY</button></div></div></div></div>
      <div class="panel" id="chEnd"><div class="card"><h2 id="chEndT"></h2><pre id="chEndX" style="white-space:pre-wrap;font-family:inherit;margin:8px 0 8px;font-size:14px"></pre><div class="sub" id="chFinal"></div><div class="row"><button class="go" id="chNext">Next round</button><button class="go alt" id="chMenu">Back to lobby</button></div></div></div>
      <div class="panel" id="chPause"><div class="card"><h2>Menu</h2><div class="row"><button class="go" id="chResume">Resume</button><button class="go alt" id="chQuit">Leave game</button></div></div></div>`;
    document.body.appendChild(d);
    dom = { root: d, title: $('chTitle'), end: $('chEnd'), pause: $('chPause'), paint: $('chPaint') };
    cv = $('chcv'); c = cv.getContext('2d');
    const sb = $('chStages'); [-1].concat(STAGES.map((_, i) => i)).forEach((i) => { const s = document.createElement('span'); s.className = 'chip' + (i === sel.stage ? ' on' : ''); s.textContent = i < 0 ? '🎲 Random' : STAGES[i].emoji + ' ' + STAGES[i].name; s.addEventListener('click', () => { sb.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); s.classList.add('on'); sel.stage = i; }); sb.appendChild(s); });
    const cyc = (id, key, vals, fmt) => { const e = $(id); e.addEventListener('click', () => { sel[key] = vals[(vals.indexOf(sel[key]) + 1) % vals.length]; $('chTot').textContent = sel.total + ' players'; $('chOTot').textContent = 'Players: ' + sel.total; $('chORounds').textContent = 'Rounds: ' + sel.rounds; }); void fmt; };
    cyc('chTot', 'total', [4, 6, 8, 10]); cyc('chOTot', 'total', [4, 6, 8, 10]); cyc('chORounds', 'rounds', [1, 2, 3, 4, 5]);
    $('chHide').addEventListener('click', () => start({ role: 'hider', stage: sel.stage < 0 ? null : sel.stage, total: sel.total, rounds: 2 }));
    $('chSeek').addEventListener('click', () => start({ role: 'seeker', stage: sel.stage < 0 ? null : sel.stage, total: sel.total, rounds: 2 }));
    $('chBack').addEventListener('click', close);
    $('chJoin').addEventListener('click', () => { setupRoom(); try { localStorage.setItem('wobbleChamWord', $('chWord').value); } catch (e) { /* ignore */ } if (room) room.join($('chWord').value); else { $('chStat').textContent = 'Online play is not available (matchmaking library missing).'; } });
    $('chQuick').addEventListener('click', () => { setupRoom(); if (room) room.quick('cham'); else $('chStat').textContent = 'Online play is not available.'; });
    $('chWord').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('chJoin').click(); });
    $('chWord').addEventListener('keyup', (e) => e.stopPropagation());
    $('chStartOnl').addEventListener('click', startOnline); $('chLeave').addEventListener('click', () => { if (room) room.leave(); renderRoster([]); });
    $('chNext').addEventListener('click', nextRound); $('chMenu').addEventListener('click', toLobby);
    $('chResume').addEventListener('click', () => setPause(false)); $('chQuit').addEventListener('click', () => { setPause(false); toLobby(); });
    $('chExit').addEventListener('click', () => setPause(!paused));
    const hold = (id, on, off) => { const e = $(id); e.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); on(); try { e.setPointerCapture(ev.pointerId); } catch (x) { /* ignore */ } }); const u = () => off && off(); e.addEventListener('pointerup', u); e.addEventListener('pointercancel', u); };
    hold('chL', () => { I.l = true; }, () => { I.l = false; }); hold('chR', () => { I.r = true; }, () => { I.r = false; });
    hold('chA1', () => act(1)); hold('chA2', () => act(2)); hold('chA3', () => act(3)); hold('chA4', () => act(4)); hold('chA5', () => act(5));
    cv.addEventListener('pointerdown', onCvDown);
    window.addEventListener('keydown', (e) => {
      if (!opened || !G || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return; const k = e.code;
      if (k === 'ArrowLeft' || k === 'KeyA') I.l = true; else if (k === 'ArrowRight' || k === 'KeyD') I.r = true;
      else if (!e.repeat) { if (k === 'Space' || k === 'KeyF') act(1); else if (k === 'KeyE') act(2); else if (k === 'KeyQ' || k === 'ArrowDown') act(2); else if (k === 'KeyR') act(4); else if (k === 'KeyW') act(5); else if (k === 'KeyP' || k === 'Tab') act(3); else if (k === 'Escape') setPause(!paused); }
      if (/^(Key[ADEFPQRW]|Arrow.*|Space|Escape|Tab)$/.test(k)) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    window.addEventListener('keyup', (e) => { const k = e.code; if (k === 'ArrowLeft' || k === 'KeyA') I.l = false; else if (k === 'ArrowRight' || k === 'KeyD') I.r = false; if (opened && G && /^(Key[ADEFPQRW]|Arrow.*|Space)$/.test(k)) e.stopImmediatePropagation(); }, true);
    bindPaint();
    try { const w = localStorage.getItem('wobbleChamWord'); if (w) $('chWord').value = w; } catch (e) { /* ignore */ }
  }
  let paused = false;
  function act(n) {   // one action layer for buttons and keys
    const m = me(); if (!G || !m || paused || G.over) return;
    if (n === 5) { if (G.ph === 'seek' && !m.tagged) doWhistle(m); return; }
    if (m.role === 'seeker') {
      if (G.ph !== 'seek') return;
      if (n === 1) tagLocal(m.x + m.face * 45); else if (n === 2) { if (G.host) hostPing(m); else room.send({ k: 'ping' }); }
    } else {
      if (n === 2 && (G.ph === 'prep' || G.ph === 'seek') && !m.tagged) { m.pose = POSES[(POSES.indexOf(m.pose) + 1) % 3]; m.sprDirty = m.sprDirty; updateMeterSoon(); layoutUI(); beep(300, 0.05); }
      else if (n === 3 && G.ph === 'prep') { G.ui = G.ui === 'paint' ? 'walk' : 'paint'; layoutUI(); if (G.ui === 'paint') { redrawEditor(); refreshAround(); updateMeter(); } }
      else if (n === 4 || (n === 1 && G.ph === 'prep')) doReady();
    }
  }
  // ---- whistling: a hider's whistle lures seekers (but costs points); a seeker's whistle warns the hiders
  function whSound(vol, role) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; if (!actx) actx = new AC(); const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(role === 'hider' ? 1500 : 900, t); o.frequency.linearRampToValueAtTime(role === 'hider' ? 2300 : 1300, t + 0.28); o.frequency.linearRampToValueAtTime(role === 'hider' ? 1800 : 1000, t + 0.55);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * vol, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.65);
    } catch (e) { /* ignore */ }
  }
  function doWhistle(m, fakeX) {
    if (m.wcd > 0 && fakeX == null) { toast('Your whistle needs a moment…'); return; }
    m.wcd = 8; if (G.host) hostWhistle(m, fakeX); else room.send({ k: 'wh', fx: fakeX == null ? null : Math.round(fakeX) });
  }
  function hostWhistle(s, fakeX) {
    const g = G; if (g.ph !== 'seek') return; const x = fakeX != null ? fakeX : s.x; s.wcd = 8; if (s.role === 'hider') s.whistles = (s.whistles || 0) + 1;
    const ev = { k: 'ev', e: 'wh', by: s.i, role: s.role, x: Math.round(x) }; applyEv(ev); if (g.online) toNet(ev);
    if (s.role === 'hider') for (const b of g.ps) if (b.role === 'seeker' && b.bot && b.ai && !b.frz && Math.abs(b.x - x) < 1100 && Math.random() < 0.35 + 0.5 * b.skill) { b.ai.mode = 'sweep'; b.ai.tx = clamp(x + rnd(-110, 110), 80, WW - 80); b.ai.wait = 0; }
  }
  // ---- owner tray
  const ownS = { xray: true, invis: false, speed: false };
  function buildOwn() {
    const box = dom && $('chOwn'); if (!box) return; const g = G, m = me();
    const show = !!g && !g.over && !!m && owner(); box.style.display = show ? 'flex' : 'none'; if (!show || box.dataset.built === (m.role + g.ph)) return; box.dataset.built = m.role + g.ph;
    box.innerHTML = '<div style="font:800 11px system-ui;opacity:.85;color:#fff">OWNER</div>';
    const defs = [['xray', '👁 X-ray'], ['invis', '🫥 Invisible'], ['speed', '💨 Speed x2'], ['paint', '🎨 Auto-paint', 1], ['decoy', '🎵 Whistle from elsewhere', 1], ['tp', '🎲 Random teleport', 1], ['freeze', '🧊 Freeze seekers 5s', 1], ['tagall', '⚡ Tag everyone', 1], ['reveal', '📍 Ping everyone', 1]];
    for (const [k, l, one] of defs) {
      const b = document.createElement('button'); b.textContent = l; if (!one && ownS[k]) b.className = 'on';
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
      b.addEventListener('click', (e) => {
        e.stopPropagation(); const mm = me(); if (!G || !mm) return;
        if (!one) { ownS[k] = !ownS[k]; b.className = ownS[k] ? 'on' : ''; if (k === 'invis') { mm.invis = ownS.invis; } return; }
        if (k === 'paint') { if (mm.role === 'hider') { autoPaint(mm, G.stage, 1); mm.sprDirty = true; updateMeterSoon(); if (!G.host) sendPaintSoon(); if (G.ui === 'paint') { redrawEditor(); refreshAround(); } toast('Auto-painted to match this spot.'); } }
        else if (k === 'decoy') { mm.wcd = 0; doWhistle(mm, rnd(150, WW - 150)); }
        else if (k === 'tp') { mm.x = rnd(120, WW - 120); G.cam = clamp(mm.x - W / 2, 0, WW - W); }
        else if (k === 'freeze') { if (G.host) { for (const q of G.ps) if (q.role === 'seeker' && !isMe(q)) q.frz = 5; toast('Seekers frozen for 5 seconds'); } else toast('Only works when you are the host.'); }
        else if (k === 'tagall') { if (G.host && G.ph === 'seek' && mm.role === 'seeker') for (const h of G.ps) if (h.role === 'hider' && !h.tagged) { h.tagged = true; h.tagT = G.el; mm.tags++; const ev = { k: 'ev', e: 'tag', by: mm.i, who: h.i }; applyEv(ev); if (G.online) toNet(ev); } else toast('Host + seeker + seek phase only.'); }
        else if (k === 'reveal') { G.pingFx = G.ps.filter((h) => h.role === 'hider' && !h.tagged).map((h) => ({ x: h.x, t: 0 })); }
      });
      box.appendChild(b);
    }
  }
  function tagLocal(wx) {
    const m = me(); if (!G || m.tagCd > 0 || G.ph !== 'seek') return; m.tagCd = 0.7;
    if (G.host) hostTag(m, wx); else room.send({ k: 'tag', wx: Math.round(wx) });
  }
  function viewScale() { const cw = cv.clientWidth, ch = cv.clientHeight, k = Math.min(cw / W, ch / H); return { k, ox: (cw - W * k) / 2, oy: (ch - H * k) / 2 }; }
  function onCvDown(e) {
    if (!G || paused || G.over) return; const r = cv.getBoundingClientRect(), s = viewScale(), wx = (e.clientX - r.left - s.ox) / s.k + G.cam, wy = (e.clientY - r.top - s.oy) / s.k, m = me();
    if (G.ui === 'pick') { const d = ctx2(stageOf(G.stage), 1).getImageData(clamp(wx | 0, 0, WW - 1), clamp(wy | 0, 0, H - 1), 1, 1).data; setCol('#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')); G.ui = 'paint'; layoutUI(); redrawEditor(); return; }
    if (m.role === 'seeker' && G.ph === 'seek') { if (Math.abs(wx - m.x) < 180) tagLocal(wx); else G.walkTo = wx; }
    else if (m.role === 'hider' && !m.tagged && (G.ph === 'prep') && G.ui === 'walk') G.walkTo = wx;
  }
  function layoutUI() {
    if (!dom) return; const g = G, m = me(); const play = !!g && !g.over;
    const sh = (id, on, label) => { const e = $(id); e.style.display = on ? 'flex' : 'none'; if (label != null) e.innerHTML = label; };
    const seeker = play && m && m.role === 'seeker', hider = play && m && m.role === 'hider' && !m.tagged;
    const walk = play && g.ui !== 'paint' && !(seeker && g.ph === 'prep');
    sh('chL', walk && (seeker ? g.ph === 'seek' : hider), '◀'); sh('chR', walk && (seeker ? g.ph === 'seek' : hider), '▶'); sh('chExit', !!g && !g.over || !!g);
    sh('chA1', seeker && g.ph === 'seek', 'TAG<br>(Space)'); sh('chA2', (seeker && g.ph === 'seek') || (hider && g.ui !== 'paint'), seeker ? '🔔 PING<br>(E)' : (m ? PSH[m.pose].n + '<br>(Q)' : ''));
    sh('chA3', hider && g.ph === 'prep' && g.ui !== 'pick', '🎨<br>PAINT'); sh('chA4', hider && g.ph === 'prep' && g.ui !== 'paint' && g.ui !== 'pick', '✔<br>READY');
    if (hider && g.ph === 'prep' && g.ui !== 'paint') { $('chA1').style.display = 'none'; }
    dom.title.style.display = G ? 'none' : 'flex'; dom.end.style.display = g && g.over ? 'flex' : 'none'; dom.pause.style.display = paused ? 'flex' : 'none';
    dom.paint.style.display = g && g.ui === 'paint' && hider && g.ph === 'prep' ? 'flex' : 'none';
    if (dom.paint.style.display === 'flex') { redrawEditor(); refreshAround(); updateMeter(); $('chPoseP').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.pose === m.pose)); }
    sh('chA5', play && m && g.ph === 'seek' && !m.tagged, '🎵<br>WHISTLE<br>(W)'); buildOwn();
    $('chA1').style.fontSize = '14px';
  }
  function setPause(v) { paused = v; layoutUI(); }
  function toLobby() { G = null; paused = false; I.l = I.r = false; if (room && room.connected()) { renderRoster(room.list()); } layoutUI(); }

  // ================================================================== drawing
  function drawHuman(p, x, y) { gooseArt(c, x, y, GW, GH, p.col, p.face, p.role === 'seeker'); }
  function drawScene() {
    const g = G, cam = g.cam | 0; c.drawImage(stageOf(g.stage), cam, 0, W, H, 0, 0, W, H);
    c.save(); c.translate(-cam, 0);
    const m = me(), ox = owner() && ownS.xray, end = g.ph === 'end';
    const list = g.ps.slice().sort((a, b) => a.x - b.x);
    for (const p of list) if (p.role === 'hider') {
      if (p.invis && !isMe(p) && !end) continue;
      if (p.tagged || end) {
        if (p.tagged) { const f = g.tagFx.find((q) => q.name === p.name); if (!f && !end) continue; }
      }
      if (p.sprDirty || !p.spr) buildSpr(p);
      const show = !(p.tagged && !end);
      if (show || end) { drawSpr(c, p.spr, p.x, p.pose, p.face); }
      if (end || ox || (isMe(p))) { const b = bboxOf(p.x, p.pose); c.strokeStyle = p.tagged ? '#e63946' : isMe(p) ? '#2fbf71' : '#ff2fd6'; c.lineWidth = 2; c.setLineDash([5, 4]); c.strokeRect(b.x0 - 3, b.y0 - 3, b.w + 6, b.h + 6); c.setLineDash([]); if (end || ox) { c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.lineWidth = 3; c.strokeStyle = '#000'; c.strokeText(p.name + (p.tagged ? ' (found)' : ''), p.x, b.y0 - 8); c.fillText(p.name + (p.tagged ? ' (found)' : ''), p.x, b.y0 - 8); } }
    }
    for (const p of list) if (p.role === 'seeker' && !(g.ph === 'prep' && m.role === 'hider' && !isMe(p) && false)) { drawHuman(p, p.x, FLY); c.font = 'bold 13px system-ui'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#000'; c.fillStyle = '#fff'; c.strokeText(p.name, p.x, FLY - GH - 8); c.fillText(p.name, p.x, FLY - GH - 8); }
    for (const f of g.tagFx) { const p = g.ps.find((q) => q.name === f.name); const b = bboxOf(f.x, p ? p.pose : 'stand'); c.globalAlpha = clamp(1 - f.t / 2.2, 0, 1); gooseArt(c, f.x, FLY - f.t * 30, GW, GH, p ? p.col : '#fff', p ? p.face : 1, false); c.font = 'bold 20px system-ui'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.strokeStyle = '#e63946'; c.lineWidth = 4; c.strokeText('FOUND!', f.x, b.y0 - 14 - f.t * 20); c.fillText('FOUND!', f.x, b.y0 - 14 - f.t * 20); c.globalAlpha = 1; }
    for (const f of g.whFx || []) { const a = clamp(1 - f.t / 2, 0, 1); c.strokeStyle = (f.role === 'hider' ? 'rgba(255,230,90,' : 'rgba(255,120,120,') + a + ')'; c.lineWidth = 4; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(f.x, FLY - 50, 14 + f.t * 70 + k * 22, -2.4, -0.7); c.stroke(); } c.font = '24px system-ui'; c.fillStyle = 'rgba(255,255,255,' + a + ')'; c.textAlign = 'center'; c.fillText('🎵', f.x, FLY - 70 - f.t * 20); }
    for (const f of g.pingFx) { const a = clamp(1 - f.t / 2.5, 0, 1); c.strokeStyle = 'rgba(255,255,160,' + a + ')'; c.lineWidth = 4; c.beginPath(); c.arc(f.x, FLY - 40, 20 + f.t * 60, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,160,' + a + ')'; c.font = 'bold 26px system-ui'; c.textAlign = 'center'; c.fillText('?', f.x, FLY - 80); }
    if (g.walkTo != null && m && !m.bot) { c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(g.walkTo, FLY + 6, 6, 0, 7); c.fill(); }
    c.restore();
  }
  function pill(x, y, t, bg) { c.font = 'bold 15px system-ui'; const w = c.measureText(t).width + 20; c.fillStyle = bg || 'rgba(20,24,40,.82)'; c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, 28, 10); else c.rect(x, y, w, 28); c.fill(); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(t, x + 10, y + 19); return w + 8; }
  function drawHud() {
    const g = G, m = me(); if (!m) return;
    c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 4;
    const tl = Math.max(0, Math.ceil(g.t)), label = g.ph === 'prep' ? (m.role === 'hider' ? '🎨 PAINT & HIDE  ' + tl + 's' : '😎 Hiders are painting…  ' + tl + 's') : g.ph === 'seek' ? (m.role === 'seeker' ? '🔎 FIND THEM!  ' : '🫥 STAY STILL!  ') + tl + 's' : 'Round over';
    c.strokeText(label, W / 2, 108); c.fillText(label, W / 2, 108);
    let x = 62; const left = g.ps.filter((p) => p.role === 'hider' && !p.tagged).length, all = g.ps.filter((p) => p.role === 'hider').length;
    x += pill(x, 12, '🎨 Hiders ' + left + '/' + all); x += pill(x, 12, '🔎 Seekers ' + g.ps.filter((p) => p.role === 'seeker').length); x += pill(x, 12, 'Round ' + (g.round + 1) + '/' + g.rounds);
    if (m.role === 'hider' && g.ph !== 'end') { const v = Math.round(m.blend * 100); x += pill(x, 12, 'Blend ' + v + '%', v > 75 ? 'rgba(31,140,80,.9)' : v > 45 ? 'rgba(190,130,20,.9)' : 'rgba(180,40,50,.9)'); if (m.mv && g.ph === 'seek') pill(62, 46, '⚠ moving: easy to spot!', 'rgba(180,40,50,.9)'); }
    if (m.role === 'seeker' && g.ph === 'seek') pill(62, 46, '🔔 Pings ' + m.pings + '   ' + (m.tagCd > 0 ? 'tag ready in ' + m.tagCd.toFixed(1) + 's' : 'tag ready'));
    if (g.ph === 'prep' && m.role === 'hider' && g.ui === 'walk') pill(62, 46, 'Tap the floor / walk to pick your spot, 🎨 to paint, ✔ when ready');
    if (g.ui === 'pick') { c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 60, W, 34); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = 'bold 17px system-ui'; c.fillText('🎯 Tap anywhere on the stage to copy that colour', W / 2, 83); }
    if (g.ph === 'prep' && m.role === 'seeker') { c.fillStyle = 'rgba(6,8,18,.96)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = 'bold 34px system-ui'; c.fillText('🙈 You are a SEEKER', W / 2, 190); c.font = '20px system-ui'; c.fillText('The hiders are painting themselves right now…', W / 2, 232); c.fillText('Seeking starts in ' + tl + ' seconds', W / 2, 266); c.font = '15px system-ui'; c.fillStyle = '#bcd'; c.fillText('Tip: a hider that stands still on a busy pattern is nearly invisible. Move along walls slowly,', W / 2, 330); c.fillText('use 🔔 PING (3 per round) and tap a hider to tag it. Misses cost time!', W / 2, 354); }
    if (owner() && ownS.xray) pill(W - 150, 46, '👑 x-ray on', 'rgba(150,30,160,.85)');
    c.textAlign = 'center'; c.font = 'bold 18px system-ui'; g.toasts.slice(-3).forEach((t, i) => { const w = c.measureText(t.t).width + 24; c.globalAlpha = clamp(t.left * 2, 0, 1); c.fillStyle = 'rgba(20,24,40,.88)'; c.beginPath(); if (c.roundRect) c.roundRect(W / 2 - w / 2, 100 + i * 34, w, 28, 10); else c.rect(W / 2 - w / 2, 100 + i * 34, w, 28); c.fill(); c.fillStyle = '#fff'; c.fillText(t.t, W / 2, 120 + i * 34); c.globalAlpha = 1; });
  }
  function render() {
    const cw = cv.clientWidth, ch = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1b1f33'; c.fillRect(0, 0, cv.width, cv.height);
    const s = viewScale(); c.setTransform(s.k * dpr, 0, 0, s.k * dpr, s.ox * dpr, s.oy * dpr); c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
    if (G) { drawScene(); drawHud(); } else { c.fillStyle = '#2a3050'; c.fillRect(0, 0, W, H); }
    c.restore();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!opened || !cv) return;
    if (G && !paused) { update(G.over ? 0.0001 : dt); if (G.ui === 'paint') { const e = $('chPT'); if (e) e.textContent = '🎨 Paint your goose! Time left: ' + Math.max(0, Math.ceil(G.t)) + 's'; updateMeter(); } }
    render();
  }

  function openUI() {
    ensureDom(); setupRoom(); opened = true; dom.root.style.display = 'block'; last = performance.now(); if (!raf) raf = requestAnimationFrame(frame); layoutUI();
    if (room && room.connected()) renderRoster(room.list()); else renderRoster([]);
  }
  function close() { if (!dom) return; opened = false; dom.root.style.display = 'none'; paused = false; if (room) { room.leave(); } G = null; I.l = I.r = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function sim(o) {   // bot-only simulation of a whole game, for tests
    o = o || {}; start({ auto: true, total: o.total || 6, rounds: o.rounds || 2, stage: o.stage });
    const out = []; let guard = 0;
    while (guard++ < 40000) { update(0.1); if (G.ph === 'end') { out.push({ win: G.res.win, round: G.round, blends: G.ps.filter((p) => p.role === 'hider').map((p) => Math.round(p.blend * 100)), tagged: G.ps.filter((p) => p.tagged).length, hiders: G.ps.filter((p) => p.role === 'hider').length, el: Math.round(G.el) }); if (G.res.last) break; beginRound(G.round + 1); } }
    return out;
  }
  root.Chameleon = {
    init(a) { api = a; }, open: openUI, close, start,
    _step(dt) { if (G) update(dt); }, _state: () => G, _input: I, _sim: sim, _room: () => room, _startOnline: startOnline, _consts: { STAGES, POSES, PREP, SEEKT }, _blend: blendOf, _stage: stageOf,
  };
})(window);
