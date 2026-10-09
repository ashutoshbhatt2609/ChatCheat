/**
 * Google sign-in endpoints (one function, routed by ?action=):
 *   GET  config  -> public client id + feature flags
 *   GET  me      -> current user or null
 *   POST google  -> exchange a Google ID token for an HttpOnly session cookie
 *   POST logout  -> clear the cookie
 *
 * Env: GOOGLE_CLIENT_ID, SESSION_SECRET (>= 32 chars). TURSO_* optional (stores the user row).
 */
import { baseHeaders, clientIp, csrfOk, limited, queryParam, type Req, type Res } from './_lib/http.js';
import {
  authConfigured, clearCookie, createSessionToken, isSecure, readSession, sessionCookie, verifyGoogleIdToken,
} from './_lib/session.js';
import { ensureSchema, getDb } from './_lib/db.js';
import { PROVIDER_LABEL, pickProvider } from './_lib/llm.js';

export default async function handler(req: Req, res: Res): Promise<void> {
  baseHeaders(res);
  const action = queryParam(req, 'action');

  if (req.method === 'GET' && action === 'config') {
    res.status(200).json({
      googleClientId: authConfigured() ? process.env.GOOGLE_CLIENT_ID : null,
      cloudSync: authConfigured() && Boolean(getDb()),
      cloudAi: pickProvider() !== null,
      cloudLabel: pickProvider() ? PROVIDER_LABEL[pickProvider() as keyof typeof PROVIDER_LABEL] : null,
    });
    return;
  }

  if (req.method === 'GET' && action === 'me') {
    const user = await readSession(req);
    res.status(200).json({ user });
    return;
  }

  if (req.method === 'POST' && (action === 'google' || action === 'logout')) {
    if (!csrfOk(req)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    if (action === 'logout') {
      res.setHeader('Set-Cookie', clearCookie(isSecure(req)));
      res.status(200).json({ ok: true });
      return;
    }

    if (!authConfigured()) {
      res.status(503).json({ error: 'Sign-in is not configured.' });
      return;
    }
    if (limited('login', clientIp(req), 10, 60_000)) {
      res.status(429).json({ error: 'Too many attempts. Please wait a minute.' });
      return;
    }
    const credential = (req.body as { credential?: unknown } | undefined)?.credential;
    if (typeof credential !== 'string' || credential.length < 20 || credential.length > 4096) {
      res.status(400).json({ error: 'Invalid credential.' });
      return;
    }
    try {
      const user = await verifyGoogleIdToken(credential, process.env.GOOGLE_CLIENT_ID as string);
      const db = getDb();
      if (db) {
        await ensureSchema(db);
        await db.execute({
          sql: `INSERT INTO users (id, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture`,
          args: [user.id, user.email, user.name, user.picture, Date.now()],
        });
      }
      res.setHeader('Set-Cookie', sessionCookie(await createSessionToken(user), isSecure(req)));
      res.status(200).json({ user });
    } catch {
      res.status(401).json({ error: 'Google sign-in could not be verified.' });
    }
    return;
  }

  res.status(404).json({ error: 'Not found.' });
}
