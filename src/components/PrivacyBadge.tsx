import React, { useRef, useState } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { Lock, Cloud, ShieldCheck } from 'lucide-react';

export interface PrivacyBadgeProps {
  /** Cloud AI engine selected: chat text goes to the cloud provider. */
  cloudAi: boolean;
  /** Provider name, e.g. "OpenRouter". */
  cloudLabel: string;
  /** Signed in with sync on: chats and results are stored in the user's account. */
  synced: boolean;
}

/** Always-visible pill that states where data goes right now, with details on click. */
export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({ cloudAi, cloudLabel, synced }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useDismiss(ref, open, () => setOpen(false));

  const label = cloudAi ? `Sent to ${cloudLabel}` : synced ? 'Synced to account' : 'On this device';
  const Icon = cloudAi || synced ? Cloud : Lock;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60 ${
          cloudAi ? 'border-amber-500/40 text-amber-300 bg-amber-500/10' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
        }`}
      >
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden sr-only">{label}</span>
      </button>

      {open && (
        <div role="dialog" aria-label="Privacy details" className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] z-50 rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl">
          <div className="flex items-center gap-2 text-orange-400 mb-2">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Where your data goes</h3>
          </div>
          <ul className="text-xs text-zinc-300 space-y-1.5 list-disc pl-4">
            <li>Quick analysis and on-device models run entirely in your browser.</li>
            <li>
              Cloud AI ({cloudLabel}) is only used when selected: chat text goes to that provider through this app&apos;s
              server, which does not store it. Free AI services may log, train on or even publish requests.
            </li>
            <li>
              Signing in with Google is optional. When signed in, new chats and their results are stored in your
              private account database and nowhere else.
            </li>
            <li>Local models download once from Hugging Face / GitHub, then are cached.</li>
            <li>You can delete everything, on device and in your account, from the sidebar.</li>
          </ul>
        </div>
      )}
    </div>
  );
};
