/**
 * Provider layer for the cloud AI proxy. Two OpenAI-compatible providers (DeepSeek) plus Gemini.
 *
 *  - openrouter: free DeepSeek models via OpenRouter  (OPENROUTER_API_KEY, free key, no card)
 *  - deepseek:   DeepSeek's own API                    (DEEPSEEK_API_KEY, pay-as-you-go balance)
 *  - gemini:     Google Gemini                         (GEMINI_API_KEY, free AI Studio key)
 *
 * Keys are only ever sent in an Authorization / x-goog-api-key header, never in a URL.
 */

export type Provider = 'openrouter' | 'deepseek' | 'gemini';

export const PROVIDER_LABEL: Record<Provider, string> = {
  openrouter: 'DeepSeek (free)',
  deepseek: 'DeepSeek',
  gemini: 'Gemini',
};

type Env = Record<string, string | undefined>;

/** LLM_PROVIDER forces a provider; otherwise the first configured one wins (free DeepSeek first). */
export function pickProvider(env: Env = process.env): Provider | null {
  const has: Record<Provider, boolean> = {
    openrouter: Boolean(env.OPENROUTER_API_KEY?.trim()),
    deepseek: Boolean(env.DEEPSEEK_API_KEY?.trim()),
    gemini: Boolean(env.GEMINI_API_KEY?.trim()),
  };
  const want = env.LLM_PROVIDER?.trim().toLowerCase() as Provider | undefined;
  if (want && want in has) return has[want] ? want : null;
  return has.openrouter ? 'openrouter' : has.deepseek ? 'deepseek' : has.gemini ? 'gemini' : null;
}

export class UpstreamError extends Error {
  constructor(public status: number) {
    super(`upstream ${status}`);
  }
}

/** Safe, coarse reasons only: never upstream bodies, keys or stack traces. */
export function upstreamMessage(e: unknown): string {
  if (e instanceof UpstreamError) {
    if (e.status === 400 || e.status === 401 || e.status === 403) {
      return 'Cloud AI is not set up correctly (the API key was rejected). Check the AI key in the server settings.';
    }
    if (e.status === 402) return 'The cloud AI account has no balance left. Add credit or switch to a free provider.';
    if (e.status === 404) return 'Cloud AI model not available for this key. Set LLM_MODEL to a model your key can use.';
    if (e.status === 429) return 'Cloud AI is busy or the free limit is used up. Wait a minute and try again.';
    if (e.status >= 500) return 'The AI provider is temporarily unavailable. Try again shortly.';
  }
  if (e instanceof Error && e.message === 'no free model') {
    return 'No free DeepSeek model is available right now. Set LLM_MODEL, or try again later.';
  }
  return 'The AI service could not process this request.';
}

/** Reasoning models (e.g. R1) wrap their thinking in <think> tags; the JSON answer follows. */
export function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

export interface ChatOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  /** Ask the provider for strict JSON (DeepSeek supports it; free OpenRouter models may not). */
  json?: boolean;
  headers?: Record<string, string>;
}

/** One OpenAI-compatible chat completion. Returns the assistant text. */
export async function chatCompletion(o: ChatOptions, fetchImpl: typeof fetch = fetch): Promise<string> {
  const resp = await fetchImpl(`${o.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${o.apiKey}`, ...o.headers },
    body: JSON.stringify({
      model: o.model,
      messages: [
        { role: 'system', content: o.system },
        { role: 'user', content: o.user },
      ],
      temperature: 0.1,
      max_tokens: 2048,
      ...(o.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!resp.ok) throw new UpstreamError(resp.status);
  const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  const text = stripReasoning(data.choices?.[0]?.message?.content ?? '');
  if (!text) throw new Error('empty upstream response');
  return text;
}

// --- Free DeepSeek model discovery on OpenRouter (names change, so look them up) -----------------

interface OpenRouterModel {
  id: string;
  pricing?: { prompt?: string; completion?: string };
}

const STATIC_FREE = ['deepseek/deepseek-chat-v3-0324:free', 'deepseek/deepseek-chat:free'];
const CACHE_MS = 60 * 60 * 1000;
let cache: { at: number; ids: string[] } | null = null;

/** Free DeepSeek models, non-reasoning first (faster, cleaner JSON), newest-looking id first. */
export function rankFreeDeepseek(models: OpenRouterModel[]): string[] {
  const free = models.filter((m) => {
    const id = m.id.toLowerCase();
    const zero = m.pricing?.prompt === '0' && m.pricing?.completion === '0';
    return id.includes('deepseek') && (id.endsWith(':free') || zero);
  });
  const reasoning = (id: string) => (/r1|reason|think/i.test(id) ? 1 : 0);
  return free
    .map((m) => m.id)
    .sort((a, b) => reasoning(a) - reasoning(b) || b.localeCompare(a));
}

export async function freeDeepseekModels(fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<string[]> {
  if (cache && now - cache.at < CACHE_MS) return cache.ids;
  try {
    const r = await fetchImpl('https://openrouter.ai/api/v1/models');
    if (r.ok) {
      const ids = rankFreeDeepseek(((await r.json()) as { data?: OpenRouterModel[] }).data ?? []);
      if (ids.length > 0) {
        cache = { at: now, ids };
        return ids;
      }
    }
  } catch {
    /* fall through to the static list */
  }
  return STATIC_FREE;
}

export function resetModelCacheForTests(): void {
  cache = null;
}

/** Try models in order; move on only for missing / rate-limited / unavailable models. */
export async function firstWorking<T>(models: string[], fn: (model: string) => Promise<T>): Promise<T> {
  let last: unknown = new Error('no free model');
  for (const m of models) {
    try {
      return await fn(m);
    } catch (e) {
      last = e;
      if (!(e instanceof UpstreamError) || ![404, 429, 503].includes(e.status)) throw e;
    }
  }
  throw last;
}
