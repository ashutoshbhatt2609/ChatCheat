import { describe, it, expect } from 'vitest';
import { extractJson, parseSummary, parseActionItems, parsePriorities, fitToContext } from './json';

describe('extractJson', () => {
  it('parses fenced JSON with surrounding chatter', () => {
    const raw = 'Sure! ```json\n{"a": "}", "b": [1]}\n``` hope that helps';
    expect(extractJson(raw)).toEqual({ a: '}', b: [1] });
  });
  it('throws when there is no JSON', () => {
    expect(() => extractJson('nothing here')).toThrow();
  });
  it('throws on truncated JSON', () => {
    expect(() => extractJson('{"a": {"b": 1}')).toThrow();
  });
});

describe('validators', () => {
  it('coerces a malformed summary into a safe shape', () => {
    const s = parseSummary('{"tldr": "x", "keyPoints": "oops", "timeline": [{"event": "e"}, {}]}');
    expect(s).toEqual({ tldr: 'x', keyPoints: [], timeline: [{ time: '', event: 'e' }] });
  });
  it('normalises action item urgency and assignee', () => {
    const items = parseActionItems('{"items":[{"task":"Ship","urgency":"URGENT!!"},{"task":""}]}');
    expect(items).toEqual([{ task: 'Ship', assignee: 'Unassigned', deadline: null, urgency: 'medium' }]);
  });
  it('returns empty priorities for empty object', () => {
    expect(parsePriorities('{}')).toEqual({ mentions: [], decisions: [], questions: [], deadlines: [] });
  });
});

describe('fitToContext', () => {
  it('keeps short chats intact', () => {
    expect(fitToContext('a\nb', 100)).toEqual({ text: 'a\nb', truncated: false });
  });
  it('keeps the most recent whole lines of long chats', () => {
    const r = fitToContext('line1\nline2\nline3', 10);
    expect(r.truncated).toBe(true);
    expect(r.text).toBe('line3');
  });
});
