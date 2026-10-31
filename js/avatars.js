/*
 * Avatars: the Golden Jellyfish preset.
 *  - A faceless golden jellyfish: a wobbly jelly bell (damped springs for squash and lean) with dangly tentacles that sway
 *    (each one is a small chain that trails behind and swings on its own).
 *  - It flies: game.js switches off gravity for skins with `fly` and steers them with the stick.
 *  - Its honk is a recorded sample (assets/jelly-honk.mp3) instead of a synth tone.
 *  Avatars.draw(ctx, goose, skin)   called from drawGoose for skins with `jellyfish`
 *  Avatars.honk(skin, vol)          plays the skin's honk sample
 *  Avatars.PRESETS                  presets shown in the owner panel's Avatars tab
 */
(function (root) {
  'use strict';
  const S = root.Skins; if (!S) return;
  const SRC = 'assets/jelly-honk.mp3';
  const def = {
    id: 'golden_jelly', name: 'Golden Jellyfish', price: 0, hidden: true, jellyfish: true, fly: true, neck: 0.3, honkSrc: SRC,
    shape: { leg: 0.15 }, jelly: { c: 0.02, k: 1500 }, legW: 0.8, legC: '#ffd24a', body: '#ffd24a', neckC: '#ffd24a', headC: '#ffe27a', wing: '#fff1a0', jellyC: ['#ffd24a', '#fff1a0'],
  };
  S.LIST.push(def); S.BY_ID[def.id] = def;
  const PRESETS = [{ id: 'preset-golden-jelly', name: 'Golden Jellyfish', skin: 'golden_jelly', equip: {}, tint: {}, preset: true }];

  // ---------------------------------------------------------------- honk sample
  let ac = null, buf = null, loading = false, failed = false;
  function ctx() { if (!ac) { const AC = root.AudioContext || root.webkitAudioContext; if (AC) { try { ac = new AC(); } catch (e) { ac = null; } } } if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) { /* ignore */ } } return ac; }
  function load() {
    if (buf || loading || failed) return; const a = ctx(); if (!a) return; loading = true;
    fetch(SRC).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => { const p = a.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }))
      .then((b) => { buf = b; loading = false; }).catch(() => { loading = false; failed = true; });
  }
  function honk(skin, vol) {
    load(); const a = ctx(), v = vol == null ? 0.9 : vol;
    if (a && buf) { const s = a.createBufferSource(), g = a.createGain(); s.buffer = buf; g.gain.value = v; s.connect(g); g.connect(a.destination); s.start(); return; }
    try { const el = new Audio(SRC); el.volume = Math.min(1, v); el.play().catch(() => {}); } catch (e) { /* ignore */ }
  }
  // unlock audio on the first touch / key so the first honk is not silent on phones
  const unlock = () => { ctx(); load(); root.removeEventListener('pointerdown', unlock, true); root.removeEventListener('keydown', unlock, true); };
  root.addEventListener('pointerdown', unlock, true); root.addEventListener('keydown', unlock, true);

  // ---------------------------------------------------------------- the jellyfish itself
  const NS = 9, SEGS = 9, ST = {};
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function mkState() {
    const s = { x: null, y: null, vx: 0, vy: 0, sq: 0, sqv: 0, ang: 0, av: 0, sxm: 1, sym: 1, rot: 0, ph: Math.random() * 6, t: 0, last: 0, hk: false, st: [] };
    for (let i = 0; i < NS; i++) { const L = (i === 2 || i === NS - 3) ? 1.5 : 1, seg = (8 + 3 * Math.cos(i * 1.7)) * L, pts = []; for (let j = 0; j <= SEGS; j++) pts.push({ x: 0, y: 0, ox: 0, oy: 0 }); s.st.push({ seg, pts, arm: L > 1 }); }
    return s;
  }
  const R = 38, LIP = 7;
  function anchor(s, cx0, cy0, i) {   // where strand i hangs from, in world space
    const lx = (-0.82 + 1.64 * (i / (NS - 1))) * R * s.sxm, ly = (LIP + 1) * s.sym, ca = Math.cos(s.rot), sa = Math.sin(s.rot);
    return { x: cx0 + lx * ca - ly * sa, y: cy0 + lx * sa + ly * ca };
  }
  function hang(s, c) { for (let i = 0; i < NS; i++) { const a = anchor(s, c.x, c.y, i), S0 = s.st[i]; S0.pts.forEach((p, j) => { p.x = p.ox = a.x + Math.sin(j * 0.6 + i) * j * 0.5; p.y = p.oy = a.y + j * S0.seg; }); } }
  // the bell takes its shape from the real soft body when there is one (so it squashes and wobbles on bonks and landings like the
  // other jelly skins); other players' avatars use the spring squash alone
  function shape(s, g) {
    let sx = 1 + s.sq * 0.5, sy = 1 - s.sq * 0.75, rot = s.ang;
    const b = g.body;
    if (b && b.length === 4) {
      const d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y), w = (d(b[0], b[1]) + d(b[3], b[2])) / 2, h = (d(b[0], b[3]) + d(b[1], b[2])) / 2;
      sx *= clamp(Math.pow(w / 56, 1.15), 0.7, 1.35); sy *= clamp(Math.pow(h / 26, 1.15), 0.7, 1.4);
      rot += Math.atan2(b[1].y - b[0].y, b[1].x - b[0].x) * 0.8;
    }
    s.sxm = sx; s.sym = sy; s.rot = rot;
  }
  function update(s, c, g, key) {
    const now = performance.now(); let dt = (now - s.last) / 1000; s.last = now;
    if (s.x == null || dt > 0.5 || Math.hypot(c.x - s.x, c.y - s.y) > 260) { s.x = c.x; s.y = c.y; s.vx = s.vy = 0; hang(s, c); return; }
    if (dt < 0.004) return; dt = Math.min(dt, 0.05); s.t += dt;
    const vx = (c.x - s.x) / dt, vy = (c.y - s.y) / dt, k = Math.min(1, dt * 8), pvy = s.vy;
    s.vx += (vx - s.vx) * k; s.vy += (vy - s.vy) * k; s.x = c.x; s.y = c.y;
    const sp = Math.hypot(s.vx, s.vy);
    s.ph += dt * (2.4 + Math.min(5, sp / 80));                                          // swims faster when it moves
    const hk = g.honkT > 0; if (hk && !s.hk) s.sqv += 3.2; s.hk = hk;                       // a honk makes the bell pump
    const tgt = Math.sin(s.ph) * 0.1;
    s.sqv += (-95 * (s.sq - tgt) - 8 * s.sqv - clamp((s.vy - pvy) / dt, -4000, 4000) * 0.0004) * dt; s.sq = clamp(s.sq + s.sqv * dt, -0.45, 0.6);
    const ta = clamp(s.vx / 700, -0.4, 0.4); s.av += (-70 * (s.ang - ta) - 7 * s.av) * dt; s.ang += s.av * dt;   // leans into the way it moves, with a wobble
    shape(s, g);
    // tentacles: each point trails along where the bell has just been (lag) on top of a gently swaying hang, so they stream behind
    // when it swims and dangle and sway when it hovers
    s.acc = (s.acc || 0) + dt; s.hist = s.hist || []; while (s.acc >= 1 / 60) { s.acc -= 1 / 60; s.hist.push({ x: c.x, y: c.y }); if (s.hist.length > 40) s.hist.shift(); }
    const H0 = s.hist, ca = Math.cos(s.ang * 0.4), sa = Math.sin(s.ang * 0.4);
    for (let i = 0; i < NS; i++) {
      const S0 = s.st[i], a = anchor(s, c.x, c.y, i), am = 1.1 * (0.6 + 0.4 * Math.sin(i * 2.1));
      for (let j = 0; j <= SEGS; j++) {
        const p = S0.pts[j], lag = H0[Math.max(0, H0.length - 1 - j * 2)] || c, f = j / SEGS;
        let lx = (lag.x - c.x) * 0.9, ly = (lag.y - c.y) * 0.9, lm = Math.hypot(lx, ly); if (lm > 70) { lx *= 70 / lm; ly *= 70 / lm; }
        const rx = Math.sin(s.t * 2 + j * 0.5 + i * 1.3) * am * j + Math.sin(s.t * 1.3 + i) * 1.5 * j * f, ry = j * S0.seg * (1 - 0.1 * Math.abs(Math.sin(s.t * 1.7 + i)) * f);
        p.x = a.x + rx * ca - ry * sa + lx * f; p.y = a.y + rx * sa + ry * ca + ly * f;
      }
    }
  }
  function draw(cx, g, sk) {
    const c = g.center(), key = g.key || 'me';
    let s = ST[key]; if (!s) s = ST[key] = mkState();
    if (key === 'fake') { s.x = c.x; s.y = c.y; s.sq = 0; s.ang = 0; s.ph = 0.6; shape(s, g); hang(s, c); } else update(s, c, g, key);
    cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
    // soft golden glow
    const gl = cx.createRadialGradient(c.x, c.y - 6, 6, c.x, c.y - 6, 78); gl.addColorStop(0, 'rgba(255,214,70,.30)'); gl.addColorStop(1, 'rgba(255,214,70,0)'); cx.fillStyle = gl; cx.beginPath(); cx.arc(c.x, c.y - 6, 78, 0, 7); cx.fill();
    // tentacles (behind the bell)
    for (const pass of [0, 1]) for (let i = 0; i < NS; i++) {
      const S0 = s.st[i], w0 = S0.arm ? 8 : 4.8;
      for (let j = 1; j <= SEGS; j++) {
        const a = S0.pts[j - 1], b = S0.pts[j], f = j / SEGS, w = w0 * (1 - f * 0.65);
        cx.globalAlpha = 0.95 - f * 0.4; cx.strokeStyle = pass === 0 ? '#a86a00' : (S0.arm ? '#ffe27a' : '#ffcf33'); cx.lineWidth = pass === 0 ? w + 3 : w;
        cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();
      }
    }
    cx.globalAlpha = 1;
    // the bell
    cx.translate(c.x, c.y); cx.rotate(s.rot); cx.scale(s.sxm, s.sym);
    const H = 35, n = 8, step = (2 * R) / n;
    cx.beginPath(); cx.moveTo(-R, LIP); cx.bezierCurveTo(-R, -H * 1.35, R, -H * 1.35, R, LIP);
    for (let k = 0; k < n; k++) { const x = R - k * step; cx.quadraticCurveTo(x - step / 2, LIP + 9, x - step, LIP); }
    cx.closePath();
    const gr = cx.createRadialGradient(-4, -16, 2, 0, -4, 46); gr.addColorStop(0, '#fff6b8'); gr.addColorStop(0.45, '#ffd43b'); gr.addColorStop(1, '#e8a317');
    cx.fillStyle = gr; cx.fill(); cx.strokeStyle = '#a86a00'; cx.lineWidth = 3; cx.stroke();
    cx.save(); cx.clip();
    cx.strokeStyle = 'rgba(255,255,255,.42)'; cx.lineWidth = 2; for (let k = -2; k <= 2; k++) { cx.beginPath(); cx.moveTo(k * 5, -32 + Math.abs(k) * 2); cx.quadraticCurveTo(k * 17, -14, k * 13, LIP + 2); cx.stroke(); }
    cx.fillStyle = 'rgba(255,255,205,.32)'; cx.beginPath(); cx.ellipse(0, -6, 25, 16, 0, 0, 7); cx.fill();
    cx.restore();
    cx.fillStyle = 'rgba(255,255,255,.65)'; cx.beginPath(); cx.ellipse(-15, -23, 10, 4.2, -0.5, 0, 7); cx.fill();
    cx.restore();
    // honk rings
    if (g.honkT > 0) { const t = 1 - g.honkT / 0.35; cx.save(); cx.strokeStyle = '#ffd43b'; cx.lineWidth = 3; for (let r = 0; r < 3; r++) { cx.globalAlpha = Math.max(0, (1 - t) * 0.55 - r * 0.1); cx.beginPath(); cx.arc(c.x, c.y - 6, 40 + t * 70 + r * 14, 0, 7); cx.stroke(); } cx.restore(); }
  }
  root.Avatars = { draw, honk, PRESETS, SRC, def };
})(typeof window !== 'undefined' ? window : globalThis);
