import type { ParsedConversation } from '../parsers/types';
import type { SummaryData, ActionItemData, PriorityData } from './json';

/**
 * Rule-based analysis used when no local model is loaded (e.g. no WebGPU).
 * Runs entirely in the browser and needs no download.
 */

const DEADLINE_RE =
  /\b(today|tonight|tomorrow|asap|eod|end of day|by (?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?|(?:mon|tues|wednes|thurs|fri|satur|sun)day|next week|this week|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{1,2}\s?(?:am|pm))\b/i;
const ACTION_RE =
  /\b(please|can you|could you|will you|need to|needs to|need a|need the|must|should|have to|don't forget|remember to|make sure|todo|to-do|action item|i'll|i will|let's|submit|send|share|review|finish|complete|prepare|update)\b/i;
const DECISION_RE = /\b(decided|decision|agreed|we(?:'ll| will) go with|final(?:ly)?|confirmed|approved|let's go with|moved to|postponed|rescheduled|cancelled|canceled)\b/i;
const URGENT_RE = /\b(urgent|asap|immediately|today|tonight|eod|blocker|blocking|critical)\b/i;

const clip = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const sentences = (m: string) => m.split(/(?<=[.!?])\s+/).filter(Boolean);

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function mentionsUser(content: string, name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  return new RegExp('(?:^|[^\\w])@?' + escapeRe(n) + '(?![\\w])', 'i').test(content);
}

export function heuristicSummary(conv: ParsedConversation): SummaryData {
  const msgs = conv.messages.filter((m) => m.content.trim());
  const counts = new Map<string, number>();
  msgs.forEach((m) => counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);

  const keyMsgs = msgs.filter((m) => DECISION_RE.test(m.content) || DEADLINE_RE.test(m.content) || m.content.includes('?'));
  const keyPoints = keyMsgs.slice(0, 8).map((m) => `${m.sender}: ${clip(sentences(m.content)[0] ?? m.content)}`);

  const timeline = msgs
    .filter((m) => DECISION_RE.test(m.content) || URGENT_RE.test(m.content))
    .slice(0, 8)
    .map((m) => ({
      time: m.timestamp.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      event: `${m.sender}: ${clip(m.content, 110)}`,
    }));

  return {
    tldr: `${msgs.length} messages between ${conv.participants.length} participants (most active: ${top.join(', ') || 'n/a'}). Found ${keyPoints.length} notable messages. Quick analysis — load an AI model for a fuller summary.`,
    keyPoints,
    timeline,
  };
}

export function heuristicActionItems(conv: ParsedConversation): ActionItemData[] {
  const items: ActionItemData[] = [];
  for (const m of conv.messages) {
    if (!ACTION_RE.test(m.content) || m.content.length < 8) continue;
    const mentioned = (m.content.match(/@(\w+)/) ?? m.content.match(/^(\w+),\s/) ?? [])[1];
    const deadline = (m.content.match(DEADLINE_RE) ?? [])[0] ?? null;
    items.push({
      task: clip(sentences(m.content).find((s) => ACTION_RE.test(s)) ?? m.content, 120),
      assignee: mentioned ?? 'Unassigned',
      deadline,
      urgency: URGENT_RE.test(m.content) ? 'high' : deadline ? 'medium' : 'low',
    });
  }
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return items.sort((a, b) => rank[a.urgency] - rank[b.urgency]).slice(0, 15);
}

export function heuristicPriorities(conv: ParsedConversation, username: string): PriorityData {
  const msgs = conv.messages;
  const mine = (m: (typeof msgs)[number]) => mentionsUser(m.content, username);
  return {
    mentions: msgs.filter((m) => mine(m) && m.sender.toLowerCase() !== username.trim().toLowerCase())
      .slice(0, 10).map((m) => ({ from: m.sender, message: clip(m.content, 160) })),
    decisions: msgs.filter((m) => DECISION_RE.test(m.content)).slice(0, 8).map((m) => `${m.sender}: ${clip(m.content, 140)}`),
    questions: msgs.filter((m, i) => m.content.includes('?') &&
        !msgs.slice(i + 1, i + 6).some((n) => n.sender === username.trim()) &&
        (mine(m) || !/@\w+/.test(m.content)))
      .slice(0, 8).map((m) => `${m.sender}: ${clip(m.content, 140)}`),
    deadlines: msgs.filter((m) => DEADLINE_RE.test(m.content) && (ACTION_RE.test(m.content) || mine(m)))
      .slice(0, 8).map((m) => ({ item: clip(m.content, 100), date: (m.content.match(DEADLINE_RE) ?? [''])[0] })),
  };
}
