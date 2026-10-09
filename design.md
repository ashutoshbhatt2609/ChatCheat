# ChatCheat — Product Design Specification

## 1. Purpose

This document defines the visual and interaction direction for ChatCheat. It translates the supplied CogniVo interface reference into a dark, branded workspace for ChatCheat's purpose: helping someone catch up on an imported conversation and find the information that matters to them.

Use the reference for its composition and hierarchy: a compact left rail, a slim workspace header, a centered welcome state, a broad composer, and a row of feature cards. Apply those patterns with a dark palette and ChatCheat's identity. Product requirements and AI behavior remain documented in [prompt.md](prompt.md) and [master.md](master.md).

## 2. Product experience

ChatCheat should feel like a focused, capable workspace. The interface should make importing a conversation the obvious first step, keep recent conversations nearby, and make generated findings easy to scan. It should feel calm and responsive while a local model downloads or analyzes a large chat.

### Design principles

- **Start with the user's task.** Center the welcome and paste/import composer in the main workspace.
- **Keep navigation compact.** Give recent conversations a dedicated left rail with date groupings and a clear new-analysis action.
- **Make catch-up results scannable.** Lead with a short summary, then expose key points, timeline, action items, and personal priorities.
- **Keep privacy visible.** Communicate that analysis runs locally without letting the privacy message dominate the page.
- **Use contrast and restraint.** Layer charcoal surfaces, subtle borders, readable text, and a small amount of lime accent.

## 3. Visual direction

### Reference interpretation

The reference organizes a chat workspace around a compact navigation rail and a large central conversation area. It places brand and navigation on the left, model and utility controls in a slim top bar, a welcome headline above a wide composer, and three explanatory cards below. ChatCheat should follow this hierarchy and density while using dark surfaces and replacing generic assistant actions with chat-import and catch-up features.

### Dark color palette

| Role | Direction | Example |
|---|---|---|
| App frame | Deep charcoal | `#101112` |
| Sidebar | Near-black charcoal | `#151617` |
| Main workspace | Dark graphite | `#1B1D1F` |
| Elevated surface | Soft charcoal | `#222528` |
| Composer surface | Slightly lighter charcoal | `#242729` |
| Primary text | Soft white | `#F4F5F2` |
| Secondary text | Muted gray | `#A2A6A3` |
| Tertiary text | Deep gray, still readable | `#777C79` |
| Accent | Vivid ChatCheat lime | `#C8FF00` |
| Borders | Subtle graphite | `#34383A` |
| Destructive / urgent | Restrained red | Use only for delete and high urgency |

Keep the full app in a dark theme. Distinguish the sidebar, workspace, cards, and composer through small changes in surface brightness and subtle borders rather than large color blocks. Use lime for the brand mark, primary action, selected states, progress, and small feature icons. Do not use lime for long text or large backgrounds.

### Typography

- Use a clean sans-serif system stack or a bundled equivalent.
- Use a large, regular-weight welcome heading; avoid heavy display typography.
- Use medium weights for section headings and controls, regular weights for body copy.
- Keep labels short and sentence case. Use compact uppercase date labels only where they help organize history.
- Maintain readable body sizes and line height; muted text must remain legible against dark surfaces.

### Shape, spacing, and depth

- Use a compact sidebar around 220–250 px on desktop, with a collapse control and clear icon/label alignment.
- Use a 12–18 px radius for the composer and primary cards; use smaller radii for compact controls.
- Separate content with spacing and subtle borders before adding shadows.
- Use restrained shadows to lift the central app surface from the page background.
- Keep the welcome and composer centered in the workspace with a comfortable maximum width.

## 4. Application shell

### Sidebar

The desktop sidebar is a near-black rail spanning the viewport height. It contains:

1. **Brand row:** ChatCheat mark and name, with a collapse control.
2. **Primary action:** “New analysis” starts a fresh import.
3. **Navigation:** History and other destinations only when implemented.
4. **Recent conversations:** Entries grouped under dates such as Today, Yesterday, and Earlier. Each entry shows a truncated conversation name and may show platform or message metadata on hover/selection.
5. **Bottom utility area:** Settings/help only if functional, plus a compact local-processing status.

