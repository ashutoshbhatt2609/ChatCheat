import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { generateKeyPair, SignJWT, exportJWK, createLocalJWKSet } from 'jose';
import { setDbForTests } from './_lib/db';
import { createSessionToken, verifyGoogleIdToken, COOKIE } from './_lib/session';
import { limited, csrfOk } from './_lib/http';
import auth from './auth';
import data, { validatePayload } from './data';
import analyze from './analyze';

process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.GOOGLE_CLIENT_ID = 'client-123';

function mockRes() {
  const r = {
    code: 0, body: undefined as any, headers: {} as Record<string, unknown>,
    status(c: number) { r.code = c; return r; },
    setHeader(n: string, v: unknown) { r.headers[n] = v; },
    json(b: unknown) { r.body = b; },
  };
  return r;
}

const csrf = { 'x-requested-with': 'chatcheat', 'content-type': 'application/json' };
const alice = { id: 'google-alice', email: 'a@x.com', name: 'Alice', picture: '' };
const bob = { id: 'google-bob', email: 'b@x.com', name: 'Bob', picture: '' };

async function asUser(u: typeof alice, extra: Record<string, string> = {}) {
  return { cookie: `${COOKIE}=${await createSessionToken(u)}`, ...extra };
}

const convo = (id: string) => ({
  id, name: 'Team', platform: 'whatsapp',
  messages: [{ sender: 'A', content: 'hi', timestamp: 1 }, { sender: 'B', content: 'yo', timestamp: 2 }],
  summary: { tldr: 'x' }, actions: [],
});

beforeEach(async () => {
  const db = createClient({ url: ':memory:' });
  setDbForTests(db);
  for (const u of [alice, bob]) {
    await (await import('./_lib/db')).ensureSchema(db);
    await db.execute({ sql: 'INSERT INTO users (id,email,name,picture,created_at) VALUES (?,?,?,?,0)', args: [u.id, u.email, u.name, u.picture] });
  }
});

describe('data API authorization', () => {
  it('rejects anonymous callers', async () => {
    const res = mockRes();
    await data({ method: 'GET', headers: {} }, res);
    expect(res.code).toBe(401);
  });

  it('rejects forged / tampered cookies', async () => {
    const res = mockRes();
    await data({ method: 'GET', headers: { cookie: `${COOKIE}=${await createSessionToken(alice)}x` } }, res);
    expect(res.code).toBe(401);
  });

  it('requires the CSRF header for writes', async () => {
    const res = mockRes();
    await data({ method: 'PUT', headers: { ...(await asUser(alice)), 'content-type': 'application/json' }, body: convo('conv-0001') }, res);
    expect(res.code).toBe(403);
  });

  it('stores and reads back a conversation', async () => {
    let res = mockRes();
    await data({ method: 'PUT', headers: await asUser(alice, csrf), body: convo('conv-0001') }, res);
    expect(res.code).toBe(200);
    res = mockRes();
    await data({ method: 'GET', headers: await asUser(alice), query: { id: 'conv-0001' } }, res);
    expect(res.body.messages).toHaveLength(2);
    res = mockRes();
    await data({ method: 'GET', headers: await asUser(alice) }, res);
    expect(res.body.conversations).toHaveLength(1);
  });

  it("never exposes one user's data to another (IDOR)", async () => {
    await data({ method: 'PUT', headers: await asUser(alice, csrf), body: convo('conv-0001') }, mockRes());
    let res = mockRes();
    await data({ method: 'GET', headers: await asUser(bob), query: { id: 'conv-0001' } }, res);
    expect(res.code).toBe(404);
    res = mockRes();
    await data({ method: 'GET', headers: await asUser(bob) }, res);
    expect(res.body.conversations).toHaveLength(0);
    // Bob cannot overwrite or delete Alice's row using the same id.
    await data({ method: 'PUT', headers: await asUser(bob, csrf), body: { ...convo('conv-0001'), name: 'Hacked' } }, mockRes());
    await data({ method: 'DELETE', headers: await asUser(bob, csrf), query: { id: 'conv-0001' } }, mockRes());
    res = mockRes();
    await data({ method: 'GET', headers: await asUser(alice), query: { id: 'conv-0001' } }, res);
    expect(res.body.name).toBe('Team');
  });

  it('resists SQL injection in ids', async () => {
    const res = mockRes();
    await data({ method: 'GET', headers: await asUser(alice), query: { id: "x'; DROP TABLE conversations;--" } }, res);
    expect(res.code).toBe(400);
  });

  it('deletes all of the caller’s data only', async () => {
    await data({ method: 'PUT', headers: await asUser(alice, csrf), body: convo('conv-0001') }, mockRes());
    await data({ method: 'PUT', headers: await asUser(bob, csrf), body: convo('conv-0002') }, mockRes());
    await data({ method: 'DELETE', headers: await asUser(alice, { 'x-requested-with': 'chatcheat' }), query: { all: '1' } }, mockRes());
    const res = mockRes();
    await data({ method: 'GET', headers: await asUser(bob) }, res);
    expect(res.body.conversations).toHaveLength(1);
  });
});

