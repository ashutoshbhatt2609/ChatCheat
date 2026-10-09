import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pickProvider, stripReasoning, rankFreeDeepseek, freeDeepseekModels, chatCompletion, firstWorking,
  UpstreamError, upstreamMessage, resetModelCacheForTests,
} from '../../api/_lib/llm';
import { runProvider } from '../../api/analyze';

const v = { task: 'summary' as const, chat: 'a: hi', username: '' };
const completion = (content: string) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });

beforeEach(() => resetModelCacheForTests());

describe('pickProvider', () => {
  it('prefers free DeepSeek (OpenRouter), then DeepSeek, then Gemini', () => {
    expect(pickProvider({ OPENROUTER_API_KEY: 'a', DEEPSEEK_API_KEY: 'b', GEMINI_API_KEY: 'c' })).toBe('openrouter');
    expect(pickProvider({ DEEPSEEK_API_KEY: 'b', GEMINI_API_KEY: 'c' })).toBe('deepseek');
    expect(pickProvider({ GEMINI_API_KEY: 'c' })).toBe('gemini');
    expect(pickProvider({})).toBeNull();
  });
  it('honours LLM_PROVIDER and ignores blank keys', () => {
    expect(pickProvider({ LLM_PROVIDER: 'gemini', OPENROUTER_API_KEY: 'a', GEMINI_API_KEY: 'c' })).toBe('gemini');
    expect(pickProvider({ LLM_PROVIDER: 'deepseek', OPENROUTER_API_KEY: 'a' })).toBeNull();
    expect(pickProvider({ OPENROUTER_API_KEY: '   ' })).toBeNull();
  });
});

describe('reasoning output', () => {
  it('strips <think> blocks so the JSON answer is what remains', () => {
    expect(stripReasoning('<think>maybe {"x":1}</think>\n{"tldr":"ok"}')).toBe('{"tldr":"ok"}');
  });
});

describe('free model discovery', () => {
  const models = [
    { id: 'deepseek/deepseek-r1:free', pricing: { prompt: '0', completion: '0' } },
    { id: 'deepseek/deepseek-chat-v3.1:free', pricing: { prompt: '0', completion: '0' } },
    { id: 'deepseek/deepseek-chat', pricing: { prompt: '0.0000003', completion: '0.000001' } },
    { id: 'meta/llama:free', pricing: { prompt: '0', completion: '0' } },
  ];
  it('keeps only free DeepSeek models, non-reasoning first', () => {
    expect(rankFreeDeepseek(models)).toEqual(['deepseek/deepseek-chat-v3.1:free', 'deepseek/deepseek-r1:free']);
  });
  it('falls back to a static list when discovery fails, and caches success', async () => {
    const bad = vi.fn().mockRejectedValue(new Error('offline'));
    expect((await freeDeepseekModels(bad as never)).length).toBeGreaterThan(0);
    const good = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: models }) });
    expect((await freeDeepseekModels(good as never)).length).toBe(2);
    await freeDeepseekModels(good as never);
    expect(good).toHaveBeenCalledTimes(1);
  });
});

describe('chatCompletion', () => {
  it('sends the key as a Bearer header (never in the URL) and returns clean text', async () => {
    const f = vi.fn().mockResolvedValue(completion('<think>hm</think>{"ok":1}'));
    const out = await chatCompletion(
      { baseUrl: 'https://x.test/v1', apiKey: 'SECRET', model: 'm', system: 's', user: 'u', json: true }, f as never);
    expect(out).toBe('{"ok":1}');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://x.test/v1/chat/completions');
    expect(url).not.toContain('SECRET');
    expect(init.headers.Authorization).toBe('Bearer SECRET');
    expect(JSON.parse(init.body).response_format).toEqual({ type: 'json_object' });
  });
  it('omits response_format when json is not requested', async () => {
    const f = vi.fn().mockResolvedValue(completion('{}'));
    await chatCompletion({ baseUrl: 'https://x.test', apiKey: 'k', model: 'm', system: 's', user: 'u' }, f as never);
    expect(JSON.parse(f.mock.calls[0][1].body).response_format).toBeUndefined();
  });
  it('throws UpstreamError on HTTP failure and on empty output', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 402 });
    await expect(chatCompletion({ baseUrl: 'https://x', apiKey: 'k', model: 'm', system: 's', user: 'u' }, f as never))
      .rejects.toBeInstanceOf(UpstreamError);
    const g = vi.fn().mockResolvedValue(completion('<think>only thoughts</think>'));
    await expect(chatCompletion({ baseUrl: 'https://x', apiKey: 'k', model: 'm', system: 's', user: 'u' }, g as never)).rejects.toThrow();
  });
});

describe('firstWorking', () => {
  it('moves on for 429/404/503 but stops on auth errors', async () => {
    const ok = vi.fn().mockRejectedValueOnce(new UpstreamError(429)).mockResolvedValueOnce('done');
    expect(await firstWorking(['a', 'b'], ok)).toBe('done');
    const auth = vi.fn().mockRejectedValue(new UpstreamError(401));
    await expect(firstWorking(['a', 'b'], auth)).rejects.toBeInstanceOf(UpstreamError);
    expect(auth).toHaveBeenCalledTimes(1);
  });
});

describe('runProvider', () => {
  it('openrouter: discovers a free model, falls back on 429, and sends the prompt server-side', async () => {
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/models')) {
        return { ok: true, json: async () => ({ data: [
          { id: 'deepseek/deepseek-chat-v3.1:free', pricing: { prompt: '0', completion: '0' } },
          { id: 'deepseek/deepseek-chat-v3:free', pricing: { prompt: '0', completion: '0' } },
        ] }) };
      }
      const model = JSON.parse(String(init?.body)).model;
      return model.endsWith('v3.1:free') ? { ok: false, status: 429 } : completion('{"tldr":"hi"}');
    });
    const out = await runProvider(v, 'openrouter', { OPENROUTER_API_KEY: 'k' }, f as never);
    expect(out).toBe('{"tldr":"hi"}');
    const body = JSON.parse(String(f.mock.calls[f.mock.calls.length - 1][1]!.body));
    expect(body.messages[1].content).toContain('<chat>');
    expect(body.messages[0].content).toMatch(/untrusted DATA/);
  });
  it('deepseek: uses deepseek-chat with JSON mode', async () => {
    const f = vi.fn().mockResolvedValue(completion('{}'));
    await runProvider(v, 'deepseek', { DEEPSEEK_API_KEY: 'k' }, f as never);
    expect(f.mock.calls[0][0]).toBe('https://api.deepseek.com/chat/completions');
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.model).toBe('deepseek-chat');
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
  it('LLM_MODEL overrides the model', async () => {
    const f = vi.fn().mockResolvedValue(completion('{}'));
    await runProvider(v, 'deepseek', { DEEPSEEK_API_KEY: 'k', LLM_MODEL: 'custom' }, f as never);
    expect(JSON.parse(f.mock.calls[0][1].body).model).toBe('custom');
  });
});

describe('upstreamMessage', () => {
  it('covers no-balance and no-free-model without leaking details', () => {
    expect(upstreamMessage(new UpstreamError(402))).toMatch(/balance/);
    expect(upstreamMessage(new Error('no free model'))).toMatch(/free DeepSeek/);
    expect(upstreamMessage(new Error('Bearer sk-secret'))).not.toMatch(/sk-/);
  });
});
