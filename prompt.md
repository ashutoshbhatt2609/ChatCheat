# ChatCheat — AI Prompts & Build Documentation

> NOTE: `src/ai/prompts.ts` is the source of truth for prompt text; snippets below are illustrative.
>
> This document tracks all AI prompts used in the application and documents what has been built.

---

## 🤖 Gen AI Services Used

| Service | License | Cost | Where Used |
|---------|---------|------|-----------|
| **WebLLM (MLC AI)** | Apache 2.0 | Free | `src/ai/engine.ts` — In-browser LLM inference engine |
| **Phi-3.5-mini-instruct** | MIT | Free | Primary model — best reasoning at 3.8B params, 128K context |
| **Qwen2.5-1.5B-Instruct** | Apache 2.0 | Free | Fallback model — lightweight ~1GB for lower-end devices |
| **WebGPU** | Browser API | Free | Hardware-accelerated local inference |

> **All processing is 100% local.** No API keys, no cloud calls, no data leaves the device.

---

## 📝 AI Prompt Templates

All prompts are defined in [`src/ai/prompts.ts`](src/ai/prompts.ts).

### 1. System Prompt (Base Context)

```
You are ChatCheat, an expert AI assistant specialized in analyzing chat conversations.
Your job is to help users quickly understand what they missed in their chat conversations.
You are precise, concise, and focus on extracting the most important information.
Always respond in valid JSON format as specified in the user's instructions.
Do not include any text outside the JSON object.
```

**Purpose:** Sets the AI's role and ensures structured JSON output for reliable parsing.

---

### 2. Summary Prompt

```
Analyze the following chat conversation and provide a comprehensive summary.

Respond in this exact JSON format:
{
  "tldr": "A concise 2-3 sentence overview of the entire conversation",
  "keyPoints": [
    "First key point or important topic discussed",
    "Second key point...",
    ...up to 10 key points
  ],
  "timeline": [
    {"time": "HH:MM or date", "event": "What happened at this time"},
    ...key events in chronological order
  ]
}

Rules:
- The TL;DR should capture the essence in plain language
- Key points should be actionable and informative, not generic
- Timeline should only include significant events, not every message
- Keep each point concise (under 20 words)
- If the conversation is short, adjust the number of points accordingly

Chat conversation:
```

**Purpose:** Generates the three-tab summary view (TL;DR, Key Points, Timeline).

**Output format:** JSON with `tldr` (string), `keyPoints` (string[]), `timeline` ({time, event}[]).

---

### 3. Action Items Prompt

```
Extract all action items, tasks, commitments, and deadlines from this chat conversation.

Respond in this exact JSON format:
{
  "items": [
    {
      "task": "Description of the task or action item",
      "assignee": "Person responsible (or 'Unassigned' if unclear)",
      "deadline": "Deadline if mentioned (e.g., 'Tomorrow', 'Friday', '2024-01-15') or null",
      "urgency": "high" | "medium" | "low"
    }
  ]
}

Urgency guidelines:
- "high": Explicit deadlines today/tomorrow, blocking issues, urgent requests
- "medium": Tasks with near-future deadlines, important but not urgent
- "low": Nice-to-haves, follow-ups, non-time-sensitive items

Rules:
- Only extract genuine action items, not casual conversation
- If no action items exist, return {"items": []}
- Infer assignee from context (e.g., "Can you send me the file?" → assignee is the recipient)
- Keep task descriptions concise and actionable

Chat conversation:
```

**Purpose:** Populates the Action Items panel with tasks, assignees, deadlines, and urgency levels.

**Output format:** JSON with `items` array of {task, assignee, deadline, urgency}.

---

### 4. Priority / "What Did I Miss?" Prompt

```
Analyze this chat conversation from the perspective of a user named "{username}" who missed these messages.
Identify what's most important for them to know.

Respond in this exact JSON format:
{
  "mentions": [
    {"from": "Sender name", "message": "The message where they mentioned {username}"}
  ],
  "decisions": [
    "A decision that was made that affects {username} or the group"
  ],
  "questions": [
    "Any unanswered question directed at or relevant to {username}"
  ],
  "deadlines": [
    {"item": "Task or event", "date": "When it's due"}
  ]
}

Rules:
- mentions: Only include messages where {username} was directly mentioned or addressed
- decisions: Include group decisions, plan changes, or agreements made
- questions: Include questions asked to {username} or the group that remain unanswered
- deadlines: Include any time-sensitive items mentioned
- If a category has no items, use an empty array
- Be selective — only include truly important items

Chat conversation:
```

**Purpose:** The personalized "What Did I Miss?" view that highlights what matters most to a specific user.

**Output format:** JSON with `mentions`, `decisions`, `questions`, `deadlines` arrays.

---

## 🏗️ What Has Been Built

### Phase 1: Project Setup ✅
- [x] Vite + React 18 + TypeScript project scaffolded
- [x] Tailwind CSS configured with custom dark theme
- [x] PostCSS configured
- [x] TypeScript strict mode configured
- [x] Entry HTML with meta tags and favicon
- [x] Global CSS with component utility classes
- [x] React entry point (`main.tsx`)
- [x] Package.json with all dependencies

### Phase 2: Chat Parsers ✅
- [x] Parser types & interfaces (`src/parsers/types.ts`)
- [x] WhatsApp parser (`src/parsers/whatsapp.ts`)
- [x] Telegram parser (`src/parsers/telegram.ts`)
- [x] Slack parser (`src/parsers/slack.ts`)
- [x] Discord parser (`src/parsers/discord.ts`)
- [x] Generic fallback parser (`src/parsers/generic.ts`)
- [x] Auto-detect router (`src/parsers/index.ts`)

### Phase 3: AI Engine ✅
- [x] Prompt templates (`src/ai/prompts.ts`)
- [x] WebLLM engine wrapper (`src/ai/engine.ts`)
- [x] Web Worker for off-thread inference (`src/ai/worker.ts`)

### Phase 4: Storage ✅
- [x] Dexie.js IndexedDB schema (`src/db/index.ts`)

### Phase 5: UI Components ✅
- [x] Privacy badge (`src/components/PrivacyBadge.tsx`)
- [x] Model loader with progress bar (`src/components/ModelLoader.tsx`)
- [x] Chat import (drag-drop, paste, upload) (`src/components/ChatImport.tsx`)
- [x] Summary view with tabs (`src/components/SummaryView.tsx`)
- [x] Action items list (`src/components/ActionItems.tsx`)
- [x] Priority filter panel (`src/components/PriorityFilter.tsx`)
- [x] Conversation history sidebar (`src/components/ConversationHistory.tsx`)
- [x] Main layout (`src/components/Layout.tsx`)

### Phase 6: App Integration ✅
- [x] App.tsx root component
- [x] State management & AI orchestration

### Phase 7: Testing & Docs ✅
- [x] README.md
- [x] master.md
- [x] prompt.md ✅ (this file)

