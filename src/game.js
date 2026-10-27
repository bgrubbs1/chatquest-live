/** Pure, clock-injected dungeon engine. No network, wall clock, or timers. */
export const ROOMS = Object.freeze([
  { name: 'The Overgrown Gate', enemy: 'Moss Slime', hp: 26, damage: 18, flavor: 'Something stirs beneath the welcome mat.' },
  { name: 'Echoing Belfry', enemy: 'Bat Swarm', hp: 38, damage: 23, flavor: 'A thousand wings. One terrible connection.' },
  { name: 'The Broken Archive', enemy: 'Stone Golem', hp: 45, damage: 28, flavor: 'Its memory is stone. Its fists are worse.' },
  { name: 'Crypt of Lost Signals', enemy: 'Bone Wraith', hp: 55, damage: 33, flavor: 'The ghosts of messages never delivered.' },
  { name: 'The Furnace Bridge', enemy: 'Ember Drake', hp: 60, damage: 38, flavor: 'Watch your step. The floor is buffering fire.' },
  { name: 'Throne of Infinite Buffering', enemy: 'The Lag Lord', hp: 32, damage: 44, flavor: 'Your final opponent has a very high ping.' },
].map(Object.freeze));
export const ACTIONS = Object.freeze(['Strike', 'Guard', 'Rally']);
export function seededRng(seed = 42) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let n = value;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
export class Game {
  constructor({ seed = 42, roundMs = 20000, restartMs = 30000, onEvent = () => {} } = {}) {
    this.random = seededRng(seed);
    this.roundMs = roundMs;
    this.restartMs = restartMs;
    this.onEvent = onEvent;
    this.sequence = 0;
    this.now = 0;
    this.reset();
  }
  reset() {
    this.state = { status: 'waiting', party: [], roomIndex: 0, room: ROOMS[0].name,
      enemy: this.makeEnemy(0), round: 0, votes: {}, voteCounts: [0, 0, 0],
      roundEndsAt: null, restartAt: null, events: [], now: this.now, roundMs: this.roundMs };
  }
  makeEnemy(index) {
    const r = ROOMS[index];
    return { name: r.enemy, hp: r.hp, maxHp: r.hp, damage: r.damage, flavor: r.flavor, phase: 1 };
  }
  emit(type, data = {}, message = '') {
    const event = { id: ++this.sequence, type, at: this.now, ...data, message };
    this.state.events.push(event);
    this.state.events = this.state.events.slice(-60);
    this.onEvent(event);
  }
  snapshot() { return structuredClone(this.state); }
  startRound() {
    this.state.status = 'voting';
    this.state.round++;
    this.state.votes = {};
    this.state.voteCounts = [0, 0, 0];
    this.state.roundEndsAt = this.now + this.roundMs;
    this.emit('round_start', { round: this.state.round }, `Round ${this.state.round} · choose your action.`);
  }
  command(user, text) {
    if (typeof user !== 'string' || typeof text !== 'string') return false;
    user = user.toLowerCase();
    if (!/^[a-z0-9_]{1,25}$/.test(user)) return false;
    const command = text.trim().toLowerCase();
    const member = this.state.party.find(p => p.user === user);
    if (command === '!join') {
      if (member || this.state.party.length >= 6 || ['victory', 'wipe'].includes(this.state.status)) return false;
      this.state.party.push({ user, hp: 100, maxHp: 100, damageDealt: 0 });
      this.emit('join', { user }, `${user} joined the party.`);
      if (this.state.status === 'waiting') this.startRound();
      return true;
    }
    if (!member) return false;
    if (command === '!help') {
      this.emit('help', { user }, '!join to play · !vote 1 Strike / 2 Guard / 3 Rally · one vote per round (change anytime).');
      return true;
    }
    const vote = command.match(/^!(?:vote\s+)?([123])$/);
    if (!vote || this.state.status !== 'voting' || member.hp <= 0) return false;
    const action = Number(vote[1]);
    const previous = Object.hasOwn(this.state.votes, user) ? this.state.votes[user] : undefined;
    if (previous === action) return true;
    if (previous) this.state.voteCounts[previous - 1]--;
    this.state.votes = { ...this.state.votes, [user]: action };
    this.state.voteCounts[action - 1]++;
    this.emit('vote', { user, action }, `${user} voted ${ACTIONS[action - 1]}.`);
    return true;
  }
  resolve() {
    const s = this.state;
    const action = s.voteCounts.indexOf(Math.max(...s.voteCounts)) + 1;
    const alive = s.party.filter(p => p.hp > 0);
    let damage = 0;
    let healing = 0;
    let revived = null;
    if (action === 1) {
      const hits = alive.map(() => 14 * (this.random() < 0.12 ? 2 : 1));
      const potential = hits.reduce((sum, hit) => sum + hit, 0);
      damage = Math.min(s.enemy.hp, potential);
      // Split credited damage proportionally, including the final partial hit.
      let credited = 0;
      alive.forEach((p, i) => {
        const share = i === alive.length - 1 ? damage - credited : Math.floor(damage * hits[i] / potential);
        p.damageDealt += share;
        credited += share;
      });
      s.enemy.hp -= damage;
    } else if (action === 2) {
      for (const p of alive) { const heal = Math.min(6, 100 - p.hp); p.hp += heal; healing += heal; }
    } else {
      const lowest = [...alive].sort((a, b) => a.hp - b.hp)[0];
      if (lowest) { healing = Math.min(32, 100 - lowest.hp); lowest.hp += healing; }
      const downed = s.party.find(p => p.hp === 0);
      if (downed) { downed.hp = 35; revived = downed.user; }
    }
    this.emit('action_resolved', { action, damage, healing, revived },
      `${ACTIONS[action - 1]} · ${damage ? `${damage} damage` : `${healing} HP restored`}${revived ? ` · ${revived} revived` : ''}.`);
    const targets = s.party.filter(p => p.hp > 0);
    if (targets.length) {
      const target = targets[Math.floor(this.random() * targets.length)];
      const incoming = action === 2 ? Math.floor(s.enemy.damage / 2) : s.enemy.damage;
      const actual = Math.min(target.hp, incoming);
      target.hp -= actual;
      this.emit('enemy_attack', { user: target.user, damage: actual, guarded: action === 2 },
        `${s.enemy.name} hits ${target.user} for ${actual}${target.hp === 0 ? ' · DOWNED' : ''}.`);
    }
    if (s.party.every(p => p.hp === 0)) { this.finish('wipe'); return; }
    if (s.enemy.hp === 0) {
      if (s.roomIndex === 5 && s.enemy.phase === 1) {
        s.enemy.phase = 2;
        s.enemy.hp = s.enemy.maxHp = 64;
        s.enemy.damage = 48;
        s.enemy.flavor = 'Connection restored. Mercy disconnected.';
        this.emit('boss_phase', { phase: 2 }, 'The Lag Lord enters phase II · OVERCLOCKED.');
      } else {
        this.emit('room_cleared', { roomIndex: s.roomIndex }, `${s.room} cleared!`);
        if (s.roomIndex === 5) { this.finish('victory'); return; }
        s.roomIndex++;
        s.room = ROOMS[s.roomIndex].name;
        s.enemy = this.makeEnemy(s.roomIndex);
      }
    }
    this.startRound();
  }
  finish(status) {
    this.state.status = status;
    this.state.roundEndsAt = null;
    this.state.restartAt = this.now + this.restartMs;
    this.emit(status, {}, status === 'victory' ? 'VICTORY · The dungeon is free. Chat is legendary.' : 'PARTY WIPED · A new expedition begins in 30 seconds.');
  }
  tick(now) {
    if (!Number.isFinite(now) || now < this.now) return;
    this.now = now;
    this.state.now = now;
    if (this.state.restartAt !== null && now >= this.state.restartAt) {
      this.reset();
      this.emit('restart', {}, 'A fresh party. A new adventure. Type !join.');
    } else if (this.state.status === 'voting' && now >= this.state.roundEndsAt) this.resolve();
  }
}
