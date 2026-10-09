import { SignJWT, jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import { header, parseCookies, type Req } from './http.js';

export const COOKIE = 'cc_session';
const SESSION_DAYS = 7;

export interface SessionUser {
  id: string; // Google "sub"
  email: string;
  name: string;
  picture: string;
}

/** Auth is enabled only when both the Google client id and a strong session secret are configured. */
export function authConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID) && (process.env.SESSION_SECRET ?? '').length >= 32;
}

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET ?? '';
  if (s.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return new TextEncoder().encode(s);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, picture: user.picture })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function readSession(req: Req): Promise<SessionUser | null> {
  if (!authConfigured()) return null;
  const token = parseCookies(header(req, 'cookie'))[COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      picture: String(payload.picture ?? ''),
    };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
}

export function clearCookie(secure: boolean): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function isSecure(req: Req): boolean {
  return header(req, 'x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
}

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

/** Verify a Google Identity Services ID token (signature, issuer, audience, expiry, verified email). */
export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  keys: JWTVerifyGetKey = googleJwks,
): Promise<SessionUser> {
  const { payload } = await jwtVerify(idToken, keys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });
  if (!payload.sub || payload.email_verified !== true || typeof payload.email !== 'string') {
    throw new Error('Unverified Google account');
  }
  return {
    id: payload.sub,
    email: payload.email,
    name: typeof payload.name === 'string' ? payload.name : payload.email,
    picture: typeof payload.picture === 'string' ? payload.picture : '',
  };
}
