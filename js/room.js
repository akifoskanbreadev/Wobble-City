/*
 * Room: a tiny shared online-lobby layer on PeerJS for the 2D party modes (Mecha Chameleon, Goose Among Us).
 * The first player to type a room word becomes the HOST (id 0); everyone else is a guest (id 1..max-1).
 * Guests talk only to the host; the host relays. Game code sends plain JSON through send / toAll / toOne.
 *
 *   const r = Room.create({ prefix:'wobble-cham-v1-', max:10, hello:()=>({name,skin}),
 *                           onRoster(list){}, onMsg(fromId,msg){}, onLost(why){}, onStatus(text,bad){},
 *                           canJoin:()=>null|'reason' });
 *   r.join('word'); r.leave(); r.isHost(); r.id(); r.list(); r.connected();
 *   r.send(msg)        guest -> host   (host: loops back to its own onMsg with id 0)
 *   r.toAll(msg)       host -> every guest      r.toOne(id,msg)   host -> one guest
 */
(function (root) {
  'use strict';
  function create(o) {
    let peer = null, hostConn = null, host = false, myId = 0, word = '', connected = false, tries = 0, gen = 0, qTag = '', qSlot = 0;
    const conns = new Map(), roster = {};
    const status = (t, bad) => { if (o.onStatus) o.onStatus(t, !!bad); };
    const slug = (w) => String(w || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
    const safe = (c, m) => { try { if (c && c.open) c.send(m); } catch (e) { /* ignore */ } };
    const list = () => Object.keys(roster).map(Number).sort((a, b) => a - b).map((id) => Object.assign({ id }, roster[id]));
    const pushRoster = () => { const l = list(); conns.forEach((c) => safe(c, { t: 'roster', list: l })); if (o.onRoster) o.onRoster(l); };
    function leave(quiet) {
      gen++;
      if (host) conns.forEach((c) => safe(c, { t: 'stop' }));
      try { if (peer) peer.destroy(); } catch (e) { /* ignore */ }
      peer = null; hostConn = null; conns.clear(); connected = false; host = false;
      for (const k of Object.keys(roster)) delete roster[k];
      if (!quiet && o.onRoster) o.onRoster([]);
    }
    function fail(m) { leave(true); status(m, true); if (o.onRoster) o.onRoster([]); }
    function join(w) {
      word = slug(w);
      if (!word) return status('Type a word first (any word you and your friends agree on).', true);
      if (!root.Peer) return status('Could not load the matchmaking library (are you offline?).', true);
      leave(true); tries = 0; status('Looking for the room “' + word + '”…'); tryHost(gen);
    }
    function tryHost(g) {
      const p = new root.Peer(o.prefix + word, { debug: 0 }); peer = p;
      p.on('open', () => { if (g !== gen) return; host = true; myId = 0; connected = true; roster[0] = o.hello(); p.on('connection', onGuest); pushRoster(); status('You are the host of “' + word + '”.'); });
      p.on('error', (e) => {
        if (g !== gen) return;
        if (e.type === 'unavailable-id') { try { p.destroy(); } catch (x) { /* ignore */ } becomeGuest(g); }
        else if (!connected) fail('Connection problem: ' + (e.type || e));
      });
    }
    function becomeGuest(g) {
      const p = new root.Peer(undefined, { debug: 0 }); peer = p;
      p.on('open', () => {
        if (g !== gen) return;
        const c = p.connect(o.prefix + word, { reliable: true, serialization: 'json' }); hostConn = c;
        c.on('open', () => safe(c, { t: 'hi', info: o.hello() }));
        c.on('data', (m) => { if (g === gen) fromHost(m); });
        c.on('close', () => { if (g === gen) lost('The room closed.'); });
        c.on('error', () => { if (g === gen) lost('Lost the connection.'); });
      });
      p.on('error', (e) => {
        if (g !== gen) return;
        if (e.type === 'peer-unavailable') { try { p.destroy(); } catch (x) { /* ignore */ } if (++tries > 4) return fail('Could not join that room. Try again.'); status('Room not ready yet… retrying'); setTimeout(() => { if (g === gen) tryHost(g); }, 1200); }
        else if (!connected) fail('Connection problem: ' + (e.type || e));
      });
    }
    function lost(why) { const was = connected; leave(true); status(why, true); if (o.onLost) o.onLost(why, was); }
    function fromHost(m) {
      if (!m) return;
      if (m.t === 'welcome') { myId = m.id; connected = true; status('Joined room “' + word + '”.'); }
      else if (m.t === 'roster') { for (const k of Object.keys(roster)) delete roster[k]; m.list.forEach((e) => { roster[e.id] = e; }); if (o.onRoster) o.onRoster(list()); }
      else if (m.t === 'busy') { if (qTag && qSlot < 10) { qSlot++; join('q-' + qTag + '-' + qSlot); return; } leave(true); status(m.why, true); if (o.onLost) o.onLost(m.why, false); }
      else if (m.t === 'stop') lost('The host left the room.');
      else if (m.t === 'm' && o.onMsg) o.onMsg(0, m.d);
    }
    function onGuest(c) {
      c.on('open', () => {
        const why = o.canJoin ? o.canJoin() : null;
        if (why || conns.size >= o.max - 1) { safe(c, { t: 'busy', why: why || 'That room is full (' + o.max + ' players).' }); setTimeout(() => { try { c.close(); } catch (e) { /* ignore */ } }, 400); return; }
        let id = 1; while (conns.has(id)) id++;
        conns.set(id, c);
        c.on('data', (m) => {
          if (!m) return;
          if (m.t === 'hi') { roster[id] = Object.assign({}, m.info); safe(c, { t: 'welcome', id }); pushRoster(); }
          else if (m.t === 'm' && o.onMsg) o.onMsg(id, m.d);
        });
        c.on('close', () => drop(id)); c.on('error', () => drop(id));
      });
    }
    function drop(id) { if (!conns.has(id)) return; conns.delete(id); delete roster[id]; if (o.onDrop) o.onDrop(id); pushRoster(); }
    return {
      join: (w) => { qTag = ''; join(w); }, quick: (tag) => { qTag = String(tag || 'x'); qSlot = 1; status('Looking for a random lobby…'); join('q-' + qTag + '-1'); }, quickOn: () => !!qTag,
      leave: () => { qTag = ''; leave(); }, isHost: () => host, id: () => myId, list, connected: () => connected, word: () => word,
      send: (m) => { if (host) { if (o.onMsg) o.onMsg(0, m); } else safe(hostConn, { t: 'm', d: m }); },
      toAll: (m) => { if (host) conns.forEach((c) => safe(c, { t: 'm', d: m })); },
      toOne: (id, m) => { if (host) safe(conns.get(id), { t: 'm', d: m }); },
      setInfo: (info) => { roster[myId] = info; if (host) pushRoster(); else safe(hostConn, { t: 'hi', info }); },
      count: () => Object.keys(roster).length
    };
  }
  root.Room = { create };
})(typeof window !== 'undefined' ? window : globalThis);