Keep the history list compact and independently scrollable. Highlight the selected conversation. Keep delete actions discoverable without permanently showing distracting icons. On narrow screens, the sidebar becomes a drawer with a visible menu button and backdrop.

### Workspace header

Use a slim header across the top of the main workspace. It may show the current view or compact model selector on the left, and privacy status plus supported utility controls on the right. Use existing controls only; do not imply that sharing, sign-in, or settings exist when they are not implemented.

The local-processing indicator should open a concise explanation of on-device inference and local storage. Keep it visible but quiet. If model selection is shown in the header, expose download size and progress in a clear status panel when a model is loading.

### Main workspace

The main workspace is a dark, spacious, scrollable surface. Its content changes by state:

- **Empty state:** Centered welcome heading, concise explanation, primary import/paste composer, and three feature cards.
- **Loading state:** Keep the workspace structure and show a clear status for parsing, model download, or analysis.
- **Results state:** Show the conversation identity and metadata, followed by the summary and supporting analysis sections.

On desktop, center the empty-state group in the available workspace and cap its width. Keep the results column readable and allow supporting sections to form a grid only when there is room. On mobile, collapse grids to one column and keep controls within the viewport.

## 5. Empty state and import

The empty state is the visual anchor. Follow the reference's sequence: compact model/workspace header, optional small privacy or local-model status, centered greeting, wide composer, then three feature cards.

Suggested content:

- Heading: **“Catch up on your conversations.”**
- Supporting text: **“Get the key points, decisions, and next steps from a chat export.”**
- Composer placeholder: **“Paste a conversation or drop an export to get started…”**
- Primary action: **“Analyze conversation”**
- Secondary actions: **“Paste from clipboard”** and **“Choose a file”**
- Compact privacy note: **“Analyzed locally on this device.”**

The composer should be a broad, rounded charcoal surface, clearly distinct from the workspace background. Include a usable multiline text area and a compact bottom action row. Keep file selection and clipboard actions discoverable without crowding the primary action. Drag-and-drop should have an obvious active state. Show supported formats (TXT, JSON, CSV, and ZIP only if ZIP parsing is actually supported) in concise helper text.

Below the composer, show three compact feature cards inspired by the reference:

- **Key takeaways** — a concise summary, key points, and timeline.
- **Action items** — owners, deadlines, and urgency found in the conversation.
- **What you missed** — mentions, decisions, open questions, and deadlines relevant to the user.

Each card uses a small lime-accent icon, a short title, and one-line supporting text. Cards explain the product's real capabilities; they are not separate navigation destinations unless they perform a real action.

## 6. Analysis and results

After import, show the conversation name, source platform, message count, participant count, and a clear way to start another analysis. Keep metadata visually secondary and use the same dark surface hierarchy as the empty state.

### Summary

Place the TL;DR first. Use a compact tab row for **Overview**, **Key points**, and **Timeline**. Make the selected state clear with lime text, marker, or border. Keep content as readable text rather than a dense dashboard.

### Action items

Present actions as a list of dark cards or rows with task text first. Assignee and deadline are supporting metadata. Use urgency labels with both text and color so status is not conveyed by color alone. Empty results should use a brief neutral message.

### What you missed

Provide an optional name/handle field, followed by grouped findings for **Mentions**, **Decisions**, **Open questions**, and **Deadlines**. Show counts when available and allow sections to expand or collapse. Make it clear when the user has not entered a name and personalized analysis has not run.

### Loading and errors

- Use dark skeletons that match the final layout while analysis runs.
- Explain whether the app is downloading a model, loading it into memory, parsing a file, or analyzing a conversation.
- Show model download size and progress before a large download; keep detailed model selection available without forcing it into the visual center.
- Offer a clear retry path for recoverable failures.
- If parsing fails, explain supported input formats and preserve the user's pasted text where practical.
- Never imply that analysis succeeded when the model is not ready or a result failed to generate.

