import { describe, it, expect, vi } from 'vitest';
import handler, { validate, callGemini, callWithFallback, rateLimited, upstreamMessage, UpstreamError } from '../../api/analyze';

describe('validate', () => {
  it('accepts a good request', () => {
    expect(validate({ task: 'summary', chat: 'a: hi' })).toEqual({ task: 'summary', chat: 'a: hi', username: '' });
  });
  it.each([
    [null], [{ task: 'evil', chat: 'x' }], [{ task: 'summary', chat: '' }],
    [{ task: 'summary', chat: 'x'.repeat(30001) }], [{ task: 'priorities', chat: 'x' }],
  ])('rejects %j', (b) => expect(typeof validate(b)).toBe('string'));
  it('sanitises the username', () => {
    const v = validate({ task: 'priorities', chat: 'x', username: 'A"\n<b>' });
    expect(v).toMatchObject({ username: expect.not.stringMatching(/["\n<>]/) });
  });
});

describe('callGemini', () => {
  it('sends the key in a header (not the URL) and returns text', async () => {
    const f = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":1}' }] } }] }),
    });
    const out = await callGemini({ task: 'summary', chat: 'hi', username: '' }, 'SECRET', 'm', f as never);
    expect(out).toBe('{"ok":1}');
    const [url, init] = f.mock.calls[0];
    expect(url).not.toContain('SECRET');
    expect(init.headers['x-goog-api-key']).toBe('SECRET');
  });
  it('throws on upstream failure', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(callGemini({ task: 'summary', chat: 'hi', username: '' }, 'k', 'm', f as never)).rejects.toThrow();
  });
});

describe('callWithFallback', () => {
  const v = { task: 'summary' as const, chat: 'hi', username: '' };
  const ok = { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'T' }] } }] }) };
  it('moves to the next model on 404/429', async () => {
    const f = vi.fn().mockResolvedValueOnce({ ok: false, status: 429 }).mockResolvedValueOnce(ok);
    expect(await callWithFallback(v, 'k', ['a', 'b'], f as never)).toBe('T');
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('does not retry on auth errors', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    await expect(callWithFallback(v, 'k', ['a', 'b'], f as never)).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('rateLimited', () => {
  it('blocks after the limit and recovers after the window', () => {
    for (let i = 0; i < 20; i++) expect(rateLimited('ip1', 1000)).toBe(false);
    expect(rateLimited('ip1', 1001)).toBe(true);
    expect(rateLimited('ip1', 1000 + 61_000)).toBe(false);
  });
});

function mockRes() {
  const r = { code: 0, body: undefined as unknown, status(c: number) { r.code = c; return r; }, setHeader() {}, json(b: unknown) { r.body = b; } };
  return r;
}

describe('handler', () => {
  it('reports availability without exposing the key', async () => {
    process.env.GEMINI_API_KEY = 'SECRET';
    const res = mockRes();
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.body).toMatchObject({ available: true });
  });
  it('503 when unconfigured, 405 for other methods', async () => {
    delete process.env.GEMINI_API_KEY;
    let res = mockRes();
    await handler({ method: 'POST', headers: {} }, res);
    expect(res.code).toBe(503);
    res = mockRes();
    await handler({ method: 'DELETE', headers: {} }, res);
    expect(res.code).toBe(405);
  });
  it('400 on bad input and generic 502 on upstream error', async () => {
    process.env.GEMINI_API_KEY = 'SECRET';
    let res = mockRes();
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' }, body: { task: 'x' } }, res);
    expect(res.code).toBe(400);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    res = mockRes();
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.8' }, body: { task: 'summary', chat: 'hi' } }, res);
    expect(res.code).toBe(502);
    expect(JSON.stringify(res.body)).not.toMatch(/403|SECRET/);
    vi.unstubAllGlobals();
  });
});

describe('upstreamMessage', () => {
  it('maps upstream status to a safe, specific reason', () => {
    expect(upstreamMessage(new UpstreamError(400))).toMatch(/GEMINI_API_KEY/);
    expect(upstreamMessage(new UpstreamError(429))).toMatch(/busy|quota/i);
    expect(upstreamMessage(new UpstreamError(503))).toMatch(/unavailable/i);
    expect(upstreamMessage(new Error('boom: secret-key-123'))).not.toMatch(/secret/);
  });
});
