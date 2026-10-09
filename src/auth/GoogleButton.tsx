import React, { useEffect, useRef } from 'react';

interface GoogleId {
  initialize(o: { client_id: string; callback: (r: { credential: string }) => void }): void;
  renderButton(el: HTMLElement, o: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const SRC = 'https://accounts.google.com/gsi/client';

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    const s = existing ?? document.createElement('script');
    s.addEventListener('load', () => resolve());
    s.addEventListener('error', () => reject(new Error('Could not load Google sign-in')));
    if (!existing) {
      s.src = SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

/** Official Google Identity Services button. Returns an ID token; the server verifies it. */
export const GoogleButton: React.FC<{ clientId: string; onCredential: (c: string) => void }> = ({
  clientId,
  onCredential,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;

  useEffect(() => {
    let alive = true;
    loadScript()
      .then(() => {
        if (!alive || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => cb.current(r.credential) });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 220,
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [clientId]);

  return <div ref={ref} aria-label="Sign in with Google" />;
};
