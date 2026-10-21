/*
 * Build-a-Goose panel (the shop tab). BuildAGoose.panel(host, ctx) draws it into `host`.
 * ctx = { save, persist, rich(), snd, toast, rerender(), iconFor(skinId) -> canvas }
 */
(function (root) {
  'use strict';
  const B = root.BuildAGoose;
  const EXAMPLES = ['a long sausage dog with purple stripes and a crown', 'tiny pink jelly duck', 'giraffe with blue spots', 'a green dinosaur with a huge neck', 'black cat wearing sunglasses', 'rainbow table goose'];
  const SLIDERS = [
    ['Body length', (s) => s.shape.w, (s, v) => { s.shape.w = v; }, 'w'],
    ['Body height', (s) => s.shape.h, (s, v) => { s.shape.h = v; }, 'h'],
    ['Leg length', (s) => s.shape.leg, (s, v) => { s.shape.leg = v; }, 'leg'],
    ['Neck length', (s) => s.shape.neck, (s, v) => { s.shape.neck = v; }, 'neck'],
    ['Neck: back ⇄ front', (s) => s.shape.nx, (s, v) => { s.shape.nx = v; }, 'nx'],
    ['Neck: low ⇄ high', (s) => -s.shape.ny, (s, v) => { s.shape.ny = -v; }, 'ny', [-8, 40]],
    ['Neck angle', (s) => s.shape.ang, (s, v) => { s.shape.ang = v; }, 'ang'],
    ['Neck curl', (s) => s.shape.bend, (s, v) => { s.shape.bend = v; }, 'bend'],
    ['Back leg position', (s) => s.shape.hip[0], (s, v) => { s.shape.hip[0] = v; }, null, [-1, -0.15, 0.01]],
    ['Front leg position', (s) => s.shape.hip[1], (s, v) => { s.shape.hip[1] = v; }, null, [0.15, 1, 0.01]],
    ['Head size', (s) => s.headSize, (s, v) => { s.headSize = v; }, null, [0.6, 2, 0.02]],
    ['Leg thickness', (s) => s.legW, (s, v) => { s.legW = v; }, null, [0.5, 2.5, 0.05]],
    ['Tail length', (s) => s.tailLen || 1, (s, v) => { s.tailLen = v; }, null, [0.3, 2.5, 0.05]],
  ];

  function panel(host, ctx) {
    const save = ctx.save;
    if (!Array.isArray(save.custom)) save.custom = [];
    host.innerHTML = '';
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const btn = (label, fn, cls) => { const b = el('button', 'bagbtn' + (cls ? ' ' + cls : ''), label); b.addEventListener('click', () => { fn(); }); return b; };
    const wrap = el('div', 'bag'); host.appendChild(wrap);
    const draft = B.draft;
    const price = B.PRICE;
    const canPay = () => ctx.rich() || save.bread >= price;
    const redraw = () => { if (B.draft) B.setDraft(B.draft.spec); };

    // 1. describe
    wrap.appendChild(el('div', 'bagh', '✨ Describe your goose'));
    const ta = el('textarea'); ta.rows = 2; ta.maxLength = 140; ta.placeholder = 'e.g. ' + EXAMPLES[0]; ta.value = draft ? draft.base : (B.lastPrompt || '');
    ta.addEventListener('input', () => { B.lastPrompt = ta.value; });
    wrap.appendChild(ta);
    const row1 = el('div', 'bagrow');
    const gen = btn(draft ? '✨ New goose from this' : '✨ Generate', () => {
      const t = ta.value.trim() || EXAMPLES[(Math.random() * EXAMPLES.length) | 0];
      const sp = B.generate(t); B.draft = { spec: sp, base: t, seed: sp.seed, editId: null }; B.setDraft(sp); ctx.snd.tick(); ctx.rerender();
    }, 'main');
    row1.appendChild(gen); wrap.appendChild(row1);
    if (!draft) {
      const ex = el('div', 'bagex'); ex.appendChild(el('span', null, 'Try: '));
      for (const t of EXAMPLES.slice(0, 4)) { const c = el('i', 'chip', t); c.addEventListener('click', () => { ta.value = t; B.lastPrompt = t; }); ex.appendChild(c); }
      wrap.appendChild(ex);
      wrap.appendChild(el('div', 'bagnote', 'Colours, patterns, animals, sizes and accessories in your words are used. Generating is free — only saving costs 🍞' + price + '.'));
    }

    // 2. the draft controls
    if (draft) {
      const sp = draft.spec;
      wrap.appendChild(el('div', 'bagh', '🪞 ' + sp.name));
      const row = el('div', 'bagrow');
      row.appendChild(btn('🔄 Try again', () => {
        draft.seed = (draft.seed || 1) + 1 + ((Math.random() * 50) | 0);
        const g = B.generate(draft.base, draft.seed); g.name = sp.name; g.id = sp.id; draft.spec = g; B.setDraft(g); ctx.snd.tick(); ctx.rerender();
      }));
      wrap.appendChild(row);
      const mrow = el('div', 'bagrow');
      const mi = el('input'); mi.type = 'text'; mi.maxLength = 100; mi.placeholder = 'Change it: "make the neck longer", "add a crown", "blue legs"…';
      const apply = () => { const t = mi.value.trim(); if (!t) return; const n = B.modify(draft.spec, t); n.name = sp.name; n.id = sp.id; draft.spec = n; B.setDraft(n); ctx.snd.tick(); ctx.rerender(); };
      mi.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
      mrow.append(mi, btn('✏️ Modify', apply));
      wrap.appendChild(mrow);

      // move parts
      const det = el('details', 'bagdet'); det.open = !!B.partsOpen; det.addEventListener('toggle', () => { B.partsOpen = det.open; });
      det.appendChild(el('summary', null, '🔧 Move the body parts around'));
      for (const [label, get, set, key, rng] of SLIDERS) {
        const lim = rng || B.LIM[key]; const r = el('label', 'bagsl'); r.appendChild(el('span', null, label));
        const inp = el('input'); inp.type = 'range'; inp.min = lim[0]; inp.max = lim[1]; inp.step = lim[2] || (lim[1] - lim[0]) / 100; inp.value = get(sp);
        inp.addEventListener('input', () => { set(draft.spec, +inp.value); draft.spec = B.fix(draft.spec); B.setDraft(draft.spec); });
        r.appendChild(inp); det.appendChild(r);
      }
      const hrow = el('div', 'bagrow');
      for (const [lab, key, vals] of [['Ears', 'ears', [null, 'cat', 'bunny', 'droop', 'big']], ['Head', 'headKind', ['goose', 'duck', 'snout', 'round', 'cat', 'pig', 'box']], ['Feet', 'foot', ['claw', 'paw', 'box', 'hoof', 'none']], ['Tail', 'tail', ['default', 'point', 'long', 'fluff', 'none']]]) {
        const b = btn(lab + ': ' + (sp[key] || 'none'), () => { const i = vals.indexOf(sp[key] == null ? null : sp[key]); draft.spec[key] = vals[(i + 1) % vals.length]; B.setDraft(draft.spec); ctx.snd.tick(); ctx.rerender(); }, 'small');
        hrow.appendChild(b);
      }
      det.appendChild(hrow);
      wrap.appendChild(det);

      // save
      const nrow = el('div', 'bagrow');
      const ni = el('input'); ni.type = 'text'; ni.maxLength = 22; ni.value = sp.name; ni.placeholder = 'Name your goose';
      ni.addEventListener('input', () => { draft.spec.name = ni.value.slice(0, 22) || 'My Goose'; });
      nrow.appendChild(ni); wrap.appendChild(nrow);
      const srow = el('div', 'bagrow');
      const doSave = (asNew) => {
        const s = JSON.parse(JSON.stringify(draft.spec)); s.basePrompt = draft.base;
        if (!asNew && draft.editId) { s.id = draft.editId; const i = save.custom.findIndex((x) => x.id === s.id); if (i >= 0) save.custom[i] = s; }
        else {
          if (!canPay()) { ctx.snd.no(); return; }
          if (!ctx.rich()) save.bread -= price;
          s.id = 'custom_' + Date.now().toString(36); save.custom.push(s);
        }
        B.register(s, s.id); save.skins[s.id] = true; save.skin = s.id; B.draft = null; ctx.persist(); ctx.snd.buy(); ctx.refreshSkins(); ctx.toast('Saved ' + s.name + '!', 1.6); ctx.rerender();
      };
      if (draft.editId) srow.appendChild(btn('💾 Update (free)', () => doSave(false), 'main'));
      const sb = btn(canPay() ? '💾 Save as new · 🍞' + price : 'Need ' + (price - save.bread) + ' more 🍞', () => doSave(true), draft.editId ? '' : 'main'); if (!canPay()) sb.disabled = true;
      srow.appendChild(sb);
      srow.appendChild(btn('✖ Discard', () => { B.draft = null; ctx.snd.tick(); ctx.rerender(); }));
      wrap.appendChild(srow);
    }

    // 3. my geese
    if (save.custom.length) {
      wrap.appendChild(el('div', 'bagh', '🪿 My geese (' + save.custom.length + ')'));
      const grid = el('div', 'baggrid');
      for (const s of save.custom) {
        const t = el('div', 'bagtile' + (save.skin === s.id ? ' on' : ''));
        const ic = el('div', 'ic'); ic.appendChild(ctx.iconFor(s.id)); t.appendChild(ic);
        t.appendChild(el('b', null, s.name));
        const r = el('div', 'bagrow');
        r.appendChild(btn(save.skin === s.id ? 'Wearing' : 'Wear', () => { save.skin = s.id; ctx.persist(); ctx.snd.tick(); ctx.rerender(); }, 'small'));
        r.appendChild(btn('Edit', () => { B.draft = { spec: JSON.parse(JSON.stringify(s)), base: s.basePrompt || s.prompt || s.name, seed: s.seed || 1, editId: s.id }; B.setDraft(B.draft.spec); ctx.snd.tick(); ctx.rerender(); }, 'small'));
        r.appendChild(btn('✕', () => {
          if (!confirm('Delete "' + s.name + '"? You will not get the bread back.')) return;
          save.custom = save.custom.filter((x) => x.id !== s.id); delete save.skins[s.id];
          const i = root.Skins.LIST.findIndex((x) => x.id === s.id); if (i >= 0) root.Skins.LIST.splice(i, 1); delete root.Skins.BY_ID[s.id];
          if (save.skin === s.id) save.skin = 'goose'; ctx.persist(); ctx.refreshSkins(); ctx.rerender();
        }, 'small'));
        t.appendChild(r); grid.appendChild(t);
      }
      wrap.appendChild(grid);
    }
  }

  B.panel = panel;
  if (typeof document !== 'undefined') {
    const st = document.createElement('style');
    st.textContent = `
      .bag { text-align: left; display: flex; flex-direction: column; gap: 6px; max-height: 248px; overflow-y: auto; padding: 2px 4px 2px 2px; font-size: 13px; }
      .bag > * { flex: none; }
      .bag .bagh { font-weight: 800; margin-top: 2px; }
      .bag textarea, .bag input[type=text] { font: inherit; width: 100%; box-sizing: border-box; border: 2px solid var(--ink); border-radius: 10px; padding: 6px 8px; resize: none; background: #fff; color: var(--ink); }
      .bag .bagrow { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
      .bag .bagrow input[type=text] { flex: 1; min-width: 120px; }
      .bag .bagbtn { font: inherit; font-weight: 800; font-size: 13px; padding: 6px 12px; border-radius: 999px; border: 2px solid var(--ink); background: #fff; color: var(--ink); cursor: pointer; }
      .bag .bagbtn.main { background: #ffd23f; }
      .bag .bagbtn.small { font-size: 11px; padding: 3px 8px; }
      .bag .bagbtn:disabled { opacity: .5; cursor: not-allowed; }
      .bag .bagex { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; font-size: 11px; }
      .bag .chip { font-style: normal; border: 2px solid var(--ink); border-radius: 999px; padding: 1px 8px; background: #fff7da; cursor: pointer; }
      .bag .bagnote { font-size: 11px; opacity: .75; }
      .bag details { border: 2px solid var(--ink); border-radius: 10px; padding: 4px 8px; background: #fffdf3; }
      .bag summary { cursor: pointer; font-weight: 800; }
      .bag .bagsl { display: flex; align-items: center; gap: 8px; margin: 3px 0; }
      .bag .bagsl span { width: 120px; flex: none; font-size: 12px; }
      .bag .bagsl input { flex: 1; min-width: 0; }
      .bag .baggrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 6px; }
      .bag .bagtile { border: 2px solid var(--ink); border-radius: 12px; padding: 4px; background: #fff; text-align: center; }
      .bag .bagtile.on { background: #fff1b8; }
      .bag .bagtile .ic canvas { width: 64px; height: 64px; }
      .bag .bagtile b { display: block; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bag .bagtile .bagrow { justify-content: center; gap: 3px; }`;
    document.head.appendChild(st);
  }
})(typeof window !== 'undefined' ? window : globalThis);
