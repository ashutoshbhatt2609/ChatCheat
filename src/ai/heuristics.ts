import type { ParsedConversation } from '../parsers/types';
import type { SummaryData, ActionItemData, PriorityData } from './json';

/**
 * Rule-based ("Quick") analysis. Runs entirely in the browser with no model and no download.
 * Works on small "units" (sentences / lines) so chats and pasted documents use the same rules,
 * and always returns key points and a timeline whenever there is any text.
 */

const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const WEEKDAY = '(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?';
const DEADLINE_RE = new RegExp(
  `\\b(today|tonight|tomorrow|asap|eod|end of day|by ${WEEKDAY}|${WEEKDAY}|next week|this week` +
    `|\\d{1,2}[/-]\\d{1,2}(?:[/-]\\d{2,4})?|\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}|${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?` +
    `|\\d{1,2}:\\d{2}\\s?(?:am|pm)?|\\d{1,2}\\s?(?:am|pm))\\b`,
  'i',
);
const ACTION_RE =
  /\b(please|can you|could you|will you|need to|needs to|need a|need the|must|should|have to|don't forget|remember to|make sure|todo|to-do|action item|i'll|i will|let's|submit|send|share|review|finish|complete|prepare|update|bring|carry|register|attend|ensure|arrive|report|upload|collect|fill)\b/i;
const DECISION_RE = /\b(decided|decision|agreed|we(?:'ll| will) go with|final(?:ly)?|confirmed|approved|let's go with|moved to|postponed|rescheduled|cancelled|canceled)\b/i;
const URGENT_RE = /\b(urgent|asap|immediately|today|tonight|eod|blocker|blocking|critical)\b/i;
const IMPORTANT_RE = /\b(important|mandatory|compulsory|required|deadline|last date|note|rules?|venue|fees?|schedule|agenda|round|result|winner|prize|eligib\w+)\b/i;

interface Unit {
  sender: string;
  time: Date;
  text: string;
}

const clip = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const date = (t: string) => t.match(DEADLINE_RE)?.[0] ?? null;
const isDoc = (conv: ParsedConversation) => conv.participants.length < 2;

/** Every message split into sentences / lines, keeping who said it and when. */
function unitsOf(conv: ParsedConversation): Unit[] {
  return conv.messages.flatMap((m) =>
    m.content
      .split(/\n+|(?<=[.!?])\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2)
      .map((text) => ({ sender: m.sender, time: m.timestamp, text })),
  );
}

const mentionsUser = (text: string, name: string) =>
  Boolean(name.trim()) && new RegExp('(?:^|[^\\w])@?' + escapeRe(name.trim()) + '(?![\\w])', 'i').test(text);

/** How informative a unit looks; 0 means "nothing special". */
const score = (u: Unit) =>
  (DECISION_RE.test(u.text) ? 3 : 0) + (DEADLINE_RE.test(u.text) ? 3 : 0) + (ACTION_RE.test(u.text) ? 2 : 0) +
  (u.text.includes('?') ? 2 : 0) + (IMPORTANT_RE.test(u.text) ? 2 : 0) + (/\d/.test(u.text) ? 1 : 0);

const label = (u: Unit, doc: boolean) => (doc ? clip(u.text) : `${u.sender}: ${clip(u.text)}`);

/** Top scoring units in reading order; padded with the longest remaining units so it is never empty. */
function keyUnits(units: Unit[], max = 8): Unit[] {
  const picked = new Set(
    units.map((u, i) => ({ u, i, s: score(u) })).filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.i - b.i).slice(0, max).map((x) => x.u),
  );
  if (picked.size < 3) {
    units.filter((u) => !picked.has(u)).sort((a, b) => b.text.length - a.text.length)
      .slice(0, Math.min(5, units.length) - picked.size).forEach((u) => picked.add(u));
  }
  const seen = new Set<string>();
  return units.filter((u) => picked.has(u) && !seen.has(u.text) && seen.add(u.text));
}

export function heuristicSummary(conv: ParsedConversation): SummaryData {
  const units = unitsOf(conv);
  const doc = isDoc(conv);
  const key = keyUnits(units);
  const keyPoints = key.map((u) => label(u, doc));

  // Real message times exist when timestamps differ; pasted text has none, so use dates found in the text.
  const realTimes = new Set(conv.messages.map((m) => Math.floor(m.timestamp.getTime() / 60000))).size > 1;
  const dated = units.filter((u) => DECISION_RE.test(u.text) || URGENT_RE.test(u.text) || DEADLINE_RE.test(u.text));
  const events = (dated.length >= 2 ? dated : key).slice(0, 8);
  const timeline = events.map((u, i) => ({
    time: realTimes
      ? u.time.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : (date(u.text) ?? `Step ${i + 1}`),
    event: label(u, doc),
  }));

  const counts = new Map<string, number>();
  conv.messages.forEach((m) => counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
  const tail = 'Quick analysis — pick an AI engine in the top bar for a fuller summary.';
  const tldr = doc
    ? `${clip(units[0]?.text ?? 'Empty text', 150)} Found ${plural(units.filter((u) => DEADLINE_RE.test(u.text)).length, 'date/time mention')} and ${plural(units.filter((u) => ACTION_RE.test(u.text)).length, 'action')} in ${plural(units.length, 'line')}. ${tail}`
    : `${plural(conv.messages.length, 'message')} between ${plural(conv.participants.length, 'participant')} (most active: ${top.join(', ') || 'n/a'}). Found ${plural(keyPoints.length, 'key point')}. ${tail}`;

  return { tldr, keyPoints, timeline };
}

export function heuristicActionItems(conv: ParsedConversation): ActionItemData[] {
  const seen = new Set<string>();
  const items = unitsOf(conv)
    .filter((u) => ACTION_RE.test(u.text) && u.text.length >= 8 && !seen.has(u.text) && seen.add(u.text))
    .map((u): ActionItemData => {
      const deadline = date(u.text);
      return {
        task: clip(u.text, 120),
        assignee: (u.text.match(/@(\w+)/) ?? u.text.match(/^(\w+),\s/) ?? [])[1] ?? 'Unassigned',
        deadline,
        urgency: URGENT_RE.test(u.text) ? 'high' : deadline ? 'medium' : 'low',
      };
    });
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return items.sort((a, b) => rank[a.urgency] - rank[b.urgency]).slice(0, 15);
}

export function heuristicPriorities(conv: ParsedConversation, username: string): PriorityData {
  const units = unitsOf(conv);
  const me = username.trim().toLowerCase();
  const doc = isDoc(conv);
  const mine = (u: Unit) => mentionsUser(u.text, username);
  const fmt = (u: Unit, n = 140) => label({ ...u, text: clip(u.text, n) }, doc);
  return {
    mentions: units.filter((u) => mine(u) && u.sender.toLowerCase() !== me)
      .slice(0, 10).map((u) => ({ from: u.sender, message: clip(u.text, 160) })),
    decisions: units.filter((u) => DECISION_RE.test(u.text)).slice(0, 8).map((u) => fmt(u)),
    questions: units
      .filter((u, i) => u.text.includes('?') && !units.slice(i + 1, i + 6).some((n) => n.sender.toLowerCase() === me)
        && (mine(u) || !/@\w+/.test(u.text)))
      .slice(0, 8).map((u) => fmt(u)),
    deadlines: units.filter((u) => DEADLINE_RE.test(u.text) && (doc || ACTION_RE.test(u.text) || mine(u)))
      .slice(0, 8).map((u) => ({ item: clip(u.text, 100), date: date(u.text) ?? '' })),
  };
}
