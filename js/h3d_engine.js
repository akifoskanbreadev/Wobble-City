/*
 * A tiny WebGL engine for the 3D Hide & Seek mode: flat-shaded, Roblox-style blocks with fog and a directional light.
 * No libraries. Everything is built from boxes (optionally turned around the Y axis).
 *   const gl3 = H3E.create(canvas)         -> renderer, or null when WebGL is unavailable
 *   const m = H3E.mesh()                    -> a box batch: m.box(cx, y0, cz, w, h, d, '#rrggbb', ry)   (y0 = bottom of the box)
 *   gl3.setStatic(m) / gl3.drawFrame(cam, dynamicMesh)
 */
(function (root) {
  'use strict';
  const hexCache = {};
  function rgb(c) {
    if (typeof c !== 'string') return c;
    let v = hexCache[c];
    if (!v) { const n = parseInt(c.slice(1), 16); v = hexCache[c] = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
    return v;
  }
  const shade = (c, k) => { const v = rgb(c); return [Math.min(1, v[0] * k), Math.min(1, v[1] * k), Math.min(1, v[2] * k)]; };

  // ----------------------------------------------------------------- box batch
  const FACES = [   // normal, then 4 corner signs (x, y, z) in -1..1
    [0, 1, 0, [-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]],
    [0, -1, 0, [-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]],
    [0, 0, 1, [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
    [0, 0, -1, [1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]],
    [1, 0, 0, [1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]],
    [-1, 0, 0, [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
  ];
  // Which material a box is made of, worked out from its colour and shape (so the maps need no changes).
  // 1 grass  2 leaves  3 wood  4 stone/paving  6 brick  7 snow/sand  8 roof tiles  9 siding/plaster  10 painted
  function material(c, w, h, d, y0) {
    const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]), sat = mx > 0 ? (mx - mn) / mx : 0, big = Math.max(w, d), flat = h < 0.6 && big > 5;
    const green = c[1] > c[0] * 1.04 && c[1] > c[2] * 1.12 && sat > 0.18;
    if (flat) { if (green) return 1; if (sat < 0.18 && mx > 0.86) return 7; if (sat < 0.2) return 4; if (c[0] > c[2] * 1.25 && mx > 0.6) return 7; return 3; }
    if (y0 > 2.3 && h < 1.8 && w > 2 && d > 2) return 8;
    if (green) return 2;
    if (sat < 0.16) return 4;
    if (c[0] > c[1] * 1.45 && c[0] > c[2] * 1.6 && sat > 0.4 && mx > 0.5) return 6;
    if (c[0] >= c[1] && c[1] >= c[2] && sat > 0.3 && mx < 0.68) return 3;
    if (mx > 0.78 && sat < 0.4 && (h > 1.2)) return 9;
    return 10;
  }
  function mesh() {
    const m = { v: [], i: [], n: 0, plain: false };
    // x/z are the centre, y the BOTTOM; w/h/d the size; ry the turn about the Y axis (radians); col a hex string or [r,g,b]
    m.box = (cx, y0, cz, w, h, d, col, ry) => {
      const c = rgb(col), hw = w / 2, hh = h / 2, hd = d / 2, cy = y0 + hh, co = ry ? Math.cos(ry) : 1, si = ry ? Math.sin(ry) : 0;
      const mat = m.plain ? 0 : material(c, w, h, d, y0), ox = (cx * 7.31 + cz * 3.17) % 11.7, oz = (cx * 2.9 - cz * 5.3) % 9.3;   // a little per-object offset so no two boxes carry identical patterns
      let fi = 0;
      for (const f of FACES) {
        const ax = fi < 2 ? 1 : fi < 4 ? 2 : 0; fi++;
        let nx = f[0], nz = f[2]; const ny = f[1];
        if (ry) { const rx = nx * co + nz * si, rz = -nx * si + nz * co; nx = rx; nz = rz; }
        const base = m.n;
        for (let k = 0; k < 4; k++) {
          const s = f[3 + k]; let px = s[0] * hw, pz = s[2] * hd;
          if (ry) { const rx = px * co + pz * si, rz = -px * si + pz * co; px = rx; pz = rz; }
          m.v.push(cx + px, cy + s[1] * hh, cz + pz, nx, ny, nz, c[0], c[1], c[2], s[0] * hw + hw + ox, s[1] * hh + hh, s[2] * hd + hd + oz, w, h, d, mat, ax);
        }
        m.i.push(base, base + 1, base + 2, base, base + 2, base + 3); m.n += 4;
      }
    };
    // a smooth ellipsoid (real round shape): centre cx,cy,cz, radii rx,ry,rz, turned about Y by yaw. Smooth-shaded, so no blocky edges.
    m.ball = (cx, cy, cz, rx, ry, rz, col, yaw, seg, ring) => {
      const c = rgb(col), S = seg || 12, Rg = ring || 8, co = yaw ? Math.cos(yaw) : 1, si = yaw ? Math.sin(yaw) : 0, base0 = m.n;
      for (let i = 0; i <= Rg; i++) {
        const ph = -Math.PI / 2 + (Math.PI * i) / Rg, cp = Math.cos(ph), sp = Math.sin(ph);
        for (let j = 0; j <= S; j++) {
          const th = (2 * Math.PI * j) / S, ux = cp * Math.cos(th), uz = cp * Math.sin(th);
          let px = ux * rx, pz = uz * rz, nx = ux / rx, nz = uz / rz; const ny = sp / ry, nl = Math.hypot(nx, ny, nz) || 1;
          nx /= nl; nz /= nl;
          if (yaw) { let t = px * co + pz * si; pz = -px * si + pz * co; px = t; t = nx * co + nz * si; nz = -nx * si + nz * co; nx = t; }
          m.v.push(cx + px, cy + sp * ry, cz + pz, nx, ny / nl, nz, c[0], c[1], c[2], 0, 0, 0, 0, 0, 0, 0, 0);
        }
      }
      for (let i = 0; i < Rg; i++) for (let j = 0; j < S; j++) {
        const a = base0 + i * (S + 1) + j, b = a + 1, d = a + S + 1, cc = d + 1;
        m.i.push(a, d, cc, a, cc, b);
      }
      m.n += (Rg + 1) * (S + 1);
    };
    m.clear = () => { m.v.length = 0; m.i.length = 0; m.n = 0; };
    return m;
  }

  // ----------------------------------------------------------------- matrices (column-major)
  function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), r = 1 / (n - f); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * r, -1, 0, 0, 2 * f * n * r, 0]; }
  function look(e, c) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; const zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
    let xx = zz, xz = -zx; const xl = Math.hypot(xx, xz) || 1; xx /= xl; xz /= xl;      // up = (0,1,0)
    const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
    return [xx, yx, zx, 0, 0, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  }
  function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; }

  // ----------------------------------------------------------------- renderer
  const VS = 'attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;attribute vec3 aU;attribute vec3 aS;attribute vec2 aM;uniform mat4 uM;uniform vec3 uE;uniform vec3 uL;varying vec3 vC;varying float vD;varying vec3 vU;varying vec3 vS;varying vec2 vM;' +
    'void main(){gl_Position=uM*vec4(aP,1.0);float d=max(dot(aN,normalize(uL)),0.0);float l=0.58+0.42*d+0.12*aN.y;vC=aC*l;vD=distance(aP,uE);vU=aU;vS=aS;vM=aM;}';
  // The surface patterns are generated per OBJECT from each box's own local coordinates (not one texture over the whole screen):
  // wood grain follows the plank, bricks and tiles are laid in courses on the wall or roof they belong to, leaves are clusters on each bush.
  const FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
    'varying vec3 vC;varying float vD;varying vec3 vU;varying vec3 vS;varying vec2 vM;uniform vec3 uF;uniform vec2 uFog;uniform float uG;' +
    'float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
    'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hh(i),hh(i+vec2(1.0,0.0)),f.x),mix(hh(i+vec2(0.0,1.0)),hh(i+vec2(1.0,1.0)),f.x),f.y);}' +
    'vec3 pat(float m,vec2 p,vec2 sz){' +
      'if(m<1.5){float n=vn(p*3.0)*0.5+vn(p*11.0)*0.3+hh(floor(p*26.0))*0.2;float bl=hh(floor(vec2(p.x*22.0,p.y*7.0)));float k=0.78+0.42*n;if(bl>0.9)k*=1.16;else if(bl<0.1)k*=0.8;return vec3(k*0.95,k*1.04,k*0.9);}' +   // grass
      'if(m<2.5){vec2 c=fract(p*6.0)-0.5;float r=hh(floor(p*6.0));float k=0.66+0.5*r;if(abs(c.x-c.y*0.3)<0.05)k*=1.14;if(length(c)>0.46)k*=0.82;if(hh(floor(p*3.0)+9.0)>0.93)k*=0.55;return vec3(k*(1.0+0.1*r),k,k*0.84);}' +   // leaf clusters
      'if(m<3.5){bool al=sz.x>=sz.y;float ga=al?p.x:p.y,gc=al?p.y:p.x,sc=al?sz.y:sz.x;float rg=sin(gc*15.0+vn(vec2(gc*2.0,ga*0.6))*6.0)*0.5+0.5;float k=0.8+0.3*rg;if(sc>1.1&&fract(gc/0.6)<0.045)k*=0.58;if(hh(floor(vec2(ga*0.8,gc*1.4)))>0.965)k*=0.7;return vec3(k*1.03,k,k*0.94);}' +   // wood grain and planks
      'if(m<5.5){float rw=floor(p.y/0.5),of=mod(rw,2.0)*0.5;float cl=floor(p.x/1.0+of);float k=0.9+0.2*hh(vec2(cl,rw))+0.06*(hh(floor(p*30.0))-0.5);if(fract(p.y/0.5)<0.07||fract(p.x/1.0+of)<0.05)k*=0.72;return vec3(k);}' +   // stone blocks / paving
      'if(m<6.5){float rw=floor(p.y/0.22),of=mod(rw,2.0)*0.5;float bc=floor(p.x/0.5+of);if(fract(p.y/0.22)<0.13||fract(p.x/0.5+of)<0.07)return vec3(1.28,1.24,1.15);float k=0.84+0.28*hh(vec2(bc,rw));return vec3(k,k*0.97,k*0.95);}' +   // brick
      'if(m<7.5){float k=0.95+0.07*vn(p*2.5)+0.015*sin(p.x*5.0+vn(p)*4.0);if(hh(floor(p*38.0))>0.985)k+=0.12;return vec3(k);}' +   // snow / sand
      'if(m<8.5){float rw=floor(p.y/0.34),of=mod(rw,2.0)*0.5;float k=0.8+0.32*hh(vec2(floor(p.x/0.6+of),rw));if(fract(p.y/0.34)<0.14)k*=0.66;return vec3(k);}' +   // roof tiles
      'if(m<9.5){float k=0.97+0.05*vn(p*8.0);if(fract(p.y/0.28)<0.08)k*=0.8;return vec3(k);}' +   // siding
      'return vec3(0.96+0.07*vn(p*12.0));}' +   // painted
    'void main(){vec3 col=vC;float m=vM.x;' +
      'if(uG>0.5&&m>0.5){float ax=vM.y;vec2 p=ax<0.5?vec2(vU.z,vU.y):ax<1.5?vec2(vU.x,vU.z):vec2(vU.x,vU.y);vec2 sz=ax<0.5?vec2(vS.z,vS.y):ax<1.5?vec2(vS.x,vS.z):vec2(vS.x,vS.y);' +
      'float near=1.0-smoothstep(22.0,60.0,vD);vec3 t=pat(m,p,sz);' +
      'float e=1e5;if(ax>0.5)e=min(e,min(vU.x,vS.x-vU.x));if(ax<0.5||ax>1.5)e=min(e,min(vU.y,vS.y-vU.y));if(ax<1.5)e=min(e,min(vU.z,vS.z-vU.z));if(ax>1.5)e=min(e,min(vU.x,vS.x-vU.x));' +
      'if(m>1.5&&e<0.07)t*=0.86;' +   // worn, darker edges
      'col*=mix(vec3(1.0),t,near);}' +
    'float f=smoothstep(uFog.x,uFog.y,vD);gl_FragColor=vec4(mix(col,uF,f),1.0);}';

  function create(canvas) {
    let gl = null;
    try { gl = canvas.getContext('webgl2', { antialias: true }) || canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) return null;
    if (!gl.drawElements) return null;
    const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    if (!isGL2 && !gl.getExtension('OES_element_index_uint')) return null;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const loc = { p: gl.getAttribLocation(pr, 'aP'), n: gl.getAttribLocation(pr, 'aN'), c: gl.getAttribLocation(pr, 'aC'), m: gl.getUniformLocation(pr, 'uM'), e: gl.getUniformLocation(pr, 'uE'), l: gl.getUniformLocation(pr, 'uL'), f: gl.getUniformLocation(pr, 'uF'), fog: gl.getUniformLocation(pr, 'uFog'), g: gl.getUniformLocation(pr, 'uG'), u: gl.getAttribLocation(pr, 'aU'), s: gl.getAttribLocation(pr, 'aS'), mt: gl.getAttribLocation(pr, 'aM') };
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    const mk = () => ({ vb: gl.createBuffer(), ib: gl.createBuffer(), count: 0 });
    const stat = mk(), dyn = mk();
    function upload(b, m, usage) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.v), usage);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(m.i), usage); b.count = m.i.length;
    }
    function draw(b) {
      if (!b.count) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, b.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.ib);
      gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 68, 0);
      gl.enableVertexAttribArray(loc.n); gl.vertexAttribPointer(loc.n, 3, gl.FLOAT, false, 68, 12);
      gl.enableVertexAttribArray(loc.c); gl.vertexAttribPointer(loc.c, 3, gl.FLOAT, false, 68, 24);
      gl.enableVertexAttribArray(loc.u); gl.vertexAttribPointer(loc.u, 3, gl.FLOAT, false, 68, 36);
      gl.enableVertexAttribArray(loc.s); gl.vertexAttribPointer(loc.s, 3, gl.FLOAT, false, 68, 48);
      gl.enableVertexAttribArray(loc.mt); gl.vertexAttribPointer(loc.mt, 2, gl.FLOAT, false, 68, 60);
      gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_INT, 0);
    }
    const R = {
      gl, sky: [0.6, 0.8, 1], fogNear: 40, fogFar: 130, detail: false,   // detail: draw the per-object surface patterns
      setStatic(m) { upload(stat, m, gl.STATIC_DRAW); },
      resize() {
        const dpr = Math.min(2, root.devicePixelRatio || 1), w = Math.max(2, Math.floor(canvas.clientWidth * dpr)), h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h);
      },
      // cam: { eye:[x,y,z], at:[x,y,z], fov }
      drawFrame(cam, dm) {
        R.resize();
        const s = R.sky;
        gl.clearColor(s[0], s[1], s[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const mvp = mul(persp(cam.fov || 1.0, canvas.width / canvas.height, 0.2, 400), look(cam.eye, cam.at));
        gl.uniformMatrix4fv(loc.m, false, new Float32Array(mvp)); gl.uniform3fv(loc.e, new Float32Array(cam.eye));
        gl.uniform1f(loc.g, R.detail ? 1 : 0); gl.uniform3fv(loc.l, new Float32Array([0.45, 0.85, 0.3])); gl.uniform3fv(loc.f, new Float32Array(s)); gl.uniform2fv(loc.fog, new Float32Array([R.fogNear, R.fogFar]));
        draw(stat);
        if (dm) { upload(dyn, dm, gl.DYNAMIC_DRAW); draw(dyn); }
        R.mvp = mvp;
      },
      // world point -> CSS pixel position (or null when behind the camera)
      project(p) {
        const m = R.mvp; if (!m) return null;
        const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
        if (w <= 0.1) return null;
        return [(x / w * 0.5 + 0.5) * canvas.clientWidth, (1 - (y / w * 0.5 + 0.5)) * canvas.clientHeight, w];
      },
    };
    return R;
  }
  root.H3E = { create, mesh, rgb, shade };
})(window);
