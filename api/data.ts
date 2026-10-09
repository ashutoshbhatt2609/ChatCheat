/**
 * Per-user conversation sync backed by Turso. Every query is scoped by the user id taken from
 * the verified session cookie — never from the request — and uses bound parameters only.
 *
 *   GET    (no params)  -> list the caller's conversations (metadata)
 *   GET    ?id=<id>     -> one full conversation
 *   PUT    {…}          -> create/replace one conversation
 *   DELETE ?id=<id>     -> delete one;  DELETE ?all=1 -> delete everything of the caller
 */
import { baseHeaders, csrfOk, limited, queryParam, clientIp, type Req, type Res } from './_lib/http.js';
import { authConfigured, readSession } from './_lib/session.js';
import { ensureSchema, getDb } from './_lib/db.js';

const ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const PLATFORMS = ['whatsapp', 'telegram', 'slack', 'discord', 'generic'];
const MAX_MESSAGES = 20000;
const MAX_CONTENT = 5000;
const MAX_BYTES = 2_000_000;

interface StoredMessage { sender: string; content: string; timestamp: number }
export interface ConversationPayload {
  id: string;
  name: string;
  platform: string;
  messageCount: number;
  startDate: number;
  endDate: number;
  messages: StoredMessage[];
  summary: unknown;
  actions: unknown;
}

const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.length <= max ? v : null);
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null);

export function validatePayload(body: unknown): ConversationPayload | string {
  if (!body || typeof body !== 'object') return 'Invalid body.';
  const b = body as Record<string, unknown>;
  const id = str(b.id, 64);
  if (!id || !ID_RE.test(id)) return 'Invalid id.';
  const name = str(b.name, 200);
  if (!name) return 'Invalid name.';
  const platform = str(b.platform, 20);
  if (!platform || !PLATFORMS.includes(platform)) return 'Invalid platform.';
  if (!Array.isArray(b.messages) || b.messages.length > MAX_MESSAGES) return 'Invalid messages.';
  const messages: StoredMessage[] = [];
  for (const m of b.messages as Record<string, unknown>[]) {
    const sender = str(m?.sender, 200);
    const content = str(m?.content, MAX_CONTENT);
    const timestamp = int(m?.timestamp);
    if (sender === null || content === null || timestamp === null) return 'Invalid message.';
    messages.push({ sender, content, timestamp });
  }
  const payload: ConversationPayload = {
    id,
    name,
    platform,
    messageCount: messages.length,
    startDate: int(b.startDate) ?? messages[0]?.timestamp ?? 0,
    endDate: int(b.endDate) ?? messages[messages.length - 1]?.timestamp ?? 0,
    messages,
    summary: b.summary ?? null,
    actions: b.actions ?? null,
  };
  if (JSON.stringify(payload).length > MAX_BYTES) return 'Conversation is too large.';
  return payload;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  baseHeaders(res);
  const db = getDb();
  if (!authConfigured() || !db) {
    res.status(503).json({ error: 'Cloud sync is not configured.' });
    return;
  }
  const user = await readSession(req);
  if (!user) {
    res.status(401).json({ error: 'Sign in required.' });
    return;
  }
  if (limited('data', user.id, 120, 60_000) || limited('data-ip', clientIp(req), 300, 60_000)) {
    res.status(429).json({ error: 'Too many requests.' });
    return;
  }
  const method = req.method ?? 'GET';
  if (method !== 'GET' && !csrfOk(req)) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  try {
    await ensureSchema(db);

    if (method === 'GET') {
      const id = queryParam(req, 'id');
      if (!id) {
        const rows = await db.execute({
          sql: `SELECT id, name, platform, message_count, created_at FROM conversations
                WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`,
          args: [user.id],
        });
        res.status(200).json({
          conversations: rows.rows.map((r) => ({
            id: r.id, name: r.name, platform: r.platform, messageCount: r.message_count, createdAt: r.created_at,
          })),
        });
        return;
      }
      if (!ID_RE.test(id)) {
        res.status(400).json({ error: 'Invalid id.' });
        return;
      }
      const rows = await db.execute({
        sql: `SELECT id, name, platform, message_count, start_date, end_date, messages_json, summary_json,
                     actions_json, created_at FROM conversations WHERE user_id = ? AND id = ?`,
        args: [user.id, id],
      });
      const r = rows.rows[0];
      if (!r) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      res.status(200).json({
        id: r.id, name: r.name, platform: r.platform, messageCount: r.message_count,
        startDate: r.start_date, endDate: r.end_date, createdAt: r.created_at,
        messages: JSON.parse(String(r.messages_json)),
        summary: r.summary_json ? JSON.parse(String(r.summary_json)) : null,
        actions: r.actions_json ? JSON.parse(String(r.actions_json)) : null,
      });
      return;
    }

    if (method === 'PUT') {
      const p = validatePayload(req.body);
      if (typeof p === 'string') {
        res.status(400).json({ error: p });
        return;
      }
      const now = Date.now();
      await db.execute({
        sql: `INSERT INTO conversations (id, user_id, name, platform, message_count, start_date, end_date,
                messages_json, summary_json, actions_json, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id, id) DO UPDATE SET name = excluded.name, platform = excluded.platform,
                message_count = excluded.message_count, start_date = excluded.start_date,
                end_date = excluded.end_date, messages_json = excluded.messages_json,
                summary_json = excluded.summary_json, actions_json = excluded.actions_json,
                updated_at = excluded.updated_at`,
        args: [
          p.id, user.id, p.name, p.platform, p.messageCount, p.startDate, p.endDate,
          JSON.stringify(p.messages),
          p.summary == null ? null : JSON.stringify(p.summary),
          p.actions == null ? null : JSON.stringify(p.actions),
          now, now,
        ],
      });
      res.status(200).json({ ok: true });
      return;
    }

    if (method === 'DELETE') {
      if (queryParam(req, 'all') === '1') {
        await db.execute({ sql: 'DELETE FROM conversations WHERE user_id = ?', args: [user.id] });
        res.status(200).json({ ok: true });
        return;
      }
      const id = queryParam(req, 'id');
      if (!ID_RE.test(id)) {
        res.status(400).json({ error: 'Invalid id.' });
        return;
      }
      await db.execute({ sql: 'DELETE FROM conversations WHERE user_id = ? AND id = ?', args: [user.id, id] });
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    res.status(405).json({ error: 'Method not allowed.' });
  } catch {
    res.status(500).json({ error: 'Storage error.' });
  }
}
