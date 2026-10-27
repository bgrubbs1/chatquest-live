/** Engine rule tests use a virtual clock; no sleeps, credentials, or network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, seededRng, ROOMS } from '../src/game.js';
import { createDemo } from '../src/server.js';
function setup(count = 1, options = {}) {
  const game = new Game(options);
  for (let i = 0; i < count; i++) game.command(`hero${i}`, '!join');
  return game;
}
function resolve(game, action = 1) {
  for (const p of game.state.party) game.command(p.user, `!${action}`);
  game.tick(game.state.roundEndsAt);
}
function last(game, type) { return game.state.events.filter(e => e.type === type).at(-1); }

test('joins case-insensitively, starts first round, enforces six slots and rejects duplicates', () => {
  const g = new Game();
  assert.equal(g.state.status, 'waiting');
  assert.equal(g.command('HERO', '!JoIn'), true);
  assert.equal(g.command('hero', '!join'), false);
  for (let i = 0; i < 7; i++) g.command(`new${i}`, '!join');
  assert.equal(g.state.party.length, 6);
  assert.equal(g.state.status, 'voting');
  assert.equal(g.state.roundEndsAt, 20000);
  assert.deepEqual(g.state.party[0], { user: 'hero', hp: 100, maxHp: 100, damageDealt: 0 });
});
test('mid-run joins have full HP and may immediately vote', () => {
  const g = setup(); resolve(g);
  g.command('late', '!join'); g.command('late', '!vote 2');
  assert.equal(g.state.party[1].hp, 100);
  assert.equal(g.state.voteCounts[1], 1);
});
test('ignores unknown users, malformed input, invalid votes and unknown commands', () => {
  const g = setup();
  for (const [user, text] of [['stranger', '!1'], ['stranger', '!help'], ['hero0', '!vote 4'], ['hero0', '!11'], ['hero0', '!fly'], [null, '!join'], ['bad\nuser', '!join'], ['hero0', null]]) assert.equal(g.command(user, text), false);
  assert.deepEqual(g.state.voteCounts, [0, 0, 0]);
  assert.equal(g.command('hero0', '!HELP'), true);
  assert.match(last(g, 'help').message, /!vote/);
});
test('one vote per member, changes replace votes and commands accept case and aliases', () => {
  const g = setup(2);
  g.command('hero0', ' !VoTe 2 '); g.command('hero0', '!2'); g.command('hero1', '!3');
  assert.deepEqual(g.state.voteCounts, [0, 1, 1]);
  g.command('hero0', '!1');
  assert.deepEqual(g.state.voteCounts, [1, 0, 1]);
});
test('majority chooses the action and clears votes for the next round', () => {
  const g = setup(3);
  g.command('hero0', '!1'); g.command('hero1', '!2'); g.command('hero2', '!2');
  g.tick(20000);
  assert.equal(last(g, 'action_resolved').action, 2);
  assert.deepEqual(g.state.voteCounts, [0, 0, 0]);
  assert.deepEqual(g.state.votes, {});
});
test('ties choose the lowest action, including a 2/3 tie', () => {
  for (const choices of [[1, 2], [2, 3], [1, 3]]) {
    const g = setup(2);
    choices.forEach((a, i) => g.command(`hero${i}`, `!${a}`));
    g.tick(20000);
    assert.equal(last(g, 'action_resolved').action, Math.min(...choices));
  }
});
test('no votes defaults to strike and the timer never resolves early', () => {
  const g = setup(); g.tick(19999);
  assert.equal(g.state.round, 1);
  g.tick(20000);
  assert.equal(last(g, 'action_resolved').action, 1);
  assert.equal(g.state.round, 2);
  assert.equal(g.state.roundEndsAt, 40000);
});
test('guard halves incoming damage, heals living allies and does no damage', () => {
  const g = setup(); g.state.party[0].hp = 50;
  resolve(g, 2);
  assert.equal(last(g, 'enemy_attack').damage, 9);
  assert.equal(g.state.party[0].hp, 47);
  assert.equal(g.state.enemy.hp, 26);
  assert.equal(last(g, 'action_resolved').healing, 6);
});
test('rally heals lowest living HP and revives one downed member, capped at max HP', () => {
  const g = setup(4);
  g.state.party[0].hp = 0; g.state.party[1].hp = 0;
  g.state.party[2].hp = 50; g.state.party[3].hp = 90;
  resolve(g, 3);
  assert.equal(last(g, 'action_resolved').revived, 'hero0');
  assert.equal(last(g, 'action_resolved').healing, 32);
  const attacked = last(g, 'enemy_attack').user;
  assert.equal(g.state.party[0].hp, attacked === 'hero0' ? 17 : 35);
  assert.equal(g.state.party[1].hp, 0);
  assert.equal(g.state.party[2].hp, attacked === 'hero2' ? 64 : 82);
  assert.equal(g.state.party[3].hp, attacked === 'hero3' ? 72 : 90);
  const full = setup(); resolve(full, 3);
  assert.equal(last(full, 'action_resolved').healing, 0);
});
test('downed members cannot vote or deal strike damage', () => {
  const g = setup(2); g.state.party[0].hp = 0;
  assert.equal(g.command('hero0', '!1'), false);
  resolve(g);
  assert.equal(g.state.party[0].damageDealt, 0);
  assert.ok(g.state.party[1].damageDealt > 0);
});
test('all members downed triggers wipe, terminal commands are ignored, and restart clears party', () => {
  const g = setup(); g.state.party[0].hp = 1;
  resolve(g, 1);
  assert.equal(g.state.status, 'wipe');
  assert.equal(g.state.party[0].hp, 0);
  assert.equal(g.command('new', '!join'), false);
  assert.equal(g.command('hero0', '!2'), false);
  assert.equal(g.state.restartAt, 50000);
  g.tick(49999); assert.equal(g.state.status, 'wipe');
  g.tick(50000);
  assert.equal(g.state.status, 'waiting');
  assert.equal(g.state.party.length, 0);
  assert.equal(g.state.roomIndex, 0);
  assert.equal(last(g, 'restart').type, 'restart');
  assert.equal(g.command('fresh', '!join'), true);
});
test('strike damage is shared, crits are seeded, and enemy retaliates even on a killing blow', () => {
  const g = setup(6);
  resolve(g);
  assert.equal(last(g, 'action_resolved').damage, 26);
  assert.equal(g.state.party.reduce((n, p) => n + p.damageDealt, 0), 26);
  assert.ok(g.state.party.every(p => p.damageDealt > 0));
  assert.equal(last(g, 'enemy_attack').damage, 18);
  assert.equal(g.state.roomIndex, 1);
  assert.equal(last(g, 'room_cleared').roomIndex, 0);
  const crit = setup(6); crit.state.enemy.hp = crit.state.enemy.maxHp = 10000;
  for (let i = 0; i < 6; i++) { crit.state.party.forEach(p => { p.hp = 100; }); resolve(crit); }
  assert.ok(crit.state.events.some(e => e.type === 'action_resolved' && e.damage > 84));
});
test('six rooms progress in order, boss has two phases, final defeat is victory', () => {
  const g = setup(6);
  for (let i = 0; i < 5; i++) { assert.equal(g.state.room, ROOMS[i].name); resolve(g); }
  assert.equal(g.state.enemy.name, 'The Lag Lord');
  resolve(g);
  assert.equal(g.state.enemy.phase, 2);
  assert.equal(g.state.enemy.hp, 64);
  assert.equal(last(g, 'boss_phase').phase, 2);
  assert.equal(g.state.status, 'voting');
  resolve(g);
  assert.equal(g.state.status, 'victory');
  assert.equal(g.state.enemy.hp, 0);
  assert.equal(g.state.roundEndsAt, null);
  assert.equal(last(g, 'victory').type, 'victory');
  g.tick(g.state.restartAt);
  assert.equal(g.state.status, 'waiting');
});
test('seeded RNG is reproducible and seeds vary', () => {
  const values = seed => { const rng = seededRng(seed); return Array.from({ length: 100 }, rng); };
  assert.deepEqual(values(42), values(42));
  assert.notDeepEqual(values(42), values(43));
  assert.ok(values(0).every(n => n >= 0 && n < 1));
  const a = setup(6, { seed: 17 }), b = setup(6, { seed: 17 });
  for (let i = 0; i < 4; i++) { resolve(a, i % 3 + 1); resolve(b, i % 3 + 1); }
  assert.deepEqual(a.snapshot(), b.snapshot());
});
test('snapshots are independent JSON-safe SSE state and events are structured', () => {
  const g = setup(); resolve(g);
  const snapshot = g.snapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
  snapshot.party[0].hp = -500;
  assert.ok(g.state.party[0].hp >= 0);
  assert.ok(snapshot.events.every(e => typeof e.id === 'number' && typeof e.at === 'number' && typeof e.type === 'string'));
  assert.ok(last(g, 'round_start'));
  g.tick(-1); assert.equal(g.state.now, 20000);
});
test('offline simulation joins over time, uses defensive actions, reaches boss and wins near three minutes', () => {
  const run = () => {
    const events = [];
    const g = new Game({ onEvent: e => events.push(e) });
    const demo = createDemo(g);
    let wonAt;
    for (let now = 0; now <= 200000; now += 250) {
      g.tick(now); demo(now);
      if (g.state.status === 'victory') { wonAt = now; break; }
    }
    assert.equal(g.state.status, 'victory');
    assert.equal(g.state.party.length, 6);
    assert.ok(wonAt >= 160000 && wonAt <= 200000);
    assert.ok(events.some(e => e.type === 'action_resolved' && e.action === 2));
    assert.ok(events.some(e => e.type === 'action_resolved' && e.action === 3));
    assert.ok(events.some(e => e.type === 'enemy_attack' && e.damage > 0));
    assert.ok(events.some(e => e.type === 'boss_phase'));
    assert.ok(events.filter(e => e.type === 'join').at(-1).at > 0);
    return g.snapshot();
  };
  assert.deepEqual(run(), run());
});
test('usernames matching object properties are safe vote keys', () => {
  const g = new Game();
  for (const name of ['__proto__', 'constructor', 'tostring']) {
    assert.equal(g.command(name, '!join'), true);
    assert.equal(g.command(name, '!2'), true);
  }
  assert.deepEqual(g.state.voteCounts, [0, 3, 0]);
  g.command('__proto__', '!1');
  assert.deepEqual(g.state.voteCounts, [1, 2, 0]);
  assert.equal(JSON.parse(JSON.stringify(g.snapshot())).votes.__proto__, 1);
});
