import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api';

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface AppConfig {
  googleClientId: string | null;
  cloudSync: boolean;
  cloudAi: boolean;
}

const EMPTY: AppConfig = { googleClientId: null, cloudSync: false, cloudAi: false };

/** Loads public config + current session from the server and exposes sign-in/out. */
export function useAuth() {
  const [config, setConfig] = useState<AppConfig>(EMPTY);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await apiFetch('/api/auth?action=config');
        if (!c.ok) return;
        const cfg = (await c.json()) as AppConfig;
        if (cancelled) return;
        setConfig(cfg);
        if (cfg.googleClientId) {
          const me = await apiFetch('/api/auth?action=me');
          if (me.ok && !cancelled) setUser(((await me.json()) as { user: User | null }).user);
        }
      } catch {
        /* offline / no backend: app keeps working locally */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithCredential = useCallback(async (credential: string) => {
    setError(null);
    try {
      const r = await apiFetch('/api/auth?action=google', { method: 'POST', body: JSON.stringify({ credential }) });
      const data = (await r.json()) as { user?: User; error?: string };
      if (!r.ok || !data.user) throw new Error(data.error || 'Sign-in failed.');
      setUser(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiFetch('/api/auth?action=logout', { method: 'POST', body: '{}' }).catch(() => undefined);
    setUser(null);
  }, []);

  return { config, user, error, signInWithCredential, signOut };
}
