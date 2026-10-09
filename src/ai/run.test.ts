import { describe, it, expect, vi, beforeEach } from 'vitest';

const engine = vi.hoisted(() => ({ ready: false, complete: vi.fn() }));
vi.mock('./engine', () => ({ aiEngine: { isReady: () => engine.ready, complete: engine.complete } }));
const cloud = vi.hoisted(() => ({ complete: vi.fn() }));
vi.mock('./cloud', () => ({ cloudComplete: cloud.complete }));

import { parseChat } from '../parsers';
import { SAMPLE_CHAT } from '../sampleChat';
import { prepareChat, resolveEngine, runTask } from './run';

const conv = parseChat(SAMPLE_CHAT).conversation!;
const chat = prepareChat(conv).text;

beforeEach(() => {
  engine.ready = false;
  engine.complete.mockReset();
  cloud.complete.mockReset();
});

describe('quick analysis (rules engine)', () => {
  it('returns real results for all three tasks and never calls an AI service', async () => {
    const summary = await runTask('summary', 'rules', conv, chat);
    const actions = await runTask('actions', 'rules', conv, chat);
    const priorities = await runTask('priorities', 'rules', conv, chat, 'Asha');
    expect(summary.error).toBeUndefined();
    expect(summary.value.tldr).toContain('10 messages');
    expect(actions.value.length).toBeGreaterThan(0);
    expect(priorities.value.mentions.length).toBeGreaterThan(0);
    expect(cloud.complete).not.toHaveBeenCalled();
    expect(engine.complete).not.toHaveBeenCalled();
  });

  it('an on-device engine with no model loaded behaves like rules', async () => {
    expect(resolveEngine('local')).toBe('rules');
    const r = await runTask('summary', 'local', conv, chat);
    expect(r.error).toBeUndefined();
    expect(engine.complete).not.toHaveBeenCalled();
  });
});

describe('AI engines fall back to rules when they fail', () => {
  it('cloud timeout: rule-based value plus a clear error', async () => {
    cloud.complete.mockRejectedValue(new Error('Cloud AI took too long to answer.'));
    const r = await runTask('summary', 'cloud', conv, chat);
    expect(r.value.tldr).toContain('10 messages');
    expect(r.error).toMatch(/took too long.*rule-based/);
  });

  it('cloud returns unreadable text: falls back instead of crashing', async () => {
    cloud.complete.mockResolvedValue('not json at all');
    const r = await runTask('actions', 'cloud', conv, chat);
    expect(r.value.length).toBeGreaterThan(0);
    expect(r.error).toMatch(/rule-based/);
  });

  it('cloud success is validated and used', async () => {
    cloud.complete.mockResolvedValue('{"tldr":"AI says hi","keyPoints":["a"],"timeline":[]}');
    const r = await runTask('summary', 'cloud', conv, chat);
    expect(r.value.tldr).toBe('AI says hi');
    expect(r.error).toBeUndefined();
  });

  it('loaded on-device model is used', async () => {
    engine.ready = true;
    engine.complete.mockResolvedValue('{"items":[{"task":"Ship it","urgency":"high"}]}');
    const r = await runTask('actions', 'local', conv, chat);
    expect(r.value[0].task).toBe('Ship it');
  });
});
