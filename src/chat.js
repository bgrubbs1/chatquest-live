/** Minimal resilient Twitch IRC/TLS transport; anonymous reads, optional bot writes. */
import tls from 'node:tls';
import { EventEmitter } from 'node:events';

export function parseIrc(line) {
  if (typeof line !== 'string' || line.length > 8192) return null;
  const match = line.match(/^(?:@\S+ )?:([a-zA-Z0-9_]+)![^ ]+ PRIVMSG #[a-zA-Z0-9_]+ :(.*)$/);
  return match ? { user: match[1].toLowerCase(), text: match[2] } : null;
}
export class TwitchChat extends EventEmitter {
  constructor({ channel, botName, token }) {
    super();
    this.channel = channel.replace(/^#/, '').toLowerCase();
    if (!/^[a-z0-9_]{1,25}$/.test(this.channel)) throw new Error('Invalid TWITCH_CHANNEL; use the channel login name.');
    if (Boolean(botName) !== Boolean(token)) throw new Error('Set both TWITCH_BOT_NAME and TWITCH_OAUTH_TOKEN for bot mode.');
    if (botName && !/^[a-zA-Z0-9_]{1,25}$/.test(botName)) throw new Error('Invalid TWITCH_BOT_NAME.');
    if (token && /[\s\r\n]/.test(token)) throw new Error('Invalid TWITCH_OAUTH_TOKEN.');
    this.bot = Boolean(botName && token);
    this.nick = this.bot ? botName.toLowerCase() : 'justinfan742831';
    this.token = token;
    this.stopped = false;
    this.ready = false;
    this.lastSentAt = 0;
    this.retryMs = 1000;
    this.outbox = [];
  }
  connect() {
    if (this.stopped) return;
    let buffer = '';
    const socket = this.socket = tls.connect({ host: 'irc.chat.twitch.tv', port: 6697, servername: 'irc.chat.twitch.tv' }, () => {
      if (this.bot) socket.write(`PASS ${this.token.startsWith('oauth:') ? this.token : `oauth:${this.token}`}\r\n`);
      if (!this.bot) socket.write('PASS SCHMOOPIIE\r\n');
      socket.write(`NICK ${this.nick}\r\nJOIN #${this.channel}\r\n`);
    });
    socket.setEncoding('utf8');
    socket.setTimeout(240000, () => socket.destroy());
    socket.on('data', chunk => {
      buffer += chunk;
      if (buffer.length > 65536) { buffer = ''; socket.destroy(); return; }
      let end;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (line.startsWith('PING ')) { socket.write(`PONG ${line.slice(5)}\r\n`); continue; }
        if (/^:\S+ 001 /.test(line)) { this.ready = true; this.retryMs = 1000; this.emit('status', 'connected'); }
        if (line.startsWith('RECONNECT')) socket.destroy();
        if (/Login authentication failed|Improperly formatted auth/i.test(line)) this.emit('status', 'authentication failed; check bot credentials');
        const message = parseIrc(line);
        if (message) this.emit('message', message);
      }
    });
    socket.on('error', () => this.emit('status', 'connection error; retrying'));
    socket.on('close', () => {
      this.ready = false;
      this.outbox = [];
      clearTimeout(this.sendTimer); this.sendTimer = null;
      this.emit('status', 'disconnected');
      if (!this.stopped) {
        this.retryTimer = setTimeout(() => this.connect(), this.retryMs);
        this.retryMs = Math.min(30000, this.retryMs * 2);
      }
    });
  }
  say(message) {
    if (!this.bot || !this.ready) return false;
    if (this.outbox.length >= 8) this.outbox.shift();
    this.outbox.push(String(message).replace(/[\r\n]/g, ' ').slice(0, 400));
    this.flush();
    return true;
  }
  flush() {
    if (this.sendTimer || !this.ready || !this.outbox.length) return;
    const wait = Math.max(0, 2100 - (Date.now() - this.lastSentAt));
    if (wait > 0) {
      this.sendTimer = setTimeout(() => { this.sendTimer = null; this.flush(); }, wait);
      return;
    }
    this.lastSentAt = Date.now();
    this.socket.write(`PRIVMSG #${this.channel} :${this.outbox.shift()}\r\n`);
    if (this.outbox.length) this.flush();
  }
  close() {
    this.stopped = true;
    clearTimeout(this.retryTimer); clearTimeout(this.sendTimer);
    this.socket?.destroy();
  }
}
