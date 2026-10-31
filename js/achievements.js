/*
 * Achievements: 40 goals that pay out bread. They are checked a couple of times a second from the saved game
 * (levels done, minigame scores, skins and clothes owned, bread, stomps...), so no other file needs to know about them.
 * A banner pops up when one is earned, and the 🏆 Achievements button on the main menu lists them all with progress.
 */
(function (root) {
  'use strict';
  const W = () => root.__wobble && root.__wobble.save;
  const n = (o) => (o && typeof o === 'object' ? Object.keys(o).filter((k) => o[k]).length : 0);
  const best = (s, id) => (s.best && s.best[id]) || 0;
  const mgPlayed = (s) => Object.keys(s.best || {}).length;
  const L = [
    // levels
    ['lv1', '🥚', 'First Egg', 'Finish your first level.', (s) => n(s.done), 1, 10],
    ['lv5', '🌱', 'Getting Going', 'Finish 5 levels.', (s) => n(s.done), 5, 20],
    ['lv15', '🏃', 'On a Roll', 'Finish 15 levels.', (s) => n(s.done), 15, 40],
    ['lv33', '🏅', 'Goose of the Hill', 'Finish 33 levels.', (s) => n(s.done), 33, 80],
    ['lv60', '🥈', 'Long Neck Legend', 'Finish 60 levels.', (s) => n(s.done), 60, 120],
    ['lv100', '🥇', 'Wobble Master', 'Finish 100 levels.', (s) => n(s.done), 100, 200],
    ['lv163', '👑', 'King of Wobble City', 'Finish every level.', (s) => n(s.done), 163, 500],
    ['pf1', '✨', 'Clean Run', 'Get a perfect run on a level.', (s) => n(s.perfect), 1, 20],
    ['pf10', '💎', 'Flawless', 'Get perfect runs on 10 levels.', (s) => n(s.perfect), 10, 100],
    ['pf40', '🌟', 'Untouchable', 'Get perfect runs on 40 levels.', (s) => n(s.perfect), 40, 300],
    ['st10', '🦶', 'Stompy', 'Stomp 10 enemies.', (s) => s.stomps || 0, 10, 20],
    ['st100', '💥', 'Boot of Doom', 'Stomp 100 enemies.', (s) => s.stomps || 0, 100, 100],
    ['st500', '☄️', 'Extinction Event', 'Stomp 500 enemies.', (s) => s.stomps || 0, 500, 300],
    // bread
    ['br100', '🍞', 'Bread Fan', 'Hold 100 bread at once.', (s) => s.bread || 0, 100, 10],
    ['br500', '🥖', 'Bread Baron', 'Hold 500 bread at once.', (s) => s.bread || 0, 500, 40],
    ['br2000', '🥐', 'Bread Tycoon', 'Hold 2000 bread at once.', (s) => s.bread || 0, 2000, 150],
    // collection
    ['sk3', '🪿', 'New Feathers', 'Own 3 skins.', (s) => n(s.skins), 3, 20],
    ['sk10', '🎨', 'Skin Collector', 'Own 10 skins.', (s) => n(s.skins), 10, 60],
    ['sk30', '🌈', 'Wardrobe Wizard', 'Own 30 skins.', (s) => n(s.skins), 30, 200],
    ['cl5', '🎩', 'Dressed Up', 'Own 5 clothing items.', (s) => n(s.owned), 5, 20],
    ['cl25', '👗', 'Fashion Goose', 'Own 25 clothing items.', (s) => n(s.owned), 25, 80],
    ['cl80', '🛍️', 'Shopaholic', 'Own 80 clothing items.', (s) => n(s.owned), 80, 250],
    ['eq4', '🧥', 'Full Outfit', 'Wear 4 items at once.', (s) => n(s.equip), 4, 30],
    // minigames
    ['mg1', '🎮', 'Player One', 'Play a minigame.', mgPlayed, 1, 15],
    ['mg5', '🕹️', 'Arcade Goose', 'Play 5 different minigames.', mgPlayed, 5, 50],
    ['mg15', '🎲', 'Game Night', 'Play 15 different minigames.', mgPlayed, 15, 150],
    ['mg30', '🏟️', 'Minigame Marathon', 'Play 30 different minigames.', mgPlayed, 30, 300],
    ['mgWhack', '🔨', 'Whack Attack', 'Score 40 in Bread Whack.', (s) => best(s, 'm5whack'), 40, 40],
    ['mgCatch', '🧺', 'Safe Hands', 'Score 40 in Bread Catch.', (s) => best(s, 'm5catch'), 40, 40],
    ['mgStack', '🧱', 'Skyscraper', 'Stack 20 blocks in Block Stack.', (s) => best(s, 'm5stack'), 20, 50],
    ['mgDraw', '⚡', 'Fastest Beak', 'Score 350 in Quick Draw.', (s) => best(s, 'draw'), 350, 50],
    ['mgDodge', '🚀', 'Rock Dancer', 'Survive 30 s in Asteroid Dodge.', (s) => best(s, 'm6dodge'), 300, 50],
    ['mgBal', '⚖️', 'Steady Beak', 'Balance for 40 s in Wobble Balance.', (s) => best(s, 'm6balance'), 400, 60],
    ['mgMath', '🔢', 'Goose Genius', 'Get 20 right in Quick Maths.', (s) => best(s, 'm6maths'), 100, 50],
    ['mgHilo', '🃏', 'Card Shark', 'Reach a streak of 8 in Higher or Lower.', (s) => best(s, 'm6hilo'), 80, 50],
    ['mgTarget', '🎯', 'Sharp Eye', 'Score 60 in Target Toss.', (s) => best(s, 'm6target'), 60, 50],
    ['mgCross', '🐔', 'Why Did It Cross', 'Cross the road 6 times in Lane Crosser.', (s) => best(s, 'm8cross'), 60, 50],
    ['mgBeat', '🥁', 'In the Groove', 'Score 150 in Beat Goose.', (s) => best(s, 'm8beat'), 150, 60],
    ['mgWord', '🔤', 'Wordsmith', 'Score 120 in Word Scramble.', (s) => best(s, 'm8word'), 120, 50],
    ['mgFlip', '🔃', 'Upside Down', 'Last 25 s in Gravity Flip.', (s) => best(s, 'm8flip'), 250, 50],
    ['mgLights', '💡', 'Bright Spark', 'Score 250 in Lights Out.', (s) => best(s, 'm8lights'), 250, 50],
    ['mgSweep', '🍞', 'Toast Defuser', 'Clear Bread Sweeper in good time (250+).', (s) => best(s, 'm8sweep'), 250, 80],
    // special
    ['avatar', '🪼', 'Jelly Time', 'Use the golden jellyfish avatar.', (s) => (s.skin === 'golden_jelly' ? 1 : 0), 1, 50],
    ['unlockmg', '🔓', 'All Unlocked', 'Unlock the minigames.', (s) => (s.mg || s.allDone ? 1 : 0), 1, 30],
    ['hard', '😈', 'Brave Goose', 'Switch the difficulty above normal.', (s) => (['hard', 'insane', 'noodle'].includes(s.diff) ? 1 : 0), 1, 30],
  ].map(([id, icon, name, desc, val, goal, reward]) => ({ id, icon, name, desc, val, goal, reward }));

  let box = null, bannerQ = [], bannerOn = false;
  function banner(a) {
    bannerQ.push(a); if (bannerOn) return; bannerOn = true;
    const next = () => {
      const q = bannerQ.shift(); if (!q) { bannerOn = false; return; }
      const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:50%;top:70px;transform:translate(-50%,-30px);opacity:0;z-index:850;background:#fff8e8;border:3px solid #1f2a36;border-radius:16px;padding:8px 16px;font:700 15px system-ui;color:#1f2a36;box-shadow:0 6px 0 rgba(0,0,0,.2);transition:all .35s;display:flex;gap:10px;align-items:center;max-width:90vw';
      d.innerHTML = '<span style="font-size:30px">' + q.icon + '</span><span>🏆 Achievement!<br><b style="font-size:17px">' + q.name + '</b><br><span style="font-weight:600;font-size:13px">+' + q.reward + ' 🍞</span></span>';
      document.body.appendChild(d); requestAnimationFrame(() => { d.style.opacity = 1; d.style.transform = 'translate(-50%,0)'; });
      setTimeout(() => { d.style.opacity = 0; d.style.transform = 'translate(-50%,-30px)'; setTimeout(() => { d.remove(); next(); }, 400); }, 2800);
    };
    next();
  }
  let ready = false, started = 0;
  function check(first) {
    const s = W(); if (!s) return; if (!s.ach) s.ach = {};
    let got = 0;
    for (const a of L) {
      if (s.ach[a.id]) continue;
      let v = 0; try { v = a.val(s); } catch (e) { v = 0; }
      if (v >= a.goal) { s.ach[a.id] = 1; s.bread = (s.bread || 0) + a.reward; got++; if (!first) banner(a); }
    }
    if (got) { try { root.__wobble.persist(); } catch (e) { /* ignore */ } try { if (box) render(); const mb = document.getElementById('menuBread'); if (mb) mb.textContent = '🍞 ' + (s.bread >= 1e9 ? '∞' : s.bread); } catch (e) { /* ignore */ } }
    ready = true;
  }
  function render() {
    const s = W(), done = L.filter((a) => s.ach && s.ach[a.id]).length;
    box.querySelector('#achHead').textContent = '🏆 ' + done + ' / ' + L.length + ' achievements';
    const list = box.querySelector('#achList'); list.innerHTML = '';
    const sorted = L.slice().sort((a, b) => (s.ach[b.id] ? 1 : 0) - (s.ach[a.id] ? 1 : 0));
    for (const a of sorted) {
      const got = !!s.ach[a.id]; let v = 0; try { v = a.val(s); } catch (e) { v = 0; } const pct = Math.min(100, Math.round((v / a.goal) * 100));
      const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:10px;align-items:center;padding:7px 8px;border-radius:12px;margin:4px 0;background:' + (got ? '#e5f7d8' : 'rgba(0,0,0,.05)') + ';' + (got ? '' : 'opacity:.9');
      r.innerHTML = '<span style="font-size:28px;filter:' + (got ? 'none' : 'grayscale(1)') + '">' + a.icon + '</span><span style="flex:1;text-align:left"><b>' + a.name + '</b> <span style="font-size:12px;opacity:.7">+' + a.reward + ' 🍞</span><br><span style="font-size:13px">' + a.desc + '</span>' +
        (got ? '' : '<div style="height:6px;background:rgba(0,0,0,.12);border-radius:4px;margin-top:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:#ff9b2f"></div></div>') + '</span><span style="font-size:20px">' + (got ? '✅' : '') + '</span>';
      list.appendChild(r);
    }
  }
  function open() {
    check(false);
    if (!box) {
      box = document.createElement('div'); box.style.cssText = 'position:fixed;inset:0;z-index:840;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:12px';
      box.innerHTML = '<div style="background:#fff8e8;border:3px solid #1f2a36;border-radius:22px;padding:14px;width:min(520px,100%);max-height:90vh;display:flex;flex-direction:column;font-family:system-ui;color:#1f2a36;text-align:center"><h2 id="achHead" style="margin:0 0 6px"></h2><div id="achList" style="overflow:auto;flex:1"></div><button id="achClose" class="big small-btn" style="margin-top:8px;align-self:center">Close</button></div>';
      document.body.appendChild(box); box.addEventListener('click', (e) => { if (e.target === box || e.target.id === 'achClose') box.style.display = 'none'; });
    }
    box.style.display = 'flex'; render();
  }
  function init() {
    const code = document.getElementById('codeBtn');
    if (code && !document.getElementById('achBtn')) { const b = document.createElement('button'); b.className = 'sec'; b.id = 'achBtn'; b.textContent = '🏆 Achievements'; b.addEventListener('click', open); code.parentNode.insertBefore(b, code); }
    setTimeout(() => check(true), 1200);          // pay out what you already earned quietly, without a banner for each one
    setInterval(() => check(false), 1500);
  }
  root.Achievements = { open, check, LIST: L };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
})(window);
