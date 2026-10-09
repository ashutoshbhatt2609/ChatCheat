# ChatCheat — "What Did I Miss?"

An AI micro-app that turns an overwhelming chat into a quick catch-up: a summary, the action items and deadlines,
and the messages that mention **you**. Local-first by default; cloud AI and account sync are opt-in.

**Challenge:** The Unread Problem — "What Did I Miss?"

## What it does

- **Import** a chat by pasting text, dropping a file, or using the clipboard. Auto-detects **WhatsApp, Telegram, Slack, Discord** (and a generic `Name: message` fallback). Try it instantly with the built-in **sample chat**.
- **Summarize:** TL;DR, key points, timeline.
- **Action items:** task, assignee, deadline, urgency (high / medium / low), sorted by urgency.
- **Prioritize for you:** enter your name to see mentions, decisions, unanswered questions and deadlines.
- **History:** past chats are saved and grouped by Today / Yesterday / Earlier. "Delete all my data" wipes them.

## Choose where analysis runs

| Engine | Quality | Needs | Where your chat goes |
|--------|---------|-------|----------------------|
| **Quick analysis** (default) | Good for decisions, deadlines, mentions | Nothing | Stays in your browser |
| **On-device model** (WebLLM: Phi-3.5 Mini or Qwen2.5 1.5B) | AI-written | WebGPU browser + 1.2–2.2 GB one-time download | Stays in your browser |
| **Gemini (cloud)** | Best | Sign in with Google | Chat text is sent to Google Gemini through this app's server |

If an AI engine fails, the app falls back to Quick analysis and tells you why. The top-right pill always shows where data goes right now.

## Architecture

```
Browser (React + Vite + Tailwind)
 ├─ Parsers → Quick analysis (rules) ──────────────► results      (always on-device)
 ├─ WebLLM (WebGPU) ───────────────────────────────► results      (on-device, optional)
 ├─ IndexedDB (Dexie): chats + results on this device
 │
 └─ /api  (Vercel serverless functions, only when configured)
      ├─ auth.ts     Google ID-token verification → HttpOnly session cookie
      ├─ data.ts     per-user chat sync  ──────────► Turso (libSQL)
      └─ analyze.ts  Gemini proxy (key stays server-side, sign-in required)
```

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (all environments), then **redeploy**.
All are server-side only; never prefix them with `VITE_`. See [`.env.example`](.env.example).

| Variable | Needed for | How to get it |
|----------|-----------|---------------|
| `GEMINI_API_KEY` | Cloud AI | Free key (no card): https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | Optional | Override the model. Default tries `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.0-flash` |
| `GOOGLE_CLIENT_ID` | Google sign-in | Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → *Web application*. Add your local and Vercel origins (e.g. `http://localhost:5173`, `https://<your-app>.vercel.app`) under **Authorized JavaScript origins**. No client secret is needed. |
| `SESSION_SECRET` | Google sign-in | Random string, at least 32 characters (`openssl rand -base64 48`) |
| `TURSO_DATABASE_URL` | Account sync | `turso db create chatcheat` then `turso db show chatcheat --url` (starts with `libsql://`) |
| `TURSO_AUTH_TOKEN` | Account sync | `turso db tokens create chatcheat` |

Everything is optional. With **no variables** the app still works fully on-device. Features switch on as variables appear:

- Sign-in button appears when `GOOGLE_CLIENT_ID` **and** `SESSION_SECRET` are set.
- Sync needs sign-in **and** both `TURSO_*` variables. Tables are created automatically on first use.
- Cloud AI needs `GEMINI_API_KEY` (and sign-in, when sign-in is configured).

## Set up the Turso database

1. Sign in at https://turso.tech (Google or GitHub) and **Create Database** named `chatcheat`.
2. Copy its URL (`libsql://…`) and create a token (database page → *Create Token*), or with the CLI: `turso db show chatcheat --url` and `turso db tokens create chatcheat`.
3. Put them in `.env` (local) and in Vercel as `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`.
4. Optional check: `npm run db:init` connects, creates the tables from [`db/schema.sql`](db/schema.sql) and prints `Tables ready: conversations, users`. (The app also creates them automatically on first use.)

