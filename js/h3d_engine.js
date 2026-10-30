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
  function mesh() {
    const m = { v: [], i: [], n: 0 };
    // x/z are the centre, y the BOTTOM; w/h/d the size; ry the turn about the Y axis (radians); col a hex string or [r,g,b]
    m.box = (cx, y0, cz, w, h, d, col, ry) => {
      const c = rgb(col), hw = w / 2, hh = h / 2, hd = d / 2, cy = y0 + hh, co = ry ? Math.cos(ry) : 1, si = ry ? Math.sin(ry) : 0;
      for (const f of FACES) {
        let nx = f[0], nz = f[2]; const ny = f[1];
        if (ry) { const rx = nx * co + nz * si, rz = -nx * si + nz * co; nx = rx; nz = rz; }
        const base = m.n;
        for (let k = 0; k < 4; k++) {
          const s = f[3 + k]; let px = s[0] * hw, pz = s[2] * hd;
          if (ry) { const rx = px * co + pz * si, rz = -px * si + pz * co; px = rx; pz = rz; }
          m.v.push(cx + px, cy + s[1] * hh, cz + pz, nx, ny, nz, c[0], c[1], c[2]);
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
          m.v.push(cx + px, cy + sp * ry, cz + pz, nx, ny / nl, nz, c[0], c[1], c[2]);
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
  const VS = 'attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;uniform mat4 uM;uniform vec3 uE;uniform vec3 uL;uniform vec3 uLC;uniform vec3 uAC;uniform float uT;varying vec3 vC;varying float vD;varying vec3 vP;varying vec3 vSp;varying vec3 vN;' +
    'void main(){vN=aN;gl_Position=uM*vec4(aP,1.0);vec3 L=normalize(uL);float d=max(dot(aN,L),0.0);vec3 lit=uAC*(0.58+0.12*aN.y)+uLC*(0.42*d);' +
    'float ao=mix(0.7,1.0,smoothstep(0.0,1.8,aP.y));if(abs(aN.y)<0.5)lit*=mix(1.0,ao,uT);' +                               // walls and legs darken towards the floor (ambient occlusion)
    'vC=aC*lit;vD=distance(aP,uE);vP=aP;' +
    'vec3 Hh=normalize(L+normalize(uE-aP));vSp=uLC*pow(max(dot(normalize(aN),Hh),0.0),28.0)*0.22*uT;}';          // a soft shine on smooth shapes
  const FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
    'varying vec3 vC;varying float vD;varying vec3 vP;varying vec3 vSp;varying vec3 vN;uniform float uT;uniform float uG;uniform vec3 uF;uniform vec2 uFog;' +
    'float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}' +
    'void main(){vec3 q=floor(vP*3.0);float g=mix(1.0,0.955+0.09*h(q),uT);float big=mix(1.0,0.97+0.06*h(floor(vP*0.35)),uT);' +
    'float up=step(0.7,vN.y);float gr=step(max(vC.r,vC.b)+0.03,vC.g);float near=1.0-smoothstep(25.0,70.0,vD);' +
    'float d=1.0;' +
    'if(up>0.5){d=0.93+0.14*h(vec3(floor(vP.xz*7.0),1.0))+0.08*(h(vec3(floor(vP.xz*1.6),2.0))-0.5);float bl=h(vec3(floor(vec2(vP.x*11.0,vP.z*5.0)),3.0));if(bl>0.86)d*=1.13;else if(bl<0.1)d*=0.86;}' +
    'else if(gr>0.5){float c=h(floor(vP*4.5));d=0.84+0.3*c;float k=h(floor(vP*9.0)+7.0);if(k>0.9)d*=0.68;else if(k<0.07)d*=1.2;}' +
    'else{d=0.95+0.1*h(floor(vP*5.0));}' +
    'd=mix(1.0,d,uG*near);' +
    'vec3 c=vC*g*big*d+vSp;float f=smoothstep(uFog.x,uFog.y,vD);gl_FragColor=vec4(mix(c,uF,f),1.0);}';

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
    const loc = { p: gl.getAttribLocation(pr, 'aP'), n: gl.getAttribLocation(pr, 'aN'), c: gl.getAttribLocation(pr, 'aC'), m: gl.getUniformLocation(pr, 'uM'), e: gl.getUniformLocation(pr, 'uE'), l: gl.getUniformLocation(pr, 'uL'), f: gl.getUniformLocation(pr, 'uF'), fog: gl.getUniformLocation(pr, 'uFog'), lc: gl.getUniformLocation(pr, 'uLC'), ac: gl.getUniformLocation(pr, 'uAC'), tx: gl.getUniformLocation(pr, 'uT'), gx: gl.getUniformLocation(pr, 'uG') };
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
      gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(loc.n); gl.vertexAttribPointer(loc.n, 3, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(loc.c); gl.vertexAttribPointer(loc.c, 3, gl.FLOAT, false, 36, 24);
      gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_INT, 0);
    }
    const R = {
      gl, sky: [0.6, 0.8, 1], fogNear: 40, fogFar: 130,
      texture: true, detail: false, lightDir: [0.45, 0.85, 0.3], lightCol: [1, 1, 1], ambCol: [1, 1, 1],   // the soft light: its direction, colour (x intensity) and the ambient colour (x intensity)
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
        if (R.skyTop) {   // a real sky: deeper at the top, fading to the fog colour at the horizon (a CSS gradient behind the transparent canvas)
          const f = (v) => v.map((q) => Math.round(q * 255)).join(','), key = f(R.skyTop) + '|' + f(s);
          if (R._sk !== key) { R._sk = key; canvas.style.background = 'linear-gradient(rgb(' + f(R.skyTop) + ') 0%, rgb(' + f(s) + ') 56%)'; }
          gl.clearColor(0, 0, 0, 0);
        } else { if (R._sk) { R._sk = ''; canvas.style.background = ''; } gl.clearColor(s[0], s[1], s[2], 1); }
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const mvp = mul(persp(cam.fov || 1.0, canvas.width / canvas.height, 0.2, 400), look(cam.eye, cam.at));
        gl.uniformMatrix4fv(loc.m, false, new Float32Array(mvp)); gl.uniform3fv(loc.e, new Float32Array(cam.eye));
        gl.uniform3fv(loc.l, new Float32Array(R.lightDir)); gl.uniform3fv(loc.lc, new Float32Array(R.lightCol)); gl.uniform3fv(loc.ac, new Float32Array(R.ambCol)); gl.uniform1f(loc.tx, R.texture ? 1 : 0); gl.uniform1f(loc.gx, R.detail ? 1 : 0); gl.uniform3fv(loc.f, new Float32Array(s)); gl.uniform2fv(loc.fog, new Float32Array([R.fogNear, R.fogFar]));
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
