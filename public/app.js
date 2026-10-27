/** SSE state renderer: safe text nodes, local countdown, native reconnect + stale status. */
const $ = id => document.getElementById(id);
const descriptions = ['Deal party damage · 12% critical chance', 'Half incoming damage · heal living allies', 'Heal weakest ally · revive one fallen hero'];
let state;
let previous;
let receivedAt = 0;
function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function scale() { document.documentElement.style.setProperty('--scale', Math.min(innerWidth / 1280, innerHeight / 720)); }
addEventListener('resize', scale); scale();
function render(s) {
  state = s; receivedAt = performance.now();
  $('mode').textContent = `${s.mode.toUpperCase()} / ${s.connection.toUpperCase()}`;
  $('depth').textContent = `DEPTH ${String(s.roomIndex + 1).padStart(2, '0')} / 06`;
  $('room').textContent = s.room;
  $('room-track').replaceChildren(...Array.from({ length: 6 }, (_, i) => node('span', `room-node ${i < s.roomIndex ? 'done' : i === s.roomIndex ? 'current' : ''}`, i < s.roomIndex ? '✓' : String(i + 1).padStart(2, '0'))));
  $('party-count').textContent = `${s.party.length} / 6`;
  $('party').replaceChildren(...Array.from({ length: 6 }, (_, i) => {
    const p = s.party[i];
    if (!p) { const empty = node('div', 'member empty'); empty.append(node('span', '', '+'), node('div', '', 'Open slot · !join')); return empty; }
    const old = previous?.party.find(member => member.user === p.user);
    const row = node('div', `member ${p.hp === 0 ? 'downed' : ''} ${old && old.hp > p.hp ? 'hit' : ''}`);
    const top = node('div', 'member-top'); top.append(node('span', '', p.user), node('small', '', `${p.damageDealt} DMG`));
    const bottom = node('div', 'member-bottom'); const health = node('div', 'health'); const fill = node('div'); fill.style.width = `${p.hp}%`; health.append(fill);
    bottom.append(health, node('span', '', p.hp === 0 ? 'DOWNED' : `${p.hp}/100`)); row.append(top, bottom); return row;
  }));
  $('enemy-name').textContent = s.enemy.name;
  $('flavor').textContent = s.enemy.flavor;
  $('phase').textContent = s.roomIndex === 5 ? `BOSS · PHASE ${s.enemy.phase === 1 ? 'I' : 'II'}` : 'HOSTILE';
  $('monster').className = `monster ${s.roomIndex === 5 ? 'boss' : ''} ${s.enemy.phase === 2 ? 'phase-two' : ''}`;
  $('enemy-bar').style.width = `${100 * s.enemy.hp / s.enemy.maxHp}%`;
  $('enemy-hp').textContent = `${s.enemy.hp} / ${s.enemy.maxHp} HP`;
  $('enemy-damage').textContent = `${s.enemy.damage} ATK`;
  const logs = s.events.filter(e => e.type !== 'vote').slice(-10);
  $('log').replaceChildren(...logs.map(e => { const li = node('li', '', e.message); li.dataset.type = e.type; return li; }));
  const total = s.voteCounts.reduce((a, b) => a + b, 0);
  const leader = s.voteCounts.indexOf(Math.max(...s.voteCounts));
  $('actions').replaceChildren(...['Strike', 'Guard', 'Rally'].map((name, i) => {
    const el = node('div', `action ${total && i === leader ? 'leading' : ''}`);
    const top = node('div', 'action-top'); const votes = node('span', 'votes', `${s.voteCounts[i]} `); votes.append(node('small', '', 'VOTES'));
    top.append(node('span', 'key', `!${i + 1}`), node('span', 'action-name', name), votes);
    const fill = node('div', 'action-fill'); fill.style.width = `${total ? s.voteCounts[i] / total * 100 : 0}%`;
    el.append(top, node('p', '', descriptions[i]), fill); return el;
  }));
  $('round').textContent = s.status === 'waiting' ? 'WAITING FOR HEROES · !join' : `ROUND ${String(s.round).padStart(2, '0')} · CHAT CHOOSES THE NEXT MOVE`;
  $('result').hidden = !['victory', 'wipe'].includes(s.status);
  $('result-title').textContent = s.status === 'victory' ? 'VICTORY' : 'PARTY WIPED';
  $('result-label').textContent = s.status === 'victory' ? 'SIX ROOMS. ONE LEGENDARY CHAT.' : 'THE DUNGEON CLAIMS ANOTHER PARTY';
  $('result-text').textContent = s.status === 'victory' ? 'The Lag Lord has fallen. Your chat made history.' : 'Rest your swords. A fresh expedition is on its way.';
  previous = s;
  countdown();
}
function countdown() {
  if (!state) return;
  const now = state.now + performance.now() - receivedAt;
  const left = Math.max(0, (state.roundEndsAt - now) / 1000);
  $('countdown').textContent = state.status === 'voting' ? `${Math.ceil(left)}s · VOTE NOW` : state.status === 'waiting' ? 'TYPE !join IN CHAT' : 'EXPEDITION ENDED';
  $('timer-bar').style.width = `${state.status === 'voting' ? Math.min(100, left * 100000 / state.roundMs) : 0}%`;
  $('restart').textContent = `New expedition in ${Math.max(0, Math.ceil((state.restartAt - now) / 1000))}s · fresh party`;
}
const source = new EventSource('/events');
source.addEventListener('state', event => {
  try { render(JSON.parse(event.data)); $('connection').textContent = '● OVERLAY CONNECTED'; }
  catch { $('connection').textContent = '● INVALID UPDATE · RECONNECTING'; }
});
source.onopen = () => { $('connection').textContent = '● OVERLAY CONNECTED'; };
source.onerror = () => { $('connection').textContent = '○ RECONNECTING…'; };
setInterval(() => { countdown(); if (state && performance.now() - receivedAt > 5000) $('connection').textContent = '○ CONNECTION STALE · RETRYING'; }, 100);
