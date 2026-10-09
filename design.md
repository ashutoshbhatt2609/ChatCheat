> **Decision (owner): ChatCheat keeps its dark theme.** The light/lime palette below is superseded; the layout and interaction guidance still apply.

# ChatCheat — Product Design Specification

## 1. Purpose

This document defines the visual and interaction direction for ChatCheat. It translates the supplied EchoAI screenshot into a design for ChatCheat's own job: helping someone catch up on an imported conversation and find the information that matters to them.

The screenshot is a visual reference for composition, contrast, spacing, and tone. ChatCheat keeps its own name, privacy promise, and conversation-analysis features. Product requirements and AI behavior remain documented in [prompt.md](prompt.md) and [master.md](master.md).

## 2. Product experience

ChatCheat should feel like a quiet, capable workspace. The interface should make the next step obvious, keep the conversation history close at hand, and make generated findings easy to scan. It should feel lightweight even while the local model is downloading or analyzing a large chat.

### Design principles

- **Start with the user's task.** The empty state invites the user to paste or import a chat.
- **Make catch-up results scannable.** Lead with a short summary, then expose key points, timeline, action items, and personal priorities.
- **Keep privacy visible.** Clearly communicate that analysis runs locally, without letting the privacy message dominate the page.
- **Use restraint.** Large areas of calm neutral space, a small number of clear surfaces, and lime accents for primary actions and selected states.
- **Preserve continuity.** Keep history and the model's readiness accessible when moving between import and results.

## 3. Visual direction

### Reference interpretation

The reference uses a near-black vertical navigation rail beside a large, pale workspace. It combines concise labels, rounded controls, a centered welcome state, a broad input surface, and a small set of lime-highlighted shortcuts. ChatCheat should use that overall visual structure and density while replacing the reference product's generic assistant content with chat-import and catch-up content.

### Color palette

| Role | Direction | Example |
|---|---|---|
| Sidebar | Near-black charcoal | `#111111` |
| Main canvas | Soft off-white | `#F6F6F4` |
| Primary surface | White | `#FFFFFF` |
| Primary text | Ink black | `#171717` |
| Secondary text | Cool gray | `#747474` |
| Muted text | Light gray with accessible contrast | `#929292` |
| Accent | Vivid lime | `#C8FF00` |
| Borders | Subtle warm gray | `#E8E8E5` |
| Destructive / urgent | Restrained red | Use only for delete and high urgency |

Use dark text on light content surfaces and light text in the sidebar. Reserve lime for primary buttons, active navigation markers, small feature icons, progress, and focus accents. Do not use lime for long text or large backgrounds.

### Typography

- Use a clean sans-serif system stack or a bundled equivalent.
- Use a large, regular-weight welcome heading; avoid heavy display typography.
- Use medium weights for section headings and controls, regular weights for body copy.
- Keep labels short and sentence case. Use uppercase only for compact metadata where it improves scanning.
- Maintain readable body sizes and line height; secondary text should remain legible against both surfaces.

### Shape, spacing, and depth

- Use a persistent sidebar around 220–260 px on desktop, with a compact icon-and-label layout.
- Use a 12–18 px radius for primary cards and input surfaces; use smaller radii for compact controls.
- Separate content with spacing and subtle borders before adding shadows.
- Keep shadows soft and infrequent. Avoid glass effects, neon glows, and heavy gradients.
- Center the empty-state content in the available workspace with a comfortable maximum width.

## 4. Application shell

### Sidebar

The desktop sidebar is a near-black rail spanning the viewport height. It contains:

1. **Brand row:** ChatCheat mark and name; a collapse control where supported.
2. **Primary action:** “New analysis” or “New chat” starts a fresh import.
3. **Navigation:** History and, only if implemented, other real destinations. Do not show decorative or nonfunctional links.
4. **Recent conversations:** Conversation name, platform or message metadata, selected state, and a clear delete action.
5. **Bottom utility area:** A compact local-processing status and settings/help links only when they lead to working destinations.

Keep the history list compact and scrollable. Truncate long names without hiding the delete affordance. On narrow screens, the sidebar becomes a drawer opened by a menu button.

### Workspace header

The workspace header sits at the top of the light canvas. It may show a compact model selector/status on the left and privacy status plus account or overflow actions on the right. Use existing controls only; do not imply that sign-in, sharing, or settings exist when they are not implemented.

The local-processing indicator should open a concise explanation of on-device inference and local storage. Keep it visible but quiet.

### Main workspace

The main canvas is light, spacious, and scrollable. Its content changes by state:

- **Empty state:** Welcome message, concise explanation, primary import/paste composer, and optional feature shortcut cards.
- **Loading state:** Keep the import context and show a clear, calm progress state for parsing, model download, or analysis.
- **Results state:** Conversation identity and metadata, followed by the summary and supporting analysis sections.

On desktop, cap reading width for text while allowing cards and grids to use the full content column. On mobile, collapse grids to one column and keep controls within the viewport.

## 5. Empty state and import

The empty state is the visual anchor and should borrow the screenshot's centered greeting and broad composer arrangement.

Suggested content:

- Heading: **“Catch up on your conversations.”**
- Supporting text: **“Get the key points, decisions, and next steps from a chat export.”**
- Main composer label or placeholder: **“Paste a conversation or drop an export to get started…”**
- Primary action: **“Analyze conversation”**
- Secondary actions: **“Paste from clipboard”** and **“Choose a file”**
- Compact note: **“Your chat is analyzed on this device.”**

