/** Local HTTP/SSE host and deterministic offline chat simulation. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Game } from './game.js';
import { TwitchChat } from './chat.js';

export function createDemo(game) {
  const names = ['pixelknight', 'mosswitch', 'criticalcat', 'bytebard', 'heals4real', 'lurker_prime'];
  let lastRound = 0;
  let lastVoteStep = -1;
  let lastStatus = '';
  let startedAt = null;
  return now => {
    if (game.state.status === 'waiting' && lastStatus !== 'waiting') {
      startedAt = now; lastRound = 0; lastVoteStep = -1;
      names.slice(0, 3).forEach(name => game.command(name, '!join'));
    }
    lastStatus = game.state.status;
    if (game.state.status !== 'voting') return;
    const elapsed = now - startedAt;
    names.slice(3).forEach((name, i) => { if (elapsed >= (i + 1) * 12000) game.command(name, '!join'); });
    const round = game.state.round;
    if (round !== lastRound) { lastRound = round; lastVoteStep = -1; }
    const into = game.roundMs - (game.state.roundEndsAt - now);
    const step = Math.floor(into / 2200);
    if (step === lastVoteStep) return;
    lastVoteStep = step;
    const party = game.state.party.filter(p => p.hp > 0);
    const winner = round === 3 ? 2 : round === 6 ? 3 : 1;
    // Split early votes; late voters and vote changes provide a narrow winning margin.
    party.forEach((p, i) => {
      if (step < i) return;
      const action = step >= 7 ? (i < (Math.floor(party.length / 2) + 1) ? winner : winner % 3 + 1) : (i % 3 + 1);
      game.command(p.user, `!vote ${action}`);
    });
  };
}
export async function createServer({ demo = false, channel, botName, token, clock = Date.now } = {}) {
  if (!demo && !channel) throw new Error('TWITCH_CHANNEL is required in live mode. Set it to your channel login, or run npm run demo.');
  const assets = new Map();
  for (const [url, file, type] of [['/overlay', 'index.html', 'text/html'], ['/style.css', 'style.css', 'text/css'], ['/app.js', 'app.js', 'text/javascript']]) {
    assets.set(url, { body: await readFile(new URL(`../public/${file}`, import.meta.url)), type });
  }
  const clients = new Set();
  let chat;
  let connection = demo ? 'offline simulation' : 'connecting';
  const game = new Game({ onEvent(event) {
    if (event.type !== 'vote') console.log(`[${event.type}] ${event.message}`);
    if (['round_start', 'action_resolved', 'room_cleared', 'boss_phase', 'victory', 'wipe', 'help'].includes(event.type)) chat?.say(event.message);
  } });
  game.tick(clock());
  const snapshot = () => ({ ...game.snapshot(), mode: demo ? 'demo' : 'live', connection });
  const frame = () => `event: state\ndata: ${JSON.stringify(snapshot())}\n\n`;
  const server = http.createServer((req, res) => {
    let path;
    try { path = new URL(req.url, 'http://localhost').pathname; }
    catch { res.writeHead(400); res.end('Bad request'); return; }
    const headers = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'" };
    if (req.method !== 'GET') { res.writeHead(405, { ...headers, Allow: 'GET' }); res.end('Method not allowed'); return; }
    if (path === '/events') {
      res.writeHead(200, { ...headers, 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write(`retry: 2000\n\n${frame()}`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (path === '/state') { res.writeHead(200, { ...headers, 'Content-Type': 'application/json' }); res.end(JSON.stringify(snapshot())); return; }
    if (path === '/') {
      res.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ChatQuest Live · Status</title><link rel="stylesheet" href="/style.css"></head><body class="status-page"><main><p class="eyebrow">LOCAL DUNGEON SERVER</p><h1>ChatQuest <em>Live</em></h1><p>${demo ? 'DEMO · deterministic offline chat' : 'LIVE · Twitch IRC reader enabled'}</p><p>6 rooms. One party. Every vote matters.</p><p><a href="/overlay">Open the overlay →</a> &nbsp; <a href="/state">JSON state</a></p><p>OBS Browser source: 1280 × 720 · URL /overlay · no audio</p><p>Chat: !join · !vote 1 / 2 / 3 · !help</p></main></body></html>`);
      return;
    }
    const asset = assets.get(path);
    if (asset) { res.writeHead(200, { ...headers, 'Content-Type': `${asset.type}; charset=utf-8` }); res.end(asset.body); return; }
    res.writeHead(404, headers); res.end('Not found');
  });
  if (!demo) {
    chat = new TwitchChat({ channel, botName, token });
    chat.on('status', status => { connection = status; console.log(`[IRC] ${status}`); });
    chat.on('message', ({ user, text }) => {
      if (text.trim().startsWith('!')) { console.log(`[chat] ${user}: ${text}`); game.command(user, text); }
    });
    chat.connect();
  }
  const simulate = demo ? createDemo(game) : () => {};
  const timer = setInterval(() => {
    const now = clock();
    game.tick(now);
    simulate(now);
    const data = frame();
    for (const client of clients) {
      if (client.writableLength > 65536) { client.destroy(); clients.delete(client); }
      else client.write(data);
    }
  }, 250);
  const close = () => {
    clearInterval(timer); chat?.close();
    for (const client of clients) client.end();
    server.close();
  };
  return { server, game, close };
}
async function main() {
  const demo = process.argv.includes('--demo');
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
  const app = await createServer({ demo, channel: process.env.TWITCH_CHANNEL,
    botName: process.env.TWITCH_BOT_NAME, token: process.env.TWITCH_OAUTH_TOKEN });
  app.server.on('error', error => { console.error(`Server error: ${error.message}`); app.close(); process.exitCode = 1; });
  app.server.listen(port, '127.0.0.1', () => console.log(`ChatQuest Live · ${demo ? 'DEMO' : 'LIVE'} · http://localhost:${port}/overlay`));
  process.once('SIGINT', app.close); process.once('SIGTERM', app.close);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(error => { console.error(error.message); process.exitCode = 1; });
