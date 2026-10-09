# ChatCheat — Master Document

> **Complete project overview, architecture, and development reference.**
> Last updated: October 9, 2026

---

## 📋 Project Summary

| Field | Detail |
|-------|--------|
| **Project** | ChatCheat — "What Did I Miss?" |
| **Type** | AI Micro-App (Hackathon Challenge) |
| **Problem** | Users overwhelmed by unread messages across chat platforms |
| **Solution** | Local-first AI chat summarizer that runs 100% in the browser |
| **Privacy** | All processing on-device — no data ever leaves the user's browser |
| **Stack** | React 18 + Vite + Tailwind + WebLLM + Dexie.js |
| **AI Models** | Phi-3.5-mini-instruct (primary), Qwen2.5-1.5B-Instruct (fallback) |
| **Cost** | $0 — fully open-source, no API keys needed |

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     BROWSER (All Local)                       │
│                                                               │
│  ┌─────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │   React UI   │───▶│  Chat Parsers    │───▶│   WebLLM     │  │
│  │  (Tailwind)  │◀──│  (WA/TG/SL/DC)   │    │  (Phi-3.5-mini)│  │
│  │              │    │                  │    │   via WebGPU │  │
│  └──────┬───────┘    └──────────────────┘    └──────┬───────┘  │
│         │                                           │          │
│         ▼                                           ▼          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              IndexedDB (via Dexie.js)                  │    │
│  │  Conversations │ Messages │ Summaries │ Action Items   │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
     ▲                                                    
     │  NO external API calls                              
     │  NO data leaves device                              
     │  NO server required                                 
```

---

## 📁 Complete File Structure

```
ChatCHeat/
├── index.html                  # Entry HTML
├── package.json                # Dependencies & scripts
├── vite.config.ts              # Vite + WebGPU headers
├── tailwind.config.js          # Custom dark theme
├── postcss.config.js           # PostCSS for Tailwind
├── tsconfig.json               # TypeScript strict config
├── tsconfig.node.json          # Node-side TS config
├── README.md                   # Project documentation
├── prompt.md                   # AI prompts documentation
├── master.md                   # This file
├── public/
│   └── favicon.svg             # Chat bubble favicon
└── src/
    ├── main.tsx                # React entry point
    ├── App.tsx                 # Root component (orchestrator)
    ├── index.css               # Global styles + Tailwind
    ├── vite-env.d.ts           # Vite type declarations
    │
    ├── parsers/                # Chat format parsers
    │   ├── types.ts            # Shared types (Message, ParsedConversation)
    │   ├── whatsapp.ts         # WhatsApp .txt export parser
    │   ├── telegram.ts         # Telegram JSON export parser
    │   ├── slack.ts            # Slack JSON export parser
    │   ├── discord.ts          # Discord CSV/text parser
    │   ├── generic.ts          # Fallback heuristic parser
    │   └── index.ts            # Auto-detect & route
    │
    ├── ai/                     # AI inference engine
    │   ├── engine.ts           # WebLLM wrapper (load, complete, stream)
    │   ├── prompts.ts          # All AI prompt templates
    │   └── worker.ts           # Web Worker for off-thread inference
    │
    ├── db/                     # Local storage
    │   └── index.ts            # Dexie.js IndexedDB schema & CRUD
    │
    └── components/             # React UI components
        ├── Layout.tsx          # App shell (header, sidebar, footer)
        ├── PrivacyBadge.tsx    # "100% Local" privacy indicator
        ├── ModelLoader.tsx     # Model selection & download progress
        ├── ChatImport.tsx      # Drag-drop, paste, upload input
        ├── SummaryView.tsx     # TL;DR / Key Points / Timeline tabs
        ├── ActionItems.tsx     # Extracted tasks with urgency
        ├── PriorityFilter.tsx  # @Mentions, decisions, questions, deadlines
        └── ConversationHistory.tsx  # Sidebar chat history
```

---

## 🔧 Tech Stack Details

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | UI framework |
| Vite | 6.0 | Build tool & dev server |
| TypeScript | 5.7 | Type safety (strict mode) |
| Tailwind CSS | 3.4 | Utility-first styling |
| Lucide React | 0.468 | Icon library |
| React Dropzone | 14.3 | Drag-and-drop file input |

### AI / ML
| Technology | Version | Purpose |
|-----------|---------|---------|
| WebLLM (MLC AI) | 0.2.85+ | In-browser LLM inference via WebGPU |
| Phi-3.5-mini-instruct | 3.8B params | Primary model — MIT license |
| Qwen2.5-1.5B-Instruct | 1.5B params | Lightweight fallback — Apache 2.0 |

### Storage
| Technology | Version | Purpose |
|-----------|---------|---------|
| Dexie.js | 4.0 | IndexedDB ORM for local persistence |

### Testing & Quality
| Technology | Version | Purpose |
|-----------|---------|---------|
| Vitest | 2.1 | Unit & integration testing |
| ESLint | 9.16 | Code linting |

---

## 🧠 AI Prompt Summary

> See [`prompt.md`](prompt.md) for full prompt text and documentation.

| Prompt | Purpose | Output Schema |
|--------|---------|--------------|
| **System** | Establishes AI as a chat analyzer, enforces JSON output | N/A |
| **Summary** | Generates TL;DR, key points, timeline | `{tldr, keyPoints[], timeline[]}` |
| **Action Items** | Extracts tasks, assignees, deadlines, urgency | `{items[{task, assignee, deadline, urgency}]}` |
| **Priority** | Personalizes results for a specific user | `{mentions[], decisions[], questions[], deadlines[]}` |

---

## 🔄 Data Flow

```
1. USER imports chat (paste / drag-drop / upload)
         │
