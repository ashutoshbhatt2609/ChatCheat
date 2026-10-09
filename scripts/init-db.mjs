// Creates the ChatCheat tables in your Turso database and verifies the connection.
// Usage: put TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env, then run `npm run db:init`.
import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client/web';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN. Add both to .env first (see .env.example).');
  process.exit(1);
}
if (!url.startsWith('libsql://') && !url.startsWith('https://')) {
  console.error('TURSO_DATABASE_URL should start with libsql:// (copy it from the Turso dashboard).');
  process.exit(1);
}

const sql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');
const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);

try {
  const db = createClient({ url, authToken });
  await db.execute('PRAGMA foreign_keys = ON');
  for (const stmt of statements) await db.execute(stmt);
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users','conversations') ORDER BY name");
  console.log('Connected to Turso. Tables ready:', tables.rows.map((r) => r.name).join(', '));
} catch (e) {
  console.error('Could not set up the database:', e instanceof Error ? e.message : e);
  console.error('Check that the URL and token belong to the same database and that the token has not expired.');
  process.exit(1);
}
