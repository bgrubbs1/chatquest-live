/** Real local HTTP integration covers assets, JSON, SSE, and live configuration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
test('demo HTTP serves status, overlay, assets, JSON and initial SSE state', async t => {
  const app = await createServer({ demo: true });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  for (const [path, type, marker] of [['/', 'text/html', 'ChatQuest'], ['/overlay', 'text/html', 'id="dungeon"'], ['/style.css', 'text/css', '.monster'], ['/app.js', 'text/javascript', 'EventSource']]) {
    const res = await fetch(base + path);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes(type));
    assert.ok((await res.text()).includes(marker));
  }
  const state = await (await fetch(base + '/state')).json();
  assert.equal(state.mode, 'demo');
  assert.equal(state.enemy.name, 'Moss Slime');
  const controller = new AbortController();
  const events = await fetch(base + '/events', { signal: controller.signal });
  assert.equal(events.headers.get('content-type'), 'text/event-stream');
  const reader = events.body.getReader();
  const chunk = new TextDecoder().decode((await reader.read()).value);
  assert.match(chunk, /retry: 2000/);
  assert.equal(JSON.parse(chunk.match(/data: (.*)/)[1]).mode, 'demo');
  controller.abort();
  assert.equal((await fetch(base + '/missing')).status, 404);
  assert.equal((await fetch(base + '/state', { method: 'POST' })).status, 405);
});
test('live mode without channel fails with actionable error', async () => {
  await assert.rejects(createServer(), /TWITCH_CHANNEL.*npm run demo/);
});
