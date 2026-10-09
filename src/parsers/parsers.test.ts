import { describe, it, expect } from 'vitest';
import { parseChat } from './index';

const whatsapp = `12/03/2024, 09:15 - Priya: @Ravi can you send the deck by Friday?
12/03/2024, 09:20 - Ravi: Sure, will do
12/03/2024, 09:22 - Priya: Also we decided to move the launch to Monday
continuation line here
12/03/2024, 09:30 - Ravi: ok`;

const whatsappBracket = `[12/03/24, 9:15:02 AM] Priya: Hello team
[12/03/24, 9:16:10 AM] Ravi: Hi`;

const telegram = JSON.stringify({
  name: 'Team', messages: [
    { id: 1, type: 'message', date: '2024-03-12T09:15:00', from: 'Priya', text: 'Hello' },
    { id: 2, type: 'message', date: '2024-03-12T09:16:00', from: 'Ravi', text: [{ type: 'bold', text: 'Hi' }, ' there'] },
  ],
});

const slack = JSON.stringify([
  { type: 'message', user: 'U1', ts: '1710234900.000100', text: 'Hello' },
  { type: 'message', user: 'U2', ts: '1710234960.000100', text: 'Hi' },
]);

const generic = `Priya: Hello team\nRavi: Hi Priya\nPriya: Deadline is tomorrow`;

describe('parseChat', () => {
  it.each([
    ['whatsapp', whatsapp, 4],
    ['whatsapp bracket', whatsappBracket, 2],
    ['telegram', telegram, 2],
    ['slack', slack, 2],
    ['generic', generic, 3],
  ])('parses %s', (_n, input, count) => {
    const r = parseChat(input);
    expect(r.error).toBeUndefined();
    expect(r.success).toBe(true);
    expect(r.conversation!.messages).toHaveLength(count as number);
    expect(r.conversation!.participants.length).toBeGreaterThan(1);
  });

  it('keeps multi-line WhatsApp messages together', () => {
    const r = parseChat(whatsapp);
    expect(r.conversation!.messages[2].content).toContain('continuation line');
  });

  it('rejects empty input', () => {
    expect(parseChat('   ').success).toBe(false);
  });
});

describe('generic parser on non-chat text', () => {
  const notice = `Reporting Time: 9:00 AM
Venue: Seminar Hall
Please keep these dates and timings in mind: Round 1 on 12 March, Round 2 on 14 March.
Note: bring your ID card.`;

  it('does not invent participants from labels or sentences', () => {
    const r = parseChat(notice);
    expect(r.success).toBe(true);
    expect(r.conversation!.participants).toEqual(['Text']);
    expect(r.conversation!.messageCount).toBe(1);
    expect(r.conversation!.messages[0].content).toContain('Round 1');
  });

  it('still parses a short two-person chat with a one-off speaker', () => {
    const r = parseChat('Asha: Can you send the file?\nRavi: Sure, tonight.');
    expect(r.conversation!.participants).toEqual(['Asha', 'Ravi']);
  });

  it('keeps wrapped lines with the previous message', () => {
    const r = parseChat('Asha: first line\nsecond line\nRavi: ok\nAsha: bye');
    expect(r.conversation!.messages[0].content).toBe('first line\nsecond line');
  });

  it('never treats a long sentence before a colon as a sender', () => {
    const r = parseChat('Priya: hi\nRavi: hello\nPriya: Please keep these dates and timings in mind: Friday');
    expect(r.conversation!.participants).toEqual(['Priya', 'Ravi']);
  });
});
