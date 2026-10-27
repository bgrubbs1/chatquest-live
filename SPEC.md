# ChatQuest Live — build specification

Build a complete, working project in this directory called **ChatQuest Live**: an interactive Twitch experience where the streamer's chat collectively plays a co-op dungeon crawler rendered as an OBS browser-source overlay.

**Stack:** Node.js 22, **zero external npm dependencies** (node: builtins only). ESM modules. Tests with `node:test`. No TypeScript, no build step.

## Product
- A local HTTP server serves an overlay page (`/overlay`) sized for OBS (1280x720 logical, scales down) plus a small status page (`/`).
- A game engine runs rounds on a timer. Viewers join with `!join`, and each round chat votes on one of three actions with `!vote 1|2|3` (also accept `!1`, `!2`, `!3`). The majority action resolves, then the enemy acts, then the next round starts.
- Server reads Twitch chat via IRC over TLS (`irc.chat.twitch.tv:6697`) in anonymous read-only mode (`justinfan` nickname). Optional bot mode: if `TWITCH_BOT_NAME` + `TWITCH_OAUTH_TOKEN` env vars are set, the bot also sends round summaries/announcements to the channel. Reading chat must work with NO credentials.
- `--demo` flag (or `npm run demo`): no Twitch connection; a deterministic simulated chat drives the game so the overlay is demo-able offline. The simulation must produce a good 3-minute demo: viewers join over time, voting is close, party takes damage, reaches the boss, wins.
- Overlay updates in real time over Server-Sent Events (`/events`) and can be opened in any browser for local testing.
- Overlay visual style: retro dungeon terminal / pixel-dungeon vibe built with CSS only (no external images/fonts). Show: room name + depth, party roster with HP bars and damage-dealt numbers, enemy name + HP bar, the three voteable actions with live vote counts and a countdown ring/bar, event log (last ~10 events), and a "how to play" footer. Everything must be readable in a 1280x720 capture.

## Game rules (engine is the source of truth; tune numbers so a 6-room run lasts ~3–6 minutes in demo mode)
- Rooms: 6 fixed rooms with escalating enemies (e.g. Moss Slime, Bat Swarm, Stone Golem, Bone Wraith, Ember Drake, final boss "The Lag Lord" with two phases). Each enemy has HP, damage, and a short flavor line.
- Party: max 6 viewers; each member 100 HP. Joining mid-run allowed and spawns with full HP. If a member's HP hits 0 they are "downed" (greyed in overlay, can be revived by a heal action); if all members are downed → wipe → game over screen → auto-restart after ~30s with a fresh party.
- Actions: `1 Strike` (party deals damage split across alive members with small crit chance), `2 Guard` (halves incoming damage this round, small heal), `3 Rally` (heals lowest-HP member, revives one downed member, no damage). Enemy always retaliates for its damage unless the voted action is Guard (halved) — keep deterministic with a seeded RNG so tests are reproducible.
- Round timer: 20s voting; if no votes, default to Strike. Majority wins; ties broken by lowest action number.
- Commands parsed case-insensitively; ignore unknown users' commands unless they have joined; `!join` before the game starts or mid-run; `!help` posts short instructions (only if bot mode is enabled; otherwise logged).
- Emit structured events for: join, vote, round_start, action_resolved, enemy_attack, room_cleared, boss_phase, victory, wipe, restart. The overlay renders from state, not from text parsing.

## Files to create
```
package.json            # name chatquest-live, type module, scripts: start, demo, test
src/game.js             # pure engine: seeded RNG, state machine, command handling, tick()
src/chat.js             # Twitch IRC over TLS reader + optional bot sender; emits {user, text}
src/server.js           # HTTP + SSE server, static overlay, demo simulator, CLI flags/env
public/index.html       # overlay markup
public/style.css        # overlay styling (CSS-only art direction)
public/app.js           # SSE client + renderer
test/game.test.js       # thorough tests for engine determinism/rules
README.md               # overview, quickstart, live-mode setup, architecture, OBS setup
LICENSE                 # MIT
.gitignore
.env.example            # TWITCH_CHANNEL, TWITCH_BOT_NAME, TWITCH_OAUTH_TOKEN, PORT
```

## Required behavior / acceptance criteria
1. `npm test` passes with meaningful assertions (at least 12 tests: join/limits, vote majority + tie-break, guard halving, rally revive, downed/wipe, room progression, boss phase transition, victory, restart, deterministic seeded RNG, state serialization for SSE).
2. `node src/server.js --demo` starts on port 8787 (or `PORT`), serves `/`, `/overlay`, `/state`, `/events`, and drives the simulated game with no Twitch connection and no errors. `curl http://localhost:8787/state` returns valid JSON.
3. `node src/server.js` without `--demo` and without `TWITCH_CHANNEL` exits with a clear error message; with `TWITCH_CHANNEL` set it connects anonymously and logs chat commands. Never crash on malformed IRC messages.
4. Overlay renders correctly with no console errors (verify by fetching HTML/CSS/JS); SSE reconnect logic present.
5. All code documented with brief header comments. No secrets committed. `.env.example` contains names only.
6. README explains exactly how to test in 60 seconds, how to run live on Twitch (including how to get an OAuth token for the optional sending mode), and how to add the overlay to OBS (add Browser source, 1280x720 URL, no audio).

## Style
Clean, small, readable modules. Prefer clarity over cleverness. The overlay is the centerpiece: make it look good with CSS (dark stone background, glowing HP bars, monospace type, subtle animation on damage). No external network calls at runtime.

Do not modify this SPEC.md. Create everything else. Run the tests and fix failures before finishing. End by printing a short summary of what was built and how to run it.
