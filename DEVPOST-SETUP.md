# Devpost submission setup — Codex x TwitchCon

**Your submission URL:** https://devpost.com/submit-to/31742-codex-x-twitchcon-hackathon/manage/submissions
**Hackathon page:** https://twitchcon-codex.devpost.com/ · **Deadline:** Mon **2026-11-02 17:00 ET** (2:00 pm PT)
**Prize pool:** $25,000 (1st $10k, 2nd $6k, 3rd $4k, 2×$2.5k) · Free, 18+, solo or team.

## GitHub side — DONE ✅
- Public repository: **https://github.com/bgrubbs1/chatquest-live** (all source + run instructions; MIT license at repo root; README written as a project page with cover image; Codex session ID documented in `CODEX_SESSION.md`).
- Repo description/topics set for discoverability; no secrets committed; `.env` ignored.
- The repo is public, so the Devpost rules' private-repo exception (share with judging@devpost.com) does **not** apply — just paste the URL.

## Devpost side — only you can do this part (auth-bound), ~5 minutes
1. Open the URL above. If prompted, **log in** (use **Log in with GitHub** — authorize Devpost's GitHub app; it only reads public repo data).
2. If you have not joined the hackathon yet: open https://twitchcon-codex.devpost.com/ and click **Join hackathon** (accept the rules). The manage page only accepts submissions from joined participants.
3. On the manage page: **Create project** (or edit the draft if one exists). Two ways:
   - **Import from GitHub** (fastest): Authorize Devpost → choose `bgrubbs1/chatquest-live` → Devpost prefills the project from the README/description. Then verify every field below.
   - **Create new project** manually: paste from `SUBMISSION.md` (already written as Devpost copy).
4. Fill / verify these fields:
   - **Project name:** `ChatQuest Live`
   - **Tagline:** `Your Twitch chat becomes a co-op dungeon party.`
   - **About the project:** paste the sections from [`SUBMISSION.md`](SUBMISSION.md) (Inspiration / What it does / How we built it / Challenges / Accomplishments / What we learned / What's next).
   - **Built with:** `Node.js, JavaScript, OpenAI Codex, Twitch, IRC, Server-Sent Events, HTML, CSS, OBS`
   - **GitHub repository URL:** `https://github.com/bgrubbs1/chatquest-live`
   - **Demo video URL:** the YouTube link you record using [`DEMO.md`](DEMO.md) — **required**, max 3 minutes, Public/Unlisted, must show it running on Twitch and show the Codex thread.
   - **Codex Session ID:** `01a17e0d-66b5-72b3-9a2e-ccb7949a786b` (also in [`CODEX_SESSION.md`](CODEX_SESSION.md); the thread where most of the project was built).
   - **Thumbnail / gallery image:** upload `docs/cover.png` (1280×720).
   - **"Try it out" instructions:** `git clone https://github.com/bgrubbs1/chatquest-live && cd chatquest-live && npm test && npm run demo` then open http://localhost:8787/overlay (no install step).
5. **Submit** and verify you get the submission confirmation. The hackathon's "My projects" list should show ChatQuest Live as submitted. Do this **before Mon 17:00 ET**; the deadline is hard.

## Notes
- The hackathon rules require a **new thread started in Codex for the project** (`/status` inside Codex shows the ID). The ID above is that thread (built via the Codex CLI on your ChatGPT account on 2026-10-27, within the submission period).
- Rules verified 2026-10-27 from https://twitchcon-codex.devpost.com/rules: repo URL + description + Codex session ID + <3-min publicly visible YouTube demo are mandatory; AI coding assistants are explicitly allowed; the project must be newly created during Oct 23 – Nov 2, 2026.
- After submitting, optionally set the repo homepage to the Devpost project URL:
  `gh repo edit bgrubbs1/chatquest-live --homepage <devpost-project-url>`
- No personal data is needed beyond your existing Devpost account; winners provide an affidavit + W-9 at prize time only.
