/** Minimal request/response types and helpers shared by the serverless functions. */

export interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

export interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string | string[]): void;
  json(body: unknown): void;
}

export function header(req: Req, name: string): string {
  const v = req.headers[name.toLowerCase()];
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

export function queryParam(req: Req, name: string): string {
  const v = req.query?.[name];
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

export function clientIp(req: Req): string {
  return header(req, 'x-forwarded-for').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

export function baseHeaders(res: Res): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export function parseCookies(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const buckets = new Map<string, number[]>();

/** Best-effort sliding-window limiter (per server instance). Returns true when over the limit. */
export function limited(bucket: string, key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const id = `${bucket}:${key}`;
  const recent = (buckets.get(id) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(id, recent);
    return true;
  }
  recent.push(now);
  buckets.set(id, recent);
  if (buckets.size > 5000) buckets.clear();
  return false;
}

/**
 * CSRF defence for state-changing calls: cookies are SameSite=Lax and the request must carry
 * a custom header, which a cross-site page cannot send without a CORS preflight we never grant.
 */
export function csrfOk(req: Req): boolean {
  if (header(req, 'x-requested-with') !== 'chatcheat') return false;
  if (req.method === 'DELETE') return true;
  return header(req, 'content-type').includes('application/json');
}
