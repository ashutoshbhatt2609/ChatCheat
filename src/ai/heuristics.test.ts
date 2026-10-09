import { describe, it, expect } from 'vitest';
import { parseChat } from '../parsers';
import { SAMPLE_CHAT } from '../sampleChat';
import { heuristicActionItems, heuristicPriorities, heuristicSummary } from './heuristics';

const conv = parseChat(SAMPLE_CHAT).conversation!;

describe('heuristics on sample chat', () => {
  it('summarises', () => {
    const s = heuristicSummary(conv);
    expect(s.tldr).toContain('10 messages');
    expect(s.keyPoints.length).toBeGreaterThan(0);
  });
  it('finds urgent action items first with deadlines', () => {
    const items = heuristicActionItems(conv);
    expect(items[0].urgency).toBe('high');
    expect(items.some((i) => i.assignee === 'Asha' && i.deadline)).toBe(true);
  });
  it('finds mentions, decisions and unanswered questions for a user', () => {
    const p = heuristicPriorities(conv, 'Asha');
    expect(p.mentions.length).toBeGreaterThan(0);
    expect(p.decisions.some((d) => d.includes('launch'))).toBe(true);
    expect(p.questions.some((q) => q.includes('press release'))).toBe(true);
  });
});
