import type { ParsedConversation } from '../parsers/types';
import { aiEngine } from './engine';
import { cloudComplete } from './cloud';
import { buildSummaryMessages, buildActionItemMessages, buildPriorityMessages } from './prompts';
import { heuristicSummary, heuristicActionItems, heuristicPriorities } from './heuristics';
import {
  fitToContext, parseSummary, parseActionItems, parsePriorities,
  type SummaryData, type ActionItemData, type PriorityData,
} from './json';

/** Where analysis runs: rule-based (default), cloud provider via /api/analyze, or an on-device model. */
export type Engine = 'rules' | 'cloud' | 'local';

interface Results {
  summary: SummaryData;
  actions: ActionItemData[];
  priorities: PriorityData;
}
export type Task = keyof Results;

interface TaskDef<T> {
  messages: (chat: string, user: string) => { role: string; content: string }[];
  parse: (raw: string) => T;
  rules: (conv: ParsedConversation, user: string) => T;
}

/** One entry per task: its prompt, its output validator and its rule-based fallback. */
const TASKS: { [K in Task]: TaskDef<Results[K]> } = {
  summary: { messages: (c) => buildSummaryMessages(c), parse: parseSummary, rules: (conv) => heuristicSummary(conv) },
  actions: { messages: (c) => buildActionItemMessages(c), parse: parseActionItems, rules: (conv) => heuristicActionItems(conv) },
  priorities: { messages: buildPriorityMessages, parse: parsePriorities, rules: heuristicPriorities },
};

/** An on-device engine without a loaded model behaves like rule-based analysis. */
export const resolveEngine = (engine: Engine): Engine =>
  engine === 'local' && !aiEngine.isReady() ? 'rules' : engine;

/** Chat as plain text for the model, cut to the most recent messages if it is too long. */
export function prepareChat(conv: ParsedConversation): { text: string; truncated: boolean } {
  const lines = conv.messages.map((m) => {
    const time = m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `[${time}] ${m.sender}: ${m.content}`;
  });
  return fitToContext(lines.join('\n'));
}

/**
 * Run one analysis task on the chosen engine. Never throws: if the AI step fails the rule-based
 * result is returned together with a user-facing `error` explaining why.
 */
export async function runTask<K extends Task>(
  task: K,
  engine: Engine,
  conv: ParsedConversation,
  chat: string,
  username = '',
): Promise<{ value: Results[K]; error?: string }> {
  const def = TASKS[task] as TaskDef<Results[K]>;
  const mode = resolveEngine(engine);
  if (mode === 'rules') return { value: def.rules(conv, username) };

  try {
    const raw =
      mode === 'cloud'
        ? await cloudComplete(task, chat, username)
        : await aiEngine.complete(def.messages(chat, username));
    return { value: def.parse(raw) };
  } catch (err) {
    console.error(`${task} failed:`, err);
    const why = mode === 'cloud' && err instanceof Error ? err.message : `The AI returned an unreadable ${task} result.`;
    return { value: def.rules(conv, username), error: `${why} Showing rule-based results instead.` };
  }
}
