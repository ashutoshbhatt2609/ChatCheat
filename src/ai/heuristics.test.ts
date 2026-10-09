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

describe('quick analysis always fills key points and timeline', () => {
  const analyze = (text: string) => {
    const c = parseChat(text).conversation!;
    return heuristicSummary(c);
  };

  it('pasted notice: key points and a dated timeline', () => {
    const s = analyze(`Reporting Time: 9:00 AM
Venue: Seminar Hall
Please keep these dates and timings in mind: Round 1 on 12 March, Round 2 on 14 March.
Note: bring your ID card by Friday.`);
    expect(s.keyPoints.length).toBeGreaterThanOrEqual(3);
    expect(s.timeline.length).toBeGreaterThanOrEqual(2);
    expect(s.timeline.map((t) => t.time).join(' ')).toMatch(/12 March/i);
    expect(s.tldr).toMatch(/line/);
  });

  it('chat: key points and timeline both populated, real times used for timeline', () => {
    const s = heuristicSummary(conv);
    expect(s.keyPoints.length).toBeGreaterThan(0);
    expect(s.timeline.length).toBeGreaterThan(0);
    expect(s.timeline[0].time).not.toMatch(/^Step/);
  });

  it('text with no special words still gets key points and a timeline', () => {
    const s = analyze('The weather was nice and we walked along the river for a while.\nLater we found a small cafe near the old bridge.');
    expect(s.keyPoints.length).toBeGreaterThan(0);
    expect(s.timeline.length).toBeGreaterThan(0);
  });

  it('single-line text does not crash and says "1 line"', () => {
    const s = analyze('Meeting moved to 5 pm tomorrow.');
    expect(s.keyPoints.length).toBe(1);
    expect(s.tldr).toMatch(/1 line/);
  });
});

describe('quick analysis on a pasted document', () => {
  const doc = parseChat('Round 1 is on 12 March. Please bring your ID card by Friday.\nAsha, submit the form tomorrow.').conversation!;
  it('finds action items with assignee and deadline', () => {
    const items = heuristicActionItems(doc);
    expect(items.some((i) => i.assignee === 'Asha' && i.deadline === 'tomorrow')).toBe(true);
    expect(items.some((i) => /ID card/.test(i.task))).toBe(true);
  });
  it('lists deadlines for the user', () => {
    expect(heuristicPriorities(doc, 'Asha').deadlines.length).toBeGreaterThan(0);
  });
});