## Deploy to Vercel

1. Push this repo to GitHub (public) and import it in Vercel. Framework preset: **Vite** (auto-detected; settings come from `vercel.json`).
2. Add the environment variables above and redeploy.
3. Add the deployed URL to the Google OAuth client's **Authorized JavaScript origins**.
4. Open the site, sign in, run the sample chat, and check the Gemini option in the top-bar menu.

`api/` contains only the serverless functions (`auth.ts`, `data.ts`, `analyze.ts`, helpers in `_lib/`). Tests live in `tests/`
so they are never deployed as functions.

## Local development

```bash
npm install
cp .env.example .env     # fill only what you need
npm run dev              # http://localhost:5173 — the dev server also serves /api/*
npm test                 # parsers, AI-output validation, rule-based analysis, API security
npm run lint             # TypeScript type check
npm run build            # production build
```

For local sync use your remote `libsql://` Turso URL (the server uses Turso's HTTP client).

## Privacy and security

- Default mode makes **no network request with your chat**. The only traffic is optional: model files (Hugging Face / GitHub, cached after first download) and Google's sign-in script.
- Cloud AI and sync are **opt-in**, disclosed in the UI, and need Google sign-in. Google's free Gemini tier may use requests to improve its products.
- API key and database credentials exist only in server environment variables.
- Sessions: Google ID token verified server-side (signature, issuer, audience, expiry, verified email) → signed, HttpOnly, SameSite=Lax cookie (7 days). State-changing calls also need a custom `X-Requested-With` header (CSRF).
- Every database query is scoped to the user id from the session and uses bound parameters; tests cover cross-user access, SQL injection, forged cookies and missing CSRF headers (`tests/api/backend.test.ts`).
- Input validation and size limits on every endpoint, per-user and per-IP rate limits (best-effort per server instance), prompts held server-side so the proxy cannot be used as an open LLM relay, generic error messages, no logging of chat content.
- Security headers via `vercel.json` (CSP limited to Google sign-in and model hosts, `nosniff`, frame denial, permissions policy).
- AI output is treated as untrusted: JSON is extracted and validated before use, and the UI renders it through React's escaping.

## Gen AI services used

| Service | Where | Used for |
|---------|-------|----------|
| **Google Gemini API** (free tier) | `api/analyze.ts` | Optional cloud summary, action items, priorities |
| **WebLLM** (MLC AI, Apache 2.0) | `src/ai/engine.ts` | Optional in-browser inference runtime |
| **Phi-3.5-mini-instruct** (Microsoft, MIT) | via WebLLM | Optional on-device model |
| **Qwen2.5-1.5B-Instruct** (Alibaba, Apache 2.0) | via WebLLM | Optional lightweight on-device model |

Also used (not Gen AI): **Google Identity Services** (sign-in) and **Turso** (account storage).
Prompts are documented in [`prompt.md`](prompt.md); architecture details in [`master.md`](master.md).

## Exporting chats

- **WhatsApp:** chat → ⋮ → More → Export chat → Without media → share the `.txt`.
- **Telegram Desktop:** chat → ⋮ → Export chat history → format *JSON*.
- **Slack:** export a channel's messages as JSON (array of messages).
- **Discord:** a DiscordChatExporter text export, or paste messages as `Name: message`.

## Project structure

```
api/            Vercel serverless functions (auth, data, analyze) + _lib helpers
tests/api/      Security and API tests (not deployed)
src/ai/         engine (WebLLM), prompts, JSON validation, rule-based analysis, cloud client
src/auth/       Google sign-in button and session hook
src/components/ Layout, composer, engine picker, results views, history, privacy pill
src/db/         IndexedDB storage (Dexie)
src/parsers/    WhatsApp, Telegram, Slack, Discord, generic + auto-detect
```

## Known limits

- Very long chats are cut to the most recent ~24k characters for AI engines (Quick analysis reads everything).
- On-device models need a WebGPU browser (recent Chrome/Edge) and enough GPU memory.
- Rate limiting is per serverless instance, so it is a best-effort guard, not a hard quota.
- Chats imported before signing in are not uploaded automatically; only chats imported while signed in sync.

## License

MIT
