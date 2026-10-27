# Devpost submission copy — Codex x TwitchCon Hackathon

Paste these into https://twitchcon-codex.devpost.com/ after creating the project on Devpost.

## Project name
ChatQuest Live

## Tagline (≤60 chars)
Your Twitch chat becomes a co-op dungeon party.

## Inspiration
Chat is normally a passive audience: they watch, they type, and the streamer plays alone. I wanted to flip that — make chat the party. ChatQuest Live turns a Twitch channel into a shared tabletop dungeon crawl where viewers join the party, vote on every action, and watch an OBS overlay react in real time.

## What it does
- Viewers type `!join` to join the party (max 6, 100 HP each), `!vote 1|2|3` (or `!1/!2/!3`) to vote on the next action: **Strike**, **Guard**, or **Rally**. Majority wins; ties go to the lowest number; 20-second rounds.
- The party crawls through six rooms with escalating enemies and ends with a two-phase boss, *The Lag Lord*. Downed viewers can be revived by Rally; a full wipe restarts the run with a fresh party.
- A streamer-friendly **OBS browser-source overlay** shows room depth, party HP bars and damage dealt, enemy HP, live vote counts + countdown, and a rolling event log — all in a retro dungeon-terminal style with CSS-only art.
- The bot reads chat anonymously over Twitch IRC (viewers don't authorize anything); there's an optional authenticated sender mode for round announcements, plus a deterministic demo simulator so the whole experience can be demoed offline.

## How I built it
I built it with **OpenAI Codex**. I wrote a detailed product spec (game rules, overlay requirements, zero-dependency constraints, acceptance tests) and Codex implemented the pure game engine, the Twitch IRC client, the SSE server, the overlay renderer and the test suite in one thread — then ran `npm test` and fixed failures. The project is Node.js 22 with **zero external dependencies** (node: builtins only), which keeps it fast to run and easy to judge.

Codex session ID: `01a17e0d-66b5-72b3-9a2e-ccb7949a786b` *(paste from CODEX_SESSION.md)*

## Challenges I ran into
- Keeping the game deterministic for tests while still feeling random to players — solved with a seeded RNG used by the engine and injected in tests.
- Parsing Twitch IRC safely (malformed lines, PING/PONG keepalive, anonymous `justinfan` login) without any npm dependency — hand-rolled TLS + line parser with a fuzz-ish malformed-input test.
- Making the overlay readable in a 1280×720 capture: legible HP bars, vote counts and log at stream scale.

## Accomplishments I'm proud of
- Zero-dependency implementation: a complete interactive Twitch experience with an OBS-ready overlay, no build step, no API keys needed for viewers.
- A real game loop designed for stream pacing (20s rounds, 6 rooms, ~5-minute run) instead of a tech demo.
- Tests that cover the rules (majority/tie-break, Guard damage reduction, Rally revive, wipe/restart, boss phase, victory) plus a simulator that produces a repeatable 3-minute demo.

## What I learned
- How far a small, strict spec + Codex can go for a real-time app with a UI constraint (OBS).
- Twitch IRC's anonymous read path is a great low-friction way to build chat interactivity without OAuth.
- Designing for spectators: every state change has to be visible on the overlay, not just in chat.

## What's next
- Twitch EventSub for richer events (subs, raids, channel-points redemptions) feeding special moves.
- Per-channel leaderboards and persistent meta-progression between streams.
- An optional LLM dungeon master (via Codex/OpenAI APIs) that narrates rooms in the streamer's voice.

## Built with
Node.js, JavaScript, OpenAI Codex, Twitch IRC, Server-Sent Events, HTML/CSS, macOS/OBS

## Links
- Code repository: `<GITHUB_REPO_URL>` *(must contain all source + run instructions; public or private shared with judging@devpost.com)*
- Demo video (<3 min, YouTube, public/unlisted): `<YOUTUBE_URL>`

## Human checklist (≈25–30 minutes total)
1. **GitHub (2 min):** create a public repo, then from the project folder:
   `git init && git add -A && git commit -m "ChatQuest Live" && git branch -M main && git remote add origin <repo-url> && git push -u origin main`
2. **Twitch (5 min):** you already have a Twitch account/channel; note your channel name. Optionally create an OAuth token at https://twitchtokengenerator.com for sender mode (never commit it).
3. **Codex (0 min):** session ID is already captured in `CODEX_SESSION.md` from the build thread; if you prefer, open the same thread in Codex and copy the ID.
4. **Demo video (10–15 min):** follow `DEMO.md`. Record with QuickTime (or OBS), keep <3:00, show it running on Twitch and show the Codex session. Upload to YouTube as Public/Unlisted.
5. **Devpost (5 min):** https://twitchcon-codex.devpost.com/ → Join Hackathon → paste this copy, fill repo URL, YouTube URL, Codex session ID, submit by **Mon 2026-11-02 17:00 ET**.
6. Eligibility: 18+, not resident of Brazil/Quebec/Russia/Crimea/Cuba/Iran/North Korea; free entry; US OK.

## Rules notes (verified 2026-10-27 via the official rules page)
- "Projects must be newly created during the Submission Period" (Oct 23 – Nov 2, 2026).
- "Participants may use standard development tools … and AI coding assistants."
- Submission must include: repo URL with source + instructions, text description incl. how Codex was used, **Codex session ID for the thread where the Project was built**, and a **<3-minute demo video** uploaded publicly to YouTube showing the Project functioning on Twitch and how it was built with Codex.
- No purchase necessary. Judges: Amazon Advertising LLC (Twitch) + OpenAI Codex promotion.
