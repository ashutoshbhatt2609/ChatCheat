import { apiFetch } from '../api';

/** Client for the optional cloud AI proxy (/api/analyze). Only used after explicit user choice. */

export type CloudTask = 'summary' | 'actions' | 'priorities';

/** True when the server has a cloud AI key and (if sign-in is configured) the user is signed in. Never throws. */
export async function isCloudAvailable(): Promise<boolean> {
  try {
    const r = await apiFetch('/api/analyze');
    if (!r.ok) return false;
    const data = (await r.json()) as { available?: boolean; requiresAuth?: boolean; authed?: boolean };
    return data.available === true && (!data.requiresAuth || data.authed === true);
  } catch {
    return false;
  }
}

/** Run one analysis task in the cloud. Returns raw model text (validate with ./json). */
export async function cloudComplete(task: CloudTask, chat: string, username?: string): Promise<string> {
  const r = await apiFetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ task, chat, username }),
    signal: AbortSignal.timeout(55_000),
  }).catch((e: unknown) => {
    throw (e as { name?: string })?.name === 'TimeoutError' ? new Error('Cloud AI took too long to answer.') : e;
  });
  const data = (await r.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!r.ok || !data.text) throw new Error(data.error || `Cloud AI request failed (HTTP ${r.status}).`);
  return data.text;
}