## 7. Interaction and behavior

- Import works through paste, clipboard, file selection, and drag-and-drop.
- The selected conversation is visibly highlighted in history.
- Starting a new analysis returns to the empty state without deleting saved conversations.
- Deleting history is a distinct destructive action and must not trigger when selecting a conversation.
- Primary controls have hover, pressed, disabled, loading, and keyboard-focus states suitable for dark backgrounds.
- Use accessible names for icon-only controls and semantic buttons for actions.
- Keep transitions short and subtle; avoid animation that delays task completion.

## 8. Responsive behavior

### Desktop

- Persistent compact sidebar with a fixed, comfortable width.
- Main workspace uses a centered welcome/composer group and three cards in a row.
- Results use a clear vertical hierarchy and may use two columns only when there is room to preserve comfortable reading width.

### Tablet

- Sidebar may collapse to icons or become a drawer, depending on available width.
- Feature cards reduce to two columns, with the remaining card spanning or wrapping naturally.
- Keep the composer full width within the content column.

### Mobile

- Sidebar becomes a drawer with a visible menu control and backdrop.
- Header actions remain reachable and do not overlap the title.
- Composer actions wrap or stack; the primary action remains prominent.
- Cards and result sections use one column.
- Avoid fixed-height content areas that clip pasted text or analysis results.

## 9. Accessibility

- Meet WCAG AA contrast for body text, controls, and focus indicators on dark surfaces.
- Ensure lime accents do not carry meaning without text, shape, or an icon.
- Support full keyboard navigation, including the sidebar drawer, tabs, expandable findings, and import controls.
- Associate form labels and errors with their inputs.
- Announce progress and completion states to assistive technology without repeatedly reading every progress tick.
- Respect reduced-motion preferences.
- Use semantic landmarks for navigation, header, main content, and status content.

## 10. Product and privacy constraints

- Keep ChatCheat branding and the “What Did I Miss?” purpose.
- Preserve local-first processing and the privacy explanation. Do not imply that chat data is uploaded to a service.
- Do not add trial countdowns, upgrade prompts, community links, or unsupported integrations from the reference screenshot.
- Only show controls for capabilities present in the application or explicitly planned in the feature requirements.
- Treat imported conversation content as private user data; avoid putting message text into persistent UI outside the user's local history/results.

## 11. Existing component mapping

| Existing component | Design responsibility |
|---|---|
| `Layout.tsx` | Dark sidebar, dark workspace, responsive navigation drawer, compact header and privacy status |
| `ConversationHistory.tsx` | Recent conversation list, date grouping, active state, platform metadata, accessible delete action |
| `ChatImport.tsx` | Centered paste/import composer, file drop area, clipboard action, supported format guidance |
| `ModelLoader.tsx` | Model choice and honest download/loading/error status, styled as a compact utility or setup state |
| `SummaryView.tsx` | Overview, key points, and timeline in a readable dark surface |
| `ActionItems.tsx` | Scannable task rows with assignee, deadline, and urgency |
| `PriorityFilter.tsx` | User personalization field and grouped priority findings |
| `PrivacyBadge.tsx` | Quiet local-processing status and accessible explanatory popover |

## 12. Visual acceptance criteria

- The app uses a cohesive dark palette with layered charcoal surfaces and restrained lime accents.
- The first impression follows the reference's hierarchy: compact left rail, slim top bar, centered welcome, broad composer, and three feature cards.
- The empty state makes paste/import the obvious first action and explains the catch-up benefit in plain language.
- ChatCheat's identity and actual features remain recognizable.
- History, model readiness, and privacy status are discoverable without competing with the main task.
- Results are readable, ordered by importance, responsive, and distinguishable from loading and empty states.
- Every visible control has a real behavior, an accessible name, and visible focus treatment.
- Desktop and mobile layouts preserve the same task flow without horizontal overflow or clipped content.
