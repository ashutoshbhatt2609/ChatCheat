/**
 * Provider layer for the cloud AI proxy. Two OpenAI-compatible providers (DeepSeek) plus Gemini.
 *
 *  - openrouter: free models via OpenRouter            (OPENROUTER_API_KEY, free key, no card;
 *                free DeepSeek is used when listed, otherwise other free models. Paid DeepSeek: set LLM_MODEL)
 *  - deepseek:   DeepSeek's own API                    (DEEPSEEK_API_KEY, pay-as-you-go balance)
 *  - gemini:     Google Gemini                         (GEMINI_API_KEY, free AI Studio key)
 *
 * Keys are only ever sent in an Authorization / x-goog-api-key header, never in a URL.
 */

export type Provider = 'openrouter' | 'deepseek' | 'gemini';

export const PROVIDER_LABEL: Record<Provider, string> = {
  openrouter: 'OpenRouter',
  deepseek: 'DeepSeek',
  gemini: 'Gemini',
};

type Env = Record<string, string | undefined>;

/** LLM_PROVIDER forces a provider; otherwise the first configured one wins (OpenRouter free models first). */
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
    if (e.status === 404) {
      return 'Cloud AI model not available. With OpenRouter free models, enable free endpoints at openrouter.ai/settings/privacy, or set LLM_MODEL to a model your key can use.';
    }
    if (e.status === 429) return 'Cloud AI is busy or the free limit is used up. Wait a minute and try again.';
    if (e.status === 504) return 'The free AI models took too long to answer. Try again; free models can be slow at busy times.';
    if (e.status >= 500) return 'The AI provider is temporarily unavailable. Try again shortly.';
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
  /** Abort a slow model after this long so the next one can be tried (default 14 s). */
  timeoutMs?: number;
}

/** One OpenAI-compatible chat completion. Returns the assistant text. */
export async function chatCompletion(o: ChatOptions, fetchImpl: typeof fetch = fetch): Promise<string> {
  const resp = await fetchImpl(`${o.baseUrl}/chat/completions`, {
    signal: AbortSignal.timeout(o.timeoutMs ?? 14_000),
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
  }).catch((e: unknown) => {
    const name = (e as { name?: string })?.name;
    throw name === 'TimeoutError' || name === 'AbortError' ? new UpstreamError(504) : e;
  });
  if (!resp.ok) throw new UpstreamError(resp.status);
  const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  const text = stripReasoning(data.choices?.[0]?.message?.content ?? '');
  if (!text) throw new Error('empty upstream response');
  return text;
}

// --- Free model discovery on OpenRouter (the free catalogue changes often, so look it up) -------

interface OpenRouterModel {
  id: string;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { output_modalities?: string[] };
}

const ROUTER = 'openrouter/free'; // OpenRouter's own router: picks any currently available free model
const CACHE_MS = 60 * 60 * 1000;
const MAX_TRIES = 4;
let cache: { at: number; ids: string[] } | null = null;

// Not general chat models: safety classifiers, media, vision/omni, embeddings, code-only.
const UNSUITED = /safety|guard|lyria|embed|vision|omni|image|audio|code/i;
const REASONING = /r1|reason|think/i;
const PREFERRED = /gemma|llama|qwen|mistral|nemotron-3-super/i;

/**
 * Free text models, best first: free DeepSeek (if one exists), then well-known instruct families,
 * then the rest. Reasoning models rank last (slow, noisy output). The free router is always the last try.
 */
export function rankFreeModels(models: OpenRouterModel[]): string[] {
  const free = models.filter((m) => {
    const zero = m.pricing?.prompt === '0' && m.pricing?.completion === '0';
    const text = m.architecture?.output_modalities?.includes('text') ?? true;
    return (m.id.endsWith(':free') || zero) && text && m.id !== ROUTER && !UNSUITED.test(m.id);
  });
  const score = (id: string) =>
    (/deepseek/i.test(id) ? 0 : PREFERRED.test(id) ? 1 : 2) + (REASONING.test(id) ? 10 : 0);
  const ranked = free.map((m) => m.id).sort((a, b) => score(a) - score(b) || b.localeCompare(a));
  return [...ranked.slice(0, MAX_TRIES - 1), ROUTER];
}

export async function freeModels(fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<string[]> {
  if (cache && now - cache.at < CACHE_MS) return cache.ids;
  try {
    const r = await fetchImpl('https://openrouter.ai/api/v1/models');
    if (r.ok) {
      const ids = rankFreeModels(((await r.json()) as { data?: OpenRouterModel[] }).data ?? []);
      cache = { at: now, ids };
      return ids;
    }
  } catch {
    /* fall through: the router alone still works */
  }
  return [ROUTER];
}

export function resetModelCacheForTests(): void {
  cache = null;
}

/**
 * Try models in order; move on only for missing / rate-limited / unavailable / slow models.
 * `deadline` (epoch ms) stops new attempts so the function can still answer before the platform kills it.
 */
export async function firstWorking<T>(
  models: string[],
  fn: (model: string) => Promise<T>,
  deadline = Infinity,
): Promise<T> {
  let last: unknown = new Error('no model to try');
  for (const m of models) {
    if (Date.now() > deadline) break;
    try {
      return await fn(m);
    } catch (e) {
      last = e;
      if (!(e instanceof UpstreamError) || ![404, 429, 503, 504].includes(e.status)) throw e;
    }
  }
  throw last;
}
