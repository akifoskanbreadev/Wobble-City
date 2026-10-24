/*
 * Wobble City physics.
 *
 * Small-step XPBD (Macklin et al. 2019): many tiny substeps, one constraint pass each.
 * Real-world scale: 100 px = 1 m, so gravity is 981 px/s^2, a goose weighs ~4 kg,
 * and every number in here is in kg / px / seconds.
 *
 *  - Constraints carry real compliance (m/N), so a neck is genuinely soft rather than "damped".
 *  - Contact uses Coulomb friction: tangential deceleration is capped at mu * (normal push).
 *  - Water gives buoyancy (Archimedes, scaled by relative density) plus viscous drag.
 *  - Air gives quadratic drag, which is also what makes glide work: lift ~ v^2.
 *  - The body is a braced quad; the neck is a 20-link chain with bending compliance and weak
 *    "muscle" springs. Muscle forces are reacted back onto the body (Newton's third law), so a
 *    swinging head really does throw the goose around.
 */
(function (root) {
  'use strict';

  const GRAVITY = 981;
  const MAX_V = 3200;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  class Particle {
    constructor(x, y, o) {
      o = o || {};
      this.x = x; this.y = y; this.ox = x; this.oy = y;
      this.vx = 0; this.vy = 0;
      this.m = o.m || 1;
      this.im = o.fixed ? 0 : 1 / this.m;
      this.r = o.r || 0;
      this.mu = o.mu == null ? 0.8 : o.mu;
      this.drag = o.drag == null ? 0.05 : o.drag;      // linear air drag, 1/s
      this.cd = o.cd == null ? 0 : o.cd;               // quadratic air drag
      this.rho = o.rho == null ? 1 : o.rho;            // density relative to water
      this.fx = 0; this.fy = 0;                        // external force, kg px/s^2, held for the whole step
      this.nx = 0; this.ny = 0; this.pen = 0;          // contact accumulator (per substep)
      this.groundT = -10;                              // last time something solid was under this particle
      this.wet = 0;                                    // 0..1 submerged fraction
      this.cs = null;                                  // last solid touched (for moving-platform friction)
      this.sf = 1;                                     // surface friction factor of that solid (ice < 1)
    }
  }

  class World {
    constructor() {
      this.particles = [];
      this.links = [];
      this.solids = [];   // boxes {x,y,w,h,mu?,vx,vy}
      this.segs = [];     // terrain segments (solid below the line, left to right)
      this.movers = [];   // moving platforms: {s, x0, y0, ax, ay, per, ph}
      this.nearSegs = [];
      this.waters = [];   // {x,y,w,h} surface at y
      this.near = [];
      this.nearWater = [];
      this.substeps = 10;
      this.time = 0;
      this.hooks = [];    // called at the start of every substep: apply state-dependent forces here
      this.windFn = null; // (time) -> sideways acceleration in px/s^2 (gusts); scaled per particle by p.wk
      this.waveH = 0;     // water surface wave height (px) and wave push, for weather levels
      this.waveK = 0;
      this.zones = [];    // {x,y,w,h,ax,ay,g}: fans (ay<0), low/anti-gravity (g<1) and the like
    }
    surfY(w, x) { return this.waveH ? w.y + this.waveH * Math.sin(x * 0.06 + this.time * 2.4) : w.y; }

    particle(x, y, o) {
      const p = new Particle(x, y, o);
      this.particles.push(p);
      return p;
    }

    // mode: 'rigid' | 'rope' (resists stretch only) | 'strut' (resists compression only)
    link(a, b, o) {
      o = o || {};
      const c = {
        a, b,
        len: o.len == null ? Math.hypot(a.x - b.x, a.y - b.y) : o.len,
        compliance: o.compliance || 0,                 // m/N-ish; 0 = hard
        mode: o.mode || 'rigid',
        lambda: 0,
      };
      this.links.push(c);
      return c;
    }

    step(dt) {
      const ps = this.particles;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of ps) {
        if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
        if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
      }
      x0 -= 80; y0 -= 80; x1 += 80; y1 += 80;
      this.near.length = 0; this.nearWater.length = 0; this.nearSegs.length = 0;
      for (const s of this.solids) if (s.x < x1 && s.x + s.w > x0 && s.y < y1 && s.y + s.h > y0) this.near.push(s);
      for (const g of this.segs) if (g.maxx > x0 && g.minx < x1 && g.maxy > y0 && g.miny < y1) this.nearSegs.push(g);
      for (const w of this.waters) if (w.x < x1 && w.x + w.w > x0 && w.y < y1 && w.y + w.h > y0) this.nearWater.push(w);

      const n = this.substeps, h = dt / n;
      for (let s = 0; s < n; s++) this._sub(h);
    }

    _sub(h) {
      const ps = this.particles, ls = this.links;
      const nw = this.nearWater;
      for (const m of this.movers) {
        const s = m.s, t = this.time + h;
        const nx = m.x0 + m.ax * Math.sin((t / m.per + m.ph) * 6.2831853);
        const ny = m.y0 + m.ay * Math.sin((t / m.per + m.ph) * 6.2831853);
        s.vx = (nx - s.x) / h; s.vy = (ny - s.y) / h; s.x = nx; s.y = ny;
      }
      for (const fn of this.hooks) fn(h);

      for (const p of ps) {
        p.nx = 0; p.ny = 0; p.pen = 0;
        if (p.im === 0) continue;
        p.ox = p.x; p.oy = p.y;

        // water: buoyancy = rho_water * V * g, weight = rho * V * g  ->  net up accel = g * (1/rho - 1) * wet
        let wet = 0;
        for (const w of nw) {
          if (p.x > w.x && p.x < w.x + w.w) {
            const sy = this.waveH ? this.surfY(w, p.x) : w.y;
            if (p.y + p.r > sy) wet = Math.max(wet, clamp((p.y + p.r - sy) / Math.max(2 * p.r, 12), 0, 1));
          }
        }
        p.wet = wet;
        let ax = p.fx * p.im;
        let ay = p.fy * p.im + (GRAVITY - GRAVITY * (1 / p.rho) * wet * (this.buoy == null ? 1 : this.buoy)) * (this.gscale || 1);
        if (this.windFn && p.wk) ax += this.windFn(this.time) * p.wk;
        for (let zi = 0; zi < this.zones.length; zi++) {
          const z = this.zones[zi];
          if (p.x > z.x && p.x < z.x + z.w && p.y > z.y && p.y < z.y + z.h) { ax += z.ax; ay += z.ay - GRAVITY * (1 - z.g) * (this.gscale || 1); }
        }
        if (this.waveK && wet) {   // waves shove everything floating in the water around
          ax += this.waveK * Math.sin(this.time * 1.9 + p.y * 0.01) * wet;
          ay += this.waveK * 0.7 * Math.cos(this.time * 2.6 + p.x * 0.03) * wet;
        }
        p.vx += ax * h; p.vy += ay * h;

        const sp = Math.hypot(p.vx, p.vy);
        const k = 1 / (1 + (p.drag + p.cd * sp + wet * (this.sea ? 1.8 + 0.008 * sp : 4 + 0.02 * sp)) * h);
        p.vx *= k; p.vy *= k;
        if (sp > MAX_V) { p.vx *= MAX_V / sp; p.vy *= MAX_V / sp; }

        p.x += p.vx * h; p.y += p.vy * h;
        p.fx = 0; p.fy = 0;
      }

      for (const c of ls) c.lambda = 0;
      for (const c of ls) this._solve(c, h);
      for (const p of ps) if (p.r > 0 && p.im > 0) this._collide(p);

      for (const p of ps) {
        if (p.im === 0) continue;
        p.vx = (p.x - p.ox) / h;
        p.vy = (p.y - p.oy) / h;
        if (p.pen > 0) {
          const nl = Math.hypot(p.nx, p.ny) || 1;
          const nx = p.nx / nl, ny = p.ny / nl;
          const cs = p.cs, svx = cs ? cs.vx || 0 : 0, svy = cs ? cs.vy || 0 : 0;
          const rx = p.vx - svx, ry = p.vy - svy;
          const vn = rx * nx + ry * ny;
          const tx = rx - vn * nx, ty = ry - vn * ny;
          const tl = Math.hypot(tx, ty);
          if (tl > 1e-9) {
            // Coulomb: the normal impulse this substep is ~ pen / h (as a velocity change)
            const red = Math.min(tl, (p.mu * p.sf * p.pen) / h);
            p.vx -= (tx / tl) * red;
            p.vy -= (ty / tl) * red;
          }
          if (ny < -0.5) p.groundT = this.time;
        }
      }
      this.time += h;
    }

    _solve(c, h) {
      const a = c.a, b = c.b;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
      if (c.mode === 'rope' && d <= c.len) return;
      if (c.mode === 'strut' && d >= c.len) return;
      const w = a.im + b.im;
      if (w === 0) return;
      const at = c.compliance / (h * h);
      const dl = (-(d - c.len) - at * c.lambda) / (w + at);
      c.lambda += dl;
      const nx = dx / d, ny = dy / d;
      a.x -= nx * dl * a.im; a.y -= ny * dl * a.im;
      b.x += nx * dl * b.im; b.y += ny * dl * b.im;
    }

    _collide(p) {
      const near = this.near;
      for (let i = 0; i < near.length; i++) {
        const s = near[i];
        const cx = clamp(p.x, s.x, s.x + s.w), cy = clamp(p.y, s.y, s.y + s.h);
        const dx = p.x - cx, dy = p.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= p.r * p.r && d2 > 1e-9) continue;
        let nx, ny, pen;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          nx = dx / d; ny = dy / d; pen = p.r - d;
        } else {
          const l = p.x - s.x, r = s.x + s.w - p.x, t = p.y - s.y, b = s.y + s.h - p.y;
          const m = Math.min(l, r, t, b);
          nx = 0; ny = 0;
          if (m === t) ny = -1; else if (m === b) ny = 1; else if (m === l) nx = -1; else nx = 1;
          pen = m + p.r;
        }
        p.x += nx * pen; p.y += ny * pen;
        p.nx += nx * pen; p.ny += ny * pen; p.pen += pen;
        p.cs = s; p.sf = s.mu == null ? 1 : s.mu;
      }
      const segs = this.nearSegs;
      for (let i = 0; i < segs.length; i++) {
        const g = segs[i];
        const dx = g.x2 - g.x1, dy = g.y2 - g.y1;
        let t = ((p.x - g.x1) * dx + (p.y - g.y1) * dy) / g.len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const vx = p.x - (g.x1 + t * dx), vy = p.y - (g.y1 + t * dy);
        const d2 = vx * vx + vy * vy;
        if (d2 >= p.r * p.r) continue;
        const side = vx * g.nx + vy * g.ny;
        let nx, ny, pen;
        if (side >= 0 && d2 > 1e-9) { const d = Math.sqrt(d2); nx = vx / d; ny = vy / d; pen = p.r - d; }
        else { nx = g.nx; ny = g.ny; pen = p.r - side; }
        p.x += nx * pen; p.y += ny * pen;
        p.nx += nx * pen; p.ny += ny * pen; p.pen += pen;
        p.cs = g; p.sf = g.mu == null ? 1 : g.mu;
      }
    }
  }

  // ------------------------------------------------------------------------------------------

  const NECK_SEGS = 20;
  const SEG = 7;            // px per link -> neck is 1.4 m end to end

  class Goose {
    constructor(world, x, y, opt) {
      opt = opt || {};
      this.world = world;
      this.wobble = opt.wobble == null ? 1 : opt.wobble;   // 1 normal; <1 floppier, >1 stiffer
      this.tremor = opt.tremor || 0;                       // random neck twitching, 0 = none
      this.noiseT = Math.random() * 100;
      this.speed = opt.speed || 1;                         // walking speed multiplier (code: speed)
      this.flapK = opt.flapK || 1;                         // skin flap strength multiplier
      this.neckMul = opt.neck || 1;                        // neck length multiplier (code: neck)
      this.seg = SEG * this.neckMul;
      this.infFlaps = !!opt.infFlaps;                      // never runs out of flaps (code: flaps)
      const L = opt.layout || {};                          // layout skins (dog, brontosaurus...): where the neck, legs and head sit on the body
      this.nax = (L.nx != null ? L.nx : 24); this.nay = (L.ny != null ? L.ny : -17);   // neck anchor, in goose-px (scaled by body size below)
      this.neckAng = L.ang != null ? L.ang : -98; this.neckBend = L.bend != null ? L.bend : 4.2; this.neckStiff = L.stiff || 1;
      this.hipFrac = L.hip || [-13 / 28, 13 / 28];
      this.jelly = opt.jelly ? Object.assign({ k: 5200, c: 0.0009, damp: 6 }, opt.jelly) : null;   // soft-body pressure model (JellyCar-style)
      this.sw = opt.shapeW || 1; this.sh = opt.shapeH || 1; this.lm = opt.legM || 1;   // shape skins: body width/height and leg length multipliers
      this.legless = !!opt.legless;                        // Neck mode: no legs, drag yourself along with the neck
      this.chaos = !!opt.chaos;                            // Spaghetti mode: haunted neck steering + random whiplash
      this.jerkT = 1;
      this.facing = 1; this.faceBlend = 1;
      this.phase = 0; this.mv = 0;
      this.stamina = 5; this.flapCd = 0; this.flapT = 0; this.honkT = 0;
      this.grounded = false; this.airT = 0; this.swimming = false;
      this.rest = [];

      const mk = (ox, oy, o) => {
        const p = world.particle(x + ox, y + oy, o);
        this.rest.push([p, ox, oy]);
        return p;
      };

      // body: 4 kg braced quad. Slightly buoyant: rho 0.75 of water.
      const bo = { m: 1, r: 8, mu: opt.legless ? 0.35 : 0.9, drag: 0.02, cd: 0.0006, rho: 0.75 };
      this.nax *= this.sw; this.nay *= this.sh;
      this.bodyRest = [[-28 * this.sw, 13 * this.sh], [28 * this.sw, 13 * this.sh], [28 * this.sw, -13 * this.sh], [-28 * this.sw, -13 * this.sh]];
      this.body = this.bodyRest.map((r) => mk(r[0], r[1], bo));
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) world.link(this.body[i], this.body[j], this.jelly ? { compliance: this.jelly.c } : undefined);
      this.area0 = 56 * this.sw * 26 * this.sh;

      // legs
      this.hipX = this.hipFrac.map((f) => f * 28 * this.sw); this.hipY = 8 * this.sh; this.L0 = 30 * this.lm;
      this.hips = this.hipX.map((hx) => mk(hx, this.hipY, { m: 0.3, drag: 0.02 }));
      this.hips.forEach((h) => this.body.forEach((b) => world.link(h, b, this.jelly ? { compliance: this.jelly.c } : undefined)));
      this.feet = this.hipX.map((hx) => mk(hx, this.hipY + this.L0, { m: 0.2, r: 5, mu: 1.3, drag: 0.05, rho: 1.4 }));
      this.feet.forEach((f, i) => {
        world.link(this.hips[i], f, { mode: 'rope', len: 40 * this.lm });
        world.link(this.hips[i], f, { mode: 'strut', len: 14 });
      });

      // neck
      const ax = this.nax, ay = this.nay, na0 = (this.neckAng * Math.PI) / 180;
      this.neck = [];
      for (let i = 0; i <= NECK_SEGS; i++) {
        let o;
        if (i === 0) o = { m: 0.2, drag: 0.1 };
        else if (i < NECK_SEGS) o = { m: 0.05, r: 3.5, mu: 0.4, drag: 0.4, cd: 0.002, rho: 1.05 };
        else o = { m: 0.4, r: 9, mu: opt.legless ? 3.5 : 0.6, drag: 0.5, cd: 0.001, rho: 0.9 };
        this.neck.push(mk(ax + Math.cos(na0) * i * this.seg, ay + Math.sin(na0) * i * this.seg, o));
      }
      for (let i = 0; i < NECK_SEGS; i++) world.link(this.neck[i], this.neck[i + 1], { len: this.seg });
      // bending stiffness: soft links skipping a vertebra (compliance scales with floppiness)
      this.bend = [];
      for (let i = 0; i < NECK_SEGS - 1; i++) {
        this.bend.push(world.link(this.neck[i], this.neck[i + 2], { len: this.seg * 1.985, compliance: 0.004 / this.wobble }));
      }
      this.mount = this.body.map((b, i) => ({
        c: world.link(b, this.neck[0], { len: Math.hypot(ax - this.bodyRest[i][0], ay - this.bodyRest[i][1]), compliance: this.jelly ? this.jelly.c : 0 }),
        rx: this.bodyRest[i][0], ry: this.bodyRest[i][1],
      }));
      this.head = this.neck[NECK_SEGS];
      this.move = 0; this.glide = false; this.aim = null;
      world.hooks.push(() => this.apply());
    }

    center() {
      let x = 0, y = 0;
      for (const b of this.body) { x += b.x; y += b.y; }
      return { x: x / 4, y: y / 4 };
    }

    velocity() {
      let x = 0, y = 0;
      for (const b of this.body) { x += b.vx; y += b.vy; }
      return { x: x / 4, y: y / 4 };
    }

    axes() {
      const [P0, P1, P2, P3] = this.body;
      let ux = (P1.x - P0.x) + (P2.x - P3.x), uy = (P1.y - P0.y) + (P2.y - P3.y);
      const l = Math.hypot(ux, uy) || 1;
      ux /= l; uy /= l;
      return { ux, uy, vx: -uy, vy: ux };
    }

    reset(x, y) {
      for (const [p, ox, oy] of this.rest) {
        p.x = p.ox = x + ox; p.y = p.oy = y + oy;
        p.vx = p.vy = 0; p.fx = p.fy = 0;
      }
      this.facing = 1; this.faceBlend = 1; this.phase = 0; this.mv = 0;
      this.stamina = 5; this.flapCd = 0; this.flapT = 0;
    }

    impulse(p, vx, vy) { p.vx += vx; p.vy += vy; }

    honk() {
      this.honkT = 0.35;
      this.impulse(this.head, 0, -300);
      for (let i = NECK_SEGS - 5; i < NECK_SEGS; i++) this.impulse(this.neck[i], 0, -160);
    }

    /* Per frame: discrete decisions. inp: { move: -1..1, flap: bool (edge), glide: bool, aim: null | {x,y} } */
    update(dt, inp) {
      const W = this.world, body = this.body;
      const v = this.velocity();
      this.noiseT += dt;
      this.move = clamp(inp.move || 0, -1, 1);
      this.glide = !!inp.glide;
      this.aim = inp.aim || null;
      if (this.legless && !this.aim && this.move !== 0) {
        // inchworm: throw the head forward, plant it, then pull back so the body is hauled along
        this.wriggle = (this.wriggle || 0) + dt * 2 * Math.PI * 1.5;
        const reach = Math.sin(this.wriggle) > -0.2, d = Math.sign(this.move);
        this.aim = reach ? { x: d * 0.9, y: -0.35 } : { x: -d * 0.55, y: 0.85 };
      }
      if (this.chaos) {
        // the neck pad is haunted: your aim direction drifts around and flips
        if (this.aim) {
          const t = this.noiseT, a = 2.6 * Math.sin(t * 0.8) + 1.4 * Math.sin(t * 2.1 + 1), c = Math.cos(a), s = Math.sin(a);
          this.aim = { x: this.aim.x * c - this.aim.y * s, y: this.aim.x * s + this.aim.y * c };
        }
        // and every so often the head is yanked somewhere at random
        this.jerkT -= dt;
        if (this.jerkT <= 0) {
          this.jerkT = 0.3 + Math.random() * 0.6;
          const a = Math.random() * Math.PI * 2, m = 200 + Math.random() * 380;
          this.impulse(this.head, Math.cos(a) * m, Math.sin(a) * m);
          for (let i = NECK_SEGS - 6; i < NECK_SEGS; i++) this.impulse(this.neck[i], Math.cos(a) * m * 0.5, Math.sin(a) * m * 0.5);
        }
      }

      const wasGrounded = this.grounded;
      this.grounded = this.feet.some((f) => W.time - f.groundT < 0.08) || body.some((b) => W.time - b.groundT < 0.08);
      if (this.jelly && this.grounded && !wasGrounded && this.prevVy > 260 && !this.swimming) {   // jelly boing: soaks up the landing and gives some back
        const up = -Math.min(620, this.prevVy * 0.62);
        for (const q of body.concat(this.hips, this.feet)) q.vy = Math.min(q.vy, up);
      }
      this.prevVy = v.y;
      this.swimming = body.filter((b) => b.wet > 0.3).length >= 2;
      this.airT = this.grounded || this.swimming ? 0 : this.airT + dt;

      if (this.move !== 0) this.facing = Math.sign(this.move);
      this.faceBlend += (this.facing - this.faceBlend) * Math.min(1, dt * 6);
      const mx = this.nax * this.faceBlend, my = this.nay;
      for (const m of this.mount) m.c.len = Math.hypot(mx - m.rx, my - m.ry);

      this.mv += (Math.abs(this.move) - this.mv) * Math.min(1, dt * 8);
      if (this.grounded) this.phase += dt * 2 * Math.PI * 2.4 * Math.abs(this.move) * (1 + 0.55 * (this.speed - 1));

      this.padCd = (this.padCd || 0) - dt;
      if (this.padCd <= 0) {
        for (const f of this.feet) {
          if (f.cs && f.cs.pad && W.time - f.groundT < 0.05) {
            for (const [q] of this.rest) q.vy = Math.min(q.vy, -1280);
            this.padCd = 0.5; this.bounced = true; this.stamina = 5; this.flapT = 0.35;
            break;
          }
        }
      }
      this.flapCd -= dt;
      this.flapT = Math.max(0, this.flapT - dt);
      this.honkT = Math.max(0, this.honkT - dt);
      if (this.grounded) this.stamina = Math.min(5, this.stamina + 2.5 * dt);
      if (this.swimming) this.stamina = Math.min(5, this.stamina + 1.2 * dt);
      if (this.infFlaps) this.stamina = 5;
      if (inp.flap && this.stamina >= 1 && this.flapCd <= 0) {
        const easy = W.sea && this.swimming;       // deep sea: strokes are free, quick and push you along
        if (!easy) this.stamina -= 1;
        this.flapCd = easy ? 0.16 : 0.26; this.flapT = 0.35;
        const dvy = (easy ? -(300 + Math.max(0, v.y) * 0.6) : -(520 + Math.max(0, v.y) * 0.5)) * (this.flapK || 1);
        const all = body.concat(this.hips, this.feet);
        for (const p of all) this.impulse(p, this.move * (easy ? 150 : 70) * this.speed, dvy);
        this.impulse(this.neck[0], 0, dvy * 0.8);
        this.flapped = true;
      }
    }

    /* Per substep: every force that depends on state (so damping uses fresh velocities). */
    apply() {
      const body = this.body;
      const A = this.axes(), c = this.center(), v = this.velocity();
      const tilt = Math.atan2(A.uy, A.ux);
      const move = this.move, f = this.facing;

      // vestibular balance: PD torque on the body, capped like a real muscle
      let inertia = 0, ang = 0;
      for (const b of body) {
        const rx = b.x - c.x, ry = b.y - c.y;
        inertia += b.m * (rx * rx + ry * ry);
        ang += b.m * (rx * (b.vy - v.y) - ry * (b.vx - v.x));
      }
      inertia = Math.max(inertia, 1);
      const omega = ang / inertia;
      const tau = clamp(-(this.swimming ? 90000 : 130000) * tilt - 7000 * omega, -90000, 90000);
      for (const b of body) {
        const rx = b.x - c.x, ry = b.y - c.y;
        const r2 = Math.max(1, rx * rx + ry * ry);
        b.fx += (tau * -ry) / (4 * r2);
        b.fy += (tau * rx) / (4 * r2);
      }

      // jelly: pressure pushes the skin outward when the volume shrinks, like JellyCar's soft bodies
      if (this.jelly) {
        let area = 0;
        for (let i = 0; i < 4; i++) { const a = body[i], b = body[(i + 1) % 4]; area += a.x * b.y - b.x * a.y; }
        area *= 0.5;
        const sgn = area >= 0 ? 1 : -1, ratio = this.area0 / Math.max(this.area0 * 0.25, Math.abs(area));
        const press = this.jelly.k * Math.max(-0.6, Math.min(2.2, ratio - 1));
        for (let i = 0; i < 4; i++) {
          const a = body[i], b = body[(i + 1) % 4];
          const ex = b.x - a.x, ey = b.y - a.y;
          const fx = sgn * ey * press * 0.5, fy = -sgn * ex * press * 0.5;
          a.fx += fx; a.fy += fy; b.fx += fx; b.fy += fy;
        }
        for (const b of body) { b.fx -= (b.vx - v.x) * this.jelly.damp; b.fy -= (b.vy - v.y) * this.jelly.damp; }
      }

      // legs: spring-damper toward the walk-cycle target
      for (let i = 0; i < 2; i++) {
        const th = this.phase + i * Math.PI;
        let tx = this.hipX[i] + f * 22 * Math.cos(th) * this.mv;
        let ty = this.hipY + this.L0 - 12 * Math.max(0, -Math.sin(th)) * this.mv;
        if (this.legless) { tx = this.hipX[i]; ty = this.hipY + 1; }
        else if (!this.grounded) { tx = this.hipX[i] - f * 4; ty = this.hipY + (this.swimming ? 30 : 18); }
        const Tx = c.x + A.ux * tx + A.vx * ty, Ty = c.y + A.uy * tx + A.vy * ty;
        const foot = this.feet[i], hip = this.hips[i];
        const Fx = 1400 * (Tx - foot.x) - 100 * (foot.vx - hip.vx);
        const Fy = 1400 * (Ty - foot.y) - 100 * (foot.vy - hip.vy);
        foot.fx += Fx; foot.fy += Fy; hip.fx -= Fx; hip.fy -= Fy;
      }

      // locomotion: velocity governor limited by what the feet can grip (mu * m * g)
      const mass = 4.5;
      const vmax = (this.swimming ? (this.world.sea ? 260 : 130) : 300) * this.speed;
      let grip = 1;
      if (this.grounded) { grip = Math.min(this.feet[0].sf, this.feet[1].sf); if (this.feet[0].cs == null) grip = 1; }
      const cap = (this.grounded ? 1.1 * GRAVITY * mass * grip + 40 * mass : this.swimming ? (this.world.sea ? 300 : 160) * mass : 230 * mass) * this.speed;
      const Fd = clamp(14 * mass * (move * vmax - v.x), -cap, cap);
      if (this.legless ? (move !== 0 && !this.grounded) : (move !== 0 || this.grounded)) for (const b of body) b.fx += (this.legless ? 0.35 : 1) * Fd / 4;

      // glide: wings out, lift ~ v^2
      if (this.glide && !this.grounded && !this.swimming && v.y > 60) {
        const lift = 0.0011 * v.y * v.y * mass;
        for (const b of body) b.fy -= lift / 4;
        this.flapT = Math.max(this.flapT, 0.1);
      }

      // neck muscles: strong at the base, almost nothing at the tip
      const aim = this.aim, n = NECK_SEGS;
      let ang0, bend, boost = 1;
      if (aim && Math.hypot(aim.x, aim.y) > 0.2) {
        ang0 = Math.atan2(aim.y, aim.x); bend = 0; boost = 1.8;
      } else {
        const a = (this.neckAng * Math.PI) / 180, step = (this.neckBend * Math.PI) / 180;
        ang0 = f > 0 ? a : Math.PI - a; bend = f > 0 ? step : -step;
      }
      const base = this.neck[0];
      let tx = base.x, ty = base.y, a = ang0, rx = 0, ry = 0;
      const kBase = 260 * this.wobble * boost * this.neckStiff, kTip = 11 * this.wobble * boost * this.neckStiff;
      for (let i = 1; i <= n; i++) {
        a += bend; tx += Math.cos(a) * this.seg; ty += Math.sin(a) * this.seg;
        const t = i / n;
        const ks = kTip + kBase * (1 - t) * (1 - t) * (1 - t);
        const p = this.neck[i];
        const Fx = ks * (tx - p.x) - 0.9 * p.vx * Math.sqrt(ks * p.m);
        const Fy = ks * (ty - p.y) - 0.9 * p.vy * Math.sqrt(ks * p.m);
        p.fx += Fx; p.fy += Fy; rx -= Fx; ry -= Fy;
        if (this.tremor > 0) {
          // smooth pseudo-noise, stronger toward the tip: the neck has a mind of its own
          const q = this.noiseT, w = this.tremor * t * t;
          const nxf = Math.sin(q * 3.1 + i * 0.7) * Math.sin(q * 1.3 + i * 0.31) + 0.5 * Math.sin(q * 7.3 + i * 1.9);
          const nyf = Math.sin(q * 2.7 + i * 0.5 + 1.7) * Math.sin(q * 1.1 + i * 0.43) + 0.5 * Math.sin(q * 6.1 + i * 2.3);
          p.fx += 60 * w * nxf * Math.sqrt(p.m / 0.05); p.fy += 60 * w * nyf * Math.sqrt(p.m / 0.05);
        }
      }
      for (const b of body) { b.fx += rx / 4; b.fy += ry / 4; }
    }
  }

  // Builds the physics world for a level description. Returns the non-physical extras.
  // Gust schedule for a level's weather: a calm spell, a short warning, then a gust that eases in and out.
  // Returns { a: acceleration (px/s^2, + = right), warn: 0..1, dir }. Pure function of time, so every client agrees.
  function windInfo(wx, t) {
    if (!wx || !wx.wind) return { a: 0, warn: 0, dir: 0 };
    const per = wx.per || 7, n = Math.floor(t / per), u = t / per - n;
    const hs = Math.sin(n * 12.9898 + 4.1) * 43758.5453, r = hs - Math.floor(hs);
    const dir = wx.dir || (r < 0.5 ? -1 : 1);
    if (u >= 0.45 && u < 0.6) return { a: 0, warn: 1, dir };
    if (u >= 0.6 && u < 1) return { a: dir * wx.wind * Math.sin(Math.PI * (u - 0.6) / 0.4), warn: 0, dir };
    return { a: 0, warn: 0, dir };
  }

  function buildLevel(world, lv) {
    const box = (x, y, w, h, o) => {
      const s = { x, y, w, h, vx: 0, vy: 0 };
      if (o) Object.assign(s, o);
      world.solids.push(s);
      return s;
    };
    for (const a of lv.solids || []) box(a[0], a[1], a[2], a[3], a[4]);
    for (const t of lv.terrain || []) {
      for (let i = 0; i + 1 < t.pts.length; i++) {
        const [x1, y1] = t.pts[i], [x2, y2] = t.pts[i + 1];
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
        world.segs.push({
          x1, y1, x2, y2, len2: len * len, nx: dy / len, ny: -dx / len, mu: t.mu, vx: 0, vy: 0,
          minx: Math.min(x1, x2), maxx: Math.max(x1, x2), miny: Math.min(y1, y2), maxy: Math.max(y1, y2),
        });
      }
    }
    for (const w of lv.water || []) world.waters.push({ x: w[0], y: w[1], w: w[2], h: w[3] });
    world.buoy = lv.sea ? 0.7 : 1; world.sea = !!lv.sea;      // deep sea: you sink slowly instead of bobbing to the top
    const movers = [];
    for (const m of lv.movers || []) {
      const s = box(m.x, m.y, m.w, m.h, { mover: true, mu: 1.0 });
      world.movers.push({ s, x0: m.x, y0: m.y, ax: m.ax || 0, ay: m.ay || 0, per: m.per || 4, ph: m.ph || 0 });
      movers.push(s);
    }
    const pads = (lv.pads || []).map((p) => box(p[0], p[1], p[2], 14, { pad: true }));
    return { pads, movers };
  }

  // does any body/foot particle overlap one of the hazard rectangles?
  function touchesHazard(goose, hazards) {
    const ps = goose.body.concat(goose.feet);
    for (const h of hazards || []) {
      for (const p of ps) {
        if (p.x > h[0] - p.r * 0.5 && p.x < h[0] + h[2] + p.r * 0.5 && p.y > h[1] - p.r * 0.5 && p.y < h[1] + h[3] + p.r * 0.5) return true;
      }
    }
    return false;
  }

  const api = { World, Goose, Particle, GRAVITY, NECK_SEGS, SEG, buildLevel, touchesHazard, windInfo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Physics = api;
})(typeof window !== 'undefined' ? window : globalThis);
