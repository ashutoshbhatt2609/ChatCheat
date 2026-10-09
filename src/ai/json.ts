/**
 * Helpers for turning small-model output into trusted, typed data.
 * LLM output is untrusted input: always extract, parse and validate it.
 */

export interface SummaryData {
  tldr: string;
  keyPoints: string[];
  timeline: { time: string; event: string }[];
}

export interface ActionItemData {
  task: string;
  assignee: string;
  deadline: string | null;
  urgency: 'high' | 'medium' | 'low';
}

export interface PriorityData {
  mentions: { from: string; message: string }[];
  decisions: string[];
  questions: string[];
  deadlines: { item: string; date: string }[];
}

/** Pull the first balanced JSON object out of text (handles ```json fences and chatter). */
export function extractJson(raw: string): unknown {
  const text = raw.replace(/```(?:json)?/gi, '');
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object in model output');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error('Unterminated JSON object in model output');
}

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v.trim() : v == null ? fallback : String(v);

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

export function parseSummary(raw: string): SummaryData {
  const o = obj(extractJson(raw));
  return {
    tldr: str(o.tldr),
    keyPoints: arr(o.keyPoints).map((p) => str(p)).filter(Boolean),
    timeline: arr(o.timeline)
      .map((t) => ({ time: str(obj(t).time), event: str(obj(t).event) }))
      .filter((t) => t.event),
  };
}

export function parseActionItems(raw: string): ActionItemData[] {
  const o = obj(extractJson(raw));
  return arr(o.items)
    .map((i) => {
      const r = obj(i);
      const urgency = str(r.urgency).toLowerCase();
      return {
        task: str(r.task),
        assignee: str(r.assignee, 'Unassigned') || 'Unassigned',
        deadline: r.deadline ? str(r.deadline) : null,
        urgency: (['high', 'medium', 'low'].includes(urgency) ? urgency : 'medium') as ActionItemData['urgency'],
      };
    })
    .filter((i) => i.task);
}

export function parsePriorities(raw: string): PriorityData {
  const o = obj(extractJson(raw));
  return {
    mentions: arr(o.mentions)
      .map((m) => ({ from: str(obj(m).from), message: str(obj(m).message) }))
      .filter((m) => m.message),
    decisions: arr(o.decisions).map((d) => str(d)).filter(Boolean),
    questions: arr(o.questions).map((q) => str(q)).filter(Boolean),
    deadlines: arr(o.deadlines)
      .map((d) => ({ item: str(obj(d).item), date: str(obj(d).date) }))
      .filter((d) => d.item),
  };
}

/**
 * Keep the most recent part of a very long chat so it fits the model context.
 * Recent messages matter most for "what did I miss?".
 */
export function fitToContext(chatText: string, maxChars = 24000): { text: string; truncated: boolean } {
  if (chatText.length <= maxChars) return { text: chatText, truncated: false };
  const tail = chatText.slice(chatText.length - maxChars);
  const firstNewline = tail.indexOf('\n');
  return { text: firstNewline === -1 ? tail : tail.slice(firstNewline + 1), truncated: true };
}
