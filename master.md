# ChatCheat — Master Document

Complete project overview, architecture and reference. Last updated: 9 October 2026.

## Summary

| Field | Detail |
|-------|--------|
| Project | ChatCheat — "What Did I Miss?" |
| Challenge | The Unread Problem: summarize long chats, surface decisions and action items, prioritize by urgency and relevance, highlight mentions and deadlines |
| Approach | Local-first. Default analysis runs in the browser; cloud AI and account sync are opt-in |
| Stack | React 18, Vite 6, TypeScript (strict), Tailwind 3, WebLLM, Dexie (IndexedDB), Vercel serverless functions, Turso (libSQL), Google Sign-In, cloud LLM (OpenRouter free models / DeepSeek / Gemini) |
| Cost | $0 (free tiers: OpenRouter free models, Turso, Vercel hobby) |

## Architecture

```
                         Browser
 ┌─────────────────────────────────────────────────────────┐
 │ React UI ── Parsers (WA/TG/Slack/Discord/generic)       │
 │    │            │                                       │
 │    │            ├─► Quick analysis (rules)   on-device  │
 │    │            ├─► WebLLM (Phi-3.5 / Qwen)  on-device  │
 │    │            └─► /api/analyze ─────────────┐ opt-in  │
 │    ├─ IndexedDB (Dexie): chats + results      │         │
 │    └─ /api/auth, /api/data (when signed in) ──┼───┐     │
 └───────────────────────────────────────────────┼───┼─────┘
                                                 │   │
                          Vercel functions (Node ESM, TypeScript)
                          auth.ts: verify Google ID token → HttpOnly cookie
                          data.ts: per-user CRUD ───────────► Turso
                          analyze.ts: auth + validation + rate limit ─► OpenRouter / DeepSeek / Gemini
```

### Trust boundaries

- The browser is untrusted. User identity comes only from the signed session cookie, never from request fields.
- Secrets (`OPENROUTER_API_KEY` / `DEEPSEEK_API_KEY` / `GEMINI_API_KEY`, `SESSION_SECRET`, `TURSO_AUTH_TOKEN`) exist only in server environment variables.
- Chat text leaves the device only when the user (a) selects the cloud AI engine, or (b) is signed in, in which case newly imported chats and results are stored in their Turso account.

## Data flow

1. User imports a chat (paste, drop, clipboard, sample).
2. `parseChat` auto-detects the platform and produces `ParsedConversation`.
3. Conversation is saved in IndexedDB with a fresh UUID.
4. Analysis by the selected engine: rules / WebLLM / cloud (DeepSeek or Gemini). AI output is extracted and validated (`src/ai/json.ts`); on any failure the rule-based result is shown with a visible notice.
5. Results are cached in IndexedDB.
6. If signed in with sync available, the conversation, messages and results are `PUT` to `/api/data` (Turso, scoped to the user).
7. Entering a name runs the priorities task (mentions, decisions, open questions, deadlines).

## Environment variables (server-side only)

| Variable | Enables | Source |
|----------|---------|--------|
| `OPENROUTER_API_KEY` | Cloud AI, free models | https://openrouter.ai/keys (free; enable free endpoints in privacy settings) |
| `DEEPSEEK_API_KEY` | Cloud AI, DeepSeek direct | https://platform.deepseek.com (paid balance, not free) |
| `GEMINI_API_KEY` | Cloud AI, Gemini | https://aistudio.google.com/apikey (free) |
| `LLM_PROVIDER`, `LLM_MODEL` | Optional overrides | — |

Provider order when several keys are set: OpenRouter, then DeepSeek, then Gemini (`LLM_PROVIDER` forces one).
| `GOOGLE_CLIENT_ID` | Google sign-in | Google Cloud Console OAuth client (Web); add site origins |
| `SESSION_SECRET` | Google sign-in | Random, 32+ characters |
| `TURSO_DATABASE_URL` | Account sync | `turso db show <db> --url` |
| `TURSO_AUTH_TOKEN` | Account sync | `turso db tokens create <db>` |

None are required; features turn on when their variables are present. `GET /api/auth?action=config` reports which are available (the client ID is public by design).

## Database (Turso / libSQL) — `api/_lib/db.ts`

Created automatically (`CREATE TABLE IF NOT EXISTS`) on first request.

- `users(id PK = Google sub, email, name, picture, created_at)`
- `conversations(user_id FK → users ON DELETE CASCADE, id, name, platform, message_count, start_date, end_date, messages_json, summary_json, actions_json, created_at, updated_at)` with **composite primary key (user_id, id)** so ids can never collide across users, and an index on `(user_id, created_at DESC)`.

All statements use bound parameters and a `user_id = ?` filter taken from the verified session.
Local device storage (IndexedDB via Dexie) holds `conversations`, `messages`, `summaries`, `actionItems`, `priorities`.

