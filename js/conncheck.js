/* Connection check: type the code "check" in the code box. Tests each online service the game can use and shows a tick or cross,
   so you can see what a school filter blocks. Nothing here changes any save data. */
(function (root) {
  'use strict';
  const WORKER = 'https://workers-playground-rapid-brook-325c.akifoskanbread.workers.dev';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const timeout = (p, ms) => Promise.race([p, wait(ms).then(() => { throw new Error('timed out'); })]);

  const TESTS = [
    ['Game files', 'The game itself (GitHub Pages)', async () => { const r = await fetch('js/game.js?c=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); }],
    ['Accounts & sync', 'The Cloudflare worker (workers.dev)', async () => { await timeout(fetch(WORKER + '/?c=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }), 7000); }],
    ['Multiplayer library', 'PeerJS script from a CDN', async () => {
      if (!root.Peer && root.loadPeer) root.loadPeer();
      for (let i = 0; i < 40 && !root.Peer; i++) { if (i === 10 || i === 22) root.loadPeer && root.loadPeer(); await wait(250); }
      if (!root.Peer) throw new Error('library blocked');
    }],
    ['Multiplayer server', 'PeerJS matchmaking server', async () => {
      if (!root.Peer) throw new Error('needs the library');
      await timeout(new Promise((res, rej) => { let p; try { p = new root.Peer(); } catch (e) { return rej(e); } p.on('open', () => { try { p.destroy(); } catch (e) { /* ignore */ } res(); }); p.on('error', (e) => { try { p.destroy(); } catch (x) { /* ignore */ } rej(e); }); }), 9000);
    }],
    ['Direct connection', 'WebRTC between two devices', async () => {
      if (!root.RTCPeerConnection) throw new Error('not supported');
      const pc = new root.RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      try {
        pc.createDataChannel('x');
        await timeout(new Promise((res, rej) => { pc.onicecandidate = (e) => { if (e.candidate && /srflx/.test(e.candidate.candidate)) res(); }; pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(rej); }), 7000);
      } finally { try { pc.close(); } catch (e) { /* ignore */ } }
    }],
  ];

  function open() {
    const old = document.getElementById('connCheck'); if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'connCheck';
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(10,14,30,.72);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:12px';
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;color:#1c2540;border-radius:18px;padding:16px 18px;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.4);max-height:92vh;overflow:auto';
    card.innerHTML = '<div style="font-weight:800;font-size:18px;margin-bottom:2px">📡 Connection check</div><div style="font-size:12px;opacity:.65;margin-bottom:10px">Tests what this network lets the game reach.</div>';
    const rows = TESTS.map((t) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:10px;align-items:center;padding:7px 0;border-top:1px solid #e6e9f2';
      row.innerHTML = '<div class="ic" style="font-size:20px;width:26px;text-align:center">⏳</div><div style="flex:1"><div style="font-weight:700;font-size:14px">' + t[0] + '</div><div class="d" style="font-size:12px;opacity:.65">' + t[1] + '</div></div>';
      card.appendChild(row); return row;
    });
    const sum = document.createElement('div'); sum.style.cssText = 'margin-top:10px;font-size:13px;line-height:1.4;font-weight:600'; card.appendChild(sum);
    const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:8px;margin-top:12px';
    const mk = (txt) => { const b = document.createElement('button'); b.textContent = txt; b.style.cssText = 'flex:1;padding:10px;border:0;border-radius:12px;background:#ffcf3f;font-weight:800;font-size:14px;cursor:pointer;color:#1c2540'; btns.appendChild(b); return b; };
    const again = mk('Test again'), close = mk('Close');
    card.appendChild(btns); box.appendChild(card); document.body.appendChild(box);
    close.onclick = () => box.remove();

    const run = async () => {
      again.disabled = true; sum.textContent = 'Testing…';
      const res = [];
      rows.forEach((r) => { r.querySelector('.ic').textContent = '⏳'; });
      await Promise.all(TESTS.map(async (t, i) => {
        let ok = true, why = '';
        try { await t[2](); } catch (e) { ok = false; why = (e && (e.message || e.type)) || 'blocked'; }
        res[i] = ok;
        rows[i].querySelector('.ic').textContent = ok ? '✅' : '❌';
        rows[i].querySelector('.d').textContent = t[1] + (ok ? '' : ' · ' + why);
      }));
      const [files, worker, lib, srv, p2p] = res;
      sum.textContent = (worker ? 'Accounts & sync should work. ' : 'Accounts & sync are blocked here. ')
        + (lib && srv && p2p ? 'Online multiplayer should work.' : lib && srv ? 'Multiplayer can find rooms, but the direct link is blocked, so joining may fail.' : 'Online multiplayer is blocked here.')
        + (files ? '' : ' (The game files did not load properly.)');
      again.disabled = false;
    };
    again.onclick = run; run();
  }
  root.ConnCheck = { open };
})(window);
