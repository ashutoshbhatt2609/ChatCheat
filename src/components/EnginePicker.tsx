import React, { useRef, useState } from 'react';
import { Check, ChevronDown, Cloud, Cpu, Loader2, Zap } from 'lucide-react';
import { useDismiss } from '../hooks/useDismiss';
import type { Engine } from '../ai/run';

export type { Engine };

export interface LoadingProgress {
  stage: 'downloading' | 'loading' | 'ready' | 'error';
  progress: number;
  message: string;
}

export interface EnginePickerProps {
  engine: Engine;
  localModel: string | null;
  progress: LoadingProgress;
  /** Server has a cloud AI key configured. */
  cloudConfigured: boolean;
  /** Provider name shown in the UI, e.g. "OpenRouter". */
  cloudLabel: string;
  /** Cloud AI usable right now (configured and, if required, signed in). */
  cloudUsable: boolean;
  onSelectRules: () => void;
  onSelectCloud: () => void;
  onSelectLocal: (id: string) => void;
}

export const LOCAL_MODELS = [
  { id: 'phi-4-mini', name: 'Phi-3.5 Mini', size: '~2.2 GB', desc: 'Best reasoning, runs on-device' },
  { id: 'qwen3-1.7b', name: 'Qwen 2.5 (1.5B)', size: '~1.2 GB', desc: 'Lightweight and fast' },
];

const busy = (p: LoadingProgress) => p.stage === 'downloading' || p.stage === 'loading';

export const EnginePicker: React.FC<EnginePickerProps> = (props) => {
  const { engine, localModel, progress, cloudConfigured, cloudUsable, cloudLabel } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useDismiss(ref, open, () => setOpen(false));

  const localName = LOCAL_MODELS.find((m) => m.id === localModel)?.name;
  const label =
    engine === 'cloud' ? `${cloudLabel} AI` : engine === 'local' && localName ? `${localName} (on-device)` : 'Quick analysis';

  const pick = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  const item = (active: boolean, disabled = false) =>
    `w-full text-left flex items-start gap-3 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/60 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800'
    } ${active ? 'bg-zinc-800/70' : ''}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
      >
        {busy(progress) ? <Loader2 className="w-4 h-4 animate-spin text-orange-400" /> : null}
        <span className="truncate">{label}</span>
        {busy(progress) && <span className="text-xs text-orange-400">{Math.round(progress.progress)}%</span>}
        <ChevronDown className="w-4 h-4 text-zinc-400" aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" className="absolute left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] z-50 rounded-xl border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl">
          <button role="menuitem" className={item(engine === 'rules')} onClick={pick(props.onSelectRules)}>
            <Zap className="w-4 h-4 mt-0.5 text-orange-400" aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-sm text-zinc-100">Quick analysis</span>
              <span className="block text-xs text-zinc-400">Rule-based, instant, fully on this device. No download.</span>
            </span>
            {engine === 'rules' && <Check className="w-4 h-4 text-orange-400" aria-label="Selected" />}
          </button>

          {cloudConfigured && (
            <button
              role="menuitem"
              className={item(engine === 'cloud', !cloudUsable)}
              onClick={cloudUsable ? pick(props.onSelectCloud) : undefined}
              aria-disabled={!cloudUsable}
            >
              <Cloud className="w-4 h-4 mt-0.5 text-orange-400" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-sm text-zinc-100">{cloudLabel} AI</span>
                <span className="block text-xs text-zinc-400">
                  {cloudUsable
                    ? `Best quality, no download. Sends chat text to ${cloudLabel} through this app’s server. Free AI services may log or reuse requests, so avoid sensitive chats.`
                    : 'Sign in with Google to use cloud AI.'}
                </span>
              </span>
              {engine === 'cloud' && <Check className="w-4 h-4 text-orange-400" aria-label="Selected" />}
            </button>
          )}

          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            On-device AI models (one-time download)
          </div>
          {LOCAL_MODELS.map((m) => (
            <button
              key={m.id}
              role="menuitem"
              className={item(engine === 'local' && localModel === m.id, busy(progress))}
              onClick={busy(progress) ? undefined : pick(() => props.onSelectLocal(m.id))}
              aria-disabled={busy(progress)}
            >
              <Cpu className="w-4 h-4 mt-0.5 text-zinc-400" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-sm text-zinc-100">
                  {m.name} <span className="text-xs text-zinc-500">{m.size}</span>
                </span>
                <span className="block text-xs text-zinc-400">{m.desc}</span>
              </span>
              {engine === 'local' && localModel === m.id && progress.stage === 'ready' && (
                <Check className="w-4 h-4 text-orange-400" aria-label="Loaded" />
              )}
            </button>
          ))}

          {(busy(progress) || progress.stage === 'error') && localModel && (
            <div className="px-3 py-2" role="status">
              {busy(progress) ? (
                <>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-orange-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, progress.progress))}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400 truncate" title={progress.message}>{progress.message}</p>
                </>
              ) : (
                <p className="text-xs text-red-300">{progress.message || 'Model failed to load.'} Quick analysis is still available.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
