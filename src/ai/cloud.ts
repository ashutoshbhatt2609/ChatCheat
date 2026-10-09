/** Client for the optional cloud AI proxy (/api/analyze). Only used after explicit user consent. */

export type CloudTask = 'summary' | 'actions' | 'priorities';

/** True when the server has a GEMINI_API_KEY configured. Never throws. */
export async function isCloudAvailable(): Promise<boolean> {
  try {
    const r = await fetch('/api/analyze', { method: 'GET' });
    if (!r.ok) return false;
    const data = (await r.json()) as { available?: boolean };
    return data.available === true;
  } catch {
    return false;
  }
}

/** Run one analysis task in the cloud. Returns raw model text (validate with ./json). */
export async function cloudComplete(task: CloudTask, chat: string, username?: string): Promise<string> {
  const r = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, chat, username }),
  });
  const data = (await r.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!r.ok || !data.text) throw new Error(data.error || 'Cloud AI request failed.');
  return data.text;
}
