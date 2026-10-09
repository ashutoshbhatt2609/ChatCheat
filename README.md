# 🗨️ ChatCheat — "What Did I Miss?"

> **AI-powered chat summarizer that runs 100% locally.** Never miss important messages again.

![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local-green?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![AI](https://img.shields.io/badge/AI-WebLLM-purple?style=flat-square)

## 🎯 Problem

You open your phone after a few hours and find **hundreds of unread messages** across WhatsApp groups, Slack channels, and Discord servers. Reading through everything takes forever. You might miss important decisions, action items, or messages directed at you.

**ChatCheat solves this** by using AI to instantly summarize your chats, extract action items, and highlight what matters most — **all without your data ever leaving your device**.

---

## ✨ Features

### 📥 Multi-Format Chat Import
- **Paste** raw chat text directly
- **Upload** `.txt`, `.json`, `.csv` chat exports
- **Auto-detect** platform: WhatsApp, Telegram, Slack, Discord
- Drag-and-drop support

### 📝 Smart Summarization
- **TL;DR** — Quick 2-3 sentence overview
- **Key Points** — Bullet-point highlights
- **Timeline** — Chronological summary of important events

### ✅ Action Item Extraction
- Identifies tasks, deadlines, commitments
- Tags who's responsible
- Urgency scoring: 🔴 High / 🟡 Medium / 🟢 Low

### 🔍 Priority Filter ("What Did I Miss?")
- **@Mentions** — Messages where you were mentioned
- **Decisions** — Key decisions made in your absence
- **Questions** — Unanswered questions directed at you
- **Deadlines** — Time-sensitive items

### 🔒 100% Local & Private
- All AI processing runs in your browser via WebGPU
- **No data sent to any server** — ever
- No API keys, no cloud calls
- GDPR/HIPAA compliant by design

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  Browser (All Local)             │
│                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  │
│  │   React   │→│ Chat Parsers │→│  WebLLM    │  │
│  │    UI     │  │ (WA/TG/Slack│  │(Phi-3.5-mini)│  │
│  │           │←│  /Discord)   │  │  via GPU   │  │
│  └──────────┘  └──────────────┘  └───────────┘  │
│       ↕                              ↕           │
│  ┌──────────────────────────────────────────┐    │
│  │         IndexedDB (Dexie.js)              │    │
│  │    Conversations · Summaries · Actions    │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | Fast, modern UI |
| Styling | Tailwind CSS | Responsive dark theme |
| Icons | Lucide React | Consistent iconography |
| AI Engine | WebLLM (MLC AI) | In-browser LLM inference |
| Primary Model | Phi-3.5-mini-instruct (3.8B) | Best reasoning at this size |
| Fallback Model | Qwen2.5-1.5B-Instruct | Lightweight alternative |
| Storage | IndexedDB (Dexie.js) | Local persistence |
| Testing | Vitest | Unit & integration tests |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Chrome 113+** (or any browser with WebGPU support)
- A GPU with 4GB+ VRAM (for best performance)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/chatcheat.git
cd chatcheat

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### First Run
1. Select an AI model (Phi-3.5-mini recommended)
2. Wait for the model to download (~2GB, cached after first time)
3. Paste or upload a chat export
4. Get instant summaries, action items, and priority highlights!

---

## 📋 How to Export Chats

### WhatsApp
1. Open the chat → ⋮ → More → Export Chat → Without Media
2. Share the `.txt` file

### Telegram
1. Open the chat → ⋮ → Export Chat History
2. Choose JSON format

### Slack
1. Go to Workspace settings → Import/Export
2. Download the export

### Discord
1. Use DiscordChatExporter or copy-paste messages directly

---

## 🤖 Gen AI Services Used

| Service | License | Cost | Where Used |
|---------|---------|------|-----------|
| **WebLLM** (MLC AI) | Apache 2.0 | Free | `src/ai/engine.ts` — In-browser inference engine |
| **Phi-3.5-mini-instruct** | MIT | Free | Primary summarization model |
| **Qwen2.5-1.5B-Instruct** | Apache 2.0 | Free | Lightweight fallback model |
| **WebGPU** | Browser API | Free | Hardware-accelerated inference |

> See [`prompt.md`](prompt.md) for detailed documentation of all AI prompts used.

---

## 🔐 Privacy & Security

- ✅ **Zero network requests** for AI processing
- ✅ **All data stays in browser** (IndexedDB)
- ✅ **No telemetry** or analytics
- ✅ **No API keys** required
- ✅ **Open source** — audit the code yourself
- ✅ Works **offline** after model is cached

---

## ♿ Accessibility

- Full keyboard navigation
- Semantic HTML with ARIA labels
- Screen reader compatible
- Responsive design (mobile → desktop)
- High contrast dark theme

---

## 📁 Project Structure

```
src/
├── ai/
│   ├── engine.ts        # WebLLM wrapper & model management
│   ├── prompts.ts       # AI prompt templates
│   └── worker.ts        # Web Worker for off-thread inference
├── components/
│   ├── ActionItems.tsx   # Action items display
│   ├── ChatImport.tsx    # Chat import (drag-drop, paste, upload)
│   ├── ConversationHistory.tsx  # Sidebar history
│   ├── Layout.tsx        # Main app layout
│   ├── ModelLoader.tsx   # Model download progress
│   ├── PriorityFilter.tsx # Priority/mentions filter
│   ├── PrivacyBadge.tsx  # Privacy indicator
│   └── SummaryView.tsx   # Summary with tabs
├── db/
│   └── index.ts          # IndexedDB storage (Dexie.js)
├── parsers/
│   ├── types.ts          # Shared types
│   ├── whatsapp.ts       # WhatsApp parser
│   ├── telegram.ts       # Telegram parser
│   ├── slack.ts          # Slack parser
│   ├── discord.ts        # Discord parser
│   ├── generic.ts        # Fallback parser
│   └── index.ts          # Auto-detect & route
├── App.tsx               # Root component
├── main.tsx              # Entry point
└── index.css             # Global styles
```

---

## 🧪 Testing

```bash
npm run test        # Run all tests
npm run lint        # Lint code
npm run build       # Production build
```

---

## 📜 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Acknowledgments

- [WebLLM](https://webllm.mlc.ai/) by MLC AI — for making in-browser LLM inference possible
- [Tailwind CSS](https://tailwindcss.com/) — for the beautiful utility-first styling
- [Lucide](https://lucide.dev/) — for the clean icon set
- [Dexie.js](https://dexie.org/) — for the elegant IndexedDB wrapper

## Environment variables

| Name | Required | Where | Purpose |
|------|----------|-------|---------|
| `GEMINI_API_KEY` | Optional (enables cloud AI) | Server only (Vercel project settings / local `.env`) | Free key from https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | Optional | Server only | Override model; default tries `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.0-flash` |

Never prefix these with `VITE_` — they must stay on the server. Without a key the app still works:
the cloud toggle is hidden and the on-device rule-based analyzer (or an optional local WebLLM model) is used.

**Cloud AI is opt-in.** When the user ticks "Use cloud AI", chat text goes browser → `/api/analyze` (this app's
serverless function, which holds the key, validates input, rate-limits and does not log or store content) → Google Gemini.
On Google's free tier, requests may be used to improve Google products; this is disclosed in the UI.

Local dev: copy `.env.example` to `.env`, set the key, run `npm run dev` (the dev server mounts `/api/analyze`).
Deploy: Vercel, add `GEMINI_API_KEY`, build `npm run build`, output `dist/`.

## Gen AI services used
- **Google Gemini API (free tier)** — optional cloud summaries, action items, priorities via `api/analyze.ts`
- **WebLLM (MLC AI)** — optional in-browser inference (`src/ai/engine.ts`)
- **Phi-3.5-mini-instruct** (Microsoft, MIT) and **Qwen2.5-1.5B-Instruct** (Alibaba, Apache 2.0) — summaries, action items, priorities (`src/ai/prompts.ts`)

## Tests
`npm test` — parsers, JSON validation and the rule-based analyzer.