describe('validatePayload', () => {
  it.each([
    [{ ...convo('conv-0001'), id: 'bad id!' }],
    [{ ...convo('conv-0001'), platform: 'evil' }],
    [{ ...convo('conv-0001'), messages: [{ sender: 1, content: 'x', timestamp: 1 }] }],
    [{ ...convo('conv-0001'), messages: [{ sender: 'a', content: 'x'.repeat(5001), timestamp: 1 }] }],
    [null],
  ])('rejects %#', (b) => expect(typeof validatePayload(b)).toBe('string'));
});

describe('Google ID token verification', () => {
  async function setup() {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), alg: 'RS256', kid: 'k1' };
    const keys = createLocalJWKSet({ keys: [jwk] });
    const sign = (claims: Record<string, unknown>, aud = 'client-123', iss = 'https://accounts.google.com') =>
      new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setSubject('sub-1')
        .setIssuer(iss).setAudience(aud).setExpirationTime('1h').sign(privateKey);
    return { keys, sign };
  }
  it('accepts a valid token', async () => {
    const { keys, sign } = await setup();
    const u = await verifyGoogleIdToken(await sign({ email: 'a@x.com', email_verified: true, name: 'A' }), 'client-123', keys);
    expect(u).toMatchObject({ id: 'sub-1', email: 'a@x.com' });
  });
  it.each([
    ['wrong audience', { email: 'a@x.com', email_verified: true }, 'other-client', 'https://accounts.google.com'],
    ['wrong issuer', { email: 'a@x.com', email_verified: true }, 'client-123', 'https://evil.com'],
    ['unverified email', { email: 'a@x.com', email_verified: false }, 'client-123', 'https://accounts.google.com'],
  ])('rejects %s', async (_n, claims, aud, iss) => {
    const { keys, sign } = await setup();
    await expect(verifyGoogleIdToken(await sign(claims, aud, iss), 'client-123', keys)).rejects.toThrow();
  });
});

describe('auth endpoint', () => {
  it('exposes only the public client id', async () => {
    const res = mockRes();
    await auth({ method: 'GET', headers: {}, query: { action: 'config' } }, res);
    expect(res.body.googleClientId).toBe('client-123');
    expect(JSON.stringify(res.body)).not.toContain('xxxx');
  });
  it('me returns the session user, logout needs CSRF header', async () => {
    let res = mockRes();
    await auth({ method: 'GET', headers: await asUser(alice), query: { action: 'me' } }, res);
    expect(res.body.user.email).toBe('a@x.com');
    res = mockRes();
    await auth({ method: 'POST', headers: { 'content-type': 'application/json' }, query: { action: 'logout' } }, res);
    expect(res.code).toBe(403);
    res = mockRes();
    await auth({ method: 'POST', headers: csrf, query: { action: 'logout' } }, res);
    expect(String(res.headers['Set-Cookie'])).toContain('Max-Age=0');
  });
  it('rejects a garbage credential without leaking details', async () => {
    const res = mockRes();
    await auth({ method: 'POST', headers: csrf, query: { action: 'google' }, body: { credential: 'a'.repeat(50) } }, res);
    expect(res.code).toBe(401);
    expect(JSON.stringify(res.body)).not.toMatch(/jose|JWS|Invalid Compact/i);
  });
});

describe('cloud AI requires sign-in when auth is configured', () => {
  it('returns 401 for anonymous POST', async () => {
    process.env.GEMINI_API_KEY = 'k';
    const res = mockRes();
    await analyze({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { task: 'summary', chat: 'hi' } }, res);
    expect(res.code).toBe(401);
  });
  it('allows a signed-in user through to validation', async () => {
    process.env.GEMINI_API_KEY = 'k';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }) }));
    const res = mockRes();
    await analyze({ method: 'POST', headers: { ...(await asUser(alice)), 'content-type': 'application/json', 'x-forwarded-for': '7.7.7.7' }, body: { task: 'summary', chat: 'hi' } }, res);
    expect(res.code).toBe(200);
    vi.unstubAllGlobals();
  });
});

describe('http helpers', () => {
  it('limiter blocks past the limit', () => {
    for (let i = 0; i < 3; i++) expect(limited('t', 'k', 3, 1000, 5)).toBe(false);
    expect(limited('t', 'k', 3, 1000, 6)).toBe(true);
  });
  it('csrfOk', () => {
    expect(csrfOk({ method: 'POST', headers: csrf })).toBe(true);
    expect(csrfOk({ method: 'POST', headers: { 'content-type': 'application/json' } })).toBe(false);
    expect(csrfOk({ method: 'DELETE', headers: { 'x-requested-with': 'chatcheat' } })).toBe(true);
  });
});
