/** IRC parser robustness without opening a Twitch connection. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIrc, TwitchChat } from '../src/chat.js';
test('parses ordinary and tagged Twitch messages', () => {
  assert.deepEqual(parseIrc(':Hero!hero@hero.tmi.twitch.tv PRIVMSG #channel :!join'), { user: 'hero', text: '!join' });
  assert.deepEqual(parseIrc('@badge-info=;display-name=Hero :hero!hero@host PRIVMSG #channel :!vote 2'), { user: 'hero', text: '!vote 2' });
});
test('malformed IRC never throws and protocol lines are ignored', () => {
  for (const line of [null, undefined, 7, '', 'PING :tmi.twitch.tv', ':bad', ':x!h PRIVMSG', 'x'.repeat(9000), ':server 001 nick :Welcome']) assert.equal(parseIrc(line), null);
});
test('anonymous mode needs no credentials; bot mode requires a complete safe pair', () => {
  assert.equal(new TwitchChat({ channel: '#example' }).bot, false);
  assert.equal(new TwitchChat({ channel: 'example', botName: 'bot', token: 'oauth:placeholder' }).bot, true);
  assert.throws(() => new TwitchChat({ channel: 'bad\r\nJOIN #x' }), /Invalid/);
  assert.throws(() => new TwitchChat({ channel: 'example', botName: 'bot' }), /both/);
  assert.throws(() => new TwitchChat({ channel: 'example', botName: 'bot', token: 'bad\ntoken' }), /Invalid/);
});
test('bot sender sanitizes messages, queues bursts, and clears on close', () => {
  const chat = new TwitchChat({ channel: 'example', botName: 'bot', token: 'placeholder' });
  const sent = [];
  chat.socket = { write: value => sent.push(value), destroy() {} };
  chat.ready = true;
  assert.equal(chat.say('Round 1\r\nJOIN #bad'), true);
  assert.equal(sent[0], 'PRIVMSG #example :Round 1  JOIN #bad\r\n');
  chat.say('Room cleared'); chat.say('Round 2');
  assert.equal(sent.length, 1);
  assert.equal(chat.outbox.length, 2);
  for (let i = 0; i < 20; i++) chat.say(`announcement ${i}`);
  assert.equal(chat.outbox.length, 8);
  chat.close();
  assert.equal(chat.stopped, true);
});