## API reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth?action=config` | GET | none | Public flags and Google client ID |
| `/api/auth?action=me` | GET | cookie | Current user or `null` |
| `/api/auth?action=google` | POST | Google ID token | Verify token, set session cookie (10/min/IP) |
| `/api/auth?action=logout` | POST | CSRF header | Clear cookie |
| `/api/data` | GET | session | List own conversations; `?id=` fetches one |
| `/api/data` | PUT | session + CSRF | Upsert one conversation (validated, ≤ 2 MB) |
| `/api/data` | DELETE | session + CSRF | `?id=` one, `?all=1` everything of the caller |
| `/api/analyze` | GET / POST | session when sign-in is configured | Availability probe / run a task via the configured provider (20/min/IP) |

## Security checklist

- Google ID token: signature, issuer, audience, expiry, `email_verified`.
- Session: HS256 JWT, HttpOnly, SameSite=Lax, Secure on HTTPS, 7-day expiry.
- CSRF: custom `X-Requested-With: chatcheat` header required on state-changing requests.
- Authorization: user id from session only; composite keys; IDOR, SQL-injection, forged-cookie tests.
- Validation: ids, platform allow-list, message count/length, total size, task allow-list, username sanitising.
- Abuse limits: per-user and per-IP rate limits (best-effort per instance); sign-in required for cloud AI.
- Prompts are server-side; the cloud system prompt treats chat text as data (prompt-injection hardening).
- Errors are generic; chat content is never logged.
- Headers: CSP (Google sign-in + model hosts only), `nosniff`, frame denial, referrer and permissions policies.
- No analytics, no third-party trackers.

## Features checklist

- [x] Import: paste, drag-drop, clipboard, sample chat; WhatsApp, Telegram, Slack, Discord, generic
- [x] Summary: TL;DR, key points, timeline
- [x] Action items with assignee, deadline, urgency
- [x] Personal priorities: mentions, decisions, open questions, deadlines
- [x] Engines: rule-based (default), WebLLM on-device, cloud AI (DeepSeek / Gemini); automatic fallback
- [x] Google sign-in and per-user Turso sync; sync indicator in history
- [x] History grouped by day; delete one or all (device and account)
- [x] Privacy pill and details panel showing where data goes
- [x] Dark UI: sidebar, engine picker, centered composer, quick-start cards
- [x] Loading, empty, error and notice states; keyboard focus rings; ARIA labels; responsive layout

## Gen AI services (Submission Requirement 5/5)

| # | Service | Where | Use |
|---|---------|-------|-----|
| 1 | Free models via OpenRouter (or DeepSeek API / Gemini with your own key) | `api/analyze.ts`, `api/_lib/llm.ts` | Optional cloud summaries, action items, priorities |
| 2 | WebLLM (MLC AI) | `src/ai/engine.ts` | In-browser inference runtime |
| 3 | Phi-3.5-mini-instruct (Microsoft, MIT) | via WebLLM | Optional on-device model |
| 4 | Qwen2.5-1.5B-Instruct (Alibaba, Apache 2.0) | via WebLLM | Optional lighter on-device model |

Non-Gen-AI services: Google Identity Services (sign-in), Turso (storage), Vercel (hosting). Prompts: see [`prompt.md`](prompt.md).

## File structure

```
api/
  auth.ts, data.ts, analyze.ts     serverless functions
  _lib/http.ts, session.ts, db.ts  shared helpers (underscore = not a function)
  tsconfig.json                    NodeNext/ESM settings used by Vercel
tests/api/                         security + API tests (kept out of api/ so they are not deployed)
src/
  App.tsx                          orchestration
  api.ts, cloudSync.ts             fetch helpers, account sync client
  auth/                            GoogleButton.tsx, useAuth.ts
  ai/                              engine.ts, prompts.ts, json.ts, heuristics.ts, cloud.ts, run.ts (task runner)
  hooks/useDismiss.ts              shared outside-click / Escape handling for menus
  components/                      Layout, ChatImport, EnginePicker, PrivacyBadge, SummaryView,
                                   ActionItems, PriorityFilter, ConversationHistory
  db/index.ts                      Dexie schema
  parsers/                         whatsapp, telegram, slack, discord, generic, index, types
vercel.json                        build, function timeout, security headers
.env.example                       variable template
```

## Commands

```bash
npm install
npm run dev      # app + /api on http://localhost:5173
npm test         # 56 tests: parsers, AI JSON validation, heuristics, API security
npm run lint     # TypeScript type check (tsc -b)
npm run build    # production build to dist/
```

## Evaluation alignment

| Criterion | How it is addressed |
|-----------|--------------------|
| Code quality | Strict TypeScript, small modules, validation layer for AI output, documented prompts |
| Security | Server-side secrets, verified sessions, CSRF header, scoped queries, input limits, rate limits, CSP, security tests |
| Efficiency | Rule-based default (instant), lazy model loading, cached results, context truncation |
| Testing | 56 Vitest tests including authorization, injection and token-verification cases |
| Accessibility | Labels, roles, focus rings, keyboard-operable menus (Esc closes), live regions for notices, responsive layout |
| Problem alignment | Summaries, action items, prioritization, mentions/deadlines, and local-first processing as the default |

## Deployment

Vercel (Vite preset, output `dist/`), functions in `api/` (Node, ESM, 30 s max duration). Add the environment variables, redeploy, then add the deployed URL to the Google OAuth client's Authorized JavaScript origins. Model files for on-device AI download from Hugging Face on first use and are cached by the browser.
