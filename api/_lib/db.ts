import { createClient, type Client } from '@libsql/client/web';

let client: Client | null = null;
let ready: Promise<void> | null = null;

/** Turso (libSQL) client, or null when not configured. Credentials stay server-side. */
export function getDb(): Client | null {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) return null;
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return client;
}

/** Test hook: inject an in-memory client. */
export function setDbForTests(c: Client | null): void {
  client = c;
  ready = null;
}

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id TEXT PRIMARY KEY,
     email TEXT NOT NULL,
     name TEXT NOT NULL DEFAULT '',
     picture TEXT NOT NULL DEFAULT '',
     created_at INTEGER NOT NULL
   )`,
  // Composite key: client-chosen conversation ids can never collide across users.
  `CREATE TABLE IF NOT EXISTS conversations (
     id TEXT NOT NULL,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     platform TEXT NOT NULL,
     message_count INTEGER NOT NULL,
     start_date INTEGER,
     end_date INTEGER,
     messages_json TEXT NOT NULL,
     summary_json TEXT,
     actions_json TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations (user_id, created_at DESC)`,
];

export async function ensureSchema(db: Client): Promise<void> {
  ready ??= (async () => {
    await db.execute('PRAGMA foreign_keys = ON');
    for (const stmt of SCHEMA) await db.execute(stmt);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
