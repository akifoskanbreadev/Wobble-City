/*
 * Battle Tower. You climb a tower floor by floor. Every floor is an arena full of monsters that chase you.
 * Clear them all and a chest (weapon / armor / potion) and a door to the next floor appear. Every 5th floor is a boss.
 * Melee weapons strike from your HEAD (so the wobbly neck is part of the fight). Armor reduces damage.
 */
(function (root) {
  'use strict';
  let api = null;
  const G = 520;
  const rngf = (a) => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const WEAPONS = {
    peck:   { name: 'Beak Peck', icon: '🪿', melee: true, reach: 58, dmg: 9, cd: 0.45, knock: 160 },
    sword:  { name: 'Sword', icon: '🗡️', melee: true, reach: 92, dmg: 20, cd: 0.34, knock: 260 },
    spear:  { name: 'Spear', icon: '🔱', melee: true, reach: 128, dmg: 17, cd: 0.42, knock: 200, line: true },
    hammer: { name: 'War Hammer', icon: '🔨', melee: true, reach: 86, dmg: 44, cd: 0.9, knock: 520, aoe: true },
    bow:    { name: 'Bow', icon: '🏹', melee: false, dmg: 18, cd: 0.5, speed: 980, kind: 'arrow' },
    wand:   { name: 'Fire Wand', icon: '🪄', melee: false, dmg: 26, cd: 0.85, speed: 560, kind: 'fire', blast: 70 },
  };
  const ARMOR = [
    { name: 'No armor', red: 0, col: '#999' }, { name: 'Leather Armor', red: 0.15, col: '#a0713d' }, { name: 'Chain Mail', red: 0.3, col: '#b8c2cf' },
    { name: 'Iron Armor', red: 0.45, col: '#8a94a6' }, { name: 'Golden Armor', red: 0.55, col: '#ffd23f' }, { name: 'Dragon Armor', red: 0.7, col: '#e63946' },
  ];
  const MON = {
    slime:    { name: 'Slime', hp: 26, dmg: 10, spd: 95, r: 22, fly: false },
    bat:      { name: 'Cave Bat', hp: 16, dmg: 8, spd: 160, r: 17, fly: true },
    skeleton: { name: 'Bone Archer', hp: 30, dmg: 9, spd: 70, r: 22, ranged: true },
    wisp:     { name: 'Ember Wisp', hp: 28, dmg: 8, spd: 105, r: 18, fly: true, ranged: true },
    golem:    { name: 'Stone Golem', hp: 120, dmg: 22, spd: 52, r: 36 },
    kslime:   { name: 'KING SLIME', hp: 340, dmg: 20, spd: 90, r: 52, boss: true },
    blord:    { name: 'BONE LORD', hp: 380, dmg: 18, spd: 80, r: 36, ranged: true, boss: true },
    titan:    { name: 'STONE TITAN', hp: 560, dmg: 30, spd: 60, r: 56, boss: true },
    botg:     { name: 'Brawler Bot', hp: 62, dmg: 12, spd: 150, r: 24, bot: true },
    bota:     { name: 'Archer Bot', hp: 46, dmg: 9, spd: 110, r: 22, ranged: true, bot: true },
  };
  const MK = ['slime', 'bat', 'skeleton', 'wisp', 'golem', 'kslime', 'blord', 'titan', 'botg', 'bota'], PK = ['bone', 'fire', 'arrow', 'wave'];
  const BOTCOLS = ['#e0524a', '#4a8fe0', '#e0b84a', '#7ad04a', '#b44ae0', '#4ad0c0'];
  const r1 = (n) => Math.round(n * 10) / 10;
  const THEME_BY_FLOOR = (n) => (n % 5 === 0 ? 'lava' : ['dungeon', 'dungeon', 'night', 'snow'][(n - 1) % 4]);

  const S = { on: false, floor: 0, hp: 100, maxHp: 100, armor: 0, weapon: 'peck', cd: 0, inv: 0, mons: [], proj: [], items: [], fx: [], texts: [], chest: null, door: null, cleared: false, over: false, kills: 0, t: 0, swing: 0, rng: null, bossName: '', toastT: 0 };
  Object.assign(S, { kind: 'tower', net: null, myId: 0, down: false, pst: {}, rInv: {}, mid: 1, score: {}, tLeft: 0, botQ: [], lastBy: -1, respT: 0, snapT: 0, stT: 0, itemT: 0, doorT: 0, pickT: 0, deaths: 0, W: 2000 });
  const MPX = () => root.MP || {};
  const netOn = () => !!S.net, isHost = () => !S.net || S.net.host;
  const send = (d) => { if (S.net && MPX().bsend) MPX().bsend(d); }, bc = (d) => { if (S.net && S.net.host && MPX().ball) MPX().ball(d); }, toId = (id, d) => { if (S.net && S.net.host && MPX().bto) MPX().bto(id, d); };
  const peers = () => (S.net && MPX().peers ? MPX().peers() : []);

  // ---------------------------------------------------------------- floors
  function floorLevel(n) {
    const R = rngf(555 + n * 97), W = Math.min(2500, 1800 + n * 60);
    const plats = [];
    const cnt = 3 + Math.min(3, Math.floor(n / 3));
    for (let i = 0; i < cnt; i++) plats.push([300 + i * ((W - 600) / cnt) + R() * 80, 300 + R() * 130, 150 + R() * 100]);
    const pads = n >= 3 ? [[W * 0.5, G, 70]] : [];
    return {
      name: 'Tower · Floor ' + n, hint: '', theme: THEME_BY_FLOOR(n), spawn: [220, G - 45], deathY: 1500, battle: true, W,
      terrain: [{ pts: [[-120, G], [W + 120, G]] }],
      solids: [[-120, -700, 120, 1600], [W, -700, 120, 1600]].concat(plats.map((p) => [p[0], p[1], p[2], 18])),
      water: [], hazards: [], pads, movers: [], checkpoints: [], bread: [], egg: [-9999, -9999],
    };
  }
  function addMon(kind, x, y, scale) {
    const d = MON[kind], hp = Math.round(d.hp * scale);
    S.mons.push({ kind, x, y, vx: 0, vy: 0, hp, max: hp, t: Math.random() * 3, cd: 1 + Math.random() * 1.5, hop: Math.random() * 1.2, flash: 0, face: -1, id: S.mid++ });
  }
  function spawnFloor(n, W) {
    const R = rngf(900 + n * 31), scale = 1 + 0.14 * (n - 1);
    S.mons = []; S.proj = []; S.items = []; S.chest = null; S.door = null; S.cleared = false; S.fx = [];
    if (S.net && !S.net.host) { S.bossName = n % 5 === 0 ? 'BOSS' : ''; return; }
    const np = S.net ? S.net.ids.length : 1, party = 1 + 0.5 * (np - 1);
    const boss = n % 5 === 0;
    if (boss) {
      const kinds = ['kslime', 'blord', 'titan'], bk = kinds[((n / 5) - 1) % 3];
      addMon(bk, W - 420, G - MON[bk].r, (1 + 0.12 * (n / 5 - 1)) * (1 + 0.6 * (np - 1))); S.bossName = MON[bk].name;
      for (let i = 0; i < Math.min(4, 1 + Math.floor(n / 5)); i++) addMon('bat', 700 + i * 200, 250, scale);
    } else {
      S.bossName = '';
      const kinds = ['slime']; if (n >= 2) kinds.push('bat', 'slime'); if (n >= 3) kinds.push('skeleton'); if (n >= 5) kinds.push('wisp'); if (n >= 6) kinds.push('golem');
      const count = Math.round(Math.min(9, 2 + Math.floor(n * 0.9)) * party);
      for (let i = 0; i < count; i++) { const k = kinds[Math.floor(R() * kinds.length)], d = MON[k]; addMon(k, 600 + R() * (W - 900), d.fly ? 200 + R() * 150 : G - d.r, scale); }
    }
    if (n === 1 && !S.net) { [['sword', 420], ['bow', 540], ['wand', 660]].forEach(([id, x]) => S.items.push({ kind: 'weapon', id, x, y: G - 34 })); }
  }

  function start() {
    Object.assign(S, { kind: 'tower', net: null, down: false, pst: {}, rInv: {}, mid: 1, score: {}, botQ: [], respT: 0, myId: 0, on: true, floor: 1, hp: 100, maxHp: 100, armor: 0, weapon: 'peck', cd: 0, inv: 0, over: false, kills: 0, t: 0, swing: 0, texts: [] });
    api.setMode(true); buildHud(); loadFloor();
    api.toast('Floor 1. Pick a weapon from the pedestals, then clear the room! (F / ⚔ to attack)', 5);
  }
  function loadFloor() {
    const lv = floorLevel(S.floor);
    api.startCustom(lv); S.lv = lv; S.W = lv.W;
    spawnFloor(S.floor, lv.W);
    if (S.down) { S.down = false; S.hp = Math.max(S.hp, S.maxHp * 0.5); }
    S.cd = 0; S.inv = 1; S.doorT = 1; hud(); stSend(true);
    if (S.floor % 5 === 0) api.toast('⚠ BOSS FLOOR: ' + S.bossName + '!', 3);
    else if (S.floor > 1) api.toast('Floor ' + S.floor, 2);
  }
  function startNet(o) {
    Object.assign(S, { on: true, kind: o.kind, net: { host: !!o.host, ids: o.ids.slice(), seed: o.seed }, myId: o.myId, floor: 1, hp: 100, maxHp: 100, armor: 0, weapon: 'peck', cd: 0, inv: 1, over: false, kills: 0, t: 0, swing: 0, texts: [], down: false, pst: {}, rInv: {}, mid: 1, score: {}, tLeft: o.kind === 'brawl' ? 150 : 0, botQ: [], mons: [], proj: [], items: [], fx: [], chest: null, door: null, cleared: false, itemT: 5, deaths: 0, respT: 0, bossName: '' });
    api.setMode(true); buildHud(); const ov = document.getElementById('bOver'); if (ov) ov.classList.add('hidden');
    if (o.kind === 'coop') loadFloor(); else { S.lv = o.lv; S.W = o.lv.W; if (S.net.host) spawnBrawl(); hud(); }
  }
  function startBrawl() {
    const MP = MPX(); if (!MP.arenaLevel) return; const lv = MP.arenaLevel('brawl', (Math.random() * 4) | 0, 0, 1);
    api.startCustom(lv);
    Object.assign(S, { on: true, kind: 'brawl', net: null, myId: 0, floor: 1, hp: 100, maxHp: 100, armor: 0, weapon: 'peck', cd: 0, inv: 1, over: false, kills: 0, t: 0, swing: 0, texts: [], down: false, pst: {}, rInv: {}, mid: 1, score: { 0: 0 }, tLeft: 150, botQ: [], mons: [], proj: [], items: [], fx: [], chest: null, door: null, cleared: false, itemT: 5, deaths: 0, respT: 0, bossName: '', lv, W: lv.W });
    S.W = lv.W; api.setMode(true); buildHud(); spawnBrawl(); hud(); api.toast('Battle Arena! First to 8 knockouts wins. Grab crates for weapons. (F / ⚔ to attack)', 5);
  }
  function stop() { if (!S.on) return; S.net = null; S.kind = 'tower'; S.on = false; api.setMode(false); const h = document.getElementById('bHud'); if (h) h.style.display = 'none'; const o = document.getElementById('bOver'); if (o) o.classList.add('hidden'); }

  // ---------------------------------------------------------------- player actions
  const head = () => api.goose().head;
  function attack() {
    if (!S.on || S.over || S.cd > 0 || S.down) return;
    const w = WEAPONS[S.weapon], g = api.goose(), h = head(), f = g.facing;
    S.cd = w.cd; S.swing = 0.22; api.sfx('flap');
    if (w.melee) {
      let hit = 0;
      for (const m of S.mons) {
        const d = MON[m.kind], dx = m.x - h.x, dy = m.y - h.y, dist = Math.hypot(dx, dy);
        const inReach = dist < w.reach + d.r, front = w.aoe || dx * f > -d.r * 0.5;
        if (!inReach || !front) continue;
        if (w.line && Math.abs(dy) > 46 + d.r) continue;
        damage(m, w.dmg, (dx >= 0 ? 1 : -1) * w.knock, -w.knock * 0.3); hit++;
      }
      if (S.kind === 'brawl') for (const pr of peers()) { const ps = S.pst[pr.id]; if (ps && ps.dead) continue; const dx = pr.c[0] - h.x, dy = pr.c[1] - h.y; if (Math.hypot(dx, dy) < w.reach + 34 && (w.aoe || dx * f > -20) && (!w.line || Math.abs(dy) < 60)) { pvp(pr.id, w.dmg * 0.85, h.x); hit++; } }
      S.fx.push({ k: 'slash', x: h.x, y: h.y, f, t: 0, w: S.weapon, big: !!w.aoe });
      if (hit) api.sfx('boing');
    } else {
      const a = api.aim(); let dx = f, dy = 0; if (a) { dx = a.x; dy = a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; }
      S.proj.push({ own: true, kind: w.kind, x: h.x, y: h.y, vx: dx * w.speed, vy: dy * w.speed, dmg: w.dmg, life: 1.6, blast: w.blast || 0 });
    }
  }
  function damage(m, amt, kx, ky, by) {
    if (S.net && !S.net.host) { m.flash = 0.12; S.texts.push({ x: m.x, y: m.y - MON[m.kind].r - 10, t: 0, s: '-' + Math.round(amt), c: '#fff' }); send({ t: 'hit', id: m.id, amt, kx, ky, by: S.myId }); return; }
    m.lastBy = by == null ? S.myId : by;
    m.hp -= amt; m.flash = 0.12; m.vx += kx * 0.5 / (MON[m.kind].boss ? 4 : 1); if (!MON[m.kind].fly) m.vy = Math.min(m.vy, -120 + (ky || 0)); else m.vy += ky || 0;
    S.texts.push({ x: m.x, y: m.y - MON[m.kind].r - 10, t: 0, s: '-' + Math.round(amt), c: '#fff' });
    if (m.hp <= 0) kill(m);
  }
  function kill(m) {
    const i = S.mons.indexOf(m); if (i < 0) return; S.mons.splice(i, 1); S.kills++;
    if (S.kind === 'brawl') { if (MON[m.kind].bot) { if (m.lastBy != null && m.lastBy >= 0) S.score[m.lastBy] = (S.score[m.lastBy] || 0) + 1; S.botQ.push({ t: 4, i: m.bi || 0 }); } }
    else if (S.net) bc({ t: 'kill', x: Math.round(m.x), y: Math.round(m.y), b: MON[m.kind].boss ? 1 : 0 });
    for (let k = 0; k < 8; k++) S.fx.push({ k: 'puff', x: m.x, y: m.y, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 200, t: 0, c: m.kind === 'slime' ? '#7ed957' : '#cfc6e8' });
    if (S.kind !== 'brawl' && Math.random() < (MON[m.kind].boss ? 1 : 0.28)) S.items.push({ kind: 'heart', x: m.x, y: Math.min(m.y, G - 24) });
    if (m.kind === 'kslime') { for (let k = 0; k < 3; k++) addMon('slime', m.x + (k - 1) * 40, G - 22, 1); }
    if (S.kind !== 'brawl' && !S.mons.length && !S.cleared) cleared();
  }
  function cleared() {
    S.cleared = true; const W = S.lv.W;
    S.chest = { x: W * 0.55, y: G, open: false };
    S.door = { x: W - 110, y: G };
    api.toast(S.floor % 5 === 0 ? '👑 Boss defeated! Open the chest, then take the door.' : '✅ Floor cleared! Open the chest, then take the door ⬆', 3.5);
    S.hp = Math.min(S.maxHp, S.hp + 15); api.sfx('egg');
    if (S.net && S.net.host) bc({ t: 'cleared' });
    if (S.down && S.kind === 'coop') { S.down = false; S.hp = S.maxHp * 0.5; S.inv = 2; api.toast('Your team cleared the floor: you are back up!', 3); stSend(true); }
  }
  function openChest() {
    S.chest.open = true; api.sfx('bread');
    const r = Math.random(), n = S.floor;
    if (r < 0.5) { const ws = ['sword', 'spear', 'hammer', 'bow', 'wand']; const id = ws[Math.floor(Math.random() * ws.length)]; S.weapon = id; api.toast('You found: ' + WEAPONS[id].icon + ' ' + WEAPONS[id].name + '!', 3); }
    else if (r < 0.85) { const tier = Math.min(5, Math.max(S.armor + 1, 1 + Math.floor(n / 3) + (Math.random() < 0.3 ? 1 : 0))); if (tier > S.armor) { S.armor = tier; api.toast('You found: 🛡 ' + ARMOR[tier].name + ' (' + Math.round(ARMOR[tier].red * 100) + '% less damage)', 3.5); } else { S.hp = S.maxHp; api.toast('Healing potion! Full health.', 2.5); } }
    else { S.hp = S.maxHp; S.maxHp += 10; S.hp = S.maxHp; api.toast('Heart crystal! Max health +10 and a full heal.', 3); }
    hud();
  }
  function hurt(amt, srcX, by) {
    if (S.inv > 0 || S.over || S.down) return;
    S.lastBy = by == null ? -1 : by;
    const eff = Math.max(1, Math.round(amt * (1 - ARMOR[S.armor].red)));
    S.hp -= eff; S.inv = 0.9; api.sfx('ouch');
    const g = api.goose(), c = g.center(), dir = c.x < srcX ? -1 : 1;
    for (const q of g.body.concat(g.feet)) { q.vx += dir * 380; q.vy = Math.min(q.vy, -260); }
    S.texts.push({ x: c.x, y: c.y - 50, t: 0, s: '-' + eff, c: '#ff6b6b' });
    if (S.hp <= 0) { if (S.kind === 'tower') gameOver(); else playerDown(); } hud();
  }
  function gameOver() {
    S.over = true;
    const reward = Math.round(((S.floor - 1) * 12 + S.kills) * api.diffMult());
    api.award(reward);
    const sv = api.save(); const prev = sv.towerBest | 0; const nb = S.floor > prev; if (nb) { sv.towerBest = S.floor; api.persist(); }
    document.getElementById('bOverTitle').textContent = 'You fell on floor ' + S.floor;
    document.getElementById('bOverText').textContent = 'Monsters beaten: ' + S.kills + '\n+' + reward + ' 🍞\n' + (nb ? '🏆 New best floor!' : 'Best floor: ' + prev);
    document.getElementById('bOver').classList.remove('hidden');
  }

  // ---------------------------------------------------------------- simulation

  // ---------------------------------------------------------------- arena / co-op helpers
  const SPAWNX = () => 260 + Math.random() * Math.max(100, S.W - 520);
  function targets() {
    const g = api.goose(), c = g.center(), t = [];
    if (!S.down) t.push({ id: S.myId, x: c.x, y: c.y, me: true });
    for (const pr of peers()) { const ps = S.pst[pr.id]; if (ps && ps.dead) continue; t.push({ id: pr.id, x: pr.c[0], y: pr.c[1] }); }
    return t;
  }
  function nearestT(m, tg) { let b = null, bd = 1e9; for (const t of tg) { const d = Math.hypot(t.x - m.x, t.y - m.y); if (d < bd) { bd = d; b = t; } } return b; }
  function remoteHurt(id, amt, srcX) { if ((S.rInv[id] || 0) > 0) return; S.rInv[id] = 0.9; toId(id, { t: 'hurt', amt, sx: Math.round(srcX) }); }
  function pvp(to, amt, srcX) {
    if (!S.net || to === S.myId) return; const d = { t: 'pvp', to, amt: Math.round(amt), sx: Math.round(srcX), from: S.myId };
    if (S.net.host) { if (to === 0) onNet(0, d); else toId(to, d); } else send(d);
    S.texts.push({ x: srcX, y: api.goose().center().y - 60, t: 0, s: '⚔', c: '#fff' });
  }
  function addBot(i) { const kind = i % 3 === 2 ? 'bota' : 'botg'; addMon(kind, SPAWNX(), G - MON[kind].r - 4, 1); const m = S.mons[S.mons.length - 1]; m.col = BOTCOLS[i % BOTCOLS.length]; m.bi = i; m.name = 'Bot ' + (i + 1); m.lastBy = -1; }
  function spawnBrawl() { const np = S.net ? S.net.ids.length : 1, nb = S.net ? Math.max(2, 6 - np) : 4; for (let i = 0; i < nb; i++) addBot(i); }
  function spawnCrate() {
    const pl = (S.lv.solids || []).filter((q) => q[3] === 18); let x, y;
    if (pl.length && Math.random() < 0.65) { const q = pl[(Math.random() * pl.length) | 0]; x = q[0] + q[2] / 2; y = q[1] - 30; } else { x = SPAWNX(); y = G - 30; }
    if (Math.random() < 0.3) S.items.push({ id: S.mid++, kind: 'heart', x, y }); else { const ws = ['sword', 'spear', 'hammer', 'bow', 'wand']; S.items.push({ id: S.mid++, kind: 'crate', w: ws[(Math.random() * ws.length) | 0], x, y }); }
  }
  function equipW(id) { S.weapon = id; api.toast('Equipped ' + WEAPONS[id].icon + ' ' + WEAPONS[id].name + '!', 2); api.sfx('bread'); hud(); stSend(true); }
  function takeItem(id, who) {
    const i = S.items.findIndex((x) => x.id === id); if (i < 0) return; const it = S.items.splice(i, 1)[0];
    if (it.kind === 'crate') { if (who === S.myId) equipW(it.w); else toId(who, { t: 'gave', w: it.w }); }
    else { if (who === S.myId) { S.hp = Math.min(S.maxHp, S.hp + 30); api.sfx('bread'); hud(); stSend(true); } else toId(who, { t: 'gave', heal: 30 }); }
  }
  function stSend() { if (!S.net) return; S.stT = 0; send({ t: 'st', hp: Math.max(0, Math.round(S.hp)), mx: S.maxHp, w: S.weapon, dead: S.down ? 1 : 0 }); }
  function playerDown() {
    S.hp = 0; S.deaths++; S.down = true; api.sfx('ouch');
    if (S.kind === 'brawl') { S.respT = 3; api.toast('Knocked out! Back in 3 seconds…', 2.5); if (S.net) send({ t: 'died', by: S.lastBy }); }
    else { api.toast('You are down! Your team can bring you back by clearing the floor.', 4); if (S.net) send({ t: 'down' }); }
    stSend(); checkAllDown(); hud();
  }
  function respawn() { const g = api.goose(); g.reset(SPAWNX(), G - 45); S.down = false; S.hp = S.maxHp; S.inv = 2; S.weapon = 'peck'; S.cd = 0; stSend(); hud(); }
  function checkAllDown() {
    if (S.kind !== 'coop' || !S.net || !S.net.host || S.over) return;
    const everyone = S.net.ids.every((id) => (id === S.myId ? S.down : S.pst[id] && S.pst[id].dead)); if (everyone) coopOver();
  }
  const rewardFor = (f, k) => Math.round(((f - 1) * 12 + k) * api.diffMult());
  function coopOver() {
    S.over = true; const reward = rewardFor(S.floor, S.kills); api.award(reward);
    const sv = api.save(); if (S.floor > (sv.towerBest | 0)) { sv.towerBest = S.floor; api.persist(); }
    bc({ t: 'over', f: S.floor, k: S.kills });
    if (MPX().finish) MPX().finish([], 'Your team reached floor ' + S.floor + '.\nMonsters beaten (host count): ' + S.kills + '\n+' + reward + ' 🍞');
  }
  function nextFloor() { S.floor++; S.hp = Math.min(S.maxHp, S.hp + 10); bc({ t: 'floor', n: S.floor }); loadFloor(); }
  function showOver(title, text) { const t = document.getElementById('bOverTitle'); if (!t) return; t.textContent = title; document.getElementById('bOverText').textContent = text; document.getElementById('bOver').classList.remove('hidden'); }
  function brawlHost(dt) {
    S.tLeft -= dt;
    for (let i = S.botQ.length - 1; i >= 0; i--) { S.botQ[i].t -= dt; if (S.botQ[i].t <= 0) { addBot(S.botQ[i].i); S.botQ.splice(i, 1); } }
    S.itemT -= dt; if (S.itemT <= 0 && S.items.length < 4) { S.itemT = 8; spawnCrate(); }
    const ids = S.net ? S.net.ids : [0]; const best = Math.max(0, ...ids.map((id) => S.score[id] || 0));
    if (best >= 8 || S.tLeft <= 0) endBrawl();
  }
  function endBrawl() {
    if (S.over) return; S.over = true; const ids = S.net ? S.net.ids : [0], best = Math.max(0, ...ids.map((id) => S.score[id] || 0)), winners = best > 0 ? ids.filter((id) => (S.score[id] || 0) === best) : [];
    const text = 'Knockouts: ' + ids.map((id) => (id === S.myId ? 'You' : 'P' + (id + 1)) + ' ' + (S.score[id] || 0)).join('  ·  ');
    if (S.net) { if (MPX().finish) MPX().finish(winners, text); }
    else { const win = winners.includes(0), gain = Math.round((win ? 40 : 10) + best * 3); api.award(gain); showOver(win ? 'You win! 🏆' : 'Time is up', text + '\nBots beaten: ' + S.kills + '\n+' + gain + ' 🍞'); }
  }
  function hostSnap(dt) {
    S.snapT -= dt; if (S.snapT > 0) return; S.snapT = 0.1;
    const d = {
      t: 's', f: S.floor, cl: S.cleared ? 1 : 0, bn: S.bossName, tl: Math.round(S.tLeft), sc: S.score,
      m: S.mons.map((m) => [m.id, MK.indexOf(m.kind), Math.round(m.x), Math.round(m.y), Math.ceil(m.hp), m.max, m.face, m.flash > 0 ? 1 : 0, m.bi == null ? -1 : m.bi]),
      p: S.proj.filter((p) => !p.own).map((p) => [PK.indexOf(p.kind), Math.round(p.x), Math.round(p.y), Math.round(p.vx), Math.round(p.vy)]),
      ps: { [S.myId]: [Math.max(0, Math.round(S.hp)), S.maxHp, S.down ? 1 : 0, S.weapon] },
      it: S.kind === 'brawl' ? S.items.map((i) => [i.id, i.kind === 'crate' ? 1 : 2, i.w || '', Math.round(i.x), Math.round(i.y)]) : null,
    };
    for (const id in S.pst) d.ps[id] = [S.pst[id].hp, S.pst[id].mx, S.pst[id].dead ? 1 : 0, S.pst[id].w];
    bc(d);
  }
  function applySnap(d) {
    if (d.f !== S.floor && S.kind === 'coop') return;           // a floor change message is on its way
    if (d.cl && !S.cleared && S.kind === 'coop') cleared();
    S.bossName = d.bn || ''; S.tLeft = d.tl; S.score = d.sc || {};
    const old = new Map(S.mons.map((m) => [m.id, m]));
    S.mons = d.m.map((a) => { let m = old.get(a[0]); if (!m) m = { id: a[0], kind: MK[a[1]], x: a[2], y: a[3], vx: 0, vy: 0, t: 0, face: a[6], flash: 0, hop: 0, cd: 0 }; m.tx = a[2]; m.ty = a[3]; m.hp = a[4]; m.max = a[5]; m.face = a[6]; if (a[7]) m.flash = 0.1; if (a[8] >= 0) { m.bi = a[8]; m.col = BOTCOLS[a[8] % BOTCOLS.length]; m.name = 'Bot ' + (a[8] + 1); } return m; });
    S.proj = S.proj.filter((p) => p.own).concat(d.p.map((a) => ({ own: false, kind: PK[a[0]], x: a[1], y: a[2], vx: a[3], vy: a[4], life: 3 })));
    S.pst = {}; for (const id in d.ps) if (+id !== S.myId) S.pst[id] = { hp: d.ps[id][0], mx: d.ps[id][1], dead: !!d.ps[id][2], w: d.ps[id][3] };
    if (d.it) S.items = d.it.map((a) => ({ id: a[0], kind: a[1] === 1 ? 'crate' : 'heart', w: a[2], x: a[3], y: a[4] }));
  }
  function clientSim(dt) {
    for (const m of S.mons) { if (m.tx != null) { const k = Math.min(1, dt * 14); m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; } m.flash = Math.max(0, m.flash - dt); m.t += dt; }
    for (const p of S.proj) if (!p.own) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'arrow') p.vy += 260 * dt; else if (p.kind === 'bone') p.vy += 500 * dt; }
  }
  function onNet(from, d) {
    if (!d || !S.on) return;
    const host = S.net && S.net.host;
    switch (d.t) {
      case 's': if (!host) applySnap(d); break;
      case 'st': if (host) S.pst[from] = { hp: d.hp, mx: d.mx, dead: !!d.dead, w: d.w }; if (host && d.dead) checkAllDown(); break;
      case 'hit': if (host) { const m = S.mons.find((x) => x.id === d.id); if (m) damage(m, Math.min(80, +d.amt || 0), +d.kx || 0, +d.ky || 0, from); } break;
      case 'pvp': if (d.to === S.myId) { if (S.kind === 'brawl' && !S.over) hurt(Math.min(60, +d.amt || 0), +d.sx || 0, d.from); } else if (host) toId(d.to, d); break;
      case 'hurt': hurt(+d.amt || 0, +d.sx || 0, -1); break;
      case 'died': if (host && S.kind === 'brawl') { if (d.by >= 0 && d.by !== from) S.score[d.by] = (S.score[d.by] || 0) + 1; S.pst[from] = Object.assign(S.pst[from] || { mx: 100, hp: 0 }, { dead: true }); } break;
      case 'down': if (host) { S.pst[from] = Object.assign(S.pst[from] || { mx: 100 }, { hp: 0, dead: true }); checkAllDown(); } break;
      case 'door': if (host && S.cleared && S.kind === 'coop') nextFloor(); break;
      case 'pick': if (host) takeItem(d.id, from); break;
      case 'gave': if (d.w) equipW(d.w); else if (d.heal) { S.hp = Math.min(S.maxHp, S.hp + d.heal); api.sfx('bread'); hud(); stSend(); } break;
      case 'floor': if (!host) { S.floor = d.n; S.hp = Math.min(S.maxHp, S.hp + 10); loadFloor(); } break;
      case 'cleared': if (!host && !S.cleared) cleared(); break;
      case 'kill': if (!host && Math.random() < (d.b ? 1 : 0.28)) S.items.push({ kind: 'heart', x: d.x, y: Math.min(d.y, G - 24) }); break;
      case 'over': if (!host) { S.over = true; api.award(rewardFor(d.f, d.k)); } break;
      default: break;
    }
  }
  function banner() {
    if (!S.on || !S.net) return '';
    if (S.kind === 'brawl') { const ids = S.net.ids; return '⚔ Arena · ' + Math.max(0, Math.ceil(S.tLeft)) + 's · ' + ids.map((id) => (id === S.myId ? 'You' : 'P' + (id + 1)) + ' ' + (S.score[id] || 0)).join(' · ') + ' (first to 8)'; }
    return '🗼 Co-op Tower · Floor ' + S.floor + (S.cleared ? ' cleared!' : ' · ' + S.mons.length + ' left') + (S.down ? ' · YOU ARE DOWN' : '');
  }
  const frozenB = () => !!(S.on && S.down && S.kind !== 'tower');

  // ---------------------------------------------------------------- simulation
  function tick(goose, dt) {
    if (!S.on || S.over) return;
    if (S.net && MPX().frozen && MPX().frozen()) return;
    S.t += dt; S.cd = Math.max(0, S.cd - dt); S.inv = Math.max(0, S.inv - dt); S.swing = Math.max(0, S.swing - dt); S.doorT -= dt; S.pickT -= dt;
    for (const k in S.rInv) S.rInv[k] -= dt;
    const c = goose.center(), px = c.x, py = c.y;
    const parts = goose.body.concat(goose.feet);
    // fell out of the world
    if (py > 1300) { goose.reset(S.kind === 'tower' || S.kind === 'coop' ? 220 : SPAWNX(), G - 45); hurt(10, px, -1); }
    if (S.down && S.kind === 'brawl') { S.respT -= dt; if (S.respT <= 0) respawn(); }
    if (S.net) { S.stT += dt; if (S.stT > 0.25) stSend(); }
    const host = isHost(), tg = host ? targets(goose) : [];
    if (S.kind === 'brawl' && host) brawlHost(dt);
    if (!host) clientSim(dt);
    // monsters (host / solo only: guests only see them)
    if (host) for (const m of S.mons) {
      const d = MON[m.kind]; m.t += dt; m.cd -= dt; m.flash = Math.max(0, m.flash - dt);
      const T = nearestT(m, tg); if (!T) continue; const px = T.x, py = T.y;
      const dx = px - m.x, dir = dx >= 0 ? 1 : -1; m.face = dir;
      if (m.kind === 'slime' || m.kind === 'kslime') {
        m.hop -= dt; m.vy += 1400 * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 0.985;
        const gy = G - d.r; if (m.y >= gy) { m.y = gy; m.vy = 0; m.vx *= 0.8; if (m.hop <= 0) { m.hop = m.kind === 'kslime' ? 1.6 : 1.0 + Math.random() * 0.5; m.vy = m.kind === 'kslime' ? -820 : -560; m.vx = dir * d.spd * (m.kind === 'kslime' ? 2.4 : 2.2); if (m.kind === 'kslime' && Math.random() < 0.45 && S.mons.length < 12) addMon('slime', m.x, G - 22, 1); } }
      } else if (m.kind === 'golem' || m.kind === 'titan') {
        m.x += (Math.abs(dx) > 40 ? dir : 0) * d.spd * dt + m.vx * dt; m.vx *= 0.9; m.y = G - d.r;
        if (m.kind === 'titan' && m.cd <= 0) { m.cd = 2.6; for (const s of [-1, 1]) S.proj.push({ own: false, kind: 'wave', x: m.x, y: G - 14, vx: s * 360, vy: 0, dmg: 16, life: 2.4 }); api.sfx('ouch'); }
      } else if (m.kind === 'bat') {
        const tx = px + Math.sin(m.t * 1.7 + m.id) * 140, ty = py - 70 + Math.sin(m.t * 3.1) * 50;
        m.vx += (tx - m.x) * 3 * dt; m.vy += (ty - m.y) * 3 * dt; m.vx *= 0.96; m.vy *= 0.96; const sp = Math.hypot(m.vx, m.vy); if (sp > d.spd * 1.6) { m.vx *= d.spd * 1.6 / sp; m.vy *= d.spd * 1.6 / sp; } m.x += m.vx * dt; m.y += m.vy * dt;
      } else if (m.kind === 'skeleton' || m.kind === 'blord') {
        const want = m.kind === 'blord' ? 380 : 300, ad = Math.abs(dx);
        m.x += (ad > want + 40 ? dir : ad < want - 80 ? -dir : 0) * d.spd * dt + m.vx * dt; m.vx *= 0.9; m.y = G - d.r;
        if (m.cd <= 0) { m.cd = m.kind === 'blord' ? 1.8 : 2.3; const n = m.kind === 'blord' ? 3 : 1; for (let i = 0; i < n; i++) { const ang = Math.atan2(py - m.y, dx) + (i - (n - 1) / 2) * 0.28, sp = 420; S.proj.push({ own: false, kind: 'bone', x: m.x, y: m.y - 10, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60, dmg: d.dmg, life: 3 }); } }
      } else if (m.kind === 'wisp') {
        const tx = px - dir * 260, ty = G - 170 + Math.sin(m.t) * 40; m.vx += (tx - m.x) * 1.6 * dt; m.vy += (ty - m.y) * 2 * dt; m.vx *= 0.96; m.vy *= 0.96; m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.cd <= 0) { m.cd = 3; S.proj.push({ own: false, kind: 'fire', x: m.x, y: m.y, vx: dir * 160, vy: 0, dmg: d.dmg + 4, life: 5, home: true }); }
      }
      if (m.kind === 'botg' || m.kind === 'bota') {
        m.vy += 1500 * dt; m.y += m.vy * dt; m.x += m.vx * dt; m.vx *= 0.9; const gy = G - d.r - 2; if (m.y >= gy) { m.y = gy; m.vy = 0; }
        const ad = Math.abs(dx), want = m.kind === 'bota' ? 330 : 38;
        const sp = d.spd * (m.kind === 'botg' ? 1 : 0.9);
        if (m.kind === 'botg') { if (ad > want) m.x += dir * sp * dt; }
        else { if (ad > want + 60) m.x += dir * sp * dt; else if (ad < want - 90) m.x -= dir * sp * dt; }
        m.hop -= dt; if (m.y >= gy - 1 && m.hop <= 0 && ((py < m.y - 90 && ad < 360) || Math.random() < dt * 0.25)) { m.vy = -760; m.hop = 0.8 + Math.random() * 0.8; }
        if (m.kind === 'bota' && m.cd <= 0) { m.cd = 1.7 + Math.random() * 0.8; const ang = Math.atan2(py - m.y - 40, dx); S.proj.push({ own: false, kind: 'arrow', x: m.x, y: m.y - 8, vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620 - 90, dmg: d.dmg, life: 1.8 }); }
      }
      m.x = Math.max(40, Math.min(S.lv.W - 40, m.x));
      // touching the goose
      if (m.kind !== 'bota' || Math.abs(dx) < 70) for (const T2 of tg) { if (T2.me) { for (const q of parts) { if (Math.hypot(q.x - m.x, q.y - m.y) < d.r + q.r * 0.9) { hurt(d.dmg, m.x, -1); break; } } } else if (Math.hypot(T2.x - m.x, T2.y - m.y) < d.r + 36) remoteHurt(T2.id, d.dmg, m.x); }
    }
    // projectiles
    for (let i = S.proj.length - 1; i >= 0; i--) {
      const p = S.proj[i]; if (!p.own && !host) continue; p.life -= dt;
      if (p.home) { const a = Math.atan2(py - p.y, px - p.x), cur = Math.atan2(p.vy, p.vx); let da = a - cur; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; const na = cur + Math.max(-1.6 * dt, Math.min(1.6 * dt, da)), sp = 230; p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
      else if (p.kind === 'bone' || p.kind === 'arrow') p.vy += (p.kind === 'bone' ? 500 : 260) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      let gone = p.life <= 0 || p.y > G + 10 && p.kind !== 'wave' || p.x < -50 || p.x > S.lv.W + 50;
      if (p.kind === 'wave' && (p.y > G + 40)) gone = true;
      if (p.own) {
        for (const m of S.mons) { if (Math.hypot(m.x - p.x, m.y - p.y) < MON[m.kind].r + 8) {
          if (p.blast) { for (const o of S.mons.slice()) if (Math.hypot(o.x - p.x, o.y - p.y) < p.blast + MON[o.kind].r) damage(o, p.dmg, (o.x > p.x ? 1 : -1) * 300, -100); S.fx.push({ k: 'boom', x: p.x, y: p.y, t: 0 }); }
          else damage(m, p.dmg, Math.sign(p.vx) * 180, -60);
          gone = true; break; } }
        if (!gone && S.kind === 'brawl') for (const pr of peers()) { const ps = S.pst[pr.id]; if (ps && ps.dead) continue; if (Math.hypot(pr.c[0] - p.x, pr.c[1] - p.y) < 40) { if (p.blast) { for (const q2 of peers()) if (Math.hypot(q2.c[0] - p.x, q2.c[1] - p.y) < p.blast + 30) pvp(q2.id, p.dmg * 0.8, p.x); S.fx.push({ k: 'boom', x: p.x, y: p.y, t: 0 }); } else pvp(pr.id, p.dmg * 0.8, p.x); gone = true; break; } }
        if (!gone && p.y > G - 4) { if (p.blast) S.fx.push({ k: 'boom', x: p.x, y: p.y, t: 0 }); gone = true; }
      } else {
        for (const T2 of tg) { if (T2.me) { for (const q of parts) { if (Math.hypot(q.x - p.x, q.y - p.y) < q.r + 9) { hurt(p.dmg, p.x, -1); gone = true; break; } } } else if (Math.hypot(T2.x - p.x, T2.y - p.y) < 40) { remoteHurt(T2.id, p.dmg, p.x); gone = true; } if (gone) break; }
      }
      if (gone) S.proj.splice(i, 1);
    }
    // items, chest, door
    for (let i = S.items.length - 1; i >= 0; i--) {
      const it = S.items[i]; if (S.down) break;
      if (Math.hypot(c.x - it.x, c.y - it.y) < 60) {
        if (S.kind === 'brawl' && (it.kind === 'crate' || it.kind === 'heart')) { if (S.pickT <= 0) { S.pickT = 0.4; if (host) takeItem(it.id, S.myId); else send({ t: 'pick', id: it.id }); } }
        else if (it.kind === 'weapon') { S.weapon = it.id; api.toast('Equipped ' + WEAPONS[it.id].icon + ' ' + WEAPONS[it.id].name + '!', 2); api.sfx('bread'); hud(); }
        else if (it.kind === 'heart') { S.hp = Math.min(S.maxHp, S.hp + 18); api.sfx('bread'); S.items.splice(i, 1); hud(); }
      }
    }
    if (S.chest && !S.down && !S.chest.open && Math.hypot(c.x - S.chest.x, c.y - (S.chest.y - 30)) < 70) openChest();
    if (S.door && !S.down && Math.hypot(c.x - S.door.x, c.y - (S.door.y - 50)) < 70) { if (!S.net) { S.floor++; S.hp = Math.min(S.maxHp, S.hp + 10); loadFloor(); return; } if (S.doorT <= 0) { if (host) { nextFloor(); return; } send({ t: 'door' }); S.doorT = 2; } }
    for (const f of S.fx) { f.t += dt; if (f.k === 'puff') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 500 * dt; } }
    S.fx = S.fx.filter((f) => f.t < 0.5);
    for (const t of S.texts) { t.t += dt; t.y -= 40 * dt; } S.texts = S.texts.filter((t) => t.t < 0.8);
    if (S.net && host) hostSnap(dt);
    S.hudT = (S.hudT || 0) + dt; if (S.hudT > 0.1) { S.hudT = 0; hud(); }
  }
  // ---------------------------------------------------------------- drawing
  const OUT = '#2b2118';
  function drawMon(c, m, t) {
    const d = MON[m.kind], f = m.face || 1; c.save(); c.translate(m.x, m.y); c.lineWidth = 3; c.strokeStyle = OUT; c.lineJoin = 'round'; c.lineCap = 'round';
    if (m.flash > 0) c.globalAlpha = 0.6;
    const r = d.r;
    if (m.kind === 'slime' || m.kind === 'kslime') {
      const sq = 1 + Math.sin(t * 6 + m.id) * 0.06 - Math.max(0, m.vy) * 0.0001; c.scale(sq, 1 / sq);
      const g = c.createRadialGradient(-r * 0.3, -r * 0.4, 2, 0, 0, r * 1.2); g.addColorStop(0, m.kind === 'kslime' ? '#ffe27a' : '#b9f58a'); g.addColorStop(1, m.kind === 'kslime' ? '#e0a010' : '#4cb83a'); c.fillStyle = g;
      c.beginPath(); c.moveTo(-r, r); c.quadraticCurveTo(-r * 1.1, -r * 1.1, 0, -r); c.quadraticCurveTo(r * 1.1, -r * 1.1, r, r); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.35, r * 0.18, r * 0.3, 0.5, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(f * r * 0.1 - r * 0.28, -r * 0.1, r * 0.2, 0, 7); c.arc(f * r * 0.1 + r * 0.28, -r * 0.1, r * 0.2, 0, 7); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(f * r * 0.1 - r * 0.28 + f * 2, -r * 0.1, r * 0.09, 0, 7); c.arc(f * r * 0.1 + r * 0.28 + f * 2, -r * 0.1, r * 0.09, 0, 7); c.fill();
      if (m.kind === 'kslime') { c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-r * 0.5, -r * 0.9); c.lineTo(-r * 0.4, -r * 1.5); c.lineTo(-r * 0.15, -r * 1.05); c.lineTo(0, -r * 1.6); c.lineTo(r * 0.15, -r * 1.05); c.lineTo(r * 0.4, -r * 1.5); c.lineTo(r * 0.5, -r * 0.9); c.closePath(); c.fill(); c.stroke(); }
    } else if (m.kind === 'bat') {
      const w = Math.sin(t * 18 + m.id); c.scale(f, 1); c.fillStyle = '#4a3a6a';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 5, 0); c.quadraticCurveTo(s * 24, -22 - w * 12, s * 32, 4 - w * 8); c.quadraticCurveTo(s * 22, -2, s * 15, 6); c.quadraticCurveTo(s * 10, 1, s * 5, 6); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle = '#6a5a94'; c.beginPath(); c.ellipse(0, 2, 10, 12, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#ff5a6e'; c.beginPath(); c.arc(-4, 0, 2.4, 0, 7); c.arc(4, 0, 2.4, 0, 7); c.fill();
    } else if (m.kind === 'skeleton' || m.kind === 'blord') {
      c.scale(f, 1); const s = m.kind === 'blord' ? 1.6 : 1, w = Math.sin(t * 8 + m.id) * 3; c.scale(s, s);
      c.strokeStyle = '#e8e0cc'; c.lineWidth = 5; c.beginPath(); c.moveTo(-6, 20); c.lineTo(-6 + w, 34); c.moveTo(6, 20); c.lineTo(6 - w, 34); c.moveTo(0, 8); c.lineTo(0, 22); c.stroke(); c.lineWidth = 3; for (const y of [10, 15, 20]) { c.beginPath(); c.moveTo(-8, y); c.lineTo(8, y); c.stroke(); }
      c.fillStyle = '#efe8d4'; c.strokeStyle = OUT; c.lineWidth = 2.6; c.beginPath(); c.arc(0, -4, 12, 0, 7); c.fill(); c.stroke(); c.fillRect(-7, 6, 14, 4);
      c.fillStyle = '#20182a'; c.beginPath(); c.ellipse(-4.5, -5, 3.2, 4, 0, 0, 7); c.ellipse(5, -5, 3.2, 4, 0, 0, 7); c.fill(); c.fillStyle = m.kind === 'blord' ? '#ff4040' : '#8fffd0'; c.beginPath(); c.arc(-4.5, -5, 1.3, 0, 7); c.arc(5, -5, 1.3, 0, 7); c.fill();
      c.strokeStyle = '#8a5a2a'; c.lineWidth = 3; c.beginPath(); c.arc(16, 6, 16, -1.2, 1.2); c.stroke();
      if (m.kind === 'blord') { c.fillStyle = '#7a3dc4'; c.beginPath(); c.moveTo(-12, -12); c.lineTo(-8, -24); c.lineTo(-3, -14); c.lineTo(0, -26); c.lineTo(3, -14); c.lineTo(8, -24); c.lineTo(12, -12); c.closePath(); c.fill(); c.stroke(); }
    } else if (m.kind === 'wisp') {
      const fl = 1 + Math.sin(t * 10 + m.id) * 0.15; const g = c.createRadialGradient(0, 0, 2, 0, 0, 32 * fl); g.addColorStop(0, 'rgba(255,220,120,.9)'); g.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = g; c.fillRect(-36, -36, 72, 72);
      c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(-14, 10); c.quadraticCurveTo(-18, -12, 0, -26 * fl); c.quadraticCurveTo(18, -12, 14, 10); c.quadraticCurveTo(0, 20, -14, 10); c.fill(); c.stroke(); c.fillStyle = '#ffe9a0'; c.beginPath(); c.ellipse(0, 4, 8, 11, 0, 0, 7); c.fill();
      c.fillStyle = OUT; c.beginPath(); c.arc(-4, 2, 2, 0, 7); c.arc(4, 2, 2, 0, 7); c.fill();
    } else if (m.kind === 'botg' || m.kind === 'bota') {
      c.scale(f, 1); const w = Math.sin(t * 9 + m.id) * 3, col = m.col || '#e8e8e8';
      c.strokeStyle = '#f0a030'; c.lineWidth = 5; c.beginPath(); c.moveTo(-7, 16); c.lineTo(-7 + w, 30); c.moveTo(7, 16); c.lineTo(7 - w, 30); c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 3; c.fillStyle = col; c.beginPath(); c.ellipse(-3, 4, 22, 17, -0.1, 0, 7); c.fill(); c.stroke();
      c.lineWidth = 9; c.strokeStyle = col; c.beginPath(); c.moveTo(12, -2); c.quadraticCurveTo(24, -14, 20, -26); c.stroke(); c.lineWidth = 3; c.strokeStyle = OUT; c.beginPath(); c.moveTo(12, -2); c.quadraticCurveTo(24, -14, 20, -26); c.stroke();
      c.fillStyle = col; c.beginPath(); c.arc(21, -30, 10, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#f0a030'; c.beginPath(); c.moveTo(29, -32); c.lineTo(40, -29); c.lineTo(29, -26); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(23, -34, 2.6, 0, 7); c.fill();
      c.fillStyle = '#4a4a5a'; c.fillRect(8, -42, 26, 6); c.strokeRect(8, -42, 26, 6);
      if (m.kind === 'bota') { c.strokeStyle = '#8a5a2a'; c.lineWidth = 4; c.beginPath(); c.arc(30, 6, 18, -1.2, 1.2); c.stroke(); } else { c.fillStyle = '#dfe6ee'; c.fillRect(24, 2, 24, 5); c.strokeRect(24, 2, 24, 5); }
    } else { // golem / titan
      c.scale(f, 1); const s = m.kind === 'titan' ? 1.55 : 1, w = Math.sin(t * 5 + m.id) * 2; c.scale(s, s);
      const g = c.createLinearGradient(-30, -36, 30, 30); g.addColorStop(0, '#9aa0ad'); g.addColorStop(1, '#5d6270'); c.fillStyle = g;
      c.beginPath(); c.moveTo(-26, 34); c.lineTo(-30, -6); c.lineTo(-18, -34); c.lineTo(18, -34); c.lineTo(30, -6); c.lineTo(26, 34); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#7b8190'; c.fillRect(-42, -10 + w, 14, 34); c.fillRect(28, -10 - w, 14, 34); c.strokeRect(-42, -10 + w, 14, 34); c.strokeRect(28, -10 - w, 14, 34);
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, -34); c.lineTo(-4, -14); c.lineTo(-14, 4); c.stroke();
      c.fillStyle = m.kind === 'titan' ? '#ff6a2a' : '#ffd23f'; c.beginPath(); c.arc(-9, -16, 5, 0, 7); c.arc(10, -16, 5, 0, 7); c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(-18, -26); c.lineTo(-4, -20); c.moveTo(19, -26); c.lineTo(5, -20); c.stroke();
    }
    c.restore();
    if (m.hp < m.max || d.boss) { const w = Math.max(40, r * 1.8), y = m.y - r - (m.kind === 'bat' ? 16 : 24) - (d.boss ? 18 : 0); c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(m.x - w / 2 - 1, y - 1, w + 2, 7); c.fillStyle = d.boss ? '#ff4d4d' : '#6be06b'; c.fillRect(m.x - w / 2, y, w * Math.max(0, m.hp / m.max), 5); }
  }
  function weaponSprite(c, id, ang) {
    c.save(); c.rotate(ang); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 2.4;
    if (id === 'sword') { c.fillStyle = '#dfe6ee'; c.beginPath(); c.moveTo(6, -3); c.lineTo(48, -2); c.lineTo(54, 0); c.lineTo(48, 2); c.lineTo(6, 3); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#c9972b'; c.fillRect(2, -9, 6, 18); c.strokeRect(2, -9, 6, 18); }
    else if (id === 'spear') { c.strokeStyle = '#7a5530'; c.lineWidth = 4; c.beginPath(); c.moveTo(-10, 0); c.lineTo(100, 0); c.stroke(); c.fillStyle = '#dfe6ee'; c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.moveTo(98, -7); c.lineTo(122, 0); c.lineTo(98, 7); c.closePath(); c.fill(); c.stroke(); }
    else if (id === 'hammer') { c.strokeStyle = '#7a5530'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(52, 0); c.stroke(); c.fillStyle = '#8f98a8'; c.strokeStyle = OUT; c.lineWidth = 2.4; c.fillRect(46, -16, 24, 32); c.strokeRect(46, -16, 24, 32); }
    else if (id === 'bow') { c.strokeStyle = '#8a5a2a'; c.lineWidth = 4; c.beginPath(); c.arc(10, 0, 26, -1.2, 1.2); c.stroke(); c.strokeStyle = '#eee'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(20, -23); c.lineTo(20, 23); c.stroke(); }
    else if (id === 'wand') { c.strokeStyle = '#6b3fa0'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(36, 0); c.stroke(); c.fillStyle = '#ff8a2a'; c.beginPath(); c.arc(40, 0, 7, 0, 7); c.fill(); c.stroke(); }
    c.restore();
  }
  function drawWorld(c, clock) {
    if (!S.on) return;
    // pedestals, chest, door, items
    for (const it of S.items) {
      const bob = Math.sin(clock * 3 + it.x) * 4;
      if (it.kind === 'weapon') { c.fillStyle = '#6e6a7c'; c.fillRect(it.x - 18, G - 14, 36, 14); c.strokeStyle = OUT; c.lineWidth = 2.4; c.strokeRect(it.x - 18, G - 14, 36, 14); const g = c.createRadialGradient(it.x, it.y + bob, 2, it.x, it.y + bob, 40); g.addColorStop(0, 'rgba(255,240,150,.55)'); g.addColorStop(1, 'rgba(255,240,150,0)'); c.fillStyle = g; c.fillRect(it.x - 40, it.y - 40 + bob, 80, 80); c.save(); c.translate(it.x, it.y + bob); c.scale(0.8, 0.8); weaponSprite(c, it.id, -0.9); c.restore(); c.font = '700 12px system-ui'; c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 3; c.textAlign = 'center'; c.strokeText(WEAPONS[it.id].name, it.x, G - 56); c.fillText(WEAPONS[it.id].name, it.x, G - 56); }
      else if (it.kind === 'crate') { c.save(); c.translate(it.x, it.y + bob); c.fillStyle = '#b8803a'; c.strokeStyle = OUT; c.lineWidth = 3; c.fillRect(-16, -16, 32, 32); c.strokeRect(-16, -16, 32, 32); c.beginPath(); c.moveTo(-16, -16); c.lineTo(16, 16); c.moveTo(16, -16); c.lineTo(-16, 16); c.stroke(); c.font = '800 16px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('?', 0, 6); c.restore(); }
      else { c.save(); c.translate(it.x, it.y + bob); c.fillStyle = '#ff4f6d'; c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, 10); c.bezierCurveTo(-18, -2, -10, -18, 0, -8); c.bezierCurveTo(10, -18, 18, -2, 0, 10); c.fill(); c.stroke(); c.restore(); }
    }
    if (S.chest) { const ch = S.chest; c.save(); c.translate(ch.x, ch.y); c.fillStyle = '#9a6a2e'; c.strokeStyle = OUT; c.lineWidth = 3; c.fillRect(-26, -34, 52, 34); c.strokeRect(-26, -34, 52, 34); c.fillStyle = '#b8803a'; if (ch.open) { c.beginPath(); c.moveTo(-26, -34); c.lineTo(-22, -58); c.lineTo(22, -58); c.lineTo(26, -34); c.closePath(); c.fill(); c.stroke(); const g = c.createRadialGradient(0, -40, 2, 0, -40, 50); g.addColorStop(0, 'rgba(255,240,150,.8)'); g.addColorStop(1, 'rgba(255,240,150,0)'); c.fillStyle = g; c.fillRect(-50, -90, 100, 100); } else { c.beginPath(); c.moveTo(-26, -34); c.quadraticCurveTo(0, -56, 26, -34); c.fill(); c.stroke(); } c.fillStyle = '#ffd23f'; c.fillRect(-4, -36, 8, 10); c.restore(); }
    if (S.door) { const d = S.door; c.save(); c.translate(d.x, d.y); const g = c.createRadialGradient(0, -50, 4, 0, -50, 90); g.addColorStop(0, 'rgba(180,255,200,.55)'); g.addColorStop(1, 'rgba(180,255,200,0)'); c.fillStyle = g; c.fillRect(-90, -140, 180, 150); c.fillStyle = '#2a2438'; c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(-34, 0); c.lineTo(-34, -70); c.arc(0, -70, 34, Math.PI, 0); c.lineTo(34, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#9dffb8'; c.beginPath(); c.moveTo(0, -78 - Math.sin(clock * 4) * 4); c.lineTo(-14, -56); c.lineTo(14, -56); c.closePath(); c.fill(); c.restore(); }
    for (const m of S.mons) drawMon(c, m, clock);
    // projectiles
    for (const p of S.proj) {
      c.save(); c.translate(p.x, p.y);
      if (p.kind === 'arrow') { c.rotate(Math.atan2(p.vy, p.vx)); c.strokeStyle = '#8a5a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-16, 0); c.lineTo(8, 0); c.stroke(); c.fillStyle = '#dfe6ee'; c.beginPath(); c.moveTo(8, -4); c.lineTo(16, 0); c.lineTo(8, 4); c.fill(); }
      else if (p.kind === 'bone') { c.rotate(clock * 14); c.fillStyle = '#efe8d4'; c.strokeStyle = OUT; c.lineWidth = 2; c.fillRect(-9, -3, 18, 6); c.strokeRect(-9, -3, 18, 6); c.beginPath(); c.arc(-9, 0, 4, 0, 7); c.arc(9, 0, 4, 0, 7); c.fill(); }
      else if (p.kind === 'wave') { c.fillStyle = 'rgba(150,120,90,.85)'; c.beginPath(); c.moveTo(-18, 14); c.lineTo(0, -30); c.lineTo(18, 14); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.5; c.stroke(); }
      else { const g = c.createRadialGradient(0, 0, 1, 0, 0, 20); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ff9a2a'); g.addColorStop(1, 'rgba(255,60,20,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 20, 0, 7); c.fill(); }
      c.restore();
    }
    // other players (arena / co-op): hp bar, weapon, KO mark
    if (S.net) for (const pr of peers()) {
      const ps = S.pst[pr.id]; if (!ps) continue; const hx = pr.c[0], hy = pr.c[1] - 62, wd = 54;
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(hx - wd / 2 - 1, hy - 1, wd + 2, 8); c.fillStyle = ps.dead ? '#888' : S.kind === 'brawl' ? '#ff6b6b' : '#6be06b'; c.fillRect(hx - wd / 2, hy, wd * Math.max(0, ps.hp / (ps.mx || 100)), 6);
      c.font = '800 12px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 3; const lab = ps.dead ? 'KO' : (WEAPONS[ps.w] ? WEAPONS[ps.w].icon : '') + ' P' + (pr.id + 1); c.strokeText(lab, hx, hy - 6); c.fillText(lab, hx, hy - 6);
    }
    if (S.down) { c.font = '800 30px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 5; const cc = api.goose().center(); c.strokeText('💤 KO', cc.x, cc.y - 70); c.fillText('💤 KO', cc.x, cc.y - 70); }
    // weapon in the beak
    const g = api.goose(), h = g.head, f = g.facing, w = WEAPONS[S.weapon];
    c.save(); c.translate(h.x, h.y); c.scale(f, 1);
    const sw = S.swing > 0 ? (1 - S.swing / 0.22) : 0;
    weaponSprite(c, S.weapon === 'peck' ? 'none' : S.weapon, w.melee ? (S.swing > 0 ? -1.4 + sw * 2.6 : -0.7) : 0);
    c.restore();
    // effects
    for (const e of S.fx) {
      if (e.k === 'slash') { const a = e.t / 0.2; if (a < 1) { c.save(); c.translate(e.x, e.y); c.scale(e.f, 1); c.globalAlpha = 1 - a; c.strokeStyle = e.big ? '#ffb347' : '#fff'; c.lineWidth = e.big ? 10 : 6; c.beginPath(); c.arc(0, 0, WEAPONS[e.w].reach * 0.75, -1.3, 1.3); c.stroke(); c.restore(); } }
      else if (e.k === 'puff') { c.globalAlpha = 1 - e.t / 0.5; c.fillStyle = e.c; c.beginPath(); c.arc(e.x, e.y, 6, 0, 7); c.fill(); c.globalAlpha = 1; }
      else if (e.k === 'boom') { c.globalAlpha = 1 - e.t / 0.5; c.fillStyle = '#ff9a2a'; c.beginPath(); c.arc(e.x, e.y, 20 + e.t * 140, 0, 7); c.fill(); c.globalAlpha = 1; }
    }
    c.font = '800 18px system-ui'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = OUT;
    for (const t of S.texts) { c.globalAlpha = 1 - t.t / 0.8; c.fillStyle = t.c; c.strokeText(t.s, t.x, t.y); c.fillText(t.s, t.x, t.y); c.globalAlpha = 1; }
    if (S.inv > 0 && Math.floor(S.inv * 14) % 2) { const cc = g.center(); c.strokeStyle = 'rgba(255,90,90,.8)'; c.lineWidth = 4; c.beginPath(); c.arc(cc.x, cc.y, 44, 0, 7); c.stroke(); }
  }
  function equip(base) {
    const e = Object.assign({}, base);
    if (S.armor >= 2) e.body = 'armor'; else if (S.armor === 1) e.body = 'jacket';
    return e;
  }

  // ---------------------------------------------------------------- HUD
  function buildHud() {
    if (document.getElementById('bHud')) { document.getElementById('bHud').style.display = ''; return; }
    const css = document.createElement('style');
    css.textContent = '#bHud{position:fixed;left:12px;top:56px;z-index:4;width:210px;background:rgba(255,255,255,.92);border:3px solid #2b2118;border-radius:14px;padding:6px 10px;font-weight:800;font-size:13px;pointer-events:none}#bBar{height:12px;border:2px solid #2b2118;border-radius:8px;background:#e5e5e5;overflow:hidden;margin:3px 0}#bBar i{display:block;height:100%;background:linear-gradient(#ff7a7a,#e63946)}#btnAtk{display:none;right:calc(max(18px, env(safe-area-inset-right)) + 112px);bottom:calc(max(18px, env(safe-area-inset-bottom)) + 70px);width:70px;height:70px;background:rgba(230,57,70,.92);font-size:26px}body.battle #btnAtk{display:flex}body[data-ctl="custom"] #btnAtk,body[data-ctl="none"] #btnAtk{display:none!important}';
    document.head.appendChild(css);
    const w = document.createElement('div');
    w.innerHTML = '<div id="bHud"><div id="bFloor"></div><div id="bBar"><i id="bFill"></i></div><div id="bInfo"></div></div>' +
      '<div class="btn touch-only" id="btnAtk">⚔</div>' +
      '<div class="overlay hidden" id="bOver"><div class="card"><h2 id="bOverTitle"></h2><p id="bOverText" style="white-space:pre-line"></p><div class="row"><button class="big small-btn" id="bAgain">Try again</button><button class="big small-btn ghost" id="bMenu">Menu</button></div></div></div>';
    while (w.firstChild) document.body.appendChild(w.firstChild);
    document.getElementById('bAgain').onclick = () => { document.getElementById('bOver').classList.add('hidden'); if (S.kind === 'brawl') startBrawl(); else start(); };
    document.getElementById('bMenu').onclick = () => api.showMenu();
  }
  function hud() {
    if (!S.on) return;
    const f = document.getElementById('bFloor'); if (!f) return;
    if (S.kind === 'brawl') { const ids = S.net ? S.net.ids : [0]; f.textContent = '⚔ Arena · ' + Math.max(0, Math.ceil(S.tLeft)) + 's · ' + ids.map((id) => (id === S.myId ? 'You ' : 'P' + (id + 1) + ' ') + (S.score[id] || 0)).join(' · '); }
    else f.textContent = '🏰 Floor ' + S.floor + (S.cleared ? ' · cleared!' : ' · ' + S.mons.length + ' left') + (S.bossName && !S.cleared ? ' · ' + S.bossName : '');
    document.getElementById('bFill').style.width = Math.max(0, S.hp / S.maxHp * 100) + '%';
    document.getElementById('bInfo').textContent = '❤ ' + Math.max(0, Math.ceil(S.hp)) + '/' + S.maxHp + '  ' + WEAPONS[S.weapon].icon + ' ' + WEAPONS[S.weapon].name + '  🛡 ' + Math.round(ARMOR[S.armor].red * 100) + '%';
  }

  function init(a) { api = a; buildHud(); const h = document.getElementById('bHud'); if (h) h.style.display = 'none'; }
  root.Battle = { init, start, stop, tick, drawWorld, attack, equip, active: () => S.on, _damage: damage, _hurt: hurt, startNet, startBrawl, onNet, frozen: frozenB, banner, _state: S, _WEAPONS: WEAPONS };
})(window);
