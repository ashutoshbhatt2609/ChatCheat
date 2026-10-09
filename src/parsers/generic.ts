import { Message, ParsedConversation, ParserResult } from './types';

/**
 * Fallback parser for unrecognized formats ("Name: message" lines, optionally with a leading timestamp).
 *
 * It is deliberately conservative: a speaker must look like a name (1-3 short words), label words such as
 * "Time:" or "Note:" never count, and text that does not look like a conversation (announcements, emails,
 * notices) is kept as a single block instead of being split into fake participants.
 */

const MAX_NAME_CHARS = 25;
const MAX_NAME_WORDS = 3;

/** Common "Label: value" words that are not people. */
const LABEL_WORDS = new Set([
  'time', 'date', 'day', 'venue', 'location', 'place', 'address', 'note', 'notes', 'subject', 'agenda', 'topic',
  'reporting', 'reporting time', 'regards', 'dear', 'instructions', 'important', 'contact', 'email', 'phone',
  'name', 'dress code', 'deadline', 'reminder', 'fee', 'fees', 'cost', 'price', 'link', 'url', 'to', 'from', 're',
  'cc', 'bcc', 'ps', 'p.s', 'nb', 'tip', 'warning', 'summary', 'details', 'description', 'duration', 'eligibility',
  'rules', 'round', 'step', 'steps', 'objective', 'outcome', 'result', 'results', 'status', 'update', 'updates',
]);

// Optional leading timestamp: digits, separators and AM/PM only (never arbitrary words).
const LINE_RE = /^\s*(?:\[?([0-9][0-9/\-.:, ]*(?:[ap]m)?)\]?\s*[-|]?\s*)?([A-Za-z][A-Za-z0-9_.' -]*?):\s+(.*\S.*)$/i;

interface Candidate {
  date?: string;
  sender: string;
  content: string;
}

function candidateFor(line: string): Candidate | null {
  const m = line.match(LINE_RE);
  if (!m) return null;
  const sender = m[2].trim();
  if (sender.length > MAX_NAME_CHARS || sender.split(/\s+/).length > MAX_NAME_WORDS) return null;
  if (LABEL_WORDS.has(sender.toLowerCase())) return null;
  return { date: m[1]?.trim(), sender, content: m[3].trim() };
}

export function parseGeneric(input: string): ParserResult {
  try {
    const lines = input.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return { success: false, error: 'Could not detect any generic message patterns.' };

    const candidates = lines.map(candidateFor);
    const counts = new Map<string, number>();
    candidates.forEach((c) => c && counts.set(c.sender, (counts.get(c.sender) ?? 0) + 1));

    // Speakers: names that repeat, plus one-off names when the text clearly is a conversation.
    const repeaters = [...counts.entries()].filter(([, n]) => n >= 2).map(([name]) => name);
    const candidateLines = candidates.filter(Boolean).length;
    const looksLikeChat =
      repeaters.length >= 2 || (counts.size >= 2 && candidateLines / lines.length >= 0.6);
    const speakers = new Set<string>(looksLikeChat ? [...counts.keys()] : []);

    const messages: Message[] = [];
    let current: Message | null = null;
    const push = () => current && messages.push(current);
    const make = (sender: string, content: string, dateStr?: string): Message => {
      const parsed = dateStr ? new Date(dateStr) : null;
      return {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        sender,
        content,
        timestamp: parsed && !isNaN(parsed.getTime()) ? parsed : new Date(),
        platform: 'generic',
      };
    };

    if (speakers.size === 0) {
      // Not a conversation: analyze the whole text as one message.
      const text = lines.map((l) => l.trim()).join('\n');
      const only = make('Text', text);
      const conversation: ParsedConversation = {
        id: 'generic-chat',
        name: 'Pasted Text',
        platform: 'generic',
        messages: [only],
        participants: ['Text'],
        startDate: only.timestamp,
        endDate: only.timestamp,
        messageCount: 1,
      };
      return { success: true, conversation };
    }

    lines.forEach((line, i) => {
      const c = candidates[i];
      if (c && speakers.has(c.sender)) {
        push();
        current = make(c.sender, c.content, c.date);
      } else if (current) {
        (current as Message).content += '\n' + line.trim();
      } else {
        current = make('Unknown', line.trim());
      }
    });
    push();

    const participants = [...new Set(messages.map((m) => m.sender))];
    const conversation: ParsedConversation = {
      id: 'generic-chat',
      name: 'Imported Chat',
      platform: 'generic',
      messages,
      participants,
      startDate: messages[0].timestamp,
      endDate: messages[messages.length - 1].timestamp,
      messageCount: messages.length,
    };
    return { success: true, conversation };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error parsing generic chat' };
  }
}