2. AUTO-DETECT platform format
         │
3. PARSE into structured Message[] via platform-specific parser
         │
4. STORE conversation in IndexedDB
         │
5. FORMAT messages as text for AI consumption
         │
6. SEND to WebLLM with appropriate prompt template
         │
7. PARSE JSON response from AI
         │
8. DISPLAY results in tabbed UI (Summary / Actions / Priorities)
         │
9. CACHE results in IndexedDB for instant reload
```

---

## 🎯 Features Checklist

### Core Features
- [x] Multi-format chat import (WhatsApp, Telegram, Slack, Discord)
- [x] Auto-detect chat platform format
- [x] Drag-and-drop file upload
- [x] Paste from clipboard
- [x] Direct text paste area

### AI Analysis
- [x] TL;DR summary generation
- [x] Key points extraction
- [x] Chronological timeline
- [x] Action item extraction with urgency scoring
- [x] Priority filter (mentions, decisions, questions, deadlines)
- [x] Personalized "What Did I Miss?" for specific users

### Privacy & Security
- [x] 100% local processing (WebLLM + WebGPU)
- [x] No network requests for AI inference
- [x] All data stored in browser IndexedDB
- [x] Privacy badge indicator in UI
- [x] Clear all data option

### UX / Accessibility
- [x] Responsive design (mobile → desktop)
- [x] Dark theme with custom color palette
- [x] Loading skeletons during AI processing
- [x] Conversation history with quick access
- [x] Model selection with progress tracking
- [x] Keyboard-navigable components
- [x] ARIA labels on all interactive elements
- [x] Semantic HTML structure

---

## 🤖 Gen AI Services Documentation

> **Required for hackathon Submission Requirement 5/5**

### Services Used

| # | Service | License | Cost | File(s) | How Used |
|---|---------|---------|------|---------|----------|
| 1 | **WebLLM** (MLC AI) | Apache 2.0 | Free | `src/ai/engine.ts` | Provides the inference engine that loads and runs LLMs directly in the browser via WebGPU |
| 2 | **Phi-3.5-mini-instruct** (Microsoft) | MIT | Free | Loaded via WebLLM | Primary model for summarization, action item extraction, and priority analysis |
| 3 | **Qwen2.5-1.5B-Instruct** (Alibaba) | Apache 2.0 | Free | Loaded via WebLLM | Lightweight fallback model for devices with less GPU memory |
| 4 | **WebGPU** (Browser API) | W3C Standard | Free | Browser runtime | Hardware-accelerated GPU compute for model inference |

### How Gen AI is Used

1. **Summarization** (`src/ai/prompts.ts` → `SUMMARY_PROMPT`): Chat messages are concatenated and sent to the model with a prompt that instructs it to produce a TL;DR, key points, and a timeline in JSON format.

2. **Action Item Extraction** (`src/ai/prompts.ts` → `ACTION_ITEMS_PROMPT`): The same chat text is processed with a different prompt that focuses on extracting tasks, assignees, deadlines, and urgency levels.

3. **Priority Analysis** (`src/ai/prompts.ts` → `PRIORITY_PROMPT`): A personalized prompt that takes the user's name and identifies mentions, decisions, unanswered questions, and deadlines relevant to that specific user.

4. **All inference** happens via `src/ai/engine.ts` which wraps WebLLM's `MLCEngine` class, providing model loading with progress callbacks, chat completions, and streaming responses.

---

## 🚀 Commands Reference

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Lint code
npm run lint
```

---

## 📊 Evaluation Alignment

| Evaluation Criteria | How We Address It |
|--------------------|-------------------|
| **Code Quality** | TypeScript strict mode, ESLint, clean component architecture, JSDoc comments |
| **Security** | Zero network requests, local-only processing, no API keys, no data exfiltration |
| **Efficiency** | WebGPU hardware acceleration, lazy model loading, cached results in IndexedDB |
| **Testing** | Vitest unit tests for parsers, component tests planned |
| **Accessibility** | ARIA labels, keyboard navigation, semantic HTML, high-contrast dark theme |
| **Problem Statement Alignment** | Directly addresses "What Did I Miss?" — summarizes chats, extracts actions, highlights priorities |

---

## 📦 Deployment

- **Platform**: Vercel (static site)
- **Build Output**: `dist/` directory
- **Server Required**: None — fully client-side
- **CDN**: Vercel Edge Network for fast global delivery
- **Model Delivery**: Downloaded directly from HuggingFace CDN to user's browser cache on first use