The composer should be a white rounded surface with a subtle border. Keep the text area usable for long content and provide a clear upload affordance. Drag-and-drop should have an obvious active state. Show supported formats (TXT, JSON, CSV, and ZIP only if ZIP parsing is actually supported) without crowding the primary action.

Feature cards below the composer can preview the product's real outputs:

- **Key takeaways** — a concise summary and important points.
- **Action items** — owners, deadlines, and urgency from the conversation.
- **What you missed** — mentions, decisions, open questions, and deadlines relevant to the user.

Cards are explanatory shortcuts, not separate navigation destinations unless they perform a real action.

## 6. Analysis and results

After import, show the conversation name, source platform, message count, participant count, and a clear way to start another analysis. Keep metadata visually secondary.

### Summary

Place the TL;DR first. Use a segmented tab or compact tab row for **Overview**, **Key points**, and **Timeline**. Keep the selected state clear and render each view as readable text rather than a dense dashboard.

### Action items

Present actions as a list of white cards or rows with task text first. Assignee and deadline are supporting metadata. Use urgency labels with both text and color so status is not conveyed by color alone. Empty results should use a brief neutral message.

### What you missed

Provide an optional name/handle field, followed by grouped findings for **Mentions**, **Decisions**, **Open questions**, and **Deadlines**. Show counts when available and allow sections to expand or collapse. Make it clear when the user has not entered a name and personalized analysis has not run.

### Loading and errors

- Use skeletons that match the final layout while analysis runs.
- Explain whether the app is downloading a model, loading it into memory, parsing a file, or analyzing a conversation.
- Show model download size and progress before a large download; keep detailed model selection available without forcing it into the main visual hierarchy.
- Offer a clear retry path for recoverable failures.
- If parsing fails, explain the supported input formats and preserve the user's pasted text where practical.
- Never imply that analysis succeeded when the model is not ready or a result failed to generate.

## 7. Interaction and behavior

- Import works through paste, clipboard, file selection, and drag-and-drop.
- The selected conversation is visibly highlighted in history.
- Starting a new analysis returns to the empty state without deleting saved conversations.
- Deleting history is a distinct destructive action and must not trigger when selecting a conversation.
- Primary controls have hover, pressed, disabled, loading, and keyboard-focus states.
- Use accessible names for icon-only controls and semantic buttons for actions.
- Keep transitions short and subtle; avoid animation that delays task completion.

## 8. Responsive behavior

### Desktop

- Persistent sidebar with a fixed, comfortable width.
- Main workspace uses a centered content column and can display feature cards in a three-column row.
- Results use a clear vertical hierarchy and may use two columns only when there is room to preserve comfortable reading width.

### Tablet

- Sidebar may collapse to icons or become a drawer, depending on available width.
- Feature cards reduce to two columns.
- Keep the composer full width within the content column.

### Mobile

- Sidebar becomes a drawer with a visible menu control and backdrop.
- Header actions remain reachable and do not overlap the title.
- Composer actions wrap or stack; the primary action remains prominent.
- Cards and result sections use one column.
- Avoid fixed-height content areas that clip pasted text or analysis results.

## 9. Accessibility

- Meet WCAG AA contrast for body text, controls, and focus indicators.
- Ensure lime accents do not carry meaning without text, shape, or an icon.
- Support full keyboard navigation, including the sidebar drawer, tabs, expandable findings, and import controls.
- Associate form labels and errors with their inputs.
- Announce progress and completion states to assistive technology without repeatedly reading every progress tick.
- Respect reduced-motion preferences.
- Use semantic landmarks for navigation, header, main content, and footer/status content.

## 10. Product and privacy constraints

- Keep ChatCheat branding and the “What Did I Miss?” purpose.
- Preserve local-first processing and the privacy explanation. Do not imply that chat data is uploaded to a service.
- Do not add fake account avatars, trial countdowns, upgrade prompts, community links, or unsupported integrations from the reference screenshot.
- Only show controls for capabilities present in the application or explicitly planned in the feature requirements.
- Treat imported conversation content as private user data; avoid putting message text into persistent UI outside the user's local history/results.

## 11. Existing component mapping

| Existing component | Design responsibility |
|---|---|
| `Layout.tsx` | Dark sidebar, light workspace, responsive navigation drawer, compact header and privacy status |
| `ConversationHistory.tsx` | Recent conversation list, active state, platform metadata, accessible delete action |
| `ChatImport.tsx` | Centered paste/import composer, file drop area, clipboard action, supported format guidance |
| `ModelLoader.tsx` | Model choice and honest download/loading/error status, styled as a compact utility or setup state |
| `SummaryView.tsx` | Overview, key points, and timeline in a light, readable surface |
| `ActionItems.tsx` | Scannable task rows with assignee, deadline, and urgency |
| `PriorityFilter.tsx` | User personalization field and grouped priority findings |
| `PrivacyBadge.tsx` | Quiet local-processing status and accessible explanatory popover |

## 12. Visual acceptance criteria

- The first impression has a dark navigation rail and a calm light workspace, with lime used as a restrained accent.
- The empty state makes paste/import the obvious first action and explains the catch-up benefit in plain language.
- The app's identity and actual features remain recognizable as ChatCheat.
- History, import, model readiness, and privacy status are discoverable without competing with the main task.
- Results are readable, ordered by importance, responsive, and distinguishable from loading and empty states.
- Every visible control has a real behavior, an accessible name, and visible focus treatment.
- The desktop and mobile layouts preserve the same task flow without horizontal overflow or clipped content.
