# ChatQuest Live — 3-minute demo video script (<3:00 required)

**Recording setup:** macOS QuickTime Player → File → New Screen Recording (or OBS at 1080p). No copyrighted music. Show your face optional. Have ready:
1. A terminal in `contest-entries/twitchcon-codex/` (or the cloned repo)
2. Browser tab 1: your Twitch channel `https://twitch.tv/<yourchannel>/chat`
3. Browser tab 2: the overlay `http://localhost:8787/overlay`
4. A second browser window/tab logged in as a viewer account (or an alt account) to type in chat — OR ask a friend to type.
5. (Optional, for the "built with Codex" section) the Codex app/CLI showing this project's thread.

| Time | On screen | Voiceover / captions |
|---|---|---|
| 0:00–0:10 | Title card: "ChatQuest Live — your Twitch chat becomes the party." | "Chat is normally an audience. I wanted to turn it into a party." |
| 0:10–0:25 | Terminal: `npm test` passing, then `TWITCH_CHANNEL=<yourchannel> node src/server.js` starting. | "ChatQuest Live is a co-op dungeon crawler that lives in a Twitch chat, with an overlay for streamers. It's pure Node.js, zero dependencies, and it reads chat anonymously so viewers don't need to authorize anything." |
| 0:25–0:45 | Codex app / terminal running Codex with the project open; scroll the session. | "I built it with OpenAI Codex. I wrote the spec — a 6-room campaign, vote-based combat, an OBS overlay — and Codex implemented the engine, the IRC client, the server and the tests. This is the Codex session ID: `01a17e0d-66b5-72b3-9a2e-ccb7949a786b`." |
| 0:45–1:10 | Twitch chat tab. Type `!join`, `!join` from alt account. Then switch to overlay: party roster appears with HP bars. | "Viewers join with !join — no app, no auth. The overlay is a browser source in OBS." |
| 1:10–1:40 | Chat: `!vote 1`, `!vote 2`, `!vote 3` from a couple of accounts; overlay shows live vote counts and countdown, then action resolves, enemy hits back, log updates. | "Every 20 seconds chat votes on one of three actions — Strike, Guard or Rally. Majority wins, the enemy hits back, and the log narrates it. Ties go to the lowest number." |
| 1:40–2:15 | Overlay through room clears, boss phase two ("The Lag Lord"), HP dropping; victory screen. | "Six rooms, escalating enemies, and a two-phase boss. When the party wipes, it restarts with a fresh team; when they win, the overlay celebrates. It's tuned so a run lasts about five minutes." |
| 2:15–2:35 | OBS: show Browser Source settings (1280x720, overlay URL) + a quick shot of `src/game.js` tests. | "Adding it to OBS is one browser source. The engine is deterministic and tested, so rounds are fair and reproducible." |
| 2:35–2:50 | Back to overlay with chat moving. | "ChatQuest Live turns lurkers into a party — and it was built end to end with Codex." |

**Rules to respect in the video:** <3:00 total; must show the project **running on Twitch** (live chat tab) and **how it was built with Codex** (Codex session open); no third-party trademarks/copyrighted music. Upload to YouTube as Public or Unlisted (judges need to view it) and paste the link into the Devpost submission.

**Tips:** record 2–3 takes; start the game with a few minutes of buffer so the boss is reachable within the recording (use `--demo` only for a backup shot, since the rules require footage of it functioning on Twitch); keep the mouse idle while the overlay is the focus.
